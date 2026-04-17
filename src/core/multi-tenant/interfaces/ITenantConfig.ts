/**
 * 租户配置管理器接口
 * Tenant Configuration Manager Interface
 * 
 * @module Kunlun.MultiTenant.Interfaces
 */

import {
  TenantCreateConfig,
  TenantUpdateConfig,
  IsolationConfig,
  QuotaPlanConfig,
  ResourceQuotaConfig,
} from '../types';

/**
 * 默认配额计划
 */
export const DEFAULT_QUOTA_PLANS: QuotaPlanConfig[] = [
  {
    planId: 'free',
    name: '免费版',
    description: '适合个人开发者和小型项目',
    monthlyPrice: 0,
    yearlyPrice: 0,
    quotas: [
      { type: 'cpu', limit: 1, unit: 'core', warningThreshold: 0.8 },
      { type: 'memory', limit: 512, unit: 'MB', warningThreshold: 0.8 },
      { type: 'storage', limit: 1, unit: 'GB', warningThreshold: 0.8 },
      { type: 'api_calls', limit: 1000, unit: '次/天', warningThreshold: 0.8 },
      { type: 'vector_storage', limit: 100, unit: 'MB', warningThreshold: 0.8 },
      { type: 'users', limit: 3, unit: '个', warningThreshold: 0.8 },
      { type: 'skills', limit: 5, unit: '个', warningThreshold: 0.8 },
    ],
    features: ['基础技能', '基础记忆', '社区支持'],
  },
  {
    planId: 'starter',
    name: '入门版',
    description: '适合小型团队和初创项目',
    monthlyPrice: 99,
    yearlyPrice: 990,
    quotas: [
      { type: 'cpu', limit: 2, unit: 'core', warningThreshold: 0.8 },
      { type: 'memory', limit: 2, unit: 'GB', warningThreshold: 0.8 },
      { type: 'storage', limit: 10, unit: 'GB', warningThreshold: 0.8 },
      { type: 'api_calls', limit: 10000, unit: '次/天', warningThreshold: 0.8 },
      { type: 'vector_storage', limit: 1, unit: 'GB', warningThreshold: 0.8 },
      { type: 'users', limit: 10, unit: '个', warningThreshold: 0.8 },
      { type: 'skills', limit: 20, unit: '个', warningThreshold: 0.8 },
    ],
    features: ['高级技能', '优先支持', 'API访问'],
  },
  {
    planId: 'professional',
    name: '专业版',
    description: '适合成长中的团队',
    monthlyPrice: 399,
    yearlyPrice: 3990,
    quotas: [
      { type: 'cpu', limit: 4, unit: 'core', warningThreshold: 0.8 },
      { type: 'memory', limit: 8, unit: 'GB', warningThreshold: 0.8 },
      { type: 'storage', limit: 50, unit: 'GB', warningThreshold: 0.8 },
      { type: 'api_calls', limit: 100000, unit: '次/天', warningThreshold: 0.8 },
      { type: 'vector_storage', limit: 10, unit: 'GB', warningThreshold: 0.8 },
      { type: 'users', limit: 50, unit: '个', warningThreshold: 0.8 },
      { type: 'skills', limit: 100, unit: '个', warningThreshold: 0.8 },
    ],
    features: ['自定义技能', '高级分析', '优先支持', 'Webhooks'],
  },
  {
    planId: 'enterprise',
    name: '企业版',
    description: '适合大型企业和高要求场景',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    quotas: [
      { type: 'cpu', limit: 16, unit: 'core', warningThreshold: 0.8 },
      { type: 'memory', limit: 32, unit: 'GB', warningThreshold: 0.8 },
      { type: 'storage', limit: 200, unit: 'GB', warningThreshold: 0.8 },
      { type: 'api_calls', limit: 1000000, unit: '次/天', warningThreshold: 0.8 },
      { type: 'vector_storage', limit: 100, unit: 'GB', warningThreshold: 0.8 },
      { type: 'users', limit: 500, unit: '个', warningThreshold: 0.8 },
      { type: 'skills', limit: 500, unit: '个', warningThreshold: 0.8 },
    ],
    features: ['私有部署', 'SLA保障', '专属支持', '自定义集成', '审计日志'],
  },
];

/**
 * 默认隔离配置
 */
export const DEFAULT_ISOLATION_CONFIG: IsolationConfig = {
  level: 'standard',
  database: {
    prefix: 'kunlun_',
    dedicated: false,
  },
  schema: {
    prefix: 'tenant_',
  },
  vectorDb: {
    collectionPrefix: 'tenant_',
    dedicated: false,
  },
  network: {
    namespacePrefix: 'kunlun-tenant-',
    dedicated: false,
  },
};

/**
 * 租户配置管理器接口
 * 负责租户配置的验证、默认值设置和配额计划管理
 */
export interface ITenantConfigManager {
  /**
   * 获取配额计划
   * @param planId 计划ID
   * @returns 配额计划
   */
  getQuotaPlan(planId: string): QuotaPlanConfig | null;

  /**
   * 获取所有配额计划
   * @returns 配额计划列表
   */
  getAllQuotaPlans(): QuotaPlanConfig[];

  /**
   * 添加配额计划
   * @param plan 配额计划
   */
  addQuotaPlan(plan: QuotaPlanConfig): void;

  /**
   * 更新配额计划
   * @param planId 计划ID
   * @param plan 配额计划
   */
  updateQuotaPlan(planId: string, plan: QuotaPlanConfig): void;

  /**
   * 删除配额计划
   * @param planId 计划ID
   */
  deleteQuotaPlan(planId: string): void;

  /**
   * 获取默认隔离配置
   * @returns 隔离配置
   */
  getDefaultIsolationConfig(): IsolationConfig;

  /**
   * 验证租户创建配置
   * @param config 创建配置
   * @returns 验证是否通过
   */
  validateCreateConfig(config: TenantCreateConfig): { valid: boolean; errors?: string[] };

  /**
   * 验证租户更新配置
   * @param config 更新配置
   * @returns 验证是否通过
   */
  validateUpdateConfig(config: TenantUpdateConfig): { valid: boolean; errors?: string[] };

  /**
   * 合并配置（使用默认值填充）
   * @param config 用户配置
   * @returns 完整配置
   */
  mergeWithDefaults(config: Partial<TenantCreateConfig>): TenantCreateConfig;

  /**
   * 获取租户的资源配额
   * @param planId 计划ID
   * @returns 资源配额列表
   */
  getQuotasForPlan(planId: string): ResourceQuotaConfig[];

  /**
   * 获取默认计划ID
   * @returns 计划ID
   */
  getDefaultPlanId(): string;
}
