/**
 * 租户生命周期管理器
 * Tenant Lifecycle Manager - 租户完整生命周期管理
 * 
 * @module Taiji.MultiTenant.Lifecycle
 */

import { EventEmitter } from 'events';
import {
  Tenant,
  TenantLifecycleEvent,
  LifecycleHook,
  LifecycleHookRegistration,
  IsolationLevel,
} from '../types';
import {
  ITenantLifecycle,
  ITenantProvisioner,
  ITenantDeprovisioner,
  LifecycleOperationResult,
  ResourceCreationResult,
  ResourceDestructionResult,
  OperationLog,
} from '../interfaces';
import { TenantRegistry } from '../core/TenantRegistry';
import { QuotaManager } from '../quota/QuotaManager';
import { StorageIsolator, TaijiStorageIsolatorConfig } from '../isolation/StorageIsolator';
import { VectorDbIsolator, TaijiVectorDbIsolatorConfig } from '../isolation/VectorDbIsolator';
import { NetworkIsolator, TaijiNetworkIsolatorConfig } from '../isolation/NetworkIsolator';

/**
 * 租户生命周期管理器配置
 */
export interface TenantLifecycleConfig {
  /** 存储隔离器配置 */
  storageConfig?: TaijiStorageIsolatorConfig;
  /** 向量数据库隔离器配置 */
  vectorDbConfig?: TaijiVectorDbIsolatorConfig;
  /** 网络隔离器配置 */
  networkConfig?: TaijiNetworkIsolatorConfig;
  /** 是否启用回滚 */
  rollbackEnabled?: boolean;
  /** 操作超时(ms) */
  operationTimeout?: number;
}

/**
 * 租户生命周期管理器
 * 负责租户的完整生命周期管理
 * 
 * @example
 * ```typescript
 * const lifecycle = new TenantLifecycle();
 * 
 * // 注册钩子
 * lifecycle.registerHook({
 *   event: TenantLifecycleEvent.AFTER_CREATE,
 *   hook: async (tenant) => {
 *     console.log(`租户 ${tenant.name} 创建完成`);
 *   },
 * });
 * 
 * // 执行创建
 * const result = await lifecycle.executeCreate(tenant);
 * console.log(result.success); // true
 * ```
 */
export class TenantLifecycle extends EventEmitter implements ITenantLifecycle {
  private config: TenantLifecycleConfig;
  private hooks: Map<TenantLifecycleEvent, LifecycleHook[]> = new Map();
  private operationLogs: OperationLog[] = [];
  private storageIsolator: StorageIsolator;
  private vectorDbIsolator: VectorDbIsolator;
  private networkIsolator: NetworkIsolator;
  private registry: TenantRegistry;
  private quotaManager: QuotaManager;

  constructor(config: TenantLifecycleConfig = {}) {
    super();
    this.config = {
      rollbackEnabled: config.rollbackEnabled ?? true,
      operationTimeout: config.operationTimeout ?? 30000,
      ...config,
    };

    // 初始化隔离器
    this.storageIsolator = new StorageIsolator({
      isolationLevel: config.storageConfig?.isolationLevel ?? IsolationLevel.STANDARD,
      defaultSchemaPrefix: 'tenant_',
    });

    this.vectorDbIsolator = new VectorDbIsolator({
      isolationLevel: config.vectorDbConfig?.isolationLevel ?? IsolationLevel.STANDARD,
      defaultCollectionPrefix: 'tenant_',
    });

    this.networkIsolator = new NetworkIsolator({
      isolationLevel: config.networkConfig?.isolationLevel ?? IsolationLevel.STANDARD,
      namespacePrefix: 'Taiji-tenant-',
    });

    // 初始化管理器
    this.registry = new TenantRegistry();
    this.quotaManager = new QuotaManager();
  }

  /**
   * 注册生命周期钩子
   */
  registerHook(registration: LifecycleHookRegistration): void {
    const hooks = this.hooks.get(registration.event) ?? [];
    hooks.push(registration.hook);
    hooks.sort((a, b) => (registration.order ?? 0) - (registration.order ?? 0));
    this.hooks.set(registration.event, hooks);
  }

  /**
   * 注销生命周期钩子
   */
  unregisterHook(event: TenantLifecycleEvent, hook: LifecycleHook): void {
    const hooks = this.hooks.get(event) ?? [];
    const index = hooks.indexOf(hook);
    if (index !== -1) {
      hooks.splice(index, 1);
      this.hooks.set(event, hooks);
    }
  }

  /**
   * 获取事件的所有钩子
   */
  getHooks(event: TenantLifecycleEvent): LifecycleHook[] {
    return this.hooks.get(event) ?? [];
  }

  /**
   * 清空所有钩子
   */
  clearHooks(): void {
    this.hooks.clear();
  }

  /**
   * 执行租户创建流程
   */
  async executeCreate(tenant: Tenant): Promise<LifecycleOperationResult> {
    const startTime = Date.now();
    const operations: string[] = [];

    try {
      // 触发BEFORE_CREATE事件
      await this.triggerHooks(TenantLifecycleEvent.BEFORE_CREATE, tenant);

      // 1. 创建存储隔离资源
      await this.storageIsolator.createIsolation(tenant.id);
      operations.push('storage_isolation_created');

      // 2. 创建向量数据库隔离资源
      await this.vectorDbIsolator.createIsolation(tenant.id);
      operations.push('vector_db_isolation_created');

      // 3. 创建网络隔离资源
      await this.networkIsolator.createIsolation(tenant.id);
      operations.push('network_isolation_created');

      // 触发AFTER_CREATE事件
      await this.triggerHooks(TenantLifecycleEvent.AFTER_CREATE, tenant);
      operations.push('hooks_executed');

      // 记录日志
      this.logOperation({
        id: this.generateLogId(),
        tenantId: tenant.id,
        operation: 'create',
        status: 'success',
        startTime: new Date(startTime),
        endTime: new Date(),
        details: { operations },
      });

      return {
        success: true,
        tenant,
        operations,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      // 回滚
      if (this.config.rollbackEnabled) {
        await this.rollbackCreate(tenant.id, operations);
      }

      // 记录日志
      this.logOperation({
        id: this.generateLogId(),
        tenantId: tenant.id,
        operation: 'create',
        status: 'failed',
        startTime: new Date(startTime),
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
        details: { operations },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operations,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 回滚租户创建
   */
  async rollbackCreate(tenantId: string, completedOperations: string[]): Promise<void> {
    console.log(`[TenantLifecycle] Rolling back create for tenant ${tenantId}`);

    // 逆序回滚
    const reversedOperations = [...completedOperations].reverse();
    
    for (const operation of reversedOperations) {
      try {
        switch (operation) {
          case 'network_isolation_created':
            await this.networkIsolator.destroyIsolation(tenantId);
            break;
          case 'vector_db_isolation_created':
            await this.vectorDbIsolator.destroyIsolation(tenantId);
            break;
          case 'storage_isolation_created':
            await this.storageIsolator.destroyIsolation(tenantId);
            break;
        }
      } catch (error) {
        console.error(`[TenantLifecycle] Rollback failed for ${operation}:`, error);
      }
    }
  }

  /**
   * 执行租户更新流程
   */
  async executeUpdate(
    oldTenant: Tenant,
    newTenant: Tenant
  ): Promise<LifecycleOperationResult> {
    const startTime = Date.now();
    const operations: string[] = [];

    try {
      // 触发BEFORE_UPDATE事件
      await this.triggerHooks(TenantLifecycleEvent.BEFORE_UPDATE, newTenant);

      // 更新注册表
      await this.registry.update(newTenant);
      operations.push('registry_updated');

      // 触发AFTER_UPDATE事件
      await this.triggerHooks(TenantLifecycleEvent.AFTER_UPDATE, newTenant);
      operations.push('hooks_executed');

      this.logOperation({
        id: this.generateLogId(),
        tenantId: newTenant.id,
        operation: 'update',
        status: 'success',
        startTime: new Date(startTime),
        endTime: new Date(),
        details: { operations },
      });

      return {
        success: true,
        tenant: newTenant,
        operations,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      if (this.config.rollbackEnabled) {
        await this.rollbackUpdate(newTenant.id, oldTenant);
      }

      this.logOperation({
        id: this.generateLogId(),
        tenantId: newTenant.id,
        operation: 'update',
        status: 'failed',
        startTime: new Date(startTime),
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
        details: { operations },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operations,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 回滚租户更新
   */
  async rollbackUpdate(tenantId: string, oldTenant: Tenant): Promise<void> {
    console.log(`[TenantLifecycle] Rolling back update for tenant ${tenantId}`);
    await this.registry.update(oldTenant);
  }

  /**
   * 执行租户删除流程
   */
  async executeDelete(tenant: Tenant): Promise<LifecycleOperationResult> {
    const startTime = Date.now();
    const operations: string[] = [];

    try {
      // 触发BEFORE_DELETE事件
      await this.triggerHooks(TenantLifecycleEvent.BEFORE_DELETE, tenant);

      // 1. 删除网络隔离资源
      await this.networkIsolator.destroyIsolation(tenant.id);
      operations.push('network_isolation_destroyed');

      // 2. 删除向量数据库隔离资源
      await this.vectorDbIsolator.destroyIsolation(tenant.id);
      operations.push('vector_db_isolation_destroyed');

      // 3. 删除存储隔离资源
      await this.storageIsolator.destroyIsolation(tenant.id);
      operations.push('storage_isolation_destroyed');

      // 4. 注销租户
      await this.registry.unregister(tenant.id);
      operations.push('registry_unregistered');

      // 触发AFTER_DELETE事件
      await this.triggerHooks(TenantLifecycleEvent.AFTER_DELETE, tenant);
      operations.push('hooks_executed');

      this.logOperation({
        id: this.generateLogId(),
        tenantId: tenant.id,
        operation: 'delete',
        status: 'success',
        startTime: new Date(startTime),
        endTime: new Date(),
        details: { operations },
      });

      return {
        success: true,
        operations,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logOperation({
        id: this.generateLogId(),
        tenantId: tenant.id,
        operation: 'delete',
        status: 'failed',
        startTime: new Date(startTime),
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
        details: { operations },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operations,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 回滚租户删除
   */
  async rollbackDelete(tenantId: string, completedOperations: string[]): Promise<void> {
    console.log(`[TenantLifecycle] Rolling back delete for tenant ${tenantId}`);
    // 重新创建资源
    for (const operation of completedOperations) {
      if (operation.includes('isolation_created')) {
        try {
          await this.storageIsolator.createIsolation(tenantId);
          await this.vectorDbIsolator.createIsolation(tenantId);
          await this.networkIsolator.createIsolation(tenantId);
        } catch {
          // 忽略
        }
      }
    }
  }

  /**
   * 暂停租户
   */
  async executeSuspend(tenant: Tenant, reason?: string): Promise<LifecycleOperationResult> {
    const startTime = Date.now();

    try {
      await this.triggerHooks(TenantLifecycleEvent.BEFORE_SUSPEND, tenant, { reason });

      // 更新租户状态
      tenant.status = 'suspended' as any;
      await this.registry.update(tenant);

      await this.triggerHooks(TenantLifecycleEvent.AFTER_SUSPEND, tenant, { reason });

      return {
        success: true,
        tenant,
        operations: ['tenant_suspended'],
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operations: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 恢复租户
   */
  async executeResume(tenant: Tenant): Promise<LifecycleOperationResult> {
    const startTime = Date.now();

    try {
      await this.triggerHooks(TenantLifecycleEvent.BEFORE_RESUME, tenant);

      tenant.status = 'active' as any;
      await this.registry.update(tenant);

      await this.triggerHooks(TenantLifecycleEvent.AFTER_RESUME, tenant);

      return {
        success: true,
        tenant,
        operations: ['tenant_resumed'],
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operations: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行租户升级
   */
  async executeUpgrade(tenant: Tenant, newPlanId: string): Promise<LifecycleOperationResult> {
    const startTime = Date.now();
    const oldPlanId = tenant.planId;

    try {
      await this.triggerHooks(TenantLifecycleEvent.BEFORE_UPGRADE, tenant, { newPlanId });

      tenant.planId = newPlanId;
      await this.registry.update(tenant);

      await this.triggerHooks(TenantLifecycleEvent.AFTER_UPGRADE, tenant, { oldPlanId, newPlanId });

      return {
        success: true,
        tenant,
        operations: ['plan_upgraded'],
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      if (this.config.rollbackEnabled) {
        await this.rollbackUpgrade(tenant.id, oldPlanId);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operations: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 回滚租户升级
   */
  async rollbackUpgrade(tenantId: string, oldPlanId: string): Promise<void> {
    console.log(`[TenantLifecycle] Rolling back upgrade for tenant ${tenantId}`);
    const tenant = await this.registry.get(tenantId);
    if (tenant) {
      tenant.planId = oldPlanId;
      await this.registry.update(tenant);
    }
  }

  /**
   * 触发钩子
   */
  private async triggerHooks(
    event: TenantLifecycleEvent,
    tenant: Tenant,
    context?: Record<string, unknown>
  ): Promise<void> {
    const hooks = this.hooks.get(event) ?? [];
    for (const hook of hooks) {
      await hook(tenant, context);
    }
  }

  /**
   * 记录操作日志
   */
  private logOperation(log: OperationLog): void {
    this.operationLogs.push(log);
    this.emit('operation_logged', log);
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取操作日志
   */
  getOperationLogs(): OperationLog[] {
    return [...this.operationLogs];
  }

  /**
   * 获取租户的操作日志
   */
  getTenantOperationLogs(tenantId: string): OperationLog[] {
    return this.operationLogs.filter(log => log.tenantId === tenantId);
  }
}

/**
 * 租户资源创建器
 * 负责为租户创建所需的隔离资源
 */
export class TenantProvisioner implements ITenantProvisioner {
  private storageIsolator: StorageIsolator;
  private vectorDbIsolator: VectorDbIsolator;
  private networkIsolator: NetworkIsolator;

  constructor(
    storageIsolator: StorageIsolator,
    vectorDbIsolator: VectorDbIsolator,
    networkIsolator: NetworkIsolator
  ) {
    this.storageIsolator = storageIsolator;
    this.vectorDbIsolator = vectorDbIsolator;
    this.networkIsolator = networkIsolator;
  }

  /**
   * 创建租户的所有隔离资源
   */
  async provision(tenant: Tenant): Promise<ResourceCreationResult> {
    const resources: string[] = [];

    try {
      await this.createDatabaseResources(tenant);
      resources.push('database');

      await this.createVectorDbResources(tenant);
      resources.push('vector_db');

      await this.createNetworkResources(tenant);
      resources.push('network');

      await this.createStorageResources(tenant);
      resources.push('storage');

      await this.initializeDefaultData(tenant);
      resources.push('default_data');

      return { success: true, resources };
    } catch (error) {
      return {
        success: false,
        resources,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 创建数据库资源
   */
  async createDatabaseResources(tenant: Tenant): Promise<void> {
    console.log(`[TenantProvisioner] Creating database resources for ${tenant.id}`);
    await this.storageIsolator.createIsolation(tenant.id);
  }

  /**
   * 创建向量数据库资源
   */
  async createVectorDbResources(tenant: Tenant): Promise<void> {
    console.log(`[TenantProvisioner] Creating vector DB resources for ${tenant.id}`);
    await this.vectorDbIsolator.createIsolation(tenant.id);
  }

  /**
   * 创建网络资源
   */
  async createNetworkResources(tenant: Tenant): Promise<void> {
    console.log(`[TenantProvisioner] Creating network resources for ${tenant.id}`);
    await this.networkIsolator.createIsolation(tenant.id);
  }

  /**
   * 创建存储资源
   */
  async createStorageResources(tenant: Tenant): Promise<void> {
    console.log(`[TenantProvisioner] Creating storage resources for ${tenant.id}`);
    // 创建租户存储目录等
  }

  /**
   * 初始化租户默认数据
   */
  async initializeDefaultData(tenant: Tenant): Promise<void> {
    console.log(`[TenantProvisioner] Initializing default data for ${tenant.id}`);
    // 初始化默认配置、数据等
  }

  /**
   * 验证资源创建
   */
  async verifyProvisioning(tenant: Tenant): Promise<boolean> {
    const hasStorage = this.storageIsolator.hasIsolation(tenant.id);
    const hasVectorDb = this.vectorDbIsolator.hasIsolation(tenant.id);
    const hasNetwork = this.networkIsolator.hasIsolation(tenant.id);

    return hasStorage && hasVectorDb && hasNetwork;
  }
}

/**
 * 租户资源销毁器
 * 负责销毁租户的隔离资源
 */
export class TenantDeprovisioner implements ITenantDeprovisioner {
  private storageIsolator: StorageIsolator;
  private vectorDbIsolator: VectorDbIsolator;
  private networkIsolator: NetworkIsolator;

  constructor(
    storageIsolator: StorageIsolator,
    vectorDbIsolator: VectorDbIsolator,
    networkIsolator: NetworkIsolator
  ) {
    this.storageIsolator = storageIsolator;
    this.vectorDbIsolator = vectorDbIsolator;
    this.networkIsolator = networkIsolator;
  }

  /**
   * 销毁租户的所有隔离资源
   */
  async deprovision(tenant: Tenant, force?: boolean): Promise<ResourceDestructionResult> {
    const resources: string[] = [];
    const remaining: string[] = [];

    try {
      await this.destroyNetworkResources(tenant);
      resources.push('network');
    } catch {
      remaining.push('network');
    }

    try {
      await this.destroyVectorDbResources(tenant, force);
      resources.push('vector_db');
    } catch {
      remaining.push('vector_db');
    }

    try {
      await this.destroyDatabaseResources(tenant, force);
      resources.push('database');
    } catch {
      remaining.push('database');
    }

    try {
      await this.destroyStorageResources(tenant);
      resources.push('storage');
    } catch {
      remaining.push('storage');
    }

    return {
      success: remaining.length === 0,
      resources,
      remaining,
      error: remaining.length > 0 ? '部分资源销毁失败' : undefined,
    };
  }

  /**
   * 销毁数据库资源
   */
  async destroyDatabaseResources(tenant: Tenant, force?: boolean): Promise<void> {
    console.log(`[TenantDeprovisioner] Destroying database resources for ${tenant.id}`);
    await this.storageIsolator.destroyIsolation(tenant.id);
  }

  /**
   * 销毁向量数据库资源
   */
  async destroyVectorDbResources(tenant: Tenant, force?: boolean): Promise<void> {
    console.log(`[TenantDeprovisioner] Destroying vector DB resources for ${tenant.id}`);
    await this.vectorDbIsolator.destroyIsolation(tenant.id);
  }

  /**
   * 销毁网络资源
   */
  async destroyNetworkResources(tenant: Tenant): Promise<void> {
    console.log(`[TenantDeprovisioner] Destroying network resources for ${tenant.id}`);
    await this.networkIsolator.destroyIsolation(tenant.id);
  }

  /**
   * 销毁存储资源
   */
  async destroyStorageResources(tenant: Tenant): Promise<void> {
    console.log(`[TenantDeprovisioner] Destroying storage resources for ${tenant.id}`);
    // 清理存储目录等
  }

  /**
   * 归档租户数据
   */
  async archiveTenantData(tenant: Tenant, archivePath: string): Promise<void> {
    console.log(`[TenantDeprovisioner] Archiving data for ${tenant.id} to ${archivePath}`);
    // 实现数据归档逻辑
  }

  /**
   * 清理租户残留资源
   */
  async cleanupOrphanedResources(tenantId: string): Promise<void> {
    console.log(`[TenantDeprovisioner] Cleaning up orphaned resources for ${tenantId}`);
  }

  /**
   * 验证资源销毁
   */
  async verifyDeprovisioning(tenant: Tenant): Promise<boolean> {
    const hasStorage = this.storageIsolator.hasIsolation(tenant.id);
    const hasVectorDb = this.vectorDbIsolator.hasIsolation(tenant.id);
    const hasNetwork = this.networkIsolator.hasIsolation(tenant.id);

    return !hasStorage && !hasVectorDb && !hasNetwork;
  }
}
