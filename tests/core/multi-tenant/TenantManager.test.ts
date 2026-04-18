/**
 * 租户管理器单元测试
 * TenantManager Unit Tests
 * 
 * @module Taiji.MultiTenant.Tests
 */

import { TenantManager } from '../../src/core/multi-tenant';
import { TenantStatus } from '../../src/core/multi-tenant/types';

describe('TenantManager', () => {
  let manager: TenantManager;

  beforeEach(() => {
    manager = new TenantManager();
  });

  afterEach(async () => {
    await manager.destroy();
  });

  describe('createTenant', () => {
    it('应该创建租户成功', async () => {
      const tenant = await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      expect(tenant).toBeDefined();
      expect(tenant.id).toMatch(/^tenant_/);
      expect(tenant.name).toBe('测试租户');
      expect(tenant.ownerId).toBe('user_001');
      expect(tenant.status).toBe(TenantStatus.ACTIVE);
    });

    it('应该自动生成slug', async () => {
      const tenant = await manager.createTenant({
        name: '测试公司',
        ownerId: 'user_001',
      });

      expect(tenant.slug).toBe('测试公司');
    });

    it('应该支持自定义slug', async () => {
      const tenant = await manager.createTenant({
        name: '测试租户',
        slug: 'custom-slug',
        ownerId: 'user_001',
      });

      expect(tenant.slug).toBe('custom-slug');
    });

    it('应该使用默认plan', async () => {
      const tenant = await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      expect(tenant.planId).toBe('free');
    });

    it('应该验证必填字段', async () => {
      await expect(
        manager.createTenant({
          name: '',
          ownerId: 'user_001',
        })
      ).rejects.toThrow();
    });
  });

  describe('getTenant', () => {
    it('应该获取存在的租户', async () => {
      const created = await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      const found = await manager.getTenant(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('应该返回null表示不存在的租户', async () => {
      const found = await manager.getTenant('non_existent_id');
      expect(found).toBeNull();
    });
  });

  describe('updateTenant', () => {
    it('应该更新租户名称', async () => {
      const tenant = await manager.createTenant({
        name: '原名称',
        ownerId: 'user_001',
      });

      const updated = await manager.updateTenant(tenant.id, {
        name: '新名称',
      });

      expect(updated.name).toBe('新名称');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(tenant.createdAt.getTime());
    });
  });

  describe('deleteTenant', () => {
    it('应该删除租户', async () => {
      const tenant = await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      await manager.deleteTenant(tenant.id);

      const found = await manager.getTenant(tenant.id);
      expect(found).toBeNull();
    });
  });

  describe('suspendTenant', () => {
    it('应该暂停租户', async () => {
      const tenant = await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      await manager.suspendTenant(tenant.id, '测试暂停');

      const found = await manager.getTenant(tenant.id);
      expect(found?.status).toBe(TenantStatus.SUSPENDED);
    });
  });

  describe('resumeTenant', () => {
    it('应该恢复暂停的租户', async () => {
      const tenant = await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      await manager.suspendTenant(tenant.id);
      await manager.resumeTenant(tenant.id);

      const found = await manager.getTenant(tenant.id);
      expect(found?.status).toBe(TenantStatus.ACTIVE);
    });
  });

  describe('queryTenants', () => {
    it('应该返回分页结果', async () => {
      // 创建多个租户
      for (let i = 0; i < 5; i++) {
        await manager.createTenant({
          name: `租户${i}`,
          ownerId: 'user_001',
        });
      }

      const result = await manager.queryTenants({
        page: 1,
        pageSize: 2,
      });

      expect(result.tenants.length).toBe(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });

    it('应该按状态过滤', async () => {
      const tenant1 = await manager.createTenant({
        name: '活跃租户',
        ownerId: 'user_001',
      });

      await manager.createTenant({
        name: '暂停租户',
        ownerId: 'user_002',
      });

      await manager.suspendTenant(tenant1.id);

      const result = await manager.queryTenants({
        status: TenantStatus.SUSPENDED,
      });

      expect(result.tenants.length).toBe(1);
      expect(result.tenants[0].status).toBe(TenantStatus.SUSPENDED);
    });
  });

  describe('isSlugAvailable', () => {
    it('应该检查slug可用性', async () => {
      await manager.createTenant({
        name: '测试租户',
        slug: 'test-slug',
        ownerId: 'user_001',
      });

      const available = await manager.isSlugAvailable('test-slug');
      expect(available).toBe(false);

      const anotherAvailable = await manager.isSlugAvailable('another-slug');
      expect(anotherAvailable).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('应该返回统计信息', async () => {
      await manager.createTenant({
        name: '租户1',
        ownerId: 'user_001',
      });

      await manager.createTenant({
        name: '租户2',
        ownerId: 'user_002',
      });

      const stats = await manager.getStatistics();

      expect(stats.totalTenants).toBe(2);
      expect(stats.activeTenants).toBe(2);
    });
  });

  describe('事件', () => {
    it('应该触发创建事件', async () => {
      let eventFired = false;
      manager.on('tenant:created', () => {
        eventFired = true;
      });

      await manager.createTenant({
        name: '测试租户',
        ownerId: 'user_001',
      });

      expect(eventFired).toBe(true);
    });
  });
});
