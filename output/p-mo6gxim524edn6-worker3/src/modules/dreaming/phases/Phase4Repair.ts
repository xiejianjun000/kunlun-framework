import {
  MemoryCluster,
  DreamNarrative,
  DreamInsight,
  DreamContradiction,
  RepairSuggestion,
  PhaseResult,
  DreamPhase
} from '../interfaces/IDreamingSystem';
import { MemoryEntry } from '../../memory/interfaces/IMemorySystem';
import { calculateSemanticSimilarity } from '../../memory/embeddings';

/**
 * 梦境阶段4：矛盾检测与修复
 * 检测记忆中的不一致、冲突和矛盾，生成修复建议
 * 基于 OpenClaw 的 Repair Phase 实现
 */
export class Phase4Repair {
  private readonly phase = DreamPhase.REPAIR;

  async execute(
    clusters: MemoryCluster[],
    narrative: DreamNarrative,
    insights: DreamInsight[]
  ): Promise<PhaseResult> {
    const startTime = Date.now();

    try {
      // 1. 检测矛盾
      const contradictions = this.detectContradictions(clusters, narrative);

      // 2. 生成修复建议
      const repairs = this.generateRepairSuggestions(contradictions, insights);

      return {
        phase: this.phase,
        success: true,
        latency: Date.now() - startTime,
        data: { contradictions, repairs }
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
   * 检测矛盾
   */
  private detectContradictions(
    clusters: MemoryCluster[],
    narrative: DreamNarrative
  ): DreamContradiction[] {
    const contradictions: DreamContradiction[] = [];

    // 1. 检测事实冲突
    const factContradictions = this.detectFactContradictions(clusters);
    contradictions.push(...factContradictions);

    // 2. 检测时间线冲突
    const timelineContradictions = this.detectTimelineContradictions(narrative);
    contradictions.push(...timelineContradictions);

    // 3. 检测关系冲突
    const relationContradictions = this.detectRelationContradictions(narrative);
    contradictions.push(...relationContradictions);

    // 4. 检测逻辑矛盾
    const logicContradictions = this.detectLogicContradictions(clusters);
    contradictions.push(...logicContradictions);

    // 按严重程度排序
    return contradictions.sort((a, b) => b.severity - a.severity);
  }

  /**
   * 检测事实冲突
   */
  private detectFactContradictions(clusters: MemoryCluster[]): DreamContradiction[] {
    const contradictions: DreamContradiction[] = [];

    for (const cluster of clusters) {
      if (cluster.entries.length < 2) {
        continue;
      }

      // 找出内容相似但结论相反的记忆对
      for (let i = 0; i < cluster.entries.length; i++) {
        for (let j = i + 1; j < cluster.entries.length; j++) {
          const entryA = cluster.entries[i];
          const entryB = cluster.entries[j];

          // 计算内容相似度
          const similarity = calculateSemanticSimilarity(entryA.content, entryB.content);

          // 如果内容高度相似 (>0.7) 但可能有事实冲突
          if (similarity > 0.7 && this.hasOpposingPolarity(entryA.content, entryB.content)) {
            contradictions.push({
              id: `contradiction_fact_${Date.now()}_${contradictions.length}`,
              type: 'factual_conflict',
              description: `发现潜在事实冲突: 两条记忆内容相似但可能存在不一致`,
              conflictingEntries: [
                {
                  memoryId: entryA.id,
                  content: entryA.content.slice(0, 200)
                },
                {
                  memoryId: entryB.id,
                  content: entryB.content.slice(0, 200)
                }
              ],
              proposedResolution: '建议交叉验证两条记忆的来源，确认事实一致性',
              severity: similarity * 0.8
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * 检测时间线冲突
   */
  private detectTimelineContradictions(narrative: DreamNarrative): DreamContradiction[] {
    const contradictions: DreamContradiction[] = [];

    if (narrative.timeline.length < 2) {
      return contradictions;
    }

    // 检查时间线中是否存在事件顺序矛盾
    for (let i = 0; i < narrative.timeline.length - 1; i++) {
      const eventA = narrative.timeline[i];
      const eventB = narrative.timeline[i + 1];

      if (eventA.timestamp && eventB.timestamp) {
        const timeA = new Date(eventA.timestamp).getTime();
        const timeB = new Date(eventB.timestamp).getTime();

        // 虽然我们排序了，但检查内容上的因果关系是否合理
        // 简单检测：后面的事件是否引用了前面的事件
        if (this.referencesEvent(eventB.event, eventA.event)) {
          // 正常的因果关系，不矛盾
        } else if (this.referencesEvent(eventA.event, eventB.event)) {
          // 时间顺序和引用顺序相反，可能存在矛盾
          contradictions.push({
            id: `contradiction_timeline_${Date.now()}_${contradictions.length}`,
            type: 'timeline_conflict',
            description: '发现潜在时间线冲突: 事件的引用顺序与时间顺序不一致',
            conflictingEntries: [
              {
                content: `${eventA.timestamp}: ${eventA.event.slice(0, 100)}`
              },
              {
                content: `${eventB.timestamp}: ${eventB.event.slice(0, 100)}`
              }
            ],
            proposedResolution: '建议核实事件的实际发生时间，检查是否存在回忆偏差',
            severity: 0.5
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * 检测关系冲突
   */
  private detectRelationContradictions(narrative: DreamNarrative): DreamContradiction[] {
    const contradictions: DreamContradiction[] = [];

    // 检查是否有相互矛盾的关系
    // 例如：A是B的上级 vs B是A的上级
    const relationPairs = new Map<string, Array<{ subj: string; obj: string; pred: string }>>();

    for (const rel of narrative.relations) {
      const key = [rel.subject, rel.object].sort().join('_');
      const existing = relationPairs.get(key) || [];
      existing.push({ subj: rel.subject, obj: rel.object, pred: rel.predicate });
      relationPairs.set(key, existing);
    }

    for (const [key, pairs] of relationPairs.entries()) {
      if (pairs.length >= 2) {
        // 检查是否有方向相反的关系
        const directions = pairs.map(p => `${p.subj}_${p.pred}_${p.obj}`);
        const uniqueDirs = new Set(directions);

        if (uniqueDirs.size > 1) {
          contradictions.push({
            id: `contradiction_relation_${Date.now()}_${contradictions.length}`,
            type: 'relation_conflict',
            description: `发现潜在关系冲突: 实体 ${key.replace('_', ' 和 ')} 之间存在不一致的关系描述`,
            conflictingEntries: pairs.map(p => ({
              content: `${p.subj} ${p.pred} ${p.obj}`
            })),
            proposedResolution: '建议核对原始来源，确定正确的实体关系',
            severity: 0.6
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * 检测逻辑矛盾
   */
  private detectLogicContradictions(clusters: MemoryCluster[]): DreamContradiction[] {
    const contradictions: DreamContradiction[] = [];

    for (const cluster of clusters) {
      // 检测包含明显逻辑矛盾词的记忆
      const negationPairs = [
        ['是', '不是'],
        ['有', '没有'],
        ['存在', '不存在'],
        ['正确', '错误'],
        ['真', '假'],
        ['yes', 'no'],
        ['true', 'false']
      ];

      for (const entry of cluster.entries) {
        const content = entry.content.toLowerCase();

        // 检查同一条记忆中是否包含矛盾的词对
        for (const [wordA, wordB] of negationPairs) {
          if (content.includes(wordA) && content.includes(wordB)) {
            // 检查它们是否在讨论同一个主题
            const idxA = content.indexOf(wordA);
            const idxB = content.indexOf(wordB);

            if (Math.abs(idxA - idxB) < 50) { // 在同一上下文附近
              contradictions.push({
                id: `contradiction_logic_${Date.now()}_${contradictions.length}`,
                type: 'logic_conflict',
                description: `发现潜在逻辑矛盾: 同一条记忆中同时包含 "${wordA}" 和 "${wordB}"`,
                conflictingEntries: [
                  {
                    memoryId: entry.id,
                    content: entry.content.slice(0, 200)
                  }
                ],
                proposedResolution: '建议人工审核该条记忆，确认是否存在逻辑错误',
                severity: 0.7
              });
              break;
            }
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * 生成修复建议
   */
  private generateRepairSuggestions(
    contradictions: DreamContradiction[],
    insights: DreamInsight[]
  ): RepairSuggestion[] {
    const repairs: RepairSuggestion[] = [];

    // 1. 为每个矛盾生成修复建议
    for (const contradiction of contradictions) {
      const suggestion = this.createRepairSuggestion(contradiction);
      if (suggestion) {
        repairs.push(suggestion);
      }
    }

    // 2. 为低置信度洞见生成验证建议
    for (const insight of insights) {
      if (insight.confidence < 0.5) {
        repairs.push({
          id: `repair_verify_${Date.now()}_${repairs.length}`,
          type: 'verify',
          description: `建议验证低置信度洞见: ${insight.content.slice(0, 100)}`,
          priority: insight.confidence < 0.3 ? 'high' : insight.confidence < 0.5 ? 'medium' : 'low',
          reason: `洞见置信度较低 (${(insight.confidence * 100).toFixed(0)}%)，建议验证后再整合到知识库`
        });
      }
    }

    return repairs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 创建修复建议
   */
  private createRepairSuggestion(contradiction: DreamContradiction): RepairSuggestion | null {
    let priority: RepairSuggestion['priority'] = 'medium';
    if (contradiction.severity > 0.7) {
      priority = 'high';
    } else if (contradiction.severity < 0.3) {
      priority = 'low';
    }

    const targetMemoryId = contradiction.conflictingEntries[0]?.memoryId;

    switch (contradiction.type) {
      case 'factual_conflict':
        return {
          id: `repair_fact_${Date.now()}`,
          type: 'verify',
          targetMemoryId,
          description: `核实事实冲突: ${contradiction.description}`,
          priority,
          reason: contradiction.proposedResolution || '需要人工核实事实一致性'
        };

      case 'timeline_conflict':
        return {
          id: `repair_timeline_${Date.now()}`,
          type: 'update',
          description: `修正时间线: ${contradiction.description}`,
          priority,
          reason: contradiction.proposedResolution || '需要核实事件时间顺序'
        };

      case 'relation_conflict':
        return {
          id: `repair_relation_${Date.now()}`,
          type: 'tag',
          description: `标记关系待确认: ${contradiction.description}`,
          priority,
          reason: contradiction.proposedResolution || '需要确认实体关系的正确性'
        };

      case 'logic_conflict':
        return {
          id: `repair_logic_${Date.now()}`,
          type: 'delete',
          targetMemoryId,
          description: `建议审核可能的逻辑错误: ${contradiction.description}`,
          priority,
          reason: contradiction.proposedResolution || '存在逻辑矛盾，建议人工审核后决定是否保留'
        };

      default:
        return null;
    }
  }

  /**
   * 检查文本是否包含对另一个事件的引用
   */
  private referencesEvent(content: string, event: string): boolean {
    const eventKeywords = event
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);

    let matchCount = 0;
    const contentLower = content.toLowerCase();

    for (const keyword of eventKeywords) {
      if (contentLower.includes(keyword)) {
        matchCount++;
      }
    }

    return matchCount >= 2 && matchCount / eventKeywords.length >= 0.3;
  }

  /**
   * 检查文本是否有相反的情感极性
   */
  private hasOpposingPolarity(textA: string, textB: string): boolean {
    const positiveWords = ['是', '有', '存在', '正确', '真', '对', '好', 'yes', 'true', 'correct'];
    const negativeWords = ['不是', '没有', '不存在', '错误', '假', '不对', '错', '坏', 'no', 'false', 'incorrect'];

    const countWords = (text: string, words: string[]) => {
      const lower = text.toLowerCase();
      return words.filter(w => lower.includes(w)).length;
    };

    const posA = countWords(textA, positiveWords);
    const negA = countWords(textA, negativeWords);
    const posB = countWords(textB, positiveWords);
    const negB = countWords(textB, negativeWords);

    // 一个主要是肯定，一个主要是否定
    return (posA > negA && negB > posB) || (negA > posA && posB > negB);
  }
}
