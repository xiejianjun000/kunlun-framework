/**
 * 配额管理器
 * Quota Manager - 资源配额管理
 * 
 * @module Kunlun.MultiTenant.Quota
 */

import { EventEmitter } from 'events';
import {
  ResourceType,
  ResourceUsage,
  QuotaUsageReport,
  ResourceQuotaConfig,
  QuotaEventData,
} from '../types';
import {
  IQuotaManager,
  IQuotaEnforcer,
  IQuotaMonitor,
  QuotaCheckResult,
  QuotaAllocation,
  QuotaExceededHandler,
  QuotaWarningHandler,
  MonitorStatus,
} from '../interfaces';
import { TenantConfigManager } from '../core/TenantConfigManager';

/**
 * 配额管理器配置
 */
export interface QuotaManagerConfig {
  /** 警告阈值默认值 */
  defaultWarningThreshold?: number;
  /** 是否启用监控 */
  monitorEnabled?: boolean;
  /** 检查间隔(ms) */
  checkInterval?: number;
}

/**
 * 配额使用记录
 */
interface UsageRecord {
  tenantId: string;
  resourceType: ResourceType;
  amount: number;
  timestamp: Date;
  description?: string;
}

/**
 * 配额分配记录
 */
interface AllocationRecord {
  id: string;
  tenantId: string;
  resourceType: ResourceType;
  allocated: number;
  limit: number;
  unit?: string;
  allocatedAt: Date;
  expiresAt?: Date;
}

/**
 * 配额管理器
 * 负责资源配额的分配、监控和强制执行
 * 
 * @example
 * ```typescript
 * const manager = new QuotaManager();
 * 
 * // 为租户分配配额
 * await manager.allocateQuotas('tenant_001', [
 *   { type: 'api_calls', limit: 10000 },
 *   { type: 'storage', limit: 10, unit: 'GB' },
 * ]);
 * 
 * // 检查配额
 * const result = await manager.checkQuota('tenant_001', 'api_calls', 100);
 * if (!result.allowed) {
 *   throw new Error('超出配额限制');
 * }
 * 
 * // 记录使用
 * await manager.recordUsage('tenant_001', 'api_calls', 100);
 * ```
 */
export class QuotaManager extends EventEmitter implements IQuotaManager {
  private config: QuotaManagerConfig;
  private configManager: TenantConfigManager;
  
  // 租户配额分配 Map<tenantId, Map<resourceType, ResourceQuotaConfig>>
  private allocations: Map<string, Map<ResourceType, ResourceQuotaConfig>> = new Map();
  
  // 使用量记录 Map<tenantId, UsageRecord[]>
  private usageRecords: Map<string, UsageRecord[]> = new Map();
  
  // 分配记录 Map<tenantId, AllocationRecord[]>
  private allocationRecords: Map<string, AllocationRecord[]> = new Map();
  
  // 配额锁定（预留） Map<tenantId, Map<resourceType, number>>
  private reservations: Map<string, Map<ResourceType, number>> = new Map();

  constructor(config: QuotaManagerConfig = {}) {
    super();
    this.config = {
      defaultWarningThreshold: config.defaultWarningThreshold ?? 0.8,
      monitorEnabled: config.monitorEnabled ?? true,
      checkInterval: config.checkInterval ?? 60000,
    };
    this.configManager = new TenantConfigManager();
  }

  /**
   * 为租户分配配额
   */
  async allocateQuotas(tenantId: string, quotas: ResourceQuotaConfig[]): Promise<void> {
    const tenantAllocations = this.allocations.get(tenantId) ?? new Map();
    
    for (const quota of quotas) {
      const quotaWithThreshold = {
        ...quota,
        warningThreshold: quota.warningThreshold ?? this.config.defaultWarningThreshold,
      };
      tenantAllocations.set(quota.type, quotaWithThreshold);
    }
    
    this.allocations.set(tenantId, tenantAllocations);
    this.emit('quotas_allocated', { tenantId, quotas });
  }

  /**
   * 更新租户配额
   */
  async updateQuota(
    tenantId: string,
    resourceType: ResourceType,
    newLimit: number,
    reason?: string
  ): Promise<void> {
    const tenantAllocations = this.allocations.get(tenantId);
    if (!tenantAllocations) {
      throw new Error(`租户 ${tenantId} 没有分配配额`);
    }

    const quota = tenantAllocations.get(resourceType);
    if (!quota) {
      throw new Error(`租户 ${tenantId} 没有 ${resourceType} 配额`);
    }

    const oldLimit = quota.limit;
    tenantAllocations.set(resourceType, { ...quota, limit: newLimit });
    
    this.emit('quota_updated', {
      tenantId,
      resourceType,
      oldLimit,
      newLimit,
      reason,
    });
  }

  /**
   * 删除租户配额
   */
  async deallocateQuotas(tenantId: string): Promise<void> {
    this.allocations.delete(tenantId);
    this.usageRecords.delete(tenantId);
    this.allocationRecords.delete(tenantId);
    this.reservations.delete(tenantId);
    this.emit('quotas_deallocated', { tenantId });
  }

  /**
   * 获取租户的配额
   */
  async getQuotas(tenantId: string): Promise<ResourceQuotaConfig[]> {
    const tenantAllocations = this.allocations.get(tenantId);
    if (!tenantAllocations) {
      return [];
    }
    return Array.from(tenantAllocations.values());
  }

  /**
   * 检查配额是否允许操作
   */
  async checkQuota(
    tenantId: string,
    resourceType: ResourceType,
    requested: number
  ): Promise<QuotaCheckResult> {
    const tenantAllocations = this.allocations.get(tenantId);
    if (!tenantAllocations) {
      return {
        allowed: false,
        resourceType,
        currentUsage: 0,
        limit: 0,
        requested,
        remaining: 0,
        exceeded: true,
        warningThresholdReached: false,
        message: `租户 ${tenantId} 没有分配配额`,
      };
    }

    const quota = tenantAllocations.get(resourceType);
    if (!quota) {
      return {
        allowed: false,
        resourceType,
        currentUsage: 0,
        limit: 0,
        requested,
        remaining: 0,
        exceeded: true,
        warningThresholdReached: false,
        message: `租户 ${tenantId} 没有 ${resourceType} 配额`,
      };
    }

    const currentUsage = this.calculateCurrentUsage(tenantId, resourceType);
    const reserved = this.getReservedAmount(tenantId, resourceType);
    const effectiveUsed = currentUsage + reserved;
    const remaining = Math.max(0, quota.limit - effectiveUsed);
    const usageRate = quota.limit > 0 ? effectiveUsed / quota.limit : 0;
    const warningThresholdReached = usageRate >= (quota.warningThreshold ?? 0.8);
    const exceeded = effectiveUsed + requested > quota.limit;

    return {
      allowed: !exceeded,
      resourceType,
      currentUsage: effectiveUsed,
      limit: quota.limit,
      requested,
      remaining,
      exceeded,
      warningThresholdReached,
      message: exceeded ? `超出 ${resourceType} 配额限制` : undefined,
    };
  }

  /**
   * 批量检查配额
   */
  async checkQuotas(
    tenantId: string,
    requests: Array<{ resourceType: ResourceType; requested: number }>
  ): Promise<QuotaCheckResult[]> {
    const results: QuotaCheckResult[] = [];
    
    for (const request of requests) {
      const result = await this.checkQuota(tenantId, request.resourceType, request.requested);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 预留配额
   */
  async reserveQuota(
    tenantId: string,
    resourceType: ResourceType,
    amount: number
  ): Promise<QuotaAllocation> {
    const checkResult = await this.checkQuota(tenantId, resourceType, amount);
    if (!checkResult.allowed) {
      throw new Error(`无法预留 ${resourceType} 配额: ${checkResult.message}`);
    }

    const tenantReservations = this.reservations.get(tenantId) ?? new Map();
    const currentReserved = tenantReservations.get(resourceType) ?? 0;
    tenantReservations.set(resourceType, currentReserved + amount);
    this.reservations.set(tenantId, tenantReservations);

    const allocationRecord: AllocationRecord = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      tenantId,
      resourceType,
      allocated: amount,
      limit: checkResult.limit,
      allocatedAt: new Date(),
    };

    const tenantAllocations = this.allocationRecords.get(tenantId) ?? [];
    tenantAllocations.push(allocationRecord);
    this.allocationRecords.set(tenantId, tenantAllocations);

    return {
      id: allocationRecord.id,
      tenantId,
      resourceType,
      allocated: amount,
      limit: checkResult.limit,
      unit: this.getQuotaUnit(resourceType),
      allocatedAt: allocationRecord.allocatedAt,
    };
  }

  /**
   * 释放预留配额
   */
  async releaseQuota(tenantId: string, allocationId: string): Promise<void> {
    const tenantAllocations = this.allocationRecords.get(tenantId);
    if (!tenantAllocations) {
      return;
    }

    const index = tenantAllocations.findIndex(a => a.id === allocationId);
    if (index === -1) {
      return;
    }

    const allocation = tenantAllocations[index];
    const tenantReservations = this.reservations.get(tenantId) ?? new Map();
    const currentReserved = tenantReservations.get(allocation.resourceType) ?? 0;
    tenantReservations.set(
      allocation.resourceType,
      Math.max(0, currentReserved - allocation.allocated)
    );
    this.reservations.set(tenantId, tenantReservations);

    tenantAllocations.splice(index, 1);
    this.allocationRecords.set(tenantId, tenantAllocations);
  }

  /**
   * 记录资源使用
   */
  async recordUsage(
    tenantId: string,
    resourceType: ResourceType,
    amount: number,
    description?: string
  ): Promise<void> {
    const record: UsageRecord = {
      tenantId,
      resourceType,
      amount,
      timestamp: new Date(),
      description,
    };

    const tenantRecords = this.usageRecords.get(tenantId) ?? [];
    tenantRecords.push(record);
    this.usageRecords.set(tenantId, tenantRecords);

    // 检查是否触发警告
    const quota = (this.allocations.get(tenantId))?.get(resourceType);
    if (quota) {
      const currentUsage = this.calculateCurrentUsage(tenantId, resourceType);
      const usageRate = currentUsage / quota.limit;
      
      if (usageRate >= (quota.warningThreshold ?? 0.8)) {
        this.emitQuotaWarning(tenantId, resourceType, currentUsage, quota.limit, quota.warningThreshold!);
      }
      
      if (currentUsage >= quota.limit) {
        this.emitQuotaExceeded(tenantId, resourceType, currentUsage, quota.limit);
      }
    }
  }

  /**
   * 获取资源使用量
   */
  async getUsage(tenantId: string, resourceType: ResourceType): Promise<ResourceUsage> {
    const quota = (this.allocations.get(tenantId))?.get(resourceType);
    const used = this.calculateCurrentUsage(tenantId, resourceType);
    const limit = quota?.limit ?? 0;

    return {
      type: resourceType,
      used,
      limit,
      unit: quota?.unit,
      usageRate: limit > 0 ? used / limit : 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * 获取所有资源使用量
   */
  async getAllUsage(tenantId: string): Promise<ResourceUsage[]> {
    const tenantAllocations = this.allocations.get(tenantId);
    if (!tenantAllocations) {
      return [];
    }

    const usages: ResourceUsage[] = [];
    for (const [resourceType, quota] of tenantAllocations.entries()) {
      const usage = await this.getUsage(tenantId, resourceType);
      usages.push(usage);
    }

    return usages;
  }

  /**
   * 生成配额使用报告
   */
  async generateUsageReport(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QuotaUsageReport> {
    const usages = await this.getAllUsage(tenantId);
    const overQuotaResources = usages
      .filter(u => u.used >= u.limit)
      .map(u => u.type);

    return {
      tenantId,
      timeRange: { start: startTime, end: endTime },
      usages,
      isOverQuota: overQuotaResources.length > 0,
      overQuotaResources,
      generatedAt: new Date(),
    };
  }

  /**
   * 获取超配额租户列表
   */
  async getOverQuotaTenants(): Promise<Array<{ tenantId: string; resourceTypes: ResourceType[] }>> {
    const overQuotaTenants: Array<{ tenantId: string; resourceTypes: ResourceType[] }> = [];

    for (const [tenantId] of this.allocations) {
      const usages = await this.getAllUsage(tenantId);
      const overQuotaResources = usages
        .filter(u => u.used >= u.limit)
        .map(u => u.type);

      if (overQuotaResources.length > 0) {
        overQuotaTenants.push({ tenantId, resourceTypes: overQuotaResources });
      }
    }

    return overQuotaTenants;
  }

  /**
   * 重置配额使用量
   */
  async resetUsage(tenantId: string, resourceType: ResourceType): Promise<void> {
    const tenantRecords = this.usageRecords.get(tenantId) ?? [];
    const filtered = tenantRecords.filter(r => r.resourceType !== resourceType);
    this.usageRecords.set(tenantId, filtered);
  }

  /**
   * 重置所有配额使用量
   */
  async resetAllUsage(tenantId: string): Promise<void> {
    this.usageRecords.delete(tenantId);
  }

  /**
   * 获取配额分配记录
   */
  async getAllocations(tenantId: string): Promise<QuotaAllocation[]> {
    const records = this.allocationRecords.get(tenantId) ?? [];
    return records.map(r => ({
      id: r.id,
      tenantId: r.tenantId,
      resourceType: r.resourceType,
      allocated: r.allocated,
      limit: r.limit,
      unit: r.unit,
      allocatedAt: r.allocatedAt,
      expiresAt: r.expiresAt,
    }));
  }

  /**
   * 获取即将到期的配额分配
   */
  async getExpiringAllocations(withinHours: number): Promise<QuotaAllocation[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    const expiring: QuotaAllocation[] = [];

    for (const records of this.allocationRecords.values()) {
      for (const record of records) {
        if (record.expiresAt && record.expiresAt <= threshold) {
          expiring.push({
            id: record.id,
            tenantId: record.tenantId,
            resourceType: record.resourceType,
            allocated: record.allocated,
            limit: record.limit,
            unit: record.unit,
            allocatedAt: record.allocatedAt,
            expiresAt: record.expiresAt,
          });
        }
      }
    }

    return expiring;
  }

  /**
   * 计算当前使用量
   */
  private calculateCurrentUsage(tenantId: string, resourceType: ResourceType): number {
    const records = this.usageRecords.get(tenantId) ?? [];
    return records
      .filter(r => r.resourceType === resourceType)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  /**
   * 获取预留金额
   */
  private getReservedAmount(tenantId: string, resourceType: ResourceType): number {
    return this.reservations.get(tenantId)?.get(resourceType) ?? 0;
  }

  /**
   * 获取配额单位
   */
  private getQuotaUnit(resourceType: ResourceType): string {
    const units: Record<ResourceType, string> = {
      [ResourceType.CPU]: 'core',
      [ResourceType.MEMORY]: 'MB',
      [ResourceType.STORAGE]: 'GB',
      [ResourceType.API_CALLS]: '次',
      [ResourceType.VECTOR_STORAGE]: 'MB',
      [ResourceType.CONCURRENT_CONNECTIONS]: '个',
      [ResourceType.MESSAGES]: '条',
      [ResourceType.SKILLS]: '个',
      [ResourceType.USERS]: '个',
      [ResourceType.TEAMS]: '个',
    };
    return units[resourceType] ?? '';
  }

  /**
   * 触发配额警告事件
   */
  private emitQuotaWarning(
    tenantId: string,
    resourceType: ResourceType,
    used: number,
    limit: number,
    threshold: number
  ): void {
    const eventData: QuotaEventData = {
      tenantId,
      resourceType,
      used,
      limit,
      threshold,
      timestamp: new Date(),
    };
    this.emit('quota_warning', eventData);
  }

  /**
   * 触发配额超限事件
   */
  private emitQuotaExceeded(
    tenantId: string,
    resourceType: ResourceType,
    used: number,
    limit: number
  ): void {
    const eventData: QuotaEventData = {
      tenantId,
      resourceType,
      used,
      limit,
      timestamp: new Date(),
    };
    this.emit('quota_exceeded', eventData);
  }
}

/**
 * 配额强制执行器
 * 负责在操作时强制执行配额限制
 */
export class QuotaEnforcer implements IQuotaEnforcer {
  private quotaManager: IQuotaManager;
  private exceededHandlers: QuotaExceededHandler[] = [];
  private warningHandlers: QuotaWarningHandler[] = [];

  constructor(quotaManager: IQuotaManager) {
    this.quotaManager = quotaManager;
  }

  /**
   * 强制执行配额检查
   */
  async enforce(tenantId: string, resourceType: ResourceType, requested: number): Promise<void> {
    const result = await this.quotaManager.checkQuota(tenantId, resourceType, requested);
    
    if (result.exceeded) {
      for (const handler of this.exceededHandlers) {
        await handler(tenantId, resourceType, result.currentUsage, result.limit);
      }
      throw new QuotaExceededError(tenantId, resourceType, result.currentUsage, result.limit);
    }
    
    if (result.warningThresholdReached) {
      const quota = (await this.quotaManager.getQuotas(tenantId)).find(q => q.type === resourceType);
      for (const handler of this.warningHandlers) {
        await handler(
          tenantId,
          resourceType,
          result.currentUsage,
          result.limit,
          quota?.warningThreshold ?? 0.8
        );
      }
    }
  }

  /**
   * 批量强制执行配额检查
   */
  async enforceBatch(
    tenantId: string,
    requests: Array<{ resourceType: ResourceType; requested: number }>
  ): Promise<void> {
    for (const request of requests) {
      await this.enforce(tenantId, request.resourceType, request.requested);
    }
  }

  /**
   * 注册配额超限处理器
   */
  onQuotaExceeded(handler: QuotaExceededHandler): void {
    this.exceededHandlers.push(handler);
  }

  /**
   * 注册配额警告处理器
   */
  onQuotaWarning(handler: QuotaWarningHandler): void {
    this.warningHandlers.push(handler);
  }
}

/**
 * 配额超限错误
 */
export class QuotaExceededError extends Error {
  constructor(
    public tenantId: string,
    public resourceType: ResourceType,
    public currentUsage: number,
    public limit: number
  ) {
    super(`租户 ${tenantId} 的 ${resourceType} 配额已超限 (${currentUsage}/${limit})`);
    this.name = 'QuotaExceededError';
  }
}

/**
 * 配额监控器
 * 负责持续监控配额使用情况并触发告警
 */
export class QuotaMonitor implements IQuotaMonitor {
  private quotaManager: IQuotaManager;
  private intervalId?: NodeJS.Timeout;
  private checkInterval: number;
  private running: boolean = false;
  private lastCheckTime: Date | null = null;
  private currentAlerts: number = 0;

  constructor(quotaManager: IQuotaManager, checkInterval: number = 60000) {
    this.quotaManager = quotaManager;
    this.checkInterval = checkInterval;
  }

  /**
   * 启动监控
   */
  start(): void {
    if (this.running) {
      return;
    }
    
    this.running = true;
    this.intervalId = setInterval(() => {
      this.checkAllTenants().catch(console.error);
    }, this.checkInterval);
    
    console.log('[QuotaMonitor] Started');
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.running = false;
    console.log('[QuotaMonitor] Stopped');
  }

  /**
   * 检查所有租户的配额
   */
  async checkAllTenants(): Promise<void> {
    this.lastCheckTime = new Date();
    
    const overQuotaTenants = await this.quotaManager.getOverQuotaTenants();
    this.currentAlerts = overQuotaTenants.length;
    
    for (const { tenantId, resourceTypes } of overQuotaTenants) {
      console.warn(`[QuotaMonitor] Tenant ${tenantId} is over quota: ${resourceTypes.join(', ')}`);
    }
  }

  /**
   * 检查指定租户的配额
   */
  async checkTenant(tenantId: string): Promise<void> {
    const usages = await this.quotaManager.getAllUsage(tenantId);
    const overQuota = usages.filter(u => u.used >= u.limit);
    
    if (overQuota.length > 0) {
      console.warn(`[QuotaMonitor] Tenant ${tenantId} is over quota: ${overQuota.map(u => u.type).join(', ')}`);
    }
  }

  /**
   * 获取监控状态
   */
  getStatus(): MonitorStatus {
    return {
      running: this.running,
      lastCheckTime: this.lastCheckTime,
      checkInterval: this.checkInterval,
      monitoredTenants: 0, // 需要从quotaManager获取
      currentAlerts: this.currentAlerts,
    };
  }

  /**
   * 设置检查间隔
   */
  setCheckInterval(intervalMs: number): void {
    this.checkInterval = intervalMs;
    if (this.running) {
      this.stop();
      this.start();
    }
  }
}
