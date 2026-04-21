import {
  IOutcomeScheduler,
  ScheduledJob,
  ExecutionResult,
  ExecutionRecord,
  BillingRecord,
} from './interfaces/IOutcomeScheduler';
import { TemplateEngine } from './TemplateEngine';
import { ChannelPusher } from './ChannelPusher';
import { BillingTracker } from './BillingTracker';
import { ExecutionHistory } from './ExecutionHistory';
import { RetryManager } from './RetryManager';
import { cronParser } from './utils/cronParser';
import { Logger } from '../../utils/logger';

/**
 * 线程安全的定时器管理
 * 使用异步锁防止竞态条件
 */
class TimerManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pendingExecution: Set<string> = new Set();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 设置定时器，确保同一时刻只有一个定时器
   */
  set(jobId: string, callback: () => void, delay: number): void {
    this.clear(jobId);
    this.timers.set(jobId, setTimeout(callback, delay));
  }

  /**
   * 清除定时器
   */
  clear(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }
  }

  /**
   * 清除所有定时器
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * 标记任务正在执行
   */
  markExecuting(jobId: string): boolean {
    if (this.pendingExecution.has(jobId)) {
      this.logger.debug(`Job ${jobId} is already executing, skipping`);
      return false;
    }
    this.pendingExecution.add(jobId);
    return true;
  }

  /**
   * 标记任务执行完成
   */
  markComplete(jobId: string): void {
    this.pendingExecution.delete(jobId);
  }

  /**
   * 检查任务是否有定时器
   */
  has(jobId: string): boolean {
    return this.timers.has(jobId);
  }
}

/**
 * 任务状态
 */
export type JobStatus = 'idle' | 'scheduled' | 'executing' | 'paused' | 'completed' | 'failed';

/**
 * 带状态的任务包装
 */
interface ManagedJob {
  job: ScheduledJob;
  status: JobStatus;
  lastExecutionTime?: number;
  nextExecutionTime?: number;
  executionCount: number;
  paused: boolean;
}

/**
 * 成果调度器 - 线程安全改进版
 *
 * 支持三种调度类型：
 * 1. cron - Cron表达式定时
 * 2. at - 指定时间执行一次
 * 3. every - 固定间隔循环执行
 *
 * 新增功能：
 * - 任务暂停/恢复
 * - 并发安全保证（同一任务不会并发执行）
 * - 任务状态跟踪
 * - 执行超时保护
 */
export class OutcomeScheduler implements IOutcomeScheduler {
  public readonly name: string = 'OutcomeScheduler';
  public readonly version: string = '1.0.1';

  private readonly jobs: Map<string, ManagedJob> = new Map();
  private readonly timerManager: TimerManager;
  private running: boolean = false;

  public readonly templateEngine: TemplateEngine;
  public readonly channelPusher: ChannelPusher;
  public readonly billingTracker: BillingTracker;
  public readonly executionHistory: ExecutionHistory;
  public readonly retryManager: RetryManager;
  private readonly logger: Logger;

  /** 执行超时时间（毫秒），默认 5 分钟 */
  private readonly executionTimeoutMs: number = 5 * 60 * 1000;

  constructor() {
    this.logger = new Logger('OutcomeScheduler');
    this.timerManager = new TimerManager(this.logger);
    this.templateEngine = new TemplateEngine();
    this.retryManager = new RetryManager({
      maxRetries: 3,
      retryIntervalMs: 1000,
      exponentialBackoff: true,
    });
    this.channelPusher = new ChannelPusher(this.retryManager);
    this.billingTracker = new BillingTracker();
    this.executionHistory = new ExecutionHistory();
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.running) {
      this.logger.info('Scheduler is already running');
      return;
    }
    this.running = true;
    this.logger.info('Scheduler started');

    // 为每个已添加的任务安排调度
    for (const [jobId, managedJob] of this.jobs) {
      if (managedJob.job.schedule.enabled && !managedJob.paused) {
        this.scheduleJob(managedJob.job);
      }
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.running) {
      this.logger.info('Scheduler is already stopped');
      return;
    }
    this.running = false;
    this.timerManager.clearAll();
    this.logger.info('Scheduler stopped');
  }

  /**
   * 暂停指定任务
   */
  pauseJob(jobId: string): boolean {
    const managedJob = this.jobs.get(jobId);
    if (!managedJob) {
      this.logger.warn(`Cannot pause: job ${jobId} not found`);
      return false;
    }

    this.timerManager.clear(jobId);
    managedJob.paused = true;
    managedJob.status = 'paused';
    this.logger.info(`Job ${jobId} paused`);
    return true;
  }

  /**
   * 恢复指定任务
   */
  resumeJob(jobId: string): boolean {
    const managedJob = this.jobs.get(jobId);
    if (!managedJob) {
      this.logger.warn(`Cannot resume: job ${jobId} not found`);
      return false;
    }

    if (!managedJob.paused) {
      this.logger.info(`Job ${jobId} is not paused`);
      return true;
    }

    managedJob.paused = false;

    if (this.running && managedJob.job.schedule.enabled) {
      this.scheduleJob(managedJob.job);
    }

    this.logger.info(`Job ${jobId} resumed`);
    return true;
  }

  /**
   * 暂停所有任务
   */
  pauseAll(): void {
    for (const jobId of this.jobs.keys()) {
      this.pauseJob(jobId);
    }
    this.logger.info('All jobs paused');
  }

  /**
   * 恢复所有任务
   */
  resumeAll(): void {
    for (const jobId of this.jobs.keys()) {
      this.resumeJob(jobId);
    }
    this.logger.info('All jobs resumed');
  }

  /**
   * 添加调度任务
   */
  addJob(job: ScheduledJob): void {
    if (this.jobs.has(job.id)) {
      throw new Error(`Job with id "${job.id}" already exists`);
    }

    this.jobs.set(job.id, {
      job,
      status: 'idle',
      executionCount: 0,
      paused: false,
    });

    this.logger.info(`Job ${job.id} added, type: ${job.schedule.type}`);

    if (this.running && job.schedule.enabled) {
      this.scheduleJob(job);
    }
  }

  /**
   * 更新调度任务配置
   */
  updateJob(jobId: string, updates: Partial<ScheduledJob>): boolean {
    const managedJob = this.jobs.get(jobId);
    if (!managedJob) {
      return false;
    }

    // 清除旧定时器
    this.timerManager.clear(jobId);

    // 更新配置
    managedJob.job = { ...managedJob.job, ...updates };

    // 重新调度
    if (this.running && managedJob.job.schedule.enabled && !managedJob.paused) {
      this.scheduleJob(managedJob.job);
    }

    this.logger.info(`Job ${jobId} updated`);
    return true;
  }

  /**
   * 移除调度任务
   */
  removeJob(jobId: string): boolean {
    this.timerManager.clear(jobId);
    const deleted = this.jobs.delete(jobId);
    if (deleted) {
      this.logger.info(`Job ${jobId} removed`);
    }
    return deleted;
  }

  /**
   * 手动触发任务执行
   */
  async triggerJob(jobId: string): Promise<ExecutionResult> {
    const managedJob = this.jobs.get(jobId);
    if (!managedJob) {
      throw new Error(`Job "${jobId}" not found`);
    }

    return this.executeJob(managedJob.job);
  }

  /**
   * 获取任务状态
   */
  getJobStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId)?.status ?? null;
  }

  /**
   * 获取所有任务
   */
  getAllJobs(): Array<ScheduledJob & {
    status: JobStatus;
    paused: boolean;
    executionCount: number;
    lastExecutionTime?: number;
  }> {
    return Array.from(this.jobs.values()).map(mj => ({
      ...mj.job,
      status: mj.status,
      paused: mj.paused,
      executionCount: mj.executionCount,
      lastExecutionTime: mj.lastExecutionTime,
    }));
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(jobId: string): ExecutionRecord[] {
    return this.executionHistory.getHistory(jobId);
  }

  /**
   * 获取计费汇总
   */
  getBillingSummary(startTime?: number, endTime?: number): {
    totalAmount: number;
    records: BillingRecord[];
  } {
    return this.billingTracker.getSummary(startTime, endTime);
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 安排任务调度
   */
  private scheduleJob(job: ScheduledJob): void {
    const { schedule } = job;

    switch (schedule.type) {
      case 'cron':
        this.scheduleCron(job);
        break;
      case 'at':
        this.scheduleAt(job);
        break;
      case 'every':
        this.scheduleEvery(job);
        break;
      default:
        this.logger.error(`Unknown schedule type: ${(schedule as any).type}`);
    }
  }

  /**
   * Cron调度
   */
  private scheduleCron(job: ScheduledJob): void {
    const schedule = cronParser(job.schedule.expression);

    const scheduleNext = () => {
      // 检查运行状态和任务是否被暂停
      const managedJob = this.jobs.get(job.id);
      if (!this.running || managedJob?.paused) {
        return;
      }

      const next = schedule.next();
      if (!next) {
        this.logger.warn(`Cron job ${job.id} has no next execution time`);
        return;
      }

      const delay = next.getTime() - Date.now();
      if (delay > 0) {
        if (managedJob) {
          managedJob.nextExecutionTime = next.getTime();
          managedJob.status = 'scheduled';
        }

        this.timerManager.set(job.id, async () => {
          await this.executeJob(job);
          scheduleNext();
        }, delay);
      } else {
        // 跳过已过期的时间，继续下一个
        scheduleNext();
      }
    };

    scheduleNext();
  }

  /**
   * 指定时间执行一次
   */
  private scheduleAt(job: ScheduledJob): void {
    const targetTime = new Date(job.schedule.expression).getTime();
    const delay = targetTime - Date.now();

    const managedJob = this.jobs.get(job.id);

    if (delay <= 0) {
      // 时间已过，立即执行（如果调度器正在运行）
      if (this.running) {
        this.timerManager.set(job.id, async () => {
          await this.executeJob(job);
          if (managedJob) {
            managedJob.status = 'completed';
          }
        }, 0);
      }
      return;
    }

    if (managedJob) {
      managedJob.nextExecutionTime = targetTime;
      managedJob.status = 'scheduled';
    }

    this.timerManager.set(job.id, async () => {
      await this.executeJob(job);
      if (managedJob) {
        managedJob.status = 'completed';
      }
    }, delay);
  }

  /**
   * 固定间隔执行
   */
  private scheduleEvery(job: ScheduledJob): void {
    const intervalMinutes = parseInt(job.schedule.expression, 10);
    const intervalMs = intervalMinutes * 60 * 1000;

    if (intervalMs <= 0) {
      this.logger.error(`Invalid interval for job ${job.id}: ${job.schedule.expression}`);
      return;
    }

    const runAndReschedule = () => {
      const managedJob = this.jobs.get(job.id);

      // 检查运行状态和暂停状态
      if (!this.running || managedJob?.paused) {
        return;
      }

      // 并发保护：防止同一任务重叠执行
      if (!this.timerManager.markExecuting(job.id)) {
        return;
      }

      this.executeJob(job)
        .then(() => {
          this.timerManager.markComplete(job.id);
          // 只有在定时器还没有被设置的情况下才设置新的
          if (!this.timerManager.has(job.id)) {
            this.timerManager.set(job.id, runAndReschedule, intervalMs);
          }
        })
        .catch(err => {
          this.logger.error(`Every job ${job.id} failed:`, err);
          this.timerManager.markComplete(job.id);
          if (!this.timerManager.has(job.id)) {
            this.timerManager.set(job.id, runAndReschedule, intervalMs);
          }
        });
    };

    // 首次立即执行
    this.timerManager.set(job.id, runAndReschedule, 0);
  }

  /**
   * 清除任务定时器
   */
  private clearJobTimer(jobId: string): void {
    this.timerManager.clear(jobId);
  }

  /**
   * 执行任务（带超时保护）
   */
  private async executeJob(job: ScheduledJob): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    const managedJob = this.jobs.get(job.id);
    if (managedJob) {
      managedJob.status = 'executing';
      managedJob.executionCount++;
      managedJob.lastExecutionTime = startTime;
    }

    this.logger.debug(`Executing job ${job.id} (${executionId})`);

    try {
      // 执行超时保护
      const result = await Promise.race([
        this.doExecuteJob(job),
        new Promise<ExecutionResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Job execution timeout after ${this.executionTimeoutMs}ms`));
          }, this.executionTimeoutMs);
        }),
      ]);

      // 记录执行历史
      this.executionHistory.addRecord(job.id, executionId, result);

      // 计费
      if (job.costPerExecution !== undefined && job.costPerExecution > 0) {
        this.billingTracker.addRecord(job.id, executionId, job.costPerExecution, 'execution');
      }

      if (managedJob) {
        managedJob.status = result.success ? 'idle' : 'failed';
      }

      const duration = Date.now() - startTime;
      this.logger.info(`Job ${job.id} completed in ${duration}ms, success: ${result.success}`);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: ExecutionResult = {
        success: false,
        content: '',
        pushResult: [],
        error: errorMessage,
        startTime,
        endTime,
        retries: 0,
      };

      this.executionHistory.addRecord(job.id, executionId, result);

      if (managedJob) {
        managedJob.status = 'failed';
      }

      const duration = endTime - startTime;
      this.logger.error(`Job ${job.id} failed in ${duration}ms: ${errorMessage}`);

      return result;
    }
  }

  /**
   * 实际执行任务逻辑
   */
  private async doExecuteJob(job: ScheduledJob): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    let retries = 0;

    // 渲染模板
    let content: string;
    if (job.needRender) {
      const variables = job.defaultVariables || {};
      // 注入执行时间变量
      const allVariables = {
        ...variables,
        executionTime: new Date().toISOString(),
        executionId,
      };

      if (this.templateEngine.hasTemplate(job.template)) {
        content = this.templateEngine.renderTemplate(job.template, allVariables);
      } else {
        content = this.templateEngine.renderString(job.template, allVariables);
      }
    } else {
      content = job.template;
    }

    // 执行推送
    const pushResult = await this.channelPusher.pushToAll(content, job.channels);
    const allSuccess = pushResult.every(r => r.success);

    const endTime = Date.now();

    return {
      success: allSuccess,
      content,
      pushResult,
      startTime,
      endTime,
      retries,
    };
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
