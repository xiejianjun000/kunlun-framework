/**
 * 遗传算法进化策略
 * Genetic Algorithm Evolution Strategy
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

/** 个体 */
interface Individual {
  /** 基因 */
  genes: Record<string, unknown>;
  /** 适应度 */
  fitness: number;
  /** 变异 */
  mutations: EvolutionMutation[];
}

/**
 * 遗传算法策略配置
 */
export interface GeneticStrategyConfig extends EvolutionStrategyConfig {
  /** 群体大小 */
  populationSize: number;
  /** 变异强度范围 */
  mutationStrengthRange: { min: number; max: number };
  /** 选择压力 */
  selectionPressure: number;
}

/**
 * 遗传算法进化策略
 * 使用遗传算法的变异和交叉操作
 */
export class GeneticStrategy extends EvolutionStrategy {
  private config: Required<GeneticStrategyConfig>;

  constructor(config?: Partial<GeneticStrategyConfig>) {
    const defaultConfig: GeneticStrategyConfig = {
      id: 'genetic',
      name: 'Genetic Algorithm Strategy',
      description: '使用遗传算法进行进化，包括变异、交叉和选择操作',
      maxMutations: 5,
      mutationProbability: 0.1,
      crossoverProbability: 0.7,
      eliteRatio: 0.1,
      maxIterations: 100,
      convergenceThreshold: 0.001,
      populationSize: config?.populationSize ?? 50,
      mutationStrengthRange: config?.mutationStrengthRange ?? { min: 0.01, max: 0.2 },
      selectionPressure: config?.selectionPressure ?? 2,
    };

    super(defaultConfig);
    this.config = defaultConfig as Required<GeneticStrategyConfig>;
  }

  /**
   * 执行遗传算法进化
   * @param context 策略上下文
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = Date.now();

    try {
      // 初始化种群
      const population = this.initializePopulation(context);

      // 评估种群
      this.evaluatePopulation(population, context);

      // 进化循环
      for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
        // 选择
        const parents = this.select(population);

        // 交叉
        const offspring = this.crossover(parents);

        // 变异
        this.mutate(offspring);

        // 评估
        this.evaluatePopulation(offspring, context);

        // 合并
        const newPopulation = this.merge(population, offspring);

        // 检查收敛
        if (this.checkConvergence(population, newPopulation)) {
          break;
        }

        population = newPopulation;
      }

      // 获取最佳个体
      const bestIndividual = this.getBestIndividual(population);

      // 生成变异列表
      const mutations = this.generateMutationsFromIndividual(
        bestIndividual,
        context.currentState
      );

      return {
        success: mutations.length > 0,
        newState: {
          ...context.currentState,
          fitness: bestIndividual.fitness,
        },
        mutations,
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
      {
        type: StrategyConditionType.HISTORY_LENGTH,
        params: { min: 5 },
      },
      {
        type: StrategyConditionType.ERROR_RATE,
        params: { max: 0.3 },
      },
    ];
  }

  /**
   * 初始化种群
   */
  private initializePopulation(context: StrategyContext): Individual[] {
    const population: Individual[] = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const genes = this.generateRandomGenes(context.currentState);
      population.push({
        genes,
        fitness: 0.5,
        mutations: [],
      });
    }

    return population;
  }

  /**
   * 生成随机基因
   */
  private generateRandomGenes(state: Record<string, unknown>): Record<string, unknown> {
    const genes: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(state)) {
      if (key === 'fitness') continue;

      if (typeof value === 'number') {
        // 添加随机扰动
        const range = this.config.mutationStrengthRange;
        const perturbation = range.min + Math.random() * (range.max - range.min);
        genes[key] = value * (1 + (Math.random() > 0.5 ? perturbation : -perturbation));
      } else if (typeof value === 'string') {
        // 字符串不进行随机化
        genes[key] = value;
      } else if (Array.isArray(value)) {
        // 数组进行随机采样
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
      individual.fitness = this.evaluateFitness(individual.genes, context);
    }
  }

  /**
   * 评估适应度
   */
  private evaluateFitness(
    genes: Record<string, unknown>,
    context: StrategyContext
  ): number {
    // 基于历史计算适应度
    const baseFitness = (context.currentState.fitness as number) ?? 0.5;

    // 计算基因变化带来的适应度调整
    let adjustment = 0;
    for (const [key, value] of Object.entries(genes)) {
      const originalValue = context.currentState[key];
      if (typeof value === 'number' && typeof originalValue === 'number') {
        const change = Math.abs(value - originalValue) / originalValue;
        adjustment += change * 0.1;
      }
    }

    return Math.min(1, Math.max(0, baseFitness + adjustment));
  }

  /**
   * 选择操作
   */
  private select(population: Individual[]): Individual[] {
    const selected: Individual[] = [];
    const eliteCount = Math.floor(this.config.eliteRatio * population.length);

    // 精英保留
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < eliteCount; i++) {
      selected.push({ ...sorted[i] });
    }

    // 锦标赛选择
    const tournamentSize = Math.max(2, Math.floor(this.config.selectionPressure));
    while (selected.length < this.config.populationSize) {
      const tournament = this.tournamentSelect(population, tournamentSize);
      selected.push({ ...tournament });
    }

    return selected;
  }

  /**
   * 锦标赛选择
   */
  private tournamentSelect(
    population: Individual[],
    tournamentSize: number
  ): Individual {
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
        offspring.push({ ...parents[i] }, { ...parents[i + 1] });
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
      return { ...parent1, genes: { ...parent1.genes } };
    }

    // 选择两个交叉点
    const point1 = Math.floor(Math.random() * keys.length);
    let point2 = Math.floor(Math.random() * keys.length);
    while (point2 === point1) {
      point2 = Math.floor(Math.random() * keys.length);
    }

    const [start, end] = point1 < point2 ? [point1, point2] : [point2, point1];

    // 交叉基因
    for (let i = 0; i < keys.length; i++) {
      if (i >= start && i <= end) {
        childGenes[keys[i]] = parent2.genes[keys[i]];
      } else {
        childGenes[keys[i]] = parent1.genes[keys[i]];
      }
    }

    return {
      genes: childGenes,
      fitness: 0,
      mutations: [],
    };
  }

  /**
   * 变异操作
   */
  private mutate(offspring: Individual[]): void {
    for (const individual of offspring) {
      for (const key of Object.keys(individual.genes)) {
        if (Math.random() < this.config.mutationProbability) {
          const originalValue = individual.genes[key];
          individual.genes[key] = this.mutateGene(originalValue);
        }
      }
    }
  }

  /**
   * 变异基因
   */
  private mutateGene(value: unknown): unknown {
    const range = this.config.mutationStrengthRange;

    if (typeof value === 'number') {
      const strength = range.min + Math.random() * (range.max - range.min);
      const direction = Math.random() > 0.5 ? 1 : -1;
      return value * (1 + direction * strength);
    } else if (Array.isArray(value)) {
      // 随机交换元素
      const newArray = [...value];
      const idx1 = Math.floor(Math.random() * newArray.length);
      const idx2 = Math.floor(Math.random() * newArray.length);
      [newArray[idx1], newArray[idx2]] = [newArray[idx2], newArray[idx1]];
      return newArray;
    }

    return value;
  }

  /**
   * 合并种群
   */
  private merge(
    population: Individual[],
    offspring: Individual[]
  ): Individual[] {
    const combined = [...population, ...offspring];
    combined.sort((a, b) => b.fitness - a.fitness);
    return combined.slice(0, this.config.populationSize);
  }

  /**
   * 检查收敛
   */
  private checkConvergence(
    oldPopulation: Individual[],
    newPopulation: Individual[]
  ): boolean {
    const oldBest = this.getBestIndividual(oldPopulation);
    const newBest = this.getBestIndividual(newPopulation);

    return Math.abs(newBest.fitness - oldBest.fitness) < this.config.convergenceThreshold;
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
   * 从最佳个体生成变异
   */
  private generateMutationsFromIndividual(
    individual: Individual,
    originalState: Record<string, unknown>
  ): EvolutionMutation[] {
    const mutations: EvolutionMutation[] = [];

    for (const [key, value] of Object.entries(individual.genes)) {
      const originalValue = originalState[key];

      if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
        mutations.push(
          this.createMutation(
            this.determineMutationType(key),
            key,
            originalValue,
            value,
            0.1
          )
        );
      }
    }

    return mutations.slice(0, this.config.maxMutations);
  }

  /**
   * 确定变异类型
   */
  private determineMutationType(path: string): MutationType {
    if (path.includes('trait')) {
      return MutationType.TRAIT;
    } else if (path.includes('behavior')) {
      return MutationType.BEHAVIOR;
    } else if (path.includes('strategy')) {
      return MutationType.STRATEGY;
    } else if (path.includes('param')) {
      return MutationType.PARAMETER;
    }
    return MutationType.RULE;
  }
}
