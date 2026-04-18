/**
 * OpenTaiji Actor Runtime - MCP集成模块
 * 实现Actor与MCP工具服务的集成
 */

import { ActorRef, Message } from './types';

/** MCP客户端配置 */
export interface MCPClientConfig {
  name: string;
  version: string;
  serverUrl?: string;
  enabled?: boolean;
}

/** MCP工具定义 */
export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
  outputSchema?: {
    type: 'object';
    [key: string]: unknown;
  };
}

/** MCP工具调用请求 */
export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

/** MCP工具调用响应 */
export interface MCPToolCallResponse {
  success: boolean;
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** MCP工具调用结果 */
export interface MCPToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
}

/** MCP资源 */
export interface MCPResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

/** MCP资源内容 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/** MCP错误 */
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

/** MCP工具请求消息 */
export interface MCPToolRequest {
  readonly type: 'MCPToolRequest';
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
  readonly correlationId?: string;
}

/** MCP工具响应消息 */
export interface MCPToolResponse {
  readonly type: 'MCPToolResponse';
  readonly toolName: string;
  readonly result: MCPToolResult;
  readonly correlationId?: string;
  readonly error?: string;
}

/** MCP资源请求消息 */
export interface MCPResourceRequest {
  readonly type: 'MCPResourceRequest';
  readonly uri: string;
  readonly correlationId?: string;
}

/** MCP资源响应消息 */
export interface MCPResourceResponse {
  readonly type: 'MCPResourceResponse';
  readonly uri: string;
  readonly content: MCPResourceContent[];
  readonly correlationId?: string;
  readonly error?: string;
}

/** MCP工具调用器接口 */
export interface IMCToolCaller {
  callTool(request: MCPToolCallRequest): Promise<MCPToolCallResponse>;
  listTools(): Promise<MCPToolDefinition[]>;
  subscribe(uri: string): Promise<void>;
  unsubscribe(uri: string): Promise<void>;
}

/** MCP错误类型 */
export class MCPActorError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly toolName?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MCPActorError';
  }
}

/** 默认MCP工具调用器 */
export class DefaultMCPToolCaller implements IMCToolCaller {
  private tools: Map<string, MCPToolDefinition> = new Map();
  private resources: Map<string, MCPResource> = new Map();
  private config: MCPClientConfig;

  constructor(config?: MCPClientConfig) {
    this.config = config || {
      name: 'default-mcp-client',
      version: '1.0.0',
      serverUrl: '',
      enabled: true
    };
  }

  /** 注册工具 */
  registerTool(tool: MCPToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /** 注册多个工具 */
  registerTools(tools: MCPToolDefinition[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /** 注册资源 */
  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
  }

  async callTool(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
    const tool = this.tools.get(request.name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: -32601,
          message: `Tool not found: ${request.name}`,
          data: { toolName: request.name }
        }
      };
    }

    try {
      // 验证输入参数
      const validatedParams = this.validateParams(request.arguments, tool.inputSchema, tool.name);
      
      // 调用工具处理函数（模拟）
      const result = await this.executeTool(tool, validatedParams);
      
      return {
        success: true,
        content: Array.isArray(result) ? result : [{ type: 'text', text: JSON.stringify(result) }]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Tool execution failed',
          data: { toolName: request.name, originalError: error }
        }
      };
    }
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    return Array.from(this.tools.values());
  }

  async subscribe(uri: string): Promise<void> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new MCPActorError(`Resource not found: ${uri}`, -32601);
    }
    // 实现订阅逻辑
  }

  async unsubscribe(uri: string): Promise<void> {
    // 实现取消订阅逻辑
  }

  private validateParams(
    params: Record<string, unknown>,
    schema: MCPToolDefinition['inputSchema'],
    toolName: string
  ): Record<string, unknown> {
    if (!schema.required) return params;

    for (const required of (schema.required || [])) {
      if (!(required in params)) {
        throw new MCPActorError(
          `Missing required parameter: ${required}`,
          -32602,
          toolName
        );
      }
    }

    return params;
  }

  private async executeTool(
    tool: MCPToolDefinition,
    params: Record<string, unknown>
  ): Promise<unknown> {
    // 这里应该调用实际的工具处理函数
    // 目前是模拟实现
    return { success: true, params };
  }
}

/** MCP Actor工厂 */
export interface MCPActorFactoryOptions {
  mcpCaller: IMCToolCaller;
  toolNames?: string[];
  autoSubscribe?: boolean;
}

/** 创建MCP集成Actor的工厂函数 */
export function createMCPActorFactory(options: MCPActorFactoryOptions) {
  return class MCPActor {
    private mcpCaller: IMCToolCaller;
    private toolNames: Set<string>;
    private autoSubscribe: boolean;

    constructor() {
      this.mcpCaller = options.mcpCaller;
      this.toolNames = new Set(options.toolNames || []);
      this.autoSubscribe = options.autoSubscribe ?? true;
    }

    /** 处理MCP工具请求 */
    async handleToolRequest(request: MCPToolRequest): Promise<MCPToolResponse> {
      try {
        const response = await this.mcpCaller.callTool({
          name: request.toolName,
          arguments: request.arguments
        });

        if (response.success) {
          return {
            type: 'MCPToolResponse',
            toolName: request.toolName,
            result: { content: response.content || [] },
            correlationId: request.correlationId
          };
        } else {
          return {
            type: 'MCPToolResponse',
            toolName: request.toolName,
            result: { content: [] },
            correlationId: request.correlationId,
            error: response.error?.message
          };
        }
      } catch (error) {
        return {
          type: 'MCPToolResponse',
          toolName: request.toolName,
          result: { content: [] },
          correlationId: request.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    /** 处理MCP资源请求 */
    async handleResourceRequest(request: MCPResourceRequest): Promise<MCPResourceResponse> {
      try {
        // 简化实现
        return {
          type: 'MCPResourceResponse',
          uri: request.uri,
          content: [],
          correlationId: request.correlationId
        };
      } catch (error) {
        return {
          type: 'MCPResourceResponse',
          uri: request.uri,
          content: [],
          correlationId: request.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    /** 获取可用工具列表 */
    async getAvailableTools(): Promise<MCPToolDefinition[]> {
      return this.mcpCaller.listTools();
    }
  };
}

/** MCP Actor引用装饰器 - 为ActorRef添加MCP能力 */
export class MCPActorRefDecorator<T = unknown> {
  constructor(private ref: ActorRef<T>) {}

  /** 发送工具调用请求 */
  requestTool(
    toolName: string,
    args: Record<string, unknown>,
    sender?: ActorRef<unknown>
  ): void {
    const request: MCPToolRequest = {
      type: 'MCPToolRequest',
      toolName,
      arguments: args,
      correlationId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.ref.tell(request as unknown as T, sender);
  }

  /** 发送资源请求 */
  requestResource(uri: string, sender?: ActorRef<unknown>): void {
    const request: MCPResourceRequest = {
      type: 'MCPResourceRequest',
      uri,
      correlationId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.ref.tell(request as unknown as T, sender);
  }

  /** 获取原始引用 */
  getRef(): ActorRef<T> {
    return this.ref;
  }

  /** 代理tell */
  tell(message: T, sender?: ActorRef<unknown>): void {
    this.ref.tell(message, sender);
  }

  /** 代理ask */
  ask<R>(message: T, timeout?: number): Promise<R> {
    return this.ref.ask<R>(message, timeout);
  }
}

/** 创建MCP Actor装饰器 */
export function withMCPCapabilities<T>(ref: ActorRef<T>): MCPActorRefDecorator<T> {
  return new MCPActorRefDecorator(ref);
}
