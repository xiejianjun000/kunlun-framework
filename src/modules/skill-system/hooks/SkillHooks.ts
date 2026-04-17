/**
 * 技能钩子
 * Skill Hooks - 技能生命周期钩子
 */

import { EventEmitter } from 'events';

/**
 * 钩子事件类型
 */
export enum HookEvent {
  /** 安装前 */
  BEFORE_INSTALL = 'beforeInstall',
  /** 安装后 */
  AFTER_INSTALL = 'afterInstall',
  /** 安装错误 */
  INSTALL_ERROR = 'installError',
  /** 卸载前 */
  BEFORE_UNINSTALL = 'beforeUninstall',
  /** 卸载后 */
  AFTER_UNINSTALL = 'afterUninstall',
  /** 更新前 */
  BEFORE_UPDATE = 'beforeUpdate',
  /** 更新后 */
  AFTER_UPDATE = 'afterUpdate',
  /** 更新错误 */
  UPDATE_ERROR = 'updateError',
  /** 执行前 */
  BEFORE_EXECUTE = 'beforeExecute',
  /** 执行后 */
  AFTER_EXECUTE = 'afterExecute',
  /** 执行超时 */
  EXECUTE_TIMEOUT = 'executeTimeout',
  /** 执行错误 */
  EXECUTE_ERROR = 'executeError',
}

/**
 * 钩子上下文
 */
export interface HookContext {
  /** 执行ID */
  executionId: string;
  /** 技能ID */
  skillId: string;
  /** 用户ID */
  userId?: string;
  /** 租户ID */
  tenantId?: string;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 安装钩子上下文
 */
export interface InstallHookContext extends HookContext {
  /** 安装源 */
  source: string;
  /** 安装选项 */
  options?: Record<string, unknown>;
}

/**
 * 安装后钩子上下文
 */
export interface AfterInstallHookContext extends HookContext {
  /** 安装信息 */
  installInfo: {
    skillId: string;
    installPath: string;
    installedAt: Date;
    dependencies: string[];
  };
  /** 是否成功 */
  success: boolean;
}

/**
 * 卸载钩子上下文
 */
export interface UninstallHookContext extends HookContext {
  /** 卸载选项 */
  options?: Record<string, unknown>;
}

/**
 * 更新钩子上下文
 */
export interface UpdateHookContext extends HookContext {
  /** 当前版本 */
  currentVersion: string;
  /** 目标版本 */
  targetVersion?: string;
}

/**
 * 执行前钩子上下文
 */
export interface BeforeExecuteHookContext extends HookContext {
  /** 输入参数 */
  input: Record<string, unknown>;
}

/**
 * 执行后钩子上下文
 */
export interface AfterExecuteHookContext extends HookContext {
  /** 执行结果 */
  result: {
    output: unknown;
    status: string;
    duration: number;
  };
  /** 是否成功 */
  success: boolean;
}

/**
 * 错误钩子上下文
 */
export interface ErrorHookContext extends HookContext {
  /** 错误信息 */
  error: string;
}

/**
 * 钩子函数类型
 */
export type HookFunction<T extends HookContext = HookContext> = (
  context: T
) => Promise<void> | void;

/**
 * 钩子配置
 */
export interface HookConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 钩子超时（毫秒） */
  timeout?: number;
  /** 是否同步执行 */
  sync?: boolean;
  /** 错误处理策略 */
  errorStrategy?: 'throw' | 'log' | 'ignore';
}

/**
 * 注册的钩子
 */
interface RegisteredHook {
  /** 钩子函数 */
  fn: HookFunction;
  /** 配置 */
  config: Required<HookConfig>;
  /** 优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 技能钩子系统
 * 提供技能生命周期的钩子扩展点
 */
export class SkillHooks extends EventEmitter {
  /** 钩子存储 */
  private hooks: Map<HookEvent, RegisteredHook[]> = new Map();
  /** 全局配置 */
  private globalConfig: Required<HookConfig>;
  /** 钩子执行统计 */
  private stats: Map<string, { success: number; failure: number }> = new Map();

  /**
   * 构造函数
   * @param config - 全局配置
   */
  constructor(config: HookConfig = {}) {
    super();
    this.globalConfig = {
      enabled: config.enabled ?? true,
      timeout: config.timeout ?? 30000,
      sync: config.sync ?? false,
      errorStrategy: config.errorStrategy ?? 'log',
    };

    // 初始化事件映射
    for (const event of Object.values(HookEvent)) {
      this.hooks.set(event, []);
    }

    // 初始化统计
    for (const event of Object.values(HookEvent)) {
      this.stats.set(event, { success: 0, failure: 0 });
    }
  }

  // ============== 注册钩子 ==============

  /**
   * 注册安装前钩子
   */
  onBeforeInstall(fn: HookFunction<InstallHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.BEFORE_INSTALL, fn, config);
  }

  /**
   * 注册安装后钩子
   */
  onAfterInstall(fn: HookFunction<AfterInstallHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.AFTER_INSTALL, fn, config);
  }

  /**
   * 注册安装错误钩子
   */
  onInstallError(fn: HookFunction<ErrorHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.INSTALL_ERROR, fn, config);
  }

  /**
   * 注册卸载前钩子
   */
  onBeforeUninstall(fn: HookFunction<UninstallHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.BEFORE_UNINSTALL, fn, config);
  }

  /**
   * 注册卸载后钩子
   */
  onAfterUninstall(fn: HookFunction<UninstallHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.AFTER_UNINSTALL, fn, config);
  }

  /**
   * 注册更新前钩子
   */
  onBeforeUpdate(fn: HookFunction<UpdateHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.BEFORE_UPDATE, fn, config);
  }

  /**
   * 注册更新后钩子
   */
  onAfterUpdate(fn: HookFunction<UpdateHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.AFTER_UPDATE, fn, config);
  }

  /**
   * 注册执行前钩子
   */
  onBeforeExecute(fn: HookFunction<BeforeExecuteHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.BEFORE_EXECUTE, fn, config);
  }

  /**
   * 注册执行后钩子
   */
  onAfterExecute(fn: HookFunction<AfterExecuteHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.AFTER_EXECUTE, fn, config);
  }

  /**
   * 注册执行超时钩子
   */
  onExecuteTimeout(fn: HookFunction<ErrorHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.EXECUTE_TIMEOUT, fn, config);
  }

  /**
   * 注册执行错误钩子
   */
  onExecuteError(fn: HookFunction<ErrorHookContext>, config?: HookConfig): void {
    this.registerHook(HookEvent.EXECUTE_ERROR, fn, config);
  }

  /**
   * 注册通用钩子
   */
  register(event: HookEvent, fn: HookFunction, config?: HookConfig): void {
    this.registerHook(event, fn, config);
  }

  /**
   * 注销钩子
   */
  unregister(event: HookEvent, fn: HookFunction): void {
    const hooks = this.hooks.get(event);
    if (!hooks) {
      return;
    }

    const index = hooks.findIndex((h) => h.fn === fn);
    if (index !== -1) {
      hooks.splice(index, 1);
    }
  }

  /**
   * 注销所有钩子
   */
  unregisterAll(event?: HookEvent): void {
    if (event) {
      this.hooks.get(event)?.splice(0);
    } else {
      for (const hooks of this.hooks.values()) {
        hooks.splice(0);
      }
    }
  }

  // ============== 触发钩子 ==============

  /**
   * 触发钩子
   * @param event - 事件类型
   * @param context - 上下文
   */
  async trigger(event: HookEvent, context: Record<string, unknown>): Promise<void> {
    if (!this.globalConfig.enabled) {
      return;
    }

    const hooks = this.hooks.get(event);
    if (!hooks || hooks.length === 0) {
      return;
    }

    // 按优先级排序
    const sortedHooks = hooks
      .filter((h) => h.enabled)
      .sort((a, b) => b.priority - a.priority);

    if (this.globalConfig.sync) {
      // 同步执行
      for (const hook of sortedHooks) {
        await this.executeHook(hook, event, context);
      }
    } else {
      // 异步并发执行
      await Promise.all(
        sortedHooks.map((hook) => this.executeHook(hook, event, context))
      );
    }
  }

  // ============== 生命周期 ==============

  /**
   * 初始化钩子系统
   */
  async initialize(): Promise<void> {
    // 加载内置钩子
    this.loadBuiltinHooks();

    // 触发初始化事件
    this.emit('initialized');
  }

  /**
   * 销毁钩子系统
   */
  async destroy(): Promise<void> {
    // 注销所有钩子
    this.unregisterAll();

    // 清除统计
    this.stats.clear();

    this.emit('destroyed');
  }

  // ============== 统计 ==============

  /**
   * 获取统计信息
   */
  getStats(): Record<string, { success: number; failure: number }> {
    const result: Record<string, { success: number; failure: number }> = {};
    for (const [event, stat] of this.stats) {
      result[event] = { ...stat };
    }
    return result;
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    for (const stat of this.stats.values()) {
      stat.success = 0;
      stat.failure = 0;
    }
  }

  // ============== 私有方法 ==============

  /**
   * 注册钩子
   */
  private registerHook<T extends HookContext>(
    event: HookEvent,
    fn: HookFunction<T>,
    config?: HookConfig
  ): void {
    const hooks = this.hooks.get(event)!;
    const hookConfig = {
      enabled: config?.enabled ?? true,
      timeout: config?.timeout ?? this.globalConfig.timeout,
      sync: config?.sync ?? this.globalConfig.sync,
      errorStrategy: config?.errorStrategy ?? this.globalConfig.errorStrategy,
    };

    hooks.push({
      fn: fn as HookFunction,
      config: hookConfig,
      priority: 0,
      enabled: hookConfig.enabled,
    });
  }

  /**
   * 执行钩子
   */
  private async executeHook(
    hook: RegisteredHook,
    event: HookEvent,
    context: Record<string, unknown>
  ): Promise<void> {
    const stat = this.stats.get(event)!;

    try {
      // 设置超时
      const promise = hook.fn(context as HookContext);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Hook timeout')),
          hook.config.timeout
        );
      });

      await Promise.race([promise, timeoutPromise]);
      stat.success++;
    } catch (error) {
      stat.failure++;

      switch (hook.config.errorStrategy) {
        case 'throw':
          throw error;
        case 'log':
          console.error(`Hook error [${event}]:`, error);
          break;
        case 'ignore':
          break;
      }
    }
  }

  /**
   * 加载内置钩子
   */
  private loadBuiltinHooks(): void {
    // 日志钩子
    this.onBeforeInstall(async (ctx) => {
      console.log(`[Hook] Before Install: ${ctx.skillId}`);
    });

    this.onAfterInstall(async (ctx) => {
      console.log(`[Hook] After Install: ${ctx.skillId} - Success: ${ctx.success}`);
    });

    this.onBeforeExecute(async (ctx) => {
      console.log(`[Hook] Before Execute: ${ctx.skillId}`);
    });

    this.onAfterExecute(async (ctx) => {
      console.log(`[Hook] After Execute: ${ctx.skillId} - Success: ${ctx.success}`);
    });
  }
}
