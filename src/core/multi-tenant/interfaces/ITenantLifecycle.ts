/**
 * 租户生命周期管理器接口
 * Tenant Lifecycle Manager Interface
 * 
 * @module Kunlun.MultiTenant.Interfaces
 */

import {
  Tenant,
  TenantLifecycleEvent,
  LifecycleHook,
  LifecycleHookRegistration,
} from '../types';

/**
 * 生命周期操作结果
 */
export interface LifecycleOperationResult {
  /** 是否成功 */
  success: boolean;
  /** 租户 */
  tenant?: Tenant;
  /** 错误消息 */
  error?: string;
  /** 执行的操作 */
  operations: string[];
  /** 耗时(毫秒) */
  durationMs: number;
}

/**
 * 资源创建结果
 */
export interface ResourceCreationResult {
  /** 是否成功 */
  success: boolean;
  /** 创建的资源 */
  resources: string[];
  /** 错误消息 */
  error?: string;
}

/**
 * 资源销毁结果
 */
export interface ResourceDestructionResult {
  /** 是否成功 */
  success: boolean;
  /** 销毁的资源 */
  resources: string[];
  /** 残留的资源 */
  remaining: string[];
  /** 错误消息 */
  error?: string;
}

/**
 * 租户生命周期管理器接口
 * 负责租户的完整生命周期管理
 */
export interface ITenantLifecycle {
  // ============== 生命周期钩子 ==============

  /**
   * 注册生命周期钩子
   * @param registration 钩子注册信息
   */
  registerHook(registration: LifecycleHookRegistration): void;

  /**
   * 注销生命周期钩子
   * @param event 事件类型
   * @param hook 钩子函数
   */
  unregisterHook(event: TenantLifecycleEvent, hook: LifecycleHook): void;

  /**
   * 获取事件的所有钩子
   * @param event 事件类型
   * @returns 钩子函数列表
   */
  getHooks(event: TenantLifecycleEvent): LifecycleHook[];

  /**
   * 清空所有钩子
   */
  clearHooks(): void;

  // ============== 租户创建流程 ==============

  /**
   * 执行租户创建流程
   * @param tenant 租户信息
   * @returns 操作结果
   */
  executeCreate(tenant: Tenant): Promise<LifecycleOperationResult>;

  /**
   * 回滚租户创建
   * @param tenantId 租户ID
   * @param completedOperations 已完成的操作
   */
  rollbackCreate(
    tenantId: string,
    completedOperations: string[]
  ): Promise<void>;

  // ============== 租户更新流程 ==============

  /**
   * 执行租户更新流程
   * @param oldTenant 更新前的租户
   * @param newTenant 更新后的租户
   * @returns 操作结果
   */
  executeUpdate(
    oldTenant: Tenant,
    newTenant: Tenant
  ): Promise<LifecycleOperationResult>;

  /**
   * 回滚租户更新
   * @param tenantId 租户ID
   * @param oldTenant 更新前的租户
   */
  rollbackUpdate(tenantId: string, oldTenant: Tenant): Promise<void>;

  // ============== 租户删除流程 ==============

  /**
   * 执行租户删除流程
   * @param tenant 租户信息
   * @returns 操作结果
   */
  executeDelete(tenant: Tenant): Promise<LifecycleOperationResult>;

  /**
   * 回滚租户删除
   * @param tenantId 租户ID
   * @param completedOperations 已完成的操作
   */
  rollbackDelete(
    tenantId: string,
    completedOperations: string[]
  ): Promise<void>;

  // ============== 租户暂停/恢复流程 ==============

  /**
   * 暂停租户
   * @param tenant 租户信息
   * @param reason 暂停原因
   * @returns 操作结果
   */
  executeSuspend(
    tenant: Tenant,
    reason?: string
  ): Promise<LifecycleOperationResult>;

  /**
   * 恢复租户
   * @param tenant 租户信息
   * @returns 操作结果
   */
  executeResume(tenant: Tenant): Promise<LifecycleOperationResult>;

  // ============== 租户升级流程 ==============

  /**
   * 执行租户升级
   * @param tenant 租户信息
   * @param newPlanId 新计划ID
   * @returns 操作结果
   */
  executeUpgrade(
    tenant: Tenant,
    newPlanId: string
  ): Promise<LifecycleOperationResult>;

  /**
   * 回滚租户升级
   * @param tenantId 租户ID
   * @param oldPlanId 旧计划ID
   */
  rollbackUpgrade(tenantId: string, oldPlanId: string): Promise<void>;
}

/**
 * 租户资源创建器接口
 * 负责为租户创建所需的隔离资源
 */
export interface ITenantProvisioner {
  /**
   * 创建租户的所有隔离资源
   * @param tenant 租户信息
   * @returns 创建结果
   */
  provision(tenant: Tenant): Promise<ResourceCreationResult>;

  /**
   * 创建数据库资源
   * @param tenant 租户信息
   */
  createDatabaseResources(tenant: Tenant): Promise<void>;

  /**
   * 创建向量数据库资源
   * @param tenant 租户信息
   */
  createVectorDbResources(tenant: Tenant): Promise<void>;

  /**
   * 创建网络资源
   * @param tenant 租户信息
   */
  createNetworkResources(tenant: Tenant): Promise<void>;

  /**
   * 创建存储资源
   * @param tenant 租户信息
   */
  createStorageResources(tenant: Tenant): Promise<void>;

  /**
   * 初始化租户默认数据
   * @param tenant 租户信息
   */
  initializeDefaultData(tenant: Tenant): Promise<void>;

  /**
   * 验证资源创建
   * @param tenant 租户信息
   * @returns 是否验证通过
   */
  verifyProvisioning(tenant: Tenant): Promise<boolean>;
}

/**
 * 租户资源销毁器接口
 * 负责销毁租户的隔离资源
 */
export interface ITenantDeprovisioner {
  /**
   * 销毁租户的所有隔离资源
   * @param tenant 租户信息
   * @param force 是否强制销毁
   * @returns 销毁结果
   */
  deprovision(tenant: Tenant, force?: boolean): Promise<ResourceDestructionResult>;

  /**
   * 销毁数据库资源
   * @param tenant 租户信息
   * @param force 是否强制销毁
   */
  destroyDatabaseResources(tenant: Tenant, force?: boolean): Promise<void>;

  /**
   * 销毁向量数据库资源
   * @param tenant 租户信息
   * @param force 是否强制销毁
   */
  destroyVectorDbResources(tenant: Tenant, force?: boolean): Promise<void>;

  /**
   * 销毁网络资源
   * @param tenant 租户信息
   */
  destroyNetworkResources(tenant: Tenant): Promise<void>;

  /**
   * 销毁存储资源
   * @param tenant 租户信息
   */
  destroyStorageResources(tenant: Tenant): Promise<void>;

  /**
   * 归档租户数据
   * @param tenant 租户信息
   * @param archivePath 归档路径
   */
  archiveTenantData(tenant: Tenant, archivePath: string): Promise<void>;

  /**
   * 清理租户残留资源
   * @param tenantId 租户ID
   */
  cleanupOrphanedResources(tenantId: string): Promise<void>;

  /**
   * 验证资源销毁
   * @param tenant 租户信息
   * @returns 是否验证通过
   */
  verifyDeprovisioning(tenant: Tenant): Promise<boolean>;
}

/**
 * 资源操作接口
 * 定义资源创建和销毁的统一接口
 */
export interface IResourceOperation {
  /** 操作名称 */
  name: string;
  /** 执行操作 */
  execute(tenant: Tenant): Promise<void>;
  /** 回滚操作 */
  rollback?(tenant: Tenant): Promise<void>;
  /** 获取操作描述 */
  getDescription(): string;
}

/**
 * 操作日志
 */
export interface OperationLog {
  /** 日志ID */
  id: string;
  /** 租户ID */
  tenantId: string;
  /** 操作类型 */
  operation: string;
  /** 操作状态 */
  status: 'pending' | 'success' | 'failed' | 'rolled_back';
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 错误消息 */
  error?: string;
  /** 详情 */
  details?: Record<string, unknown>;
}
