/**
 * SkillEvolutionTracker - 技能进化追踪器
 * 
 * 核心功能：
 * - 追踪技能使用效果
 * - 收集用户反馈
 * - 触发技能优化
 * - 版本管理
 */

import {
  SkillPattern,
  TaskTrajectory,
  EvolutionRecord,
  EvolutionChange,
  EvolutionMetrics,
  SkillDefinition,
} from './types';
import * as fs from 'fs';
import * as path from 'path';

interface TrackedPattern {
  pattern: SkillPattern;
  usageCount: number;
  successCount: number;
  lastUsed: Date;
  evolutionHistory: EvolutionRecord[];
  userFeedback: UserFeedback[];
}

interface UserFeedback {
  feedbackId: string;
  rating: number; // 1-5
  comment?: string;
  userId?: string;
  timestamp: Date;
}

interface UsageRecord {
  patternId: string;
  taskId: string;
  success: boolean;
  executionTime: number;
  tokenUsage: number;
  timestamp: Date;
}

export class SkillEvolutionTracker {
  private trackedPatterns: Map<string, TrackedPattern> = new Map();
  private usageHistory: UsageRecord[] = [];
  private storagePath: string;
  private autoEvolutionThreshold: number = 0.7; // 自动进化阈值
  private evolutionCooldown: number = 24 * 60 * 60 * 1000; // 进化冷却期（24小时）

  constructor(storagePath: string = './data/skill-evolution') {
    this.storagePath = storagePath;
    this.ensureStorageDir();
    this.loadFromDisk();
  }

  /**
   * 确保存储目录存在
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * 从磁盘加载数据
   */
  private loadFromDisk(): void {
    try {
      const patternsFile = path.join(this.storagePath, 'patterns.json');
      if (fs.existsSync(patternsFile)) {
        const data = JSON.parse(fs.readFileSync(patternsFile, 'utf-8'));
        for (const [id, tracked] of Object.entries(data.trackedPatterns || {})) {
          const t = tracked as TrackedPattern;
          t.pattern.createdAt = new Date(t.pattern.createdAt);
          t.pattern.updatedAt = new Date(t.pattern.updatedAt);
          t.lastUsed = new Date(t.lastUsed);
          for (const record of t.evolutionHistory || []) {
            record.createdAt = new Date(record.createdAt);
          }
          this.trackedPatterns.set(id, t);
        }
      }

      const usageFile = path.join(this.storagePath, 'usage.json');
      if (fs.existsSync(usageFile)) {
        const data = JSON.parse(fs.readFileSync(usageFile, 'utf-8'));
        this.usageHistory = (data.usageHistory || []).map((r: UsageRecord) => ({
          ...r,
          timestamp: new Date(r.timestamp),
        }));
      }
    } catch (error) {
      console.warn('Failed to load evolution data from disk:', error);
    }
  }

  /**
   * 保存数据到磁盘
   */
  private saveToDisk(): void {
    try {
      const patternsFile = path.join(this.storagePath, 'patterns.json');
      const patternsData: Record<string, TrackedPattern> = {};
      for (const [id, tracked] of this.trackedPatterns) {
        patternsData[id] = {
          ...tracked,
          pattern: {
            ...tracked.pattern,
            createdAt: tracked.pattern.createdAt,
            updatedAt: tracked.pattern.updatedAt,
          },
        };
      }
      fs.writeFileSync(patternsFile, JSON.stringify({ trackedPatterns: patternsData }, null, 2));

      const usageFile = path.join(this.storagePath, 'usage.json');
      fs.writeFileSync(usageFile, JSON.stringify({ usageHistory: this.usageHistory }, null, 2));
    } catch (error) {
      console.warn('Failed to save evolution data to disk:', error);
    }
  }

  /**
   * 记录技能生成
   */
  async recordGeneration(pattern: SkillPattern, sourceTrajectory: TaskTrajectory): Promise<void> {
    const tracked: TrackedPattern = {
      pattern,
      usageCount: 0,
      successCount: 0,
      lastUsed: new Date(),
      evolutionHistory: [],
      userFeedback: [],
    };

    this.trackedPatterns.set(pattern.patternId, tracked);
    this.saveToDisk();
  }

  /**
   * 记录技能使用
   */
  async recordUsage(
    patternId: string,
    taskId: string,
    success: boolean,
    executionTime: number,
    tokenUsage: number
  ): Promise<void> {
    const tracked = this.trackedPatterns.get(patternId);
    if (!tracked) {
      return;
    }

    // 更新使用统计
    tracked.usageCount++;
    if (success) {
      tracked.successCount++;
    }
    tracked.lastUsed = new Date();

    // 记录使用历史
    this.usageHistory.push({
      patternId,
      taskId,
      success,
      executionTime,
      tokenUsage,
      timestamp: new Date(),
    });

    // 限制历史记录大小
    if (this.usageHistory.length > 10000) {
      this.usageHistory = this.usageHistory.slice(-5000);
    }

    // 检查是否需要触发进化
    await this.checkEvolutionTrigger(patternId);

    this.saveToDisk();
  }

  /**
   * 添加用户反馈
   */
  async addFeedback(
    patternId: string,
    rating: number,
    comment?: string,
    userId?: string
  ): Promise<void> {
    const tracked = this.trackedPatterns.get(patternId);
    if (!tracked) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    const feedback: UserFeedback = {
      feedbackId: this.generateId(),
      rating: Math.max(1, Math.min(5, rating)),
      comment,
      userId,
      timestamp: new Date(),
    };

    tracked.userFeedback.push(feedback);

    // 检查是否需要触发进化
    if (rating <= 2) {
      await this.triggerEvolution(patternId, 'feedback');
    }

    this.saveToDisk();
  }

  /**
   * 检查是否应该触发进化
   */
  private async checkEvolutionTrigger(patternId: string): Promise<void> {
    const tracked = this.trackedPatterns.get(patternId);
    if (!tracked) {
      return;
    }

    // 检查冷却期
    const lastEvolution = tracked.evolutionHistory[tracked.evolutionHistory.length - 1];
    if (lastEvolution) {
      const timeSinceLastEvolution = Date.now() - lastEvolution.createdAt.getTime();
      if (timeSinceLastEvolution < this.evolutionCooldown) {
        return;
      }
    }

    // 计算当前成功率
    const successRate = tracked.usageCount > 0 
      ? tracked.successCount / tracked.usageCount 
      : 0;

    // 检查平均评分
    const avgRating = this.calculateAverageRating(tracked.userFeedback);

    // 检查是否触发自动进化
    if (successRate < this.autoEvolutionThreshold || avgRating < 3) {
      await this.triggerEvolution(patternId, 'auto');
    }
  }

  /**
   * 触发技能进化
   */
  async triggerEvolution(
    patternId: string,
    triggerType: 'usage' | 'feedback' | 'manual' | 'auto'
  ): Promise<SkillPattern | null> {
    const tracked = this.trackedPatterns.get(patternId);
    if (!tracked) {
      return null;
    }

    // 获取进化前指标
    const metricsBefore = this.calculateMetrics(patternId);

    // 生成进化建议
    const changes = await this.generateEvolutionChanges(tracked);

    if (changes.length === 0) {
      return null;
    }

    // 应用进化
    const evolvedPattern = this.applyChanges(tracked.pattern, changes);

    // 创建进化记录
    const record: EvolutionRecord = {
      recordId: this.generateId(),
      patternId,
      version: this.incrementVersion(tracked.pattern.version),
      triggerType,
      changes,
      success: true,
      metricsBefore,
      metricsAfter: metricsBefore, // 将由实际使用更新
      createdAt: new Date(),
    };

    // 更新追踪数据
    tracked.pattern = evolvedPattern;
    tracked.pattern.updatedAt = new Date();
    tracked.evolutionHistory.push(record);

    this.saveToDisk();

    return evolvedPattern;
  }

  /**
   * 计算指标
   */
  private calculateMetrics(patternId: string): EvolutionMetrics {
    const recentUsage = this.usageHistory
      .filter(r => r.patternId === patternId)
      .slice(-100); // 最近100次使用

    const successRate = recentUsage.length > 0
      ? recentUsage.filter(r => r.success).length / recentUsage.length
      : 0;

    const avgExecutionTime = recentUsage.length > 0
      ? recentUsage.reduce((sum, r) => sum + r.executionTime, 0) / recentUsage.length
      : 0;

    const totalTokenUsage = recentUsage.reduce((sum, r) => sum + r.tokenUsage, 0);

    const tracked = this.trackedPatterns.get(patternId);
    const avgRating = tracked ? this.calculateAverageRating(tracked.userFeedback) : 0;

    return {
      successRate,
      avgExecutionTime,
      userSatisfaction: avgRating,
      tokenUsage: totalTokenUsage,
    };
  }

  /**
   * 计算平均评分
   */
  private calculateAverageRating(feedback: UserFeedback[]): number {
    if (feedback.length === 0) {
      return 0;
    }
    return feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
  }

  /**
   * 生成进化变更
   */
  private async generateEvolutionChanges(
    tracked: TrackedPattern
  ): Promise<EvolutionChange[]> {
    const changes: EvolutionChange[] = [];

    // 分析成功率
    const successRate = tracked.usageCount > 0
      ? tracked.successCount / tracked.usageCount
      : 0;

    if (successRate < 0.8) {
      // 检查具体失败原因
      const failedUsages = this.usageHistory
        .filter(r => r.patternId === tracked.pattern.patternId && !r.success)
        .slice(-20);

      // 添加错误处理建议
      changes.push({
        type: 'modify',
        location: 'steps',
        newValue: tracked.pattern.steps.map(s => ({
          ...s,
          conditions: [...(s.conditions || []), '检查上一步是否成功'],
        })),
        reason: `成功率(${successRate})低于80%，添加错误检查`,
      });
    }

    // 分析用户反馈
    const lowRatingFeedback = tracked.userFeedback.filter(f => f.rating <= 3);
    if (lowRatingFeedback.length > 0) {
      const suggestions = lowRatingFeedback
        .filter(f => f.comment)
        .map(f => f.comment)
        .join('; ');

      if (suggestions) {
        changes.push({
          type: 'modify',
          location: 'pitfalls',
          newValue: [...tracked.pattern.pitfalls, `用户反馈: ${suggestions}`],
          reason: '根据用户反馈添加注意事项',
        });
      }
    }

    // 检查使用频率
    if (tracked.usageCount > 10 && tracked.evolutionHistory.length < 3) {
      // 高频使用的技能可以考虑简化步骤
      const avgTime = this.usageHistory
        .filter(r => r.patternId === tracked.pattern.patternId)
        .reduce((sum, r, _, arr) => sum + r.executionTime / arr.length, 0);

      if (avgTime > 60) {
        changes.push({
          type: 'modify',
          location: 'description',
          newValue: tracked.pattern.description + ' (优化版)',
          reason: '高频使用，考虑优化效率',
        });
      }
    }

    return changes;
  }

  /**
   * 应用变更
   */
  private applyChanges(pattern: SkillPattern, changes: EvolutionChange[]): SkillPattern {
    const evolved = { ...pattern };

    for (const change of changes) {
      switch (change.location) {
        case 'steps':
          if (change.newValue) {
            evolved.steps = change.newValue as unknown as typeof pattern.steps;
          }
          break;
        case 'pitfalls':
          if (change.newValue) {
            evolved.pitfalls = change.newValue as unknown as string[];
          }
          break;
        case 'description':
          if (change.newValue) {
            evolved.description = change.newValue as string;
          }
          break;
        case 'version':
          evolved.version = this.incrementVersion(pattern.version);
          break;
      }
    }

    evolved.updatedAt = new Date();
    return evolved;
  }

  /**
   * 递增版本号
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取进化历史
   */
  async getEvolutionHistory(patternId: string): Promise<EvolutionRecord[]> {
    const tracked = this.trackedPatterns.get(patternId);
    return tracked?.evolutionHistory || [];
  }

  /**
   * 获取技能统计
   */
  async getPatternStats(patternId: string): Promise<{
    usageCount: number;
    successRate: number;
    avgRating: number;
    evolutionCount: number;
    lastUsed: Date | null;
  } | null> {
    const tracked = this.trackedPatterns.get(patternId);
    if (!tracked) {
      return null;
    }

    return {
      usageCount: tracked.usageCount,
      successRate: tracked.usageCount > 0 ? tracked.successCount / tracked.usageCount : 0,
      avgRating: this.calculateAverageRating(tracked.userFeedback),
      evolutionCount: tracked.evolutionHistory.length,
      lastUsed: tracked.lastUsed,
    };
  }

  /**
   * 获取全局统计
   */
  async getStatistics(): Promise<{
    totalPatterns: number;
    totalGenerated: number;
    totalUsages: number;
    overallSuccessRate: number;
    patternsByDomain: Record<string, number>;
    topPatterns: Array<{ patternId: string; usageCount: number }>;
  }> {
    const patterns = Array.from(this.trackedPatterns.values());
    const totalUsages = this.usageHistory.length;
    const successfulUsages = this.usageHistory.filter(r => r.success).length;

    // 按领域统计
    const patternsByDomain: Record<string, number> = {};
    for (const tracked of patterns) {
      const domain = tracked.pattern.tags[0] || 'other';
      patternsByDomain[domain] = (patternsByDomain[domain] || 0) + 1;
    }

    // Top模式
    const topPatterns = patterns
      .map(t => ({ patternId: t.pattern.patternId, usageCount: t.usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    return {
      totalPatterns: patterns.length,
      totalGenerated: patterns.length,
      totalUsages,
      overallSuccessRate: totalUsages > 0 ? successfulUsages / totalUsages : 0,
      patternsByDomain,
      topPatterns,
    };
  }

  /**
   * 导出技能为标准格式
   */
  async exportAsSkillDefinition(patternId: string): Promise<SkillDefinition | null> {
    const tracked = this.trackedPatterns.get(patternId);
    if (!tracked) {
      return null;
    }

    const pattern = tracked.pattern;
    return {
      skillName: pattern.name,
      skillDescription: pattern.description,
      version: pattern.version,
      tags: pattern.tags,
      relatedSkills: pattern.relatedPatterns,
      patternId: pattern.patternId,
      confidence: pattern.confidence,
      sourceTaskId: '',
      inputs: pattern.inputs.map(i => ({
        name: i.name,
        type: i.type,
        description: i.description,
        required: i.required,
      })),
      outputs: pattern.outputs.map(o => ({
        name: o.name,
        type: o.type,
        description: o.description,
      })),
      prerequisites: pattern.prerequisites,
      triggers: pattern.triggerConditions.map(t => t.value),
      steps: pattern.steps.map(s => `${s.order}. ${s.description}`).join('\n'),
      pitfalls: pattern.pitfalls.join('\n'),
    };
  }

  /**
   * 清理旧数据
   */
  async cleanup(daysToKeep: number = 30): Promise<void> {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    // 清理使用历史
    this.usageHistory = this.usageHistory.filter(r => r.timestamp.getTime() > cutoffTime);

    // 清理旧的进化记录
    for (const tracked of this.trackedPatterns.values()) {
      tracked.evolutionHistory = tracked.evolutionHistory.filter(
        r => r.createdAt.getTime() > cutoffTime
      );
    }

    this.saveToDisk();
  }
}

export default SkillEvolutionTracker;
