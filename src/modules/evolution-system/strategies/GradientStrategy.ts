/**
 * 梯度优化进化策略
 * Gradient Descent Evolution Strategy
 */

import {
  StrategyContext,
  StrategyResult,
  EvolutionMutation,
  MutationType,
  StrategyCondition,
  StrategyConditionType,
} from '../interfaces';
import { EvolutionStrategy, EvolutionStrategyConfig } from './EvolutionStrategy';

/** 梯度配置 */
interface GradientConfig {
  /** 学习率 */
  learningRate: number;
  /** 动量 */
  momentum: number;
  /** 梯度裁剪阈值 */
  gradientClip: number;
  /** 自适应学习率 */
  adaptiveLearningRate: boolean;
}

/**
 * 梯度优化策略配置
 */
export interface GradientStrategyConfig extends EvolutionStrategyConfig {
  /** 梯度配置 */
  gradient: GradientConfig;
  /** 数值差分步长 */
  numericalStepSize: number;
  /** 历史梯度窗口 */
  gradientHistoryWindow: number;
}

/**
 * 梯度优化进化策略
 * 使用梯度下降优化特质参数
 */
export class GradientStrategy extends EvolutionStrategy {
  private config: Required<GradientStrategyConfig>;
  private gradientHistory: Map<string, number[]> = new Map();

  constructor(config?: Partial<GradientStrategyConfig>) {
    const defaultConfig: GradientStrategyConfig = {
      id: 'gradient',
      name: 'Gradient Descent Strategy',
      description: '使用梯度下降法精细化调整特质参数',
      maxMutations: 3,
      mutationProbability: 1.0, // 梯度策略始终变异
      crossoverProbability: 0,
      eliteRatio: 0,
      maxIterations: 10,
      convergenceThreshold: 0.0001,
      gradient: {
        learningRate: config?.gradient?.learningRate ?? 0.01,
        momentum: config?.gradient?.momentum ?? 0.9,
        gradientClip: config?.gradient?.gradientClip ?? 5,
        adaptiveLearningRate: config?.gradient?.adaptiveLearningRate ?? true,
      },
      numericalStepSize: config?.numericalStepSize ?? 0.001,
      gradientHistoryWindow: config?.gradientHistoryWindow ?? 10,
    };

    super(defaultConfig);
    this.config = defaultConfig as Required<GradientStrategyConfig>;
  }

  /**
   * 执行梯度优化进化
   * @param context 策略上下文
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = Date.now();

    try {
      // 计算数值梯度
      const gradients = this.computeNumericalGradients(context);

      // 应用梯度更新
      const updates = this.applyGradients(gradients, context);

      // 生成变异
      const mutations = this.generateMutations(updates, context);

      // 检查收敛
      const totalGradientMagnitude = this.computeGradientMagnitude(gradients);
      const converged = totalGradientMagnitude < this.config.convergenceThreshold;

      const currentFitness = (context.currentState.fitness as number) ?? 0.5;
      const newFitness = currentFitness - totalGradientMagnitude * this.config.gradient.learningRate;

      return {
        success: mutations.length > 0 && !converged,
        newState: {
          ...context.currentState,
          fitness: Math.max(0, Math.min(1, newFitness)),
        },
        mutations,
        fitnessDelta: Math.max(0, Math.min(1, newFitness)) - currentFitness,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        newState: context.currentState,
        mutations: [],
        fitnessDelta: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取适用条件
   */
  getApplicableConditions(): StrategyCondition[] {
    return [
      {
        type: StrategyConditionType.FITNESS_THRESHOLD,
        params: { min: 0, max: 0.8 },
      },
      {
        type: StrategyConditionType.ERROR_RATE,
        params: { max: 0.5 },
      },
    ];
  }

  /**
   * 计算数值梯度
   */
  private computeNumericalGradients(context: StrategyContext): Map<string, number> {
    const gradients = new Map<string, number>();
    const currentState = context.currentState;
    const stepSize = this.config.numericalStepSize;

    // 对每个数值参数计算梯度
    for (const [key, value] of Object.entries(currentState)) {
      if (key === 'fitness' || typeof value !== 'number') {
        continue;
      }

      // 计算正向扰动后的适应度
      const positiveState = { ...currentState, [key]: value + stepSize };
      const positiveFitness = this.estimateFitness(positiveState, context);

      // 计算负向扰动后的适应度
      const negativeState = { ...currentState, [key]: value - stepSize };
      const negativeFitness = this.estimateFitness(negativeState, context);

      // 中心差分法计算梯度
      const gradient = (positiveFitness - negativeFitness) / (2 * stepSize);

      // 梯度裁剪
      const clippedGradient = this.clipGradient(gradient);

      // 添加动量
      const momentum = this.getMomentum(key);
      const finalGradient = clippedGradient + this.config.gradient.momentum * momentum;

      gradients.set(key, finalGradient);
    }

    return gradients;
  }

  /**
   * 估计适应度
   */
  private estimateFitness(
    state: Record<string, unknown>,
    context: StrategyContext
  ): number {
    // 基于历史的适应度估计
    if (context.history.length === 0) {
      return (context.currentState.fitness as number) ?? 0.5;
    }

    const recentHistory = context.history.slice(-this.config.gradientHistoryWindow);
    const avgFitness =
      recentHistory.reduce((sum, r) => sum + r.fitnessScore, 0) / recentHistory.length;

    // 考虑当前状态的偏差
    let fitness = avgFitness;
    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'number' && typeof context.currentState[key] === 'number') {
        const deviation = value - (context.currentState[key] as number);
        fitness += deviation * 0.1;
      }
    }

    return Math.max(0, Math.min(1, fitness));
  }

  /**
   * 梯度裁剪
   */
  private clipGradient(gradient: number): number {
    const clip = this.config.gradient.gradientClip;
    return Math.max(-clip, Math.min(clip, gradient));
  }

  /**
   * 获取动量
   */
  private getMomentum(key: string): number {
    const history = this.gradientHistory.get(key) ?? [];
    return history.length > 0 ? history[history.length - 1] : 0;
  }

  /**
   * 应用梯度更新
   */
  private applyGradients(
    gradients: Map<string, number>,
    context: StrategyContext
  ): Map<string, number> {
    const updates = new Map<string, number>();
    let learningRate = this.config.gradient.learningRate;

    for (const [key, gradient] of gradients) {
      // 自适应学习率
      if (this.config.gradient.adaptiveLearningRate) {
        const history = this.gradientHistory.get(key) ?? [];
        if (history.length > 0) {
          const prevGradient = history[history.length - 1];
          // 如果梯度方向改变，减少学习率
          if (gradient * prevGradient < 0) {
            learningRate *= 0.5;
          } else {
            learningRate *= 1.01; // 缓慢增加
          }
          learningRate = Math.max(0.001, Math.min(0.1, learningRate));
        }
      }

      // 计算更新量
      const update = -learningRate * gradient;
      updates.set(key, update);

      // 更新历史
      const history = this.gradientHistory.get(key) ?? [];
      history.push(gradient);
      if (history.length > this.config.gradientHistoryWindow) {
        history.shift();
      }
      this.gradientHistory.set(key, history);
    }

    return updates;
  }

  /**
   * 计算梯度幅度
   */
  private computeGradientMagnitude(gradients: Map<string, number>): number {
    let sum = 0;
    for (const gradient of gradients.values()) {
      sum += gradient * gradient;
    }
    return Math.sqrt(sum);
  }

  /**
   * 生成变异
   */
  private generateMutations(
    updates: Map<string, number>,
    context: StrategyContext
  ): EvolutionMutation[] {
    const mutations: EvolutionMutation[] = [];

    for (const [key, update] of updates) {
      if (Math.abs(update) < 0.0001) {
        continue;
      }

      const currentValue = context.currentState[key] as number;
      const newValue = currentValue + update;

      mutations.push(
        this.createMutation(
          this.determineMutationType(key),
          key,
          currentValue,
          newValue,
          Math.abs(update)
        )
      );
    }

    return mutations.slice(0, this.config.maxMutations);
  }

  /**
   * 确定变异类型
   */
  private determineMutationType(path: string): MutationType {
    if (path.includes('rate') || path.includes('learning')) {
      return MutationType.PARAMETER;
    } else if (path.includes('trait')) {
      return MutationType.TRAIT;
    } else if (path.includes('behavior')) {
      return MutationType.BEHAVIOR;
    }
    return MutationType.RULE;
  }

  /**
   * 重置梯度历史
   */
  resetGradientHistory(): void {
    this.gradientHistory.clear();
  }

  /**
   * 获取梯度统计
   */
  getGradientStats(): {
    totalParameters: number;
    averageMagnitude: number;
    maxMagnitude: number;
    minMagnitude: number;
  } {
    let totalMagnitude = 0;
    let maxMagnitude = -Infinity;
    let minMagnitude = Infinity;

    for (const gradient of this.gradientHistory.values()) {
      if (gradient.length > 0) {
        const avg = gradient.reduce((a, b) => a + b, 0) / gradient.length;
        totalMagnitude += Math.abs(avg);
        maxMagnitude = Math.max(maxMagnitude, Math.abs(avg));
        minMagnitude = Math.min(minMagnitude, Math.abs(avg));
      }
    }

    const count = this.gradientHistory.size;

    return {
      totalParameters: count,
      averageMagnitude: count > 0 ? totalMagnitude / count : 0,
      maxMagnitude: maxMagnitude === -Infinity ? 0 : maxMagnitude,
      minMagnitude: minMagnitude === Infinity ? 0 : minMagnitude,
    };
  }
}
