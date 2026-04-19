/**
 * 心跳调度器
 * Heartbeat Scheduler - 定时触发检查任务
 */

export type SchedulerCallback = () => Promise<void>;

export interface SchedulerOptions {
  /** 立即执行一次 */
  immediate?: boolean;
  /** 调度器名称 */
  name?: string;
}

export class HeartbeatScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private interval: number;
  private callback: SchedulerCallback | null = null;
  private isRunning: boolean = false;
  private executionCount: number = 0;
  private lastExecutionTime: Date | null = null;
  private nextExecutionTime: Date | null = null;
  private name: string;
  private logger: (msg: string) => void;

  constructor(interval: number = 30 * 60 * 1000, logger?: (msg: string) => void) {
    this.interval = interval;
    this.name = 'HeartbeatScheduler';
    this.logger = logger || console.log;
  }

  /**
   * 启动调度器
   */
  start(callback: SchedulerCallback, options?: SchedulerOptions): void {
    if (this.isRunning) {
      this.logger(`[${this.name}] 调度器已在运行中`);
      return;
    }

    this.callback = callback;
    this.isRunning = true;

    // 立即执行一次
    if (options?.immediate) {
      this.executeOnce();
    }

    // 设置定时任务
    this.intervalId = setInterval(() => {
      this.executeOnce();
    }, this.interval);

    this.nextExecutionTime = new Date(Date.now() + this.interval);
    this.logger(`[${this.name}] 调度器已启动，间隔: ${this.interval / 1000 / 60} 分钟`);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.callback = null;
    this.nextExecutionTime = null;
    this.logger(`[${this.name}] 调度器已停止`);
  }

  /**
   * 立即执行一次
   */
  async executeOnce(): Promise<void> {
    if (!this.callback) {
      this.logger(`[${this.name}] 回调函数未设置`);
      return;
    }

    this.executionCount++;
    this.lastExecutionTime = new Date();
    this.nextExecutionTime = new Date(Date.now() + this.interval);

    this.logger(`[${this.name}] 执行第 ${this.executionCount} 次检查...`);

    try {
      await this.callback();
    } catch (error) {
      this.logger(`[${this.name}] 执行失败: ${error}`);
    }
  }

  /**
   * 暂停调度
   */
  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger(`[${this.name}] 调度器已暂停`);
  }

  /**
   * 恢复调度
   */
  resume(): void {
    if (!this.isRunning || this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.executeOnce();
    }, this.interval);

    this.nextExecutionTime = new Date(Date.now() + this.interval);
    this.logger(`[${this.name}] 调度器已恢复`);
  }

  /**
   * 更新间隔时间
   */
  setInterval(newInterval: number): void {
    this.interval = newInterval;
    if (this.isRunning && this.intervalId) {
      this.pause();
      this.resume();
    }
    this.logger(`[${this.name}] 间隔时间已更新为: ${newInterval / 1000 / 60} 分钟`);
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    isRunning: boolean;
    executionCount: number;
    lastExecutionTime: Date | null;
    nextExecutionTime: Date | null;
    interval: number;
  } {
    return {
      isRunning: this.isRunning,
      executionCount: this.executionCount,
      lastExecutionTime: this.lastExecutionTime,
      nextExecutionTime: this.nextExecutionTime,
      interval: this.interval,
    };
  }

  /**
   * 检查是否在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export default HeartbeatScheduler;
