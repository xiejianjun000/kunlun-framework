/**
 * MCP客户端 - 主客户端类
 * MCP Client - Main Client Implementation
 * 
 * 整合传输层、工具注册表，提供统一的MCP协议调用接口
 */

import { EventEmitter } from 'events';
import {
  MCPTransport,
  StdioTransport,
  SSETransport,
  TransportFactory,
} from './MCPTransport';
import { MCPToolRegistry, ToolExecutor } from './MCPToolRegistry';
import {
  MCPTool,
  MCPServerConfig,
  ConnectionState,
  ReconnectConfig,
  DEFAULT_RECONNECT_CONFIG,
  DEFAULT_PROTOCOL_VERSION,
  ClientCapabilities,
  InitializeParams,
  InitializeResult,
  ToolCallParams,
  ToolCallResult,
  ToolContent,
  MCPError,
  MCPCode,
  JSONRPCRequest,
  JSONRPCNotification,
  JSONRPCResponse,
  MCPResource,
  MCPPrompt,
  ProtocolAppInfo,
  LogLevel,
} from './types';

interface MCPServerConnection {
  /** 服务器名称 */
  name: string;
  
  /** 服务器配置 */
  config: MCPServerConfig;
  
  /** 传输层实例 */
  transport: MCPTransport;
  
  /** 连接状态 */
  state: ConnectionState;
  
  /** 重连配置 */
  reconnectConfig?: ReconnectConfig;
  
  /** 当前重连次数 */
  reconnectAttempts: number;
  
  /** 协议版本 */
  protocolVersion: string;
  
  /** 服务器信息 */
  serverInfo?: ProtocolAppInfo;
  
  /** 服务器能力 */
  capabilities?: Record<string, unknown>;
}

/**
 * MCP客户端配置
 */
export interface MCPClientConfig {
  /** 客户端信息 */
  clientInfo: ProtocolAppInfo;
  
  /** 客户端能力 */
  capabilities?: ClientCapabilities;
  
  /** 重连配置 */
  reconnect?: Partial<ReconnectConfig> | ReconnectConfig;
  
  /** 请求超时（毫秒） */
  requestTimeout?: number;
  
  /** 默认工作目录 */
  defaultCwd?: string;
}

/**
 * MCP客户端事件
 */
interface MCPClientEvents {
  'server:connected': (serverName: string) => void;
  'server:disconnected': (serverName: string) => void;
  'server:error': (serverName: string, error: Error) => void;
  'tool:added': (tool: MCPTool, serverName: string) => void;
  'tool:removed': (toolName: string, serverName: string) => void;
  'tool:updated': (tool: MCPTool, serverName: string) => void;
  'tools:changed': (serverName: string) => void;
  'resource:added': (resource: MCPResource, serverName: string) => void;
  'prompt:added': (prompt: MCPPrompt, serverName: string) => void;
  'error': (error: MCPError) => void;
  'log': (level: LogLevel, message: string, data?: unknown) => void;
}

/**
 * MCP客户端
 * 
 * 主要功能：
 * - 连接多个MCP服务器
 * - 动态发现工具、资源、提示词
 * - 调用MCP工具
 * - 错误处理和重连机制
 */
export class MCPClient extends EventEmitter {
  /** 客户端标识 */
  public readonly clientId: string;
  
  /** 客户端配置 */
  public readonly config: MCPClientConfig;
  
  /** 工具注册表 */
  public readonly registry: MCPToolRegistry;
  
  /** 服务器连接映射 */
  private servers: Map<string, MCPServerConnection> = new Map();
  
  /** 消息处理器 */
  private messageHandlers: Map<string, (response: JSONRPCResponse) => void> = new Map();
  
  /** 请求超时时间 */
  private readonly requestTimeout: number;
  
  /** 消息ID计数器 */
  private messageId: number = 0;
  
  /**
   * 创建MCP客户端
   */
  constructor(config: MCPClientConfig) {
    super();
    
    this.clientId = this.generateClientId();
    // 确保reconnect有默认值
    const finalConfig: MCPClientConfig = {
      ...config,
      reconnect: config.reconnect ? { ...DEFAULT_RECONNECT_CONFIG, ...config.reconnect } : DEFAULT_RECONNECT_CONFIG,
    };
    this.config = finalConfig;
    
    this.requestTimeout = config.requestTimeout || 30000;
    this.registry = new MCPToolRegistry();
    
    // 设置注册表事件转发
    this.setupRegistryEvents();
  }
  
  // ============== 连接管理 ==============
  
  /**
   * 连接到MCP服务器
   */
  async connect(serverName: string, config: MCPServerConfig): Promise<void> {
    // 如果已连接，先断开
    if (this.servers.has(serverName)) {
      await this.disconnect(serverName);
    }
    
    this.log('info', `正在连接到MCP服务器: ${serverName}`);
    
    try {
      // 创建传输层
      const transportConfig = config.transport === 'sse' && config.url
        ? { type: 'sse' as const, url: config.url, headers: config.headers }
        : { 
            type: 'stdio' as const, 
            command: config.command || 'uvx',
            args: config.args || ['code-review-graph', 'serve'],
            env: config.env,
            cwd: config.cwd || this.config.defaultCwd,
          };
      
      const transport = TransportFactory.create(transportConfig);
      
      // 创建服务器连接对象
      // 合并默认重连配置
      const mergedReconnect: ReconnectConfig | undefined = this.config.reconnect 
        ? { ...DEFAULT_RECONNECT_CONFIG, ...this.config.reconnect }
        : undefined;
      
      const connection: MCPServerConnection = {
        name: serverName,
        config,
        transport,
        state: ConnectionState.CONNECTING,
        reconnectConfig: mergedReconnect,
        reconnectAttempts: 0,
        protocolVersion: DEFAULT_PROTOCOL_VERSION,
      };
      
      // 设置传输层事件处理
      this.setupTransportEvents(serverName, connection);
      
      // 连接传输层
      await transport.connect();
      
      // 初始化MCP协议
      await this.initialize(serverName, connection);
      
      // 存储连接
      this.servers.set(serverName, connection);
      
      // 发现工具
      await this.discoverTools(serverName, connection);
      
      this.log('info', `MCP服务器连接成功: ${serverName}`);
      this.emit('server:connected', serverName);
    } catch (error) {
      this.log('error', `MCP服务器连接失败: ${serverName}`, error);
      this.emit('server:error', serverName, error as Error);
      throw error;
    }
  }
  
  /**
   * 断开服务器连接
   */
  async disconnect(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (!connection) {
      return;
    }
    
    this.log('info', `正在断开MCP服务器: ${serverName}`);
    
    connection.state = ConnectionState.DISCONNECTED;
    
    try {
      await connection.transport.disconnect();
    } catch (error) {
      this.log('error', `断开连接时出错: ${serverName}`, error);
    }
    
    // 清理注册表中的条目
    this.registry.unregisterServer(serverName);
    
    // 清理消息处理器
    this.cleanupMessageHandlers(serverName);
    
    this.servers.delete(serverName);
    
    this.log('info', `MCP服务器已断开: ${serverName}`);
    this.emit('server:disconnected', serverName);
  }
  
  /**
   * 断开所有服务器
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.servers.keys());
    await Promise.all(serverNames.map((name) => this.disconnect(name)));
  }
  
  /**
   * 获取服务器连接状态
   */
  getServerState(serverName: string): ConnectionState | undefined {
    return this.servers.get(serverName)?.state;
  }
  
  /**
   * 获取所有已连接的服务器
   */
  getConnectedServers(): string[] {
    return Array.from(this.servers.values())
      .filter((conn) => conn.state === ConnectionState.CONNECTED)
      .map((conn) => conn.name);
  }
  
  /**
   * 是否已连接到指定服务器
   */
  isConnected(serverName: string): boolean {
    return this.servers.get(serverName)?.state === ConnectionState.CONNECTED;
  }
  
  // ============== 工具调用 ==============
  
  /**
   * 调用MCP工具
   * 
   * @param params 工具调用参数
   * @returns 工具执行结果
   */
  async callTool(params: ToolCallParams): Promise<ToolCallResult> {
    const { name, arguments: args } = params;
    
    // 查找工具所在服务器
    const tool = this.registry.getTool(name);
    if (!tool) {
      throw new MCPError(MCPCode.TOOL_NOT_FOUND, `工具不存在: ${name}`);
    }
    
    // 使用注册表的执行器
    try {
      return await this.registry.executeTool(name, args);
    } catch {
      // 工具执行失败，尝试通过MCP协议调用
      return this.callToolViaProtocol(name, args);
    }
  }
  
  /**
   * 通过MCP协议调用工具
   */
  private async callToolViaProtocol(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolCallResult> {
    // 遍历所有连接的服务器查找工具
    const serversArray = Array.from(this.servers.entries());
    for (const [serverName, connection] of serversArray) {
      const tool = this.registry.getTool(toolName);
      if (tool && this.registry.getTool(toolName)) {
        // 找到服务器，使用该服务器调用工具
        return this.sendToolCallRequest(connection, toolName, args);
      }
    }
    
    throw new MCPError(MCPCode.TOOL_NOT_FOUND, `工具不存在: ${toolName}`);
  }
  
  /**
   * 发送工具调用请求
   */
  private async sendToolCallRequest(
    connection: MCPServerConnection,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolCallResult> {
    const id = this.generateMessageId();
    
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(String(id));
        reject(new MCPError(
          MCPCode.CONNECTION_TIMEOUT,
          `工具调用超时: ${toolName}`
        ));
      }, this.requestTimeout);
      
      const handler = (response: JSONRPCResponse) => {
        if (response.id === id) {
          clearTimeout(timeout);
          this.messageHandlers.delete(String(id));
          
          if (response.error) {
            reject(new MCPError(
              response.error.code,
              response.error.message,
              response.error.data
            ));
          } else {
            resolve(response.result as ToolCallResult);
          }
        }
      };
      
      this.messageHandlers.set(String(id), handler);
      connection.transport.send(request);
    });
  }
  
  // ============== 资源操作 ==============
  
  /**
   * 读取资源
   */
  async readResource(uri: string): Promise<{ contents: ToolContent[] }> {
    const serversArray = Array.from(this.servers.values());
    for (const connection of serversArray) {
      if (connection.state !== ConnectionState.CONNECTED) {
        continue;
      }
      
      const resource = this.registry.getResource(uri);
      if (resource) {
        const id = this.generateMessageId();
        
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id,
          method: 'resources/read',
          params: { uri },
        };
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.messageHandlers.delete(String(id));
            reject(new MCPError(
              MCPCode.CONNECTION_TIMEOUT,
              `资源读取超时: ${uri}`
            ));
          }, this.requestTimeout);
          
          const handler = (response: JSONRPCResponse) => {
            if (response.id === id) {
              clearTimeout(timeout);
              this.messageHandlers.delete(String(id));
              
              if (response.error) {
                reject(new MCPError(
                  response.error.code,
                  response.error.message,
                  response.error.data
                ));
              } else {
                resolve(response.result as { contents: ToolContent[] });
              }
            }
          };
          
          this.messageHandlers.set(String(id), handler);
          connection.transport.send(request);
        });
      }
    }
    
    throw new MCPError(MCPCode.RESOURCE_NOT_FOUND, `资源不存在: ${uri}`);
  }
  
  // ============== 提示词操作 ==============
  
  /**
   * 获取提示词
   */
  async getPrompt(promptName: string, args?: Record<string, string>): Promise<{
    messages: Array<{ role: string; content: { type: string; text?: string } }>;
  }> {
    const serversArray = Array.from(this.servers.values());
    for (const connection of serversArray) {
      if (connection.state !== ConnectionState.CONNECTED) {
        continue;
      }
      
      if (this.registry.hasPrompt(promptName)) {
        const id = this.generateMessageId();
        
        const request: JSONRPCRequest = {
          jsonrpc: '2.0',
          id,
          method: 'prompts/get',
          params: {
            name: promptName,
            arguments: args,
          },
        };
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.messageHandlers.delete(String(id));
            reject(new MCPError(
              MCPCode.CONNECTION_TIMEOUT,
              `提示词获取超时: ${promptName}`
            ));
          }, this.requestTimeout);
          
          const handler = (response: JSONRPCResponse) => {
            if (response.id === id) {
              clearTimeout(timeout);
              this.messageHandlers.delete(String(id));
              
              if (response.error) {
                reject(new MCPError(
                  response.error.code,
                  response.error.message,
                  response.error.data
                ));
              } else {
                resolve(response.result as {
                  messages: Array<{ role: string; content: { type: string; text?: string } }>;
                });
              }
            }
          };
          
          this.messageHandlers.set(String(id), handler);
          connection.transport.send(request);
        });
      }
    }
    
    throw new MCPError(MCPCode.PROMPT_NOT_FOUND, `提示词不存在: ${promptName}`);
  }
  
  // ============== 初始化 ==============
  
  /**
   * 初始化MCP协议
   */
  private async initialize(
    serverName: string,
    connection: MCPServerConnection
  ): Promise<void> {
    const id = this.generateMessageId();
    
    const params: InitializeParams = {
      protocolVersion: connection.protocolVersion,
      capabilities: this.config.capabilities || {},
      clientInfo: this.config.clientInfo,
    };
    
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: params as unknown as Record<string, unknown>,
    };
    
    const result = await this.sendRequest<InitializeResult>(connection, request);
    
    connection.protocolVersion = result.protocolVersion;
    connection.serverInfo = result.serverInfo;
    connection.capabilities = result.capabilities as Record<string, unknown>;
    connection.state = ConnectionState.CONNECTED;
    
    // 注册服务器能力
    this.registry.registerServerCapabilities(serverName, result.capabilities);
    
    // 发送initialized通知
    const notification: JSONRPCNotification = {
      jsonrpc: '2.0',
      method: 'initialized',
      params: {},
    };
    connection.transport.send(notification);
    
    this.log('info', `MCP协议初始化成功: ${serverName}`, {
      protocolVersion: result.protocolVersion,
      serverInfo: result.serverInfo,
    });
  }
  
  /**
   * 发现工具
   */
  private async discoverTools(
    serverName: string,
    connection: MCPServerConnection
  ): Promise<void> {
    try {
      const id = this.generateMessageId();
      
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id,
        method: 'tools/list',
        params: {},
      };
      
      const result = await this.sendRequest<{ tools: MCPTool[] }>(
        connection,
        request
      );
      
      // 批量注册工具
      for (const tool of result.tools) {
        const fullTool: MCPTool = {
          ...tool,
          serverName,
        };
        
        // 注册工具到注册表
        this.registry.registerTool(
          fullTool,
          serverName,
          async (toolArgs) => {
            return this.sendToolCallRequest(connection, tool.name, toolArgs);
          }
        );
      }
      
      // 检查并发现资源
      if (connection.capabilities?.['resources']) {
        await this.discoverResources(serverName, connection);
      }
      
      // 检查并发现提示词
      if (connection.capabilities?.['prompts']) {
        await this.discoverPrompts(serverName, connection);
      }
      
      this.log('info', `发现工具完成: ${serverName}`, {
        toolCount: result.tools.length,
      });
    } catch (error) {
      this.log('error', `发现工具失败: ${serverName}`, error);
    }
  }
  
  /**
   * 发现资源
   */
  private async discoverResources(
    serverName: string,
    connection: MCPServerConnection
  ): Promise<void> {
    try {
      const result = await this.sendRequest<{
        resources: MCPResource[];
        resourceTemplates?: MCPResource[];
      }>(connection, {
        jsonrpc: '2.0',
        id: this.generateMessageId(),
        method: 'resources/list',
        params: {},
      });
      
      if (result.resources) {
        this.registry.registerResources(result.resources, serverName);
      }
      
      if (result.resourceTemplates) {
        for (const template of result.resourceTemplates) {
          // 转换为资源模板格式
          this.registry.registerResourceTemplate({
            uriTemplate: (template as unknown as { uriTemplate?: string }).uriTemplate || template.uri,
            name: template.name,
            description: template.description,
            mimeType: template.mimeType,
          }, serverName);
        }
      }
    } catch (error) {
      this.log('error', `发现资源失败: ${serverName}`, error);
    }
  }
  
  /**
   * 发现提示词
   */
  private async discoverPrompts(
    serverName: string,
    connection: MCPServerConnection
  ): Promise<void> {
    try {
      const result = await this.sendRequest<{ prompts: MCPPrompt[] }>(
        connection,
        {
          jsonrpc: '2.0',
          id: this.generateMessageId(),
          method: 'prompts/list',
          params: {},
        }
      );
      
      if (result.prompts) {
        this.registry.registerPrompts(result.prompts, serverName);
      }
    } catch (error) {
      this.log('error', `发现提示词失败: ${serverName}`, error);
    }
  }
  
  // ============== 传输层事件处理 ==============
  
  /**
   * 设置传输层事件处理
   */
  private setupTransportEvents(
    serverName: string,
    connection: MCPServerConnection
  ): void {
    const { transport } = connection;
    
    // 消息处理
    transport.on('message', (message) => {
      this.handleMessage(serverName, message);
    });
    
    // 错误处理
    transport.on('error', (error) => {
      this.log('error', `传输层错误: ${serverName}`, error);
      this.emit('server:error', serverName, error);
      this.handleDisconnection(serverName, connection, error);
    });
    
    // 断开连接
    transport.on('close', () => {
      this.handleDisconnection(serverName, connection);
    });
    
    // 状态变化
    transport.on('stateChange', (state) => {
      connection.state = state;
      this.emit('stateChange', serverName, state);
    });
  }
  
  /**
   * 处理收到的消息
   */
  private handleMessage(
    serverName: string,
    message: JSONRPCRequest | JSONRPCResponse | JSONRPCNotification
  ): void {
    // 处理响应消息
    if ('id' in message && 'result' in message) {
      const handler = this.messageHandlers.get(String(message.id));
      if (handler) {
        handler(message as JSONRPCResponse);
      }
      return;
    }
    
    // 处理通知消息
    if (!('id' in message)) {
      this.handleNotification(serverName, message);
    }
  }
  
  /**
   * 处理通知消息
   */
  private handleNotification(
    serverName: string,
    notification: JSONRPCNotification
  ): void {
    const { method } = notification;
    
    switch (method) {
      case 'notifications/tools_changed':
        this.refreshTools(serverName);
        break;
        
      case 'notifications/resources_changed':
        this.refreshResources(serverName);
        break;
        
      case 'notifications/prompts_changed':
        this.refreshPrompts(serverName);
        break;
        
      case 'notifications/message':
        this.log('info', `服务器消息: ${serverName}`, notification.params);
        break;
        
      case 'notifications/logMessage':
        this.handleLogMessage(notification.params);
        break;
        
      default:
        this.log('info', `未处理的通知: ${method}`, notification.params);
    }
  }
  
  /**
   * 处理日志消息
   */
  private handleLogMessage(params?: Record<string, unknown>): void {
    if (params) {
      const level = (params.level as LogLevel) || 'info';
      const data = params.data;
      this.emit('log', level, 'Server log message', data);
    }
  }
  
  /**
   * 处理断开连接
   */
  private async handleDisconnection(
    serverName: string,
    connection: MCPServerConnection,
    error?: Error
  ): Promise<void> {
    if (connection.state === ConnectionState.DISCONNECTED) {
      return;
    }
    
    connection.state = ConnectionState.DISCONNECTED;
    this.emit('server:disconnected', serverName);
    
    // 尝试重连
    if (this.config.reconnect?.enabled) {
      await this.attemptReconnect(serverName, connection, error);
    }
  }
  
  /**
   * 尝试重连
   */
  private async attemptReconnect(
    serverName: string,
    connection: MCPServerConnection,
    lastError?: Error
  ): Promise<void> {
    const { reconnectConfig, reconnectAttempts } = connection;
    // 使用默认值如果reconnectConfig未定义
    const config = reconnectConfig || DEFAULT_RECONNECT_CONFIG;
    
    if (reconnectAttempts >= config.maxRetries) {
      this.log('error', `重连次数超限: ${serverName}`);
      this.emit('error', new MCPError(
        MCPCode.CONNECTION_FAILED,
        `无法连接到服务器: ${serverName}`,
        { lastError }
      ));
      return;
    }
    
    connection.state = ConnectionState.RECONNECTING;
    const delay = Math.min(
      config.initialDelay * 
        Math.pow(config.backoffMultiplier, reconnectAttempts),
      config.maxDelay
    );
    
    this.log('info', `${delay / 1000}秒后尝试重连: ${serverName} (第${reconnectAttempts + 1}次)`);
    
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    connection.reconnectAttempts++;
    
    try {
      await this.connect(serverName, connection.config);
      connection.reconnectAttempts = 0;
      this.log('info', `重连成功: ${serverName}`);
    } catch (error) {
      this.log('error', `重连失败: ${serverName}`, error);
      await this.attemptReconnect(serverName, connection, error as Error);
    }
  }
  
  // ============== 工具刷新 ==============
  
  /**
   * 刷新工具列表
   */
  private async refreshTools(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (!connection || connection.state !== ConnectionState.CONNECTED) {
      return;
    }
    
    // 清除旧工具
    const oldTools = this.registry.getToolsByServer(serverName);
    for (const tool of oldTools) {
      this.registry.removeTool(tool.name);
    }
    
    // 重新发现工具
    await this.discoverTools(serverName, connection);
    this.emit('tools:changed', serverName);
  }
  
  /**
   * 刷新资源列表
   */
  private async refreshResources(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (!connection || connection.state !== ConnectionState.CONNECTED) {
      return;
    }
    
    await this.discoverResources(serverName, connection);
  }
  
  /**
   * 刷新提示词列表
   */
  private async refreshPrompts(serverName: string): Promise<void> {
    const connection = this.servers.get(serverName);
    if (!connection || connection.state !== ConnectionState.CONNECTED) {
      return;
    }
    
    await this.discoverPrompts(serverName, connection);
  }
  
  // ============== 辅助方法 ==============
  
  /**
   * 设置注册表事件转发
   */
  private setupRegistryEvents(): void {
    this.registry.on('tool:added', (tool) => {
      this.emit('tool:added', tool, (tool as { serverName?: string }).serverName || '');
    });
    
    this.registry.on('tool:removed', (toolName) => {
      // 查找工具所在服务器
      const serversArray = Array.from(this.servers.entries());
      for (const [serverName, connection] of serversArray) {
        if (connection.state === ConnectionState.CONNECTED) {
          const tool = this.registry.getTool(toolName);
          if (tool) {
            this.emit('tool:removed', toolName, serverName);
            break;
          }
        }
      }
    });
    
    this.registry.on('tool:updated', (tool) => {
      this.emit('tool:updated', tool, (tool as { serverName?: string }).serverName || '');
    });
    
    this.registry.on('resource:added', (resource) => {
      // 查找资源所在服务器
      const serversArray = Array.from(this.servers.entries());
      for (const [serverName, connection] of serversArray) {
        if (connection.state === ConnectionState.CONNECTED) {
          const r = this.registry.getResource(resource.uri);
          if (r) {
            this.emit('resource:added', resource, serverName);
            break;
          }
        }
      }
    });
    
    this.registry.on('prompt:added', (prompt) => {
      // 查找提示词所在服务器
      const serversArray = Array.from(this.servers.entries());
      for (const [serverName, connection] of serversArray) {
        if (connection.state === ConnectionState.CONNECTED) {
          const p = this.registry.getPrompt(prompt.name);
          if (p) {
            this.emit('prompt:added', prompt, serverName);
            break;
          }
        }
      }
    });
  }
  
  /**
   * 发送请求并等待响应
   */
  private sendRequest<R>(
    connection: MCPServerConnection,
    request: JSONRPCRequest
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(String(request.id));
        reject(new MCPError(
          MCPCode.CONNECTION_TIMEOUT,
          `请求超时: ${request.method}`
        ));
      }, this.requestTimeout);
      
      const handler = (response: JSONRPCResponse) => {
        if (response.id === request.id) {
          clearTimeout(timeout);
          this.messageHandlers.delete(String(request.id));
          
          if (response.error) {
            reject(new MCPError(
              response.error.code,
              response.error.message,
              response.error.data
            ));
          } else {
            resolve(response.result as R);
          }
        }
      };
      
      this.messageHandlers.set(String(request.id), handler);
      connection.transport.send(request);
    });
  }
  
  /**
   * 清理消息处理器
   */
  private cleanupMessageHandlers(_serverName: string): void {
    // 清理所有处理器（简单清理）
    const keys = Array.from(this.messageHandlers.keys());
    for (const key of keys) {
      this.messageHandlers.delete(key);
    }
  }
  
  /**
   * 生成客户端ID
   */
  private generateClientId(): string {
    return `mcp-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 生成消息ID
   */
  private generateMessageId(): number {
    return ++this.messageId;
  }
  
  /**
   * 日志记录
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (data) {
      console.log(`[MCP Client ${level.toUpperCase()}] ${message}`, data);
    } else {
      console.log(`[MCP Client ${level.toUpperCase()}] ${message}`);
    }
    this.emit('log', level, message, data);
  }
  
  /**
   * 销毁客户端
   */
  async destroy(): Promise<void> {
    await this.disconnectAll();
    this.registry.clear();
    this.removeAllListeners();
  }
}

// ============== 便捷函数 ==============

/**
 * 从.mcp.json配置文件创建MCP客户端
 */
export async function createMCPClientFromConfig(
  configPath: string,
  clientInfo: ProtocolAppInfo
): Promise<MCPClient> {
  // 动态导入fs以避免类型问题
  const fs = await import('fs');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);
  
  const client = new MCPClient({
    clientInfo,
  });
  
  // 连接所有配置的服务器
  const servers = config.mcpServers || {};
  const serverEntries = Object.entries(servers);
  for (const [serverName, serverConfig] of serverEntries) {
    await client.connect(serverName, serverConfig as MCPServerConfig);
  }
  
  return client;
}
