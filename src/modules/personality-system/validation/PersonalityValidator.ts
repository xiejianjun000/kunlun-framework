/**
 * PersonalityValidator.ts
 * 人格一致性验证器
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  IPersonalityProfile,
  BehaviorData,
  PersonalitySystemConfig
} from '../../core/interfaces/IPersonalitySystem';
import { TraitConstraintChecker } from './TraitConstraintChecker';

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 违规列表 */
  violations: ValidationViolation[];
  /** 置信度 */
  confidence: number;
  /** 验证详情 */
  details: ValidationDetails;
}

/**
 * 违规信息
 */
export interface ValidationViolation {
  /** 违规类型 */
  type: 'inconsistency' | 'contradiction' | 'anomaly';
  /** 描述 */
  description: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high';
  /** 相关特质 */
  relatedTraits: string[];
  /** 建议 */
  suggestion?: string;
}

/**
 * 验证详情
 */
export interface ValidationDetails {
  /** 人格维度一致性得分 */
  dimensionConsistency: number;
  /** 行为一致性得分 */
  behaviorConsistency: number;
  /** 稳定性得分 */
  stabilityScore: number;
  /** 综合得分 */
  overallScore: number;
}

/**
 * 人格验证器类
 * 
 * 验证人格画像的一致性和稳定性
 * 检测矛盾和异常行为
 * 
 * @example
 * ```typescript
 * const validator = new PersonalityValidator();
 * const result = await validator.validate(profile, behaviors);
 * 
 * if (!result.isValid) {
 *   console.log('发现违规:', result.violations);
 * }
 * ```
 */
export class PersonalityValidator {
  /** 配置 */
  private config: PersonalitySystemConfig | null = null;
  
  /** 特质约束检查器 */
  private constraintChecker: TraitConstraintChecker;

  /** 最大容忍的矛盾数 */
  private maxContradictions = 3;
  
  /** 矛盾严重程度阈值 */
  private severityThreshold = {
    low: 0.3,
    medium: 0.6,
    high: 0.8
  };

  /**
   * 构造函数
   */
  constructor() {
    this.constraintChecker = new TraitConstraintChecker();
  }

  /**
   * 初始化验证器
   * @param config 系统配置
   */
  initialize(config: PersonalitySystemConfig): void {
    this.config = config;
  }

  /**
   * 验证人格一致性
   * @param profile 人格画像
   * @param behaviors 行为数据
   */
  async validate(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): Promise<ValidationResult> {
    const violations: ValidationViolation[] = [];

    // 1. 检查特质约束
    const constraintViolations = await this.checkConstraints(profile);
    violations.push(...constraintViolations);

    // 2. 检查行为一致性
    const behaviorViolations = await this.checkBehaviorConsistency(profile, behaviors);
    violations.push(...behaviorViolations);

    // 3. 检测异常
    const anomalyViolations = await this.detectAnomalies(profile, behaviors);
    violations.push(...anomalyViolations);

    // 4. 计算验证详情
    const details = this.calculateDetails(profile, behaviors, violations);

    // 5. 判断是否有效
    const highSeverityCount = violations.filter(v => v.severity === 'high').length;
    const isValid = highSeverityCount === 0 && violations.length <= this.maxContradictions;

    return {
      isValid,
      violations,
      confidence: details.overallScore,
      details
    };
  }

  /**
   * 检查特质约束
   */
  private async checkConstraints(
    profile: IPersonalityProfile
  ): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];

    const personalityDims = profile.dimensions.personality.dimensions;
    
    for (const [traitType, dim] of Object.entries(personalityDims)) {
      // 检查数值范围
      if (typeof dim.value === 'number' && (dim.value < 0 || dim.value > 1)) {
        violations.push({
          type: 'inconsistency',
          description: `特质 ${traitType} 的值 ${dim.value} 超出有效范围 [0, 1]`,
          severity: 'high',
          relatedTraits: [traitType],
          suggestion: '重新计算该特质值'
        });
      }

      // 检查约束
      const constraintResult = this.constraintChecker.checkConstraint(traitType, dim.value);
      if (!constraintResult.satisfied) {
        violations.push({
          type: 'contradiction',
          description: constraintResult.message,
          severity: constraintResult.severity,
          relatedTraits: [traitType],
          suggestion: constraintResult.suggestion
        });
      }
    }

    return violations;
  }

  /**
   * 检查行为一致性
   */
  private async checkBehaviorConsistency(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];

    if (behaviors.length < 3) {
      return violations;
    }

    // 获取画像中的关键特质
    const personalityDims = profile.dimensions.personality.dimensions;
    const perspectiveDims = profile.dimensions.perspective.dimensions;

    // 检查外向/内向特质与社交行为的一致性
    const extraversion = personalityDims.extraversion_introversion?.value as number;
    const socialBehaviors = behaviors.filter(b => 
      /讨论|交流|团队|合作|分享/i.test(b.content)
    ).length;

    if (extraversion !== undefined) {
      if (extraversion > 0.6 && socialBehaviors < behaviors.length * 0.1) {
        violations.push({
          type: 'anomaly',
          description: '人格特质显示为外向型，但社交相关行为较少',
          severity: 'medium',
          relatedTraits: ['extraversion_introversion'],
          suggestion: '可能需要更多社交场景的行为数据'
        });
      }
      if (extraversion < 0.4 && socialBehaviors > behaviors.length * 0.5) {
        violations.push({
          type: 'anomaly',
          description: '人格特质显示为内向型，但社交相关行为较多',
          severity: 'medium',
          relatedTraits: ['extraversion_introversion'],
          suggestion: '可能需要更多独立场景的行为数据'
        });
      }
    }

    // 检查理性/感性特质与数据请求的一致性
    const rationality = personalityDims.rationality_emotion?.value as number;
    const dataRequests = behaviors.filter(b => 
      /数据|分析|报告|统计/i.test(b.content)
    ).length;

    if (rationality !== undefined) {
      if (rationality > 0.6 && dataRequests < behaviors.length * 0.1) {
        violations.push({
          type: 'anomaly',
          description: '人格特质显示为理性型，但数据相关行为较少',
          severity: 'low',
          relatedTraits: ['rationality_emotion'],
          suggestion: '可能需要更多分析场景的行为数据'
        });
      }
    }

    return violations;
  }

  /**
   * 检测异常
   */
  private async detectAnomalies(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];

    if (behaviors.length === 0) {
      return violations;
    }

    // 检测行为频率异常
    const recentBehaviors = behaviors.filter(b => {
      const age = Date.now() - new Date(b.timestamp).getTime();
      return age < 7 * 24 * 60 * 60 * 1000; // 最近7天
    });

    if (recentBehaviors.length === 0 && behaviors.length > 10) {
      violations.push({
        type: 'anomaly',
        description: '人格画像长期未更新，可能存在数据滞后',
        severity: 'low',
        relatedTraits: [],
        suggestion: '建议定期更新人格画像'
      });
    }

    // 检测置信度异常
    if (profile.confidenceScore < 0.3 && behaviors.length > 20) {
      violations.push({
        type: 'anomaly',
        description: '人格画像置信度较低，但已有较多行为数据',
        severity: 'medium',
        relatedTraits: [],
        suggestion: '需要更多一致性高的行为数据来提高置信度'
      });
    }

    // 检测特质证据不足
    const personalityDims = profile.dimensions.personality.dimensions;
    for (const [traitType, dim] of Object.entries(personalityDims)) {
      if (dim.confidence > 0.8 && dim.evidence.length < 3) {
        violations.push({
          type: 'inconsistency',
          description: `特质 ${traitType} 置信度高但证据不足`,
          severity: 'medium',
          relatedTraits: [traitType],
          suggestion: '收集更多支持该特质的证据'
        });
      }
    }

    return violations;
  }

  /**
   * 计算验证详情
   */
  private calculateDetails(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[],
    violations: ValidationViolation[]
  ): ValidationDetails {
    // 计算人格维度一致性
    const dimensionConsistency = this.calculateDimensionConsistency(profile);

    // 计算行为一致性
    const behaviorConsistency = 1 - (violations.length / Math.max(1, behaviors.length));

    // 计算稳定性得分
    const stabilityScore = this.calculateStabilityScore(profile);

    // 综合得分
    const overallScore = (
      dimensionConsistency * 0.4 +
      behaviorConsistency * 0.3 +
      stabilityScore * 0.3
    );

    return {
      dimensionConsistency,
      behaviorConsistency,
      stabilityScore,
      overallScore: Math.max(0, Math.min(1, overallScore))
    };
  }

  /**
   * 计算维度一致性
   */
  private calculateDimensionConsistency(profile: IPersonalityProfile): number {
    const dimensions = profile.dimensions.personality.dimensions;
    const confidences: number[] = [];

    for (const [, dim] of Object.entries(dimensions)) {
      if (dim.confidence > 0) {
        confidences.push(dim.confidence);
      }
    }

    if (confidences.length === 0) return 0;

    // 计算置信度方差（方差越小越一致）
    const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / confidences.length;

    // 将方差转换为一致性得分（方差越小得分越高）
    return Math.max(0, 1 - variance * 2);
  }

  /**
   * 计算稳定性得分
   */
  private calculateStabilityScore(profile: IPersonalityProfile): number {
    // 考虑稳定特质数量
    const stableTraitBonus = Math.min(0.2, profile.stableTraits.length * 0.05);

    // 考虑版本历史
    const historyBonus = Math.min(0.2, profile.evolutionHistory.length * 0.02);

    // 考虑置信度
    const confidenceScore = profile.confidenceScore;

    return Math.min(1, confidenceScore + stableTraitBonus + historyBonus);
  }

  /**
   * 快速验证（仅检查关键约束）
   * @param profile 人格画像
   */
  quickValidate(profile: IPersonalityProfile): boolean {
    const violations = this.constraintChecker.quickCheck(profile);
    return violations.length === 0;
  }

  /**
   * 获取验证报告
   * @param result 验证结果
   */
  generateReport(result: ValidationResult): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(50));
    lines.push('人格一致性验证报告');
    lines.push('='.repeat(50));
    lines.push('');
    
    lines.push(`验证结果: ${result.isValid ? '通过 ✓' : '未通过 ✗'}`);
    lines.push(`综合得分: ${(result.details.overallScore * 100).toFixed(1)}%`);
    lines.push('');
    
    lines.push('各项得分:');
    lines.push(`  - 维度一致性: ${(result.details.dimensionConsistency * 100).toFixed(1)}%`);
    lines.push(`  - 行为一致性: ${(result.details.behaviorConsistency * 100).toFixed(1)}%`);
    lines.push(`  - 稳定性得分: ${(result.details.stabilityScore * 100).toFixed(1)}%`);
    lines.push('');

    if (result.violations.length > 0) {
      lines.push(`发现问题 (${result.violations.length} 项):`);
      lines.push('');
      
      for (const violation of result.violations) {
        lines.push(`[${violation.severity.toUpperCase()}] ${violation.description}`);
        if (violation.suggestion) {
          lines.push(`  建议: ${violation.suggestion}`);
        }
        lines.push('');
      }
    } else {
      lines.push('未发现问题 ✓');
    }

    lines.push('='.repeat(50));
    
    return lines.join('\n');
  }
}

export default PersonalityValidator;
