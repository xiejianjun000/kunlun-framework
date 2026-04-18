/**
 * 知识缺口检测类型定义
 * Knowledge Gap Detection Types
 * 
 * 为 Dreaming 系统提供识别记忆盲区的能力
 */

import { IMemory, IMemoryLink, MemoryRelationType } from '../interfaces';

// ============== 缺口类型 ==============

/**
 * 知识缺口类型枚举
 */
export enum GapType {
  /**
   * 高出度低入度节点 - 问得多、答案少
   * 表明该节点向外关联很多，但其他节点很少指向它
   */
  HIGH_OUT_DEGREE = 'high_out_degree',
  
  /**
   * 孤立节点 - 无连接
   * 表明该知识点未被关联，可能需要加强连接
   */
  ISOLATED = 'isolated',
  
  /**
   * 低置信度边 - 关系不明确
   * 表明节点间的关系不够确定，需要验证
   */
  LOW_CONFIDENCE = 'low_confidence',
  
  /**
   * 陈旧节点 - 长期未更新的活跃节点
   * 表明该节点虽然被频繁访问但很久没有更新
   */
  STALE = 'stale',
}

// ============== 核心类型 ==============

/**
 * 图节点
 */
export interface GraphNode {
  /** 节点ID */
  id: string;
  /** 节点内容/标题 */
  content: string;
  /** 出度 - 指向其他节点的数量 */
  outDegree: number;
  /** 入度 - 被其他节点指向的数量 */
  inDegree: number;
  /** 总度数 */
  degree: number;
  /** 节点创建时间 */
  createdAt: Date;
  /** 节点最后更新时间 */
  updatedAt: Date;
  /** 最后访问时间 */
  lastAccessedAt?: Date;
  /** 访问频率 */
  accessFrequency: number;
  /** 节点元数据 */
  metadata?: Record<string, any>;
}

/**
 * 图边
 */
export interface GraphEdge {
  /** 边ID */
  id: string;
  /** 源节点ID */
  sourceId: string;
  /** 目标节点ID */
  targetId: string;
  /** 关联类型 */
  relationType: MemoryRelationType;
  /** 置信度 (0-1) */
  confidence: number;
  /** 创建时间 */
  createdAt: Date;
  /** 边元数据 */
  metadata?: Record<string, any>;
}

/**
 * 知识缺口
 */
export interface KnowledgeGap {
  /** 缺口关联的节点ID */
  nodeId: string;
  /** 节点内容摘要 */
  nodeContent: string;
  /** 缺口类型 */
  gapType: GapType;
  /** 严重程度 (0-1, 越高越严重) */
  severity: number;
  /** 建议问题列表 */
  suggestedQuestions: string[];
  /** 相关边 (仅 low_confidence 类型) */
  relatedEdges?: Array<{
    edgeId: string;
    targetId: string;
    confidence: number;
  }>;
  /** 检测时间 */
  detectedAt: Date;
}

// ============== 图存储 ==============

/**
 * 图存储接口
 */
export interface GraphStore {
  /** 获取所有节点 */
  getNodes(): GraphNode[];
  /** 获取所有边 */
  getEdges(): GraphEdge[];
  /** 根据ID获取节点 */
  getNodeById(id: string): GraphNode | undefined;
  /** 获取节点的所有出边 */
  getOutEdges(nodeId: string): GraphEdge[];
  /** 获取节点的所有入边 */
  getInEdges(nodeId: string): GraphEdge[];
  /** 获取节点的所有边 */
  getNodeEdges(nodeId: string): GraphEdge[];
}

// ============== 分析结果 ==============

/**
 * 缺口分析结果
 */
export interface GapAnalysisResult {
  /** 检测到的缺口列表 */
  gaps: KnowledgeGap[];
  /** 缺口统计 */
  statistics: GapStatistics;
  /** 分析摘要 */
  summary: string;
  /** 优先处理行动建议 */
  priorityActions: string[];
  /** 分析时间 */
  analyzedAt: Date;
}

/**
 * 缺口统计
 */
export interface GapStatistics {
  /** 总缺口数 */
  totalGaps: number;
  /** 各类型缺口数量 */
  byType: Record<GapType, number>;
  /** 严重程度分布 */
  severityDistribution: {
    critical: number;  // 0.8-1.0
    high: number;      // 0.6-0.8
    medium: number;    // 0.4-0.6
    low: number;       // 0.0-0.4
  };
  /** 平均严重程度 */
  averageSeverity: number;
}

// ============== 配置 ==============

/**
 * 缺口检测配置
 */
export interface GapDetectorConfig {
  /** 高出度阈值比例 (相对于平均值的倍数) */
  highOutDegreeThreshold: number;
  /** 低入度阈值比例 */
  lowInDegreeThreshold: number;
  /** 低置信度边阈值 */
  lowConfidenceThreshold: number;
  /** 陈旧天数阈值 */
  staleDaysThreshold: number;
  /** 最大建议问题数 */
  maxSuggestedQuestions: number;
  /** 是否启用各类缺口检测 */
  enabledTypes: {
    highOutDegree: boolean;
    isolated: boolean;
    lowConfidence: boolean;
    stale: boolean;
  };
}

/** 默认配置 */
export const DEFAULT_GAP_DETECTOR_CONFIG: GapDetectorConfig = {
  highOutDegreeThreshold: 1.5,
  lowInDegreeThreshold: 0.5,
  lowConfidenceThreshold: 0.4,
  staleDaysThreshold: 90,
  maxSuggestedQuestions: 3,
  enabledTypes: {
    highOutDegree: true,
    isolated: true,
    lowConfidence: true,
    stale: true,
  },
};

// ============== 辅助类型 ==============

/**
 * 缺口检测上下文
 */
export interface GapDetectionContext {
  /** 节点列表 */
  nodes: GraphNode[];
  /** 边列表 */
  edges: GraphEdge[];
  /** 平均出度 */
  averageOutDegree: number;
  /** 平均入度 */
  averageInDegree: number;
  /** 当前时间 */
  now: Date;
}

/**
 * 问题生成模板
 */
export interface QuestionTemplate {
  /** 缺口类型 */
  gapType: GapType;
  /** 模板问题 */
  templates: string[];
}
