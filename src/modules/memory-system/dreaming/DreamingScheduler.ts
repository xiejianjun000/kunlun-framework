/**
 * DreamingScheduler - 梦境调度器
 * 
 * 管理梦境系统的周期性执行
 * 
 * @see https://github.com/opensatoru/openclaw/docs/concepts/dreaming.md
 */

import {
  type DreamingSystemConfig,
  type DreamingSchedulerState,
  type DreamingSchedulerCallback,
  type DreamingResult,
  type DreamingCycleResult,
  DreamingPhase,
  DEFAULT_DREAMING_CONFIG,
} from './types';

// ============== 类型定义 ==============

type CronSchedule = {
  next(baseDate?: Date): Date | null;
};

// ============== 简单 Cron 解析器 ==============

/**
 * 解析 cron 表达式
 * 支持标准5字段: 分 时 日 月 周
 */
function parseCron(cronExpr: string, timezone?: string): CronSchedule {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) {
    throw new Error(`Invalid cron expression: ${cronExpr}`);
  }
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  return {
    next(baseDate: Date = new Date()): Date | null {
      const date = new Date(baseDate);
      
      // 找到下一个匹配的时间
      for (let i = 0; i < 366 * 24 * 60; i++) {
        date.setMinutes(date.getMinutes() + 1);
        
        if (!matchCronPart(minute, date.getMinutes())) continue;
        if (!matchCronPart(hour, date.getHours())) continue;
        if (!matchCronPart(dayOfMonth, date.getDate())) continue;
        if (!matchCronPart(month, date.getMonth() + 1)) continue;
        if (!matchCronPart(dayOfWeek, date.getDay())) continue;
        
        return new Date(date);
      }
      
      return null;
    },
  };
}

function matchCronPart(part: string, value: number): boolean {
  if (part === '*') return true;
  
  // 范围: 1-5
  const rangeMatch = part.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return value >= start && value <= end;
  }
  
  // 列表: 1,3,5
  if (part.includes(',')) {
    return part.split(',').some(p => matchCronPart(p.trim(), value));
  }
  
  // 步进: */5
  if (part.includes('/')) {
    const [base, step] = part.split('/');
    const stepNum = parseInt(step, 10);
    if (base === '*') {
      return value % stepNum === 0;
    }
    const baseNum = parseInt(base, 10);
    return (value - baseNum) % stepNum === 0 && value >= baseNum;
  }
  
  // 单值
  const num = parseInt(part, 10);
  return value === num;
}

// ============== 梦境调度器类 ==============

export class DreamingScheduler {
  private config: DreamingSystemConfig;
  private state: DreamingSchedulerState;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: DreamingSchedulerCallback[] = [];
  private executor: ((phase: DreamingPhase) => Promise<DreamingResult>) | null = null;
  
  constructor(config?: Partial<DreamingSystemConfig>) {
    this.config = { ...DEFAULT_DREAMING_CONFIG, ...config };
    this.state = {
      isRunning: false,
    };
  }
  
  /**
   * 设置梦境执行器
   */
  setExecutor(
    executor: (phase: DreamingPhase) => Promise<DreamingResult>
  ): void {
    this.executor = executor;
  }
  
  /**
   * 添加回调函数
   */
  onComplete(callback: DreamingSchedulerCallback): void {
    this.callbacks.push(callback);
  }
  
  /**
   * 移除回调函数
   */
  removeCallback(callback: DreamingSchedulerCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }
  
  /**
   * 启动调度器
   */
  start(): void {
    if (this.timer) {
      return; // 已经在运行
    }
    
    if (!this.config.enabled) {
      console.log('[DreamingScheduler] Dreaming is disabled');
      return;
    }
    
    this.scheduleNext();
  }
  
  /**
   * 停止调度器
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.isRunning = false;
    this.state.currentPhase = undefined;
  }
  
  /**
   * 获取调度器状态
   */
  getState(): DreamingSchedulerState {
    return { ...this.state };
  }
  
  /**
   * 获取配置
   */
  getConfig(): DreamingSystemConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<DreamingSystemConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.timer) {
      // 重新调度
      this.stop();
      this.start();
    }
  }
  
  /**
   * 手动触发梦境周期
   */
  async trigger(): Promise<DreamingCycleResult> {
    if (!this.executor) {
      throw new Error('No executor set for DreamingScheduler');
    }
    
    this.state.isRunning = true;
    const startTime = new Date().toISOString();
    const results: DreamingCycleResult['phases'] = {
      light: { phase: DreamingPhase.LIGHT, success: false, entriesProcessed: 0, timestamp: startTime },
      rem: { phase: DreamingPhase.REM, success: false, entriesProcessed: 0, timestamp: startTime },
    };
    
    const diaryEntries: string[] = [];
    
    try {
      // Light 阶段
      if (this.config.light.enabled) {
        this.state.currentPhase = DreamingPhase.LIGHT;
        const lightResult = await this.executor(DreamingPhase.LIGHT);
        results.light = lightResult;
        this.notifyCallbacks(lightResult);
        if (lightResult.success) {
          diaryEntries.push(`[Light] Processed ${lightResult.entriesProcessed} entries`);
        }
      }
      
      // Deep 阶段
      if (this.config.deep.enabled) {
        this.state.currentPhase = DreamingPhase.DEEP;
        const deepResult = await this.executor(DreamingPhase.DEEP);
        results.deep = deepResult;
        this.notifyCallbacks(deepResult);
        if (deepResult.success) {
          diaryEntries.push(`[Deep] Promoted ${deepResult.entriesPromoted ?? 0} entries (score: ${deepResult.score?.toFixed(3)})`);
        }
      }
      
      // REM 阶段
      if (this.config.rem.enabled) {
        this.state.currentPhase = DreamingPhase.REM;
        const remResult = await this.executor(DreamingPhase.REM);
        results.rem = remResult;
        this.notifyCallbacks(remResult);
        if (remResult.success) {
          diaryEntries.push(`[REM] Processed ${remResult.entriesProcessed} entries`);
        }
      }
    } finally {
      this.state.isRunning = false;
      this.state.currentPhase = undefined;
      this.state.lastRun = new Date().toISOString();
    }
    
    const totalPromoted = (results.deep?.entriesPromoted) ?? 0;
    const endTime = new Date().toISOString();
    
    // 计算下次运行时间
    this.scheduleNext();
    
    return {
      startTime,
      endTime,
      phases: results,
      totalPromoted,
      diaryEntries,
    };
  }
  
  /**
   * 调度下一次执行
   */
  private scheduleNext(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (!this.config.enabled) {
      return;
    }
    
    try {
      const schedule = parseCron(this.config.frequency, this.config.timezone);
      const nextRun = schedule.next();
      
      if (!nextRun) {
        console.error('[DreamingScheduler] Failed to calculate next run time');
        return;
      }
      
      const delay = nextRun.getTime() - Date.now();
      this.state.nextRun = nextRun.toISOString();
      
      console.log(`[DreamingScheduler] Next dream scheduled at ${nextRun.toISOString()}`);
      
      this.timer = setTimeout(async () => {
        try {
          await this.trigger();
        } catch (err) {
          console.error('[DreamingScheduler] Dream cycle failed:', err);
          this.state.error = err instanceof Error ? err.message : String(err);
        }
      }, Math.max(0, delay));
    } catch (err) {
      console.error('[DreamingScheduler] Failed to schedule:', err);
    }
  }
  
  /**
   * 通知回调
   */
  private notifyCallbacks(result: DreamingResult): void {
    for (const callback of this.callbacks) {
      try {
        const maybePromise = callback(result);
        if (maybePromise instanceof Promise) {
          maybePromise.catch(err => {
            console.error('[DreamingScheduler] Callback error:', err);
          });
        }
      } catch (err) {
        console.error('[DreamingScheduler] Callback error:', err);
      }
    }
  }
}

// ============== 便捷工厂函数 ==============

/**
 * 创建梦境调度器
 */
export function createDreamingScheduler(
  config?: Partial<DreamingSystemConfig>
): DreamingScheduler {
  return new DreamingScheduler(config);
}

// ============== 导出 ==============

export { DreamingScheduler as DreamingSchedulerClass };

export const DreamingSchedulerModule = {
  DreamingScheduler,
  createDreamingScheduler,
};

export default DreamingScheduler;
