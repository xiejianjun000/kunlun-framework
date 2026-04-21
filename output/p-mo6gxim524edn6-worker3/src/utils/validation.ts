/**
 * 配置验证工具
 * 提供类型安全的配置验证和默认值设置
 */

export interface ValidationResult<T> {
  valid: boolean;
  config: T;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: unknown) => boolean;
  message?: string;
}

/**
 * 配置验证器
 */
export class ConfigValidator<T extends Record<string, unknown>> {
  private rules: Array<ValidationRule<T>> = [];

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  validate(config: T): ValidationResult<T> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedConfig = { ...config };

    for (const rule of this.rules) {
      const value = config[rule.field];
      const fieldName = String(rule.field);

      // 必填检查
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field "${fieldName}" is required`);
        continue;
      }

      // 跳过可选且未提供的字段
      if (value === undefined || value === null) {
        continue;
      }

      // 类型检查
      if (rule.type) {
        const actualType = typeof value;
        if (actualType !== rule.type) {
          errors.push(`Field "${fieldName}" should be of type ${rule.type}, got ${actualType}`);
          continue;
        }
      }

      // 范围检查（数字）
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field "${fieldName}" should be >= ${rule.min}, got ${value}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          warnings.push(`Field "${fieldName}" value ${value} exceeds recommended max ${rule.max}`);
        }
      }

      // 正则检查
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(rule.message || `Field "${fieldName}" does not match required pattern`);
      }

      // 自定义验证
      if (rule.validator && !rule.validator(value)) {
        errors.push(rule.message || `Field "${fieldName}" failed validation`);
      }
    }

    return {
      valid: errors.length === 0,
      config: validatedConfig,
      errors,
      warnings
    };
  }
}

/**
 * LLM 配置预定义验证规则
 */
export const createLLMConfigValidator = <T extends Record<string, unknown>>() => {
  return new ConfigValidator<T>()
    .addRule({ field: 'apiKey' as keyof T, required: true, type: 'string', message: 'API Key must be a non-empty string' })
    .addRule({ field: 'model' as keyof T, required: true, type: 'string', message: 'Model name must be specified' })
    .addRule({ field: 'baseUrl' as keyof T, type: 'string', pattern: /^https?:\/\//, message: 'Base URL must start with http:// or https://' })
    .addRule({ field: 'timeoutMs' as keyof T, type: 'number', min: 1000, max: 300000 })
    .addRule({ field: 'maxRetries' as keyof T, type: 'number', min: 0, max: 10 })
    .addRule({ field: 'costPer1kPrompt' as keyof T, type: 'number', min: 0 })
    .addRule({ field: 'costPer1kCompletion' as keyof T, type: 'number', min: 0 });
};

/**
 * 断言配置有效，否则抛出错误
 */
export function assertValidConfig<T>(result: ValidationResult<T>): asserts result is ValidationResult<T> & { valid: true } {
  if (!result.valid) {
    throw new Error(`Configuration validation failed: ${result.errors.join(', ')}`);
  }
}
