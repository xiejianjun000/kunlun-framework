/**
 * types.ts - Dreaming系统类型定义
 * 
 * OpenTaiji三阶段记忆整合的类型定义
 */

// ============== 配置类型 ==============

export interface DreamingConfig {
  enabled: boolean;
  cron: string;               // Cron表达式
  timezone?: string;          // 时区
  limit: number;              // 每次最多处理数
  minScore: number;           // 最低评分阈值
  minRecallCount: number;     // 最少召回次数
  minUniqueQueries: number;   // 最少独立查询数
  recencyHalfLifeDays?: number;// 新近度半衰期
  maxAgeDays?: number;        // 最大记忆天数
  lookbackDays: number;      // 回溯天数
  verboseLogging: boolean;
  storage?: {
    mode: 'inline' | 'separate' | 'both';
    separateReports: boolean;
  };
}

export interface DreamingStatus {
  enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  phase: DreamingPhase;
}

// ============== 阶段类型 ==============

export type DreamingPhase = 'light' | 'deep' | 'rem' | 'idle';

export interface LightDreamingConfig extends DreamingConfig {
  lookbackDays: number;
  limit: number;
}

export interface DeepDreamingConfig extends DreamingConfig {
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
  recencyHalfLifeDays?: number;
  maxAgeDays?: number;
}

export interface RemDreamingConfig extends DreamingConfig {
  patternLimit: number;
  minPatternStrength: number;
}

// ============== 召回追踪类型 ==============

export interface ShortTermRecallEntry {
  key: string;
  path: string;
  startLine: number;
  endLine: number;
  source: 'memory' | 'session' | 'daily';
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

export interface ShortTermRecallStore {
  version: number;
  updatedAt: string;
  entries: Record<string, ShortTermRecallEntry>;
}

export interface PhaseSignalEntry {
  key: string;
  lightHits: number;
  remHits: number;
  lastLightAt?: string;
  lastRemAt?: string;
}

export interface PhaseSignalStore {
  version: number;
  updatedAt: string;
  entries: Record<string, PhaseSignalEntry>;
}

// ============== 评分组件类型 ==============

export interface PromotionWeights {
  frequency: number;
  relevance: number;
  diversity: number;
  recency: number;
  consolidation: number;
  conceptual: number;
}

export interface PromotionComponents {
  frequency: number;
  relevance: number;
  diversity: number;
  recency: number;
  consolidation: number;
  conceptual: number;
  phaseBoost: number;
}

// ============== 候选提升类型 ==============

export interface PromotionCandidate {
  key: string;
  path: string;
  startLine: number;
  endLine: number;
  source: 'memory' | 'session' | 'daily';
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
}

export interface ApplyPromotionResult {
  applied: number;
  appended: number;
  reconciledExisting: number;
  appliedCandidates: PromotionCandidate[];
}

// ============== REM阶段类型 ==============

export interface RemTruthSelection {
  key: string;
  snippet: string;
  confidence: number;
  evidence: string;
}

export interface RemDreamingPreview {
  sourceEntryCount: number;
  reflections: string[];
  candidateTruths: RemTruthCandidate[];
  candidateKeys: string[];
  bodyLines: string[];
}

export interface RemTruthCandidate {
  snippet: string;
  confidence: number;
  evidence: string;
}

export interface RemDreamingCandidate {
  snippet: string;
  confidence: number;
  evidence: string;
}

// ============== 审计类型 ==============

export interface DreamingAuditIssue {
  severity: 'warn' | 'error';
  code: string;
  message: string;
  fixable: boolean;
}

export interface DreamingAuditSummary {
  storePath: string;
  lockPath: string;
  updatedAt?: string;
  exists: boolean;
  entryCount: number;
  promotedCount: number;
  spacedEntryCount: number;
  conceptTaggedEntryCount: number;
  invalidEntryCount: number;
  issues: DreamingAuditIssue[];
}

// ============== 报告类型 ==============

export interface DreamingReport {
  timestamp: string;
  phase: DreamingPhase;
  candidatesProcessed: number;
  candidatesPromoted: number;
  duration: number;
  details?: string[];
}

// ============== 记忆片段类型 ==============

export interface MemorySnippet {
  startLine: number;
  endLine: number;
  snippet: string;
}

export interface DailySnippetChunk {
  day: string;
  startLine: number;
  endLine: number;
  snippet: string;
}

// ============== 工具函数类型 ==============

export type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface RecallRecordParams {
  workspaceDir: string;
  query: string;
  results: Array<{
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: string;
  }>;
  signalType: 'recall' | 'daily' | 'grounded';
  dedupeByQueryPerDay?: boolean;
  dayBucket?: string;
  nowMs?: number;
  timezone?: string;
}

export interface RankParams {
  workspaceDir: string;
  limit: number;
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
  recencyHalfLifeDays?: number;
  maxAgeDays?: number;
  nowMs?: number;
}

export interface ApplyParams {
  workspaceDir: string;
  candidates: PromotionCandidate[];
  limit: number;
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
  maxAgeDays?: number;
  nowMs?: number;
  timezone?: string;
}
