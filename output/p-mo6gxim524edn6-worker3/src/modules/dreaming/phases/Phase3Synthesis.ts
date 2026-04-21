import { MemoryCluster, DreamNarrative, DreamInsight, PhaseResult, DreamPhase } from '../interfaces/IDreamingSystem';

/**
 * 梦境阶段3：洞见提取
 * 从叙事和记忆簇中提取有价值的知识洞见
 * 基于 OpenClaw 的 Synthesis 阶段实现
 */
export class Phase3Synthesis {
  private readonly phase = DreamPhase.SYNTHESIS;

  async execute(
    clusters: MemoryCluster[],
    narrative: DreamNarrative
  ): Promise<PhaseResult> {
    const startTime = Date.now();

    try {
      const insights = this.extractInsights(clusters, narrative);

      return {
        phase: this.phase,
        success: true,
        latency: Date.now() - startTime,
        data: { insights }
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
   * 提取知识洞见
   */
  private extractInsights(
    clusters: MemoryCluster[],
    narrative: DreamNarrative
  ): DreamInsight[] {
    const insights: DreamInsight[] = [];

    // 1. 模式发现洞见
    const patternInsights = this.extractPatternInsights(clusters);
    insights.push(...patternInsights);

    // 2. 关联发现洞见
    const connectionInsights = this.extractConnectionInsights(clusters, narrative);
    insights.push(...connectionInsights);

    // 3. 趋势发现洞见
    const trendInsights = this.extractTrendInsights(clusters, narrative);
    insights.push(...trendInsights);

    // 4. 新事实洞见
    const factInsights = this.extractNewFactInsights(clusters, narrative);
    insights.push(...factInsights);

    // 按重要性和置信度排序
    return insights.sort((a, b) => {
      const scoreA = a.confidence * a.importance;
      const scoreB = b.confidence * b.importance;
      return scoreB - scoreA;
    });
  }

  /**
   * 提取模式洞见
   */
  private extractPatternInsights(clusters: MemoryCluster[]): DreamInsight[] {
    const insights: DreamInsight[] = [];

    for (const cluster of clusters) {
      if (cluster.entries.length < 3) {
        continue;
      }

      // 检查高频重复模式
      const phraseFreq = new Map<string, number>();
      for (const entry of cluster.entries) {
        const phrases = this.extractPhrases(entry.content);
        for (const phrase of phrases) {
          phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
        }
      }

      // 找出出现频率 > 50% 的模式
      const threshold = cluster.entries.length * 0.5;
      for (const [phrase, freq] of phraseFreq.entries()) {
        if (freq >= threshold && phrase.length >= 4) {
          const confidence = freq / cluster.entries.length;
          insights.push({
            id: `insight_pattern_${Date.now()}_${insights.length}`,
            type: 'pattern',
            content: `发现重复模式: "${phrase}" 出现在 ${freq}/${cluster.entries.length} 条记忆中`,
            confidence,
            evidence: cluster.entries.map(e => e.id),
            entities: cluster.entities,
            importance: confidence * 0.8,
            sourceClusterId: cluster.id
          });
        }
      }
    }

    return insights;
  }

  /**
   * 提取关联洞见
   */
  private extractConnectionInsights(
    clusters: MemoryCluster[],
    narrative: DreamNarrative
  ): DreamInsight[] {
    const insights: DreamInsight[] = [];

    // 基于叙事中的关系提取关联洞见
    for (const relation of narrative.relations) {
      if (relation.confidence > 0.5) {
        insights.push({
          id: `insight_connection_${Date.now()}_${insights.length}`,
          type: 'connection',
          content: `发现实体关联: "${relation.subject}" 与 "${relation.object}" 之间存在 "${relation.predicate}" 关系`,
          confidence: relation.confidence,
          evidence: narrative.clusterIds,
          entities: [relation.subject, relation.object],
          importance: relation.confidence * 0.7
        });
      }
    }

    // 发现跨簇关联
    if (clusters.length >= 2) {
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const commonEntities = clusters[i].entities.filter(e =>
            clusters[j].entities.includes(e)
          );

          if (commonEntities.length >= 2) {
            insights.push({
              id: `insight_connection_${Date.now()}_${insights.length}`,
              type: 'connection',
              content: `主题簇 "${clusters[i].name}" 与 "${clusters[j].name}" 通过实体 ${commonEntities.join('、')} 强关联`,
              confidence: Math.min(clusters[i].cohesion, clusters[j].cohesion),
              evidence: [clusters[i].id, clusters[j].id],
              entities: commonEntities,
              importance: 0.6
            });
          }
        }
      }
    }

    return insights;
  }

  /**
   * 提取趋势洞见
   */
  private extractTrendInsights(
    clusters: MemoryCluster[],
    narrative: DreamNarrative
  ): DreamInsight[] {
    const insights: DreamInsight[] = [];

    if (narrative.timeline.length < 5) {
      return insights;
    }

    // 分析时间线上的主题演变
    const timeSlots = 5;
    const slotSize = Math.ceil(narrative.timeline.length / timeSlots);
    const themeEvolution: Array<{ slot: number; themes: string[] }> = [];

    for (let slot = 0; slot < timeSlots; slot++) {
      const slotEvents = narrative.timeline.slice(
        slot * slotSize,
        (slot + 1) * slotSize
      );

      const slotThemes = new Set<string>();
      for (const event of slotEvents) {
        const words = this.extractPhrases(event.event);
        for (const word of words) {
          if (word.length >= 2) {
            slotThemes.add(word);
          }
        }
      }

      themeEvolution.push({
        slot,
        themes: Array.from(slotThemes).slice(0, 10)
      });
    }

    // 识别增长趋势（出现频率增加的主题）
    const themeCounts = new Map<string, number[]>();
    for (const evolution of themeEvolution) {
      for (const theme of evolution.themes) {
        const counts = themeCounts.get(theme) || new Array(timeSlots).fill(0);
        counts[evolution.slot]++;
        themeCounts.set(theme, counts);
      }
    }

    // 计算趋势斜率
    for (const [theme, counts] of themeCounts.entries()) {
      const slope = this.calculateTrendSlope(counts);

      if (Math.abs(slope) > 0.3) {
        const isRising = slope > 0;
        insights.push({
          id: `insight_trend_${Date.now()}_${insights.length}`,
          type: 'trend',
          content: isRising
            ? `发现上升趋势: "${theme}" 的提及频率在增加`
            : `发现下降趋势: "${theme}" 的提及频率在减少`,
          confidence: Math.abs(slope),
          evidence: narrative.clusterIds,
          entities: [theme],
          importance: Math.abs(slope) * 0.6
        });
      }
    }

    return insights;
  }

  /**
   * 提取新事实洞见
   */
  private extractNewFactInsights(
    clusters: MemoryCluster[],
    narrative: DreamNarrative
  ): DreamInsight[] {
    const insights: DreamInsight[] = [];

    // 从高置信度关系中提取新事实
    for (const relation of narrative.relations) {
      if (relation.confidence > 0.7) {
        insights.push({
          id: `insight_fact_${Date.now()}_${insights.length}`,
          type: 'new_fact',
          content: `${relation.subject} ${relation.predicate} ${relation.object}`,
          confidence: relation.confidence,
          evidence: narrative.clusterIds,
          entities: [relation.subject, relation.object],
          importance: relation.confidence * 0.9
        });
      }
    }

    return insights;
  }

  /**
   * 提取短语（简单 N-gram）
   */
  private extractPhrases(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 1);

    const phrases: string[] = [];

    // Unigrams
    phrases.push(...words);

    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }

    return phrases;
  }

  /**
   * 计算趋势斜率
   */
  private calculateTrendSlope(counts: number[]): number {
    const n = counts.length;
    if (n === 0) {
      return 0;
    }

    const xMean = (n - 1) / 2;
    const yMean = counts.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (counts[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
