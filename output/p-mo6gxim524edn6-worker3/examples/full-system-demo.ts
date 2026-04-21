#!/usr/bin/env ts-node

/**
 * OpenTaiji 完整系统演示
 *
 * 演示四大系统的协作：
 * 1. WFGY 防幻觉系统 - 内容验证
 * 2. 记忆系统 - 三层记忆存储
 * 3. 梦境系统 - 记忆合成与洞见提取
 * 4. 图谱系统 - 知识图谱构建
 *
 * 所有系统通过 WFGY 深度集成，确保知识质量
 */

import { OpenTaijiSystem } from '../src/modules/OpenTaijiSystem';

async function main() {
  console.log('='.repeat(70));
  console.log('  OpenTaiji 完整系统演示');
  console.log('  太极生两仪 · 确定性与随机性的阴阳平衡');
  console.log('='.repeat(70));
  console.log();

  // ===== 1. 初始化系统 =====
  console.log('📦 初始化 OpenTaiji 系统...');

  const taiji = new OpenTaijiSystem({
    memory: {
      shortTermMaxSize: 1000,
      promotionThreshold: 0.6,
      dreamThresholdCount: 5, // 演示用，降低阈值
      wfgyIntegration: {
        enabled: true,
        verifyBeforePromotion: true,
        autoFilterHighRisk: true,
        riskThreshold: 0.8
      }
    },
    dreaming: {
      minIntervalMs: 0, // 演示用，取消时间间隔限制
      wfgyIntegration: {
        enabled: true,
        verifyNarrative: true,
        verifyInsights: true,
        autoFilterHighRisk: true,
        riskThreshold: 0.7
      }
    },
    wiki: {
      claimConfidenceThreshold: 0.5,
      relationConfidenceThreshold: 0.5
    }
  });

  console.log('✅ 系统初始化完成');
  console.log();

  // ===== 2. 添加对话记忆 =====
  console.log('📝 添加对话记忆（自动经过 WFGY 幻觉检测）...');
  console.log();

  const conversations = [
    {
      content: 'OpenTaiji 是一个生产级多智能体操作系统，采用 Actor 模型架构',
      entities: ['OpenTaiji', 'Actor 模型']
    },
    {
      content: 'WFGY 防幻觉系统包含五个验证层次：符号层验证、自一致性检查、溯源索引、幻觉检测、确定性系统集成',
      entities: ['WFGY', '防幻觉系统']
    },
    {
      content: '记忆系统采用三层架构：瞬时记忆、短期记忆、长期记忆，每一层都有不同的保留策略和访问模式',
      entities: ['记忆系统', '瞬时记忆', '短期记忆', '长期记忆']
    },
    {
      content: '梦境系统包括五个阶段：记忆聚类、叙事合成、洞见提取、矛盾修复、图谱整合，它是将离散记忆转化为结构化知识的核心机制',
      entities: ['梦境系统', '记忆聚类', '叙事合成', '洞见提取', '矛盾修复', '图谱整合']
    },
    {
      content: '知识图谱系统采用 Wiki 架构，支持实体、关系、声明的存储，并提供完整的健康度评估和矛盾检测机制',
      entities: ['知识图谱', 'Wiki 系统', '实体关系图']
    },
    {
      content: 'WFGY 与记忆系统深度集成，在记忆晋升前自动进行幻觉风险检测，高风险记忆会被自动过滤',
      entities: ['WFGY', '记忆系统', '记忆晋升']
    },
    {
      content: 'WFGY 与梦境系统深度集成，对合成的叙事和提取的洞见进行质量验证，高风险结果会被自动中断',
      entities: ['WFGY', '梦境系统']
    },
    {
      content: 'WFGY 与图谱系统深度集成，在创建实体、声明、关系前都要经过置信度验证，低置信度的内容会被标记为待确认',
      entities: ['WFGY', '知识图谱', '置信度']
    }
  ];

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    const result = await taiji.addConversationMemory(
      conv.content,
      { type: 'conversation', id: `conv_${i}` },
      { role: 'assistant', entities: conv.entities }
    );

    const status = result.verified ? '✅' : '⚠️';
    const risk = (result.hallucinationRisk * 100).toFixed(1);
    console.log(`  ${status} 记忆 ${i + 1}: 幻觉风险 ${risk}% - ${conv.content.slice(0, 50)}...`);
  }

  console.log();

  // ===== 3. 执行记忆晋升 =====
  console.log('⬆️  执行记忆晋升...');
  const promotionResult = await taiji.promoteMemory();
  console.log(`  ✅ 晋升 ${promotionResult.promotedCount} 条记忆`);
  console.log(`  ⚠️  过滤 ${promotionResult.filteredCount} 条低质量记忆`);
  console.log(`  📊 晋升前平均风险: ${(promotionResult.avgRiskBefore * 100).toFixed(1)}%`);
  console.log(`  📊 晋升后平均风险: ${(promotionResult.avgRiskAfter * 100).toFixed(1)}%`);
  console.log();

  // ===== 4. 触发梦境流程 =====
  console.log('🌙 触发梦境流程（五阶段记忆合成）...');
  console.log();
  const dreamResult = await taiji.triggerDreaming();

  console.log('  📊 梦境结果:');
  console.log(`    状态: ${dreamResult.status === 'completed' ? '✅ 完成' : '❌ 失败'}`);
  console.log(`    处理记忆数: ${dreamResult.memoryCount}`);
  console.log(`    记忆簇: ${dreamResult.clusters?.length || 0} 个`);
  console.log(`    提取洞见: ${dreamResult.insights?.length || 0} 条`);
  console.log(`    发现矛盾: ${dreamResult.contradictions?.length || 0} 个`);
  console.log(`    质量分数: ${(dreamResult.qualityScore || 0).toFixed(1)}%`);
  console.log(`    执行时间: ${dreamResult.totalLatency?.toFixed(0) || 0}ms`);

  if (dreamResult.wfgyVerification) {
    console.log();
    console.log('  🛡️  WFGY 梦境验证:');
    console.log(`    验证状态: ${dreamResult.wfgyVerification.verified ? '✅ 通过' : '⚠️  警告'}`);
    console.log(`    幻觉风险: ${(dreamResult.wfgyVerification.hallucinationRisk * 100).toFixed(1)}%`);
    console.log(`    证据来源: ${dreamResult.wfgyVerification.sources.length} 个`);
  }

  console.log();

  // 展示提取的洞见
  if (dreamResult.insights && dreamResult.insights.length > 0) {
    console.log('  💡 提取的洞见:');
    for (let i = 0; i < Math.min(5, dreamResult.insights.length); i++) {
      const insight = dreamResult.insights[i];
      const confidence = (insight.confidence * 100).toFixed(1);
      const typeIcon = insight.type === 'pattern' ? '🔍' :
                       insight.type === 'connection' ? '🔗' :
                       insight.type === 'trend' ? '📈' :
                       insight.type === 'new_fact' ? '📌' : '❓';
      console.log(`    ${typeIcon} [置信度 ${confidence}%] ${insight.content.slice(0, 80)}...`);
    }
  }

  console.log();

  // ===== 5. 知识图谱统计 =====
  console.log('🗺️  知识图谱状态:');
  const wikiStats = await taiji.wiki.getStats();
  console.log(`    页面数量: ${wikiStats.totalPages}`);
  console.log(`    实体数量: ${wikiStats.totalEntities}`);
  console.log(`    知识声明: ${wikiStats.totalClaims}`);
  console.log(`    实体关系: ${wikiStats.totalRelations}`);
  console.log(`    平均置信度: ${(wikiStats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`    待处理矛盾: ${wikiStats.contradictionCount}`);

  if (wikiStats.topEntities.length > 0) {
    console.log();
    console.log('  🏆 顶级实体（按关系数量）:');
    for (const entity of wikiStats.topEntities.slice(0, 5)) {
      console.log(`    • ${entity.title} (${entity.relationCount} 个关系)`);
    }
  }

  console.log();

  // ===== 6. 知识搜索演示 =====
  console.log('🔍 知识搜索演示（查询 "WFGY"）:');
  const searchResult = await taiji.searchKnowledge('WFGY', {
    searchMemory: true,
    searchWiki: true
  });

  console.log(`  查询幻觉风险: ${(searchResult.hallucinationRisk * 100).toFixed(1)}%`);
  console.log();

  if (searchResult.fromMemory.length > 0) {
    console.log('  🧠 从记忆系统找到:');
    for (let i = 0; i < Math.min(3, searchResult.fromMemory.length); i++) {
      const mem = searchResult.fromMemory[i];
      console.log(`    • ${mem.content.slice(0, 60)}...`);
    }
  }

  if (searchResult.fromWiki.entities.length > 0) {
    console.log();
    console.log('  🗺️  从知识图谱找到实体:');
    for (const entity of searchResult.fromWiki.entities) {
      console.log(`    • ${entity.title} (${entity.type}, ${entity.relations} 个关系)`);
    }
  }

  if (searchResult.fromWiki.claims.length > 0) {
    console.log();
    console.log('  📝 从知识图谱找到声明:');
    for (const claim of searchResult.fromWiki.claims.slice(0, 3)) {
      const confidence = ((claim.confidence || 0) * 100).toFixed(1);
      console.log(`    • [置信度 ${confidence}%] ${claim.text.slice(0, 60)}...`);
    }
  }

  console.log();

  // ===== 7. 系统总览 =====
  console.log('📊 系统总览:');
  const status = await taiji.getStatus();
  console.log();
  console.log('  🧠 记忆系统:');
  console.log(`    短期记忆: ${status.memory.shortTermCount} 条`);
  console.log(`    长期记忆: ${status.memory.longTermCount} 条`);
  console.log(`    倒排索引: ${status.memory.invertedIndexSize} 关键词`);
  console.log();
  console.log('  🌙 梦境系统:');
  console.log(`    总执行次数: ${status.dreaming.totalDreams}`);
  console.log(`    平均质量分数: ${(status.dreaming.averageQuality || 0).toFixed(1)}%`);
  console.log();
  console.log('  🗺️  知识图谱:');
  console.log(`    实体数量: ${status.wiki.totalEntities}`);
  console.log(`    知识声明: ${status.wiki.totalClaims}`);
  console.log(`    实体关系: ${status.wiki.totalRelations}`);
  console.log(`    平均置信度: ${(status.wiki.avgConfidence * 100).toFixed(1)}%`);
  console.log();
  console.log('  🛡️  WFGY 防幻觉:');
  console.log(`    总验证次数: ${status.wfgy.verifiedCount}`);
  console.log(`    平均幻觉风险: ${(status.wfgy.averageRisk * 100).toFixed(1)}%`);
  console.log();

  // 导出系统报告
  console.log('📄 导出系统报告...');
  const report = await taiji.exportReport();
  console.log(report.slice(0, 500) + '...');
  console.log();

  console.log('='.repeat(70));
  console.log('  ✅ 演示完成');
  console.log();
  console.log('  系统集成总结:');
  console.log('  ┌─────────────────────────────────────────────────────┐');
  console.log('  │ 🧠 记忆系统 ←→ 🛡️ WFGY │ 晋升前自动幻觉检测     │');
  console.log('  │ 🌙 梦境系统 ←→ 🛡️ WFGY │ 叙事/洞见质量验证      │');
  console.log('  │ 🗺️  图谱系统 ←→ 🛡️ WFGY │ 实体/声明/关系置信度保证│');
  console.log('  │ 🧠 记忆系统 ←→ 🌙 梦境系统 │ 阈值触发自动合成      │');
  console.log('  │ 🌙 梦境系统 ←→ 🗺️  图谱系统 │ 洞见自动整合入库      │');
  console.log('  └─────────────────────────────────────────────────────┘');
  console.log();
  console.log('  基于 OpenClaw (Claude Code) 记忆/梦境/图谱架构');
  console.log('  移植到 OpenTaiji 并与 WFGY 防幻觉系统深度集成');
  console.log('='.repeat(70));
}

main().catch(console.error);
