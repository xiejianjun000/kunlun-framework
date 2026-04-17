/**
 * 容器隔离环境
 * Container Environment - 基于Docker的隔离环境
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SkillEnvironment } from './SkillEnvironment';

const execAsync = promisify(exec);

/**
 * 容器配置
 */
export interface ContainerConfig {
  /** Docker镜像 */
  image: string;
  /** 容器前缀 */
  prefix?: string;
  /** 网络模式 */
  networkMode?: 'bridge' | 'host' | 'none';
  /** 内存限制 */
  memoryLimit?: string;
  /** CPU限制 */
  cpuLimit?: string;
  /** 是否使用TTY */
  tty?: boolean;
  /** 自动清理 */
  autoCleanup?: boolean;
}

/**
 * 容器信息
 */
interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  created: string;
}

/**
 * 容器隔离环境
 * 使用Docker容器提供更强的隔离
 */
export class ContainerEnvironment extends SkillEnvironment {
  /** 容器配置 */
  private config: Required<ContainerConfig>;
  /** 容器映射 */
  private containers: Map<string, ContainerInfo> = new Map();

  /**
   * 构造函数
   * @param config - 容器配置
   */
  constructor(config: ContainerConfig) {
    super();
    this.config = {
      image: config.image,
      prefix: config.prefix ?? 'kunlun_skill',
      networkMode: config.networkMode ?? 'none',
      memoryLimit: config.memoryLimit ?? '512m',
      cpuLimit: config.cpuLimit ?? '1',
      tty: config.tty ?? false,
      autoCleanup: config.autoCleanup ?? true,
    };
  }

  // ============== 生命周期 ==============

  /**
   * 初始化
   */
  protected async doInitialize(): Promise<void> {
    // 检查Docker是否可用
    try {
      await execAsync('docker --version');
    } catch {
      throw new Error('Docker不可用，请确保Docker已安装并运行');
    }

    // 拉取镜像（如果不存在）
    try {
      await execAsync(`docker image inspect ${this.config.image}`);
    } catch {
      console.log(`正在拉取镜像: ${this.config.image}`);
      await execAsync(`docker pull ${this.config.image}`);
    }
  }

  /**
   * 销毁
   */
  protected async doDestroy(): Promise<void> {
    // 清理所有容器
    for (const [containerId] of this.containers) {
      try {
        await this.doDelete(containerId);
      } catch {
        // 忽略错误
      }
    }
    this.containers.clear();
  }

  // ============== 环境操作 ==============

  /**
   * 创建容器
   */
  protected async doCreate(
    skillId: string,
    config?: Record<string, unknown>
  ): Promise<string> {
    const containerName = `${this.config.prefix}_${skillId}_${Date.now()}`;

    // 构建Docker命令
    const runArgs = [
      'docker run -d',
      `--name ${containerName}`,
      `--memory=${this.config.memoryLimit}`,
      `--cpus=${this.config.cpuLimit}`,
      `--network=${this.config.networkMode}`,
    ];

    // 添加卷挂载（如果提供）
    if (config?.volume) {
      const volumes = Array.isArray(config.volume)
        ? config.volume
        : [config.volume];
      for (const vol of volumes) {
        runArgs.push(`-v ${vol}`);
      }
    }

    // 添加环境变量（如果提供）
    if (config?.env) {
      const envs = Array.isArray(config.env) ? config.env : [config.env];
      for (const env of envs) {
        runArgs.push(`-e ${env}`);
      }
    }

    runArgs.push(this.config.image);

    // 添加入口命令（如果提供）
    if (config?.command) {
      runArgs.push(String(config.command));
    }

    try {
      const { stdout } = await execAsync(runArgs.join(' '));
      const containerId = stdout.trim().substring(0, 12);

      // 记录容器信息
      this.containers.set(containerId, {
        id: containerId,
        name: containerName,
        image: this.config.image,
        status: 'running',
        created: new Date().toISOString(),
      });

      return containerId;
    } catch (error) {
      throw new Error(`创建容器失败: ${error}`);
    }
  }

  /**
   * 删除容器
   */
  protected async doDelete(environmentId: string): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      return;
    }

    try {
      // 停止容器
      await execAsync(`docker stop ${container.name} 2>/dev/null || true`);
      
      // 删除容器
      if (this.config.autoCleanup) {
        await execAsync(`docker rm ${container.name}`);
      }

      this.containers.delete(environmentId);
    } catch (error) {
      throw new Error(`删除容器失败: ${error}`);
    }
  }

  /**
   * 激活容器（启动）
   */
  protected async doActivate(environmentId: string): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    try {
      await execAsync(`docker start ${container.name}`);
      container.status = 'running';
    } catch (error) {
      throw new Error(`启动容器失败: ${error}`);
    }
  }

  /**
   * 停用容器（停止）
   */
  protected async doDeactivate(environmentId: string): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    try {
      await execAsync(`docker stop ${container.name}`);
      container.status = 'exited';
    } catch (error) {
      throw new Error(`停止容器失败: ${error}`);
    }
  }

  /**
   * 在容器中执行命令
   */
  protected async doExec(
    environmentId: string,
    command: string,
    args?: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    const fullCommand = ['docker', 'exec', container.name, command, ...(args ?? [])].join(' ');

    try {
      const { stdout, stderr } = await execAsync(fullCommand);
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
   * 在容器中安装包
   */
  protected async doInstallPackage(
    environmentId: string,
    packageName: string,
    version?: string
  ): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    const fullPackageName = version ? `${packageName}==${version}` : packageName;

    try {
      // 尝试使用pip安装
      await this.doExec(environmentId, 'pip', ['install', fullPackageName]);
    } catch {
      // 如果是npm包，尝试使用npm
      await this.doExec(environmentId, 'npm', ['install', '-g', fullPackageName]);
    }
  }

  /**
   * 在容器中卸载包
   */
  protected async doUninstallPackage(
    environmentId: string,
    packageName: string
  ): Promise<void> {
    try {
      // 尝试使用pip卸载
      await this.doExec(environmentId, 'pip', ['uninstall', '-y', packageName]);
    } catch {
      // 如果是npm包，尝试使用npm
      await this.doExec(environmentId, 'npm', ['uninstall', '-g', packageName]);
    }
  }

  /**
   * 获取容器路径
   */
  protected doGetPath(environmentId: string): string {
    return `/workspace`;
  }

  /**
   * 检查容器是否存在
   */
  protected async doExists(environmentId: string): Promise<boolean> {
    const container = this.containers.get(environmentId);
    if (!container) {
      return false;
    }

    try {
      await execAsync(`docker inspect ${container.name}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取容器信息
   */
  protected async doGetInfo(environmentId: string): Promise<Record<string, unknown>> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    try {
      const { stdout } = await execAsync(
        `docker inspect ${container.name} --format '{{json .}}'`
      );
      const details = JSON.parse(stdout);

      return {
        id: container.id,
        name: container.name,
        image: container.image,
        status: details.State?.Status ?? container.status,
        created: details.Created,
        started: details.State?.StartedAt,
        finished: details.State?.FinishedAt,
        memory: details.HostConfig?.Memory,
        cpu: details.HostConfig?.CpuPercent,
        networks: Object.keys(details.NetworkSettings?.Networks ?? {}),
        ports: details.NetworkSettings?.Ports,
      };
    } catch {
      return {
        id: container.id,
        name: container.name,
        image: container.image,
        status: container.status,
        created: container.created,
      };
    }
  }

  // ============== 容器管理 ==============

  /**
   * 获取容器日志
   */
  async getLogs(environmentId: string, tail?: number): Promise<string> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    const tailArg = tail ? `--tail ${tail}` : '';
    const { stdout } = await execAsync(
      `docker logs ${tailArg} ${container.name}`
    );

    return stdout;
  }

  /**
   * 暂停容器
   */
  async pause(environmentId: string): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    await execAsync(`docker pause ${container.name}`);
    container.status = 'paused';
  }

  /**
   * 恢复容器
   */
  async unpause(environmentId: string): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    await execAsync(`docker unpause ${container.name}`);
    container.status = 'running';
  }

  /**
   * 复制文件到容器
   */
  async copyToContainer(
    environmentId: string,
    srcPath: string,
    destPath: string
  ): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    await execAsync(`docker cp ${srcPath} ${container.name}:${destPath}`);
  }

  /**
   * 从容器复制文件
   */
  async copyFromContainer(
    environmentId: string,
    srcPath: string,
    destPath: string
  ): Promise<void> {
    const container = this.containers.get(environmentId);
    if (!container) {
      throw new Error(`容器不存在: ${environmentId}`);
    }

    await execAsync(`docker cp ${container.name}:${srcPath} ${destPath}`);
  }

  /**
   * 获取所有容器
   */
  getContainers(): Map<string, ContainerInfo> {
    return new Map(this.containers);
  }
}
