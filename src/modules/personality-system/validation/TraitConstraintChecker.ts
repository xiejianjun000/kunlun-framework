/**
 * TraitConstraintChecker.ts
 * 特质约束检查器
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { TraitType, IPersonalityProfile } from '../../core/interfaces/IPersonalitySystem';

/**
 * 约束检查结果
 */
export interface ConstraintResult {
  /** 是否满足约束 */
  satisfied: boolean;
  /** 消息 */
  message: string;
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high';
  /** 建议 */
  suggestion?: string;
}

/**
 * 特质约束定义
 */
interface TraitConstraint {
  /** 约束类型 */
  type: 'range' | 'mutual' | 'temporal';
  /** 验证函数 */
  validate: (value: any, context?: any) => ConstraintResult;
}

/**
 * 特质约束检查器类
 * 
 * 检查人格特质是否满足定义的约束规则
 * 
 * @example
 * ```typescript
 * const checker = new TraitConstraintChecker();
 * const result = checker.checkConstraint('extraversion_introversion', 0.8);
 * ```
 */
export class TraitConstraintChecker {
  /** 约束规则 */
  private constraints: Map<string, TraitConstraint[]> = new Map();

  /**
   * 构造函数
   */
  constructor() {
    this.initializeConstraints();
  }

  /**
   * 初始化约束规则
   */
  private initializeConstraints(): void {
    // 外向/内向特质约束
    this.constraints.set(TraitType.EXTRAVERSION_INTROVERSION.toString(), [
      {
        type: 'range',
        validate: (value) => {
          if (value < 0 || value > 1) {
            return {
              satisfied: false,
              message: '外向/内向特质值必须在 [0, 1] 范围内',
              severity: 'high',
              suggestion: '将特质值规范化为 0-1 之间的数值'
            };
          }
          return { satisfied: true, message: '约束满足', severity: 'low' };
        }
      }
    ]);

    // 开放性特质约束
    this.constraints.set(TraitType.OPENNESS_CONSERVATISM.toString(), [
      {
        type: 'range',
        validate: (value) => {
          if (value < 0 || value > 1) {
            return {
              satisfied: false,
              message: '开放性特质值必须在 [0, 1] 范围内',
              severity: 'high',
              suggestion: '将特质值规范化为 0-1 之间的数值'
            };
          }
          return { satisfied: true, message: '约束满足', severity: 'low' };
        }
      }
    ]);

    // 理性/感性特质约束
    this.constraints.set(TraitType.RATIONALITY_EMOTION.toString(), [
      {
        type: 'range',
        validate: (value) => {
          if (value < 0 || value > 1) {
            return {
              satisfied: false,
              message: '理性/感性特质值必须在 [0, 1] 范围内',
              severity: 'high',
              suggestion: '将特质值规范化为 0-1 之间的数值'
            };
          }
          return { satisfied: true, message: '约束满足', severity: 'low' };
        }
      }
    ]);

    // 风险偏好特质约束
    this.constraints.set(TraitType.RISK_TOLERANCE.toString(), [
      {
        type: 'range',
        validate: (value) => {
          if (value < 0 || value > 1) {
            return {
              satisfied: false,
              message: '风险偏好特质值必须在 [0, 1] 范围内',
              severity: 'high',
              suggestion: '将特质值规范化为 0-1 之间的数值'
            };
          }
          return { satisfied: true, message: '约束满足', severity: 'low' };
        }
      }
    ]);
  }

  /**
   * 检查约束
   * @param traitType 特质类型
   * @param value 特质值
   */
  checkConstraint(traitType: TraitType | string, value: any): ConstraintResult {
    const constraints = this.constraints.get(traitType.toString());
    
    if (!constraints || constraints.length === 0) {
      return { satisfied: true, message: '无约束规则', severity: 'low' };
    }

    for (const constraint of constraints) {
      const result = constraint.validate(value);
      if (!result.satisfied) {
        return result;
      }
    }

    return { satisfied: true, message: '所有约束满足', severity: 'low' };
  }

  /**
   * 检查画像级别的约束（互斥特质等）
   * @param profile 人格画像
   */
  checkProfileConstraints(profile: IPersonalityProfile): ConstraintResult[] {
    const results: ConstraintResult[] = [];
    const dims = profile.dimensions.personality.dimensions;

    // 检查极端值组合
    const traits = [
      { type: 'extraversion', value: dims.extraversion_introversion?.value as number },
      { type: 'openness', value: dims.openness_conservatism?.value as number },
      { type: 'rationality', value: dims.rationality_emotion?.value as number },
      { type: 'risk', value: dims.risk_tolerance?.value as number }
    ];

    // 检测极端组合
    const extremes = traits.filter(t => t.value !== undefined && (t.value < 0.2 || t.value > 0.8));
    
    if (extremes.length >= 3) {
      results.push({
        satisfied: false,
        message: '检测到多个极端特质值，可能存在数据异常',
        severity: 'medium',
        suggestion: '建议验证行为数据的准确性'
      });
    }

    // 检查开放性与保守性的互斥
    const openness = dims.openness_conservatism?.value as number;
    const extraversion = dims.extraversion_introversion?.value as number;
    
    if (openness !== undefined && extraversion !== undefined) {
      // 高开放性通常伴随一定的外向性
      if (openness > 0.8 && extraversion < 0.3) {
        results.push({
          satisfied: false,
          message: '高开放性与低外向性组合较为罕见',
          severity: 'low',
          suggestion: '可能需要更多数据来确认这种特质组合'
        });
      }
    }

    // 检查理性与感性的平衡
    const rationality = dims.rationality_emotion?.value as number;
    
    if (rationality !== undefined) {
      // 过于理性或感性可能需要验证
      if (rationality > 0.95 || rationality < 0.05) {
        results.push({
          satisfied: false,
          message: '极端理性/感性值可能需要额外验证',
          severity: 'low',
          suggestion: '建议收集更多中间立场的行为数据'
        });
      }
    }

    return results;
  }

  /**
   * 快速检查
   * @param profile 人格画像
   */
  quickCheck(profile: IPersonalityProfile): ConstraintResult[] {
    const results: ConstraintResult[] = [];
    const dims = profile.dimensions.personality.dimensions;

    for (const [typeStr, dim] of Object.entries(dims)) {
      if (dim.value !== undefined) {
        const result = this.checkConstraint(typeStr as TraitType, dim.value);
        if (!result.satisfied) {
          results.push(result);
        }
      }
    }

    // 检查画像级别约束
    const profileResults = this.checkProfileConstraints(profile);
    results.push(...profileResults);

    return results;
  }

  /**
   * 添加自定义约束
   * @param traitType 特质类型
   * @param constraint 约束
   */
  addConstraint(traitType: TraitType | string, constraint: TraitConstraint): void {
    const key = traitType.toString();
    if (!this.constraints.has(key)) {
      this.constraints.set(key, []);
    }
    this.constraints.get(key)!.push(constraint);
  }

  /**
   * 移除约束
   * @param traitType 特质类型
   * @param constraintType 约束类型
   */
  removeConstraint(traitType: TraitType | string, constraintType: string): boolean {
    const constraints = this.constraints.get(traitType.toString());
    if (!constraints) return false;

    const index = constraints.findIndex(c => c.type === constraintType);
    if (index !== -1) {
      constraints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取约束列表
   * @param traitType 特质类型
   */
  getConstraints(traitType: TraitType | string): TraitConstraint[] {
    return this.constraints.get(traitType.toString()) || [];
  }

  /**
   * 验证约束规则是否可满足
   * @param traitType 特质类型
   * @param value 特质值
   */
  canSatisfy(traitType: TraitType | string, value: any): boolean {
    const result = this.checkConstraint(traitType, value);
    return result.satisfied;
  }

  /**
   * 获取冲突的约束对
   * @param profile 人格画像
   */
  getConflictingConstraints(profile: IPersonalityProfile): Array<{
    trait1: string;
    trait2: string;
    reason: string;
  }> {
    const conflicts: Array<{ trait1: string; trait2: string; reason: string }> = [];
    const dims = profile.dimensions.personality.dimensions;

    // 定义互斥的特质对
    const mutuallyExclusive: Array<[string, string, string]> = [
      ['extraversion_introversion', 'risk_tolerance', '外向与风险偏好理论上相关但此处检测到异常组合']
    ];

    for (const [trait1, trait2, reason] of mutuallyExclusive) {
      const dim1 = dims[trait1 as TraitType];
      const dim2 = dims[trait2 as TraitType];

      if (dim1?.value !== undefined && dim2?.value !== undefined) {
        // 简单的冲突检测逻辑
        if (typeof dim1.value === 'number' && typeof dim2.value === 'number') {
          const diff = Math.abs(dim1.value - dim2.value);
          if (diff > 0.8) {
            conflicts.push({ trait1, trait2, reason });
          }
        }
      }
    }

    return conflicts;
  }
}

export default TraitConstraintChecker;
