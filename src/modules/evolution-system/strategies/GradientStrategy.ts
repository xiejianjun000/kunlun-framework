/**
 * 梯度优化进化策略 - LLM增强版
 * Gradient Descent Evolution Strategy with LLM Enhancement
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
import { LLMOptimizer } from '../core/LLMOptimizer';

// ============== 类型定义 ==============

/** 梯度配置 */
interface GradientConfig {
  learningRate: number;
  momentum: number;
  gradientClip: number;
  adaptiveLearningRate: boolean;
  llmGuidedLearningRate: boolean;
}

/** LLM增强梯度策略配置 */
export interface LLMEnhancedGradientConfig extends EvolutionStrategyConfig {
  gradient: GradientConfig;
  numericalStepSize: number;
  gradientHistoryWindow: number;
  llmGradientEstimation: boolean;
  llmSuggestionWeight: number;
}

/** 参数梯度信息 */
interface ParameterGradient {
  key: string;
  numericalGradient: number;
  llmSuggestedGradient?: number;
  combinedGradient: number;
  updateApplied: boolean;
}

// ============== 梯度策略实现 ==============

/**
 * LLM增强梯度优化策略
 * 结合数值梯度和LLM建议进行精细化参数调整
 */
export class LLMEnhancedGradientStrategy extends EvolutionStrategy {
  declare protected config: Required<LLMEnhancedGradientConfig>;
  private llmOptimizer: LLMOptimizer;
  private gradientHistory: Map<string, number[]> = new Map();
  private parameterGradients: ParameterGradient[] = [];

  constructor(config?: Partial<LLMEnhancedGradientConfig>) {
    const defaultConfig: LLMEnhancedGradientConfig = {
      id: 'gradient-llm',
      name: 'LLM-Enhanced Gradient Strategy',
      description: '结合数值梯度和LLM分析的精细化参数调整策略',
      maxMutations: 3,
      mutationProbability: 1.0,
      crossoverProbability: 0,
      eliteRatio: 0,
      maxIterations: 10,
      convergenceThreshold: 0.0001,
      gradient: {
        learningRate: config?.gradient?.learningRate ?? 0.01,
        momentum: config?.gradient?.momentum ?? 0.9,
        gradientClip: config?.gradient?.gradientClip ?? 5,
        adaptiveLearningRate: config?.gradient?.adaptiveLearningRate ?? true,
        llmGuidedLearningRate: config?.gradient?.llmGuidedLearningRate ?? true,
      },
      numericalStepSize: config?.numericalStepSize ?? 0.001,
      gradientHistoryWindow: config?.gradientHistoryWindow ?? 10,
      llmGradientEstimation: config?.llmGradientEstimation ?? true,
      llmSuggestionWeight: config?.llmSuggestionWeight ?? 0.3,
    };

    super(defaultConfig);
    this.config = defaultConfig as Required<LLMEnhancedGradientConfig>;
    this.llmOptimizer = new LLMOptimizer();
  }

  /**
   * 执行LLM增强梯度优化
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = Date.now();

    try {
      // 1. 计算数值梯度
      const numericalGradients = this.computeNumericalGradients(context);

      // 2. LLM增强梯度估计
      const llmGradients = await this.estimateGradientsWithLLM(context);

      // 3. 合并梯度
      this.parameterGradients = this.combineGradients(numericalGradients, llmGradients);

      // 4. 应用梯度更新
      const updates = this.applyGradientsWithMomentum();

      // 5. 生成变异
      const mutations = this.generateMutations(updates, context);

      // 6. LLM验证变异效果
      const validatedMutations = await this.validateMutationsWithLLM(mutations, context);

      // 7. 检查收敛
      const totalGradientMagnitude = this.computeGradientMagnitude(
        this.parameterGradients.map(g => g.combinedGradient)
      );
      const converged = totalGradientMagnitude < this.config.convergenceThreshold;

      const currentFitness = (context.currentState.fitness as number) ?? 0.5;
      const newFitness = this.calculateNewFitness(currentFitness, validatedMutations, context);

      return {
        success: validatedMutations.length > 0 && !converged,
        newState: {
          ...context.currentState,
          fitness: newFitness,
        },
        mutations: validatedMutations,
        fitnessDelta: newFitness - currentFitness,
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
      { type: StrategyConditionType.FITNESS_THRESHOLD, params: { min: 0, max: 0.8 } },
      { type: StrategyConditionType.ERROR_RATE, params: { max: 0.5 } },
    ];
  }

  /**
   * 计算数值梯度
   */
  private computeNumericalGradients(context: StrategyContext): Map<string, number> {
    const gradients = new Map<string, number>();
    const currentState = context.currentState;
    const stepSize = this.config.numericalStepSize;

    for (const [key, value] of Object.entries(currentState)) {
      if (key === 'fitness' || typeof value !== 'number') {
        continue;
      }

      // 中心差分法
      const positiveState = { ...currentState, [key]: value + stepSize };
      const positiveFitness = this.estimateFitness(positiveState, context);

      const negativeState = { ...currentState, [key]: value - stepSize };
      const negativeFitness = this.estimateFitness(negativeState, context);

      const gradient = (positiveFitness - negativeFitness) / (2 * stepSize);
      const clippedGradient = this.clipGradient(gradient);
      const momentum = this.getMomentum(key);

      gradients.set(key, clippedGradient + this.config.gradient.momentum * momentum);
    }

    return gradients;
  }

  /**
   * 使用LLM估计梯度
   */
  private async estimateGradientsWithLLM(context: StrategyContext): Promise<Map<string, number>> {
    const gradients = new Map<string, number>();

    if (!this.config.llmGradientEstimation || !this.llmOptimizer.isAvailable()) {
      return gradients;
    }

    try {
      // 获取适应度预测
      const prediction = await this.llmOptimizer.predictFitness(
        (context.currentState.fitness as number) ?? 0.5,
        context
      );

      // 分析当前状态与预测的差距，推断梯度方向
      const currentFitness = (context.currentState.fitness as number) ?? 0.5;
      const predictedFitness = prediction.predictedFitness;
      const fitnessDelta = predictedFitness - currentFitness;

      // 根据预测调整梯度方向
      for (const [key, value] of Object.entries(context.currentState)) {
        if (key === 'fitness' || typeof value !== 'number') {
          continue;
        }

        // 假设参数与适应度正相关，使用预测调整
        if (fitnessDelta > 0) {
          // 预测适应度会提升，增加参数
          gradients.set(key, Math.abs(fitnessDelta) * 0.5);
        } else if (fitnessDelta < 0) {
          // 预测适应度会下降，减少参数
          gradients.set(key, -Math.abs(fitnessDelta) * 0.5);
        }
      }

      // 应用置信度权重
      const confidenceWeight = prediction.confidenceInterval[1] - prediction.confidenceInterval[0];
      if (confidenceWeight > 0.1) {
        // 高不确定性，降低LLM权重
        for (const [key, value] of gradients) {
          gradients.set(key, value * 0.5);
        }
      }
    } catch (error) {
      console.error('LLM gradient estimation failed:', error);
    }

    return gradients;
  }

  /**
   * 合并数值梯度和LLM梯度
   */
  private combineGradients(
    numerical: Map<string, number>,
    llm: Map<string, number>
  ): ParameterGradient[] {
    const combined: ParameterGradient[] = [];

    for (const [key, numGrad] of numerical) {
      const llmGrad = llm.get(key) ?? 0;

      // 加权组合
      const combinedGrad = (1 - this.config.llmSuggestionWeight) * numGrad +
        this.config.llmSuggestionWeight * llmGrad;

      combined.push({
        key,
        numericalGradient: numGrad,
        llmSuggestedGradient: llmGrad || undefined,
        combinedGradient: combinedGrad,
        updateApplied: false,
      });
    }

    return combined;
  }

  /**
   * 估计适应度
   */
  private estimateFitness(
    state: Record<string, unknown>,
    context: StrategyContext
  ): number {
    if (context.history.length === 0) {
      return (context.currentState.fitness as number) ?? 0.5;
    }

    const recentHistory = context.history.slice(-this.config.gradientHistoryWindow);
    const avgFitness = recentHistory.reduce((sum, r) => sum + r.fitnessScore, 0) / recentHistory.length;

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
  private applyGradientsWithMomentum(): Map<string, number> {
    const updates = new Map<string, number>();
    let baseLearningRate = this.config.gradient.learningRate;

    for (const paramGrad of this.parameterGradients) {
      // 自适应学习率
      let learningRate = baseLearningRate;
      if (this.config.gradient.adaptiveLearningRate) {
        const history = this.gradientHistory.get(paramGrad.key) ?? [];
        if (history.length > 1) {
          const prevGradient = history[history.length - 1];
          if (paramGrad.combinedGradient * prevGradient < 0) {
            learningRate *= 0.5; // 震荡，减少学习率
          } else {
            learningRate *= 1.01; // 稳定，增加学习率
          }
          learningRate = Math.max(0.001, Math.min(0.1, learningRate));
        }
      }

      // LLM引导的学习率调整
      if (this.config.gradient.llmGuidedLearningRate && paramGrad.llmSuggestedGradient !== undefined) {
        // 如果LLM建议方向与数值梯度一致，增加学习率
        if (paramGrad.llmSuggestedGradient * paramGrad.numericalGradient > 0) {
          learningRate *= 1.2;
        } else {
          learningRate *= 0.8;
        }
      }

      // 计算更新
      const update = -learningRate * paramGrad.combinedGradient;
      updates.set(paramGrad.key, update);

      // 更新历史
      const history = this.gradientHistory.get(paramGrad.key) ?? [];
      history.push(paramGrad.combinedGradient);
      if (history.length > this.config.gradientHistoryWindow) {
        history.shift();
      }
      this.gradientHistory.set(paramGrad.key, history);
    }

    return updates;
  }

  /**
   * 计算梯度幅度
   */
  private computeGradientMagnitude(gradients: number[]): number {
    let sum = 0;
    for (const gradient of gradients) {
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

      // 查找对应的梯度信息
      const paramGrad = this.parameterGradients.find(g => g.key === key);

      mutations.push({
        mutationId: `grad_${key}_${Date.now()}`,
        type: this.determineMutationType(key),
        path: key,
        oldValue: currentValue,
        newValue,
        strength: Math.min(1, Math.abs(update) / Math.max(0.1, Math.abs(currentValue))),
        validated: false,
        // 添加元数据
        ...(paramGrad?.llmSuggestedGradient !== undefined && {
          metadata: {
            numericalGradient: paramGrad.numericalGradient,
            llmGradient: paramGrad.llmSuggestedGradient,
            combinedGradient: paramGrad.combinedGradient,
          },
        }),
      } as EvolutionMutation & { metadata?: Record<string, number> });
    }

    return mutations.slice(0, this.config.maxMutations);
  }

  /**
   * 确定变异类型
   */
  private determineMutationType(key: string): MutationType {
    if (key.includes('rate') || key.includes('learning')) {
      return MutationType.PARAMETER;
    }
    if (key.includes('behavior') || key.includes('pattern')) {
      return MutationType.BEHAVIOR;
    }
    if (key.includes('trait')) {
      return MutationType.TRAIT;
    }
    return MutationType.PARAMETER;
  }

  /**
   * 使用LLM验证变异效果
   */
  private async validateMutationsWithLLM(
    mutations: EvolutionMutation[],
    context: StrategyContext
  ): Promise<EvolutionMutation[]> {
    if (!this.llmOptimizer.isAvailable() || mutations.length === 0) {
      return mutations;
    }

    try {
      const evaluations = await this.llmOptimizer.evaluateMutationEffects(mutations, context);

      return mutations.filter((mutation, index) => {
        const evaluation = evaluations[index];
        return evaluation?.recommended !== false;
      });
    } catch (error) {
      console.error('LLM mutation validation failed:', error);
      return mutations;
    }
  }

  /**
   * 计算新适应度
   */
  private calculateNewFitness(
    currentFitness: number,
    mutations: EvolutionMutation[],
    context: StrategyContext
  ): number {
    // 基础适应度变化
    let fitnessDelta = mutations.reduce((sum, m) => sum + m.strength * 0.05, 0);

    // 应用约束检查
    for (const mutation of mutations) {
      const newValue = mutation.newValue;
      for (const constraint of context.constraints) {
        if (constraint.path === mutation.path && constraint.strict) {
          if (constraint.type === 'range') {
            const range = constraint.value as { min: number; max: number };
            if (typeof newValue === 'number' && (newValue < range.min || newValue > range.max)) {
              fitnessDelta -= 0.1; // 违反约束
            }
          }
        }
      }
    }

    return Math.max(0, Math.min(1, currentFitness + fitnessDelta));
  }

  /**
   * 获取梯度历史
   */
  getGradientHistory(): Map<string, number[]> {
    return new Map(this.gradientHistory);
  }

  /**
   * 重置梯度历史
   */
  resetGradientHistory(): void {
    this.gradientHistory.clear();
    this.parameterGradients = [];
  }
}

// 保持向后兼容
export { LLMEnhancedGradientStrategy as GradientStrategy };
