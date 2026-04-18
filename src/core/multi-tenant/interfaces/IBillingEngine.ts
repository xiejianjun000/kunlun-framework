/**
 * 计费引擎接口
 * Billing Engine Interface
 * 
 * @module Taiji.MultiTenant.Interfaces
 */

import {
  UsageRecord,
  Invoice,
  InvoiceItem,
  ResourceType,
  BillingMode,
  InvoiceStatus,
} from '../types';

/**
 * 账单周期
 */
export enum BillingCycle {
  /** 每天 */
  DAILY = 'daily',
  /** 每周 */
  WEEKLY = 'weekly',
  /** 每月 */
  MONTHLY = 'monthly',
  /** 每季度 */
  QUARTERLY = 'quarterly',
  /** 每年 */
  YEARLY = 'yearly',
}

/**
 * 资源单价配置
 */
export interface ResourcePricing {
  /** 资源类型 */
  resourceType: ResourceType;
  /** 单价 */
  unitPrice: number;
  /** 单位 */
  unit: string;
  /** 计量周期 */
  billingCycle: BillingCycle;
  /** 阶梯定价 */
  tieredPricing?: TierPrice[];
}

/**
 * 阶梯价格配置
 */
export interface TierPrice {
  /** 起始用量 */
  from: number;
  /** 结束用量 (-1表示无上限) */
  to: number;
  /** 该阶梯单价 */
  unitPrice: number;
}

/**
 * 使用量汇总
 */
export interface UsageSummary {
  /** 租户ID */
  tenantId: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 总使用量 */
  totalQuantity: number;
  /** 总费用 */
  totalCost: number;
  /** 计量周期 */
  billingCycle: BillingCycle;
  /** 周期开始 */
  periodStart: Date;
  /** 周期结束 */
  periodEnd: Date;
}

/**
 * 账单生成选项
 */
export interface InvoiceGenerationOptions {
  /** 租户ID */
  tenantId: string;
  /** 周期开始 */
  periodStart: Date;
  /** 周期结束 */
  periodEnd: Date;
  /** 是否包含订阅费用 */
  includeSubscription?: boolean;
  /** 折扣码 */
  discountCode?: string;
  /** 折扣百分比 */
  discountPercent?: number;
  /** 税费百分比 */
  taxPercent?: number;
}

/**
 * 支付记录
 */
export interface PaymentRecord {
  /** 支付ID */
  id: string;
  /** 账单ID */
  invoiceId: string;
  /** 租户ID */
  tenantId: string;
  /** 支付金额 */
  amount: number;
  /** 支付方式 */
  method: PaymentMethod;
  /** 支付状态 */
  status: PaymentStatus;
  /** 交易ID */
  transactionId?: string;
  /** 支付时间 */
  paidAt?: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 备注 */
  note?: string;
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  /** 信用卡 */
  CREDIT_CARD = 'credit_card',
  /** 支付宝 */
  ALIPAY = 'alipay',
  /** 微信支付 */
  WECHAT_PAY = 'wechat_pay',
  /** 银行转账 */
  BANK_TRANSFER = 'bank_transfer',
  /** 企业转账 */
  CORPORATE_TRANSFER = 'corporate_transfer',
  /** PayPal */
  PAYPAL = 'paypal',
}

/**
 * 支付状态
 */
export enum PaymentStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 成功 */
  SUCCESS = 'success',
  /** 失败 */
  FAILED = 'failed',
  /** 已退款 */
  REFUNDED = 'refunded',
}

/**
 * 计费引擎接口
 * 负责计费、账单生成和支付处理
 */
export interface IBillingEngine {
  // ============== 定价管理 ==============

  /**
   * 获取资源定价
   * @param resourceType 资源类型
   * @returns 资源定价配置
   */
  getResourcePricing(resourceType: ResourceType): ResourcePricing | null;

  /**
   * 设置资源定价
   * @param pricing 资源定价配置
   */
  setResourcePricing(pricing: ResourcePricing): void;

  /**
   * 获取所有资源定价
   * @returns 资源定价列表
   */
  getAllResourcePricings(): ResourcePricing[];

  // ============== 费用计算 ==============

  /**
   * 计算资源费用
   * @param resourceType 资源类型
   * @param quantity 使用量
   * @returns 费用
   */
  calculateCost(resourceType: ResourceType, quantity: number): number;

  /**
   * 计算使用量汇总
   * @param tenantId 租户ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 使用量汇总列表
   */
  calculateUsageSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<UsageSummary[]>;

  /**
   * 计算账单总额
   * @param tenantId 租户ID
   * @param billingMode 计费模式
   * @param planId 计划ID
   * @param periodStart 周期开始
   * @param periodEnd 周期结束
   * @returns 账单总额
   */
  calculateTotalCost(
    tenantId: string,
    billingMode: BillingMode,
    planId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number>;

  // ============== 账单管理 ==============

  /**
   * 生成账单
   * @param options 账单生成选项
   * @returns 生成的账单
   */
  generateInvoice(options: InvoiceGenerationOptions): Promise<Invoice>;

  /**
   * 获取账单
   * @param invoiceId 账单ID
   * @returns 账单
   */
  getInvoice(invoiceId: string): Promise<Invoice | null>;

  /**
   * 获取租户的账单列表
   * @param tenantId 租户ID
   * @param status 账单状态筛选
   * @param limit 返回数量限制
   * @returns 账单列表
   */
  getTenantInvoices(
    tenantId: string,
    status?: InvoiceStatus,
    limit?: number
  ): Promise<Invoice[]>;

  /**
   * 更新账单状态
   * @param invoiceId 账单ID
   * @param status 新状态
   */
  updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void>;

  /**
   * 标记账单为已支付
   * @param invoiceId 账单ID
   * @param paymentRecord 支付记录
   */
  markAsPaid(invoiceId: string, paymentRecord: PaymentRecord): Promise<void>;

  /**
   * 取消账单
   * @param invoiceId 账单ID
   * @param reason 取消原因
   */
  cancelInvoice(invoiceId: string, reason?: string): Promise<void>;

  // ============== 支付处理 ==============

  /**
   * 创建支付
   * @param invoiceId 账单ID
   * @param method 支付方式
   * @returns 支付记录
   */
  createPayment(invoiceId: string, method: PaymentMethod): Promise<PaymentRecord>;

  /**
   * 确认支付
   * @param paymentId 支付ID
   * @param transactionId 交易ID
   * @returns 是否成功
   */
  confirmPayment(paymentId: string, transactionId: string): Promise<boolean>;

  /**
   * 退款
   * @param invoiceId 账单ID
   * @param amount 退款金额
   * @param reason 退款原因
   */
  refundPayment(invoiceId: string, amount: number, reason?: string): Promise<void>;

  // ============== 统计分析 ==============

  /**
   * 获取账单统计
   * @param tenantId 租户ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 统计信息
   */
  getBillingStats(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BillingStatistics>;

  /**
   * 获取待支付账单
   * @param tenantId 租户ID
   * @returns 待支付账单总额
   */
  getPendingAmount(tenantId: string): Promise<number>;
}

/**
 * 账单统计信息
 */
export interface BillingStatistics {
  /** 总账单数 */
  totalInvoices: number;
  /** 已支付金额 */
  totalPaid: number;
  /** 待支付金额 */
  totalPending: number;
  /** 逾期金额 */
  totalOverdue: number;
  /** 退款金额 */
  totalRefunded: number;
  /** 按资源类型统计 */
  byResourceType: Record<ResourceType, number>;
}

/**
 * 使用量追踪器接口
 * 负责追踪和记录资源使用量
 */
export interface IUsageTracker {
  /**
   * 记录使用量
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param quantity 使用量
   * @param metadata 元数据
   */
  track(
    tenantId: string,
    resourceType: ResourceType,
    quantity: number,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * 批量记录使用量
   * @param records 使用记录列表
   */
  trackBatch(records: Array<{
    tenantId: string;
    resourceType: ResourceType;
    quantity: number;
    metadata?: Record<string, unknown>;
  }>): Promise<void>;

  /**
   * 获取使用记录
   * @param tenantId 租户ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param resourceType 资源类型筛选
   * @returns 使用记录列表
   */
  getRecords(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    resourceType?: ResourceType
  ): Promise<UsageRecord[]>;

  /**
   * 汇总使用量
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 汇总使用量
   */
  aggregate(
    tenantId: string,
    resourceType: ResourceType,
    startTime: Date,
    endTime: Date
  ): Promise<number>;

  /**
   * 获取最近使用趋势
   * @param tenantId 租户ID
   * @param resourceType 资源类型
   * @param days 天数
   * @returns 每日使用量数组
   */
  getTrend(
    tenantId: string,
    resourceType: ResourceType,
    days: number
  ): Promise<Array<{ date: Date; quantity: number }>>;

  /**
   * 删除过期记录
   * @param before 删除此日期之前的记录
   */
  pruneOldRecords(before: Date): Promise<number>;
}

/**
 * 账单生成器接口
 * 负责生成账单PDF和详情
 */
export interface IInvoiceGenerator {
  /**
   * 生成账单JSON
   * @param invoice 账单数据
   * @returns 账单JSON
   */
  generateInvoiceJson(invoice: Invoice): Promise<object>;

  /**
   * 生成账单HTML
   * @param invoice 账单数据
   * @returns 账单HTML
   */
  generateInvoiceHtml(invoice: Invoice): Promise<string>;

  /**
   * 生成账单PDF
   * @param invoice 账单数据
   * @returns PDF文件路径
   */
  generateInvoicePdf(invoice: Invoice): Promise<string>;

  /**
   * 生成账单摘要
   * @param invoice 账单数据
   * @returns 账单摘要文本
   */
  generateSummary(invoice: Invoice): Promise<string>;

  /**
   * 生成使用量报告
   * @param tenantId 租户ID
   * @param periodStart 周期开始
   * @param periodEnd 周期结束
   * @returns 报告文本
   */
  generateUsageReport(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<string>;
}
