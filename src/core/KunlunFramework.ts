/**
 * 昆仑框架主类
 * Kunlun Framework - Main Class
 */

import * as path from 'path';
import {
  HeartbeatManager,
  HeartbeatOptions,
  CheckItem,
  CheckResult,
  CheckerContext,
} from './heartbeat';

// ============== 配置类型 ==============

export interface KunlunFrameworkConfig {
  /** 多租户配置 */
  multiTenant?: {
    enabled: boolean;
    isolationLevel?: 'standard' | 'strict';
  };

  /** 技能系统配置 */
  skillSystem?: {
    maxSkillsPerUser?: number;
    skillIsolation?: 'venv' | 'process';
    skillsPath?: string;
  };

  /** 记忆系统配置 */
  memorySystem?: {
    vectorDb?: {
      adapter: 'qdrant' | 'chroma' | 'local';
      url?: string;
    };
    memoryPath?: string;
  };

  /** 安全配置 */
  security?: {
    level?: 'developer' | 'standard' | 'enterprise';
    approvalRequired?: string[];
  };

  /** 心跳系统配置 */
  heartbeat?: HeartbeatOptions;

  /** 日志配置 */
  logger?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    output?: 'console' | 'file' | 'both';
    logPath?: string;
  };
}

// ============== 框架主类 ==============

export class KunlunFramework {
  public readonly version: string = '1.0.0';
  public readonly name: string = 'Kunlun Framework';

  private config: Required<KunlunFrameworkConfig>;
  private heartbeatManager: HeartbeatManager | null = null;
  private isInitialized: boolean = false;
  private logger: (level: string, msg: string) => void;

  constructor(config: KunlunFrameworkConfig = {}) {
    // 合并配置
    this.config = {
      multiTenant: {
        enabled: config.multiTenant?.enabled ?? false,
        isolationLevel: config.multiTenant?.isolationLevel ?? 'standard',
      },
      skillSystem: {
        maxSkillsPerUser: config.skillSystem?.maxSkillsPerUser ?? 100,
        skillIsolation: config.skillSystem?.skillIsolation ?? 'venv',
        skillsPath: config.skillSystem?.skillsPath ?? './skills',
      },
      memorySystem: {
        vectorDb: {
          adapter: config.memorySystem?.vectorDb?.adapter ?? 'local',
          url: config.memorySystem?.vectorDb?.url ?? 'localhost:6333',
        },
        memoryPath: config.memorySystem?.memoryPath ?? './MEMORY.md',
      },
      security: {
        level: config.security?.level ?? 'standard',
        approvalRequired: config.security?.approvalRequired ?? [],
      },
      heartbeat: {
        ...config.heartbeat,
      },
      logger: {
        level: config.logger?.level ?? 'info',
        output: config.logger?.output ?? 'console',
        logPath: config.logger?.logPath ?? './logs',
      },
    };

    // 初始化日志函数
    this.logger = this.createLogger();
  }

  // ============== 生命周期方法 ==============

  /**
   * 初始化框架
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger('warn', '框架已经初始化，跳过');
      return;
    }

    this.logger('info', '正在初始化昆仑框架...');

    // 初始化心跳系统
    await this.initializeHeartbeat();

    this.isInitialized = true;
    this.logger('info', '昆仑框架初始化完成');
  }

  /**
   * 销毁框架
   */
  async destroy(): Promise<void> {
    this.logger('info', '正在销毁框架...');

    // 停止心跳系统
    if (this.heartbeatManager) {
      await this.heartbeatManager.stop();
      this.heartbeatManager = null;
    }

    this.isInitialized = false;
    this.logger('info', '框架已销毁');
  }

  // ============== 心跳系统集成 ==============

  /**
   * 初始化心跳系统
   */
  private async initializeHeartbeat(): Promise<void> {
    this.logger('info', '初始化心跳系统...');

    // 构建心跳上下文
    const heartbeatContext: Partial<CheckerContext> = {
      rootPath: process.cwd(),
      memoryPath: this.config.memorySystem.memoryPath,
      soulPath: path.join(process.cwd(), 'SOUL.md'),
      calendarPath: path.join(process.cwd(), 'calendar.json'),
    };

    // 创建心跳管理器
    this.heartbeatManager = new HeartbeatManager({
      ...this.config.heartbeat,
      checklistPath: path.join(process.cwd(), 'src/core/heartbeat/heartbeat.md'),
      onNotify: (results) => this.handleHeartbeatNotification(results),
      onCheckComplete: (results) => this.handleCheckComplete(results),
      logger: (msg) => this.logger('debug', msg),
    });

    // 更新上下文
    this.heartbeatManager.updateContext(heartbeatContext);

    // 注册内置检查项后启动
    await this.heartbeatManager.start();
  }

  /**
   * 处理心跳通知
   */
  private handleHeartbeatNotification(results: CheckResult[]): void {
    this.logger('warn', `心跳检测到异常: ${results.length}项`);

    for (const result of results) {
      this.logger(
        result.status === 'fail' ? 'error' : 'warn',
        `[${result.itemName}] ${result.status}: ${result.message}`
      );
    }

    // 这里可以添加实际的告警逻辑，如发送邮件、推送通知等
  }

  /**
   * 处理检查完成
   */
  private handleCheckComplete(results: CheckResult[]): void {
    this.logger('info', `检查完成: ${results.length}项`);

    const passed = results.filter((r) => r.status === 'pass').length;
    const warnings = results.filter((r) => r.status === 'warning').length;
    const failed = results.filter((r) => r.status === 'fail').length;

    this.logger('info', `结果统计 - 通过: ${passed}, 警告: ${warnings}, 失败: ${failed}`);
  }

  // ============== 心跳系统公共接口 ==============

  /**
   * 获取心跳管理器
   */
  getHeartbeatManager(): HeartbeatManager | null {
    return this.heartbeatManager;
  }

  /**
   * 手动触发心跳检查
   */
  async triggerHeartbeatCheck(): Promise<CheckResult[]> {
    if (!this.heartbeatManager) {
      throw new Error('心跳系统未初始化');
    }
    return await this.heartbeatManager.checkNow();
  }

  /**
   * 添加自定义检查项
   */
  addHeartbeatCheckItem(item: CheckItem): void {
    if (!this.heartbeatManager) {
      throw new Error('心跳系统未初始化');
    }
    this.heartbeatManager.addCheckItem(item);
  }

  /**
   * 移除检查项
   */
  removeHeartbeatCheckItem(itemId: string): boolean {
    if (!this.heartbeatManager) {
      throw new Error('心跳系统未初始化');
    }
    return this.heartbeatManager.removeCheckItem(itemId);
  }

  /**
   * 更新心跳上下文
   */
  updateHeartbeatContext(context: Partial<CheckerContext>): void {
    if (!this.heartbeatManager) {
      throw new Error('心跳系统未初始化');
    }
    this.heartbeatManager.updateContext(context);
  }

  /**
   * 获取心跳状态
   */
  getHeartbeatStatus(): any {
    if (!this.heartbeatManager) {
      return { isRunning: false };
    }
    return this.heartbeatManager.getStatus();
  }

  // ============== 辅助方法 ==============

  /**
   * 创建日志函数
   */
  private createLogger(): (level: string, msg: string) => void {
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    const currentLevel = levels[this.config.logger.level];

    return (level: string, msg: string) => {
      if (levels[level] >= currentLevel) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        switch (this.config.logger.output) {
          case 'console':
            console.log(`${prefix} ${msg}`);
            break;
          case 'file':
            // 文件输出可扩展
            console.log(`${prefix} ${msg}`);
            break;
          case 'both':
            console.log(`${prefix} ${msg}`);
            break;
        }
      }
    };
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<KunlunFrameworkConfig>> {
    return { ...this.config };
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// ============== 工厂函数 ==============

/**
 * 创建昆仑框架实例
 */
export function createKunlunFramework(config?: KunlunFrameworkConfig): KunlunFramework {
  return new KunlunFramework(config);
}

// ============== 默认导出 ==============

export default KunlunFramework;
