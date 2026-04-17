/**
 * 进化策略基类
 * Evolution Strategy - Base class for evolution strategies
 */

import {
  IEvolutionStrategy,
  StrategyContext,
  StrategyResult,
  StrategyCondition,
  StrategyConditionType,
  EvolutionMutation,
  MutationType,
  EvolutionConstraint,
} from '../interfaces';

/**
 * 进化策略配置
 */
export interface EvolutionStrategyConfig {
  /** 策略ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  /** 最大变异数 */
  maxMutations: number;
  /** 变异概率 */
  mutationProbability: number;
  /** 交叉概率 */
  crossoverProbability: number;
  /** 精英比例 */
  eliteRatio: number;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 收敛阈值 */
  convergenceThreshold: number;
}

/**
 * 进化策略基类
 */
export abstract class EvolutionStrategy implements IEvolutionStrategy {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  protected config: Required<EvolutionStrategyConfig>;

  /**
   * 构造函数
   * @param config 策略配置
   */
  constructor(config: EvolutionStrategyConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.config = {
      ...config,
      maxMutations: config.maxMutations ?? 5,
      mutationProbability: config.mutationProbability ?? 0.1,
      crossoverProbability: config.crossoverProbability ?? 0.7,
      eliteRatio: config.eliteRatio ?? 0.1,
      maxIterations: config.maxIterations ?? 100,
      convergenceThreshold: config.convergenceThreshold ?? 0.001,
    };
  }

  /**
   * 执行进化策略（抽象方法，由子类实现）
   * @param context 策略上下文
   */
  abstract execute(context: StrategyContext): Promise<StrategyResult>;

  /**
   * 获取适用条件
   */
  getApplicableConditions(): StrategyCondition[] {
    return [];
  }

  /**
   * 验证策略参数
   * @param params 参数
   */
  validateParams(params: Record<string, unknown>): boolean {
    return true;
  }

  /**
   * 获取参数模式
   */
  getParamSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        maxMutations: { type: 'number', minimum: 1, maximum: 100 },
        mutationProbability: { type: 'number', minimum: 0, maximum: 1 },
        crossoverProbability: { type: 'number', minimum: 0, maximum: 1 },
        eliteRatio: { type: 'number', minimum: 0, maximum: 1 },
        maxIterations: { type: 'number', minimum: 1, maximum: 1000 },
        convergenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
      },
    };
  }

  /**
   * 检查条件是否满足
   * @param context 上下文
   * @param condition 条件
   */
  protected checkCondition(context: StrategyContext, condition: StrategyCondition): boolean {
    switch (condition.type) {
      case StrategyConditionType.FITNESS_THRESHOLD:
        return this.checkFitnessThreshold(context, condition.params);

      case StrategyConditionType.HISTORY_LENGTH:
        return this.checkHistoryLength(context, condition.params);

      case StrategyConditionType.TIME_BASED:
        return this.checkTimeBased(context, condition.params);

      case StrategyConditionType.MUTATION_COUNT:
        return this.checkMutationCount(context, condition.params);

      case StrategyConditionType.ERROR_RATE:
        return this.checkErrorRate(context, condition.params);

      default:
        return true;
    }
  }

  /**
   * 检查适应度阈值
   */
  private checkFitnessThreshold(
    context: StrategyContext,
    params: Record<string, unknown>
  ): boolean {
    const currentFitness = (context.currentState.fitness as number) ?? 0;
    const minThreshold = (params.min as number) ?? 0;
    const maxThreshold = (params.max as number) ?? 1;

    return currentFitness >= minThreshold && currentFitness <= maxThreshold;
  }

  /**
   * 检查历史长度
   */
  private checkHistoryLength(
    context: StrategyContext,
    params: Record<string, unknown>
  ): boolean {
    const minLength = (params.min as number) ?? 0;
    const maxLength = (params.max as number) ?? Infinity;

    return context.history.length >= minLength && context.history.length <= maxLength;
  }

  /**
   * 检查时间条件
   */
  private checkTimeBased(
    context: StrategyContext,
    params: Record<string, unknown>
  ): boolean {
    // 默认实现，可由子类重写
    return true;
  }

  /**
   * 检查变异数量
   */
  private checkMutationCount(
    context: StrategyContext,
    params: Record<string, unknown>
  ): boolean {
    const minMutations = (params.min as number) ?? 0;
    const maxMutations = (params.max as number) ?? Infinity;

    const totalMutations = context.history.reduce(
      (sum, record) => sum + record.mutationCount,
      0
    );

    return totalMutations >= minMutations && totalMutations <= maxMutations;
  }

  /**
   * 检查错误率
   */
  private checkErrorRate(
    context: StrategyContext,
    params: Record<string, unknown>
  ): boolean {
    const maxErrorRate = (params.max as number) ?? 0.5;

    if (context.history.length === 0) {
      return true;
    }

    const failedCount = context.history.filter(r => r.status === 'failed').length;
    const errorRate = failedCount / context.history.length;

    return errorRate <= maxErrorRate;
  }

  /**
   * 创建变异对象
   * @param type 变异类型
   * @param path 变异路径
   * @param oldValue 旧值
   * @param newValue 新值
   * @param strength 变异强度
   */
  protected createMutation(
    type: MutationType,
    path: string,
    oldValue: unknown,
    newValue: unknown,
    strength: number
  ): EvolutionMutation {
    return {
      mutationId: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      path,
      oldValue,
      newValue,
      strength: Math.max(0, Math.min(1, strength)),
      validated: false,
    };
  }

  /**
   * 检查约束
   * @param mutation 变异
   * @param constraints 约束列表
   */
  protected checkConstraints(
    mutation: EvolutionMutation,
    constraints: EvolutionConstraint[]
  ): boolean {
    for (const constraint of constraints) {
      if (!this.checkConstraint(mutation, constraint)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查单个约束
   */
  private checkConstraint(
    mutation: EvolutionMutation,
    constraint: EvolutionConstraint
  ): boolean {
    if (constraint.path !== mutation.path) {
      return true;
    }

    switch (constraint.type) {
      case 'range':
        const min = (constraint.value as { min: number }).min;
        const max = (constraint.value as { max: number }).max;
        const value = mutation.newValue as number;
        if (value < min || value > max) {
          return false;
        }
        break;

      case 'enum':
        const allowedValues = constraint.value as unknown[];
        if (!allowedValues.includes(mutation.newValue)) {
          return false;
        }
        break;

      case 'required':
        if (mutation.newValue === undefined || mutation.newValue === null) {
          return false;
        }
        break;
    }

    return !constraint.strict;
  }

  /**
   * 计算适应度变化
   * @param currentFitness 当前适应度
   * @param newState 新状态
   */
  protected calculateFitnessDelta(currentFitness: number, newState: Record<string, unknown>): number {
    const newFitness = (newState.fitness as number) ?? currentFitness;
    return newFitness - currentFitness;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<EvolutionStrategyConfig>> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<EvolutionStrategyConfig>): void {
    Object.assign(this.config, config);
  }
}
