/**
 * 租户配置管理器
 * Tenant Configuration Manager - 配置验证和配额计划管理
 * 
 * @module Taiji.MultiTenant.Core
 */

import {
  TenantCreateConfig,
  TenantUpdateConfig,
  IsolationConfig,
  QuotaPlanConfig,
  ResourceQuotaConfig,
} from '../types';
import {
  ITenantConfigManager,
  DEFAULT_QUOTA_PLANS,
  DEFAULT_ISOLATION_CONFIG,
} from '../interfaces';

/**
 * 租户配置管理器
 * 负责租户配置的验证、默认值设置和配额计划管理
 * 
 * @example
 * ```typescript
 * const configManager = new TenantConfigManager();
 * 
 * // 获取配额计划
 * const plan = configManager.getQuotaPlan('professional');
 * 
 * // 验证创建配置
 * const result = configManager.validateCreateConfig({
 *   name: '新租户',
 *   ownerId: 'user_001',
 * });
 * 
 * // 合并默认值
 * const fullConfig = configManager.mergeWithDefaults(partialConfig);
 * ```
 */
export class TenantConfigManager implements ITenantConfigManager {
  private quotaPlans: Map<string, QuotaPlanConfig> = new Map();
  private defaultPlanId: string = 'free';

  constructor() {
    // 初始化默认配额计划
    this.initializeDefaultPlans();
  }

  /**
   * 初始化默认配额计划
   */
  private initializeDefaultPlans(): void {
    for (const plan of DEFAULT_QUOTA_PLANS) {
      this.quotaPlans.set(plan.planId, plan);
    }
  }

  /**
   * 获取配额计划
   * @param planId 计划ID
   * @returns 配额计划
   */
  getQuotaPlan(planId: string): QuotaPlanConfig | null {
    return this.quotaPlans.get(planId) ?? null;
  }

  /**
   * 获取所有配额计划
   * @returns 配额计划列表
   */
  getAllQuotaPlans(): QuotaPlanConfig[] {
    return Array.from(this.quotaPlans.values());
  }

  /**
   * 添加配额计划
   * @param plan 配额计划
   */
  addQuotaPlan(plan: QuotaPlanConfig): void {
    if (!plan.planId || !plan.name) {
      throw new Error('配额计划必须有planId和name');
    }
    this.quotaPlans.set(plan.planId, plan);
  }

  /**
   * 更新配额计划
   * @param planId 计划ID
   * @param plan 配额计划
   */
  updateQuotaPlan(planId: string, plan: QuotaPlanConfig): void {
    if (!this.quotaPlans.has(planId)) {
      throw new Error(`配额计划 ${planId} 不存在`);
    }
    plan.planId = planId; // 确保planId一致
    this.quotaPlans.set(planId, plan);
  }

  /**
   * 删除配额计划
   * @param planId 计划ID
   */
  deleteQuotaPlan(planId: string): void {
    if (planId === this.defaultPlanId) {
      throw new Error('不能删除默认配额计划');
    }
    this.quotaPlans.delete(planId);
  }

  /**
   * 获取默认隔离配置
   * @returns 隔离配置
   */
  getDefaultIsolationConfig(): IsolationConfig {
    return { ...DEFAULT_ISOLATION_CONFIG };
  }

  /**
   * 验证租户创建配置
   * @param config 创建配置
   * @returns 验证结果
   */
  validateCreateConfig(config: TenantCreateConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // 验证必填字段
    if (!config.name || config.name.trim().length === 0) {
      errors.push('租户名称不能为空');
    }
    if (!config.ownerId || config.ownerId.trim().length === 0) {
      errors.push('所有者ID不能为空');
    }

    // 验证名称长度
    if (config.name && config.name.length > 100) {
      errors.push('租户名称不能超过100个字符');
    }

    // 验证slug格式
    if (config.slug) {
      if (!/^[a-z0-9-]+$/.test(config.slug)) {
        errors.push('租户slug只能包含小写字母、数字和连字符');
      }
      if (config.slug.length < 3 || config.slug.length > 50) {
        errors.push('租户slug长度必须在3-50个字符之间');
      }
    }

    // 验证计划ID
    if (config.planId && !this.quotaPlans.has(config.planId)) {
      errors.push(`配额计划 ${config.planId} 不存在`);
    }

    // 验证隔离配置
    if (config.isolationConfig) {
      const isolationErrors = this.validateIsolationConfig(config.isolationConfig);
      errors.push(...isolationErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 验证租户更新配置
   * @param config 更新配置
   * @returns 验证结果
   */
  validateUpdateConfig(config: TenantUpdateConfig): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // 验证名称长度
    if (config.name !== undefined) {
      if (config.name.trim().length === 0) {
        errors.push('租户名称不能为空');
      }
      if (config.name.length > 100) {
        errors.push('租户名称不能超过100个字符');
      }
    }

    // 验证计划ID
    if (config.planId !== undefined && !this.quotaPlans.has(config.planId)) {
      errors.push(`配额计划 ${config.planId} 不存在`);
    }

    // 验证隔离配置
    if (config.isolationConfig) {
      const isolationErrors = this.validateIsolationConfig(config.isolationConfig);
      errors.push(...isolationErrors);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 验证隔离配置
   * @param config 隔离配置
   * @returns 错误列表
   */
  private validateIsolationConfig(config: Partial<IsolationConfig>): string[] {
    const errors: string[] = [];

    if (config.level && !['standard', 'strict', 'shared'].includes(config.level)) {
      errors.push('隔离级别必须是 standard、strict 或 shared');
    }

    return errors;
  }

  /**
   * 合并配置（使用默认值填充）
   * @param config 用户配置
   * @returns 完整配置
   */
  mergeWithDefaults(config: Partial<TenantCreateConfig>): TenantCreateConfig {
    const planId = config.planId ?? this.defaultPlanId;
    const plan = this.quotaPlans.get(planId);
    const defaultIsolation = this.getDefaultIsolationConfig();

    // 生成slug
    let slug = config.slug;
    if (!slug && config.name) {
      slug = this.generateSlug(config.name);
    }

    return {
      name: config.name ?? '',
      slug,
      description: config.description ?? '',
      ownerId: config.ownerId ?? '',
      billingMode: config.billingMode ?? 'free',
      planId,
      isolationConfig: {
        ...defaultIsolation,
        ...config.isolationConfig,
      },
      customDomain: config.customDomain,
      metadata: config.metadata ?? {},
      tags: config.tags ?? [],
    };
  }

  /**
   * 生成slug
   * @param name 名称
   * @returns slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * 获取租户的资源配额
   * @param planId 计划ID
   * @returns 资源配额列表
   */
  getQuotasForPlan(planId: string): ResourceQuotaConfig[] {
    const plan = this.quotaPlans.get(planId);
    if (!plan) {
      return [];
    }
    return plan.quotas;
  }

  /**
   * 获取默认计划ID
   * @returns 计划ID
   */
  getDefaultPlanId(): string {
    return this.defaultPlanId;
  }

  /**
   * 设置默认计划ID
   * @param planId 计划ID
   */
  setDefaultPlanId(planId: string): void {
    if (!this.quotaPlans.has(planId)) {
      throw new Error(`配额计划 ${planId} 不存在`);
    }
    this.defaultPlanId = planId;
  }

  /**
   * 检查计划是否可以删除
   * @param planId 计划ID
   * @returns 是否可以删除
   */
  canDeletePlan(planId: string): boolean {
    return planId !== this.defaultPlanId;
  }

  /**
   * 导出所有计划配置
   * @returns JSON配置字符串
   */
  exportPlans(): string {
    return JSON.stringify(this.getAllQuotaPlans(), null, 2);
  }

  /**
   * 导入计划配置
   * @param json JSON配置字符串
   */
  importPlans(json: string): void {
    const plans = JSON.parse(json) as QuotaPlanConfig[];
    for (const plan of plans) {
      this.addQuotaPlan(plan);
    }
  }
}
