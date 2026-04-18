/**
 * GraphMemory Types - 图存储类型定义
 * 
 * 定义图存储系统的核心数据类型和接口
 */

// ==================== 节点类型 ====================

/** 节点类型枚举 */
export type NodeKind = 
  | 'File' 
  | 'Class' 
  | 'Function' 
  | 'Method' 
  | 'Type' 
  | 'Interface' 
  | 'Enum' 
  | 'Test'
  | 'Variable'
  | 'Concept'
  | 'Entity'
  | 'Document'
  | 'Person'
  | 'Project';

/** 节点元数据接口 */
export interface NodeMetadata {
  language?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  signature?: string;
  isTest?: boolean;
  tags?: string[];
  importance?: number;
  [key: string]: unknown;
}

/** 节点接口 */
export interface GraphNode {
  id: string;
  kind: NodeKind;
  qualifiedName: string;
  name: string;
  content?: string;
  metadata: NodeMetadata;
  createdAt: number;
  updatedAt: number;
}

/** 创建节点的输入 */
export interface CreateNodeInput {
  id?: string;
  kind: NodeKind;
  qualifiedName: string;
  name: string;
  content?: string;
  metadata?: Partial<NodeMetadata>;
}

/** 更新节点的输入 */
export interface UpdateNodeInput {
  name?: string;
  content?: string;
  metadata?: Partial<NodeMetadata>;
}

// ==================== 边类型 ====================

/** 边类型枚举 */
export type EdgeKind = 
  | 'CALLS'
  | 'IMPORTS'
  | 'IMPORTS_FROM'
  | 'INHERITS'
  | 'IMPLEMENTS'
  | 'CONTAINS'
  | 'TESTED_BY'
  | 'DEPENDS_ON'
  | 'REFERENCES'
  | 'ASSOCIATED_WITH'
  | 'RELATED_TO'
  | 'EXTENDS';

/** 置信度层级 */
export type ConfidenceTier = 'EXTRACTED' | 'INFERRED' | 'DERIVED';

/** 边元数据接口 */
export interface EdgeMetadata {
  filePath?: string;
  line?: number;
  confidence?: number;
  reason?: string;
  [key: string]: unknown;
}

/** 边接口 */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: EdgeKind;
  confidenceTier: ConfidenceTier;
  metadata: EdgeMetadata;
  createdAt: number;
  updatedAt: number;
}

/** 创建边的输入 */
export interface CreateEdgeInput {
  id?: string;
  sourceId: string;
  targetId: string;
  kind: EdgeKind;
  confidenceTier?: ConfidenceTier;
  metadata?: Partial<EdgeMetadata>;
}

/** 更新边的输入 */
export interface UpdateEdgeInput {
  confidenceTier?: ConfidenceTier;
  metadata?: Partial<EdgeMetadata>;
}

// ==================== 查询类型 ====================

/** 图遍历方向 */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

/** 遍历算法 */
export type TraversalAlgorithm = 'bfs' | 'dfs';

/** 路径查询结果 */
export interface PathResult {
  path: string[];
  edges: GraphEdge[];
  length: number;
}

/** 影响力半径查询结果 */
export interface ImpactRadiusResult {
  seedNodes: GraphNode[];
  impactedNodes: GraphNode[];
  impactedEdges: GraphEdge[];
  truncated: boolean;
  totalImpacted: number;
  depth: number;
}

/** 子图提取结果 */
export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** 邻居查询选项 */
export interface NeighborQueryOptions {
  direction?: TraversalDirection;
  edgeKinds?: EdgeKind[];
  maxDepth?: number;
  limit?: number;
}

// ==================== 统计类型 ====================

/** 图统计信息 */
export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByKind: Record<NodeKind, number>;
  edgesByKind: Record<EdgeKind, number>;
  lastUpdated: number | null;
}

// ==================== 社区发现类型 ====================

/** 社区接口 */
export interface Community {
  id: number;
  name?: string;
  size: number;
  createdAt: number;
  updatedAt: number;
}

/** 社区成员查询结果 */
export interface CommunityMembersResult {
  community: Community;
  members: GraphNode[];
}

// ==================== 搜索类型 ====================

/** 节点搜索选项 */
export interface NodeSearchOptions {
  kinds?: NodeKind[];
  limit?: number;
  offset?: number;
}

/** 边搜索选项 */
export interface EdgeSearchOptions {
  sourceId?: string;
  targetId?: string;
  kinds?: EdgeKind[];
  limit?: number;
  offset?: number;
}

// ==================== 事务类型 ====================

/** 批量操作项 */
export interface BatchOperation {
  type: 'node' | 'edge';
  operation: 'create' | 'update' | 'delete';
  data: CreateNodeInput | CreateEdgeInput | string; // string = id for delete
}

/** 事务结果 */
export interface TransactionResult {
  success: boolean;
  operationsCount: number;
  errors: Array<{ operation: number; error: string }>;
}

// ==================== 存储配置 ====================

/** 存储配置 */
export interface GraphMemoryConfig {
  dbPath: string;
  enableWAL?: boolean;
  busyTimeout?: number;
  cacheSize?: number;
  pageSize?: number;
}

/** 默认配置 */
export const DEFAULT_GRAPH_MEMORY_CONFIG: GraphMemoryConfig = {
  dbPath: './graph-memory.db',
  enableWAL: true,
  busyTimeout: 5000,
  cacheSize: 2000,
  pageSize: 4096,
};

// ==================== 内存系统集成类型 ====================

/** 记忆节点类型映射 */
export interface MemoryNodeMapping {
  nodeId: string;
  memoryId: string;
  memoryType: 'preference' | 'fact' | 'context' | 'skill';
  confidence: number;
  createdAt: number;
}

/** 知识关联查询 */
export interface KnowledgeAssociationQuery {
  sourceNodeId: string;
  targetDomain?: string;
  maxDepth?: number;
  minConfidence?: number;
}
