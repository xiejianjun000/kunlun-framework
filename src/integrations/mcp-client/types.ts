/**
 * MCP协议类型定义
 * Model Context Protocol - Type Definitions
 * 
 * MCP是一个标准化协议，用于AI助手与外部工具/资源之间的通信
 */

import { EventEmitter } from 'events';

// ============== JSON-RPC 基础类型 ==============

/** JSON-RPC 2.0 请求对象 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 响应对象 */
export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: JSONRPCError;
}

/** JSON-RPC 2.0 错误对象 */
export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

/** JSON-RPC 2.0 通知（无响应请求） */
export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// ============== MCP 协议方法定义 ==============

/** MCP 协议支持的方法 */
export enum MCPMethod {
  // 初始化
  INITIALIZE = 'initialize',
  INITIALIZED = 'initialized',
  
  // 工具相关
  TOOLS_LIST = 'tools/list',
  TOOLS_CALL = 'tools/call',
  
  // 资源相关
  RESOURCES_LIST = 'resources/list',
  RESOURCES_READ = 'resources/read',
  RESOURCES_SUBSCRIBE = 'resources/subscribe',
  RESOURCES_UNSUBSCRIBE = 'resources/unsubscribe',
  
  // 提示词相关
  PROMPTS_LIST = 'prompts/list',
  PROMPTS_GET = 'prompts/get',
  
  // 采样相关
  SAMPLING_CREATE = 'sampling/createMessage',
  
  // 根目录
  ROOTS_LIST = 'roots/list',
  
  // 窗口相关
  WINDOW_MESSAGE = 'window/message',
  
  // 进度
  PROGRESS = 'notifications/progress',
  
  // 日志
  LOG_MESSAGE = 'notifications/logMessage',
  
  // 取消
  CANCEL = 'cancel',
}

// ============== 工具类型 ==============

/** 工具输入模式 */
export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, ToolInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/** 工具输入属性 */
export interface ToolInputProperty {
  type?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: ToolInputProperty;
  enum?: unknown[];
  anyOf?: ToolInputProperty[];
  allOf?: ToolInputProperty[];
  oneOf?: ToolInputProperty[];
}

/** MCP 工具定义 */
export interface MCPTool {
  /** 工具唯一名称 */
  name: string;
  
  /** 工具描述 */
  description?: string;
  
  /** 输入参数模式 */
  inputSchema: ToolInputSchema;
  
  /** 工具来源服务器名称 */
  serverName?: string;
  
  /** 工具来源服务器版本 */
  serverVersion?: string;
}

/** 工具调用参数 */
export interface ToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

/** 工具调用结果 */
export interface ToolCallResult {
  content: ToolContent[];
  isError?: boolean;
}

/** 工具返回的内容块 */
export interface ToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    mimeType: string;
    name?: string;
  };
}

// ============== 资源类型 ==============

/** MCP 资源定义 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/** MCP 资源模板 */
export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// ============== 提示词类型 ==============

/** 提示词参数定义 */
export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

/** MCP 提示词定义 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

// ============== 初始化类型 ==============

/** 客户端能力 */
export interface ClientCapabilities {
  /** 采样能力 */
  sampling?: Record<string, unknown>;
  
  /** 根目录能力 */
  roots?: {
    listChanged?: boolean;
  };
  
  /** 窗口消息能力 */
  window?: {
    message?: boolean;
    showDocument?: boolean;
  };
}

/** 服务端能力 */
export interface ServerCapabilities {
  /** 工具能力 */
  tools?: {
    listChanged?: boolean;
  };
  
  /** 资源能力 */
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  
  /** 提示词能力 */
  prompts?: {
    listChanged?: boolean;
  };
  
  /** 采样能力 */
  sampling?: Record<string, unknown>;
}

/** 初始化请求参数 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: ProtocolAppInfo;
}

/** 协议应用信息 */
export interface ProtocolAppInfo {
  name: string;
  version: string;
}

/** 初始化响应结果 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ProtocolAppInfo;
}

// ============== 进度类型 ==============

/** 进度通知参数 */
export interface ProgressParams {
  progressToken: string | number;
  progress: number;
  total?: number;
  message?: string;
}

// ============== 日志类型 ==============

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

/** 日志消息参数 */
export interface LogMessageParams {
  level: LogLevel;
  logger?: string;
  data?: unknown[];
}

// ============== 错误代码 ==============

/** MCP 协议错误代码 */
export enum MCPCode {
  // JSON-RPC 标准错误
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP 特定错误
  TOOL_NOT_FOUND = -32604,
  TOOL_EXECUTION_ERROR = -32605,
  RESOURCE_NOT_FOUND = -32606,
  RESOURCE_ACCESS_DENIED = -32607,
  PROMPT_NOT_FOUND = -32608,
  SUBSCRIPTION_NOT_FOUND = -32609,
  
  // 连接相关错误
  CONNECTION_FAILED = -32000,
  CONNECTION_TIMEOUT = -32001,
  CONNECTION_CLOSED = -32002,
  TRANSPORT_ERROR = -32003,
}

// ============== 传输层类型 ==============

/** 传输类型 */
export type TransportType = 'stdio' | 'sse';

/** stdio 传输配置 */
export interface StdioTransportConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/** SSE 传输配置 */
export interface SSELransportConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

/** 传输配置 */
export type TransportConfig = StdioTransportConfig | SSELransportConfig;

// ============== 事件类型 ==============

/** MCP客户端事件 */
export interface MCPClientEvents {
  'tool:added': (tool: MCPTool) => void;
  'tool:removed': (toolName: string) => void;
  'tool:updated': (tool: MCPTool) => void;
  'tools:changed': () => void;
  'resource:added': (resource: MCPResource) => void;
  'resource:updated': (resource: MCPResource) => void;
  'prompt:added': (prompt: MCPPrompt) => void;
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: MCPError) => void;
  'log': (level: LogLevel, message: string, data?: unknown) => void;
}

/** MCP 错误类 */
export class MCPError extends Error {
  public readonly code: number;
  public readonly data?: unknown;
  
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }
}

// ============== 服务器配置类型 ==============

/** MCP 服务器配置（兼容 .mcp.json 格式） */
export interface MCPServerConfig {
  /** 服务器命令（stdio模式） */
  command?: string;
  
  /** 命令参数 */
  args?: string[];
  
  /** 环境变量 */
  env?: Record<string, string>;
  
  /** 工作目录 */
  cwd?: string;
  
  /** SSE模式URL */
  url?: string;
  
  /** 请求头（SSE模式） */
  headers?: Record<string, string>;
  
  /** 传输类型（可选，自动检测） */
  transport?: TransportType;
}

/** MCP 配置文件格式（.mcp.json） */
export interface MCPConfig {
  mcpServers?: Record<string, MCPServerConfig>;
}

// ============== 连接状态 ==============

/** MCP客户端连接状态 */
export enum ConnectionState {
  /** 初始状态 */
  IDLE = 'idle',
  
  /** 连接中 */
  CONNECTING = 'connecting',
  
  /** 已连接 */
  CONNECTED = 'connected',
  
  /** 断开连接 */
  DISCONNECTED = 'disconnected',
  
  /** 重连中 */
  RECONNECTING = 'reconnecting',
  
  /** 错误状态 */
  ERROR = 'error',
}

// ============== 重连配置 ==============

/** 重连策略配置 */
export interface ReconnectConfig {
  /** 是否启用自动重连 */
  enabled: boolean;
  
  /** 最大重试次数 */
  maxRetries: number;
  
  /** 初始重连延迟（毫秒） */
  initialDelay: number;
  
  /** 最大重连延迟（毫秒） */
  maxDelay: number;
  
  /** 重连延迟倍增因子 */
  backoffMultiplier: number;
}

// ============== 默认值 ==============

/** 默认协议版本 */
export const DEFAULT_PROTOCOL_VERSION = '2024-11-05';

/** 默认MCP端口 */
export const DEFAULT_SSE_PORT = 3100;

/** 默认重连配置 */
export const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  enabled: true,
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/** 导出事件发射器类型 */
export type MCPClientEventEmitter = EventEmitter;
