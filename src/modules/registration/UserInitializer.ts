/**
 * UserInitializer.ts
 * 用户初始化器
 * 
 * 在用户注册后自动创建存储资源、初始化配置、预装技能等
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { User } from './types';
import { getConfig, StorageConfig } from '../../core/config/KunlunConfig';

/**
 * 初始化结果
 */
export interface InitializationResult {
  /** 是否成功 */
  success: boolean;
  /** 用户ID */
  userId: string;
  /** 创建的资源 */
  createdResources: InitializationResource[];
  /** 初始化的配置 */
  initializedConfigs: string[];
  /** 预装的技能 */
  installedSkills: string[];
  /** 错误列表 */
  errors: InitializationError[];
}

/**
 * 初始化的资源
 */
export interface InitializationResource {
  /** 资源类型 */
  type: ResourceType;
  /** 资源ID */
  id: string;
  /** 资源名称 */
  name: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 资源类型
 */
export enum ResourceType {
  /** 存储桶 */
  STORAGE_BUCKET = 'storage_bucket',
  /** 数据库 */
  DATABASE = 'database',
  /** 向量集合 */
  VECTOR_COLLECTION = 'vector_collection',
  /** 缓存 */
  CACHE = 'cache',
}

/**
 * 初始化错误
 */
export interface InitializationError {
  /** 错误类型 */
  type: ErrorType;
  /** 错误消息 */
  message: string;
  /** 上下文 */
  context?: Record<string, any>;
}

/**
 * 错误类型
 */
export enum ErrorType {
  /** 资源创建失败 */
  RESOURCE_CREATION_FAILED = 'resource_creation_failed',
  /** 配置初始化失败 */
  CONFIG_INIT_FAILED = 'config_init_failed',
  /** 技能安装失败 */
  SKILL_INSTALL_FAILED = 'skill_install_failed',
  /** 配额超限 */
  QUOTA_EXCEEDED = 'quota_exceeded',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

/**
 * 存储资源配置
 */
export interface StorageResourceConfig {
  /** 最大存储大小(MB) */
  maxSizeMB: number;
  /** 存储类型 */
  type: 'local' | 'cloud';
  /** 路径前缀 */
  pathPrefix?: string;
}

/**
 * 数据库资源配置
 */
export interface DatabaseResourceConfig {
  /** 数据库名称 */
  databaseName: string;
  /** 字符集 */
  charset: string;
}

/**
 * 向量集合资源配置
 */
export interface VectorCollectionConfig {
  /** 集合名称 */
  collectionName: string;
  /** 向量维度 */
  dimension: number;
  /** 距离度量方式 */
  distance: 'cosine' | 'euclidean' | 'dot';
}

/**
 * 默认用户配置
 */
export interface DefaultUserConfig {
  /** 语言 */
  language: string;
  /** 时区 */
  timezone: string;
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';
  /** 通知设置 */
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

/**
 * 用户初始化器
 * 
 * 负责新用户注册后的资源创建和配置初始化
 */
export class UserInitializer {
  /** 存储配置 */
  private storageConfig: StorageResourceConfig;
  
  /** 数据库配置 */
  private databaseConfig: DatabaseResourceConfig;
  
  /** 向量集合配置 */
  private vectorCollectionConfig: VectorCollectionConfig;
  
  /** 默认用户配置 */
  private defaultUserConfig: DefaultUserConfig;

  /**
   * 构造函数
   */
  constructor() {
    const config = getConfig();
    const storage = config.storage;
    const limits = config.registration.limits;

    this.storageConfig = {
      maxSizeMB: limits.maxStorageMB,
      type: storage.type === 'local' ? 'local' : 'cloud',
      pathPrefix: `users/${this.generateUserPathPrefix()}`,
    };

    this.databaseConfig = {
      databaseName: 'kunlun_user_db',
      charset: 'utf8mb4',
    };

    this.vectorCollectionConfig = {
      collectionName: 'user_memories',
      dimension: 1536,
      distance: 'cosine',
    };

    this.defaultUserConfig = {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      theme: 'auto',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
    };
  }

  /**
   * 初始化用户
   * 
   * @param user 用户信息
   * @returns 初始化结果
   */
  public async initialize(user: User): Promise<InitializationResult> {
    const result: InitializationResult = {
      success: true,
      userId: user.id,
      createdResources: [],
      initializedConfigs: [],
      installedSkills: [],
      errors: [],
    };

    try {
      // 1. 创建存储资源
      const storageResult = await this.createStorageResources(user);
      result.createdResources.push(...storageResult.resources);
      result.errors.push(...storageResult.errors);

      // 2. 创建数据库资源
      const dbResult = await this.createDatabaseResources(user);
      result.createdResources.push(...dbResult.resources);
      result.errors.push(...dbResult.errors);

      // 3. 创建向量集合
      const vectorResult = await this.createVectorCollection(user);
      result.createdResources.push(...vectorResult.resources);
      result.errors.push(...vectorResult.errors);

      // 4. 初始化用户配置
      const configResult = await this.initializeUserConfig(user);
      result.initializedConfigs = configResult.configs;
      result.errors.push(...configResult.errors);

      // 5. 预装默认技能
      const skillResult = await this.installDefaultSkills(user);
      result.installedSkills = skillResult.skills;
      result.errors.push(...skillResult.errors);

      // 如果有任何错误，标记为部分成功
      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push({
        type: ErrorType.UNKNOWN,
        message: error instanceof Error ? error.message : 'Unknown error during initialization',
      });
    }

    return result;
  }

  /**
   * 创建存储资源
   */
  private async createStorageResources(
    user: User
  ): Promise<{ resources: InitializationResource[]; errors: InitializationError[] }> {
    const resources: InitializationResource[] = [];
    const errors: InitializationError[] = [];

    try {
      // 模拟创建存储桶
      const bucketResource: InitializationResource = {
        type: ResourceType.STORAGE_BUCKET,
        id: `bucket_${user.id}`,
        name: `用户 ${user.id} 存储桶`,
        createdAt: new Date(),
      };
      resources.push(bucketResource);

      // 创建配置存储
      const configResource: InitializationResource = {
        type: ResourceType.STORAGE_BUCKET,
        id: `config_${user.id}`,
        name: `用户 ${user.id} 配置存储`,
        createdAt: new Date(),
      };
      resources.push(configResource);

      // 创建临时存储
      const tempResource: InitializationResource = {
        type: ResourceType.STORAGE_BUCKET,
        id: `temp_${user.id}`,
        name: `用户 ${user.id} 临时存储`,
        createdAt: new Date(),
      };
      resources.push(tempResource);

    } catch (error) {
      errors.push({
        type: ErrorType.RESOURCE_CREATION_FAILED,
        message: error instanceof Error ? error.message : 'Failed to create storage resources',
        context: { userId: user.id, resourceType: ResourceType.STORAGE_BUCKET },
      });
    }

    return { resources, errors };
  }

  /**
   * 创建数据库资源
   */
  private async createDatabaseResources(
    user: User
  ): Promise<{ resources: InitializationResource[]; errors: InitializationError[] }> {
    const resources: InitializationResource[] = [];
    const errors: InitializationError[] = [];

    try {
      // 模拟创建用户数据库表
      const tables = [
        { name: 'user_sessions', description: '用户会话表' },
        { name: 'user_memories', description: '用户记忆表' },
        { name: 'user_skills', description: '用户技能表' },
        { name: 'user_activities', description: '用户活动表' },
      ];

      for (const table of tables) {
        resources.push({
          type: ResourceType.DATABASE,
          id: `${user.id}_${table.name}`,
          name: `${table.description} (${user.id})`,
          createdAt: new Date(),
        });
      }

    } catch (error) {
      errors.push({
        type: ErrorType.RESOURCE_CREATION_FAILED,
        message: error instanceof Error ? error.message : 'Failed to create database resources',
        context: { userId: user.id, resourceType: ResourceType.DATABASE },
      });
    }

    return { resources, errors };
  }

  /**
   * 创建向量集合
   */
  private async createVectorCollection(
    user: User
  ): Promise<{ resources: InitializationResource[]; errors: InitializationError[] }> {
    const resources: InitializationResource[] = [];
    const errors: InitializationError[] = [];

    try {
      // 模拟创建向量集合
      const collectionResource: InitializationResource = {
        type: ResourceType.VECTOR_COLLECTION,
        id: `vector_${user.id}_memories`,
        name: `用户 ${user.id} 记忆向量集合`,
        createdAt: new Date(),
      };
      resources.push(collectionResource);

    } catch (error) {
      errors.push({
        type: ErrorType.RESOURCE_CREATION_FAILED,
        message: error instanceof Error ? error.message : 'Failed to create vector collection',
        context: { userId: user.id, resourceType: ResourceType.VECTOR_COLLECTION },
      });
    }

    return { resources, errors };
  }

  /**
   * 初始化用户配置
   */
  private async initializeUserConfig(
    user: User
  ): Promise<{ configs: string[]; errors: InitializationError[] }> {
    const configs: string[] = [];
    const errors: InitializationError[] = [];

    try {
      // 初始化默认配置
      configs.push('language');
      configs.push('timezone');
      configs.push('theme');
      configs.push('notifications');

      // 初始化默认偏好设置
      configs.push('preferences');

      // 初始化隐私设置
      configs.push('privacy');

    } catch (error) {
      errors.push({
        type: ErrorType.CONFIG_INIT_FAILED,
        message: error instanceof Error ? error.message : 'Failed to initialize user config',
        context: { userId: user.id },
      });
    }

    return { configs, errors };
  }

  /**
   * 预装默认技能
   */
  private async installDefaultSkills(
    user: User
  ): Promise<{ skills: string[]; errors: InitializationError[] }> {
    const skills: string[] = [];
    const errors: InitializationError[] = [];

    try {
      // 预装基础技能
      const defaultSkills = [
        'basic-chat',      // 基础对话
        'quick-actions',   // 快捷操作
      ];

      for (const skill of defaultSkills) {
        // 模拟安装技能
        skills.push(skill);
      }

    } catch (error) {
      errors.push({
        type: ErrorType.SKILL_INSTALL_FAILED,
        message: error instanceof Error ? error.message : 'Failed to install default skills',
        context: { userId: user.id },
      });
    }

    return { skills, errors };
  }

  /**
   * 获取用户存储路径
   * 
   * @param userId 用户ID
   * @param resourceType 资源类型
   * @returns 存储路径
   */
  public getUserStoragePath(userId: string, resourceType: string = 'default'): string {
    return `${this.storageConfig.pathPrefix}/${userId}/${resourceType}`;
  }

  /**
   * 获取用户数据库名称
   * 
   * @param userId 用户ID
   * @returns 数据库名称
   */
  public getUserDatabaseName(userId: string): string {
    return `${this.databaseConfig.databaseName}_${userId}`;
  }

  /**
   * 获取用户向量集合名称
   * 
   * @param userId 用户ID
   * @returns 集合名称
   */
  public getUserVectorCollectionName(userId: string): string {
    return `${this.vectorCollectionConfig.collectionName}_${userId}`;
  }

  /**
   * 获取默认用户配置
   */
  public getDefaultUserConfig(): DefaultUserConfig {
    return { ...this.defaultUserConfig };
  }

  /**
   * 生成用户路径前缀
   */
  private generateUserPathPrefix(): string {
    const timestamp = Date.now().toString(36);
    return `tenant_${timestamp}`;
  }

  /**
   * 清理用户资源（删除用户时调用）
   * 
   * @param userId 用户ID
   * @returns 清理结果
   */
  public async cleanupUserResources(userId: string): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // 清理存储资源
      // 清理数据库资源
      // 清理向量集合
      // 清理缓存

      return { success: errors.length === 0, errors };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during cleanup'],
      };
    }
  }

  /**
   * 获取用户资源使用情况
   * 
   * @param userId 用户ID
   * @returns 资源使用情况
   */
  public async getUserResourceUsage(
    userId: string
  ): Promise<{
    storageUsedMB: number;
    databaseSizeMB: number;
    vectorCount: number;
    cacheSizeMB: number;
  }> {
    // 模拟返回资源使用情况
    return {
      storageUsedMB: 0,
      databaseSizeMB: 0,
      vectorCount: 0,
      cacheSizeMB: 0,
    };
  }

  /**
   * 检查用户配额
   * 
   * @param userId 用户ID
   * @returns 是否在配额内
   */
  public async checkUserQuota(userId: string): Promise<{
    withinQuota: boolean;
    exceededResources: string[];
  }> {
    const usage = await this.getUserResourceUsage(userId);
    const exceededResources: string[] = [];

    if (usage.storageUsedMB > this.storageConfig.maxSizeMB) {
      exceededResources.push('storage');
    }

    return {
      withinQuota: exceededResources.length === 0,
      exceededResources,
    };
  }
}
