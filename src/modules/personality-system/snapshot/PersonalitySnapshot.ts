/**
 * PersonalitySnapshot.ts
 * 人格快照管理
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IPersonalityProfile,
  PersonalitySnapshot,
  PersonalitySystemConfig,
  TraitType,
  TraitDimension,
  PersonalityDimensions
} from '../../../core/interfaces/IPersonalitySystem';

/**
 * 快照存储接口
 */
export interface SnapshotStorage {
  /** 保存快照 */
  save(snapshot: PersonalitySnapshot): Promise<void>;
  /** 获取快照 */
  get(userId: string, tenantId: string, snapshotId: string): Promise<PersonalitySnapshot | null>;
  /** 获取快照列表 */
  list(userId: string, tenantId: string): Promise<PersonalitySnapshot[]>;
  /** 删除快照 */
  delete(snapshotId: string): Promise<void>;
  /** 清理过期快照 */
  cleanup(olderThan: Date): Promise<number>;
}

/**
 * 内存快照存储
 */
class MemorySnapshotStorage implements SnapshotStorage {
  private snapshots: Map<string, PersonalitySnapshot> = new Map();

  async save(snapshot: PersonalitySnapshot): Promise<void> {
    this.snapshots.set(snapshot.snapshotId, snapshot);
  }

  async get(userId: string, tenantId: string, snapshotId: string): Promise<PersonalitySnapshot | null> {
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot && snapshot.userId === userId && snapshot.tenantId === tenantId) {
      return snapshot;
    }
    return null;
  }

  async list(userId: string, tenantId: string): Promise<PersonalitySnapshot[]> {
    return [...this.snapshots.values()].filter(
      s => s.userId === userId && s.tenantId === tenantId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async delete(snapshotId: string): Promise<void> {
    this.snapshots.delete(snapshotId);
  }

  async cleanup(olderThan: Date): Promise<number> {
    let count = 0;
    for (const [id, snapshot] of this.snapshots) {
      if (new Date(snapshot.createdAt) < olderThan) {
        this.snapshots.delete(id);
        count++;
      }
    }
    return count;
  }
}

/**
 * 人格快照管理器类
 * 
 * 负责人格快照的创建、存储和管理
 * 支持定期快照和关键里程碑快照
 * 
 * @example
 * ```typescript
 * const manager = new PersonalitySnapshotManager();
 * manager.initialize(config);
 * 
 * // 创建快照
 * const snapshot = await manager.createSnapshot(profile, 'full', ['里程碑']);
 * 
 * // 获取快照列表
 * const snapshots = await manager.getSnapshots('user_123', 'tenant_abc');
 * ```
 */
export class PersonalitySnapshotManager {
  /** 配置 */
  private config: PersonalitySystemConfig | null = null;
  
  /** 存储 */
  private storage: SnapshotStorage;
  
  /** 快照保留天数 */
  private retentionDays: number = 90;

  /**
   * 构造函数
   * @param storage 可选的外部存储
   */
  constructor(storage?: SnapshotStorage) {
    this.storage = storage || new MemorySnapshotStorage();
  }

  /**
   * 初始化管理器
   * @param config 系统配置
   */
  initialize(config: PersonalitySystemConfig): void {
    this.config = config;
    if (config.snapshotRetentionDays) {
      this.retentionDays = config.snapshotRetentionDays;
    }
  }

  /**
   * 创建快照
   * @param profile 人格画像
   * @param type 快照类型
   * @param tags 标签
   */
  async createSnapshot(
    profile: IPersonalityProfile,
    type: 'full' | 'incremental' | 'milestone',
    tags?: string[]
  ): Promise<PersonalitySnapshot> {
    const now = new Date();
    
    // 根据类型决定快照数据范围
    let data: Partial<IPersonalityProfile>;
    
    switch (type) {
      case 'full':
        data = this.extractFullData(profile);
        break;
      case 'incremental':
        data = this.extractIncrementalData(profile);
        break;
      case 'milestone':
        data = this.extractMilestoneData(profile);
        break;
      default:
        data = this.extractFullData(profile);
    }

    const snapshot: PersonalitySnapshot = {
      snapshotId: `snapshot_${uuidv4()}`,
      userId: profile.userId,
      tenantId: profile.tenantId,
      createdAt: now,
      type,
      data,
      tags: tags || this.generateDefaultTags(type)
    };

    // 保存快照
    await this.storage.save(snapshot);

    return snapshot;
  }

  /**
   * 提取完整数据
   */
  private extractFullData(profile: IPersonalityProfile): Partial<IPersonalityProfile> {
    return {
      profileId: profile.profileId,
      userId: profile.userId,
      tenantId: profile.tenantId,
      version: profile.version,
      confidenceScore: profile.confidenceScore,
      dimensions: JSON.parse(JSON.stringify(profile.dimensions)),
      stableTraits: [...profile.stableTraits],
      evolutionHistory: [...profile.evolutionHistory]
    };
  }

  /**
   * 提取增量数据（仅包含变更部分）
   */
  private extractIncrementalData(profile: IPersonalityProfile): Partial<IPersonalityProfile> {
    const latestEvolution = profile.evolutionHistory[profile.evolutionHistory.length - 1];
    
    return {
      profileId: profile.profileId,
      userId: profile.userId,
      tenantId: profile.tenantId,
      version: profile.version,
      confidenceScore: profile.confidenceScore,
      dimensions: {
        personality: {
          dimensions: {} as Record<TraitType, TraitDimension>,
          stableTraits: profile.stableTraits
        },
        perspective: profile.dimensions.perspective,
        worldview: profile.dimensions.worldview,
        values: profile.dimensions.values,
        lifePhilosophy: profile.dimensions.lifePhilosophy
      },
      evolutionHistory: latestEvolution ? [latestEvolution] : []
    };
  }

  /**
   * 提取里程碑数据（核心特质和关键变化）
   */
  private extractMilestoneData(profile: IPersonalityProfile): Partial<IPersonalityProfile> {
    return {
      profileId: profile.profileId,
      userId: profile.userId,
      tenantId: profile.tenantId,
      version: profile.version,
      confidenceScore: profile.confidenceScore,
      dimensions: {
        personality: {
          dimensions: {
            extraversion_introversion: profile.dimensions.personality.dimensions.extraversion_introversion,
            openness_conservatism: profile.dimensions.personality.dimensions.openness_conservatism,
            rationality_emotion: profile.dimensions.personality.dimensions.rationality_emotion,
            risk_tolerance: profile.dimensions.personality.dimensions.risk_tolerance
          } as Record<TraitType, TraitDimension>,
          stableTraits: profile.stableTraits
        },
        perspective: profile.dimensions.perspective,
        worldview: profile.dimensions.worldview,
        values: profile.dimensions.values,
        lifePhilosophy: profile.dimensions.lifePhilosophy
      },
      evolutionHistory: profile.evolutionHistory.slice(-5) // 最近5条历史
    };
  }

  /**
   * 生成默认标签
   */
  private generateDefaultTags(type: string): string[] {
    const tags: string[] = [type];
    
    switch (type) {
      case 'full':
        tags.push('完整备份');
        break;
      case 'incremental':
        tags.push('增量更新');
        break;
      case 'milestone':
        tags.push('重要节点');
        break;
    }
    
    return tags;
  }

  /**
   * 获取快照
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param snapshotId 快照ID
   */
  async getSnapshot(
    userId: string,
    tenantId: string,
    snapshotId: string
  ): Promise<PersonalitySnapshot | null> {
    return this.storage.get(userId, tenantId, snapshotId);
  }

  /**
   * 获取快照列表
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getSnapshots(
    userId: string,
    tenantId: string
  ): Promise<PersonalitySnapshot[]> {
    return this.storage.list(userId, tenantId);
  }

  /**
   * 删除快照
   * @param snapshotId 快照ID
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this.storage.delete(snapshotId);
  }

  /**
   * 清理过期快照
   */
  async cleanupExpired(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    return this.storage.cleanup(cutoffDate);
  }

  /**
   * 比较两个快照
   * @param snapshot1 快照1
   * @param snapshot2 快照2
   */
  async compareSnapshots(
    snapshot1: PersonalitySnapshot,
    snapshot2: PersonalitySnapshot
  ): Promise<{
    versionChange: number;
    confidenceChange: number;
    traitsChanged: string[];
    traitsAdded: string[];
    traitsRemoved: string[];
  }> {
    const d1 = snapshot1.data;
    const d2 = snapshot2.data;

    return {
      versionChange: (d2?.version || 0) - (d1?.version || 0),
      confidenceChange: (d2?.confidenceScore || 0) - (d1?.confidenceScore || 0),
      traitsChanged: this.getChangedTraits(d1, d2),
      traitsAdded: this.getAddedTraits(d1, d2),
      traitsRemoved: this.getRemovedTraits(d1, d2)
    };
  }

  /**
   * 获取变更的特质
   */
  private getChangedTraits(
    d1: Partial<IPersonalityProfile> | undefined,
    d2: Partial<IPersonalityProfile> | undefined
  ): string[] {
    const changed: string[] = [];
    // 实现特质变化检测逻辑
    return changed;
  }

  /**
   * 获取新增的特质
   */
  private getAddedTraits(
    d1: Partial<IPersonalityProfile> | undefined,
    d2: Partial<IPersonalityProfile> | undefined
  ): string[] {
    const added: string[] = [];
    // 实现特质新增检测逻辑
    return added;
  }

  /**
   * 获取移除的特质
   */
  private getRemovedTraits(
    d1: Partial<IPersonalityProfile> | undefined,
    d2: Partial<IPersonalityProfile> | undefined
  ): string[] {
    const removed: string[] = [];
    // 实现特质移除检测逻辑
    return removed;
  }

  /**
   * 从快照恢复人格画像
   * @param snapshot 快照
   */
  async restoreFromSnapshot(snapshot: PersonalitySnapshot): Promise<IPersonalityProfile> {
    const data = snapshot.data;
    
    if (!data) {
      throw new Error('快照数据为空');
    }

    return {
      profileId: data.profileId || `profile_${uuidv4()}`,
      userId: snapshot.userId,
      tenantId: snapshot.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: data.version || 1,
      confidenceScore: data.confidenceScore || 0,
      privacySettings: {
        noDistillTopics: [],
        distillLevel: 'standard'
      },
      dimensions: data.dimensions || {
        personality: { dimensions: {} as Record<TraitType, TraitDimension>, stableTraits: [] },
        perspective: { dimensions: {}, preferredFormats: [] as string[], avoidFormats: [] as string[] },
        worldview: { dimensions: {}, coreBeliefs: [] as string[] },
        values: { valueHierarchy: {}, bottomLinePrinciples: [] as string[], tradeOffPatterns: {}, confidence: 0 },
        lifePhilosophy: { dimensions: { goalOrientation: { primaryGoals: [] as string[], confidence: 0 }, timeValue: { value: '', label: '', confidence: 0, evidence: [] as string[] }, meaningPursuit: { value: '', label: '', confidence: 0, evidence: [] as string[] }, workStyle: { collaborationPreference: '', autonomyNeed: '', feedbackFrequency: '' } }, confidence: 0 }
      } as unknown as PersonalityDimensions,
      stableTraits: data.stableTraits || [],
      evolutionHistory: data.evolutionHistory || []
    };
  }

  /**
   * 获取快照统计
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getSnapshotStats(
    userId: string,
    tenantId: string
  ): Promise<{
    totalCount: number;
    byType: Record<string, number>;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
  }> {
    const snapshots = await this.getSnapshots(userId, tenantId);
    
    const byType: Record<string, number> = {};
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const snapshot of snapshots) {
      byType[snapshot.type] = (byType[snapshot.type] || 0) + 1;
      
      if (!oldest || new Date(snapshot.createdAt) < oldest) {
        oldest = new Date(snapshot.createdAt);
      }
      if (!newest || new Date(snapshot.createdAt) > newest) {
        newest = new Date(snapshot.createdAt);
      }
    }

    return {
      totalCount: snapshots.length,
      byType,
      oldestSnapshot: oldest,
      newestSnapshot: newest
    };
  }
}

export default PersonalitySnapshotManager;
