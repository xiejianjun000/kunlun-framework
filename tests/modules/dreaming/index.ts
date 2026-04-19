/**
 * dreaming/index.ts - Dreaming系统导出
 * 
 * OpenTaiji三阶段记忆整合的三阶段记忆整合系统
 */

export * from './types';
export { DreamingScheduler, DEFAULT_DREAMING_CONFIG, PROMOTION_WEIGHTS, PHASE_SIGNAL_CONFIG } from './DreamingScheduler';
export type { SchedulerEvents, PhaseResult, DreamingResult } from './DreamingScheduler';

export { LightPhaseExecutor } from './LightPhaseExecutor';
export type { LightPhaseResult } from './LightPhaseExecutor';

export { DeepPhaseRanker, DEFAULT_WEIGHTS } from './DeepPhaseRanker';
export type { DeepPhaseResult, DeepPhaseOptions } from './DeepPhaseRanker';

export { REMPhaseExtractor } from './REMPhaseExtractor';
export type { ExtractorOptions, ExtractionResult, PatternReflection, CandidateTruth } from './REMPhaseExtractor';

export { RecallTracker } from './RecallTracker';
export type { RecordRecallParams, AuditResult } from './RecallTracker';

export { MemoryDreamingIntegration } from './MemoryDreamingIntegration';
export type { MemoryDreamingIntegrationOptions } from './MemoryDreamingIntegration';
