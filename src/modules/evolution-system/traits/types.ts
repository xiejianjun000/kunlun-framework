/**
 * 特质类型定义
 * Trait Types Definition
 */

/** 特质值 */
export interface TraitValue {
  /** 数值 */
  value: number;
  /** 置信度 */
  confidence: number;
}

/** 特质对象 */
export interface Trait {
  /** 特质名称 */
  name: string;
  /** 类别 */
  category: TraitCategory;
  /** 值 */
  value: number;
  /** 置信度 */
  confidence: number;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 描述 */
  description?: string;
  /** 历史值 */
  history?: Array<{ value: number; timestamp: Date }>;
}

/** 特质类别 */
export enum TraitCategory {
  PERSONALITY = 'personality',     // 人格特质
  PREFERENCE = 'preference',       // 偏好特质
  SKILL = 'skill',                 // 技能特质
  BEHAVIOR = 'behavior',           // 行为特质
  GOAL = 'goal',                   // 目标特质
  VALUE = 'value',                 // 价值特质
}

/** 特质变异 */
export interface TraitMutation {
  /** 特质名称 */
  traitName: string;
  /** 变异类型 */
  mutationType: TraitMutationType;
  /** 旧值 */
  oldValue: number;
  /** 新值 */
  newValue: number;
  /** 变异强度 */
  strength: number;
  /** 变异方向 */
  direction: 'increase' | 'decrease' | 'oscillate';
}

/** 特质变异类型 */
export enum TraitMutationType {
  GAUSSIAN = 'gaussian',           // 高斯变异
  UNIFORM = 'uniform',             // 均匀变异
  BOUNDED = 'bounded',             // 有界变异
  POLYNOMIAL = 'polynomial',       // 多项式变异
  ADAPTIVE = 'adaptive',           // 自适应变异
}

/** 特质约束 */
export interface TraitConstraint {
  /** 特质名称 */
  traitName: string;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 是否严格 */
  strict: boolean;
  /** 自定义验证函数 */
  validator?: (value: number) => boolean;
}

/** 特质验证结果 */
export interface TraitValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误消息 */
  errors: string[];
  /** 修正后的值 */
  correctedValue?: number;
}

/** 特质变化历史 */
export interface TraitChangeRecord {
  /** 记录ID */
  recordId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 特质名称 */
  traitName: string;
  /** 旧值 */
  oldValue: number;
  /** 新值 */
  newValue: number;
  /** 变化量 */
  delta: number;
  /** 变化原因 */
  reason: string;
  /** 变化时间 */
  changedAt: Date;
  /** 关联的进化ID */
  evolutionId?: string;
}

/** 五维画像 */
export interface FiveDimensionalProfile {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 版本 */
  version: number;
  /** 置信度分数 */
  confidenceScore: number;

  /** 人格维度 */
  personality: PersonalityTraits;
  /** 视角偏好 */
  perspective: PerspectiveTraits;
  /** 世界观 */
  worldview: WorldviewTraits;
  /** 价值观 */
  values: ValueTraits;
  /** 行为模式 */
  behavior: BehaviorTraits;
}

/** 人格特质 */
export interface PersonalityTraits {
  /** 外向-内向 */
  extraversion_introversion: TraitValue;
  /** 开放-保守 */
  openness_conservatism: TraitValue;
  /** 理性-情感 */
  rationality_emotion: TraitValue;
  /** 风险偏好 */
  risk_tolerance: TraitValue;
  /** 稳定特质列表 */
  stable_traits: string[];
}

/** 视角偏好 */
export interface PerspectiveTraits {
  /** 决策风格 */
  decision_style: TraitValue;
  /** 信息处理方式 */
  information_processing: TraitValue;
  /** 权威导向 */
  authority_orientation: TraitValue;
  /** 偏好格式 */
  preferred_formats: string[];
  /** 避免格式 */
  avoid_formats: string[];
}

/** 世界观特质 */
export interface WorldviewTraits {
  /** 因果观 */
  causality_belief: TraitValue;
  /** 系统复杂性认知 */
  system_complexity: TraitValue;
  /** 时间导向 */
  temporal_orientation: TraitValue;
  /** 核心信念 */
  core_beliefs: string[];
}

/** 价值特质 */
export interface ValueTraits {
  /** 价值层级 */
  value_hierarchy: ValueHierarchy[];
  /** 优先级标签 */
  priority_labels: string[];
}

/** 价值层级 */
export interface ValueHierarchy {
  /** 优先级 */
  priority: number;
  /** 价值名称 */
  value: string;
  /** 权重 */
  weight: number;
  /** 证据 */
  evidence: string[];
}

/** 行为特质 */
export interface BehaviorTraits {
  /** 行为模式列表 */
  patterns: string[];
  /** 习惯列表 */
  habits: string[];
  /** 偏好交互方式 */
  interaction_preferences: string[];
  /** 典型场景 */
  typical_scenarios: string[];
}
