/**
 * DreamingScheduler.ts - 记忆整合调度器
 * 
 * OpenTaiji三阶段记忆整合，为OpenTaiji实现三阶段记忆整合调度。
 * 核心功能：
 * - 定时触发三阶段（默认凌晨3点）
 * - 与HeartbeatManager集成
 * - 状态管理
 */

import { EventEmitter } from 'events';
import { DreamingConfig, DreamingPhase, DreamingStatus } from './types';

// 默认配置
export const DEFAULT_DREAMING_CONFIG: DreamingConfig = {
  enabled: true,
  cron: '0 3 * * *',          // 每天凌晨3点
  timezone: 'Asia/Shanghai',
  limit: 10,                   // 每次最多处理10条
  minScore: 0.75,              // 最低评分阈值
  minRecallCount: 3,           // 最少召回次数
  minUniqueQueries: 2,         // 最少独立查询数
  recencyHalfLifeDays: 14,     // 新近度半衰期
  maxAgeDays: 30,              // 最大记忆天数
  lookbackDays: 7,             // 回溯天数
  verboseLogging: false,
  storage: {
    mode: 'separate',
    separateReports: false
  }
};

// 信号权重（基于OpenTaiji研究）
export const PROMOTION_WEIGHTS = {
  frequency: 0.24,
  relevance: 0.30,
  diversity: 0.15,
  recency: 0.15,
  consolidation: 0.10,
  conceptual: 0.06
};

// 阶段信号增强
export const PHASE_SIGNAL_CONFIG = {
  lightBoostMax: 0.06,
  remBoostMax: 0.09,
  halfLifeDays: 14
};

export interface SchedulerEvents {
  'phase:start': (phase: DreamingPhase) => void;
  'phase:complete': (phase: DreamingPhase, result: PhaseResult) => void;
  'phase:error': (phase: DreamingPhase, error: Error) => void;
  'dreaming:start': () => void;
  'dreaming:complete': (result: DreamingResult) => void;
  'dreaming:error': (error: Error) => void;
}

export interface PhaseResult {
  phase: DreamingPhase;
  candidatesProcessed: number;
  candidatesPromoted: number;
  durationMs: number;
  error?: string;
}

export interface DreamingResult {
  lightPhase: PhaseResult;
  deepPhase: PhaseResult;
  remPhase: PhaseResult;
  totalCandidates: number;
  totalPromoted: number;
  durationMs: number;
}

export class DreamingScheduler extends EventEmitter {
  private config: DreamingConfig;
  private status: DreamingStatus;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRunAt: Date | null = null;
  private nextRunAt: Date | null = null;
  private workspaceDir: string;

  constructor(workspaceDir: string, config?: Partial<DreamingConfig>) {
    super();
    this.workspaceDir = workspaceDir;
    this.config = { ...DEFAULT_DREAMING_CONFIG, ...config };
    this.status = {
      enabled: this.config.enabled,
      lastRunAt: null,
      nextRunAt: null,
      phase: 'idle'
    };
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.timer) {
      this.stop();
    }
    
    if (this.config.enabled) {
      this.scheduleNextRun();
      this.status.enabled = true;
      console.log(`[DreamingScheduler] 调度器已启动，下次运行: ${this.nextRunAt?.toISOString()}`);
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.status.enabled = false;
    console.log('[DreamingScheduler] 调度器已停止');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DreamingConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };
    
    if (wasEnabled && !this.config.enabled) {
      this.stop();
    } else if (this.config.enabled && !wasEnabled) {
      this.start();
    } else if (this.config.enabled) {
      this.scheduleNextRun();
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): DreamingStatus {
    return {
      ...this.status,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt
    };
  }

  /**
   * 手动触发Dreaming执行
   */
  async trigger(): Promise<DreamingResult> {
    if (this.isRunning) {
      throw new Error('Dreaming正在执行中');
    }

    return this.runDreamingCycle();
  }

  /**
   * 设置工作空间目录
   */
  setWorkspaceDir(workspaceDir: string): void {
    this.workspaceDir = workspaceDir;
  }

  /**
   * 计算下次运行时间
   */
  private calculateNextRunTime(): Date {
    const now = new Date();
    const [minute, hour] = this.config.cron.split(' ').map(Number);
    
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    
    // 如果已经过了今天的时间，则安排到明天
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    // 设置时区
    if (this.config.timezone) {
      // 注意：实际使用时需要使用正确的时区处理
      // 这里简化处理
    }
    
    return next;
  }

  /**
   * 调度下次运行
   */
  private scheduleNextRun(): void {
    this.nextRunAt = this.calculateNextRunTime();
    this.status.nextRunAt = this.nextRunAt;

    const delay = this.nextRunAt.getTime() - Date.now();
    
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(async () => {
      try {
        await this.runDreamingCycle();
      } catch (error) {
        console.error('[DreamingScheduler] 定时执行失败:', error);
      }
      // 重新调度下次运行
      if (this.config.enabled) {
        this.scheduleNextRun();
      }
    }, delay);

    console.log(`[DreamingScheduler] 下次运行安排在 ${this.nextRunAt.toISOString()}，延迟 ${Math.round(delay / 1000)} 秒`);
  }

  /**
   * 执行完整的Dreaming周期
   */
  private async runDreamingCycle(): Promise<DreamingResult> {
    const startTime = Date.now();
    this.isRunning = true;
    this.emit('dreaming:start');
    this.status.phase = 'light';

    const lightPhaseStart = Date.now();
    let lightPhase: PhaseResult;
    let deepPhase: PhaseResult;
    let remPhase: PhaseResult;

    try {
      // Phase 1: Light Phase - 候选筛选
      this.emit('phase:start', 'light');
      lightPhase = await this.runLightPhase();
      this.emit('phase:complete', 'light', lightPhase);
      
      // Phase 2: Deep Phase - 评分排序
      this.status.phase = 'deep';
      this.emit('phase:start', 'deep');
      deepPhase = await this.runDeepPhase();
      this.emit('phase:complete', 'deep', deepPhase);
      
      // Phase 3: REM Phase - LLM摘要生成
      this.status.phase = 'rem';
      this.emit('phase:start', 'rem');
      remPhase = await this.runRemPhase();
      this.emit('phase:complete', 'rem', remPhase);
      
    } catch (error) {
      const err = error as Error;
      this.emit('dreaming:error', err);
      throw error;
    } finally {
      this.isRunning = false;
      this.lastRunAt = new Date();
      this.status.lastRunAt = this.lastRunAt;
      this.status.phase = 'idle';
    }

    const result: DreamingResult = {
      lightPhase,
      deepPhase,
      remPhase,
      totalCandidates: lightPhase.candidatesProcessed,
      totalPromoted: deepPhase.candidatesPromoted,
      durationMs: Date.now() - startTime
    };

    this.emit('dreaming:complete', result);
    console.log(`[DreamingScheduler] Dreaming周期完成: ${result.totalPromoted}/${result.totalCandidates} 条记忆被整合，耗时 ${result.durationMs}ms`);
    
    return result;
  }

  /**
   * 执行Light Phase
   */
  private async runLightPhase(): Promise<PhaseResult> {
    const startTime = Date.now();
    
    try {
      // 这里会调用LightPhaseExecutor
      // 实际实现中会读取HOT记忆，进行去重筛选
      const candidatesProcessed = 0; // 实际统计
      
      return {
        phase: 'light',
        candidatesProcessed,
        candidatesPromoted: 0,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      const err = error as Error;
      this.emit('phase:error', 'light', err);
      return {
        phase: 'light',
        candidatesProcessed: 0,
        candidatesPromoted: 0,
        durationMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  /**
   * 执行Deep Phase
   */
  private async runDeepPhase(): Promise<PhaseResult> {
    const startTime = Date.now();
    
    try {
      // 这里会调用DeepPhaseRanker
      // 实际实现中进行7信号评分和阈值门控
      const candidatesPromoted = 0; // 实际统计
      
      return {
        phase: 'deep',
        candidatesProcessed: 0,
        candidatesPromoted,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      const err = error as Error;
      this.emit('phase:error', 'deep', err);
      return {
        phase: 'deep',
        candidatesProcessed: 0,
        candidatesPromoted: 0,
        durationMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  /**
   * 执行REM Phase
   */
  private async runRemPhase(): Promise<PhaseResult> {
    const startTime = Date.now();
    
    try {
      // 这里会调用REMPhaseExtractor
      // 实际实现中进行LLM模式提取和主题标签生成
      return {
        phase: 'rem',
        candidatesProcessed: 0,
        candidatesPromoted: 0,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      const err = error as Error;
      this.emit('phase:error', 'rem', err);
      return {
        phase: 'rem',
        candidatesProcessed: 0,
        candidatesPromoted: 0,
        durationMs: Date.now() - startTime,
        error: err.message
      };
    }
  }
}

export default DreamingScheduler;
