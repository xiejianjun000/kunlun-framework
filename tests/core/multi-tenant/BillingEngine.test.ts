/**
 * 计费引擎单元测试
 * BillingEngine Unit Tests
 * 
 * @module Kunlun.MultiTenant.Tests
 */

import { BillingEngine, UsageTracker, InvoiceGenerator } from '../../src/core/multi-tenant';
import { ResourceType, InvoiceStatus } from '../../src/core/multi-tenant/types';

describe('BillingEngine', () => {
  let engine: BillingEngine;

  beforeEach(() => {
    engine = new BillingEngine();
  });

  describe('getResourcePricing', () => {
    it('应该获取默认定价', () => {
      const pricing = engine.getResourcePricing(ResourceType.API_CALLS);
      
      expect(pricing).toBeDefined();
      expect(pricing?.unitPrice).toBe(0.001);
    });

    it('应该返回null表示未知资源类型', () => {
      const pricing = engine.getResourcePricing(ResourceType.CPU);
      expect(pricing).toBeNull();
    });
  });

  describe('setResourcePricing', () => {
    it('应该设置自定义定价', () => {
      engine.setResourcePricing({
        resourceType: ResourceType.STORAGE,
        unitPrice: 0.15,
        unit: 'GB/月',
        billingCycle: 'monthly' as any,
      });

      const pricing = engine.getResourcePricing(ResourceType.STORAGE);
      expect(pricing?.unitPrice).toBe(0.15);
    });
  });

  describe('calculateCost', () => {
    it('应该计算基础费用', () => {
      const cost = engine.calculateCost(ResourceType.API_CALLS, 1000);
      expect(cost).toBe(1.0); // 0.001 * 1000
    });

    it('应该返回0表示未知资源类型', () => {
      const cost = engine.calculateCost(ResourceType.CPU, 100);
      expect(cost).toBe(0);
    });
  });

  describe('generateInvoice', () => {
    it('应该生成账单', async () => {
      const invoice = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      expect(invoice).toBeDefined();
      expect(invoice.tenantId).toBe('tenant_001');
      expect(invoice.currency).toBe('CNY');
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      expect(invoice.items.length).toBeGreaterThan(0);
    });

    it('应该计算税费', async () => {
      const invoice = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      expect(invoice.tax).toBe(invoice.subtotal * 0.06);
      expect(invoice.total).toBe(invoice.subtotal - invoice.discount + invoice.tax);
    });

    it('应该应用折扣', async () => {
      const invoice = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        discountCode: 'SAVE10',
        discountPercent: 0.1,
      });

      expect(invoice.discount).toBeGreaterThan(0);
    });
  });

  describe('getInvoice', () => {
    it('应该获取存在的账单', async () => {
      const created = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      const found = await engine.getInvoice(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('应该返回null表示不存在的账单', async () => {
      const found = await engine.getInvoice('non_existent');
      expect(found).toBeNull();
    });
  });

  describe('getTenantInvoices', () => {
    it('应该返回租户的所有账单', async () => {
      await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });
      await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
      });
      await engine.generateInvoice({
        tenantId: 'tenant_002',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      const invoices = await engine.getTenantInvoices('tenant_001');
      expect(invoices.length).toBe(2);
    });

    it('应该按状态过滤账单', async () => {
      const invoice1 = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
      });

      await engine.updateInvoiceStatus(invoice1.id, InvoiceStatus.PAID);

      const paidInvoices = await engine.getTenantInvoices('tenant_001', InvoiceStatus.PAID);
      expect(paidInvoices.length).toBe(1);
    });
  });

  describe('markAsPaid', () => {
    it('应该标记账单为已支付', async () => {
      const invoice = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      await engine.markAsPaid(invoice.id, {
        id: 'payment_001',
        invoiceId: invoice.id,
        tenantId: 'tenant_001',
        amount: invoice.total,
        method: 'credit_card' as any,
        status: 'success' as any,
      });

      const updated = await engine.getInvoice(invoice.id);
      expect(updated?.status).toBe(InvoiceStatus.PAID);
      expect(updated?.paidAt).toBeDefined();
    });
  });

  describe('createPayment', () => {
    it('应该创建支付记录', async () => {
      const invoice = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      const payment = await engine.createPayment(invoice.id, 'credit_card');

      expect(payment).toBeDefined();
      expect(payment.invoiceId).toBe(invoice.id);
      expect(payment.amount).toBe(invoice.total);
    });
  });

  describe('getBillingStats', () => {
    it('应该返回账单统计', async () => {
      const invoice1 = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      const invoice2 = await engine.generateInvoice({
        tenantId: 'tenant_001',
        periodStart: new Date('2024-02-01'),
        periodEnd: new Date('2024-02-29'),
      });

      await engine.markAsPaid(invoice1.id, {
        id: 'payment_001',
        invoiceId: invoice1.id,
        tenantId: 'tenant_001',
        amount: invoice1.total,
        method: 'credit_card' as any,
        status: 'success' as any,
      });

      const stats = await engine.getBillingStats(
        'tenant_001',
        new Date('2024-01-01'),
        new Date('2024-03-31')
      );

      expect(stats.totalInvoices).toBe(2);
      expect(stats.totalPaid).toBe(invoice1.total);
      expect(stats.totalPending).toBe(invoice2.total);
    });
  });
});

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  describe('track', () => {
    it('应该记录使用量', async () => {
      await tracker.track('tenant_001', ResourceType.API_CALLS, 100);
      await tracker.track('tenant_001', ResourceType.API_CALLS, 200);

      const records = await tracker.getRecords(
        'tenant_001',
        new Date('2020-01-01'),
        new Date('2030-01-01')
      );

      expect(records.length).toBe(2);
    });
  });

  describe('aggregate', () => {
    it('应该汇总使用量', async () => {
      await tracker.track('tenant_001', ResourceType.API_CALLS, 100);
      await tracker.track('tenant_001', ResourceType.API_CALLS, 200);
      await tracker.track('tenant_001', ResourceType.API_CALLS, 300);

      const total = await tracker.aggregate(
        'tenant_001',
        ResourceType.API_CALLS,
        new Date('2020-01-01'),
        new Date('2030-01-01')
      );

      expect(total).toBe(600);
    });
  });

  describe('pruneOldRecords', () => {
    it('应该删除过期记录', async () => {
      await tracker.track('tenant_001', ResourceType.API_CALLS, 100);

      const pruned = await tracker.pruneOldRecords(new Date());

      expect(pruned).toBe(1);
    });
  });
});

describe('InvoiceGenerator', () => {
  let generator: InvoiceGenerator;
  let engine: BillingEngine;
  let invoice: any;

  beforeEach(async () => {
    generator = new InvoiceGenerator();
    engine = new BillingEngine();
    invoice = await engine.generateInvoice({
      tenantId: 'tenant_001',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
    });
  });

  describe('generateInvoiceHtml', () => {
    it('应该生成HTML账单', async () => {
      const html = await generator.generateInvoiceHtml(invoice);

      expect(html).toContain('账单');
      expect(html).toContain(invoice.id);
      expect(html).toContain('租户');
    });
  });

  describe('generateSummary', () => {
    it('应该生成账单摘要', async () => {
      const summary = await generator.generateSummary(invoice);

      expect(summary).toContain(invoice.id);
      expect(summary).toContain('总计');
    });
  });
});
