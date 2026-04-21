import { MemoryCluster, DreamNarrative, PhaseResult, DreamPhase } from '../interfaces/IDreamingSystem';

/**
 * 梦境阶段2：叙事合成
 * 将离散的记忆簇整合成连贯的叙事，提取实体和关系
 * 基于 OpenClaw 的 Narrative Synthesis 实现
 */
export class Phase2Narrative {
  private readonly phase = DreamPhase.NARRATIVE;

  async execute(clusters: MemoryCluster[]): Promise<PhaseResult> {
    const startTime = Date.now();

    try {
      const narrative = this.buildNarrative(clusters);

      return {
        phase: this.phase,
        success: true,
        latency: Date.now() - startTime,
        data: { narrative }
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
   * 构建叙事
   */
  private buildNarrative(clusters: MemoryCluster[]): DreamNarrative {
    if (clusters.length === 0) {
      return {
        id: `narrative_${Date.now()}`,
        title: '空叙事',
        content: '没有足够的记忆来构建叙事',
        summary: '',
        clusterIds: [],
        entities: [],
        relations: [],
        timeline: []
      };
    }

    // 1. 提取所有实体
    const allEntities = this.extractAllEntities(clusters);

    // 2. 提取关系
    const relations = this.extractRelations(clusters);

    // 3. 构建时间线
    const timeline = this.buildTimeline(clusters);

    // 4. 生成叙事标题
    const title = this.generateTitle(clusters);

    // 5. 生成叙事内容
    const content = this.generateNarrativeContent(clusters, relations, timeline);

    // 6. 生成摘要
    const summary = this.generateSummary(content);

    return {
      id: `narrative_${Date.now()}`,
      title,
      content,
      summary,
      clusterIds: clusters.map(c => c.id),
      entities: allEntities,
      relations,
      timeline
    };
  }

  /**
   * 提取所有实体
   */
  private extractAllEntities(clusters: MemoryCluster[]): string[] {
    const entitySet = new Set<string>();

    for (const cluster of clusters) {
      for (const entity of cluster.entities) {
        entitySet.add(entity);
      }
    }

    return Array.from(entitySet);
  }

  /**
   * 提取关系
   */
  private extractRelations(clusters: MemoryCluster[]): DreamNarrative['relations'] {
    const relations: DreamNarrative['relations'] = [];

    // 基于共现提取关系
    for (const cluster of clusters) {
      const entities = cluster.entities;
      if (entities.length < 2) {
        continue;
      }

      // 为每对实体创建共现关系
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          // 计算共现置信度
          const confidence = this.calculateRelationConfidence(entities[i], entities[j], cluster);

          if (confidence > 0.3) {
            relations.push({
              subject: entities[i],
              predicate: '关联于',
              object: entities[j],
              confidence
            });
          }
        }
      }
    }

    // 去重
    const uniqueRelations: DreamNarrative['relations'] = [];
    const seen = new Set<string>();

    for (const rel of relations) {
      const key = `${rel.subject}:${rel.predicate}:${rel.object}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRelations.push(rel);
      }
    }

    return uniqueRelations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 计算关系置信度
   */
  private calculateRelationConfidence(
    subject: string,
    object: string,
    cluster: MemoryCluster
  ): number {
    let coOccurrenceCount = 0;

    for (const entry of cluster.entries) {
      const content = entry.content.toLowerCase();
      if (content.includes(subject.toLowerCase()) && content.includes(object.toLowerCase())) {
        coOccurrenceCount++;
      }
    }

    return Math.min(1, coOccurrenceCount / cluster.entries.length);
  }

  /**
   * 构建时间线
   */
  private buildTimeline(clusters: MemoryCluster[]): DreamNarrative['timeline'] {
    const events: Array<{ timestamp?: string; event: string; sortKey: number }> = [];

    for (const cluster of clusters) {
      for (const entry of cluster.entries) {
        const timestamp = entry.createdAt;
        // 从内容中提取关键事件描述（前50字符）
        const eventDesc = entry.content.slice(0, 100).replace(/\n/g, ' ').trim();

        events.push({
          timestamp,
          event: eventDesc,
          sortKey: timestamp ? new Date(timestamp).getTime() : Date.now()
        });
      }
    }

    // 按时间排序
    events.sort((a, b) => a.sortKey - b.sortKey);

    // 去重，只保留唯一的事件
    const uniqueEvents: DreamNarrative['timeline'] = [];
    const seenEvents = new Set<string>();

    for (const event of events) {
      if (!seenEvents.has(event.event)) {
        seenEvents.add(event.event);
        uniqueEvents.push({
          timestamp: event.timestamp,
          event: event.event
        });
      }
    }

    return uniqueEvents.slice(0, 20); // 最多保留20个时间点
  }

  /**
   * 生成叙事标题
   */
  private generateTitle(clusters: MemoryCluster[]): string {
    const topThemes: string[] = [];

    for (const cluster of clusters.slice(0, 3)) {
      if (cluster.theme.length > 0) {
        topThemes.push(cluster.theme[0]);
      }
    }

    if (topThemes.length === 0) {
      return '知识整合叙事';
    }

    if (topThemes.length === 1) {
      return `关于 ${topThemes[0]} 的叙事`;
    }

    return `${topThemes.slice(0, -1).join('、')} 与 ${topThemes[topThemes.length - 1]} 的关联叙事`;
  }

  /**
   * 生成叙事内容
   */
  private generateNarrativeContent(
    clusters: MemoryCluster[],
    relations: DreamNarrative['relations'],
    timeline: DreamNarrative['timeline']
  ): string {
    const parts: string[] = [];

    // 引言
    parts.push('## 梦境叙事报告');
    parts.push('');
    parts.push(`本次梦境整合了 ${clusters.length} 个主题簇的记忆，`);
    parts.push(`提取了 ${relations.length} 个实体关系，`);
    parts.push(`构建了包含 ${timeline.length} 个时间点的事件线。`);
    parts.push('');

    // 每个主题簇的内容
    for (let i = 0; i < Math.min(clusters.length, 5); i++) {
      const cluster = clusters[i];
      parts.push(`### 主题 ${i + 1}: ${cluster.theme.slice(0, 3).join(', ')}`);
      parts.push('');
      parts.push(`**凝聚度**: ${(cluster.cohesion * 100).toFixed(1)}%`);
      parts.push(`**记忆数量**: ${cluster.entries.length} 条`);
      parts.push(`**核心实体**: ${cluster.entities.slice(0, 5).join(', ')}`);
      parts.push('');

      // 代表性记忆
      parts.push('**代表性记忆**:');
      for (const entry of cluster.entries.slice(0, 3)) {
        const shortContent = entry.content.slice(0, 150).replace(/\n/g, ' ').trim();
        parts.push(`- ${shortContent}...`);
      }
      parts.push('');
    }

    // 实体关系
    if (relations.length > 0) {
      parts.push('### 发现的实体关系');
      parts.push('');
      for (const rel of relations.slice(0, 10)) {
        parts.push(`- **${rel.subject}** ${rel.predicate} **${rel.object}** (置信度: ${(rel.confidence * 100).toFixed(0)}%)`);
      }
      parts.push('');
    }

    // 时间线
    if (timeline.length > 0) {
      parts.push('### 事件时间线');
      parts.push('');
      for (const event of timeline.slice(0, 10)) {
        const timeStr = event.timestamp
          ? new Date(event.timestamp).toLocaleString('zh-CN')
          : '未知时间';
        parts.push(`- **${timeStr}**: ${event.event}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * 生成摘要
   */
  private generateSummary(content: string): string {
    // 简单摘要：取前 200 字符
    const cleanContent = content.replace(/[#*`]/g, '').replace(/\n+/g, ' ').trim();
    return cleanContent.slice(0, 200) + (cleanContent.length > 200 ? '...' : '');
  }
}
