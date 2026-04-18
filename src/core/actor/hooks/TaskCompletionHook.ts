/**
 * TaskCompletionHook - 任务完成钩子
 * 
 * 在任务完成时触发技能生成流程
 */

import { EventEmitter } from 'events';
import {
  TaskTrajectory,
  ToolCall,
  TaskMetadata,
} from '../../../modules/skill-system/auto-generation/types';
import { SkillAutoGenerator } from '../../../modules/skill-system/auto-generation/SkillAutoGenerator';

export interface HookConfig {
  enabled: boolean;
  triggerOnSuccess: boolean;
  triggerOnFailure: boolean;
  triggerOnLowConfidence: boolean;
  confidenceThreshold: number;
  batchMode: boolean;
  batchSize: number;
  batchTimeout: number;
}

export const DEFAULT_HOOK_CONFIG: HookConfig = {
  enabled: true,
  triggerOnSuccess: true,
  triggerOnFailure: false,
  triggerOnLowConfidence: true,
  confidenceThreshold: 0.7,
  batchMode: false,
  batchSize: 10,
  batchTimeout: 60000, // 1分钟
};

export class TaskCompletionHook extends EventEmitter {
  private config: HookConfig;
  private generator: SkillAutoGenerator;
  private taskQueue: TaskTrajectory[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private toolCalls: ToolCall[] = [];
  private currentTaskId: string | null = null;
  private currentTaskStartTime: number = 0;
  private taskInput: string = '';
  private taskMetadata: TaskMetadata | null = null;

  constructor(
    generator: SkillAutoGenerator,
    config: Partial<HookConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_HOOK_CONFIG, ...config };
    this.generator = generator;
  }

  /**
   * 开始跟踪任务
   */
  startTask(taskId: string, taskInput: string, metadata?: TaskMetadata): void {
    if (!this.config.enabled) {
      return;
    }

    this.currentTaskId = taskId;
    this.taskInput = taskInput;
    this.taskMetadata = metadata || null;
    this.toolCalls = [];
    this.currentTaskStartTime = Date.now();

    this.emit('task_started', { taskId, timestamp: new Date() });
  }

  /**
   * 记录工具调用
   */
  recordToolCall(
    toolId: string,
    toolName: string,
    arguments: Record<string, unknown>,
    result: unknown,
    success: boolean,
    duration: number
  ): void {
    if (!this.currentTaskId) {
      return;
    }

    this.toolCalls.push({
      toolId,
      toolName,
      arguments,
      result,
      success,
      duration,
    });
  }

  /**
   * 结束任务并触发技能生成检查
   */
  async endTask(taskOutput: string, success: boolean): Promise<void> {
    if (!this.currentTaskId) {
      return;
    }

    const taskId = this.currentTaskId;
    const toolCalls = [...this.toolCalls];
    const executionTime = Date.now() - this.currentTaskStartTime;

    // 重置状态
    this.currentTaskId = null;
    this.toolCalls = [];

    // 构建轨迹
    const trajectory = this.buildTrajectory(
      taskId,
      this.taskInput,
      taskOutput,
      toolCalls,
      success,
      executionTime
    );

    this.emit('task_completed', { taskId, success, timestamp: new Date() });

    // 检查是否应该触发
    if (this.shouldTrigger(trajectory)) {
      if (this.config.batchMode) {
        this.addToBatch(trajectory);
      } else {
        await this.triggerGeneration(trajectory);
      }
    }
  }

  /**
   * 检查是否应该触发技能生成
   */
  private shouldTrigger(trajectory: TaskTrajectory): boolean {
    // 成功时触发
    if (trajectory.success && this.config.triggerOnSuccess) {
      return true;
    }

    // 失败时触发（用于分析失败模式）
    if (!trajectory.success && this.config.triggerOnFailure) {
      return true;
    }

    // 低置信度时触发
    if (this.config.triggerOnLowConfidence) {
      const confidence = this.calculateConfidence(trajectory);
      if (confidence < this.config.confidenceThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * 计算任务置信度
   */
  private calculateConfidence(trajectory: TaskTrajectory): number {
    let confidence = 0.5;

    // 工具调用数量
    if (trajectory.toolCalls.length >= 3) {
      confidence += 0.2;
    }

    // 成功率
    const successRate = trajectory.toolCalls.filter(c => c.success).length / 
      Math.max(trajectory.toolCalls.length, 1);
    if (successRate === 1) {
      confidence += 0.2;
    } else if (successRate >= 0.8) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * 构建轨迹
   */
  private buildTrajectory(
    taskId: string,
    taskInput: string,
    taskOutput: string,
    toolCalls: ToolCall[],
    success: boolean,
    executionTime: number
  ): TaskTrajectory {
    const totalTokens = toolCalls.reduce((sum, c) => sum + (c.tokens || 0), 0);

    return {
      trajectoryId: `traj_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      taskId,
      taskInput,
      taskOutput,
      toolCalls,
      success,
      reward: success ? 1 : 0,
      tokenUsage: totalTokens,
      executionTime,
      metadata: this.taskMetadata || {
        domain: this.inferDomain(taskInput),
        complexity: this.inferComplexity(toolCalls),
        category: this.inferCategory(toolCalls),
        tags: this.extractTags(taskInput),
      },
      createdAt: new Date(),
    };
  }

  /**
   * 推断领域
   */
  private inferDomain(taskInput: string): string {
    const lower = taskInput.toLowerCase();
    
    if (lower.includes('code') || lower.includes('编程') || lower.includes('开发')) {
      return 'development';
    }
    if (lower.includes('data') || lower.includes('数据') || lower.includes('分析')) {
      return 'data';
    }
    if (lower.includes('web') || lower.includes('网页') || lower.includes('网站')) {
      return 'web';
    }
    if (lower.includes('file') || lower.includes('文件') || lower.includes('文档')) {
      return 'document';
    }
    
    return 'general';
  }

  /**
   * 推断复杂度
   */
  private inferComplexity(toolCalls: ToolCall[]): 'low' | 'medium' | 'high' {
    if (toolCalls.length <= 2) return 'low';
    if (toolCalls.length <= 5) return 'medium';
    return 'high';
  }

  /**
   * 推断类别
   */
  private inferCategory(toolCalls: ToolCall[]): string {
    const tools = toolCalls.map(c => c.toolName);
    
    if (tools.some(t => t.includes('file'))) return 'file-operation';
    if (tools.some(t => t.includes('web') || t.includes('fetch'))) return 'web-request';
    if (tools.some(t => t.includes('bash') || t.includes('shell'))) return 'command-execution';
    if (tools.some(t => t.includes('image'))) return 'image-processing';
    
    return 'general';
  }

  /**
   * 提取标签
   */
  private extractTags(taskInput: string): string[] {
    const tags: string[] = [];
    const lower = taskInput.toLowerCase();
    
    const keywords: [string, string][] = [
      ['create', '创建'],
      ['read', '读取'],
      ['write', '写入'],
      ['edit', '编辑'],
      ['delete', '删除'],
      ['search', '搜索'],
      ['analyze', '分析'],
      ['generate', '生成'],
      ['convert', '转换'],
      ['download', '下载'],
    ];

    for (const [en, cn] of keywords) {
      if (lower.includes(en) || lower.includes(cn)) {
        tags.push(en);
      }
    }

    return [...new Set(tags)].slice(0, 5);
  }

  /**
   * 添加到批处理队列
   */
  private addToBatch(trajectory: TaskTrajectory): void {
    this.taskQueue.push(trajectory);

    // 设置定时器
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.config.batchTimeout);
    }

    // 检查批量大小
    if (this.taskQueue.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * 处理批量任务
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const queue = [...this.taskQueue];
    this.taskQueue = [];

    this.emit('batch_started', { count: queue.length, timestamp: new Date() });

    for (const trajectory of queue) {
      await this.triggerGeneration(trajectory);
    }

    this.emit('batch_completed', { count: queue.length, timestamp: new Date() });
  }

  /**
   * 触发技能生成
   */
  private async triggerGeneration(trajectory: TaskTrajectory): Promise<void> {
    this.emit('generation_triggered', { 
      taskId: trajectory.taskId, 
      timestamp: new Date() 
    });

    try {
      const result = await this.generator.generateFromTrajectory(trajectory);
      
      if (result.success && result.skill) {
        this.emit('skill_generated', {
          patternId: result.pattern?.patternId,
          skillName: result.skill.skillName,
          timestamp: new Date(),
        });
      } else {
        this.emit('generation_skipped', {
          taskId: trajectory.taskId,
          reasons: result.errors,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.emit('generation_error', {
        taskId: trajectory.taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * 手动触发技能生成
   */
  async triggerManualGeneration(trajectory: TaskTrajectory): Promise<void> {
    await this.triggerGeneration(trajectory);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HookConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): HookConfig {
    return { ...this.config };
  }

  /**
   * 获取待处理队列大小
   */
  getQueueSize(): number {
    return this.taskQueue.length;
  }
}

export default TaskCompletionHook;
