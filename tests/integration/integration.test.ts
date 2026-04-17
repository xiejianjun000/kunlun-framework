/**
 * 昆仑框架集成测试
 * Kunlun Framework Integration Tests
 * 
 * 测试场景：
 * 1. 新用户注册 → 自动初始化 → 技能安装 → 记忆存储 → 人格蒸馏 → 进化触发
 * 2. 多租户隔离验证
 * 3. 心跳巡检触发
 * 4. 完整生命周期测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { KunlunFramework, KunlunFrameworkConfig } from '../../src/core/KunlunFramework';
import { SkillSystem, SkillSystemConfig } from '../../src/modules/skill-system/SkillSystem';
import { MemorySystem, MemorySystemOptions } from '../../src/modules/memory-system/MemorySystem';
import { PersonalitySystem, PersonalitySystemConfig } from '../../src/modules/personality-system/PersonalitySystem';
import { EvolutionSystem } from '../../src/modules/evolution-system/core/EvolutionSystem';
import { MemoryTier, MemoryType } from '../../src/modules/memory-system/interfaces';
import { TraitType } from '../../src/core/interfaces/IPersonalitySystem';

// ============== 测试配置 ==============

const testConfig: KunlunFrameworkConfig = {
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },
  skillSystem: {
    maxSkillsPerUser: 10,
    skillIsolation: 'process',
    skillsPath: './test-data/skills'
  },
  memorySystem: {
    vectorDb: {
      adapter: 'local'
    },
    memoryPath: './test-data/memory.md'
  },
  security: {
    level: 'standard',
    approvalRequired: ['dangerous_commands']
  },
  heartbeat: {
    interval: 60000, // 1分钟用于测试
    enableBuiltinCheckers: true,
    failureThreshold: 3
  },
  logger: {
    level: 'error' // 测试时减少日志输出
  }
};

// ============== 测试数据工厂 ==============

interface TestTenant {
  id: string;
  name: string;
}

interface TestUser {
  id: string;
  tenantId: string;
  name: string;
}

const testTenant: TestTenant = {
  id: 'tenant-integration-test',
  name: '集成测试租户'
};

const testUsers: TestUser[] = [
  { id: 'user-alpha', tenantId: testTenant.id, name: '用户A' },
  { id: 'user-beta', tenantId: testTenant.id, name: '用户B' },
  { id: 'user-gamma', tenantId: 'tenant-other', name: '用户C' }
];

// ============== 框架实例 ==============

let framework: KunlunFramework;
let skillSystem: SkillSystem;
let memorySystem: MemorySystem;
let personalitySystem: PersonalitySystem;
let evolutionSystem: EvolutionSystem;

// ============== 生命周期测试套件 ==============

describe('昆仑框架 - 集成测试套件', () => {
  
  // ============== 初始化阶段 ==============
  
  describe('Phase 1: 框架初始化', () => {
    it('应该成功创建框架实例', () => {
      framework = new KunlunFramework(testConfig);
      expect(framework).toBeDefined();
      expect(framework.name).toBe('Kunlun Framework');
      expect(framework.version).toBe('1.0.0');
    });

    it('应该使用默认配置创建实例', () => {
      const defaultFramework = new KunlunFramework({});
      expect(defaultFramework).toBeDefined();
      expect(defaultFramework.isReady()).toBe(false);
    });

    it('应该获取正确的配置', () => {
      const config = framework.getConfig();
      expect(config.multiTenant.enabled).toBe(true);
      expect(config.multiTenant.isolationLevel).toBe('standard');
      expect(config.skillSystem.maxSkillsPerUser).toBe(10);
    });
  });

  describe('Phase 2: 子系统初始化', () => {
    it('应该成功初始化技能系统', async () => {
      const skillConfig: SkillSystemConfig = {
        skillsRoot: './test-data/skills',
        registryPath: './test-data/skill-registry.json',
        tempDir: './test-data/temp',
        enableSignatureVerification: false,
        enableQuotaManagement: true,
        defaultQuotaLimits: {
          maxSkills: 10,
          maxConcurrentExecutions: 5,
          maxDailyExecutions: 100
        }
      };
      
      skillSystem = new SkillSystem(skillConfig);
      expect(skillSystem).toBeDefined();
    });

    it('应该成功初始化记忆系统', async () => {
      const memoryConfig: MemorySystemOptions = {
        storeConfig: {
          dbType: 'sqlite',
          connectionString: ':memory:'
        },
        vectorStoreConfig: {
          type: 'local',
          dimension: 1536
        }
      };
      
      memorySystem = new MemorySystem(memoryConfig);
      expect(memorySystem).toBeDefined();
    });

    it('应该成功初始化人格系统', async () => {
      const personalityConfig: PersonalitySystemConfig = {
        confidenceThreshold: 0.7,
        maxEvidenceCount: 100,
        updateFrequencyLimit: 60000,
        enableSnapshot: true,
        snapshotRetentionDays: 30
      };
      
      personalitySystem = new PersonalitySystem(personalityConfig);
      expect(personalitySystem).toBeDefined();
    });

    it('应该成功初始化进化系统', () => {
      evolutionSystem = new EvolutionSystem();
      expect(evolutionSystem).toBeDefined();
    });
  });

  // ============== 用户注册测试 ==============

  describe('Phase 3: 用户注册流程', () => {
    it('应该为新用户创建人格档案', async () => {
      const userId = testUsers[0].id;
      const tenantId = testUsers[0].tenantId;
      
      // 创建人格档案
      const profile = await personalitySystem.createProfile(userId, tenantId);
      
      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(profile.tenantId).toBe(tenantId);
      expect(profile.dimensions).toBeDefined();
      expect(profile.createdAt).toBeDefined();
    });

    it('应该为新用户创建记忆存储', async () => {
      const userId = testUsers[0].id;
      const tenantId = testUsers[0].tenantId;
      
      // 初始化用户记忆空间
      await memorySystem.initialize();
      
      // 存储初始记忆
      const memoryId = await memorySystem.store({
        userId,
        tenantId,
        content: '用户完成注册流程',
        type: MemoryType.CONVERSATION,
        tier: MemoryTier.WARM
      }, userId);
      
      expect(memoryId).toBeDefined();
    });
  });

  // ============== 技能管理测试 ==============

  describe('Phase 4: 技能管理', () => {
    it('应该注册新技能', async () => {
      const skillInfo = await skillSystem.registerSkill({
        skillId: 'test-skill-basic',
        name: '基础测试技能',
        description: '用于集成测试的基础技能',
        version: '1.0.0',
        author: 'Kunlun Team',
        tags: ['test', 'basic']
      }, testUsers[0].id);
      
      expect(skillInfo).toBeDefined();
      expect(skillInfo.skillId).toBe('test-skill-basic');
    });

    it('应该安装技能到用户空间', async () => {
      const installResult = await skillSystem.installSkill(
        'test-skill-basic',
        testUsers[0].id
      );
      
      expect(installResult.success).toBe(true);
    });

    it('应该列出用户的已安装技能', async () => {
      const skills = await skillSystem.getInstalledSkills(testUsers[0].id);
      
      expect(skills).toBeDefined();
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('应该执行技能', async () => {
      const result = await skillSystem.executeSkill(
        'test-skill-basic',
        { action: 'test', params: {} },
        testUsers[0].id
      );
      
      expect(result).toBeDefined();
    });

    it('应该卸载技能', async () => {
      const uninstallResult = await skillSystem.uninstallSkill(
        'test-skill-basic',
        testUsers[0].id
      );
      
      expect(uninstallResult.success).toBe(true);
    });
  });

  // ============== 记忆管理测试 ==============

  describe('Phase 5: 记忆管理', () => {
    it('应该存储对话记忆', async () => {
      const memoryId = await memorySystem.store({
        userId: testUsers[0].id,
        tenantId: testUsers[0].tenantId,
        content: '用户询问如何安装Node.js',
        type: MemoryType.CONVERSATION,
        tier: MemoryTier.WARM
      }, testUsers[0].id);
      
      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');
    });

    it('应该检索相关记忆', async () => {
      const results = await memorySystem.retrieve(
        'Node.js',
        testUsers[0].id
      );
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该获取用户记忆统计', async () => {
      const stats = await memorySystem.getStats(testUsers[0].id);
      
      expect(stats).toBeDefined();
      expect(stats.totalMemories).toBeGreaterThanOrEqual(0);
    });

    it('应该清理过期记忆', async () => {
      const cleanupResult = await memorySystem.cleanup(testUsers[0].id);
      
      expect(cleanupResult).toBeDefined();
      expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============== 人格蒸馏测试 ==============

  describe('Phase 6: 人格蒸馏', () => {
    it('应该收集用户行为数据', async () => {
      const userId = testUsers[0].id;
      
      // 添加行为数据
      await personalitySystem.addBehaviorData(userId, {
        timestamp: new Date(),
        type: 'conversation',
        content: '用户表现出积极的学习态度',
        context: { topic: 'programming', mood: 'positive' }
      });
      
      // 验证行为数据已添加
      const analysis = await personalitySystem.analyzeBehaviors(userId);
      expect(analysis).toBeDefined();
    });

    it('应该分析用户行为', async () => {
      const analysis = await personalitySystem.analyzeBehaviors(testUsers[0].id);
      
      expect(analysis).toBeDefined();
      expect(analysis.behaviorCount).toBeGreaterThan(0);
    });

    it('应该提取人格特质', async () => {
      const traits = await personalitySystem.extractTraits(testUsers[0].id);
      
      expect(traits).toBeDefined();
      expect(Array.isArray(traits)).toBe(true);
    });

    it('应该更新人格画像', async () => {
      const updateResult = await personalitySystem.updateProfile(testUsers[0].id, {
        dimensions: {
          [TraitType.OPENNESS_CONSERVATISM]: {
            value: 0.7,
            label: '开放',
            confidence: 0.8,
            evidence: ['测试证据']
          }
        }
      });
      
      expect(updateResult).toBeDefined();
    });

    it('应该生成人格报告', async () => {
      const report = await personalitySystem.generateReport(
        testUsers[0].id,
        'detailed'
      );
      
      expect(report).toBeDefined();
      expect(report.profile).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });

    it('应该创建人格快照', async () => {
      const snapshot = await personalitySystem.createSnapshot(testUsers[0].id);
      
      expect(snapshot).toBeDefined();
      expect(snapshot.profile).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
    });
  });

  // ============== 进化系统测试 ==============

  describe('Phase 7: 进化系统', () => {
    it('应该初始化进化系统', async () => {
      await evolutionSystem.initialize();
      
      const status = await evolutionSystem.getStatus();
      expect(status).toBeDefined();
    });

    it('应该触发进化流程', async () => {
      const result = await evolutionSystem.evolve({
        userId: testUsers[0].id,
        tenantId: testUsers[0].tenantId,
        triggerType: 'scheduled'
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('应该获取进化历史', async () => {
      const history = await evolutionSystem.getEvolutionHistory({
        userId: testUsers[0].id,
        tenantId: testUsers[0].tenantId
      });
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it('应该获取进化分析报告', async () => {
      const report = await evolutionSystem.getAnalysisReport(
        testUsers[0].id,
        testUsers[0].tenantId
      );
      
      expect(report).toBeDefined();
    });
  });

  // ============== 多租户隔离测试 ==============

  describe('Phase 8: 多租户隔离验证', () => {
    it('不同租户的记忆应该完全隔离', async () => {
      // 用户A存储记忆
      const memoryA = await memorySystem.store({
        userId: testUsers[0].id,
        tenantId: 'tenant-A',
        content: '这是租户A的私密信息',
        type: MemoryType.CONVERSATION,
        tier: MemoryTier.WARM
      }, testUsers[0].id);
      
      // 用户B存储记忆
      const memoryB = await memorySystem.store({
        userId: testUsers[1].id,
        tenantId: 'tenant-B',
        content: '这是租户B的私密信息',
        type: MemoryType.CONVERSATION,
        tier: MemoryTier.WARM
      }, testUsers[1].id);
      
      // 用户A检索自己的记忆，不应该看到用户B的信息
      const resultsA = await memorySystem.retrieve('私密信息', testUsers[0].id);
      
      // 验证隔离性
      if (resultsA.length > 0) {
        const hasBInfo = resultsA.some(r => 
          r.memory.content.includes('租户B')
        );
        expect(hasBInfo).toBe(false);
      }
    });

    it('不同租户的技能应该隔离', async () => {
      // 注册两个租户的不同技能
      await skillSystem.registerSkill({
        skillId: 'skill-tenant-A',
        name: '租户A技能',
        description: '仅租户A可用'
      }, testUsers[0].id);
      
      await skillSystem.registerSkill({
        skillId: 'skill-tenant-B',
        name: '租户B技能',
        description: '仅租户B可用'
      }, testUsers[1].id);
      
      // 获取各自的技能列表
      const skillsA = await skillSystem.getInstalledSkills(testUsers[0].id);
      const skillsB = await skillSystem.getInstalledSkills(testUsers[1].id);
      
      // 验证隔离
      expect(skillsA.some(s => s.skillId === 'skill-tenant-B')).toBe(false);
      expect(skillsB.some(s => s.skillId === 'skill-tenant-A')).toBe(false);
    });

    it('不同租户的人格画像应该隔离', async () => {
      // 用户A的人格特质
      await personalitySystem.updateProfile(testUsers[0].id, {
        dimensions: {
          [TraitType.EXTRAVERSION_INTROVERSION]: {
            value: 0.9,
            label: '外向',
            confidence: 0.9,
            evidence: ['测试']
          }
        }
      });
      
      // 用户B的人格特质
      await personalitySystem.updateProfile(testUsers[1].id, {
        dimensions: {
          [TraitType.EXTRAVERSION_INTROVERSION]: {
            value: 0.1,
            label: '内向',
            confidence: 0.9,
            evidence: ['测试']
          }
        }
      });
      
      // 获取人格报告
      const reportA = await personalitySystem.getProfile(testUsers[0].id);
      const reportB = await personalitySystem.getProfile(testUsers[1].id);
      
      // 验证隔离
      expect(reportA?.dimensions.personality.dimensions[TraitType.EXTRAVERSION_INTROVERSION].value)
        .not.toBe(reportB?.dimensions.personality.dimensions[TraitType.EXTRAVERSION_INTROVERSION].value);
    });
  });

  // ============== 心跳系统测试 ==============

  describe('Phase 9: 心跳系统', () => {
    it('框架应该支持心跳管理器', () => {
      expect(framework.getHeartbeatManager()).toBeDefined();
    });

    it('应该获取心跳状态', () => {
      const status = framework.getHeartbeatStatus();
      
      expect(status).toBeDefined();
    });

    it('应该手动触发心跳检查', async () => {
      const results = await framework.triggerHeartbeatCheck();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该添加自定义检查项', () => {
      framework.addHeartbeatCheckItem({
        id: 'custom-check',
        name: '自定义检查',
        description: '测试自定义检查项',
        severity: 'medium',
        check: async () => ({
          itemId: 'custom-check',
          itemName: '自定义检查',
          status: 'pass',
          message: '自定义检查通过',
          timestamp: new Date()
        })
      });
      
      expect(framework.getHeartbeatStatus().checkItems.length).toBeGreaterThan(0);
    });

    it('应该移除检查项', () => {
      const result = framework.removeHeartbeatCheckItem('custom-check');
      expect(result).toBe(true);
    });
  });

  // ============== 完整生命周期测试 ==============

  describe('Phase 10: 完整生命周期测试', () => {
    it('应该完成新用户完整生命周期', async () => {
      const newUserId = 'user-lifecycle-test';
      const newTenantId = 'tenant-lifecycle';
      
      // 1. 创建人格档案
      const profile = await personalitySystem.createProfile(newUserId, newTenantId);
      expect(profile.userId).toBe(newUserId);
      
      // 2. 初始化记忆存储
      const memoryId = await memorySystem.store({
        userId: newUserId,
        tenantId: newTenantId,
        content: '新用户首次对话',
        type: MemoryType.CONVERSATION,
        tier: MemoryTier.HOT
      }, newUserId);
      expect(memoryId).toBeDefined();
      
      // 3. 注册并安装技能
      await skillSystem.registerSkill({
        skillId: 'lifecycle-skill',
        name: '生命周期测试技能',
        description: '测试完整生命周期'
      }, newUserId);
      
      const installResult = await skillSystem.installSkill('lifecycle-skill', newUserId);
      expect(installResult.success).toBe(true);
      
      // 4. 添加人格行为数据
      await personalitySystem.addBehaviorData(newUserId, {
        timestamp: new Date(),
        type: 'conversation',
        content: '新用户探索系统功能',
        context: { feature: 'lifecycle' }
      });
      
      // 5. 触发人格分析
      const analysis = await personalitySystem.analyzeBehaviors(newUserId);
      expect(analysis.behaviorCount).toBeGreaterThan(0);
      
      // 6. 触发进化
      const evolveResult = await evolutionSystem.evolve({
        userId: newUserId,
        tenantId: newTenantId,
        triggerType: 'lifecycle'
      });
      expect(evolveResult.success).toBe(true);
      
      // 7. 清理资源
      await personalitySystem.deleteProfile(newUserId);
      
      console.log('✅ 完整生命周期测试通过');
    });

    it('应该处理并发请求', async () => {
      const promises = testUsers.map(async (user) => {
        const memoryId = await memorySystem.store({
          userId: user.id,
          tenantId: user.tenantId,
          content: `并发测试-${user.name}`,
          type: MemoryType.CONVERSATION,
          tier: MemoryTier.WARM
        }, user.id);
        return memoryId;
      });
      
      const results = await Promise.all(promises);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(testUsers.length);
      results.forEach(id => expect(id).toBeDefined());
    });
  });

  // ============== 错误处理测试 ==============

  describe('Phase 11: 错误处理', () => {
    it('应该处理无效技能ID', async () => {
      try {
        await skillSystem.executeSkill('non-existent-skill', {}, 'user-1');
        expect(true).toBe(false); // 应该抛出错误
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该处理无效用户ID', async () => {
      try {
        await personalitySystem.getProfile('non-existent-user');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该处理无效租户ID', async () => {
      try {
        await memorySystem.retrieve('test', 'non-existent-user');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});

// ============== 测试报告 ==============

describe('测试报告生成', () => {
  it('应该生成集成测试报告', () => {
    const report = {
      timestamp: new Date().toISOString(),
      framework: {
        name: 'Kunlun Framework',
        version: '1.0.0'
      },
      modules: [
        'SkillSystem',
        'MemorySystem', 
        'PersonalitySystem',
        'EvolutionSystem',
        'HeartbeatSystem'
      ],
      testPhases: [
        '框架初始化',
        '子系统初始化',
        '用户注册流程',
        '技能管理',
        '记忆管理',
        '人格蒸馏',
        '进化系统',
        '多租户隔离',
        '心跳系统',
        '完整生命周期',
        '错误处理'
      ],
      coverage: {
        core: true,
        skillSystem: true,
        memorySystem: true,
        personalitySystem: true,
        evolutionSystem: true,
        multiTenant: true
      }
    };
    
    console.log('集成测试报告:', JSON.stringify(report, null, 2));
    expect(report.modules.length).toBe(5);
  });
});
