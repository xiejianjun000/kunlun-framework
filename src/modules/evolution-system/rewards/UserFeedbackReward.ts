/**
 * 用户反馈奖励模型
 * User Feedback Reward Model
 */

import { RewardModel, RewardModelConfig } from './RewardModel';
import { RewardContext, RewardType, FeedbackType } from '../interfaces';

/**
 * 用户反馈奖励配置
 */
export interface UserFeedbackRewardConfig extends RewardModelConfig {
  /** 正面反馈奖励基数 */
  positiveBaseReward: number;
  /** 负面反馈惩罚基数 */
  negativeBasePenalty: number;
  /** 评分奖励系数 */
  ratingRewardCoefficient: number;
  /** 纠正反馈权重 */
  correctionWeight: number;
  /** 批准反馈权重 */
  approvalWeight: number;
  /** 评分阈值（高于此值才计算奖励） */
  ratingThreshold: number;
}

/**
 * 用户反馈奖励模型
 * 根据用户反馈计算奖励
 */
export class UserFeedbackReward extends RewardModel {
  declare protected config: Required<UserFeedbackRewardConfig>;

  constructor(config?: Partial<UserFeedbackRewardConfig>) {
    super('UserFeedbackReward', config);

    this.config = {
      ...this.config,
      positiveBaseReward: config?.positiveBaseReward ?? 0.05,
      negativeBasePenalty: config?.negativeBasePenalty ?? -0.1,
      ratingRewardCoefficient: config?.ratingRewardCoefficient ?? 0.2,
      correctionWeight: config?.correctionWeight ?? 0.3,
      approvalWeight: config?.approvalWeight ?? 0.2,
      ratingThreshold: config?.ratingThreshold ?? 0.5,
    };
  }

  /**
   * 计算用户反馈奖励
   * @param context 奖励计算上下文
   */
  async calculate(context: RewardContext): Promise<number> {
    // 检查是否有反馈信息
    if (!context.feedback) {
      return 0;
    }

    const feedback = context.feedback;
    let reward = 0;

    switch (feedback.type) {
      case FeedbackType.EXPLICIT:
        reward = this.calculateExplicitFeedback(feedback.rating);
        break;

      case FeedbackType.IMPLICIT:
        reward = this.calculateImplicitFeedback(feedback.rating);
        break;

      case FeedbackType.CORRECTION:
        reward = this.calculateCorrectionFeedback(feedback.rating);
        break;

      case FeedbackType.APPROVAL:
        reward = this.calculateApprovalFeedback(feedback.rating);
        break;

      default:
        reward = this.calculateGenericFeedback(feedback.rating);
    }

    return this.normalize(reward);
  }

  /**
   * 计算显式反馈奖励
   * @param rating 评分
   */
  private calculateExplicitFeedback(rating: number): number {
    // 评分在0-1之间
    if (rating >= this.config.ratingThreshold) {
      // 正面反馈
      const baseReward = this.config.positiveBaseReward;
      const ratingBonus = (rating - this.config.ratingThreshold) * this.config.ratingRewardCoefficient;
      return baseReward + ratingBonus;
    } else {
      // 负面反馈
      const basePenalty = this.config.negativeBasePenalty;
      const ratingPenalty = (this.config.ratingThreshold - rating) * this.config.ratingRewardCoefficient;
      return basePenalty - ratingPenalty;
    }
  }

  /**
   * 计算隐式反馈奖励
   * @param rating 评分
   */
  private calculateImplicitFeedback(rating: number): number {
    // 隐式反馈权重较低
    const implicitWeight = 0.5;
    const baseReward = this.calculateExplicitFeedback(rating);
    return baseReward * implicitWeight;
  }

  /**
   * 计算纠正反馈奖励
   * @param rating 评分
   */
  private calculateCorrectionFeedback(rating: number): number {
    // 纠正反馈表示需要调整，惩罚力度较大
    const basePenalty = this.config.negativeBasePenalty * this.config.correctionWeight;
    const correctionPenalty = (1 - rating) * 0.1;
    return basePenalty - correctionPenalty;
  }

  /**
   * 计算批准反馈奖励
   * @param rating 评分
   */
  private calculateApprovalFeedback(rating: number): number {
    // 批准反馈表示认可，奖励力度较大
    const baseReward = this.config.positiveBaseReward * this.config.approvalWeight;
    const approvalBonus = rating * 0.15;
    return baseReward + approvalBonus;
  }

  /**
   * 计算通用反馈奖励
   * @param rating 评分
   */
  private calculateGenericFeedback(rating: number): number {
    if (rating >= 0.5) {
      return rating * this.config.positiveBaseReward;
    } else {
      return (rating - 1) * Math.abs(this.config.negativeBasePenalty);
    }
  }

  /**
   * 获取奖励类型
   * @param context 上下文
   */
  getRewardType(context: RewardContext): RewardType {
    if (!context.feedback) {
      return RewardType.USER_FEEDBACK_POSITIVE;
    }

    const rating = context.feedback.rating;
    const threshold = this.config.ratingThreshold;

    if (context.feedback.type === FeedbackType.CORRECTION) {
      return RewardType.USER_FEEDBACK_NEGATIVE;
    }

    return rating >= threshold
      ? RewardType.USER_FEEDBACK_POSITIVE
      : RewardType.USER_FEEDBACK_NEGATIVE;
  }

  /**
   * 计算累积反馈分数
   * @param feedbacks 反馈列表
   */
  calculateCumulativeFeedback(feedbacks: Array<{ rating: number }>): number {
    if (feedbacks.length === 0) {
      return 0;
    }

    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const average = sum / feedbacks.length;

    // 考虑反馈数量因素
    const countBonus = Math.min(feedbacks.length * 0.01, 0.1);

    return this.normalize((average + countBonus) * this.config.positiveBaseReward);
  }

  /**
   * 计算反馈趋势奖励
   * @param recentFeedbacks 最近反馈
   * @param olderFeedbacks 早期反馈
   */
  calculateTrendReward(
    recentFeedbacks: Array<{ rating: number }>,
    olderFeedbacks: Array<{ rating: number }>
  ): number {
    if (recentFeedbacks.length === 0 || olderFeedbacks.length === 0) {
      return 0;
    }

    const recentAvg = recentFeedbacks.reduce((acc, f) => acc + f.rating, 0) / recentFeedbacks.length;
    const olderAvg = olderFeedbacks.reduce((acc, f) => acc + f.rating, 0) / olderFeedbacks.length;

    const trend = recentAvg - olderAvg;

    // 趋势改善给予奖励
    if (trend > 0.1) {
      return this.normalize(trend * 0.2);
    } else if (trend < -0.1) {
      return this.normalize(trend * 0.1);
    }

    return 0;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<UserFeedbackRewardConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<UserFeedbackRewardConfig>): void {
    Object.assign(this.config, config);
  }
}
