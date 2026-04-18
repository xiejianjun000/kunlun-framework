/**
 * Context Engine - 核心类型定义
 * Context Engine Core Type Definitions
 * 
 * 定义上下文引擎所需的所有类型、接口和枚举
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

// ============== 基础类型定义 ==============

/**
 * 对话请求接口
 */
export interface ConversationRequest {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId?: string;
  /** 用户消息 */
  message: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** Token预算限制 */
  tokenBudget?: number;
  /** 对话历史 */
  history?: ConversationMessage[];
  /** 会话ID */
  sessionId?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 意图标签（可选，用于加速检索） */
  intentTags?: string[];
  /** 优先级（1-10，10最高） */
  priority?: number;
}

/**
 * 对话消息
 */
export interface ConversationMessage {
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

// ============== 上下文来源类型 ==============

/**
 * 上下文来源枚举
 */
export enum ContextSource {
  /** 记忆系统 */
  MEMORY = 'memory',
  /** 技能系统 */
  SKILL = 'skill',
  /** 人格系统 */
  PERSONALITY = 'personality',
  /** 知识库 */
  KNOWLEDGE = 'knowledge',
  /** 系统配置 */
  SYSTEM = 'system',
  /** 对话历史 */
  HISTORY = 'history',
}

/**
 * 上下文优先级
 */
export enum ContextPriority {
  /** 最高 - 关键任务指令 */
  CRITICAL = 100,
  /** 高 - 用户明确偏好 */
  HIGH = 80,
  /** 中 - 相关记忆和知识 */
  MEDIUM = 60,
  /** 低 - 扩展上下文 */
  LOW = 40,
  /** 最低 - 补充信息 */
  MINIMAL = 20,
}

// ============== 记忆上下文 ==============

/**
 * 记忆上下文条目
 */
export interface MemoryContext {
  /** 记忆ID */
  id: string;
  /** 记忆内容 */
  content: string;
  /** 记忆类型 */
  type: string;
  /** 相关性评分 (0-1) */
  relevanceScore: number;
  /** 重要性评分 (0-1) */
  importanceScore: number;
  /** 优先级 */
  priority: ContextPriority;
  /** 来源层级 */
  source: ContextSource;
  /** 时间衰减因子 */
  timeDecay?: number;
  /** 访问频率 */
  accessCount?: number;
  /** 关联标签 */
  tags?: string[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt?: Date;
  /** Token估算 */
  estimatedTokens?: number;
}

/**
 * 记忆搜索选项
 */
export interface MemorySearchOptions {
  /** 搜索查询 */
  query: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId?: string;
  /** 最大返回数量 */
  limit?: number;
  /** 最小相关性阈值 */
  minRelevance?: number;
  /** 记忆类型过滤 */
  types?: string[];
  /** 标签过滤 */
  tags?: string[];
  /** 时间范围 */
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  /** 排序方式 */
  sortBy?: 'relevance' | 'importance' | 'recency';
}

// ============== 技能上下文 ==============

/**
 * 技能上下文条目
 */
export interface SkillContext {
  /** 技能ID */
  id: string;
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 匹配度评分 (0-1) */
  matchScore: number;
  /** 优先级 */
  priority: ContextPriority;
  /** 来源 */
  source: ContextSource;
  /** 触发条件 */
  triggerConditions?: string[];
  /** 输入模式 */
  inputPatterns?: string[];
  /** 输出模式 */
  outputFormat?: string;
  /** 技能内容/提示词 */
  content?: string;
  /** 参数模式 */
  parameters?: SkillParameter[];
  /** 使用次数统计 */
  usageCount?: number;
  /** 最后使用时间 */
  lastUsedAt?: Date;
  /** Token估算 */
  estimatedTokens?: number;
}

/**
 * 技能参数
 */
export interface SkillParameter {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 参数描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: unknown;
  /** 参数示例 */
  example?: unknown;
}

// ============== 人格上下文 ==============

/**
 * 人格上下文
 */
export interface PersonalityContext {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId?: string;
  /** 五维画像数据 */
  dimensions: PersonalityDimensions;
  /** 沟通风格 */
  communicationStyle: CommunicationStyle;
  /** 学习偏好 */
  learningPreference?: LearningPreference;
  /** 专业领域 */
  expertise?: string[];
  /** 偏好设置 */
  preferences: UserPreferences;
  /** 行为模式 */
  behaviorPatterns?: BehaviorPattern[];
  /** 上下文来源 */
  source: ContextSource;
  /** Token估算 */
  estimatedTokens?: number;
  /** 最后更新时间 */
  updatedAt?: Date;
}

/**
 * 五维画像维度
 */
export interface PersonalityDimensions {
  /** 人格特征 (0-1, 0=内向, 1=外向) */
  personality?: number;
  /** 视角偏好 (0-1, 0=保守, 1=开放) */
  perspective?: number;
  /** 世界观 (0-1) */
  worldview?: number;
  /** 价值观 (0-1) */
  values?: number;
  /** 人生观 (0-1) */
  lifePhilosophy?: number;
}

/**
 * 沟通风格
 */
export enum CommunicationStyle {
  FORMAL = 'formal',                 // 正式
  CASUAL = 'casual',                 // 随意
  TECHNICAL = 'technical',           // 技术性
  EMOTIONAL = 'emotional',           // 情感性
  DIRECT = 'direct',                 // 直接
  INDIRECT = 'indirect',             // 间接
  HUMOROUS = 'humorous',             // 幽默
  SERIOUS = 'serious',               // 严肃
}

/**
 * 学习偏好
 */
export enum LearningPreference {
  VISUAL = 'visual',                 // 视觉型
  AUDITORY = 'auditory',             // 听觉型
  KINESTHETIC = 'kinesthetic',       // 动觉型
  READING = 'reading',               // 阅读型
  EXPERIENTIAL = 'experiential',     // 体验型
}

/**
 * 用户偏好
 */
export interface UserPreferences {
  /** 语言偏好 */
  language?: string;
  /** 响应风格 */
  responseStyle?: 'concise' | 'detailed' | 'balanced';
  /** 格式化偏好 */
  formatting?: 'markdown' | 'plain' | 'html';
  /** 时区 */
  timezone?: string;
  /** 通知偏好 */
  notifications?: NotificationPreferences;
}

/**
 * 通知偏好
 */
export interface NotificationPreferences {
  /** 邮件通知 */
  email?: boolean;
  /** 推送通知 */
  push?: boolean;
  /** 通知时段 */
  quietHours?: {
    start: string;
    end: string;
  };
}

/**
 * 行为模式
 */
export interface BehaviorPattern {
  /** 模式类型 */
  type: string;
  /** 出现次数 */
  occurrences: number;
  /** 最后出现时间 */
  lastSeen: Date;
  /** 上下文 */
  context: string;
}

// ============== 组装上下文 ==============

/**
 * 原始扫描上下文
 */
export interface RawContext {
  /** 记忆上下文列表 */
  memory: MemoryContext[];
  /** 技能上下文列表 */
  skills: SkillContext[];
  /** 人格上下文 */
  personality: PersonalityContext | null;
  /** 知识库上下文 */
  knowledge?: KnowledgeContext[];
  /** 系统配置上下文 */
  system?: SystemContext | null;
  /** 对话历史上下文 */
  history?: HistoryContext[];
}

/**
 * 已组装的上下文
 */
export interface AssembledContext {
  /** 上下文ID */
  id: string;
  /** 原始请求 */
  request: ConversationRequest;
  /** 记忆条目 */
  memories: MemoryContext[];
  /** 技能条目 */
  skills: SkillContext[];
  /** 人格上下文 */
  personality: PersonalityContext | null;
  /** 知识库条目 */
  knowledge: KnowledgeContext[];
  /** 系统配置 */
  system: SystemContext | null;
  /** 历史上下文 */
  history: HistoryContext[];
  /** 总Token估算 */
  totalTokens: number;
  /** 各部分Token分配 */
  tokenAllocation: TokenAllocation;
  /** 组装元数据 */
  metadata: AssembledContextMetadata;
}

/**
 * Token分配
 */
export interface TokenAllocation {
  /** 系统提示词 */
  systemPrompt: number;
  /** 记忆上下文 */
  memory: number;
  /** 技能上下文 */
  skills: number;
  /** 人格上下文 */
  personality: number;
  /** 知识库上下文 */
  knowledge: number;
  /** 历史上下文 */
  history: number;
  /** 预留空间 */
  reserved: number;
}

/**
 * 组装上下文元数据
 */
export interface AssembledContextMetadata {
  /** 扫描时间 */
  scannedAt: Date;
  /** 扫描耗时(ms) */
  scanDuration?: number;
  /** 组装耗时(ms) */
  assembleDuration?: number;
  /** 优化次数 */
  optimizationPasses?: number;
  /** 截断发生 */
  truncationOccurred?: boolean;
  /** 使用的来源 */
  sourcesUsed: ContextSource[];
}

// ============== 知识库上下文 ==============

/**
 * 知识库上下文条目
 */
export interface KnowledgeContext {
  /** 知识ID */
  id: string;
  /** 知识标题 */
  title: string;
  /** 知识内容 */
  content: string;
  /** 相关性评分 */
  relevanceScore: number;
  /** 优先级 */
  priority: ContextPriority;
  /** 来源 */
  source: ContextSource;
  /** 来源类型 */
  sourceType?: 'document' | 'faq' | 'rule' | 'case';
  /** 分类 */
  category?: string;
  /** Token估算 */
  estimatedTokens?: number;
}

// ============== 系统上下文 ==============

/**
 * 系统上下文
 */
export interface SystemContext {
  /** 系统名称 */
  systemName: string;
  /** 系统版本 */
  version?: string;
  /** 当前时间 */
  currentTime: Date;
  /** 时区 */
  timezone?: string;
  /** 环境变量 */
  environment?: 'development' | 'staging' | 'production';
  /** 功能开关 */
  featureFlags?: Record<string, boolean>;
  /** 系统限制 */
  limits?: SystemLimits;
}

/**
 * 系统限制
 */
export interface SystemLimits {
  /** 最大Token数 */
  maxTokens?: number;
  /** 最大请求频率 */
  maxRequestsPerMinute?: number;
  /** 最大并发数 */
  maxConcurrent?: number;
}

// ============== 历史上下文 ==============

/**
 * 历史上下文条目
 */
export interface HistoryContext {
  /** 消息索引 */
  index: number;
  /** 角色 */
  role: 'user' | 'assistant' | 'system';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
  /** 相关性评分 */
  relevanceScore?: number;
}

// ============== 注入策略 ==============

/**
 * 注入策略枚举
 */
export enum InjectionStrategy {
  /** 顺序注入 - 按优先级顺序追加 */
  SEQUENTIAL = 'sequential',
  /** 分块注入 - 将上下文分成独立块 */
  CHUNKED = 'chunked',
  /** 插值注入 - 在系统提示词中插入占位符 */
  INTERPOLATED = 'interpolated',
  /** 分层注入 - 按层级组织 */
  HIERARCHICAL = 'hierarchical',
  /** 压缩注入 - 使用特殊标记压缩 */
  COMPRESSED = 'compressed',
}

/**
 * 注入结果
 */
export interface InjectionResult {
  /** 注入后的提示词 */
  prompt: string;
  /** 实际Token数 */
  actualTokens: number;
  /** 注入的上下文ID列表 */
  injectedIds: string[];
  /** 是否截断 */
  truncated: boolean;
  /** 截断原因 */
  truncationReason?: string;
}

// ============== 处理结果 ==============

/**
 * 处理后的上下文
 */
export interface ProcessedContext {
  /** 最终提示词 */
  prompt: string;
  /** 组装后的上下文 */
  context: AssembledContext;
  /** 注入结果 */
  injection: InjectionResult;
  /** 处理统计 */
  stats: ProcessingStats;
}

/**
 * 处理统计
 */
export interface ProcessingStats {
  /** 总处理时间(ms) */
  totalTime: number;
  /** 扫描耗时 */
  scanTime: number;
  /** 组装耗时 */
  assembleTime: number;
  /** 注入耗时 */
  injectionTime: number;
  /** 扫描到的记忆数量 */
  memoriesFound: number;
  /** 扫描到的技能数量 */
  skillsFound: number;
  /** 最终使用的Token数 */
  tokensUsed: number;
  /** Token预算使用率 */
  tokenBudgetUsage: number;
}

// ============== 配置类型 ==============

/**
 * ContextEngine配置
 */
export interface ContextEngineConfig {
  /** 默认Token预算 */
  defaultTokenBudget?: number;
  /** 最大Token预算 */
  maxTokenBudget?: number;
  /** 记忆搜索限制 */
  memorySearchLimit?: number;
  /** 技能搜索限制 */
  skillSearchLimit?: number;
  /** 最小相关性阈值 */
  minRelevanceThreshold?: number;
  /** 默认注入策略 */
  defaultInjectionStrategy?: InjectionStrategy;
  /** 优先级权重配置 */
  priorityWeights?: PriorityWeights;
  /** 是否启用人格上下文 */
  enablePersonality?: boolean;
  /** 是否启用知识库 */
  enableKnowledge?: boolean;
  /** 是否启用历史上下文 */
  enableHistory?: boolean;
  /** 历史消息保留数量 */
  historyMessageLimit?: number;
}

/**
 * 优先级权重配置
 */
export interface PriorityWeights {
  /** 记忆权重 */
  memory: number;
  /** 技能权重 */
  skill: number;
  /** 人格权重 */
  personality: number;
  /** 知识权重 */
  knowledge: number;
  /** 历史权重 */
  history: number;
}

// ============== 扫描器接口 ==============

/**
 * 记忆系统接口
 */
export interface IMemorySystem {
  /** 搜索记忆 */
  search(options: MemorySearchOptions): Promise<MemoryContext[]>;
  /** 获取记忆 */
  get(id: string): Promise<MemoryContext | null>;
  /** 记录记忆访问 */
  recordAccess(id: string): Promise<void>;
}

/**
 * 技能系统接口
 */
export interface ISkillSystem {
  /** 匹配技能 */
  match(query: string, userId: string): Promise<SkillContext[]>;
  /** 获取技能 */
  get(id: string): Promise<SkillContext | null>;
}

/**
 * 人格系统接口
 */
export interface IPersonalitySystem {
  /** 获取用户画像 */
  getProfile(userId: string, tenantId?: string): Promise<PersonalityContext | null>;
  /** 更新画像 */
  updateProfile(profile: Partial<PersonalityContext>): Promise<void>;
}

/**
 * 知识库接口
 */
export interface IKnowledgeBase {
  /** 搜索知识 */
  search(query: string, userId?: string): Promise<KnowledgeContext[]>;
  /** 获取知识 */
  get(id: string): Promise<KnowledgeContext | null>;
}

// ============== 工具函数 ==============

/**
 * 计算Token估算（简单实现，实际应使用tokenizer）
 */
export function estimateTokens(text: string): number {
  // 中英文混合的粗略估算
  // 实际项目中应使用专业的tokenizer
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const otherChars = text.length - chineseChars - englishWords;
  
  // 简单估算：中文每个字符约1.5 token，英文每个词约1.3 token
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 1);
}

/**
 * 根据优先级排序
 */
export function sortByPriority<T extends { priority: ContextPriority }>(
  items: T[],
  ascending = false
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a.priority;
    const bVal = b.priority;
    return ascending ? aVal - bVal : bVal - aVal;
  });
}

/**
 * 计算时间衰减因子
 */
export function calculateTimeDecay(
  createdAt: Date,
  halfLifeDays = 7
): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, diffDays / halfLifeDays);
}
