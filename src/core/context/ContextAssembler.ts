/**
 * ContextAssembler - 上下文组装器
 * Context Assembler - 按优先级组装和优化上下文
 * 
 * 职责：
 * 1. 按优先级排序上下文
 * 2. 管理Token预算
 * 3. 优化内容以适应Token限制
 * 4. 生成最终的AssembledContext
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RawContext,
  AssembledContext,
  TokenAllocation,
  AssembledContextMetadata,
  MemoryContext,
  SkillContext,
  PersonalityContext,
  KnowledgeContext,
  HistoryContext,
  SystemContext,
  ContextPriority,
  ContextEngineConfig,
  ConversationRequest,
  estimateTokens,
  sortByPriority,
} from './types';

/**
 * 上下文项接口（用于统一处理）
 */
interface ContextItem {
  id: string;
  content: string;
  priority: ContextPriority;
  tokens: number;
  type: 'memory' | 'skill' | 'knowledge' | 'history';
  source: string;
  relevanceScore?: number;
}

/**
 * 组装结果
 */
export interface AssembleResult {
  /** 组装后的上下文 */
  context: AssembledContext;
  /** 被截断的项目 */
  truncatedItems: string[];
  /** 优化信息 */
  optimization: {
    passes: number;
    finalTokenCount: number;
    budgetUsage: number;
  };
}

/**
 * 上下文组装器
 */
export class ContextAssembler {
  private config: Required<ContextEngineConfig>;

  constructor(config?: ContextEngineConfig) {
    // 使用默认值合并配置
    this.config = {
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
      ...config,
    };
  }

  /**
   * 计算系统提示词的Token数
   */
  private calculateSystemPromptTokens(systemPrompt?: string): number {
    if (!systemPrompt) {
      return estimateTokens(this.getDefaultSystemPrompt());
    }
    return estimateTokens(systemPrompt);
  }

  /**
   * 获取默认系统提示词
   */
  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant powered by OpenTaiji framework. 
Your role is to help users with their requests while considering their preferences and history.`;
  }

  /**
   * 计算Token分配
   */
  private calculateTokenAllocation(
    totalBudget: number,
    systemPromptTokens: number,
    weights: ContextEngineConfig['priorityWeights']
  ): TokenAllocation {
    const weights_ = weights || this.config.priorityWeights;
    const availableForContext = totalBudget - systemPromptTokens - 500; // 预留500缓冲

    // 计算各部分权重总和
    const weightSum = weights_.memory + weights_.skill + weights_.personality + 
                      weights_.knowledge + weights_.history;

    return {
      systemPrompt: systemPromptTokens,
      memory: Math.floor(availableForContext * (weights_.memory / weightSum)),
      skills: Math.floor(availableForContext * (weights_.skill / weightSum)),
      personality: Math.floor(availableForContext * (weights_.personality / weightSum)),
      knowledge: Math.floor(availableForContext * (weights_.knowledge / weightSum)),
      history: Math.floor(availableForContext * (weights_.history / weightSum)),
      reserved: 500,
    };
  }

  /**
   * 统一转换为ContextItem
   */
  private toContextItems(raw: RawContext): ContextItem[] {
    const items: ContextItem[] = [];

    // 转换记忆
    raw.memory.forEach((mem) => {
      items.push({
        id: mem.id,
        content: mem.content,
        priority: mem.priority,
        tokens: mem.estimatedTokens || estimateTokens(mem.content),
        type: 'memory',
        source: ContextSource.MEMORY,
        relevanceScore: mem.relevanceScore,
      });
    });

    // 转换技能
    raw.skills.forEach((skill) => {
      items.push({
        id: skill.id,
        content: `${skill.name}: ${skill.description}${skill.content ? '\n' + skill.content : ''}`,
        priority: skill.priority,
        tokens: skill.estimatedTokens || estimateTokens(skill.description + (skill.content || '')),
        type: 'skill',
        source: ContextSource.SKILL,
        relevanceScore: skill.matchScore,
      });
    });

    // 转换知识
    (raw.knowledge || []).forEach((k) => {
      items.push({
        id: k.id,
        content: `${k.title}\n${k.content}`,
        priority: k.priority,
        tokens: k.estimatedTokens || estimateTokens(k.content),
        type: 'knowledge',
        source: ContextSource.KNOWLEDGE,
        relevanceScore: k.relevanceScore,
      });
    });

    // 转换历史
    (raw.history || []).forEach((h, idx) => {
      items.push({
        id: `history-${idx}`,
        content: `[${h.role}]: ${h.content}`,
        priority: ContextPriority.LOW,
        tokens: estimateTokens(h.content),
        type: 'history',
        source: ContextSource.HISTORY,
        relevanceScore: h.relevanceScore,
      });
    });

    return items;
  }

  /**
   * 计算综合得分
   * 
   * 综合考虑：优先级、相关性、时间衰减
   */
  private calculateScore(item: ContextItem): number {
    // 优先级分数 (0-100)
    const priorityScore = item.priority;

    // 相关性分数 (0-1) -> 转换为0-50
    const relevanceScore = (item.relevanceScore || 0.5) * 50;

    // 类型权重
    const typeWeights: Record<string, number> = {
      memory: 1.0,
      skill: 1.1,    // 技能稍微优先
      knowledge: 0.9,
      history: 0.7,
    };
    const typeWeight = typeWeights[item.type] || 1.0;

    return (priorityScore + relevanceScore) * typeWeight;
  }

  /**
   * 优化内容以适应Token限制
   */
  private truncateContent(content: string, maxTokens: number): string {
    const currentTokens = estimateTokens(content);
    
    if (currentTokens <= maxTokens) {
      return content;
    }

    // 按比例截断
    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(content.length * ratio);
    
    // 尝试在句子边界截断
    let truncated = content.substring(0, targetLength);
    const lastPeriod = truncated.lastIndexOf('。');
    const lastNewline = truncated.lastIndexOf('\n');
    const lastSentence = Math.max(lastPeriod, lastNewline);

    if (lastSentence > targetLength * 0.5) {
      truncated = truncated.substring(0, lastSentence + 1);
    }

    // 添加省略标记
    if (truncated.length < content.length) {
      truncated += '...[truncated]';
    }

    return truncated;
  }

  /**
   * 按Token预算优化上下文
   */
  private optimizeForTokenBudget(
    items: ContextItem[],
    allocation: TokenAllocation,
    personalityTokens: number,
    systemTokens: number,
    totalBudget: number
  ): { optimizedItems: ContextItem[]; usedTokens: number; truncated: string[] } {
    const truncated: string[] = [];
    let usedTokens = systemTokens + personalityTokens;
    const optimizedItems: ContextItem[] = [];

    // 按综合得分排序
    const sortedItems = [...items].sort((a, b) => 
      this.calculateScore(b) - this.calculateScore(a)
    );

    // 按类型分组配额
    const quotas = {
      memory: allocation.memory,
      skill: allocation.skills,
      knowledge: allocation.knowledge,
      history: allocation.history,
    };

    // 逐类型填充
    for (const type of ['skill', 'memory', 'knowledge', 'history'] as const) {
      const typeItems = sortedItems.filter((i) => i.type === type);
      let remainingQuota = quotas[type];

      for (const item of typeItems) {
        if (remainingQuota <= 0) {
          truncated.push(item.id);
          continue;
        }

        if (item.tokens <= remainingQuota) {
          // 完整添加
          optimizedItems.push(item);
          usedTokens += item.tokens;
          remainingQuota -= item.tokens;
        } else if (item.tokens > remainingQuota && remainingQuota > 20) {
          // 部分截断后添加
          const truncatedContent = this.truncateContent(item.content, remainingQuota);
          optimizedItems.push({
            ...item,
            content: truncatedContent,
            tokens: remainingQuota,
          });
          usedTokens += remainingQuota;
          truncated.push(item.id);
          remainingQuota = 0;
        } else {
          // 太小，放弃
          truncated.push(item.id);
        }

        // 检查总预算
        if (usedTokens >= totalBudget - 100) {
          break;
        }
      }

      if (usedTokens >= totalBudget - 100) {
        break;
      }
    }

    return { optimizedItems, usedTokens, truncated };
  }

  /**
   * 组装上下文
   * 
   * 核心方法：将扫描结果组装成优化的上下文
   */
  assemble(
    raw: RawContext,
    tokenBudget: number
  ): AssembleResult {
    const startTime = Date.now();
    const budget = Math.min(tokenBudget || this.config.defaultTokenBudget, this.config.maxTokenBudget);

    // 1. 计算系统提示词Token
    const systemPromptTokens = this.calculateSystemPromptTokens();
    
    // 2. 计算人格上下文Token
    const personalityTokens = raw.personality 
      ? (raw.personality.estimatedTokens || estimateTokens(JSON.stringify(raw.personality)))
      : 0;

    // 3. 计算Token分配
    const allocation = this.calculateTokenAllocation(budget, systemPromptTokens, this.config.priorityWeights);

    // 4. 转换所有项
    const allItems = this.toContextItems(raw);

    // 5. 优化以适应Token预算
    const optimizationResult = this.optimizeForTokenBudget(
      allItems,
      allocation,
      personalityTokens,
      systemPromptTokens,
      budget
    );

    // 6. 重新分类优化后的项
    const optimizedMemories = optimizationResult.optimizedItems
      .filter((i) => i.type === 'memory')
      .map((item) => {
        const original = raw.memory.find((m) => m.id === item.id);
        return original ? { ...original, content: item.content, estimatedTokens: item.tokens } : null;
      })
      .filter(Boolean) as MemoryContext[];

    const optimizedSkills = optimizationResult.optimizedItems
      .filter((i) => i.type === 'skill')
      .map((item) => {
        const original = raw.skills.find((s) => s.id === item.id);
        return original ? { ...original, content: item.content } : null;
      })
      .filter(Boolean) as SkillContext[];

    const optimizedKnowledge = optimizationResult.optimizedItems
      .filter((i) => i.type === 'knowledge')
      .map((item) => {
        const original = (raw.knowledge || []).find((k) => k.id === item.id);
        return original ? { ...original, content: item.content, estimatedTokens: item.tokens } : null;
      })
      .filter(Boolean) as KnowledgeContext[];

    const optimizedHistory = optimizationResult.optimizedItems
      .filter((i) => i.type === 'history')
      .map((item) => {
        const original = (raw.history || [])[parseInt(item.id.replace('history-', ''))];
        return original ? { ...original } : null;
      })
      .filter(Boolean) as HistoryContext[];

    // 7. 构建最终上下文
    const assembledContext: AssembledContext = {
      id: uuidv4(),
      request: {} as ConversationRequest,
      memories: optimizedMemories,
      skills: optimizedSkills,
      personality: raw.personality,
      knowledge: optimizedKnowledge,
      system: raw.system ?? null,
      history: optimizedHistory,
      totalTokens: optimizationResult.usedTokens,
      tokenAllocation: {
        ...allocation,
        personality: personalityTokens,
        systemPrompt: systemPromptTokens,
      },
      metadata: {
        scannedAt: new Date(),
        scanDuration: 0,
        assembleDuration: Date.now() - startTime,
        optimizationPasses: 1,
        truncationOccurred: optimizationResult.truncated.length > 0,
        sourcesUsed: this.getSourcesUsed(raw),
      },
    };

    return {
      context: assembledContext,
      truncatedItems: optimizationResult.truncated,
      optimization: {
        passes: 1,
        finalTokenCount: optimizationResult.usedTokens,
        budgetUsage: optimizationResult.usedTokens / budget,
      },
    };
  }

  /**
   * 获取使用的来源列表
   */
  private getSourcesUsed(raw: RawContext): ContextSource[] {
    const sources: ContextSource[] = [ContextSource.SYSTEM];
    if (raw.memory.length > 0) sources.push(ContextSource.MEMORY);
    if (raw.skills.length > 0) sources.push(ContextSource.SKILL);
    if (raw.personality) sources.push(ContextSource.PERSONALITY);
    if (raw.knowledge && raw.knowledge.length > 0) sources.push(ContextSource.KNOWLEDGE);
    if (raw.history && raw.history.length > 0) sources.push(ContextSource.HISTORY);
    return sources;
  }

  /**
   * 深度优化 - 多轮迭代优化
   */
  optimizeWithIterations(
    raw: RawContext,
    tokenBudget: number,
    maxIterations = 3
  ): AssembleResult {
    let result = this.assemble(raw, tokenBudget);
    
    for (let i = 1; i < maxIterations; i++) {
      // 检查是否需要继续优化
      if (result.optimization.budgetUsage < 0.9 || result.truncatedItems.length === 0) {
        break;
      }

      // 进一步压缩内容
      const compressionFactor = 0.9;
      const compressedBudget = Math.floor(result.optimization.finalTokenCount * compressionFactor);
      
      result = this.assemble(raw, compressedBudget);
      result.optimization.passes = i + 1;
    }

    return result;
  }
}

/**
 * 创建上下文组装器
 */
export function createContextAssembler(config?: ContextEngineConfig): ContextAssembler {
  return new ContextAssembler(config);
}

export default ContextAssembler;

// 重新导出ContextSource以避免循环引用
import { ContextSource } from './types';
