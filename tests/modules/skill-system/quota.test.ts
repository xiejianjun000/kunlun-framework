/**
 * 技能配额管理器测试
 * Skill Quota Manager Tests
 */

import { SkillQuotaManager } from '../src/modules/skill-system/quota/SkillQuotaManager';
import * as fs from 'fs';
import * as path from 'path';

describe('SkillQuotaManager', () => {
  const testQuotaPath = path.join(__dirname, 'test-quotas');
  let quotaManager: SkillQuotaManager;

  beforeEach(async () => {
    // 清理测试目录
    if (fs.existsSync(testQuotaPath)) {
      await fs.promises.rm(testQuotaPath, { recursive: true });
    }
    quotaManager = new SkillQuotaManager(testQuotaPath, {
      maxSkills: 10,
      maxConcurrentExecutions: 3,
      maxDailyExecutions: 100,
    });
    await quotaManager.initialize();
  });

  afterEach(async () => {
    await quotaManager.destroy();
    if (fs.existsSync(testQuotaPath)) {
      await fs.promises.rm(testQuotaPath, { recursive: true });
    }
  });

  describe('getQuotaInfo', () => {
    it('should return default quota info', async () => {
      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');

      expect(info.userId).toBe('user1');
      expect(info.tenantId).toBe('tenant1');
      expect(info.maxSkills).toBe(10);
      expect(info.usedSkills).toBe(0);
      expect(info.maxConcurrentExecutions).toBe(3);
      expect(info.currentConcurrentExecutions).toBe(0);
      expect(info.maxDailyExecutions).toBe(100);
      expect(info.todayExecutions).toBe(0);
    });
  });

  describe('checkQuota', () => {
    it('should allow when under limit', async () => {
      const result = await quotaManager.checkQuota('user1', 'tenant1', 'install');
      expect(result.allowed).toBe(true);
    });

    it('should allow execution when under limit', async () => {
      const result = await quotaManager.checkQuota('user1', 'tenant1', 'execute');
      expect(result.allowed).toBe(true);
    });

    it('should allow concurrent when under limit', async () => {
      const result = await quotaManager.checkQuota('user1', 'tenant1', 'concurrent');
      expect(result.allowed).toBe(true);
    });

    it('should reject when at skill limit', async () => {
      // 使用所有配额
      for (let i = 0; i < 10; i++) {
        await quotaManager.incrementSkillCount('user1', 'tenant1');
      }

      const result = await quotaManager.checkQuota('user1', 'tenant1', 'install');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('最大技能数限制');
    });

    it('should reject when at concurrent limit', async () => {
      // 达到并发限制
      await quotaManager.startExecution('user1', 'tenant1', 'skill1');
      await quotaManager.startExecution('user1', 'tenant1', 'skill2');
      await quotaManager.startExecution('user1', 'tenant1', 'skill3');

      const result = await quotaManager.checkQuota('user1', 'tenant1', 'concurrent');
      expect(result.allowed).toBe(false);
    });
  });

  describe('increment/decrement skill count', () => {
    it('should increment skill count', async () => {
      await quotaManager.incrementSkillCount('user1', 'tenant1');
      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');
      expect(info.usedSkills).toBe(1);
    });

    it('should decrement skill count', async () => {
      await quotaManager.incrementSkillCount('user1', 'tenant1');
      await quotaManager.incrementSkillCount('user1', 'tenant1');
      await quotaManager.decrementSkillCount('user1', 'tenant1');

      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');
      expect(info.usedSkills).toBe(1);
    });

    it('should not go below zero', async () => {
      await quotaManager.decrementSkillCount('user1', 'tenant1');
      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');
      expect(info.usedSkills).toBe(0);
    });
  });

  describe('execution tracking', () => {
    it('should track execution start', async () => {
      await quotaManager.startExecution('user1', 'tenant1', 'skill1');

      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');
      expect(info.currentConcurrentExecutions).toBe(1);
      expect(info.todayExecutions).toBe(1);
    });

    it('should track execution end', async () => {
      await quotaManager.startExecution('user1', 'tenant1', 'skill1');
      await quotaManager.endExecution('user1', 'tenant1', 1000);

      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');
      expect(info.currentConcurrentExecutions).toBe(0);
    });
  });

  describe('user quota configuration', () => {
    it('should set custom user quota', async () => {
      await quotaManager.setUserQuota({
        userId: 'premium-user',
        tenantId: 'tenant1',
        limits: {
          maxSkills: 50,
          maxConcurrentExecutions: 10,
        },
        enabled: true,
      });

      const info = await quotaManager.getQuotaInfo('premium-user', 'tenant1');
      expect(info.maxSkills).toBe(50);
      expect(info.maxConcurrentExecutions).toBe(10);
    });

    it('should delete user quota', async () => {
      await quotaManager.setUserQuota({
        userId: 'temp-user',
        tenantId: 'tenant1',
        limits: { maxSkills: 5 },
      });

      await quotaManager.deleteUserQuota('temp-user', 'tenant1');
      const info = await quotaManager.getQuotaInfo('temp-user', 'tenant1');

      // 应该回退到默认配额
      expect(info.maxSkills).toBe(10);
    });
  });

  describe('usage stats', () => {
    it('should track usage statistics', async () => {
      await quotaManager.startExecution('user1', 'tenant1', 'skill1');
      await quotaManager.endExecution('user1', 'tenant1', 100);
      await quotaManager.startExecution('user1', 'tenant1', 'skill2');
      await quotaManager.endExecution('user1', 'tenant1', 200);

      const stats = await quotaManager.getUsageStats('user1', 'tenant1');

      expect(stats.totalExecutions).toBe(2);
      expect(stats.avgDuration).toBe(150);
    });

    it('should track most used skill', async () => {
      await quotaManager.startExecution('user1', 'tenant1', 'popular-skill');
      await quotaManager.endExecution('user1', 'tenant1', 100);
      await quotaManager.startExecution('user1', 'tenant1', 'popular-skill');
      await quotaManager.endExecution('user1', 'tenant1', 100);
      await quotaManager.startExecution('user1', 'tenant1', 'other-skill');
      await quotaManager.endExecution('user1', 'tenant1', 100);

      const stats = await quotaManager.getUsageStats('user1', 'tenant1');
      expect(stats.mostUsedSkill).toBe('popular-skill');
    });
  });

  describe('reset', () => {
    it('should reset quota', async () => {
      await quotaManager.startExecution('user1', 'tenant1', 'skill1');
      await quotaManager.resetQuota('user1', 'tenant1');

      const info = await quotaManager.getQuotaInfo('user1', 'tenant1');
      expect(info.todayExecutions).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit quota exceeded event', async () => {
      const listener = jest.fn();
      quotaManager.on('quotaExceeded', listener);

      // 达到配额
      for (let i = 0; i < 10; i++) {
        await quotaManager.incrementSkillCount('user1', 'tenant1');
      }

      await quotaManager.checkQuota('user1', 'tenant1', 'install');
      expect(listener).toHaveBeenCalled();
    });

    it('should emit quota warning event', async () => {
      const listener = jest.fn();
      quotaManager.on('quotaWarning', listener);

      // 达到80%配额
      for (let i = 0; i < 8; i++) {
        await quotaManager.incrementSkillCount('user1', 'tenant1');
      }

      await quotaManager.checkQuota('user1', 'tenant1', 'install');
      expect(listener).toHaveBeenCalled();
    });
  });
});
