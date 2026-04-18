/**
 * 技能系统核心接口
 * Skill System Core Interface
 */

import {
  SkillMetadata,
  SkillExecutionResult,
  SkillExecutionContext,
  SkillExecutionOptions,
  SkillInstallInfo,
  SkillInstallOptions,
  SkillUninstallOptions,
  SkillValidationResult,
  SkillQuotaInfo,
  SkillStats,
  SkillSearchFilter,
  SkillSortOptions,
  SkillSearchResult,
} from './skill.types';

// Re-export types from skill.types
export {
  SkillMetadata,
  SkillExecutionResult,
  SkillExecutionContext,
  SkillExecutionOptions,
  SkillInstallInfo,
  SkillInstallOptions,
  SkillUninstallOptions,
  SkillValidationResult,
  SkillQuotaInfo,
  SkillStats,
  SkillSearchFilter,
  SkillSortOptions,
  SkillSearchResult,
};

/**
 * 技能生命周期状态
 */
export enum SkillLifecycleStatus {
  /** 已注册 */
  REGISTERED = 'registered',
  /** 已安装 */
  INSTALLED = 'installed',
  /** 已启用 */
  ENABLED = 'enabled',
  /** 已禁用 */
  DISABLED = 'disabled',
  /** 更新中 */
  UPDATING = 'updating',
  /** 卸载中 */
  UNINSTALLING = 'uninstalling',
  /** 已卸载 */
  UNINSTALLED = 'uninstalled',
}

/**
 * 技能信息（包含完整信息）
 */
export interface SkillInfo extends SkillMetadata {
  /** 技能路径 */
  path: string;
  /** 生命周期状态 */
  lifecycleStatus: SkillLifecycleStatus;
  /** 安装信息 */
  installInfo?: SkillInstallInfo;
  /** 配额信息 */
  quotaInfo?: SkillQuotaInfo;
  /** 统计信息 */
  stats?: SkillStats;
  /** 入口文件 */
  entryPoint?: string;
  /** 配置文件 */
  configFile?: string;
  /** 依赖列表 */
  dependencies?: string[];
  /** 注册时间 */
  registeredAt?: Date;
  /** 最后更新时间 */
  updatedAt?: Date;
}

/**
 * 技能注册信息
 */
export interface SkillRegistration {
  /** 技能ID */
  skillId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 注册时间 */
  registeredAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 技能市场条目
 */
export interface SkillMarketplaceEntry {
  /** 技能元数据 */
  metadata: SkillMetadata;
  /** 下载次数 */
  downloads: number;
  /** 评分 */
  rating: number;
  /** 评论数 */
  reviewCount: number;
  /** 是否官方 */
  isOfficial: boolean;
  /** 验证状态 */
  verified: boolean;
  /** 兼容版本 */
  compatibility: string[];
}

/**
 * 技能系统接口
 * 定义技能系统的核心操作
 */
export interface ISkillSystem {
  // ============== 生命周期管理 ==============

  /**
   * 安装技能
   * @param skillId - 技能ID或包名
   * @param options - 安装选项
   */
  installSkill(
    skillId: string,
    options?: SkillInstallOptions
  ): Promise<SkillInstallInfo>;

  /**
   * 卸载技能
   * @param skillId - 技能ID
   * @param options - 卸载选项
   */
  uninstallSkill(
    skillId: string,
    options?: SkillUninstallOptions
  ): Promise<void>;

  /**
   * 更新技能
   * @param skillId - 技能ID
   * @param version - 目标版本（可选，默认最新）
   */
  updateSkill(skillId: string, version?: string): Promise<SkillInstallInfo>;

  /**
   * 启用技能
   * @param skillId - 技能ID
   */
  enableSkill(skillId: string): Promise<void>;

  /**
   * 禁用技能
   * @param skillId - 技能ID
   */
  disableSkill(skillId: string): Promise<void>;

  // ============== 执行管理 ==============

  /**
   * 执行技能
   * @param skillId - 技能ID
   * @param input - 输入参数
   * @param options - 执行选项
   */
  executeSkill(
    skillId: string,
    input: Record<string, unknown>,
    options?: SkillExecutionOptions
  ): Promise<SkillExecutionResult>;

  /**
   * 异步执行技能
   * @param skillId - 技能ID
   * @param input - 输入参数
   * @param options - 执行选项
   */
  executeSkillAsync(
    skillId: string,
    input: Record<string, unknown>,
    options?: SkillExecutionOptions
  ): Promise<string>;

  /**
   * 取消执行
   * @param executionId - 执行ID
   */
  cancelExecution(executionId: string): Promise<void>;

  /**
   * 获取执行结果
   * @param executionId - 执行ID
   */
  getExecutionResult(executionId: string): Promise<SkillExecutionResult | null>;

  /**
   * 获取技能执行历史
   * @param skillId - 技能ID
   * @param limit - 限制数量
   */
  getExecutionHistory(
    skillId: string,
    limit?: number
  ): Promise<SkillExecutionResult[]>;

  // ============== 查询管理 ==============

  /**
   * 获取技能信息
   * @param skillId - 技能ID
   */
  getSkill(skillId: string): Promise<SkillInfo | null>;

  /**
   * 获取用户的所有技能
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  getUserSkills(userId: string, tenantId: string): Promise<SkillInfo[]>;

  /**
   * 搜索技能
   * @param filter - 搜索过滤器
   * @param sort - 排序选项
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  searchSkills(
    filter: SkillSearchFilter,
    sort?: SkillSortOptions,
    page?: number,
    pageSize?: number
  ): Promise<SkillSearchResult>;

  /**
   * 检查技能是否存在
   * @param skillId - 技能ID
   */
  hasSkill(skillId: string): Promise<boolean>;

  // ============== 验证与安全 ==============

  /**
   * 验证技能
   * @param skillPath - 技能路径
   */
  validateSkill(skillPath: string): Promise<SkillValidationResult>;

  /**
   * 签名验证
   * @param skillId - 技能ID
   * @param signature - 签名
   */
  verifySignature(skillId: string, signature: string): Promise<boolean>;

  // ============== 配额管理 ==============

  /**
   * 获取配额信息
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   */
  getQuotaInfo(userId: string, tenantId: string): Promise<SkillQuotaInfo>;

  /**
   * 检查配额
   * @param userId - 用户ID
   * @param tenantId - 租户ID
   * @param skillId - 技能ID（可选）
   */
  checkQuota(
    userId: string,
    tenantId: string,
    skillId?: string
  ): Promise<{ allowed: boolean; reason?: string }>;

  // ============== 统计信息 ==============

  /**
   * 获取技能统计
   * @param skillId - 技能ID
   */
  getSkillStats(skillId: string): Promise<SkillStats>;

  /**
   * 获取系统统计
   */
  getSystemStats(): Promise<{
    totalSkills: number;
    totalExecutions: number;
    activeSkills: number;
    avgSuccessRate: number;
  }>;

  // ============== 导入导出 ==============

  /**
   * 导出技能
   * @param skillId - 技能ID
   * @param outputPath - 输出路径
   */
  exportSkill(skillId: string, outputPath: string): Promise<string>;

  /**
   * 导入技能
   * @param inputPath - 输入路径
   * @param options - 安装选项
   */
  importSkill(
    inputPath: string,
    options?: SkillInstallOptions
  ): Promise<SkillInstallInfo>;
}
