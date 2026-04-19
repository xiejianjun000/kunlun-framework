/**
 * Active Memory System Module
 * 
 * 基于OpenTaiji主动记忆架构的主动记忆管理系统导出
 */

export { ActiveMemoryManager, default } from './ActiveMemoryManager';
export { PreferenceTracker } from './PreferenceTracker';
export { KnowledgeGapDetector } from './KnowledgeGapDetector';

export type {
  ActiveMemoryConfig,
  ActiveMemoryManagerState,
  RecallResult,
  RecallContext,
  ConversationContext,
  ActiveMemoryEvent,
  ActiveMemoryEventType,
  MemoryRecalledEventData,
  PreferenceDetectedEventData,
  GapDetectedEventData,
  HeartbeatTickEventData,
  SessionEventData,
  UserPreference,
  PreferenceEvidence,
  PreferenceTrackerState,
  PreferenceTrackingConfig,
  PreferenceChangeType,
  KnowledgeGap,
  KnowledgeGapDetectorState,
  KnowledgeGapConfig,
  GapSeverity,
  KnowledgeDomain,
  MemoryEntry,
  SearchDebugInfo,
  RecallStatus,
  QueryMode,
  PromptStyle,
  ThinkingLevel,
  ChatType,
  ModelFallbackPolicy,
} from './types';

export { DEFAULT_ACTIVE_MEMORY_CONFIG } from './types';
