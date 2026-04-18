/**
 * ActorSkillIntegration - Actor系统与技能生成集成
 * 
 * 将技能自动生成集成到Actor执行流程中
 */

import { EventEmitter } from 'events';
import { TaskCompletionHook, HookConfig } from './TaskCompletionHook';
import { SkillAutoGenerator } from '../../modules/skill-system/auto-generation/SkillAutoGenerator';
import { SkillPattern } from '../../modules/skill-system/auto-generation/types';

// ============ Actor接口定义 ============

export interface ActorContext {
  actorId: string;
  taskId: string;
  sessionId: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

export interface ToolExecutionResult {
  toolId: string;
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: string;
  executionTime: number;
  toolCalls: ToolExecutionResult[];
  metrics: TaskMetrics;
}

export interface TaskMetrics {
  totalTokens: number;
  toolCallCount: number;
  errorCount: number;
  avgToolDuration: number;
}

// ============ 集成器配置 ============

export interface IntegrationConfig {
  enabled: boolean;
  skillGenerationEnabled: boolean;
  hookConfig: Partial<HookConfig>;
  skillLibraryPath: string;
  patternMatchEnabled: boolean;
  maxCachedPatterns: number;
}

export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  enabled: true,
  skillGenerationEnabled: true,
  hookConfig: {},
  skillLibraryPath: './skills/generated',
  patternMatchEnabled: true,
  maxCachedPatterns: 100,
};

// ============ 技能库接口 ============

export interface SkillLibrary {
  findPatterns(query: string): Promise<SkillPattern[]>;
  findByTags(tags: string[]): Promise<SkillPattern[]>;
  getPattern(patternId: string): Promise<SkillPattern | null>;
  savePattern(pattern: SkillPattern): Promise<void>;
  deletePattern(patternId: string): Promise<void>;
  listPatterns(): Promise<SkillPattern[]>;
}

// ============ Actor集成器 ============

export class ActorSkillIntegration extends EventEmitter {
  private config: IntegrationConfig;
  private generator: SkillAutoGenerator;
  private hook: TaskCompletionHook;
  private library: SkillLibrary;
  private patternCache: Map<string, SkillPattern> = new Map();
  private executionHistory: TaskResult[] = [];

  constructor(
    generator: SkillAutoGenerator,
    library: SkillLibrary,
    config: Partial<IntegrationConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };
    this.generator = generator;
    this.library = library;
    
    // 创建任务完成钩子
    this.hook = new TaskCompletionHook(generator, this.config.hookConfig);
    
    // 监听钩子事件
    this.setupHookListeners();
  }

  /**
   * 设置钩子事件监听
   */
  private setupHookListeners(): void {
    this.hook.on('task_started', (data) => {
      this.emit('task_started', data);
    });

    this.hook.on('task_completed', (data) => {
      this.emit('task_completed', data);
    });

    this.hook.on('generation_triggered', (data) => {
      this.emit('skill_generation_triggered', data);
    });

    this.hook.on('skill_generated', async (data) => {
      // 更新缓存
      if (data.patternId) {
        const pattern = await this.library.getPattern(data.patternId);
        if (pattern) {
          this.patternCache.set(pattern.patternId, pattern);
        }
      }
      this.emit('skill_generated', data);
    });

    this.hook.on('generation_error', (data) => {
      this.emit('skill_generation_error', data);
    });
  }

  /**
   * 开始任务执行
   */
  startTaskExecution(context: ActorContext, taskInput: string): void {
    if (!this.config.enabled) {
      return;
    }

    this.hook.startTask(context.taskId, taskInput, {
      domain: context.metadata?.domain as string || 'general',
      complexity: 'medium',
      category: context.metadata?.category as string || 'general',
      tags: context.metadata?.tags as string[] || [],
      userId: context.userId,
      sessionId: context.sessionId,
    });
  }

  /**
   * 记录工具执行
   */
  recordToolExecution(
    toolId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown,
    success: boolean,
    duration: number
  ): void {
    this.hook.recordToolCall(toolId, toolName, args, result, success, duration);
  }

  /**
   * 结束任务执行
   */
  async endTaskExecution(
    context: ActorContext,
    output: string,
    success: boolean,
    metrics: TaskMetrics
  ): Promise<void> {
    // 结束钩子跟踪
    await this.hook.endTask(output, success);

    // 记录执行历史
    this.executionHistory.push({
      taskId: context.taskId,
      success,
      output,
      executionTime: metrics.totalTokens > 0 ? metrics.totalTokens : 0,
      toolCalls: [], // 从hook获取
      metrics,
    });

    // 限制历史大小
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }
  }

  /**
   * 查找匹配技能
   */
  async findMatchingPatterns(taskInput: string): Promise<SkillPattern[]> {
    if (!this.config.patternMatchEnabled) {
      return [];
    }

    // 先尝试从缓存查找
    const cacheMatches = this.matchFromCache(taskInput);
    if (cacheMatches.length > 0) {
      return cacheMatches;
    }

    // 从库中查找
    const patterns = await this.library.findPatterns(taskInput);
    
    // 更新缓存
    for (const pattern of patterns.slice(0, this.config.maxCachedPatterns)) {
      this.patternCache.set(pattern.patternId, pattern);
    }

    return patterns;
  }

  /**
   * 从缓存匹配
   */
  private matchFromCache(taskInput: string): SkillPattern[] {
    const matches: SkillPattern[] = [];
    const lowerInput = taskInput.toLowerCase();

    for (const pattern of this.patternCache.values()) {
      // 检查触发词
      for (const trigger of pattern.triggerConditions) {
        if (lowerInput.includes(trigger.value.toLowerCase())) {
          matches.push(pattern);
          break;
        }
      }
    }

    return matches;
  }

  /**
   * 获取技能建议
   */
  async getSkillSuggestions(taskInput: string): Promise<{
    existing: SkillPattern[];
    suggested: string[];
  }> {
    const existing = await this.findMatchingPatterns(taskInput);
    
    // 生成建议
    const suggested: string[] = [];
    
    if (existing.length === 0) {
      suggested.push('考虑创建一个新的技能来处理这类任务');
    }
    
    if (existing.length > 0 && existing[0].confidence < 0.8) {
      suggested.push('现有技能置信度较低，可能需要优化');
    }

    return {
      existing,
      suggested,
    };
  }

  /**
   * 手动触发技能生成
   */
  async triggerManualGeneration(taskId: string, taskInput: string): Promise<void> {
    // 构造轨迹
    const trajectory = {
      trajectoryId: `manual_${Date.now().toString(36)}`,
      taskId,
      taskInput,
      taskOutput: '',
      toolCalls: [],
      success: true,
      reward: 1,
      tokenUsage: 0,
      executionTime: 0,
      metadata: {
        domain: 'general',
        complexity: 'medium' as const,
        category: 'general',
        tags: [],
      },
      createdAt: new Date(),
    };

    await this.hook.triggerManualGeneration(trajectory);
  }

  /**
   * 获取执行统计
   */
  async getExecutionStats(): Promise<{
    totalTasks: number;
    successRate: number;
    avgExecutionTime: number;
    patternsGenerated: number;
    patternsInLibrary: number;
  }> {
    const stats = await this.generator.getStatistics();
    const libraryPatterns = await this.library.listPatterns();

    const totalTasks = this.executionHistory.length;
    const successfulTasks = this.executionHistory.filter(t => t.success).length;

    return {
      totalTasks,
      successRate: totalTasks > 0 ? successfulTasks / totalTasks : 0,
      avgExecutionTime: totalTasks > 0 
        ? this.executionHistory.reduce((sum, t) => sum + t.executionTime, 0) / totalTasks 
        : 0,
      patternsGenerated: stats.totalGenerated,
      patternsInLibrary: libraryPatterns.length,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    this.hook.updateConfig(this.config.hookConfig);
  }

  /**
   * 同步库中的技能到缓存
   */
  async syncPatternCache(): Promise<void> {
    const patterns = await this.library.listPatterns();
    this.patternCache.clear();
    
    for (const pattern of patterns.slice(0, this.config.maxCachedPatterns)) {
      this.patternCache.set(pattern.patternId, pattern);
    }
  }

  /**
   * 获取钩子实例（用于高级配置）
   */
  getHook(): TaskCompletionHook {
    return this.hook;
  }

  /**
   * 获取生成器实例
   */
  getGenerator(): SkillAutoGenerator {
    return this.generator;
  }
}

// ============ 简单的内存技能库实现 ============

export class InMemorySkillLibrary implements SkillLibrary {
  private patterns: Map<string, SkillPattern> = new Map();

  async findPatterns(query: string): Promise<SkillPattern[]> {
    const lowerQuery = query.toLowerCase();
    const results: SkillPattern[] = [];

    for (const pattern of this.patterns.values()) {
      // 检查名称和描述
      if (pattern.name.toLowerCase().includes(lowerQuery) ||
          pattern.description.toLowerCase().includes(lowerQuery)) {
        results.push(pattern);
        continue;
      }

      // 检查触发词
      for (const trigger of pattern.triggerConditions) {
        if (lowerQuery.includes(trigger.value.toLowerCase())) {
          results.push(pattern);
          break;
        }
      }
    }

    return results;
  }

  async findByTags(tags: string[]): Promise<SkillPattern[]> {
    const results: SkillPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (tags.some(tag => pattern.tags.includes(tag))) {
        results.push(pattern);
      }
    }

    return results;
  }

  async getPattern(patternId: string): Promise<SkillPattern | null> {
    return this.patterns.get(patternId) || null;
  }

  async savePattern(pattern: SkillPattern): Promise<void> {
    this.patterns.set(pattern.patternId, pattern);
  }

  async deletePattern(patternId: string): Promise<void> {
    this.patterns.delete(patternId);
  }

  async listPatterns(): Promise<SkillPattern[]> {
    return Array.from(this.patterns.values());
  }
}

export default ActorSkillIntegration;
