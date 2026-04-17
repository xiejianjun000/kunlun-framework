/**
 * 特质验证器
 * Trait Validator - Validates trait mutations and constraints
 */

import {
  EvolutionMutation,
  EvolutionContext,
  ConstraintType,
} from '../interfaces';
import {
  TraitConstraint,
  TraitValidationResult,
} from './types';

/** 验证器配置 */
export interface TraitValidatorConfig {
  /** 是否严格模式 */
  strictMode: boolean;
  /** 是否自动修正 */
  autoCorrect: boolean;
  /** 最大修正次数 */
  maxCorrections: number;
  /** 验证超时(ms) */
  validationTimeout: number;
}

/**
 * 特质验证器
 * 负责验证特质变异的合法性
 */
export class TraitValidator {
  private config: Required<TraitValidatorConfig>;
  private customValidators: Map<string, (value: unknown) => boolean> = new Map();

  constructor(config?: Partial<TraitValidatorConfig>) {
    this.config = {
      strictMode: config?.strictMode ?? false,
      autoCorrect: config?.autoCorrect ?? true,
      maxCorrections: config?.maxCorrections ?? 3,
      validationTimeout: config?.validationTimeout ?? 1000,
    };
  }

  /**
   * 验证变异
   * @param mutation 变异
   * @param context 上下文
   */
  async validate(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): Promise<boolean> {
    const result = await this.validateWithDetails(mutation, context);
    return result.valid;
  }

  /**
   * 详细验证
   * @param mutation 变异
   * @param context 上下文
   */
  async validateWithDetails(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): Promise<TraitValidationResult> {
    const errors: string[] = [];
    let correctedValue = mutation.newValue;

    // 1. 基础类型验证
    if (typeof mutation.newValue !== typeof mutation.oldValue) {
      errors.push('Type mismatch between old and new value');
      if (this.config.strictMode) {
        return { valid: false, errors };
      }
    }

    // 2. 数值范围验证
    if (typeof mutation.newValue === 'number') {
      const rangeResult = this.validateRange(mutation.newValue);
      if (!rangeResult.valid) {
        errors.push(...rangeResult.errors);
        if (this.config.autoCorrect && rangeResult.correctedValue !== undefined) {
          correctedValue = rangeResult.correctedValue;
        }
      }
    }

    // 3. 约束验证
    const constraintResult = this.validateConstraints(mutation, context);
    if (!constraintResult.valid) {
      errors.push(...constraintResult.errors);
      if (this.config.autoCorrect && constraintResult.correctedValue !== undefined) {
        correctedValue = constraintResult.correctedValue;
      }
    }

    // 4. 合理性验证
    const sanityResult = this.validateSanity(mutation, context);
    if (!sanityResult.valid) {
      errors.push(...sanityResult.errors);
    }

    const valid = errors.length === 0 || (this.config.autoCorrect && correctedValue !== undefined);

    return {
      valid,
      errors,
      correctedValue: valid ? undefined : correctedValue,
    };
  }

  /**
   * 验证数值范围
   */
  private validateRange(value: number): { valid: boolean; errors: string[]; correctedValue?: number } {
    const errors: string[] = [];

    if (value < 0) {
      errors.push('Value below minimum (0)');
    } else if (value > 1) {
      errors.push('Value above maximum (1)');
    }

    if (errors.length > 0) {
      if (this.config.autoCorrect) {
        return { valid: false, errors, correctedValue: Math.max(0, Math.min(1, value)) };
      }
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * 验证约束
   */
  private validateConstraints(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): { valid: boolean; errors: string[]; correctedValue?: number } {
    const errors: string[] = [];
    let correctedValue: number | undefined;

    for (const constraint of context.constraints) {
      if (constraint.path !== mutation.path) {
        continue;
      }

      const result = this.validateConstraint(mutation, constraint);
      if (!result.valid) {
        errors.push(result.error!);
        if (this.config.autoCorrect && result.correctedValue !== undefined) {
          correctedValue = result.correctedValue;
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, correctedValue };
    }

    return { valid: true, errors: [] };
  }

  /**
   * 验证单个约束
   */
  private validateConstraint(
    mutation: EvolutionMutation,
    constraint: {
      type: ConstraintType;
      value: unknown;
      strict: boolean;
      message?: string;
    }
  ): { valid: boolean; error?: string; correctedValue?: number } {
    switch (constraint.type) {
      case ConstraintType.RANGE: {
        const range = constraint.value as { min: number; max: number };
        const value = mutation.newValue as number;

        if (value < range.min) {
          return {
            valid: !constraint.strict,
            error: constraint.message ?? `Value ${value} below range minimum ${range.min}`,
            correctedValue: range.min,
          };
        }

        if (value > range.max) {
          return {
            valid: !constraint.strict,
            error: constraint.message ?? `Value ${value} above range maximum ${range.max}`,
            correctedValue: range.max,
          };
        }

        return { valid: true };
      }

      case ConstraintType.ENUM: {
        const allowed = constraint.value as unknown[];
        if (!allowed.includes(mutation.newValue)) {
          return {
            valid: false,
            error: constraint.message ?? `Value not in allowed values: ${allowed.join(', ')}`,
          };
        }
        return { valid: true };
      }

      case ConstraintType.REQUIRED: {
        if (mutation.newValue === undefined || mutation.newValue === null) {
          return {
            valid: false,
            error: constraint.message ?? 'Value is required',
          };
        }
        return { valid: true };
      }

      case ConstraintType.CUSTOM: {
        const validator = this.customValidators.get(constraint.value as string);
        if (validator && !validator(mutation.newValue)) {
          return {
            valid: false,
            error: constraint.message ?? 'Custom validation failed',
          };
        }
        return { valid: true };
      }

      default:
        return { valid: true };
    }
  }

  /**
   * 合理性验证
   */
  private validateSanity(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查突变幅度
    if (typeof mutation.oldValue === 'number' && typeof mutation.newValue === 'number') {
      const change = Math.abs(mutation.newValue - mutation.oldValue);

      // 突变过大
      if (change > 0.5) {
        errors.push(`Large mutation detected: change=${change.toFixed(3)}`);
        if (this.config.strictMode) {
          return { valid: false, errors };
        }
      }

      // 突变过小
      if (change < 0.001) {
        errors.push(`Negligible mutation detected: change=${change.toFixed(6)}`);
      }
    }

    // 检查适应度影响
    const fitnessImpact = this.estimateFitnessImpact(mutation, context);
    if (fitnessImpact < -0.3) {
      errors.push(`Severe fitness degradation predicted: ${fitnessImpact.toFixed(3)}`);
      if (this.config.strictMode) {
        return { valid: false, errors };
      }
    }

    return { valid: errors.length === 0 || !this.config.strictMode, errors };
  }

  /**
   * 估计适应度影响
   */
  private estimateFitnessImpact(
    mutation: EvolutionMutation,
    context: EvolutionContext
  ): number {
    // 简化的适应度影响估计
    const baseImpact = (mutation.newValue as number) - (mutation.oldValue as number);

    // 考虑历史趋势
    if (context.historyCount > 10) {
      return baseImpact * 0.8;
    }

    return baseImpact;
  }

  /**
   * 批量验证
   * @param mutations 变异列表
   * @param context 上下文
   */
  async validateBatch(
    mutations: EvolutionMutation[],
    context: EvolutionContext
  ): Promise<{
    validMutations: EvolutionMutation[];
    invalidMutations: Array<{ mutation: EvolutionMutation; errors: string[] }>;
  }> {
    const validMutations: EvolutionMutation[] = [];
    const invalidMutations: Array<{ mutation: EvolutionMutation; errors: string[] }> = [];

    for (const mutation of mutations) {
      const result = await this.validateWithDetails(mutation, context);

      if (result.valid) {
        validMutations.push(mutation);
      } else {
        invalidMutations.push({
          mutation,
          errors: result.errors,
        });
      }
    }

    return { validMutations, invalidMutations };
  }

  /**
   * 注册自定义验证器
   * @param name 名称
   * @param validator 验证函数
   */
  registerValidator(name: string, validator: (value: unknown) => boolean): void {
    this.customValidators.set(name, validator);
  }

  /**
   * 注销自定义验证器
   * @param name 名称
   */
  unregisterValidator(name: string): boolean {
    return this.customValidators.delete(name);
  }

  /**
   * 创建约束
   * @param traitName 特质名称
   * @param type 类型
   * @param value 值
   * @param options 选项
   */
  createConstraint(
    traitName: string,
    type: ConstraintType,
    value: unknown,
    options?: { strict?: boolean; message?: string }
  ): TraitConstraint {
    return {
      traitName,
      min: (value as { min?: number }).min ?? 0,
      max: (value as { max?: number }).max ?? 1,
      strict: options?.strict ?? false,
      validator: options?.message ? () => true : undefined,
    };
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<TraitValidatorConfig>> {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<TraitValidatorConfig>): void {
    Object.assign(this.config, config);
  }
}
