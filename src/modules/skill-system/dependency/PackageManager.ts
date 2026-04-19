/**
 * 包管理器
 * Package Manager - 多包管理器适配
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 包信息
 */
export interface PackageInfo {
  /** 包名 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 主页 */
  homepage?: string;
  /** 仓库 */
  repository?: string;
  /** 作者 */
  author?: string;
  /** 许可证 */
  license?: string;
  /** 依赖数 */
  dependencies?: number;
  /** 下载量 */
  downloads?: number;
}

/**
 * 包管理器接口
 */
export interface IPackageManager {
  /** 安装包 */
  install(packages: string[], options?: InstallOptions): Promise<void>;
  /** 卸载包 */
  uninstall(packages: string[], options?: UninstallOptions): Promise<void>;
  /** 更新包 */
  update(packages?: string[]): Promise<void>;
  /** 列出已安装的包 */
  list(): Promise<PackageInfo[]>;
  /** 搜索包 */
  search(keyword: string): Promise<PackageInfo[]>;
  /** 获取包信息 */
  getInfo(packageName: string): Promise<PackageInfo>;
  /** 检查更新 */
  checkUpdates(): Promise<PackageInfo[]>;
}

/**
 * 安装选项
 */
export interface InstallOptions {
  /** 全局安装 */
  global?: boolean;
  /** 开发依赖 */
  dev?: boolean;
  /** 可选依赖 */
  optional?: boolean;
  /** 保存到 package.json */
  save?: boolean;
  /** 强制安装 */
  force?: boolean;
  /** 镜像源 */
  registry?: string;
  /** 工作目录 */
  cwd?: string;
}

/**
 * 卸载选项
 */
export interface UninstallOptions {
  /** 全局卸载 */
  global?: boolean;
  /** 从 package.json 移除 */
  save?: boolean;
  /** 工作目录 */
  cwd?: string;
}

/**
 * NPM 包管理器
 */
export class NpmPackageManager implements IPackageManager {
  private registry?: string;

  constructor(registry?: string) {
    this.registry = registry;
  }

  async install(
    packages: string[],
    options: InstallOptions = {}
  ): Promise<void> {
    const args = ['install'];

    if (options.global) {
      args.push('-g');
    } else if (options.dev) {
      args.push('-D');
    } else if (options.optional) {
      args.push('-O');
    }

    if (options.save !== false && !options.global) {
      args.push('-S');
    }

    if (options.force) {
      args.push('--force');
    }

    if (this.registry) {
      args.push(`--registry=${this.registry}`);
    }

    args.push(...packages);

    await this.run('npm', args, options.cwd);
  }

  async uninstall(
    packages: string[],
    options: UninstallOptions = {}
  ): Promise<void> {
    const args = ['uninstall'];

    if (options.global) {
      args.push('-g');
    }

    if (options.save !== false && !options.global) {
      args.push('-S');
    }

    args.push(...packages);

    await this.run('npm', args, options.cwd);
  }

  async update(packages?: string[]): Promise<void> {
    const args = packages ? ['update', ...packages] : ['update'];
    await this.run('npm', args);
  }

  async list(): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync('npm list --json --depth=0');
      const data = JSON.parse(stdout);
      const packages: PackageInfo[] = [];

      if (data.dependencies) {
        for (const [name, info] of Object.entries(data.dependencies)) {
          packages.push({
            name,
            version: (info as { version: string }).version,
          });
        }
      }

      return packages;
    } catch {
      return [];
    }
  }

  async search(keyword: string): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync(`npm search ${keyword} --json`);
      const results = JSON.parse(stdout);
      return results.slice(0, 20).map((pkg: Record<string, string>) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        author: pkg.author,
      }));
    } catch {
      return [];
    }
  }

  async getInfo(packageName: string): Promise<PackageInfo> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} --json`);
      const data = JSON.parse(stdout);
      return {
        name: data.name,
        version: data.version,
        description: data.description,
        homepage: data.homepage,
        repository: data.repository?.url,
        author: data.author?.name,
        license: data.license,
      };
    } catch {
      throw new Error(`包不存在: ${packageName}`);
    }
  }

  async checkUpdates(): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync('npm outdated --json');
      const data = JSON.parse(stdout);
      const outdated: PackageInfo[] = [];

      for (const [name, info] of Object.entries(data)) {
        outdated.push({
          name,
          version: (info as { current: string }).current,
          description: `${name} 有可用更新`,
        });
      }

      return outdated;
    } catch {
      return [];
    }
  }

  private async run(
    command: string,
    args: string[],
    cwd?: string
  ): Promise<void> {
    const fullCommand = [command, ...args].join(' ');
    await execAsync(fullCommand, {
      cwd: cwd ?? process.cwd(),
    });
  }
}

/**
 * Yarn 包管理器
 */
export class YarnPackageManager implements IPackageManager {
  async install(
    packages: string[],
    options: InstallOptions = {}
  ): Promise<void> {
    const args = ['add'];

    if (options.global) {
      args.push('-g');
    } else if (options.dev) {
      args.push('-D');
    }

    if (options.force) {
      args.push('--force');
    }

    args.push(...packages);

    await this.run('yarn', args, options.cwd);
  }

  async uninstall(
    packages: string[],
    options: UninstallOptions = {}
  ): Promise<void> {
    const args = ['remove', ...packages];

    if (options.global) {
      args.push('-g');
    }

    await this.run('yarn', args, options.cwd);
  }

  async update(packages?: string[]): Promise<void> {
    const args = packages ? ['up', ...packages] : ['up'];
    await this.run('yarn', args);
  }

  async list(): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync('yarn list --json');
      const lines = stdout.split('\n');
      const packages: PackageInfo[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'table' && data.data) {
            for (const row of data.data) {
              packages.push({
                name: row.name,
                version: row.version,
              });
            }
          }
        } catch {
          // 忽略解析错误
        }
      }

      return packages;
    } catch {
      return [];
    }
  }

  async search(keyword: string): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync(`npm search ${keyword} --json`);
      const results = JSON.parse(stdout);
      return results.slice(0, 20).map((pkg: Record<string, string>) => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
      }));
    } catch {
      return [];
    }
  }

  async getInfo(packageName: string): Promise<PackageInfo> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} --json`);
      const data = JSON.parse(stdout);
      return {
        name: data.name,
        version: data.version,
        description: data.description,
        homepage: data.homepage,
        license: data.license,
      };
    } catch {
      throw new Error(`包不存在: ${packageName}`);
    }
  }

  async checkUpdates(): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync('yarn outdated --json');
      const data = JSON.parse(stdout);
      const outdated: PackageInfo[] = [];

      for (const [name, info] of Object.entries(data)) {
        outdated.push({
          name,
          version: (info as { current: string }).current,
        });
      }

      return outdated;
    } catch {
      return [];
    }
  }

  private async run(
    command: string,
    args: string[],
    cwd?: string
  ): Promise<void> {
    const fullCommand = [command, ...args].join(' ');
    await execAsync(fullCommand, {
      cwd: cwd ?? process.cwd(),
    });
  }
}

/**
 * Pip 包管理器
 */
export class PipPackageManager implements IPackageManager {
  async install(
    packages: string[],
    options: InstallOptions = {}
  ): Promise<void> {
    const args = ['install'];

    if (options.global) {
      args.push('--user');
    }

    if (options.force) {
      args.push('--upgrade');
    }

    args.push(...packages);

    await this.run('pip', args);
  }

  async uninstall(
    packages: string[],
    options: UninstallOptions = {}
  ): Promise<void> {
    const args = ['uninstall', '-y', ...packages];
    await this.run('pip', args);
  }

  async update(packages?: string[]): Promise<void> {
    const args = packages
      ? ['install', '-U', ...packages]
      : ['install', '-U', 'pip'];
    await this.run('pip', args);
  }

  async list(): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync('pip list --format=json');
      const data = JSON.parse(stdout);
      return data.map((pkg: { name: string; version: string }) => ({
        name: pkg.name,
        version: pkg.version,
      }));
    } catch {
      return [];
    }
  }

  async search(keyword: string): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync(`pip search ${keyword}`);
      const lines = stdout.split('\n');
      const packages: PackageInfo[] = [];

      for (const line of lines) {
        const match = line.match(/^(.+?)\s+\((.+?)\)/);
        if (match) {
          packages.push({
            name: match[1],
            version: match[2],
          });
        }
      }

      return packages.slice(0, 20);
    } catch {
      return [];
    }
  }

  async getInfo(packageName: string): Promise<PackageInfo> {
    try {
      const { stdout } = await execAsync(`pip show ${packageName}`);
      const lines = stdout.split('\n');
      const info: Partial<PackageInfo> = {};

      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          switch (key.toLowerCase()) {
            case 'name':
              info.name = value;
              break;
            case 'version':
              info.version = value;
              break;
            case 'summary':
              info.description = value;
              break;
            case 'home-page':
              info.homepage = value;
              break;
            case 'author':
              info.author = value;
              break;
            case 'license':
              info.license = value;
              break;
          }
        }
      }

      return info as PackageInfo;
    } catch {
      throw new Error(`包不存在: ${packageName}`);
    }
  }

  async checkUpdates(): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync('pip list --outdated --format=json');
      const data = JSON.parse(stdout);
      return data.map((pkg: { name: string; version: string }) => ({
        name: pkg.name,
        version: pkg.version,
      }));
    } catch {
      return [];
    }
  }

  private async run(
    command: string,
    args: string[]
  ): Promise<void> {
    const fullCommand = [command, ...args].join(' ');
    await execAsync(fullCommand);
  }
}

/**
 * 包管理器工厂
 */
export class PackageManagerFactory {
  static create(type: 'npm' | 'yarn' | 'pnpm' | 'pip'): IPackageManager {
    switch (type) {
      case 'npm':
        return new NpmPackageManager();
      case 'yarn':
        return new YarnPackageManager();
      case 'pip':
        return new PipPackageManager();
      default:
        return new NpmPackageManager();
    }
  }

  static detect(projectPath: string): 'npm' | 'yarn' | 'pnpm' | 'pip' {
    const fs = require('fs');
    const path = require('path');

    if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
      return 'pip';
    }
    return 'npm';
  }
}
