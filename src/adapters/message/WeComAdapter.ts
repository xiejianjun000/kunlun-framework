/**
 * WeCom (企业微信) Adapter for OpenTaiji
 * 企业微信消息平台适配器
 * 
 * 支持:
 * - 回调模式 (HTTP/HTTPS)
 * - 第三方应用供应商模式
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  MessageAdapter,
  MessageContent,
  MessageContext,
  MessageResult,
  MessageHandler,
  WeComConfig,
  PlatformEvent,
} from './types';

/** 企业微信消息事件类型 */
interface WeComMessageEvent {
  ToUserName: string;           // 企业微信CorpID
  FromUserName: string;         // 发送者UserID
  CreateTime: number;           // 创建时间
  MsgType: string;              // 消息类型
  Content: string;              // 消息内容
  MsgId: number;                // 消息ID
  AgentID?: number;             // 应用AgentID
  // 媒体消息字段
  MediaId?: string;             // 媒体ID
  ThumbMediaId?: string;        // 缩略图ID
  // 事件消息字段
  Event?: string;               // 事件类型
  EventKey?: string;           // 事件Key
  // 群聊消息字段
  ChatId?: string;             // 群聊ID
  RoomId?: string;              // 群ID
}

/** 企业微信事件类型 */
interface WeComEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: 'event';
  Event: string;
  EventKey: string;
  AgentID: number;
}

/** 企业微信API响应 */
interface WeComApiResponse {
  errcode: number;
  errmsg: string;
  msgid?: string;
  invaliduser?: string[];
  invalidparty?: string[];
  invalidtag?: string[];
}

/** 企业微信消息发送请求 */
interface WeComSendMessageRequest {
  touser?: string;              // UserID列表,多个用|分隔
  toparty?: string;             // PartyID列表,多个用|分隔
  totag?: string;              // TagID列表,多个用|分隔
  msgtype: string;
  agentid: number;
  content?: string;             // 文本消息内容
  media_id?: string;            // 媒体ID
  safe?: number;                // 是否保密
}

/**
 * 企业微信消息适配器
 * 
 * @example
 * ```typescript
 * const adapter = new WeComAdapter({
 *   corpId: 'wwxxxxx',
 *   agentId: 1000001,
 *   encodingAesKey: 'xxx',
 *   callbackToken: 'xxx'
 * });
 * 
 * adapter.on('message', async (ctx) => {
 *   await adapter.replyMessage(ctx.messageId, {
 *     type: 'text',
 *     content: 'Hello from OpenTaiji!'
 *   });
 * });
 * 
 * await adapter.connect();
 * ```
 */
export class WeComAdapter implements MessageAdapter {
  readonly platform = 'wecom';
  
  private config: WeComConfig;
  private _connected = false;
  private eventEmitter = new EventEmitter();
  private messageHandlers: MessageHandler[] = [];
  private accessToken?: string;
  private tokenExpiry?: number;
  private abortController?: AbortController;
  
  // 统计信息
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
  };

  constructor(config: WeComConfig) {
    if (!config.corpId) {
      throw new Error('WeCom corpId is required');
    }
    this.config = {
      timeoutMs: 30000,
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
   * 连接企业微信平台
   */
  async connect(): Promise<void> {
    if (this._connected) {
      console.log('[WeComAdapter] Already connected');
      return;
    }

    // 获取access_token
    await this.refreshAccessToken();
    
    this._connected = true;
    this.abortController = new AbortController();
    
    console.log(`[WeComAdapter] Connected to WeCom (CorpID: ${this.config.corpId})`);
  }

  /**
   * 获取Access Token
   */
  private async refreshAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // 企业微信获取access_token
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.corpId}&corpsecret=${this.config.appSecret}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
    });

    const data = await response.json() as { errcode: number; errmsg?: string; access_token?: string; expires_in?: number };
    
    if (data.errcode !== 0 || !data.access_token) {
      throw new Error(`Failed to get access token: ${data.errmsg}`);
    }

    this.accessToken = data.access_token;
    // 提前10分钟过期
    this.tokenExpiry = Date.now() + ((data.expires_in || 7200) - 600) * 1000;
    
    return this.accessToken;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this._connected = false;
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
    this.abortController?.abort();
    
    console.log('[WeComAdapter] Disconnected');
  }

  /**
   * 发送消息
   */
  async sendMessage(
    to: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    if (!this._connected) {
      return { success: false, error: 'Adapter not connected' };
    }

    try {
      const token = await this.refreshAccessToken();
      const { msgType, msgContent } = this.serializeContent(content);
      
      const request: WeComSendMessageRequest = {
        touser: to,
        msgtype: msgType,
        agentid: typeof this.config.agentId === 'string' ? parseInt(this.config.agentId) : (this.config.agentId || 0),
        [msgType === 'text' ? 'content' : 'media_id']: msgContent,
      };

      const response = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeoutMs || 30000),
        }
      );

      const result = await response.json() as WeComApiResponse;
      
      if (result.errcode !== 0) {
        return {
          success: false,
          error: result.errmsg,
          data: {
            invalidUser: result.invaliduser,
            invalidParty: result.invalidparty,
          },
        };
      }

      this.stats.messagesSent++;

      return {
        success: true,
        messageId: result.msgid,
        data: { toUser: to },
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
   * 回复消息 (通过userid发送)
   */
  async replyMessage(
    messageId: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    // 企业微信不支持直接回复,需要通过API发送
    const senderId = context?.sender?.userId;
    if (!senderId) {
      return { success: false, error: 'Sender ID required for reply' };
    }
    return this.sendMessage(senderId, content, context);
  }

  /**
   * 更新消息 (企业微信不支持)
   */
  async updateMessage(messageId: string, content: MessageContent): Promise<MessageResult> {
    return { success: false, error: 'WeCom does not support message updates' };
  }

  /**
   * 删除消息 (企业微信不支持)
   */
  async deleteMessage(messageId: string): Promise<MessageResult> {
    return { success: false, error: 'WeCom does not support message deletion' };
  }

  /**
   * 序列化消息内容为企业微信格式
   */
  private serializeContent(content: MessageContent): { msgType: string; msgContent: string } {
    switch (content.type) {
      case 'text':
        return { msgType: 'text', msgContent: content.content };
      case 'markdown':
        // 企业微信支持markdown,但部分版本可能不支持
        return { msgType: 'text', msgContent: content.content };
      case 'image':
      case 'audio':
      case 'video':
        return { msgType: content.type, msgContent: content.metadata?.mediaId as string || '' };
      case 'file':
        return { msgType: 'file', msgContent: content.metadata?.mediaId as string || '' };
      case 'news':
        return { msgType: 'news', msgContent: content.metadata?.articles as string || '' };
      default:
        return { msgType: 'text', msgContent: content.content };
    }
  }

  /**
   * 处理收到的企业微信事件/消息
   * 由Webhook回调调用
   */
  handleWeComEvent(requestBody: Record<string, unknown>): void {
    const msgType = requestBody.MsgType as string;
    
    if (msgType === 'event') {
      this.handleEventMessage(requestBody as unknown as WeComEvent);
    } else {
      this.handleTextMessage(requestBody as unknown as WeComMessageEvent);
    }
  }

  /**
   * 处理文本消息
   */
  private handleTextMessage(event: WeComMessageEvent): void {
    const context: MessageContext = {
      platform: this.platform,
      messageId: String(event.MsgId),
      sessionId: event.ChatId ? `wecom:group:${event.ChatId}` : `wecom:user:${event.FromUserName}`,
      sessionType: event.ChatId ? 'group' : 'p2p',
      channelId: event.ChatId || event.FromUserName,
      sender: {
        userId: event.FromUserName,
        idType: 'user_id',
      },
      content: {
        type: 'text',
        content: event.Content,
        metadata: {
          originalType: event.MsgType,
          agentId: event.AgentID,
        },
      },
      raw: event,
      timestamp: event.CreateTime * 1000,
    };

    this.stats.messagesReceived++;

    for (const handler of this.messageHandlers) {
      try {
        handler(context);
      } catch (error) {
        console.error('[WeComAdapter] Handler error:', error);
        this.stats.errors++;
      }
    }

    this.eventEmitter.emit('message', context);
  }

  /**
   * 处理事件消息
   */
  private handleEventMessage(event: WeComEvent): void {
    const platformEvent: PlatformEvent = {
      type: this.mapEventType(event.Event),
      data: event,
      timestamp: event.CreateTime * 1000,
    };

    this.eventEmitter.emit('event', platformEvent);
  }

  /**
   * 映射企业微信事件类型
   */
  private mapEventType(event: string): PlatformEvent['type'] {
    const eventMap: Record<string, PlatformEvent['type']> = {
      'click': 'callback',
      'view': 'callback',
      'subscribe': 'callback',
      'unsubscribe': 'callback',
      'location': 'callback',
      'scancode_push': 'callback',
      'scancode_waitmsg': 'callback',
      'pic_sysphoto': 'callback',
      'pic_photo_or_album': 'callback',
      'pic_weapp': 'callback',
      'enter_agent': 'callback',
    };

    return eventMap[event] || 'callback';
  }

  /**
   * 验证回调请求签名
   */
  verifyCallback(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    encryptStr: string
  ): boolean {
    if (!this.config.callbackToken || !this.config.encodingAesKey) {
      return false;
    }

    // 验证签名
    const sortStr = [this.config.callbackToken, timestamp, nonce, encryptStr].sort().join('');
    const hash = crypto.createHash('sha1').update(sortStr).digest('hex');
    
    return hash === msgSignature;
  }

  /**
   * 解密回调消息
   */
  decryptMessage(encryptStr: string): Record<string, unknown> {
    if (!this.config.encodingAesKey) {
      throw new Error('Encoding AES key not configured');
    }

    // AES解密 (简化实现,实际应使用企业微信官方加解密库)
    const key = Buffer.from(this.config.encodingAesKey + '=', 'base64');
    const iv = key.slice(0, 16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptStr, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // 移除随机字节和长度
    const msgLen = parseInt(decrypted.slice(16, 20).toString(), 16);
    const msg = decrypted.slice(20, 20 + msgLen);

    return JSON.parse(msg.toString());
  }

  /**
   * 验证URL (用于回调配置验证)
   */
  verifyUrl(msgSignature: string, timestamp: string, nonce: string, echostr: string): string {
    if (!this.verifyCallback(msgSignature, timestamp, nonce, echostr)) {
      throw new Error('Invalid signature');
    }
    return echostr;
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
    corpId: string;
  } {
    return {
      connected: this._connected,
      stats: { ...this.stats },
      corpId: this.config.corpId,
    };
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<{ name: string; avatar?: string }> {
    try {
      const token = await this.refreshAccessToken();
      const response = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${token}&userid=${userId}`
      );

      const data = await response.json() as { errcode: number; name?: string; avatar?: string };
      if (data.errcode !== 0) {
        return { name: 'Unknown User' };
      }

      return {
        name: data.name || 'Unknown User',
        avatar: data.avatar,
      };
    } catch {
      return { name: 'Unknown User' };
    }
  }
}

export default WeComAdapter;
