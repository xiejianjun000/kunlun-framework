import { IOutcomeScheduler, ScheduledJob, ExecutionResult, ExecutionRecord, BillingRecord } from './interfaces/IOutcomeScheduler';
import { TemplateEngine } from './TemplateEngine';
import { ChannelPusher } from './ChannelPusher';
import { BillingTracker } from './BillingTracker';
import { ExecutionHistory } from './ExecutionHistory';
import { RetryManager } from './RetryManager';
/**
 * 成果调度器 - 核心实现
 *
 * 支持三种调度类型：
 * 1. cron - Cron表达式定时
 * 2. at - 指定时间执行一次
 * 3. every - 固定间隔循环执行
 */
export declare class OutcomeScheduler implements IOutcomeScheduler {
    readonly name: string;
    readonly version: string;
    private jobs;
    private timers;
    private running;
    readonly templateEngine: TemplateEngine;
    readonly channelPusher: ChannelPusher;
    readonly billingTracker: BillingTracker;
    readonly executionHistory: ExecutionHistory;
    readonly retryManager: RetryManager;
    constructor();
    /**
     * 启动调度器
     */
    start(): void;
    /**
     * 停止调度器
     */
    stop(): void;
    /**
     * 添加调度任务
     */
    addJob(job: ScheduledJob): void;
    /**
     * 移除调度任务
     */
    removeJob(jobId: string): boolean;
    /**
     * 手动触发任务执行
     */
    triggerJob(jobId: string): Promise<ExecutionResult>;
    /**
     * 获取执行历史
     */
    getExecutionHistory(jobId: string): ExecutionRecord[];
    /**
     * 获取计费汇总
     */
    getBillingSummary(startTime?: number, endTime?: number): {
        totalAmount: number;
        records: BillingRecord[];
    };
    /**
     * 安排任务调度
     */
    private scheduleJob;
    /**
     * Cron调度
     */
    private scheduleCron;
    /**
     * 指定时间执行一次
     */
    private scheduleAt;
    /**
     * 固定间隔执行
     */
    private scheduleEvery;
    /**
     * 清除任务定时器
     */
    private clearJobTimer;
    /**
     * 执行任务
     */
    private executeJob;
    /**
     * 生成执行ID
     */
    private generateExecutionId;
    /**
     * 获取所有任务
     */
    getAllJobs(): ScheduledJob[];
    /**
     * 检查是否正在运行
     */
    isRunning(): boolean;
}
