/**
 * GraphMemory - 图存储模块
 * 
 * SQLite-backed graph storage for OpenTaiji memory system.
 * 基于SQLite的图存储实现，用于支持记忆系统。
 * 
 * @example
 * ```typescript
 * import { createGraphMemoryStore } from './integrations/graph-memory';
 * 
 * const store = createGraphMemoryStore({ dbPath: './memory-graph.db' });
 * 
 * // 创建节点
 * const node = store.createNode({
 *   kind: 'Concept',
 *   qualifiedName: 'open-taiji:graph-memory',
 *   name: 'GraphMemory',
 *   content: '图存储模块，提供基于SQLite的知识图谱存储',
 * });
 * 
 * // 创建边
 * const edge = store.upsertEdge({
 *   sourceId: node.id,
 *   targetId: anotherNode.id,
 *   kind: 'DEPENDS_ON',
 * });
 * 
 * // 图查询
 * const neighbors = store.getNeighbors(node.id);
 * const path = store.shortestPath(startNodeId, endNodeId);
 * 
 * // 关闭
 * store.close();
 * ```
 */

// 主存储类
export { GraphMemoryStore, createGraphMemoryStore, createGraphMemoryStoreAsync } from './GraphMemoryStore';

// 节点管理器
export { NodeManager } from './NodeManager';

// 边管理器
export { EdgeManager } from './EdgeManager';

// 图查询
export { GraphQuery } from './GraphQuery';

// 类型定义
export type {
  // 节点类型
  GraphNode,
  NodeKind,
  NodeMetadata,
  CreateNodeInput,
  UpdateNodeInput,
  
  // 边类型
  GraphEdge,
  EdgeKind,
  ConfidenceTier,
  EdgeMetadata,
  CreateEdgeInput,
  UpdateEdgeInput,
  
  // 查询类型
  TraversalDirection,
  TraversalAlgorithm,
  PathResult,
  ImpactRadiusResult,
  SubgraphResult,
  NeighborQueryOptions,
  
  // 统计类型
  GraphStats,
  
  // 社区类型
  Community,
  CommunityMembersResult,
  
  // 搜索类型
  NodeSearchOptions,
  EdgeSearchOptions,
  
  // 事务类型
  BatchOperation,
  TransactionResult,
  
  // 配置类型
  GraphMemoryConfig,
  
  // 内存系统集成
  MemoryNodeMapping,
  KnowledgeAssociationQuery,
} from './types';
