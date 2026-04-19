/**
 * ContextInjector - 上下文注入器
 * Context Injector - 将上下文注入到Prompt
 * 
 * 职责：
 * 1. 将组装好的上下文注入到系统提示词
 * 2. 支持多种注入策略
 * 3. 管理注入结果的格式化
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  AssembledContext,
  InjectionStrategy,
  InjectionResult,
  MemoryContext,
  SkillContext,
  PersonalityContext,
  KnowledgeContext,
  HistoryContext,
  SystemContext,
  estimateTokens,
} from './types';

/**
 * 上下文格式化选项
 */
export interface FormatOptions {
  /** 包含标题 */
  includeTitles?: boolean;
  /** 包含元数据 */
  includeMetadata?: boolean;
  /** 包含分隔符 */
  includeSeparators?: boolean;
  /** 最大行宽度 */
  maxLineWidth?: number;
  /** 缩进 */
  indent?: string;
}

/**
 * 默认格式化选项
 */
const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  includeTitles: true,
  includeMetadata: false,
  includeSeparators: true,
  maxLineWidth: 120,
  indent: '  ',
};

/**
 * 上下文注入器
 */
export class ContextInjector {
  private defaultStrategy: InjectionStrategy;
  private formatOptions: FormatOptions;

  constructor(
    strategy: InjectionStrategy = InjectionStrategy.SEQUENTIAL,
    formatOptions?: FormatOptions
  ) {
    this.defaultStrategy = strategy;
    this.formatOptions = { ...DEFAULT_FORMAT_OPTIONS, ...formatOptions };
  }

  /**
   * 格式化记忆上下文
   */
  formatMemory(memories: MemoryContext[], options?: FormatOptions): string {
    if (memories.length === 0) return '';

    const opts = { ...this.formatOptions, ...options };
    const lines: string[] = [];

    if (opts.includeTitles) {
      lines.push('## Relevant Memories');
    }

    memories.forEach((mem, idx) => {
      const content = mem.content;
      const metadata = opts.includeMetadata
        ? ` [Type: ${mem.type}, Relevance: ${(mem.relevanceScore * 100).toFixed(0)}%]`
        : '';
      lines.push(`[Memory ${idx + 1}]${metadata}`);
      lines.push(content);
      if (opts.includeSeparators && idx < memories.length - 1) {
        lines.push('---');
      }
    });

    return lines.join('\n');
  }

  /**
   * 格式化技能上下文
   */
  formatSkills(skills: SkillContext[], options?: FormatOptions): string {
    if (skills.length === 0) return '';

    const opts = { ...this.formatOptions, ...options };
    const lines: string[] = [];

    if (opts.includeTitles) {
      lines.push('## Available Skills');
    }

    skills.forEach((skill, idx) => {
      lines.push(`[Skill: ${skill.name}]`);
      lines.push(`Description: ${skill.description}`);
      
      if (skill.content) {
        lines.push(`Instructions: ${skill.content}`);
      }
      
      if (skill.parameters && skill.parameters.length > 0 && opts.includeMetadata) {
        const params = skill.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
        lines.push(`Parameters: ${params}`);
      }
      
      if (opts.includeSeparators && idx < skills.length - 1) {
        lines.push('---');
      }
    });

    return lines.join('\n');
  }

  /**
   * 格式化人格上下文
   */
  formatPersonality(personality: PersonalityContext, options?: FormatOptions): string {
    const opts = { ...this.formatOptions, ...options };
    const lines: string[] = [];

    if (opts.includeTitles) {
      lines.push('## User Profile');
    }

    // 基本信息
    lines.push(`Response Style: ${personality.preferences.responseStyle || 'balanced'}`);
    lines.push(`Communication: ${personality.communicationStyle}`);

    // 五维画像
    if (personality.dimensions) {
      const dim = personality.dimensions;
      const dimLines: string[] = [];
      
      if (dim.personality !== undefined) {
        dimLines.push(`Personality: ${dim.personality > 0.5 ? 'Extraverted' : 'Introverted'} (${(dim.personality * 100).toFixed(0)}%)`);
      }
      if (dim.perspective !== undefined) {
        dimLines.push(`Perspective: ${dim.perspective > 0.5 ? 'Open' : 'Conservative'} (${(dim.perspective * 100).toFixed(0)}%)`);
      }
      
      if (dimLines.length > 0) {
        lines.push(`Dimensions: ${dimLines.join(', ')}`);
      }
    }

    // 专业领域
    if (personality.expertise && personality.expertise.length > 0) {
      lines.push(`Expertise: ${personality.expertise.join(', ')}`);
    }

    // 学习偏好
    if (personality.learningPreference) {
      lines.push(`Learning Preference: ${personality.learningPreference}`);
    }

    return lines.join('\n');
  }

  /**
   * 格式化知识上下文
   */
  formatKnowledge(knowledge: KnowledgeContext[], options?: FormatOptions): string {
    if (knowledge.length === 0) return '';

    const opts = { ...this.formatOptions, ...options };
    const lines: string[] = [];

    if (opts.includeTitles) {
      lines.push('## Relevant Knowledge');
    }

    knowledge.forEach((k, idx) => {
      lines.push(`[${k.title}]`);
      lines.push(k.content);
      
      if (opts.includeMetadata && k.category) {
        lines.push(`Category: ${k.category}`);
      }
      
      if (opts.includeSeparators && idx < knowledge.length - 1) {
        lines.push('---');
      }
    });

    return lines.join('\n');
  }

  /**
   * 格式化系统上下文
   */
  formatSystem(system: SystemContext): string {
    const lines: string[] = [];

    lines.push('## System Information');
    lines.push(`System: ${system.systemName}`);
    
    if (system.version) {
      lines.push(`Version: ${system.version}`);
    }
    
    lines.push(`Current Time: ${system.currentTime.toISOString()}`);
    
    if (system.timezone) {
      lines.push(`Timezone: ${system.timezone}`);
    }

    return lines.join('\n');
  }

  /**
   * 格式化对话历史
   */
  formatHistory(history: HistoryContext[], options?: FormatOptions): string {
    if (history.length === 0) return '';

    const opts = { ...this.formatOptions, ...options };
    const lines: string[] = [];

    if (opts.includeTitles) {
      lines.push('## Recent Conversation History');
    }

    history.forEach((h) => {
      const role = h.role === 'user' ? 'User' : 'Assistant';
      lines.push(`${role}: ${h.content}`);
    });

    return lines.join('\n');
  }

  /**
   * 顺序注入策略
   * 
   * 按优先级顺序追加所有上下文
   */
  private injectSequential(prompt: string, context: AssembledContext): string {
    const sections: string[] = [];

    // 1. 系统信息
    if (context.system) {
      sections.push(this.formatSystem(context.system));
    }

    // 2. 人格上下文
    if (context.personality) {
      sections.push(this.formatPersonality(context.personality));
    }

    // 3. 技能上下文
    if (context.skills.length > 0) {
      sections.push(this.formatSkills(context.skills));
    }

    // 4. 记忆上下文
    if (context.memories.length > 0) {
      sections.push(this.formatMemory(context.memories));
    }

    // 5. 知识上下文
    if (context.knowledge.length > 0) {
      sections.push(this.formatKnowledge(context.knowledge));
    }

    // 6. 历史上下文
    if (context.history.length > 0) {
      sections.push(this.formatHistory(context.history));
    }

    // 组合
    const contextBlock = sections.join('\n\n');

    if (!contextBlock) {
      return prompt;
    }

    // 注入到提示词
    if (prompt.includes('{{CONTEXT}}')) {
      return prompt.replace('{{CONTEXT}}', contextBlock);
    }

    return `${prompt}\n\n${contextBlock}`;
  }

  /**
   * 分块注入策略
   * 
   * 将上下文分成独立块，用特殊标记分隔
   */
  private injectChunked(prompt: string, context: AssembledContext): string {
    const chunks: string[] = [];

    // 各个部分作为独立块
    if (context.system) {
      chunks.push(`[SYSTEM]\n${this.formatSystem(context.system)}`);
    }

    if (context.personality) {
      chunks.push(`[USER_PROFILE]\n${this.formatPersonality(context.personality)}`);
    }

    if (context.skills.length > 0) {
      chunks.push(`[SKILLS]\n${this.formatSkills(context.skills)}`);
    }

    if (context.memories.length > 0) {
      chunks.push(`[MEMORIES]\n${this.formatMemory(context.memories)}`);
    }

    if (context.knowledge.length > 0) {
      chunks.push(`[KNOWLEDGE]\n${this.formatKnowledge(context.knowledge)}`);
    }

    if (context.history.length > 0) {
      chunks.push(`[HISTORY]\n${this.formatHistory(context.history)}`);
    }

    const contextBlock = chunks.join('\n\n[CUT]\n\n');

    if (prompt.includes('{{CONTEXT}}')) {
      return prompt.replace('{{CONTEXT}}', contextBlock);
    }

    return `${prompt}\n\n${contextBlock}`;
  }

  /**
   * 插值注入策略
   * 
   * 在系统提示词中使用占位符
   */
  private injectInterpolated(prompt: string, context: AssembledContext): string {
    let result = prompt;

    // 替换各个占位符
    const replacements: Record<string, string> = {
      '{{SYSTEM}}': context.system ? this.formatSystem(context.system) : '',
      '{{USER_PROFILE}}': context.personality ? this.formatPersonality(context.personality) : '',
      '{{SKILLS}}': context.skills.length > 0 ? this.formatSkills(context.skills) : '',
      '{{MEMORIES}}': context.memories.length > 0 ? this.formatMemory(context.memories) : '',
      '{{KNOWLEDGE}}': context.knowledge.length > 0 ? this.formatKnowledge(context.knowledge) : '',
      '{{HISTORY}}': context.history.length > 0 ? this.formatHistory(context.history) : '',
      '{{CONTEXT}}': '', // 清空默认占位符
    };

    for (const [placeholder, content] of Object.entries(replacements)) {
      if (content) {
        result = result.replace(placeholder, content);
      } else {
        result = result.replace(placeholder, '');
      }
    }

    // 清理空行
    result = result.replace(/\n{3,}/g, '\n\n');

    return result;
  }

  /**
   * 分层注入策略
   * 
   * 按层级组织上下文
   */
  private injectHierarchical(prompt: string, context: AssembledContext): string {
    const lines: string[] = [];

    // 层级1: 核心指令
    lines.push('# CORE INSTRUCTIONS');
    lines.push(prompt);
    lines.push('');

    // 层级2: 关键上下文
    lines.push('# KEY CONTEXT');

    if (context.personality) {
      lines.push(`User prefers ${context.personality.communicationStyle} communication.`);
      if (context.personality.expertise) {
        lines.push(`User expertise: ${context.personality.expertise.join(', ')}.`);
      }
    }

    if (context.skills.length > 0) {
      const skillNames = context.skills.map((s) => s.name).join(', ');
      lines.push(`Available skills: ${skillNames}.`);
    }

    lines.push('');

    // 层级3: 详细信息
    lines.push('# DETAILED CONTEXT');

    if (context.system) {
      lines.push(`System: ${context.system.systemName} v${context.system.version || '?'}`);
      lines.push(`Time: ${context.system.currentTime.toISOString()}`);
    }

    if (context.memories.length > 0) {
      lines.push('');
      lines.push('## Relevant Memories');
      context.memories.forEach((m, i) => {
        lines.push(`${i + 1}. ${m.content}`);
      });
    }

    if (context.knowledge.length > 0) {
      lines.push('');
      lines.push('## Knowledge');
      context.knowledge.forEach((k) => {
        lines.push(`- ${k.title}: ${k.content}`);
      });
    }

    if (context.history.length > 0) {
      lines.push('');
      lines.push('## Recent History');
      context.history.slice(-3).forEach((h) => {
        lines.push(`${h.role}: ${h.content.substring(0, 100)}...`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 压缩注入策略
   * 
   * 使用紧凑格式
   */
  private injectCompressed(prompt: string, context: AssembledContext): string {
    const parts: string[] = [];

    // 紧凑格式
    if (context.personality) {
      const prefs = [];
      if (context.personality.preferences.responseStyle) {
        prefs.push(`style=${context.personality.preferences.responseStyle}`);
      }
      if (context.personality.learningPreference) {
        prefs.push(`learn=${context.personality.learningPreference}`);
      }
      if (prefs.length > 0) {
        parts.push(`USER[${prefs.join(';')}]`);
      }
    }

    if (context.skills.length > 0) {
      const skillNames = context.skills.map((s) => s.name).join('|');
      parts.push(`SKILLS[${skillNames}]`);
    }

    if (context.memories.length > 0) {
      const memSummary = context.memories
        .map((m) => m.content.substring(0, 50))
        .join(' | ');
      parts.push(`MEM[${memSummary}]`);
    }

    const contextStr = parts.join(' ');

    if (prompt.includes('{{CONTEXT}}')) {
      return prompt.replace('{{CONTEXT}}', contextStr);
    }

    return `${prompt}\n\n[CTX]${contextStr}[/CTX]`;
  }

  /**
   * 注入到Prompt
   */
  inject(prompt: string, context: AssembledContext): InjectionResult {
    return this.injectWithStrategy(prompt, context, this.defaultStrategy);
  }

  /**
   * 使用指定策略注入
   */
  injectWithStrategy(
    prompt: string,
    context: AssembledContext,
    strategy: InjectionStrategy
  ): InjectionResult {
    const startTime = Date.now();

    let injectedPrompt: string;
    let truncationOccurred = false;
    let truncationReason: string | undefined;

    // 根据策略选择注入方法
    switch (strategy) {
      case InjectionStrategy.SEQUENTIAL:
        injectedPrompt = this.injectSequential(prompt, context);
        break;

      case InjectionStrategy.CHUNKED:
        injectedPrompt = this.injectChunked(prompt, context);
        break;

      case InjectionStrategy.INTERPOLATED:
        injectedPrompt = this.injectInterpolated(prompt, context);
        break;

      case InjectionStrategy.HIERARCHICAL:
        injectedPrompt = this.injectHierarchical(prompt, context);
        break;

      case InjectionStrategy.COMPRESSED:
        injectedPrompt = this.injectCompressed(prompt, context);
        break;

      default:
        injectedPrompt = this.injectSequential(prompt, context);
    }

    // 计算实际Token
    const actualTokens = estimateTokens(injectedPrompt);

    // 检查是否超预算
    const budget = context.tokenAllocation.systemPrompt + 
                   context.tokenAllocation.memory +
                   context.tokenAllocation.skills +
                   context.tokenAllocation.personality +
                   context.tokenAllocation.knowledge +
                   context.tokenAllocation.history;

    if (actualTokens > budget * 1.1) { // 10%容错
      truncationOccurred = true;
      truncationReason = 'Output exceeded token budget';
    }

    // 收集注入的ID
    const injectedIds: string[] = [
      ...context.memories.map((m) => m.id),
      ...context.skills.map((s) => s.id),
      ...context.knowledge.map((k) => k.id),
    ];

    return {
      prompt: injectedPrompt,
      actualTokens,
      injectedIds,
      truncated: truncationOccurred,
      truncationReason,
    };
  }

  /**
   * 批量注入（测试用）
   */
  injectBatch(
    prompts: string[],
    context: AssembledContext,
    strategy?: InjectionStrategy
  ): InjectionResult[] {
    const strat = strategy || this.defaultStrategy;
    return prompts.map((prompt) => this.injectWithStrategy(prompt, context, strat));
  }
}

/**
 * 创建上下文注入器
 */
export function createContextInjector(
  strategy?: InjectionStrategy,
  formatOptions?: FormatOptions
): ContextInjector {
  return new ContextInjector(strategy, formatOptions);
}

export default ContextInjector;
