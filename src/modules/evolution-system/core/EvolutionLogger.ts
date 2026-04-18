/**
 * 进化日志记录器
 * Evolution Logger - Logging for evolution system
 */

import * as fs from 'fs';
import * as path from 'path';

/** 日志级别 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/** 日志条目 */
export interface EvolutionLogEntry {
  /** 日志ID */
  id: string;
  /** 时间戳 */
  timestamp: Date;
  /** 级别 */
  level: LogLevel;
  /** 消息 */
  message: string;
  /** 上下文 */
  context?: Record<string, unknown>;
  /** 用户ID */
  userId?: string;
  /** 租户ID */
  tenantId?: string;
  /** 进化ID */
  evolutionId?: string;
  /** 错误堆栈 */
  stack?: string;
}

/** 日志配置 */
export interface EvolutionLoggerConfig {
  /** 日志级别 */
  level: LogLevel;
  /** 输出类型 */
  output: 'console' | 'file' | 'both';
  /** 日志文件路径 */
  logPath?: string;
  /** 最大文件大小 */
  maxFileSize?: number;
  /** 最大文件数 */
  maxFiles?: number;
  /** 是否包含时间戳 */
  includeTimestamp?: boolean;
  /** 是否JSON格式化 */
  jsonFormat?: boolean;
}

/**
 * 进化日志记录器
 * 负责记录进化系统的所有日志
 */
export class EvolutionLogger {
  private readonly config: Required<EvolutionLoggerConfig>;
  private readonly entries: EvolutionLogEntry[];
  private readonly maxEntries: number = 10000;
  private currentFileIndex: number = 0;
  private currentFileSize: number = 0;

  /**
   * 构造函数
   * @param config 日志配置
   */
  constructor(config?: Partial<EvolutionLoggerConfig>) {
    this.config = {
      level: config?.level ?? LogLevel.INFO,
      output: config?.output ?? 'console',
      logPath: config?.logPath ?? './logs/evolution',
      maxFileSize: config?.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: config?.maxFiles ?? 10,
      includeTimestamp: config?.includeTimestamp ?? true,
      jsonFormat: config?.jsonFormat ?? false,
    };

    this.entries = [];

    // 确保日志目录存在
    if (this.config.output !== 'console') {
      this.ensureLogDirectory();
    }
  }

  /**
   * 记录调试日志
   * @param message 消息
   * @param context 上下文
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 记录信息日志
   * @param message 消息
   * @param context 上下文
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 记录警告日志
   * @param message 消息
   * @param context 上下文
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 记录错误日志
   * @param message 消息
   * @param context 上下文
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * 记录进化相关日志
   * @param evolutionId 进化ID
   * @param level 级别
   * @param message 消息
   * @param context 上下文
   */
  logEvolution(
    evolutionId: string,
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.log(level, message, { ...context, evolutionId });
  }

  /**
   * 记录用户相关日志
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param level 级别
   * @param message 消息
   * @param context 上下文
   */
  logUser(
    userId: string,
    tenantId: string,
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.log(level, message, { ...context, userId, tenantId });
  }

  /**
   * 获取日志条目
   * @param limit 限制数量
   * @param level 级别筛选
   */
  getEntries(limit?: number, level?: LogLevel): EvolutionLogEntry[] {
    let entries = this.entries;

    if (level !== undefined) {
      entries = entries.filter(e => e.level >= level);
    }

    if (limit !== undefined) {
      return entries.slice(-limit);
    }

    return [...entries];
  }

  /**
   * 查询日志
   * @param query 查询条件
   */
  query(query: LogQuery): EvolutionLogEntry[] {
    let entries = this.entries;

    if (query.userId) {
      entries = entries.filter(e => e.userId === query.userId);
    }

    if (query.tenantId) {
      entries = entries.filter(e => e.tenantId === query.tenantId);
    }

    if (query.evolutionId) {
      entries = entries.filter(e => e.evolutionId === query.evolutionId);
    }

    if (query.level) {
      entries = entries.filter(e => e.level >= query.level);
    }

    if (query.startTime) {
      entries = entries.filter(e => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      entries = entries.filter(e => e.timestamp <= query.endTime!);
    }

    if (query.messageContains) {
      entries = entries.filter(e =>
        e.message.toLowerCase().includes(query.messageContains!.toLowerCase())
      );
    }

    if (query.limit) {
      entries = entries.slice(-query.limit);
    }

    return entries;
  }

  /**
   * 清除日志
   * @param beforeTime 清除此时间之前的日志
   */
  clear(beforeTime?: Date): number {
    const before = beforeTime ?? new Date();
    const originalLength = this.entries.length;

    const filteredEntries = this.entries.filter(e => e.timestamp > before);
    this.entries.length = 0;
    this.entries.push(...filteredEntries);

    return originalLength - this.entries.length;
  }

  /**
   * 导出日志
   * @param format 导出格式
   */
  export(format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    return this.entries
      .map(e => {
        const parts = [
          e.timestamp.toISOString(),
          LogLevel[e.level],
          e.message,
        ];
        if (e.userId) parts.push(`userId=${e.userId}`);
        if (e.tenantId) parts.push(`tenantId=${e.tenantId}`);
        if (e.evolutionId) parts.push(`evolutionId=${e.evolutionId}`);
        return parts.join(' | ');
      })
      .join('\n');
  }

  /**
   * 获取统计信息
   */
  getStats(): LogStats {
    const stats: LogStats = {
      total: this.entries.length,
      byLevel: {},
      byUser: {},
      byTenant: {},
      recentCount: 0,
      oldestEntry: null,
      newestEntry: null,
    };

    for (const entry of this.entries) {
      // 按级别统计
      const levelName = LogLevel[entry.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // 按用户统计
      if (entry.userId) {
        stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
      }

      // 按租户统计
      if (entry.tenantId) {
        stats.byTenant[entry.tenantId] = (stats.byTenant[entry.tenantId] || 0) + 1;
      }
    }

    // 最近24小时的日志数量
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    stats.recentCount = this.entries.filter(e => e.timestamp > oneDayAgo).length;

    // 最旧的条目
    if (this.entries.length > 0) {
      stats.oldestEntry = this.entries[0].timestamp;
      stats.newestEntry = this.entries[this.entries.length - 1].timestamp;
    }

    return stats;
  }

  // ============== 私有方法 ==============

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: EvolutionLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      context,
      userId: context?.userId as string | undefined,
      tenantId: context?.tenantId as string | undefined,
      evolutionId: context?.evolutionId as string | undefined,
    };

    // 添加错误堆栈
    if (level === LogLevel.ERROR && context?.error instanceof Error) {
      entry.stack = context.error.stack;
    }

    // 添加到内存
    this.entries.push(entry);

    // 限制内存中的日志数量
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // 输出到控制台
    if (this.config.output !== 'file') {
      this.outputToConsole(entry);
    }

    // 输出到文件
    if (this.config.output !== 'console') {
      this.outputToFile(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: EvolutionLogEntry): void {
    const prefix = this.config.includeTimestamp
      ? `[${entry.timestamp.toISOString()}] [${LogLevel[entry.level]}]`
      : `[${LogLevel[entry.level]}]`;

    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.stack || '');
        break;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('  Context:', entry.context);
    }
  }

  /**
   * 输出到文件
   */
  private outputToFile(entry: EvolutionLogEntry): void {
    try {
      const logLine = this.formatLogLine(entry);
      const filePath = this.getLogFilePath();

      // 检查文件大小
      if (this.currentFileSize >= this.config.maxFileSize) {
        this.rotateLogFile();
      }

      // 写入文件
      fs.appendFileSync(filePath, logLine + '\n', 'utf8');
      this.currentFileSize += Buffer.byteLength(logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * 格式化日志行
   */
  private formatLogLine(entry: EvolutionLogEntry): string {
    if (this.config.jsonFormat) {
      return JSON.stringify(entry);
    }

    const parts = [
      entry.timestamp.toISOString(),
      LogLevel[entry.level],
      entry.message,
    ];

    if (entry.userId) parts.push(`userId=${entry.userId}`);
    if (entry.tenantId) parts.push(`tenantId=${entry.tenantId}`);
    if (entry.evolutionId) parts.push(`evolutionId=${entry.evolutionId}`);

    let line = parts.join(' | ');

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context);
      line += ` | context=${contextStr}`;
    }

    if (entry.stack) {
      line += ` | stack=${entry.stack}`;
    }

    return line;
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.config.logPath, `evolution-${date}-${this.currentFileIndex}.log`);
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logPath)) {
      fs.mkdirSync(this.config.logPath, { recursive: true });
    }
  }

  /**
   * 轮转日志文件
   */
  private rotateLogFile(): void {
    this.currentFileIndex++;
    this.currentFileSize = 0;

    // 删除旧文件
    const maxIndex = this.currentFileIndex - this.config.maxFiles;
    for (let i = 0; i <= maxIndex; i++) {
      const oldFilePath = path.join(
        this.config.logPath,
        `evolution-${new Date().toISOString().split('T')[0]}-${i}.log`
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
  }

  /**
   * 生成日志ID
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/** 日志查询条件 */
export interface LogQuery {
  /** 用户ID */
  userId?: string;
  /** 租户ID */
  tenantId?: string;
  /** 进化ID */
  evolutionId?: string;
  /** 级别 */
  level?: LogLevel;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 消息包含 */
  messageContains?: string;
  /** 限制数量 */
  limit?: number;
}

/** 日志统计 */
export interface LogStats {
  /** 总数 */
  total: number;
  /** 按级别统计 */
  byLevel: Record<string, number>;
  /** 按用户统计 */
  byUser: Record<string, number>;
  /** 按租户统计 */
  byTenant: Record<string, number>;
  /** 最近24小时数量 */
  recentCount: number;
  /** 最旧条目 */
  oldestEntry: Date | null;
  /** 最新条目 */
  newestEntry: Date | null;
}
