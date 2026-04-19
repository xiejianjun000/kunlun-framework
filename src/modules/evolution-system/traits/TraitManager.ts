/**
 * 人格特质管理器
 * Trait Manager - Manages personality traits for evolution
 */

import { Trait, TraitValue, TraitCategory } from './types';

/**
 * 特质管理器配置
 */
export interface TraitManagerConfig {
  /** 最大特质数 */
  maxTraits: number;
  /** 默认特质值 */
  defaultTraitValue: TraitValue;
  /** 特质值范围 */
  valueRange: { min: number; max: number };
  /** 持久化适配器 */
  storageAdapter?: unknown;
}

/** 特质存储接口 */
interface TraitStorage {
  get(userId: string, tenantId: string): Promise<Record<string, Trait> | null>;
  save(userId: string, tenantId: string, traits: Record<string, Trait>): Promise<void>;
  delete(userId: string, tenantId: string): Promise<void>;
}

/**
 * 人格特质管理器
 * 负责管理用户的特质数据
 */
export class TraitManager {
  private readonly config: Required<TraitManagerConfig>;
  private readonly memory: Map<string, Record<string, Trait>> = new Map();
  private storage: TraitStorage | null = null;

  /**
   * 构造函数
   * @param config 特质管理器配置
   */
  constructor(config?: Partial<TraitManagerConfig>) {
    this.config = {
      maxTraits: config?.maxTraits ?? 100,
      defaultTraitValue: config?.defaultTraitValue ?? { value: 0.5, confidence: 0.5 },
      valueRange: config?.valueRange ?? { min: 0, max: 1 },
      storageAdapter: config?.storageAdapter,
    };

    // 如果有存储适配器，创建存储接口
    if (config?.storageAdapter) {
      this.storage = this.createStorageAdapter(config.storageAdapter);
    }
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 初始化存储
  }

  /**
   * 获取用户特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getTraits(userId: string, tenantId: string): Promise<Record<string, unknown>> {
    const key = this.getKey(userId, tenantId);

    // 从内存获取
    if (this.memory.has(key)) {
      const traits = this.memory.get(key)!;
      return this.traitsToState(traits);
    }

    // 从存储获取
    if (this.storage) {
      const traits = await this.storage.get(userId, tenantId);
      if (traits) {
        this.memory.set(key, traits);
        return this.traitsToState(traits);
      }
    }

    // 返回默认特质
    return this.getDefaultState();
  }

  /**
   * 获取特质对象
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param traitName 特质名称
   */
  async getTrait(
    userId: string,
    tenantId: string,
    traitName: string
  ): Promise<Trait | null> {
    const key = this.getKey(userId, tenantId);
    const traits = this.memory.get(key);

    if (traits) {
      return traits[traitName] ?? null;
    }

    // 从存储获取
    if (this.storage) {
      const storedTraits = await this.storage.get(userId, tenantId);
      return storedTraits?.[traitName] ?? null;
    }

    return null;
  }

  /**
   * 设置特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param traitName 特质名称
   * @param trait 特质对象
   */
  async setTrait(
    userId: string,
    tenantId: string,
    traitName: string,
    trait: Trait
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);

    // 获取或创建特质记录
    if (!this.memory.has(key)) {
      this.memory.set(key, {});
    }

    const traits = this.memory.get(key)!;

    // 检查最大特质数
    if (!traits[traitName] && Object.keys(traits).length >= this.config.maxTraits) {
      throw new Error(`Maximum number of traits (${this.config.maxTraits}) reached`);
    }

    // 验证并规范化特质值
    trait.value = this.normalizeValue(trait.value);

    traits[traitName] = trait;

    // 持久化
    if (this.storage) {
      await this.storage.save(userId, tenantId, traits);
    }
  }

  /**
   * 批量设置特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param traitRecords 特质记录
   */
  async setTraits(
    userId: string,
    tenantId: string,
    traitRecords: Record<string, Trait>
  ): Promise<void> {
    const key = this.getKey(userId, tenantId);

    // 获取或创建特质记录
    if (!this.memory.has(key)) {
      this.memory.set(key, {});
    }

    const traits = this.memory.get(key)!;

    for (const [name, trait] of Object.entries(traitRecords)) {
      // 验证并规范化特质值
      const normalizedTrait = { ...trait };
      normalizedTrait.value = this.normalizeValue(trait.value);
      traits[name] = normalizedTrait;
    }

    // 持久化
    if (this.storage) {
      await this.storage.save(userId, tenantId, traits);
    }
  }

  /**
   * 更新特质值
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param traitPath 特质路径
   * @param newValue 新值
   */
  async updateTrait(
    userId: string,
    tenantId: string,
    traitPath: string,
    newValue: unknown
  ): Promise<void> {
    const traitName = this.getTraitNameFromPath(traitPath);
    const existingTrait = await this.getTrait(userId, tenantId, traitName);

    const trait: Trait = existingTrait
      ? {
          ...existingTrait,
          value: this.normalizeValue(newValue as number),
          updatedAt: new Date(),
          confidence: Math.min(1, existingTrait.confidence + 0.01),
        }
      : {
          name: traitName,
          category: this.inferCategory(traitName),
          value: this.normalizeValue(newValue as number),
          confidence: 0.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    await this.setTrait(userId, tenantId, traitName, trait);
  }

  /**
   * 删除特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param traitName 特质名称
   */
  async deleteTrait(
    userId: string,
    tenantId: string,
    traitName: string
  ): Promise<boolean> {
    const key = this.getKey(userId, tenantId);
    const traits = this.memory.get(key);

    if (!traits || !traits[traitName]) {
      return false;
    }

    delete traits[traitName];

    // 持久化
    if (this.storage) {
      await this.storage.save(userId, tenantId, traits);
    }

    return true;
  }

  /**
   * 重置特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async resetTraits(userId: string, tenantId: string): Promise<void> {
    const key = this.getKey(userId, tenantId);
    this.memory.delete(key);

    if (this.storage) {
      await this.storage.delete(userId, tenantId);
    }
  }

  /**
   * 获取特质列表
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param category 类别筛选
   */
  async listTraits(
    userId: string,
    tenantId: string,
    category?: TraitCategory
  ): Promise<Trait[]> {
    const key = this.getKey(userId, tenantId);
    const traits = this.memory.get(key);

    if (!traits) {
      return [];
    }

    let result = Object.values(traits);

    if (category) {
      result = result.filter(t => t.category === category);
    }

    return result;
  }

  /**
   * 获取特质数量
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getTraitCount(userId: string, tenantId: string): Promise<number> {
    const key = this.getKey(userId, tenantId);
    const traits = this.memory.get(key);
    return traits ? Object.keys(traits).length : 0;
  }

  /**
   * 导出特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async exportTraits(userId: string, tenantId: string): Promise<Record<string, Trait>> {
    const key = this.getKey(userId, tenantId);
    return this.memory.get(key) ?? {};
  }

  /**
   * 导入特质
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param traits 特质数据
   */
  async importTraits(
    userId: string,
    tenantId: string,
    traits: Record<string, Trait>
  ): Promise<void> {
    // 验证导入的特质
    for (const trait of Object.values(traits)) {
      trait.value = this.normalizeValue(trait.value);
    }

    await this.setTraits(userId, tenantId, traits);
  }

  // ============== 私有方法 ==============

  /**
   * 获取存储键
   */
  private getKey(userId: string, tenantId: string): string {
    return `${tenantId}:${userId}`;
  }

  /**
   * 规范化特质值
   */
  private normalizeValue(value: number): number {
    return Math.max(
      this.config.valueRange.min,
      Math.min(this.config.valueRange.max, value)
    );
  }

  /**
   * 从路径获取特质名称
   */
  private getTraitNameFromPath(path: string): string {
    // 支持点号路径
    const parts = path.split('.');
    return parts[parts.length - 1];
  }

  /**
   * 推断特质类别
   */
  private inferCategory(traitName: string): TraitCategory {
    const name = traitName.toLowerCase();

    if (name.includes('extraversion') || name.includes('openness') || name.includes('agreeableness')) {
      return TraitCategory.PERSONALITY;
    } else if (name.includes('preference') || name.includes('style')) {
      return TraitCategory.PREFERENCE;
    } else if (name.includes('skill') || name.includes('ability')) {
      return TraitCategory.SKILL;
    } else if (name.includes('goal') || name.includes('objective')) {
      return TraitCategory.GOAL;
    }

    return TraitCategory.BEHAVIOR;
  }

  /**
   * 将特质转换为状态对象
   */
  private traitsToState(traits: Record<string, Trait>): Record<string, unknown> {
    const state: Record<string, unknown> = {
      fitness: 0.5,
    };

    for (const [name, trait] of Object.entries(traits)) {
      state[name] = trait.value;
    }

    return state;
  }

  /**
   * 获取默认状态
   */
  private getDefaultState(): Record<string, unknown> {
    return {
      fitness: 0.5,
    };
  }

  /**
   * 创建存储适配器
   */
  private createStorageAdapter(adapter: unknown): TraitStorage {
    // 简化的内存存储
    return {
      async get(userId: string, tenantId: string): Promise<Record<string, Trait> | null> {
        return null;
      },
      async save(userId: string, tenantId: string, traits: Record<string, Trait>): Promise<void> {
        // 存储逻辑
      },
      async delete(userId: string, tenantId: string): Promise<void> {
        // 删除逻辑
      },
    };
  }
}
