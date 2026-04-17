/**
 * TraitExtractor.ts
 * 人格特质提取器
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { ExtractedTrait, TraitType } from '../../core/interfaces/IPersonalitySystem';

/**
 * 提取规则接口
 */
export interface ExtractionRule {
  /** 规则ID */
  id: string;
  /** 规则类型 */
  type: TraitType;
  /** 匹配模式 */
  patterns: RegExp[];
  /** 提取函数 */
  extractValue: (matches: RegExpMatchArray[]) => number;
  /** 生成标签函数 */
  generateLabel: (value: number) => string;
  /** 权重 */
  weight: number;
}

/**
 * 提取上下文
 */
export interface ExtractionContext {
  /** 行为类型 */
  behaviorType?: string;
  /** 上下文关键词 */
  contextKeywords?: string[];
  /** 时间戳 */
  timestamp?: Date;
}

/**
 * 特质提取器类
 * 
 * 核心的人格特质提取逻辑
 * 支持多种提取策略和置信度计算
 * 
 * @example
 * ```typescript
 * const extractor = new TraitExtractor();
 * 
 * // 提取特质
 * const traits = extractor.extract('用户说我更喜欢详细的数据分析', {
 *   behaviorType: 'preference',
 *   contextKeywords: ['数据', '分析']
 * });
 * ```
 */
export class TraitExtractor {
  /** 提取规则 */
  private rules: ExtractionRule[] = [];

  /**
   * 构造函数
   */
  constructor() {
    this.initializeRules();
  }

  /**
   * 初始化提取规则
   */
  private initializeRules(): void {
    // 外向/内向特质
    this.rules.push({
      id: 'extraversion_introversion',
      type: TraitType.EXTRAVERSION_INTROVERSION,
      patterns: [
        /喜欢.*团队/i,
        /喜欢.*讨论/i,
        /喜欢.*交流/i,
        /倾向于.*社交/i,
        /偏好.*集体/i,
        /喜欢.*独自/i,
        /偏好.*安静/i,
        /喜欢.*独立/i,
        /倾向于.*私下/i
      ],
      extractValue: (matches) => {
        const positive = matches.filter(m => 
          /(喜欢|倾向于|偏好).*(团队|讨论|交流|社交|集体)/i.test(m[0])
        ).length;
        const negative = matches.filter(m => 
          /(喜欢|倾向于|偏好).*(独自|安静|独立|私下)/i.test(m[0])
        ).length;
        return 0.5 + (positive - negative) * 0.1;
      },
      generateLabel: (value) => value >= 0.6 ? '外向型' : value >= 0.4 ? '中立' : '内向型',
      weight: 1.0
    });

    // 开放性特质
    this.rules.push({
      id: 'openness_conservatism',
      type: TraitType.OPENNESS_CONSERVATISM,
      patterns: [
        /愿意.*新/i,
        /喜欢.*创新/i,
        /喜欢.*尝试/i,
        /喜欢.*探索/i,
        /喜欢.*实验/i,
        /保守|传统|稳定|熟悉/
      ],
      extractValue: (matches) => {
        const positive = matches.filter(m => 
          /(愿意|喜欢).*(新|创新|尝试|探索|实验)/i.test(m[0])
        ).length;
        const negative = matches.filter(m => 
          /(保守|传统|稳定|熟悉)/i.test(m[0])
        ).length;
        return 0.5 + (positive - negative) * 0.15;
      },
      generateLabel: (value) => value >= 0.6 ? '高开放性' : value >= 0.4 ? '中立' : '保守型',
      weight: 1.0
    });

    // 理性/感性特质
    this.rules.push({
      id: 'rationality_emotion',
      type: TraitType.RATIONALITY_EMOTION,
      patterns: [
        /数据.*支持/i,
        /需要.*分析/i,
        /逻辑.*思考/i,
        /理性.*判断/i,
        /证据.*基础/i,
        /感觉.*直觉/i,
        /情感.*因素/i,
        /跟着.*心/i
      ],
      extractValue: (matches) => {
        const rational = matches.filter(m => 
          /(数据|分析|逻辑|理性|证据)/i.test(m[0])
        ).length;
        const emotional = matches.filter(m => 
          /(感觉|直觉|情感|心)/i.test(m[0])
        ).length;
        return 0.5 + (rational - emotional) * 0.2;
      },
      generateLabel: (value) => value >= 0.6 ? '偏理性' : value >= 0.4 ? '中立' : '偏感性',
      weight: 1.0
    });

    // 风险偏好特质
    this.rules.push({
      id: 'risk_tolerance',
      type: TraitType.RISK_TOLERANCE,
      patterns: [
        /谨慎.*行事/i,
        /稳妥.*第一/i,
        /安全.*优先/i,
        /愿意.*冒险/i,
        /大胆.*尝试/i,
        /激进.*策略/i
      ],
      extractValue: (matches) => {
        const cautious = matches.filter(m => 
          /(谨慎|稳妥|安全)/i.test(m[0])
        ).length;
        const riskTaking = matches.filter(m => 
          /(冒险|大胆|激进)/i.test(m[0])
        ).length;
        return 0.5 + (riskTaking - cautious) * 0.15;
      },
      generateLabel: (value) => value >= 0.6 ? '高风险偏好' : value >= 0.4 ? '中等风险偏好' : '低风险偏好',
      weight: 0.8
    });

    // 权威取向特质
    this.rules.push({
      id: 'authority_orientation',
      type: TraitType.AUTHORITY_ORIENTATION,
      patterns: [
        /尊重.*规定/i,
        /遵循.*标准/i,
        /符合.*规范/i,
        /质疑.*权威/i,
        /挑战.*传统/i,
        /创新.*突破/i
      ],
      extractValue: (matches) => {
        const authority = matches.filter(m => 
          /(尊重|遵循|符合).*(规定|标准|规范)/i.test(m[0])
        ).length;
        const independence = matches.filter(m => 
          /(质疑|挑战|突破)/i.test(m[0])
        ).length;
        return 0.5 + (authority - independence) * 0.1;
      },
      generateLabel: (value) => value >= 0.6 ? '高权威尊重' : value >= 0.4 ? '中立' : '低权威尊重',
      weight: 0.7
    });
  }

  /**
   * 提取特质
   * @param content 内容
   * @param context 上下文
   */
  extract(content: string, context?: ExtractionContext): ExtractedTrait[] {
    const traits: ExtractedTrait[] = [];

    for (const rule of this.rules) {
      const matches: RegExpMatchArray[] = [];
      
      for (const pattern of rule.patterns) {
        const match = content.match(pattern);
        if (match) {
          matches.push(match);
        }
      }

      if (matches.length > 0) {
        const value = rule.extractValue(matches);
        const normalizedValue = Math.max(0, Math.min(1, value));

        traits.push({
          type: rule.type,
          value: normalizedValue,
          label: rule.generateLabel(normalizedValue),
          confidence: this.calculateConfidence(rule, matches, context),
          evidence: matches.map(m => m[0]),
          sourceBehaviorIds: []
        });
      }
    }

    return traits;
  }

  /**
   * 批量提取特质
   * @param contents 内容列表
   * @param context 上下文
   */
  extractBatch(contents: string[], context?: ExtractionContext): ExtractedTrait[] {
    const allTraits: ExtractedTrait[] = [];

    for (const content of contents) {
      const traits = this.extract(content, context);
      allTraits.push(...traits);
    }

    // 合并同类特质
    return this.mergeTraits(allTraits);
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    rule: ExtractionRule,
    matches: RegExpMatchArray[],
    context?: ExtractionContext
  ): number {
    let confidence = 0.5;

    // 匹配次数加成
    confidence += Math.min(0.2, matches.length * 0.05);

    // 规则权重加成
    confidence += rule.weight * 0.1;

    // 上下文加成
    if (context) {
      if (context.behaviorType === 'decision') {
        confidence += 0.1;
      } else if (context.behaviorType === 'preference') {
        confidence += 0.15;
      }

      if (context.contextKeywords) {
        for (const keyword of context.contextKeywords) {
          for (const match of matches) {
            if (match[0].includes(keyword)) {
              confidence += 0.02;
              break;
            }
          }
        }
      }
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 合并特质
   */
  private mergeTraits(traits: ExtractedTrait[]): ExtractedTrait[] {
    const traitMap = new Map<TraitType, ExtractedTrait[]>();

    // 按类型分组
    for (const trait of traits) {
      if (!traitMap.has(trait.type)) {
        traitMap.set(trait.type, []);
      }
      traitMap.get(trait.type)!.push(trait);
    }

    // 合并同类特质
    const mergedTraits: ExtractedTrait[] = [];

    for (const [type, typeTraits] of traitMap) {
      if (typeTraits.length === 0) continue;

      // 数值型特质取加权平均
      const numericTraits = typeTraits.filter(t => typeof t.value === 'number');
      
      if (numericTraits.length > 0) {
        const totalWeight = numericTraits.reduce((sum, t) => sum + t.confidence, 0);
        const weightedValue = numericTraits.reduce(
          (sum, t) => sum + (t.value as number) * t.confidence, 0
        ) / totalWeight;

        const avgConfidence = numericTraits.reduce((sum, t) => sum + t.confidence, 0) / numericTraits.length;

        mergedTraits.push({
          type,
          value: Math.max(0, Math.min(1, weightedValue)),
          label: typeTraits[0].label,
          confidence: avgConfidence,
          evidence: [...new Set(typeTraits.flatMap(t => t.evidence))].slice(0, 10),
          sourceBehaviorIds: []
        });
      }
    }

    return mergedTraits;
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: ExtractionRule): void {
    this.rules.push(rule);
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取所有规则
   */
  getRules(): ExtractionRule[] {
    return [...this.rules];
  }
}

export default TraitExtractor;
