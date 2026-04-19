/**
 * 记忆巩固器
 * Memory Consolidator - 短期到长期记忆迁移
 */

import { IMemory, MemoryTier, TIER_TRANSITION_MAP } from '../interfaces';
import { MemoryStore } from '../storage/MemoryStore';

export interface ConsolidationResult {
  memory: IMemory;
  previousTier: MemoryTier;
  newTier: MemoryTier;
  reason: string;
  importanceScore: number;
}

export interface ConsolidationPolicy {
  /** 是否启用自动巩固 */
  enabled: boolean;
  /** 巩固间隔（小时） */
  consolidationIntervalHours: number;
  /** 最小访问次数触发巩固 */
  minAccessCountForConsolidation: number;
  /** 重要性阈值（超过此值直接巩固到冷记忆） */
  importanceThresholdForCold: number;
  /** 访问频率阈值（每小时） */
  accessFrequencyThreshold: number;
}

const DEFAULT_CONSOLIDATION_POLICY: ConsolidationPolicy = {
  enabled: true,
  consolidationIntervalHours: 24,
  minAccessCountForConsolidation: 3,
  importanceThresholdForCold: 0.8,
  accessFrequencyThreshold: 0.5,
};

/**
 * 记忆巩固器
 * 
 * 负责将短期记忆巩固到长期记忆，实现记忆的层级迁移
 * 基于访问频率、重要性评分和时间衰减进行决策
 * 
 * @example
 * ```typescript
 * const consolidator = new MemoryConsolidator(store);
 * const result = await consolidator.consolidate(memory, 'user1');
 * console.log(result.newTier); // 新的记忆层级
 * ```
 */
export class MemoryConsolidator {
  private store: MemoryStore;
  private policy: ConsolidationPolicy;
  private lastConsolidationTime: Map<string, Date> = new Map();

  /**
   * 构造函数
   * @param store 记忆存储
   * @param policy 巩固策略
   */
  constructor(store: MemoryStore, policy: Partial<ConsolidationPolicy> = {}) {
    this.store = store;
    this.policy = { ...DEFAULT_CONSOLIDATION_POLICY, ...policy };
  }

  /**
   * 巩固记忆
   * @param memory 记忆对象
   * @param userId 用户ID
   * @returns 巩固结果
   */
  async consolidate(memory: IMemory, userId: string): Promise<ConsolidationResult> {
    const previousTier = memory.tier;

    // 评估是否需要巩固
    const shouldConsolidate = this.evaluateConsolidationNeed(memory);

    if (!shouldConsolidate.shouldConsolidate) {
      return {
        memory,
        previousTier,
        newTier: previousTier,
        reason: shouldConsolidate.reason,
        importanceScore: memory.importanceScore,
      };
    }

    // 确定新的层级
    const newTier = this.determineTargetTier(memory);
    
    // 更新记忆
    memory.tier = newTier;
    memory.metadata = {
      ...memory.metadata,
      consolidatedAt: new Date(),
      consolidationReason: shouldConsolidate.reason,
      previousTier,
    };

    // 更新最后巩固时间
    this.lastConsolidationTime.set(memory.id, new Date());

    return {
      memory,
      previousTier,
      newTier,
      reason: shouldConsolidate.reason,
      importanceScore: memory.importanceScore,
    };
  }

  /**
   * 批量巩固
   * @param memories 记忆列表
   * @param userId 用户ID
   * @returns 巩固结果列表
   */
  async consolidateBatch(memories: IMemory[], userId: string): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];

    for (const memory of memories) {
      const result = await this.consolidate(memory, userId);
      results.push(result);
    }

    return results;
  }

  /**
   * 评估巩固需求
   */
  private evaluateConsolidationNeed(memory: IMemory): {
    shouldConsolidate: boolean;
    reason: string;
  } {
    // 检查是否已达到巩固间隔
    const lastConsolidation = this.lastConsolidationTime.get(memory.id);
    if (lastConsolidation) {
      const hoursSinceConsolidation = 
        (new Date().getTime() - lastConsolidation.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceConsolidation < this.policy.consolidationIntervalHours) {
        return {
          shouldConsolidate: false,
          reason: '巩固间隔未到',
        };
      }
    }

    // 检查访问次数
    if (memory.accessCount < this.policy.minAccessCountForConsolidation) {
      return {
        shouldConsolidate: false,
        reason: '访问次数不足',
      };
    }

    // 高重要性直接巩固
    if (memory.importanceScore >= this.policy.importanceThresholdForCold) {
      return {
        shouldConsolidate: true,
        reason: '高重要性记忆',
      };
    }

    // 访问频率高
    const hoursSinceCreation = 
      (new Date().getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60);
    const accessFrequency = hoursSinceCreation > 0 
      ? memory.accessCount / hoursSinceCreation 
      : memory.accessCount;

    if (accessFrequency >= this.policy.accessFrequencyThreshold) {
      return {
        shouldConsolidate: true,
        reason: '高访问频率',
      };
    }

    // 热记忆自动向下迁移
    if (memory.tier === MemoryTier.HOT) {
      return {
        shouldConsolidate: true,
        reason: '热记忆超时',
      };
    }

    return {
      shouldConsolidate: false,
      reason: '不需要巩固',
    };
  }

  /**
   * 确定目标层级
   */
  private determineTargetTier(memory: IMemory): MemoryTier {
    // 高重要性直接到冷记忆
    if (memory.importanceScore >= this.policy.importanceThresholdForCold) {
      return MemoryTier.COLD;
    }

    // 基于访问频率和创建时间计算
    const hoursSinceCreation = 
      (new Date().getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60);
    const accessFrequency = hoursSinceCreation > 0 
      ? memory.accessCount / hoursSinceCreation 
      : memory.accessCount;

    // 根据当前层级和指标决定迁移方向
    switch (memory.tier) {
      case MemoryTier.HOT:
        // 热记忆 -> 工作记忆
        return MemoryTier.WORKING;

      case MemoryTier.WORKING:
        // 工作记忆 -> 温记忆
        if (memory.accessCount >= this.policy.minAccessCountForConsolidation * 2) {
          return MemoryTier.WARM;
        }
        return MemoryTier.WORKING;

      case MemoryTier.WARM:
        // 温记忆 -> 冷记忆（高访问或高重要性）
        if (accessFrequency >= this.policy.accessFrequencyThreshold || 
            memory.importanceScore >= 0.6) {
          return MemoryTier.COLD;
        }
        return MemoryTier.WARM;

      case MemoryTier.COLD:
        // 冷记忆保持不变
        return MemoryTier.COLD;

      default:
        return memory.tier;
    }
  }

  /**
   * 获取巩固策略
   */
  getPolicy(): ConsolidationPolicy {
    return { ...this.policy };
  }

  /**
   * 更新巩固策略
   */
  updatePolicy(policy: Partial<ConsolidationPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  /**
   * 获取最后巩固时间
   */
  getLastConsolidationTime(memoryId: string): Date | null {
    return this.lastConsolidationTime.get(memoryId) ?? null;
  }

  /**
   * 重置巩固状态
   */
  reset(): void {
    this.lastConsolidationTime.clear();
  }
}
