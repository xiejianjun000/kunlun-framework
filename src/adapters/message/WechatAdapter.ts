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

// Wechaty类型声明 (实际使用时通过npm安装wechaty)
declare module 'wechaty' {
  export class Wechaty {
    constructor(options?: { puppet?: string; puppetOptions?: Record<string, unknown> });
    start(): Promise<void>;
    stop(): Promise<void>;
    on(event: string, handler: (message: Message) => void): this;
    login(user: Contact): Promise<void>;
    userSelf(): Contact;
  }

  export class Contact {
    id: string;
    name(): string;
    alias(newAlias?: string): string | Promise<string>;
    avatar(): Promise<string>;
    sync(): Promise<void>;
  }

  export class Message {
    id: string;
    text(): string;
    type(): number;
    talker(): Contact;
    listener(): Contact | null;
    room(): Room | null;
    to(): Contact | Room | null;
    forward(to: Contact | Room): Promise<void>;
    say(text: string): Promise<void | Message>;
    say(contact: Contact): Promise<void>;
    async ready(): Promise<void>;
    isSelf(): boolean;
    typeText(): string;
    typeImage(): string;
    typeVideo(): string;
    typeAudio(): string;
    typeAttachment(): string;
    typeUrl(): string;
  }

  export class Room {
    id: string;
    topic(): Promise<string>;
    memberAll(): Promise<Contact[]>;
    add(contact: Contact): Promise<void>;
    del(contact: Contact): Promise<void>;
    say(text: string, mention?: Contact[]): Promise<void>;
  }

  export enum MessageType {
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

  export enum ContactType {
    Unknown = 0,
    Personal = 1,
    Official = 2,
  }

  export enum RoomType {
    Unknown = 0,
    Group = 1,
    Official = 2,
  }
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
  private connected = false;
  private eventEmitter = new EventEmitter();
  private messageHandlers: MessageHandler[] = [];
  private bot?: {
    id: string;
    name: string;
  };
  
  // Wechaty实例 (延迟初始化)
  private wechaty?: InstanceType<typeof import('wechaty').Wechaty>;
  
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
  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * 连接微信
   * 启动Wechaty并扫码登录
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.log('[WechatAdapter] Already connected');
      return;
    }

    try {
      // 动态导入Wechaty (避免在不支持的环境报错)
      const { Wechaty, MessageType, RoomType } = await import('wechaty');
      
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

      this.wechaty = new Wechaty({
        puppet: this.getPuppetName(),
        puppetOptions,
      });

      // 注册事件处理器
      this.wechaty
        .on('message', (message: InstanceType<typeof Message>) => {
          this.handleWechatMessage(message);
        })
        .on('login', (user: InstanceType<typeof import('wechaty').Contact>) => {
          this.bot = {
            id: user.id,
            name: user.name(),
          };
          console.log(`[WechatAdapter] Logged in as: ${this.bot.name} (${this.bot.id})`);
        })
        .on('logout', (user: InstanceType<typeof import('wechaty').Contact>) => {
          console.log(`[WechatAdapter] Logged out: ${user.name()}`);
          this.connected = false;
        })
        .on('error', (error: Error) => {
          console.error('[WechatAdapter] Error:', error);
          this.stats.errors++;
        })
        .on('scan', (qrcode: string) => {
          // 输出登录二维码
          console.log('[WechatAdapter] Please scan the QR code to login');
          console.log(qrcode);
        });

      // 启动
      await this.wechaty.start();
      this.connected = true;

      console.log('[WechatAdapter] Connected to WeChat');
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 获取Puppet名称
   */
  private getPuppetName(): string {
    switch (this.config.protocol) {
      case 'padplus':
        return 'wechaty-puppet-padplus';
      case 'web':
      default:
        return 'wechaty-puppet-wechat';
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.wechaty) {
      await this.wechaty.stop();
      this.wechaty = undefined;
    }
    this.connected = false;
    console.log('[WechatAdapter] Disconnected');
  }

  /**
   * 发送消息
   */
  async sendMessage(
    to: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    if (!this.connected || !this.wechaty) {
      return { success: false, error: 'Adapter not connected' };
    }

    try {
      const { Contact, Room } = await import('wechaty');
      
      // 判断目标是好友还是群聊
      let target: InstanceType<typeof Contact> | InstanceType<typeof Room>;
      
      if (to.includes('@chatroom') || context?.sessionType === 'group') {
        target = new Room({ id: to });
      } else {
        target = new Contact({ id: to });
      }

      await target.sync();

      switch (content.type) {
        case 'text':
          await (target as InstanceType<typeof Contact>).say(content.content);
          break;
        case 'image':
          // 需要先上传图片获取MediaId
          // await (target as any).say(new Image(content.metadata?.fileKey || ''));
          await (target as InstanceType<typeof Contact>).say('[图片]');
          break;
        case 'file':
          await (target as InstanceType<typeof Contact>).say('[文件]');
          break;
        default:
          await (target as InstanceType<typeof Contact>).say(content.content);
      }

      this.stats.messagesSent++;

      return {
        success: true,
        messageId: `wechat_${Date.now()}`,
        data: { to },
      };
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
    messageId: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    if (!this.connected) {
      return { success: false, error: 'Adapter not connected' };
    }

    // 微信通过发送者ID回复
    const senderId = context?.sender?.userId;
    if (!senderId) {
      return { success: false, error: 'Sender ID required for reply' };
    }

    return this.sendMessage(senderId, content, context);
  }

  /**
   * 更新消息 (不支持)
   */
  async updateMessage(messageId: string, content: MessageContent): Promise<MessageResult> {
    return { success: false, error: 'WeChat does not support message updates' };
  }

  /**
   * 删除消息 (不支持)
   */
  async deleteMessage(messageId: string): Promise<MessageResult> {
    return { success: false, error: 'WeChat does not support message deletion' };
  }

  /**
   * 处理微信消息
   */
  private async handleWechatMessage(message: InstanceType<typeof import('wechaty').Message>): Promise<void> {
    try {
      await message.ready();

      // 跳过自己发送的消息
      if (message.isSelf()) {
        return;
      }

      const { MessageType, RoomType } = await import('wechaty');
      
      // 获取发送者
      const talker = message.talker();
      const room = message.room();
      
      // 构建会话ID
      const sessionId = room 
        ? `wechat:room:${room.id}` 
        : `wechat:user:${talker.id}`;
      
      // 构建消息内容
      const contentType = WechatMessageTypeMap[message.type()] || 'text';
      let contentText = '';

      switch (message.type()) {
        case MessageType.Text:
          contentText = message.text();
          break;
        case MessageType.Image:
          contentText = '[图片]';
          break;
        case MessageType.Video:
          contentText = '[视频]';
          break;
        case MessageType.Audio:
          contentText = '[语音]';
          break;
        case MessageType.Emoticon:
          contentText = '[表情]';
          break;
        case MessageType.Attachment:
          contentText = '[文件]';
          break;
        case MessageType.Url:
          contentText = '[链接]';
          break;
        case MessageType.MiniProgram:
          contentText = '[小程序]';
          break;
        case MessageType.Location:
          contentText = '[位置]';
          break;
        default:
          contentText = message.text() || '[未知消息]';
      }

      // 构建消息上下文
      const context: MessageContext = {
        messageId: message.id,
        sessionId,
        sessionType: room ? 'group' : 'p2p',
        channelId: room?.id || talker.id,
        sender: {
          userId: talker.id,
          idType: 'user_id',
          displayName: await talker.name(),
        },
        content: {
          type: contentType,
          content: contentText,
          metadata: {
            originalType: message.type(),
            roomId: room?.id,
            talkerId: talker.id,
          },
        },
        raw: message,
        timestamp: Date.now(),
      };

      this.stats.messagesReceived++;

      // 触发消息处理器
      for (const handler of this.messageHandlers) {
        try {
          await handler(context);
        } catch (error) {
          console.error('[WechatAdapter] Handler error:', error);
          this.stats.errors++;
        }
      }

      this.eventEmitter.emit('message', context);
    } catch (error) {
      console.error('[WechatAdapter] Handle message error:', error);
      this.stats.errors++;
    }
  }

  /**
   * 获取群成员列表
   */
  async getRoomMembers(roomId: string): Promise<string[]> {
    if (!this.connected) {
      return [];
    }

    try {
      const { Room } = await import('wechaty');
      const room = new Room({ id: roomId });
      await room.sync();
      
      const members = await room.memberAll();
      return members.map(m => m.id);
    } catch {
      return [];
    }
  }

  /**
   * 获取用户名
   */
  async getContactName(contactId: string): Promise<string> {
    try {
      const { Contact } = await import('wechaty');
      const contact = new Contact({ id: contactId });
      await contact.sync();
      return contact.name();
    } catch {
      return 'Unknown';
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
    stats: typeof this.stats;
    bot?: { id: string; name: string };
  } {
    return {
      connected: this.connected,
      stats: { ...this.stats },
      bot: this.bot,
    };
  }
}

export default WechatAdapter;
