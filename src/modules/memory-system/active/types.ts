/**
 * Active Memory System Types
 * 
 * 基于OpenTaiji主动记忆架构 v1.0的主动记忆系统类型定义
 */

// ==================== 核心枚举与常量 ====================

/** 查询模式 - 控制记忆子智能体如何检索上下文 */
export type QueryMode = 'message' | 'recent' | 'full';

/** 提示风格 - 控制记忆检索的严格程度 */
export type PromptStyle = 
  | 'balanced'
  | 'strict'
  | 'contextual'
  | 'recall-heavy'
  | 'precision-heavy'
  | 'preference-only';

/** 思考级别 */
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'adaptive';

/** 会话类型 */
export type ChatType = 'direct' | 'group' | 'channel';

/** 记忆检索结果状态 */
export type RecallStatus = 'ok' | 'empty' | 'timeout' | 'unavailable' | 'error';

/** 偏好变化类型 */
export type PreferenceChangeType = 'explicit' | 'implicit' | 'corrected' | 'confirmed';

/** 知识缺口严重程度 */
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';

/** 知识领域分类 */
export type KnowledgeDomain = 'technical' | 'personal' | 'professional' | 'general' | 'contextual';

/** 模型回退策略 */
export type ModelFallbackPolicy = 'default-remote' | 'resolved-only';

// ==================== 配置接口 ====================

export interface ActiveMemoryConfig {
  enabled: boolean;
  agents: string[];
  model?: string;
  modelFallback?: string;
  modelFallbackPolicy: ModelFallbackPolicy;
  allowedChatTypes: ChatType[];
  thinking: ThinkingLevel;
  promptStyle: PromptStyle;
  promptOverride?: string;
  promptAppend?: string;
  timeoutMs: number;
  queryMode: QueryMode;
  maxSummaryChars: number;
  recentUserTurns: number;
  recentAssistantTurns: number;
  recentUserChars: number;
  recentAssistantChars: number;
  logging: boolean;
  persistTranscripts: boolean;
  transcriptDir: string;
  cacheTtlMs: number;
  maxCacheEntries: number;
  preferenceTracking: PreferenceTrackingConfig;
  knowledgeGap: KnowledgeGapConfig;
  heartbeat: HeartbeatConfig;
}

export interface PreferenceTrackingConfig {
  enabled: boolean;
  explicitWeight: number;
  implicitWeight: number;
  decayFactor: number;
  confidenceThreshold: number;
  trackingWindowMs: number;
}

export interface KnowledgeGapConfig {
  enabled: boolean;
  severityThresholds: { low: number; medium: number; high: number };
  checkIntervalMs: number;
  minConfidenceForAction: number;
  autoResolve: boolean;
}

export interface HeartbeatConfig {
  enabled: boolean;
  checkOnHeartbeat: boolean;
  heartbeatIntervalMs: number;
  batchSize: number;
  backgroundScan: boolean;
}

export const DEFAULT_ACTIVE_MEMORY_CONFIG: ActiveMemoryConfig = {
  enabled: true,
  agents: ['main'],
  modelFallbackPolicy: 'resolved-only',
  allowedChatTypes: ['direct'],
  thinking: 'off',
  promptStyle: 'balanced',
  timeoutMs: 15_000,
  queryMode: 'recent',
  maxSummaryChars: 220,
  recentUserTurns: 2,
  recentAssistantTurns: 1,
  recentUserChars: 220,
  recentAssistantChars: 180,
  logging: true,
  persistTranscripts: false,
  transcriptDir: 'active-memory',
  cacheTtlMs: 15_000,
  maxCacheEntries: 1000,
  preferenceTracking: {
    enabled: true,
    explicitWeight: 1.0,
    implicitWeight: 0.7,
    decayFactor: 0.95,
    confidenceThreshold: 0.7,
    trackingWindowMs: 7 * 24 * 60 * 60 * 1000,
  },
  knowledgeGap: {
    enabled: true,
    severityThresholds: { low: 0.2, medium: 0.5, high: 0.8 },
    checkIntervalMs: 30_000,
    minConfidenceForAction: 0.6,
    autoResolve: false,
  },
  heartbeat: {
    enabled: true,
    checkOnHeartbeat: true,
    heartbeatIntervalMs: 60_000,
    batchSize: 10,
    backgroundScan: true,
  },
};

// ==================== 记忆数据接口 ====================

export interface MemoryEntry {
  id: string;
  type: 'preference' | 'fact' | 'context' | 'skill' | 'preference-history';
  content: string;
  source: 'explicit' | 'implicit' | 'derived' | 'imported';
  confidence: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  accessCount: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface UserPreference {
  id: string;
  category: string;
  key: string;
  value: string | number | boolean | object;
  changeType: PreferenceChangeType;
  confidence: number;
  evidence: PreferenceEvidence[];
  firstObserved: number;
  lastConfirmed: number;
  decayLevel: number;
}

export interface PreferenceEvidence {
  timestamp: number;
  source: 'conversation' | 'action' | 'correction';
  content: string;
  weight: number;
}

export interface KnowledgeGap {
  id: string;
  domain: KnowledgeDomain;
  topic: string;
  description: string;
  severity: GapSeverity;
  confidence: number;
  detectedAt: number;
  lastChecked: number;
  suggestedActions: string[];
  relatedMemories: string[];
  resolved: boolean;
  resolvedAt?: number;
}

export interface RecallResult {
  status: RecallStatus;
  elapsedMs: number;
  summary: string | null;
  rawReply?: string;
  cacheHit: boolean;
  searchDebug?: SearchDebugInfo;
}

export interface SearchDebugInfo {
  backend?: string;
  configuredMode?: string;
  effectiveMode?: string;
  fallback?: string;
  searchMs?: number;
  hits?: number;
  warning?: string;
  action?: string;
  error?: string;
}

// ==================== 事件接口 ====================

export type ActiveMemoryEventType = 
  | 'memory.recalled' | 'memory.cached' | 'memory.expired'
  | 'preference.detected' | 'preference.updated' | 'preference.confirmed' | 'preference.decayed'
  | 'gap.detected' | 'gap.resolved' | 'gap.updated'
  | 'heartbeat.tick' | 'session.start' | 'session.end'
  | 'query.started' | 'query.completed' | 'query.timeout' | 'query.error'
  | 'config.changed' | 'toggle.changed';

export interface ActiveMemoryEvent<T = unknown> {
  type: ActiveMemoryEventType;
  timestamp: number;
  sessionId: string;
  agentId: string;
  data: T;
  metadata?: Record<string, unknown>;
}

export interface MemoryRecalledEventData {
  query: string;
  result: RecallResult;
  injectedChars: number;
  wasCached: boolean;
  queryMode: QueryMode;
}

export interface PreferenceDetectedEventData {
  preference: UserPreference;
  changeType: PreferenceChangeType;
  confidence: number;
  triggerContent: string;
}

export interface GapDetectedEventData {
  gap: KnowledgeGap;
  trigger: string;
  confidence: number;
  severity: GapSeverity;
}

export interface HeartbeatTickEventData {
  tickCount: number;
  lastTickTime: number;
  pendingQueries: number;
  cacheSize: number;
  activeMonitors: number;
}

export interface SessionEventData {
  sessionKey: string;
  chatType: ChatType;
  messageCount: number;
}

// ==================== 上下文接口 ====================

export interface ConversationContext {
  sessionId: string;
  agentId: string;
  chatType: ChatType;
  sessionKey: string;
  recentUserTurns: Array<{ role: 'user'; text: string; timestamp: number }>;
  recentAssistantTurns: Array<{ role: 'assistant'; text: string; timestamp: number }>;
  currentMessage: string;
  timestamp: number;
  messageProvider?: string;
  channelId?: string;
}

export interface RecallContext {
  query: string;
  mode: QueryMode;
  maxChars: number;
  sessionKey?: string;
  messageProvider?: string;
  verboseEnabled?: boolean;
  currentModelProviderId?: string;
  currentModelId?: string;
}

// ==================== 状态接口 ====================

export interface PreferenceTrackerState {
  preferences: Map<string, UserPreference>;
  changeHistory: Array<{
    preferenceId: string;
    changeType: PreferenceChangeType;
    timestamp: number;
    oldValue?: unknown;
    newValue: unknown;
  }>;
  lastCleanupAt: number;
  totalTracked: number;
  confirmedCount: number;
}

export interface KnowledgeGapDetectorState {
  gaps: Map<string, KnowledgeGap>;
  activeMonitors: Map<string, {
    gapId: string;
    startTime: number;
    checkCount: number;
    lastCheckResult?: GapSeverity;
  }>;
  lastScanAt: number;
  totalDetected: number;
  resolvedCount: number;
}

export interface ActiveMemoryManagerState {
  config: ActiveMemoryConfig;
  isEnabled: boolean;
  sessionToggles: Map<string, boolean>;
  cacheStats: { size: number; hits: number; misses: number; evictions: number };
  performanceStats: {
    totalQueries: number;
    successfulQueries: number;
    timeoutQueries: number;
    failedQueries: number;
    avgLatencyMs: number;
  };
  uptime: number;
}

// ==================== 回调接口 ====================

export type RecallCallback = (result: RecallResult, context: RecallContext) => void | Promise<void>;
export type PreferenceChangeCallback = (
  preference: UserPreference, changeType: PreferenceChangeType, previousValue?: unknown
) => void | Promise<void>;
export type KnowledgeGapCallback = (
  gap: KnowledgeGap, action: 'detected' | 'updated' | 'resolved'
) => void | Promise<void>;
export type HeartbeatCallback = (tick: HeartbeatTickEventData) => void | Promise<void>;
export type ActiveMemoryEventListener<T = unknown> = (event: ActiveMemoryEvent<T>) => void | Promise<void>;
