/**
 * Python虚拟环境实现
 * Venv Environment - 基于Python venv的隔离环境
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SkillEnvironment } from './SkillEnvironment';

const execAsync = promisify(exec);

/**
 * 虚拟环境配置
 */
export interface VenvConfig {
  /** 虚拟环境根目录 */
  venvRoot: string;
  /** Python版本 */
  pythonVersion?: string;
  /** 系统站点包 */
  systemSitePackages?: boolean;
  /** 清理时是否删除目录 */
  cleanOnDelete?: boolean;
}

/**
 * Python虚拟环境
 * 使用Python内置venv模块创建隔离环境
 */
export class VenvEnvironment extends SkillEnvironment {
  /** 虚拟环境配置 */
  private config: Required<VenvConfig>;
  /** 环境映射 */
  private environments: Map<string, string> = new Map();

  /**
   * 构造函数
   * @param config - 虚拟环境配置
   */
  constructor(config: VenvConfig) {
    super();
    this.config = {
      venvRoot: config.venvRoot,
      pythonVersion: config.pythonVersion ?? 'python3',
      systemSitePackages: config.systemSitePackages ?? false,
      cleanOnDelete: config.cleanOnDelete ?? true,
    };
  }

  // ============== 生命周期 ==============

  /**
   * 初始化
   */
  protected async doInitialize(): Promise<void> {
    // 确保根目录存在
    if (!fs.existsSync(this.config.venvRoot)) {
      fs.mkdirSync(this.config.venvRoot, { recursive: true });
    }

    // 检查Python是否可用
    try {
      await execAsync(`${this.config.pythonVersion} --version`);
    } catch {
      throw new Error(`Python不可用: ${this.config.pythonVersion}`);
    }
  }

  /**
   * 销毁
   */
  protected async doDestroy(): Promise<void> {
    // 清理所有环境
    for (const [envId] of this.environments) {
      try {
        await this.doDelete(envId);
      } catch {
        // 忽略错误
      }
    }
    this.environments.clear();
  }

  // ============== 环境操作 ==============

  /**
   * 创建虚拟环境
   */
  protected async doCreate(
    skillId: string,
    config?: Record<string, unknown>
  ): Promise<string> {
    const envId = `venv_${skillId}_${Date.now()}`;
    const envPath = path.join(this.config.venvRoot, envId);

    // 构建创建命令
    const args: string[] = ['-m', 'venv'];

    if (this.config.systemSitePackages) {
      args.push('--system-site-packages');
    }

    args.push(envPath);

    try {
      await execAsync(`${this.config.pythonVersion} ${args.join(' ')}`);

      // 记录环境
      this.environments.set(envId, envPath);

      // 安装基础包（如果需要）
      if (config?.upgradePip) {
        await this.upgradePip(envId);
      }

      return envId;
    } catch (error) {
      throw new Error(`创建虚拟环境失败: ${error}`);
    }
  }

  /**
   * 删除虚拟环境
   */
  protected async doDelete(environmentId: string): Promise<void> {
    const envPath = this.environments.get(environmentId);
    if (!envPath) {
      return;
    }

    if (this.config.cleanOnDelete && fs.existsSync(envPath)) {
      await fs.promises.rm(envPath, { recursive: true, force: true });
    }

    this.environments.delete(environmentId);
  }

  /**
   * 激活环境（仅返回激活命令）
   */
  protected async doActivate(environmentId: string): Promise<void> {
    const envPath = this.environments.get(environmentId);
    if (!envPath) {
      throw new Error(`环境不存在: ${environmentId}`);
    }
    // Python venv 需要通过 shell 脚本激活
    // 这里只验证环境存在
  }

  /**
   * 停用环境
   */
  protected async doDeactivate(environmentId: string): Promise<void> {
    // Python venv 没有显式的停用操作
    // 只需要退出子进程即可
  }

  /**
   * 执行命令
   */
  protected async doExec(
    environmentId: string,
    command: string,
    args?: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const envPath = this.environments.get(environmentId);
    if (!envPath) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    // 确定Python路径
    const pythonPath = this.getPythonPath(envPath);

    // 构建命令
    let fullCommand: string;
    if (command === 'python' || command === 'python3') {
      fullCommand = `${pythonPath} ${args?.join(' ') ?? ''}`;
    } else {
      fullCommand = `${command} ${args?.join(' ') ?? ''}`;
    }

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: envPath,
        env: {
          ...process.env,
          VIRTUAL_ENV: envPath,
          PATH: `${path.join(envPath, 'bin')}:${process.env.PATH}`,
        },
      });

      return { stdout, stderr, exitCode: 0 };
    } catch (error: unknown) {
      const execError = error as { code?: number; stderr?: string };
      return {
        stdout: '',
        stderr: execError.stderr ?? String(error),
        exitCode: execError.code ?? 1,
      };
    }
  }

  /**
   * 安装包
   */
  protected async doInstallPackage(
    environmentId: string,
    packageName: string,
    version?: string
  ): Promise<void> {
    const fullPackageName = version ? `${packageName}==${version}` : packageName;
    const pipPath = this.getPipPath(environmentId);

    try {
      await execAsync(`${pipPath} install ${fullPackageName}`);
    } catch (error) {
      throw new Error(`安装包失败: ${error}`);
    }
  }

  /**
   * 卸载包
   */
  protected async doUninstallPackage(
    environmentId: string,
    packageName: string
  ): Promise<void> {
    const pipPath = this.getPipPath(environmentId);

    try {
      await execAsync(`${pipPath} uninstall -y ${packageName}`);
    } catch (error) {
      throw new Error(`卸载包失败: ${error}`);
    }
  }

  /**
   * 获取环境路径
   */
  protected doGetPath(environmentId: string): string {
    return this.environments.get(environmentId) ?? '';
  }

  /**
   * 检查环境是否存在
   */
  protected async doExists(environmentId: string): Promise<boolean> {
    const envPath = this.environments.get(environmentId);
    if (!envPath) {
      return false;
    }
    return fs.existsSync(envPath);
  }

  /**
   * 获取环境信息
   */
  protected async doGetInfo(environmentId: string): Promise<Record<string, unknown>> {
    const envPath = this.environments.get(environmentId);
    if (!envPath) {
      throw new Error(`环境不存在: ${environmentId}`);
    }

    const pythonPath = this.getPythonPath(envPath);
    const pipPath = this.getPipPath(envPath);

    // 获取已安装的包
    let packages: string[] = [];
    try {
      const { stdout } = await execAsync(`${pipPath} list --format=json`);
      packages = JSON.parse(stdout).map((p: { name: string }) => p.name);
    } catch {
      // 忽略错误
    }

    // 获取Python版本
    let pythonVersion = '';
    try {
      const { stdout } = await execAsync(`${pythonPath} --version`);
      pythonVersion = stdout.trim();
    } catch {
      // 忽略错误
    }

    return {
      id: environmentId,
      path: envPath,
      pythonVersion,
      packages,
      createdAt: fs.existsSync(envPath)
        ? fs.statSync(envPath).ctime.toISOString()
        : null,
    };
  }

  // ============== 私有方法 ==============

  /**
   * 获取Python路径
   */
  private getPythonPath(envPath: string): string {
    return path.join(envPath, 'bin', 'python');
  }

  /**
   * 获取pip路径
   */
  private getPipPath(envPath: string): string {
    return path.join(envPath, 'bin', 'pip');
  }

  /**
   * 升级pip
   */
  private async upgradePip(envId: string): Promise<void> {
    const pipPath = this.getPipPath(envId);
    try {
      await execAsync(`${pipPath} install --upgrade pip`);
    } catch {
      // 忽略错误
    }
  }

  /**
   * 获取所有环境
   */
  getEnvironments(): Map<string, string> {
    return new Map(this.environments);
  }

  /**
   * 清理未使用的环境
   */
  async cleanUnused(): Promise<number> {
    let cleaned = 0;

    for (const [envId, envPath] of this.environments) {
      if (!fs.existsSync(envPath)) {
        this.environments.delete(envId);
        cleaned++;
      }
    }

    return cleaned;
  }
}
