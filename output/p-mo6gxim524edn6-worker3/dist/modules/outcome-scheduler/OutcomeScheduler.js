"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeScheduler = void 0;
const TemplateEngine_1 = require("./TemplateEngine");
const ChannelPusher_1 = require("./ChannelPusher");
const BillingTracker_1 = require("./BillingTracker");
const ExecutionHistory_1 = require("./ExecutionHistory");
const RetryManager_1 = require("./RetryManager");
const cronParser_1 = require("./utils/cronParser");
/**
 * 成果调度器 - 核心实现
 *
 * 支持三种调度类型：
 * 1. cron - Cron表达式定时
 * 2. at - 指定时间执行一次
 * 3. every - 固定间隔循环执行
 */
class OutcomeScheduler {
    constructor() {
        this.name = 'OutcomeScheduler';
        this.version = '1.0.0';
        this.jobs = new Map();
        this.timers = new Map();
        this.running = false;
        this.templateEngine = new TemplateEngine_1.TemplateEngine();
        this.retryManager = new RetryManager_1.RetryManager({
            maxRetries: 3,
            retryIntervalMs: 1000,
            exponentialBackoff: true
        });
        this.channelPusher = new ChannelPusher_1.ChannelPusher(this.retryManager);
        this.billingTracker = new BillingTracker_1.BillingTracker();
        this.executionHistory = new ExecutionHistory_1.ExecutionHistory();
    }
    /**
     * 启动调度器
     */
    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        // 为每个已添加的任务安排调度
        for (const [jobId, job] of this.jobs) {
            if (job.schedule.enabled) {
                this.scheduleJob(job);
            }
        }
    }
    /**
     * 停止调度器
     */
    stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        // 清除所有定时器
        for (const [jobId] of this.timers) {
            this.clearJobTimer(jobId);
        }
        this.timers.clear();
    }
    /**
     * 添加调度任务
     */
    addJob(job) {
        if (this.jobs.has(job.id)) {
            throw new Error(`Job with id "${job.id}" already exists`);
        }
        this.jobs.set(job.id, job);
        if (this.running && job.schedule.enabled) {
            this.scheduleJob(job);
        }
    }
    /**
     * 移除调度任务
     */
    removeJob(jobId) {
        this.clearJobTimer(jobId);
        this.timers.delete(jobId);
        return this.jobs.delete(jobId);
    }
    /**
     * 手动触发任务执行
     */
    async triggerJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job "${jobId}" not found`);
        }
        return this.executeJob(job);
    }
    /**
     * 获取执行历史
     */
    getExecutionHistory(jobId) {
        return this.executionHistory.getHistory(jobId);
    }
    /**
     * 获取计费汇总
     */
    getBillingSummary(startTime, endTime) {
        return this.billingTracker.getSummary(startTime, endTime);
    }
    /**
     * 安排任务调度
     */
    scheduleJob(job) {
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
                console.error(`Unknown schedule type: ${schedule.type}`);
        }
    }
    /**
     * Cron调度
     */
    scheduleCron(job) {
        const schedule = (0, cronParser_1.cronParser)(job.schedule.expression);
        const scheduleNext = () => {
            if (!this.running)
                return;
            const next = schedule.next();
            if (!next)
                return;
            const delay = next.getTime() - Date.now();
            if (delay > 0) {
                this.timers.set(job.id, setTimeout(() => {
                    this.executeJob(job).then(() => {
                        // Schedule next run
                        scheduleNext();
                    }).catch(err => {
                        console.error(`Cron job ${job.id} failed:`, err);
                        scheduleNext();
                    });
                }, delay));
            }
        };
        scheduleNext();
    }
    /**
     * 指定时间执行一次
     */
    scheduleAt(job) {
        const targetTime = new Date(job.schedule.expression).getTime();
        const delay = targetTime - Date.now();
        if (delay <= 0) {
            // 时间已过，立即执行
            if (this.running) {
                setTimeout(() => {
                    this.executeJob(job).catch(err => {
                        console.error(`At job ${job.id} failed:`, err);
                    });
                }, 0);
            }
            return;
        }
        this.timers.set(job.id, setTimeout(() => {
            this.executeJob(job).catch(err => {
                console.error(`At job ${job.id} failed:`, err);
            });
        }, delay));
    }
    /**
     * 固定间隔执行
     */
    scheduleEvery(job) {
        const intervalMinutes = parseInt(job.schedule.expression, 10);
        const intervalMs = intervalMinutes * 60 * 1000;
        const runAndReschedule = () => {
            if (!this.running)
                return;
            this.executeJob(job).then(() => {
                this.timers.set(job.id, setTimeout(runAndReschedule, intervalMs));
            }).catch(err => {
                console.error(`Every job ${job.id} failed:`, err);
                this.timers.set(job.id, setTimeout(runAndReschedule, intervalMs));
            });
        };
        // 首次立即执行
        this.timers.set(job.id, setTimeout(runAndReschedule, 0));
    }
    /**
     * 清除任务定时器
     */
    clearJobTimer(jobId) {
        const timer = this.timers.get(jobId);
        if (timer) {
            clearTimeout(timer);
        }
    }
    /**
     * 执行任务
     */
    async executeJob(job) {
        const startTime = Date.now();
        const executionId = this.generateExecutionId();
        let retries = 0;
        try {
            // 渲染模板
            let content;
            if (job.needRender) {
                const variables = job.defaultVariables || {};
                // 注入执行时间变量
                const allVariables = {
                    ...variables,
                    executionTime: new Date().toISOString(),
                    executionId
                };
                if (this.templateEngine.hasTemplate(job.template)) {
                    content = this.templateEngine.renderTemplate(job.template, allVariables);
                }
                else {
                    content = this.templateEngine.renderString(job.template, allVariables);
                }
            }
            else {
                content = job.template;
            }
            // 执行推送
            const pushResult = await this.channelPusher.pushToAll(content, job.channels);
            const allSuccess = pushResult.every(r => r.success);
            // 如果有失败，重试
            const retryConfig = {
                maxRetries: job.retry?.maxRetries ?? this.retryManager.getDefaultConfig().maxRetries,
                retryIntervalMs: job.retry?.retryIntervalMs ?? this.retryManager.getDefaultConfig().retryIntervalMs,
                exponentialBackoff: job.retry?.exponentialBackoff ?? this.retryManager.getDefaultConfig().exponentialBackoff
            };
            const failedChannels = pushResult.filter(r => !r.success);
            if (failedChannels.length > 0 && retries < retryConfig.maxRetries) {
                // 这里重试推送失败的渠道会在ChannelPusher中处理
                retries = failedChannels.length;
            }
            const success = allSuccess;
            const endTime = Date.now();
            const result = {
                success,
                content,
                pushResult,
                startTime,
                endTime,
                retries
            };
            // 记录执行历史
            this.executionHistory.addRecord(job.id, executionId, result);
            // 计费
            if (job.costPerExecution !== undefined && job.costPerExecution > 0) {
                this.billingTracker.addRecord(job.id, executionId, job.costPerExecution, 'execution');
            }
            return result;
        }
        catch (error) {
            const endTime = Date.now();
            const errorMessage = error instanceof Error ? error.message : String(error);
            const result = {
                success: false,
                content: '',
                pushResult: [],
                error: errorMessage,
                startTime,
                endTime,
                retries
            };
            this.executionHistory.addRecord(job.id, executionId, result);
            return result;
        }
    }
    /**
     * 生成执行ID
     */
    generateExecutionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 获取所有任务
     */
    getAllJobs() {
        return Array.from(this.jobs.values());
    }
    /**
     * 检查是否正在运行
     */
    isRunning() {
        return this.running;
    }
}
exports.OutcomeScheduler = OutcomeScheduler;
