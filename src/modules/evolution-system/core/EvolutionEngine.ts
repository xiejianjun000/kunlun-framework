/**
 * 进化引擎 - LLM增强版
 * Evolution Engine - Core evolution logic with LLM enhancement
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
import { LLMEnhancedGeneticStrategy } from '../strategies/GeneticStrategy';
import { LLMEnhancedReinforcementStrategy } from '../strategies/ReinforcementStrategy';
import { LLMEnhancedGradientStrategy } from '../strategies/GradientStrategy';
import { IEvolutionStrategy } from '../interfaces';
import { TraitManager } from '../traits/TraitManager';
import { TraitMutator } from '../traits/TraitMutator';
import { TraitValidator } from '../traits/TraitValidator';
import { LLMOptimizer } from './LLMOptimizer';

// ============== 类型定义 ==============

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
  /** LLM优化器 */
  llmOptimizer?: LLMOptimizer;
}

/** 进化统计 */
export interface EvolutionStats {
  totalEvolutions: number;
  successfulEvolutions: number;
  averageFitnessImprovement: number;
  llmEnhancementUsage: number;
  strategyUsage: Record<string, number>;
}

// ============== 进化引擎实现 ==============

/**
 * 进化引擎
 * 负责执行核心进化逻辑，支持LLM增强
 */
export class EvolutionEngine {
  private readonly strategies: Map<string, IEvolutionStrategy>;
  private readonly traitManager: TraitManager;
  private readonly traitMutator: TraitMutator;
  private readonly traitValidator: TraitValidator;
  private readonly llmOptimizer: LLMOptimizer;
  private defaultStrategy: IEvolutionStrategy;

  // 进化统计
  private stats: EvolutionStats = {
    totalEvolutions: 0,
    successfulEvolutions: 0,
    averageFitnessImprovement: 0,
    llmEnhancementUsage: 0,
    strategyUsage: {},
  };

  /**
   * 构造函数
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

    // 初始化LLM优化器
    this.llmOptimizer = config?.llmOptimizer ?? new LLMOptimizer();

    // 注册LLM增强的策略
    this.registerStrategy(new LLMEnhancedGeneticStrategy());
    this.registerStrategy(new LLMEnhancedReinforcementStrategy());
    this.registerStrategy(new LLMEnhancedGradientStrategy());

    // 设置默认策略
    this.defaultStrategy = this.strategies.get('genetic-llm')!;
  }

  /**
   * 注册进化策略
   */
  registerStrategy(strategy: IEvolutionStrategy): void {
    this.strategies.set(strategy.id, strategy);
    this.stats.strategyUsage[strategy.id] = 0;
  }

  /**
   * 注销进化策略
   */
  unregisterStrategy(strategyId: string): boolean {
    if (this.strategies.delete(strategyId)) {
      delete this.stats.strategyUsage[strategyId];
      return true;
    }
    return false;
  }

  /**
   * 获取所有策略
   */
  getStrategies(): IEvolutionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 设置默认策略
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
   */
  async evolve(
    context: EvolutionContext,
    rewards: { type: RewardType; value: number }[],
    options?: EvolutionOptions
  ): Promise<EvolutionResult> {
    const startTime = Date.now();

    try {
      // 1. 选择策略
      const strategy = await this.selectStrategyWithLLM(context, options);

      // 2. 构建策略上下文
      const strategyContext = await this.buildStrategyContext(context, options);

      // 3. LLM预分析
      const llmAnalysis = await this.performLLMPreAnalysis(strategyContext);

      // 4. 执行策略
      const strategyResult = await strategy.execute(strategyContext);

      // 5. LLM后优化
      const optimizedResult = await this.performLLMPostOptimization(strategyResult, strategyContext);

      // 6. 应用变异
      const mutations = await this.applyMutations(optimizedResult, context);

      // 7. LLM变异验证
      const validatedMutations = await this.validateMutationsWithLLM(mutations, strategyContext);

      // 8. 计算新适应度
      const newFitness = this.calculateFitness(context, rewards, validatedMutations);

      // 9. 计算改进幅度
      const improvement = newFitness - context.currentFitness;

      // 10. 更新统计
      this.updateStats(strategy.id, improvement, llmAnalysis.used);

      return {
        success: validatedMutations.length > 0 || improvement > 0,
        fitnessScore: newFitness,
        improvement,
        mutations: validatedMutations,
        executionTime: Date.now() - startTime,
        evolutionId: '', // 由调用方填充
      };
    } catch (error) {
      return {
        success: false,
        fitnessScore: context.currentFitness,
        improvement: 0,
        mutations: [],
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        evolutionId: '',
      };
    }
  }

  /**
   * LLM增强策略选择
   */
  private async selectStrategyWithLLM(
    context: EvolutionContext,
    options?: EvolutionOptions
  ): Promise<IEvolutionStrategy> {
    // 如果明确指定了策略，使用指定策略
    if (options?.metadata?.strategyId) {
      const specifiedStrategy = this.strategies.get(options.metadata.strategyId as string);
      if (specifiedStrategy) {
        return specifiedStrategy;
      }
    }

    // 基于历史选择策略
    if (context.historyCount > 50 && this.strategies.has('reinforcement-llm')) {
      return this.strategies.get('reinforcement-llm')!;
    }

    // 基于适应度选择策略
    if (context.currentFitness < 0.3 && this.strategies.has('gradient-llm')) {
      return this.strategies.get('gradient-llm')!;
    }

    // LLM推荐策略
    if (this.llmOptimizer.isAvailable()) {
      try {
        const availableStrategies = Array.from(this.strategies.values()).map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
        }));

        // 构建简化的上下文用于策略推荐
        const simplifiedContext = {
          currentState: { fitness: context.currentFitness },
          params: {},
          constraints: context.constraints,
          history: context.evolutionHistory ?? [],
        } as unknown as StrategyContext;

        const recommendedId = await this.llmOptimizer.recommendStrategy(simplifiedContext, availableStrategies);
        const recommendedStrategy = this.strategies.get(recommendedId);
        if (recommendedStrategy) {
          return recommendedStrategy;
        }
      } catch (error) {
        console.error('LLM strategy recommendation failed:', error);
      }
    }

    // 默认使用遗传策略
    return this.defaultStrategy;
  }

  /**
   * 构建策略上下文
   */
  private async buildStrategyContext(
    context: EvolutionContext,
    options?: EvolutionOptions
  ): Promise<StrategyContext> {
    const currentState = await this.traitManager.getTraits(context.userId, context.tenantId);

    return {
      currentState: {
        ...currentState,
        fitness: context.currentFitness,
      },
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
   * LLM预分析
   */
  private async performLLMPreAnalysis(context: StrategyContext): Promise<{
    used: boolean;
    suggestions?: unknown;
  }> {
    if (!this.llmOptimizer.isAvailable()) {
      return { used: false };
    }

    try {
      const suggestions = await this.llmOptimizer.generateMutationSuggestions(context);
      return {
        used: true,
        suggestions,
      };
    } catch (error) {
      console.error('LLM pre-analysis failed:', error);
      return { used: false };
    }
  }

  /**
   * LLM后优化
   */
  private async performLLMPostOptimization(
    result: StrategyResult,
    strategyContext: StrategyContext
  ): Promise<StrategyResult> {
    if (!this.llmOptimizer.isAvailable() || result.mutations.length === 0) {
      return result;
    }

    try {
      // 评估变异效果
      const evaluations = await this.llmOptimizer.evaluateMutationEffects(
        result.mutations,
        strategyContext
      );

      // 过滤低质量变异
      const filteredMutations = result.mutations.filter((mutation, index) => {
        const evaluation = evaluations[index];
        return evaluation?.recommended !== false;
      });

      // 预测新适应度
      const prediction = await this.llmOptimizer.predictFitness(
        result.newState.fitness as number ?? 0.5,
        strategyContext,
        filteredMutations
      );

      return {
        ...result,
        mutations: filteredMutations,
        newState: {
          ...result.newState,
          fitness: prediction.predictedFitness,
        },
      };
    } catch (error) {
      console.error('LLM post-optimization failed:', error);
      return result;
    }
  }

  /**
   * 应用变异
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
   * LLM变异验证
   */
  private async validateMutationsWithLLM(
    mutations: EvolutionMutation[],
    strategyContext: StrategyContext
  ): Promise<EvolutionMutation[]> {
    if (!this.llmOptimizer.isAvailable() || mutations.length === 0) {
      // 使用标准验证
      return this.validateMutations(mutations, strategyContext);
    }

    try {
      const evaluations = await this.llmOptimizer.evaluateMutationEffects(mutations, strategyContext);

      const validatedMutations: EvolutionMutation[] = [];
      for (let i = 0; i < mutations.length; i++) {
        const evaluation = evaluations[i];
        if (evaluation?.recommended !== false && evaluation?.riskLevel !== 'high') {
          mutations[i].validated = true;
          validatedMutations.push(mutations[i]);
        }
      }

      return validatedMutations;
    } catch (error) {
      console.error('LLM mutation validation failed:', error);
      return this.validateMutations(mutations, strategyContext);
    }
  }

  /**
   * 标准变异验证
   */
  private async validateMutations(
    mutations: EvolutionMutation[],
    strategyContext: StrategyContext
  ): Promise<EvolutionMutation[]> {
    const validatedMutations: EvolutionMutation[] = [];

    for (const mutation of mutations) {
      // 使用strategyContext中的constraints进行验证
      const mockContext = {
        userId: '',
        tenantId: '',
        currentFitness: strategyContext.currentState.fitness as number ?? 0.5,
        direction: strategyContext.params.direction as any ?? 'balanced',
        constraints: strategyContext.constraints,
        historyCount: strategyContext.history.length,
        metadata: {},
      };
      const isValid = await this.traitValidator.validate(mutation, mockContext);
      if (isValid) {
        mutation.validated = true;
        validatedMutations.push(mutation);
      }
    }

    return validatedMutations;
  }

  /**
   * 计算适应度
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

    // LLM增强调整
    let llmAdjustment = 0;
    if (this.llmOptimizer.isAvailable() && mutations.length > 0) {
      // 假设LLM验证通过的变异有正向加成
      const validatedRatio = mutations.filter(m => m.validated).length / mutations.length;
      llmAdjustment = validatedRatio * 0.05;
    }

    // 新适应度 = 当前适应度 + 奖励 + 变异贡献 + LLM调整
    let newFitness = context.currentFitness + totalReward + mutationContribution + llmAdjustment;

    // 确保适应度在有效范围内
    newFitness = Math.max(0, Math.min(1, newFitness));

    return newFitness;
  }

  /**
   * 更新统计
   */
  private updateStats(strategyId: string, improvement: number, llmUsed: boolean): void {
    this.stats.totalEvolutions++;
    if (improvement > 0) {
      this.stats.successfulEvolutions++;
    }

    // 更新平均改进
    const n = this.stats.totalEvolutions;
    this.stats.averageFitnessImprovement =
      (this.stats.averageFitnessImprovement * (n - 1) + improvement) / n;

    // 更新策略使用统计
    this.stats.strategyUsage[strategyId] = (this.stats.strategyUsage[strategyId] ?? 0) + 1;

    // 更新LLM使用统计
    if (llmUsed) {
      const total = this.stats.totalEvolutions;
      this.stats.llmEnhancementUsage =
        (this.stats.llmEnhancementUsage * (total - 1) + 1) / total;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): EvolutionStats {
    return { ...this.stats };
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

  /**
   * 执行单步进化
   */
  async evolveStep(context: EvolutionContext): Promise<EvolutionMutation | null> {
    const currentState = await this.traitManager.getTraits(context.userId, context.tenantId);

    // 生成单个变异
    const mutations = await this.llmOptimizer.generateMutationSuggestions({
      currentState: { ...currentState, fitness: context.currentFitness },
      targetState: context.targetFitness ? { fitness: context.targetFitness } : undefined,
      params: { maxMutations: 1, mutationProbability: 1.0, direction: context.direction },
      constraints: context.constraints,
      history: context.evolutionHistory ?? [],
    });

    if (mutations.mutations && mutations.mutations.length > 0) {
      const mutation = mutations.mutations[0];
      return {
        mutationId: `step_${Date.now()}`,
        type: mutation.type as MutationType ?? MutationType.TRAIT,
        path: mutation.path ?? '',
        oldValue: currentState[mutation.path ?? ''] ?? null,
        newValue: mutation.newValue ?? null,
        strength: mutation.strength ?? 0.5,
        validated: false,
      };
    }

    return null;
  }
}
