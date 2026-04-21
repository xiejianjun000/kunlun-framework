/**
 * 梦境系统接口定义
 * 基于 OpenClaw Dreaming System 架构移植到 OpenTaiji
 */

import { MemoryEntry } from '../../memory/interfaces/IMemorySystem';

// ===== 梦境阶段 =====

export enum DreamPhase {
  /** 阶段1：记忆聚类 */
  CLUSTERING = 'clustering',
  /** 阶段2：叙事合成 */
  NARRATIVE = 'narrative',
  /** 阶段3：洞见提取 */
  SYNTHESIS = 'synthesis',
  /** 阶段4：矛盾修复 */
  REPAIR = 'repair',
  /** 阶段5：图谱整合 */
  INTEGRATION = 'integration'
}

// ===== 梦境状态 =====

export enum DreamStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// ===== 记忆簇 =====

export interface MemoryCluster {
  /** 簇ID */
  id: string;
  /** 簇名称/主题 */
  name: string;
  /** 核心主题关键词 */
  theme: string[];
  /** 包含的记忆条目 */
  entries: MemoryEntry[];
  /** 簇内平均相似度 */
  cohesion: number;
  /** 与其他簇的相似度 */
  similarityToOtherClusters?: Map<string, number>;
  /** 重要性评分 */
  importance: number;
  /** 提取的实体列表 */
  entities: string[];
}

// ===== 叙事合成结果 =====

export interface DreamNarrative {
  /** 叙事ID */
  id: string;
  /** 叙事标题 */
  title: string;
  /** 连贯的叙事文本 */
  content: string;
  /** 叙事摘要 */
  summary: string;
  /** 涉及的记忆簇 */
  clusterIds: string[];
  /** 提取的关键实体 */
  entities: string[];
  /** 提取的关键关系 */
  relations: Array<{
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
  }>;
  /** 时间线 */
  timeline: Array<{
    timestamp?: string;
    event: string;
  }>;
}

// ===== 知识洞见 =====

export interface DreamInsight {
  /** 洞见ID */
  id: string;
  /** 洞见类型 */
  type: 'pattern' | 'contradiction' | 'connection' | 'trend' | 'new_fact';
  /** 洞见内容 */
  content: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 支持证据（记忆ID） */
  evidence: string[];
  /** 涉及的实体 */
  entities: string[];
  /** 重要性评分 */
  importance: number;
  /** 源记忆簇 */
  sourceClusterId?: string;
}

// ===== 矛盾检测结果 =====

export interface DreamContradiction {
  /** 矛盾ID */
  id: string;
  /** 矛盾类型 */
  type: 'factual_conflict' | 'timeline_conflict' | 'relation_conflict' | 'logic_conflict';
  /** 矛盾描述 */
  description: string;
  /** 冲突的记忆条目 */
  conflictingEntries: Array<{
    memoryId?: string;
    content: string;
    claim?: string;
  }>;
  /** 建议的解决方案 */
  proposedResolution?: string;
  /** 严重程度 (0-1) */
  severity: number;
}

// ===== 修复建议 =====

export interface RepairSuggestion {
  /** 建议ID */
  id: string;
  /** 修复类型 */
  type: 'update' | 'delete' | 'merge' | 'tag' | 'verify';
  /** 目标记忆ID */
  targetMemoryId?: string;
  /** 目标声明ID */
  targetClaimId?: string;
  /** 修复描述 */
  description: string;
  /** 建议的新内容 */
  newContent?: string;
  /** 需要合并的记忆ID列表 */
  mergeWith?: string[];
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 理由 */
  reason: string;
}

// ===== 单阶段执行结果 =====

export interface PhaseResult {
  /** 阶段名称 */
  phase: DreamPhase;
  /** 是否成功 */
  success: boolean;
  /** 阶段耗时(ms) */
  latency: number;
  /** 阶段输出数据 */
  data?: unknown;
  /** 错误信息（如果失败） */
  error?: string;
}

// ===== 完整梦境执行结果 =====

export interface DreamResult {
  /** 梦境ID */
  id: string;
  /** 状态 */
  status: DreamStatus;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 总耗时(ms) */
  totalLatency?: number;
  /** 处理的记忆数量 */
  memoryCount: number;

  /** 阶段1：记忆聚类结果 */
  clusters?: MemoryCluster[];
  /** 阶段2：叙事合成结果 */
  narrative?: DreamNarrative;
  /** 阶段3：洞见提取结果 */
  insights?: DreamInsight[];
  /** 阶段4：矛盾修复结果 */
  contradictions?: DreamContradiction[];
  repairs?: RepairSuggestion[];
  /** 阶段5：图谱整合结果 */
  integration?: {
    newClaimsCount: number;
    newEntitiesCount: number;
    newRelationsCount: number;
    updatedEntries: string[];
    claims: Array<{
      id: string;
      text: string;
      confidence: number;
      evidence: string[];
      entities: string[];
      source: string;
    }>;
    entities: Array<{
      id: string;
      name: string;
      type: string;
      sourceClusters: string[];
      confidence: number;
    }>;
    relations: Array<{
      id: string;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      sourceClusters: string[];
    }>;
  };

  /** 各阶段执行结果 */
  phaseResults: PhaseResult[];
  /** WFGY 幻觉验证结果 */
  wfgyVerification?: {
    verified: boolean;
    hallucinationRisk: number;
    sources: Array<{
      id: string;
      confidence: number;
    }>;
  };
  /** 梦境质量评分 */
  qualityScore?: number;
  /** 错误信息 */
  error?: string;
}

// ===== 梦境系统配置 =====

export interface DreamingSystemConfig {
  /** 是否自动触发梦境 */
  autoTrigger?: boolean;
  /** 触发梦境的记忆数量阈值 */
  memoryThreshold?: number;
  /** 最小触发间隔(ms) */
  minIntervalMs?: number;
  /** 每个阶段超时时间(ms) */
  phaseTimeoutMs?: number;
  /** 目标簇数量范围 */
  targetClusters?: {
    min: number;
    max: number;
  };
  /** WFGY 集成配置 */
  wfgyIntegration?: {
    enabled: boolean;
    /** 洞见验证 */
    verifyInsights: boolean;
    /** 叙事验证 */
    verifyNarrative: boolean;
    /** 高风险洞见自动过滤 */
    autoFilterHighRisk: boolean;
    /** 风险阈值 */
    riskThreshold: number;
  };
  /** 图谱集成配置 */
  wikiIntegration?: {
    enabled: boolean;
    /** 自动写入声明 */
    autoWriteClaims: boolean;
    /** 自动创建实体 */
    autoCreateEntities: boolean;
    /** 置信度阈值 */
    confidenceThreshold: number;
  };
}

// ===== 梦境系统接口 =====

export interface IDreamingSystem {
  /**
   * 执行完整的梦境五阶段流程
   */
  dream(memories: MemoryEntry[]): Promise<DreamResult>;

  /**
   * 单独执行某个阶段
   */
  runPhase(phase: DreamPhase, input: unknown): Promise<PhaseResult>;

  /**
   * 检查是否应该触发梦境
   */
  shouldTrigger(memoryCount: number, lastDreamTime?: string): boolean;

  /**
   * 获取最近的梦境结果
   */
  getRecentDreams(limit?: number): Promise<DreamResult[]>;

  /**
   * 应用修复建议
   */
  applyRepairs(dreamId: string): Promise<{
    applied: number;
    failed: number;
  }>;

  /**
   * 检查系统是否就绪
   */
  isReady(): boolean;
}
