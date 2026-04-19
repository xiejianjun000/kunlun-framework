/**
 * DatabaseAdapter.ts
 * 数据库适配器接口
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { IPersonalityProfile, BehaviorData } from '../../core/interfaces/IPersonalitySystem';

/**
 * 数据库适配器接口
 * 
 * 定义数据库存储操作的接口规范
 * 具体实现可使用 PostgreSQL、MongoDB 等
 */
export interface DatabaseAdapter {
  /**
   * 初始化适配器
   */
  initialize(): Promise<void>;

  /**
   * 关闭连接
   */
  close(): Promise<void>;

  /**
   * 保存人格画像
   * @param profile 人格画像
   */
  savePersonalityProfile(profile: IPersonalityProfile): Promise<void>;

  /**
   * 获取人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  getPersonalityProfile(userId: string, tenantId: string): Promise<IPersonalityProfile | null>;

  /**
   * 删除人格画像
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  deletePersonalityProfile(userId: string, tenantId: string): Promise<void>;

  /**
   * 保存行为数据
   * @param behavior 行为数据
   */
  saveBehavior(behavior: BehaviorData): Promise<void>;

  /**
   * 批量保存行为数据
   * @param behaviors 行为数据列表
   */
  saveBehaviors(behaviors: BehaviorData[]): Promise<void>;

  /**
   * 获取行为数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param options 查询选项
   */
  getBehaviors(
    userId: string,
    tenantId: string,
    options?: {
      limit?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<BehaviorData[]>;

  /**
   * 删除行为数据
   * @param behaviorId 行为ID
   */
  deleteBehavior(behaviorId: string): Promise<void>;
}

/**
 * 内存数据库适配器（用于测试和开发）
 */
export class MemoryDatabaseAdapter implements DatabaseAdapter {
  private profiles: Map<string, IPersonalityProfile> = new Map();
  private behaviors: Map<string, BehaviorData[]> = new Map();

  async initialize(): Promise<void> {
    console.log('[MemoryDatabaseAdapter] Initialized');
  }

  async close(): Promise<void> {
    this.profiles.clear();
    this.behaviors.clear();
  }

  async savePersonalityProfile(profile: IPersonalityProfile): Promise<void> {
    const key = `${profile.tenantId}:${profile.userId}`;
    this.profiles.set(key, profile);
  }

  async getPersonalityProfile(userId: string, tenantId: string): Promise<IPersonalityProfile | null> {
    const key = `${tenantId}:${userId}`;
    return this.profiles.get(key) || null;
  }

  async deletePersonalityProfile(userId: string, tenantId: string): Promise<void> {
    const key = `${tenantId}:${userId}`;
    this.profiles.delete(key);
  }

  async saveBehavior(behavior: BehaviorData): Promise<void> {
    const key = `${behavior.tenantId}:${behavior.userId}`;
    if (!this.behaviors.has(key)) {
      this.behaviors.set(key, []);
    }
    this.behaviors.get(key)!.push(behavior);
  }

  async saveBehaviors(behaviors: BehaviorData[]): Promise<void> {
    for (const behavior of behaviors) {
      await this.saveBehavior(behavior);
    }
  }

  async getBehaviors(
    userId: string,
    tenantId: string,
    options?: {
      limit?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<BehaviorData[]> {
    const key = `${tenantId}:${userId}`;
    let behaviors = this.behaviors.get(key) || [];

    if (options?.type) {
      behaviors = behaviors.filter(b => b.type === options.type);
    }

    if (options?.startDate) {
      behaviors = behaviors.filter(b => new Date(b.timestamp) >= options.startDate!);
    }

    if (options?.endDate) {
      behaviors = behaviors.filter(b => new Date(b.timestamp) <= options.endDate!);
    }

    if (options?.limit && options.limit > 0) {
      behaviors = behaviors.slice(0, options.limit);
    }

    return behaviors;
  }

  async deleteBehavior(behaviorId: string): Promise<void> {
    for (const [key, behaviors] of this.behaviors) {
      const index = behaviors.findIndex(b => b.id === behaviorId);
      if (index !== -1) {
        behaviors.splice(index, 1);
        break;
      }
    }
  }
}

export default MemoryDatabaseAdapter;
