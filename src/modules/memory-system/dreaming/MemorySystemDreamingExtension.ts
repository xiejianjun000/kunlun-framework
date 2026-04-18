/**
 * MemorySystemDreamingExtension.ts - MemorySystem的Dreaming扩展
 * 
 * 提供将Dreaming集成到现有MemorySystem的扩展方法
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  MemoryDreamingIntegration,
  RecallTracker,
  DreamingConfig,
  DreamingResult
} from './index';

/**
 * MemorySystem Dreaming扩展接口
 */
export interface IMemorySystemWithDreaming {
  // Dreaming相关
  workspaceDir?: string;
  dreamingIntegration: MemoryDreamingIntegration | null;
  initializeDreaming(config?: Partial<DreamingConfig>): Promise<void>;
  enableDreaming(): void;
  disableDreaming(): void;
  triggerDreaming(): Promise<DreamingResult>;
  recordMemoryRecall(query: string, results: any[]): Promise<void>;
  getDreamingStatus(): any;
}

/**
 * 扩展MemorySystem类
 */
export function extendMemorySystemWithDreaming(
  MemorySystemClass: new (...args: any[]) => any
): new (...args: any[]) => IMemorySystemWithDreaming {
  
  return class ExtendedMemorySystem extends MemorySystemClass implements IMemorySystemWithDreaming {
    public dreamingIntegration: MemoryDreamingIntegration | null = null;

    /**
     * 初始化Dreaming
     */
    async initializeDreaming(config?: Partial<DreamingConfig>): Promise<void> {
      if (this.dreamingIntegration) {
        console.warn('[MemorySystem] Dreaming已初始化，跳过');
        return;
      }

      // 获取工作目录
      const workspaceDir = this.workspaceDir || process.cwd();
      
      this.dreamingIntegration = new MemoryDreamingIntegration({
        workspaceDir,
        dreamingConfig: {
          enabled: true,
          cron: config?.cron || '0 3 * * *', // 默认凌晨3点
          timezone: config?.timezone || 'Asia/Shanghai',
          limit: config?.limit || 10,
          minScore: config?.minScore || 0.75,
          minRecallCount: config?.minRecallCount || 3,
          minUniqueQueries: config?.minUniqueQueries || 2,
          lookbackDays: config?.lookbackDays || 7
        },
        onDreamingComplete: (result: DreamingResult) => {
          console.log(`[MemorySystem] Dreaming完成: 提升${result.totalPromoted}条记忆`);
        },
        onPhaseStart: (phase) => {
          console.log(`[MemorySystem] Dreaming阶段开始: ${phase}`);
        }
      });

      await this.dreamingIntegration.initialize();
      this.dreamingIntegration.start();

      console.log('[MemorySystem] Dreaming已初始化并启动');
    }

    /**
     * 启用Dreaming
     */
    enableDreaming(): void {
      if (!this.dreamingIntegration) {
        throw new Error('请先调用initializeDreaming()');
      }
      this.dreamingIntegration.updateConfig({ enabled: true });
      console.log('[MemorySystem] Dreaming已启用');
    }

    /**
     * 禁用Dreaming
     */
    disableDreaming(): void {
      if (!this.dreamingIntegration) {
        throw new Error('请先调用initializeDreaming()');
      }
      this.dreamingIntegration.updateConfig({ enabled: false });
      console.log('[MemorySystem] Dreaming已禁用');
    }

    /**
     * 手动触发Dreaming
     */
    async triggerDreaming(): Promise<DreamingResult> {
      if (!this.dreamingIntegration) {
        throw new Error('请先调用initializeDreaming()');
      }
      return this.dreamingIntegration.trigger();
    }

    /**
     * 记录记忆召回
     * 
      * 在search()方法中调用此方法，自动追踪召回
     */
    async recordMemoryRecall(query: string, results: any[]): Promise<void> {
      if (!this.dreamingIntegration) {
        return; // Dreaming未初始化，静默跳过
      }

      try {
        await this.dreamingIntegration.recordRecall({
          query,
          results: results.map(r => ({
            path: r.path,
            startLine: r.startLine,
            endLine: r.endLine,
            score: r.score,
            snippet: r.snippet
          }))
        });
      } catch (error) {
        console.error('[MemorySystem] 记录召回失败:', error);
      }
    }

    /**
     * 获取Dreaming状态
     */
    getDreamingStatus() {
      if (!this.dreamingIntegration) {
        return { initialized: false, enabled: false };
      }
      return {
        initialized: true,
        ...this.dreamingIntegration.getStatus()
      };
    }

    /**
     * 销毁Dreaming
     */
    async destroyDreaming(): Promise<void> {
      if (this.dreamingIntegration) {
        await this.dreamingIntegration.destroy();
        this.dreamingIntegration = null;
        console.log('[MemorySystem] Dreaming已销毁');
      }
    }
  };
}

/**
 * 创建带有Dreaming的MemorySystem实例
 */
export async function createMemorySystemWithDreaming(
  workspaceDir: string,
  config?: {
    memoryConfig?: any;
    dreamingConfig?: Partial<DreamingConfig>;
  }
): Promise<IMemorySystemWithDreaming> {
  // 注意：这里需要根据你的实际MemorySystem实现进行调整
  // 下面的代码是示例，需要根据实际情况修改
  
  interface BasicMemorySystem {
    workspaceDir: string;
    search(query: string): Promise<any[]>;
  }

  // 创建一个基础的MemorySystem模拟
  const memorySystem: IMemorySystemWithDreaming = {
    workspaceDir,
    dreamingIntegration: null,
    
    async initializeDreaming(dreamingConfig) {
      this.dreamingIntegration = new MemoryDreamingIntegration({
        workspaceDir,
        dreamingConfig: {
          enabled: true,
          cron: dreamingConfig?.cron || '0 3 * * *',
          timezone: dreamingConfig?.timezone || 'Asia/Shanghai',
          limit: dreamingConfig?.limit || 10,
          minScore: dreamingConfig?.minScore || 0.75,
          minRecallCount: dreamingConfig?.minRecallCount || 3,
          minUniqueQueries: dreamingConfig?.minUniqueQueries || 2,
          lookbackDays: dreamingConfig?.lookbackDays || 7
        }
      });
      await this.dreamingIntegration.initialize();
      this.dreamingIntegration.start();
    },
    
    enableDreaming() {
      if (this.dreamingIntegration) {
        this.dreamingIntegration.updateConfig({ enabled: true });
      }
    },
    
    disableDreaming() {
      if (this.dreamingIntegration) {
        this.dreamingIntegration.updateConfig({ enabled: false });
      }
    },
    
    async triggerDreaming() {
      if (!this.dreamingIntegration) {
        throw new Error('Dreaming未初始化');
      }
      return this.dreamingIntegration.trigger();
    },
    
    async recordMemoryRecall(query, results) {
      if (this.dreamingIntegration) {
        await this.dreamingIntegration.recordRecall({
          query,
          results: results.map(r => ({
            path: r.path,
            startLine: r.startLine,
            endLine: r.endLine,
            score: r.score,
            snippet: r.snippet
          }))
        });
      }
    },
    
    getDreamingStatus() {
      if (!this.dreamingIntegration) {
        return { initialized: false, enabled: false };
      }
      return {
        initialized: true,
        ...this.dreamingIntegration.getStatus()
      };
    }
  };
  
  // 如果提供了dreamingConfig，自动初始化
  if (config?.dreamingConfig) {
    await memorySystem.initializeDreaming(config.dreamingConfig);
  }
  
  return memorySystem;
}

/**
 * 示例：在现有MemorySystem中集成Dreaming
 * 
 * ```typescript
 * import { MemorySystem } from './MemorySystem';
 * import { extendMemorySystemWithDreaming } from './MemoryDreamingExtension';
 * 
 * // 扩展MemorySystem
 * const DreamingMemorySystem = extendMemorySystemWithDreaming(MemorySystem);
 * 
 * // 创建实例
 * const memorySystem = new DreamingMemorySystem({
 *   workspaceDir: '/path/to/workspace'
 * });
 * 
 * // 初始化Dreaming
 * await memorySystem.initializeDreaming({
 *   cron: '0 3 * * *',
 *   limit: 10,
 *   minScore: 0.75
 * });
 * 
 * // 在搜索时记录召回
 * const results = await memorySystem.search('环评报告');
 * await memorySystem.recordMemoryRecall('环评报告', results);
 * 
 * // 获取状态
 * const status = memorySystem.getDreamingStatus();
 * console.log(status);
 * 
 * // 手动触发Dreaming
 * const result = await memorySystem.triggerDreaming();
 * console.log(result);
 * ```
 */

export default {
  extendMemorySystemWithDreaming,
  createMemorySystemWithDreaming
};
