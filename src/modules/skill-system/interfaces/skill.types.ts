/**
 * 技能系统接口定义
 * Skill System Interfaces
 */

import { z } from 'zod';

/**
 * 技能元数据结构
 */
export const SkillMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
  license: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

/**
 * 技能输入/输出参数定义
 */
export const SkillParameterSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'file']),
  description: z.string().optional(),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
  enum: z.array(z.unknown()).optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export type SkillParameter = z.infer<typeof SkillParameterSchema>;

/**
 * 技能输入定义
 */
export interface SkillInput {
  /** 参数列表 */
  parameters: SkillParameter[];
  /** 输入文件定义 */
  files?: {
    name: string;
    description?: string;
    required: boolean;
    accept: string[];
  }[];
}

/**
 * 技能输出定义
 */
export interface SkillOutput {
  /** 输出参数列表 */
  parameters: SkillParameter[];
  /** 输出文件定义 */
  files?: {
    name: string;
    description?: string;
    type: string;
  }[];
}

/**
 * 技能执行状态
 */
export enum SkillExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * 技能执行结果
 */
export interface SkillExecutionResult {
  /** 执行ID */
  executionId: string;
  /** 技能ID */
  skillId: string;
  /** 执行状态 */
  status: SkillExecutionStatus;
  /** 执行输出 */
  output: unknown;
  /** 执行错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 内存使用峰值（MB） */
  memoryPeak?: number;
  /** CPU使用率 */
  cpuUsage?: number;
  /** 开始时间 */
  startedAt: Date;
  /** 结束时间 */
  endedAt?: Date;
}

/**
 * 技能执行上下文
 */
export interface SkillExecutionContext {
  /** 执行ID */
  executionId: string;
  /** 技能ID */
  skillId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 执行输入参数 */
  input: Record<string, unknown>;
  /** 技能目录路径 */
  skillPath: string;
  /** 隔离环境路径 */
  environmentPath?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 内存限制（MB） */
  memoryLimit?: number;
  /** 环境变量 */
  envVars?: Record<string, string>;
  /** 工作目录 */
  workingDirectory?: string;
}

/**
 * 技能执行选项
 */
export interface SkillExecutionOptions {
  /** 是否异步执行 */
  async?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 内存限制（MB） */
  memoryLimit?: number;
  /** 隔离环境类型 */
  isolation?: 'venv' | 'container' | 'process';
  /** 是否启用沙箱 */
  sandbox?: boolean;
  /** 环境变量 */
  envVars?: Record<string, string>;
  /** 回调函数 */
  onProgress?: (progress: number, message?: string) => void;
  /** 取消令牌 */
  cancellationToken?: {
    isCancelled: () => boolean;
  };
}

/**
 * 技能安装信息
 */
export interface SkillInstallInfo {
  /** 技能ID */
  skillId: string;
  /** 安装路径 */
  installPath: string;
  /** 安装时间 */
  installedAt: Date;
  /** 安装来源 */
  source: 'local' | 'remote' | 'marketplace';
  /** 依赖列表 */
  dependencies: string[];
}

/**
 * 技能安装选项
 */
export interface SkillInstallOptions {
  /** 安装路径 */
  installPath?: string;
  /** 是否覆盖已存在 */
  force?: boolean;
  /** 是否安装依赖 */
  installDeps?: boolean;
  /** 依赖解析策略 */
  dependencyStrategy?: 'auto' | 'manual';
  /** 验证安装 */
  validate?: boolean;
}

/**
 * 技能卸载选项
 */
export interface SkillUninstallOptions {
  /** 是否清理依赖 */
  cleanDependencies?: boolean;
  /** 是否清理数据 */
  cleanData?: boolean;
  /** 是否强制卸载 */
  force?: boolean;
}

/**
 * 技能验证结果
 */
export interface SkillValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: SkillValidationError[];
  /** 警告列表 */
  warnings: SkillValidationWarning[];
}

/**
 * 技能验证错误
 */
export interface SkillValidationError {
  /** 错误代码 */
  code: string;
  /** 错误信息 */
  message: string;
  /** 错误路径 */
  path?: string;
}

/**
 * 技能验证警告
 */
export interface SkillValidationWarning {
  /** 警告代码 */
  code: string;
  /** 警告信息 */
  message: string;
  /** 警告路径 */
  path?: string;
}

/**
 * 技能签名信息
 */
export interface SkillSignature {
  /** 技能ID */
  skillId: string;
  /** 签名算法 */
  algorithm: 'sha256' | 'sha512';
  /** 签名值 */
  signature: string;
  /** 签名时间 */
  signedAt: Date;
  /** 证书指纹 */
  certificateFingerprint?: string;
}

/**
 * 技能配额信息
 */
export interface SkillQuotaInfo {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 最大技能数 */
  maxSkills: number;
  /** 已使用技能数 */
  usedSkills: number;
  /** 最大并发执行数 */
  maxConcurrentExecutions: number;
  /** 当前并发执行数 */
  currentConcurrentExecutions: number;
  /** 每日最大执行次数 */
  maxDailyExecutions: number;
  /** 今日执行次数 */
  todayExecutions: number;
  /** 配额重置时间 */
  resetAt: Date;
}

/**
 * 技能统计信息
 */
export interface SkillStats {
  /** 总安装次数 */
  totalInstalls: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 平均执行时间（毫秒） */
  avgExecutionTime: number;
  /** 最后执行时间 */
  lastExecutedAt?: Date;
}

/**
 * 技能搜索过滤器
 */
export interface SkillSearchFilter {
  /** 关键词搜索 */
  keyword?: string;
  /** 作者 */
  author?: string;
  /** 标签 */
  tags?: string[];
  /** 最低版本 */
  minVersion?: string;
  /** 最高版本 */
  maxVersion?: string;
  /** 是否已安装 */
  installed?: boolean;
  /** 是否官方 */
  official?: boolean;
}

/**
 * 技能排序选项
 */
export interface SkillSortOptions {
  /** 排序字段 */
  field: 'name' | 'downloads' | 'updatedAt' | 'rating';
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 技能搜索结果
 */
export interface SkillSearchResult {
  /** 技能列表 */
  skills: SkillMetadata[];
  /** 总数 */
  total: number;
  /** 页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 是否有下一页 */
  hasMore: boolean;
}
