/**
 * 奖励模型基类
 * Reward Model - Base class for all reward calculations
 */

import {
  IRewardModel,
  RewardContext,
  RewardType,
  Reward,
} from '../interfaces';

/** 奖励模型配置 */
export interface RewardModelConfig {
  /** 模型权重 */
  weight: number;
  /** 是否启用 */
  enabled: boolean;
  /** 最大奖励值 */
  maxReward: number;
  /** 最小奖励值 */
  minReward: number;
}

/**
 * 奖励模型基类
 * 提供奖励计算的抽象基类和通用功能
 */
export abstract class RewardModel implements IRewardModel {
  protected config: Required<RewardModelConfig>;
  protected name: string;

  /**
   * 构造函数
   * @param name 模型名称
   * @param config 模型配置
   */
  constructor(name: string, config?: Partial<RewardModelConfig>) {
    this.name = name;
    this.config = {
      weight: config?.weight ?? 1.0,
      enabled: config?.enabled ?? true,
      maxReward: config?.maxReward ?? 1.0,
      minReward: config?.minReward ?? -1.0,
    };
  }

  /**
   * 计算奖励（抽象方法，由子类实现）
   * @param context 奖励计算上下文
   */
  abstract calculate(context: RewardContext): Promise<number>;

  /**
   * 获取权重
   */
  getWeight(): number {
    return this.config.weight;
  }

  /**
   * 设置权重
   * @param weight 新权重
   */
  setWeight(weight: number): void {
    this.config.weight = Math.max(0, Math.min(1, weight));
  }

  /**
   * 获取名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 设置启用状态
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * 验证奖励值
   * @param reward 奖励值
   */
  validate(reward: number): boolean {
    return reward >= this.config.minReward && reward <= this.config.maxReward;
  }

  /**
   * 标准化奖励值
   * @param reward 原始奖励值
   */
  protected normalize(reward: number): number {
    return Math.max(this.config.minReward, Math.min(this.config.maxReward, reward));
  }

  /**
   * 创建奖励对象
   * @param context 上下文
   * @param value 奖励值
   * @param type 奖励类型
   */
  protected createReward(
    context: RewardContext,
    type: RewardType,
    value: number
  ): Reward {
    return {
      rewardId: this.generateRewardId(),
      userId: context.userId,
      tenantId: context.tenantId,
      type,
      value: this.normalize(value),
      calculatedAt: new Date(),
      details: {
        modelName: this.name,
        context: {
          userId: context.userId,
          tenantId: context.tenantId,
        },
      },
    };
  }

  /**
   * 生成奖励ID
   */
  private generateRewardId(): string {
    return `rew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 组合奖励模型
 * 将多个奖励模型组合使用
 */
export class CompositeRewardModel {
  private readonly models: Map<string, RewardModel> = new Map();

  /**
   * 添加奖励模型
   * @param model 奖励模型
   */
  addModel(model: RewardModel): void {
    this.models.set(model.getName(), model);
  }

  /**
   * 移除奖励模型
   * @param name 模型名称
   */
  removeModel(name: string): boolean {
    return this.models.delete(name);
  }

  /**
   * 获取模型
   * @param name 模型名称
   */
  getModel(name: string): RewardModel | undefined {
    return this.models.get(name);
  }

  /**
   * 计算组合奖励
   * @param context 上下文
   */
  async calculate(context: RewardContext): Promise<{ type: RewardType; value: number }[]> {
    const results: { type: RewardType; value: number }[] = [];

    for (const model of this.models.values()) {
      if (!model.isEnabled()) {
        continue;
      }

      try {
        const value = await model.calculate(context);
        if (model.validate(value)) {
          results.push({
            type: this.getRewardTypeForModel(model),
            value: value * model.getWeight(),
          });
        }
      } catch (error) {
        console.error(`Error calculating reward for model ${model.getName()}:`, error);
      }
    }

    return results;
  }

  /**
   * 获取奖励类型
   */
  private getRewardTypeForModel(model: RewardModel): RewardType {
    switch (model.getName()) {
      case 'TaskSuccessReward':
        return RewardType.TASK_SUCCESS;
      case 'UserFeedbackReward':
        return RewardType.USER_FEEDBACK_POSITIVE;
      case 'EvolutionaryReward':
        return RewardType.EXPLORATION_BONUS;
      default:
        return RewardType.TASK_SUCCESS;
    }
  }

  /**
   * 获取所有模型
   */
  getAllModels(): RewardModel[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取模型数量
   */
  size(): number {
    return this.models.size;
  }
}
