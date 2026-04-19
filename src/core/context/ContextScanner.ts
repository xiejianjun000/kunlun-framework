/**
 * ContextScanner - 上下文扫描器
 * Context Scanner - 扫描记忆、技能和人格上下文
 * 
 * 职责：
 * 1. 扫描相关记忆
 * 2. 扫描匹配技能
 * 3. 扫描人格画像
 * 4. 综合扫描所有上下文来源
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ConversationRequest,
  MemoryContext,
  SkillContext,
  PersonalityContext,
  KnowledgeContext,
  SystemContext,
  HistoryContext,
  RawContext,
  AssembledContext,
  AssembledContextMetadata,
  MemorySearchOptions,
  IMemorySystem,
  ISkillSystem,
  IPersonalitySystem,
  IKnowledgeBase,
  ContextEngineConfig,
  estimateTokens,
  ContextSource,
  ContextPriority,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ContextEngineConfig> = {
  defaultTokenBudget: 8000,
  maxTokenBudget: 128000,
  memorySearchLimit: 10,
  skillSearchLimit: 5,
  minRelevanceThreshold: 0.3,
  defaultInjectionStrategy: 'sequential' as any,
  priorityWeights: {
    memory: 0.3,
    skill: 0.25,
    personality: 0.15,
    knowledge: 0.2,
    history: 0.1,
  },
  enablePersonality: true,
  enableKnowledge: true,
  enableHistory: true,
  historyMessageLimit: 10,
};

/**
 * 扫描结果
 */
export interface ScanResult {
  /** 扫描到的记忆 */
  memories: MemoryContext[];
  /** 扫描到的技能 */
  skills: SkillContext[];
  /** 扫描到的人格 */
  personality: PersonalityContext | null;
  /** 扫描到的知识 */
  knowledge: KnowledgeContext[];
  /** 系统上下文 */
  system: SystemContext | null | undefined;
  /** 历史上下文 */
  history: HistoryContext[];
  /** 扫描元数据 */
  metadata: {
    scanStartTime: Date;
    scanEndTime: Date;
    duration: number;
    sourcesScanned: ContextSource[];
    itemsFound: number;
  };
}

/**
 * 上下文扫描器
 */
export class ContextScanner {
  private config: Required<ContextEngineConfig>;
  private memorySystem: IMemorySystem | null = null;
  private skillSystem: ISkillSystem | null = null;
  private personalitySystem: IPersonalitySystem | null = null;
  private knowledgeBase: IKnowledgeBase | null = null;

  constructor(config: ContextEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 绑定记忆系统
   */
  bindMemorySystem(system: IMemorySystem): this {
    this.memorySystem = system;
    return this;
  }

  /**
   * 绑定技能系统
   */
  bindSkillSystem(system: ISkillSystem): this {
    this.skillSystem = system;
    return this;
  }

  /**
   * 绑定人格系统
   */
  bindPersonalitySystem(system: IPersonalitySystem): this {
    this.personalitySystem = system;
    return this;
  }

  /**
   * 绑定知识库
   */
  bindKnowledgeBase(kb: IKnowledgeBase): this {
    this.knowledgeBase = kb;
    return this;
  }

  /**
   * 扫描记忆
   */
  async scanMemory(query: string, userId: string): Promise<MemoryContext[]> {
    if (!this.memorySystem) {
      console.warn('[ContextScanner] Memory system not bound, returning empty');
      return [];
    }

    const options: MemorySearchOptions = {
      query,
      userId,
      limit: this.config.memorySearchLimit,
      minRelevance: this.config.minRelevanceThreshold,
      sortBy: 'relevance',
    };

    try {
      const memories = await this.memorySystem.search(options);
      
      // 估算每个记忆的token并标记
      return memories.map((mem) => ({
        ...mem,
        estimatedTokens: estimateTokens(mem.content),
        source: ContextSource.MEMORY,
      }));
    } catch (error) {
      console.error('[ContextScanner] Error scanning memories:', error);
      return [];
    }
  }

  /**
   * 扫描技能
   */
  async scanSkills(query: string, userId: string): Promise<SkillContext[]> {
    if (!this.skillSystem) {
      console.warn('[ContextScanner] Skill system not bound, returning empty');
      return [];
    }

    try {
      const skills = await this.skillSystem.match(query, userId);
      
      // 按匹配度过滤并排序
      const filtered = skills
        .filter((s) => s.matchScore >= this.config.minRelevanceThreshold)
        .slice(0, this.config.skillSearchLimit);

      // 估算每个技能的token并标记
      return filtered.map((skill) => ({
        ...skill,
        estimatedTokens: estimateTokens(skill.description + (skill.content || '')),
        source: ContextSource.SKILL,
      }));
    } catch (error) {
      console.error('[ContextScanner] Error scanning skills:', error);
      return [];
    }
  }

  /**
   * 扫描人格画像
   */
  async scanPersonality(userId: string, tenantId?: string): Promise<PersonalityContext | null> {
    if (!this.config.enablePersonality || !this.personalitySystem) {
      return null;
    }

    try {
      const profile = await this.personalitySystem.getProfile(userId, tenantId);
      
      if (profile) {
        // 估算人格上下文的token
        const content = JSON.stringify(profile);
        return {
          ...profile,
          estimatedTokens: estimateTokens(content),
          source: ContextSource.PERSONALITY,
        };
      }
      
      return null;
    } catch (error) {
      console.error('[ContextScanner] Error scanning personality:', error);
      return null;
    }
  }

  /**
   * 扫描知识库
   */
  async scanKnowledge(query: string, userId?: string): Promise<KnowledgeContext[]> {
    if (!this.config.enableKnowledge || !this.knowledgeBase) {
      return [];
    }

    try {
      const knowledge = await this.knowledgeBase.search(query, userId);
      
      // 过滤并估算token
      return knowledge
        .filter((k) => k.relevanceScore >= this.config.minRelevanceThreshold)
        .map((k) => ({
          ...k,
          estimatedTokens: estimateTokens(k.content),
          source: ContextSource.KNOWLEDGE,
        }));
    } catch (error) {
      console.error('[ContextScanner] Error scanning knowledge:', error);
      return [];
    }
  }

  /**
   * 构建系统上下文
   */
  buildSystemContext(): SystemContext {
    return {
      systemName: 'OpenTaiji',
      version: '1.0.0',
      currentTime: new Date(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      environment: (process.env.NODE_ENV as any) || 'development',
      featureFlags: {},
      limits: {
        maxTokens: this.config.maxTokenBudget,
      },
    };
  }

  /**
   * 构建历史上下文
   */
  buildHistoryContext(history?: ConversationRequest['history']): HistoryContext[] {
    if (!this.config.enableHistory || !history || history.length === 0) {
      return [];
    }

    const limit = this.config.historyMessageLimit;
    const recentHistory = history.slice(-limit);

    return recentHistory.map((msg, index) => ({
      index,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      relevanceScore: 1 - (index / recentHistory.length), // 越近相关性越高
    }));
  }

  /**
   * 综合扫描
   * 
   * 核心方法：并行扫描所有上下文来源
   */
  async scan(request: ConversationRequest): Promise<ScanResult> {
    const scanStartTime = new Date();
    const sourcesScanned: ContextSource[] = [];

    // 并行执行所有扫描
    const [
      memories,
      skills,
      personality,
      knowledge,
    ] = await Promise.all([
      this.scanMemory(request.message, request.userId),
      this.scanSkills(request.message, request.userId),
      this.scanPersonality(request.userId, request.tenantId),
      this.scanKnowledge(request.message, request.userId),
    ]);

    // 收集已扫描的来源
    if (memories.length > 0) sourcesScanned.push(ContextSource.MEMORY);
    if (skills.length > 0) sourcesScanned.push(ContextSource.SKILL);
    if (personality) sourcesScanned.push(ContextSource.PERSONALITY);
    if (knowledge.length > 0) sourcesScanned.push(ContextSource.KNOWLEDGE);

    // 构建系统上下文（总是包含）
    const system = this.buildSystemContext();
    sourcesScanned.push(ContextSource.SYSTEM);

    // 构建历史上下文
    const history = this.buildHistoryContext(request.history);
    if (history.length > 0) sourcesScanned.push(ContextSource.HISTORY);

    const scanEndTime = new Date();

    return {
      memories,
      skills,
      personality,
      knowledge,
      system,
      history,
      metadata: {
        scanStartTime,
        scanEndTime,
        duration: scanEndTime.getTime() - scanStartTime.getTime(),
        sourcesScanned,
        itemsFound: memories.length + skills.length + knowledge.length + history.length,
      },
    };
  }

  /**
   * 扫描并组装原始上下文
   */
  async scanAndAssembleRaw(request: ConversationRequest): Promise<RawContext> {
    const scanResult = await this.scan(request);

    return {
      memory: scanResult.memories,
      skills: scanResult.skills,
      personality: scanResult.personality,
      knowledge: scanResult.knowledge,
      system: scanResult.system,
      history: scanResult.history,
    };
  }
}

/**
 * 创建上下文扫描器
 */
export function createContextScanner(config?: ContextEngineConfig): ContextScanner {
  return new ContextScanner(config);
}

export default ContextScanner;
