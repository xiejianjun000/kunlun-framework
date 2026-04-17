/**
 * 人格蒸馏示例
 * Kunlun Framework Personality Distillation Example
 * 
 * 本示例演示如何进行人格蒸馏，包括：
 * 1. 创建人格档案
 * 2. 收集用户行为数据
 * 3. 分析和提取人格特质
 * 4. 生成人格报告
 * 5. 快照管理和人格进化
 */

import { 
  PersonalitySystem, 
  PersonalitySystemConfig,
  PersonalityProfile,
  BehaviorData,
  BehaviorAnalysisResult,
  ExtractedTrait,
  PersonalitySnapshot,
  PersonalityReport
} from '../src/modules/personality-system/PersonalitySystem';
import { TraitType, PersonalityDimension } from '../src/core/interfaces/IPersonalitySystem';

// ============== 示例数据 ==============

/**
 * 模拟用户行为数据
 */
const SAMPLE_BEHAVIORS: BehaviorData[] = [
  {
    timestamp: new Date('2024-01-15T10:00:00'),
    type: 'conversation',
    content: '用户询问关于人工智能的最新发展',
    context: { topic: 'AI', interest: 'high' }
  },
  {
    timestamp: new Date('2024-01-15T10:15:00'),
    type: 'conversation',
    content: '用户对技术实现细节表现出浓厚兴趣',
    context: { topic: 'technology', depth: 'detailed' }
  },
  {
    timestamp: new Date('2024-01-15T11:00:00'),
    type: 'interaction',
    content: '用户偏好简洁明了的回复',
    context: { style: 'concise', feedback: 'positive' }
  },
  {
    timestamp: new Date('2024-01-15T14:00:00'),
    type: 'feedback',
    content: '用户提供正面反馈：解释清晰易懂',
    context: { sentiment: 'positive', aspect: 'clarity' }
  },
  {
    timestamp: new Date('2024-01-15T15:30:00'),
    type: 'task',
    content: '用户完成了一个编程挑战',
    context: { taskType: 'coding', success: true, difficulty: 'medium' }
  },
  {
    timestamp: new Date('2024-01-16T09:00:00'),
    type: 'conversation',
    content: '用户询问学习方法和建议',
    context: { topic: 'learning', seekingAdvice: true }
  },
  {
    timestamp: new Date('2024-01-16T10:30:00'),
    type: 'interaction',
    content: '用户展示了良好的逻辑思维能力',
    context: { skill: 'logical', level: 'high' }
  },
  {
    timestamp: new Date('2024-01-16T14:00:00'),
    type: 'feedback',
    content: '用户建议增加更多实例',
    context: { sentiment: 'constructive', topic: 'examples' }
  },
  {
    timestamp: new Date('2024-01-17T11:00:00'),
    type: 'conversation',
    content: '用户讨论了对未来技术的看法',
    context: { topic: 'future', perspective: 'optimistic' }
  },
  {
    timestamp: new Date('2024-01-17T15:00:00'),
    type: 'task',
    content: '用户尝试了高级难度的任务',
    context: { taskType: 'analysis', difficulty: 'high', success: true }
  }
];

// ============== 示例代码 ==============

/**
 * 示例1: 创建人格档案
 */
async function example1_createProfile() {
  console.log('示例1: 创建人格档案');
  console.log('='.repeat(50));

  const personalitySystem = new PersonalitySystem({
    confidenceThreshold: 0.7,
    maxEvidenceCount: 100,
    updateFrequencyLimit: 3600000,
    enableSnapshot: true,
    snapshotRetentionDays: 90
  });

  const userId = 'user-personality-demo';
  const tenantId = 'tenant-demo';

  // 创建人格档案
  const profile = await personalitySystem.createProfile(userId, tenantId);

  console.log(`创建人格档案:`);
  console.log(`  用户ID: ${profile.userId}`);
  console.log(`  租户ID: ${profile.tenantId}`);
  console.log(`  创建时间: ${profile.createdAt}`);
  console.log(`  置信度: ${(profile.confidence * 100).toFixed(1)}%`);

  console.log('\n五维画像结构:');
  console.log(`  1. personality - 人格特质`);
  console.log(`  2. perspective - 视角偏好`);
  console.log(`  3. worldview - 世界观`);
  console.log(`  4. values - 价值观`);
  console.log(`  5. lifeOutlook - 人生观`);

  console.log('\n✅ 示例1完成\n');
  return { personalitySystem, userId, tenantId };
}

/**
 * 示例2: 收集行为数据
 */
async function example2_collectBehaviors(personalitySystem: PersonalitySystem, userId: string) {
  console.log('示例2: 收集行为数据');
  console.log('='.repeat(50));

  console.log(`添加 ${SAMPLE_BEHAVIORS.length} 条行为数据...\n`);

  for (const behavior of SAMPLE_BEHAVIORS) {
    await personalitySystem.addBehaviorData(userId, behavior);
    console.log(`  [${behavior.timestamp.toLocaleDateString()}] ${behavior.type}: ${behavior.content.substring(0, 40)}...`);
  }

  // 获取行为统计
  const analysis = await personalitySystem.analyzeBehaviors(userId);
  console.log(`\n行为统计:`);
  console.log(`  总行为数: ${analysis.behaviorCount}`);
  console.log(`  行为类型分布:`);
  for (const [type, count] of Object.entries(analysis.typeDistribution)) {
    console.log(`    - ${type}: ${count}`);
  }
  console.log(`  检测到的模式: ${analysis.patterns.join(', ')}`);
  console.log(`  分析置信度: ${(analysis.confidence * 100).toFixed(1)}%`);

  console.log('\n✅ 示例2完成\n');
  return analysis;
}

/**
 * 示例3: 提取人格特质
 */
async function example3_extractTraits(personalitySystem: PersonalitySystem, userId: string) {
  console.log('示例3: 提取人格特质');
  console.log('='.repeat(50));

  const traits = await personalitySystem.extractTraits(userId);

  console.log(`提取到 ${traits.length} 个人格特质:\n`);

  // 按类型分组显示
  const traitsByCategory: Record<string, ExtractedTrait[]> = {};
  for (const trait of traits) {
    const category = trait.type.split('_')[0];
    if (!traitsByCategory[category]) {
      traitsByCategory[category] = [];
    }
    traitsByCategory[category].push(trait);
  }

  for (const [category, categoryTraits] of Object.entries(traitsByCategory)) {
    console.log(`${category.toUpperCase()}:`);
    for (const trait of categoryTraits) {
      const bar = '█'.repeat(Math.round(trait.value * 10)) + '░'.repeat(10 - Math.round(trait.value * 10));
      console.log(`  ${trait.type.padEnd(20)} [${bar}] ${trait.value.toFixed(2)} (置信度: ${(trait.confidence * 100).toFixed(0)}%)`);
    }
    console.log();
  }

  console.log('\n✅ 示例3完成\n');
  return traits;
}

/**
 * 示例4: 更新人格画像
 */
async function example4_updateProfile(personalitySystem: PersonalitySystem, userId: string) {
  console.log('示例4: 更新人格画像');
  console.log('='.repeat(50));

  // 获取当前画像
  const currentProfile = await personalitySystem.getProfile(userId);
  console.log('更新前的人格画像:');
  console.log(`  开放性: ${currentProfile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value}`);
  console.log(`  外向性: ${currentProfile?.dimensions.personality.dimensions[TraitType.EXTRAVERSION_INTROVERSION].value}`);

  // 更新画像
  const updateResult = await personalitySystem.updateProfile(userId, {
    dimensions: {
      [TraitType.OPENNESS_CONSERVATISM]: {
        value: 0.85,
        label: '非常开放',
        confidence: 0.9,
        evidence: ['对新技术充满好奇', '喜欢探索新领域']
      },
      [TraitType.EXTRAVERSION_INTROVERSION]: {
        value: 0.6,
        label: '偏外向',
        confidence: 0.85,
        evidence: ['积极参与讨论', '喜欢社交互动']
      },
      [TraitType.RISK_TOLERANCE]: {
        value: 0.7,
        label: '中等风险偏好',
        confidence: 0.8,
        evidence: ['愿意尝试新任务', '面对挑战保持积极']
      }
    }
  });

  console.log(`\n更新结果: ${updateResult.success ? '成功' : '失败'}`);
  if (updateResult.confidence !== undefined) {
    console.log(`新置信度: ${(updateResult.confidence * 100).toFixed(1)}%`);
  }

  // 获取更新后的画像
  const updatedProfile = await personalitySystem.getProfile(userId);
  console.log('\n更新后的人格画像:');
  console.log(`  开放性: ${updatedProfile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value}`);
  console.log(`  外向性: ${updatedProfile?.dimensions.personality.dimensions[TraitType.EXTRAVERSION_INTROVERSION].value}`);
  console.log(`  风险偏好: ${updatedProfile?.dimensions.personality.dimensions[TraitType.RISK_TOLERANCE].value}`);

  console.log('\n✅ 示例4完成\n');
}

/**
 * 示例5: 生成人格报告
 */
async function example5_generateReport(personalitySystem: PersonalitySystem, userId: string) {
  console.log('示例5: 生成人格报告');
  console.log('='.repeat(50));

  // 生成概要报告
  const summaryReport = await personalitySystem.generateReport(userId, 'summary');
  console.log('\n=== 概要报告 ===');
  console.log(`报告类型: ${summaryReport.type}`);
  console.log(`生成时间: ${summaryReport.generatedAt}`);
  console.log(`\n核心特质:`);
  for (const trait of summaryReport.profile.summary) {
    console.log(`  - ${trait}`);
  }

  // 生成详细报告
  const detailedReport = await personalitySystem.generateReport(userId, 'detailed');
  console.log('\n=== 详细报告 ===');
  console.log(`报告类型: ${detailedReport.type}`);
  console.log(`\n人格维度分析:`);
  
  for (const [dimension, analysis] of Object.entries(detailedReport.analysis)) {
    console.log(`\n${dimension}:`);
    console.log(`  主要特征: ${analysis.summary}`);
    console.log(`  置信度: ${(analysis.confidence * 100).toFixed(1)}%`);
    if (analysis.evidence) {
      console.log(`  关键证据:`);
      for (const evidence of analysis.evidence.slice(0, 3)) {
        console.log(`    - ${evidence}`);
      }
    }
  }

  // 生成对比报告
  const snapshot = await personalitySystem.createSnapshot(userId);
  const comparisonReport = await personalitySystem.generateReport(userId, 'comparison', {
    baselineSnapshotId: snapshot.snapshotId
  });
  
  if (comparisonReport.changes) {
    console.log('\n=== 变化对比 ===');
    for (const change of comparisonReport.changes) {
      const icon = change.direction === 'increase' ? '↑' : '↓';
      console.log(`  ${icon} ${change.dimension}: ${change.from} → ${change.to} (${change.percentage}%)`);
    }
  }

  console.log('\n✅ 示例5完成\n');
  return { summaryReport, detailedReport, snapshot };
}

/**
 * 示例6: 快照管理
 */
async function example6_snapshotManagement(
  personalitySystem: PersonalitySystem, 
  userId: string,
  initialSnapshot: PersonalitySnapshot
) {
  console.log('示例6: 快照管理');
  console.log('='.repeat(50));

  console.log('初始快照:');
  console.log(`  快照ID: ${initialSnapshot.snapshotId}`);
  console.log(`  类型: ${initialSnapshot.type}`);
  console.log(`  时间: ${initialSnapshot.timestamp}`);

  // 创建更多快照
  console.log('\n创建增量快照...');
  const incrementalSnapshot = await personalitySystem.createSnapshot(userId, 'incremental');
  console.log(`  增量快照ID: ${incrementalSnapshot.snapshotId}`);

  console.log('\n创建里程碑快照...');
  const milestoneSnapshot = await personalitySystem.createSnapshot(userId, 'milestone');
  console.log(`  里程碑快照ID: ${milestoneSnapshot.snapshotId}`);

  // 获取快照列表
  const snapshots = await personalitySystem.getSnapshots(userId);
  console.log(`\n当前快照列表 (${snapshots.length} 个):`);
  for (const snap of snapshots) {
    console.log(`  - ${snap.snapshotId} (${snap.type}) - ${snap.timestamp}`);
  }

  // 获取特定快照
  const retrievedSnapshot = await personalitySystem.getSnapshot(initialSnapshot.snapshotId);
  console.log(`\n检索快照 ${initialSnapshot.snapshotId}:`);
  console.log(`  检索成功: ${retrievedSnapshot !== null}`);
  if (retrievedSnapshot) {
    console.log(`  快照类型: ${retrievedSnapshot.type}`);
  }

  // 删除旧快照
  console.log('\n清理过期快照...');
  const cleanupResult = await personalitySystem.cleanupOldSnapshots(userId, 30);
  console.log(`  清理结果: 删除 ${cleanupResult.deletedCount} 个快照`);

  console.log('\n✅ 示例6完成\n');
}

/**
 * 示例7: 一致性验证
 */
async function example7_consistencyValidation(personalitySystem: PersonalitySystem, userId: string) {
  console.log('示例7: 一致性验证');
  console.log('='.repeat(50));

  // 添加可能矛盾的行为
  console.log('添加矛盾行为数据...');
  await personalitySystem.addBehaviorData(userId, {
    timestamp: new Date(),
    type: 'conversation',
    content: '用户突然表示对艺术的强烈兴趣',
    context: { topic: 'art', interest: 'high' }
  });

  // 验证一致性
  console.log('\n执行一致性验证...');
  const validationResult = await personalitySystem.validateConsistency(userId);
  
  console.log(`\n验证结果:`);
  console.log(`  通过: ${validationResult.passed ? '✅' : '❌'}`);
  console.log(`  一致性得分: ${(validationResult.consistencyScore * 100).toFixed(1)}%`);
  
  if (validationResult.issues && validationResult.issues.length > 0) {
    console.log(`  发现问题 (${validationResult.issues.length} 个):`);
    for (const issue of validationResult.issues) {
      console.log(`    - ${issue.severity}: ${issue.description}`);
    }
  } else {
    console.log(`  未发现问题`);
  }

  if (validationResult.recommendations && validationResult.recommendations.length > 0) {
    console.log(`  建议:`);
    for (const rec of validationResult.recommendations) {
      console.log(`    - ${rec}`);
    }
  }

  console.log('\n✅ 示例7完成\n');
}

/**
 * 示例8: 人格进化
 */
async function example8_personalityEvolution(personalitySystem: PersonalitySystem, userId: string) {
  console.log('示例8: 人格进化');
  console.log('='.repeat(50));

  // 获取当前画像
  const beforeProfile = await personalitySystem.getProfile(userId);
  const beforeOpenness = beforeProfile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value;

  console.log(`进化前开放性: ${beforeOpenness}`);

  // 模拟长期学习后的变化
  console.log('\n模拟用户持续学习新知识...');
  for (let i = 0; i < 10; i++) {
    await personalitySystem.addBehaviorData(userId, {
      timestamp: new Date(),
      type: 'task',
      content: `用户完成了第 ${i + 1} 个学习任务`,
      context: { topic: 'new-knowledge', engagement: 'high' }
    });
  }

  // 触发特质提取
  await personalitySystem.extractTraits(userId);

  // 获取进化后的画像
  const afterProfile = await personalitySystem.getProfile(userId);
  const afterOpenness = afterProfile?.dimensions.personality.dimensions[TraitType.OPENNESS_CONSERVATISM].value;

  console.log(`\n进化后开放性: ${afterOpenness}`);
  
  const change = afterOpenness! - beforeOpenness!;
  const changePercent = ((change / beforeOpenness!) * 100).toFixed(1);
  console.log(`变化: ${change >= 0 ? '+' : ''}${change.toFixed(3)} (${changePercent}%)`);

  // 创建进化快照
  const evolutionSnapshot = await personalitySystem.createSnapshot(userId, 'evolution');
  console.log(`\n创建进化快照: ${evolutionSnapshot.snapshotId}`);

  // 获取进化历史
  const snapshots = await personalitySystem.getSnapshots(userId);
  const evolutionSnapshots = snapshots.filter(s => s.type === 'evolution' || s.type === 'milestone');
  
  console.log(`\n进化里程碑 (${evolutionSnapshots.length} 个):`);
  for (const snap of evolutionSnapshots) {
    console.log(`  - ${snap.snapshotId} @ ${snap.timestamp}`);
  }

  console.log('\n✅ 示例8完成\n');
}

// ============== 主函数 ==============

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧠 昆仑框架人格蒸馏示例');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. 创建人格档案
    const { personalitySystem, userId } = await example1_createProfile();

    // 2. 收集行为数据
    await example2_collectBehaviors(personalitySystem, userId);

    // 3. 提取人格特质
    await example3_extractTraits(personalitySystem, userId);

    // 4. 更新人格画像
    await example4_updateProfile(personalitySystem, userId);

    // 5. 生成人格报告
    const { snapshot } = await example5_generateReport(personalitySystem, userId);

    // 6. 快照管理
    await example6_snapshotManagement(personalitySystem, userId, snapshot);

    // 7. 一致性验证
    await example7_consistencyValidation(personalitySystem, userId);

    // 8. 人格进化
    await example8_personalityEvolution(personalitySystem, userId);

    console.log('='.repeat(60));
    console.log('🎉 人格蒸馏示例执行完成!');
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
  example1_createProfile,
  example2_collectBehaviors,
  example3_extractTraits,
  example4_updateProfile,
  example5_generateReport,
  example6_snapshotManagement,
  example7_consistencyValidation,
  example8_personalityEvolution
};
