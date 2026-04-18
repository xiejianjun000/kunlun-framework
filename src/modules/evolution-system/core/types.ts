/**
 * Evolution System Core Types
 * 核心类型定义
 */

/** 调度器配置 */
export interface EvolutionSchedulerConfig {
  /** 最大并发任务数 */
  maxConcurrentTasks: number;
  /** 默认间隔(ms) */
  defaultInterval: number;
  /** 最小间隔(ms) */
  minInterval: number;
  /** 最大间隔(ms) */
  maxInterval: number;
  /** 失败时重试 */
  retryOnFailure: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟(ms) */
  retryDelay: number;
}

/** 调度器统计 */
export interface EvolutionSchedulerStats {
  /** 总任务数 */
  totalTasks: number;
  /** 活跃任务数 */
  activeTasks: number;
  /** 暂停任务数 */
  pausedTasks: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successfulExecutions: number;
  /** 失败次数 */
  failedExecutions: number;
}
