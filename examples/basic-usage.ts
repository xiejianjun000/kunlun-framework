/**
 * OpenTaiji基础使用示例
 * OpenTaiji Basic Usage Example
 * 
 * 本示例演示OpenTaiji的基本使用方法，包括：
 * 1. 创建框架实例
 * 2. 初始化各个子系统
 * 3. 基本的用户注册和技能管理
 * 4. 记忆存储和检索
 */

import { TaijiFramework, TaijiFrameworkConfig } from '../src/core/TaijiFramework';
import { SkillSystem, SkillSystemConfig } from '../src/modules/skill-system/SkillSystem';
import { MemorySystem } from '../src/modules/memory-system/MemorySystem';
import { PersonalitySystem } from '../src/modules/personality-system/PersonalitySystem';
import { EvolutionSystem } from '../src/modules/evolution-system/core/EvolutionSystem';
import { MemoryTier, MemoryType } from '../src/modules/memory-system/interfaces';

// ============== 示例配置 ==============

const FRAMEWORK_CONFIG: TaijiFrameworkConfig = {
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },
  skillSystem: {
    maxSkillsPerUser: 100,
    skillIsolation: 'venv',
    skillsPath: './skills'
  },
  memorySystem: {
    vectorDb: {
      adapter: 'qdrant',
      url: 'localhost:6333'
    },
    memoryPath: './MEMORY.md'
  },
  security: {
    level: 'standard',
    approvalRequired: ['dangerous_commands', 'sensitive_files']
  },
  heartbeat: {
    interval: 30 * 60 * 1000, // 30分钟
    enableBuiltinCheckers: true,
    failureThreshold: 3
  },
  logger: {
    level: 'info',
    output: 'console'
  }
};

// ============== 示例代码 ==============

/**
 * 示例1: 创建和初始化框架
 */
async function example1_createAndInitialize() {
  console.log('示例1: 创建和初始化框架');
  console.log('='.repeat(50));

  // 创建框架实例
  const Taiji = new TaijiFramework(FRAMEWORK_CONFIG);
  
  console.log(`框架名称: ${Taiji.name}`);
  console.log(`框架版本: ${Taiji.version}`);
  console.log(`是否就绪: ${Taiji.isReady()}`);

  // 初始化框架
  await Taiji.initialize();
  
  console.log(`初始化后是否就绪: ${Taiji.isReady()}`);
  console.log(`心跳状态: ${JSON.stringify(Taiji.getHeartbeatStatus())}`);
  
  // 获取配置
  const config = Taiji.getConfig();
  console.log(`多租户启用: ${config.multiTenant.enabled}`);
  console.log(`安全级别: ${config.security.level}`);
  
  console.log('\n✅ 示例1完成\n');
  
  return Taiji;
}

/**
 * 示例2: 技能管理
 */
async function example2_skillManagement() {
  console.log('示例2: 技能管理');
  console.log('='.repeat(50));

  // 创建技能系统
  const skillSystem = new SkillSystem({
    skillsRoot: './skills',
    registryPath: './data/skill-registry.json',
    enableSignatureVerification: false,
    enableQuotaManagement: true,
    defaultQuotaLimits: {
      maxSkills: 50,
      maxConcurrentExecutions: 10,
      maxDailyExecutions: 1000
    }
  });

  const userId = 'user-demo-001';
  const tenantId = 'tenant-demo';

  // 注册技能
  const skill = await skillSystem.registerSkill({
    skillId: 'skill-weather',
    name: '天气查询',
    description: '查询指定城市的天气信息',
    version: '1.0.0',
    author: 'Taiji Team',
    tags: ['utility', 'weather', 'api']
  }, userId);
  
  console.log(`注册的技能: ${skill.name} (${skill.skillId})`);

  // 安装技能
  const installResult = await skillSystem.installSkill('skill-weather', userId);
  console.log(`安装结果: ${installResult.success ? '成功' : '失败'}`);

  // 获取已安装技能列表
  const installedSkills = await skillSystem.getInstalledSkills(userId);
  console.log(`用户已安装技能数: ${installedSkills.length}`);
  
  for (const s of installedSkills) {
    console.log(`  - ${s.name} (v${s.version})`);
  }

  // 搜索技能
  const searchResults = await skillSystem.searchSkills({
    query: '天气',
    tags: ['weather']
  });
  console.log(`搜索'天气'结果: ${searchResults.total} 个`);

  // 执行技能
  const executionResult = await skillSystem.executeSkill(
    'skill-weather',
    { action: 'query', city: '北京' },
    userId
  );
  console.log(`执行结果: ${executionResult.success ? '成功' : '失败'}`);
  
  if (executionResult.output) {
    console.log(`输出: ${JSON.stringify(executionResult.output)}`);
  }

  // 获取技能统计
  const stats = await skillSystem.getSkillStats('skill-weather', userId);
  console.log(`技能统计: 执行${stats.totalExecutions}次, 成功率${(stats.successRate * 100).toFixed(1)}%`);

  // 卸载技能
  await skillSystem.uninstallSkill('skill-weather', userId);
  console.log('技能已卸载');

  console.log('\n✅ 示例2完成\n');
}

/**
 * 示例3: 记忆管理
 */
async function example3_memoryManagement() {
  console.log('示例3: 记忆管理');
  console.log('='.repeat(50));

  // 创建记忆系统
  const memorySystem = new MemorySystem({
    storeConfig: {
      dbType: 'sqlite',
      connectionString: './data/memory.db'
    },
    vectorStoreConfig: {
      type: 'qdrant',
      url: 'http://localhost:6333',
      dimension: 1536
    }
  });

  // 初始化
  await memorySystem.initialize();

  const userId = 'user-demo-001';
  const tenantId = 'tenant-demo';

  // 存储对话记忆
  const conversationMemory = await memorySystem.store({
    userId,
    tenantId,
    content: '用户询问如何安装Node.js环境',
    type: MemoryType.CONVERSATION,
    tier: MemoryTier.WARM,
    metadata: {
      topic: 'programming',
      language: 'zh'
    }
  }, userId);
  console.log(`存储对话记忆: ${conversationMemory}`);

  // 存储知识记忆
  const knowledgeMemory = await memorySystem.store({
    userId,
    tenantId,
    content: 'Node.js是一个基于Chrome V8引擎的JavaScript运行时环境',
    type: MemoryType.KNOWLEDGE,
    tier: MemoryTier.COLD,
    metadata: {
      category: 'programming',
      source: 'documentation'
    }
  }, userId);
  console.log(`存储知识记忆: ${knowledgeMemory}`);

  // 存储任务记忆
  const taskMemory = await memorySystem.store({
    userId,
    tenantId,
    content: '用户正在学习TypeScript类型系统',
    type: MemoryType.TASK,
    tier: MemoryTier.HOT,
    metadata: {
      taskId: 'task-001',
      progress: 'in_progress'
    }
  }, userId);
  console.log(`存储任务记忆: ${taskMemory}`);

  // 检索相关记忆
  const searchResults = await memorySystem.retrieve('Node.js', userId);
  console.log(`检索'Node.js'相关记忆: ${searchResults.length} 条`);
  
  for (const result of searchResults) {
    console.log(`  - [${result.memory.type}] ${result.memory.content.substring(0, 50)}...`);
    console.log(`    相似度: ${(result.score * 100).toFixed(1)}%`);
  }

  // 获取用户统计
  const stats = await memorySystem.getStats(userId);
  console.log(`\n用户记忆统计:`);
  console.log(`  总记忆数: ${stats.totalMemories}`);
  console.log(`  热度分布: ${JSON.stringify(stats.tierDistribution)}`);
  console.log(`  类型分布: ${JSON.stringify(stats.typeDistribution)}`);

  // 清理资源
  await memorySystem.destroy();

  console.log('\n✅ 示例3完成\n');
}

/**
 * 示例4: 人格蒸馏
 */
async function example4_personalityDistillation() {
  console.log('示例4: 人格蒸馏');
  console.log('='.repeat(50));

  // 创建人格系统
  const personalitySystem = new PersonalitySystem({
    confidenceThreshold: 0.7,
    maxEvidenceCount: 100,
    updateFrequencyLimit: 3600000,
    enableSnapshot: true,
    snapshotRetentionDays: 90
  });

  const userId = 'user-demo-001';
  const tenantId = 'tenant-demo';

  // 创建人格档案
  const profile = await personalitySystem.createProfile(userId, tenantId);
  console.log(`创建人格档案: ${profile.userId}`);
  console.log(`五维画像: ${JSON.stringify(Object.keys(profile.dimensions), null, 2)}`);

  // 收集行为数据
  const behaviors = [
    {
      timestamp: new Date(),
      type: 'conversation' as const,
      content: '用户表现出对技术话题的浓厚兴趣',
      context: { topic: 'AI', mood: 'enthusiastic' }
    },
    {
      timestamp: new Date(),
      type: 'interaction' as const,
      content: '用户偏好简洁直接的回复风格',
      context: { style: 'concise' }
    },
    {
      timestamp: new Date(),
      type: 'feedback' as const,
      content: '用户提供了正面反馈，表示满意当前服务',
      context: { sentiment: 'positive' }
    }
  ];

  for (const behavior of behaviors) {
    await personalitySystem.addBehaviorData(userId, behavior);
  }
  console.log(`添加行为数据: ${behaviors.length} 条`);

  // 分析行为
  const analysis = await personalitySystem.analyzeBehaviors(userId);
  console.log(`\n行为分析结果:`);
  console.log(`  行为总数: ${analysis.behaviorCount}`);
  console.log(`  主要模式: ${analysis.patterns.join(', ')}`);
  console.log(`  置信度: ${(analysis.confidence * 100).toFixed(1)}%`);

  // 提取人格特质
  const traits = await personalitySystem.extractTraits(userId);
  console.log(`\n提取的人格特质:`);
  for (const trait of traits) {
    console.log(`  - ${trait.type}: ${trait.value.toFixed(2)} (置信度: ${(trait.confidence * 100).toFixed(1)}%)`);
  }

  // 生成人格报告
  const report = await personalitySystem.generateReport(userId, 'detailed');
  console.log(`\n人格报告已生成 (${report.type})`);
  console.log(`  报告时间: ${report.generatedAt}`);

  // 创建快照
  const snapshot = await personalitySystem.createSnapshot(userId);
  console.log(`\n创建人格快照: ${snapshot.snapshotId}`);
  console.log(`  快照类型: ${snapshot.type}`);

  console.log('\n✅ 示例4完成\n');
}

/**
 * 示例5: 进化系统
 */
async function example5_evolutionSystem() {
  console.log('示例5: 进化系统');
  console.log('='.repeat(50));

  // 创建进化系统
  const evolutionSystem = new EvolutionSystem();

  // 初始化
  await evolutionSystem.initialize();
  console.log('进化系统已初始化');

  const userId = 'user-demo-001';
  const tenantId = 'tenant-demo';

  // 触发进化
  const evolveResult = await evolutionSystem.evolve({
    userId,
    tenantId,
    triggerType: 'manual',
    metadata: {
      reason: '手动触发进化测试'
    }
  });

  console.log(`\n进化结果:`);
  console.log(`  成功: ${evolveResult.success}`);
  console.log(`  版本: ${evolveResult.version}`);
  if (evolveResult.improvements) {
    console.log(`  改进项:`);
    for (const improvement of evolveResult.improvements) {
      console.log(`    - ${improvement}`);
    }
  }

  // 获取进化历史
  const history = await evolutionSystem.getEvolutionHistory({
    userId,
    tenantId,
    limit: 10
  });
  console.log(`\n进化历史: ${history.length} 条记录`);

  // 获取分析报告
  const analysisReport = await evolutionSystem.getAnalysisReport(userId, tenantId);
  console.log(`\n进化分析报告:`);
  console.log(`  总进化次数: ${analysisReport.totalEvolutions}`);
  console.log(`  平均适应度: ${(analysisReport.averageFitness * 100).toFixed(1)}%`);
  console.log(`  稳定性评分: ${(analysisReport.stabilityScore * 100).toFixed(1)}%`);

  // 获取当前状态
  const status = await evolutionSystem.getStatus();
  console.log(`\n进化系统状态: ${status.status}`);

  console.log('\n✅ 示例5完成\n');
}

/**
 * 示例6: 心跳系统
 */
async function example6_heartbeatSystem() {
  console.log('示例6: 心跳系统');
  console.log('='.repeat(50));

  const Taiji = new TaijiFramework({
    heartbeat: {
      interval: 60000, // 1分钟
      enableBuiltinCheckers: true,
      failureThreshold: 3
    }
  });

  await Taiji.initialize();

  // 获取心跳状态
  const status = Taiji.getHeartbeatStatus();
  console.log(`心跳系统运行状态: ${status.isRunning ? '运行中' : '已停止'}`);
  console.log(`检查项数量: ${status.checkItems?.length || 0}`);

  // 手动触发检查
  const results = await Taiji.triggerHeartbeatCheck();
  console.log(`\n执行检查项: ${results.length}`);
  
  for (const result of results) {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${statusIcon} ${result.itemName}: ${result.message}`);
  }

  // 添加自定义检查项
  Taiji.addHeartbeatCheckItem({
    id: 'custom-check',
    name: '自定义业务检查',
    description: '检查自定义业务逻辑',
    severity: 'medium',
    check: async () => ({
      itemId: 'custom-check',
      itemName: '自定义业务检查',
      status: 'pass',
      message: '业务逻辑正常',
      timestamp: new Date()
    })
  });

  console.log('\n✅ 示例6完成\n');
}

/**
 * 示例7: 完整用户生命周期
 */
async function example7_completeUserLifecycle() {
  console.log('示例7: 完整用户生命周期');
  console.log('='.repeat(50));

  const userId = 'user-lifecycle-demo';
  const tenantId = 'tenant-lifecycle-demo';

  // 1. 创建各个子系统
  const memorySystem = new MemorySystem({
    storeConfig: { dbType: 'sqlite', connectionString: ':memory:' },
    vectorStoreConfig: { type: 'local', dimension: 1536 }
  });

  const personalitySystem = new PersonalitySystem();
  const evolutionSystem = new EvolutionSystem();

  // 2. 初始化
  await memorySystem.initialize();
  await personalitySystem.createProfile(userId, tenantId);
  await evolutionSystem.initialize();

  console.log('Phase 1: 系统初始化完成');

  // 3. 收集初始数据
  await memorySystem.store({
    userId,
    tenantId,
    content: '用户首次访问系统',
    type: MemoryType.CONVERSATION,
    tier: MemoryTier.HOT
  }, userId);

  await personalitySystem.addBehaviorData(userId, {
    timestamp: new Date(),
    type: 'conversation',
    content: '用户首次使用AI助手',
    context: { firstVisit: true }
  });

  console.log('Phase 2: 初始数据收集完成');

  // 4. 分析和学习
  const behaviorAnalysis = await personalitySystem.analyzeBehaviors(userId);
  console.log(`Phase 3: 行为分析完成 (模式: ${behaviorAnalysis.patterns.join(', ')})`);

  // 5. 触发进化
  const evolveResult = await evolutionSystem.evolve({
    userId,
    tenantId,
    triggerType: 'lifecycle'
  });
  console.log(`Phase 4: 进化完成 (版本: ${evolveResult.version})`);

  // 6. 生成报告
  const personalityReport = await personalitySystem.generateReport(userId, 'summary');
  const evolutionReport = await evolutionSystem.getAnalysisReport(userId, tenantId);

  console.log('Phase 5: 报告生成完成');
  console.log(`  人格置信度: ${(personalityReport.profile.confidence * 100).toFixed(1)}%`);
  console.log(`  进化适应度: ${(evolutionReport.averageFitness * 100).toFixed(1)}%`);

  // 7. 清理
  await memorySystem.destroy();

  console.log('\n✅ 示例7完成\n');
}

// ============== 主函数 ==============

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧭 OpenTaiji (OpenTaiji) 基础使用示例');
  console.log('='.repeat(60) + '\n');

  try {
    await example1_createAndInitialize();
    await example2_skillManagement();
    await example3_memoryManagement();
    await example4_personalityDistillation();
    await example5_evolutionSystem();
    await example6_heartbeatSystem();
    await example7_completeUserLifecycle();

    console.log('='.repeat(60));
    console.log('🎉 所有示例执行完成!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    throw error;
  }
}

// 运行示例
main().catch(console.error);

// 导出示例函数供外部调用
export {
  example1_createAndInitialize,
  example2_skillManagement,
  example3_memoryManagement,
  example4_personalityDistillation,
  example5_evolutionSystem,
  example6_heartbeatSystem,
  example7_completeUserLifecycle
};
