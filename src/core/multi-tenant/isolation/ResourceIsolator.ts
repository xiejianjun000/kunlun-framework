/**
 * 资源隔离器基类
 * Resource Isolator Base Class
 * 
 * @module Taiji.MultiTenant.Isolation
 */

import {
  IsolationLevel,
  TenantResourceIdentifiers,
} from '../types';
import { IResourceIsolator } from '../interfaces';

/**
 * 资源隔离器基类
 * 提供资源隔离的通用功能
 */
export abstract class ResourceIsolator implements IResourceIsolator {
  protected isolationLevel: IsolationLevel;
  protected identifiers: Map<string, TenantResourceIdentifiers> = new Map();

  constructor(level: IsolationLevel = IsolationLevel.STANDARD) {
    this.isolationLevel = level;
  }

  /**
   * 获取隔离级别
   */
  getIsolationLevel(): IsolationLevel {
    return this.isolationLevel;
  }

  /**
   * 设置隔离级别
   * @param level 隔离级别
   */
  setIsolationLevel(level: IsolationLevel): void {
    this.isolationLevel = level;
  }

  /**
   * 为租户创建隔离资源
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  abstract createIsolation(tenantId: string): Promise<TenantResourceIdentifiers>;

  /**
   * 删除租户的隔离资源
   * @param tenantId 租户ID
   */
  abstract destroyIsolation(tenantId: string): Promise<void>;

  /**
   * 获取租户的隔离资源标识符
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  getIdentifiers(tenantId: string): TenantResourceIdentifiers {
    return this.identifiers.get(tenantId) ?? { tenantId };
  }

  /**
   * 检查租户是否有隔离资源
   * @param tenantId 租户ID
   * @returns 是否有隔离资源
   */
  hasIsolation(tenantId: string): boolean {
    return this.identifiers.has(tenantId);
  }

  /**
   * 清理所有隔离资源
   */
  async cleanup(): Promise<void> {
    const tenantIds = Array.from(this.identifiers.keys());
    for (const tenantId of tenantIds) {
      await this.destroyIsolation(tenantId);
    }
    this.identifiers.clear();
  }

  /**
   * 获取所有租户ID
   * @returns 租户ID列表
   */
  protected getAllTenantIds(): string[] {
    return Array.from(this.identifiers.keys());
  }

  /**
   * 存储隔离标识符
   * @param tenantId 租户ID
   * @param identifiers 隔离标识符
   */
  protected storeIdentifiers(
    tenantId: string,
    identifiers: TenantResourceIdentifiers
  ): void {
    this.identifiers.set(tenantId, identifiers);
  }

  /**
   * 移除隔离标识符
   * @param tenantId 租户ID
   */
  protected removeIdentifiers(tenantId: string): void {
    this.identifiers.delete(tenantId);
  }
}
