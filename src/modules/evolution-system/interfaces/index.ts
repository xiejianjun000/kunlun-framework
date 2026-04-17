/**
 * 进化系统接口定义
 * Evolution System Interfaces
 */

import { EventEmitter } from 'events';

// ============== 基础类型定义 ==============

/** 进化方向枚举 */
export enum EvolutionDirection {
  EXPLORATION = 'exploration',   // 探索性进化
  EXPLOITATION = 'exploitation',  // 利用性进化
  BALANCED = 'balanced',          // 平衡型
}

/** 进化状态枚举 */
export enum EvolutionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** 进化触发类型枚举 */
export enum EvolutionTriggerType {
  MANUAL = 'manual',             // 手动触发
  SCHEDULED = 'scheduled',       // 定时触发
  EVENT_BASED = 'event_based',   // 事件触发
  THRESHOLD = 'threshold',        // 阈值触发
  PERIODIC = 'periodic',          // 周期性触发
}

/** 进化结果 */
export interface EvolutionResult {
  /** 进化ID */
  evolutionId: string;
  /** 是否成功 */
  success: boolean;
  /** 适应度分数 */
  fitnessScore: number;
  /** 改进幅度 */
  improvement: number;
  /** 变异内容 */
  mutations: EvolutionMutation[];
  /** 执行时间(ms) */
  executionTime: number;
  /** 错误信息 */
  error?: string;
  /** 详情 */
  details?: Record<string, unknown>;
}

/** 进化变异 */
export interface EvolutionMutation {
  /** 变异ID */
  mutationId: string;
  /** 变异类型 */
  type: MutationType;
  /** 变异路径 */
  path: string;
  /** 旧值 */
  oldValue: unknown;
  /** 新值 */
  newValue: unknown;
  /** 变异强度 */
  strength: number;
  /** 验证状态 */
  validated: boolean;
}

/** 变异类型 */
export enum MutationType {
  TRAIT = 'trait',               // 特质变异
  BEHAVIOR = 'behavior',         // 行为变异
  STRATEGY = 'strategy',         // 策略变异
  PARAMETER = 'parameter',       // 参数变异
  RULE = 'rule',                 // 规则变异
}

/** 进化历史记录 */
export interface EvolutionHistoryRecord {
  /** 记录ID */
  recordId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 进化ID */
  evolutionId: string;
  /** 触发类型 */
  triggerType: EvolutionTriggerType;
  /** 触发时间 */
  triggeredAt: Date;
  /** 开始时间 */
  startedAt: Date;
  /** 结束时间 */
  completedAt?: Date;
  /** 进化状态 */
  status: EvolutionStatus;
  /** 适应度分数 */
  fitnessScore: number;
  /** 适应度变化 */
  fitnessDelta: number;
  /** 变异数量 */
  mutationCount: number;
  /** 奖励详情 */
  rewards: RewardBreakdown;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/** 奖励明细 */
export interface RewardBreakdown {
  /** 任务成功奖励 */
  taskSuccess: number;
  /** 用户反馈奖励 */
  userFeedback: number;
  /** 进化性奖励 */
  evolutionary: number;
  /** 惩罚项 */
  penalties: number;
  /** 总奖励 */
  total: number;
}

/** 进化上下文 */
export interface EvolutionContext {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 当前适应度 */
  currentFitness: number;
  /** 目标适应度 */
  targetFitness?: number;
  /** 进化方向 */
  direction: EvolutionDirection;
  /** 约束条件 */
  constraints: EvolutionConstraint[];
  /** 历史记录数 */
  historyCount: number;
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/** 进化约束 */
export interface EvolutionConstraint {
  /** 约束ID */
  constraintId: string;
  /** 约束类型 */
  type: ConstraintType;
  /** 约束路径 */
  path: string;
  /** 约束值 */
  value: unknown;
  /** 是否严格 */
  strict: boolean;
  /** 错误消息 */
  message?: string;
}

/** 约束类型 */
export enum ConstraintType {
  RANGE = 'range',               // 范围约束
  ENUM = 'enum',                 // 枚举约束
  REQUIRED = 'required',         // 必填约束
  CUSTOM = 'custom',             // 自定义约束
}

/** 进化配置 */
export interface EvolutionConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 进化间隔(ms) */
  evolutionInterval: number;
  /** 最大变异数 */
  maxMutationsPerEvolution: number;
  /** 最小适应度阈值 */
  minFitnessThreshold: number;
  /** 最大适应度阈值 */
  maxFitnessThreshold: number;
  /** 变异概率 */
  mutationProbability: number;
  /** 交叉概率 */
  crossoverProbability: number;
  /** 精英比例 */
  eliteRatio: number;
  /** 群体大小 */
  populationSize: number;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 收敛阈值 */
  convergenceThreshold: number;
  /** 超时时间(ms) */
  timeout: number;
  /** 是否启用回滚 */
  rollbackEnabled: boolean;
  /** 回滚窗口(ms) */
  rollbackWindow: number;
}

/** 进化触发器接口 */
export interface IEvolutionTrigger {
  /** 触发器ID */
  id: string;
  /** 触发器类型 */
  type: EvolutionTriggerType;
  /** 是否启用 */
  enabled: boolean;
  
  /** 检查是否应该触发 */
  shouldTrigger(context: EvolutionContext): Promise<boolean>;
  /** 触发进化 */
  trigger(context: EvolutionContext): Promise<void>;
  /** 重置触发器状态 */
  reset(): void;
}

/** 进化系统接口 */
export interface IEvolutionSystem {
  /** 系统是否运行中 */
  isRunning(): boolean;
  
  /** 执行单次进化 */
  evolve(userId: string, tenantId: string, options?: EvolutionOptions): Promise<EvolutionResult>;
  
  /** 批量进化 */
  batchEvolve(userIds: string[], tenantId: string, options?: EvolutionOptions): Promise<EvolutionResult[]>;
  
  /** 获取进化历史 */
  getHistory(userId: string, tenantId: string, options?: HistoryQueryOptions): Promise<EvolutionHistoryRecord[]>;
  
  /** 获取当前适应度 */
  getCurrentFitness(userId: string, tenantId: string): Promise<number>;
  
  /** 获取进化状态 */
  getStatus(userId: string, tenantId: string): Promise<EvolutionStatus>;
  
  /** 暂停进化 */
  pause(userId: string, tenantId: string): Promise<void>;
  
  /** 恢复进化 */
  resume(userId: string, tenantId: string): Promise<void>;
  
  /** 回滚到指定版本 */
  rollback(userId: string, tenantId: string, versionId: string): Promise<boolean>;
  
  /** 获取可用版本 */
  getVersions(userId: string, tenantId: string): Promise<EvolutionVersion[]>;
  
  /** 获取分析报告 */
  getAnalysisReport(userId: string, tenantId: string): Promise<EvolutionAnalysisReport>;
  
  /** 添加奖励 */
  addReward(userId: string, tenantId: string, reward: Reward): Promise<void>;
  
  /** 获取奖励历史 */
  getRewardHistory(userId: string, tenantId: string): Promise<Reward[]>;
  
  /** 配置进化参数 */
  configureEvolution(userId: string, tenantId: string, config: Partial<EvolutionConfig>): Promise<void>;
  
  /** 获取当前配置 */
  getConfig(userId: string, tenantId: string): Promise<EvolutionConfig>;
  
  /** 导出进化数据 */
  exportData(userId: string, tenantId: string): Promise<EvolutionExportData>;
  
  /** 导入进化数据 */
  importData(userId: string, tenantId: string, data: EvolutionExportData): Promise<boolean>;
  
  /** 订阅进化事件 */
  on(event: EvolutionEventType, handler: (data: EvolutionEventData) => void): void;
  
  /** 取消订阅 */
  off(event: EvolutionEventType, handler: (data: EvolutionEventData) => void): void;
}

/** 进化选项 */
export interface EvolutionOptions {
  /** 进化方向 */
  direction?: EvolutionDirection;
  /** 目标适应度 */
  targetFitness?: number;
  /** 最大变异数 */
  maxMutations?: number;
  /** 强制执行 */
  force?: boolean;
  /** 触发类型 */
  triggerType?: EvolutionTriggerType;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 历史查询选项 */
export interface HistoryQueryOptions {
  /** 起始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
  /** 状态筛选 */
  status?: EvolutionStatus[];
  /** 最小适应度 */
  minFitness?: number;
  /** 最大适应度 */
  maxFitness?: number;
  /** 偏移量 */
  offset?: number;
  /** 限制数量 */
  limit?: number;
}

/** 进化版本 */
export interface EvolutionVersion {
  /** 版本ID */
  versionId: string;
  /** 版本号 */
  version: number;
  /** 创建时间 */
  createdAt: Date;
  /** 适应度分数 */
  fitnessScore: number;
  /** 描述 */
  description?: string;
}

/** 进化分析报告 */
export interface EvolutionAnalysisReport {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 生成时间 */
  generatedAt: Date;
  /** 总进化次数 */
  totalEvolutions: number;
  /** 成功率 */
  successRate: number;
  /** 平均适应度 */
  averageFitness: number;
  /** 适应度趋势 */
  fitnessTrend: FitnessTrendPoint[];
  /** 热门变异 */
  topMutations: MutationStats[];
  /** 奖励统计 */
  rewardStats: RewardStats;
  /** 性能指标 */
  performanceMetrics: PerformanceMetrics;
  /** 建议 */
  suggestions: string[];
}

/** 适应度趋势点 */
export interface FitnessTrendPoint {
  /** 时间戳 */
  timestamp: Date;
  /** 适应度分数 */
  fitness: number;
  /** 变化量 */
  delta: number;
}

/** 变异统计 */
export interface MutationStats {
  /** 变异类型 */
  type: MutationType;
  /** 次数 */
  count: number;
  /** 平均强度 */
  avgStrength: number;
  /** 成功率 */
  successRate: number;
}

/** 奖励统计 */
export interface RewardStats {
  /** 总奖励 */
  totalRewards: number;
  /** 平均奖励 */
  averageReward: number;
  /** 奖励来源分布 */
  rewardDistribution: Record<string, number>;
  /** 趋势 */
  trend: 'increasing' | 'decreasing' | 'stable';
}

/** 性能指标 */
export interface PerformanceMetrics {
  /** 平均执行时间(ms) */
  avgExecutionTime: number;
  /** 最短执行时间(ms) */
  minExecutionTime: number;
  /** 最长执行时间(ms) */
  maxExecutionTime: number;
  /** 平均变异数 */
  avgMutations: number;
}

/** 奖励 */
export interface Reward {
  /** 奖励ID */
  rewardId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 奖励类型 */
  type: RewardType;
  /** 奖励值 */
  value: number;
  /** 计算时间 */
  calculatedAt: Date;
  /** 详情 */
  details?: Record<string, unknown>;
}

/** 奖励类型 */
export enum RewardType {
  TASK_SUCCESS = 'task_success',
  USER_FEEDBACK_POSITIVE = 'user_feedback_positive',
  USER_FEEDBACK_NEGATIVE = 'user_feedback_negative',
  EXPLORATION_BONUS = 'exploration_bonus',
  CONSISTENCY_BONUS = 'consistency_bonus',
  IMPROVEMENT_BONUS = 'improvement_bonus',
  PENALTY_ERROR = 'penalty_error',
  PENALTY_REGRESSION = 'penalty_regression',
}

/** 导出数据结构 */
export interface EvolutionExportData {
  /** 导出版本 */
  version: string;
  /** 导出时间 */
  exportedAt: Date;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 适应度 */
  fitness: number;
  /** 配置 */
  config: EvolutionConfig;
  /** 历史记录 */
  history: EvolutionHistoryRecord[];
  /** 奖励记录 */
  rewards: Reward[];
  /** 特质数据 */
  traits: Record<string, unknown>;
}

/** 进化事件类型 */
export enum EvolutionEventType {
  EVOLUTION_START = 'evolution:start',
  EVOLUTION_COMPLETE = 'evolution:complete',
  EVOLUTION_FAILED = 'evolution:failed',
  EVOLUTION_PROGRESS = 'evolution:progress',
  MUTATION_APPLIED = 'mutation:applied',
  REWARD_ADDED = 'reward:added',
  VERSION_CREATED = 'version:created',
  ROLLBACK_COMPLETE = 'rollback:complete',
  FITNESS_IMPROVED = 'fitness:improved',
  FITNESS_REGRESSED = 'fitness:regressed',
}

/** 进化事件数据 */
export interface EvolutionEventData {
  /** 事件类型 */
  type: EvolutionEventType;
  /** 用户ID */
  userId?: string;
  /** 租户ID */
  tenantId?: string;
  /** 进化ID */
  evolutionId?: string;
  /** 数据 */
  data?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: Date;
}

/** 奖励模型接口 */
export interface IRewardModel {
  /** 计算奖励 */
  calculate(context: RewardContext): Promise<number>;
  /** 获取权重 */
  getWeight(): number;
  /** 验证奖励 */
  validate(reward: number): boolean;
}

/** 奖励计算上下文 */
export interface RewardContext {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 任务信息 */
  task?: TaskInfo;
  /** 用户反馈 */
  feedback?: FeedbackInfo;
  /** 进化历史 */
  evolutionHistory?: EvolutionHistoryRecord[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 任务信息 */
export interface TaskInfo {
  /** 任务ID */
  taskId: string;
  /** 任务类型 */
  type: string;
  /** 是否成功 */
  success: boolean;
  /** 完成时间 */
  completedAt?: Date;
  /** 质量评分 */
  qualityScore?: number;
  /** 效率评分 */
  efficiencyScore?: number;
}

/** 反馈信息 */
export interface FeedbackInfo {
  /** 反馈ID */
  feedbackId: string;
  /** 反馈类型 */
  type: FeedbackType;
  /** 评分(0-1) */
  rating: number;
  /** 反馈内容 */
  content?: string;
  /** 反馈时间 */
  providedAt: Date;
}

/** 反馈类型 */
export enum FeedbackType {
  EXPLICIT = 'explicit',       // 显式反馈
  IMPLICIT = 'implicit',        // 隐式反馈
  CORRECTION = 'correction',     // 纠正反馈
  APPROVAL = 'approval',        // 批准反馈
}

/** 进化策略接口 */
export interface IEvolutionStrategy {
  /** 策略ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  
  /** 执行进化 */
  execute(context: StrategyContext): Promise<StrategyResult>;
  
  /** 获取适用条件 */
  getApplicableConditions(): StrategyCondition[];
  
  /** 验证策略参数 */
  validateParams(params: Record<string, unknown>): boolean;
  
  /** 获取参数模式 */
  getParamSchema(): Record<string, unknown>;
}

/** 策略上下文 */
export interface StrategyContext {
  /** 当前状态 */
  currentState: Record<string, unknown>;
  /** 目标状态 */
  targetState?: Record<string, unknown>;
  /** 配置参数 */
  params: Record<string, unknown>;
  /** 约束条件 */
  constraints: EvolutionConstraint[];
  /** 历史记录 */
  history: EvolutionHistoryRecord[];
}

/** 策略结果 */
export interface StrategyResult {
  /** 是否成功 */
  success: boolean;
  /** 新状态 */
  newState: Record<string, unknown>;
  /** 变异列表 */
  mutations: EvolutionMutation[];
  /** 适应度变化 */
  fitnessDelta: number;
  /** 执行时间 */
  executionTime: number;
  /** 错误信息 */
  error?: string;
}

/** 策略条件 */
export interface StrategyCondition {
  /** 条件类型 */
  type: StrategyConditionType;
  /** 参数 */
  params: Record<string, unknown>;
}

/** 策略条件类型 */
export enum StrategyConditionType {
  FITNESS_THRESHOLD = 'fitness_threshold',
  HISTORY_LENGTH = 'history_length',
  TIME_BASED = 'time_based',
  MUTATION_COUNT = 'mutation_count',
  ERROR_RATE = 'error_rate',
}

/** 默认配置 */
export const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  enabled: true,
  evolutionInterval: 86400000,  // 24小时
  maxMutationsPerEvolution: 5,
  minFitnessThreshold: 0.0,
  maxFitnessThreshold: 1.0,
  mutationProbability: 0.1,
  crossoverProbability: 0.7,
  eliteRatio: 0.1,
  populationSize: 50,
  maxIterations: 100,
  convergenceThreshold: 0.001,
  timeout: 300000,  // 5分钟
  rollbackEnabled: true,
  rollbackWindow: 7200000,  // 2小时
};
