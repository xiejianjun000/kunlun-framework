/**
 * MCP (Model Context Protocol) Type Definitions
 * 用于与 MCP Server 通信的类型定义
 */

// JSON Schema 基本类型
export interface JSONSchemaProperty {
  type?: string;
  description?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  enum?: string[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface JSONSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchemaProperty;
  enum?: string[];
  default?: any;
}

// MCP 工具定义
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

// MCP 客户端配置
export interface MCPClientConfig {
  /** MCP Server 启动命令 */
  serverCommand: string;
  /** MCP Server 启动参数 */
  serverArgs?: string[];
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 连接超时 (ms) */
  timeout?: number;
  /** 最大重连次数 */
  maxRetries?: number;
  /** 重连延迟 (ms) */
  retryDelay?: number;
}

// MCP 协议消息类型
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, any>;
  };
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: MCPResult;
  error?: MCPError;
}

export interface MCPResult {
  contents?: MCPContent[];
  isError?: boolean;
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource';
  mimeType?: string;
  data?: string;
  text?: string;
  resource?: {
    uri: string;
    mimeType?: string;
  };
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// MCP 协议初始化
export interface MCPInitializeParams {
  protocolVersion?: string;
  capabilities?: MCPCapabilities;
  clientInfo?: MCPClientInfo;
}

export interface MCPCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: {};
}

export interface MCPClientInfo {
  name: string;
  version: string;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: MCPServerInfo;
}

export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

// 工具列表响应
export interface MCPToolsListResult {
  tools: MCPTool[];
}

// 工具调用参数
export interface MCPToolCallParams {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolCallResult {
  content: MCPContent[];
  isError?: boolean;
}

// 通知消息 (无响应)
export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
}

// 代码知识图谱相关类型
export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  languages: Record<string, number>;
  node_types: Record<string, number>;
  embedding_count: number;
}

export interface NodeInfo {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line_number?: number;
  signature?: string;
  docstring?: string;
}

export interface EdgeInfo {
  source: string;
  target: string;
  type: string;
}

export interface Community {
  id: string;
  name: string;
  node_count: number;
  files: string[];
  description?: string;
}

export interface Flow {
  id: string;
  entry_point: string;
  nodes: string[];
  depth: number;
}

export interface SearchResult {
  nodes: NodeInfo[];
  score?: number;
}

export interface ImpactRadius {
  changed_files: string[];
  affected_nodes: NodeInfo[];
  impacted_communities: string[];
}

export interface WikiPage {
  title: string;
  content: string;
  path: string;
}

export interface RefactorSuggestion {
  type: 'rename' | 'extract' | 'inline' | 'move' | 'delete_dead_code';
  original: string;
  suggested: string;
  confidence: number;
  impact: string;
}

// 客户端状态
export enum MCPClientState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}
