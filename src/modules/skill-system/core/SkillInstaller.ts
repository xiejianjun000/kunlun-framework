/**
 * 技能安装器
 * Skill Installer - 技能安装/卸载/更新
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  SkillInstallInfo,
  SkillInstallOptions,
  SkillUninstallOptions,
  SkillMetadata,
} from '../interfaces/ISkillSystem';
import { SkillMetadataSchema } from '../interfaces/skill.types';
import { SkillRegistry } from './SkillRegistry';
import { SkillValidator } from './SkillValidator';
import { DependencyResolver, DependencyStrategy } from '../dependency/DependencyResolver';
import { SkillHooks, HookEvent } from '../hooks/SkillHooks';

/**
 * 安装器配置
 */
export interface InstallerConfig {
  /** 安装目录根路径 */
  installRoot: string;
  /** 临时目录 */
  tempDir?: string;
  /** 是否启用签名验证 */
  verifySignature?: boolean;
  /** 是否自动安装依赖 */
  autoInstallDeps?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 安装进度信息
 */
export interface InstallProgress {
  /** 阶段 */
  phase: 'downloading' | 'validating' | 'installing' | 'configuring' | 'completed';
  /** 进度 (0-100) */
  progress: number;
  /** 当前步骤 */
  step?: string;
  /** 消息 */
  message?: string;
}

/**
 * 安装结果
 */
export interface InstallResult {
  /** 是否成功 */
  success: boolean;
  /** 安装信息 */
  installInfo?: SkillInstallInfo;
  /** 错误信息 */
  error?: string;
  /** 安装的依赖列表 */
  installedDeps?: string[];
}

/**
 * 安装器事件
 */
export enum InstallerEvent {
  PROGRESS = 'progress',
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
}

/**
 * 技能安装器
 * 负责技能的安装、卸载和更新
 */
export class SkillInstaller extends EventEmitter {
  /** 安装器配置 */
  private config: Required<InstallerConfig>;
  /** 技能注册表 */
  private registry: SkillRegistry;
  /** 验证器 */
  private validator: SkillValidator;
  /** 依赖解析器 */
  private dependencyResolver: DependencyResolver;
  /** 钩子系统 */
  private hooks: SkillHooks;
  /** 取消标志 */
  private cancelled: Map<string, boolean> = new Map();

  /**
   * 构造函数
   * @param config - 安装器配置
   * @param registry - 技能注册表
   * @param validator - 验证器
   * @param dependencyResolver - 依赖解析器
   * @param hooks - 钩子系统
   */
  constructor(
    config: InstallerConfig,
    registry: SkillRegistry,
    validator: SkillValidator,
    dependencyResolver: DependencyResolver,
    hooks: SkillHooks
  ) {
    super();
    this.config = {
      installRoot: config.installRoot,
      tempDir: config.tempDir ?? path.join(process.cwd(), 'temp'),
      verifySignature: config.verifySignature ?? false,
      autoInstallDeps: config.autoInstallDeps ?? true,
      maxRetries: config.maxRetries ?? 3,
    };
    this.registry = registry;
    this.validator = validator;
    this.dependencyResolver = dependencyResolver;
    this.hooks = hooks;
  }

  // ============== 主要操作 ==============

  /**
   * 安装技能
   * @param source - 技能来源（路径、URL或包名）
   * @param options - 安装选项
   */
  async install(
    source: string,
    options: SkillInstallOptions = {}
  ): Promise<InstallResult> {
    const executionId = `install_${Date.now()}`;
    this.cancelled.set(executionId, false);

    try {
      // 触发前置钩子
      await this.hooks.trigger(HookEvent.BEFORE_INSTALL, {
        executionId,
        source,
        options,
      });

      // 解析来源
      const parsed = await this.parseSource(source);

      // 下载/解压技能
      await this.reportProgress(executionId, {
        phase: 'downloading',
        progress: 10,
        step: '获取技能包',
        message: `正在从 ${parsed.type} 获取技能...`,
      });

      const skillPackage = await this.fetchSkillPackage(parsed);

      // 验证技能
      await this.reportProgress(executionId, {
        phase: 'validating',
        progress: 30,
        step: '验证技能',
        message: '正在验证技能安全性...',
      });

      const validation = await this.validator.validateSkill(skillPackage.path);
      if (!validation.valid) {
        throw new Error(`技能验证失败: ${validation.errors.map((e) => e.message).join(', ')}`);
      }

      // 安装依赖
      let installedDeps: string[] = [];
      if (this.config.autoInstallDeps && options.installDeps !== false) {
        await this.reportProgress(executionId, {
          phase: 'installing',
          progress: 50,
          step: '安装依赖',
          message: '正在安装依赖...',
        });

        installedDeps = await this.dependencyResolver.installDependencies(
          skillPackage.path,
          { strategy: options.dependencyStrategy === 'manual' ? DependencyStrategy.MANUAL : DependencyStrategy.AUTO }
        );
      }

      // 复制到安装目录
      await this.reportProgress(executionId, {
        phase: 'installing',
        progress: 70,
        step: '复制文件',
        message: '正在复制文件...',
      });

      const installPath = await this.copyToInstallPath(
        skillPackage.path,
        skillPackage.metadata.id,
        options
      );

      // 注册技能
      await this.reportProgress(executionId, {
        phase: 'configuring',
        progress: 90,
        step: '注册技能',
        message: '正在注册技能...',
      });

      await this.registry.register(
        skillPackage.metadata,
        skillPackage.userId,
        skillPackage.tenantId,
        installPath
      );

      // 完成
      await this.reportProgress(executionId, {
        phase: 'completed',
        progress: 100,
        step: '安装完成',
        message: '技能安装成功！',
      });

      const installInfo: SkillInstallInfo = {
        skillId: skillPackage.metadata.id,
        installPath,
        installedAt: new Date(),
        source: parsed.type === 'url' ? 'remote' : 'local',
        dependencies: installedDeps,
      };

      // 触发后置钩子
      await this.hooks.trigger(HookEvent.AFTER_INSTALL, {
        executionId,
        installInfo,
        success: true,
      });

      this.emit(InstallerEvent.SUCCESS, installInfo);

      return {
        success: true,
        installInfo,
        installedDeps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.hooks.trigger(HookEvent.INSTALL_ERROR, {
        executionId,
        source,
        error: errorMessage,
      });

      this.emit(InstallerEvent.FAILURE, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 卸载技能
   * @param skillId - 技能ID
   * @param options - 卸载选项
   */
  async uninstall(skillId: string, options: SkillUninstallOptions = {}): Promise<void> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    const executionId = `uninstall_${Date.now()}`;

    // 触发前置钩子
    await this.hooks.trigger(HookEvent.BEFORE_UNINSTALL, {
      executionId,
      skillId,
      options,
    });

    try {
      // 清理依赖
      if (options.cleanDependencies) {
        await this.dependencyResolver.cleanDependencies(skill.path);
      }

      // 清理数据目录
      if (options.cleanData) {
        await this.cleanDataDirectory(skillId);
      }

      // 删除文件
      if (fs.existsSync(skill.path)) {
        await fs.promises.rm(skill.path, { recursive: true, force: true });
      }

      // 注销技能
      await this.registry.unregister(skillId);

      // 触发后置钩子
      await this.hooks.trigger(HookEvent.AFTER_UNINSTALL, {
        executionId,
        skillId,
        success: true,
      });
    } catch (error) {
      if (!options.force) {
        throw error;
      }
    }
  }

  /**
   * 更新技能
   * @param skillId - 技能ID
   * @param version - 目标版本
   */
  async update(skillId: string, version?: string): Promise<InstallInfo> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    const executionId = `update_${Date.now()}`;

    // 触发前置钩子
    await this.hooks.trigger(HookEvent.BEFORE_UPDATE, {
      executionId,
      skillId,
      currentVersion: skill.version,
      targetVersion: version,
    });

    // 备份当前版本
    const backupPath = await this.backupSkill(skillId);

    try {
      // 重新安装
      const result = await this.install(skillId, { force: true });

      if (!result.success) {
        // 恢复备份
        await this.restoreBackup(skillId, backupPath);
        throw new Error(result.error);
      }

      // 触发后置钩子
      await this.hooks.trigger('onAfterUpdate', {
        executionId,
        skillId,
        success: true,
      });

      return result.installInfo!;
    } catch (error) {
      // 恢复备份
      await this.restoreBackup(skillId, backupPath);

      await this.hooks.trigger(HookEvent.UPDATE_ERROR, {
        executionId,
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * 取消安装
   * @param executionId - 执行ID
   */
  async cancelInstall(executionId: string): Promise<void> {
    this.cancelled.set(executionId, true);
    this.emit(InstallerEvent.CANCELLED, executionId);
  }

  /**
   * 重新安装损坏的技能
   * @param skillId - 技能ID
   */
  async reinstall(skillId: string): Promise<InstallResult> {
    // 先卸载
    try {
      await this.uninstall(skillId, { force: true });
    } catch {
      // 忽略卸载错误
    }

    // 重新安装
    return this.install(skillId);
  }

  // ============== 私有方法 ==============

  /**
   * 解析来源
   */
  private async parseSource(
    source: string
  ): Promise<{ type: 'local' | 'url' | 'npm'; value: string; userId?: string; tenantId?: string }> {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return { type: 'url', value: source };
    }

    if (source.startsWith('npm://')) {
      return { type: 'npm', value: source.substring(6) };
    }

    if (fs.existsSync(source)) {
      return { type: 'local', value: source };
    }

    // 尝试作为 npm 包名
    return { type: 'npm', value: source };
  }

  /**
   * 获取技能包
   */
  private async fetchSkillPackage(
    parsed: { type: 'local' | 'url' | 'npm'; value: string }
  ): Promise<{ path: string; metadata: SkillMetadata; userId: string; tenantId: string }> {
    let packagePath: string;
    let metadata: SkillMetadata;

    switch (parsed.type) {
      case 'local':
        packagePath = parsed.value;
        metadata = await this.loadMetadata(packagePath);
        break;

      case 'url':
        packagePath = await this.downloadFromUrl(parsed.value);
        metadata = await this.loadMetadata(packagePath);
        break;

      case 'npm':
        packagePath = await this.installFromNpm(parsed.value);
        metadata = await this.loadMetadata(packagePath);
        break;

      default:
        throw new Error(`不支持的来源类型: ${parsed.type}`);
    }

    return {
      path: packagePath,
      metadata,
      userId: 'default',
      tenantId: 'default',
    };
  }

  /**
   * 从URL下载
   */
  private async downloadFromUrl(url: string): Promise<string> {
    // 简化的实现，实际应使用 axios 或 fetch
    const tempPath = path.join(this.config.tempDir, `skill_${Date.now()}`);

    // 实际实现应该下载并解压
    // 这里只是创建目录作为示例
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }

    return tempPath;
  }

  /**
   * 从npm安装
   */
  private async installFromNpm(packageName: string): Promise<string> {
    const tempPath = path.join(this.config.tempDir, `skill_${Date.now()}`);

    // 实际实现应该使用 npm install
    // 这里只是创建目录作为示例
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }

    return tempPath;
  }

  /**
   * 加载元数据
   */
  private async loadMetadata(skillPath: string): Promise<SkillMetadata> {
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
      throw new Error('缺少 SKILL.md 文件');
    }

    const content = await fs.promises.readFile(skillMdPath, 'utf-8');
    const metadata = this.parseSkillMd(content);

    return SkillMetadataSchema.parse(metadata);
  }

  /**
   * 解析 SKILL.md
   */
  private parseSkillMd(content: string): Partial<SkillMetadata> {
    const metadata: Record<string, unknown> = {};

    // 简单的 YAML-like 解析
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        metadata[key] = value.trim();
      }
    }

    return metadata as Partial<SkillMetadata>;
  }

  /**
   * 复制到安装目录
   */
  private async copyToInstallPath(
    sourcePath: string,
    skillId: string,
    options: SkillInstallOptions
  ): Promise<string> {
    const installPath = options.installPath
      ? path.resolve(options.installPath)
      : path.join(this.config.installRoot, skillId);

    // 检查是否已存在
    if (fs.existsSync(installPath) && !options.force) {
      throw new Error(`技能已存在: ${skillId}`);
    }

    // 确保父目录存在
    const parentDir = path.dirname(installPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // 删除已存在的目录
    if (fs.existsSync(installPath)) {
      await fs.promises.rm(installPath, { recursive: true });
    }

    // 复制文件
    await this.copyDirectory(sourcePath, installPath);

    return installPath;
  }

  /**
   * 复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });

    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * 清理数据目录
   */
  private async cleanDataDirectory(skillId: string): Promise<void> {
    const dataPath = path.join(this.config.installRoot, '..', 'data', skillId);

    if (fs.existsSync(dataPath)) {
      await fs.promises.rm(dataPath, { recursive: true, force: true });
    }
  }

  /**
   * 备份技能
   */
  private async backupSkill(skillId: string): Promise<string> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`技能 ${skillId} 不存在`);
    }

    const backupPath = path.join(this.config.tempDir, `backup_${skillId}_${Date.now()}`);
    await this.copyDirectory(skill.path, backupPath);

    return backupPath;
  }

  /**
   * 恢复备份
   */
  private async restoreBackup(skillId: string, backupPath: string): Promise<void> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      return;
    }

    if (fs.existsSync(backupPath)) {
      await this.copyDirectory(backupPath, skill.path);
      await fs.promises.rm(backupPath, { recursive: true, force: true });
    }
  }

  /**
   * 报告进度
   */
  private async reportProgress(
    executionId: string,
    progress: InstallProgress
  ): Promise<void> {
    if (this.cancelled.get(executionId)) {
      throw new Error('安装已取消');
    }

    this.emit(InstallerEvent.PROGRESS, { executionId, ...progress });
  }
}

// 类型别名
type InstallInfo = SkillInstallInfo;
