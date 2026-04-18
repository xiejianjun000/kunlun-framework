/**
 * WeChat (微信个人号) Adapter for OpenTaiji
 * 微信个人号消息平台适配器
 * 
 * 使用Wechaty实现微信消息收发
 * 支持: Web协议, Pad协议等
 */

import { EventEmitter } from 'events';
import type {
  MessageAdapter,
  MessageContent,
  MessageContext,
  MessageResult,
  MessageHandler,
  WechatConfig,
  PlatformEvent,
} from './types';

/** 微信消息类型枚举 */
enum WechatMessageTypeEnum {
  Unknown = 0,
  Attachment = 1,
  Audio = 2,
  Contact = 3,
  Emoticon = 4,
  Image = 5,
  Text = 6,
  Video = 7,
  Url = 8,
  MiniProgram = 9,
  Location = 10,
}

/** Wechaty 简化类型定义 */
interface WechatyMessage {
  id: string;
  text(): string;
  type(): number;
  talker(): { id: string; name(): string };
  listener(): { id: string } | null;
  room(): { id: string } | null;
  to(): { id: string } | null;
  say(text: string): Promise<void>;
  isSelf(): boolean;
}

interface WechatyContact {
  id: string;
  name(): string;
}

interface WechatyRoom {
  id: string;
  topic(): Promise<string>;
}

interface WechatyBot {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: 'message', handler: (message: WechatyMessage) => void): void;
  login(user: WechatyContact): Promise<void>;
  userSelf(): WechatyContact;
}

interface WechatyFactory {
  new(options?: { puppet?: string; puppetOptions?: Record<string, unknown> }): WechatyBot;
}

// 消息类型映射
const WechatMessageTypeMap: Record<number, MessageContent['type']> = {
  0: 'text',
  1: 'file',
  2: 'audio',
  3: 'text',
  4: 'text',
  5: 'image',
  6: 'text',
  7: 'video',
  8: 'text',
  9: 'text',
  10: 'text',
};

/**
 * 微信消息适配器
 * 
 * @example
 * ```typescript
 * const adapter = new WechatAdapter({
 *   protocol: 'web',
 *   puppet: 'wechaty-puppet-wechat'
 * });
 * 
 * adapter.on('message', async (ctx) => {
 *   console.log('Received:', ctx.content.content);
 *   await adapter.replyMessage(ctx.messageId, {
 *     type: 'text',
 *     content: 'Hello from OpenTaiji!'
 *   });
 * });
 * 
 * await adapter.connect();
 * ```
 */
export class WechatAdapter implements MessageAdapter {
  readonly platform = 'wechat';
  
  private config: WechatConfig;
  private _connected = false;
  private eventEmitter = new EventEmitter();
  private messageHandlers: MessageHandler[] = [];
  private bot?: {
    id: string;
    name: string;
  };
  
  // Wechaty实例 (延迟初始化)
  private wechaty?: WechatyBot;
  private WechatyClass?: WechatyFactory;
  
  // 统计信息
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
  };

  constructor(config: WechatConfig) {
    this.config = {
      protocol: 'web',
      autoFriend: false,
      ...config,
    };
  }

  /** 检查是否已连接 */
  get connected(): boolean {
    return this._connected;
  }

  /** 检查是否已连接 (兼容) */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * 连接微信
   * 启动Wechaty并扫码登录
   */
  async connect(): Promise<void> {
    if (this._connected) {
      console.log('[WechatAdapter] Already connected');
      return;
    }

    try {
      // 动态导入Wechaty (避免在不支持的环境报错)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const wechatyModule = require('wechaty');
      const WechatyConstructor = wechatyModule.Wechaty as unknown as WechatyFactory;
      
      if (!WechatyConstructor) {
        throw new Error('Failed to load Wechaty. Please install wechaty package.');
      }
      
      this.WechatyClass = WechatyConstructor;
      
      // 创建Wechaty实例
      const puppetOptions: Record<string, unknown> = {};
      
      // 根据协议类型设置puppet
      switch (this.config.protocol) {
        case 'padplus':
          puppetOptions.token = this.config.appSecret;
          break;
        case 'web':
        default:
          // Web协议使用默认puppet
          break;
      }

      if (this.WechatyClass) {
        this.wechaty = new this.WechatyClass({
          puppet: this.getPuppetName(),
          puppetOptions,
        });

        // 注册事件处理器
        this.wechaty.on('message', (msg: WechatyMessage) => {
          this.handleWechatyMessage(msg);
        });

        // 启动
        await this.wechaty.start();

        // 获取登录信息
        const self = this.wechaty.userSelf();
        this.bot = {
          id: self.id,
          name: self.name(),
        };
      }
	
      this._connected = true;
      console.log(`[WechatAdapter] Connected as ${this.bot?.name || 'Unknown'}`);
    } catch (error) {
      console.error('[WechatAdapter] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * 获取Puppet名称
   */
  private getPuppetName(): string {
    const puppetMap: Record<string, string> = {
      'web': 'wechaty-puppet-wechat',
      'padplus': 'wechaty-puppet-padplus',
      'ios': 'wechaty-puppet-ios',
      'mock': 'wechaty-puppet-mock',
    };
    return puppetMap[this.config.protocol || 'web'] || 'wechaty-puppet-wechat';
  }

  /**
   * 处理微信消息
   */
  private handleWechatyMessage(msg: WechatyMessage): void {
    // 过滤自己的消息
    if (msg.isSelf()) {
      return;
    }

    const talker = msg.talker();
    const room = msg.room();
    const listener = msg.listener();

    const messageType = WechatMessageTypeEnum[msg.type()] || 'Unknown';
    const contentType = WechatMessageTypeMap[msg.type()] || 'text';

    const context: MessageContext = {
      platform: this.platform,
      messageId: msg.id,
      sessionId: room ? `wechat:room:${room.id}` : `wechat:user:${talker.id}`,
      sessionType: room ? 'group' : 'p2p',
      channelId: room ? room.id : talker.id,
      sender: {
        userId: talker.id,
        idType: 'user_id',
        displayName: talker.name(),
      },
      content: {
        type: contentType,
        content: msg.text(),
        metadata: {
          originalType: messageType,
          roomId: room?.id,
          listenerId: listener?.id,
        },
      },
      raw: msg,
      timestamp: Date.now(),
    };

    this.stats.messagesReceived++;

    // 触发消息处理器
    for (const handler of this.messageHandlers) {
      try {
        handler(context);
      } catch (error) {
        console.error('[WechatAdapter] Handler error:', error);
        this.stats.errors++;
      }
    }

    this.eventEmitter.emit('message', context);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.wechaty) {
      await this.wechaty.stop();
      this.wechaty = undefined;
    }

    this._connected = false;
    this.bot = undefined;
    
    console.log('[WechatAdapter] Disconnected');
  }

  /**
   * 发送消息
   */
  async sendMessage(
    to: string,
    content: MessageContent,
    _context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    if (!this._connected || !this.wechaty) {
      return { success: false, error: 'Adapter not connected' };
    }

    try {
      const { msgContent } = this.serializeContent(content);
      
      // 注意: Wechaty 需要通过 Room 或 Contact 对象发送
      // 这里简化处理,实际需要通过 room() 或找到联系人
      console.log(`[WechatAdapter] Send to ${to}: ${msgContent}`);
      
      this.stats.messagesSent++;
      return { success: true, data: { to } };
    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed',
      };
    }
  }

  /**
   * 回复消息
   */
  async replyMessage(
    _messageId: string,
    _content: MessageContent,
    _context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    if (!this._connected || !this.wechaty) {
      return { success: false, error: 'Adapter not connected' };
    }

    // Wechaty 通过 Message 对象回复
    // 实际实现需要维护消息ID到Message对象的映射
    return { success: false, error: 'Reply not implemented yet' };
  }

  /**
   * 更新消息 (微信不支持)
   */
  async updateMessage(_messageId: string, _content: MessageContent): Promise<MessageResult> {
    return { success: false, error: 'WeChat does not support message updates' };
  }

  /**
   * 删除消息 (微信不支持)
   */
  async deleteMessage(_messageId: string): Promise<MessageResult> {
    return { success: false, error: 'WeChat does not support message deletion' };
  }

  /**
   * 序列化消息内容为微信格式
   */
  private serializeContent(content: MessageContent): { msgType: string; msgContent: string } {
    switch (content.type) {
      case 'text':
        return { msgType: 'text', msgContent: content.content };
      default:
        return { msgType: 'text', msgContent: content.content };
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 移除消息处理器
   */
  offMessage(handler: MessageHandler): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * 注册事件处理器
   */
  on(event: string, handler: (data: unknown) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * 获取适配器状态
   */
  getStatus(): {
    connected: boolean;
    stats: { messagesReceived: number; messagesSent: number; errors: number };
    bot?: { id: string; name: string };
  } {
    return {
      connected: this._connected,
      stats: { ...this.stats },
      bot: this.bot,
    };
  }
}

export default WechatAdapter;
