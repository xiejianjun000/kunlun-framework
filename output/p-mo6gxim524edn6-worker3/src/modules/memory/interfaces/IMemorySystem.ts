/**
 * 记忆系统接口定义
 * 基于 OpenClaw Memory Core 架构移植到 OpenTaiji
 */

// ===== 记忆层级 =====

export enum MemoryTier {
  /** 瞬时记忆 - 最近几条消息 */
  EPHEMERAL = 'ephemeral',
  /** 短期记忆 - 当前会话上下文 */
  SHORT_TERM = 'short_term',
  /** 长期记忆 - 经过筛选的重要记忆 */
  LONG_TERM = 'long_term',
  /** 永久记忆 - 写入知识图谱 */
  PERMANENT = 'permanent'
}

// ===== 记忆条目 =====

export interface MemoryEntry {
  /** 记忆唯一ID */
  id: string;
  /** 记忆内容 */
  content: string;
  /** 记忆层级 */
  tier: MemoryTier;
  /** 来源引用 */
  source?: {
    type: 'conversation' | 'document' | 'url' | 'user_input';
    id: string;
    timestamp: string;
  };
  /** 重要性评分 (0-1) */
  importance?: number;
  /** 时效性评分 (0-1) */
  recency?: number;
  /** 相关性评分 (0-1) */
  relevance?: number;
  /** 综合评分 */
  score?: number;
  /** 访问次数 */
  accessCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 最后访问时间 */
  lastAccessedAt: string;
  /** 实体标签 */
  entities?: string[];
  /** 关键词 */
  keywords?: string[];
  /** 向量化表示 */
  embedding?: number[];
  /** WFGY验证状态 */
  wfgyVerified?: boolean;
  /** 幻觉风险评分 (0-1，越低越好) */
  hallucinationRisk?: number;
  /** 关联的Wiki声明ID */
  claimIds?: string[];
}

// ===== 记忆检索结果 =====

export interface MemorySearchResult {
  /** 匹配的记忆条目 */
  entries: MemoryEntry[];
  /** 检索用时(ms) */
  latency: number;
  /** 语义相似度分数 */
  semanticScores: number[];
  /** 关键词匹配分数 */
  keywordScores: number[];
  /** 综合分数 */
  combinedScores: number[];
}

// ===== 记忆晋升结果 =====

export interface PromotionResult {
  /** 晋升的记忆数量 */
  promotedCount: number;
  /** 筛选掉的记忆数量 */
  filteredCount: number;
  /** 晋升的条目详情 */
  promoted: Array<{
    id: string;
    fromTier: MemoryTier;
    toTier: MemoryTier;
    reason: string;
  }>;
  /** 是否触发梦境合成 */
  triggerDreaming: boolean;
  /** 触发梦境的阈值原因 */
  dreamTriggerReason?: string;
}

// ===== 记忆系统配置 =====

export interface MemorySystemConfig {
  /** 短期记忆最大容量 */
  shortTermMaxSize?: number;
  /** 长期记忆最大容量 */
  longTermMaxSize?: number;
  /** 晋升阈值 (0-1) */
  promotionThreshold?: number;
  /** 重要性权重 */
  importanceWeight?: number;
  /** 时效性权重 */
  recencyWeight?: number;
  /** 相关性权重 */
  relevanceWeight?: number;
  /** 触发梦境的记忆数量阈值 */
  dreamThresholdCount?: number;
  /** 自动晋升间隔(ms) */
  autoPromotionInterval?: number;
  /** 向量化配置 */
  embedding?: {
    enabled: boolean;
    model?: string;
    dimensions?: number;
  };
  /** WFGY集成配置 */
  wfgyIntegration?: {
    enabled: boolean;
    /** 晋升前自动验证 */
    verifyBeforePromotion: boolean;
    /** 高风险记忆自动过滤 */
    autoFilterHighRisk: boolean;
    /** 风险阈值 */
    riskThreshold: number;
  };
}

// ===== 记忆系统接口 =====

export interface IMemorySystem {
  /**
   * 添加记忆条目
   */
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>): Promise<string>;

  /**
   * 批量添加记忆
   */
  addBatch(entries: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>[]): Promise<string[]>;

  /**
   * 检索记忆
   * @param query 查询文本
   * @param tier 可选记忆层级过滤
   * @param limit 返回数量限制
   */
  search(query: string, tier?: MemoryTier, limit?: number): Promise<MemorySearchResult>;

  /**
   * 根据ID获取记忆
   */
  get(id: string): Promise<MemoryEntry | null>;

  /**
   * 更新记忆评分
   */
  updateScore(id: string, scores: {
    importance?: number;
    recency?: number;
    relevance?: number;
  }): Promise<boolean>;

  /**
   * 执行记忆晋升
   * 将短期记忆中高分条目晋升到长期记忆
   */
  promote(): Promise<PromotionResult>;

  /**
   * 获取指定层级的记忆数量
   */
  count(tier?: MemoryTier): Promise<number>;

  /**
   * 删除记忆
   */
  delete(id: string): Promise<boolean>;

  /**
   * 清空指定层级
   */
  clear(tier: MemoryTier): Promise<void>;

  /**
   * 检查系统是否就绪
   */
  isReady(): boolean;
}
