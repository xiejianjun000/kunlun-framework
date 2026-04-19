/**
 * 计费引擎
 * Billing Engine - 计费、账单生成和支付处理
 * 
 * @module Taiji.MultiTenant.Billing
 */

import {
  ResourceType,
  BillingMode,
  UsageRecord,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
} from '../types';
import {
  IBillingEngine,
  IUsageTracker,
  IInvoiceGenerator,
  BillingCycle,
  ResourcePricing,
  TierPrice,
  UsageSummary,
  InvoiceGenerationOptions,
  PaymentRecord,
  PaymentMethod,
  PaymentStatus,
  BillingStatistics,
} from '../interfaces';

/**
 * 计费引擎配置
 */
export interface BillingEngineConfig {
  /** 货币 */
  currency?: string;
  /** 税费百分比 */
  defaultTaxPercent?: number;
  /** 账单到期天数 */
  invoiceDueDays?: number;
}

/**
 * 计费引擎
 * 负责计费、账单生成和支付处理
 * 
 * @example
 * ```typescript
 * const engine = new BillingEngine();
 * 
 * // 设置资源定价
 * engine.setResourcePricing({
 *   resourceType: 'api_calls',
 *   unitPrice: 0.001,
 *   unit: '次',
 *   billingCycle: 'monthly',
 * });
 * 
 * // 生成账单
 * const invoice = await engine.generateInvoice({
 *   tenantId: 'tenant_001',
 *   periodStart: new Date('2024-01-01'),
 *   periodEnd: new Date('2024-01-31'),
 * });
 * 
 * // 标记为已支付
 * await engine.markAsPaid(invoice.id, {
 *   id: 'payment_001',
 *   amount: invoice.total,
 *   method: 'credit_card',
 *   status: 'success',
 * });
 * ```
 */
export class BillingEngine implements IBillingEngine {
  private config: BillingEngineConfig;
  private pricings: Map<ResourceType, ResourcePricing> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private payments: Map<string, PaymentRecord> = new Map();
  private idCounter: number = 0;

  constructor(config: BillingEngineConfig = {}) {
    this.config = {
      currency: config.currency ?? 'CNY',
      defaultTaxPercent: config.defaultTaxPercent ?? 0.06,
      invoiceDueDays: config.invoiceDueDays ?? 30,
    };
    
    this.initializeDefaultPricings();
  }

  /**
   * 初始化默认定价
   */
  private initializeDefaultPricings(): void {
    const defaultPricings: ResourcePricing[] = [
      {
        resourceType: ResourceType.API_CALLS,
        unitPrice: 0.001,
        unit: '次',
        billingCycle: BillingCycle.MONTHLY,
      },
      {
        resourceType: ResourceType.STORAGE,
        unitPrice: 0.1,
        unit: 'GB/月',
        billingCycle: BillingCycle.MONTHLY,
      },
      {
        resourceType: ResourceType.VECTOR_STORAGE,
        unitPrice: 0.05,
        unit: 'GB/月',
        billingCycle: BillingCycle.MONTHLY,
      },
      {
        resourceType: ResourceType.MESSAGES,
        unitPrice: 0.0001,
        unit: '条',
        billingCycle: BillingCycle.MONTHLY,
      },
      {
        resourceType: ResourceType.CONCURRENT_CONNECTIONS,
        unitPrice: 10,
        unit: '个/月',
        billingCycle: BillingCycle.MONTHLY,
      },
    ];

    for (const pricing of defaultPricings) {
      this.pricings.set(pricing.resourceType, pricing);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }

  /**
   * 获取资源定价
   */
  getResourcePricing(resourceType: ResourceType): ResourcePricing | null {
    return this.pricings.get(resourceType) ?? null;
  }

  /**
   * 设置资源定价
   */
  setResourcePricing(pricing: ResourcePricing): void {
    this.pricings.set(pricing.resourceType, pricing);
  }

  /**
   * 获取所有资源定价
   */
  getAllResourcePricings(): ResourcePricing[] {
    return Array.from(this.pricings.values());
  }

  /**
   * 计算资源费用
   */
  calculateCost(resourceType: ResourceType, quantity: number): number {
    const pricing = this.pricings.get(resourceType);
    if (!pricing) {
      return 0;
    }

    // 阶梯定价
    if (pricing.tieredPricing && pricing.tieredPricing.length > 0) {
      return this.calculateTieredCost(pricing.tieredPricing, quantity);
    }

    return pricing.unitPrice * quantity;
  }

  /**
   * 计算阶梯费用
   */
  private calculateTieredCost(tiers: TierPrice[], quantity: number): number {
    let totalCost = 0;
    let remaining = quantity;

    for (const tier of tiers) {
      if (remaining <= 0) break;
      
      const tierQuantity = Math.min(remaining, 
        tier.to === Infinity ? remaining : tier.to - tier.from
      );
      totalCost += tierQuantity * tier.unitPrice;
      remaining -= tierQuantity;
    }

    return totalCost;
  }

  /**
   * 计算使用量汇总
   */
  async calculateUsageSummary(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<UsageSummary[]> {
    // 模拟使用量汇总
    const summaries: UsageSummary[] = [];
    
    for (const [resourceType, pricing] of this.pricings) {
      // 模拟使用量
      const quantity = Math.floor(Math.random() * 10000);
      const cost = this.calculateCost(resourceType, quantity);
      
      summaries.push({
        tenantId,
        resourceType,
        totalQuantity: quantity,
        totalCost: cost,
        billingCycle: pricing.billingCycle,
        periodStart: startTime,
        periodEnd: endTime,
      });
    }

    return summaries;
  }

  /**
   * 计算账单总额
   */
  async calculateTotalCost(
    tenantId: string,
    billingMode: BillingMode,
    planId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    let total = 0;

    // 计算使用费用
    const summaries = await this.calculateUsageSummary(tenantId, periodStart, periodEnd);
    for (const summary of summaries) {
      total += summary.totalCost;
    }

    // 如果是订阅模式，添加订阅费用
    if (billingMode === BillingMode.SUBSCRIPTION || billingMode === BillingMode.ENTERPRISE) {
      // 模拟订阅费用
      const subscriptionFee = planId === 'enterprise' ? 999 : planId === 'professional' ? 399 : 99;
      total += subscriptionFee;
    }

    return total;
  }

  /**
   * 生成账单
   */
  async generateInvoice(options: InvoiceGenerationOptions): Promise<Invoice> {
    const summaries = await this.calculateUsageSummary(
      options.tenantId,
      options.periodStart,
      options.periodEnd
    );

    // 构建账单项
    const items: InvoiceItem[] = summaries.map(summary => ({
      name: this.getResourceTypeName(summary.resourceType),
      resourceType: summary.resourceType,
      quantity: summary.totalQuantity,
      unit: this.pricings.get(summary.resourceType)?.unit ?? '',
      unitPrice: this.pricings.get(summary.resourceType)?.unitPrice ?? 0,
      subtotal: summary.totalCost,
    }));

    // 计算小计
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // 计算折扣
    let discount = 0;
    if (options.discountCode) {
      discount = subtotal * (options.discountPercent ?? 0.1);
    }

    // 计算税费
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * (this.config.defaultTaxPercent ?? 0.06);

    // 计算总计
    const total = taxableAmount + tax;

    const invoice: Invoice = {
      id: this.generateId('inv'),
      tenantId: options.tenantId,
      period: {
        start: options.periodStart,
        end: options.periodEnd,
      },
      items,
      subtotal,
      discount,
      tax,
      total,
      currency: this.config.currency!,
      status: InvoiceStatus.DRAFT,
      createdAt: new Date(),
      dueDate: new Date(Date.now() + (this.config.invoiceDueDays! * 24 * 60 * 60 * 1000)),
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  /**
   * 获取资源类型名称
   */
  private getResourceTypeName(resourceType: ResourceType): string {
    const names: Record<ResourceType, string> = {
      [ResourceType.API_CALLS]: 'API调用',
      [ResourceType.STORAGE]: '存储空间',
      [ResourceType.VECTOR_STORAGE]: '向量存储',
      [ResourceType.MESSAGES]: '消息数量',
      [ResourceType.CONCURRENT_CONNECTIONS]: '并发连接',
      [ResourceType.CPU]: 'CPU资源',
      [ResourceType.MEMORY]: '内存资源',
      [ResourceType.SKILLS]: '技能数量',
      [ResourceType.USERS]: '用户数量',
      [ResourceType.TEAMS]: '团队数量',
    };
    return names[resourceType] ?? resourceType;
  }

  /**
   * 获取账单
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return this.invoices.get(invoiceId) ?? null;
  }

  /**
   * 获取租户的账单列表
   */
  async getTenantInvoices(
    tenantId: string,
    status?: InvoiceStatus,
    limit: number = 10
  ): Promise<Invoice[]> {
    let invoices = Array.from(this.invoices.values())
      .filter(inv => inv.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (status) {
      invoices = invoices.filter(inv => inv.status === status);
    }

    return invoices.slice(0, limit);
  }

  /**
   * 更新账单状态
   */
  async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = status;
      this.invoices.set(invoiceId, invoice);
    }
  }

  /**
   * 标记账单为已支付
   */
  async markAsPaid(invoiceId: string, paymentRecord: PaymentRecord): Promise<void> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`账单 ${invoiceId} 不存在`);
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    this.invoices.set(invoiceId, invoice);

    paymentRecord.invoiceId = invoiceId;
    paymentRecord.status = PaymentStatus.SUCCESS;
    paymentRecord.paidAt = new Date();
    this.payments.set(paymentRecord.id, paymentRecord);
  }

  /**
   * 取消账单
   */
  async cancelInvoice(invoiceId: string, reason?: string): Promise<void> {
    const invoice = this.invoices.get(invoiceId);
    if (invoice) {
      invoice.status = InvoiceStatus.CANCELLED;
      this.invoices.set(invoiceId, invoice);
    }
  }

  /**
   * 创建支付
   */
  async createPayment(invoiceId: string, method: PaymentMethod): Promise<PaymentRecord> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`账单 ${invoiceId} 不存在`);
    }

    const payment: PaymentRecord = {
      id: this.generateId('pay'),
      invoiceId,
      tenantId: invoice.tenantId,
      amount: invoice.total,
      method,
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
    };

    this.payments.set(payment.id, payment);
    return payment;
  }

  /**
   * 确认支付
   */
  async confirmPayment(paymentId: string, transactionId: string): Promise<boolean> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return false;
    }

    payment.transactionId = transactionId;
    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();
    this.payments.set(paymentId, payment);

    // 更新关联账单
    const invoice = this.invoices.get(payment.invoiceId);
    if (invoice) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
      this.invoices.set(invoice.id, invoice);
    }

    return true;
  }

  /**
   * 退款
   */
  async refundPayment(invoiceId: string, amount: number, reason?: string): Promise<void> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`账单 ${invoiceId} 不存在`);
    }

    // 查找对应的支付记录
    const payment = Array.from(this.payments.values())
      .find(p => p.invoiceId === invoiceId && p.status === PaymentStatus.SUCCESS);

    if (payment) {
      payment.status = PaymentStatus.REFUNDED;
      this.payments.set(payment.id, payment);
    }

    invoice.status = InvoiceStatus.REFUNDED;
    this.invoices.set(invoiceId, invoice);
  }

  /**
   * 获取账单统计
   */
  async getBillingStats(
    tenantId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BillingStatistics> {
    const invoices = await this.getTenantInvoices(tenantId);
    
    const stats: BillingStatistics = {
      totalInvoices: invoices.length,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalRefunded: 0,
      byResourceType: {} as Record<ResourceType, number>,
    };

    for (const invoice of invoices) {
      switch (invoice.status) {
        case InvoiceStatus.PAID:
          stats.totalPaid += invoice.total;
          break;
        case InvoiceStatus.PENDING:
        case InvoiceStatus.DRAFT:
          stats.totalPending += invoice.total;
          break;
        case InvoiceStatus.OVERDUE:
          stats.totalOverdue += invoice.total;
          break;
        case InvoiceStatus.REFUNDED:
          stats.totalRefunded += invoice.total;
          break;
      }

      // 按资源类型统计
      for (const item of invoice.items) {
        if (item.resourceType) {
          stats.byResourceType[item.resourceType] = 
            (stats.byResourceType[item.resourceType] ?? 0) + item.subtotal;
        }
      }
    }

    return stats;
  }

  /**
   * 获取待支付金额
   */
  async getPendingAmount(tenantId: string): Promise<number> {
    const pendingInvoices = await this.getTenantInvoices(tenantId, InvoiceStatus.PENDING);
    const overdueInvoices = await this.getTenantInvoices(tenantId, InvoiceStatus.OVERDUE);
    
    const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);
    
    return pendingTotal + overdueTotal;
  }
}

/**
 * 使用量追踪器
 * 负责追踪和记录资源使用量
 */
export class UsageTracker implements IUsageTracker {
  private records: Map<string, UsageRecord[]> = new Map();
  private idCounter: number = 0;

  /**
   * 记录使用量
   */
  async track(
    tenantId: string,
    resourceType: ResourceType,
    quantity: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const record: UsageRecord = {
      id: this.generateId(),
      tenantId,
      resourceType,
      quantity,
      unitPrice: 0,
      totalPrice: 0,
      timestamp: new Date(),
      metadata,
    };

    const tenantRecords = this.records.get(tenantId) ?? [];
    tenantRecords.push(record as any);
    this.records.set(tenantId, tenantRecords);
  }

  /**
   * 批量记录使用量
   */
  async trackBatch(
    records: Array<{
      tenantId: string;
      resourceType: ResourceType;
      quantity: number;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    for (const record of records) {
      await this.track(record.tenantId, record.resourceType, record.quantity, record.metadata);
    }
  }

  /**
   * 获取使用记录
   */
  async getRecords(
    tenantId: string,
    startTime: Date,
    endTime: Date,
    resourceType?: ResourceType
  ): Promise<UsageRecord[]> {
    const tenantRecords = this.records.get(tenantId) ?? [];
    return tenantRecords.filter((record: any) => {
      const inTimeRange = record.timestamp >= startTime && record.timestamp <= endTime;
      const matchesType = !resourceType || record.resourceType === resourceType;
      return inTimeRange && matchesType;
    });
  }

  /**
   * 汇总使用量
   */
  async aggregate(
    tenantId: string,
    resourceType: ResourceType,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const records = await this.getRecords(tenantId, startTime, endTime, resourceType);
    return records.reduce((sum, record) => sum + record.quantity, 0);
  }

  /**
   * 获取最近使用趋势
   */
  async getTrend(
    tenantId: string,
    resourceType: ResourceType,
    days: number
  ): Promise<Array<{ date: Date; quantity: number }>> {
    const trend: Array<{ date: Date; quantity: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const quantity = await this.aggregate(tenantId, resourceType, date, nextDate);
      trend.push({ date, quantity });
    }

    return trend;
  }

  /**
   * 删除过期记录
   */
  async pruneOldRecords(before: Date): Promise<number> {
    let prunedCount = 0;

    for (const [tenantId, records] of this.records.entries()) {
      const filtered = records.filter((record: any) => record.timestamp >= before);
      prunedCount += records.length - filtered.length;
      this.records.set(tenantId, filtered);
    }

    return prunedCount;
  }

  private generateId(): string {
    this.idCounter++;
    return `usage_${Date.now()}_${this.idCounter}`;
  }
}

/**
 * 账单生成器
 * 负责生成账单PDF和详情
 */
export class InvoiceGenerator implements IInvoiceGenerator {
  /**
   * 生成账单JSON
   */
  async generateInvoiceJson(invoice: Invoice): Promise<object> {
    return {
      ...invoice,
      _format: 'json',
      _generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成账单HTML
   */
  async generateInvoiceHtml(invoice: Invoice): Promise<string> {
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.unit}</td>
        <td>¥${item.unitPrice.toFixed(4)}</td>
        <td>¥${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>账单 #${invoice.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f5f5f5; }
    .total { font-size: 18px; font-weight: bold; color: #e74c3c; }
    .meta { color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>账单 #${invoice.id}</h1>
  <div class="meta">
    <p>租户ID: ${invoice.tenantId}</p>
    <p>账单周期: ${invoice.period.start.toLocaleDateString()} - ${invoice.period.end.toLocaleDateString()}</p>
    <p>创建时间: ${invoice.createdAt.toLocaleDateString()}</p>
    <p>到期时间: ${invoice.dueDate.toLocaleDateString()}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>项目</th>
        <th>数量</th>
        <th>单位</th>
        <th>单价</th>
        <th>小计</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="total">
    <p>小计: ¥${invoice.subtotal.toFixed(2)}</p>
    <p>折扣: -¥${invoice.discount.toFixed(2)}</p>
    <p>税费: ¥${invoice.tax.toFixed(2)}</p>
    <p>总计: ¥${invoice.total.toFixed(2)}</p>
  </div>
</body>
</html>`;
  }

  /**
   * 生成账单PDF
   */
  async generateInvoicePdf(invoice: Invoice): Promise<string> {
    // 实际应用中需要使用PDF库生成
    // 这里返回HTML文件路径作为占位符
    const html = await this.generateInvoiceHtml(invoice);
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const outputPath = path.join('/tmp', `invoice_${invoice.id}.html`);
    await fs.writeFile(outputPath, html, 'utf-8');
    
    return outputPath;
  }

  /**
   * 生成账单摘要
   */
  async generateSummary(invoice: Invoice): Promise<string> {
    return `
账单摘要 (#${invoice.id})
================
租户: ${invoice.tenantId}
周期: ${invoice.period.start.toLocaleDateString()} - ${invoice.period.end.toLocaleDateString()}
状态: ${invoice.status}

费用明细:
${invoice.items.map(item => `  - ${item.name}: ¥${item.subtotal.toFixed(2)}`).join('\n')}

小计: ¥${invoice.subtotal.toFixed(2)}
折扣: -¥${invoice.discount.toFixed(2)}
税费: ¥${invoice.tax.toFixed(2)}
总计: ¥${invoice.total.toFixed(2)}

到期时间: ${invoice.dueDate.toLocaleDateString()}
`.trim();
  }

  /**
   * 生成使用量报告
   */
  async generateUsageReport(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<string> {
    return `
使用量报告
==========
租户: ${tenantId}
周期: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}
生成时间: ${new Date().toLocaleDateString()}

详细使用量请查看账单。
`.trim();
  }
}
