/**
 * 记忆文件监听器
 * Memory File Watcher - 监听 .taiji-memory/ 目录自动触发图谱更新
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  FileWatcherConfig,
  FileWatcherEvent,
  FileChangeEvent,
  ExtractedKnowledge,
} from './types';
import { MemoryLoop } from './MemoryLoop';

/**
 * 文件监听器默认配置
 */
const DEFAULT_WATCHER_CONFIG: FileWatcherConfig = {
  watchDir: '.taiji-memory',
  events: [FileWatcherEvent.ADD, FileWatcherEvent.CHANGE],
  recursive: false,
  debounceMs: 1000,
};

/**
 * 文件监听器
 * 
 * 监听记忆目录变化，自动触发图谱更新
 * 
 * @example
 * ```typescript
 * const watcher = new MemoryFileWatcher({
 *   watchDir: './.taiji-memory',
 *   debounceMs: 2000
 * });
 * 
 * watcher.on('change', async (event) => {
 *   const loop = new MemoryLoop();
 *   const record = await loop.parseMemoryFile(event.path);
 *   const knowledge = loop.extractKnowledge(record);
 *   await loop.enrichGraph(knowledge);
 * });
 * 
 * await watcher.start();
 * ```
 */
export class MemoryFileWatcher extends EventEmitter {
  private readonly config: FileWatcherConfig;
  private watcher: fsSync.FSWatcher | null = null;
  private memoryLoop: MemoryLoop | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private knownFiles: Set<string> = new Set();
  private watcherEvents: AsyncIterableIterator<{ eventType: string; filename: string }> | null = null;

  /**
   * 构造函数
   * @param config 文件监听器配置
   */
  constructor(config: Partial<FileWatcherConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_WATCHER_CONFIG,
      ...config,
    };
  }

  /**
   * 设置记忆循环实例（用于自动处理）
   */
  setMemoryLoop(loop: MemoryLoop): void {
    this.memoryLoop = loop;
  }

  /**
   * 启动监听
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[MemoryFileWatcher] 已在运行中');
      return;
    }

    try {
      // 确保目录存在
      await fs.mkdir(this.config.watchDir, { recursive: true });

      // 初始化已知文件列表
      await this.scanExistingFiles();

      // 启动监听
      const watchIterator = fs.watch(this.config.watchDir, {
        recursive: this.config.recursive,
      });

      // 对于 Node.js 的 watch，我们需要使用轮询方式或者使用 fs.watchFile
      // 这里我们使用 fs.watch 的迭代器来监听变化
      this.watcherEvents = watchIterator as unknown as AsyncIterableIterator<{ eventType: string; filename: string }>;
      this.processWatchEvents();

      this.isRunning = true;
      console.log(`[MemoryFileWatcher] 已启动: ${this.config.watchDir}`);

    } catch (error) {
      console.error('[MemoryFileWatcher] 启动失败:', error);
      throw error;
    }
  }

  /**
   * 处理监听事件
   */
  private async processWatchEvents(): Promise<void> {
    if (!this.watcherEvents) return;
    
    try {
      for await (const event of this.watcherEvents) {
        if (event.eventType === 'rename') {
          if (this.knownFiles.has(event.filename)) {
            this.handleFileRemove(event.filename);
          } else {
            this.handleFileAdd(event.filename);
          }
        } else if (event.eventType === 'change') {
          this.handleFileChange(event.filename);
        }
      }
    } catch (error) {
      console.error('[MemoryFileWatcher] 监听事件处理失败:', error);
    }
  }

  /**
   * 停止监听
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // 清除所有防抖定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // 关闭监听器
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.watcherEvents = null;

    this.isRunning = false;
    console.log('[MemoryFileWatcher] 已停止');
  }

  /**
   * 获取监听状态
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 获取监听目录
   */
  getWatchDir(): string {
    return this.config.watchDir;
  }

  // ============== 事件处理 ==============

  /**
   * 处理文件添加
   */
  private handleFileAdd(filename: string): void {
    this.debouncedHandle(filename, FileWatcherEvent.ADD);
  }

  /**
   * 处理文件变更
   */
  private handleFileChange(filename: string): void {
    this.debouncedHandle(filename, FileWatcherEvent.CHANGE);
  }

  /**
   * 处理文件删除
   */
  private handleFileRemove(filename: string): void {
    this.knownFiles.delete(filename);
    this.debouncedHandle(filename, FileWatcherEvent.UNLINK);
  }

  /**
   * 防抖处理
   */
  private debouncedHandle(filename: string, event: FileWatcherEvent): void {
    // 过滤非 Markdown 文件
    if (!filename.endsWith('.md')) {
      return;
    }

    // 检查是否监听该事件
    if (!this.config.events.includes(event)) {
      return;
    }

    // 清除现有定时器
    const existingTimer = this.debounceTimers.get(filename);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的防抖定时器
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filename);
      await this.processFileEvent(filename, event);
    }, this.config.debounceMs);

    this.debounceTimers.set(filename, timer);
  }

  /**
   * 处理文件事件
   */
  private async processFileEvent(filename: string, event: FileWatcherEvent): Promise<void> {
    const fullPath = path.join(this.config.watchDir, filename);
    
    const changeEvent: FileChangeEvent = {
      event,
      path: fullPath,
      timestamp: Date.now(),
    };

    console.log(`[MemoryFileWatcher] 文件事件: ${event} - ${filename}`);

    // 触发事件
    this.emit('change', changeEvent);
    this.emit(event, changeEvent);

    // 如果配置了自动处理
    if (this.memoryLoop && this.shouldAutoProcess(event)) {
      await this.autoProcessFile(fullPath);
    }
  }

  /**
   * 自动处理文件
   */
  private async autoProcessFile(filePath: string): Promise<void> {
    if (!this.memoryLoop) {
      return;
    }

    try {
      const record = await this.memoryLoop.parseMemoryFile(filePath);
      const knowledge = this.memoryLoop.extractKnowledge(record);
      
      console.log(`[MemoryFileWatcher] 自动处理: ${filePath}`);
      console.log(`[MemoryFileWatcher] 提取到 ${knowledge.concepts.length} 个概念, ${knowledge.relations.length} 个关系`);
      
      await this.memoryLoop.enrichGraph(knowledge);
      
      this.emit('processed', {
        path: filePath,
        knowledge,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[MemoryFileWatcher] 处理失败: ${filePath}`, error);
      this.emit('error', {
        path: filePath,
        error,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 是否应该自动处理
   */
  private shouldAutoProcess(event: FileWatcherEvent): boolean {
    return (
      this.config.events.includes(event) &&
      (event === FileWatcherEvent.ADD || event === FileWatcherEvent.CHANGE)
    );
  }

  /**
   * 扫描现有文件
   */
  private async scanExistingFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.watchDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          this.knownFiles.add(file);
        }
      }
      console.log(`[MemoryFileWatcher] 已扫描 ${this.knownFiles.size} 个现有文件`);
    } catch {
      // 目录可能不存在，忽略
    }
  }
}

/**
 * 创建文件监听器
 */
export function createFileWatcher(config?: Partial<FileWatcherConfig>): MemoryFileWatcher {
  return new MemoryFileWatcher(config);
}

/**
 * 监听事件类型
 */
export interface WatcherProcessedEvent {
  path: string;
  knowledge: ExtractedKnowledge;
  timestamp: number;
}

export interface WatcherErrorEvent {
  path: string;
  error: unknown;
  timestamp: number;
}
