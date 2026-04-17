/**
 * 任务成功奖励模型
 * Task Success Reward Model
 */

import { RewardModel, RewardModelConfig } from './RewardModel';
import { RewardContext, RewardType } from '../interfaces';

/**
 * 任务成功奖励配置
 */
export interface TaskSuccessRewardConfig extends RewardModelConfig {
  /** 成功奖励基数 */
  successBaseReward: number;
  /** 质量奖励权重 */
  qualityWeight: number;
  /** 效率奖励权重 */
  efficiencyWeight: number;
  /** 连续成功奖励倍率 */
  consecutiveSuccessMultiplier: number;
  /** 失败惩罚基数 */
  failurePenalty: number;
}

/**
 * 任务成功奖励模型
 * 根据任务完成情况计算奖励
 */
export class TaskSuccessReward extends RewardModel {
  private config: Required<TaskSuccessRewardConfig>;

  constructor(config?: Partial<TaskSuccessRewardConfig>) {
    super('TaskSuccessReward', config);

    this.config = {
      ...this.config,
      successBaseReward: config?.successBaseReward ?? 0.1,
      qualityWeight: config?.qualityWeight ?? 0.4,
      efficiencyWeight: config?.efficiencyWeight ?? 0.3,
      consecutiveSuccessMultiplier: config?.consecutiveSuccessMultiplier ?? 1.5,
      failurePenalty: config?.failurePenalty ?? -0.05,
    };
  }

  /**
   * 计算任务成功奖励
   * @param context 奖励计算上下文
   */
  async calculate(context: RewardContext): Promise<number> {
    // 检查是否有任务信息
    if (!context.task) {
      return 0;
    }

    const task = context.task;

    // 如果任务失败
    if (!task.success) {
      return this.config.failurePenalty;
    }

    // 计算基础奖励
    let reward = this.config.successBaseReward;

    // 质量奖励
    if (task.qualityScore !== undefined) {
      reward += task.qualityScore * this.config.qualityWeight;
    }

    // 效率奖励
    if (task.efficiencyScore !== undefined) {
      reward += task.efficiencyScore * this.config.efficiencyWeight;
    }

    // 连续成功奖励
    const consecutiveSuccesses = await this.getConsecutiveSuccesses(context);
    if (consecutiveSuccesses > 1) {
      const multiplier = Math.min(
        this.config.consecutiveSuccessMultiplier,
        1 + (consecutiveSuccesses - 1) * 0.1
      );
      reward *= multiplier;
    }

    return this.normalize(reward);
  }

  /**
   * 获取连续成功次数
   * @param context 上下文
   */
  private async getConsecutiveSuccesses(context: RewardContext): Promise<number> {
    if (!context.evolutionHistory || context.evolutionHistory.length === 0) {
      return 0;
    }

    let consecutive = 0;

    // 从历史记录中查找连续成功
    for (let i = context.evolutionHistory.length - 1; i >= 0; i--) {
      const record = context.evolutionHistory[i];
      if (record.status === 'completed') {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }

  /**
   * 创建奖励对象
   * @param context 上下文
   */
  createReward(context: RewardContext): RewardType {
    if (!context.task) {
      return RewardType.TASK_SUCCESS;
    }

    return context.task.success
      ? RewardType.TASK_SUCCESS
      : RewardType.PENALTY_ERROR;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<TaskSuccessRewardConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<TaskSuccessRewardConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * 计算任务完成率奖励
   * @param completedTasks 完成的任务数
   * @param totalTasks 总任务数
   */
  calculateCompletionRateReward(completedTasks: number, totalTasks: number): number {
    if (totalTasks === 0) {
      return 0;
    }

    const rate = completedTasks / totalTasks;
    return this.normalize(rate * this.config.successBaseReward);
  }

  /**
   * 计算超时惩罚
   * @param expectedTime 预期时间(ms)
   * @param actualTime 实际时间(ms)
   */
  calculateTimeoutPenalty(expectedTime: number, actualTime: number): number {
    if (actualTime <= expectedTime) {
      return 0;
    }

    const overtimeRatio = (actualTime - expectedTime) / expectedTime;
    return this.normalize(-0.1 * overtimeRatio);
  }
}
