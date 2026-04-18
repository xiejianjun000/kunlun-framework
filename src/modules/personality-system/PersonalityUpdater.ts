/**
 * PersonalityUpdater.ts
 * 人格更新器 - 渐进式更新人格数据
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IPersonalityUpdater,
  IPersonalityProfile,
  ExtractedTrait,
  ProfileEvolution,
  TraitType
} from '../../core/interfaces/IPersonalitySystem';

/**
 * 更新策略配置
 */
export interface UpdateStrategyConfig {
  /** 快速更新阈值（新数据置信度 > 此值时直接覆盖） */
  fastUpdateThreshold: number;
  /** 渐进更新步长 */
  incrementalStepSize: number;
  /** 最大更新权重 */
  maxUpdateWeight: number;
  /** 最小更新权重 */
  minUpdateWeight: number;
}

/**
 * 默认更新策略配置
 */
const DEFAULT_STRATEGY_CONFIG: UpdateStrategyConfig = {
  fastUpdateThreshold: 0.9,
  incrementalStepSize: 0.2,
  maxUpdateWeight: 0.8,
  minUpdateWeight: 0.1
};

/**
 * 人格更新器类
 * 
 * 负责人格画像的渐进式更新
 * 支持增量更新、回滚和特质合并
 * 
 * @example
 * ```typescript
 * const updater = new PersonalityUpdater();
 * 
 * // 执行增量更新
 * const updated = await updater.performIncrementalUpdate(
 *   currentProfile,
 *   { dimensions: newDimensions }
 * );
 * 
 * // 回滚到指定版本
 * const rolledBack = await updater.rollbackToVersion('user_123', 5);
 * ```
 */
export class PersonalityUpdater implements IPersonalityUpdater {
  /** 配置 */
  private config: UpdateStrategyConfig;
  
  /** 版本历史缓存（userId -> 画像历史） */
  private versionHistory: Map<string, IPersonalityProfile[]> = new Map();

  /**
   * 构造函数
   * @param config 配置
   */
  constructor(config?: Partial<UpdateStrategyConfig>) {
    this.config = { ...DEFAULT_STRATEGY_CONFIG, ...config };
  }

  /**
   * 执行渐进式更新
   * @param profile 当前画像
   * @param newData 新数据
   */
  async performIncrementalUpdate(
    profile: IPersonalityProfile,
    newData: Partial<IPersonalityProfile>
  ): Promise<IPersonalityProfile> {
    const now = new Date();
    const newVersion = profile.version + 1;

    // 保存当前版本到历史
    this.saveToHistory(profile.userId, JSON.parse(JSON.stringify(profile)));

    // 构建更新后的画像
    const updatedProfile: IPersonalityProfile = {
      ...profile,
      ...newData,
      updatedAt: now,
      version: newVersion,
      evolutionHistory: [
        ...profile.evolutionHistory,
        {
          version: newVersion,
          timestamp: now,
          trigger: 'incremental_update',
          changes: this.computeChanges(profile, newData)
        }
      ]
    };

    // 如果有新的特质数据，需要合并
    if (newData.dimensions) {
      updatedProfile.dimensions = this.mergeDimensions(
        profile.dimensions,
        newData.dimensions
      );
    }

    // 重新计算整体置信度
    updatedProfile.confidenceScore = this.calculateOverallConfidence(updatedProfile);

    // 更新稳定特质
    if (updatedProfile.dimensions.personality.dimensions) {
      updatedProfile.stableTraits = this.extractStableTraits(
        updatedProfile.dimensions.personality.dimensions
      );
    }

    return updatedProfile;
  }

  /**
   * 合并维度数据
   * @param existing 现有维度
   * @param updates 更新维度
   */
  private mergeDimensions(
    existing: IPersonalityProfile['dimensions'],
    updates: Partial<IPersonalityProfile['dimensions']>
  ): IPersonalityProfile['dimensions'] {
    return {
      personality: this.mergePersonalityDimension(
        existing.personality,
        updates.personality
      ),
      perspective: this.mergePerspectiveDimension(
        existing.perspective,
        updates.perspective
      ),
      worldview: this.mergeWorldviewDimension(
        existing.worldview,
        updates.worldview
      ),
      values: updates.values || existing.values,
      lifePhilosophy: updates.lifePhilosophy || existing.lifePhilosophy
    };
  }

  /**
   * 合并人格维度
   */
  private mergePersonalityDimension(
    existing: IPersonalityProfile['dimensions']['personality'],
    updates?: Partial<IPersonalityProfile['dimensions']['personality']>
  ): IPersonalityProfile['dimensions']['personality'] {
    if (!updates) return existing;

    const mergedDimensions: Record<TraitType, any> = { ...existing.dimensions };

    for (const key in updates.dimensions) {
      const traitKey = key as TraitType;
      const existingTrait = existing.dimensions[traitKey];
      const newTrait = updates.dimensions[traitKey];

      if (existingTrait && newTrait) {
        // 计算更新权重
        const weight = this.calculateUpdateWeight(
          existingTrait.confidence,
          newTrait.confidence
        );

        // 渐进式更新数值
        const mergedValue = this.blendValues(
          existingTrait.value as number,
          newTrait.value as number,
          weight
        );

        // 合并证据
        const mergedEvidence = this.mergeEvidence(
          existingTrait.evidence,
          newTrait.evidence
        );

        // 计算合并置信度
        const mergedConfidence = Math.max(
          existingTrait.confidence,
          newTrait.confidence,
          weight
        );

        mergedDimensions[traitKey] = {
          value: mergedValue,
          label: this.getLabelForTrait(traitKey, mergedValue),
          confidence: mergedConfidence,
          evidence: mergedEvidence
        };
      } else if (newTrait) {
        mergedDimensions[traitKey] = newTrait;
      }
    }

    return {
      dimensions: mergedDimensions,
      stableTraits: updates.stableTraits || existing.stableTraits
    };
  }

  /**
   * 合并视角维度
   */
  private mergePerspectiveDimension(
    existing: IPersonalityProfile['dimensions']['perspective'],
    updates?: Partial<IPersonalityProfile['dimensions']['perspective']>
  ): IPersonalityProfile['dimensions']['perspective'] {
    if (!updates) return existing;

    return {
      dimensions: {
        decisionStyle: updates.dimensions?.decisionStyle || existing.dimensions.decisionStyle,
        informationProcessing: updates.dimensions?.informationProcessing || existing.dimensions.informationProcessing,
        authorityOrientation: existing.dimensions.authorityOrientation
      },
      preferredFormats: updates.preferredFormats || existing.preferredFormats,
      avoidFormats: updates.avoidFormats || existing.avoidFormats
    };
  }

  /**
   * 合并世界观维度
   */
  private mergeWorldviewDimension(
    existing: IPersonalityProfile['dimensions']['worldview'],
    updates?: Partial<IPersonalityProfile['dimensions']['worldview']>
  ): IPersonalityProfile['dimensions']['worldview'] {
    if (!updates) return existing;

    return {
      dimensions: updates.dimensions || existing.dimensions,
      coreBeliefs: this.mergeCoreBeliefs(existing.coreBeliefs, updates.coreBeliefs)
    };
  }

  /**
   * 合并核心信念
   */
  private mergeCoreBeliefs(
    existing: string[] = [],
    updates?: string[]
  ): string[] {
    if (!updates) return existing;
    
    const beliefs = new Set([...existing, ...updates]);
    return Array.from(beliefs).slice(0, 10); // 最多保留10条
  }

  /**
   * 混合数值
   * @param existing 现有值
   * @param newValue 新值
   * @param weight 更新权重
   */
  private blendValues(existing: number, newValue: number, weight: number): number {
    return existing * (1 - weight) + newValue * weight;
  }

  /**
   * 合并证据列表
   */
  private mergeEvidence(existing: string[], newEvidence: string[]): string[] {
    const evidenceSet = new Set([...existing, ...newEvidence]);
    return Array.from(evidenceSet).slice(0, 20); // 最多保留20条证据
  }

  /**
   * 计算更新权重
   * @param currentConfidence 当前置信度
   * @param newConfidence 新置信度
   */
  calculateUpdateWeight(currentConfidence: number, newConfidence: number): number {
    // 新数据置信度差异决定权重
    const confidenceDiff = newConfidence - currentConfidence;
    
    // 基础权重
    let weight = this.config.incrementalStepSize;
    
    // 置信度差异加成
    if (confidenceDiff > 0.2) {
      weight += 0.1;
    } else if (confidenceDiff < -0.2) {
      weight -= 0.1;
    }

    // 快速更新阈值检查
    if (newConfidence >= this.config.fastUpdateThreshold) {
      weight = 1.0; // 直接覆盖
    }

    // 限制权重范围
    return Math.max(
      this.config.minUpdateWeight,
      Math.min(this.config.maxUpdateWeight, weight)
    );
  }

  /**
   * 获取特质标签
   */
  private getLabelForTrait(traitType: TraitType, value: number): string {
    switch (traitType) {
      case TraitType.EXTRAVERSION_INTROVERSION:
        return value >= 0.6 ? '外向型' : value >= 0.4 ? '中立' : '内向型';
      case TraitType.OPENNESS_CONSERVATISM:
        return value >= 0.6 ? '高开放性' : value >= 0.4 ? '中立' : '保守型';
      case TraitType.RATIONALITY_EMOTION:
        return value >= 0.6 ? '偏理性' : value >= 0.4 ? '中立' : '偏感性';
      case TraitType.RISK_TOLERANCE:
        return value >= 0.6 ? '高风险偏好' : value >= 0.4 ? '中等风险偏好' : '低风险偏好';
      case TraitType.AUTHORITY_ORIENTATION:
        return value >= 0.6 ? '高权威尊重' : value >= 0.4 ? '中立' : '低权威尊重';
      default:
        return '中立';
    }
  }

  /**
   * 提取稳定特质
   */
  private extractStableTraits(dimensions: Record<TraitType, any>): string[] {
    const stableTraits: string[] = [];

    for (const key in dimensions) {
      const dim = dimensions[key as TraitType];
      if (dim.confidence >= 0.8) {
        stableTraits.push(dim.label);
      }
    }

    return [...new Set(stableTraits)];
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(profile: IPersonalityProfile): number {
    const dimensions = profile.dimensions.personality.dimensions;
    const confidences: number[] = [];

    for (const key in dimensions) {
      confidences.push(dimensions[key as TraitType].confidence);
    }

    if (confidences.length === 0) return 0;

    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // 考虑稳定特质数量加成
    const stableBonus = Math.min(0.1, profile.stableTraits.length * 0.02);

    return Math.min(1, avgConfidence + stableBonus);
  }

  /**
   * 计算变更内容
   */
  private computeChanges(
    original: IPersonalityProfile,
    updates: Partial<IPersonalityProfile>
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    if (updates.dimensions) {
      changes.dimensionsUpdated = true;
    }

    if (updates.confidenceScore !== undefined) {
      changes.confidenceChange = {
        from: original.confidenceScore,
        to: updates.confidenceScore
      };
    }

    if (updates.stableTraits) {
      changes.newStableTraits = updates.stableTraits.filter(
        t => !original.stableTraits.includes(t)
      );
    }

    return changes;
  }

  /**
   * 保存到历史记录
   */
  private saveToHistory(userId: string, profile: IPersonalityProfile): void {
    if (!this.versionHistory.has(userId)) {
      this.versionHistory.set(userId, []);
    }

    const history = this.versionHistory.get(userId)!;
    history.push(profile);

    // 限制历史记录数量
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 回滚到指定版本
   * @param userId 用户ID
   * @param version 版本号
   */
  async rollbackToVersion(
    userId: string,
    version: number
  ): Promise<IPersonalityProfile | null> {
    const history = this.versionHistory.get(userId);
    
    if (!history) {
      return null;
    }

    const targetProfile = history.find(p => p.version === version);
    
    if (!targetProfile) {
      return null;
    }

    // 创建回滚后的新版本
    const now = new Date();
    const rolledBackProfile: IPersonalityProfile = {
      ...targetProfile,
      updatedAt: now,
      version: targetProfile.version + 1,
      evolutionHistory: [
        ...targetProfile.evolutionHistory,
        {
          version: targetProfile.version + 1,
          timestamp: now,
          trigger: 'rollback',
          changes: {
            rollbackToVersion: version
          }
        }
      ]
    };

    // 保存当前到历史
    this.saveToHistory(userId, rolledBackProfile);

    return rolledBackProfile;
  }

  /**
   * 获取版本历史
   * @param userId 用户ID
   */
  getVersionHistory(userId: string): IPersonalityProfile[] {
    return this.versionHistory.get(userId) || [];
  }

  /**
   * 清除历史记录
   * @param userId 用户ID
   */
  clearHistory(userId: string): void {
    this.versionHistory.delete(userId);
  }
}

export default PersonalityUpdater;
