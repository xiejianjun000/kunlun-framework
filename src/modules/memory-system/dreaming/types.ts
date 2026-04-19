/**
 * Dreaming System Types
 * 记忆整合系统类型定义
 * 
 * 基于 OpenCLAW Dreaming System 实现
 * @see https://github.com/opensatoru/openclaw/docs/concepts/dreaming.md
 */

// ============== 基础类型 ==============

/**
 * 记忆条目
 */
export interface MemoryEntry {
  key: string;
  path: string;
  startLine: number;
  endLine: number;
  snippet: string;
  createdAt: string;
  lastModified: string;
}

/**
 * 短期记忆条目
 */
export interface ShortTermRecallEntry {
  key: string;
  path: string;
  startLine: number;
  endLine: number;
  source: 'memory' | 'session' | 'grounded';
  snippet: string;
  recallCount: number;
  dailyCount: number;
  groundedCount: number;
  totalScore: number;
  maxScore: number;
  firstRecalledAt: string;
  lastRecalledAt: string;
  queryHashes: string[];
  recallDays: string[];
  conceptTags: string[];
  claimHash?: string;
  promotedAt?: string;
}

/**
 * 7信号评分权重
 */
export interface PromotionWeights {
  frequency: number;   // 0.24 - 出现频率
  relevance: number;   // 0.30 - 检索质量
  diversity: number;   // 0.15 - 查询多样性
  recency: number;     // 0.15 - 时间衰减
  consolidation: number; // 0.10 - 多日重复强度
  conceptual: number;  // 0.06 - 概念密度
}

// 默认权重配置
export const DEFAULT_PROMOTION_WEIGHTS: PromotionWeights = {
  frequency: 0.24,
  relevance: 0.30,
  diversity: 0.15,
  recency: 0.15,
  consolidation: 0.10,
  conceptual: 0.06,
};

/**
 * 7信号评分分量
 */
export interface PromotionComponents {
  frequency: number;
  relevance: number;
  diversity: number;
  recency: number;
  consolidation: number;
  conceptual: number;
}

/**
 * 晋升候选条目
 */
export interface PromotionCandidate {
  key: string;
  path: string;
  startLine: number;
  endLine: number;
  source: 'memory' | 'session' | 'grounded';
  snippet: string;
  recallCount: number;
  dailyCount?: number;
  groundedCount?: number;
  signalCount?: number;
  avgScore: number;
  maxScore: number;
  uniqueQueries: number;
  claimHash?: string;
  promotedAt?: string;
  firstRecalledAt: string;
  lastRecalledAt: string;
  ageDays: number;
  score: number;
  recallDays: string[];
  conceptTags: string[];
  components: PromotionComponents;
  phaseBoost?: number;
}

// ============== 梦境阶段类型 ==============

/**
 * 梦境阶段枚举
 */
export enum DreamingPhase {
  /** 
   * 浅睡眠阶段 - 摄入和整理近期记忆信号
   */
  LIGHT = 'light',
  /** 
   * 深睡眠阶段 - 评分并晋升候选条目到长期记忆
   */
  DEEP = 'deep',
  /** 
   * REM阶段 - 提取主题模式和反思信号
   */
  REM = 'rem',
}

/**
 * 阶段信号记录
 */
export interface PhaseSignalEntry {
  key: string;
  lightHits: number;
  remHits: number;
  lastLightAt?: string;
  lastRemAt?: string;
}

/**
 * 阶段信号存储
 */
export interface PhaseSignalStore {
  version: 1;
  updatedAt: string;
  entries: Record<string, PhaseSignalEntry>;
}

/**
 * 梦境阶段配置
 */
export interface DreamingPhaseConfig {
  enabled: boolean;
  lookbackDays: number;
  limit: number;
  deduplicationSimilarity: number;
  timezone?: string;
  storage: {
    mode: 'inline' | 'separate' | 'both';
    separateReports: boolean;
  };
}

/**
 * 浅睡眠配置
 */
export interface LightDreamingConfig extends DreamingPhaseConfig {
  phase: DreamingPhase.LIGHT;
  maxSnippetChars: number;
  minSnippetChars: number;
  ingestionScore: number;
}

/**
 * 深睡眠配置
 */
export interface DeepDreamingConfig extends DreamingPhaseConfig {
  phase: DreamingPhase.DEEP;
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
}

/**
 * REM睡眠配置
 */
export interface RemDreamingConfig extends DreamingPhaseConfig {
  phase: DreamingPhase.REM;
  minPatternStrength: number;
}

// ============== 梦境系统配置 ==============

/**
 * 梦境系统主配置
 */
export interface DreamingSystemConfig {
  enabled: boolean;
  frequency: string;  // cron 表达式
  timezone?: string;
  light: Omit<LightDreamingConfig, 'phase'>;
  deep: Omit<DeepDreamingConfig, 'phase'>;
  rem: Omit<RemDreamingConfig, 'phase'>;
}

/**
 * 默认梦境系统配置
 */
export const DEFAULT_DREAMING_CONFIG: DreamingSystemConfig = {
  enabled: false,
  frequency: '0 3 * * *',  // 每天凌晨3点
  timezone: 'Asia/Shanghai',
  light: {
    enabled: true,
    lookbackDays: 7,
    limit: 50,
    deduplicationSimilarity: 0.85,
    storage: { mode: 'inline', separateReports: false },
    maxSnippetChars: 280,
    minSnippetChars: 8,
    ingestionScore: 0.62,
  },
  deep: {
    enabled: true,
    lookbackDays: 14,
    limit: 10,
    deduplicationSimilarity: 0.85,
    storage: { mode: 'inline', separateReports: false },
    minScore: 0.75,
    minRecallCount: 3,
    minUniqueQueries: 2,
  },
  rem: {
    enabled: true,
    lookbackDays: 7,
    limit: 5,
    deduplicationSimilarity: 0.88,
    storage: { mode: 'inline', separateReports: false },
    minPatternStrength: 0.3,
  },
};

// ============== 梦境结果类型 ==============

/**
 * 梦境日记预览
 */
export interface DreamDiaryPreview {
  phase: DreamingPhase;
  snippets: string[];
  themes?: string[];
  reflections?: string[];
  candidateTruths?: Array<{
    snippet: string;
    confidence: number;
    evidence: string;
  }>;
}

/**
 * 梦境执行结果
 */
export interface DreamingResult {
  phase: DreamingPhase;
  success: boolean;
  entriesProcessed: number;
  entriesPromoted?: number;
  score?: number;
  error?: string;
  timestamp: string;
}

/**
 * 完整梦境周期结果
 */
export interface DreamingCycleResult {
  startTime: string;
  endTime: string;
  phases: {
    light: DreamingResult;
    deep?: DreamingResult;
    rem: DreamingResult;
  };
  totalPromoted: number;
  diaryEntries: string[];
}

// ============== 调度器类型 ==============

/**
 * 调度器状态
 */
export interface DreamingSchedulerState {
  lastRun?: string;
  nextRun?: string;
  isRunning: boolean;
  currentPhase?: DreamingPhase;
  error?: string;
}

/**
 * 调度器回调
 */
export type DreamingSchedulerCallback = (result: DreamingResult) => void | Promise<void>;

// ============== 记忆整合器类型 ==============

/**
 * 整合选项
 */
export interface ConsolidateOptions {
  workspaceDir: string;
  candidates: PromotionCandidate[];
  limit?: number;
  minScore?: number;
  minRecallCount?: number;
  minUniqueQueries?: number;
  maxAgeDays?: number;
  timezone?: string;
  nowMs?: number;
}

/**
 * 整合结果
 */
export interface ConsolidateResult {
  memoryPath: string;
  applied: number;
  appended: number;
  reconciledExisting: number;
  appliedCandidates: PromotionCandidate[];
}

// ============== 审核类型 ==============

/**
 * 短期记忆审核问题
 */
export interface ShortTermAuditIssue {
  severity: 'warn' | 'error';
  code:
    | 'recall-store-unreadable'
    | 'recall-store-empty'
    | 'recall-store-invalid'
    | 'recall-lock-stale'
    | 'recall-lock-unreadable';
  message: string;
  fixable: boolean;
}

/**
 * 短期记忆审核摘要
 */
export interface ShortTermAuditSummary {
  storePath: string;
  lockPath: string;
  updatedAt?: string;
  exists: boolean;
  entryCount: number;
  promotedCount: number;
  spacedEntryCount: number;
  conceptTaggedEntryCount: number;
  invalidEntryCount: number;
  issues: ShortTermAuditIssue[];
}

// ============== 梦境处理器类型 ==============

/**
 * 梦境处理配置
 */
export interface DreamingProcessingConfig {
  /** 最大候选条目数量 */
  maxCandidates: number;
  /** 最小评分阈值 */
  minScore: number;
  /** 最小召回次数 */
  minRecallCount: number;
  /** 最小唯一查询数 */
  minUniqueQueries: number;
  /** 新近度半衰期（天） */
  recencyHalfLifeDays: number;
  /** 7信号评分权重 */
  weights: PromotionWeights;
  /** 时区 */
  timezone?: string;
}

/**
 * 召回条目（与tracking/types.ts中的RecallEntry对应）
 */
export interface RecallEntry {
  key: string;
  path: string;
  startLine: number;
  endLine: number;
  source: 'memory' | 'session' | 'grounded' | 'wiki';
  snippet: string;
  recallCount: number;
  dailyCount: number;
  groundedCount: number;
  totalScore: number;
  maxScore: number;
  firstRecalledAt: string;
  lastRecalledAt: string;
  queryHashes: string[];
  recallDays: string[];
  conceptTags: string[];
  claimHash?: string;
  promotedAt?: string;
}
