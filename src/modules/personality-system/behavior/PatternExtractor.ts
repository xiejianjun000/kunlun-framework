/**
 * PatternExtractor.ts
 * 模式提取器
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorData } from '../../core/interfaces/IPersonalitySystem';
import { BehaviorAnalyzer, BehaviorPattern } from './BehaviorAnalyzer';

/**
 * 序列模式接口
 */
export interface SequencePattern {
  /** 模式ID */
  id: string;
  /** 行为序列 */
  sequence: string[];
  /** 出现次数 */
  occurrenceCount: number;
  /** 相关行为ID */
  relatedBehaviorIds: string[];
  /** 置信度 */
  confidence: number;
}

/**
 * 时间模式接口
 */
export interface TemporalPattern {
  /** 模式ID */
  id: string;
  /** 模式类型 */
  type: 'daily' | 'weekly' | 'monthly';
  /** 高峰时段 */
  peakHours: number[];
  /** 平均间隔（毫秒） */
  averageInterval: number;
  /** 置信度 */
  confidence: number;
}

/**
 * 上下文模式接口
 */
export interface ContextPattern {
  /** 模式ID */
  id: string;
  /** 触发词 */
  trigger: string;
  /** 响应类型 */
  responseType: string;
  /** 出现次数 */
  occurrenceCount: number;
  /** 置信度 */
  confidence: number;
}

/**
 * 模式提取器类
 * 
 * 从行为数据中提取复杂的模式和序列
 * 支持序列模式、时间模式、上下文模式提取
 * 
 * @example
 * ```typescript
 * const extractor = new PatternExtractor();
 * 
 * // 提取序列模式
 * const sequences = await extractor.extractSequencePatterns(behaviors);
 * 
 * // 提取时间模式
 * const temporal = await extractor.extractTemporalPatterns(behaviors);
 * ```
 */
export class PatternExtractor {
  /** 最小序列长度 */
  private minSequenceLength = 2;
  
  /** 最大序列长度 */
  private maxSequenceLength = 5;
  
  /** 最小支持度 */
  private minSupport = 0.1;

  /**
   * 提取序列模式
   * 使用滑动窗口和频繁项集算法
   * @param behaviors 行为数据列表
   */
  async extractSequencePatterns(behaviors: BehaviorData[]): Promise<SequencePattern[]> {
    if (behaviors.length < this.minSequenceLength * 2) {
      return [];
    }

    // 按时间排序
    const sorted = [...behaviors].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 提取行为类型序列
    const typeSequence = sorted.map(b => b.type);

    // 生成候选序列
    const candidates = this.generateCandidates(typeSequence);

    // 计算支持度
    const patterns: SequencePattern[] = [];

    for (const candidate of candidates) {
      const occurrences = this.findSequenceOccurrences(typeSequence, candidate);
      
      if (occurrences.length >= 2) {
        const support = occurrences.length / (typeSequence.length - candidate.length + 1);
        
        if (support >= this.minSupport) {
          patterns.push({
            id: `seq_${uuidv4()}`,
            sequence: candidate,
            occurrenceCount: occurrences.length,
            relatedBehaviorIds: this.getRelatedBehaviorIds(sorted, occurrences, candidate.length),
            confidence: support
          });
        }
      }
    }

    // 按出现次数排序
    return patterns.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }

  /**
   * 生成候选序列
   */
  private generateCandidates(sequence: string[]): string[][] {
    const candidates: string[][] = [];

    for (let len = this.minSequenceLength; len <= this.maxSequenceLength; len++) {
      for (let i = 0; i <= sequence.length - len; i++) {
        candidates.push(sequence.slice(i, i + len));
      }
    }

    return candidates;
  }

  /**
   * 查找序列出现位置
   */
  private findSequenceOccurrences(sequence: string[], pattern: string[]): number[] {
    const occurrences: number[] = [];

    for (let i = 0; i <= sequence.length - pattern.length; i++) {
      let match = true;
      for (let j = 0; j < pattern.length; j++) {
        if (sequence[i + j] !== pattern[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        occurrences.push(i);
      }
    }

    return occurrences;
  }

  /**
   * 获取相关行为ID
   */
  private getRelatedBehaviorIds(
    behaviors: BehaviorData[],
    positions: number[],
    patternLength: number
  ): string[] {
    const ids: string[] = [];

    for (const pos of positions) {
      for (let i = 0; i < patternLength; i++) {
        if (behaviors[pos + i]) {
          ids.push(behaviors[pos + i].id);
        }
      }
    }

    return [...new Set(ids)];
  }

  /**
   * 提取时间模式
   * @param behaviors 行为数据列表
   */
  async extractTemporalPatterns(behaviors: BehaviorData[]): Promise<TemporalPattern[]> {
    if (behaviors.length < 10) {
      return [];
    }

    const patterns: TemporalPattern[] = [];

    // 分析小时分布
    const hourlyPattern = this.analyzeHourlyDistribution(behaviors);
    if (hourlyPattern.confidence >= 0.5) {
      patterns.push(hourlyPattern);
    }

    // 分析周分布
    const weeklyPattern = this.analyzeWeeklyDistribution(behaviors);
    if (weeklyPattern.confidence >= 0.5) {
      patterns.push(weeklyPattern);
    }

    // 计算平均行为间隔
    const sorted = [...behaviors].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalInterval = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalInterval += new Date(sorted[i].timestamp).getTime() - 
        new Date(sorted[i - 1].timestamp).getTime();
    }
    const avgInterval = sorted.length > 1 ? totalInterval / (sorted.length - 1) : 0;

    // 合并到第一个模式
    if (patterns.length > 0) {
      patterns[0].averageInterval = avgInterval;
    }

    return patterns;
  }

  /**
   * 分析小时分布
   */
  private analyzeHourlyDistribution(behaviors: BehaviorData[]): TemporalPattern {
    const hourCounts = new Array(24).fill(0);
    const total = behaviors.length;

    for (const behavior of behaviors) {
      const hour = new Date(behavior.timestamp).getHours();
      hourCounts[hour]++;
    }

    // 找出高峰时段
    const threshold = total / 24 * 1.5;
    const peakHours = hourCounts
      .map((count, hour) => ({ count, hour }))
      .filter(item => item.count >= threshold)
      .map(item => item.hour);

    // 计算置信度
    const variance = this.calculateVariance(hourCounts.map(c => c / total));
    const confidence = Math.min(1, (1 - variance) * 2);

    return {
      id: `temp_${uuidv4()}`,
      type: 'daily',
      peakHours,
      averageInterval: 0,
      confidence
    };
  }

  /**
   * 分析周分布
   */
  private analyzeWeeklyDistribution(behaviors: BehaviorData[]): TemporalPattern {
    const dayCounts = new Array(7).fill(0);
    const total = behaviors.length;

    for (const behavior of behaviors) {
      const day = new Date(behavior.timestamp).getDay();
      dayCounts[day]++;
    }

    // 找出高峰日（工作日 vs 周末）
    const weekdayAvg = (dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4] + dayCounts[5]) / 5;
    const weekendAvg = (dayCounts[0] + dayCounts[6]) / 2;
    
    let peakDays: number[];
    let confidence: number;

    if (weekdayAvg > weekendAvg * 1.5) {
      peakDays = [1, 2, 3, 4, 5]; // 工作日
      confidence = 0.7;
    } else if (weekendAvg > weekdayAvg * 1.5) {
      peakDays = [0, 6]; // 周末
      confidence = 0.7;
    } else {
      peakDays = [];
      confidence = 0.3;
    }

    return {
      id: `temp_${uuidv4()}`,
      type: 'weekly',
      peakHours: peakDays,
      averageInterval: 0,
      confidence
    };
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * 提取上下文模式
   * @param behaviors 行为数据列表
   */
  async extractContextPatterns(behaviors: BehaviorData[]): Promise<ContextPattern[]> {
    const contextMap = new Map<string, {
      trigger: string;
      responses: string[];
      behaviorIds: string[];
    }>();

    // 提取关键词作为触发词
    const keywords = this.extractKeywords(behaviors);

    // 建立触发词与响应的关联
    for (let i = 0; i < behaviors.length - 1; i++) {
      const current = behaviors[i];
      const next = behaviors[i + 1];

      for (const keyword of keywords) {
        if (current.content.toLowerCase().includes(keyword.toLowerCase())) {
          if (!contextMap.has(keyword)) {
            contextMap.set(keyword, {
              trigger: keyword,
              responses: [],
              behaviorIds: []
            });
          }
          contextMap.get(keyword)!.responses.push(next.type);
          contextMap.get(keyword)!.behaviorIds.push(next.id);
        }
      }
    }

    // 生成上下文模式
    const patterns: ContextPattern[] = [];

    for (const [trigger, data] of contextMap) {
      if (data.responses.length >= 2) {
        // 找出最常见的响应类型
        const responseCounts = new Map<string, number>();
        for (const response of data.responses) {
          responseCounts.set(response, (responseCounts.get(response) || 0) + 1);
        }

        const mostCommon = [...responseCounts.entries()]
          .sort((a, b) => b[1] - a[1])[0];

        patterns.push({
          id: `ctx_${uuidv4()}`,
          trigger,
          responseType: mostCommon[0],
          occurrenceCount: data.responses.length,
          confidence: mostCommon[1] / data.responses.length
        });
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 提取关键词
   */
  private extractKeywords(behaviors: BehaviorData[]): string[] {
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'in', 'that'
    ]);

    for (const behavior of behaviors) {
      const words = behavior.content.split(/\s+/);
      for (const word of words) {
        const cleaned = word.replace(/[^\w\u4e00-\u9fa5]/g, '');
        if (cleaned.length >= 2 && !stopWords.has(cleaned)) {
          wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
        }
      }
    }

    // 返回出现次数>=3的词
    return [...wordCounts.entries()]
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * 提取所有模式
   * @param behaviors 行为数据列表
   */
  async extractPatterns(behaviors: BehaviorData[]): Promise<BehaviorPattern[]> {
    const allPatterns: BehaviorPattern[] = [];

    // 序列模式
    const sequencePatterns = await this.extractSequencePatterns(behaviors);
    for (const sp of sequencePatterns) {
      allPatterns.push({
        id: sp.id,
        type: `sequence:${sp.sequence.join('->')}`,
        description: `行为序列: ${sp.sequence.join(' → ')}`,
        frequency: sp.occurrenceCount / behaviors.length,
        relatedBehaviorIds: sp.relatedBehaviorIds,
        confidence: sp.confidence,
        firstOccurrence: new Date(),
        lastOccurrence: new Date()
      });
    }

    // 时间模式
    const temporalPatterns = await this.extractTemporalPatterns(behaviors);
    for (const tp of temporalPatterns) {
      allPatterns.push({
        id: tp.id,
        type: `temporal:${tp.type}`,
        description: `时间模式: ${tp.type}`,
        frequency: 1,
        relatedBehaviorIds: [],
        confidence: tp.confidence,
        firstOccurrence: new Date(),
        lastOccurrence: new Date()
      });
    }

    // 上下文模式
    const contextPatterns = await this.extractContextPatterns(behaviors);
    for (const cp of contextPatterns) {
      allPatterns.push({
        id: cp.id,
        type: `context:${cp.trigger}`,
        description: `上下文模式: "${cp.trigger}" → ${cp.responseType}`,
        frequency: cp.occurrenceCount / behaviors.length,
        relatedBehaviorIds: [],
        confidence: cp.confidence,
        firstOccurrence: new Date(),
        lastOccurrence: new Date()
      });
    }

    return allPatterns;
  }
}

export default PatternExtractor;
