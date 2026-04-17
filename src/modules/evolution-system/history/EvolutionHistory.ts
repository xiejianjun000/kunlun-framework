/**
 * 进化历史记录
 * Evolution History - Stores and manages evolution records
 */

import {
  EvolutionHistoryRecord,
  Reward,
  EvolutionVersion,
  HistoryQueryOptions,
  EvolutionConfig,
} from '../interfaces';

/** 存储接口 */
interface HistoryStorage {
  /** 保存记录 */
  saveRecord(record: EvolutionHistoryRecord): Promise<void>;
  /** 查询记录 */
  queryRecords(options: HistoryQueryOptions & { userId: string; tenantId: string }): Promise<EvolutionHistoryRecord[]>;
  /** 获取记录 */
  getRecord(recordId: string): Promise<EvolutionHistoryRecord | null>;
  /** 删除记录 */
  deleteRecord(recordId: string): Promise<void>;

  /** 保存版本 */
  saveVersion(version: EvolutionVersion): Promise<void>;
  /** 获取版本列表 */
  getVersions(userId: string, tenantId: string): Promise<EvolutionVersion[]>;
  /** 获取版本 */
  getVersion(versionId: string): Promise<EvolutionVersion | null>;

  /** 保存奖励 */
  saveReward(reward: Reward): Promise<void>;
  /** 查询奖励 */
  queryRewards(userId: string, tenantId: string): Promise<Reward[]>;

  /** 保存配置 */
  saveConfig(userId: string, tenantId: string, config: EvolutionConfig): Promise<void>;
  /** 获取配置 */
  getConfig(userId: string, tenantId: string): Promise<EvolutionConfig | null>;
}

/**
 * 进化历史管理器
 */
export class EvolutionHistory {
  private readonly storage: HistoryStorage;
  private readonly memory: Map<string, EvolutionHistoryRecord[]> = new Map();
  private readonly rewards: Map<string, Reward[]> = new Map();
  private readonly versions: Map<string, EvolutionVersion[]> = new Map();
  private readonly configs: Map<string, EvolutionConfig> = new Map();

  /**
   * 构造函数
   * @param storageAdapter 存储适配器
   */
  constructor(storageAdapter?: unknown) {
    this.storage = this.createStorageAdapter(storageAdapter);
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 初始化存储
  }

  /**
   * 记录进化历史
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param record 记录
   */
  async record(
    userId: string,
    tenantId: string,
    record: EvolutionHistoryRecord
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);

    // 保存到内存
    if (!this.memory.has(key)) {
      this.memory.set(key, []);
    }
    this.memory.get(key)!.push(record);

    // 限制内存中的记录数
    const records = this.memory.get(key)!;
    if (records.length > 1000) {
      records.shift();
    }

    // 持久化
    await this.storage.saveRecord(record);
  }

  /**
   * 查询历史记录
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param options 查询选项
   */
  async query(
    userId: string,
    tenantId: string,
    options?: HistoryQueryOptions
  ): Promise<EvolutionHistoryRecord[]> {
    const key = this.getKey(userId, tenantId);
    let records = this.memory.get(key) ?? [];

    // 从存储获取
    const storedRecords = await this.storage.queryRecords({
      userId,
      tenantId,
      ...options,
    });

    // 合并记录
    const recordMap = new Map<string, EvolutionHistoryRecord>();
    for (const record of records) {
      recordMap.set(record.recordId, record);
    }
    for (const record of storedRecords) {
      recordMap.set(record.recordId, record);
    }

    records = Array.from(recordMap.values());

    // 排序
    records.sort((a, b) =>
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );

    // 筛选
    if (options) {
      if (options.startDate) {
        records = records.filter(r => new Date(r.triggeredAt) >= options.startDate!);
      }
      if (options.endDate) {
        records = records.filter(r => new Date(r.triggeredAt) <= options.endDate!);
      }
      if (options.status && options.status.length > 0) {
        records = records.filter(r => options.status!.includes(r.status));
      }
      if (options.minFitness !== undefined) {
        records = records.filter(r => r.fitnessScore >= options.minFitness!);
      }
      if (options.maxFitness !== undefined) {
        records = records.filter(r => r.fitnessScore <= options.maxFitness!);
      }
    }

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return records.slice(offset, offset + limit);
  }

  /**
   * 获取历史记录
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param evolutionId 进化ID
   */
  async getHistoryByEvolutionId(
    userId: string,
    tenantId: string,
    evolutionId: string
  ): Promise<EvolutionHistoryRecord | null> {
    const records = await this.query(userId, tenantId, { limit: 1 });
    return records.find(r => r.evolutionId === evolutionId) ?? null;
  }

  /**
   * 获取版本列表
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getVersions(userId: string, tenantId: string): Promise<EvolutionVersion[]> {
    const key = this.getKey(userId, tenantId);
    return this.versions.get(key) ?? [];
  }

  /**
   * 获取版本
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param versionId 版本ID
   */
  async getVersion(
    userId: string,
    tenantId: string,
    versionId: string
  ): Promise<EvolutionVersion | null> {
    const versions = await this.getVersions(userId, tenantId);
    return versions.find(v => v.versionId === versionId) ?? null;
  }

  /**
   * 创建版本
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param fitnessScore 适应度分数
   * @param description 描述
   */
  async createVersion(
    userId: string,
    tenantId: string,
    fitnessScore: number,
    description?: string
  ): Promise<EvolutionVersion> {
    const key = this.getKey(userId, tenantId);
    const versions = this.versions.get(key) ?? [];

    const version: EvolutionVersion = {
      versionId: `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: versions.length + 1,
      createdAt: new Date(),
      fitnessScore,
      description,
    };

    versions.push(version);
    this.versions.set(key, versions);

    await this.storage.saveVersion(version);
    return version;
  }

  /**
   * 添加奖励
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param reward 奖励
   */
  async addReward(
    userId: string,
    tenantId: string,
    reward: Reward
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);

    if (!this.rewards.has(key)) {
      this.rewards.set(key, []);
    }
    this.rewards.get(key)!.push(reward);

    await this.storage.saveReward(reward);
  }

  /**
   * 获取奖励历史
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getRewards(userId: string, tenantId: string): Promise<Reward[]> {
    const key = this.getKey(userId, tenantId);
    const memoryRewards = this.rewards.get(key) ?? [];
    const storedRewards = await this.storage.queryRewards(userId, tenantId);

    return [...memoryRewards, ...storedRewards].sort(
      (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
    );
  }

  /**
   * 保存配置
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param config 配置
   */
  async saveConfig(
    userId: string,
    tenantId: string,
    config: EvolutionConfig
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);
    this.configs.set(key, config);
    await this.storage.saveConfig(userId, tenantId, config);
  }

  /**
   * 获取配置
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getConfig(userId: string, tenantId: string): Promise<EvolutionConfig | null> {
    const key = this.getKey(userId, tenantId);
    return this.configs.get(key) ?? null;
  }

  /**
   * 记录回滚
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param versionId 版本ID
   */
  async recordRollback(
    userId: string,
    tenantId: string,
    versionId: string
  ): Promise<void> {
    const record: EvolutionHistoryRecord = {
      recordId: `rec_rollback_${Date.now()}`,
      userId,
      tenantId,
      evolutionId: versionId,
      triggerType: 'manual',
      triggeredAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
      status: 'completed',
      fitnessScore: 0,
      fitnessDelta: 0,
      mutationCount: 0,
      rewards: {
        taskSuccess: 0,
        userFeedback: 0,
        evolutionary: 0,
        penalties: 0,
        total: 0,
      },
      metadata: {
        type: 'rollback',
        targetVersion: versionId,
      },
    };

    await this.record(userId, tenantId, record);
  }

  /**
   * 获取统计信息
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getStats(userId: string, tenantId: string): Promise<{
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    averageFitness: number;
    totalRewards: number;
  }> {
    const records = await this.query(userId, tenantId, { limit: 10000 });
    const rewards = await this.getRewards(userId, tenantId);

    const successfulRecords = records.filter(r => r.status === 'completed').length;
    const failedRecords = records.filter(r => r.status === 'failed').length;

    const averageFitness =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.fitnessScore, 0) / records.length
        : 0;

    const totalRewards = rewards.reduce((sum, r) => sum + r.value, 0);

    return {
      totalRecords: records.length,
      successfulRecords,
      failedRecords,
      averageFitness,
      totalRewards,
    };
  }

  /**
   * 清理旧记录
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param beforeDate 清理此日期之前的记录
   */
  async cleanup(
    userId: string,
    tenantId: string,
    beforeDate: Date
  ): Promise<number> {
    const key = this.getKey(userId, tenantId);
    const records = this.memory.get(key) ?? [];

    const originalLength = records.length;
    const filteredRecords = records.filter(r => new Date(r.triggeredAt) > beforeDate);

    this.memory.set(key, filteredRecords);

    return originalLength - filteredRecords.length;
  }

  // ============== 私有方法 ==============

  /**
   * 获取键
   */
  private getKey(userId: string, tenantId: string): string {
    return `${tenantId}:${userId}`;
  }

  /**
   * 创建存储适配器
   */
  private createStorageAdapter(adapter: unknown): HistoryStorage {
    // 返回一个内存存储实现
    return {
      async saveRecord(record: EvolutionHistoryRecord): Promise<void> {
        // 存储逻辑
      },
      async queryRecords(options): Promise<EvolutionHistoryRecord[]> {
        return [];
      },
      async getRecord(recordId: string): Promise<EvolutionHistoryRecord | null> {
        return null;
      },
      async deleteRecord(recordId: string): Promise<void> {
        // 删除逻辑
      },
      async saveVersion(version: EvolutionVersion): Promise<void> {
        // 存储逻辑
      },
      async getVersions(userId: string, tenantId: string): Promise<EvolutionVersion[]> {
        return [];
      },
      async getVersion(versionId: string): Promise<EvolutionVersion | null> {
        return null;
      },
      async saveReward(reward: Reward): Promise<void> {
        // 存储逻辑
      },
      async queryRewards(userId: string, tenantId: string): Promise<Reward[]> {
        return [];
      },
      async saveConfig(userId: string, tenantId: string, config: EvolutionConfig): Promise<void> {
        // 存储逻辑
      },
      async getConfig(userId: string, tenantId: string): Promise<EvolutionConfig | null> {
        return null;
      },
    };
  }
}
