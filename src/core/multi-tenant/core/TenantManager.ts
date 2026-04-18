/**
 * 租户管理器
 * Tenant Manager - 租户管理的核心类
 * 
 * @module Taiji.MultiTenant.Core
 */

import { EventEmitter } from 'events';
import {
  Tenant,
  TenantStatus,
  TenantCreateConfig,
  TenantUpdateConfig,
  TenantStatistics,
} from '../types';
import { ITenantManager, TenantQueryOptions, TenantPaginatedResult } from '../interfaces';
import { TenantRegistry } from './TenantRegistry';
import { TenantConfigManager } from './TenantConfigManager';

/**
 * 租户管理器配置
 */
export interface TenantManagerConfig {
  /** 注册表配置 */
  registry?: ConstructorParameters<typeof TenantRegistry>[0];
  /** 是否启用事件发射 */
  eventsEnabled?: boolean;
  /** 是否自动持久化 */
  autoPersist?: boolean;
}

/**
 * 租户管理器
 * 租户管理的核心类，负责租户的CRUD操作
 * 
 * @example
 * ```typescript
 * const manager = new TenantManager();
 * 
 * // 创建租户
 * const tenant = await manager.createTenant({
 *   name: '示例公司',
 *   ownerId: 'user_001',
 *   planId: 'professional',
 * });
 * 
 * // 获取租户
 * const found = await manager.getTenant(tenant.id);
 * 
 * // 更新租户
 * await manager.updateTenant(tenant.id, {
 *   name: '新公司名称',
 * });
 * 
 * // 查询租户
 * const { tenants, total } = await manager.queryTenants({
 *   status: TenantStatus.ACTIVE,
 *   page: 1,
 *   pageSize: 10,
 * });
 * ```
 */
export class TenantManager extends EventEmitter implements ITenantManager {
  private registry: TenantRegistry;
  private configManager: TenantConfigManager;
  private config: TenantManagerConfig;
  private idCounter: number = 0;

  constructor(config: TenantManagerConfig = {}) {
    super();
    this.config = {
      eventsEnabled: config.eventsEnabled ?? true,
      autoPersist: config.autoPersist ?? true,
    };
    
    this.registry = new TenantRegistry(config.registry);
    this.configManager = new TenantConfigManager();

    this.setupRegistryListeners();
  }

  /**
   * 设置注册表监听器
   */
  private setupRegistryListeners(): void {
    this.registry.on('registered', (tenant: Tenant) => {
      if (this.config.eventsEnabled) {
        this.emit('tenant:created', tenant);
      }
    });

    this.registry.on('updated', (tenant: Tenant, oldTenant: Tenant) => {
      if (this.config.eventsEnabled) {
        this.emit('tenant:updated', tenant, oldTenant);
      }
    });

    this.registry.on('unregistered', (tenant: Tenant) => {
      if (this.config.eventsEnabled) {
        this.emit('tenant:deleted', tenant);
      }
    });
  }

  /**
   * 生成租户ID
   * @returns 租户ID
   */
  private generateTenantId(): string {
    this.idCounter++;
    const timestamp = Date.now().toString(36);
    return `tenant_${timestamp}_${this.idCounter.toString(36)}`;
  }

  /**
   * 创建新租户
   * @param config 租户配置
   * @returns 创建的租户
   */
  async createTenant(config: TenantCreateConfig): Promise<Tenant> {
    // 验证配置
    const validation = this.configManager.validateCreateConfig(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors?.join(', ')}`);
    }

    // 合并默认值
    const fullConfig = this.configManager.mergeWithDefaults(config);

    // 检查slug是否可用
    if (fullConfig.slug && !(await this.isSlugAvailable(fullConfig.slug))) {
      throw new Error(`租户 slug ${fullConfig.slug} 已被使用`);
    }

    // 创建租户
    const tenant: Tenant = {
      id: this.generateTenantId(),
      name: fullConfig.name,
      slug: fullConfig.slug!,
      description: fullConfig.description,
      status: TenantStatus.CREATING,
      ownerId: fullConfig.ownerId,
      billingMode: fullConfig.billingMode ?? 'free',
      planId: fullConfig.planId!,
      isolationConfig: fullConfig.isolationConfig,
      customDomain: fullConfig.customDomain,
      metadata: fullConfig.metadata,
      tags: fullConfig.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 注册租户
    await this.registry.register(tenant);

    // 更新状态为活动
    tenant.status = TenantStatus.ACTIVE;
    await this.registry.update(tenant);

    // 持久化
    if (this.config.autoPersist) {
      await this.registry.persist();
    }

    return tenant;
  }

  /**
   * 获取租户
   * @param tenantId 租户ID
   * @returns 租户信息
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    return this.registry.get(tenantId);
  }

  /**
   * 获取租户slug
   * @param slug 租户slug
   * @returns 租户信息
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.registry.getBySlug(slug);
  }

  /**
   * 更新租户
   * @param tenantId 租户ID
   * @param config 更新配置
   * @returns 更新后的租户
   */
  async updateTenant(tenantId: string, config: TenantUpdateConfig): Promise<Tenant> {
    const tenant = await this.registry.get(tenantId);
    if (!tenant) {
      throw new Error(`租户 ${tenantId} 不存在`);
    }

    // 验证配置
    const validation = this.configManager.validateUpdateConfig(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors?.join(', ')}`);
    }

    // 更新字段
    const updatedTenant: Tenant = {
      ...tenant,
      name: config.name ?? tenant.name,
      description: config.description ?? tenant.description,
      status: config.status ?? tenant.status,
      billingMode: config.billingMode ?? tenant.billingMode,
      planId: config.planId ?? tenant.planId,
      isolationConfig: config.isolationConfig 
        ? { ...tenant.isolationConfig, ...config.isolationConfig }
        : tenant.isolationConfig,
      customDomain: config.customDomain ?? tenant.customDomain,
      metadata: config.metadata ?? tenant.metadata,
      tags: config.tags ?? tenant.tags,
      updatedAt: new Date(),
    };

    await this.registry.update(updatedTenant);

    // 持久化
    if (this.config.autoPersist) {
      await this.registry.persist();
    }

    return updatedTenant;
  }

  /**
   * 删除租户
   * @param tenantId 租户ID
   * @param force 是否强制删除
   */
  async deleteTenant(tenantId: string, force?: boolean): Promise<void> {
    const tenant = await this.registry.get(tenantId);
    if (!tenant) {
      return;
    }

    // 更新状态为删除中
    await this.registry.update({
      ...tenant,
      status: TenantStatus.DELETING,
      updatedAt: new Date(),
    });

    // 注销租户
    await this.registry.unregister(tenantId);

    // 持久化
    if (this.config.autoPersist) {
      await this.registry.persist();
    }
  }

  /**
   * 暂停租户
   * @param tenantId 租户ID
   * @param reason 暂停原因
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<void> {
    const tenant = await this.registry.get(tenantId);
    if (!tenant) {
      throw new Error(`租户 ${tenantId} 不存在`);
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new Error('只能暂停活跃状态的租户');
    }

    await this.registry.update({
      ...tenant,
      status: TenantStatus.SUSPENDED,
      metadata: {
        ...tenant.metadata,
        suspendReason: reason,
        suspendedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });

    if (this.config.autoPersist) {
      await this.registry.persist();
    }
  }

  /**
   * 恢复租户
   * @param tenantId 租户ID
   */
  async resumeTenant(tenantId: string): Promise<void> {
    const tenant = await this.registry.get(tenantId);
    if (!tenant) {
      throw new Error(`租户 ${tenantId} 不存在`);
    }

    if (tenant.status !== TenantStatus.SUSPENDED) {
      throw new Error('只能恢复暂停状态的租户');
    }

    await this.registry.update({
      ...tenant,
      status: TenantStatus.ACTIVE,
      metadata: {
        ...tenant.metadata,
        resumedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });

    if (this.config.autoPersist) {
      await this.registry.persist();
    }
  }

  /**
   * 升级租户套餐
   * @param tenantId 租户ID
   * @param planId 新计划ID
   * @returns 更新后的租户
   */
  async upgradeTenant(tenantId: string, planId: string): Promise<Tenant> {
    const tenant = await this.registry.get(tenantId);
    if (!tenant) {
      throw new Error(`租户 ${tenantId} 不存在`);
    }

    const plan = this.configManager.getQuotaPlan(planId);
    if (!plan) {
      throw new Error(`配额计划 ${planId} 不存在`);
    }

    await this.registry.update({
      ...tenant,
      status: TenantStatus.UPGRADING,
      planId,
      metadata: {
        ...tenant.metadata,
        previousPlanId: tenant.planId,
        upgradedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });

    const updatedTenant = await this.registry.get(tenantId);
    if (updatedTenant) {
      updatedTenant.status = TenantStatus.ACTIVE;
      await this.registry.update(updatedTenant);
    }

    if (this.config.autoPersist) {
      await this.registry.persist();
    }

    return updatedTenant!;
  }

  /**
   * 查询租户列表
   * @param options 查询选项
   * @returns 分页结果
   */
  async queryTenants(options?: TenantQueryOptions): Promise<TenantPaginatedResult> {
    let tenants = await this.registry.getAll();

    // 应用过滤
    if (options?.status) {
      tenants = tenants.filter(t => t.status === options.status);
    }
    if (options?.ownerId) {
      tenants = tenants.filter(t => t.ownerId === options.ownerId);
    }
    if (options?.tags && options.tags.length > 0) {
      tenants = tenants.filter(t => 
        t.tags && options.tags!.some(tag => t.tags!.includes(tag))
      );
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      tenants = tenants.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.slug.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
      );
    }

    // 排序
    const sortBy = options?.sortBy ?? 'createdAt';
    const sortOrder = options?.sortOrder ?? 'desc';
    tenants.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 分页
    const total = tenants.length;
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paginatedTenants = tenants.slice(start, start + pageSize);

    return {
      tenants: paginatedTenants,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取租户统计
   * @returns 统计信息
   */
  async getStatistics(): Promise<TenantStatistics> {
    const tenants = await this.registry.getAll();
    
    const statistics: TenantStatistics = {
      totalTenants: tenants.length,
      activeTenants: 0,
      suspendedTenants: 0,
      trialTenants: 0,
      totalResourceUsage: {} as Record<any, number>,
      averageUsageRate: {} as Record<any, number>,
    };

    for (const tenant of tenants) {
      switch (tenant.status) {
        case TenantStatus.ACTIVE:
          statistics.activeTenants++;
          break;
        case TenantStatus.SUSPENDED:
          statistics.suspendedTenants++;
          break;
        case TenantStatus.TRIAL:
          statistics.trialTenants++;
          break;
      }
    }

    return statistics;
  }

  /**
   * 检查slug是否可用
   * @param slug 租户slug
   * @returns 是否可用
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.registry.getBySlug(slug);
    return existing === null;
  }

  /**
   * 验证租户ID是否存在
   * @param tenantId 租户ID
   * @returns 是否存在
   */
  async exists(tenantId: string): Promise<boolean> {
    return this.registry.has(tenantId);
  }

  /**
   * 获取注册表
   * @returns 注册表实例
   */
  getRegistry(): TenantRegistry {
    return this.registry;
  }

  /**
   * 获取配置管理器
   * @returns 配置管理器实例
   */
  getConfigManager(): TenantConfigManager {
    return this.configManager;
  }

  /**
   * 初始化（加载持久化数据）
   */
  async initialize(): Promise<void> {
    await this.registry.load();
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    await this.registry.destroy();
    this.removeAllListeners();
  }
}
