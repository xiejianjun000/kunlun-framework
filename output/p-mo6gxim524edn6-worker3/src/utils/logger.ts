/**
 * 统一日志工具
 * 提供结构化日志记录，便于调试和问题排查
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

export class Logger {
  private module: string;
  private minLevel: LogLevel;

  private static levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  constructor(module: string, minLevel: LogLevel = 'info') {
    this.module = module;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levelOrder.indexOf(level) >= Logger.levelOrder.indexOf(this.minLevel);
  }

  private format(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.module}]`;
    return data !== undefined ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.format(level, message, data);
    
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown): void {
    const data = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, data);
  }

  /**
   * 创建子模块日志记录器
   */
  child(subModule: string): Logger {
    return new Logger(`${this.module}:${subModule}`, this.minLevel);
  }

  /**
   * 设置最小日志级别
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * 默认全局日志记录器
 */
export const logger = new Logger('OpenTaiji');

/**
 * 静默吞掉错误时的标准处理
 * 不要使用空 catch，使用这个方法代替
 */
export function silentCatch(module: string, context: string, error: unknown): void {
  const childLogger = new Logger(module);
  childLogger.debug(`Silent catch in ${context}`, error);
}
