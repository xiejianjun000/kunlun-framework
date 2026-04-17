/**
 * 技能注册表
 * Skill Registry - 管理技能元数据
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  SkillInfo,
  SkillMetadata,
  SkillRegistration,
  SkillLifecycleStatus,
  SkillInstallInfo,
  SkillQuotaInfo,
  SkillStats,
} from '../interfaces/ISkillSystem';
import {
  SkillMetadataSchema,
  SkillQuotaInfo,
  SkillStats,
} from '../interfaces/skill.types';

/**
 * 注册表配置
 */
export interface RegistryConfig {
  /** 注册表路径 */
  registryPath: string;
  /** 是否启用持久化 */
  persist?: boolean;
  /** 最大缓存大小 */
  maxCacheSize?: number;
}

/**
 * 技能注册表事件
 */
export enum RegistryEvent {
  REGISTERED = 'registered',
  UPDATED = 'updated',
  REMOVED = 'removed',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

/**
 * 技能注册表
 * 管理所有技能的元数据和注册信息
 */
export class SkillRegistry extends EventEmitter {
  /** 注册表配置 */
  private config: Required<RegistryConfig>;
  /** 技能缓存 */
  private skills: Map<string, SkillInfo> = new Map();
  /** 用户技能索引 */
  private userSkillsIndex: Map<string, Map<string, string>> = new Map();
  /** 租户技能索引 */
  private tenantSkillsIndex: Map<string, Map<string, string>> = new Map();
  /** 加载状态 */
  private loaded: boolean = false;
  /** 持久化锁 */
  private persistLock: boolean = false;

  /**
   * 构造函数
   * @param config - 注册表配置
   */
  constructor(config: RegistryConfig) {
    super();
    this.config = {
      registryPath: config.registryPath,
      persist: config.persist ?? true,
      maxCacheSize: config.maxCacheSize ?? 1000,
    };
  }

  // ============== 生命周期 ==============

  /**
   * 初始化注册表
   */
  async initialize(): Promise<void> {
    if (this.loaded) {
      return;
    }

    // 确保目录存在
    if (!fs.existsSync(this.config.registryPath)) {
      fs.mkdirSync(this.config.registryPath, { recursive: true });
    }

    // 加载已存在的技能
    await this.load();

    this.loaded = true;
  }

  /**
   * 销毁注册表
   */
  async destroy(): Promise<void> {
    await this.persist();
    this.skills.clear();
    this.userSkillsIndex.clear();
    this.tenantSkillsIndex.clear();
    this.loaded = false;
  }

  // ============== 注册管理 ==============

  /**
   * 注册技能
   * @param metadata - 技能元数据
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   * @param path - 技能路径
   */
  async register(
    metadata: SkillMetadata,
    userId: string,
    tenantId: string,
    path: string
  ): Promise<SkillInfo> {
    // 验证元数据
    const validated = SkillMetadataSchema.parse(metadata);

    const skillInfo: SkillInfo = {
      ...validated,
      path,
      lifecycleStatus: SkillLifecycleStatus.REGISTERED,
      installInfo: {
        skillId: metadata.id,
        installPath: path,
        installedAt: new Date(),
        source: 'local',
        dependencies: [],
      },
      registeredAt: new Date(),
      updatedAt: new Date(),
    } as SkillInfo;

    // 检查是否已存在
    const existingSkill = this.skills.get(metadata.id);
    if (existingSkill) {
      throw new Error(`技能 ${metadata.id} 已存在`);
    }

    // 存储技能信息
    this.skills.set(metadata.id, skillInfo);

    // 更新索引
    this.updateIndexes(metadata.id, userId, tenantId);

    // 持久化
    await this.persist();

    // 发送事件
    this.emit(RegistryEvent.REGISTERED, skillInfo);

    return skillInfo;
  }

  /**
   * 注销技能
   * @param skillId - 技能ID
   */
  async unregister(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    // 更新生命周期状态
    skill.lifecycleStatus = SkillLifecycleStatus.UNINSTALLED;
    skill.updatedAt = new Date();

    // 从缓存移除
    this.skills.delete(skillId);

    // 清理索引
    this.cleanIndexes(skillId);

    // 持久化
    await this.persist();

    // 发送事件
    this.emit(RegistryEvent.REMOVED, skillId);
  }

  /**
   * 更新技能
   * @param skillId - 技能ID
   * @param updates - 更新内容
   */
  async update(
    skillId: string,
    updates: Partial<SkillMetadata>
  ): Promise<SkillInfo> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    // 合并更新
    const updatedSkill = {
      ...skill,
      ...updates,
      updatedAt: new Date(),
    };

    // 验证并保存
    this.skills.set(skillId, SkillMetadataSchema.parse(updatedSkill) as SkillInfo);

    // 持久化
    await this.persist();

    // 发送事件
    this.emit(RegistryEvent.UPDATED, updatedSkill);

    return updatedSkill;
  }

  // ============== 查询 ==============

  /**
   * 获取技能
   * @param skillId - 技能ID
   */
  get(skillId: string): SkillInfo | null {
    return this.skills.get(skillId) || null;
  }

  /**
   * 获取用户的所有技能
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  getUserSkills(userId: string, tenantId: string): SkillInfo[] {
    const tenantKey = `${tenantId}:${userId}`;
    const index = this.userSkillsIndex.get(tenantKey);
    if (!index) {
      return [];
    }

    return Array.from(index.values())
      .map((skillId) => this.skills.get(skillId))
      .filter((skill): skill is SkillInfo => skill !== null);
  }

  /**
   * 检查技能是否存在
   * @param skillId - 技能ID
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * 获取所有技能
   */
  getAll(): SkillInfo[] {
    return Array.from(this.skills.values());
  }

  /**
   * 获取技能数量
   */
  getCount(): number {
    return this.skills.size;
  }

  /**
   * 搜索技能
   * @param keyword - 关键词
   * @param userId - 用户ID（可选）
   * @param tenantId - 租户ID（可选）
   */
  search(keyword: string, userId?: string, tenantId?: string): SkillInfo[] {
    const lowerKeyword = keyword.toLowerCase();
    let skills = Array.from(this.skills.values());

    // 按用户/租户过滤
    if (userId && tenantId) {
      const tenantKey = `${tenantId}:${userId}`;
      const index = this.userSkillsIndex.get(tenantKey);
      if (index) {
        const skillIds = new Set(index.values());
        skills = skills.filter((s) => skillIds.has(s.id));
      }
    }

    // 按关键词过滤
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(lowerKeyword) ||
        skill.description.toLowerCase().includes(lowerKeyword) ||
        skill.keywords?.some((k) => k.toLowerCase().includes(lowerKeyword))
    );
  }

  // ============== 生命周期状态 ==============

  /**
   * 启用技能
   * @param skillId - 技能ID
   */
  async enable(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    if (skill.lifecycleStatus === SkillLifecycleStatus.DISABLED) {
      skill.lifecycleStatus = SkillLifecycleStatus.ENABLED;
      skill.updatedAt = new Date();
      await this.persist();
      this.emit(RegistryEvent.ENABLED, skill);
    }
  }

  /**
   * 禁用技能
   * @param skillId - 技能ID
   */
  async disable(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    if (skill.lifecycleStatus === SkillLifecycleStatus.ENABLED) {
      skill.lifecycleStatus = SkillLifecycleStatus.DISABLED;
      skill.updatedAt = new Date();
      await this.persist();
      this.emit(RegistryEvent.DISABLED, skill);
    }
  }

  // ============== 持久化 ==============

  /**
   * 持久化注册表
   */
  private async persist(): Promise<void> {
    if (!this.config.persist || this.persistLock) {
      return;
    }

    this.persistLock = true;

    try {
      const dataPath = path.join(this.config.registryPath, 'registry.json');
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        skills: Array.from(this.skills.entries()),
      };
      await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    } finally {
      this.persistLock = false;
    }
  }

  /**
   * 加载注册表
   */
  private async load(): Promise<void> {
    const dataPath = path.join(this.config.registryPath, 'registry.json');

    if (!fs.existsSync(dataPath)) {
      return;
    }

    try {
      const content = await fs.promises.readFile(dataPath, 'utf-8');
      const data = JSON.parse(content);

      if (data.skills) {
        for (const [id, skill] of data.skills) {
          this.skills.set(id, skill as SkillInfo);
          // 重建索引
          const installInfo = (skill as SkillInfo).installInfo;
          if (installInfo) {
            // 简化处理，从路径提取用户和租户信息
            // 实际应用中应该从持久化数据中恢复
          }
        }
      }
    } catch (error) {
      console.error('加载注册表失败:', error);
    }
  }

  // ============== 索引管理 ==============

  /**
   * 更新索引
   */
  private updateIndexes(skillId: string, userId: string, tenantId: string): void {
    // 用户索引
    const userKey = `${tenantId}:${userId}`;
    if (!this.userSkillsIndex.has(userKey)) {
      this.userSkillsIndex.set(userKey, new Map());
    }
    this.userSkillsIndex.get(userKey)!.set(skillId, skillId);

    // 租户索引
    if (!this.tenantSkillsIndex.has(tenantId)) {
      this.tenantSkillsIndex.set(tenantId, new Map());
    }
    this.tenantSkillsIndex.get(tenantId)!.set(skillId, skillId);
  }

  /**
   * 清理索引
   */
  private cleanIndexes(skillId: string): void {
    // 清理用户索引
    for (const index of this.userSkillsIndex.values()) {
      index.delete(skillId);
    }

    // 清理租户索引
    for (const index of this.tenantSkillsIndex.values()) {
      index.delete(skillId);
    }
  }

  // ============== 批量操作 ==============

  /**
   * 批量注册
   * @param skills - 技能列表
   */
  async registerBatch(
    skills: Array<{ metadata: SkillMetadata; userId: string; tenantId: string; path: string }>
  ): Promise<SkillInfo[]> {
    const results: SkillInfo[] = [];
    for (const skill of skills) {
      try {
        const result = await this.register(
          skill.metadata,
          skill.userId,
          skill.tenantId,
          skill.path
        );
        results.push(result);
      } catch (error) {
        console.error(`注册技能 ${skill.metadata.id} 失败:`, error);
      }
    }
    return results;
  }

  /**
   * 批量移除
   * @param skillIds - 技能ID列表
   */
  async removeBatch(skillIds: string[]): Promise<void> {
    for (const skillId of skillIds) {
      try {
        await this.unregister(skillId);
      } catch (error) {
        console.error(`移除技能 ${skillId} 失败:`, error);
      }
    }
  }
}
