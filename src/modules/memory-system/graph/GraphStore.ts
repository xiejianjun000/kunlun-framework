/**
 * 图存储引擎
 * Graph Store Engine - SQLite based graph storage
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  GraphNode,
  GraphEdge,
  EdgeQueryOptions,
  Subgraph,
  GraphStats,
  GraphStoreConfig,
  NodeKind,
  EdgeKind,
  ImpactResult,
  NodeCandidate,
} from './types';

export class GraphStore {
  private db: Database.Database;
  private config: Required<GraphStoreConfig>;
  private inTransaction: boolean = false;

  /**
   * 创建图存储实例
   */
  constructor(config: GraphStoreConfig = {}) {
    this.config = {
      dbPath: config.dbPath || ':memory:',
      inMemory: config.inMemory ?? false,
      enableWal: config.enableWal ?? true,
      autoCommit: config.autoCommit ?? true,
    };

    this.db = new Database(this.config.dbPath, {
      verbose: config.inMemory ? undefined : console.log,
    });

    this.initialize();
  }

  /**
   * 初始化数据库表
   */
  private initialize(): void {
    // 启用 WAL 模式提升并发性能
    if (this.config.enableWal && !this.config.inMemory) {
      this.db.pragma('journal_mode = WAL');
    }

    this.db.pragma('foreign_keys = ON');

    // 创建节点表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS graph_nodes (
        qualified_name TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('Concept', 'Entity', 'Event', 'Preference', 'Skill')),
        content TEXT,
        embedding BLOB,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建边表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS graph_edges (
        id TEXT PRIMARY KEY,
        source_qualified TEXT NOT NULL,
        target_qualified TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('RELATES_TO', 'CAUSES', 'SUPPORTS', 'CONTRADICTS')),
        confidence REAL DEFAULT 1.0,
        weight REAL DEFAULT 1.0,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_qualified) REFERENCES graph_nodes(qualified_name) ON DELETE CASCADE,
        FOREIGN KEY (target_qualified) REFERENCES graph_nodes(qualified_name) ON DELETE CASCADE,
        UNIQUE(source_qualified, target_qualified, kind)
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_edges_source ON graph_edges(source_qualified);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON graph_edges(target_qualified);
      CREATE INDEX IF NOT EXISTS idx_edges_kind ON graph_edges(kind);
      CREATE INDEX IF NOT EXISTS idx_nodes_kind ON graph_nodes(kind);
    `);

    // 创建向量相似度表 (可选，用于向量搜索)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS node_embeddings (
        node_qualified TEXT PRIMARY KEY,
        vector BLOB NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_qualified) REFERENCES graph_nodes(qualified_name) ON DELETE CASCADE
      )
    `);
  }

  /**
   * 添加节点
   */
  addNode(node: GraphNode): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO graph_nodes 
        (qualified_name, name, kind, content, metadata, updated_at)
      VALUES 
        (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      node.qualifiedName,
      node.name,
      node.kind,
      node.content || null,
      node.metadata ? JSON.stringify(node.metadata) : null
    );

    // 如果有向量嵌入，保存到嵌入表
    if (node.embedding) {
      const embeddingBlob = Buffer.from(JSON.stringify(node.embedding));
      const embedStmt = this.db.prepare(`
        INSERT OR REPLACE INTO node_embeddings (node_qualified, vector)
        VALUES (?, ?)
      `);
      embedStmt.run(node.qualifiedName, embeddingBlob);
    }
  }

  /**
   * 批量添加节点
   */
  addNodes(nodes: GraphNode[]): void {
    const transaction = this.db.transaction(() => {
      for (const node of nodes) {
        this.addNode(node);
      }
    });
    transaction();
  }

  /**
   * 获取节点
   */
  getNode(qualifiedName: string): GraphNode | null {
    const stmt = this.db.prepare(`
      SELECT * FROM graph_nodes WHERE qualified_name = ?
    `);

    const row = stmt.get(qualifiedName) as any;
    if (!row) return null;

    return this.rowToNode(row);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(excludeFiles: boolean = true): GraphNode[] {
    let query = 'SELECT * FROM graph_nodes';
    
    if (excludeFiles) {
      query += " WHERE kind != 'File'";
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all() as any[];

    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 按类型获取节点
   */
  getNodesByKind(kind: NodeKind): GraphNode[] {
    const stmt = this.db.prepare(`
      SELECT * FROM graph_nodes WHERE kind = ?
    `);
    const rows = stmt.all(kind) as any[];
    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 删除节点
   */
  deleteNode(qualifiedName: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM graph_nodes WHERE qualified_name = ?
    `);
    const result = stmt.run(qualifiedName);
    return result.changes > 0;
  }

  /**
   * 更新节点
   */
  updateNode(qualifiedName: string, updates: Partial<GraphNode>): GraphNode | null {
    const existing = this.getNode(qualifiedName);
    if (!existing) return null;

    const updated: GraphNode = { ...existing, ...updates, qualifiedName };

    const stmt = this.db.prepare(`
      UPDATE graph_nodes SET 
        name = ?, kind = ?, content = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE qualified_name = ?
    `);

    stmt.run(
      updated.name,
      updated.kind,
      updated.content || null,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      qualifiedName
    );

    return this.getNode(qualifiedName);
  }

  /**
   * 添加边
   */
  addEdge(edge: GraphEdge): void {
    // 确保源节点和目标节点存在
    if (!this.getNode(edge.sourceQualified)) {
      throw new Error(`Source node does not exist: ${edge.sourceQualified}`);
    }
    if (!this.getNode(edge.targetQualified)) {
      throw new Error(`Target node does not exist: ${edge.targetQualified}`);
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO graph_edges 
        (id, source_qualified, target_qualified, kind, confidence, weight, metadata)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    stmt.run(
      id,
      edge.sourceQualified,
      edge.targetQualified,
      edge.kind,
      edge.confidence ?? 1.0,
      edge.weight ?? 1.0,
      edge.metadata ? JSON.stringify(edge.metadata) : null
    );
  }

  /**
   * 批量添加边
   */
  addEdges(edges: GraphEdge[]): void {
    const transaction = this.db.transaction(() => {
      for (const edge of edges) {
        this.addEdge(edge);
      }
    });
    transaction();
  }

  /**
   * 查询边
   */
  getEdges(options: EdgeQueryOptions): GraphEdge[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.sourceQualified) {
      conditions.push('source_qualified = ?');
      params.push(options.sourceQualified);
    }

    if (options.targetQualified) {
      conditions.push('target_qualified = ?');
      params.push(options.targetQualified);
    }

    if (options.kind) {
      conditions.push('kind = ?');
      params.push(options.kind);
    }

    if (options.minConfidence !== undefined) {
      conditions.push('confidence >= ?');
      params.push(options.minConfidence);
    }

    let query = 'SELECT * FROM graph_edges';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY confidence DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 获取节点的所有边
   */
  getNodeEdges(qualifiedName: string): GraphEdge[] {
    const stmt = this.db.prepare(`
      SELECT * FROM graph_edges 
      WHERE source_qualified = ? OR target_qualified = ?
      ORDER BY confidence DESC
    `);

    const rows = stmt.all(qualifiedName, qualifiedName) as any[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 删除边
   */
  deleteEdge(source: string, target: string, kind?: EdgeKind): boolean {
    let query = 'DELETE FROM graph_edges WHERE source_qualified = ? AND target_qualified = ?';
    const params: any[] = [source, target];

    if (kind) {
      query += ' AND kind = ?';
      params.push(kind);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  /**
   * 获取影响半径内的节点 (BFS)
   */
  getImpactRadius(node: string, depth: number): ImpactResult[] {
    const visited = new Set<string>();
    const results: ImpactResult[] = [];
    const queue: Array<{ qualifiedName: string; distance: number; path: GraphEdge[] }> = [];

    visited.add(node);
    queue.push({ qualifiedName: node, distance: 0, path: [] });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.distance > 0) {
        const graphNode = this.getNode(current.qualifiedName);
        if (graphNode) {
          results.push({
            node: graphNode,
            distance: current.distance,
            path: current.path,
          });
        }
      }

      if (current.distance < depth) {
        // 获取当前节点的所有边
        const edges = this.getNodeEdges(current.qualifiedName);

        for (const edge of edges) {
          const neighbor =
            edge.sourceQualified === current.qualifiedName
              ? edge.targetQualified
              : edge.sourceQualified;

          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({
              qualifiedName: neighbor,
              distance: current.distance + 1,
              path: [...current.path, edge],
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * 获取子图
   */
  getSubgraph(root: string, maxDepth: number = 2): Subgraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const visited = new Set<string>();

    const queue: Array<{ qualifiedName: string; depth: number }> = [];
    queue.push({ qualifiedName: root, depth: 0 });
    visited.add(root);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // 添加节点
      const node = this.getNode(current.qualifiedName);
      if (node) {
        nodes.push(node);
      }

      if (current.depth < maxDepth) {
        // 获取所有边
        const nodeEdges = this.getNodeEdges(current.qualifiedName);

        for (const edge of nodeEdges) {
          // 添加边
          if (!edges.some(e => e.sourceQualified === edge.sourceQualified && 
                              e.targetQualified === edge.targetQualified && 
                              e.kind === edge.kind)) {
            edges.push(edge);
          }

          // 处理相邻节点
          const neighbor =
            edge.sourceQualified === current.qualifiedName
              ? edge.targetQualified
              : edge.sourceQualified;

          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ qualifiedName: neighbor, depth: current.depth + 1 });
          }
        }
      }
    }

    return { nodes, edges, root };
  }

  /**
   * 获取两个节点之间的路径
   */
  findPath(source: string, target: string, maxDepth: number = 3): GraphEdge[] | null {
    const visited = new Set<string>();
    const queue: Array<{ qualifiedName: string; path: GraphEdge[] }> = [];

    visited.add(source);
    queue.push({ qualifiedName: source, path: [] });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.qualifiedName === target) {
        return current.path;
      }

      if (current.path.length < maxDepth) {
        const edges = this.getNodeEdges(current.qualifiedName);

        for (const edge of edges) {
          const neighbor =
            edge.sourceQualified === current.qualifiedName
              ? edge.targetQualified
              : edge.sourceQualified;

          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({
              qualifiedName: neighbor,
              path: [...current.path, edge],
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * 获取图统计信息
   */
  getStats(): GraphStats {
    const nodeStmt = this.db.prepare('SELECT COUNT(*) as count FROM graph_nodes');
    const nodeCount = (nodeStmt.get() as any).count;

    const edgeStmt = this.db.prepare('SELECT COUNT(*) as count FROM graph_edges');
    const edgeCount = (edgeStmt.get() as any).count;

    const nodesByKindStmt = this.db.prepare(`
      SELECT kind, COUNT(*) as count FROM graph_nodes GROUP BY kind
    `);
    const nodesByKindRows = nodesByKindStmt.all() as any[];
    const nodesByKind = {
      Concept: 0,
      Entity: 0,
      Event: 0,
      Preference: 0,
      Skill: 0,
    } as Record<NodeKind, number>;
    for (const row of nodesByKindRows) {
      nodesByKind[row.kind as NodeKind] = row.count;
    }

    const edgesByKindStmt = this.db.prepare(`
      SELECT kind, COUNT(*) as count FROM graph_edges GROUP BY kind
    `);
    const edgesByKindRows = edgesByKindStmt.all() as any[];
    const edgesByKind = {
      RELATES_TO: 0,
      CAUSES: 0,
      SUPPORTS: 0,
      CONTRADICTS: 0,
    } as Record<EdgeKind, number>;
    for (const row of edgesByKindRows) {
      edgesByKind[row.kind as EdgeKind] = row.count;
    }

    // 计算平均度数
    const avgDegreeStmt = this.db.prepare(`
      SELECT AVG(degree) as avg_degree FROM (
        SELECT COUNT(*) as degree FROM graph_edges GROUP BY source_qualified
        UNION ALL
        SELECT COUNT(*) as degree FROM graph_edges GROUP BY target_qualified
      )
    `);
    const avgDegree = ((avgDegreeStmt.get() as any)?.avg_degree) || 0;

    return {
      nodeCount,
      edgeCount,
      nodesByKind,
      edgesByKind,
      avgDegree,
      communityCount: 0, // 由 CommunityDetector 计算
    };
  }

  /**
   * 获取节点的度数信息
   */
  getNodeDegree(qualifiedName: string): { inDegree: number; outDegree: number; totalDegree: number } {
    const inStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM graph_edges WHERE target_qualified = ?
    `);
    const inDegree = (inStmt.get(qualifiedName) as any).count;

    const outStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM graph_edges WHERE source_qualified = ?
    `);
    const outDegree = (outStmt.get(qualifiedName) as any).count;

    return {
      inDegree,
      outDegree,
      totalDegree: inDegree + outDegree,
    };
  }

  /**
   * 获取候选节点 (用于社区检测)
   */
  getCandidates(minDegree: number = 1): NodeCandidate[] {
    const nodes = this.getAllNodes();
    const candidates: NodeCandidate[] = [];

    for (const node of nodes) {
      const degree = this.getNodeDegree(node.qualifiedName);
      if (degree.totalDegree >= minDegree) {
        // 获取邻居节点
        const edges = this.getNodeEdges(node.qualifiedName);
        const neighbors = new Set<string>();
        
        for (const edge of edges) {
          neighbors.add(
            edge.sourceQualified === node.qualifiedName
              ? edge.targetQualified
              : edge.sourceQualified
          );
        }

        candidates.push({
          qualifiedName: node.qualifiedName,
          inDegree: degree.inDegree,
          outDegree: degree.outDegree,
          totalDegree: degree.totalDegree,
          neighbors,
        });
      }
    }

    return candidates;
  }

  /**
   * 搜索相关节点 (基于名称/内容)
   */
  searchNodes(query: string, limit: number = 20): GraphNode[] {
    const stmt = this.db.prepare(`
      SELECT * FROM graph_nodes 
      WHERE name LIKE ? OR content LIKE ?
      ORDER BY 
        CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
        name
      LIMIT ?
    `);

    const pattern = `%${query}%`;
    const rows = stmt.all(pattern, pattern, query, limit) as any[];
    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 批量删除 (用于清理)
   */
  clear(): void {
    this.db.exec('DELETE FROM graph_edges');
    this.db.exec('DELETE FROM node_embeddings');
    this.db.exec('DELETE FROM graph_nodes');
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }

  /**
   * 行数据转换为节点
   */
  private rowToNode(row: any): GraphNode {
    return {
      qualifiedName: row.qualified_name,
      name: row.name,
      kind: row.kind as NodeKind,
      content: row.content || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  /**
   * 行数据转换为边
   */
  private rowToEdge(row: any): GraphEdge {
    return {
      sourceQualified: row.source_qualified,
      targetQualified: row.target_qualified,
      kind: row.kind as EdgeKind,
      confidence: row.confidence,
      weight: row.weight,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
    };
  }

  /**
   * 导出图数据为 JSON
   */
  export(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: this.getAllNodes(),
      edges: this.getEdges({}),
    };
  }

  /**
   * 从 JSON 导入图数据
   */
  import(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    const transaction = this.db.transaction(() => {
      this.addNodes(data.nodes);
      this.addEdges(data.edges);
    });
    transaction();
  }
}
