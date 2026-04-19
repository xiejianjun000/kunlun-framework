/**
 * 租户注册表
 * Tenant Registry - 租户的注册、存储和检索
 * 
 * @module Taiji.MultiTenant.Core
 */

import { EventEmitter } from 'events';
import { Tenant, TenantStatus } from '../types';
import { ITenantRegistry } from '../interfaces';

/**
 * 租户注册表配置
 */
export interface TenantRegistryConfig {
  /** 持久化存储路径 */
  storagePath?: string;
  /** 是否启用持久化 */
  persistEnabled?: boolean;
  /** 自动保存间隔(ms) */
  autoSaveInterval?: number;
}

/**
 * 租户注册表
 * 负责租户的注册、存储和检索
 * 
 * @example
 * ```typescript
 * const registry = new TenantRegistry();
 * 
 * // 注册租户
 * await registry.register({
 *   id: 'tenant_001',
 *   name: '示例租户',
 *   status: TenantStatus.ACTIVE,
 *   // ...
 * });
 * 
 * // 获取租户
 * const tenant = await registry.get('tenant_001');
 * 
 * // 检查是否存在
 * const exists = await registry.has('tenant_001');
 * ```
 */
export class TenantRegistry extends EventEmitter implements ITenantRegistry {
  private tenants: Map<string, Tenant> = new Map();
  private slugs: Map<string, string> = new Map(); // slug -> tenantId
  private config: TenantRegistryConfig;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(config: TenantRegistryConfig = {}) {
    super();
    this.config = {
      storagePath: config.storagePath ?? './data/tenants.json',
      persistEnabled: config.persistEnabled ?? true,
      autoSaveInterval: config.autoSaveInterval ?? 60000,
    };

    if (this.config.persistEnabled) {
      this.setupAutoSave();
    }
  }

  /**
   * 注册租户
   * @param tenant 租户信息
   */
  async register(tenant: Tenant): Promise<void> {
    if (this.tenants.has(tenant.id)) {
      throw new Error(`租户 ${tenant.id} 已存在`);
    }

    if (this.slugs.has(tenant.slug)) {
      throw new Error(`租户 slug ${tenant.slug} 已被使用`);
    }

    this.tenants.set(tenant.id, tenant);
    this.slugs.set(tenant.slug, tenant.id);

    this.emit('registered', tenant);
  }

  /**
   * 注销租户
   * @param tenantId 租户ID
   */
  async unregister(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return;
    }

    this.tenants.delete(tenantId);
    this.slugs.delete(tenant.slug);

    this.emit('unregistered', tenant);
  }

  /**
   * 获取租户
   * @param tenantId 租户ID
   * @returns 租户信息
   */
  async get(tenantId: string): Promise<Tenant | null> {
    return this.tenants.get(tenantId) ?? null;
  }

  /**
   * 获取所有租户
   * @returns 租户列表
   */
  async getAll(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  /**
   * 根据slug获取租户
   * @param slug 租户slug
   * @returns 租户信息
   */
  async getBySlug(slug: string): Promise<Tenant | null> {
    const tenantId = this.slugs.get(slug);
    if (!tenantId) {
      return null;
    }
    return this.tenants.get(tenantId) ?? null;
  }

  /**
   * 更新租户信息
   * @param tenant 租户信息
   */
  async update(tenant: Tenant): Promise<void> {
    const existing = this.tenants.get(tenant.id);
    if (!existing) {
      throw new Error(`租户 ${tenant.id} 不存在`);
    }

    // 如果slug变更，需要更新slug映射
    if (existing.slug !== tenant.slug) {
      if (this.slugs.has(tenant.slug) && this.slugs.get(tenant.slug) !== tenant.id) {
        throw new Error(`租户 slug ${tenant.slug} 已被使用`);
      }
      this.slugs.delete(existing.slug);
      this.slugs.set(tenant.slug, tenant.id);
    }

    this.tenants.set(tenant.id, tenant);
    this.emit('updated', tenant, existing);
  }

  /**
   * 检查租户是否存在
   * @param tenantId 租户ID
   * @returns 是否存在
   */
  async has(tenantId: string): Promise<boolean> {
    return this.tenants.has(tenantId);
  }

  /**
   * 批量获取租户
   * @param tenantIds 租户ID列表
   * @returns 租户列表
   */
  async getMany(tenantIds: string[]): Promise<Tenant[]> {
    const results: Tenant[] = [];
    for (const id of tenantIds) {
      const tenant = this.tenants.get(id);
      if (tenant) {
        results.push(tenant);
      }
    }
    return results;
  }

  /**
   * 清空注册表
   */
  async clear(): Promise<void> {
    this.tenants.clear();
    this.slugs.clear();
    this.emit('cleared');
  }

  /**
   * 获取租户数量
   * @returns 租户数量
   */
  async count(): Promise<number> {
    return this.tenants.size;
  }

  /**
   * 持久化注册表到存储
   */
  async persist(): Promise<void> {
    if (!this.config.persistEnabled) {
      return;
    }

    try {
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        tenants: Array.from(this.tenants.values()),
      };

      // 使用文件系统持久化
      const fs = await import('fs/promises');
      const path = await import('path');
      
      await fs.mkdir(path.dirname(this.config.storagePath!), { recursive: true });
      await fs.writeFile(
        this.config.storagePath!,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      this.emit('persisted');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 从存储加载注册表
   */
  async load(): Promise<void> {
    if (!this.config.persistEnabled) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const filePath = path.resolve(this.config.storagePath!);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);

      if (!exists) {
        return;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // 恢复租户数据
      this.tenants.clear();
      this.slugs.clear();

      for (const tenantData of data.tenants) {
        const tenant: Tenant = {
          ...tenantData,
          createdAt: new Date(tenantData.createdAt),
          updatedAt: new Date(tenantData.updatedAt),
        };
        this.tenants.set(tenant.id, tenant);
        this.slugs.set(tenant.slug, tenant.id);
      }

      this.emit('loaded', this.tenants.size);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 设置自动保存
   */
  private setupAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.persist();
      } catch {
        // 静默处理自动保存错误
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * 销毁注册表
   */
  async destroy(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
    await this.persist();
  }

  /**
   * 获取按状态分组的租户
   * @returns 按状态分组的租户映射
   */
  async getGroupedByStatus(): Promise<Map<TenantStatus, Tenant[]>> {
    const grouped = new Map<TenantStatus, Tenant[]>();
    
    for (const tenant of this.tenants.values()) {
      const list = grouped.get(tenant.status) ?? [];
      list.push(tenant);
      grouped.set(tenant.status, list);
    }

    return grouped;
  }

  /**
   * 获取所有slug
   * @returns slug列表
   */
  async getAllSlugs(): Promise<string[]> {
    return Array.from(this.slugs.keys());
  }
}
