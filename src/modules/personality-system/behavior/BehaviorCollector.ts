/**
 * BehaviorCollector.ts
 * 行为数据收集器
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import { BehaviorData, PersonalitySystemConfig } from '../../../core/interfaces/IPersonalitySystem';

/**
 * 行为收集配置
 */
export interface CollectorConfig {
  /** 最大缓存行为数 */
  maxCachedBehaviors: number;
  /** 缓存过期时间（毫秒） */
  cacheExpirationMs: number;
  /** 是否启用实时收集 */
  enableRealTimeCollection: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: CollectorConfig = {
  maxCachedBehaviors: 1000,
  cacheExpirationMs: 3600000, // 1小时
  enableRealTimeCollection: true
};

/**
 * 行为收集器类
 * 
 * 负责收集、缓存和管理用户行为数据
 * 支持实时收集和批量导入
 * 
 * @example
 * ```typescript
 * const collector = new BehaviorCollector();
 * collector.initialize(config);
 * 
 * // 添加行为
 * await collector.addBehavior({
 *   id: uuidv4(),
 *   userId: 'user_123',
 *   tenantId: 'tenant_abc',
 *   type: 'chat',
 *   content: '用户说的话',
 *   timestamp: new Date()
 * });
 * 
 * // 获取行为列表
 * const behaviors = await collector.getBehaviors('user_123', 'tenant_abc');
 * ```
 */
export class BehaviorCollector {
  /** 配置 */
  private config: CollectorConfig;
  
  /** 行为缓存（key: userId:tenantId） */
  private behaviorCache: Map<string, BehaviorData[]> = new Map();
  
  /** 缓存时间戳 */
  private cacheTimestamps: Map<string, number> = new Map();
  
  /** 事件处理器 */
  private eventHandlers: Map<string, Function[]> = new Map();

  /**
   * 构造函数
   */
  constructor() {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * 初始化收集器
   * @param config 系统配置
   */
  initialize(config: PersonalitySystemConfig): void {
    if (config) {
      this.config = {
        maxCachedBehaviors: config.maxEvidenceCount || DEFAULT_CONFIG.maxCachedBehaviors,
        cacheExpirationMs: DEFAULT_CONFIG.cacheExpirationMs,
        enableRealTimeCollection: true
      };
    }
  }

  /**
   * 添加行为数据
   * @param behavior 行为数据
   */
  async addBehavior(behavior: BehaviorData): Promise<void> {
    // 生成ID
    if (!behavior.id) {
      behavior.id = `behavior_${uuidv4()}`;
    }

    // 确保时间戳
    if (!behavior.timestamp) {
      behavior.timestamp = new Date();
    }

    const cacheKey = this.getCacheKey(behavior.userId, behavior.tenantId);

    // 获取或创建缓存
    if (!this.behaviorCache.has(cacheKey)) {
      this.behaviorCache.set(cacheKey, []);
    }

    const behaviors = this.behaviorCache.get(cacheKey)!;
    
    // 添加到缓存头部（最新在前）
    behaviors.unshift(behavior);

    // 限制缓存大小
    if (behaviors.length > this.config.maxCachedBehaviors) {
      behaviors.pop();
    }

    // 更新缓存时间戳
    this.cacheTimestamps.set(cacheKey, Date.now());

    // 触发事件
    this.emit('behaviorAdded', behavior);
  }

  /**
   * 批量添加行为数据
   * @param behaviors 行为数据列表
   */
  async addBehaviors(behaviors: BehaviorData[]): Promise<void> {
    // 按用户分组
    const groupedBehaviors = new Map<string, BehaviorData[]>();
    
    for (const behavior of behaviors) {
      const key = this.getCacheKey(behavior.userId, behavior.tenantId);
      if (!groupedBehaviors.has(key)) {
        groupedBehaviors.set(key, []);
      }
      groupedBehaviors.get(key)!.push(behavior);
    }

    // 批量添加到缓存
    for (const [cacheKey, batch] of groupedBehaviors) {
      const behaviors = this.behaviorCache.get(cacheKey) || [];
      
      // 添加到缓存头部
      behaviors.unshift(...batch);

      // 限制缓存大小
      while (behaviors.length > this.config.maxCachedBehaviors) {
        behaviors.pop();
      }

      this.behaviorCache.set(cacheKey, behaviors);
      this.cacheTimestamps.set(cacheKey, Date.now());
    }

    this.emit('behaviorsBatchAdded', { count: behaviors.length });
  }

  /**
   * 获取用户行为数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param options 获取选项
   */
  async getBehaviors(
    userId: string,
    tenantId: string,
    options?: {
      limit?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<BehaviorData[]> {
    const cacheKey = this.getCacheKey(userId, tenantId);
    let behaviors = this.behaviorCache.get(cacheKey) || [];

    // 检查缓存过期
    const cacheTime = this.cacheTimestamps.get(cacheKey);
    if (cacheTime && Date.now() - cacheTime > this.config.cacheExpirationMs) {
      // 缓存过期，清除
      this.behaviorCache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      behaviors = [];
    }

    // 应用筛选条件
    if (options) {
      if (options.type) {
        behaviors = behaviors.filter(b => b.type === options.type);
      }

      if (options.startDate) {
        behaviors = behaviors.filter(
          b => new Date(b.timestamp) >= options.startDate!
        );
      }

      if (options.endDate) {
        behaviors = behaviors.filter(
          b => new Date(b.timestamp) <= options.endDate!
        );
      }

      if (options.limit && options.limit > 0) {
        behaviors = behaviors.slice(0, options.limit);
      }
    }

    return behaviors;
  }

  /**
   * 获取行为统计信息
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getBehaviorStats(
    userId: string,
    tenantId: string
  ): Promise<{
    totalCount: number;
    byType: Record<string, number>;
    byDate: Record<string, number>;
  }> {
    const behaviors = await this.getBehaviors(userId, tenantId);
    
    const stats = {
      totalCount: behaviors.length,
      byType: {} as Record<string, number>,
      byDate: {} as Record<string, number>
    };

    for (const behavior of behaviors) {
      // 按类型统计
      stats.byType[behavior.type] = (stats.byType[behavior.type] || 0) + 1;

      // 按日期统计
      const dateKey = new Date(behavior.timestamp).toISOString().split('T')[0];
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
    }

    return stats;
  }

  /**
   * 删除行为数据
   * @param behaviorId 行为ID
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async deleteBehavior(
    behaviorId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(userId, tenantId);
    const behaviors = this.behaviorCache.get(cacheKey);

    if (!behaviors) {
      return false;
    }

    const index = behaviors.findIndex(b => b.id === behaviorId);
    
    if (index === -1) {
      return false;
    }

    behaviors.splice(index, 1);
    return true;
  }

  /**
   * 清除用户行为缓存
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async clearCache(userId: string, tenantId: string): Promise<void> {
    const cacheKey = this.getCacheKey(userId, tenantId);
    this.behaviorCache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    this.behaviorCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(userId: string, tenantId: string): string {
    return `${tenantId}:${userId}`;
  }

  /**
   * 监听事件
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * 取消监听
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[BehaviorCollector] Error in event handler:`, error);
        }
      }
    }
  }
}

export default BehaviorCollector;
