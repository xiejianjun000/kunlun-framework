/**
 * 记忆重要性评分器
 * Importance Scorer - 自定义评分策略
 */

import { IMemory, IImportanceScorer, ImportanceLevel } from '../interfaces';

export interface ScoringStrategy {
  id: string;
  name: string;
  /** 各维度权重 */
  weights: {
    sentiment: number;        // 情感强度
    accessFrequency: number;   // 访问频率
    recency: number;           // 时效性
    contentLength: number;     // 内容长度
    explicitMark: number;      // 显式标记
  };
  /** 内容长度阈值 */
  contentLengthThresholds: {
    min: number;
    optimal: number;
    max: number;
  };
}

/**
 * 默认评分策略
 */
const DEFAULT_STRATEGY: ScoringStrategy = {
  id: 'default',
  name: '默认策略',
  weights: {
    sentiment: 0.25,
    accessFrequency: 0.25,
    recency: 0.20,
    contentLength: 0.15,
    explicitMark: 0.15,
  },
  contentLengthThresholds: {
    min: 10,
    optimal: 200,
    max: 1000,
  },
};

/**
 * 保守评分策略
 */
const CONSERVATIVE_STRATEGY: ScoringStrategy = {
  id: 'conservative',
  name: '保守策略',
  weights: {
    sentiment: 0.30,
    accessFrequency: 0.35,
    recency: 0.10,
    contentLength: 0.10,
    explicitMark: 0.15,
  },
  contentLengthThresholds: {
    min: 20,
    optimal: 300,
    max: 800,
  },
};

/**
 * 激进评分策略
 */
const AGGRESSIVE_STRATEGY: ScoringStrategy = {
  id: 'aggressive',
  name: '激进策略',
  weights: {
    sentiment: 0.20,
    accessFrequency: 0.20,
    recency: 0.30,
    contentLength: 0.20,
    explicitMark: 0.10,
  },
  contentLengthThresholds: {
    min: 5,
    optimal: 100,
    max: 2000,
  },
};

/**
 * 可用策略映射
 */
const STRATEGIES: Record<string, ScoringStrategy> = {
  default: DEFAULT_STRATEGY,
  conservative: CONSERVATIVE_STRATEGY,
  aggressive: AGGRESSIVE_STRATEGY,
};

/**
 * 记忆重要性评分器
 * 
 * 提供记忆重要性评估功能，支持多种评分策略
 * 
 * @example
 * ```typescript
 * const scorer = new ImportanceScorer();
 * scorer.setStrategy('conservative');
 * 
 * const score = await scorer.score(memory);
 * console.log(scorer.getReason(score)); // 评分理由
 * ```
 */
export class ImportanceScorer implements IImportanceScorer {
  /** 评分器唯一标识 */
  readonly id: string = 'importance-scorer';
  /** 评分器名称 */
  readonly name: string = '重要性评分器';
  
  private currentStrategy: ScoringStrategy;
  private customStrategies: Map<string, ScoringStrategy> = new Map();
  private scoringHistory: Map<string, { score: number; timestamp: Date }> = new Map();

  /**
   * 构造函数
   * @param strategyId 初始策略ID
   */
  constructor(strategyId: string = 'default') {
    this.currentStrategy = STRATEGIES[strategyId] ?? DEFAULT_STRATEGY;
  }

  /**
   * 计算重要性评分
   * @param memory 记忆对象
   * @returns 重要性评分 (0-1)
   */
  async score(memory: IMemory): Promise<number> {
    const scores = this.calculateDimensionScores(memory);
    const weightedScore = this.applyWeights(scores);
    const normalizedScore = this.normalizeScore(weightedScore);

    // 记录历史
    this.scoringHistory.set(memory.id, {
      score: normalizedScore,
      timestamp: new Date(),
    });

    return normalizedScore;
  }

  /**
   * 批量评分
   * @param memories 记忆列表
   * @returns 评分结果映射
   */
  async scoreBatch(memories: IMemory[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    for (const memory of memories) {
      const score = await this.score(memory);
      results.set(memory.id, score);
    }

    return results;
  }

  /**
   * 获取评分理由
   * @param score 评分
   * @returns 评分理由
   */
  getReason(score: number): string {
    if (score >= ImportanceLevel.CRITICAL) {
      return '关键记忆，包含重要信息';
    } else if (score >= ImportanceLevel.HIGH) {
      return '高重要性记忆，多次访问或情感标记';
    } else if (score >= ImportanceLevel.MEDIUM) {
      return '中等重要性，常规记忆内容';
    } else if (score >= ImportanceLevel.LOW) {
      return '低重要性，可能可被遗忘';
    } else {
      return '微不足道，建议清理';
    }
  }

  /**
   * 获取评分分类
   * @param score 评分
   * @returns 重要性级别
   */
  getLevel(score: number): ImportanceLevel {
    if (score >= ImportanceLevel.CRITICAL) return ImportanceLevel.CRITICAL;
    if (score >= ImportanceLevel.HIGH) return ImportanceLevel.HIGH;
    if (score >= ImportanceLevel.MEDIUM) return ImportanceLevel.MEDIUM;
    if (score >= ImportanceLevel.LOW) return ImportanceLevel.LOW;
    return ImportanceLevel.TRIVIAL;
  }

  /**
   * 设置评分策略
   * @param strategyId 策略ID
   */
  setStrategy(strategyId: string): void {
    const strategy = this.customStrategies.get(strategyId) ?? STRATEGIES[strategyId];
    if (strategy) {
      this.currentStrategy = strategy;
    }
  }

  /**
   * 添加自定义策略
   * @param strategy 评分策略
   */
  addCustomStrategy(strategy: ScoringStrategy): void {
    this.customStrategies.set(strategy.id, strategy);
  }

  /**
   * 获取当前策略
   */
  getCurrentStrategy(): ScoringStrategy {
    return { ...this.currentStrategy };
  }

  /**
   * 获取评分历史
   * @param memoryId 记忆ID
   */
  getScoringHistory(memoryId: string): { score: number; timestamp: Date } | null {
    return this.scoringHistory.get(memoryId) ?? null;
  }

  /**
   * 清除评分历史
   */
  clearHistory(): void {
    this.scoringHistory.clear();
  }

  // ============== 私有方法 ==============

  /**
   * 计算各维度分数
   */
  private calculateDimensionScores(memory: IMemory): Record<string, number> {
    return {
      sentiment: this.scoreSentiment(memory),
      accessFrequency: this.scoreAccessFrequency(memory),
      recency: this.scoreRecency(memory),
      contentLength: this.scoreContentLength(memory),
      explicitMark: this.scoreExplicitMark(memory),
    };
  }

  /**
   * 评分情感强度
   */
  private scoreSentiment(memory: IMemory): number {
    const sentiment = memory.metadata?.sentiment;
    const intensity = memory.metadata?.sentimentIntensity ?? 0.5;

    if (sentiment === 'positive') {
      return 0.6 + intensity * 0.4;
    } else if (sentiment === 'negative') {
      return 0.7 + intensity * 0.3; // 负面情感通常更重要
    }

    return 0.5;
  }

  /**
   * 评分访问频率
   */
  private scoreAccessFrequency(memory: IMemory): number {
    // 基于访问次数和时间的综合评分
    const accessCount = memory.accessCount;
    
    if (accessCount === 0) return 0.1;
    if (accessCount === 1) return 0.3;
    if (accessCount <= 3) return 0.5;
    if (accessCount <= 10) return 0.7;
    if (accessCount <= 50) return 0.85;
    return 1.0;
  }

  /**
   * 评分时效性
   */
  private scoreRecency(memory: IMemory): number {
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60);
    const hoursSinceAccess = (now.getTime() - memory.accessedAt.getTime()) / (1000 * 60 * 60);

    // 最近访问更重要
    let score = 1.0;
    
    // 24小时内最高
    if (hoursSinceAccess > 24) {
      score -= 0.1;
    }
    if (hoursSinceAccess > 72) {
      score -= 0.2;
    }
    if (hoursSinceAccess > 168) { // 一周
      score -= 0.3;
    }
    if (hoursSinceAccess > 720) { // 一个月
      score -= 0.3;
    }

    return Math.max(0, score);
  }

  /**
   * 评分内容长度
   */
  private scoreContentLength(memory: IMemory): number {
    const { min, optimal, max } = this.currentStrategy.contentLengthThresholds;
    const length = memory.content.length;

    if (length < min) {
      return 0.2;
    } else if (length <= optimal) {
      return 0.5 + (length - min) / (optimal - min) * 0.3;
    } else if (length <= max) {
      return 0.8 - (length - optimal) / (max - optimal) * 0.3;
    } else {
      return 0.5; // 超长内容降低评分
    }
  }

  /**
   * 评分显式标记
   */
  private scoreExplicitMark(memory: IMemory): number {
    let score = 0.5;

    // 基于标签
    if (memory.tags && memory.tags.length > 0) {
      score += 0.1 * Math.min(memory.tags.length, 3);
    }

    // 基于元数据标记
    if (memory.metadata?.pinned) {
      score = 1.0;
    }
    if (memory.metadata?.bookmarked) {
      score = Math.max(score, 0.9);
    }
    if (memory.metadata?.starred) {
      score = Math.max(score, 0.85);
    }

    // 基于来源
    if (memory.metadata?.source === 'user_explicit') {
      score = Math.max(score, 0.9);
    }

    return Math.min(1.0, score);
  }

  /**
   * 应用权重计算综合分数
   */
  private applyWeights(scores: Record<string, number>): number {
    const { weights } = this.currentStrategy;

    return (
      scores.sentiment * weights.sentiment +
      scores.accessFrequency * weights.accessFrequency +
      scores.recency * weights.recency +
      scores.contentLength * weights.contentLength +
      scores.explicitMark * weights.explicitMark
    );
  }

  /**
   * 归一化分数
   */
  private normalizeScore(score: number): number {
    // 确保分数在0-1之间
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 获取所有可用策略
   */
  getAvailableStrategies(): string[] {
    return [
      ...Object.keys(STRATEGIES),
      ...Array.from(this.customStrategies.keys()),
    ];
  }
}
