/**
 * 技能环境接口
 * Skill Environment Interface
 */

/**
 * 技能隔离环境
 * 提供技能执行的隔离环境
 */
export abstract class SkillEnvironment {
  /** 环境ID */
  public readonly id: string;
  /** 环境状态 */
  protected status: 'uninitialized' | 'initialized' | 'destroyed' = 'uninitialized';

  constructor() {
    this.id = `env_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // ============== 生命周期 ==============

  /**
   * 初始化环境
   */
  async initialize(): Promise<void> {
    if (this.status !== 'uninitialized') {
      return;
    }
    await this.doInitialize();
    this.status = 'initialized';
  }

  /**
   * 销毁环境
   */
  async destroy(): Promise<void> {
    if (this.status === 'destroyed') {
      return;
    }
    await this.doDestroy();
    this.status = 'destroyed';
  }

  // ============== 环境操作 ==============

  /**
   * 创建隔离环境
   * @param skillId - 技能ID
   * @param config - 环境配置
   */
  async create(skillId: string, config?: Record<string, unknown>): Promise<string> {
    this.ensureInitialized();
    return this.doCreate(skillId, config);
  }

  /**
   * 删除隔离环境
   * @param environmentId - 环境ID
   */
  async delete(environmentId: string): Promise<void> {
    this.ensureInitialized();
    await this.doDelete(environmentId);
  }

  /**
   * 激活环境
   * @param environmentId - 环境ID
   */
  async activate(environmentId: string): Promise<void> {
    this.ensureInitialized();
    await this.doActivate(environmentId);
  }

  /**
   * 停用环境
   * @param environmentId - 环境ID
   */
  async deactivate(environmentId: string): Promise<void> {
    this.ensureInitialized();
    await this.doDeactivate(environmentId);
  }

  /**
   * 在环境中执行命令
   * @param environmentId - 环境ID
   * @param command - 命令
   * @param args - 参数
   */
  async exec(
    environmentId: string,
    command: string,
    args?: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.ensureInitialized();
    return this.doExec(environmentId, command, args);
  }

  /**
   * 安装包
   * @param environmentId - 环境ID
   * @param packageName - 包名
   * @param version - 版本
   */
  async installPackage(
    environmentId: string,
    packageName: string,
    version?: string
  ): Promise<void> {
    this.ensureInitialized();
    await this.doInstallPackage(environmentId, packageName, version);
  }

  /**
   * 卸载包
   * @param environmentId - 环境ID
   * @param packageName - 包名
   */
  async uninstallPackage(environmentId: string, packageName: string): Promise<void> {
    this.ensureInitialized();
    await this.doUninstallPackage(environmentId, packageName);
  }

  /**
   * 获取环境路径
   * @param environmentId - 环境ID
   */
  getPath(environmentId: string): string {
    return this.doGetPath(environmentId);
  }

  /**
   * 检查环境是否存在
   * @param environmentId - 环境ID
   */
  async exists(environmentId: string): Promise<boolean> {
    return this.doExists(environmentId);
  }

  /**
   * 获取环境信息
   * @param environmentId - 环境ID
   */
  async getInfo(environmentId: string): Promise<Record<string, unknown>> {
    return this.doGetInfo(environmentId);
  }

  // ============== 抽象方法 ==============

  /**
   * 执行初始化
   */
  protected abstract doInitialize(): Promise<void>;

  /**
   * 执行销毁
   */
  protected abstract doDestroy(): Promise<void>;

  /**
   * 创建隔离环境
   */
  protected abstract doCreate(
    skillId: string,
    config?: Record<string, unknown>
  ): Promise<string>;

  /**
   * 删除隔离环境
   */
  protected abstract doDelete(environmentId: string): Promise<void>;

  /**
   * 激活环境
   */
  protected abstract doActivate(environmentId: string): Promise<void>;

  /**
   * 停用环境
   */
  protected abstract doDeactivate(environmentId: string): Promise<void>;

  /**
   * 执行命令
   */
  protected abstract doExec(
    environmentId: string,
    command: string,
    args?: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;

  /**
   * 安装包
   */
  protected abstract doInstallPackage(
    environmentId: string,
    packageName: string,
    version?: string
  ): Promise<void>;

  /**
   * 卸载包
   */
  protected abstract doUninstallPackage(
    environmentId: string,
    packageName: string
  ): Promise<void>;

  /**
   * 获取环境路径
   */
  protected abstract doGetPath(environmentId: string): string;

  /**
   * 检查环境是否存在
   */
  protected abstract doExists(environmentId: string): Promise<boolean>;

  /**
   * 获取环境信息
   */
  protected abstract doGetInfo(environmentId: string): Promise<Record<string, unknown>>;

  // ============== 辅助方法 ==============

  /**
   * 确保环境已初始化
   */
  protected ensureInitialized(): void {
    if (this.status !== 'initialized') {
      throw new Error(`环境未初始化: ${this.id}`);
    }
  }
}
