/**
 * 反馈记忆系统模块
 * Feedback Memory System - 闭环学习实现
 * 
 * Q&A → Markdown → Graph Enrichment
 */

// 类型导出
export {
  MemoryRecord,
  ExtractedKnowledge,
  KnowledgeRelation,
  MemoryLoopConfig,
  GraphInjector,
  FileWatcherConfig,
  FileWatcherEvent,
  FileChangeEvent,
  MemoryLoopStats,
  MarkdownFormatOptions,
} from './types';

export type {
  WatcherProcessedEvent,
  WatcherErrorEvent,
} from './MemoryFileWatcher';

// 核心类导出
export { MemoryLoop, createMemoryLoop } from './MemoryLoop';
export { MemoryFileWatcher, createFileWatcher } from './MemoryFileWatcher';

// 默认图谱注入器（基于 Neo4j）
export { Neo4jGraphInjector, createNeo4jGraphInjector } from './injectors/Neo4jGraphInjector';

/**
 * 便捷函数：创建完整的记忆循环系统
 */
import { MemoryLoop, createMemoryLoop } from './MemoryLoop';
import { MemoryFileWatcher, createFileWatcher } from './MemoryFileWatcher';
import { Neo4jGraphInjector, createNeo4jGraphInjector } from './injectors/Neo4jGraphInjector';
import { MemoryLoopConfig } from './types';

export interface MemoryFeedbackSystem {
  /** 记忆循环 */
  memoryLoop: MemoryLoop;
  /** 文件监听器 */
  fileWatcher: MemoryFileWatcher;
  /** 初始化 */
  initialize: () => Promise<void>;
  /** 销毁 */
  destroy: () => Promise<void>;
}

/**
 * 创建完整的反馈记忆系统
 * 
 * @example
 * ```typescript
 * const system = await createMemoryFeedbackSystem({
 *   memoryDir: './.taiji-memory',
 *   neo4jConfig: {
 *     url: 'bolt://localhost:7687',
 *     user: 'neo4j',
 *     password: 'password'
 *   }
 * });
 * 
 * // 保存 Q&A
 * await system.memoryLoop.saveQARecord(
 *   '什么是闭包？',
 *   '闭包是...',
 *   ['closure', 'javascript']
 * );
 * 
 * // 系统会自动监听文件变化并更新图谱
 * ```
 */
export async function createMemoryFeedbackSystem(
  config: Partial<MemoryLoopConfig> & {
    neo4jConfig?: {
      url: string;
      user: string;
      password: string;
    };
  }
): Promise<MemoryFeedbackSystem> {
  // 创建图谱注入器
  const graphInjector = config.neo4jConfig
    ? createNeo4jGraphInjector(config.neo4jConfig)
    : undefined;

  // 创建记忆循环
  const memoryLoop = createMemoryLoop({
    ...config,
    graphInjector,
    autoEnrichGraph: true,
  });

  // 创建文件监听器
  const fileWatcher = createFileWatcher({
    watchDir: config.memoryDir || '.taiji-memory',
  });
  fileWatcher.setMemoryLoop(memoryLoop);

  return {
    memoryLoop,
    fileWatcher,
    
    async initialize() {
      await memoryLoop.initialize();
      await fileWatcher.start();
    },
    
    async destroy() {
      await fileWatcher.stop();
    },
  };
}
