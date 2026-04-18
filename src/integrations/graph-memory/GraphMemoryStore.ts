/**
 * GraphMemoryStore - 图存储主类
 * 
 * SQLite-backed graph storage for OpenTaiji memory system.
 * Provides unified interface for node/edge operations and graph queries.
 */

import Database = require('better-sqlite3');
import { NodeManager } from './NodeManager';
import { EdgeManager } from './EdgeManager';
import { GraphQuery } from './GraphQuery';
import type {
  GraphNode,
  GraphEdge,
  NodeKind,
  EdgeKind,
  ConfidenceTier,
  CreateNodeInput,
  CreateEdgeInput,
  UpdateNodeInput,
  UpdateEdgeInput,
  GraphMemoryConfig,
  GraphStats,
  TraversalDirection,
  PathResult,
  ImpactRadiusResult,
  SubgraphResult,
  Community,
  CommunityMembersResult,
  NeighborQueryOptions,
  NodeSearchOptions,
  EdgeSearchOptions,
} from './types';
import { DEFAULT_GRAPH_MEMORY_CONFIG } from './types';
import * as fs from 'fs';

export class GraphMemoryStore implements AsyncDisposable {
  private db: Database.Database;
  private config: GraphMemoryConfig;
  private nodeManager: NodeManager;
  private edgeManager: EdgeManager;
  private graphQuery: GraphQuery;
  private isInitialized = false;

  constructor(config: Partial<GraphMemoryConfig> = {}) {
    this.config = { ...DEFAULT_GRAPH_MEMORY_CONFIG, ...config };
    
    // 创建数据库连接
    this.db = new Database(this.config.dbPath, {
      timeout: this.config.busyTimeout,
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // 配置数据库
    this.configureDatabase();

    // 初始化管理器
    this.nodeManager = new NodeManager(this.db);
    this.edgeManager = new EdgeManager(this.db);
    this.graphQuery = new GraphQuery(this.db);
  }

  /**
   * 配置数据库参数
   */
  private configureDatabase(): void {
    // 启用WAL模式
    if (this.config.enableWAL) {
      this.db.pragma('journal_mode = WAL');
    }

    // 设置busy timeout
    this.db.pragma(`busy_timeout = ${this.config.busyTimeout}`);

    // 设置缓存大小
    this.db.pragma(`cache_size = -${this.config.cacheSize}`);

    // 设置页面大小
    if (this.config.pageSize) {
      this.db.pragma(`page_size = ${this.config.pageSize}`);
    }

    // 启用外键约束
    this.db.pragma('foreign_keys = ON');

    // 启用自动vacuum
    this.db.pragma('auto_vacuum = INCREMENTAL');
  }

  /**
   * 初始化数据库schema
   */
  initialize(): void {
    if (this.isInitialized) return;

    // 读取schema文件
    const schemaPath = require.resolve('./schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // 执行schema初始化
    this.db.exec(schema);

    // 设置schema版本
    this.db.prepare(`
      INSERT OR IGNORE INTO metadata (key, value, updated_at)
      VALUES ('schema_version', '1', ?)
    `).run(Date.now());

    this.isInitialized = true;
  }

  /**
   * 异步初始化（兼容AsyncDisposable）
   */
  async initializeAsync(): Promise<void> {
    this.initialize();
  }

  // ==================== 节点操作 ====================

  /**
   * 创建节点
   */
  createNode(input: CreateNodeInput): GraphNode {
    return this.nodeManager.upsert(input);
  }

  /**
   * 批量创建节点
   */
  createNodes(inputs: CreateNodeInput[]): GraphNode[] {
    return this.nodeManager.upsertBatch(inputs);
  }

  /**
   * 获取节点
   */
  getNode(id: string): GraphNode | null {
    return this.nodeManager.getById(id);
  }

  /**
   * 根据qualified name获取节点
   */
  getNodeByQualifiedName(qualifiedName: string): GraphNode | null {
    return this.nodeManager.getByQualifiedName(qualifiedName);
  }

  /**
   * 根据类型获取节点
   */
  getNodesByKind(kind: NodeKind): GraphNode[] {
    return this.nodeManager.getByKind(kind);
  }

  /**
   * 搜索节点
   */
  searchNodes(query: string, options?: NodeSearchOptions): GraphNode[] {
    return this.nodeManager.search(query, options);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(options?: NodeSearchOptions): GraphNode[] {
    return this.nodeManager.getAll(options);
  }

  /**
   * 更新节点
   */
  updateNode(id: string, input: UpdateNodeInput): GraphNode | null {
    return this.nodeManager.update(id, input);
  }

  /**
   * 删除节点（同时删除关联的边）
   */
  deleteNode(id: string): boolean {
    // 先删除关联的边
    this.edgeManager.deleteAllByNode(id);
    // 再删除节点
    return this.nodeManager.delete(id);
  }

  /**
   * 检查节点是否存在
   */
  nodeExists(id: string): boolean {
    return this.nodeManager.exists(id);
  }

  // ==================== 边操作 ====================

  /**
   * 创建边
   */
  createEdge(input: CreateEdgeInput): GraphEdge {
    return this.edgeManager.create(input);
  }

  /**
   * 创建或更新边
   */
  upsertEdge(input: CreateEdgeInput): GraphEdge {
    return this.edgeManager.upsert(input);
  }

  /**
   * 批量创建边
   */
  createEdges(inputs: CreateEdgeInput[]): GraphEdge[] {
    return this.edgeManager.upsertBatch(inputs);
  }

  /**
   * 获取边
   */
  getEdge(id: string): GraphEdge | null {
    return this.edgeManager.getById(id);
  }

  /**
   * 获取节点的所有出边
   */
  getOutgoingEdges(nodeId: string, kinds?: EdgeKind[]): GraphEdge[] {
    return this.edgeManager.getBySource(nodeId, kinds);
  }

  /**
   * 获取节点的所有入边
   */
  getIncomingEdges(nodeId: string, kinds?: EdgeKind[]): GraphEdge[] {
    return this.edgeManager.getByTarget(nodeId, kinds);
  }

  /**
   * 搜索边
   */
  searchEdges(options?: EdgeSearchOptions): GraphEdge[] {
    return this.edgeManager.search(options);
  }

  /**
   * 更新边
   */
  updateEdge(id: string, input: UpdateEdgeInput): GraphEdge | null {
    return this.edgeManager.update(id, input);
  }

  /**
   * 删除边
   */
  deleteEdge(id: string): boolean {
    return this.edgeManager.delete(id);
  }

  /**
   * 检查边是否存在
   */
  edgeExists(id: string): boolean {
    return this.edgeManager.exists(id);
  }

  // ==================== 图查询 ====================

  /**
   * 获取邻居节点
   */
  getNeighbors(nodeId: string, options?: NeighborQueryOptions): GraphNode[] {
    return this.graphQuery.getNeighbors(nodeId, options);
  }

  /**
   * BFS遍历
   */
  bfs(
    startNodeId: string,
    options?: {
      direction?: TraversalDirection;
      edgeKinds?: EdgeKind[];
      maxDepth?: number;
      maxNodes?: number;
    }
  ): Map<string, number> {
    return this.graphQuery.bfs(startNodeId, options);
  }

  /**
   * DFS遍历
   */
  dfs(
    startNodeId: string,
    options?: {
      direction?: TraversalDirection;
      edgeKinds?: EdgeKind[];
      maxDepth?: number;
    }
  ): Set<string> {
    return this.graphQuery.dfs(startNodeId, options);
  }

  /**
   * 最短路径
   */
  shortestPath(startNodeId: string, endNodeId: string): PathResult | null {
    return this.graphQuery.shortestPath(startNodeId, endNodeId);
  }

  /**
   * 影响力半径
   */
  getImpactRadius(seedNodeIds: string[], maxDepth?: number, maxNodes?: number): ImpactRadiusResult {
    return this.graphQuery.getImpactRadius(seedNodeIds, maxDepth, maxNodes);
  }

  /**
   * 提取子图
   */
  getSubgraph(nodeIds: string[]): SubgraphResult {
    return this.graphQuery.getSubgraph(nodeIds);
  }

  /**
   * 调用链
   */
  getCallChain(startNodeId: string, maxDepth?: number): GraphNode[] {
    return this.graphQuery.getCallChain(startNodeId, maxDepth);
  }

  /**
   * 调用者
   */
  getCallers(targetNodeId: string, maxDepth?: number): GraphNode[] {
    return this.graphQuery.getCallers(targetNodeId, maxDepth);
  }

  // ==================== 社区发现 ====================

  /**
   * 检测社区
   */
  detectCommunities(): Community[] {
    return this.graphQuery.detectCommunities();
  }

  /**
   * 获取节点所在社区
   */
  getNodeCommunity(nodeId: string): Community | null {
    return this.graphQuery.getNodeCommunity(nodeId);
  }

  /**
   * 获取社区成员
   */
  getCommunityMembers(communityId: number): CommunityMembersResult | null {
    return this.graphQuery.getCommunityMembers(communityId);
  }

  // ==================== 统计信息 ====================

  /**
   * 获取图统计信息
   */
  getStats(): GraphStats {
    const nodeStats = this.nodeManager.getStats();
    const edgeStats = this.edgeManager.getStats();

    const lastUpdatedRow = this.db.prepare(`
      SELECT value FROM metadata WHERE key = 'last_updated'
    `).get() as { value: string } | undefined;

    return {
      totalNodes: nodeStats.total,
      totalEdges: edgeStats.total,
      nodesByKind: nodeStats.byKind as Record<NodeKind, number>,
      edgesByKind: edgeStats.byKind as Record<EdgeKind, number>,
      lastUpdated: lastUpdatedRow ? parseInt(lastUpdatedRow.value, 10) : null,
    };
  }

  /**
   * 更新最后更新时间
   */
  touch(): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value, updated_at)
      VALUES ('last_updated', ?, ?)
    `).run(now.toString(), now);
  }

  // ==================== 批量操作 ====================

  /**
   * 原子性存储文件数据（节点和边）
   */
  storeFileData(
    filePath: string,
    nodes: CreateNodeInput[],
    edges: CreateEdgeInput[]
  ): void {
    const transaction = this.db.transaction(() => {
      // 先删除该文件的现有数据（如果有filePath元数据）
      const existingNodes = this.nodeManager.getAll({ limit: 100000 });
      for (const node of existingNodes) {
        if (node.metadata?.filePath === filePath) {
          this.edgeManager.deleteAllByNode(node.id);
          this.nodeManager.delete(node.id);
        }
      }

      // 插入新数据
      this.createNodes(nodes);
      this.createEdges(edges);

      // 更新最后修改时间
      this.touch();
    });

    transaction();
  }

  /**
   * 批量存储
   */
  storeBatch(
    items: Array<{
      nodes: CreateNodeInput[];
      edges: CreateEdgeInput[];
    }>
  ): void {
    const transaction = this.db.transaction(() => {
      for (const item of items) {
        this.createNodes(item.nodes);
        this.createEdges(item.edges);
      }
      this.touch();
    });

    transaction();
  }

  // ==================== 数据库维护 ====================

  /**
   * 清理孤立节点（没有任何边的节点）
   */
  pruneOrphanNodes(): number {
    const orphanRows = this.db.prepare(`
      SELECT n.id FROM nodes n
      LEFT JOIN edges e ON n.id = e.source_id OR n.id = e.target_id
      WHERE e.id IS NULL
    `).all() as Array<{ id: string }>;

    let deleted = 0;
    for (const row of orphanRows) {
      if (this.nodeManager.delete(row.id)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * 清理过期节点
   */
  pruneStaleNodes(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    const staleRows = this.db.prepare(`
      SELECT id FROM nodes WHERE updated_at < ?
    `).all(cutoff) as Array<{ id: string }>;

    let deleted = 0;
    for (const row of staleRows) {
      this.edgeManager.deleteAllByNode(row.id);
      if (this.nodeManager.delete(row.id)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * VACUUM数据库
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  /**
   * 分析数据库（更新查询计划统计）
   */
  analyze(): void {
    this.db.exec('ANALYZE');
  }

  /**
   * 获取数据库文件大小（字节）
   */
  getDatabaseSize(): number {
    const { statSync } = require('fs') as { statSync: (path: string) => { size: number } };
    return statSync(this.config.dbPath).size;
  }

  // ==================== 事务控制 ====================

  /**
   * 执行事务
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * 执行批量事务
   */
  batch<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // ==================== 生命周期 ====================

  /**
   * 关闭存储
   */
  close(): void {
    this.nodeManager.close();
    this.edgeManager.close();
    this.graphQuery.close();
    this.db.close();
  }

  /**
   * 异步销毁（用于using声明）
   */
  async [Symbol.asyncDispose](): Promise<void> {
    this.close();
  }

  /**
   * 同步销毁（用于using声明）
   */
  [Symbol.dispose](): void {
    this.close();
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建图存储实例
 */
export function createGraphMemoryStore(config?: Partial<GraphMemoryConfig>): GraphMemoryStore {
  const store = new GraphMemoryStore(config);
  store.initialize();
  return store;
}

/**
 * 异步创建图存储实例
 */
export async function createGraphMemoryStoreAsync(
  config?: Partial<GraphMemoryConfig>
): Promise<GraphMemoryStore> {
  const store = new GraphMemoryStore(config);
  await store.initializeAsync();
  return store;
}

// ==================== 默认导出 ====================

export default GraphMemoryStore;
