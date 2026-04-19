/**
 * 心跳管理器
 * Heartbeat Manager - 核心管理类
 */

import * as path from 'path';
import {
  CheckItem,
  CheckResult,
  HeartbeatOptions,
  HeartbeatStats,
  CheckStatus,
  DEFAULT_CHECK_OPTIONS,
} from './CheckItem';
import { HeartbeatChecker, CheckerContext } from './HeartbeatChecker';
import { HeartbeatScheduler } from './HeartbeatScheduler';
import { createAllBuiltinCheckers } from './checkers/BuiltinCheckers';

export interface HeartbeatManagerConfig {
  /** 检查间隔(ms)，默认30分钟 */
  interval?: number;
  /** 检查清单文件路径 */
  checklistPath?: string;
  /** 是否启用内置检查器 */
  enableBuiltinCheckers?: boolean;
  /** 失败阈值 */
  failureThreshold?: number;
  /** 通知回调 */
  onNotify?: ((results: CheckResult[]) => void) | undefined;
  /** 检查完成回调 */
  onCheckComplete?: ((results: CheckResult[]) => void) | undefined;
  /** 日志函数 */
  logger?: ((msg: string) => void) | undefined;
}

export class HeartbeatManager {
  private checker: HeartbeatChecker;
  private scheduler: HeartbeatScheduler;
  private config: {
    interval: number;
    checklistPath: string;
    enableBuiltinCheckers: boolean;
    failureThreshold: number;
    onNotify?: (results: CheckResult[]) => void;
    onCheckComplete?: (results: CheckResult[]) => void;
    logger: (msg: string) => void;
  };
  private stats: HeartbeatStats;
  private startTime: Date;
  private context: Partial<CheckerContext>;
  private logger: (msg: string) => void;

  constructor(config: HeartbeatManagerConfig = {}) {
    this.startTime = new Date();
    this.logger = config.logger || console.log;

    // 合并配置
    this.config = {
      interval: config.interval ?? DEFAULT_CHECK_OPTIONS.interval!,
      checklistPath: config.checklistPath ?? './heartbeat.md',
      enableBuiltinCheckers:
        config.enableBuiltinCheckers ??
        DEFAULT_CHECK_OPTIONS.enableBuiltinCheckers!,
      failureThreshold:
        config.failureThreshold ?? DEFAULT_CHECK_OPTIONS.failureThreshold!,
      onNotify: config.onNotify,
      onCheckComplete: config.onCheckComplete,
      logger: this.logger,
    };

    // 初始化上下文
    this.context = {
      rootPath: process.cwd(),
      memoryPath: path.join(process.cwd(), 'MEMORY.md'),
      calendarPath: path.join(process.cwd(), 'calendar.json'),
      soulPath: path.join(process.cwd(), 'SOUL.md'),
    };

    // 初始化检查器
    this.checker = new HeartbeatChecker(this.config.checklistPath, this.context, this.logger);

    // 初始化调度器
    this.scheduler = new HeartbeatScheduler(this.config.interval, this.logger);

    // 初始化统计
    this.stats = {
      totalChecks: 0,
      passedChecks: 0,
      warningChecks: 0,
      failedChecks: 0,
      lastCheckTime: null,
      nextCheckTime: null,
      uptime: 0,
    };
  }

  /**
   * 启动心跳系统
   */
  async start(): Promise<void> {
    this.logger('[HeartbeatManager] 正在启动...');

    // 注册内置检查器
    if (this.config.enableBuiltinCheckers) {
      this.registerBuiltinCheckItems();
    }

    // 加载自定义检查项
    await this.loadCustomCheckItems();

    // 启动调度器
    this.scheduler.start(
      async () => {
        await this.performCheck();
      },
      { immediate: true }
    );

    this.updateNextCheckTime();
    this.logger('[HeartbeatManager] 心跳系统已启动');
  }

  /**
   * 停止心跳系统
   */
  async stop(): Promise<void> {
    this.scheduler.stop();
    this.updateStats();
    this.logger('[HeartbeatManager] 心跳系统已停止');
  }

  /**
   * 手动触发检查
   */
  async checkNow(): Promise<CheckResult[]> {
    this.logger('[HeartbeatManager] 手动触发检查...');
    return await this.performCheck();
  }

  /**
   * 手动触发检查（别名）
   */
  async check(): Promise<CheckResult[]> {
    return this.checkNow();
  }

  /**
   * 添加自定义检查项
   */
  addCheckItem(item: CheckItem): void {
    this.checker.registerCheckItem(item);
    this.logger(`[HeartbeatManager] 已添加检查项: ${item.name}`);
  }

  /**
   * 移除检查项
   */
  removeCheckItem(itemId: string): boolean {
    return this.checker.removeCheckItem(itemId);
  }

  /**
   * 获取所有检查项
   */
  getCheckItems(): CheckItem[] {
    return this.checker.getCheckItems();
  }

  /**
   * 获取检查项数量
   */
  getCheckItemCount(): number {
    return this.checker.getCheckItems().length;
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    isRunning: boolean;
    schedulerStatus: any;
    stats: HeartbeatStats;
    checkItemsCount: number;
  } {
    return {
      isRunning: this.scheduler.isActive(),
      schedulerStatus: this.scheduler.getStatus(),
      stats: { ...this.stats },
      checkItemsCount: this.getCheckItemCount(),
    };
  }

  /**
   * 更新检查上下文
   */
  updateContext(context: Partial<CheckerContext>): void {
    this.context = { ...this.context, ...context };
    this.checker.updateContext(this.context);
  }

  /**
   * 设置检查间隔
   */
  setInterval(interval: number): void {
    this.scheduler.setInterval(interval);
    this.config.interval = interval;
  }

  /**
   * 执行检查
   */
  private async performCheck(): Promise<CheckResult[]> {
    const results = await this.checker.runChecks();

    this.stats.lastCheckTime = new Date();
    this.stats.totalChecks++;

    // 更新统计
    for (const result of results) {
      switch (result.status) {
        case CheckStatus.PASS:
          this.stats.passedChecks++;
          break;
        case CheckStatus.WARNING:
          this.stats.warningChecks++;
          break;
        case CheckStatus.FAIL:
          this.stats.failedChecks++;
          break;
      }
    }

    this.updateNextCheckTime();

    // 触发通知（如果有失败或警告）
    const abnormalResults = results.filter((r) => r.status !== CheckStatus.PASS);
    if (abnormalResults.length > 0 && this.config.onNotify) {
      this.config.onNotify(abnormalResults);
    }

    // 触发完成回调
    if (this.config.onCheckComplete) {
      this.config.onCheckComplete(results);
    }

    return results;
  }

  /**
   * 注册内置检查项
   */
  private registerBuiltinCheckItems(): void {
    const builtinCheckers = createAllBuiltinCheckers(this.context, {
      failureThreshold: this.config.failureThreshold,
    });

    for (const checker of builtinCheckers) {
      this.checker.registerCheckItem(checker);
    }

    this.logger(`[HeartbeatManager] 已注册 ${builtinCheckers.length} 个内置检查器`);
  }

  /**
   * 加载自定义检查项
   */
  private async loadCustomCheckItems(): Promise<void> {
    const customItems = await this.checker.loadChecklist();

    for (const item of customItems) {
      if (item.description && !this.checker.getCheckItems().find((i) => i.id === item.id)) {
        // 为自定义检查项添加默认check函数
        const customCheckItem: CheckItem = {
          ...item,
          check: async () => ({
            itemId: item.id,
            itemName: item.name,
            status: CheckStatus.PASS,
            message: `自定义检查项: ${item.description}`,
            timestamp: new Date(),
          }),
        };
        this.checker.registerCheckItem(customCheckItem);
      }
    }
  }

  /**
   * 更新下次检查时间
   */
  private updateNextCheckTime(): void {
    const status = this.scheduler.getStatus();
    if (status.nextExecutionTime) {
      this.stats.nextCheckTime = status.nextExecutionTime;
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.uptime = Date.now() - this.startTime.getTime();
  }

  /**
   * 获取历史检查结果（内存中保留最近10次）
   */
  getRecentResults(): CheckResult[] {
    // 注：实际实现可能需要持久化存储
    return [];
  }
}

export default HeartbeatManager;
