/**
 * Memory System Module
 * 
 * Integrated memory system with FTS5 full-text search capabilities
 * and Active Memory for proactive context injection.
 */

// Core Memory System
export { MemorySystem } from './MemorySystem';
export type { MemorySystemOptions, RecallTrackingStats, RecallSessionResult } from './MemorySystem';

// FTS5 Components
export { 
  FTS5Indexer, 
  CrossSessionSearch, 
  SessionMemoryStore 
} from './fts5';
export type { MemoryEntry, SearchResult, IndexStats, SessionMemory } from './fts5';

// Active Memory System
export {
  ActiveMemoryManager,
  PreferenceTracker,
  KnowledgeGapDetector,
} from './active';
export { DEFAULT_ACTIVE_MEMORY_CONFIG } from './active';

// Active Memory Types
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
  MemoryEntry as ActiveMemoryEntry,
  SearchDebugInfo,
  RecallStatus,
  QueryMode,
  PromptStyle,
  ThinkingLevel,
  ChatType,
  ModelFallbackPolicy,
} from './active';


// ============== Recall Tracking Module ==============
// Recall tracking for Dreaming scoring
export {
  RecallTracker,
  createRecallTracker,
  getGlobalRecallTracker,
  setGlobalRecallTracker,
  RecallSignalRecorder,
  defaultRecorder,
  RecallStatistics,
  defaultStatistics,
} from './tracking';

// ============== Dreaming System Module ==============
// Memory consolidation and dreaming for memory integration
export {
  DreamingSystem,
  createDreamingSystem,
  DreamingScheduler,
  SevenSignalScorer,
  MemoryConsolidator,
  DreamingPhase,
} from './dreaming';

// ============== Feedback Memory System Module ==============
// Memory Loop - Q&A → Markdown → Graph Enrichment
export {
  MemoryLoop,
  createMemoryLoop,
  MemoryFileWatcher,
  createFileWatcher,
  createMemoryFeedbackSystem,
} from './feedback';

export type {
  MemoryRecord,
  ExtractedKnowledge,
  KnowledgeRelation,
  MemoryLoopConfig,
  GraphInjector,
  FileWatcherConfig,
  FileWatcherEvent,
  FileChangeEvent,
  MemoryLoopStats,
  MarkdownFormatOptions,
  WatcherProcessedEvent,
  WatcherErrorEvent,
  MemoryFeedbackSystem,
} from './feedback';
