/**
 * 图存储模块导出
 * Graph Storage Module Exports
 */

// 类型定义
export {
  // 核心类型
  NodeKind,
  EdgeKind,
  GraphNode,
  GraphEdge,
  EdgeQueryOptions,
  Subgraph,
  ImpactResult,
  Community,
  GraphStats,
  GraphStoreConfig,
  CommunityDetectionConfig,
  NodeCandidate,
  EdgeWeightOptions,
} from './types';

// GraphStore - 图存储引擎
export { GraphStore } from './GraphStore';

// CommunityDetector - 社区发现算法
export { CommunityDetector } from './CommunityDetector';

/**
 * 创建图存储实例的便捷函数
 */
import { GraphStore } from './GraphStore';
import { GraphStoreConfig } from './types';

export function createGraphStore(config?: GraphStoreConfig): GraphStore {
  return new GraphStore(config);
}

/**
 * 图存储模块默认配置
 */
export const DEFAULT_GRAPH_CONFIG: GraphStoreConfig = {
  dbPath: ':memory:',
  inMemory: true,
  enableWal: true,
  autoCommit: true,
};
