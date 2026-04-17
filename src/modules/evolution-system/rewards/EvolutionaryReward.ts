/**
 * 进化性奖励模型
 * Evolutionary Reward Model - Rewards for exploration and diversity
 */

import { RewardModel, RewardModelConfig } from './RewardModel';
import { RewardContext, RewardType, MutationType } from '../interfaces';

/**
 * 进化性奖励配置
 */
export interface EvolutionaryRewardConfig extends RewardModelConfig {
  /** 探索奖励基数 */
  explorationBaseReward: number;
  /** 多样性奖励权重 */
  diversityRewardWeight: number;
  /** 一致性奖励权重 */
  consistencyRewardWeight: number;
  /** 改进奖励权重 */
  improvementRewardWeight: number;
  /** 风险探索奖励系数 */
  riskTakingBonus: number;
  /** 最大探索奖励 */
  maxExplorationReward: number;
}

/**
 * 进化性奖励模型
 * 鼓励探索新行为和保持一致性
 */
export class EvolutionaryReward extends RewardModel {
  private config: Required<EvolutionaryRewardConfig>;

  constructor(config?: Partial<EvolutionaryRewardConfig>) {
    super('EvolutionaryReward', config);

    this.config = {
      ...this.config,
      explorationBaseReward: config?.explorationBaseReward ?? 0.02,
      diversityRewardWeight: config?.diversityRewardWeight ?? 0.3,
      consistencyRewardWeight: config?.consistencyRewardWeight ?? 0.2,
      improvementRewardWeight: config?.improvementRewardWeight ?? 0.4,
      riskTakingBonus: config?.riskTakingBonus ?? 0.05,
      maxExplorationReward: config?.maxExplorationReward ?? 0.2,
    };
  }

  /**
   * 计算进化性奖励
   * @param context 奖励计算上下文
   */
  async calculate(context: RewardContext): Promise<number> {
    let totalReward = 0;

    // 1. 探索性奖励
    const explorationReward = this.calculateExplorationReward(context);
    totalReward += explorationReward;

    // 2. 多样性奖励
    const diversityReward = this.calculateDiversityReward(context);
    totalReward += diversityReward;

    // 3. 一致性奖励
    const consistencyReward = this.calculateConsistencyReward(context);
    totalReward += consistencyReward;

    // 4. 改进奖励
    const improvementReward = this.calculateImprovementReward(context);
    totalReward += improvementReward;

    return this.normalize(Math.min(totalReward, this.config.maxExplorationReward));
  }

  /**
   * 计算探索奖励
   * @param context 上下文
   */
  private calculateExplorationReward(context: RewardContext): number {
    // 检查历史记录中是否有新的变异
    if (!context.evolutionHistory || context.evolutionHistory.length === 0) {
      return this.config.explorationBaseReward;
    }

    const lastRecord = context.evolutionHistory[context.evolutionHistory.length - 1];

    // 如果最近有变异，给予探索奖励
    if (lastRecord.mutationCount > 0) {
      const mutationBonus = Math.min(
        lastRecord.mutationCount * 0.01,
        this.config.riskTakingBonus
      );
      return this.config.explorationBaseReward + mutationBonus;
    }

    return 0;
  }

  /**
   * 计算多样性奖励
   * @param context 上下文
   */
  private calculateDiversityReward(context: RewardContext): number {
    if (!context.evolutionHistory || context.evolutionHistory.length < 5) {
      return 0;
    }

    // 分析最近N次进化的变异类型多样性
    const recentRecords = context.evolutionHistory.slice(-10);
    const mutationTypes = new Set<MutationType>();

    // 统计历史中的变异类型
    for (const record of recentRecords) {
      if (record.metadata?.lastMutationTypes) {
        const types = record.metadata.lastMutationTypes as MutationType[];
        types.forEach(t => mutationTypes.add(t));
      }
    }

    // 多样性越高，奖励越高
    const diversityScore = mutationTypes.size / Object.keys(MutationType).length;
    return diversityScore * this.config.diversityRewardWeight;
  }

  /**
   * 计算一致性奖励
   * @param context 上下文
   */
  private calculateConsistencyReward(context: RewardContext): number {
    if (!context.evolutionHistory || context.evolutionHistory.length < 3) {
      return 0;
    }

    // 计算适应度变化的稳定性
    const recentRecords = context.evolutionHistory.slice(-5);
    const fitnessChanges = recentRecords.map(r => r.fitnessDelta);

    // 计算标准差
    const mean = fitnessChanges.reduce((a, b) => a + b, 0) / fitnessChanges.length;
    const variance =
      fitnessChanges.reduce((sum, delta) => sum + Math.pow(delta - mean, 2), 0) /
      fitnessChanges.length;
    const stdDev = Math.sqrt(variance);

    // 稳定性越高，奖励越高
    const stabilityScore = 1 - Math.min(stdDev, 1);
    return stabilityScore * this.config.consistencyRewardWeight;
  }

  /**
   * 计算改进奖励
   * @param context 上下文
   */
  private calculateImprovementReward(context: RewardContext): number {
    if (!context.evolutionHistory || context.evolutionHistory.length === 0) {
      return 0;
    }

    const lastRecord = context.evolutionHistory[context.evolutionHistory.length - 1];

    // 如果最近有改进，给予奖励
    if (lastRecord.fitnessDelta > 0) {
      // 改进幅度越大，奖励越高
      const improvementBonus = Math.min(
        lastRecord.fitnessDelta * this.config.improvementRewardWeight,
        this.config.improvementRewardWeight
      );
      return improvementBonus;
    }

    // 如果有退化，给予惩罚
    if (lastRecord.fitnessDelta < -0.01) {
      return lastRecord.fitnessDelta * 0.5; // 部分惩罚
    }

    return 0;
  }

  /**
   * 计算新颖性奖励
   * @param newMutations 新变异的数量
   * @param totalMutations 总变异数量
   */
  calculateNoveltReward(newMutations: number, totalMutations: number): number {
    if (totalMutations === 0) {
      return 0;
    }

    const noveltyRatio = newMutations / totalMutations;
    return this.normalize(noveltyRatio * this.config.explorationBaseReward);
  }

  /**
   * 计算适应性奖励
   * @param context 上下文
   */
  calculateAdaptationReward(context: RewardContext): number {
    if (!context.evolutionHistory || context.evolutionHistory.length < 3) {
      return 0;
    }

    // 测量最近适应度变化的趋势
    const recentRecords = context.evolutionHistory.slice(-3);
    const fitnessValues = recentRecords.map(r => r.fitnessScore);

    // 如果适应度持续上升
    if (
      fitnessValues[2] > fitnessValues[1] &&
      fitnessValues[1] > fitnessValues[0]
    ) {
      return this.config.improvementRewardWeight * 0.5;
    }

    return 0;
  }

  /**
   * 计算鲁棒性奖励
   * @param successRate 成功率
   * @param variance 适应度方差
   */
  calculateRobustnessReward(successRate: number, variance: number): number {
    // 高成功率 + 低方差 = 高鲁棒性
    const robustnessScore = successRate * (1 - Math.min(variance, 1));
    return robustnessScore * this.config.consistencyRewardWeight;
  }

  /**
   * 获取奖励类型
   */
  getRewardType(context: RewardContext): RewardType {
    const exploration = this.calculateExplorationReward(context);
    const improvement = this.calculateImprovementReward(context);

    if (exploration > improvement) {
      return RewardType.EXPLORATION_BONUS;
    } else if (improvement > 0) {
      return RewardType.IMPROVEMENT_BONUS;
    }

    return RewardType.CONSISTENCY_BONUS;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<EvolutionaryRewardConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<EvolutionaryRewardConfig>): void {
    Object.assign(this.config, config);
  }
}
