/**
 * 配额管理器接口
 * Quota Manager Interface
 * 
 * @module Taiji.MultiTenant.Interfaces
 */

import {
  ResourceType,
  ResourceUsage,
  QuotaUsageReport,
  ResourceQuotaConfig,
} from '../types';

/**
 * 配额检查结果
 */
export interface QuotaCheckResult {
  /** 是否允许 */
  allowed: boolean;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 当前使用量 */
  currentUsage: number;
  /** 配额上限 */
  limit: number;
  /** 请求的使用量 */
  requested: number;
  /** 剩余可用量 */
  remaining: number;
  /** 是否超过配额 */
  exceeded: boolean;
  /** 是否达到警告阈值 */
  warningThresholdReached: boolean;
  /** 错误消息 */
  message?: string;
}

/**
 * 配额分配记录
 */
export interface QuotaAllocation {
  /** 分配ID */
  id: string;
  /** 租户ID */
  tenantId: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 已分配量 */
  allocated: number;
  /** 配额上限 */
  limit: number;
  /** 单位 */
  unit?: string;
  /** 分配时间 */
  allocatedAt: Date;
  /** 到期时间 */
  expiresAt?: Date;
}

/**
 * 配额更新事件
 */
export interface QuotaUpdateEvent {
  /** 租户ID */
  tenantId: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 旧配额 */
  oldLimit: number;
  /** 新配额 */
  newLimit: number;
  /** 原因 */
  reason?: string;
}

/**
 * 配额管理器接口
 * 负责资源配额的分配、监控和强制执行
 */
export interface IQuotaManager {
  // ============== 配额分配 ==============

  /**
   * 为租户分配配额
   * @param tenantId 租户ID
   * @param quotas 配额配置列表
   */
  allocateQuotas(tenantId: string, quotas: ResourceQuotaConfig[]): Promise<void>;

  /**
   * 更新租户配额
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param newLimit 新配额上限
   * @param reason 更新原因
   */
  updateQuota(
    tenantId: string,
    resourceType: ResourceType,
    newLimit: number,
    reason?: string
  ): Promise<void>;

  /**
   * 删除租户配额
   * @param tenantId 租户ID
   */
  deallocateQuotas(tenantId: string): Promise<void>;

  /**
   * 获取租户的配额
   * @param tenantId 租户ID
   * @returns 配额配置列表
   */
  getQuotas(tenantId: string): Promise<ResourceQuotaConfig[]>;

  // ============== 配额检查 ==============

  /**
   * 检查配额是否允许操作
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param requested 请求的使用量
   * @returns 检查结果
   */
  checkQuota(
    tenantId: string,
    resourceType: ResourceType,
    requested: number
  ): Promise<QuotaCheckResult>;

  /**
   * 批量检查配额
   * @param tenantId 租户ID
   * @param requests 请求列表
   * @returns 检查结果列表
   */
  checkQuotas(
    tenantId: string,
    requests: Array<{ resourceType: ResourceType; requested: number }>
  ): Promise<QuotaCheckResult[]>;

  /**
   * 预留配额
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param amount 预留量
   * @returns 分配记录
   */
  reserveQuota(
    tenantId: string,
    resourceType: ResourceType,
    amount: number
  ): Promise<QuotaAllocation>;

  /**
   * 释放预留配额
   * @param tenantId 租户ID
   * @param allocationId 分配记录ID
   */
  releaseQuota(tenantId: string, allocationId: string): Promise<void>;

  // ============== 使用量监控 ==============

  /**
   * 记录资源使用
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param amount 使用量
   * @param description 描述
   */
  recordUsage(
    tenantId: string,
    resourceType: ResourceType,
    amount: number,
    description?: string
  ): Promise<void>;

  /**
   * 获取资源使用量
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @returns 资源使用量
   */
  getUsage(tenantId: string, resourceType: ResourceType): Promise<ResourceUsage>;

  /**
   * 获取所有资源使用量
   * @param tenantId 租户ID
   * @returns 资源使用量列表
   */
  getAllUsage(tenantId: string): Promise<ResourceUsage[]>;

  /**
   * 生成配额使用报告
   * @param tenantId 租户ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 使用报告
   */
  generateUsageReport(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QuotaUsageReport>;

  /**
   * 获取超配额租户列表
   * @returns 超配额租户信息列表
   */
  getOverQuotaTenants(): Promise<Array<{ tenantId: string; resourceTypes: ResourceType[] }>>;

  // ============== 配额重置 ==============

  /**
   * 重置配额使用量
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   */
  resetUsage(tenantId: string, resourceType: ResourceType): Promise<void>;

  /**
   * 重置所有配额使用量
   * @param tenantId 租户ID
   */
  resetAllUsage(tenantId: string): Promise<void>;

  // ============== 配额查询 ==============

  /**
   * 获取配额分配记录
   * @param tenantId 租户ID
   * @returns 分配记录列表
   */
  getAllocations(tenantId: string): Promise<QuotaAllocation[]>;

  /**
   * 获取即将到期的配额分配
   * @param withinHours 多少小时内
   * @returns 即将到期的分配记录
   */
  getExpiringAllocations(withinHours: number): Promise<QuotaAllocation[]>;
}

/**
 * 配额强制执行器接口
 * 负责在操作时强制执行配额限制
 */
export interface IQuotaEnforcer {
  /**
   * 强制执行配额检查
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param requested 请求的使用量
   * @throws 如果超出配额则抛出错误
   */
  enforce(tenantId: string, resourceType: ResourceType, requested: number): Promise<void>;

  /**
   * 批量强制执行配额检查
   * @param tenantId 租户ID
   * @param requests 请求列表
   * @throws 如果任何资源超出配额则抛出错误
   */
  enforceBatch(
    tenantId: string,
    requests: Array<{ resourceType: ResourceType; requested: number }>
  ): Promise<void>;

  /**
   * 注册配额超限处理器
   * @param handler 处理器函数
   */
  onQuotaExceeded(handler: QuotaExceededHandler): void;

  /**
   * 注册配额警告处理器
   * @param handler 处理器函数
   */
  onQuotaWarning(handler: QuotaWarningHandler): void;
}

/**
 * 配额超限处理函数类型
 */
export type QuotaExceededHandler = (
  tenantId: string,
  resourceType: ResourceType,
  currentUsage: number,
  limit: number
) => Promise<void>;

/**
 * 配额警告处理函数类型
 */
export type QuotaWarningHandler = (
  tenantId: string,
  resourceType: ResourceType,
  currentUsage: number,
  limit: number,
  threshold: number
) => Promise<void>;

/**
 * 配额监控器接口
 * 负责持续监控配额使用情况并触发告警
 */
export interface IQuotaMonitor {
  /**
   * 启动监控
   */
  start(): void;

  /**
   * 停止监控
   */
  stop(): void;

  /**
   * 检查所有租户的配额
   */
  checkAllTenants(): Promise<void>;

  /**
   * 检查指定租户的配额
   * @param tenantId 租户ID
   */
  checkTenant(tenantId: string): Promise<void>;

  /**
   * 获取监控状态
   */
  getStatus(): MonitorStatus;

  /**
   * 设置检查间隔
   * @param intervalMs 间隔毫秒
   */
  setCheckInterval(intervalMs: number): void;
}

/**
 * 监控状态
 */
export interface MonitorStatus {
  /** 是否运行中 */
  running: boolean;
  /** 上次检查时间 */
  lastCheckTime: Date | null;
  /** 检查间隔 */
  checkInterval: number;
  /** 监控的租户数 */
  monitoredTenants: number;
  /** 当前告警数 */
  currentAlerts: number;
}
