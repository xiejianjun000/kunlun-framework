/**
 * 进化效果分析器
 * Evolution Analyzer - Analyzes evolution effectiveness
 */

import {
  EvolutionHistoryRecord,
  EvolutionAnalysisReport,
  FitnessTrendPoint,
  MutationStats,
  RewardStats,
  PerformanceMetrics,
  MutationType,
} from '../interfaces';

/** 分析器配置 */
export interface EvolutionAnalyzerConfig {
  /** 分析窗口大小 */
  analysisWindowSize: number;
  /** 趋势计算周期 */
  trendPeriod: number;
  /** 异常阈值 */
  anomalyThreshold: number;
}

/**
 * 进化效果分析器
 * 分析进化历史数据，生成分析报告和可视化
 */
export class EvolutionAnalyzer {
  private config: Required<EvolutionAnalyzerConfig>;

  constructor(config?: Partial<EvolutionAnalyzerConfig>) {
    this.config = {
      analysisWindowSize: config?.analysisWindowSize ?? 100,
      trendPeriod: config?.trendPeriod ?? 10,
      anomalyThreshold: config?.anomalyThreshold ?? 0.2,
    };
  }

  /**
   * 生成分析报告
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param history 历史记录
   */
  async generateReport(
    userId: string,
    tenantId: string,
    history: EvolutionHistoryRecord[]
  ): Promise<EvolutionAnalysisReport> {
    // 计算基本统计
    const basicStats = this.calculateBasicStats(history);

    // 计算适应度趋势
    const fitnessTrend = this.calculateFitnessTrend(history);

    // 统计变异
    const topMutations = this.calculateMutationStats(history);

    // 计算奖励统计
    const rewardStats = this.calculateRewardStats(history);

    // 计算性能指标
    const performanceMetrics = this.calculatePerformanceMetrics(history);

    // 生成建议
    const suggestions = this.generateSuggestions(
      basicStats,
      fitnessTrend,
      rewardStats
    );

    return {
      userId,
      tenantId,
      generatedAt: new Date(),
      totalEvolutions: history.length,
      successRate: basicStats.successRate,
      averageFitness: basicStats.averageFitness,
      fitnessTrend,
      topMutations,
      rewardStats,
      performanceMetrics,
      suggestions,
    };
  }

  /**
   * 计算基本统计
   */
  private calculateBasicStats(history: EvolutionHistoryRecord[]): {
    successRate: number;
    averageFitness: number;
    totalMutations: number;
  } {
    if (history.length === 0) {
      return {
        successRate: 0,
        averageFitness: 0,
        totalMutations: 0,
      };
    }

    const successful = history.filter(r => r.status === 'completed').length;
    const totalMutations = history.reduce((sum, r) => sum + r.mutationCount, 0);

    return {
      successRate: successful / history.length,
      averageFitness:
        history.reduce((sum, r) => sum + r.fitnessScore, 0) / history.length,
      totalMutations,
    };
  }

  /**
   * 计算适应度趋势
   */
  private calculateFitnessTrend(history: EvolutionHistoryRecord[]): FitnessTrendPoint[] {
    if (history.length === 0) {
      return [];
    }

    const sorted = [...history].sort(
      (a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime()
    );

    const trend: FitnessTrendPoint[] = [];
    let previousFitness = 0.5;

    for (const record of sorted.slice(-this.config.analysisWindowSize)) {
      trend.push({
        timestamp: new Date(record.triggeredAt),
        fitness: record.fitnessScore,
        delta: record.fitnessScore - previousFitness,
      });
      previousFitness = record.fitnessScore;
    }

    return trend;
  }

  /**
   * 计算变异统计
   */
  private calculateMutationStats(history: EvolutionHistoryRecord[]): MutationStats[] {
    const mutationMap = new Map<MutationType, {
      count: number;
      totalStrength: number;
      successfulCount: number;
    }>();

    for (const record of history) {
      const types = (record.metadata?.lastMutationTypes as MutationType[]) ?? [
        MutationType.TRAIT,
      ];

      for (const type of types) {
        const existing = mutationMap.get(type) ?? {
          count: 0,
          totalStrength: 0,
          successfulCount: 0,
        };

        existing.count++;
        existing.totalStrength += 0.1; // 默认强度
        if (record.status === 'completed') {
          existing.successfulCount++;
        }

        mutationMap.set(type, existing);
      }
    }

    const stats: MutationStats[] = [];

    for (const [type, data] of mutationMap) {
      stats.push({
        type,
        count: data.count,
        avgStrength: data.totalStrength / data.count,
        successRate: data.successfulCount / data.count,
      });
    }

    // 按次数排序
    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * 计算奖励统计
   */
  private calculateRewardStats(history: EvolutionHistoryRecord[]): RewardStats {
    if (history.length === 0) {
      return {
        totalRewards: 0,
        averageReward: 0,
        rewardDistribution: {},
        trend: 'stable',
      };
    }

    const distribution: Record<string, number> = {
      taskSuccess: 0,
      userFeedback: 0,
      evolutionary: 0,
      penalties: 0,
    };

    let totalRewards = 0;

    for (const record of history) {
      distribution.taskSuccess += record.rewards.taskSuccess;
      distribution.userFeedback += record.rewards.userFeedback;
      distribution.evolutionary += record.rewards.evolutionary;
      distribution.penalties += Math.abs(record.rewards.penalties);
      totalRewards += record.rewards.total;
    }

    // 计算趋势
    const trend = this.calculateRewardTrend(history);

    return {
      totalRewards,
      averageReward: totalRewards / history.length,
      rewardDistribution: distribution,
      trend,
    };
  }

  /**
   * 计算奖励趋势
   */
  private calculateRewardTrend(history: EvolutionHistoryRecord[]): 'increasing' | 'decreasing' | 'stable' {
    if (history.length < 10) {
      return 'stable';
    }

    const sorted = [...history].sort(
      (a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime()
    );

    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);

    const firstAvg =
      firstHalf.reduce((sum, r) => sum + r.rewards.total, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, r) => sum + r.rewards.total, 0) / secondHalf.length;

    const ratio = secondAvg / (firstAvg || 1);

    if (ratio > 1.1) {
      return 'increasing';
    } else if (ratio < 0.9) {
      return 'decreasing';
    }

    return 'stable';
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(history: EvolutionHistoryRecord[]): PerformanceMetrics {
    if (history.length === 0) {
      return {
        avgExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        avgMutations: 0,
      };
    }

    const executionTimes = history.map(r => r.executionTime ?? 0);
    const mutations = history.map(r => r.mutationCount);

    return {
      avgExecutionTime:
        executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      minExecutionTime: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
      maxExecutionTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      avgMutations: mutations.reduce((a, b) => a + b, 0) / mutations.length,
    };
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    basicStats: ReturnType<typeof this.calculateBasicStats>,
    fitnessTrend: FitnessTrendPoint[],
    rewardStats: RewardStats
  ): string[] {
    const suggestions: string[] = [];

    // 基于成功率建议
    if (basicStats.successRate < 0.5) {
      suggestions.push('成功率较低，建议降低变异强度或使用更保守的策略');
    } else if (basicStats.successRate > 0.9) {
      suggestions.push('成功率很高，可以尝试更激进的探索策略');
    }

    // 基于适应度趋势建议
    if (fitnessTrend.length >= 3) {
      const recentTrend = fitnessTrend.slice(-3);
      const improving = recentTrend.every(
        (p, i) => i === 0 || p.delta > 0
      );
      const declining = recentTrend.every(
        (p, i) => i === 0 || p.delta < 0
      );

      if (declining) {
        suggestions.push('适应度持续下降，建议检查约束条件或回滚到之前的版本');
      } else if (improving) {
        suggestions.push('适应度持续改善，当前策略运行良好');
      }
    }

    // 基于奖励趋势建议
    if (rewardStats.trend === 'decreasing') {
      suggestions.push('奖励持续下降，可能需要调整奖励模型参数');
    } else if (rewardStats.trend === 'increasing') {
      suggestions.push('奖励持续增长，系统处于正向循环');
    }

    // 基于平均适应度建议
    if (basicStats.averageFitness < 0.3) {
      suggestions.push('平均适应度较低，建议使用梯度优化策略进行精细化调整');
    } else if (basicStats.averageFitness > 0.8) {
      suggestions.push('平均适应度已处于较高水平，建议保持当前配置并关注稳定性');
    }

    // 默认建议
    if (suggestions.length === 0) {
      suggestions.push('系统运行正常，继续观察当前策略的效果');
    }

    return suggestions;
  }

  /**
   * 检测异常
   * @param history 历史记录
   */
  detectAnomalies(history: EvolutionHistoryRecord[]): {
    fitnessAnomalies: Array<{ record: EvolutionHistoryRecord; severity: 'low' | 'medium' | 'high' }>;
    performanceAnomalies: Array<{ record: EvolutionHistoryRecord; severity: 'low' | 'medium' | 'high' }>;
  } {
    const fitnessAnomalies: Array<{
      record: EvolutionHistoryRecord;
      severity: 'low' | 'medium' | 'high';
    }> = [];
    const performanceAnomalies: Array<{
      record: EvolutionHistoryRecord;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    if (history.length < 3) {
      return { fitnessAnomalies, performanceAnomalies };
    }

    // 计算平均值和标准差
    const fitnessValues = history.map(r => r.fitnessScore);
    const avgFitness = fitnessValues.reduce((a, b) => a + b, 0) / fitnessValues.length;
    const fitnessVariance =
      fitnessValues.reduce((sum, f) => sum + Math.pow(f - avgFitness, 2), 0) /
      fitnessValues.length;
    const fitnessStdDev = Math.sqrt(fitnessVariance);

    const executionTimes = history.map(r => r.executionTime ?? 0);
    const avgTime =
      executionTimes.reduce((a, b) => a + b, 0) / (executionTimes.length || 1);

    // 检测适应度异常
    for (const record of history) {
      const deviation = Math.abs(record.fitnessScore - avgFitness);

      if (deviation > 2 * fitnessStdDev) {
        fitnessAnomalies.push({
          record,
          severity: 'high',
        });
      } else if (deviation > fitnessStdDev) {
        fitnessAnomalies.push({
          record,
          severity: 'medium',
        });
      }
    }

    // 检测性能异常
    for (const record of history) {
      if ((record.executionTime ?? 0) > avgTime * 3) {
        performanceAnomalies.push({
          record,
          severity: 'high',
        });
      } else if ((record.executionTime ?? 0) > avgTime * 2) {
        performanceAnomalies.push({
          record,
          severity: 'medium',
        });
      }
    }

    return { fitnessAnomalies, performanceAnomalies };
  }

  /**
   * 比较两个时间段
   * @param history 历史记录
   * @param period1 第一段时间
   * @param period2 第二段时间
   */
  comparePeriods(
    history: EvolutionHistoryRecord[],
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date }
  ): {
    fitnessComparison: number;
    successRateComparison: number;
    performanceComparison: number;
  } {
    const period1Records = history.filter(
      r => new Date(r.triggeredAt) >= period1.start && new Date(r.triggeredAt) <= period1.end
    );
    const period2Records = history.filter(
      r => new Date(r.triggeredAt) >= period2.start && new Date(r.triggeredAt) <= period2.end
    );

    const stats1 = this.calculateBasicStats(period1Records);
    const stats2 = this.calculateBasicStats(period2Records);
    const perf1 = this.calculatePerformanceMetrics(period1Records);
    const perf2 = this.calculatePerformanceMetrics(period2Records);

    return {
      fitnessComparison: stats2.averageFitness - stats1.averageFitness,
      successRateComparison: stats2.successRate - stats1.successRate,
      performanceComparison: perf1.avgExecutionTime - perf2.avgExecutionTime,
    };
  }

  /**
   * 预测未来适应度
   * @param history 历史记录
   * @param steps 预测步数
   */
  predictFutureFitness(
    history: EvolutionHistoryRecord[],
    steps: number = 5
  ): FitnessTrendPoint[] {
    if (history.length < 5) {
      return [];
    }

    const trend = this.calculateFitnessTrend(history);

    // 简单的线性回归
    const n = trend.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = trend.reduce((sum, p) => sum + p.fitness, 0);
    const sumXY = trend.reduce((sum, p, i) => sum + i * p.fitness, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 生成预测
    const predictions: FitnessTrendPoint[] = [];
    let lastFitness = trend[trend.length - 1].fitness;
    let lastTime = trend[trend.length - 1].timestamp;

    for (let i = 1; i <= steps; i++) {
      const predictedFitness = Math.max(
        0,
        Math.min(1, intercept + slope * (n + i))
      );

      predictions.push({
        timestamp: new Date(lastTime.getTime() + i * 86400000),
        fitness: predictedFitness,
        delta: predictedFitness - lastFitness,
      });

      lastFitness = predictedFitness;
    }

    return predictions;
  }
}
