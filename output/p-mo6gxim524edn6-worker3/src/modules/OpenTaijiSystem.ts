import { MemorySystem } from './memory/MemorySystem';
import { DreamingSystem } from './dreaming/DreamingSystem';
import { WikiSystem } from './wiki/WikiSystem';
import { DeterminismSystem } from './determinism/DeterminismSystem';
import { MemoryEntry, MemoryTier } from './memory/interfaces/IMemorySystem';
import { DreamResult, DreamStatus } from './dreaming/interfaces/IDreamingSystem';
import { WikiEntity, WikiClaim, WikiPageKind } from './wiki/interfaces/IWikiSystem';

/**
 * OpenTaiji 完整系统入口
 * 整合四大核心引擎：
 * - 确定性系统（WFGY 防幻觉）
 * - 记忆系统（短期/长期记忆）
 * - 梦境系统（记忆整合与洞见提取）
 * - 图谱系统（知识图谱 + Wiki）
 *
 * 基于 OpenClaw 架构移植，所有系统深度集成 WFGY 防幻觉验证
 */

export interface OpenTaijiConfig {
  memory?: ConstructorParameters<typeof MemorySystem>[0];
  dreaming?: ConstructorParameters<typeof DreamingSystem>[0];
  wiki?: ConstructorParameters<typeof WikiSystem>[0];
  determinism?: ConstructorParameters<typeof DeterminismSystem>[0];
}

export interface SystemStatus {
  memory: {
    ephemeralCount: number;
    shortTermCount: number;
    longTermCount: number;
    invertedIndexSize: number;
  };
  dreaming: {
    totalDreams: number;
    lastDreamTime?: string;
    averageQuality?: number;
  };
  wiki: {
    totalPages: number;
    totalEntities: number;
    totalClaims: number;
    totalRelations: number;
    avgConfidence: number;
    contradictionCount: number;
  };
  wfgy: {
    verifiedCount: number;
    averageRisk: number;
  };
}

export class OpenTaijiSystem {
  public readonly name: string = 'OpenTaiji';
  public readonly version: string = '1.0.0-beta';

  public readonly memory: MemorySystem;
  public readonly dreaming: DreamingSystem;
  public readonly wiki: WikiSystem;
  public readonly wfgy: DeterminismSystem;

  private stats: {
    wfgyVerifiedCount: number;
    wfgyTotalRisk: number;
  } = {
    wfgyVerifiedCount: 0,
    wfgyTotalRisk: 0
  };

  constructor(config?: OpenTaijiConfig) {
    // 1. 初始化 WFGY 确定性系统（防幻觉）
    this.wfgy = new DeterminismSystem(config?.determinism);

    // 2. 初始化记忆系统
    this.memory = new MemorySystem(config?.memory);
    this.memory.setDeterminismSystem(this.wfgy);

    // 3. 初始化梦境系统
    this.dreaming = new DreamingSystem(config?.dreaming);
    this.dreaming.setDeterminismSystem(this.wfgy);

    // 4. 初始化 Wiki 图谱系统
    this.wiki = new WikiSystem(config?.wiki);
    this.wiki.setDeterminismSystem(this.wfgy);
  }

  /**
   * 添加对话记忆（最常用入口）
   * 自动经过 WFGY 幻觉检测后存入短期记忆
   */
  async addConversationMemory(
    content: string,
    source?: {
      type: string;
      id: string;
    },
    metadata?: {
      role?: 'user' | 'assistant';
      timestamp?: string;
      entities?: string[];
    }
  ): Promise<{
    memoryId: string;
    hallucinationRisk: number;
    verified: boolean;
  }> {
    // WFGY 幻觉检测
    const wfgyResult = await this.wfgy.verify(content);

    this.stats.wfgyVerifiedCount++;
    this.stats.wfgyTotalRisk += wfgyResult.hallucinationRisk ?? 0;

    // 存入短期记忆
    const memoryId = await this.memory.add({
      content,
      tier: MemoryTier.SHORT_TERM,
      source,
      importance: 1 - (wfgyResult.hallucinationRisk ?? 0.5),
      entities: metadata?.entities || [],
      hallucinationRisk: wfgyResult.hallucinationRisk
    });

    // 检查是否应该触发梦境
    const longTermCount = await this.memory.count(MemoryTier.LONG_TERM);
    if (this.dreaming.shouldTrigger(longTermCount)) {
      // 异步触发梦境，不阻塞当前调用
      setImmediate(() => this.triggerDreaming());
    }

    return {
      memoryId,
      hallucinationRisk: wfgyResult.hallucinationRisk ?? 0,
      verified: wfgyResult.verified
    };
  }

  /**
   * 手动触发梦境流程
   * 将长期记忆聚类、合成叙事、提取洞见、修复矛盾、整合到知识图谱
   */
  async triggerDreaming(): Promise<DreamResult> {
    console.log('[OpenTaiji] 开始梦境流程...');

    // 获取所有长期记忆
    const allMemories = await this.getAllMemories(MemoryTier.LONG_TERM);

    if (allMemories.length === 0) {
      throw new Error('没有足够的长期记忆来执行梦境');
    }

    console.log(`[OpenTaiji] 处理 ${allMemories.length} 条长期记忆...`);

    // 执行完整五阶段梦境
    const result = await this.dreaming.dream(allMemories);

    if (result.status === DreamStatus.FAILED) {
      console.error(`[OpenTaiji] 梦境失败: ${result.error}`);
      return result;
    }

    console.log(`[OpenTaiji] 梦境完成: ` +
      `${result.clusters?.length || 0} 个簇, ` +
      `${result.insights?.length || 0} 个洞见, ` +
      `${result.contradictions?.length || 0} 个矛盾, ` +
      `质量分数 ${(result.qualityScore || 0).toFixed(1)}%`);

    // 将洞见整合到 Wiki 图谱
    if (result.integration && result.status === DreamStatus.COMPLETED) {
      await this.integrateDreamResults(result);
    }

    return result;
  }

  /**
   * 将梦境结果整合到 Wiki 图谱
   */
  private async integrateDreamResults(result: DreamResult): Promise<void> {
    console.log('[OpenTaiji] 整合梦境结果到知识图谱...');

    // 1. 创建实体
    if (result.integration?.entities) {
      for (const entity of result.integration.entities) {
        try {
          await this.wiki.addEntity({
            title: entity.name,
            type: entity.type as WikiEntity['type'],
            sourceIds: entity.sourceClusters
          });
          console.log(`[OpenTaiji] 创建实体: ${entity.name}`);
        } catch (error) {
          console.warn(`[OpenTaiji] 创建实体失败: ${entity.name}`, error);
        }
      }
    }

    // 2. 创建声明
    if (result.integration?.claims) {
      for (const claim of result.integration.claims) {
        // 查找相关页面或实体
        const searchResult = await this.wiki.search(claim.text, undefined, 1);
        const targetPage = searchResult.pages[0] || searchResult.entities[0];

        if (targetPage && targetPage.id) {
          try {
            await this.wiki.addClaim(
              targetPage.id,
              {
                text: claim.text,
                status: claim.confidence >= 0.7 ? 'supported' : 'contested',
                confidence: claim.confidence,
                evidence: claim.evidence.map(eid => ({
                  sourceId: eid,
                  confidence: claim.confidence
                }))
              }
            );
          } catch (error) {
            console.warn(`[OpenTaiji] 添加声明失败`, error);
          }
        }
      }
    }

    // 3. 创建关系
    if (result.integration?.relations) {
      // 先搜索实体 ID
      const allEntities = await this.wiki.search('', 'entity', 100);
      const entityMap = new Map(allEntities.entities.map(e => [e.title, e.id]));

      for (const relation of result.integration.relations) {
        const sourceId = entityMap.get(relation.subject);
        const targetId = entityMap.get(relation.object);

        if (sourceId && targetId) {
          try {
            await this.wiki.addRelation(
              sourceId,
              targetId,
              relation.predicate,
              relation.confidence
            );
            console.log(`[OpenTaiji] 创建关系: ${relation.subject} -> ${relation.predicate} -> ${relation.object}`);
          } catch (error) {
            console.warn(`[OpenTaiji] 创建关系失败`, error);
          }
        }
      }
    }

    console.log('[OpenTaiji] 梦境结果整合完成');
  }

  /**
   * 执行记忆晋升
   * 将短期记忆中高质量条目晋升到长期记忆
   */
  async promoteMemory(): Promise<{
    promotedCount: number;
    filteredCount: number;
    avgRiskBefore: number;
    avgRiskAfter: number;
  }> {
    const result = await this.memory.promote();

    // 计算晋升前后的平均幻觉风险
    const shortTerm = await this.getAllMemories(MemoryTier.SHORT_TERM);
    const longTerm = await this.getAllMemories(MemoryTier.LONG_TERM);

    const avgRiskBefore = shortTerm.length > 0
      ? shortTerm.reduce((sum, m) => sum + (m.hallucinationRisk ?? 0), 0) / shortTerm.length
      : 0;

    const avgRiskAfter = longTerm.length > 0
      ? longTerm.reduce((sum, m) => sum + (m.hallucinationRisk ?? 0), 0) / longTerm.length
      : 0;

    return {
      promotedCount: result.promotedCount,
      filteredCount: result.filteredCount,
      avgRiskBefore,
      avgRiskAfter
    };
  }

  /**
   * 搜索知识（跨记忆 + 图谱）
   */
  async searchKnowledge(
    query: string,
    options?: {
      searchMemory?: boolean;
      searchWiki?: boolean;
      tier?: MemoryTier;
      kind?: WikiPageKind;
      limit?: number;
    }
  ): Promise<{
    fromMemory: MemoryEntry[];
    fromWiki: {
      pages: Array<{ title: string; content: string; confidence?: number }>;
      entities: Array<{ title: string; type: string; relations: number }>;
      claims: Array<{ text: string; confidence?: number; evidenceCount: number }>;
    };
    hallucinationRisk: number;
  }> {
    const searchMemory = options?.searchMemory ?? true;
    const searchWiki = options?.searchWiki ?? true;
    const limit = options?.limit ?? 20;

    // WFGY 检测查询本身
    const wfgyResult = await this.wfgy.verify(query);

    const result: Awaited<ReturnType<typeof this.searchKnowledge>> = {
      fromMemory: [],
      fromWiki: { pages: [], entities: [], claims: [] },
      hallucinationRisk: wfgyResult.hallucinationRisk ?? 0
    };

    // 搜索记忆
    if (searchMemory) {
      const memoryResult = await this.memory.search(query, options?.tier, limit);
      result.fromMemory = memoryResult.entries;
    }

    // 搜索 Wiki
    if (searchWiki) {
      const wikiResult = await this.wiki.search(query, options?.kind, limit);
      result.fromWiki.pages = wikiResult.pages.map(p => ({
        title: p.title,
        content: p.claims.map(c => c.text).join('\n'),
        confidence: p.confidence
      }));
      result.fromWiki.entities = wikiResult.entities.map(e => ({
        title: e.title,
        type: e.type,
        relations: e.relations.length
      }));
      result.fromWiki.claims = wikiResult.matchingClaims.map(c => ({
        text: c.claim.text,
        confidence: c.claim.confidence,
        evidenceCount: c.claim.evidence.length
      }));
    }

    return result;
  }

  /**
   * 获取系统状态
   */
  async getStatus(): Promise<SystemStatus> {
    const memoryStats = this.memory.getStats();
    const wikiStats = await this.wiki.getStats();
    const recentDreams = await this.dreaming.getRecentDreams(10);

    const avgDreamQuality = recentDreams.length > 0
      ? recentDreams.reduce((sum, d) => sum + (d.qualityScore ?? 0), 0) / recentDreams.length
      : 0;

    return {
      memory: {
        ephemeralCount: memoryStats.ephemeralCount,
        shortTermCount: memoryStats.shortTermCount,
        longTermCount: memoryStats.longTermCount,
        invertedIndexSize: memoryStats.invertedIndexSize
      },
      dreaming: {
        totalDreams: recentDreams.length,
        lastDreamTime: recentDreams[0]?.endTime,
        averageQuality: avgDreamQuality
      },
      wiki: {
        totalPages: wikiStats.totalPages,
        totalEntities: wikiStats.totalEntities,
        totalClaims: wikiStats.totalClaims,
        totalRelations: wikiStats.totalRelations,
        avgConfidence: wikiStats.avgConfidence,
        contradictionCount: wikiStats.contradictionCount
      },
      wfgy: {
        verifiedCount: this.stats.wfgyVerifiedCount,
        averageRisk: this.stats.wfgyVerifiedCount > 0
          ? this.stats.wfgyTotalRisk / this.stats.wfgyVerifiedCount
          : 0
      }
    };
  }

  /**
   * 获取所有指定层级的记忆
   */
  private async getAllMemories(tier: MemoryTier): Promise<MemoryEntry[]> {
    // 由于 MemorySystem 没有直接的 getAll 方法，这里通过搜索获取
    // 实际生产环境应该添加专门的批量获取方法
    const result = await this.memory.search('', tier, 1000);
    return result.entries;
  }

  /**
   * 导出系统配置和状态报告
   */
  async exportReport(): Promise<string> {
    const status = await this.getStatus();

    const report = `
# OpenTaiji 系统报告 v${this.version}

## 📊 系统总览

| 模块 | 状态 | 指标 |
|------|------|------|
| 记忆系统 | ✅ 运行中 | ${status.memory.shortTermCount} 短期, ${status.memory.longTermCount} 长期 |
| 梦境系统 | ✅ 运行中 | ${status.dreaming.totalDreams} 次执行, 平均质量 ${(status.dreaming.averageQuality || 0).toFixed(1)}% |
| 知识图谱 | ✅ 运行中 | ${status.wiki.totalPages} 页面, ${status.wiki.totalEntities} 实体, ${status.wiki.totalClaims} 声明, ${status.wiki.totalRelations} 关系 |
| WFGY防幻觉 | ✅ 运行中 | ${status.wfgy.verifiedCount} 次验证, 平均风险 ${(status.wfgy.averageRisk * 100).toFixed(1)}% |

## 🧠 记忆系统状态

- **瞬时记忆**: ${status.memory.ephemeralCount} 条
- **短期记忆**: ${status.memory.shortTermCount} 条
- **长期记忆**: ${status.memory.longTermCount} 条
- **倒排索引**: ${status.memory.invertedIndexSize} 关键词

## 🌙 梦境系统状态

- **总执行次数**: ${status.dreaming.totalDreams}
- **最近执行**: ${status.dreaming.lastDreamTime || '从未执行'}
- **平均质量分数**: ${(status.dreaming.averageQuality || 0).toFixed(1)}%

## 🗺️ 知识图谱状态

- **页面数量**: ${status.wiki.totalPages}
- **实体数量**: ${status.wiki.totalEntities}
- **知识声明**: ${status.wiki.totalClaims}
- **实体关系**: ${status.wiki.totalRelations}
- **平均置信度**: ${(status.wiki.avgConfidence * 100).toFixed(1)}%
- **待处理矛盾**: ${status.wiki.contradictionCount}

## 🛡️ WFGY 防幻觉系统

- **总验证次数**: ${status.wfgy.verifiedCount}
- **平均幻觉风险**: ${(status.wfgy.averageRisk * 100).toFixed(1)}%

## 🔗 系统集成

✅ **WFGY ↔ 记忆系统**: 记忆晋升前自动幻觉检测，高风险自动过滤
✅ **WFGY ↔ 梦境系统**: 叙事和洞见自动验证，高风险结果自动中断
✅ **WFGY ↔ 图谱系统**: 实体、声明、关系创建前自动验证，低置信度标记为待确认
✅ **记忆系统 ↔ 梦境系统**: 长期记忆达到阈值自动触发梦境
✅ **梦境系统 ↔ 图谱系统**: 梦境洞见自动整合到知识图谱

---

*生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

    return report;
  }
}
