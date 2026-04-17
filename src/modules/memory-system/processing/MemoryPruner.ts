/**
 * 记忆修剪器
 * Memory Pruner - 过期清理
 */

import { IMemory, IRetentionPolicy, MemoryTier, DEFAULT_RETENTION_POLICY } from '../interfaces';
import { MemoryStore } from '../storage/MemoryStore';

export interface PruneResult {
  /** 清理的记忆列表 */
  prunedMemories: IMemory[];
  /** 各层级清理数量 */
  prunedByTier: Record<MemoryTier, number>;
  /** 总清理数量 */
  totalPruned: number;
  /** 清理时间 */
  timestamp: Date;
}

/**
 * 记忆修剪器
 * 
 * 负责清理过期、低重要性的记忆，支持自动和手动清理
 * 
 * @example
 * ```typescript
 * const pruner = new MemoryPruner(store);
 * const result = await pruner.prune('user1', retentionPolicy);
 * console.log(result.totalPruned); // 清理的记忆数量
 * ```
 */
export class MemoryPruner {
  private store: MemoryStore;
  private lastCleanupTime: Date | null = null;

  /**
   * 构造函数
   * @param store 记忆存储
   */
  constructor(store: MemoryStore) {
    this.store = store;
  }

  /**
   * 修剪记忆
   * @param userId 用户ID
   * @param policy 保留策略
   * @returns 修剪结果
   */
  async prune(userId: string, policy?: IRetentionPolicy): Promise<IMemory[]> {
    const retentionPolicy = policy ?? DEFAULT_RETENTION_POLICY;
    const now = new Date();
    const prunedMemories: IMemory[] = [];
    const prunedByTier: Record<MemoryTier, number> = {
      [MemoryTier.HOT]: 0,
      [MemoryTier.WORKING]: 0,
      [MemoryTier.WARM]: 0,
      [MemoryTier.COLD]: 0,
    };

    // 获取所有记忆
    const memories = await this.store.getByUserId(userId, {
      includeArchived: true,
    });

    for (const memory of memories) {
      const shouldPrune = this.shouldPrune(memory, retentionPolicy, now);

      if (shouldPrune.shouldPrune) {
        try {
          await this.store.delete(memory.id, userId);
          prunedMemories.push(memory);
          prunedByTier[memory.tier]++;
        } catch (error) {
          console.error(`[MemoryPruner] 删除记忆失败: ${memory.id}`, error);
        }
      }
    }

    this.lastCleanupTime = now;

    return prunedMemories;
  }

  /**
   * 清理特定层级
   * @param userId 用户ID
   * @param tier 目标层级
   * @param policy 保留策略
   * @returns 清理的记忆列表
   */
  async pruneTier(
    userId: string,
    tier: MemoryTier,
    policy?: IRetentionPolicy
  ): Promise<IMemory[]> {
    const retentionPolicy = policy ?? DEFAULT_RETENTION_POLICY;
    const now = new Date();
    const prunedMemories: IMemory[] = [];

    const memories = await this.store.getByUserId(userId, {
      tiers: [tier],
      includeArchived: true,
    });

    for (const memory of memories) {
      if (this.shouldPruneTier(memory, tier, retentionPolicy, now)) {
        try {
          await this.store.delete(memory.id, userId);
          prunedMemories.push(memory);
        } catch (error) {
          console.error(`[MemoryPruner] 删除记忆失败: ${memory.id}`, error);
        }
      }
    }

    this.lastCleanupTime = now;

    return prunedMemories;
  }

  /**
   * 清理归档记忆
   * @param userId 用户ID
   * @param olderThanDays 早于指定天数的归档记忆
   * @returns 清理的记忆列表
   */
  async pruneArchived(
    userId: string,
    olderThanDays: number = 30
  ): Promise<IMemory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const memories = await this.store.getByUserId(userId, {
      includeArchived: true,
    });

    const prunedMemories: IMemory[] = [];

    for (const memory of memories) {
      if (memory.isArchived && memory.accessedAt < cutoffDate) {
        try {
          await this.store.delete(memory.id, userId);
          prunedMemories.push(memory);
        } catch (error) {
          console.error(`[MemoryPruner] 删除归档记忆失败: ${memory.id}`, error);
        }
      }
    }

    this.lastCleanupTime = new Date();

    return prunedMemories;
  }

  /**
   * 清理低重要性记忆
   * @param userId 用户ID
   * @param threshold 重要性阈值
   * @returns 清理的记忆列表
   */
  async pruneLowImportance(
    userId: string,
    threshold: number = 0.1
  ): Promise<IMemory[]> {
    const memories = await this.store.getByUserId(userId);
    const prunedMemories: IMemory[] = [];

    for (const memory of memories) {
      if (memory.importanceScore < threshold) {
        try {
          await this.store.delete(memory.id, userId);
          prunedMemories.push(memory);
        } catch (error) {
          console.error(`[MemoryPruner] 删除低重要性记忆失败: ${memory.id}`, error);
        }
      }
    }

    this.lastCleanupTime = new Date();

    return prunedMemories;
  }

  /**
   * 评估是否应该修剪
   */
  private shouldPrune(
    memory: IMemory,
    policy: IRetentionPolicy,
    now: Date
  ): { shouldPrune: boolean; reason: string } {
    // 关键记忆不清理
    if (memory.importanceScore >= 1.0) {
      return { shouldPrune: false, reason: '关键记忆' };
    }

    // 已归档记忆检查访问时间
    if (memory.isArchived) {
      const archiveAge = (now.getTime() - memory.accessedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (archiveAge > 90) { // 归档后90天未访问
        return { shouldPrune: true, reason: '归档记忆长期未访问' };
      }
    }

    // 基于层级判断
    switch (memory.tier) {
      case MemoryTier.HOT:
        return this.shouldPruneHotMemory(memory, policy, now);

      case MemoryTier.WORKING:
        return this.shouldPruneWorkingMemory(memory, policy, now);

      case MemoryTier.WARM:
        return this.shouldPruneWarmMemory(memory, policy, now);

      case MemoryTier.COLD:
        return this.shouldPruneColdMemory(memory, policy, now);

      default:
        return { shouldPrune: false, reason: '未知层级' };
    }
  }

  /**
   * 判断热记忆是否应修剪
   */
  private shouldPruneHotMemory(
    memory: IMemory,
    policy: IRetentionPolicy,
    now: Date
  ): { shouldPrune: boolean; reason: string } {
    const ageSeconds = (now.getTime() - memory.createdAt.getTime()) / 1000;
    
    if (ageSeconds > policy.hotMemoryTtl) {
      return { shouldPrune: true, reason: '热记忆超过TTL' };
    }

    if (memory.importanceScore < policy.minImportanceThreshold) {
      return { shouldPrune: true, reason: '重要性低于阈值' };
    }

    return { shouldPrune: false, reason: '' };
  }

  /**
   * 判断工作记忆是否应修剪
   */
  private shouldPruneWorkingMemory(
    memory: IMemory,
    policy: IRetentionPolicy,
    now: Date
  ): { shouldPrune: boolean; reason: string } {
    // 工作记忆基于访问频率
    const hoursSinceAccess = (now.getTime() - memory.accessedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceAccess > 24 && memory.accessCount < 2) {
      return { shouldPrune: true, reason: '工作记忆长时间未访问' };
    }

    if (memory.importanceScore < policy.minImportanceThreshold) {
      return { shouldPrune: true, reason: '重要性低于阈值' };
    }

    return { shouldPrune: false, reason: '' };
  }

  /**
   * 判断温记忆是否应修剪
   */
  private shouldPruneWarmMemory(
    memory: IMemory,
    policy: IRetentionPolicy,
    now: Date
  ): { shouldPrune: boolean; reason: string } {
    const ageDays = (now.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays > policy.warmMemoryTtlDays) {
      return { shouldPrune: true, reason: '温记忆超过保留期限' };
    }

    if (memory.importanceScore < policy.minImportanceThreshold * 0.5) {
      return { shouldPrune: true, reason: '重要性过低' };
    }

    return { shouldPrune: false, reason: '' };
  }

  /**
   * 判断冷记忆是否应修剪
   */
  private shouldPruneColdMemory(
    memory: IMemory,
    policy: IRetentionPolicy,
    now: Date
  ): { shouldPrune: boolean; reason: string } {
    const ageDays = (now.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays > policy.coldMemoryRetentionDays) {
      return { shouldPrune: true, reason: '冷记忆超过保留期限' };
    }

    // 低重要性冷记忆可以更早清理
    if (memory.importanceScore < 0.2 && ageDays > 180) {
      return { shouldPrune: true, reason: '低重要性冷记忆长期未访问' };
    }

    return { shouldPrune: false, reason: '' };
  }

  /**
   * 判断特定层级是否应修剪
   */
  private shouldPruneTier(
    memory: IMemory,
    tier: MemoryTier,
    policy: IRetentionPolicy,
    now: Date
  ): boolean {
    const result = this.shouldPrune(memory, policy, now);
    return result.shouldPrune && memory.tier === tier;
  }

  /**
   * 获取最后清理时间
   */
  getLastCleanupTime(): Date | null {
    return this.lastCleanupTime;
  }

  /**
   * 预估清理数量
   * @param userId 用户ID
   * @param policy 保留策略
   * @returns 预估可清理数量
   */
  async estimatePruneCount(
    userId: string,
    policy?: IRetentionPolicy
  ): Promise<number> {
    const retentionPolicy = policy ?? DEFAULT_RETENTION_POLICY;
    const memories = await this.store.getByUserId(userId, {
      includeArchived: true,
    });

    let count = 0;
    for (const memory of memories) {
      if (this.shouldPrune(memory, retentionPolicy, new Date()).shouldPrune) {
        count++;
      }
    }

    return count;
  }
}
