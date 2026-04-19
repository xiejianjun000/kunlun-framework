/**
 * PersonalityDistiller.ts
 * 人格蒸馏器 - 从行为提取人格特质
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IPersonalityDistiller,
  BehaviorData,
  ExtractedTrait,
  IPersonalityProfile,
  TraitType,
  TraitDimension,
  DecisionStyle,
  InformationProcessingStyle
} from '../../core/interfaces/IPersonalitySystem';

import { TraitExtractor } from './trait/TraitExtractor';
import { CommunicationStyleExtractor } from './trait/CommunicationStyleExtractor';
import { DecisionStyleExtractor } from './trait/DecisionStyleExtractor';
import { LearningStyleExtractor } from './trait/LearningStyleExtractor';

/**
 * 特质提取配置
 */
export interface DistillerConfig {
  /** 最小证据数量 */
  minEvidenceCount: number;
  /** 置信度阈值 */
  confidenceThreshold: number;
  /** 最大特质数量 */
  maxTraitsCount: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: DistillerConfig = {
  minEvidenceCount: 3,
  confidenceThreshold: 0.6,
  maxTraitsCount: 20
};

/**
 * 特质提取映射规则
 */
interface ExtractionRule {
  pattern: RegExp;
  traitType: TraitType;
  extractValue: (match: RegExpMatchArray, context: any) => number | string;
  label: (value: number | string) => string;
}

/**
 * 人格蒸馏器类
 * 
 * 从用户行为数据中提取和蒸馏人格特质
 * 支持多种提取策略和置信度计算
 * 
 * @example
 * ```typescript
 * const distiller = new PersonalityDistiller();
 * 
 * // 蒸馏特质
 * const traits = await distiller.distillTraits(behaviors, 'user_123');
 * 
 * // 生成画像
 * const profile = await distiller.generateProfile(traits, 'user_123', 'tenant_abc');
 * ```
 */
export class PersonalityDistiller implements IPersonalityDistiller {
  /** 配置 */
  private config: DistillerConfig;
  
  /** 特质提取器 */
  private traitExtractor: TraitExtractor;
  
  /** 沟通风格提取器 */
  private communicationExtractor: CommunicationStyleExtractor;
  
  /** 决策风格提取器 */
  private decisionExtractor: DecisionStyleExtractor;
  
  /** 学习偏好提取器 */
  private learningExtractor: LearningStyleExtractor;

  /**
   * 提取规则列表
   */
  private extractionRules: ExtractionRule[] = [
    // 外向/内向特质
    {
      pattern: /(喜欢|偏好|倾向于).*(团队|讨论|交流|社交)/i,
      traitType: TraitType.EXTRAVERSION_INTROVERSION,
      extractValue: () => 0.7,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '外向型' : num >= 0.4 ? '中立' : '内向型';
      }
    },
    {
      pattern: /(喜欢|偏好|倾向于).*(独自|安静|独立|私下)/i,
      traitType: TraitType.EXTRAVERSION_INTROVERSION,
      extractValue: () => 0.3,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '外向型' : num >= 0.4 ? '中立' : '内向型';
      }
    },
    
    // 开放性特质
    {
      pattern: /(愿意|喜欢|尝试).*(新|创新|实验|探索)/i,
      traitType: TraitType.OPENNESS_CONSERVATISM,
      extractValue: () => 0.75,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '高开放性' : num >= 0.4 ? '中立' : '保守型';
      }
    },
    {
      pattern: /(传统|保守|稳定|熟悉)/i,
      traitType: TraitType.OPENNESS_CONSERVATISM,
      extractValue: () => 0.35,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '高开放性' : num >= 0.4 ? '中立' : '保守型';
      }
    },
    
    // 理性/感性特质
    {
      pattern: /(数据|分析|逻辑|理性|证据)/i,
      traitType: TraitType.RATIONALITY_EMOTION,
      extractValue: () => 0.75,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '偏理性' : num >= 0.4 ? '中立' : '偏感性';
      }
    },
    {
      pattern: /(感觉|直觉|情感|感受)/i,
      traitType: TraitType.RATIONALITY_EMOTION,
      extractValue: () => 0.35,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '偏理性' : num >= 0.4 ? '中立' : '偏感性';
      }
    },
    
    // 风险偏好特质
    {
      pattern: /(谨慎|保守|稳妥|安全)/i,
      traitType: TraitType.RISK_TOLERANCE,
      extractValue: () => 0.35,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '高风险偏好' : num >= 0.4 ? '中等风险偏好' : '低风险偏好';
      }
    },
    {
      pattern: /(大胆|激进|冒险|创新)/i,
      traitType: TraitType.RISK_TOLERANCE,
      extractValue: () => 0.7,
      label: (v) => {
        const num = v as number;
        return num >= 0.6 ? '高风险偏好' : num >= 0.4 ? '中等风险偏好' : '低风险偏好';
      }
    }
  ];

  /**
   * 构造函数
   * @param config 配置
   */
  constructor(config?: Partial<DistillerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.traitExtractor = new TraitExtractor();
    this.communicationExtractor = new CommunicationStyleExtractor();
    this.decisionExtractor = new DecisionStyleExtractor();
    this.learningExtractor = new LearningStyleExtractor();
  }

  /**
   * 从行为数据蒸馏人格特质
   * @param behaviors 行为数据列表
   * @param userId 用户ID
   */
  async distillTraits(behaviors: BehaviorData[], userId: string): Promise<ExtractedTrait[]> {
    if (behaviors.length === 0) {
      return [];
    }

    const traitGroups: Map<TraitType, ExtractedTrait[]> = new Map();
    
    // 使用规则提取特质
    for (const behavior of behaviors) {
      const extracted = this.extractTraitsFromBehavior(behavior);
      
      for (const trait of extracted) {
        if (!traitGroups.has(trait.type)) {
          traitGroups.set(trait.type, []);
        }
        traitGroups.get(trait.type)!.push(trait);
      }
    }

    // 使用专业提取器提取特质
    const behaviorContents = behaviors.map(b => b.content);
    
    const communicationTraits = await this.communicationExtractor.extract(behaviorContents);
    const decisionTraits = await this.decisionExtractor.extract(behaviorContents);
    const learningTraits = await this.learningExtractor.extract(behaviorContents);
    
    for (const trait of [...communicationTraits, ...decisionTraits, ...learningTraits]) {
      if (!traitGroups.has(trait.type)) {
        traitGroups.set(trait.type, []);
      }
      traitGroups.get(trait.type)!.push(trait);
    }

    // 合并同类特质
    const mergedTraits: ExtractedTrait[] = [];
    
    for (const [traitType, traits] of traitGroups) {
      if (traits.length > 0) {
        const merged = this.mergeTraitsOfSameType(traits);
        mergedTraits.push(merged);
      }
    }

    // 按置信度排序并限制数量
    return mergedTraits
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxTraitsCount);
  }

  /**
   * 从单个行为中提取特质
   * @param behavior 行为数据
   */
  private extractTraitsFromBehavior(behavior: BehaviorData): ExtractedTrait[] {
    const traits: ExtractedTrait[] = [];
    const content = behavior.content;
    const context = behavior.context || {};

    for (const rule of this.extractionRules) {
      const match = content.match(rule.pattern);
      if (match) {
        const value = rule.extractValue(match, context);
        traits.push({
          type: rule.traitType,
          value,
          label: rule.label(value),
          confidence: this.calculateConfidence(1, behavior),
          evidence: [content],
          sourceBehaviorIds: [behavior.id]
        });
      }
    }

    return traits;
  }

  /**
   * 计算置信度
   * @param matchCount 匹配次数
   * @param behavior 行为数据
   */
  private calculateConfidence(matchCount: number, behavior: BehaviorData): number {
    // 基础置信度
    let confidence = 0.5;
    
    // 匹配次数加成
    confidence += Math.min(0.3, matchCount * 0.1);
    
    // 行为类型加成
    if (behavior.type === 'decision') {
      confidence += 0.1;
    } else if (behavior.type === 'preference') {
      confidence += 0.15;
    }
    
    // 时间新鲜度加成
    const age = Date.now() - new Date(behavior.timestamp).getTime();
    const dayAge = age / (1000 * 60 * 60 * 24);
    if (dayAge < 7) {
      confidence += 0.1;
    } else if (dayAge > 90) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 合并同类特质
   * @param traits 特质列表
   */
  private mergeTraitsOfSameType(traits: ExtractedTrait[]): ExtractedTrait {
    // 按类型分组计算
    const numericTraits = traits.filter(t => typeof t.value === 'number');
    const stringTraits = traits.filter(t => typeof t.value === 'string');

    let finalValue: number | string;
    let finalLabel: string;

    if (numericTraits.length > 0) {
      // 数值型特质取加权平均
      const totalWeight = numericTraits.reduce((sum, t) => sum + t.confidence, 0);
      finalValue = numericTraits.reduce(
        (sum, t) => sum + (t.value as number) * t.confidence, 0
      ) / totalWeight;
      finalLabel = this.getLabelForTrait(traits[0].type, finalValue);
    } else {
      // 字符串型特质取最高置信度
      const best = stringTraits.reduce((best, t) => 
        t.confidence > best.confidence ? t : best
      );
      finalValue = best.value;
      finalLabel = best.label;
    }

    // 合并证据
    const allEvidence = new Set<string>();
    const allSourceIds = new Set<string>();
    
    for (const trait of traits) {
      trait.evidence.forEach(e => allEvidence.add(e));
      trait.sourceBehaviorIds.forEach(id => allSourceIds.add(id));
    }

    // 计算合并后的置信度
    const avgConfidence = traits.reduce((sum, t) => sum + t.confidence, 0) / traits.length;
    const evidenceBonus = Math.min(0.2, allEvidence.size * 0.02);
    const finalConfidence = Math.min(1, avgConfidence + evidenceBonus);

    return {
      type: traits[0].type,
      value: finalValue,
      label: finalLabel,
      confidence: finalConfidence,
      evidence: Array.from(allEvidence).slice(0, 10),
      sourceBehaviorIds: Array.from(allSourceIds)
    };
  }

  /**
   * 获取特质标签
   * @param traitType 特质类型
   * @param value 特质值
   */
  private getLabelForTrait(traitType: TraitType, value: number | string): string {
    const numValue = typeof value === 'number' ? value : 0.5;
    
    switch (traitType) {
      case TraitType.EXTRAVERSION_INTROVERSION:
        return numValue >= 0.6 ? '外向型' : numValue >= 0.4 ? '中立' : '内向型';
      case TraitType.OPENNESS_CONSERVATISM:
        return numValue >= 0.6 ? '高开放性' : numValue >= 0.4 ? '中立' : '保守型';
      case TraitType.RATIONALITY_EMOTION:
        return numValue >= 0.6 ? '偏理性' : numValue >= 0.4 ? '中立' : '偏感性';
      case TraitType.RISK_TOLERANCE:
        return numValue >= 0.6 ? '高风险偏好' : numValue >= 0.4 ? '中等风险偏好' : '低风险偏好';
      case TraitType.AUTHORITY_ORIENTATION:
        return numValue >= 0.6 ? '高权威尊重' : numValue >= 0.4 ? '中立' : '低权威尊重';
      default:
        return '中立';
    }
  }

  /**
   * 从特质生成人格画像
   * @param traits 特质列表
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async generateProfile(
    traits: ExtractedTrait[],
    userId: string,
    tenantId: string
  ): Promise<IPersonalityProfile> {
    const now = new Date();
    
    const profile: IPersonalityProfile = {
      profileId: `profile_${uuidv4()}`,
      userId,
      tenantId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      confidenceScore: this.calculateOverallConfidence(traits),
      privacySettings: {
        noDistillTopics: [],
        distillLevel: 'standard'
      },
      dimensions: this.convertTraitsToDimensions(traits),
      stableTraits: this.extractStableTraits(traits),
      evolutionHistory: [
        {
          version: 1,
          timestamp: now,
          trigger: 'initial_generation',
          changes: {
            traitCount: traits.length,
            dimensions: Object.keys(this.convertTraitsToDimensions(traits))
          }
        }
      ]
    };

    return profile;
  }

  /**
   * 计算整体置信度
   * @param traits 特质列表
   */
  private calculateOverallConfidence(traits: ExtractedTrait[]): number {
    if (traits.length === 0) return 0;
    return traits.reduce((sum, t) => sum + t.confidence, 0) / traits.length;
  }

  /**
   * 将特质转换为维度数据
   * @param traits 特质列表
   */
  private convertTraitsToDimensions(traits: ExtractedTrait[]): IPersonalityProfile['dimensions'] {
    const traitsMap = new Map(traits.map(t => [t.type, t]));

    return {
      personality: {
        dimensions: {
          [TraitType.EXTRAVERSION_INTROVERSION]: this.traitToDimension(
            traitsMap.get(TraitType.EXTRAVERSION_INTROVERSION)
          ),
          [TraitType.OPENNESS_CONSERVATISM]: this.traitToDimension(
            traitsMap.get(TraitType.OPENNESS_CONSERVATISM)
          ),
          [TraitType.RATIONALITY_EMOTION]: this.traitToDimension(
            traitsMap.get(TraitType.RATIONALITY_EMOTION)
          ),
          [TraitType.RISK_TOLERANCE]: this.traitToDimension(
            traitsMap.get(TraitType.RISK_TOLERANCE)
          ),
          [TraitType.DECISION_STYLE]: this.traitToDimension(
            traitsMap.get(TraitType.DECISION_STYLE)
          ),
          [TraitType.INFORMATION_PROCESSING]: this.traitToDimension(
            traitsMap.get(TraitType.INFORMATION_PROCESSING)
          ),
          [TraitType.AUTHORITY_ORIENTATION]: this.traitToDimension(
            traitsMap.get(TraitType.AUTHORITY_ORIENTATION)
          ),
          [TraitType.CAUSALITY_BELIEF]: this.traitToDimension(
            traitsMap.get(TraitType.CAUSALITY_BELIEF)
          ),
          [TraitType.SYSTEM_COMPLEXITY]: this.traitToDimension(
            traitsMap.get(TraitType.SYSTEM_COMPLEXITY)
          ),
          [TraitType.TEMPORAL_ORIENTATION]: this.traitToDimension(
            traitsMap.get(TraitType.TEMPORAL_ORIENTATION)
          )
        },
        stableTraits: []
      },
      perspective: {
        dimensions: {
          decisionStyle: this.traitToDimension(
            traitsMap.get(TraitType.DECISION_STYLE),
            DecisionStyle.DELIBERATE
          ),
          informationProcessing: this.traitToDimension(
            traitsMap.get(TraitType.INFORMATION_PROCESSING),
            InformationProcessingStyle.SYSTEMATIC
          ),
          authorityOrientation: this.traitToDimension(
            traitsMap.get(TraitType.AUTHORITY_ORIENTATION)
          )
        },
        preferredFormats: [],
        avoidFormats: []
      },
      worldview: {
        dimensions: {
          causalityBelief: {
            value: traitsMap.get(TraitType.CAUSALITY_BELIEF)?.value as string || 'evidence_based',
            label: traitsMap.get(TraitType.CAUSALITY_BELIEF)?.label || '中立',
            confidence: traitsMap.get(TraitType.CAUSALITY_BELIEF)?.confidence || 0,
            evidence: []
          },
          systemComplexity: {
            value: traitsMap.get(TraitType.SYSTEM_COMPLEXITY)?.value as string || 'medium',
            label: traitsMap.get(TraitType.SYSTEM_COMPLEXITY)?.label || '中立',
            confidence: traitsMap.get(TraitType.SYSTEM_COMPLEXITY)?.confidence || 0,
            evidence: []
          },
          temporalOrientation: {
            value: traitsMap.get(TraitType.TEMPORAL_ORIENTATION)?.value as string || 'medium_term',
            label: traitsMap.get(TraitType.TEMPORAL_ORIENTATION)?.label || '中立',
            confidence: traitsMap.get(TraitType.TEMPORAL_ORIENTATION)?.confidence || 0,
            evidence: []
          }
        },
        coreBeliefs: []
      },
      values: {
        valueHierarchy: {},
        bottomLinePrinciples: [],
        tradeOffPatterns: {},
        confidence: this.calculateOverallConfidence(
          traits.filter(t => 
            t.type.toString().includes('value') || 
            t.type.toString().includes('VALUE')
          )
        )
      },
      lifePhilosophy: {
        dimensions: {
          goalOrientation: {
            primaryGoals: [],
            confidence: 0
          },
          timeValue: {
            value: 'medium',
            label: '中立',
            confidence: 0,
            evidence: []
          },
          meaningPursuit: {
            value: 'competence_mastery',
            label: '中立',
            confidence: 0,
            evidence: []
          },
          workStyle: {
            collaborationPreference: 'balanced',
            autonomyNeed: 'medium',
            feedbackFrequency: 'as_needed'
          }
        },
        confidence: 0
      }
    };
  }

  /**
   * 将特质转换为维度数据
   * @param trait 特质
   * @param defaultValue 默认值
   */
  private traitToDimension(
    trait?: ExtractedTrait,
    defaultValue?: DecisionStyle | InformationProcessingStyle | number
  ): TraitDimension {
    if (!trait) {
      return {
        value: defaultValue || 0.5,
        label: '中立',
        confidence: 0,
        evidence: []
      } as TraitDimension;
    }

    return {
      value: trait.value,
      label: trait.label,
      confidence: trait.confidence,
      evidence: trait.evidence
    } as TraitDimension;
  }

  /**
   * 提取稳定特质
   * @param traits 特质列表
   */
  private extractStableTraits(traits: ExtractedTrait[]): string[] {
    // 只有置信度高的特质才能成为稳定特质
    const stableTraits = traits
      .filter(t => t.confidence >= 0.8)
      .map(t => t.label);
    
    return [...new Set(stableTraits)];
  }

  /**
   * 增量更新人格画像
   * @param currentProfile 当前画像
   * @param newTraits 新特质
   */
  async updateProfile(
    currentProfile: IPersonalityProfile,
    newTraits: ExtractedTrait[]
  ): Promise<IPersonalityProfile> {
    // 合并特质
    const existingTraits = this.convertDimensionsToTraits(currentProfile);
    const mergedTraits = this.mergeTraits(existingTraits, newTraits);

    // 更新画像
    const updatedProfile: IPersonalityProfile = {
      ...currentProfile,
      updatedAt: new Date(),
      version: currentProfile.version + 1,
      confidenceScore: this.calculateOverallConfidence(mergedTraits),
      dimensions: this.convertTraitsToDimensions(mergedTraits),
      stableTraits: this.extractStableTraits(mergedTraits),
      evolutionHistory: [
        ...currentProfile.evolutionHistory,
        {
          version: currentProfile.version + 1,
          timestamp: new Date(),
          trigger: 'incremental_update',
          changes: {
            newTraitsCount: newTraits.length,
            mergedTraitsCount: mergedTraits.length
          }
        }
      ]
    };

    return updatedProfile;
  }

  /**
   * 将维度数据转换为特质列表
   * @param profile 画像
   */
  private convertDimensionsToTraits(profile: IPersonalityProfile): ExtractedTrait[] {
    const traits: ExtractedTrait[] = [];

    // 人格维度
    const personalityDims = profile.dimensions.personality.dimensions;
    const traitTypes = Object.keys(personalityDims) as TraitType[];
    for (const key of traitTypes) {
      const dim = personalityDims[key];
      traits.push({
        type: key,
        value: dim.value,
        label: dim.label,
        confidence: dim.confidence,
        evidence: dim.evidence,
        sourceBehaviorIds: []
      });
    }

    return traits;
  }

  /**
   * 合并特质
   * @param existingTraits 现有特质
   * @param newTraits 新特质
   */
  mergeTraits(existingTraits: ExtractedTrait[], newTraits: ExtractedTrait[]): ExtractedTrait[] {
    const traitsMap = new Map<string, ExtractedTrait[]>();

    // 合并所有特质
    for (const trait of [...existingTraits, ...newTraits]) {
      const key = trait.type.toString();
      if (!traitsMap.has(key)) {
        traitsMap.set(key, []);
      }
      traitsMap.get(key)!.push(trait);
    }

    // 合并同类特质
    const mergedTraits: ExtractedTrait[] = [];
    for (const [type, traits] of traitsMap) {
      mergedTraits.push(this.mergeTraitsOfSameType(traits));
    }

    return mergedTraits;
  }

  /**
   * 验证蒸馏结果
   * @param traits 特质列表
   */
  validateDistillation(traits: ExtractedTrait[]): boolean {
    if (traits.length === 0) {
      return false;
    }

    // 检查是否有足够的证据
    const hasEnoughEvidence = traits.every(
      t => t.evidence.length >= this.config.minEvidenceCount
    );

    // 检查置信度是否达标
    const hasEnoughConfidence = traits.every(
      t => t.confidence >= this.config.confidenceThreshold
    );

    return hasEnoughEvidence && hasEnoughConfidence;
  }
}

export default PersonalityDistiller;
