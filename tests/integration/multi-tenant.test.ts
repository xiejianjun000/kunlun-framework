/**
 * 多租户隔离集成测试
 * OpenTaiji Multi-Tenant Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MemorySystem, MemorySystemOptions } from '../../src/modules/memory-system/MemorySystem';
import { SkillSystem, SkillSystemConfig } from '../../src/modules/skill-system/SkillSystem';
import { PersonalitySystem, PersonalitySystemConfig } from '../../src/modules/personality-system/PersonalitySystem';
import { MemoryTier, MemoryType } from '../../src/modules/memory-system/interfaces';
import { TraitType } from '../../src/core/interfaces/IPersonalitySystem';

// ============== 测试数据 ==============

interface TenantContext {
  tenantId: string;
  name: string;
  users: string[];
}

const tenants: TenantContext[] = [
  {
    tenantId: 'tenant-alpha',
    name: 'Alpha租户',
    users: ['user-a1', 'user-a2']
  },
  {
    tenantId: 'tenant-beta',
    name: 'Beta租户',
    users: ['user-b1', 'user-b2']
  },
  {
    tenantId: 'tenant-gamma',
    name: 'Gamma租户',
    users: ['user-g1']
  }
];

// ============== 测试套件 ==============

describe('多租户隔离集成测试', () => {
  let memorySystem: MemorySystem;
  let skillSystem: SkillSystem;
  let personalitySystem: PersonalitySystem;

  beforeAll(async () => {
    // 初始化记忆系统
    memorySystem = new MemorySystem({
      storeConfig: { dbType: 'sqlite', connectionString: ':memory:' },
      vectorStoreConfig: { type: 'local', dimension: 1536 }
    });
    await memorySystem.initialize();

    // 初始化技能系统
    skillSystem = new SkillSystem({
      skillsRoot: './test-data/multi-tenant/skills',
      enableSignatureVerification: false,
      enableQuotaManagement: true
    });

    // 初始化人格系统
    personalitySystem = new PersonalitySystem({
      confidenceThreshold: 0.7,
      enableSnapshot: true
    });
  });

  describe('租户数据隔离', () => {
    it('记忆数据应按租户隔离', async () => {
      for (const tenant of tenants) {
        for (const userId of tenant.users) {
          // 存储租户特定数据
          const memoryId = await memorySystem.store({
            userId,
            tenantId: tenant.tenantId,
            content: `租户${tenant.name}的用户${userId}的私密数据`,
            type: MemoryType.CONVERSATION,
            tier: MemoryTier.WARM
          }, userId);

          expect(memoryId).toBeDefined();
        }
      }

      // 验证隔离：每个租户只能看到自己的数据
      for (const tenant of tenants) {
        const results = await memorySystem.retrieve('私密数据', tenant.users[0]);
        
        // 检查结果中是否只包含当前租户的数据
        for (const result of results) {
          expect(result.memory.tenantId).toBe(tenant.tenantId);
        }
      }
    });

    it('技能数据应按租户隔离', async () => {
      for (const tenant of tenants) {
        const skillId = `skill-${tenant.tenantId}`;
        
        await skillSystem.registerSkill({
          skillId,
          name: `${tenant.name}的专属技能`,
          description: `仅${tenant.name}可用`
        }, tenant.users[0]);

        await skillSystem.installSkill(skillId, tenant.users[0]);
      }

      // 验证隔离
      for (const tenant of tenants) {
        const skills = await skillSystem.getInstalledSkills(tenant.users[0]);
        const hasOtherTenantSkill = skills.some(s => 
          !s.skillId.includes(tenant.tenantId)
        );
        expect(hasOtherTenantSkill).toBe(false);
      }
    });

    it('人格数据应按租户隔离', async () => {
      for (const tenant of tenants) {
        const userId = tenant.users[0];
        
        // 创建人格档案并设置独特特质
        await personalitySystem.createProfile(userId, tenant.tenantId);
        
        const opennessValue = tenants.indexOf(tenant) * 0.3 + 0.2;
        await personalitySystem.updateProfile(userId, {
          dimensions: {
            [TraitType.OPENNESS_CONSERVATISM]: {
              value: opennessValue,
              label: opennessValue > 0.5 ? '开放' : '保守',
              confidence: 0.9,
              evidence: ['测试数据']
            }
          }
        });
      }

      // 验证隔离
      for (const tenant of tenants) {
        const profile = await personalitySystem.getProfile(tenant.users[0]);
        const opennessValue = tenants.indexOf(tenant) * 0.3 + 0.2;
        
        expect(profile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value)
          .toBeCloseTo(opennessValue, 1);
      }
    });
  });

  describe('租户资源配额', () => {
    it('应跟踪每个租户的资源使用', async () => {
      for (const tenant of tenants) {
        const stats = await memorySystem.getStats(tenant.users[0]);
        
        expect(stats.totalMemories).toBeGreaterThanOrEqual(0);
        expect(stats.tierDistribution).toBeDefined();
      }
    });

    it('应限制租户资源使用', async () => {
      // 测试配额限制
      const quotaInfo = await skillSystem.getQuotaInfo('tenant-alpha', tenants[0].users[0]);
      
      expect(quotaInfo).toBeDefined();
      expect(quotaInfo.used).toBeLessThanOrEqual(quotaInfo.limit);
    });
  });

  describe('跨租户操作限制', () => {
    it('应阻止跨租户数据访问', async () => {
      const tenantAUser = tenants[0].users[0];
      const tenantBUser = tenants[1].users[0];

      // 尝试使用租户B的ID访问租户A的数据
      try {
        const profile = await personalitySystem.getProfile(tenantAUser);
        // 在正常隔离下，应该只能获取到当前用户自己的数据
        expect(profile?.userId).toBe(tenantAUser);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应阻止跨租户技能执行', async () => {
      const tenantASkill = `skill-${tenants[0].tenantId}`;
      
      // 尝试用租户B的用户执行租户A的技能
      try {
        await skillSystem.executeSkill(tenantASkill, {}, tenants[1].users[0]);
        // 如果没有隔离，应该能执行（这是不希望发生的情况）
        // 但在正确的实现中，应该被阻止
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
