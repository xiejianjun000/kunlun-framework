/**
 * PersonalityModel.ts
 * 人格模型 - 存储和管理人格数据
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  IPersonalityModel,
  IPersonalityProfile,
  PersonalityDimension,
  PersonalityDimensions,
  TraitType
} from '../../core/interfaces/IPersonalitySystem';

/**
 * 人格模型类
 * 
 * 负责管理人格画像数据的内存缓存和访问
 * 提供高效的数据读取和更新接口
 * 
 * @example
 * ```typescript
 * const model = new PersonalityModel(profile);
 * 
 * // 获取人格维度
 * const personality = model.getDimension(PersonalityDimension.PERSONALITY);
 * 
 * // 更新画像
 * model.updateProfile({ confidenceScore: 0.85 });
 * 
 * // 计算相似度
 * const similarity = model.calculateSimilarity(otherModel);
 * ```
 */
export class PersonalityModel implements IPersonalityModel {
  /** 人格画像数据 */
  private profile: IPersonalityProfile;

  /**
   * 构造函数
   * @param profile 初始画像数据
   */
  constructor(profile: IPersonalityProfile) {
    this.profile = JSON.parse(JSON.stringify(profile));
  }

  /**
   * 获取画像数据
   */
  getProfile(): IPersonalityProfile | null {
    return this.profile;
  }

  /**
   * 更新画像数据
   * @param updates 更新内容
   */
  updateProfile(updates: Partial<IPersonalityProfile>): void {
    // 合并更新
    Object.assign(this.profile, {
      ...updates,
      updatedAt: new Date(),
      version: this.profile.version + 1
    });
  }

  /**
   * 获取特定维度数据
   * @param dimension 维度类型
   */
  getDimension(dimension: PersonalityDimension): any {
    switch (dimension) {
      case PersonalityDimension.PERSONALITY:
        return this.profile.dimensions.personality;
      case PersonalityDimension.PERSPECTIVE:
        return this.profile.dimensions.perspective;
      case PersonalityDimension.WORLDVIEW:
        return this.profile.dimensions.worldview;
      case PersonalityDimension.VALUES:
        return this.profile.dimensions.values;
      case PersonalityDimension.LIFE_PHILOSOPHY:
        return this.profile.dimensions.lifePhilosophy;
      default:
        return null;
    }
  }

  /**
   * 更新特定维度数据
   * @param dimension 维度类型
   * @param data 维度数据
   */
  updateDimension(dimension: PersonalityDimension, data: any): void {
    switch (dimension) {
      case PersonalityDimension.PERSONALITY:
        this.profile.dimensions.personality = data;
        break;
      case PersonalityDimension.PERSPECTIVE:
        this.profile.dimensions.perspective = data;
        break;
      case PersonalityDimension.WORLDVIEW:
        this.profile.dimensions.worldview = data;
        break;
      case PersonalityDimension.VALUES:
        this.profile.dimensions.values = data;
        break;
      case PersonalityDimension.LIFE_PHILOSOPHY:
        this.profile.dimensions.lifePhilosophy = data;
        break;
    }
    this.profile.updatedAt = new Date();
    this.profile.version += 1;
  }

  /**
   * 计算画像相似度
   * 使用余弦相似度算法计算两个画像之间的相似程度
   * @param other 另一个模型
   * @returns 相似度分数 (0-1)
   */
  calculateSimilarity(other: IPersonalityModel): number {
    const otherProfile = other.getProfile();
    if (!otherProfile) return 0;

    // 提取数值型特质
    const thisTraits = this.extractNumericTraits();
    const otherTraits = this.extractNumericTraitsFrom(otherProfile);

    // 计算余弦相似度
    const dotProduct = thisTraits.reduce((sum, val, idx) => 
      sum + val * otherTraits[idx], 0
    );
    
    const magnitude1 = Math.sqrt(
      thisTraits.reduce((sum, val) => sum + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
      otherTraits.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * 从当前画像提取数值型特质
   */
  private extractNumericTraits(): number[] {
    const traits: number[] = [];
    
    // 人格维度
    const personalityDims = this.profile.dimensions.personality.dimensions;
    const traitKeys = Object.keys(personalityDims) as TraitType[];
    for (const key of traitKeys) {
      const dim = personalityDims[key];
      if (typeof dim.value === 'number') {
        traits.push(dim.value);
      }
    }

    // 视角维度
    const perspectiveDims = this.profile.dimensions.perspective.dimensions;
    if (typeof perspectiveDims.authorityOrientation?.value === 'number') {
      traits.push(perspectiveDims.authorityOrientation.value);
    }

    return traits;
  }

  /**
   * 从指定画像提取数值型特质
   */
  private extractNumericTraitsFrom(profile: IPersonalityProfile): number[] {
    const traits: number[] = [];
    
    const personalityDims = profile.dimensions.personality.dimensions;
    const traitKeys = Object.keys(personalityDims) as TraitType[];
    for (const key of traitKeys) {
      const dim = personalityDims[key];
      if (typeof dim.value === 'number') {
        traits.push(dim.value);
      }
    }

    const perspectiveDims = profile.dimensions.perspective.dimensions;
    if (typeof perspectiveDims.authorityOrientation?.value === 'number') {
      traits.push(perspectiveDims.authorityOrientation.value);
    }

    return traits;
  }

  /**
   * 序列化数据
   */
  serialize(): Record<string, any> {
    return JSON.parse(JSON.stringify(this.profile));
  }

  /**
   * 反序列化数据
   * @param data 序列化数据
   */
  deserialize(data: Record<string, any>): void {
    this.profile = data as IPersonalityProfile;
  }

  /**
   * 获取置信度
   */
  getConfidence(): number {
    return this.profile.confidenceScore;
  }

  /**
   * 更新置信度
   * @param score 新的置信度分数
   */
  updateConfidence(score: number): void {
    this.profile.confidenceScore = Math.max(0, Math.min(1, score));
    this.profile.updatedAt = new Date();
  }

  /**
   * 添加稳定特质
   * @param trait 特质名称
   */
  addStableTrait(trait: string): void {
    if (!this.profile.stableTraits.includes(trait)) {
      this.profile.stableTraits.push(trait);
      this.profile.updatedAt = new Date();
    }
  }

  /**
   * 获取稳定特质列表
   */
  getStableTraits(): string[] {
    return [...this.profile.stableTraits];
  }

  /**
   * 添加演变历史记录
   * @param trigger 触发原因
   * @param changes 变更内容
   */
  addEvolutionRecord(trigger: string, changes: Record<string, any>): void {
    this.profile.evolutionHistory.push({
      version: this.profile.version,
      timestamp: new Date(),
      trigger,
      changes
    });
  }

  /**
   * 深拷贝当前模型
   */
  clone(): PersonalityModel {
    return new PersonalityModel(JSON.parse(JSON.stringify(this.profile)));
  }
}

export default PersonalityModel;
