/**
 * 技能配额管理器
 * Skill Quota Manager - 技能数量/资源配额管理
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { SkillQuotaInfo } from '../interfaces/skill.types';

/**
 * 配额限制配置
 */
export interface QuotaLimits {
  /** 最大技能数 */
  maxSkills?: number;
  /** 最大并发执行数 */
  maxConcurrentExecutions?: number;
  /** 每日最大执行次数 */
  maxDailyExecutions?: number;
  /** 最大执行超时（毫秒） */
  maxExecutionTimeout?: number;
  /** 最大内存限制（MB） */
  maxMemoryLimit?: number;
  /** 最大存储空间（MB） */
  maxStorageMb?: number;
}

/**
 * 配额使用记录
 */
interface QuotaUsage {
  /** 已使用技能数 */
  usedSkills: number;
  /** 当前并发执行数 */
  currentConcurrentExecutions: number;
  /** 今日执行次数 */
  todayExecutions: number;
  /** 今日执行时间戳 */
  todayTimestamp: number;
  /** 执行历史 */
  executionHistory: Array<{
    timestamp: number;
    skillId: string;
    duration: number;
  }>;
}

/**
 * 用户配额配置
 */
export interface UserQuotaConfig {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 配额限制 */
  limits: QuotaLimits;
  /** 是否启用 */
  enabled?: boolean;
  /** 配额重置时间 */
  resetAt?: Date;
  /** 优先级 */
  priority?: number;
}

/**
 * 配额检查结果
 */
export interface QuotaCheckResult {
  /** 是否允许 */
  allowed: boolean;
  /** 原因 */
  reason?: string;
  /** 当前配额信息 */
  quotaInfo?: SkillQuotaInfo;
  /** 剩余配额 */
  remaining?: {
    skills?: number;
    concurrentExecutions?: number;
    dailyExecutions?: number;
  };
}

/**
 * 配额管理器事件
 */
export enum QuotaEvent {
  QUOTA_EXCEEDED = 'quotaExceeded',
  QUOTA_WARNING = 'quotaWarning',
  QUOTA_RESET = 'quotaReset',
}

/**
 * 技能配额管理器
 * 管理用户和租户的技能配额
 */
export class SkillQuotaManager extends EventEmitter {
  /** 配额存储路径 */
  private storagePath: string;
  /** 用户配额配置 */
  private userConfigs: Map<string, UserQuotaConfig> = new Map();
  /** 配额使用记录 */
  private usage: Map<string, QuotaUsage> = new Map();
  /** 默认配额 */
  private defaultLimits: QuotaLimits;
  /** 加载状态 */
  private loaded: boolean = false;

  /**
   * 构造函数
   * @param storagePath - 存储路径
   * @param defaultLimits - 默认配额限制
   */
  constructor(storagePath: string, defaultLimits: QuotaLimits = {}) {
    super();
    this.storagePath = storagePath;
    this.defaultLimits = {
      maxSkills: defaultLimits.maxSkills ?? 100,
      maxConcurrentExecutions: defaultLimits.maxConcurrentExecutions ?? 5,
      maxDailyExecutions: defaultLimits.maxDailyExecutions ?? 1000,
      maxExecutionTimeout: defaultLimits.maxExecutionTimeout ?? 300000,
      maxMemoryLimit: defaultLimits.maxMemoryLimit ?? 512,
      maxStorageMb: defaultLimits.maxStorageMb ?? 1024,
    };

    // 初始化存储目录
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  // ============== 生命周期 ==============

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    await this.load();
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    await this.save();
  }

  // ============== 配额管理 ==============

  /**
   * 获取配额信息
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  async getQuotaInfo(userId: string, tenantId: string): Promise<SkillQuotaInfo> {
    const key = this.getKey(userId, tenantId);
    const config = this.userConfigs.get(key);
    const usage = this.getUsage(key);

    return {
      userId,
      tenantId,
      maxSkills: config?.limits.maxSkills ?? this.defaultLimits.maxSkills!,
      usedSkills: usage.usedSkills,
      maxConcurrentExecutions:
        config?.limits.maxConcurrentExecutions ??
        this.defaultLimits.maxConcurrentExecutions!,
      currentConcurrentExecutions: usage.currentConcurrentExecutions,
      maxDailyExecutions:
        config?.limits.maxDailyExecutions ??
        this.defaultLimits.maxDailyExecutions!,
      todayExecutions: this.getTodayExecutions(usage),
      resetAt: config?.resetAt ?? this.getNextResetTime(),
    };
  }

  /**
   * 检查配额
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   * @param operation - 操作类型
   */
  async checkQuota(
    userId: string,
    tenantId: string,
    operation: 'install' | 'execute' | 'concurrent'
  ): Promise<QuotaCheckResult> {
    const key = this.getKey(userId, tenantId);
    const quotaInfo = await this.getQuotaInfo(userId, tenantId);

    switch (operation) {
      case 'install':
        return this.checkInstallQuota(key, quotaInfo);
      case 'execute':
        return this.checkExecuteQuota(key, quotaInfo);
      case 'concurrent':
        return this.checkConcurrentQuota(key, quotaInfo);
      default:
        return { allowed: true, quotaInfo };
    }
  }

  /**
   * 增加技能计数
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  async incrementSkillCount(userId: string, tenantId: string): Promise<void> {
    const key = this.getKey(userId, tenantId);
    const usage = this.getUsage(key);
    usage.usedSkills++;
    await this.save();
  }

  /**
   * 减少技能计数
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  async decrementSkillCount(userId: string, tenantId: string): Promise<void> {
    const key = this.getKey(userId, tenantId);
    const usage = this.getUsage(key);
    usage.usedSkills = Math.max(0, usage.usedSkills - 1);
    await this.save();
  }

  /**
   * 开始执行（增加并发计数）
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   * @param skillId - 技能ID
   */
  async startExecution(
    userId: string,
    tenantId: string,
    skillId: string
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);
    const usage = this.getUsage(key);

    usage.currentConcurrentExecutions++;
    usage.todayExecutions++;
    usage.todayTimestamp = this.getTodayStart();
    usage.executionHistory.push({
      timestamp: Date.now(),
      skillId,
      duration: 0,
    });

    await this.save();
  }

  /**
   * 结束执行
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   * @param duration - 执行时长
   */
  async endExecution(
    userId: string,
    tenantId: string,
    duration: number
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);
    const usage = this.getUsage(key);

    usage.currentConcurrentExecutions = Math.max(
      0,
      usage.currentConcurrentExecutions - 1
    );

    // 更新最后一条执行记录
    if (usage.executionHistory.length > 0) {
      const lastExecution =
        usage.executionHistory[usage.executionHistory.length - 1];
      lastExecution.duration = duration;
    }

    await this.save();
  }

  /**
   * 设置用户配额
   * @param config - 用户配额配置
   */
  async setUserQuota(config: UserQuotaConfig): Promise<void> {
    const key = this.getKey(config.userId, config.tenantId);
    this.userConfigs.set(key, config);
    await this.save();
  }

  /**
   * 删除用户配额
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  async deleteUserQuota(userId: string, tenantId: string): Promise<void> {
    const key = this.getKey(userId, tenantId);
    this.userConfigs.delete(key);
    this.usage.delete(key);
    await this.save();
  }

  /**
   * 重置配额
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  async resetQuota(userId: string, tenantId: string): Promise<void> {
    const key = this.getKey(userId, tenantId);
    const usage = this.getUsage(key);

    usage.todayExecutions = 0;
    usage.todayTimestamp = this.getTodayStart();
    usage.executionHistory = [];

    this.emit(QuotaEvent.QUOTA_RESET, { userId, tenantId });
    await this.save();
  }

  /**
   * 获取使用统计
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  async getUsageStats(
    userId: string,
    tenantId: string
  ): Promise<{
    totalExecutions: number;
    avgDuration: number;
    mostUsedSkill?: string;
    peakConcurrent: number;
  }> {
    const key = this.getKey(userId, tenantId);
    const usage = this.getUsage(key);

    const totalExecutions = usage.executionHistory.length;
    const totalDuration = usage.executionHistory.reduce(
      (sum, e) => sum + e.duration,
      0
    );
    const avgDuration =
      totalExecutions > 0 ? totalDuration / totalExecutions : 0;

    // 统计最常用的技能
    const skillCounts = new Map<string, number>();
    for (const e of usage.executionHistory) {
      skillCounts.set(e.skillId, (skillCounts.get(e.skillId) ?? 0) + 1);
    }

    let mostUsedSkill: string | undefined;
    let maxCount = 0;
    for (const [skillId, count] of skillCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedSkill = skillId;
      }
    }

    return {
      totalExecutions,
      avgDuration,
      mostUsedSkill,
      peakConcurrent: this.getPeakConcurrent(usage),
    };
  }

  // ============== 私有方法 ==============

  /**
   * 生成存储键
   */
  private getKey(userId: string, tenantId: string): string {
    return `${tenantId}:${userId}`;
  }

  /**
   * 获取配额使用记录
   */
  private getUsage(key: string): QuotaUsage {
    if (!this.usage.has(key)) {
      this.usage.set(key, {
        usedSkills: 0,
        currentConcurrentExecutions: 0,
        todayExecutions: 0,
        todayTimestamp: this.getTodayStart(),
        executionHistory: [],
      });
    }

    return this.usage.get(key)!;
  }

  /**
   * 检查安装配额
   */
  private checkInstallQuota(
    key: string,
    quotaInfo: SkillQuotaInfo
  ): QuotaCheckResult {
    if (quotaInfo.usedSkills >= quotaInfo.maxSkills) {
      this.emit(QuotaEvent.QUOTA_EXCEEDED, {
        key,
        type: 'skills',
        current: quotaInfo.usedSkills,
        limit: quotaInfo.maxSkills,
      });

      return {
        allowed: false,
        reason: `已达到最大技能数限制 (${quotaInfo.maxSkills})`,
        quotaInfo,
        remaining: { skills: 0 },
      };
    }

    // 警告阈值 (80%)
    const warningThreshold = quotaInfo.maxSkills * 0.8;
    if (quotaInfo.usedSkills >= warningThreshold) {
      this.emit(QuotaEvent.QUOTA_WARNING, {
        key,
        type: 'skills',
        current: quotaInfo.usedSkills,
        limit: quotaInfo.maxSkills,
      });
    }

    return {
      allowed: true,
      quotaInfo,
      remaining: {
        skills: quotaInfo.maxSkills - quotaInfo.usedSkills,
      },
    };
  }

  /**
   * 检查执行配额
   */
  private checkExecuteQuota(
    key: string,
    quotaInfo: SkillQuotaInfo
  ): QuotaCheckResult {
    if (this.getTodayExecutions(this.getUsage(key)) >= quotaInfo.maxDailyExecutions) {
      this.emit(QuotaEvent.QUOTA_EXCEEDED, {
        key,
        type: 'dailyExecutions',
        current: this.getTodayExecutions(this.getUsage(key)),
        limit: quotaInfo.maxDailyExecutions,
      });

      return {
        allowed: false,
        reason: `已达到每日执行次数限制 (${quotaInfo.maxDailyExecutions})`,
        quotaInfo,
        remaining: { dailyExecutions: 0 },
      };
    }

    return {
      allowed: true,
      quotaInfo,
      remaining: {
        dailyExecutions:
          quotaInfo.maxDailyExecutions -
          this.getTodayExecutions(this.getUsage(key)),
      },
    };
  }

  /**
   * 检查并发配额
   */
  private checkConcurrentQuota(
    key: string,
    quotaInfo: SkillQuotaInfo
  ): QuotaCheckResult {
    if (
      quotaInfo.currentConcurrentExecutions >=
      quotaInfo.maxConcurrentExecutions
    ) {
      this.emit(QuotaEvent.QUOTA_EXCEEDED, {
        key,
        type: 'concurrentExecutions',
        current: quotaInfo.currentConcurrentExecutions,
        limit: quotaInfo.maxConcurrentExecutions,
      });

      return {
        allowed: false,
        reason: `已达到最大并发执行数限制 (${quotaInfo.maxConcurrentExecutions})`,
        quotaInfo,
        remaining: { concurrentExecutions: 0 },
      };
    }

    return {
      allowed: true,
      quotaInfo,
      remaining: {
        concurrentExecutions:
          quotaInfo.maxConcurrentExecutions -
          quotaInfo.currentConcurrentExecutions,
      },
    };
  }

  /**
   * 获取今日执行次数
   */
  private getTodayExecutions(usage: QuotaUsage): number {
    const todayStart = this.getTodayStart();
    if (usage.todayTimestamp < todayStart) {
      return 0;
    }
    return usage.todayExecutions;
  }

  /**
   * 获取今日开始时间戳
   */
  private getTodayStart(): number {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
  }

  /**
   * 获取下次重置时间
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    return tomorrow;
  }

  /**
   * 获取峰值并发数
   */
  private getPeakConcurrent(usage: QuotaUsage): number {
    // 简化实现，实际应跟踪历史峰值
    return usage.currentConcurrentExecutions;
  }

  /**
   * 保存到文件
   */
  private async save(): Promise<void> {
    try {
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        configs: Array.from(this.userConfigs.entries()),
        usage: Array.from(this.usage.entries()),
      };

      const filePath = path.join(this.storagePath, 'quotas.json');
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存配额数据失败:', error);
    }
  }

  /**
   * 从文件加载
   */
  private async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    const filePath = path.join(this.storagePath, 'quotas.json');
    if (!fs.existsSync(filePath)) {
      this.loaded = true;
      return;
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.configs) {
        this.userConfigs = new Map(data.configs);
      }

      if (data.usage) {
        for (const [key, usage] of data.usage) {
          this.usage.set(key, usage as QuotaUsage);
        }
      }

      this.loaded = true;
    } catch (error) {
      console.error('加载配额数据失败:', error);
      this.loaded = true;
    }
  }
}
