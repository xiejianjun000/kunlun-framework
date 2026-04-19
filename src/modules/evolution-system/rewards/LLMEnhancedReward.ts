/**
 * LLM增强奖励模型
 * LLM-Enhanced Reward Model - 使用LLM进行奖励评分和质量评估
 */

import { RewardModel, RewardModelConfig } from './RewardModel';
import {
  RewardContext,
  RewardType,
  Reward,
  EvolutionHistoryRecord,
  InteractionSample,
} from '../interfaces';
import { LLMOptimizer, LLMOptimizerConfig } from '../core/LLMOptimizer';

// ============== 类型定义 ==============

/** 交互质量评分 */
export interface InteractionQualityScore {
  /** 总体质量分数 (0-1) */
  overall: number;
  /** 准确性 */
  accuracy: number;
  /** 有用性 */
  helpfulness: number;
  /** 相关性 */
  relevance: number;
  /** 安全性 */
  safety: number;
  /** 详细评分理由 */
  reasoning: string;
}

/** 奖励计算结果 */
export interface RewardCalculationResult {
  /** 奖励值 */
  value: number;
  /** 奖励类型 */
  type: RewardType;
  /** 奖励来源 */
  source: 'llm' | 'rule' | 'hybrid';
  /** 置信度 */
  confidence: number;
  /** 详细说明 */
  details: string;
}

/** LLM增强奖励配置 */
export interface LLMEnhancedRewardConfig extends RewardModelConfig {
  /** LLM优化器配置 */
  llmOptimizer: Partial<LLMOptimizerConfig>;
  /** 质量权重 */
  qualityWeight: number;
  /** 基于历史的权重 */
  historyWeight: number;
  /** 连续成功阈值 */
  consecutiveSuccessThreshold: number;
  /** 最大连续成功加成 */
  maxConsecutiveBonus: number;
  /** 质量评分回退阈值 */
  qualityFallbackThreshold: number;
}

// ============== LLM增强奖励模型 ==============

/**
 * LLM增强奖励模型
 * 结合规则和LLM分析进行综合奖励计算
 */
export class LLMEnhancedReward extends RewardModel {
  declare protected config: Required<LLMEnhancedRewardConfig>;
  private llmOptimizer: LLMOptimizer;
  private consecutiveSuccessCache: Map<string, number> = new Map();

  constructor(config?: Partial<LLMEnhancedRewardConfig>) {
    super('LLMEnhancedReward', config);

    this.llmOptimizer = new LLMOptimizer(config?.llmOptimizer);

    this.config = {
      ...this.config,
      qualityWeight: config?.qualityWeight ?? 0.4,
      historyWeight: config?.historyWeight ?? 0.3,
      consecutiveSuccessThreshold: config?.consecutiveSuccessThreshold ?? 3,
      maxConsecutiveBonus: config?.maxConsecutiveBonus ?? 0.2,
      qualityFallbackThreshold: config?.qualityFallbackThreshold ?? 0.3,
    };
  }

  /**
   * 计算综合奖励
   * @param context 奖励计算上下文
   */
  async calculate(context: RewardContext): Promise<number> {
    const result = await this.calculateDetailed(context);
    return result.value;
  }

  /**
   * 计算详细奖励
   * @param context 奖励计算上下文
   */
  async calculateDetailed(context: RewardContext): Promise<RewardCalculationResult> {
    // 1. 获取基础规则奖励
    const baseReward = this.calculateBaseReward(context);

    // 2. 获取LLM质量评分
    const qualityScore = await this.calculateLLMQualityScore(context);

    // 3. 获取历史趋势奖励
    const historyReward = this.calculateHistoryReward(context);

    // 4. 获取连续成功加成
    const consecutiveBonus = this.calculateConsecutiveBonus(context);

    // 5. 综合计算
    const totalReward = this.combineRewards(
      baseReward,
      qualityScore,
      historyReward,
      consecutiveBonus
    );

    // 6. 确定奖励来源
    const source = qualityScore.confidence > this.config.qualityFallbackThreshold
      ? 'hybrid'
      : 'rule';

    return {
      value: this.normalize(totalReward),
      type: this.determineRewardType(context, qualityScore),
      source,
      confidence: qualityScore.confidence,
      details: `基础: ${baseReward.toFixed(3)}, 质量: ${qualityScore.overall.toFixed(3)}, 历史: ${historyReward.toFixed(3)}, 连续: ${consecutiveBonus.toFixed(3)}`,
    };
  }

  /**
   * 计算基础奖励（基于规则）
   */
  private calculateBaseReward(context: RewardContext): number {
    let reward = 0;

    // 任务成功基础奖励
    if (context.task?.success) {
      reward += 0.15;
    } else if (context.task) {
      reward -= 0.1;
    }

    // 用户正反馈奖励
    if (context.feedback?.type === 'explicit' || context.feedback?.type === 'approval') {
      reward += context.feedback.rating * 0.2;
    } else if (context.feedback?.type === 'correction') {
      reward -= 0.05;
    }

    return reward;
  }

  /**
   * 计算LLM质量评分
   */
  private async calculateLLMQualityScore(context: RewardContext): Promise<{
    overall: number;
    confidence: number;
  }> {
    if (!this.llmOptimizer.isAvailable()) {
      return {
        overall: this.calculateFallbackQualityScore(context),
        confidence: 0.3,
      };
    }

    try {
      // 构建交互样本
      const samples: InteractionSample[] = this.buildInteractionSamples(context);

      // 分析交互历史
      const analysis = await this.llmOptimizer.analyzeInteractionHistory(samples);

      // 计算质量分数
      const qualityScore = this.deriveQualityScore(context, analysis);

      return {
        overall: qualityScore * this.config.qualityWeight,
        confidence: 0.8,
      };
    } catch (error) {
      console.error('LLM quality scoring failed:', error);
      return {
        overall: this.calculateFallbackQualityScore(context) * this.config.qualityWeight,
        confidence: 0.3,
      };
    }
  }

  /**
   * 构建交互样本
   */
  private buildInteractionSamples(context: RewardContext): InteractionSample[] {
    const samples: InteractionSample[] = [];

    // 从历史记录构建样本
    if (context.evolutionHistory && context.evolutionHistory.length > 0) {
      const recentHistory = context.evolutionHistory.slice(-10);
      for (const record of recentHistory) {
        const metadata = record.metadata ?? {};
        samples.push({
          query: metadata.query as string ?? '历史交互',
          response: metadata.response as string ?? '',
          feedback: metadata.feedback as InteractionSample['feedback'],
          taskSuccess: record.status === 'completed',
          timestamp: new Date(record.triggeredAt),
        });
      }
    }

    // 添加当前任务的样本
    if (context.task) {
      samples.push({
        query: context.metadata?.currentQuery as string ?? '当前任务',
        response: context.metadata?.currentResponse as string ?? '',
        feedback: context.feedback?.content !== undefined ? {
          type: context.feedback.type === 'explicit' ? 'positive' : 'negative',
          content: context.feedback.content,
        } : undefined,
        taskSuccess: context.task.success,
        timestamp: new Date(),
      });
    }

    return samples;
  }

  /**
   * 从分析结果推导质量分数
   */
  private deriveQualityScore(
    context: RewardContext,
    analysis: { predictedFitnessChange: number; identifiedIssues: string[]; successPatterns: string[] }
  ): number {
    // 基础分数
    let score = 0.5;

    // 根据预测的适应度变化调整
    if (context.task?.success) {
      score += Math.max(-0.2, Math.min(0.3, analysis.predictedFitnessChange));
    }

    // 根据问题数量调整
    const issuePenalty = analysis.identifiedIssues.length * 0.05;
    score -= issuePenalty;

    // 根据成功模式调整
    const patternBonus = analysis.successPatterns.length * 0.03;
    score += patternBonus;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 计算回退质量分数（无LLM时）
   */
  private calculateFallbackQualityScore(context: RewardContext): number {
    let score = 0.5;

    if (context.task?.success) {
      score += 0.2;
    }

    if (context.feedback) {
      score += (context.feedback.rating - 0.5) * 0.4;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 计算历史趋势奖励
   */
  private calculateHistoryReward(context: RewardContext): number {
    if (!context.evolutionHistory || context.evolutionHistory.length < 3) {
      return 0;
    }

    const recentHistory = context.evolutionHistory.slice(-10);
    
    // 计算适应度变化趋势
    const fitnessChanges = recentHistory.map(r => r.fitnessDelta);
    const avgChange = fitnessChanges.reduce((a, b) => a + b, 0) / fitnessChanges.length;

    // 计算趋势
    let trendReward = 0;
    if (avgChange > 0.01) {
      trendReward = Math.min(0.15, avgChange * 2);
    } else if (avgChange < -0.01) {
      trendReward = Math.max(-0.1, avgChange);
    }

    // 计算成功率
    const successCount = recentHistory.filter(r => r.status === 'completed').length;
    const successRate = successCount / recentHistory.length;
    const successReward = (successRate - 0.5) * 0.1;

    return (trendReward + successReward) * this.config.historyWeight;
  }

  /**
   * 计算连续成功加成
   */
  private calculateConsecutiveBonus(context: RewardContext): number {
    const cacheKey = `${context.userId}:${context.tenantId}`;
    let consecutive = this.consecutiveSuccessCache.get(cacheKey) ?? 0;

    if (context.task?.success) {
      consecutive++;
    } else if (context.task) {
      consecutive = 0;
    }

    this.consecutiveSuccessCache.set(cacheKey, consecutive);

    if (consecutive >= this.config.consecutiveSuccessThreshold) {
      const bonusRatio = Math.min(1, (consecutive - this.config.consecutiveSuccessThreshold + 1) / 5);
      return bonusRatio * this.config.maxConsecutiveBonus;
    }

    return 0;
  }

  /**
   * 综合奖励计算
   */
  private combineRewards(
    baseReward: number,
    qualityScore: { overall: number; confidence: number },
    historyReward: number,
    consecutiveBonus: number
  ): number {
    // 加权组合
    const weightedQuality = qualityScore.overall * qualityScore.confidence;
    return baseReward + weightedQuality + historyReward + consecutiveBonus;
  }

  /**
   * 确定奖励类型
   */
  private determineRewardType(
    context: RewardContext,
    qualityScore: { overall: number }
  ): RewardType {
    if (!context.task) {
      return RewardType.EXPLORATION_BONUS;
    }

    if (!context.task.success) {
      return RewardType.PENALTY_ERROR;
    }

    if (context.feedback?.type === 'explicit' && context.feedback.rating > 0.8) {
      return RewardType.USER_FEEDBACK_POSITIVE;
    }

    if (qualityScore.overall > 0.8) {
      return RewardType.CONSISTENCY_BONUS;
    }

    return RewardType.TASK_SUCCESS;
  }

  /**
   * 评估任务完成质量
   * 使用LLM评估任务完成的详细质量
   */
  async evaluateTaskQuality(
    context: RewardContext
  ): Promise<InteractionQualityScore> {
    if (!this.llmOptimizer.isAvailable()) {
      return this.getDefaultQualityScore();
    }

    try {
      const analysis = await this.llmOptimizer.analyzeInteractionHistory(
        this.buildInteractionSamples(context)
      );

      const baseScore = this.calculateFallbackQualityScore(context);

      return {
        overall: Math.max(0, Math.min(1, baseScore)),
        accuracy: baseScore * (analysis.identifiedIssues.length === 0 ? 1 : 0.8),
        helpfulness: baseScore * (analysis.successPatterns.length > 0 ? 1 : 0.7),
        relevance: baseScore,
        safety: 0.95, // 默认安全分数
        reasoning: `识别问题: ${analysis.identifiedIssues.join(', ') || '无'}, 成功模式: ${analysis.successPatterns.join(', ') || '无'}`,
      };
    } catch (error) {
      console.error('Task quality evaluation failed:', error);
      return this.getDefaultQualityScore();
    }
  }

  /**
   * 获取默认质量分数
   */
  private getDefaultQualityScore(): InteractionQualityScore {
    return {
      overall: 0.5,
      accuracy: 0.5,
      helpfulness: 0.5,
      relevance: 0.5,
      safety: 0.95,
      reasoning: '使用默认评分',
    };
  }

  /**
   * 计算相似任务的历史奖励
   * @param taskType 任务类型
   * @param history 历史记录
   */
  calculateSimilarTaskReward(
    taskType: string,
    history: EvolutionHistoryRecord[]
  ): number {
    const similarRecords = history.filter(
      r => r.metadata?.taskType === taskType
    );

    if (similarRecords.length === 0) {
      return 0;
    }

    const avgReward = similarRecords.reduce(
      (sum, r) => sum + r.rewards.total,
      0
    ) / similarRecords.length;

    // 给予类似成功经验的小幅加成
    return Math.min(0.1, avgReward * 0.1);
  }

  /**
   * 创建奖励对象
   */
  async createRewardObject(
    context: RewardContext
  ): Promise<Reward> {
    const result = await this.calculateDetailed(context);

    return {
      rewardId: `rew_llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: context.userId,
      tenantId: context.tenantId,
      type: result.type,
      value: result.value,
      calculatedAt: new Date(),
      details: {
        source: result.source,
        confidence: result.confidence,
        details: result.details,
      },
    };
  }

  /**
   * 获取LLM优化器
   */
  getLLMOptimizer(): LLMOptimizer {
    return this.llmOptimizer;
  }

  /**
   * 检查LLM是否可用
   */
  isLLMAvailable(): boolean {
    return this.llmOptimizer.isAvailable();
  }
}
