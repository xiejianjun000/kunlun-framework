/**
 * GraphQuery - 图查询API
 * 
 * 提供图遍历、最短路径、社区发现等高级查询功能
 */

import Database = require('better-sqlite3');
import type {
  GraphNode,
  GraphEdge,
  EdgeKind,
  TraversalDirection,
  TraversalAlgorithm,
  PathResult,
  ImpactRadiusResult,
  SubgraphResult,
  NeighborQueryOptions,
  Community,
  CommunityMembersResult,
} from './types';
import { NodeManager } from './NodeManager';
import { EdgeManager } from './EdgeManager';

export class GraphQuery {
  private db: Database.Database;
  private nodeManager: NodeManager;
  private edgeManager: EdgeManager;

  // 配置常量
  private readonly MAX_BATCH_SIZE = 450;
  private readonly DEFAULT_MAX_DEPTH = 10;
  private readonly DEFAULT_MAX_NODES = 1000;

  constructor(db: Database.Database) {
    this.db = db;
    this.nodeManager = new NodeManager(db);
    this.edgeManager = new EdgeManager(db);
  }

  /**
   * 获取邻居节点
   */
  getNeighbors(
    nodeId: string,
    options: NeighborQueryOptions = {}
  ): GraphNode[] {
    const { direction = 'both', edgeKinds, maxDepth = 1, limit = 100 } = options;

    if (maxDepth === 1) {
      // 单层邻居
      return this.getImmediateNeighbors(nodeId, direction, edgeKinds, limit);
    }

    // 多层邻居 - 使用BFS
    return this.getNeighborsBFS(nodeId, direction, edgeKinds, maxDepth, limit);
  }

  /**
   * 获取直接邻居
   */
  private getImmediateNeighbors(
    nodeId: string,
    direction: TraversalDirection,
    edgeKinds?: EdgeKind[],
    limit = 100
  ): GraphNode[] {
    const neighborIds = new Set<string>();
    const kindCondition = edgeKinds && edgeKinds.length > 0
      ? ` AND kind IN (${edgeKinds.map(() => '?').join(',')})`
      : '';
    const kindParams = edgeKinds || [];

    switch (direction) {
      case 'outgoing': {
        const rows = this.db.prepare(`
          SELECT target_id FROM edges WHERE source_id = ?${kindCondition} LIMIT ?
        `).all(nodeId, ...kindParams, limit) as Array<{ target_id: string }>;
        rows.forEach(r => neighborIds.add(r.target_id));
        break;
      }
      case 'incoming': {
        const rows = this.db.prepare(`
          SELECT source_id FROM edges WHERE target_id = ?${kindCondition} LIMIT ?
        `).all(nodeId, ...kindParams, limit) as Array<{ source_id: string }>;
        rows.forEach(r => neighborIds.add(r.source_id));
        break;
      }
      default: {
        const rows = this.db.prepare(`
          SELECT target_id FROM edges WHERE source_id = ?${kindCondition}
          UNION
          SELECT source_id FROM edges WHERE target_id = ?${kindCondition}
          LIMIT ?
        `).all(nodeId, ...kindParams, nodeId, ...kindParams, limit) as Array<{ target_id: string }>;
        rows.forEach(r => neighborIds.add(r.target_id));
      }
    }

    return this.nodeManager.getByIds(Array.from(neighborIds));
  }

  /**
   * BFS遍历获取多层邻居
   */
  private getNeighborsBFS(
    nodeId: string,
    direction: TraversalDirection,
    edgeKinds: EdgeKind[] | undefined,
    maxDepth: number,
    limit: number
  ): GraphNode[] {
    const visited = new Set<string>([nodeId]);
    const frontier = new Set<string>([nodeId]);
    const neighborIds: string[] = [];

    const kindCondition = edgeKinds && edgeKinds.length > 0
      ? ` AND kind IN (${edgeKinds.map(() => '?').join(',')})`
      : '';
    const kindParams = edgeKinds || [];

    for (let depth = 1; depth <= maxDepth && neighborIds.length < limit; depth++) {
      const nextFrontier = new Set<string>();

      for (const currentId of Array.from(frontier)) {
        const edges = this.edgeManager.getBySource(currentId, edgeKinds);
        for (const edge of edges) {
          if (!visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            nextFrontier.add(edge.targetId);
            if (direction !== 'incoming') {
              neighborIds.push(edge.targetId);
            }
          }
        }

        if (direction !== 'outgoing') {
          const incomingEdges = this.edgeManager.getByTarget(currentId, edgeKinds);
          for (const edge of incomingEdges) {
            if (!visited.has(edge.sourceId)) {
              visited.add(edge.sourceId);
              nextFrontier.add(edge.sourceId);
              neighborIds.push(edge.sourceId);
            }
          }
        }
      }

      frontier.clear();
      for (const id of Array.from(nextFrontier)) {
        if (neighborIds.length >= limit) break;
        frontier.add(id);
      }
    }

    return this.nodeManager.getByIds(neighborIds.slice(0, limit));
  }

  /**
   * BFS遍历（可配置的BFS算法）
   */
  bfs(
    startNodeId: string,
    options: {
      direction?: TraversalDirection;
      edgeKinds?: EdgeKind[];
      maxDepth?: number;
      maxNodes?: number;
      visitCallback?: (nodeId: string, depth: number) => boolean;
    } = {}
  ): Map<string, number> {
    const { direction = 'both', edgeKinds, maxDepth = this.DEFAULT_MAX_DEPTH, maxNodes = this.DEFAULT_MAX_NODES, visitCallback } = options;

    const visited = new Map<string, number>();
    const frontier = new Set<string>([startNodeId]);
    visited.set(startNodeId, 0);

    const kindCondition = edgeKinds && edgeKinds.length > 0
      ? ` AND kind IN (${edgeKinds.map(() => '?').join(',')})`
      : '';
    const kindParams = edgeKinds || [];

    for (let depth = 1; depth <= maxDepth && visited.size < maxNodes; depth++) {
      const nextFrontier = new Set<string>();

      for (const currentId of Array.from(frontier)) {
        // 出边
        if (direction !== 'incoming') {
          const outRows = this.db.prepare(`
            SELECT target_id FROM edges WHERE source_id = ?${kindCondition}
          `).all(currentId, ...kindParams) as Array<{ target_id: string }>;

          for (const row of outRows) {
            if (!visited.has(row.target_id)) {
              visited.set(row.target_id, depth);
              nextFrontier.add(row.target_id);
              if (visitCallback && visitCallback(row.target_id, depth)) {
                return visited;
              }
            }
          }
        }

        // 入边
        if (direction !== 'outgoing') {
          const inRows = this.db.prepare(`
            SELECT source_id FROM edges WHERE target_id = ?${kindCondition}
          `).all(currentId, ...kindParams) as Array<{ source_id: string }>;

          for (const row of inRows) {
            if (!visited.has(row.source_id)) {
              visited.set(row.source_id, depth);
              nextFrontier.add(row.source_id);
              if (visitCallback && visitCallback(row.source_id, depth)) {
                return visited;
              }
            }
          }
        }
      }

      frontier.clear();
      for (const id of Array.from(nextFrontier)) {
        if (visited.size >= maxNodes) break;
        frontier.add(id);
      }

      if (frontier.size === 0) break;
    }

    return visited;
  }

  /**
   * DFS遍历
   */
  dfs(
    startNodeId: string,
    options: {
      direction?: TraversalDirection;
      edgeKinds?: EdgeKind[];
      maxDepth?: number;
      visitCallback?: (nodeId: string, depth: number) => void;
    } = {}
  ): Set<string> {
    const { direction = 'both', edgeKinds, maxDepth = this.DEFAULT_MAX_DEPTH, visitCallback } = options;
    const visited = new Set<string>();

    const dfsRecursive = (currentId: string, depth: number): void => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);
      if (visitCallback) visitCallback(currentId, depth);

      if (direction !== 'incoming') {
        const outRows = this.db.prepare(`
          SELECT target_id FROM edges WHERE source_id = ?${edgeKinds ? ` AND kind IN (${edgeKinds.map(() => '?').join(',')})` : ''}
        `).all(currentId, ...(edgeKinds || [])) as Array<{ target_id: string }>;
        for (const row of outRows) {
          dfsRecursive(row.target_id, depth + 1);
        }
      }

      if (direction !== 'outgoing') {
        const inRows = this.db.prepare(`
          SELECT source_id FROM edges WHERE target_id = ?${edgeKinds ? ` AND kind IN (${edgeKinds.map(() => '?').join(',')})` : ''}
        `).all(currentId, ...(edgeKinds || [])) as Array<{ source_id: string }>;
        for (const row of inRows) {
          dfsRecursive(row.source_id, depth + 1);
        }
      }
    };

    dfsRecursive(startNodeId, 0);
    return visited;
  }

  /**
   * 最短路径查询（Dijkstra算法）
   */
  shortestPath(startNodeId: string, endNodeId: string): PathResult | null {
    // 使用BFS进行无权最短路径搜索
    if (startNodeId === endNodeId) {
      const node = this.nodeManager.getById(startNodeId);
      return node ? { path: [startNodeId], edges: [], length: 0 } : null;
    }

    const visited = new Set<string>([startNodeId]);
    const queue: Array<{ nodeId: string; path: string[]; edges: GraphEdge[] }> = [
      { nodeId: startNodeId, path: [startNodeId], edges: [] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      // 获取当前节点的所有出边
      const edges = this.edgeManager.getBySource(current.nodeId);
      for (const edge of edges) {
        if (edge.targetId === endNodeId) {
          return {
            path: [...current.path, edge.targetId],
            edges: [...current.edges, edge],
            length: current.path.length,
          };
        }

        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          queue.push({
            nodeId: edge.targetId,
            path: [...current.path, edge.targetId],
            edges: [...current.edges, edge],
          });
        }
      }
    }

    return null;
  }

  /**
   * 影响力半径查询 - 找出从给定节点出发可影响的所有节点
   */
  getImpactRadius(
    seedNodeIds: string[],
    maxDepth: number = 5,
    maxNodes: number = this.DEFAULT_MAX_NODES
  ): ImpactRadiusResult {
    const seedNodes = this.nodeManager.getByIds(seedNodeIds).filter(n => n !== null) as GraphNode[];
    
    if (seedNodes.length === 0) {
      return {
        seedNodes: [],
        impactedNodes: [],
        impactedEdges: [],
        truncated: false,
        totalImpacted: 0,
        depth: 0,
      };
    }

    // 使用SQL递归CTE进行高效查询
    this.db.exec(`
      CREATE TEMP TABLE IF NOT EXISTS _impact_seeds (qn TEXT PRIMARY KEY);
      CREATE TEMP TABLE IF NOT EXISTS _impact_visited (qn TEXT PRIMARY KEY, depth INTEGER);
    `);
    this.db.exec('DELETE FROM _impact_seeds; DELETE FROM _impact_visited;');

    // 插入种子节点
    const batchInsert = this.db.transaction((ids: string[]) => {
      for (let i = 0; i < ids.length; i += this.MAX_BATCH_SIZE) {
        const batch = ids.slice(i, i + this.MAX_BATCH_SIZE);
        const placeholders = batch.map(() => '?').join(',');
        this.db.prepare(`INSERT OR IGNORE INTO _impact_seeds (qn) VALUES (${placeholders})`).run(...batch);
      }
    });
    batchInsert(seedNodeIds);

    // 递归CTE查询
    const cteSql = `
      WITH RECURSIVE impacted(node_id, depth) AS (
        SELECT qn, 0 FROM _impact_seeds
        UNION
        SELECT e.target_id, i.depth + 1
        FROM impacted i
        JOIN edges e ON e.source_id = i.node_id
        WHERE i.depth < ?
        UNION
        SELECT e.source_id, i.depth + 1
        FROM impacted i
        JOIN edges e ON e.target_id = i.node_id
        WHERE i.depth < ?
      )
      SELECT DISTINCT node_id, MIN(depth) as min_depth
      FROM impacted
      GROUP BY node_id
      LIMIT ?
    `;

    const rows = this.db.prepare(cteSql).all(maxDepth, maxDepth, maxNodes + seedNodeIds.length) as Array<{ node_id: string; min_depth: number }>;
    
    const impactedIds = rows.filter(r => !seedNodeIds.includes(r.node_id)).map(r => r.node_id);
    const totalImpacted = impactedIds.length;
    const truncated = totalImpacted > maxNodes;
    const displayIds = impactedIds.slice(0, maxNodes);

    const impactedNodes = this.nodeManager.getByIds(displayIds);
    const allNodeIdsSet = new Set<string>([...seedNodeIds, ...displayIds]);
    const allNodeIds = Array.from(allNodeIdsSet);
    
    // 获取相关边
    const impactedEdges = this.getEdgesAmongNodes(allNodeIds);

    // 获取最大深度
    const maxFoundDepth = rows.length > 0 ? Math.max(...rows.map(r => r.min_depth)) : 0;

    return {
      seedNodes,
      impactedNodes,
      impactedEdges,
      truncated,
      totalImpacted,
      depth: maxFoundDepth,
    };
  }

  /**
   * 提取子图 - 包含指定节点及其连接边
   */
  getSubgraph(nodeIds: string[]): SubgraphResult {
    if (nodeIds.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.nodeManager.getByIds(nodeIds);
    const nodeIdSet = new Set(nodeIds);

    // 获取所有相关边
    const edges = this.getEdgesAmongNodes(nodeIds);

    return { nodes, edges };
  }

  /**
   * 获取指定节点集合之间的所有边
   */
  private getEdgesAmongNodes(nodeIds: string[]): GraphEdge[] {
    if (nodeIds.length === 0) return [];

    const results: GraphEdge[] = [];
    const nodeIdSet = new Set(nodeIds);

    for (let i = 0; i < nodeIds.length; i += this.MAX_BATCH_SIZE) {
      const batch = nodeIds.slice(i, i + this.MAX_BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');

      const rows = this.db.prepare(`
        SELECT * FROM edges WHERE source_id IN (${placeholders})
      `).all(...batch) as Record<string, unknown>[];

      for (const row of rows) {
        if (nodeIdSet.has(row.target_id as string)) {
          results.push(this.rowToEdge(row));
        }
      }
    }

    return results;
  }

  /**
   * 社区发现 - 简单连通分量算法
   */
  detectCommunities(): Community[] {
    // 使用Union-Find算法进行社区发现
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    // 初始化
    const nodes = this.nodeManager.getAll({ limit: 100000 });
    for (const node of nodes) {
      parent.set(node.id, node.id);
      rank.set(node.id, 0);
    }

    // 并查集查找
    const find = (x: string): string => {
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    // 并查集合并
    const union = (x: string, y: string): void => {
      const px = find(x);
      const py = find(y);
      if (px === py) return;

      const rx = rank.get(px)!;
      const ry = rank.get(py)!;
      if (rx < ry) {
        parent.set(px, py);
      } else if (rx > ry) {
        parent.set(py, px);
      } else {
        parent.set(py, px);
        rank.set(px, rx + 1);
      }
    };

    // 遍历所有边，合并连通分量
    const edges = this.edgeManager.getAll(100000);
    for (const edge of edges) {
      union(edge.sourceId, edge.targetId);
    }

    // 收集社区
    const communityMap = new Map<string, Set<string>>();
    for (const node of nodes) {
      const root = find(node.id);
      if (!communityMap.has(root)) {
        communityMap.set(root, new Set());
      }
      communityMap.get(root)!.add(node.id);
    }

    // 创建社区记录
    const now = Date.now();
    const communities: Community[] = [];
    let communityId = 1;

    const insertCommunity = this.db.transaction(() => {
      for (const [, members] of Array.from(communityMap.entries())) {
        if (members.size > 0) {
          this.db.prepare(`
            INSERT OR IGNORE INTO communities (name, size, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `).run(`Community ${communityId}`, members.size, now, now);

          // 更新节点的community_id
          const updateStmt = this.db.prepare('UPDATE nodes SET metadata = json_set(COALESCE(metadata, "{}"), "$.communityId", ?) WHERE id = ?');
          for (const nodeId of Array.from(members)) {
            updateStmt.run(communityId, nodeId);
          }

          communities.push({
            id: communityId,
            name: `Community ${communityId}`,
            size: members.size,
            createdAt: now,
            updatedAt: now,
          });
          communityId++;
        }
      }
    });

    insertCommunity();
    return communities;
  }

  /**
   * 获取节点的社区
   */
  getNodeCommunity(nodeId: string): Community | null {
    const node = this.nodeManager.getById(nodeId);
    if (!node || !node.metadata.communityId) return null;

    const row = this.db.prepare(`
      SELECT * FROM communities WHERE id = ?
    `).get(node.metadata.communityId) as Record<string, unknown> | undefined;

    return row ? {
      id: row.id as number,
      name: row.name as string | undefined,
      size: row.size as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    } : null;
  }

  /**
   * 获取社区成员
   */
  getCommunityMembers(communityId: number): CommunityMembersResult | null {
    const communityRow = this.db.prepare(`
      SELECT * FROM communities WHERE id = ?
    `).get(communityId) as Record<string, unknown> | undefined;

    if (!communityRow) return null;

    const community: Community = {
      id: communityRow.id as number,
      name: communityRow.name as string | undefined,
      size: communityRow.size as number,
      createdAt: communityRow.created_at as number,
      updatedAt: communityRow.updated_at as number,
    };

    // 查询该社区的所有成员
    const rows = this.db.prepare(`
      SELECT * FROM nodes WHERE json_extract(metadata, '$.communityId') = ?
    `).all(communityId) as Record<string, unknown>[];

    const members = rows.map(row => this.nodeManager.getById(row.id as string)!);

    return { community, members };
  }

  /**
   * 获取调用链（从某函数出发的所有调用路径）
   */
  getCallChain(startNodeId: string, maxDepth: number = 5): GraphNode[] {
    const visited = this.bfs(startNodeId, {
      direction: 'outgoing',
      edgeKinds: ['CALLS'],
      maxDepth,
    });

    return this.nodeManager.getByIds(Array.from(visited.keys()).filter(id => id !== startNodeId));
  }

  /**
   * 获取调用者（所有调用某函数的节点）
   */
  getCallers(targetNodeId: string, maxDepth: number = 3): GraphNode[] {
    const visited = this.bfs(targetNodeId, {
      direction: 'incoming',
      edgeKinds: ['CALLS'],
      maxDepth,
    });

    return this.nodeManager.getByIds(Array.from(visited.keys()).filter(id => id !== targetNodeId));
  }

  /**
   * 将数据库行转换为边对象
   */
  private rowToEdge(row: Record<string, unknown>): GraphEdge {
    let metadata = {};
    try {
      if (row.metadata) {
        metadata = JSON.parse(row.metadata as string);
      }
    } catch {
      metadata = {};
    }

    return {
      id: row.id as string,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      kind: row.kind as EdgeKind,
      confidenceTier: (row.confidence_tier as string) as any || 'EXTRACTED',
      metadata,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  /**
   * 关闭查询器
   */
  close(): void {
    this.db.exec('DROP TABLE IF EXISTS _impact_seeds');
    this.db.exec('DROP TABLE IF EXISTS _impact_visited');
  }
}
