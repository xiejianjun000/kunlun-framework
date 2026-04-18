/**
 * 技能系统主类
 * Skill System - 技能系统核心
 */

import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import {
  ISkillSystem,
  SkillInfo,
  SkillLifecycleStatus,
} from './interfaces/ISkillSystem';
import {
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
  SkillMetadata,
} from './interfaces/skill.types';
import { SkillRegistry } from './core/SkillRegistry';
import { SkillExecutor } from './core/SkillExecutor';
import { SkillInstaller } from './core/SkillInstaller';
import { SkillValidator } from './core/SkillValidator';
import { SkillHooks } from './hooks/SkillHooks';
import { SkillQuotaManager } from './quota/SkillQuotaManager';
import { DependencyResolver } from './dependency/DependencyResolver';
import { SkillEnvironment } from './environment/SkillEnvironment';
import { VenvEnvironment } from './environment/VenvEnvironment';

/**
 * 技能系统配置
 */
export interface SkillSystemConfig {
  /** 技能存储根目录 */
  skillsRoot: string;
  /** 注册表路径 */
  registryPath?: string;
  /** 临时目录 */
  tempDir?: string;
  /** 配额存储路径 */
  quotaStoragePath?: string;
  /** 最大并发执行数 */
  maxConcurrentExecutions?: number;
  /** 默认超时时间 */
  defaultTimeout?: number;
  /** 默认内存限制 */
  defaultMemoryLimit?: number;
  /** 是否启用签名验证 */
  enableSignatureVerification?: boolean;
  /** 是否启用配额管理 */
  enableQuotaManagement?: boolean;
  /** 默认配额限制 */
  defaultQuotaLimits?: {
    maxSkills?: number;
    maxConcurrentExecutions?: number;
    maxDailyExecutions?: number;
  };
}

/**
 * 技能统计
 */
interface SystemStats {
  totalSkills: number;
  totalExecutions: number;
  activeSkills: number;
  avgSuccessRate: number;
}

/**
 * 执行记录
 */
interface ExecutionRecord {
  executionId: string;
  skillId: string;
  status: string;
  startedAt: Date;
  endedAt?: Date;
  result?: SkillExecutionResult;
}

/**
 * 技能系统主类
 * 实现 ISkillSystem 接口，提供完整的技能管理功能
 */
export class SkillSystem
  extends EventEmitter
  implements ISkillSystem
{
  /** 配置 */
  private config: Required<SkillSystemConfig>;
  /** 技能注册表 */
  private registry: SkillRegistry;
  /** 技能执行器 */
  private executor: SkillExecutor;
  /** 技能安装器 */
  private installer: SkillInstaller;
  /** 技能验证器 */
  private validator: SkillValidator;
  /** 钩子系统 */
  private hooks: SkillHooks;
  /** 配额管理器 */
  private quotaManager: SkillQuotaManager;
  /** 依赖解析器 */
  private dependencyResolver: DependencyResolver;
  /** 隔离环境 */
  private environment: SkillEnvironment;
  /** 执行记录 */
  private executionRecords: Map<string, ExecutionRecord> = new Map();
  /** 初始化状态 */
  private initialized: boolean = false;

  /**
   * 构造函数
   * @param config - 技能系统配置
   */
  constructor(config: SkillSystemConfig) {
    super();

    // 合并配置
    this.config = {
      skillsRoot: config.skillsRoot,
      registryPath: config.registryPath ?? path.join(config.skillsRoot, 'registry'),
      tempDir: config.tempDir ?? path.join(process.cwd(), 'temp', 'skills'),
      quotaStoragePath: config.quotaStoragePath ?? path.join(config.skillsRoot, 'quotas'),
      maxConcurrentExecutions: config.maxConcurrentExecutions ?? 5,
      defaultTimeout: config.defaultTimeout ?? 300000,
      defaultMemoryLimit: config.defaultMemoryLimit ?? 512,
      enableSignatureVerification: config.enableSignatureVerification ?? false,
      enableQuotaManagement: config.enableQuotaManagement ?? true,
      defaultQuotaLimits: {
        maxSkills: config.defaultQuotaLimits?.maxSkills ?? 100,
        maxConcurrentExecutions:
          config.defaultQuotaLimits?.maxConcurrentExecutions ?? 5,
        maxDailyExecutions: config.defaultQuotaLimits?.maxDailyExecutions ?? 1000,
      },
    };

    // 初始化组件
    this.hooks = new SkillHooks();
    this.registry = new SkillRegistry({
      registryPath: this.config.registryPath,
      persist: true,
    });
    this.validator = new SkillValidator({
      checkSignature: this.config.enableSignatureVerification,
    });
    this.dependencyResolver = new DependencyResolver({
      workDir: this.config.skillsRoot,
      packageManager: 'npm',
    });
    this.environment = new VenvEnvironment({
      venvRoot: path.join(this.config.skillsRoot, '.venvs'),
    });
    this.quotaManager = new SkillQuotaManager(
      this.config.quotaStoragePath,
      this.config.defaultQuotaLimits
    );
    this.executor = new SkillExecutor(
      {
        maxConcurrent: this.config.maxConcurrentExecutions,
        defaultTimeout: this.config.defaultTimeout,
        defaultMemoryLimit: this.config.defaultMemoryLimit,
        enableSandbox: true,
      },
      this.config.skillsRoot,
      this.hooks
    );
    this.installer = new SkillInstaller(
      {
        installRoot: this.config.skillsRoot,
        tempDir: this.config.tempDir,
        verifySignature: this.config.enableSignatureVerification,
        autoInstallDeps: true,
      },
      this.registry,
      this.validator,
      this.dependencyResolver,
      this.hooks
    );
  }

  // ============== 生命周期 ==============

  /**
   * 初始化技能系统
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 确保目录存在
    await this.ensureDirectories();

    // 初始化组件
    await this.registry.initialize();
    await this.executor.initialize();
    await this.hooks.initialize();
    await this.quotaManager.initialize();
    await this.environment.initialize();

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * 销毁技能系统
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.executor.destroy();
    await this.registry.destroy();
    await this.hooks.destroy();
    await this.quotaManager.destroy();
    await this.environment.destroy();

    this.executionRecords.clear();
    this.initialized = false;
    this.emit('destroyed');
  }

  // ============== 生命周期管理 ==============

  /**
   * 安装技能
   */
  async installSkill(
    skillId: string,
    options?: SkillInstallOptions
  ): Promise<SkillInstallInfo> {
    this.ensureInitialized();

    // 检查配额
    if (this.config.enableQuotaManagement) {
      const quotaCheck = await this.quotaManager.checkQuota(
        options?.userId ?? 'default',
        options?.tenantId ?? 'default',
        'install'
      );
      if (!quotaCheck.allowed) {
        throw new Error(quotaCheck.reason);
      }
    }

    // 安装技能
    const result = await this.installer.install(skillId, options);

    if (!result.success) {
      throw new Error(result.error);
    }

    // 更新配额
    if (this.config.enableQuotaManagement && result.installInfo) {
      await this.quotaManager.incrementSkillCount(
        options?.userId ?? 'default',
        options?.tenantId ?? 'default'
      );
    }

    this.emit('skillInstalled', result.installInfo);
    return result.installInfo!;
  }

  /**
   * 卸载技能
   */
  async uninstallSkill(
    skillId: string,
    options?: SkillUninstallOptions
  ): Promise<void> {
    this.ensureInitialized();

    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    await this.installer.uninstall(skillId, options);

    // 更新配额
    if (this.config.enableQuotaManagement) {
      await this.quotaManager.decrementSkillCount(
        options?.userId ?? 'default',
        options?.tenantId ?? 'default'
      );
    }

    this.emit('skillUninstalled', skillId);
  }

  /**
   * 更新技能
   */
  async updateSkill(
    skillId: string,
    version?: string
  ): Promise<SkillInstallInfo> {
    this.ensureInitialized();
    const result = await this.installer.update(skillId, version);
    this.emit('skillUpdated', { skillId, version, installInfo: result });
    return result;
  }

  /**
   * 启用技能
   */
  async enableSkill(skillId: string): Promise<void> {
    this.ensureInitialized();
    await this.registry.enable(skillId);
    this.emit('skillEnabled', skillId);
  }

  /**
   * 禁用技能
   */
  async disableSkill(skillId: string): Promise<void> {
    this.ensureInitialized();
    await this.registry.disable(skillId);
    this.emit('skillDisabled', skillId);
  }

  // ============== 执行管理 ==============

  /**
   * 执行技能
   */
  async executeSkill(
    skillId: string,
    input: Record<string, unknown>,
    options?: SkillExecutionOptions
  ): Promise<SkillExecutionResult> {
    this.ensureInitialized();

    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    if (skill.lifecycleStatus === SkillLifecycleStatus.DISABLED) {
      throw new Error(`技能 ${skillId} 已禁用`);
    }

    // 检查配额
    if (this.config.enableQuotaManagement) {
      const quotaCheck = await this.quotaManager.checkQuota(
        options?.userId ?? 'default',
        options?.tenantId ?? 'default',
        'execute'
      );
      if (!quotaCheck.allowed) {
        throw new Error(quotaCheck.reason);
      }

      const concurrentCheck = await this.quotaManager.checkQuota(
        options?.userId ?? 'default',
        options?.tenantId ?? 'default',
        'concurrent'
      );
      if (!concurrentCheck.allowed) {
        throw new Error(concurrentCheck.reason);
      }
    }

    // 创建执行上下文
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const context: SkillExecutionContext = {
      executionId,
      skillId,
      userId: options?.userId ?? 'default',
      tenantId: options?.tenantId ?? 'default',
      input,
      skillPath: skill.path,
      timeout: options?.timeout ?? this.config.defaultTimeout,
      memoryLimit: options?.memoryLimit ?? this.config.defaultMemoryLimit,
      envVars: options?.envVars,
    };

    // 开始执行
    await this.quotaManager.startExecution(
      context.userId,
      context.tenantId,
      skillId
    );

    const startTime = Date.now();
    this.executionRecords.set(executionId, {
      executionId,
      skillId,
      status: 'running',
      startedAt: new Date(),
    });

    try {
      const result = await this.executor.execute(context, options);

      // 记录执行结果
      const record = this.executionRecords.get(executionId)!;
      record.status = result.status;
      record.endedAt = new Date();
      record.result = result;

      // 更新配额
      await this.quotaManager.endExecution(
        context.userId,
        context.tenantId,
        Date.now() - startTime
      );

      this.emit('skillExecuted', result);
      return result;
    } catch (error) {
      const record = this.executionRecords.get(executionId)!;
      record.status = 'failed';
      record.endedAt = new Date();

      await this.quotaManager.endExecution(
        context.userId,
        context.tenantId,
        Date.now() - startTime
      );

      throw error;
    }
  }

  /**
   * 异步执行技能
   */
  async executeSkillAsync(
    skillId: string,
    input: Record<string, unknown>,
    options?: SkillExecutionOptions
  ): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 异步执行
    this.executeSkill(skillId, input, { ...options, async: true }).catch(
      (error) => {
        console.error(`异步执行失败: ${executionId}`, error);
      }
    );

    return executionId;
  }

  /**
   * 取消执行
   */
  async cancelExecution(executionId: string): Promise<void> {
    await this.executor.cancel(executionId);

    const record = this.executionRecords.get(executionId);
    if (record) {
      record.status = 'cancelled';
      record.endedAt = new Date();
    }

    this.emit('executionCancelled', executionId);
  }

  /**
   * 获取执行结果
   */
  getExecutionResult(executionId: string): Promise<SkillExecutionResult | null> {
    const record = this.executionRecords.get(executionId);
    if (!record) {
      return this.executor.getResult(executionId);
    }
    return Promise.resolve(record.result ?? null);
  }

  /**
   * 获取技能执行历史
   */
  async getExecutionHistory(
    skillId: string,
    limit: number = 10
  ): Promise<SkillExecutionResult[]> {
    const records: SkillExecutionResult[] = [];

    for (const record of this.executionRecords.values()) {
      if (record.skillId === skillId && record.result) {
        records.push(record.result);
      }
    }

    return records.slice(-limit);
  }

  // ============== 查询管理 ==============

  /**
   * 获取技能信息
   */
  async getSkill(skillId: string): Promise<SkillInfo | null> {
    this.ensureInitialized();
    return this.registry.get(skillId);
  }

  /**
   * 获取用户的所有技能
   */
  async getUserSkills(
    userId: string,
    tenantId: string
  ): Promise<SkillInfo[]> {
    this.ensureInitialized();
    return this.registry.getUserSkills(userId, tenantId);
  }

  /**
   * 搜索技能
   */
  async searchSkills(
    filter: SkillSearchFilter,
    sort?: SkillSortOptions,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SkillSearchResult> {
    this.ensureInitialized();

    let skills = this.registry.getAll();

    // 应用过滤器
    if (filter.keyword) {
      skills = this.registry.search(filter.keyword);
    }

    if (filter.tags && filter.tags.length > 0) {
      skills = skills.filter((s) =>
        filter.tags!.some((tag) => s.keywords?.includes(tag))
      );
    }

    if (filter.installed !== undefined) {
      skills = skills.filter((s) =>
        filter.installed
          ? s.lifecycleStatus !== SkillLifecycleStatus.REGISTERED
          : s.lifecycleStatus === SkillLifecycleStatus.REGISTERED
      );
    }

    // 应用排序
    if (sort) {
      skills.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sort.field) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'updatedAt':
            aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            break;
        }

        if (sort.direction === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedSkills = skills.slice(start, end);

    return {
      skills: paginatedSkills,
      total: skills.length,
      page,
      pageSize,
      hasMore: end < skills.length,
    };
  }

  /**
   * 检查技能是否存在
   */
  async hasSkill(skillId: string): Promise<boolean> {
    return this.registry.has(skillId);
  }

  // ============== 验证与安全 ==============

  /**
   * 验证技能
   */
  async validateSkill(skillPath: string): Promise<SkillValidationResult> {
    return this.validator.validateSkill(skillPath);
  }

  /**
   * 签名验证
   */
  async verifySignature(skillId: string, signature: string): Promise<boolean> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      return false;
    }
    return this.validator.verifySignature(skill.path, signature);
  }

  // ============== 配额管理 ==============

  /**
   * 获取配额信息
   */
  async getQuotaInfo(
    userId: string,
    tenantId: string
  ): Promise<SkillQuotaInfo> {
    return this.quotaManager.getQuotaInfo(userId, tenantId);
  }

  /**
   * 检查配额
   */
  async checkQuota(
    userId: string,
    tenantId: string,
    skillId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const check = await this.quotaManager.checkQuota(userId, tenantId, 'install');
    return {
      allowed: check.allowed,
      reason: check.reason,
    };
  }

  // ============== 统计信息 ==============

  /**
   * 获取技能统计
   */
  async getSkillStats(skillId: string): Promise<SkillStats> {
    const stats = await this.quotaManager.getUsageStats(skillId, 'default');
    const executions = await this.getExecutionHistory(skillId, 1000);

    const successCount = executions.filter(
      (e) => e.status === 'success'
    ).length;
    const failureCount = executions.filter(
      (e) => e.status === 'failed'
    ).length;

    return {
      totalInstalls: 1,
      totalExecutions: stats.totalExecutions,
      successCount,
      failureCount,
      avgExecutionTime: stats.avgDuration,
      lastExecutedAt: executions[0]?.startedAt,
    };
  }

  /**
   * 获取系统统计
   */
  async getSystemStats(): Promise<SystemStats> {
    const skills = this.registry.getAll();

    let totalExecutions = 0;
    let totalSuccess = 0;

    for (const skill of skills) {
      const executions = await this.getExecutionHistory(skill.id, 1000);
      totalExecutions += executions.length;
      totalSuccess += executions.filter((e) => e.status === 'success').length;
    }

    return {
      totalSkills: skills.length,
      totalExecutions,
      activeSkills: skills.filter(
        (s) => s.lifecycleStatus === SkillLifecycleStatus.ENABLED
      ).length,
      avgSuccessRate: totalExecutions > 0 ? totalSuccess / totalExecutions : 0,
    };
  }

  // ============== 导入导出 ==============

  /**
   * 导出技能
   */
  async exportSkill(skillId: string, outputPath: string): Promise<string> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    const fs = require('fs');
    const archiver = require('archiver');

    // 创建归档
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(skill.path, skill.name);
    await archive.finalize();

    return outputPath;
  }

  /**
   * 导入技能
   */
  async importSkill(
    inputPath: string,
    options?: SkillInstallOptions
  ): Promise<SkillInstallInfo> {
    return this.installSkill(inputPath, options);
  }

  // ============== 私有方法 ==============

  /**
   * 确保目录存在
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.skillsRoot,
      this.config.registryPath,
      this.config.tempDir,
      this.config.quotaStoragePath,
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('技能系统未初始化，请先调用 initialize()');
    }
  }
}
