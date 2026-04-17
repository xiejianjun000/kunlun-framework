/**
 * 进化引擎
 * Evolution Engine - Core evolution logic
 */

import {
  EvolutionContext,
  EvolutionResult,
  EvolutionOptions,
  EvolutionMutation,
  MutationType,
  EvolutionConfig,
  RewardType,
  DEFAULT_EVOLUTION_CONFIG,
  StrategyContext,
  StrategyResult,
} from '../interfaces';
import { GeneticStrategy } from '../strategies/GeneticStrategy';
import { ReinforcementStrategy } from '../strategies/ReinforcementStrategy';
import { GradientStrategy } from '../strategies/GradientStrategy';
import { IEvolutionStrategy } from '../interfaces';
import { TraitManager } from '../traits/TraitManager';
import { TraitMutator } from '../traits/TraitMutator';
import { TraitValidator } from '../traits/TraitValidator';

/** 进化引擎配置 */
export interface EvolutionEngineConfig {
  /** 策略列表 */
  strategies: IEvolutionStrategy[];
  /** 特质管理器 */
  traitManager: TraitManager;
  /** 特质变异器 */
  traitMutator: TraitMutator;
  /** 特质验证器 */
  traitValidator: TraitValidator;
}

/**
 * 进化引擎
 * 负责执行核心进化逻辑
 */
export class EvolutionEngine {
  private readonly strategies: Map<string, IEvolutionStrategy>;
  private readonly traitManager: TraitManager;
  private readonly traitMutator: TraitMutator;
  private readonly traitValidator: TraitValidator;
  private defaultStrategy: IEvolutionStrategy;

  /**
   * 构造函数
   * @param config 进化引擎配置
   */
  constructor(config?: Partial<EvolutionEngineConfig>) {
    // 初始化策略
    this.strategies = new Map();

    // 初始化特质管理器
    this.traitManager = config?.traitManager ?? new TraitManager();

    // 初始化特质变异器
    this.traitMutator = config?.traitMutator ?? new TraitMutator();

    // 初始化特质验证器
    this.traitValidator = config?.traitValidator ?? new TraitValidator();

    // 设置默认策略
    this.defaultStrategy = new GeneticStrategy();
    this.registerStrategy(this.defaultStrategy);

    // 注册其他内置策略
    this.registerStrategy(new ReinforcementStrategy());
    this.registerStrategy(new GradientStrategy());
  }

  /**
   * 注册进化策略
   * @param strategy 进化策略
   */
  registerStrategy(strategy: IEvolutionStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * 注销进化策略
   * @param strategyId 策略ID
   */
  unregisterStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  /**
   * 获取所有策略
   */
  getStrategies(): IEvolutionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 设置默认策略
   * @param strategyId 策略ID
   */
  setDefaultStrategy(strategyId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      this.defaultStrategy = strategy;
      return true;
    }
    return false;
  }

  /**
   * 执行进化
   * @param context 进化上下文
   * @param rewards 奖励列表
   * @param options 进化选项
   */
  async evolve(
    context: EvolutionContext,
    rewards: { type: RewardType; value: number }[],
    options?: EvolutionOptions
  ): Promise<EvolutionResult> {
    const startTime = Date.now();

    try {
      // 选择策略
      const strategy = this.selectStrategy(context, options);

      // 构建策略上下文
      const strategyContext = await this.buildStrategyContext(context, options);

      // 执行策略
      const strategyResult = await strategy.execute(strategyContext);

      // 应用变异
      const mutations = await this.applyMutations(strategyResult, context);

      // 验证变异
      const validatedMutations = await this.validateMutations(mutations, context);

      // 计算新适应度
      const newFitness = this.calculateFitness(context, rewards, validatedMutations);

      // 计算改进幅度
      const improvement = newFitness - context.currentFitness;

      return {
        success: validatedMutations.length > 0 || improvement > 0,
        fitnessScore: newFitness,
        improvement,
        mutations: validatedMutations,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        fitnessScore: context.currentFitness,
        improvement: 0,
        mutations: [],
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 选择策略
   * @param context 进化上下文
   * @param options 进化选项
   */
  private selectStrategy(context: EvolutionContext, options?: EvolutionOptions): IEvolutionStrategy {
    // 如果明确指定了策略，使用指定策略
    if (options?.metadata?.strategyId) {
      const specifiedStrategy = this.strategies.get(options.metadata.strategyId as string);
      if (specifiedStrategy) {
        return specifiedStrategy;
      }
    }

    // 基于历史选择策略
    if (context.historyCount > 50) {
      const reinforcementStrategy = this.strategies.get('reinforcement');
      if (reinforcementStrategy) {
        return reinforcementStrategy;
      }
    }

    // 基于适应度选择策略
    if (context.currentFitness < 0.3) {
      const gradientStrategy = this.strategies.get('gradient');
      if (gradientStrategy) {
        return gradientStrategy;
      }
    }

    // 默认使用遗传策略
    return this.defaultStrategy;
  }

  /**
   * 构建策略上下文
   * @param context 进化上下文
   * @param options 进化选项
   */
  private async buildStrategyContext(
    context: EvolutionContext,
    options?: EvolutionOptions
  ): Promise<StrategyContext> {
    // 获取当前特质
    const currentState = await this.traitManager.getTraits(context.userId, context.tenantId);

    return {
      currentState,
      targetState: options?.targetFitness ? { fitness: options.targetFitness } : undefined,
      params: {
        maxMutations: options?.maxMutations ?? DEFAULT_EVOLUTION_CONFIG.maxMutationsPerEvolution,
        mutationProbability: DEFAULT_EVOLUTION_CONFIG.mutationProbability,
        direction: context.direction,
      },
      constraints: context.constraints,
      history: context.evolutionHistory ?? [],
    };
  }

  /**
   * 应用变异
   * @param strategyResult 策略执行结果
   * @param context 进化上下文
   */
  private async applyMutations(
    strategyResult: StrategyResult,
    context: EvolutionContext
  ): Promise<EvolutionMutation[]> {
    const mutations: EvolutionMutation[] = [];

    for (const mutation of strategyResult.mutations) {
      const appliedMutation = await this.traitMutator.apply(mutation, context);
      if (appliedMutation) {
        mutations.push(appliedMutation);
      }
    }

    return mutations;
  }

  /**
   * 验证变异
   * @param mutations 变异列表
   * @param context 进化上下文
   */
  private async validateMutations(
    mutations: EvolutionMutation[],
    context: EvolutionContext
  ): Promise<EvolutionMutation[]> {
    const validatedMutations: EvolutionMutation[] = [];

    for (const mutation of mutations) {
      const isValid = await this.traitValidator.validate(mutation, context);
      if (isValid) {
        mutation.validated = true;
        validatedMutations.push(mutation);
      }
    }

    return validatedMutations;
  }

  /**
   * 计算适应度
   * @param context 进化上下文
   * @param rewards 奖励列表
   * @param mutations 变异列表
   */
  private calculateFitness(
    context: EvolutionContext,
    rewards: { type: RewardType; value: number }[],
    mutations: EvolutionMutation[]
  ): number {
    // 计算总奖励
    const totalReward = rewards.reduce((sum, r) => sum + r.value, 0);

    // 计算变异贡献
    const mutationContribution = mutations.reduce((sum, m) => sum + m.strength * 0.1, 0);

    // 新适应度 = 当前适应度 + 奖励 + 变异贡献
    let newFitness = context.currentFitness + totalReward + mutationContribution;

    // 确保适应度在有效范围内
    newFitness = Math.max(0, Math.min(1, newFitness));

    return newFitness;
  }

  /**
   * 执行单步进化（用于实时反馈）
   * @param context 进化上下文
   */
  async evolveStep(context: EvolutionContext): Promise<EvolutionMutation | null> {
    // 获取当前特质
    const currentState = await this.traitManager.getTraits(context.userId, context.tenantId);

    // 生成单个变异
    const mutation = this.traitMutator.generateMutation(currentState, {
      maxStrength: 0.1,
      type: MutationType.TRAIT,
    });

    if (!mutation) {
      return null;
    }

    // 验证变异
    const isValid = await this.traitValidator.validate(mutation, context);
    if (!isValid) {
      return null;
    }

    mutation.validated = true;
    return mutation;
  }

  /**
   * 评估变异效果
   * @param mutation 变异
   * @param context 进化上下文
   */
  async evaluateMutation(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): Promise<{ score: number; reason: string }> {
    // 基于变异强度评估
    if (mutation.strength > 0.5) {
      return {
        score: 0.3,
        reason: '变异强度过高，可能导致不稳定',
      };
    }

    // 基于历史评估
    if (context.historyCount > 10) {
      return {
        score: 0.7,
        reason: '基于历史数据评估为有效变异',
      };
    }

    return {
      score: 0.5,
      reason: '基于默认策略评估',
    };
  }

  /**
   * 撤销变异
   * @param mutation 变异
   * @param context 进化上下文
   */
  async revertMutation(mutation: EvolutionMutation, context: EvolutionContext): Promise<boolean> {
    try {
      await this.traitManager.updateTrait(
        context.userId,
        context.tenantId,
        mutation.path,
        mutation.oldValue
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取进化建议
   * @param context 进化上下文
   */
  async getSuggestions(context: EvolutionContext): Promise<string[]> {
    const suggestions: string[] = [];

    // 基于适应度建议
    if (context.currentFitness < 0.3) {
      suggestions.push('当前适应度较低，建议使用梯度优化策略');
      suggestions.push('增加探索性变异，尝试新的特质组合');
    } else if (context.currentFitness > 0.8) {
      suggestions.push('当前适应度较高，建议使用精细化优化');
      suggestions.push('减少变异强度，专注于微调');
    }

    // 基于历史建议
    if (context.historyCount < 10) {
      suggestions.push('进化历史较短，建议持续观察');
    } else if (context.historyCount > 100) {
      suggestions.push('进化历史较长，建议考虑策略切换');
    }

    return suggestions;
  }
}
