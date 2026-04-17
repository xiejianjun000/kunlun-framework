/**
 * 租户注册表接口
 * Tenant Registry Interface
 * 
 * @module Kunlun.MultiTenant.Interfaces
 */

import { Tenant } from '../types';

/**
 * 租户注册表接口
 * 负责租户的注册、存储和检索
 */
export interface ITenantRegistry {
  /**
   * 注册租户
   * @param tenant 租户信息
   */
  register(tenant: Tenant): Promise<void>;

  /**
   * 注销租户
   * @param tenantId 租户ID
   */
  unregister(tenantId: string): Promise<void>;

  /**
   * 获取租户
   * @param tenantId 租户ID
   * @returns 租户信息
   */
  get(tenantId: string): Promise<Tenant | null>;

  /**
   * 获取所有租户
   * @returns 租户列表
   */
  getAll(): Promise<Tenant[]>;

  /**
   * 根据slug获取租户
   * @param slug 租户slug
   * @returns 租户信息
   */
  getBySlug(slug: string): Promise<Tenant | null>;

  /**
   * 更新租户信息
   * @param tenant 租户信息
   */
  update(tenant: Tenant): Promise<void>;

  /**
   * 检查租户是否存在
   * @param tenantId 租户ID
   * @returns 是否存在
   */
  has(tenantId: string): Promise<boolean>;

  /**
   * 批量获取租户
   * @param tenantIds 租户ID列表
   * @returns 租户列表
   */
  getMany(tenantIds: string[]): Promise<Tenant[]>;

  /**
   * 清空注册表
   */
  clear(): Promise<void>;

  /**
   * 获取租户数量
   * @returns 租户数量
   */
  count(): Promise<number>;

  /**
   * 持久化注册表到存储
   */
  persist(): Promise<void>;

  /**
   * 从存储加载注册表
   */
  load(): Promise<void>;
}
