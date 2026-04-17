/**
 * 多租户管理模块 - 类型定义
 * Multi-Tenant Module Type Definitions
 * 
 * @module Kunlun.MultiTenant.Types
 */

import { EventEmitter } from 'events';

// ============== 租户基础类型 ==============

/**
 * 租户状态枚举
 */
export enum TenantStatus {
  /** 创建中 */
  CREATING = 'creating',
  /** 运行中 */
  ACTIVE = 'active',
  /** 暂停 */
  SUSPENDED = 'suspended',
  /** 正在删除 */
  DELETING = 'deleting',
  /** 已删除 */
  DELETED = 'deleted',
  /** 升级中 */
  UPGRADING = 'upgrading',
  /** 试用中 */
  TRIAL = 'trial',
}

/**
 * 隔离级别枚举
 */
export enum IsolationLevel {
  /** 标准隔离 - schema级别 */
  STANDARD = 'standard',
  /** 严格隔离 - database级别 */
  STRICT = 'strict',
  /** 共享 - 无隔离 */
  SHARED = 'shared',
}

/**
 * 计费模式枚举
 */
export enum BillingMode {
  /** 免费套餐 */
  FREE = 'free',
  /** 按量计费 */
  PAY_AS_YOU_GO = 'pay_as_you_go',
  /** 套餐订阅 */
  SUBSCRIPTION = 'subscription',
  /** 企业定制 */
  ENTERPRISE = 'enterprise',
}

/**
 * 资源类型枚举
 */
export enum ResourceType {
  /** CPU资源 */
  CPU = 'cpu',
  /** 内存 */
  MEMORY = 'memory',
  /** 存储空间 */
  STORAGE = 'storage',
  /** API调用次数 */
  API_CALLS = 'api_calls',
  /** 向量存储 */
  VECTOR_STORAGE = 'vector_storage',
  /** 并发连接数 */
  CONCURRENT_CONNECTIONS = 'concurrent_connections',
  /** 消息数量 */
  MESSAGES = 'messages',
  /** 技能数量 */
  SKILLS = 'skills',
  /** 用户数量 */
  USERS = 'users',
  /** 团队数量 */
  TEAMS = 'teams',
}

// ============== 租户配置类型 ==============

/**
 * 资源配额配置
 */
export interface ResourceQuotaConfig {
  /** 资源类型 */
  type: ResourceType;
  /** 配额上限 */
  limit: number;
  /** 警告阈值 (0-1) */
  warningThreshold?: number;
  /** 配额单位 */
  unit?: string;
  /** 是否可扩展 */
  expandable?: boolean;
}

/**
 * 配额计划配置
 */
export interface QuotaPlanConfig {
  /** 计划ID */
  planId: string;
  /** 计划名称 */
  name: string;
  /** 资源配额列表 */
  quotas: ResourceQuotaConfig[];
  /** 价格 (按月) */
  monthlyPrice?: number;
  /** 价格 (按年) */
  yearlyPrice?: number;
  /** 描述 */
  description?: string;
  /** 功能特性 */
  features?: string[];
}

/**
 * 隔离配置
 */
export interface IsolationConfig {
  /** 隔离级别 */
  level: IsolationLevel;
  /** 数据库隔离配置 */
  database?: {
    /** 数据库名称前缀 */
    prefix?: string;
    /** 是否使用独立数据库 */
    dedicated?: boolean;
  };
  /** Schema隔离配置 */
  schema?: {
    /** Schema名称前缀 */
    prefix?: string;
  };
  /** 向量数据库隔离配置 */
  vectorDb?: {
    /** Collection前缀 */
    collectionPrefix?: string;
    /** 是否使用独立Collection */
    dedicated?: boolean;
  };
  /** 网络隔离配置 */
  network?: {
    /** Kubernetes命名空间前缀 */
    namespacePrefix?: string;
    /** 是否使用独立命名空间 */
    dedicated?: boolean;
  };
}

// ============== 租户数据模型 ==============

/**
 * 租户基础信息
 */
export interface TenantBase {
  /** 租户ID */
  id: string;
  /** 租户名称 */
  name: string;
  /** 租户slug (URL友好标识) */
  slug: string;
  /** 描述 */
  description?: string;
  /** 状态 */
  status: TenantStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 租户完整信息
 */
export interface Tenant extends TenantBase {
  /** 所有者用户ID */
  ownerId: string;
  /** 计费模式 */
  billingMode: BillingMode;
  /** 配额计划ID */
  planId: string;
  /** 隔离配置 */
  isolationConfig: IsolationConfig;
  /** 自定义域名 */
  customDomain?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 标签 */
  tags?: string[];
}

/**
 * 租户创建配置
 */
export interface TenantCreateConfig {
  /** 租户名称 */
  name: string;
  /** 租户slug */
  slug?: string;
  /** 描述 */
  description?: string;
  /** 所有者用户ID */
  ownerId: string;
  /** 计费模式 */
  billingMode?: BillingMode;
  /** 配额计划ID */
  planId?: string;
  /** 隔离配置 */
  isolationConfig?: Partial<IsolationConfig>;
  /** 自定义域名 */
  customDomain?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 标签 */
  tags?: string[];
}

/**
 * 租户更新配置
 */
export interface TenantUpdateConfig {
  /** 租户名称 */
  name?: string;
  /** 描述 */
  description?: string;
  /** 状态 */
  status?: TenantStatus;
  /** 计费模式 */
  billingMode?: BillingMode;
  /** 配额计划ID */
  planId?: string;
  /** 隔离配置 */
  isolationConfig?: Partial<IsolationConfig>;
  /** 自定义域名 */
  customDomain?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 标签 */
  tags?: string[];
}

// ============== 配额使用类型 ==============

/**
 * 资源使用量
 */
export interface ResourceUsage {
  /** 资源类型 */
  type: ResourceType;
  /** 已使用量 */
  used: number;
  /** 配额上限 */
  limit: number;
  /** 单位 */
  unit?: string;
  /** 使用率 */
  usageRate: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 配额使用报告
 */
export interface QuotaUsageReport {
  /** 租户ID */
  tenantId: string;
  /** 时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 资源使用列表 */
  usages: ResourceUsage[];
  /** 是否超过配额 */
  isOverQuota: boolean;
  /** 超额资源列表 */
  overQuotaResources: ResourceType[];
  /** 生成时间 */
  generatedAt: Date;
}

// ============== 计费类型 ==============

/**
 * 使用量记录
 */
export interface UsageRecord {
  /** 记录ID */
  id: string;
  /** 租户ID */
  tenantId: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 使用量 */
  quantity: number;
  /** 单位价格 */
  unitPrice: number;
  /** 总价 */
  totalPrice: number;
  /** 时间戳 */
  timestamp: Date;
  /** 描述 */
  description?: string;
}

/**
 * 账单项
 */
export interface InvoiceItem {
  /** 项目名称 */
  name: string;
  /** 资源类型 */
  resourceType?: ResourceType;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: string;
  /** 单价 */
  unitPrice: number;
  /** 小计 */
  subtotal: number;
}

/**
 * 账单
 */
export interface Invoice {
  /** 账单ID */
  id: string;
  /** 租户ID */
  tenantId: string;
  /** 账单周期 */
  period: {
    start: Date;
    end: Date;
  };
  /** 账单项列表 */
  items: InvoiceItem[];
  /** 小计 */
  subtotal: number;
  /** 折扣 */
  discount: number;
  /** 税费 */
  tax: number;
  /** 总计 */
  total: number;
  /** 货币 */
  currency: string;
  /** 状态 */
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  /** 创建时间 */
  createdAt: Date;
  /** 支付时间 */
  paidAt?: Date;
  /** 到期时间 */
  dueDate: Date;
}

// ============== 生命周期类型 ==============

/**
 * 租户生命周期事件
 */
export enum TenantLifecycleEvent {
  BEFORE_CREATE = 'before_create',
  AFTER_CREATE = 'after_create',
  BEFORE_UPDATE = 'before_update',
  AFTER_UPDATE = 'after_update',
  BEFORE_DELETE = 'before_delete',
  AFTER_DELETE = 'after_delete',
  BEFORE_SUSPEND = 'before_suspend',
  AFTER_SUSPEND = 'after_suspend',
  BEFORE_RESUME = 'before_resume',
  AFTER_RESUME = 'after_resume',
  BEFORE_UPGRADE = 'before_upgrade',
  AFTER_UPGRADE = 'after_upgrade',
  QUOTA_EXCEEDED = 'quota_exceeded',
  QUOTA_WARNING = 'quota_warning',
}

/**
 * 生命周期钩子函数类型
 */
export type LifecycleHook = (
  tenant: Tenant,
  context?: Record<string, unknown>
) => Promise<void> | void;

/**
 * 生命周期钩子注册
 */
export interface LifecycleHookRegistration {
  event: TenantLifecycleEvent;
  hook: LifecycleHook;
  order?: number;
}

// ============== 隔离资源标识 ==============

/**
 * 隔离资源标识符
 */
export interface TenantResourceIdentifiers {
  /** 租户ID */
  tenantId: string;
  /** 数据库名称 */
  databaseName?: string;
  /** Schema名称 */
  schemaName?: string;
  /** Collection名称 */
  collectionName?: string;
  /** Kubernetes命名空间 */
  namespace?: string;
  /** Redis Key前缀 */
  redisKeyPrefix?: string;
}

// ============== 资源隔离器接口引用 ==============

/**
 * 存储隔离器配置
 */
export interface StorageIsolatorConfig {
  /** 隔离级别 */
  isolationLevel: IsolationLevel;
  /** 默认Schema前缀 */
  defaultSchemaPrefix?: string;
  /** 数据库连接池配置 */
  connectionPool?: {
    min: number;
    max: number;
  };
}

/**
 * 向量数据库隔离器配置
 */
export interface VectorDbIsolatorConfig {
  /** 隔离级别 */
  isolationLevel: IsolationLevel;
  /** 默认Collection前缀 */
  defaultCollectionPrefix?: string;
  /** 向量数据库URL */
  url?: string;
}

/**
 * 网络隔离器配置
 */
export interface NetworkIsolatorConfig {
  /** 隔离级别 */
  isolationLevel: IsolationLevel;
  /** 默认命名空间前缀 */
  defaultNamespacePrefix?: string;
  /** 是否启用网络策略 */
  networkPolicyEnabled?: boolean;
}

// ============== 事件类型 ==============

/**
 * 租户事件数据
 */
export interface TenantEventData {
  tenant: Tenant;
  timestamp: Date;
  actor?: string;
  reason?: string;
}

/**
 * 配额事件数据
 */
export interface QuotaEventData {
  tenantId: string;
  resourceType: ResourceType;
  used: number;
  limit: number;
  threshold?: number;
  timestamp: Date;
}

// ============== 统计类型 ==============

/**
 * 租户统计信息
 */
export interface TenantStatistics {
  /** 租户总数 */
  totalTenants: number;
  /** 活跃租户数 */
  activeTenants: number;
  /** 暂停租户数 */
  suspendedTenants: number;
  /** 试用租户数 */
  trialTenants: number;
  /** 总资源使用量 */
  totalResourceUsage: Record<ResourceType, number>;
  /** 配额使用率 */
  averageUsageRate: Record<ResourceType, number>;
}

// ============== 导出事件发射器扩展 ==============

/**
 * 带事件发射功能的租户管理器接口
 */
export interface ITenantEventEmitter {
  on(event: TenantLifecycleEvent, listener: (data: TenantEventData) => void): this;
  off(event: TenantLifecycleEvent, listener: (data: TenantEventData) => void): this;
  emit(event: TenantLifecycleEvent, data: TenantEventData): boolean;
}

/**
 * 带事件发射功能的配额管理器接口
 */
export interface IQuotaEventEmitter {
  on(event: 'quota_warning' | 'quota_exceeded', listener: (data: QuotaEventData) => void): this;
  off(event: 'quota_warning' | 'quota_exceeded', listener: (data: QuotaEventData) => void): this;
  emit(event: 'quota_warning' | 'quota_exceeded', data: QuotaEventData): boolean;
}
