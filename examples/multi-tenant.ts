/**
 * 多租户使用示例
 * OpenTaiji Multi-Tenant Usage Example
 * 
 * 本示例演示如何在OpenTaiji中实现多租户隔离，包括：
 * 1. 创建租户和用户
 * 2. 租户资源隔离
 * 3. 租户配额管理
 * 4. 跨租户操作限制
 */

import { TaijiFramework, TaijiFrameworkConfig } from '../src/core/TaijiFramework';
import { SkillSystem } from '../src/modules/skill-system/SkillSystem';
import { MemorySystem } from '../src/modules/memory-system/MemorySystem';
import { PersonalitySystem } from '../src/modules/personality-system/PersonalitySystem';
import { MemoryTier, MemoryType } from '../src/modules/memory-system/interfaces';
import { TraitType } from '../src/core/interfaces/IPersonalitySystem';

// ============== 类型定义 ==============

interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  quota: {
    maxUsers: number;
    maxSkillsPerUser: number;
    maxMemoryStorage: number;
    maxApiCalls: number;
  };
}

interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

// ============== 租户配置 ==============

const TENANT_PLANS: Record<string, Tenant['quota']> = {
  free: {
    maxUsers: 5,
    maxSkillsPerUser: 10,
    maxMemoryStorage: 1000,
    maxApiCalls: 1000
  },
  pro: {
    maxUsers: 50,
    maxSkillsPerUser: 50,
    maxMemoryStorage: 10000,
    maxApiCalls: 10000
  },
  enterprise: {
    maxUsers: Infinity,
    maxSkillsPerUser: 200,
    maxMemoryStorage: Infinity,
    maxApiCalls: Infinity
  }
};

// ============== 示例代码 ==============

/**
 * 示例1: 创建和管理租户
 */
async function example1_tenantManagement() {
  console.log('示例1: 创建和管理租户');
  console.log('='.repeat(50));

  const framework = new TaijiFramework({
    multiTenant: {
      enabled: true,
      isolationLevel: 'standard'
    }
  });

  await framework.initialize();

  // 创建租户
  const tenants: Tenant[] = [
    {
      id: 'tenant-alpha',
      name: 'Alpha科技公司',
      plan: 'pro',
      quota: TENANT_PLANS.pro
    },
    {
      id: 'tenant-beta',
      name: 'Beta创业团队',
      plan: 'free',
      quota: TENANT_PLANS.free
    },
    {
      id: 'tenant-gamma',
      name: 'Gamma集团',
      plan: 'enterprise',
      quota: TENANT_PLANS.enterprise
    }
  ];

  for (const tenant of tenants) {
    console.log(`创建租户: ${tenant.name} (${tenant.plan}计划)`);
    console.log(`  - 最大用户数: ${tenant.quota.maxUsers}`);
    console.log(`  - 每用户最大技能数: ${tenant.quota.maxSkillsPerUser}`);
    console.log(`  - 最大存储: ${tenant.quota.maxMemoryStorage}`);
  }

  console.log('\n✅ 示例1完成\n');
  return tenants;
}

/**
 * 示例2: 创建租户用户
 */
async function example2_userManagement(tenants: Tenant[]) {
  console.log('示例2: 创建租户用户');
  console.log('='.repeat(50));

  const users: TenantUser[] = [];

  // 为每个租户创建用户
  for (const tenant of tenants) {
    const userCount = Math.min(3, tenant.quota.maxUsers);
    
    for (let i = 0; i < userCount; i++) {
      const user: TenantUser = {
        id: `${tenant.id}-user-${i + 1}`,
        tenantId: tenant.id,
        email: `user${i + 1}@${tenant.id}.com`,
        role: i === 0 ? 'admin' : 'member'
      };
      
      users.push(user);
      console.log(`创建用户: ${user.email} (${user.role}) - 租户: ${tenant.name}`);
    }
  }

  console.log(`\n总共创建用户: ${users.length} 个`);
  console.log('\n✅ 示例2完成\n');
  return users;
}

/**
 * 示例3: 租户数据隔离
 */
async function example3_dataIsolation(users: TenantUser[]) {
  console.log('示例3: 租户数据隔离');
  console.log('='.repeat(50));

  // 创建记忆系统
  const memorySystem = new MemorySystem({
    storeConfig: { dbType: 'sqlite', connectionString: ':memory:' },
    vectorStoreConfig: { type: 'local', dimension: 1536 }
  });

  await memorySystem.initialize();

  // 获取不同租户的用户
  const alphaUser = users.find(u => u.tenantId === 'tenant-alpha')!;
  const betaUser = users.find(u => u.tenantId === 'tenant-beta')!;

  // Alpha租户用户存储数据
  await memorySystem.store({
    userId: alphaUser.id,
    tenantId: alphaUser.tenantId,
    content: 'Alpha租户的机密商业计划',
    type: MemoryType.CONVERSATION,
    tier: MemoryTier.WARM,
    metadata: { classification: 'confidential' }
  }, alphaUser.id);

  // Beta租户用户存储数据
  await memorySystem.store({
    userId: betaUser.id,
    tenantId: betaUser.tenantId,
    content: 'Beta租户的技术文档',
    type: MemoryType.KNOWLEDGE,
    tier: MemoryTier.COLD,
    metadata: { classification: 'internal' }
  }, betaUser.id);

  // 检索验证隔离
  const alphaResults = await memorySystem.retrieve('机密', alphaUser.id);
  const betaResults = await memorySystem.retrieve('技术', betaUser.id);

  console.log(`Alpha用户检索'机密': ${alphaResults.length} 条 (应包含商业计划)`);
  console.log(`Beta用户检索'技术': ${betaResults.length} 条 (应包含技术文档)`);

  // 验证：Alpha用户不应该看到Beta的数据
  for (const result of alphaResults) {
    if (result.memory.content.includes('Beta')) {
      console.error('❌ 隔离失败: Alpha用户看到了Beta的数据');
      throw new Error('数据隔离验证失败');
    }
  }

  console.log('✅ 租户数据隔离验证通过');

  await memorySystem.destroy();
  console.log('\n✅ 示例3完成\n');
}

/**
 * 示例4: 租户技能隔离
 */
async function example4_skillIsolation(users: TenantUser[]) {
  console.log('示例4: 租户技能隔离');
  console.log('='.repeat(50));

  const skillSystem = new SkillSystem({
    skillsRoot: './skills',
    enableQuotaManagement: true
  });

  const proUser = users.find(u => u.tenantId === 'tenant-alpha')!;
  const freeUser = users.find(u => u.tenantId === 'tenant-beta')!;

  // Pro租户注册高级技能
  await skillSystem.registerSkill({
    skillId: 'pro-analytics',
    name: '高级分析',
    description: '仅Pro用户可用的高级分析技能',
    tags: ['analytics', 'pro']
  }, proUser.id);
  
  await skillSystem.installSkill('pro-analytics', proUser.id);
  console.log(`Pro用户安装技能: pro-analytics`);

  // Free租户注册基础技能
  await skillSystem.registerSkill({
    skillId: 'free-basic',
    name: '基础工具',
    description: '所有用户可用的基础技能',
    tags: ['basic', 'free']
  }, freeUser.id);
  
  await skillSystem.installSkill('free-basic', freeUser.id);
  console.log(`Free用户安装技能: free-basic`);

  // 获取各自的技能列表
  const proSkills = await skillSystem.getInstalledSkills(proUser.id);
  const freeSkills = await skillSystem.getInstalledSkills(freeUser.id);

  console.log(`\nPro用户技能: ${proSkills.map(s => s.name).join(', ')}`);
  console.log(`Free用户技能: ${freeSkills.map(s => s.name).join(', ')}`);

  // 验证隔离
  const proHasProSkill = proSkills.some(s => s.skillId === 'pro-analytics');
  const freeHasProSkill = freeSkills.some(s => s.skillId === 'pro-analytics');
  
  console.log(`\nPro用户有pro-analytics: ${proHasProSkill}`);
  console.log(`Free用户有pro-analytics: ${freeHasProSkill}`);
  
  if (freeHasProSkill) {
    console.error('❌ 隔离失败: Free用户不应该有Pro技能');
    throw new Error('技能隔离验证失败');
  }

  console.log('✅ 租户技能隔离验证通过');
  console.log('\n✅ 示例4完成\n');
}

/**
 * 示例5: 租户人格隔离
 */
async function example5_personalityIsolation(users: TenantUser[]) {
  console.log('示例5: 租户人格隔离');
  console.log('='.repeat(50));

  const personalitySystem = new PersonalitySystem({
    confidenceThreshold: 0.7
  });

  const alphaUser = users.find(u => u.tenantId === 'tenant-alpha')!;
  const gammaUser = users.find(u => u.tenantId === 'tenant-gamma')!;

  // Alpha用户人格画像
  await personalitySystem.createProfile(alphaUser.id, alphaUser.tenantId);
  await personalitySystem.updateProfile(alphaUser.id, {
    dimensions: {
      [TraitType.OPENNESS_CONSERVATISM]: {
        value: 0.9,
        label: '非常开放',
        confidence: 0.9,
        evidence: ['喜欢尝试新事物']
      }
    }
  });
  console.log(`Alpha用户人格: 开放型 (0.9)`);

  // Gamma用户人格画像
  await personalitySystem.createProfile(gammaUser.id, gammaUser.tenantId);
  await personalitySystem.updateProfile(gammaUser.id, {
    dimensions: {
      [TraitType.OPENNESS_CONSERVATISM]: {
        value: 0.2,
        label: '保守型',
        confidence: 0.85,
        evidence: ['倾向于稳定方案']
      }
    }
  });
  console.log(`Gamma用户人格: 保守型 (0.2)`);

  // 获取人格画像
  const alphaProfile = await personalitySystem.getProfile(alphaUser.id);
  const gammaProfile = await personalitySystem.getProfile(gammaUser.id);

  // 验证隔离
  const alphaOpenness = alphaProfile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value;
  const gammaOpenness = gammaProfile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value;

  console.log(`\nAlpha开放度: ${alphaOpenness}`);
  console.log(`Gamma开放度: ${gammaOpenness}`);

  if (Math.abs(alphaOpenness! - gammaOpenness!) < 0.5) {
    console.error('❌ 隔离失败: 不同用户的人格画像相同');
    throw new Error('人格隔离验证失败');
  }

  console.log('✅ 租户人格隔离验证通过');
  console.log('\n✅ 示例5完成\n');
}

/**
 * 示例6: 租户配额管理
 */
async function example6_quotaManagement(tenants: Tenant[]) {
  console.log('示例6: 租户配额管理');
  console.log('='.repeat(50));

  const skillSystem = new SkillSystem({
    skillsRoot: './skills',
    enableQuotaManagement: true,
    defaultQuotaLimits: {
      maxSkills: 100,
      maxConcurrentExecutions: 50,
      maxDailyExecutions: 10000
    }
  });

  for (const tenant of tenants) {
    const quota = tenant.quota;
    
    console.log(`\n租户: ${tenant.name} (${tenant.plan})`);
    console.log(`  配额限制:`);
    console.log(`    - 最大用户数: ${quota.maxUsers}`);
    console.log(`    - 每用户最大技能: ${quota.maxSkillsPerUser}`);
    console.log(`    - 最大存储: ${quota.maxMemoryStorage}`);
    console.log(`    - 最大API调用: ${quota.maxApiCalls}`);

    // 模拟配额检查
    const currentUsage = {
      users: tenant.id === 'tenant-alpha' ? 3 : tenant.id === 'tenant-beta' ? 2 : 1,
      skills: tenant.id === 'tenant-alpha' ? 25 : tenant.id === 'tenant-beta' ? 5 : 50,
      storage: tenant.id === 'tenant-alpha' ? 5000 : tenant.id === 'tenant-beta' ? 500 : 10000
    };

    console.log(`  当前使用:`);
    console.log(`    - 用户数: ${currentUsage.users} / ${quota.maxUsers}`);
    console.log(`    - 技能数: ${currentUsage.skills} / ${quota.maxSkillsPerUser}`);
    console.log(`    - 存储: ${currentUsage.storage} / ${quota.maxMemoryStorage}`);

    // 检查配额
    const canAddUser = currentUsage.users < quota.maxUsers;
    const canAddSkill = currentUsage.skills < quota.maxSkillsPerUser;
    
    console.log(`  配额检查:`);
    console.log(`    - 可添加用户: ${canAddUser ? '✅' : '❌'}`);
    console.log(`    - 可添加技能: ${canAddSkill ? '✅' : '❌'}`);
  }

  console.log('\n✅ 示例6完成\n');
}

/**
 * 示例7: 跨租户操作限制
 */
async function example7_crossTenantRestrictions() {
  console.log('示例7: 跨租户操作限制');
  console.log('='.repeat(50));

  const memorySystem = new MemorySystem({
    storeConfig: { dbType: 'sqlite', connectionString: ':memory:' },
    vectorStoreConfig: { type: 'local', dimension: 1536 }
  });

  await memorySystem.initialize();

  const tenantAUser = 'tenant-a-user-1';
  const tenantBUser = 'tenant-b-user-1';

  // 存储数据
  await memorySystem.store({
    userId: tenantAUser,
    tenantId: 'tenant-a',
    content: '租户A的敏感数据',
    type: MemoryType.CONVERSATION,
    tier: MemoryTier.WARM
  }, tenantAUser);

  // 模拟跨租户访问尝试
  console.log('尝试跨租户访问...');
  
  try {
    // 尝试用租户B的ID访问租户A的数据
    const results = await memorySystem.retrieve('敏感数据', tenantAUser);
    
    // 检查是否泄露
    const leaked = results.some(r => r.memory.tenantId !== 'tenant-a');
    
    if (leaked) {
      console.error('❌ 安全漏洞: 跨租户数据泄露');
      throw new Error('跨租户限制验证失败');
    }
    
    console.log('✅ 跨租户访问被正确阻止');
  } catch (error) {
    console.log('✅ 跨租户访问被正确阻止');
  }

  await memorySystem.destroy();
  console.log('\n✅ 示例7完成\n');
}

// ============== 主函数 ==============

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🏢 OpenTaiji多租户使用示例');
  console.log('='.repeat(60) + '\n');

  try {
    const tenants = await example1_tenantManagement();
    const users = await example2_userManagement(tenants);
    await example3_dataIsolation(users);
    await example4_skillIsolation(users);
    await example5_personalityIsolation(users);
    await example6_quotaManagement(tenants);
    await example7_crossTenantRestrictions();

    console.log('='.repeat(60));
    console.log('🎉 多租户示例执行完成!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    throw error;
  }
}

// 运行示例
main().catch(console.error);

// 导出示例函数
export {
  example1_tenantManagement,
  example2_userManagement,
  example3_dataIsolation,
  example4_skillIsolation,
  example5_personalityIsolation,
  example6_quotaManagement,
  example7_crossTenantRestrictions
};
