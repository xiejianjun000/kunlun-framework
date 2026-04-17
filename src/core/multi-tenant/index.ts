/**
 * 多租户管理模块 - 模块索引
 * Multi-Tenant Module Index
 * 
 * @module Kunlun.MultiTenant
 */

// ============== 类型导出 ==============
export * from './types';

// ============== 接口导出 ==============
export * from './interfaces';

// ============== 核心实现导出 ==============
export { TenantManager } from './core/TenantManager';
export { TenantRegistry } from './core/TenantRegistry';
export { TenantConfigManager } from './core/TenantConfigManager';

// ============== 资源隔离导出 ==============
export { ResourceIsolator } from './isolation/ResourceIsolator';
export { StorageIsolator, KunlunStorageIsolatorConfig } from './isolation/StorageIsolator';
export { VectorDbIsolator, KunlunVectorDbIsolatorConfig } from './isolation/VectorDbIsolator';
export { NetworkIsolator, KunlunNetworkIsolatorConfig } from './isolation/NetworkIsolator';

// ============== 配额管理导出 ==============
export { QuotaManager } from './quota/QuotaManager';
export { QuotaEnforcer, QuotaExceededError } from './quota/QuotaManager';
export { QuotaMonitor } from './quota/QuotaManager';

// ============== 计费系统导出 ==============
export { BillingEngine } from './billing/BillingEngine';
export { UsageTracker } from './billing/BillingEngine';
export { InvoiceGenerator } from './billing/BillingEngine';

// ============== 生命周期管理导出 ==============
export { TenantLifecycle } from './lifecycle/TenantLifecycle';
export { TenantProvisioner } from './lifecycle/TenantLifecycle';
export { TenantDeprovisioner } from './lifecycle/TenantLifecycle';

// ============== 便捷工厂函数 ==============

import { TenantManager, TenantManagerConfig } from './core/TenantManager';
import { TenantRegistry } from './core/TenantRegistry';
import { TenantConfigManager } from './core/TenantConfigManager';
import { QuotaManager, QuotaEnforcer, QuotaMonitor } from './quota/QuotaManager';
import { BillingEngine, UsageTracker, InvoiceGenerator } from './billing/BillingEngine';
import { TenantLifecycle, TenantProvisioner, TenantDeprovisioner } from './lifecycle/TenantLifecycle';
import { StorageIsolator } from './isolation/StorageIsolator';
import { VectorDbIsolator } from './isolation/VectorDbIsolator';
import { NetworkIsolator } from './isolation/NetworkIsolator';

/**
 * 多租户管理器配置
 */
export interface MultiTenantManagerConfig {
  /** 租户管理器配置 */
  tenantManager?: TenantManagerConfig;
  /** 存储隔离器配置 */
  storageConfig?: ConstructorParameters<typeof StorageIsolator>[0];
  /** 向量数据库隔离器配置 */
  vectorDbConfig?: ConstructorParameters<typeof VectorDbIsolator>[0];
  /** 网络隔离器配置 */
  networkConfig?: ConstructorParameters<typeof NetworkIsolator>[0];
}

/**
 * 多租户管理器
 * 提供完整的多租户管理功能
 */
export class MultiTenantManager {
  public tenantManager: TenantManager;
  public tenantRegistry: TenantRegistry;
  public configManager: TenantConfigManager;
  public quotaManager: QuotaManager;
  public quotaEnforcer: QuotaEnforcer;
  public quotaMonitor: QuotaMonitor;
  public billingEngine: BillingEngine;
  public usageTracker: UsageTracker;
  public invoiceGenerator: InvoiceGenerator;
  public lifecycle: TenantLifecycle;

  constructor(config: MultiTenantManagerConfig = {}) {
    // 初始化核心组件
    this.tenantRegistry = new TenantRegistry();
    this.configManager = new TenantConfigManager();
    this.tenantManager = new TenantManager({
      registry: config.tenantManager?.registry,
      eventsEnabled: true,
    });

    // 初始化配额管理
    this.quotaManager = new QuotaManager();
    this.quotaEnforcer = new QuotaEnforcer(this.quotaManager);
    this.quotaMonitor = new QuotaMonitor(this.quotaManager);

    // 初始化计费系统
    this.billingEngine = new BillingEngine();
    this.usageTracker = new UsageTracker();
    this.invoiceGenerator = new InvoiceGenerator();

    // 初始化生命周期管理
    this.lifecycle = new TenantLifecycle({
      storageConfig: config.storageConfig,
      vectorDbConfig: config.vectorDbConfig,
      networkConfig: config.networkConfig,
    });
  }

  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    await this.tenantManager.initialize();
    this.quotaMonitor.start();
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    this.quotaMonitor.stop();
    await this.tenantManager.destroy();
  }
}

/**
 * 创建默认配置的多租户管理器
 * @returns MultiTenantManager实例
 */
export function createDefaultMultiTenantManager(): MultiTenantManager {
  return new MultiTenantManager();
}

// ============== 快速使用示例 ==============

/**
 * @example
 * ```typescript
 * // 方式1: 使用便捷工厂函数
 * const manager = createDefaultMultiTenantManager();
 * await manager.initialize();
 * 
 * // 创建租户
 * const tenant = await manager.tenantManager.createTenant({
 *   name: '示例公司',
 *   ownerId: 'user_001',
 *   planId: 'professional',
 * });
 * 
 * // 分配配额
 * await manager.quotaManager.allocateQuotas(tenant.id, [
 *   { type: 'api_calls', limit: 10000 },
 *   { type: 'storage', limit: 10, unit: 'GB' },
 * ]);
 * 
 * // 记录使用
 * await manager.quotaManager.recordUsage(tenant.id, 'api_calls', 100);
 * 
 * // 生成账单
 * const invoice = await manager.billingEngine.generateInvoice({
 *   tenantId: tenant.id,
 *   periodStart: new Date('2024-01-01'),
 *   periodEnd: new Date('2024-01-31'),
 * });
 * 
 * await manager.destroy();
 * 
 * // 方式2: 直接使用各个组件
 * const tenantManager = new TenantManager();
 * const quotaManager = new QuotaManager();
 * const billingEngine = new BillingEngine();
 * ```
 */
