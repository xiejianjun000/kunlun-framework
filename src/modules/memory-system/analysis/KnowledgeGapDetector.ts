/**
 * 知识缺口检测器
 * Knowledge Gap Detector
 * 
 * 为 Dreaming 系统提供识别记忆盲区的能力
 * 让系统知道"该学什么"
 * 
 * 检测策略：
 * 1. 高出度低入度节点 - 问得多、答案少
 * 2. 孤立节点 - 无连接
 * 3. 低置信度边 - 关系不明确
 * 4. 陈旧节点 - 长期未更新的活跃节点
 */

import {
  GapType,
  GraphStore,
  GraphNode,
  GraphEdge,
  KnowledgeGap,
  GapAnalysisResult,
  GapStatistics,
  GapDetectorConfig,
  GapDetectionContext,
  QuestionTemplate,
  DEFAULT_GAP_DETECTOR_CONFIG,
} from './types';

/**
 * 基于图谱的知识缺口检测器
 */
export class GraphBasedGapDetector {
  private config: GapDetectorConfig;

  // 问题生成模板
  private questionTemplates: QuestionTemplate[] = [
    {
      gapType: GapType.HIGH_OUT_DEGREE,
      templates: [
        '关于「{nodeContent}」的详细定义是什么？',
        '能否提供「{nodeContent}」的具体例子？',
        '「{nodeContent}」与其他概念的关系是什么？',
      ],
    },
    {
      gapType: GapType.ISOLATED,
      templates: [
        '「{nodeContent}」与哪些其他概念相关联？',
        '「{nodeContent}」的应用场景是什么？',
        '「{nodeContent}」可以归类到哪个主题下？',
      ],
    },
    {
      gapType: GapType.LOW_CONFIDENCE,
      templates: [
        '「{nodeContent}」与「{relatedNode}」的关系是否正确？',
        '这个关联的证据是什么？',
        '是否需要修正「{nodeContent}」的相关知识？',
      ],
    },
    {
      gapType: GapType.STALE,
      templates: [
        '「{nodeContent}」的最新发展是什么？',
        '「{nodeContent}」的知识是否需要更新？',
        '「{nodeContent}」有哪些新的应用？',
      ],
    },
  ];

  constructor(config: Partial<GapDetectorConfig> = {}) {
    this.config = { ...DEFAULT_GAP_DETECTOR_CONFIG, ...config };
  }

  /**
   * 检测知识缺口
   * @param graph 知识图谱存储
   * @returns 缺口分析结果
   */
  detectGaps(graph: GraphStore): GapAnalysisResult {
    const context = this.buildContext(graph);
    const gaps: KnowledgeGap[] = [];

    // 1. 检测高出度低入度节点
    if (this.config.enabledTypes.highOutDegree) {
      gaps.push(...this.detectHighOutDegreeNodes(context));
    }

    // 2. 检测孤立节点
    if (this.config.enabledTypes.isolated) {
      gaps.push(...this.detectIsolatedNodes(context));
    }

    // 3. 检测低置信度边
    if (this.config.enabledTypes.lowConfidence) {
      gaps.push(...this.detectLowConfidenceEdges(context));
    }

    // 4. 检测陈旧节点
    if (this.config.enabledTypes.stale) {
      gaps.push(...this.detectStaleNodes(context));
    }

    // 计算统计信息
    const statistics = this.calculateStatistics(gaps);

    // 生成摘要和行动建议
    const summary = this.generateSummary(gaps, statistics);
    const priorityActions = this.generatePriorityActions(gaps, statistics);

    return {
      gaps,
      statistics,
      summary,
      priorityActions,
      analyzedAt: new Date(),
    };
  }

  /**
   * 计算缺口严重程度
   * @param gap 知识缺口
   * @returns 严重程度 (0-1)
   */
  calculateSeverity(gap: KnowledgeGap): number {
    switch (gap.gapType) {
      case GapType.HIGH_OUT_DEGREE: {
        // 基于度失衡程度计算
        const degreeRatio = gap.relatedEdges?.length 
          ? gap.relatedEdges.length / (gap.relatedEdges.length + 1)
          : 0.5;
        return Math.min(0.9, degreeRatio + 0.3);
      }

      case GapType.ISOLATED: {
        // 孤立节点严重程度固定较高
        return 0.85;
      }

      case GapType.LOW_CONFIDENCE: {
        // 基于置信度计算，越低越严重
        const avgConfidence = gap.relatedEdges?.length
          ? gap.relatedEdges.reduce((sum, e) => sum + e.confidence, 0) / gap.relatedEdges.length
          : 0.5;
        return Math.max(0, 1 - avgConfidence - 0.1);
      }

      case GapType.STALE: {
        // 基于元数据中的陈旧程度计算
        const staleDays = gap.relatedEdges?.length || 0;
        return Math.min(0.95, 0.4 + staleDays / 365);
      }

      default:
        return 0.5;
    }
  }

  /**
   * 生成建议问题
   * @param gap 知识缺口
   * @returns 建议问题列表
   */
  suggestQuestions(gap: KnowledgeGap): string[] {
    const template = this.questionTemplates.find(t => t.gapType === gap.gapType);
    if (!template) {
      return [];
    }

    const questions = template.templates
      .slice(0, this.config.maxSuggestedQuestions)
      .map(template => {
        let question = template.replace('{nodeContent}', gap.nodeContent);
        
        // 如果有相关节点，替换 relatedNode 占位符
        if (gap.relatedEdges?.length) {
          const relatedNode = gap.relatedEdges[0].targetId;
          question = question.replace('{relatedNode}', relatedNode);
        }
        
        return question;
      });

    return questions;
  }

  // ============== 私有方法 ==============

  /**
   * 构建检测上下文
   */
  private buildContext(graph: GraphStore): GapDetectionContext {
    const nodes = graph.getNodes();
    const edges = graph.getEdges();
    const now = new Date();

    // 计算平均度数
    const totalOutDegree = nodes.reduce((sum, n) => sum + n.outDegree, 0);
    const totalInDegree = nodes.reduce((sum, n) => sum + n.inDegree, 0);

    return {
      nodes,
      edges,
      averageOutDegree: nodes.length > 0 ? totalOutDegree / nodes.length : 0,
      averageInDegree: nodes.length > 0 ? totalInDegree / nodes.length : 0,
      now,
    };
  }

  /**
   * 检测高出度低入度节点
   * 问得多、答案少 - 该节点对外关联很多，但其他节点很少指向它
   */
  private detectHighOutDegreeNodes(context: GapDetectionContext): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const { nodes, averageOutDegree, averageInDegree } = context;

    const highOutThreshold = averageOutDegree * this.config.highOutDegreeThreshold;
    const lowInThreshold = averageInDegree * this.config.lowInDegreeThreshold;

    for (const node of nodes) {
      // 条件：出度高 + 入度低
      if (node.outDegree > highOutThreshold && node.inDegree < lowInThreshold) {
        const gap: KnowledgeGap = {
          nodeId: node.id,
          nodeContent: this.truncateContent(node.content),
          gapType: GapType.HIGH_OUT_DEGREE,
          severity: 0,
          suggestedQuestions: [],
          detectedAt: new Date(),
        };

        // 获取相关的出边
        const outEdges = context.edges.filter(e => e.sourceId === node.id);
        if (outEdges.length > 0) {
          gap.relatedEdges = outEdges.map(e => ({
            edgeId: e.id,
            targetId: e.targetId,
            confidence: e.confidence,
          }));
        }

        gap.severity = this.calculateSeverity(gap);
        gap.suggestedQuestions = this.suggestQuestions(gap);
        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * 检测孤立节点
   * 无连接 - 该知识点未被关联，可能需要加强连接
   */
  private detectIsolatedNodes(context: GapDetectionContext): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    for (const node of context.nodes) {
      // 条件：完全孤立 (出度=0 且 入度=0)
      if (node.degree === 0) {
        const gap: KnowledgeGap = {
          nodeId: node.id,
          nodeContent: this.truncateContent(node.content),
          gapType: GapType.ISOLATED,
          severity: 0,
          suggestedQuestions: [],
          detectedAt: new Date(),
        };

        gap.severity = this.calculateSeverity(gap);
        gap.suggestedQuestions = this.suggestQuestions(gap);
        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * 检测低置信度边
   * 关系不明确 - 节点间的关系不够确定，需要验证
   */
  private detectLowConfidenceEdges(context: GapDetectionContext): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const processedNodes = new Set<string>();

    for (const edge of context.edges) {
      if (edge.confidence < this.config.lowConfidenceThreshold) {
        // 对于低置信度边，只为源节点创建缺口
        if (!processedNodes.has(edge.sourceId)) {
          processedNodes.add(edge.sourceId);

          const sourceNode = context.nodes.find(n => n.id === edge.sourceId);
          if (!sourceNode) continue;

          // 收集该节点的所有低置信度边
          const lowConfidenceEdges = context.edges.filter(
            e => e.sourceId === edge.sourceId && e.confidence < this.config.lowConfidenceThreshold
          );

          const gap: KnowledgeGap = {
            nodeId: sourceNode.id,
            nodeContent: this.truncateContent(sourceNode.content),
            gapType: GapType.LOW_CONFIDENCE,
            severity: 0,
            suggestedQuestions: [],
            relatedEdges: lowConfidenceEdges.map(e => ({
              edgeId: e.id,
              targetId: e.targetId,
              confidence: e.confidence,
            })),
            detectedAt: new Date(),
          };

          gap.severity = this.calculateSeverity(gap);
          gap.suggestedQuestions = this.suggestQuestions(gap);
          gaps.push(gap);
        }
      }
    }

    return gaps;
  }

  /**
   * 检测陈旧节点
   * 长期未更新的活跃节点 - 该节点虽然被频繁访问但很久没有更新
   */
  private detectStaleNodes(context: GapDetectionContext): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const { nodes, now } = context;

    const staleMs = this.config.staleDaysThreshold * 24 * 60 * 60 * 1000;
    const staleThreshold = new Date(now.getTime() - staleMs);

    for (const node of nodes) {
      // 条件：被访问过 + 很久没更新
      const hasAccessHistory = node.lastAccessedAt !== undefined;
      const isStale = node.updatedAt < staleThreshold;
      const isActive = node.accessFrequency > 0;

      if (hasAccessHistory && isStale && isActive) {
        const gap: KnowledgeGap = {
          nodeId: node.id,
          nodeContent: this.truncateContent(node.content),
          gapType: GapType.STALE,
          severity: 0,
          suggestedQuestions: [],
          detectedAt: new Date(),
        };

        // 计算陈旧天数
        const daysSinceUpdate = Math.floor(
          (now.getTime() - node.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        gap.relatedEdges = [{ 
          edgeId: 'stale_days', 
          targetId: `${daysSinceUpdate}`, 
          confidence: daysSinceUpdate / 365 
        }] as any;

        gap.severity = this.calculateSeverity(gap);
        gap.suggestedQuestions = this.suggestQuestions(gap);
        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(gaps: KnowledgeGap[]): GapStatistics {
    const byType: Record<GapType, number> = {
      [GapType.HIGH_OUT_DEGREE]: 0,
      [GapType.ISOLATED]: 0,
      [GapType.LOW_CONFIDENCE]: 0,
      [GapType.STALE]: 0,
    };

    const severityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalSeverity = 0;

    for (const gap of gaps) {
      byType[gap.gapType]++;
      totalSeverity += gap.severity;

      if (gap.severity >= 0.8) {
        severityDistribution.critical++;
      } else if (gap.severity >= 0.6) {
        severityDistribution.high++;
      } else if (gap.severity >= 0.4) {
        severityDistribution.medium++;
      } else {
        severityDistribution.low++;
      }
    }

    return {
      totalGaps: gaps.length,
      byType,
      severityDistribution,
      averageSeverity: gaps.length > 0 ? totalSeverity / gaps.length : 0,
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(gaps: KnowledgeGap[], statistics: GapStatistics): string {
    if (gaps.length === 0) {
      return '知识图谱健康，无明显缺口。';
    }

    const parts: string[] = [];

    if (statistics.byType[GapType.HIGH_OUT_DEGREE] > 0) {
      parts.push(`${statistics.byType[GapType.HIGH_OUT_DEGREE]} 个节点存在「问答失衡」问题`);
    }

    if (statistics.byType[GapType.ISOLATED] > 0) {
      parts.push(`${statistics.byType[GapType.ISOLATED]} 个孤立节点需要建立关联`);
    }

    if (statistics.byType[GapType.LOW_CONFIDENCE] > 0) {
      parts.push(`${statistics.byType[GapType.LOW_CONFIDENCE]} 处知识关联置信度较低`);
    }

    if (statistics.byType[GapType.STALE] > 0) {
      parts.push(`${statistics.byType[GapType.STALE]} 个活跃节点知识已陈旧`);
    }

    const summary = parts.join('；');
    return `检测到 ${statistics.totalGaps} 个知识缺口：${summary}。平均严重程度：${(statistics.averageSeverity * 100).toFixed(0)}%。`;
  }

  /**
   * 生成优先行动建议
   */
  private generatePriorityActions(gaps: KnowledgeGap[], statistics: GapStatistics): string[] {
    const actions: string[] = [];

    // 按严重程度排序
    const sortedGaps = [...gaps].sort((a, b) => b.severity - a.severity);

    // 最高优先级：孤立节点
    const isolatedGaps = gaps.filter(g => g.gapType === GapType.ISOLATED);
    if (isolatedGaps.length > 0) {
      actions.push(`优先为 ${isolatedGaps.length} 个孤立节点建立知识关联`);
    }

    // 高严重程度缺口
    const criticalGaps = sortedGaps.filter(g => g.severity >= 0.8);
    if (criticalGaps.length > 0) {
      const topics = criticalGaps.slice(0, 3).map(g => `「${g.nodeContent}」`).join('、');
      actions.push(`重点补充高严重程度知识：${topics}`);
    }

    // 陈旧知识
    const staleGaps = gaps.filter(g => g.gapType === GapType.STALE);
    if (staleGaps.length > 0) {
      actions.push(`更新 ${staleGaps.length} 个陈旧节点的相关知识`);
    }

    // 低置信度关联
    const lowConfGaps = gaps.filter(g => g.gapType === GapType.LOW_CONFIDENCE);
    if (lowConfGaps.length > 0) {
      actions.push(`验证并加强 ${lowConfGaps.length} 处低置信度知识关联`);
    }

    // 问答失衡
    const outDegreeGaps = gaps.filter(g => g.gapType === GapType.HIGH_OUT_DEGREE);
    if (outDegreeGaps.length > 0) {
      actions.push(`为 ${outDegreeGaps.length} 个「问答失衡」节点补充答案型知识`);
    }

    return actions;
  }

  /**
   * 截断内容
   */
  private truncateContent(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.slice(0, maxLength - 3) + '...';
  }
}

/**
 * 创建知识缺口检测器
 */
export function createKnowledgeGapDetector(
  config?: Partial<GapDetectorConfig>
): GraphBasedGapDetector {
  return new GraphBasedGapDetector(config);
}

/**
 * 创建知识缺口检测器 (别名)
 */
export const createGraphBasedGapDetector = createKnowledgeGapDetector;

// 别名导出以保持 API 兼容性（createGraphBasedGapDetector 作为 KnowledgeGapDetector）
export { createGraphBasedGapDetector as KnowledgeGapDetector };

// ============== 图谱存储适配器 ==============

/**
 * 基于 IMemory 和 IMemoryLink 创建 GraphStore
 * 用于将记忆数据转换为图谱结构进行分析
 */
export function createGraphStoreFromMemories(
  memories: Array<{ id: string; content: string; metadata?: Record<string, any> }>,
  links: Array<{ id: string; sourceId: string; targetId: string; relationType: string; confidence: number; createdAt: Date }>
): GraphStore {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  // 构建节点
  for (const memory of memories) {
    const inEdges = links.filter(l => l.targetId === memory.id);
    const outEdges = links.filter(l => l.sourceId === memory.id);
    
    nodeMap.set(memory.id, {
      id: memory.id,
      content: memory.content,
      inDegree: inEdges.length,
      outDegree: outEdges.length,
      degree: inEdges.length + outEdges.length,
      createdAt: memory.metadata?.createdAt ? new Date(memory.metadata.createdAt) : new Date(),
      updatedAt: memory.metadata?.updatedAt ? new Date(memory.metadata.updatedAt) : new Date(),
      lastAccessedAt: memory.metadata?.lastAccessedAt ? new Date(memory.metadata.lastAccessedAt) : undefined,
      accessFrequency: memory.metadata?.accessFrequency || 0,
      metadata: memory.metadata,
    });
  }

  // 构建边
  for (const link of links) {
    edgeMap.set(link.id, {
      id: link.id,
      sourceId: link.sourceId,
      targetId: link.targetId,
      relationType: link.relationType as any,
      confidence: link.confidence,
      createdAt: link.createdAt,
    });
  }

  return {
    getNodes: () => Array.from(nodeMap.values()),
    getEdges: () => Array.from(edgeMap.values()),
    getNodeById: (id) => nodeMap.get(id),
    getOutEdges: (nodeId) => links
      .filter(l => l.sourceId === nodeId)
      .map(l => edgeMap.get(l.id)!),
    getInEdges: (nodeId) => links
      .filter(l => l.targetId === nodeId)
      .map(l => edgeMap.get(l.id)!),
    getNodeEdges: (nodeId) => links
      .filter(l => l.sourceId === nodeId || l.targetId === nodeId)
      .map(l => edgeMap.get(l.id)!),
  };
}
