/**
 * 配额管理器单元测试
 * QuotaManager Unit Tests
 * 
 * @module Taiji.MultiTenant.Tests
 */

import { QuotaManager, QuotaEnforcer, QuotaExceededError } from '../../src/core/multi-tenant';
import { ResourceType } from '../../src/core/multi-tenant/types';

describe('QuotaManager', () => {
  let manager: QuotaManager;

  beforeEach(() => {
    manager = new QuotaManager();
  });

  describe('allocateQuotas', () => {
    it('应该分配配额', async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 10000 },
        { type: ResourceType.STORAGE, limit: 10, unit: 'GB' },
      ]);

      const quotas = await manager.getQuotas('tenant_001');
      expect(quotas.length).toBe(2);
      expect(quotas.find(q => q.type === ResourceType.API_CALLS)?.limit).toBe(10000);
    });

    it('应该使用默认警告阈值', async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 10000 },
      ]);

      const quotas = await manager.getQuotas('tenant_001');
      expect(quotas[0].warningThreshold).toBe(0.8);
    });
  });

  describe('checkQuota', () => {
    beforeEach(async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);
    });

    it('应该允许在配额内的请求', async () => {
      const result = await manager.checkQuota('tenant_001', ResourceType.API_CALLS, 500);
      
      expect(result.allowed).toBe(true);
      expect(result.exceeded).toBe(false);
      expect(result.remaining).toBe(1000);
    });

    it('应该拒绝超出配额的请求', async () => {
      const result = await manager.checkQuota('tenant_001', ResourceType.API_CALLS, 1500);
      
      expect(result.allowed).toBe(false);
      expect(result.exceeded).toBe(true);
    });

    it('应该考虑已使用量', async () => {
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 600);
      
      const result = await manager.checkQuota('tenant_001', ResourceType.API_CALLS, 500);
      
      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(600);
    });
  });

  describe('recordUsage', () => {
    beforeEach(async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);
    });

    it('应该记录使用量', async () => {
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 100);
      
      const usage = await manager.getUsage('tenant_001', ResourceType.API_CALLS);
      expect(usage.used).toBe(100);
    });

    it('应该累加使用量', async () => {
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 100);
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 200);
      
      const usage = await manager.getUsage('tenant_001', ResourceType.API_CALLS);
      expect(usage.used).toBe(300);
    });
  });

  describe('getAllUsage', () => {
    it('应该返回所有资源使用量', async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
        { type: ResourceType.STORAGE, limit: 10, unit: 'GB' },
      ]);

      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 100);

      const usages = await manager.getAllUsage('tenant_001');
      expect(usages.length).toBe(2);
    });
  });

  describe('reserveQuota', () => {
    beforeEach(async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);
    });

    it('应该预留配额', async () => {
      const allocation = await manager.reserveQuota('tenant_001', ResourceType.API_CALLS, 200);
      
      expect(allocation.allocated).toBe(200);
      
      const result = await manager.checkQuota('tenant_001', ResourceType.API_CALLS, 900);
      expect(result.allowed).toBe(false);
    });

    it('不应该允许超出预留', async () => {
      await manager.reserveQuota('tenant_001', ResourceType.API_CALLS, 800);
      
      await expect(
        manager.reserveQuota('tenant_001', ResourceType.API_CALLS, 300)
      ).rejects.toThrow();
    });
  });

  describe('releaseQuota', () => {
    it('应该释放预留配额', async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);

      const allocation = await manager.reserveQuota('tenant_001', ResourceType.API_CALLS, 200);
      await manager.releaseQuota('tenant_001', allocation.id);

      const result = await manager.checkQuota('tenant_001', ResourceType.API_CALLS, 900);
      expect(result.allowed).toBe(true);
    });
  });

  describe('generateUsageReport', () => {
    it('应该生成使用报告', async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 1200);

      const report = await manager.generateUsageReport(
        'tenant_001',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(report.tenantId).toBe('tenant_001');
      expect(report.isOverQuota).toBe(true);
      expect(report.overQuotaResources).toContain(ResourceType.API_CALLS);
    });
  });

  describe('resetUsage', () => {
    it('应该重置使用量', async () => {
      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 500);

      await manager.resetUsage('tenant_001', ResourceType.API_CALLS);

      const usage = await manager.getUsage('tenant_001', ResourceType.API_CALLS);
      expect(usage.used).toBe(0);
    });
  });

  describe('事件', () => {
    it('应该触发配额警告事件', async () => {
      let warningFired = false;
      manager.on('quota_warning', () => {
        warningFired = true;
      });

      await manager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 100, warningThreshold: 0.8 },
      ]);
      await manager.recordUsage('tenant_001', ResourceType.API_CALLS, 85);

      expect(warningFired).toBe(true);
    });
  });
});

describe('QuotaEnforcer', () => {
  let quotaManager: QuotaManager;
  let enforcer: QuotaEnforcer;

  beforeEach(() => {
    quotaManager = new QuotaManager();
    enforcer = new QuotaEnforcer(quotaManager);
  });

  describe('enforce', () => {
    it('应该允许在配额内的操作', async () => {
      await quotaManager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);

      await expect(
        enforcer.enforce('tenant_001', ResourceType.API_CALLS, 500)
      ).resolves.not.toThrow();
    });

    it('应该抛出配额超限错误', async () => {
      await quotaManager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 1000 },
      ]);

      await expect(
        enforcer.enforce('tenant_001', ResourceType.API_CALLS, 1500)
      ).rejects.toThrow(QuotaExceededError);
    });
  });

  describe('onQuotaExceeded', () => {
    it('应该调用处理器', async () => {
      let handlerCalled = false;
      enforcer.onQuotaExceeded(async () => {
        handlerCalled = true;
      });

      await quotaManager.allocateQuotas('tenant_001', [
        { type: ResourceType.API_CALLS, limit: 100 },
      ]);

      try {
        await enforcer.enforce('tenant_001', ResourceType.API_CALLS, 200);
      } catch {
        // 预期抛出错误
      }

      expect(handlerCalled).toBe(true);
    });
  });
});
