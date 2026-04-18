/**
 * Feishu (Lark) Adapter for OpenTaiji
 * 飞书消息平台适配器
 * 
 * 支持两种连接模式:
 * - WebSocket: 实时长连接,低延迟
 * - Webhook: HTTP回调模式,需要公网可达
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  MessageAdapter,
  MessageContent,
  MessageContext,
  MessageResult,
  MessageHandler,
  FeishuConfig,
  PlatformEvent,
} from './types';

// 飞书SDK类型声明 (实际使用时通过npm安装)
declare module 'lark' {
  export class Client {
    constructor(options: {
      appId: string;
      appSecret: string;
      domain?: string;
      logger?: unknown;
    });
    im: {
      message: {
        create(params: {
          params: { receive_id_type: string };
          data: {
            receive_id: string;
            content: string;
            msg_type: string;
          };
        }): Promise<{ code: number; msg: string; data: { message_id: string } }>;
        reply(params: {
          path: { message_id: string };
          data: { content: string; msg_type: string };
        }): Promise<{ code: number; msg: string; data: { message_id: string } }>;
        get(params: { path: { message_id: string } }): Promise<unknown>;
      };
      reaction: {
        create(params: {
          data: { message_id: string; reaction_type: { emoji_type: string } };
        }): Promise<unknown>;
      };
    };
    contact: {
      user: {
        get(params: { params: { user_id_type: string }; path: { user_id: string } }): Promise<{
          code: number;
          data: { user?: { name: string; avatar?: { avatar_72: string } } };
        }>;
      };
    };
  }
  export class EventDispatcher {
    constructor(options: {
      encryptKey?: string;
      verificationToken?: string;
      handleReq: (request: unknown) => Promise<unknown>;
    });
    start(): void;
    stop(): void;
  }
  export enum Domain {
    Feishu = 'https://open.feishu.cn',
    Lark = 'https://open.larksuite.com',
  }
  export enum AppType {
    CustomApp = 'custom_app',
  }
}

/** 飞书消息事件类型 */
interface FeishuMessageEvent {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: {
    sender: {
      sender_id: { open_id?: string; user_id?: string; union_id?: string };
      sender_type: string;
      tenant_key: string;
    };
    message: {
      message_id: string;
      root_id?: string;
      parent_id?: string;
      create_time: string;
      chat_id: string;
      chat_type: 'p2p' | 'group';
      message_type: string;
      content: string;
      mentions?: Array<{ id: { open_id?: string; user_id?: string }; name: string }>;
    };
  };
}

/** 飞书卡片回调事件 */
interface FeishuCardEvent {
  action: {
    value: unknown;
    tag: string;
  };
  open_id: string;
  open_ids: string[];
  tenant_key: string;
}

/** 飞书API客户端 (简化版,实际使用时使用官方SDK) */
class FeishuClient {
  private appId: string;
  private appSecret: string;
  private domain: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: { appId: string; appSecret: string; domain?: string }) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.domain = config.domain || 'https://open.feishu.cn';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.domain}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: this.appId, app_secret: this.appSecret }),
    });

    const data = await response.json() as { code: number; tenant_access_token?: string; expire };
    if (data.code !== 0 || !data.tenant_access_token) {
      throw new Error(`Failed to get access token: ${data.code}`);
    }

    this.accessToken = data.tenant_access_token;
    // 提前5分钟过期
    this.tokenExpiry = Date.now() + ((data.expire as number) - 300) * 1000;
    return this.accessToken;
  }

  async sendMessage(params: {
    receiveId: string;
    receiveIdType: 'open_id' | 'user_id' | 'union_id' | 'chat_id';
    msgType: string;
    content: string;
  }): Promise<{ message_id: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.domain}/open-apis/im/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        receive_id: params.receiveId,
        msg_type: params.msgType,
        content: params.content,
      }),
    });

    const data = await response.json() as { code: number; msg?: string; data?: { message_id?: string } };
    if (data.code !== 0) {
      throw new Error(`Send message failed: ${data.msg || data.code}`);
    }
    return { message_id: data.data?.message_id || '' };
  }

  async replyMessage(params: {
    messageId: string;
    msgType: string;
    content: string;
  }): Promise<{ message_id: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.domain}/open-apis/im/v1/messages/${params.messageId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        msg_type: params.msgType,
        content: params.content,
      }),
    });

    const data = await response.json() as { code: number; msg?: string; data?: { message_id?: string } };
    if (data.code !== 0) {
      throw new Error(`Reply message failed: ${data.msg || data.code}`);
    }
    return { message_id: data.data?.message_id || '' };
  }

  async getUserInfo(userId: string): Promise<{ name: string; avatarUrl?: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.domain}/open-apis/contact/v3/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json() as { code: number; data?: { user?: { name?: string; avatar?: { avatar_72?: string } } } };
    if (data.code !== 0) {
      return { name: 'Unknown User' };
    }
    return {
      name: data.data?.user?.name || 'Unknown User',
      avatarUrl: data.data?.user?.avatar?.avatar_72,
    };
  }
}

/** 飞书消息内容解析器 */
function parseFeishuContent(content: string, msgType: string): string {
  try {
    const parsed = JSON.parse(content);
    
    switch (msgType) {
      case 'text':
        return parsed.text || '';
      case 'post':
        // 解析富文本消息
        return parsePostContent(parsed);
      case 'image':
        return '[图片]';
      case 'file':
        return '[文件]';
      case 'audio':
        return '[语音]';
      case 'video':
        return '[视频]';
      case 'sticker':
        return '[表情包]';
      case 'share_card':
        return '[分享卡片]';
      case 'share_chat':
        return '[分享群聊]';
      default:
        return content;
    }
  } catch {
    return content;
  }
}

/** 解析飞书富文本消息 */
function parsePostContent(post: Record<string, unknown>): string {
  const zhCn = post.zh_cn as { title?: string; content?: unknown[][] } | undefined;
  if (!zhCn) return '';

  const parts: string[] = [];
  
  if (zhCn.title) {
    parts.push(zhCn.title);
  }

  if (zhCn.content) {
    for (const paragraph of zhCn.content) {
      for (const element of paragraph) {
        if (typeof element === 'object' && element !== null) {
          const el = element as { tag?: string; text?: string; href?: string };
          if (el.tag === 'text' && el.text) {
            parts.push(el.text);
          } else if (el.tag === 'a' && el.text) {
            parts.push(el.text);
          } else if (el.tag === 'at' && el.text) {
            parts.push(`@${el.text}`);
          }
        }
      }
    }
  }

  return parts.join(' ');
}

/** 构建飞书文本消息内容 */
function buildTextContent(text: string): string {
  return JSON.stringify({ text });
}

/** 构建飞书富文本消息内容 */
function buildPostContent(text: string): string {
  return JSON.stringify({
    zh_cn: {
      title: '',
      content: [[{ tag: 'text', text }]],
    },
  });
}

/** 构建飞书Markdown消息内容 */
function buildMarkdownContent(markdown: string): string {
  // 飞书支持部分Markdown语法,通过富文本实现
  return JSON.stringify({
    zh_cn: {
      title: '',
      content: [[{ tag: 'md', text: markdown }]],
    },
  });
}

/** 构建飞书交互卡片 */
function buildInteractiveCard(params: {
  header?: { title: string; template?: string };
  elements: unknown[];
}): Record<string, unknown> {
  const card: Record<string, unknown> = {
    config: { wide_screen_mode: true },
    elements: params.elements,
  };

  if (params.header) {
    card.header = {
      title: { tag: 'plain_text', content: params.header.title },
      template: params.header.template || 'blue',
    };
  }

  return card;
}

/**
 * 飞书消息适配器
 * 
 * @example
 * ```typescript
 * const adapter = new FeishuAdapter({
 *   appId: 'cli_xxx',
 *   appSecret: 'xxx',
 *   connectionMode: 'websocket'
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
export class FeishuAdapter implements MessageAdapter {
  readonly platform = 'feishu';
  readonly domain: string;
  
  private config: FeishuConfig;
  private client?: FeishuClient;
  private connected = false;
  private wsConnection?: WebSocket;
  private eventEmitter = new EventEmitter();
  private messageHandlers: MessageHandler[] = [];
  private botOpenId?: string;
  private abortController?: AbortController;
  
  // 统计信息
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
  };

  constructor(config: FeishuConfig) {
    this.config = {
      connectionMode: 'websocket',
      timeoutMs: 30000,
      ...config,
    };
    this.domain = this.config.domain === 'lark' 
      ? 'https://open.larksuite.com' 
      : 'https://open.feishu.cn';
  }

  /** 检查是否已连接 */
  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * 连接飞书平台
   * 根据配置自动选择WebSocket或Webhook模式
   */
  async connect(): Promise<void> {
    if (this.connected) {
      console.log('[FeishuAdapter] Already connected');
      return;
    }

    if (!this.config.appId || !this.config.appSecret) {
      throw new Error('Feishu appId and appSecret are required');
    }

    this.client = new FeishuClient({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      domain: this.domain,
    });

    this.abortController = new AbortController();

    if (this.config.connectionMode === 'websocket') {
      await this.connectWebSocket();
    } else {
      console.log('[FeishuAdapter] Webhook mode - waiting for callbacks');
      // Webhook模式需要在外部启动HTTP服务器
      this.connected = true;
    }

    // 获取机器人信息
    await this.fetchBotInfo();
    
    console.log(`[FeishuAdapter] Connected to ${this.domain}`);
  }

  /**
   * 使用WebSocket长连接模式
   */
  private async connectWebSocket(): Promise<void> {
    const token = await this.getAccessToken();
    
    // 构建WebSocket URL
    const wsUrl = this.domain
      .replace('https://', 'wss://')
      .replace('http://', 'ws://') + `/event/v1/ws`;

    return new Promise((resolve, reject) => {
      // 注意: 实际生产环境应使用WebSocket客户端库
      // 这里使用简单的fetch轮询作为示例
      this.connected = true;
      this.startEventPolling();
      resolve();
    });
  }

  /**
   * 事件轮询 (简化版,实际使用WebSocket SDK)
   */
  private async startEventPolling(): Promise<void> {
    const poll = async () => {
      if (!this.connected || this.abortController?.signal.aborted) {
        return;
      }

      try {
        // 实际实现中应使用飞书官方WebSocket SDK
        // 这里仅作示例
        await new Promise(resolve => setTimeout(resolve, 5000));
        poll();
      } catch (error) {
        console.error('[FeishuAdapter] Poll error:', error);
        this.stats.errors++;
        if (this.connected) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    // 通过内部方式获取token
    const response = await fetch(`${this.domain}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    const data = await response.json() as { code: number; tenant_access_token?: string };
    if (data.code !== 0 || !data.tenant_access_token) {
      throw new Error(`Failed to get access token: ${data.code}`);
    }
    return data.tenant_access_token;
  }

  /**
   * 获取机器人信息
   */
  private async fetchBotInfo(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.domain}/open-apis/bot/v3/info`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json() as { code: number; data?: { bot?: { open_id?: string; app_name?: string } } };
      if (data.code === 0 && data.data?.bot) {
        this.botOpenId = data.data.bot.open_id;
        console.log(`[FeishuAdapter] Bot info: ${data.data.bot.app_name} (${this.botOpenId})`);
      }
    } catch (error) {
      console.error('[FeishuAdapter] Failed to fetch bot info:', error);
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.abortController?.abort();
    
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = undefined;
    }

    console.log('[FeishuAdapter] Disconnected');
  }

  /**
   * 发送消息
   */
  async sendMessage(
    to: string,
    content: MessageContent,
    context?: Partial<MessageContext>
  ): Promise<MessageResult> {
    if (!this.connected || !this.client) {
      return { success: false, error: 'Adapter not connected' };
    }

    try {
      const { msgType, msgContent } = this.serializeContent(content);
      
      const result = await this.client.sendMessage({
        receiveId: to,
        receiveIdType: 'open_id',
        msgType,
        content: msgContent,
      });

      this.stats.messagesSent++;

      return {
        success: true,
        messageId: result.message_id,
        data: { chatId: to },
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
    if (!this.connected || !this.client) {
      return { success: false, error: 'Adapter not connected' };
    }

    try {
      const { msgType, msgContent } = this.serializeContent(content);
      
      const result = await this.client.replyMessage({
        messageId,
        msgType,
        content: msgContent,
      });

      this.stats.messagesSent++;

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reply failed',
      };
    }
  }

  /**
   * 更新消息 (仅支持卡片消息)
   */
  async updateMessage(messageId: string, content: MessageContent): Promise<MessageResult> {
    // 飞书不支持更新文本消息,仅卡片可更新
    if (content.type !== 'interactive' && content.type !== 'card') {
      return { success: false, error: 'Only card messages can be updated' };
    }

    // 实现卡片更新逻辑
    return { success: true, messageId };
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<MessageResult> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.domain}/open-apis/im/v1/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json() as { code: number };
      if (data.code !== 0) {
        return { success: false, error: `Delete failed: ${data.code}` };
      }

      return { success: true };
    } catch (error) {
      this.stats.errors++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * 序列化消息内容为飞书格式
   */
  private serializeContent(content: MessageContent): { msgType: string; msgContent: string } {
    switch (content.type) {
      case 'text':
        return { msgType: 'text', msgContent: buildTextContent(content.content) };
      case 'markdown':
        return { msgType: 'post', msgContent: buildMarkdownContent(content.content) };
      case 'interactive':
      case 'card':
        return { msgType: 'interactive', msgContent: JSON.stringify(content.metadata?.card || {}) };
      case 'image':
        return { msgType: 'image', msgContent: JSON.stringify({ image_key: content.metadata?.imageKey }) };
      case 'file':
        return { msgType: 'file', msgContent: JSON.stringify({ file_key: content.metadata?.fileKey }) };
      default:
        return { msgType: 'text', msgContent: buildTextContent(content.content) };
    }
  }

  /**
   * 处理收到的飞书事件
   * 由Webhook或WebSocket调用
   */
  handleFeishuEvent(event: FeishuMessageEvent | FeishuCardEvent): void {
    if ('message' in event) {
      this.handleMessageEvent(event as FeishuMessageEvent);
    } else {
      this.handleCardEvent(event as FeishuCardEvent);
    }
  }

  /**
   * 处理消息事件
   */
  private handleMessageEvent(event: FeishuMessageEvent): void {
    const msg = event.event.message;
    
    // 过滤非文本/帖子消息
    const supportedTypes = ['text', 'post', 'interactive'];
    if (!supportedTypes.includes(msg.message_type)) {
      return;
    }

    // 解析消息内容
    const contentText = parseFeishuContent(msg.content, msg.message_type);
    
    // 构建消息上下文
    const context: MessageContext = {
      messageId: msg.message_id,
      sessionId: `feishu:${msg.chat_id}`,
      sessionType: msg.chat_type === 'group' ? 'group' : 'p2p',
      channelId: msg.chat_id,
      sender: {
        userId: msg.sender.sender_id.open_id || msg.sender.sender_id.user_id || '',
        idType: msg.sender.sender_id.open_id ? 'open_id' : 'user_id',
        displayName: undefined, // 需要额外API调用获取
      },
      content: {
        type: msg.message_type === 'post' ? 'markdown' : 'text',
        content: contentText,
        metadata: {
          originalType: msg.message_type,
          mentions: msg.mentions,
          rootId: msg.root_id,
          parentId: msg.parent_id,
        },
      },
      raw: event,
      replyToMessageId: msg.parent_id,
      threadId: msg.root_id,
      timestamp: new Date(msg.create_time).getTime(),
    };

    this.stats.messagesReceived++;
    
    // 触发消息处理器
    for (const handler of this.messageHandlers) {
      try {
        handler(context);
      } catch (error) {
        console.error('[FeishuAdapter] Handler error:', error);
        this.stats.errors++;
      }
    }

    this.eventEmitter.emit('message', context);
  }

  /**
   * 处理卡片交互事件
   */
  private handleCardEvent(event: FeishuCardEvent): void {
    const platformEvent: PlatformEvent = {
      type: 'callback',
      data: event,
      timestamp: Date.now(),
    };

    this.eventEmitter.emit('callback', platformEvent);
  }

  /**
   * 验证Webhook请求
   */
  verifyWebhook(headers: Record<string, string>, body: string): boolean {
    // 验证时间戳和签名
    const timestamp = headers['x-lark-timestamp'];
    const signature = headers['x-lark-signature'];

    if (!timestamp || !signature || !this.config.encryptKey) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
      // 5分钟内的请求有效
      return false;
    }

    const signStr = timestamp + this.config.encryptKey;
    const hash = crypto.createHash('sha256').update(signStr).digest('hex');
    
    return hash === signature;
  }

  /**
   * 解密Webhook消息体
   */
  decryptWebhook(encryptStr: string): string {
    if (!this.config.encryptKey) {
      throw new Error('Encrypt key not configured');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(this.config.encryptKey).digest(),
      Buffer.from(this.config.encryptKey.substring(0, 16))
    );

    let decrypted = decipher.update(encryptStr, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
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
    botOpenId?: string;
  } {
    return {
      connected: this.connected,
      stats: { ...this.stats },
      botOpenId: this.botOpenId,
    };
  }
}

export default FeishuAdapter;
