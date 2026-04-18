/**
 * BehaviorAnalyzer.ts
 * 行为模式分析器
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorData, PersonalitySystemConfig } from '../../core/interfaces/IPersonalitySystem';
import { PatternExtractor } from './PatternExtractor';

/**
 * 行为模式接口
 */
export interface BehaviorPattern {
  /** 模式ID */
  id: string;
  /** 模式类型 */
  type: string;
  /** 模式描述 */
  description: string;
  /** 出现频率 */
  frequency: number;
  /** 相关行为ID列表 */
  relatedBehaviorIds: string[];
  /** 置信度 */
  confidence: number;
  /** 首次出现时间 */
  firstOccurrence: Date;
  /** 最后出现时间 */
  lastOccurrence: Date;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  patterns: BehaviorPattern[];
  summary: {
    totalBehaviors: number;
    analyzedBehaviors: number;
    identifiedPatterns: number;
    averageConfidence: number;
  };
}

/**
 * 模式检测规则
 */
interface PatternRule {
  type: string;
  name: string;
  pattern: RegExp;
  extractContext?: (match: RegExpMatchArray, behavior: BehaviorData) => Record<string, any>;
}

/**
 * 行为分析器类
 * 
 * 负责分析用户行为数据，识别行为模式和趋势
 * 
 * @example
 * ```typescript
 * const analyzer = new BehaviorAnalyzer();
 * analyzer.initialize(config);
 * 
 * // 分析行为模式
 * const patterns = await analyzer.analyzePatterns(behaviors);
 * 
 * // 获取分析结果
 * const result = await analyzer.analyze(behaviors);
 * ```
 */
export class BehaviorAnalyzer {
  /** 配置 */
  private config: PersonalitySystemConfig | null = null;
  
  /** 模式提取器 */
  private patternExtractor: PatternExtractor;
  
  /** 模式检测规则 */
  private patternRules: PatternRule[] = [
    // 数据驱动型
    {
      type: 'data_driven',
      name: '数据驱动偏好',
      pattern: /(数据|分析|统计|报告|指标)/i
    },
    // 效率导向型
    {
      type: 'efficiency_oriented',
      name: '效率导向偏好',
      pattern: /(快速|高效|简化|自动化|省时)/i
    },
    // 谨慎决策型
    {
      type: 'cautious_decision',
      name: '谨慎决策偏好',
      pattern: /(确认|验证|检查|审核|稳妥)/i
    },
    // 团队协作型
    {
      type: 'team_collaboration',
      name: '团队协作偏好',
      pattern: /(团队|协作|讨论|共享|一起)/i
    },
    // 创新尝试型
    {
      type: 'innovation_seeking',
      name: '创新尝试偏好',
      pattern: /(新|尝试|创新|探索|实验)/i
    },
    // 详细偏好型
    {
      type: 'detail_preference',
      name: '详细偏好',
      pattern: /(详细|完整|具体|全面|细致)/i
    },
    // 简洁偏好型
    {
      type: 'brevity_preference',
      name: '简洁偏好',
      pattern: /(简洁|简短|概括|要点|精华)/i
    },
    // 技术导向型
    {
      type: 'technical_focus',
      name: '技术导向',
      pattern: /(技术|实现|方案|流程|方法)/i
    }
  ];

  /**
   * 构造函数
   */
  constructor() {
    this.patternExtractor = new PatternExtractor();
  }

  /**
   * 初始化分析器
   * @param config 系统配置
   */
  initialize(config: PersonalitySystemConfig): void {
    this.config = config;
  }

  /**
   * 分析行为模式
   * @param behaviors 行为数据列表
   */
  async analyzePatterns(behaviors: BehaviorData[]): Promise<BehaviorPattern[]> {
    if (behaviors.length === 0) {
      return [];
    }

    const patternMatches: Map<string, {
      rule: PatternRule;
      matches: { behavior: BehaviorData; match: RegExpMatchArray }[];
    }> = new Map();

    // 匹配行为与规则
    for (const behavior of behaviors) {
      for (const rule of this.patternRules) {
        const match = behavior.content.match(rule.pattern);
        if (match) {
          if (!patternMatches.has(rule.type)) {
            patternMatches.set(rule.type, {
              rule,
              matches: []
            });
          }
          patternMatches.get(rule.type)!.matches.push({ behavior, match });
        }
      }
    }

    // 生成行为模式
    const patterns: BehaviorPattern[] = [];

    for (const [type, data] of patternMatches) {
      const { rule, matches } = data;
      
      // 计算频率
      const frequency = matches.length / behaviors.length;
      
      // 计算置信度
      const confidence = this.calculatePatternConfidence(frequency, matches.length);

      // 获取相关行为ID
      const behaviorIds = [...new Set(matches.map(m => m.behavior.id))];

      // 获取时间范围
      const timestamps = matches.map(m => new Date(m.behavior.timestamp).getTime());
      const firstOccurrence = new Date(Math.min(...timestamps));
      const lastOccurrence = new Date(Math.max(...timestamps));

      patterns.push({
        id: `pattern_${uuidv4()}`,
        type: rule.type,
        description: rule.name,
        frequency,
        relatedBehaviorIds: behaviorIds,
        confidence,
        firstOccurrence,
        lastOccurrence
      });
    }

    // 使用模式提取器进一步分析
    const extractedPatterns = await this.patternExtractor.extractPatterns(behaviors);
    
    // 合并模式
    return this.mergePatterns(patterns, extractedPatterns);
  }

  /**
   * 执行完整分析
   * @param behaviors 行为数据列表
   */
  async analyze(behaviors: BehaviorData[]): Promise<AnalysisResult> {
    const patterns = await this.analyzePatterns(behaviors);

    // 计算摘要
    const summary = {
      totalBehaviors: behaviors.length,
      analyzedBehaviors: behaviors.length,
      identifiedPatterns: patterns.length,
      averageConfidence: patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0
    };

    return { patterns, summary };
  }

  /**
   * 计算模式置信度
   * @param frequency 出现频率
   * @param matchCount 匹配次数
   */
  private calculatePatternConfidence(frequency: number, matchCount: number): number {
    // 基础置信度
    let confidence = frequency;

    // 匹配次数加成
    if (matchCount >= 5) {
      confidence += 0.2;
    } else if (matchCount >= 3) {
      confidence += 0.1;
    }

    // 限制在0-1之间
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 合并模式
   * @param patterns1 模式列表1
   * @param patterns2 模式列表2
   */
  private mergePatterns(
    patterns1: BehaviorPattern[],
    patterns2: BehaviorPattern[]
  ): BehaviorPattern[] {
    const merged = [...patterns1];

    for (const p2 of patterns2) {
      // 检查是否已存在相似模式
      const existing = merged.find(
        p => p.type === p2.type && p.description === p2.description
      );

      if (existing) {
        // 合并相关行为
        existing.relatedBehaviorIds = [
          ...new Set([...existing.relatedBehaviorIds, ...p2.relatedBehaviorIds])
        ];
        // 更新置信度
        existing.confidence = Math.max(existing.confidence, p2.confidence);
        // 更新频率
        existing.frequency = existing.relatedBehaviorIds.length / 
          Math.max(existing.relatedBehaviorIds.length, p2.relatedBehaviorIds.length);
      } else {
        merged.push(p2);
      }
    }

    // 按置信度排序
    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 检测行为趋势
   * @param behaviors 行为数据列表
   */
  async detectTrends(behaviors: BehaviorData[]): Promise<{
    increasing: string[];
    decreasing: string[];
    stable: string[];
  }> {
    if (behaviors.length < 10) {
      return { increasing: [], decreasing: [], stable: [] };
    }

    // 按时间排序
    const sorted = [...behaviors].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 分成前半段和后半段
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const trends = {
      increasing: [] as string[],
      decreasing: [] as string[],
      stable: [] as string[]
    };

    // 分析每种行为类型的变化趋势
    const types = new Set([...firstHalf, ...secondHalf].map(b => b.type));

    for (const type of types) {
      const firstCount = firstHalf.filter(b => b.type === type).length / firstHalf.length;
      const secondCount = secondHalf.filter(b => b.type === type).length / secondHalf.length;

      const change = secondCount - firstCount;

      if (change > 0.1) {
        trends.increasing.push(type);
      } else if (change < -0.1) {
        trends.decreasing.push(type);
      } else {
        trends.stable.push(type);
      }
    }

    return trends;
  }

  /**
   * 识别行为周期
   * @param behaviors 行为数据列表
   */
  async detectCycles(behaviors: BehaviorData[]): Promise<{
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  }> {
    if (behaviors.length < 20) {
      return { daily: false, weekly: false, monthly: false };
    }

    // 提取小时分布
    const hourCounts = new Array(24).fill(0);
    // 提取星期分布
    const dayOfWeekCounts = new Array(7).fill(0);

    for (const behavior of behaviors) {
      const date = new Date(behavior.timestamp);
      hourCounts[date.getHours()]++;
      dayOfWeekCounts[date.getDay()]++;
    }

    // 计算标准差判断周期性
    const hourlyVariance = this.calculateVariance(hourCounts);
    const dailyVariance = this.calculateVariance(dayOfWeekCounts);

    return {
      daily: hourlyVariance > 0.5,
      weekly: dailyVariance > 0.5,
      monthly: false // 需要更长时间数据
    };
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

export default BehaviorAnalyzer;
