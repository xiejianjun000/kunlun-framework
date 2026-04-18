/**
 * KnowledgeGapDetector - 知识缺口检测器
 * 
 * 基于OpenTaiji事件驱动机制的知识缺口检测实现
 * 主动发现用户知识缺口并提供建议
 */

import crypto from 'crypto';
import {
  type KnowledgeGap,
  type KnowledgeGapDetectorState,
  type KnowledgeGapConfig,
  type GapDetectedEventData,
  type GapSeverity,
  type KnowledgeDomain,
  DEFAULT_ACTIVE_MEMORY_CONFIG,
} from './types';
import type { ActiveMemoryEventListener } from './types';

export class KnowledgeGapDetector {
  private state: KnowledgeGapDetectorState;
  private config: KnowledgeGapConfig;
  private listeners: Map<string, ActiveMemoryEventListener<GapDetectedEventData>> = new Map();
  private scanInterval?: NodeJS.Timeout;

  constructor(config?: Partial<KnowledgeGapConfig>) {
    this.config = {
      ...DEFAULT_ACTIVE_MEMORY_CONFIG.knowledgeGap,
      ...config,
    };
    this.state = {
      gaps: new Map(),
      activeMonitors: new Map(),
      lastScanAt: Date.now(),
      totalDetected: 0,
      resolvedCount: 0,
    };
    this.startScanScheduler();
  }

  /**
   * 启动定期扫描调度器
   */
  private startScanScheduler(): void {
    if (this.config.autoResolve) {
      this.scanInterval = setInterval(() => {
        this.performPeriodicScan();
      }, this.config.checkIntervalMs);
    }
  }

  /**
   * 停止调度器
   */
  public destroy(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
  }

  /**
   * 生成缺口ID
   */
  private generateGapId(domain: KnowledgeDomain, topic: string): string {
    const raw = `${domain}:${topic}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  /**
   * 计算严重程度
   */
  public calculateSeverity(confidence: number): GapSeverity {
    const { low, medium, high } = this.config.severityThresholds;
    if (confidence >= high) return 'critical';
    if (confidence >= medium) return 'high';
    if (confidence >= low) return 'medium';
    return 'low';
  }

  /**
   * 检测知识缺口
   */
  public detectGap(
    domain: KnowledgeDomain,
    topic: string,
    description: string,
    confidence: number,
    trigger: string,
    relatedMemories: string[] = []
  ): KnowledgeGap | null {
    const id = this.generateGapId(domain, topic);
    const now = Date.now();
    const severity = this.calculateSeverity(confidence);

    // 检查是否已存在
    const existing = this.state.gaps.get(id);
    if (existing && !existing.resolved) {
      // 更新现有缺口
      return this.updateGap(id, {
        confidence,
        trigger,
        relatedMemories,
      });
    }

    // 创建新缺口
    const gap: KnowledgeGap = {
      id,
      domain,
      topic,
      description,
      severity,
      confidence,
      detectedAt: now,
      lastChecked: now,
      suggestedActions: this.generateSuggestions(domain, topic),
      relatedMemories,
      resolved: false,
    };

    this.state.gaps.set(id, gap);
    this.state.totalDetected++;

    // 创建活动监视器
    this.state.activeMonitors.set(id, {
      gapId: id,
      startTime: now,
      checkCount: 0,
      lastCheckResult: severity,
    });

    // 触发事件
    if (confidence >= this.config.minConfidenceForAction) {
      this.emitGapEvent(gap, 'detected', trigger, confidence, severity);
    }

    return gap;
  }

  /**
   * 从对话内容检测缺口
   */
  public detectGapFromContent(content: string): KnowledgeGap | null {
    // 问题检测模式
    const questionPatterns = [
      // 中文问题
      /怎么(做|办|回事|使用|获取|找到)(.+)/gi,
      /(为什么|为何|什么原因)(.+)/gi,
      /(是什么|什么意思|哪个)(.+)/gi,
      /(如何|怎样)(.+)/gi,
      // 英文问题
      /\b(how|what|why|which|when|where)\b(.+)/gi,
      /\b(don't know|unsure|confused|need help)\b/gi,
    ];

    for (const pattern of questionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const question = match[0];
        const topic = this.extractTopic(question);
        const domain = this.inferDomain(topic);
        
        // 简单置信度计算
        const confidence = this.calculateConfidenceFromQuestion(question);
        
        if (confidence >= this.config.minConfidenceForAction) {
          return this.detectGap(
            domain,
            topic,
            `用户询问: ${question}`,
            confidence,
            content
          );
        }
      }
    }

    return null;
  }

  /**
   * 从问题计算置信度
   */
  private calculateConfidenceFromQuestion(question: string): number {
    let confidence = 0.5;
    
    // 问题越具体，置信度越高
    if (question.length > 10) confidence += 0.1;
    if (question.length > 30) confidence += 0.1;
    
    // 包含关键疑问词
    if (/怎么|如何|how to/i.test(question)) confidence += 0.15;
    if (/为什么|why/i.test(question)) confidence += 0.1;
    
    // 限制置信度范围
    return Math.min(0.95, Math.max(0.3, confidence));
  }

  /**
   * 提取主题
   */
  private extractTopic(question: string): string {
    return question
      .replace(/[?？.!！]/g, '')
      .replace(/\b(怎么|如何|为什么|是什么|哪个|怎么|how|what|why|which|when|where)\b/gi, '')
      .trim()
      .slice(0, 100);
  }

  /**
   * 推断领域
   */
  private inferDomain(topic: string): KnowledgeDomain {
    const lower = topic.toLowerCase();
    
    if (/代码|程序|开发|编程|api|函数|变量|编译|调试/i.test(lower)) return 'technical';
    if (/项目|客户|会议|汇报|deadline|任务/i.test(lower)) return 'professional';
    if (/个人|生日|爱好|家庭|朋友|度假/i.test(lower)) return 'personal';
    if (/环境|生态|污染|碳|排放|环保/i.test(lower)) return 'technical'; // 环境相关技术
    
    return 'general';
  }

  /**
   * 生成建议操作
   */
  private generateSuggestions(domain: KnowledgeDomain, topic: string): string[] {
    const suggestions: string[] = [];
    
    switch (domain) {
      case 'technical':
        suggestions.push(
          `提供${topic}的技术文档`,
          `搜索相关技术方案`,
          `建议查阅官方文档`,
          `创建相关技能以备后用`
        );
        break;
      case 'professional':
        suggestions.push(
          `收集${topic}相关信息`,
          `建议咨询相关同事`,
          `提供项目模板`,
          `创建任务清单`
        );
        break;
      case 'personal':
        suggestions.push(
          `记录该偏好`,
          `在USER.md中保存`,
          `下次对话时主动询问`
        );
        break;
      default:
        suggestions.push(
          `提供相关信息`,
          `搜索解决方案`,
          `建议深入了解`
        );
    }
    
    return suggestions;
  }

  /**
   * 更新缺口
   */
  public updateGap(
    id: string,
    updates: {
      confidence?: number;
      trigger?: string;
      relatedMemories?: string[];
    }
  ): KnowledgeGap | null {
    const gap = this.state.gaps.get(id);
    if (!gap) return null;

    const monitor = this.state.activeMonitors.get(id);
    const now = Date.now();

    if (updates.confidence !== undefined) {
      gap.confidence = updates.confidence;
      gap.severity = this.calculateSeverity(updates.confidence);
    }
    
    gap.lastChecked = now;
    
    if (updates.relatedMemories) {
      // 合并相关记忆
      const existing = new Set(gap.relatedMemories);
      updates.relatedMemories.forEach(m => existing.add(m));
      gap.relatedMemories = Array.from(existing);
    }

    if (monitor) {
      monitor.checkCount++;
      monitor.lastCheckResult = gap.severity;
    }

    // 如果严重程度发生变化，触发更新事件
    if (updates.confidence !== undefined && monitor?.lastCheckResult !== gap.severity) {
      this.emitGapEvent(gap, 'updated', updates.trigger || '', gap.confidence, gap.severity);
    }

    return gap;
  }

  /**
   * 解决缺口
   */
  public resolveGap(id: string): boolean {
    const gap = this.state.gaps.get(id);
    if (!gap || gap.resolved) return false;

    gap.resolved = true;
    gap.resolvedAt = Date.now();
    this.state.resolvedCount++;

    // 移除活动监视器
    this.state.activeMonitors.delete(id);

    // 触发解决事件
    this.emitGapEvent(gap, 'resolved', '', gap.confidence, gap.severity);

    return true;
  }

  /**
   * 获取缺口
   */
  public getGap(id: string): KnowledgeGap | undefined {
    return this.state.gaps.get(id);
  }

  /**
   * 获取所有未解决的缺口
   */
  public getUnresolvedGaps(): KnowledgeGap[] {
    return Array.from(this.state.gaps.values()).filter(g => !g.resolved);
  }

  /**
   * 获取特定领域的缺口
   */
  public getGapsByDomain(domain: KnowledgeDomain): KnowledgeGap[] {
    return this.getUnresolvedGaps().filter(g => g.domain === domain);
  }

  /**
   * 获取高严重程度缺口
   */
  public getHighSeverityGaps(threshold: GapSeverity = 'high'): KnowledgeGap[] {
    const order: GapSeverity[] = ['low', 'medium', 'high', 'critical'];
    const minIndex = order.indexOf(threshold);
    
    return this.getUnresolvedGaps().filter(g => {
      const gapIndex = order.indexOf(g.severity);
      return gapIndex >= minIndex;
    });
  }

  /**
   * 执行定期扫描
   */
  public performPeriodicScan(): void {
    const now = Date.now();
    const scanInterval = this.config.checkIntervalMs;

    // 检查需要重新评估的缺口
    for (const [id, gap] of this.state.gaps) {
      if (gap.resolved) continue;

      const timeSinceLastCheck = now - gap.lastChecked;
      
      // 如果缺口存在时间过长，自动降低置信度
      if (timeSinceLastCheck > scanInterval * 10) {
        gap.confidence *= 0.9;
        gap.severity = this.calculateSeverity(gap.confidence);
        gap.lastChecked = now;
      }

      // 如果置信度太低，标记为可能已解决
      if (gap.confidence < 0.1) {
        if (this.config.autoResolve) {
          this.resolveGap(id);
        }
      }
    }

    this.state.lastScanAt = now;
  }

  /**
   * 订阅缺口事件
   */
  public subscribe(listenerId: string, listener: ActiveMemoryEventListener<GapDetectedEventData>): void {
    this.listeners.set(listenerId, listener);
  }

  /**
   * 取消订阅
   */
  public unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  /**
   * 触发缺口事件
   */
  private emitGapEvent(
    gap: KnowledgeGap,
    action: 'detected' | 'updated' | 'resolved',
    trigger: string,
    confidence: number,
    severity: GapSeverity
  ): void {
    const event = {
      type: 'gap.detected' as const,
      timestamp: Date.now(),
      sessionId: '',
      agentId: '',
      data: {
        gap,
        trigger,
        confidence,
        severity,
      },
    };

    for (const listener of this.listeners.values()) {
      try {
        listener(event);
      } catch (error) {
        console.error('KnowledgeGapDetector listener error:', error);
      }
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    total: number;
    unresolved: number;
    resolved: number;
    byDomain: Record<KnowledgeDomain, number>;
    bySeverity: Record<GapSeverity, number>;
    averageConfidence: number;
  } {
    const gaps = Array.from(this.state.gaps.values());
    const unresolved = gaps.filter(g => !g.resolved);
    
    const byDomain: Record<KnowledgeDomain, number> = {
      technical: 0, personal: 0, professional: 0, general: 0, contextual: 0,
    };
    const bySeverity: Record<GapSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0,
    };

    let sumConfidence = 0;
    for (const g of unresolved) {
      byDomain[g.domain]++;
      bySeverity[g.severity]++;
      sumConfidence += g.confidence;
    }

    return {
      total: this.state.totalDetected,
      unresolved: unresolved.length,
      resolved: this.state.resolvedCount,
      byDomain,
      bySeverity,
      averageConfidence: unresolved.length > 0 ? sumConfidence / unresolved.length : 0,
    };
  }

  /**
   * 导出状态
   */
  public export(): KnowledgeGapDetectorState {
    return {
      gaps: new Map(this.state.gaps),
      activeMonitors: new Map(this.state.activeMonitors),
      lastScanAt: this.state.lastScanAt,
      totalDetected: this.state.totalDetected,
      resolvedCount: this.state.resolvedCount,
    };
  }

  /**
   * 导入状态
   */
  public import(state: KnowledgeGapDetectorState): void {
    this.state = {
      gaps: new Map(state.gaps),
      activeMonitors: new Map(state.activeMonitors),
      lastScanAt: state.lastScanAt,
      totalDetected: state.totalDetected,
      resolvedCount: state.resolvedCount,
    };
  }
}

export default KnowledgeGapDetector;
