/**
 * MemoryDreamingIntegration.ts - 记忆系统Dreaming集成
 * 
 * 将Dreaming系统与MemorySystem集成：
 * - 添加RecallTracker初始化
 * - 每次检索时记录召回
 * - 提供Dreaming触发接口
 */

import * as path from 'path';
import { DreamingScheduler, DEFAULT_DREAMING_CONFIG, DreamingResult } from './DreamingScheduler';
import { LightPhaseExecutor } from './LightPhaseExecutor';
import { DeepPhaseRanker } from './DeepPhaseRanker';
import { REMPhaseExtractor } from './REMPhaseExtractor';
import { RecallTracker } from './RecallTracker';
import { 
  DreamingConfig, 
  ShortTermRecallEntry,
  PromotionCandidate 
} from './types';

export interface MemoryDreamingIntegrationOptions {
  workspaceDir: string;
  dreamingConfig?: Partial<DreamingConfig>;
  onDreamingComplete?: (result: DreamingResult) => void;
  onPhaseStart?: (phase: 'light' | 'deep' | 'rem') => void;
  onPhaseComplete?: (phase: 'light' | 'deep' | 'rem', result: any) => void;
}

export class MemoryDreamingIntegration {
  private workspaceDir: string;
  private dreamingConfig: DreamingConfig;
  private scheduler: DreamingScheduler;
  private recallTracker: RecallTracker;
  private lightPhaseExecutor: LightPhaseExecutor | null = null;
  private deepPhaseRanker: DeepPhaseRanker | null = null;
  private remPhaseExtractor: REMPhaseExtractor | null = null;
  private isInitialized: boolean = false;
  private options: MemoryDreamingIntegrationOptions;

  constructor(options: MemoryDreamingIntegrationOptions) {
    this.options = options;
    this.workspaceDir = options.workspaceDir;
    this.dreamingConfig = { ...DEFAULT_DREAMING_CONFIG, ...options.dreamingConfig };
    
    // 初始化RecallTracker
    this.recallTracker = new RecallTracker(this.workspaceDir);
    
    // 初始化Scheduler
    this.scheduler = new DreamingScheduler(this.workspaceDir, this.dreamingConfig);
    
    // 注册事件回调
    this.registerEventHandlers();
  }

  /**
   * 初始化集成
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // 初始化各阶段执行器
    this.lightPhaseExecutor = new LightPhaseExecutor(
      this.workspaceDir,
      this.recallTracker,
      {
        lookbackDays: this.dreamingConfig.lookbackDays,
        limit: this.dreamingConfig.limit,
        timezone: this.dreamingConfig.timezone
      }
    );
    
    this.deepPhaseRanker = new DeepPhaseRanker(
      this.workspaceDir,
      this.recallTracker
    );
    
    this.remPhaseExtractor = new REMPhaseExtractor(
      this.workspaceDir,
      {
        patternLimit: 5,
        minPatternStrength: 0.4,
        truthConfidenceThreshold: 0.45,
        truthLimit: 3
      }
    );
    
    this.isInitialized = true;
    
    console.log('[MemoryDreamingIntegration] 初始化完成');
  }

  /**
   * 启动Dreaming调度
   */
  start(): void {
    if (!this.isInitialized) {
      throw new Error('请先调用initialize()方法');
    }
    
    this.scheduler.start();
    console.log('[MemoryDreamingIntegration] Dreaming调度已启动');
  }

  /**
   * 停止Dreaming调度
   */
  stop(): void {
    this.scheduler.stop();
    console.log('[MemoryDreamingIntegration] Dreaming调度已停止');
  }

  /**
   * 手动触发Dreaming执行
   */
  async trigger(): Promise<DreamingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.scheduler.trigger();
  }

  /**
   * 记录检索召回
   * 
   * 在每次记忆检索时调用此方法，记录召回事件
   */
  async recordRecall(params: {
    query: string;
    results: Array<{
      path: string;
      startLine: number;
      endLine: number;
      score: number;
      snippet: string;
      source?: string;
    }>;
  }): Promise<void> {
    await this.recallTracker.recordRecall({
      query: params.query,
      results: params.results.map(r => ({
        ...r,
        source: r.source || 'memory'
      })),
      signalType: 'recall'
    });
  }

  /**
   * 获取召回统计
   */
  async getRecallStats(): Promise<{
    totalEntries: number;
    promotedEntries: number;
    totalRecalls: number;
    uniquePaths: number;
    avgRecallCount: number;
  }> {
    return this.recallTracker.getStats();
  }

  /**
   * 执行Light Phase
   */
  async runLightPhase(): Promise<{
    candidates: ShortTermRecallEntry[];
    processedCount: number;
  }> {
    if (!this.lightPhaseExecutor) {
      throw new Error('请先调用initialize()方法');
    }
    
    const result = await this.lightPhaseExecutor.execute();
    
    return {
      candidates: result.candidates,
      processedCount: result.dailyEntriesProcessed + result.sessionEntriesProcessed
    };
  }

  /**
   * 执行Deep Phase
   */
  async runDeepPhase(candidates: ShortTermRecallEntry[]): Promise<{
    ranked: PromotionCandidate[];
    promoted: PromotionCandidate[];
    appliedCount: number;
  }> {
    if (!this.deepPhaseRanker) {
      throw new Error('请先调用initialize()方法');
    }
    
    const result = await this.deepPhaseRanker.execute(candidates, {
      limit: this.dreamingConfig.limit,
      minScore: this.dreamingConfig.minScore,
      minRecallCount: this.dreamingConfig.minRecallCount,
      minUniqueQueries: this.dreamingConfig.minUniqueQueries,
      recencyHalfLifeDays: this.dreamingConfig.recencyHalfLifeDays,
      maxAgeDays: this.dreamingConfig.maxAgeDays
    });
    
    return {
      ranked: result.candidatesRanked,
      promoted: result.candidatesPromoted,
      appliedCount: result.applied.applied
    };
  }

  /**
   * 执行REM Phase
   */
  async runRemPhase(candidates: ShortTermRecallEntry[]): Promise<{
    reflections: any[];
    truths: any[];
    narrative: string;
  }> {
    if (!this.remPhaseExtractor) {
      throw new Error('请先调用initialize()方法');
    }
    
    // PromotionCandidate扩展了ShortTermRecallEntry，可以安全转换
    const result = await this.remPhaseExtractor.execute(candidates as any);
    
    return {
      reflections: result.reflections,
      truths: result.candidateTruths,
      narrative: result.dreamNarrative
    };
  }

  /**
   * 执行完整的三阶段
   */
  async runFullCycle(): Promise<DreamingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log('[MemoryDreamingIntegration] 开始执行三阶段记忆整合');
    
    // Phase 1: Light Phase
    console.log('[MemoryDreamingIntegration] 执行Light Phase...');
    const { candidates } = await this.runLightPhase();
    console.log(`[MemoryDreamingIntegration] Light Phase完成，生成${candidates.length}个候选`);
    
    // Phase 2: Deep Phase
    console.log('[MemoryDreamingIntegration] 执行Deep Phase...');
    const deepResult = await this.runDeepPhase(candidates);
    const { promoted, appliedCount } = deepResult;
    console.log(`[MemoryDreamingIntegration] Deep Phase完成，提升${appliedCount}条记忆`);
    
    // Phase 3: REM Phase
    console.log('[MemoryDreamingIntegration] 执行REM Phase...');
    // 使用ranked列表而不是promoted，因为PromotionCandidate是扩展类型
    const remResult = await this.runRemPhase(deepResult.ranked as any);
    console.log(`[MemoryDreamingIntegration] REM Phase完成，生成${remResult.reflections.length}个反思主题`);
    
    return {
      lightPhase: {
        phase: 'light',
        candidatesProcessed: candidates.length,
        candidatesPromoted: 0,
        durationMs: 0
      },
      deepPhase: {
        phase: 'deep',
        candidatesProcessed: candidates.length,
        candidatesPromoted: appliedCount,
        durationMs: 0
      },
      remPhase: {
        phase: 'rem',
        candidatesProcessed: promoted.length,
        candidatesPromoted: 0,
        durationMs: 0
      },
      totalCandidates: candidates.length,
      totalPromoted: appliedCount,
      durationMs: 0
    };
  }

  /**
   * 获取Dreaming状态
   */
  getStatus(): {
    enabled: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    phase: string;
  } {
    const status = this.scheduler.getStatus();
    return {
      enabled: status.enabled,
      lastRunAt: status.lastRunAt,
      nextRunAt: status.nextRunAt,
      phase: status.phase
    };
  }

  /**
   * 更新Dreaming配置
   */
  updateConfig(config: Partial<DreamingConfig>): void {
    this.dreamingConfig = { ...this.dreamingConfig, ...config };
    this.scheduler.updateConfig(config);
  }

  /**
   * 获取RecallTracker实例
   */
  getRecallTracker(): RecallTracker {
    return this.recallTracker;
  }

  /**
   * 注册事件处理器
   */
  private registerEventHandlers(): void {
    this.scheduler.on('phase:start', (phase) => {
      console.log(`[MemoryDreamingIntegration] 阶段开始: ${phase}`);
      this.options.onPhaseStart?.(phase);
    });
    
    this.scheduler.on('phase:complete', (phase, result) => {
      console.log(`[MemoryDreamingIntegration] 阶段完成: ${phase}, 处理${result.candidatesProcessed}个，提升${result.candidatesPromoted}个`);
      this.options.onPhaseComplete?.(phase, result);
    });
    
    this.scheduler.on('dreaming:complete', (result) => {
      console.log(`[MemoryDreamingIntegration] Dreaming周期完成: 总计${result.totalPromoted}/${result.totalCandidates}条记忆被整合`);
      this.options.onDreamingComplete?.(result);
    });
    
    this.scheduler.on('dreaming:error', (error) => {
      console.error('[MemoryDreamingIntegration] Dreaming执行错误:', error);
    });
  }

  /**
   * 审计存储
   */
  async audit(): Promise<{
    entryCount: number;
    promotedCount: number;
    issues: any[];
  }> {
    const auditResult = await this.recallTracker.audit();
    return {
      entryCount: auditResult.entryCount,
      promotedCount: auditResult.promotedCount,
      issues: auditResult.issues
    };
  }

  /**
   * 修复存储问题
   */
  async repair(): Promise<{
    removedInvalidEntries: number;
    removedStaleLock: boolean;
  }> {
    return this.recallTracker.repair();
  }

  /**
   * 销毁实例
   */
  async destroy(): Promise<void> {
    this.stop();
    this.scheduler.removeAllListeners();
  }
}

export default MemoryDreamingIntegration;
