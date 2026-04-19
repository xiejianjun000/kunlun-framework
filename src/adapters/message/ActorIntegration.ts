/**
 * ActorSystem Integration for Message Adapters
 * 消息适配器与ActorSystem的集成
 * 
 * 功能:
 * - 将平台消息转换为Actor消息
 * - 消息路由到对应处理Actor
 * - 支持Actor回复回传到平台
 */

import { EventEmitter } from 'events';
import type { ActorRef, ActorSystem, ActorMessage } from './actor';
import type {
  MessageContext,
  MessageContent,
  MessageResult,
  PlatformEvent,
} from './types';
import { AdapterManager } from './AdapterManager';

/** Actor消息类型 */
export type AdapterActorMessageType = 
  | 'InboundMessage'      // 收到的平台消息
  | 'OutboundMessage'     // 发送消息请求
  | 'ReplyMessage'        // 回复消息请求
  | 'MessageResult'        // 消息发送结果
  | 'PlatformEvent'        // 平台事件
  | 'DeliveryReport';      // 投递报告

/** 入站消息Actor消息 */
export interface InboundMessageActorMessage extends ActorMessage {
  type: 'InboundMessage';
  payload: {
    platform: string;
    context: MessageContext;
    replyToken?: string;  // 用于异步回复的token
  };
}

/** 出站消息Actor消息 */
export interface OutboundMessageActorMessage extends ActorMessage {
  type: 'OutboundMessage';
  payload: {
    platform: string;
    to: string;
    content: MessageContent;
    sessionId?: string;
    replyToMessageId?: string;
    correlationId?: string;
  };
}

/** 回复消息Actor消息 */
export interface ReplyMessageActorMessage extends ActorMessage {
  type: 'ReplyMessage';
  payload: {
    platform: string;
    originalMessageId: string;
    content: MessageContent;
    correlationId?: string;
  };
}

/** 消息结果Actor消息 */
export interface MessageResultActorMessage extends ActorMessage {
  type: 'MessageResult';
  payload: {
    correlationId?: string;
    success: boolean;
    messageId?: string;
    error?: string;
    platform: string;
  };
}

/** 平台事件Actor消息 */
export interface PlatformEventActorMessage extends ActorMessage {
  type: 'PlatformEvent';
  payload: {
    platform: string;
    event: PlatformEvent;
  };
}

/** 投递报告Actor消息 */
export interface DeliveryReportActorMessage extends ActorMessage {
  type: 'DeliveryReport';
  payload: {
    messageId: string;
    status: 'delivered' | 'read' | 'failed';
    timestamp: number;
    platform: string;
  };
}

/** 所有适配器Actor消息类型 */
export type AdapterActorMessage = 
  | InboundMessageActorMessage
  | OutboundMessageActorMessage
  | ReplyMessageActorMessage
  | MessageResultActorMessage
  | PlatformEventActorMessage
  | DeliveryReportActorMessage;

/** 消息处理器Actor */
export interface MessageHandlerActor {
  /** Actor ID */
  id: string;
  /** 处理消息 */
  handle(message: InboundMessageActorMessage): Promise<void>;
}

/** 会话映射信息 */
interface SessionMapping {
  sessionId: string;
  agentId: string;
  platform: string;
  channelId: string;
  createdAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * 适配器Actor系统
 * 
 * 负责:
 * - 管理适配器与ActorSystem的连接
 * - 消息路由和分发
 * - 会话管理
 * - 消息追踪
 */
export class AdapterActorSystem {
  /** 适配器管理器 */
  private adapterManager: AdapterManager;
  
  /** Actor系统 */
  private actorSystem?: ActorSystem;
  
  /** 消息处理器Actor列表 */
  private handlerActors: Map<string, MessageHandlerActor> = new Map();
  
  /** 会话映射表 */
  private sessions: Map<string, SessionMapping> = new Map();
  
  /** 消息ID追踪 */
  private messageTracking: Map<string, {
    platform: string;
    correlationId: string;
    createdAt: Date;
  }> = new Map();
  
  /** 事件发射器 */
  private eventEmitter = new EventEmitter();

  constructor(adapterManager: AdapterManager) {
    this.adapterManager = adapterManager;
    this.setupAdapterHandlers();
  }

  /**
   * 初始化与ActorSystem的连接
   */
  async initialize(actorSystem: ActorSystem): Promise<void> {
    this.actorSystem = actorSystem;
    console.log('[AdapterActorSystem] Initialized with ActorSystem');
  }

  /**
   * 设置适配器消息处理器
   */
  private setupAdapterHandlers(): void {
    // 处理所有平台的入站消息
    this.adapterManager.onMessage(async (context) => {
      await this.routeInboundMessage(context.platform, context);
    });

    // 处理适配器错误
    this.adapterManager.on('error', ({ platform, error }) => {
      this.eventEmitter.emit('adapter_error', { platform, error });
    });
  }

  /**
   * 注册消息处理器Actor
   */
  registerHandlerActor(actor: MessageHandlerActor): void {
    this.handlerActors.set(actor.id, actor);
    console.log(`[AdapterActorSystem] Registered handler actor: ${actor.id}`);
  }

  /**
   * 注销消息处理器Actor
   */
  unregisterHandlerActor(actorId: string): void {
    this.handlerActors.delete(actorId);
    console.log(`[AdapterActorSystem] Unregistered handler actor: ${actorId}`);
  }

  /**
   * 路由入站消息到Actor
   */
  private async routeInboundMessage(platform: string, context: MessageContext): Promise<void> {
    // 创建入站消息Actor消息
    const inboundMessage: InboundMessageActorMessage = {
      id: this.generateMessageId(),
      type: 'InboundMessage',
      payload: {
        platform,
        context,
        replyToken: this.generateReplyToken(),
      },
      timestamp: Date.now(),
    };

    // 确定处理该消息的Actor
    const agentId = this.resolveAgent(context);
    
    // 查找或创建会话
    const sessionId = this.resolveOrCreateSession(platform, context, agentId);
    
    // 更新会话活动
    this.updateSessionActivity(sessionId);

    // 发送消息到Actor系统
    if (this.actorSystem) {
      await this.sendToActor(agentId, inboundMessage);
    }

    // 触发本地处理器
    this.eventEmitter.emit('inbound_message', { platform, context, agentId, sessionId });
  }

  /**
   * 解析目标Agent
   */
  private resolveAgent(context: MessageContext): string {
    // 根据平台和会话类型解析Agent
    // 实际实现可以更复杂,基于配置和规则
    const agentMap: Record<string, string> = {
      'feishu:p2p': 'feishu-p2p-agent',
      'feishu:group': 'feishu-group-agent',
      'wecom:p2p': 'wecom-p2p-agent',
      'wecom:group': 'wecom-group-agent',
      'wechat:p2p': 'wechat-p2p-agent',
      'wechat:group': 'wechat-group-agent',
    };

    const key = `${context.platform}:${context.sessionType}`;
    return agentMap[key] || 'default-agent';
  }

  /**
   * 解析或创建会话
   */
  private resolveOrCreateSession(
    platform: string,
    context: MessageContext,
    agentId: string
  ): string {
    // 使用channelId作为会话ID的基础
    const baseSessionId = `${platform}:${context.channelId}`;
    
    let session = this.sessions.get(baseSessionId);
    
    if (!session) {
      session = {
        sessionId: baseSessionId,
        agentId,
        platform,
        channelId: context.channelId,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        metadata: {},
      };
      this.sessions.set(baseSessionId, session);
      console.log(`[AdapterActorSystem] Created session: ${baseSessionId}`);
    }

    return baseSessionId;
  }

  /**
   * 更新会话活动
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }
  }

  /**
   * 发送消息到Actor
   */
  private async sendToActor(agentId: string, message: AdapterActorMessage): Promise<void> {
    if (!this.actorSystem) {
      console.warn('[AdapterActorSystem] ActorSystem not initialized');
      return;
    }

    // 实际实现中调用actorSystem.send()
    // await this.actorSystem.send(agentId, message);
    console.log(`[AdapterActorSystem] Sent message to actor: ${agentId}`);
  }

  /**
   * 发送出站消息
   */
  async sendOutboundMessage(
    platform: string,
    to: string,
    content: MessageContent,
    options?: {
      sessionId?: string;
      replyToMessageId?: string;
      correlationId?: string;
    }
  ): Promise<MessageResult> {
    const correlationId = options?.correlationId || this.generateMessageId();

    // 追踪消息
    this.messageTracking.set(correlationId, {
      platform,
      correlationId,
      createdAt: new Date(),
    });

    // 通过适配器发送
    let result: MessageResult;
    
    if (options?.replyToMessageId) {
      result = await this.adapterManager.replyMessage(
        platform,
        options.replyToMessageId,
        content
      );
    } else {
      result = await this.adapterManager.sendMessage(platform, to, content);
    }

    // 记录结果
    const tracking = this.messageTracking.get(correlationId);
    if (tracking) {
      this.messageTracking.set(correlationId, {
        ...tracking,
      });
    }

    // 发送结果消息到Actor系统
    if (this.actorSystem) {
      const resultMessage: MessageResultActorMessage = {
        id: this.generateMessageId(),
        type: 'MessageResult',
        payload: {
          correlationId,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          platform,
        },
        timestamp: Date.now(),
      };
      
      // 发送到原始处理Agent
      const agentId = this.resolveAgentByPlatform(platform);
      await this.sendToActor(agentId, resultMessage);
    }

    return result;
  }

  /**
   * 根据平台解析Agent
   */
  private resolveAgentByPlatform(platform: string): string {
    const platformAgents: Record<string, string> = {
      feishu: 'feishu-p2p-agent',
      wecom: 'wecom-p2p-agent',
      wechat: 'wechat-p2p-agent',
    };
    return platformAgents[platform] || 'default-agent';
  }

  /**
   * 回复消息
   */
  async replyToMessage(
    platform: string,
    originalMessageId: string,
    content: MessageContent,
    options?: {
      correlationId?: string;
    }
  ): Promise<MessageResult> {
    return this.adapterManager.replyMessage(platform, originalMessageId, content);
  }

  /**
   * 生成唯一消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成回复Token
   */
  private generateReplyToken(): string {
    return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SessionMapping | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(maxIdleMinutes = 30): SessionMapping[] {
    const now = Date.now();
    const maxIdle = maxIdleMinutes * 60 * 1000;
    
    return Array.from(this.sessions.values()).filter(
      session => (now - session.lastActivityAt.getTime()) < maxIdle
    );
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxIdleMinutes = 60): number {
    const before = this.sessions.size;
    const cutoff = Date.now() - maxIdleMinutes * 60 * 1000;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.lastActivityAt.getTime() < cutoff) {
        this.sessions.delete(sessionId);
      }
    }
    
    return before - this.sessions.size;
  }

  /**
   * 获取消息追踪状态
   */
  getMessageTracking(correlationId: string): {
    platform: string;
    correlationId: string;
    createdAt: Date;
  } | undefined {
    return this.messageTracking.get(correlationId);
  }

  /**
   * 监听入站消息事件
   */
  onInboundMessage(handler: (data: {
    platform: string;
    context: MessageContext;
    agentId: string;
    sessionId: string;
  }) => void): void {
    this.eventEmitter.on('inbound_message', handler);
  }

  /**
   * 监听适配器错误事件
   */
  onAdapterError(handler: (data: { platform: string; error: unknown }) => void): void {
    this.eventEmitter.on('adapter_error', handler);
  }

  /**
   * 关闭系统
   */
  async shutdown(): Promise<void> {
    // 清理会话
    this.sessions.clear();
    
    // 清理追踪
    this.messageTracking.clear();
    
    // 断开所有适配器
    await this.adapterManager.disconnectAll();
    
    console.log('[AdapterActorSystem] Shutdown complete');
  }
}

/**
 * 消息处理器Actor基类
 */
export abstract class BaseMessageHandlerActor implements MessageHandlerActor {
  abstract id: string;
  protected actorSystem: AdapterActorSystem;

  constructor(actorSystem: AdapterActorSystem) {
    this.actorSystem = actorSystem;
  }

  /** 处理入站消息 */
  abstract handle(message: InboundMessageActorMessage): Promise<void>;

  /** 发送回复消息 */
  protected async sendReply(
    platform: string,
    originalMessageId: string,
    content: MessageContent
  ): Promise<MessageResult> {
    return this.actorSystem.replyToMessage(platform, originalMessageId, content);
  }

  /** 发送新消息 */
  protected async sendMessage(
    platform: string,
    to: string,
    content: MessageContent,
    options?: { sessionId?: string }
  ): Promise<MessageResult> {
    return this.actorSystem.sendOutboundMessage(platform, to, content, options);
  }
}

/**
 * 通用消息处理器Actor
 */
export class GenericMessageHandlerActor extends BaseMessageHandlerActor {
  id = 'generic-message-handler';
  
  private messageProcessor: (context: MessageContext) => Promise<MessageContent | null>;

  constructor(
    actorSystem: AdapterActorSystem,
    messageProcessor: (context: MessageContext) => Promise<MessageContent | null>
  ) {
    super(actorSystem);
    this.messageProcessor = messageProcessor;
  }

  async handle(message: InboundMessageActorMessage): Promise<void> {
    const { platform, context, replyToken } = message.payload;
    
    try {
      // 处理消息
      const response = await this.messageProcessor(context);
      
      if (response) {
        // 发送回复
        await this.sendReply(platform, context.messageId, response);
      }
    } catch (error) {
      console.error(`[GenericMessageHandlerActor] Handle error:`, error);
      
      // 发送错误回复
      await this.sendReply(platform, context.messageId, {
        type: 'text',
        content: '抱歉,处理您的消息时出现错误。',
      });
    }
  }
}

export default AdapterActorSystem;
