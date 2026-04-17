/**
 * 特质变异器
 * Trait Mutator - Generates and applies mutations to traits
 */

import {
  EvolutionMutation,
  MutationType,
  EvolutionContext,
} from '../interfaces';
import {
  TraitMutation,
  TraitMutationType,
  TraitConstraint,
} from './types';

/** 变异器配置 */
export interface TraitMutatorConfig {
  /** 默认变异概率 */
  mutationProbability: number;
  /** 默认变异强度 */
  mutationStrength: number;
  /** 变异强度范围 */
  strengthRange: { min: number; max: number };
  /** 是否使用高斯变异 */
  useGaussianMutation: boolean;
  /** 最大变异数量 */
  maxMutations: number;
}

/**
 * 特质变异器
 * 负责生成和应用特质变异
 */
export class TraitMutator {
  private config: Required<TraitMutatorConfig>;

  constructor(config?: Partial<TraitMutatorConfig>) {
    this.config = {
      mutationProbability: config?.mutationProbability ?? 0.1,
      mutationStrength: config?.mutationStrength ?? 0.1,
      strengthRange: config?.strengthRange ?? { min: 0.01, max: 0.3 },
      useGaussianMutation: config?.useGaussianMutation ?? true,
      maxMutations: config?.maxMutations ?? 5,
    };
  }

  /**
   * 生成变异
   * @param state 当前状态
   * @param options 变异选项
   */
  generateMutation(
    state: Record<string, unknown>,
    options?: {
      maxStrength?: number;
      type?: MutationType;
      path?: string;
    }
  ): EvolutionMutation | null {
    // 找到可以变异的数值属性
    const numericKeys = Object.entries(state).filter(
      ([, value]) => typeof value === 'number'
    );

    if (numericKeys.length === 0) {
      return null;
    }

    // 随机选择属性
    const [path, oldValue] = numericKeys[Math.floor(Math.random() * numericKeys.length)];

    // 生成新值
    const strength = options?.maxStrength ?? this.config.mutationStrength;
    const newValue = this.mutateValue(
      oldValue as number,
      strength,
      options?.type === MutationType.TRAIT ? TraitMutationType.GAUSSIAN : TraitMutationType.UNIFORM
    );

    return {
      mutationId: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: options?.type ?? MutationType.TRAIT,
      path: options?.path ?? path,
      oldValue,
      newValue,
      strength,
      validated: false,
    };
  }

  /**
   * 应用变异
   * @param mutation 变异
   * @param context 上下文
   */
  async apply(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): Promise<EvolutionMutation | null> {
    // 生成实际的新值
    const newValue = this.mutateValue(
      mutation.oldValue as number,
      mutation.strength,
      this.selectMutationType()
    );

    return {
      ...mutation,
      newValue,
    };
  }

  /**
   * 批量生成变异
   * @param state 当前状态
   * @param constraints 约束
   * @param maxCount 最大数量
   */
  generateMutations(
    state: Record<string, unknown>,
    constraints: TraitConstraint[],
    maxCount?: number
  ): EvolutionMutation[] {
    const mutations: EvolutionMutation[] = [];
    const count = maxCount ?? this.config.maxMutations;

    for (let i = 0; i < count; i++) {
      if (Math.random() > this.config.mutationProbability) {
        continue;
      }

      const mutation = this.generateMutation(state);
      if (mutation && this.validateMutationConstraints(mutation, constraints)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }

  /**
   * 验证变异约束
   * @param mutation 变异
   * @param constraints 约束列表
   */
  private validateMutationConstraints(
    mutation: EvolutionMutation,
    constraints: TraitConstraint[]
  ): boolean {
    const constraint = constraints.find(c => c.traitName === mutation.path);

    if (!constraint) {
      return true;
    }

    const value = mutation.newValue as number;

    if (value < constraint.min || value > constraint.max) {
      if (constraint.strict) {
        return false;
      }
      // 修正到边界
      mutation.newValue = Math.max(constraint.min, Math.min(constraint.max, value));
    }

    return true;
  }

  /**
   * 变异数值
   * @param value 原始值
   * @param strength 强度
   * @param type 变异类型
   */
  private mutateValue(
    value: number,
    strength: number,
    type: TraitMutationType
  ): number {
    switch (type) {
      case TraitMutationType.GAUSSIAN:
        return this.gaussianMutation(value, strength);

      case TraitMutationType.UNIFORM:
        return this.uniformMutation(value, strength);

      case TraitMutationType.BOUNDED:
        return this.boundedMutation(value, strength);

      case TraitMutationType.POLYNOMIAL:
        return this.polynomialMutation(value, strength);

      case TraitMutationType.ADAPTIVE:
        return this.adaptiveMutation(value, strength);

      default:
        return this.gaussianMutation(value, strength);
    }
  }

  /**
   * 高斯变异
   */
  private gaussianMutation(value: number, strength: number): number {
    // Box-Muller 变换生成高斯分布随机数
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    const delta = z * strength;
    return Math.max(0, Math.min(1, value + delta));
  }

  /**
   * 均匀变异
   */
  private uniformMutation(value: number, strength: number): number {
    const delta = (Math.random() - 0.5) * 2 * strength;
    return Math.max(0, Math.min(1, value + delta));
  }

  /**
   * 有界变异
   */
  private boundedMutation(value: number, strength: number): number {
    const delta = (Math.random() - 0.5) * 2 * strength;
    let newValue = value + delta;

    // 如果超出边界，以一定概率反弹
    if (newValue < 0 || newValue > 1) {
      newValue = value - delta * 0.5;
    }

    return Math.max(0, Math.min(1, newValue));
  }

  /**
   * 多项式变异
   */
  private polynomialMutation(value: number, strength: number): number {
    const eta = 20; // 多项式分布参数
    const u = Math.random();
    const delta = u < 0.5
      ? Math.pow(2 * u, 1 / (eta + 1)) - 1
      : 1 - Math.pow(2 * (1 - u), 1 / (eta + 1));

    const newValue = value + delta * strength;
    return Math.max(0, Math.min(1, newValue));
  }

  /**
   * 自适应变异
   */
  private adaptiveMutation(value: number, strength: number): number {
    // 根据当前值自适应调整变异方向和强度
    let adaptiveStrength = strength;

    // 如果值接近边界，增加向中心方向的变异概率
    if (value < 0.2 || value > 0.8) {
      adaptiveStrength *= 0.8;
    }

    // 如果值在中间区域，可以进行较大幅度的变异
    if (value > 0.4 && value < 0.6) {
      adaptiveStrength *= 1.2;
    }

    return this.gaussianMutation(value, Math.min(adaptiveStrength, this.config.strengthRange.max));
  }

  /**
   * 选择变异类型
   */
  private selectMutationType(): TraitMutationType {
    const types = Object.values(TraitMutationType);

    if (this.config.useGaussianMutation) {
      // 70% 高斯，30% 其他
      return Math.random() < 0.7
        ? TraitMutationType.GAUSSIAN
        : types[Math.floor(Math.random() * types.length)];
    }

    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * 计算变异信息
   * @param mutations 变异列表
   */
  calculateMutationInfo(mutations: EvolutionMutation[]): {
    totalMutations: number;
    avgStrength: number;
    strengthDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
  } {
    const typeDistribution: Record<string, number> = {};
    let totalStrength = 0;
    const strengthDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    for (const mutation of mutations) {
      totalStrength += mutation.strength;

      // 统计类型
      typeDistribution[mutation.type] = (typeDistribution[mutation.type] || 0) + 1;

      // 统计强度分布
      if (mutation.strength < 0.1) {
        strengthDistribution.low++;
      } else if (mutation.strength < 0.2) {
        strengthDistribution.medium++;
      } else {
        strengthDistribution.high++;
      }
    }

    return {
      totalMutations: mutations.length,
      avgStrength: mutations.length > 0 ? totalStrength / mutations.length : 0,
      strengthDistribution,
      typeDistribution,
    };
  }

  /**
   * 反转变异
   * @param mutation 变异
   */
  reverseMutation(mutation: EvolutionMutation): EvolutionMutation {
    return {
      ...mutation,
      mutationId: `rev_${mutation.mutationId}`,
      oldValue: mutation.newValue,
      newValue: mutation.oldValue,
    };
  }

  /**
   * 合并变异
   * @param mutations 变异列表
   */
  mergeMutations(mutations: EvolutionMutation[]): Map<string, EvolutionMutation> {
    const merged = new Map<string, EvolutionMutation>();

    for (const mutation of mutations) {
      const existing = merged.get(mutation.path);

      if (existing) {
        // 如果存在同路径变异，合并强度
        merged.set(mutation.path, {
          ...mutation,
          strength: Math.max(existing.strength, mutation.strength),
          oldValue: existing.oldValue,
        });
      } else {
        merged.set(mutation.path, mutation);
      }
    }

    return merged;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<TraitMutatorConfig>> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<TraitMutatorConfig>): void {
    Object.assign(this.config, config);
  }
}
