/**
 * 记忆系统模块导出
 * Memory System Module - Index
 */

// 核心接口
export {
  MemoryTier,
  ImportanceLevel,
  MemoryRelationType,
  MemorySystemEvent,
  DEFAULT_RETENTION_POLICY,
  type IMemory,
  type IMemoryMetadata,
  type IMemoryRetrieveOptions,
  type IMemorySearchResult,
  type IMemoryStoreConfig,
  type IRetentionPolicy,
  type IImportanceScorer,
  type IMemoryLink,
  type IMemorySystem,
  type IMemorySystemConfig,
  type IVectorStoreConfig,
  type IMemorySystemStats,
  type MemoryStoreHook,
  type MemoryRetrieveHook,
  type MemoryMigrationHook,
  type MemoryCleanupHook,
} from './interfaces';

// 主类
export { MemorySystem } from './MemorySystem';

// 存储
export { MemoryStore, type MemorySearchOptions } from './storage/MemoryStore';

// 索引
export { MemoryIndexer, type IndexEntry } from './indexing/MemoryIndexer';

// 检索
export { MemoryRetriever, type RetrievalConfig } from './retrieval/MemoryRetriever';

// 处理
export { MemoryProcessor, type ProcessingResult, type ProcessorConfig } from './processing/MemoryProcessor';
export { MemoryConsolidator, type ConsolidationResult, type ConsolidationPolicy } from './processing/MemoryConsolidator';
export { MemoryPruner, type PruneResult } from './processing/MemoryPruner';

// 评分
export { ImportanceScorer, type ScoringStrategy } from './scoring/ImportanceScorer';

// 关联
export { MemoryLinker, type LinkDiscoveryConfig } from './linking/MemoryLinker';

// 适配器
export {
  VectorStoreAdapter,
  VectorStoreAdapterFactory,
  type VectorSearchResult,
  type VectorSearchOptions,
  type VectorUpsertItem,
  type VectorStoreConfig,
} from './adapters/VectorStoreAdapter';

export { QdrantAdapter, type QdrantConfig } from './adapters/QdrantAdapter';
