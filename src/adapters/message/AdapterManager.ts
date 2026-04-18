/**
 * AdapterManager - 适配器管理器
 * 统一管理多个平台适配器,负责消息路由和分发
 */

import { EventEmitter } from 'events';
import type {
  MessageAdapter,
  MessageContent,
  MessageContext,
  MessageResult,
  MessageHandler,
  AdapterConfig,
  UnifiedAdapterConfig,
  AdapterStatus,
  PlatformEvent,
} from './types';

// 导入各平台适配器
import { FeishuAdapter } from './FeishuAdapter';
import { WeComAdapter } from './WeComAdapter';
import { WechatAdapter } from './WechatAdapter';

/** 适配器注册信息 */
interface AdapterRegistration {
  /** 适配器实例 */
  adapter: MessageAdapter;
  /** 配置 */
  config: AdapterConfig;
  /** 状态 */
  status: AdapterStatus;
  /** 消息处理器 */
  handlers: Set<MessageHandler>;
}

/** 路由规则 */
interface RoutingRule {
  /** 匹配条件 */
  match: {
    platform?: string;
    sessionType?: 'p2p' | 'group' | 'channel';
    channelId?: string;
    senderId?: string;
    keyword?: RegExp;
  };
  /** 目标Agent ID */
  agentId: string;
  /** 优先级 (数字越小优先级越高) */
  priority: number;
}

/**
 * 适配器管理器
 * 
 * 功能:
 * - 统一管理多个平台适配器
 * - 消息路由和分发
 * - 状态监控
 * - 故障转移
 * 
 * @example
 * ```typescript
 * const manager = new AdapterManager({
 *   feishu: { appId: 'xxx', appSecret: 'xxx', enabled: true },
 *   wecom: { corpId: 'xxx', agentId: 1000001, enabled: true },
 * });
 * 
 * manager.onMessage('feishu', async (ctx) => {
 *   console.log('Feishu message:', ctx.content.content);
 * });
 * 
 * await manager.connectAll();
 * ```
 */
export class AdapterManager extends EventEmitter {
  /** 适配器注册表 */
  private adapters = new Map<string, AdapterRegistration>();
  
  /** 路由规则列表 */
  private routingRules: RoutingRule[] = [];
  
  /** 全局消息处理器 */
  private globalHandlers: Set<MessageHandler> = new Set();
  
  /** 默认Agent ID */
  private defaultAgentId: string = 'default';
  
  /** 配置文件 */
  private config: UnifiedAdapterConfig;

  constructor(config: UnifiedAdapterConfig = {}) {
    super();
    this.config = config;
    
    // 自动注册配置的平台适配器
    this.registerConfiguredAdapters();
  }

  /**
   * 注册配置好的适配器
   */
  private registerConfiguredAdapters(): void {
    // 注册飞书适配器
    if (this.config.feishu?.enabled) {
      const adapter = new FeishuAdapter(this.config.feishu);
      this.registerAdapter('feishu', adapter, this.config.feishu);
    }

    // 注册企业微信适配器
    if (this.config.wecom?.enabled) {
      const adapter = new WeComAdapter(this.config.wecom);
      this.registerAdapter('wecom', adapter, this.config.wecom);
    }

    // 注册微信适配器
    if (this.config.wechat?.enabled) {
      const adapter = new WechatAdapter(this.config.wechat);
      this.registerAdapter('wechat', adapter, this.config.wechat);
    }
  }

  /**
   * 注册适配器
   */
  registerAdapter(platform: string, adapter: MessageAdapter, config: AdapterConfig): void {
    const registration: AdapterRegistration = {
      adapter,
      config,
      status: {
        platform,
        connected: false,
        stats: {
          messagesReceived: 0,
          messagesSent: 0,
          errors: 0,
        },
      },
      handlers: new Set(),
    };

    // 注册消息处理器
    adapter.onMessage((context) => {
      this.handleMessage(platform, context);
    });

    // 注册事件处理器
    adapter.on('error', (error) => {
      this.handleAdapterError(platform, error);
    });

    this.adapters.set(platform, registration);
    console.log(`[AdapterManager] Registered adapter: ${platform}`);
  }

  /**
   * 注销适配器
   */
  unregisterAdapter(platform: string): void {
    const registration = this.adapters.get(platform);
    if (registration) {
      if (registration.status.connected) {
        registration.adapter.disconnect();
      }
      this.adapters.delete(platform);
      console.log(`[AdapterManager] Unregistered adapter: ${platform}`);
    }
  }

  /**
   * 连接指定平台适配器
   */
  async connect(platform: string): Promise<void> {
    const registration = this.adapters.get(platform);
    if (!registration) {
      throw new Error(`Adapter not found: ${platform}`);
    }

    try {
      await registration.adapter.connect();
      registration.status.connected = true;
      registration.status.connectedAt = new Date();
      console.log(`[AdapterManager] Connected: ${platform}`);
    } catch (error) {
      registration.status.error = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  /**
   * 连接所有已注册且启用的适配器
   */
  async connectAll(): Promise<void> {
    const connectPromises: Promise<void>[] = [];

    for (const [platform, registration] of this.adapters) {
      if (registration.config.enabled && !registration.status.connected) {
        connectPromises.push(this.connect(platform));
      }
    }

    await Promise.allSettled(connectPromises);
  }

  /**
   * 断开指定平台适配器
   */
  async disconnect(platform: string): Promise<void> {
    const registration = this.adapters.get(platform);
    if (!registration) {
      return;
    }

    await registration.adapter.disconnect();
    registration.status.connected = false;
    console.log(`[AdapterManager] Disconnected: ${platform}`);
  }

  /**
   * 断开所有适配器
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const [platform] of this.adapters) {
      disconnectPromises.push(this.disconnect(platform));
    }

    await Promise.allSettled(disconnectPromises);
  }

  /**
   * 发送消息到指定平台
   */
  async sendMessage(
    platform: string,
    to: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    const registration = this.adapters.get(platform);
    if (!registration) {
      return { success: false, error: `Adapter not found: ${platform}` };
    }

    if (!registration.status.connected) {
      return { success: false, error: `Adapter not connected: ${platform}` };
    }

    const result = await registration.adapter.sendMessage(to, content, context);
    
    if (result.success) {
      registration.status.stats.messagesSent++;
    }

    return result;
  }

  /**
   * 回复消息
   */
  async replyMessage(
    platform: string,
    messageId: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    const registration = this.adapters.get(platform);
    if (!registration) {
      return { success: false, error: `Adapter not found: ${platform}` };
    }

    const result = await registration.adapter.replyMessage(messageId, content, context);
    
    if (result.success) {
      registration.status.stats.messagesSent++;
    }

    return result;
  }

  /**
   * 获取适配器状态
   */
  getAdapterStatus(platform: string): AdapterStatus | null {
    const registration = this.adapters.get(platform);
    return registration ? { ...registration.status } : null;
  }

  /**
   * 获取所有适配器状态
   */
  getAllStatus(): Map<string, AdapterStatus> {
    const statusMap = new Map<string, AdapterStatus>();
    
    for (const [platform, registration] of this.adapters) {
      statusMap.set(platform, { ...registration.status });
    }

    return statusMap;
  }

  /**
   * 获取已连接的平台列表
   */
  getConnectedPlatforms(): string[] {
    const connected: string[] = [];
    
    for (const [platform, registration] of this.adapters) {
      if (registration.status.connected) {
        connected.push(platform);
      }
    }

    return connected;
  }

  /**
   * 添加路由规则
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    // 按优先级排序
    this.routingRules.sort((a, b) => a.priority - b.priority);
    console.log(`[AdapterManager] Added routing rule: ${rule.agentId}`);
  }

  /**
   * 移除路由规则
   */
  removeRoutingRule(agentId: string): void {
    this.routingRules = this.routingRules.filter(r => r.agentId !== agentId);
  }

  /**
   * 设置默认Agent
   */
  setDefaultAgent(agentId: string): void {
    this.defaultAgentId = agentId;
  }

  /**
   * 注册全局消息处理器
   */
  onMessage(handler: MessageHandler): void {
    this.globalHandlers.add(handler);
  }

  /**
   * 移除全局消息处理器
   */
  offMessage(handler: MessageHandler): void {
    this.globalHandlers.delete(handler);
  }

  /**
   * 注册指定平台的消息处理器
   */
  onPlatformMessage(platform: string, handler: MessageHandler): void {
    const registration = this.adapters.get(platform);
    if (registration) {
      registration.handlers.add(handler);
    }
  }

  /**
   * 移除指定平台的消息处理器
   */
  offPlatformMessage(platform: string, handler: MessageHandler): void {
    const registration = this.adapters.get(platform);
    if (registration) {
      registration.handlers.delete(handler);
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(platform: string, context: MessageContext): void {
    const registration = this.adapters.get(platform);
    if (!registration) return;

    // 更新时间戳
    registration.status.lastMessageAt = new Date();
    registration.status.stats.messagesReceived++;

    // 确定目标Agent
    const agentId = this.resolveAgent(context);

    // 创建增强的上下文
    const enhancedContext: MessageContext & { agentId: string; platform: string } = {
      ...context,
      agentId,
      platform,
    };

    // 触发平台特定处理器
    for (const handler of registration.handlers) {
      try {
        handler(enhancedContext);
      } catch (error) {
        console.error(`[AdapterManager] Handler error (${platform}):`, error);
        registration.status.stats.errors++;
      }
    }

    // 触发全局处理器
    for (const handler of this.globalHandlers) {
      try {
        handler(enhancedContext);
      } catch (error) {
        console.error('[AdapterManager] Global handler error:', error);
      }
    }

    // 发送消息事件
    this.emit('message', enhancedContext);
  }

  /**
   * 根据路由规则解析目标Agent
   */
  private resolveAgent(context: MessageContext): string {
    for (const rule of this.routingRules) {
      if (this.matchRule(rule.match, context)) {
        return rule.agentId;
      }
    }
    return this.defaultAgentId;
  }

  /**
   * 检查消息是否匹配路由规则
   */
  private matchRule(match: RoutingRule['match'], context: MessageContext): boolean {
    if (match.platform && match.platform !== context.platform) {
      return false;
    }

    if (match.sessionType && match.sessionType !== context.sessionType) {
      return false;
    }

    if (match.channelId && match.channelId !== context.channelId) {
      return false;
    }

    if (match.senderId && match.senderId !== context.sender.userId) {
      return false;
    }

    if (match.keyword && !match.keyword.test(context.content.content)) {
      return false;
    }

    return true;
  }

  /**
   * 处理适配器错误
   */
  private handleAdapterError(platform: string, error: unknown): void {
    const registration = this.adapters.get(platform);
    if (registration) {
      registration.status.stats.errors++;
      registration.status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.emit('error', { platform, error });

    // 自动重连
    this.autoReconnect(platform);
  }

  /**
   * 自动重连
   */
  private async autoReconnect(platform: string, maxRetries = 3): Promise<void> {
    const registration = this.adapters.get(platform);
    if (!registration) return;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[AdapterManager] Reconnecting ${platform} (attempt ${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
        await this.connect(platform);
        console.log(`[AdapterManager] Reconnected: ${platform}`);
        return;
      } catch {
        // 继续重试
      }
    }

    console.error(`[AdapterManager] Failed to reconnect ${platform} after ${maxRetries} attempts`);
    this.emit('reconnect_failed', { platform });
  }

  /**
   * 转发消息到其他平台
   */
  async forwardMessage(
    fromPlatform: string,
    toPlatform: string,
    messageId: string,
    context: MessageContext
  ): Promise<MessageResult> {
    // 获取原始消息内容
    // 注意: 这里需要存储原始消息内容或重新构建
    const content: MessageContent = {
      type: 'text',
      content: context.content.content,
    };

    // 发送到目标平台
    return this.sendMessage(toPlatform, context.sender.userId, content, context);
  }

  /**
   * 广播消息到所有已连接平台
   */
  async broadcastMessage(
    content: MessageContent,
    excludePlatforms: string[] = []
  ): Promise<Map<string, MessageResult>> {
    const results = new Map<string, MessageResult>();

    for (const [platform, registration] of this.adapters) {
      if (
        registration.status.connected &&
        !excludePlatforms.includes(platform)
      ) {
        // 广播到每个平台的会话
        const result = await registration.adapter.sendMessage(
          registration.config.appId || 'broadcast',
          content
        );
        results.set(platform, result);
      }
    }

    return results;
  }

  /**
   * 获取统计摘要
   */
  getStatsSummary(): {
    totalMessagesReceived: number;
    totalMessagesSent: number;
    totalErrors: number;
    platformStats: Record<string, AdapterStatus['stats']>;
  } {
    const summary = {
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      totalErrors: 0,
      platformStats: {} as Record<string, AdapterStatus['stats']>,
    };

    for (const [platform, registration] of this.adapters) {
      const stats = registration.status.stats;
      summary.totalMessagesReceived += stats.messagesReceived;
      summary.totalMessagesSent += stats.messagesSent;
      summary.totalErrors += stats.errors;
      summary.platformStats[platform] = { ...stats };
    }

    return summary;
  }
}

export default AdapterManager;
