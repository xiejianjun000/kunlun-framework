/**
 * 记忆系统核心接口定义
 * Memory System Core Interfaces
 */

import { EventEmitter } from 'events';

// ============== 基础类型定义 ==============

/**
 * 记忆层级枚举
 */
export enum MemoryTier {
  /** L1 热记忆 - Redis LRU缓存 (<1ms) */
  HOT = 'hot',
  /** L2 工作记忆 - 进程内LRU (即时) */
  WORKING = 'working',
  /** L3 温记忆 - SQLite + FTS5 (<10ms) */
  WARM = 'warm',
  /** L4 冷记忆 - Qdrant向量库 + Neo4j */
  COLD = 'cold',
}

/**
 * 记忆重要性级别
 */
export enum ImportanceLevel {
  CRITICAL = 1.0,   // 关键记忆
  HIGH = 0.8,       // 高重要性
  MEDIUM = 0.5,     // 中等重要性
  LOW = 0.2,        // 低重要性
  TRIVIAL = 0.0,    // 微不足道
}

/**
 * 记忆关联类型
 */
export enum MemoryRelationType {
  CAUSAL = 'causal',           // 因果关系
  TEMPORAL = 'temporal',       // 时间关系
  SEMANTIC = 'semantic',       // 语义相似
  TOPIC = 'topic',             // 主题相关
  REFERENCE = 'reference',     // 引用关系
  USER_DEFINED = 'user_defined', // 用户自定义
}

// ============== 核心接口定义 ==============

/**
 * 记忆条目
 */
export interface IMemory {
  /** 记忆唯一标识 */
  id: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 记忆内容 */
  content: string;
  /** 记忆类型 */
  type: string;
  /** 记忆层级 */
  tier: MemoryTier;
  /** 向量嵌入 (可选) */
  embedding?: number[];
  /** 元数据 */
  metadata: IMemoryMetadata;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  accessedAt: Date;
  /** 访问次数 */
  accessCount: number;
  /** 重要性评分 (0-1) */
  importanceScore: number;
  /** 关联记忆ID列表 */
  linkedMemoryIds?: string[];
  /** 是否已归档 */
  isArchived: boolean;
  /** 标签 */
  tags?: string[];
}

/**
 * 记忆元数据
 */
export interface IMemoryMetadata {
  /** 来源 */
  source?: string;
  /** 上下文 */
  context?: string;
  /** 情感标记 */
  sentiment?: 'positive' | 'negative' | 'neutral';
  /** 情感强度 */
  sentimentIntensity?: number;
  /** 关键词 */
  keywords?: string[];
  /** 主题 */
  topic?: string;
  /** 自定义字段 */
  [key: string]: any;
}

/**
 * 记忆检索选项
 */
export interface IMemoryRetrieveOptions {
  /** 检索模式 */
  mode?: 'semantic' | 'keyword' | 'hybrid';
  /** 记忆层级过滤 */
  tiers?: MemoryTier[];
  /** 时间范围 */
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  /** 相似度阈值 */
  similarityThreshold?: number;
  /** 结果数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 标签过滤 */
  tags?: string[];
  /** 是否包含归档记忆 */
  includeArchived?: boolean;
}

/**
 * 记忆检索结果
 */
export interface IMemorySearchResult {
  /** 记忆条目 */
  memory: IMemory;
  /** 相似度分数 */
  score: number;
  /** 匹配片段 */
  matchedSegments?: string[];
}

/**
 * 记忆存储配置
 */
export interface IMemoryStoreConfig {
  /** 数据库类型 */
  dbType: 'sqlite' | 'postgresql';
  /** 数据库路径/连接字符串 */
  connectionString: string;
  /** 向量维度 */
  vectorDimension?: number;
  /** 表前缀 */
  tablePrefix?: string;
  /** 连接池大小 */
  poolSize?: number;
}

/**
 * 记忆保留策略
 */
export interface IRetentionPolicy {
  /** 策略名称 */
  name: string;
  /** 热记忆TTL (秒) */
  hotMemoryTtl: number;
  /** 工作记忆最大大小 */
  workingMemoryMaxSize: number;
  /** 温记忆TTL (天) */
  warmMemoryTtlDays: number;
  /** 冷记忆保留期限 (天) */
  coldMemoryRetentionDays: number;
  /** 最小重要性阈值 */
  minImportanceThreshold: number;
  /** 自动清理间隔 (秒) */
  cleanupIntervalSeconds: number;
  /** 是否启用自动清理 */
  autoCleanupEnabled: boolean;
}

/**
 * 重要性评分器接口
 */
export interface IImportanceScorer {
  /** 评分器唯一标识 */
  id: string;
  /** 评分器名称 */
  name: string;
  /** 计算重要性评分 */
  score(memory: IMemory): Promise<number>;
  /** 获取评分理由 */
  getReason(score: number): string;
}

/**
 * 记忆关联
 */
export interface IMemoryLink {
  /** 关联唯一标识 */
  id: string;
  /** 源记忆ID */
  sourceMemoryId: string;
  /** 目标记忆ID */
  targetMemoryId: string;
  /** 关联类型 */
  relationType: MemoryRelationType;
  /** 关联强度 (0-1) */
  strength: number;
  /** 创建时间 */
  createdAt: Date;
  /** 元数据 */
  metadata?: Record<string, any>;
}

// ============== 事件定义 ==============

/**
 * 记忆系统事件
 */
export enum MemorySystemEvent {
  /** 记忆存储事件 */
  MEMORY_STORED = 'memory:stored',
  /** 记忆检索事件 */
  MEMORY_RETRIEVED = 'memory:retrieved',
  /** 记忆更新事件 */
  MEMORY_UPDATED = 'memory:updated',
  /** 记忆删除事件 */
  MEMORY_DELETED = 'memory:deleted',
  /** 记忆迁移事件 */
  MEMORY_MIGRATED = 'memory:migrated',
  /** 记忆归档事件 */
  MEMORY_ARCHIVED = 'memory:archived',
  /** 记忆巩固事件 */
  MEMORY_CONSOLIDATED = 'memory:consolidated',
  /** 记忆清理事件 */
  MEMORY_CLEANED = 'memory:cleaned',
  /** 记忆关联事件 */
  MEMORY_LINKED = 'memory:linked',
  /** 系统错误事件 */
  SYSTEM_ERROR = 'memory:error',
}

// ============== 回调类型定义 ==============

/**
 * 记忆存储钩子
 */
export type MemoryStoreHook = (memory: IMemory) => Promise<void>;

/**
 * 记忆检索钩子
 */
export type MemoryRetrieveHook = (results: IMemorySearchResult[], query: string) => Promise<IMemorySearchResult[]>;

/**
 * 记忆迁移钩子
 */
export type MemoryMigrationHook = (memory: IMemory, fromTier: MemoryTier, toTier: MemoryTier) => Promise<void>;

/**
 * 记忆清理钩子
 */
export type MemoryCleanupHook = (cleanedMemories: IMemory[]) => Promise<void>;

// ============== 内存系统核心接口 ==============

/**
 * 记忆系统配置
 */
export interface IMemorySystemConfig {
  /** 是否启用多租户 */
  multiTenant?: boolean;
  /** 存储配置 */
  storeConfig: IMemoryStoreConfig;
  /** 向量存储配置 */
  vectorStoreConfig?: IVectorStoreConfig;
  /** 默认保留策略 */
  defaultRetentionPolicy?: IRetentionPolicy;
  /** 默认重要性评分器 */
  defaultImportanceScorer?: IImportanceScorer;
  /** 最大并发操作数 */
  maxConcurrentOps?: number;
  /** 调试模式 */
  debugMode?: boolean;
}

/**
 * 向量存储配置
 */
export interface IVectorStoreConfig {
  /** 向量存储类型 */
  type: 'qdrant' | 'chroma' | 'local';
  /** 连接URL */
  url?: string;
  /** API密钥 */
  apiKey?: string;
  /** collection前缀 */
  collectionPrefix?: string;
  /** 向量维度 */
  vectorDimension?: number;
  /** 距离度量 */
  distanceMetric?: 'cosine' | 'euclidean' | 'dotproduct';
}

/**
 * 记忆系统主接口
 */
export interface IMemorySystem extends EventEmitter {
  // ============== 生命周期 ==============
  
  /**
   * 初始化记忆系统
   */
  initialize(): Promise<void>;
  
  /**
   * 销毁记忆系统
   */
  destroy(): Promise<void>;

  // ============== 记忆操作 ==============

  /**
   * 存储记忆
   * @param memory 记忆条目
   * @param userId 用户ID
   * @returns 记忆ID
   */
  store(memory: Omit<IMemory, 'id' | 'createdAt' | 'accessedAt' | 'accessCount'>, userId: string): Promise<string>;

  /**
   * 批量存储记忆
   * @param memories 记忆列表
   * @param userId 用户ID
   * @returns 记忆ID列表
   */
  storeBatch(memories: Omit<IMemory, 'id' | 'createdAt' | 'accessedAt' | 'accessCount'>[], userId: string): Promise<string[]>;

  /**
   * 检索记忆
   * @param query 查询文本
   * @param userId 用户ID
   * @param options 检索选项
   * @returns 检索结果列表
   */
  retrieve(query: string, userId: string, options?: IMemoryRetrieveOptions): Promise<IMemorySearchResult[]>;

  /**
   * 获取记忆
   * @param memoryId 记忆ID
   * @param userId 用户ID
   * @returns 记忆条目
   */
  get(memoryId: string, userId: string): Promise<IMemory | null>;

  /**
   * 更新记忆
   * @param memoryId 记忆ID
   * @param updates 更新内容
   * @param userId 用户ID
   * @returns 更新后的记忆
   */
  update(memoryId: string, updates: Partial<IMemory>, userId: string): Promise<IMemory>;

  /**
   * 删除记忆
   * @param memoryId 记忆ID
   * @param userId 用户ID
   */
  delete(memoryId: string, userId: string): Promise<void>;

  /**
   * 归档记忆
   * @param memoryId 记忆ID
   * @param userId 用户ID
   */
  archive(memoryId: string, userId: string): Promise<void>;

  // ============== 记忆层级管理 ==============

  /**
   * 巩固记忆 (短期→长期)
   * @param memoryId 记忆ID
   * @param userId 用户ID
   */
  consolidate(memoryId: string, userId: string): Promise<void>;

  /**
   * 迁移记忆到指定层级
   * @param memoryId 记忆ID
   * @param targetTier 目标层级
   * @param userId 用户ID
   */
  migrateToTier(memoryId: string, targetTier: MemoryTier, userId: string): Promise<void>;

  // ============== 保留策略 ==============

  /**
   * 设置保留策略
   * @param policy 保留策略
   * @param userId 用户ID
   */
  setRetentionPolicy(policy: IRetentionPolicy, userId: string): Promise<void>;

  /**
   * 获取保留策略
   * @param userId 用户ID
   * @returns 保留策略
   */
  getRetentionPolicy(userId: string): IRetentionPolicy;

  // ============== 重要性评分 ==============

  /**
   * 设置重要性评分器
   * @param scorer 评分器
   * @param userId 用户ID
   */
  setImportanceScorer(scorer: IImportanceScorer, userId: string): Promise<void>;

  /**
   * 评估记忆重要性
   * @param memoryId 记忆ID
   * @param userId 用户ID
   * @returns 重要性评分
   */
  evaluateImportance(memoryId: string, userId: string): Promise<number>;

  // ============== 关联分析 ==============

  /**
   * 创建记忆关联
   * @param sourceId 源记忆ID
   * @param targetId 目标记忆ID
   * @param relationType 关联类型
   * @param strength 关联强度
   * @param userId 用户ID
   */
  linkMemories(
    sourceId: string,
    targetId: string,
    relationType: MemoryRelationType,
    strength: number,
    userId: string
  ): Promise<void>;

  /**
   * 获取记忆关联
   * @param memoryId 记忆ID
   * @param userId 用户ID
   * @returns 关联列表
   */
  getMemoryLinks(memoryId: string, userId: string): Promise<IMemoryLink[]>;

  /**
   * 发现相关记忆
   * @param memoryId 记忆ID
   * @param userId 用户ID
   * @param limit 结果数量
   * @returns 相关记忆列表
   */
  discoverRelatedMemories(memoryId: string, userId: string, limit?: number): Promise<IMemory[]>;

  // ============== 维护操作 ==============

  /**
   * 执行清理
   */
  performCleanup(): Promise<number>;

  /**
   * 重建索引
   * @param userId 用户ID
   */
  rebuildIndex(userId?: string): Promise<void>;

  /**
   * 获取系统统计
   * @param userId 用户ID
   * @returns 统计信息
   */
  getStats(userId?: string): Promise<IMemorySystemStats>;

  // ============== 钩子管理 ==============

  /**
   * 注册记忆存储钩子
   */
  onMemoryStore(callback: MemoryStoreHook): void;

  /**
   * 注册记忆检索钩子
   */
  onMemoryRetrieve(callback: MemoryRetrieveHook): void;

  /**
   * 注册记忆迁移钩子
   */
  onMemoryMigration(callback: MemoryMigrationHook): void;

  /**
   * 注册记忆清理钩子
   */
  onMemoryCleanup(callback: MemoryCleanupHook): void;
}

/**
 * 记忆系统统计信息
 */
export interface IMemorySystemStats {
  /** 用户数 */
  userCount: number;
  /** 记忆总数 */
  totalMemories: number;
  /** 各层级记忆数量 */
  memoriesByTier: Record<MemoryTier, number>;
  /** 平均重要性评分 */
  avgImportanceScore: number;
  /** 关联总数 */
  totalLinks: number;
  /** 最后清理时间 */
  lastCleanupTime: Date | null;
  /** 存储大小 (字节) */
  storageSizeBytes: number;
}

// ============== 默认值 ==============

/**
 * 默认记忆保留策略
 */
export const DEFAULT_RETENTION_POLICY: IRetentionPolicy = {
  name: 'default',
  hotMemoryTtl: 1800,           // 30分钟
  workingMemoryMaxSize: 100,    // 100条
  warmMemoryTtlDays: 7,         // 7天
  coldMemoryRetentionDays: 365, // 1年
  minImportanceThreshold: 0.2,   // 最低重要性
  cleanupIntervalSeconds: 3600, // 1小时
  autoCleanupEnabled: true,
};

/**
 * 默认向量维度
 */
export const DEFAULT_VECTOR_DIMENSION = 1536;

/**
 * 记忆层级转移映射
 */
export const TIER_TRANSITION_MAP: Record<MemoryTier, MemoryTier> = {
  [MemoryTier.HOT]: MemoryTier.WORKING,
  [MemoryTier.WORKING]: MemoryTier.WARM,
  [MemoryTier.WARM]: MemoryTier.COLD,
  [MemoryTier.COLD]: MemoryTier.COLD,
};

/**
 * 层级到存储层映射
 */
export const TIER_TO_STORAGE_LAYER: Record<MemoryTier, 'redis' | 'memory' | 'sqlite' | 'qdrant'> = {
  [MemoryTier.HOT]: 'redis',
  [MemoryTier.WORKING]: 'memory',
  [MemoryTier.WARM]: 'sqlite',
  [MemoryTier.COLD]: 'qdrant',
};
