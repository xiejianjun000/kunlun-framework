/**
 * IPersonalitySystem.ts
 * 人格系统核心接口定义
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

/**
 * 五维画像维度
 */
export enum PersonalityDimension {
  PERSONALITY = 'personality',           // 人格特征
  PERSPECTIVE = 'perspective',           // 视角偏好
  WORLDVIEW = 'worldview',               // 世界观
  VALUES = 'values',                     // 价值观
  LIFE_PHILOSOPHY = 'life_philosophy'   // 人生观
}

/**
 * 特质类型枚举
 */
export enum TraitType {
  EXTRAVERSION_INTROVERSION = 'extraversion_introversion',
  OPENNESS_CONSERVATISM = 'openness_conservatism',
  RATIONALITY_EMOTION = 'rationality_emotion',
  RISK_TOLERANCE = 'risk_tolerance',
  DECISION_STYLE = 'decision_style',
  INFORMATION_PROCESSING = 'information_processing',
  AUTHORITY_ORIENTATION = 'authority_orientation',
  CAUSALITY_BELIEF = 'causality_belief',
  SYSTEM_COMPLEXITY = 'system_complexity',
  TEMPORAL_ORIENTATION = 'temporal_orientation'
}

/**
 * 决策风格类型
 */
export enum DecisionStyle {
  DELIBERATE = 'deliberate',           // 深思熟虑型
  INTUITIVE = 'intuitive',             // 直觉型
  DATA_DRIVEN = 'data_driven',         // 数据驱动型
  AUTHORITY_BASED = 'authority_based'  // 权威依赖型
}

/**
 * 信息处理风格
 */
export enum InformationProcessingStyle {
  SYSTEMATIC = 'systematic',           // 系统性处理
  HEURISTIC = 'heuristic',             // 启发式处理
  HOLISTIC = 'holistic',               // 整体性处理
  ANALYTICAL = 'analytical'            // 分析性处理
}

/**
 * 沟通风格类型
 */
export enum CommunicationStyle {
  FORMAL = 'formal',                   // 正式
  CASUAL = 'casual',                   // 随意
  TECHNICAL = 'technical',              // 技术性
  EMOTIONAL = 'emotional',             // 情感性
  DIRECT = 'direct',                   // 直接
  INDIRECT = 'indirect'                // 间接
}

/**
 * 学习偏好类型
 */
export enum LearningPreference {
  VISUAL = 'visual',                   // 视觉型
  AUDITORY = 'auditory',               // 听觉型
  KINESTHETIC = 'kinesthetic',         // 动觉型
  READING = 'reading',                 // 阅读型
  EXPERIENTIAL = 'experiential'       // 体验型
}

/**
 * 行为数据类型
 */
export interface BehaviorData {
  /** 行为ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 行为类型 */
  type: string;
  /** 行为内容 */
  content: string;
  /** 上下文信息 */
  context?: Record<string, any>;
  /** 时间戳 */
  timestamp: Date;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 特质维度数据
 */
export interface TraitDimension {
  /** 数值（0-1）或字符串类型值 */
  value: number | string;
  /** 标签 */
  label: string;
  /** 置信度 */
  confidence: number;
  /** 证据列表 */
  evidence: string[];
}

/**
 * 人格画像接口
 */
export interface IPersonalityProfile {
  /** 画像ID */
  profileId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 版本号 */
  version: number;
  /** 置信度得分 */
  confidenceScore: number;
  /** 隐私设置 */
  privacySettings: PrivacySettings;
  /** 五维画像数据 */
  dimensions: PersonalityDimensions;
  /** 稳定特质 */
  stableTraits: string[];
  /** 画像演变历史 */
  evolutionHistory: ProfileEvolution[];
}

/**
 * 五维画像维度数据
 */
export interface PersonalityDimensions {
  /** 人格特征 */
  personality: {
    dimensions: Record<TraitType, TraitDimension>;
    stableTraits: string[];
  };
  /** 视角偏好 */
  perspective: {
    dimensions: {
      decisionStyle: TraitDimension;
      informationProcessing: TraitDimension;
      authorityOrientation: TraitDimension;
    };
    preferredFormats: string[];
    avoidFormats: string[];
  };
  /** 世界观 */
  worldview: {
    dimensions: {
      causalityBelief: TraitDimension & { value: string };
      systemComplexity: TraitDimension & { value: string };
      temporalOrientation: TraitDimension & { value: string };
    };
    coreBeliefs: string[];
  };
  /** 价值观 */
  values: {
    valueHierarchy: ValueHierarchy;
    bottomLinePrinciples: string[];
    tradeOffPatterns: Record<string, string>;
    confidence: number;
  };
  /** 人生观 */
  lifePhilosophy: {
    dimensions: {
      goalOrientation: {
        primaryGoals: string[];
        confidence: number;
      };
      timeValue: TraitDimension & { value: string };
      meaningPursuit: TraitDimension & { value: string };
      workStyle: {
        collaborationPreference: string;
        autonomyNeed: string;
        feedbackFrequency: string;
      };
    };
    confidence: number;
  };
}

/**
 * 价值层级结构
 */
export interface ValueHierarchy {
  priority1?: { value: string; weight: number; evidence: string };
  priority2?: { value: string; weight: number; evidence: string };
  priority3?: { value: string; weight: number; evidence: string };
  priority4?: { value: string; weight: number; evidence: string };
  priority5?: { value: string; weight: number; evidence: string };
}

/**
 * 隐私设置
 */
export interface PrivacySettings {
  /** 不蒸馏的话题 */
  noDistillTopics: string[];
  /** 蒸馏级别 */
  distillLevel: 'minimal' | 'standard' | 'comprehensive';
}

/**
 * 画像演变记录
 */
export interface ProfileEvolution {
  /** 版本 */
  version: number;
  /** 时间戳 */
  timestamp: Date;
  /** 触发原因 */
  trigger: string;
  /** 变更内容 */
  changes: Record<string, any>;
}

/**
 * 行为分析结果
 */
export interface BehaviorAnalysisResult {
  /** 分析ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 分析时间 */
  analyzedAt: Date;
  /** 识别的模式 */
  patterns: BehaviorPattern[];
  /** 提取的特质 */
  extractedTraits: ExtractedTrait[];
  /** 置信度 */
  confidence: number;
}

/**
 * 行为模式
 */
export interface BehaviorPattern {
  /** 模式ID */
  patternId: string;
  /** 模式类型 */
  type: string;
  /** 模式描述 */
  description: string;
  /** 出现频率 */
  frequency: number;
  /** 相关行为ID列表 */
  relatedBehaviorIds: string[];
  /** 置信度 */
  confidence: number;
}

/**
 * 提取的特质
 */
export interface ExtractedTrait {
  /** 特质类型 */
  type: TraitType;
  /** 特质值 */
  value: number | string;
  /** 标签 */
  label: string;
  /** 置信度 */
  confidence: number;
  /** 证据 */
  evidence: string[];
  /** 来源行为 */
  sourceBehaviorIds: string[];
}

/**
 * 人格快照
 */
export interface PersonalitySnapshot {
  /** 快照ID */
  snapshotId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 创建时间 */
  createdAt: Date;
  /** 快照类型 */
  type: 'full' | 'incremental' | 'milestone';
  /** 快照数据 */
  data: Partial<IPersonalityProfile>;
  /** 标签 */
  tags?: string[];
}

/**
 * 人格报告
 */
export interface PersonalityReport {
  /** 报告ID */
  reportId: string;
  /** 用户ID */
  userId: string;
  /** 生成时间 */
  generatedAt: Date;
  /** 报告类型 */
  type: 'summary' | 'detailed' | 'comparison';
  /** 报告内容 */
  content: ReportContent;
  /** 建议 */
  suggestions?: string[];
}

/**
 * 报告内容
 */
export interface ReportContent {
  /** 概要 */
  summary: string;
  /** 维度分析 */
  dimensionAnalysis: Record<string, string>;
  /** 关键发现 */
  keyFindings: string[];
  /** 置信度评估 */
  confidenceAssessment: {
    overall: number;
    byDimension: Record<string, number>;
  };
}

/**
 * 人格系统配置
 */
export interface PersonalitySystemConfig {
  /** 数据库适配器配置 */
  databaseAdapter: any;
  /** 向量数据库适配器配置 */
  vectorDbAdapter: any;
  /** LLM适配器配置 */
  llmAdapter: any;
  /** 置信度阈值 */
  confidenceThreshold: number;
  /** 最大证据数量 */
  maxEvidenceCount: number;
  /** 更新频率限制（毫秒） */
  updateFrequencyLimit: number;
  /** 是否启用快照 */
  enableSnapshot: boolean;
  /** 快照保留天数 */
  snapshotRetentionDays: number;
}

/**
 * 人格系统事件类型
 */
export enum PersonalitySystemEvent {
  PERSONALITY_UPDATED = 'personality:updated',
  TRAIT_EXTRACTED = 'trait:extracted',
  SNAPSHOT_CREATED = 'snapshot:created',
  VALIDATION_FAILED = 'validation:failed',
  PATTERN_DETECTED = 'pattern:detected'
}

/**
 * 人格系统接口
 */
export interface IPersonalitySystem extends EventEmitter {
  /**
   * 初始化人格系统
   * @param config 系统配置
   */
  initialize(config: PersonalitySystemConfig): Promise<void>;

  /**
   * 获取用户人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 人格画像
   */
  getPersonalityProfile(userId: string, tenantId: string): Promise<IPersonalityProfile | null>;

  /**
   * 创建新的人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param initialData 初始数据
   * @returns 创建的人格画像
   */
  createPersonalityProfile(
    userId: string,
    tenantId: string,
    initialData?: Partial<IPersonalityProfile>
  ): Promise<IPersonalityProfile>;

  /**
   * 更新人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param updates 更新内容
   * @returns 更新后的人格画像
   */
  updatePersonalityProfile(
    userId: string,
    tenantId: string,
    updates: Partial<IPersonalityProfile>
  ): Promise<IPersonalityProfile>;

  /**
   * 添加行为数据
   * @param behavior 行为数据
   */
  addBehavior(behavior: BehaviorData): Promise<void>;

  /**
   * 批量添加行为数据
   * @param behaviors 行为数据列表
   */
  addBehaviors(behaviors: BehaviorData[]): Promise<void>;

  /**
   * 分析行为数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 分析结果
   */
  analyzeBehaviors(userId: string, tenantId: string): Promise<BehaviorAnalysisResult>;

  /**
   * 提取人格特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 提取的特质列表
   */
  extractTraits(userId: string, tenantId: string): Promise<ExtractedTrait[]>;

  /**
   * 验证人格一致性
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 是否一致
   */
  validatePersonality(userId: string, tenantId: string): Promise<boolean>;

  /**
   * 创建人格快照
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param type 快照类型
   * @param tags 标签
   * @returns 快照
   */
  createSnapshot(
    userId: string,
    tenantId: string,
    type: 'full' | 'incremental' | 'milestone',
    tags?: string[]
  ): Promise<PersonalitySnapshot>;

  /**
   * 获取人格快照
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param snapshotId 快照ID
   * @returns 快照
   */
  getSnapshot(userId: string, tenantId: string, snapshotId: string): Promise<PersonalitySnapshot | null>;

  /**
   * 生成人格报告
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param type 报告类型
   * @returns 报告
   */
  generateReport(
    userId: string,
    tenantId: string,
    type: 'summary' | 'detailed' | 'comparison'
  ): Promise<PersonalityReport>;

  /**
   * 获取演变历史
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 演变历史
   */
  getEvolutionHistory(userId: string, tenantId: string): Promise<ProfileEvolution[]>;

  /**
   * 导出人格数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 导出的数据
   */
  exportPersonalityData(userId: string, tenantId: string): Promise<Record<string, any>>;

  /**
   * 销毁人格系统
   */
  destroy(): Promise<void>;
}

/**
 * 人格模型接口
 */
export interface IPersonalityModel {
  /**
   * 获取画像数据
   */
  getProfile(): IPersonalityProfile | null;

  /**
   * 更新画像数据
   * @param updates 更新内容
   */
  updateProfile(updates: Partial<IPersonalityProfile>): void;

  /**
   * 获取特定维度数据
   * @param dimension 维度类型
   */
  getDimension(dimension: PersonalityDimension): any;

  /**
   * 更新特定维度数据
   * @param dimension 维度类型
   * @param data 维度数据
   */
  updateDimension(dimension: PersonalityDimension, data: any): void;

  /**
   * 计算画像相似度
   * @param other 另一个画像
   * @returns 相似度分数
   */
  calculateSimilarity(other: IPersonalityModel): number;

  /**
   * 序列化数据
   */
  serialize(): Record<string, any>;

  /**
   * 反序列化数据
   * @param data 序列化数据
   */
  deserialize(data: Record<string, any>): void;
}

/**
 * 人格蒸馏器接口
 */
export interface IPersonalityDistiller {
  /**
   * 从行为数据蒸馏人格特质
   * @param behaviors 行为数据列表
   * @param userId 用户ID
   * @returns 提取的特质列表
   */
  distillTraits(behaviors: BehaviorData[], userId: string): Promise<ExtractedTrait[]>;

  /**
   * 从特质生成人格画像
   * @param traits 特质列表
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 人格画像
   */
  generateProfile(
    traits: ExtractedTrait[],
    userId: string,
    tenantId: string
  ): Promise<IPersonalityProfile>;

  /**
   * 增量更新人格画像
   * @param currentProfile 当前画像
   * @param newTraits 新特质
   * @returns 更新后的画像
   */
  updateProfile(
    currentProfile: IPersonalityProfile,
    newTraits: ExtractedTrait[]
  ): Promise<IPersonalityProfile>;

  /**
   * 验证蒸馏结果
   * @param traits 特质列表
   * @returns 是否有效
   */
  validateDistillation(traits: ExtractedTrait[]): boolean;
}

/**
 * 人格更新器接口
 */
export interface IPersonalityUpdater {
  /**
   * 执行渐进式更新
   * @param profile 当前画像
   * @param newData 新数据
   * @returns 更新后的画像
   */
  performIncrementalUpdate(
    profile: IPersonalityProfile,
    newData: Partial<IPersonalityProfile>
  ): Promise<IPersonalityProfile>;

  /**
   * 合并特质
   * @param existingTraits 现有特质
   * @param newTraits 新特质
   * @returns 合并后的特质
   */
  mergeTraits(
    existingTraits: ExtractedTrait[],
    newTraits: ExtractedTrait[]
  ): ExtractedTrait[];

  /**
   * 计算更新权重
   * @param currentConfidence 当前置信度
   * @param newConfidence 新置信度
   * @returns 更新权重
   */
  calculateUpdateWeight(currentConfidence: number, newConfidence: number): number;

  /**
   * 回滚到指定版本
   * @param userId 用户ID
   * @param version 版本号
   * @returns 回滚后的画像
   */
  rollbackToVersion(userId: string, version: number): Promise<IPersonalityProfile | null>;
}
