/**
 * 租户管理器接口
 * Tenant Manager Interface
 * 
 * @module Taiji.MultiTenant.Interfaces
 */

import {
  Tenant,
  TenantCreateConfig,
  TenantUpdateConfig,
  TenantStatus,
  TenantStatistics,
} from '../types';

/**
 * 租户查询选项
 */
export interface TenantQueryOptions {
  /** 状态过滤 */
  status?: TenantStatus;
  /** 标签过滤 */
  tags?: string[];
  /** 所有者ID过滤 */
  ownerId?: string;
  /** 搜索关键字 */
  search?: string;
  /** 分页 - 页码 */
  page?: number;
  /** 分页 - 每页数量 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: keyof Tenant;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 租户分页结果
 */
export interface TenantPaginatedResult {
  /** 租户列表 */
  tenants: Tenant[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 租户管理器接口
 * 定义租户管理的核心操作
 */
export interface ITenantManager {
  /**
   * 创建新租户
   * @param config 租户配置
   * @returns 创建的租户
   */
  createTenant(config: TenantCreateConfig): Promise<Tenant>;

  /**
   * 获取租户
   * @param tenantId 租户ID
   * @returns 租户信息
   */
  getTenant(tenantId: string): Promise<Tenant | null>;

  /**
   * 获取租户slug
   * @param slug 租户slug
   * @returns 租户信息
   */
  getTenantBySlug(slug: string): Promise<Tenant | null>;

  /**
   * 更新租户
   * @param tenantId 租户ID
   * @param config 更新配置
   * @returns 更新后的租户
   */
  updateTenant(tenantId: string, config: TenantUpdateConfig): Promise<Tenant>;

  /**
   * 删除租户
   * @param tenantId 租户ID
   * @param force 是否强制删除
   */
  deleteTenant(tenantId: string, force?: boolean): Promise<void>;

  /**
   * 暂停租户
   * @param tenantId 租户ID
   * @param reason 暂停原因
   */
  suspendTenant(tenantId: string, reason?: string): Promise<void>;

  /**
   * 恢复租户
   * @param tenantId 租户ID
   */
  resumeTenant(tenantId: string): Promise<void>;

  /**
   * 升级租户套餐
   * @param tenantId 租户ID
   * @param planId 新计划ID
   */
  upgradeTenant(tenantId: string, planId: string): Promise<Tenant>;

  /**
   * 查询租户列表
   * @param options 查询选项
   * @returns 分页结果
   */
  queryTenants(options?: TenantQueryOptions): Promise<TenantPaginatedResult>;

  /**
   * 获取租户统计
   * @returns 统计信息
   */
  getStatistics(): Promise<TenantStatistics>;

  /**
   * 检查slug是否可用
   * @param slug 租户slug
   * @returns 是否可用
   */
  isSlugAvailable(slug: string): Promise<boolean>;

  /**
   * 验证租户ID是否存在
   * @param tenantId 租户ID
   * @returns 是否存在
   */
  exists(tenantId: string): Promise<boolean>;
}
