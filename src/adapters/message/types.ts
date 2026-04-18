/**
 * OpenTaiji Message Adapter Type Definitions
 * 消息平台适配器核心类型定义
 */

/** 消息内容类型 */
export type MessageContentType = 'text' | 'image' | 'file' | 'markdown' | 'audio' | 'video' | 'card' | 'interactive' | 'post' | 'share' | 'location' | 'news';

/** 消息内容 */
export interface MessageContent {
  /** 消息类型 */
  type: MessageContentType;
  /** 消息文本内容 */
  content: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 附件列表 */
  attachments?: MessageAttachment[];
}

/** 消息附件 */
export interface MessageAttachment {
  /** 附件类型 */
  type: 'image' | 'file' | 'audio' | 'video';
  /** 文件名 */
  name?: string;
  /** URL或本地路径 */
  url: string;
  /** 文件大小 */
  size?: number;
  /** MIME类型 */
  mimeType?: string;
}

/** 消息发送者信息 */
export interface MessageSender {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 显示名称 */
  displayName?: string;
  /** 头像URL */
  avatarUrl?: string;
  /** 平台特定ID类型 */
  idType: 'open_id' | 'user_id' | 'union_id' | 'email';
}

/** 消息上下文 */
export interface MessageContext {
  /** 平台名称 */
  platform: string;
  /** 消息ID */
  messageId: string;
  /** 会话ID */
  sessionId: string;
  /** 会话类型 */
  sessionType: 'p2p' | 'group' | 'channel';
  /** 频道/群组ID */
  channelId: string;
  /** 发送者 */
  sender: MessageSender;
  /** 消息内容 */
  content: MessageContent;
  /** 原始消息对象 */
  raw?: unknown;
  /** 引用/回复的消息ID */
  replyToMessageId?: string;
  /** 线程ID (用于话题回复) */
  threadId?: string;
  /** 时间戳 */
  timestamp: number;
}

/** 消息处理结果 */
export interface MessageResult {
  /** 是否成功 */
  success: boolean;
  /** 发送的消息ID */
  messageId?: string;
  /** 错误信息 */
  error?: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/** 平台适配器接口 */
export interface MessageAdapter {
  /** 平台名称 */
  readonly platform: string;
  /** 平台版本/域名 */
  readonly domain?: string;
  /** 是否已连接 */
  readonly connected: boolean;

  /** 连接平台 */
  connect(): Promise<void>;
  /** 断开连接 */
  disconnect(): Promise<void>;
  /** 发送消息 */
  sendMessage(to: string, content: MessageContent, context?: Partial<MessageContext>): Promise<MessageResult>;
  /** 回复消息 */
  replyMessage(messageId: string, content: MessageContent, context?: Partial<MessageContext>): Promise<MessageResult>;
  /** 更新消息 */
  updateMessage(messageId: string, content: MessageContent): Promise<MessageResult>;
  /** 删除消息 */
  deleteMessage(messageId: string): Promise<MessageResult>;
  /** 注册消息处理器 */
  onMessage(handler: MessageHandler): void;
  /** 注册事件监听器 */
  on(event: string, handler: (data: unknown) => void): void;
}

/** 消息处理器 */
export type MessageHandler = (context: MessageContext) => Promise<void> | void;

/** 事件处理器类型 */
export type EventHandler = (event: PlatformEvent) => Promise<void> | void;

/** 平台事件类型 */
export type PlatformEventType = 
  | 'message' 
  | 'message_update' 
  | 'message_delete'
  | 'member_join'
  | 'member_leave'
  | 'channel_update'
  | 'reaction'
  | 'mention'
  | 'callback';

/** 平台事件 */
export interface PlatformEvent {
  /** 事件类型 */
  type: PlatformEventType;
  /** 事件数据 */
  data: unknown;
  /** 事件时间戳 */
  timestamp: number;
}

/** 适配器配置基类 */
export interface AdapterConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 应用ID */
  appId?: string;
  /** 应用密钥 */
  appSecret?: string;
  /** Webhook地址 (用于webhook模式) */
  webhookUrl?: string;
  /** Webhook路径 */
  webhookPath?: string;
  /** 连接模式 */
  connectionMode?: 'websocket' | 'webhook';
  /** 超时设置(ms) */
  timeoutMs?: number;
}

/** 飞书适配器配置 */
export interface FeishuConfig extends AdapterConfig {
  /** 飞书域名 */
  domain?: 'feishu' | 'lark' | string;
  /** 加密密钥 */
  encryptKey?: string;
  /** 验证Token */
  verificationToken?: string;
  /** 机器人名称 */
  botName?: string;
  /** 接收消息类型 */
  receiveMessageTypes?: string[];
  /** 是否需要@机器人 */
  requireMention?: boolean;
}

/** 企业微信适配器配置 */
export interface WeComConfig extends AdapterConfig {
  /** 企业ID */
  corpId: string;
  /** 企业名称 */
  corpName?: string;
  /** AgentId */
  agentId?: string | number;
  /** API密钥 (用于回调模式) */
  apiKey?: string;
  /** 回调模式AES密钥 */
  encodingAesKey?: string;
  /** 回调Token */
  callbackToken?: string;
}

/** 微信个人号适配器配置 */
export interface WechatConfig extends AdapterConfig {
  /** 协议类型: padplus | web | etc */
  protocol?: string;
  /** 是否自动通过好友请求 */
  autoFriend?: boolean;
  /** 管理员用户ID列表 */
  adminUsers?: string[];
  /** 机器人名称 */
  nickname?: string;
}

/** 统一适配器配置 */
export interface UnifiedAdapterConfig {
  /** 飞书配置 */
  feishu?: FeishuConfig;
  /** 企业微信配置 */
  wecom?: WeComConfig;
  /** 微信个人号配置 */
  wechat?: WechatConfig;
}

/** 适配器状态 */
export interface AdapterStatus {
  /** 平台名称 */
  platform: string;
  /** 是否连接 */
  connected: boolean;
  /** 连接时间 */
  connectedAt?: Date;
  /** 最后消息时间 */
  lastMessageAt?: Date;
  /** 错误信息 */
  error?: string;
  /** 统计数据 */
  stats: {
    messagesReceived: number;
    messagesSent: number;
    errors: number;
  };
}

/** 消息转换器接口 */
export interface MessageConverter<T = unknown> {
  /** 平台消息转换为标准消息 */
  toStandardMessage(platformMessage: T): MessageContext;
  /** 标准消息转换为平台消息 */
  fromStandardMessage(context: MessageContext): T;
  /** 解析平台特定内容 */
  parseContent(content: unknown): MessageContent;
  /** 序列化内容为平台格式 */
  serializeContent(content: MessageContent): unknown;
}

/** 适配器工厂接口 */
export interface AdapterFactory {
  createAdapter(config: AdapterConfig): MessageAdapter;
  validateConfig(config: unknown): boolean;
  getPlatformName(): string;
}

/** 路由匹配条件 */
export interface RoutingMatchCondition {
  /** 平台名称 */
  platform?: string;
  /** 会话类型 */
  sessionType?: 'p2p' | 'group' | 'channel';
  /** 频道/群组ID */
  channelId?: string;
  /** 关键词正则匹配 */
  keyword?: RegExp;
  /** 发送者ID */
  senderId?: string;
  /** 自定义条件函数 */
  custom?: (context: MessageContext) => boolean;
}

/** 路由规则 */
export interface RoutingRule {
  /** 匹配条件 */
  match: RoutingMatchCondition;
  /** 目标Agent ID */
  agentId: string;
  /** 优先级 (数字越小优先级越高) */
  priority: number;
  /** 是否启用 */
  enabled?: boolean;
}
