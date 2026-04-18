/**
 * 依赖解析器
 * Dependency Resolver - 解析和安装技能依赖
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 依赖解析策略
 */
export enum DependencyStrategy {
  /** 自动解析 */
  AUTO = 'auto',
  /** 仅生产依赖 */
  PRODUCTION = 'production',
  /** 仅开发依赖 */
  DEVELOPMENT = 'development',
  /** 手动解析 */
  MANUAL = 'manual',
}

/**
 * 依赖信息
 */
export interface DependencyInfo {
  /** 包名 */
  name: string;
  /** 版本 */
  version: string;
  /** 类型 */
  type: 'production' | 'development' | 'peer' | 'optional';
  /** 是否已安装 */
  installed: boolean;
  /** 解析后的版本 */
  resolved?: string;
  /** 依赖列表 */
  dependencies?: DependencyInfo[];
}

/**
 * 依赖解析结果
 */
export interface ResolutionResult {
  /** 依赖列表 */
  dependencies: DependencyInfo[];
  /** 冲突列表 */
  conflicts: DependencyConflict[];
  /** 安装命令 */
  installCommands: string[];
}

/**
 * 依赖冲突
 */
export interface DependencyConflict {
  /** 包名 */
  package: string;
  /** 请求的版本 */
  requested: string;
  /** 实际安装的版本 */
  installed: string;
  /** 冲突描述 */
  description: string;
}

/**
 * 依赖解析器配置
 */
export interface ResolverConfig {
  /** 工作目录 */
  workDir: string;
  /** 包管理器类型 */
  packageManager: 'npm' | 'pip' | 'yarn' | 'pnpm';
  /** 解析策略 */
  strategy?: DependencyStrategy;
  /** 是否严格模式 */
  strict?: boolean;
  /** 镜像源 */
  registry?: string;
}

/**
 * 依赖解析器
 * 解析和安装技能依赖
 */
export class DependencyResolver {
  /** 配置 */
  private config: Required<ResolverConfig>;
  /** 包管理器 */
  private packageManager: PackageManager;

  /**
   * 构造函数
   * @param config - 配置
   */
  constructor(config: ResolverConfig) {
    this.config = {
      workDir: config.workDir,
      packageManager: config.packageManager,
      strategy: config.strategy ?? DependencyStrategy.AUTO,
      strict: config.strict ?? false,
      registry: config.registry ?? '',
    };
    this.packageManager = new PackageManager(this.config);
  }

  // ============== 主要方法 ==============

  /**
   * 解析依赖
   * @param skillPath - 技能路径
   */
  async resolve(skillPath: string): Promise<ResolutionResult> {
    const packageFilePath = this.findPackageFile(skillPath);
    if (!packageFilePath) {
      return {
        dependencies: [],
        conflicts: [],
        installCommands: [],
      };
    }

    // 读取依赖
    const rawDeps = await this.readDependencies(packageFilePath);

    // 解析依赖
    const dependencies = await this.resolveDependencies(rawDeps);

    // 检测冲突
    const conflicts = await this.detectConflicts(dependencies);

    // 生成安装命令
    const installCommands = this.generateInstallCommands(dependencies);

    return {
      dependencies,
      conflicts,
      installCommands,
    };
  }

  /**
   * 安装依赖
   * @param skillPath - 技能路径
   * @param options - 选项
   */
  async installDependencies(
    skillPath: string,
    options?: {
      strategy?: DependencyStrategy;
      force?: boolean;
      save?: boolean;
    }
  ): Promise<string[]> {
    const strategy = options?.strategy ?? this.config.strategy;
    const installedPackages: string[] = [];

    // 查找包文件
    const packageFilePath = this.findPackageFile(skillPath);
    if (!packageFilePath) {
      return installedPackages;
    }

    // 获取需要安装的包
    const deps = await this.resolve(skillPath);
    const packages = deps.dependencies
      .filter((d) => !d.installed)
      .map((d) => (d.resolved ? `${d.name}@${d.resolved}` : d.name));

    if (packages.length === 0) {
      return installedPackages;
    }

    // 执行安装
    try {
      await this.packageManager.install(
        packages,
        path.dirname(packageFilePath),
        {
          force: options?.force,
          save: options?.save,
          registry: this.config.registry,
        }
      );

      installedPackages.push(...packages);
    } catch (error) {
      if (this.config.strict) {
        throw new Error(`安装依赖失败: ${error}`);
      }
      console.warn(`安装依赖时出现警告: ${error}`);
    }

    return installedPackages;
  }

  /**
   * 清理依赖
   * @param skillPath - 技能路径
   */
  async cleanDependencies(skillPath: string): Promise<void> {
    const packageFilePath = this.findPackageFile(skillPath);
    if (!packageFilePath) {
      return;
    }

    await this.packageManager.clean(path.dirname(packageFilePath));
  }

  /**
   * 检查更新
   * @param skillPath - 技能路径
   */
  async checkUpdates(skillPath: string): Promise<{
    outdated: DependencyInfo[];
    upgradable: DependencyInfo[];
  }> {
    const deps = await this.resolve(skillPath);
    const outdated: DependencyInfo[] = [];
    const upgradable: DependencyInfo[] = [];

    for (const dep of deps.dependencies) {
      if (!dep.installed) {
        continue;
      }

      try {
        const latest = await this.packageManager.getLatestVersion(dep.name);
        if (this.compareVersions(latest, dep.version) > 0) {
          upgradable.push({
            ...dep,
            resolved: latest,
          });
        }
      } catch {
        outdated.push(dep);
      }
    }

    return { outdated, upgradable };
  }

  /**
   * 获取依赖树
   * @param skillPath - 技能路径
   */
  async getDependencyTree(skillPath: string): Promise<DependencyInfo[]> {
    const deps = await this.resolve(skillPath);
    return this.buildDependencyTree(deps.dependencies);
  }

  // ============== 私有方法 ==============

  /**
   * 查找包文件
   */
  private findPackageFile(skillPath: string): string | null {
    const packageManagers = {
      npm: path.join(skillPath, 'package.json'),
      yarn: path.join(skillPath, 'yarn.lock'),
      pnpm: path.join(skillPath, 'pnpm-lock.yaml'),
      pip: path.join(skillPath, 'requirements.txt'),
    };

    for (const [, filePath] of Object.entries(packageManagers)) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * 读取依赖
   */
  private async readDependencies(
    packageFilePath: string
  ): Promise<Record<string, string>> {
    const ext = path.extname(packageFilePath);

    if (ext === '.json') {
      const content = await fs.promises.readFile(packageFilePath, 'utf-8');
      const packageJson = JSON.parse(content);
      return {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
    }

    if (ext === '.txt') {
      const content = await fs.promises.readFile(packageFilePath, 'utf-8');
      return this.parseRequirements(content);
    }

    return {};
  }

  /**
   * 解析 requirements.txt
   */
  private parseRequirements(content: string): Record<string, string> {
    const deps: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+([^;]+))?/);
      if (match) {
        deps[match[1]] = match[2] ?? '*';
      }
    }

    return deps;
  }

  /**
   * 解析依赖
   */
  private async resolveDependencies(
    rawDeps: Record<string, string>
  ): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const installedPackages = await this.packageManager.listInstalled(
      this.config.workDir
    );

    for (const [name, version] of Object.entries(rawDeps)) {
      const installed = installedPackages.has(name);
      const installedVersion = installedPackages.get(name);

      dependencies.push({
        name,
        version,
        type: 'production',
        installed,
        resolved: installedVersion ?? version,
      });
    }

    return dependencies;
  }

  /**
   * 检测冲突
   */
  private async detectConflicts(
    dependencies: DependencyInfo[]
  ): Promise<DependencyConflict[]> {
    const conflicts: DependencyConflict[] = [];

    for (const dep of dependencies) {
      if (!dep.installed || !dep.resolved) {
        continue;
      }

      if (!this.satisfies(dep.resolved, dep.version)) {
        conflicts.push({
          package: dep.name,
          requested: dep.version,
          installed: dep.resolved,
          description: `版本 ${dep.resolved} 不满足要求 ${dep.version}`,
        });
      }
    }

    return conflicts;
  }

  /**
   * 检查版本是否满足
   */
  private satisfies(installed: string, requested: string): boolean {
    if (requested === '*' || requested === '') {
      return true;
    }

    // 简化实现，实际应使用semver解析
    return installed === requested;
  }

  /**
   * 生成安装命令
   */
  private generateInstallCommands(dependencies: DependencyInfo[]): string[] {
    const notInstalled = dependencies.filter((d) => !d.installed);
    if (notInstalled.length === 0) {
      return [];
    }

    return this.packageManager.generateInstallCommand(
      notInstalled.map((d) => d.resolved ?? d.name)
    );
  }

  /**
   * 构建依赖树
   */
  private buildDependencyTree(dependencies: DependencyInfo[]): DependencyInfo[] {
    return dependencies.map((dep) => ({
      ...dep,
      dependencies: [], // 简化实现，实际应递归获取
    }));
  }

  /**
   * 比较版本
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.replace(/[^0-9.]/g, '').split('.').map(Number);
    const partsB = b.replace(/[^0-9.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] ?? 0;
      const numB = partsB[i] ?? 0;

      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }

    return 0;
  }
}

/**
 * 包管理器
 * 执行具体的包管理操作
 */
class PackageManager {
  private config: Required<ResolverConfig>;

  constructor(config: Required<ResolverConfig>) {
    this.config = config;
  }

  /**
   * 安装包
   */
  async install(
    packages: string[],
    cwd: string,
    options?: {
      force?: boolean;
      save?: boolean;
      registry?: string;
    }
  ): Promise<void> {
    const args = ['install'];

    if (options?.force) {
      args.push('--force');
    }

    if (options?.save !== false) {
      args.push('--save');
    }

    if (options?.registry) {
      args.push(`--registry=${options.registry}`);
    }

    args.push(...packages);

    await this.run(this.config.packageManager, args, cwd);
  }

  /**
   * 清理
   */
  async clean(cwd: string): Promise<void> {
    if (this.config.packageManager === 'npm') {
      await this.run('rm', ['-rf', 'node_modules'], cwd);
    } else if (this.config.packageManager === 'pip') {
      await this.run('pip', ['freeze', '|', 'xargs', 'pip', 'uninstall', '-y'], cwd);
    }
  }

  /**
   * 列出已安装的包
   */
  async listInstalled(cwd: string): Promise<Map<string, string>> {
    const packages = new Map<string, string>();

    try {
      const { stdout } = await this.run(
        this.config.packageManager,
        ['list', '--format=json'],
        cwd
      );

      const list = JSON.parse(stdout);
      for (const item of list) {
        packages.set(item.name, item.version);
      }
    } catch {
      // 忽略错误
    }

    return packages;
  }

  /**
   * 获取最新版本
   */
  async getLatestVersion(packageName: string): Promise<string> {
    const { stdout } = await execAsync(
      `npm view ${packageName} version`
    );
    return stdout.trim();
  }

  /**
   * 生成安装命令
   */
  generateInstallCommand(packages: string[]): string[] {
    const cmd = this.config.packageManager;
    const args = ['install', ...packages];
    return [cmd, ...args].join(' ');
  }

  /**
   * 运行命令
   */
  private async run(
    command: string,
    args: string[],
    cwd: string
  ): Promise<{ stdout: string; stderr: string }> {
    const fullCommand = [command, ...args].join(' ');
    const { stdout, stderr } = await execAsync(fullCommand, { cwd });
    return { stdout, stderr };
  }
}
