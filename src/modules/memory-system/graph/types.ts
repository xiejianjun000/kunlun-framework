/**
 * 图存储类型定义
 * Graph Storage Type Definitions
 */

/**
 * 节点类型
 */
export type NodeKind = 'Concept' | 'Entity' | 'Event' | 'Preference' | 'Skill';

/**
 * 边类型
 */
export type EdgeKind = 'RELATES_TO' | 'CAUSES' | 'SUPPORTS' | 'CONTRADICTS';

/**
 * 图节点
 */
export interface GraphNode {
  /** 节点唯一标识 (命名空间:名称) */
  qualifiedName: string;
  /** 节点显示名称 */
  name: string;
  /** 节点类型 */
  kind: NodeKind;
  /** 节点内容描述 */
  content?: string;
  /** 向量嵌入 (用于语义搜索) */
  embedding?: number[];
  /** 节点元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

/**
 * 图边
 */
export interface GraphEdge {
  /** 源节点全限定名 */
  sourceQualified: string;
  /** 目标节点全限定名 */
  targetQualified: string;
  /** 边类型 */
  kind: EdgeKind;
  /** 置信度 (0-1) */
  confidence: number;
  /** 边权重 */
  weight?: number;
  /** 边元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt?: Date;
}

/**
 * 边查询选项
 */
export interface EdgeQueryOptions {
  /** 源节点 (可选) */
  sourceQualified?: string;
  /** 目标节点 (可选) */
  targetQualified?: string;
  /** 边类型过滤 (可选) */
  kind?: EdgeKind;
  /** 最小置信度 */
  minConfidence?: number;
  /** 限制返回数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 子图结构
 */
export interface Subgraph {
  /** 节点列表 */
  nodes: GraphNode[];
  /** 边列表 */
  edges: GraphEdge[];
  /** 根节点 */
  root: string;
}

/**
 * 影响半径查询结果
 */
export interface ImpactResult {
  /** 节点 */
  node: GraphNode;
  /** 到根节点的距离 */
  distance: number;
  /** 路径上的边 */
  path: GraphEdge[];
}

/**
 * 社区结构
 */
export interface Community {
  /** 社区ID */
  id: number;
  /** 社区名称 */
  name?: string;
  /** 成员节点 */
  nodes: GraphNode[];
  /** 社区内边 */
  edges: GraphEdge[];
  /** 模块度 */
  modularity?: number;
}

/**
 * 图统计信息
 */
export interface GraphStats {
  /** 节点总数 */
  nodeCount: number;
  /** 边总数 */
  edgeCount: number;
  /** 按类型统计的节点 */
  nodesByKind: Record<NodeKind, number>;
  /** 按类型统计的边 */
  edgesByKind: Record<EdgeKind, number>;
  /** 平均度数 */
  avgDegree: number;
  /** 社区数量 */
  communityCount: number;
}

/**
 * 图存储配置
 */
export interface GraphStoreConfig {
  /** 数据库路径 */
  dbPath?: string;
  /** 内存模式 (用于测试) */
  inMemory?: boolean;
  /** 启用 WAL 模式 */
  enableWal?: boolean;
  /** 自动提交 */
  autoCommit?: boolean;
}

/**
 * 社区检测配置
 */
export interface CommunityDetectionConfig {
  /** 最小社区大小 */
  minCommunitySize?: number;
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 随机种子 */
  randomSeed?: number;
  /** 权重阈值 */
  weightThreshold?: number;
}

/**
 * 节点候选 (用于社区检测)
 */
export interface NodeCandidate {
  qualifiedName: string;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  neighbors: Set<string>;
}

/**
 * 边权重计算选项
 */
export interface EdgeWeightOptions {
  /** 共现权重 */
  cooccurrenceWeight?: number;
  /** 语义相似度权重 */
  semanticWeight?: number;
  /** 时间衰减因子 */
  timeDecay?: number;
}
