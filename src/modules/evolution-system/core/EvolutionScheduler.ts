/**
 * 进化调度器
 * Evolution Scheduler - Scheduled evolution triggers
 */

import { EvolutionSchedulerConfig } from './types';

/** 调度任务 */
interface ScheduledTask {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 定时器ID */
  timerId: ReturnType<typeof setTimeout> | null;
  /** 回调函数 */
  callback: () => Promise<void>;
  /** 调度配置 */
  config: ScheduleConfig;
  /** 是否暂停 */
  isPaused: boolean;
  /** 下次执行时间 */
  nextRunTime: Date | null;
  /** 执行统计 */
  stats: TaskStats;
}

/** 调度配置 */
interface ScheduleConfig {
  /** 间隔(ms) */
  interval: number;
  /** 是否启用 */
  enabled: boolean;
  /** 立即执行 */
  immediate?: boolean;
  /** 最大执行次数 */
  maxExecutions?: number;
}

/** 任务统计 */
interface TaskStats {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successfulExecutions: number;
  /** 失败次数 */
  failedExecutions: number;
  /** 最后执行时间 */
  lastExecutionTime: Date | null;
  /** 最后成功时间 */
  lastSuccessTime: Date | null;
  /** 最后失败时间 */
  lastFailureTime: Date | null;
  /** 平均执行时间 */
  avgExecutionTime: number;
  /** 总执行时间 */
  totalExecutionTime: number;
}

/**
 * 进化调度器
 * 负责管理定时进化任务
 */
export class EvolutionScheduler {
  private readonly tasks: Map<string, ScheduledTask>;
  private readonly globalConfig: EvolutionSchedulerConfig;

  /**
   * 构造函数
   * @param config 调度器配置
   */
  constructor(config?: Partial<EvolutionSchedulerConfig>) {
    this.tasks = new Map();
    this.globalConfig = {
      maxConcurrentTasks: config?.maxConcurrentTasks ?? 10,
      defaultInterval: config?.defaultInterval ?? 86400000, // 24小时
      minInterval: config?.minInterval ?? 60000, // 1分钟
      maxInterval: config?.maxInterval ?? 604800000, // 7天
      retryOnFailure: config?.retryOnFailure ?? true,
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 5000,
    };
  }

  /**
   * 调度任务
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param callback 回调函数
   * @param config 调度配置
   */
  schedule(
    userId: string,
    tenantId: string,
    callback: () => Promise<void>,
    config?: Partial<ScheduleConfig>
  ): string {
    const key = this.getTaskKey(userId, tenantId);

    // 验证间隔
    const interval = this.validateInterval(config?.interval ?? this.globalConfig.defaultInterval);

    const taskConfig: ScheduleConfig = {
      interval,
      enabled: config?.enabled ?? true,
      immediate: config?.immediate ?? false,
      maxExecutions: config?.maxExecutions,
    };

    const task: ScheduledTask = {
      userId,
      tenantId,
      timerId: null,
      callback,
      config: taskConfig,
      isPaused: false,
      nextRunTime: null,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecutionTime: null,
        lastSuccessTime: null,
        lastFailureTime: null,
        avgExecutionTime: 0,
        totalExecutionTime: 0,
      },
    };

    // 如果已存在任务，先取消
    const existingTask = this.tasks.get(key);
    if (existingTask) {
      this.cancelTask(existingTask);
    }

    this.tasks.set(key, task);

    // 启动调度
    this.startTask(task);

    return key;
  }

  /**
   * 取消调度
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  cancel(userId: string, tenantId: string): void {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    if (task) {
      this.cancelTask(task);
      this.tasks.delete(key);
    }
  }

  /**
   * 暂停任务
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async pause(userId: string, tenantId: string): Promise<void> {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    if (task) {
      task.isPaused = true;
      if (task.timerId) {
        clearTimeout(task.timerId);
        task.timerId = null;
      }
    }
  }

  /**
   * 恢复任务
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async resume(userId: string, tenantId: string): Promise<void> {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    if (task && task.isPaused) {
      task.isPaused = false;
      this.startTask(task);
    }
  }

  /**
   * 更新调度配置
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param config 新的配置
   */
  updateConfig(
    userId: string,
    tenantId: string,
    config: Partial<ScheduleConfig>
  ): boolean {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    if (!task) {
      return false;
    }

    // 更新配置
    if (config.interval !== undefined) {
      task.config.interval = this.validateInterval(config.interval);
    }
    if (config.enabled !== undefined) {
      task.config.enabled = config.enabled;
    }
    if (config.maxExecutions !== undefined) {
      task.config.maxExecutions = config.maxExecutions;
    }

    // 如果任务正在运行，重新启动
    if (!task.isPaused) {
      this.cancelTask(task);
      this.startTask(task);
    }

    return true;
  }

  /**
   * 获取任务状态
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  getTaskStatus(userId: string, tenantId: string): TaskStatus | null {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    if (!task) {
      return null;
    }

    return {
      userId: task.userId,
      tenantId: task.tenantId,
      isPaused: task.isPaused,
      isRunning: task.timerId !== null,
      nextRunTime: task.nextRunTime,
      interval: task.config.interval,
      stats: { ...task.stats },
    };
  }

  /**
   * 获取所有任务状态
   */
  getAllTaskStatuses(): TaskStatus[] {
    return Array.from(this.tasks.values()).map(task => ({
      userId: task.userId,
      tenantId: task.tenantId,
      isPaused: task.isPaused,
      isRunning: task.timerId !== null,
      nextRunTime: task.nextRunTime,
      interval: task.config.interval,
      stats: { ...task.stats },
    }));
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { running: number; paused: number } {
    let running = 0;
    let paused = 0;

    for (const task of this.tasks.values()) {
      if (task.isPaused) {
        paused++;
      } else {
        running++;
      }
    }

    return { running, paused };
  }

  /**
   * 批量调度
   * @param tasks 任务列表
   */
  scheduleBatch(
    tasks: Array<{
      userId: string;
      tenantId: string;
      callback: () => Promise<void>;
      config?: Partial<ScheduleConfig>;
    }>
  ): string[] {
    const keys: string[] = [];

    for (const task of tasks) {
      const key = this.schedule(task.userId, task.tenantId, task.callback, task.config);
      keys.push(key);
    }

    return keys;
  }

  /**
   * 取消所有任务
   */
  cancelAll(): void {
    for (const task of this.tasks.values()) {
      this.cancelTask(task);
    }
    this.tasks.clear();
  }

  /**
   * 立即执行任务
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async executeNow(userId: string, tenantId: string): Promise<boolean> {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    if (!task || task.isPaused) {
      return false;
    }

    await this.executeTask(task);
    return true;
  }

  /**
   * 获取任务统计
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  getTaskStats(userId: string, tenantId: string): TaskStats | null {
    const key = this.getTaskKey(userId, tenantId);
    const task = this.tasks.get(key);

    return task ? { ...task.stats } : null;
  }

  // ============== 私有方法 ==============

  /**
   * 启动任务
   */
  private startTask(task: ScheduledTask): void {
    if (!task.config.enabled || task.isPaused) {
      return;
    }

    // 如果配置了立即执行
    if (task.config.immediate && task.stats.totalExecutions === 0) {
      this.executeTask(task);
    }

    // 设置定时器
    task.nextRunTime = new Date(Date.now() + task.config.interval);
    task.timerId = setTimeout(() => {
      this.executeTask(task).catch(console.error);
    }, task.config.interval);
  }

  /**
   * 执行任务
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    if (task.isPaused || !task.config.enabled) {
      return;
    }

    // 检查最大执行次数
    if (
      task.config.maxExecutions !== undefined &&
      task.stats.totalExecutions >= task.config.maxExecutions
    ) {
      this.cancelTask(task);
      return;
    }

    const startTime = Date.now();
    task.stats.lastExecutionTime = new Date();

    try {
      await task.callback();

      task.stats.successfulExecutions++;
      task.stats.lastSuccessTime = new Date();
    } catch (error) {
      task.stats.failedExecutions++;
      task.stats.lastFailureTime = new Date();

      // 重试逻辑
      if (this.globalConfig.retryOnFailure && task.stats.failedExecutions < this.globalConfig.maxRetries) {
        setTimeout(() => {
          this.executeTask(task).catch(console.error);
        }, this.globalConfig.retryDelay);
      }
    } finally {
      // 更新统计
      const executionTime = Date.now() - startTime;
      task.stats.totalExecutionTime += executionTime;
      task.stats.avgExecutionTime = task.stats.totalExecutionTime / task.stats.totalExecutions;
      task.stats.totalExecutions++;

      // 重新调度
      if (!task.isPaused && task.config.enabled) {
        task.nextRunTime = new Date(Date.now() + task.config.interval);
        task.timerId = setTimeout(() => {
          this.executeTask(task).catch(console.error);
        }, task.config.interval);
      }
    }
  }

  /**
   * 取消任务
   */
  private cancelTask(task: ScheduledTask): void {
    if (task.timerId) {
      clearTimeout(task.timerId);
      task.timerId = null;
    }
  }

  /**
   * 获取任务键
   */
  private getTaskKey(userId: string, tenantId: string): string {
    return `${tenantId}:${userId}`;
  }

  /**
   * 验证间隔
   */
  private validateInterval(interval: number): number {
    return Math.max(
      this.globalConfig.minInterval,
      Math.min(this.globalConfig.maxInterval, interval)
    );
  }
}

/** 任务状态 */
export interface TaskStatus {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 是否暂停 */
  isPaused: boolean;
  /** 是否运行中 */
  isRunning: boolean;
  /** 下次执行时间 */
  nextRunTime: Date | null;
  /** 执行间隔 */
  interval: number;
  /** 统计信息 */
  stats: TaskStats;
}

/** 调度器配置 */
export interface EvolutionSchedulerConfig {
  /** 最大并发任务数 */
  maxConcurrentTasks: number;
  /** 默认间隔 */
  defaultInterval: number;
  /** 最小间隔 */
  minInterval: number;
  /** 最大间隔 */
  maxInterval: number;
  /** 失败时重试 */
  retryOnFailure: boolean;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟 */
  retryDelay: number;
}
