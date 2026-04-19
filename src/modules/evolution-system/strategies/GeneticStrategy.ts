/**
 * 遗传算法进化策略 - LLM增强版
 * Genetic Algorithm Evolution Strategy with LLM Enhancement
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

/** 个体 */
interface Individual {
  /** 基因 */
  genes: Record<string, unknown>;
  /** 适应度 */
  fitness: number;
  /** 变异 */
  mutations: EvolutionMutation[];
  /** 来源 */
  source: 'random' | 'llm' | 'crossover';
}

/** LLM增强遗传策略配置 */
export interface LLMEnhancedGeneticConfig extends EvolutionStrategyConfig {
  /** 群体大小 */
  populationSize: number;
  /** LLM生成的个体比例 */
  llmGeneratedRatio: number;
  /** 变异强度范围 */
  mutationStrengthRange: { min: number; max: number };
  /** 选择压力 */
  selectionPressure: number;
  /** 精英保留数量 */
  elitePreserveCount: number;
  /** 是否启用LLM增强 */
  llmEnhancementEnabled: boolean;
}

// ============== 遗传策略实现 ==============

/**
 * LLM增强遗传算法策略
 * 结合遗传算法和LLM优化进行进化
 */
export class LLMEnhancedGeneticStrategy extends EvolutionStrategy {
  declare protected config: Required<LLMEnhancedGeneticConfig>;
  private llmOptimizer: LLMOptimizer;

  constructor(config?: Partial<LLMEnhancedGeneticConfig>) {
    const defaultConfig: LLMEnhancedGeneticConfig = {
      id: 'genetic-llm',
      name: 'LLM-Enhanced Genetic Strategy',
      description: '结合遗传算法和LLM优化的进化策略，使用LLM生成高质量变异',
      maxMutations: 5,
      mutationProbability: 0.1,
      crossoverProbability: 0.7,
      eliteRatio: 0.1,
      maxIterations: 100,
      convergenceThreshold: 0.001,
      populationSize: config?.populationSize ?? 50,
      llmGeneratedRatio: config?.llmGeneratedRatio ?? 0.2,
      mutationStrengthRange: config?.mutationStrengthRange ?? { min: 0.01, max: 0.2 },
      selectionPressure: config?.selectionPressure ?? 2,
      elitePreserveCount: config?.elitePreserveCount ?? 5,
      llmEnhancementEnabled: config?.llmEnhancementEnabled ?? true,
    };

    super(defaultConfig);
    this.config = defaultConfig as Required<LLMEnhancedGeneticConfig>;
    this.llmOptimizer = new LLMOptimizer();
  }

  /**
   * 执行LLM增强遗传算法进化
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = Date.now();

    try {
      // 1. 初始化种群
      let population = await this.initializePopulation(context);

      // 2. 评估种群
      this.evaluatePopulation(population, context);

      // 3. 进化循环
      let bestFitness = this.getBestFitness(population);
      for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
        // 选择
        const parents = this.select(population);

        // 交叉
        const offspring = this.crossover(parents);

        // 变异（包含LLM增强变异）
        await this.mutateWithLLM(offspring, context);

        // 评估
        this.evaluatePopulation(offspring, context);

        // 合并
        const newPopulation = this.merge(population, offspring);

        // 检查收敛
        const currentBestFitness = this.getBestFitness(newPopulation);
        if (Math.abs(currentBestFitness - bestFitness) < this.config.convergenceThreshold) {
          population = newPopulation;
          break;
        }

        population = newPopulation;
        bestFitness = currentBestFitness;
      }

      // 4. 获取最佳个体
      const bestIndividual = this.getBestIndividual(population);

      // 5. 使用LLM优化最终变异
      const optimizedMutations = await this.optimizeWithLLM(bestIndividual, context);

      return {
        success: optimizedMutations.length > 0,
        newState: {
          ...context.currentState,
          fitness: bestIndividual.fitness,
        },
        mutations: optimizedMutations,
        fitnessDelta: bestIndividual.fitness - ((context.currentState.fitness as number) ?? 0.5),
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
      { type: StrategyConditionType.HISTORY_LENGTH, params: { min: 5 } },
      { type: StrategyConditionType.ERROR_RATE, params: { max: 0.3 } },
    ];
  }

  /**
   * 初始化种群
   */
  private async initializePopulation(context: StrategyContext): Promise<Individual[]> {
    const population: Individual[] = [];

    // 添加当前最优个体
    population.push({
      genes: { ...context.currentState },
      fitness: (context.currentState.fitness as number) ?? 0.5,
      mutations: [],
      source: 'random',
    });

    // 生成随机个体
    const randomCount = this.config.populationSize - 1;
    for (let i = 0; i < randomCount; i++) {
      const genes = this.generateRandomGenes(context.currentState);
      population.push({
        genes,
        fitness: 0.5,
        mutations: [],
        source: 'random',
      });
    }

    // LLM生成高质量个体
    if (this.config.llmEnhancementEnabled && this.llmOptimizer.isAvailable()) {
      const llmCount = Math.ceil(this.config.populationSize * this.config.llmGeneratedRatio);
      const llmIndividuals = await this.generateLLMIndividuals(llmCount, context);
      population.push(...llmIndividuals);
    }

    return population.slice(0, this.config.populationSize);
  }

  /**
   * 使用LLM生成个体
   */
  private async generateLLMIndividuals(
    count: number,
    context: StrategyContext
  ): Promise<Individual[]> {
    const individuals: Individual[] = [];

    try {
      const suggestion = await this.llmOptimizer.generateMutationSuggestions(context);

      if (suggestion.type === 'mutation' && suggestion.mutations) {
        // 基于LLM建议创建个体
        for (let i = 0; i < count; i++) {
          const genes = { ...context.currentState };
          const mutations: EvolutionMutation[] = [];

          for (const mutation of suggestion.mutations) {
            if (mutation.path && mutation.newValue !== undefined) {
              genes[mutation.path] = mutation.newValue;
              mutations.push({
                mutationId: `llm_${Date.now()}_${i}`,
                type: mutation.type as MutationType ?? MutationType.TRAIT,
                path: mutation.path,
                oldValue: context.currentState[mutation.path],
                newValue: mutation.newValue,
                strength: mutation.strength ?? 0.5,
                validated: false,
              });
            }
          }

          individuals.push({
            genes,
            fitness: 0.6, // 初始较高适应度假设
            mutations,
            source: 'llm',
          });
        }
      }
    } catch (error) {
      console.error('LLM individual generation failed:', error);
    }

    return individuals;
  }

  /**
   * 生成随机基因
   */
  private generateRandomGenes(state: Record<string, unknown>): Record<string, unknown> {
    const genes: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(state)) {
      if (key === 'fitness') continue;

      if (typeof value === 'number') {
        const range = this.config.mutationStrengthRange;
        const perturbation = range.min + Math.random() * (range.max - range.min);
        genes[key] = value * (1 + (Math.random() > 0.5 ? perturbation : -perturbation));
      } else if (Array.isArray(value)) {
        const shuffled = [...value].sort(() => Math.random() - 0.5);
        genes[key] = shuffled.slice(0, Math.ceil(shuffled.length / 2));
      } else {
        genes[key] = value;
      }
    }

    return genes;
  }

  /**
   * 评估种群
   */
  private evaluatePopulation(
    population: Individual[],
    context: StrategyContext
  ): void {
    for (const individual of population) {
      if (individual.fitness === 0.5) { // 只评估未评估的
        individual.fitness = this.evaluateFitness(individual.genes, context);
      }
    }
  }

  /**
   * 评估适应度
   */
  private evaluateFitness(
    genes: Record<string, unknown>,
    context: StrategyContext
  ): number {
    const baseFitness = (context.currentState.fitness as number) ?? 0.5;
    let adjustment = 0;

    for (const [key, value] of Object.entries(genes)) {
      const originalValue = context.currentState[key];
      if (typeof value === 'number' && typeof originalValue === 'number') {
        const change = Math.abs(value - originalValue) / Math.max(1, Math.abs(originalValue));
        adjustment += change * 0.1;
      }
    }

    // LLM生成的个体给予适度加成
    const llmBonus = genes['_llmGenerated'] ? 0.05 : 0;

    return Math.min(1, Math.max(0, baseFitness + adjustment + llmBonus));
  }

  /**
   * 选择操作
   */
  private select(population: Individual[]): Individual[] {
    const selected: Individual[] = [];

    // 精英保留
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < this.config.elitePreserveCount && i < sorted.length; i++) {
      selected.push({ ...sorted[i], genes: { ...sorted[i].genes } });
    }

    // 锦标赛选择
    const tournamentSize = Math.max(2, Math.floor(this.config.selectionPressure));
    while (selected.length < this.config.populationSize) {
      const tournament = this.tournamentSelect(population, tournamentSize);
      selected.push({ ...tournament, genes: { ...tournament.genes } });
    }

    return selected;
  }

  /**
   * 锦标赛选择
   */
  private tournamentSelect(population: Individual[], tournamentSize: number): Individual {
    let best: Individual | null = null;

    for (let i = 0; i < tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }

    return best!;
  }

  /**
   * 交叉操作
   */
  private crossover(parents: Individual[]): Individual[] {
    const offspring: Individual[] = [];

    for (let i = 0; i < parents.length - 1; i += 2) {
      if (Math.random() < this.config.crossoverProbability) {
        const child1 = this.crossoverTwoPoint(parents[i], parents[i + 1]);
        const child2 = this.crossoverTwoPoint(parents[i + 1], parents[i]);
        offspring.push(child1, child2);
      } else {
        offspring.push(
          { ...parents[i], genes: { ...parents[i].genes } },
          { ...parents[i + 1], genes: { ...parents[i + 1].genes } }
        );
      }
    }

    return offspring;
  }

  /**
   * 两点交叉
   */
  private crossoverTwoPoint(parent1: Individual, parent2: Individual): Individual {
    const childGenes: Record<string, unknown> = {};
    const keys = Object.keys(parent1.genes);

    if (keys.length < 2) {
      return { ...parent1, genes: { ...parent1.genes }, source: 'crossover' };
    }

    const point1 = Math.floor(Math.random() * keys.length);
    const point2 = point1 + Math.floor(Math.random() * (keys.length - point1));

    for (let i = 0; i < keys.length; i++) {
      if (i >= point1 && i < point2) {
        childGenes[keys[i]] = parent2.genes[keys[i]];
      } else {
        childGenes[keys[i]] = parent1.genes[keys[i]];
      }
    }

    return {
      genes: childGenes,
      fitness: 0.5,
      mutations: [],
      source: 'crossover',
    };
  }

  /**
   * 变异操作
   */
  private mutate(population: Individual[]): void {
    for (const individual of population) {
      if (individual.source === 'llm') continue; // LLM生成的个体不再次变异

      if (Math.random() < this.config.mutationProbability) {
        const keys = Object.keys(individual.genes);
        if (keys.length > 0) {
          const key = keys[Math.floor(Math.random() * keys.length)];
          const value = individual.genes[key];

          if (typeof value === 'number') {
            const range = this.config.mutationStrengthRange;
            const mutationStrength = range.min + Math.random() * (range.max - range.min);
            individual.genes[key] = value * (1 + (Math.random() > 0.5 ? mutationStrength : -mutationStrength));
          }
        }
      }
    }
  }

  /**
   * 带LLM增强的变异
   */
  private async mutateWithLLM(population: Individual[], context: StrategyContext): Promise<void> {
    // 首先进行常规变异
    this.mutate(population);

    // LLM增强：如果可用，生成高质量变异
    if (!this.config.llmEnhancementEnabled || !this.llmOptimizer.isAvailable()) {
      return;
    }

    try {
      // 选择部分个体进行LLM增强
      const candidateCount = Math.ceil(population.length * 0.3);
      for (let i = 0; i < candidateCount; i++) {
        const individual = population[Math.floor(Math.random() * population.length)];
        if (individual.source === 'llm') continue;

        const suggestion = await this.llmOptimizer.generateMutationSuggestions(context);

        if (suggestion.mutations && suggestion.confidence > 0.6) {
          for (const mutation of suggestion.mutations.slice(0, 2)) {
            if (mutation.path && mutation.newValue !== undefined) {
              individual.genes[mutation.path] = mutation.newValue;
              individual.source = 'llm';
            }
          }
        }
      }
    } catch (error) {
      console.error('LLM mutation enhancement failed:', error);
    }
  }

  /**
   * 合并种群
   */
  private merge(population: Individual[], offspring: Individual[]): Individual[] {
    const combined = [...population, ...offspring];
    return combined
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, this.config.populationSize);
  }

  /**
   * 获取最佳适应度
   */
  private getBestFitness(population: Individual[]): number {
    return Math.max(...population.map(p => p.fitness), 0);
  }

  /**
   * 获取最佳个体
   */
  private getBestIndividual(population: Individual[]): Individual {
    return population.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * 使用LLM优化最终变异
   */
  private async optimizeWithLLM(
    bestIndividual: Individual,
    context: StrategyContext
  ): Promise<EvolutionMutation[]> {
    const mutations: EvolutionMutation[] = [];

    // 如果LLM可用，进一步优化
    if (this.llmOptimizer.isAvailable()) {
      try {
        // 评估当前最佳个体的变异效果
        const evaluations = await this.llmOptimizer.evaluateMutationEffects(
          bestIndividual.mutations,
          context
        );

        // 只保留LLM推荐的变异
        for (const evaluation of evaluations) {
          if (evaluation.recommended) {
            const original = bestIndividual.mutations.find(
              m => m.mutationId === evaluation.mutationId
            );
            if (original) {
              mutations.push(original);
            }
          }
        }

        // 如果LLM评估没有通过，生成新变异
        if (mutations.length === 0 && bestIndividual.source !== 'random') {
          const suggestion = await this.llmOptimizer.generateMutationSuggestions(context);
          if (suggestion.mutations) {
            mutations.push(...suggestion.mutations.map((m, i) => ({
              mutationId: `opt_${Date.now()}_${i}`,
              type: m.type as MutationType ?? MutationType.TRAIT,
              path: m.path ?? '',
              oldValue: context.currentState[m.path ?? ''] ?? null,
              newValue: m.newValue ?? null,
              strength: m.strength ?? 0.5,
              validated: false,
            })));
          }
        }
      } catch (error) {
        console.error('LLM optimization failed:', error);
      }
    }

    // 回退：直接使用最佳个体的变异
    if (mutations.length === 0 && bestIndividual.mutations.length > 0) {
      mutations.push(...bestIndividual.mutations);
    }

    return mutations.slice(0, this.config.maxMutations);
  }
}

// 保持向后兼容
export { LLMEnhancedGeneticStrategy as GeneticStrategy };
