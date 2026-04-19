/**
 * Dreaming System - 记忆整合模块
 * 
 * 基于 OpenCLAW Dreaming System 实现
 * @see https://github.com/opensatoru/openclaw/docs/concepts/dreaming.md
 * 
 * 核心功能:
 * 1. Recall Tracking - 记录和追踪记忆召回信号
 * 2. 7信号评分 - 基于频率、相关性、多样性、新近度、整合度、概念密度的综合评分
 * 3. 梦境处理 - 三阶段记忆整合（浅睡眠、深睡眠、REM）
 * 
 * @example
 * ```typescript
 * import { createDreamingSystem, DreamingPhase } from './dreaming';
 * 
 * const dreaming = createDreamingSystem('./workspace', {
 *   enabled: true,
 *   frequency: '0 3 * * *', // 每天凌晨3点
 * });
 * 
 * dreaming.start();
 * 
 * // 或者手动触发
 * const result = await dreaming.triggerCycle();
 * console.log('Promoted:', result.totalPromoted);
 * 
 * // 获取7信号评分详情
 * const details = await dreaming.getSevenSignalDetails('memory-key');
 * console.log('Score:', details.score);
 * console.log('Components:', details.components);
 * ```
 */

// ============== 类型导出 ==============
export {
  type MemoryEntry,
  type ShortTermRecallEntry,
  type PromotionWeights,
  type PromotionComponents,
  type PromotionCandidate,
  type PhaseSignalEntry,
  type PhaseSignalStore,
  type DreamingPhaseConfig,
  type LightDreamingConfig,
  type DeepDreamingConfig,
  type RemDreamingConfig,
  type DreamingSystemConfig,
  type DreamDiaryPreview,
  type DreamingResult,
  type DreamingCycleResult,
  type DreamingSchedulerState,
  type DreamingSchedulerCallback,
  type ConsolidateOptions,
  type ConsolidateResult,
  type ShortTermAuditIssue,
  type ShortTermAuditSummary,
  type DreamingProcessingConfig,
  type RecallEntry,
  DEFAULT_PROMOTION_WEIGHTS,
  DEFAULT_DREAMING_CONFIG,
  DreamingPhase,
} from './types';

// ============== 核心组件导出 ==============

// 7信号评分器
export {
  SevenSignalScorer,
  clampScore,
  calculateFrequencyComponent,
  calculateRelevanceComponent,
  calculateDiversityComponent,
  calculateRecencyComponent,
  calculateConsolidationComponent,
  calculateConceptualComponent,
  calculatePhaseSignalBoost,
  scoreEntry,
  rankCandidates,
  totalSignalCountForEntry,
} from './SevenSignalScorer';

// 记忆整合器
export {
  MemoryConsolidator,
  consolidateMemory,
  readShortTermRecallEntries,
  readPhaseSignals,
  recordDreamingPhaseSignals,
  getPromotionCandidates,
  auditShortTermPromotion,
  resolveStorePath,
  resolvePhaseSignalPath,
  resolveLockPath,
  resolveMemoryPath,
} from './MemoryConsolidator';

// 梦境处理器（新增）
export {
  DreamingProcessor,
  createDreamingProcessor,
  SimpleLLMIntegration,
  DreamingProcessorModule,
  type LLMIntegrationConfig,
  type DreamingContext,
  type ConsolidationResult,
  type DreamingProcessingResult,
} from './DreamingProcessor';

// 调度器
export {
  DreamingScheduler,
  DreamingSchedulerClass,
  createDreamingScheduler,
  DreamingSchedulerModule,
} from './DreamingScheduler';

// 主系统
export {
  DreamingSystem,
  createDreamingSystem,
  DreamingSystemModule,
  FileSystemRecallAdapter,
} from './DreamingSystem';
