import {
  MemoryCluster,
  DreamNarrative,
  DreamInsight,
  DreamContradiction,
  PhaseResult,
  DreamPhase
} from '../interfaces/IDreamingSystem';

/**
 * 梦境阶段5：图谱整合
 * 将梦境中提取的知识洞见、实体、关系整合到 Wiki 知识库
 * 基于 OpenClaw 的 Integration Phase 实现
 */
export class Phase5Integration {
  private readonly phase = DreamPhase.INTEGRATION;

  async execute(
    clusters: MemoryCluster[],
    narrative: DreamNarrative,
    insights: DreamInsight[],
    contradictions: DreamContradiction[],
    options?: {
      confidenceThreshold?: number;
      autoWriteClaims?: boolean;
      autoCreateEntities?: boolean;
    }
  ): Promise<PhaseResult> {
    const startTime = Date.now();

    try {
      const confidenceThreshold = options?.confidenceThreshold ?? 0.6;
      const autoWriteClaims = options?.autoWriteClaims ?? true;
      const autoCreateEntities = options?.autoCreateEntities ?? true;

      // 1. 准备要写入的声明
      const newClaims = autoWriteClaims
        ? this.prepareClaims(insights, confidenceThreshold)
        : [];

      // 2. 准备要创建的实体
      const newEntities = autoCreateEntities
        ? this.prepareEntities(narrative, clusters)
        : [];

      // 3. 准备要创建的关系
      const newRelations = this.prepareRelations(narrative, confidenceThreshold);

      // 4. 准备需要更新的记忆条目
      const updatedEntries = this.prepareUpdatedEntries(clusters, insights);

      const integrationResult = {
        newClaimsCount: newClaims.length,
        newEntitiesCount: newEntities.length,
        newRelationsCount: newRelations.length,
        updatedEntries,
        claims: newClaims,
        entities: newEntities,
        relations: newRelations
      };

      return {
        phase: this.phase,
        success: true,
        latency: Date.now() - startTime,
        data: integrationResult
      };
    } catch (error) {
      return {
        phase: this.phase,
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 准备声明（Claim）
   */
  private prepareClaims(
    insights: DreamInsight[],
    confidenceThreshold: number
  ): Array<{
    id: string;
    text: string;
    confidence: number;
    evidence: string[];
    entities: string[];
    source: string;
  }> {
    const claims: Array<{
      id: string;
      text: string;
      confidence: number;
      evidence: string[];
      entities: string[];
      source: string;
    }> = [];

    for (const insight of insights) {
      // 只处理高置信度的洞见
      if (insight.confidence < confidenceThreshold) {
        continue;
      }

      // 根据洞见类型创建声明
      let claimText = '';
      switch (insight.type) {
        case 'pattern':
          claimText = `模式发现：${insight.content}`;
          break;
        case 'connection':
          claimText = `关联发现：${insight.content}`;
          break;
        case 'trend':
          claimText = `趋势发现：${insight.content}`;
          break;
        case 'new_fact':
          claimText = insight.content;
          break;
        default:
          claimText = insight.content;
      }

      claims.push({
        id: `claim_${Date.now()}_${claims.length}`,
        text: claimText,
        confidence: insight.confidence,
        evidence: insight.evidence,
        entities: insight.entities,
        source: insight.sourceClusterId || 'dreaming'
      });
    }

    return claims;
  }

  /**
   * 准备实体（Entity）
   */
  private prepareEntities(
    narrative: DreamNarrative,
    clusters: MemoryCluster[]
  ): Array<{
    id: string;
    name: string;
    type: string;
    aliases: string[];
    sourceClusters: string[];
  }> {
    const entitiesMap = new Map<string, {
      name: string;
      sourceClusters: Set<string>;
      occurrenceCount: number;
    }>();

    // 从叙事中收集实体
    for (const entity of narrative.entities) {
      if (!entitiesMap.has(entity)) {
        entitiesMap.set(entity, {
          name: entity,
          sourceClusters: new Set(),
          occurrenceCount: 0
        });
      }
    }

    // 从簇中收集实体，统计出现频率
    for (const cluster of clusters) {
      for (const entity of cluster.entities) {
        const existing = entitiesMap.get(entity) || {
          name: entity,
          sourceClusters: new Set(),
          occurrenceCount: 0
        };
        existing.sourceClusters.add(cluster.id);
        existing.occurrenceCount += cluster.entries.filter(
          entry => entry.content.toLowerCase().includes(entity.toLowerCase())
        ).length;
        entitiesMap.set(entity, existing);
      }
    }

    // 转换为结果格式
    return Array.from(entitiesMap.entries()).map(([id, data]) => ({
      id: `entity_${Date.now()}_${id}`,
      name: data.name,
      type: this.inferEntityType(data.name),
      aliases: [],
      sourceClusters: Array.from(data.sourceClusters)
    })).filter(e =>
      // 只保留出现过至少一次的实体
      e.sourceClusters.length > 0
    );
  }

  /**
   * 推断实体类型
   */
  private inferEntityType(name: string): string {
    // 简单的基于规则的实体类型推断
    const lowerName = name.toLowerCase();

    // 组织名称特征
    if (/公司|集团|有限|股份|大学|学院|学校|医院|政府|部门|机构/.test(name)) {
      return 'organization';
    }

    // 人名特征（中文）
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(name)) {
      return 'person';
    }

    // 技术术语特征
    if (/算法|模型|系统|框架|架构|方法|技术|协议|标准/.test(name) ||
        /[A-Z][a-z]+(?:[A-Z][a-z]+)*|API|SDK|CLI|HTTP|JSON|XML/.test(name)) {
      return 'technology';
    }

    // 地点特征
    if (/省|市|区|县|镇|村|街|路|大道|公园|广场|大厦|中心/.test(name)) {
      return 'location';
    }

    return 'concept';
  }

  /**
   * 准备关系（Relation）
   */
  private prepareRelations(
    narrative: DreamNarrative,
    confidenceThreshold: number
  ): Array<{
    id: string;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    source: string;
  }> {
    return narrative.relations
      .filter(rel => rel.confidence >= confidenceThreshold)
      .map((rel, idx) => ({
        id: `relation_${Date.now()}_${idx}`,
        subject: rel.subject,
        predicate: rel.predicate,
        object: rel.object,
        confidence: rel.confidence,
        source: 'dreaming_narrative'
      }));
  }

  /**
   * 准备需要更新的记忆条目
   */
  private prepareUpdatedEntries(
    clusters: MemoryCluster[],
    insights: DreamInsight[]
  ): string[] {
    const updatedEntries = new Set<string>();

    // 标记所有包含洞见的记忆为已处理
    for (const insight of insights) {
      for (const evidenceId of insight.evidence) {
        updatedEntries.add(evidenceId);
      }
    }

    // 标记所有簇中的记忆为已整合
    for (const cluster of clusters) {
      for (const entry of cluster.entries) {
        updatedEntries.add(entry.id);
      }
    }

    return Array.from(updatedEntries);
  }
}
