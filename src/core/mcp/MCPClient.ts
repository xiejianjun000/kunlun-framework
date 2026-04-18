/**
 * MCP Client 实现
 * 通过 stdio 通信协议与 MCP Server 交互
 */

import { spawn, ChildProcess, StdioOptions } from 'child_process';
import { EventEmitter } from 'events';
import {
  MCPClientConfig,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPTool,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPClientState,
  MCPContent,
} from './types';

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: Required<MCPClientConfig>;
  private state: MCPClientState = MCPClientState.DISCONNECTED;
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (value: MCPResponse) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = '';
  private initialized = false;
  private serverCapabilities: any = null;

  constructor(config: MCPClientConfig) {
    super();
    this.config = {
      serverCommand: config.serverCommand,
      serverArgs: config.serverArgs || [],
      cwd: config.cwd || process.cwd(),
      env: config.env || {},
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * 连接到 MCP Server
   */
  async connect(): Promise<void> {
    if (this.state === MCPClientState.CONNECTED) {
      return;
    }

    this.setState(MCPClientState.CONNECTING);
    this.buffer = '';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      try {
        this.startProcess();
        
        // 等待进程启动
        this.process!.once('spawn', () => {
          // 初始化 MCP 协议
          this.initialize()
            .then((result) => {
              clearTimeout(timeout);
              this.serverCapabilities = result.capabilities;
              this.initialized = true;
              this.setState(MCPClientState.CONNECTED);
              this.emit('connected');
              resolve();
            })
            .catch((err) => {
              clearTimeout(timeout);
              this.setState(MCPClientState.ERROR);
              reject(err);
            });
        });

        this.process!.on('error', (err) => {
          clearTimeout(timeout);
          this.setState(MCPClientState.ERROR);
          this.emit('error', err);
          reject(err);
        });

        this.process!.on('exit', (code, signal) => {
          this.setState(MCPClientState.DISCONNECTED);
          this.initialized = false;
          this.emit('disconnected', { code, signal });
          
          // 拒绝所有待处理的请求
          this.pendingRequests.forEach((deferred) => {
            deferred.reject(new Error(`Process exited: ${code}`));
          });
          this.pendingRequests.clear();
        });
      } catch (err) {
        clearTimeout(timeout);
        this.setState(MCPClientState.ERROR);
        reject(err);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.setState(MCPClientState.DISCONNECTED);
    this.initialized = false;
    this.serverCapabilities = null;
  }

  /**
   * 启动 MCP Server 进程
   */
  private startProcess(): void {
    const stdio: StdioOptions = ['pipe', 'pipe', 'pipe'];

    this.process = spawn(this.config.serverCommand, this.config.serverArgs, {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env },
      stdio,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleData(data.toString());
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.emit('stderr', data.toString());
    });
  }

  /**
   * 处理来自 Server 的数据
   */
  private handleData(data: string): void {
    this.buffer += data;
    
    // 按行解析 JSON-RPC 消息
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (err) {
          this.emit('parseError', line);
        }
      }
    }
  }

  /**
   * 处理 MCP 消息
   */
  private handleMessage(message: MCPResponse | MCPNotification): void {
    // 检查是否是响应消息
    if ('id' in message && message.id !== undefined) {
      const deferred = this.pendingRequests.get(message.id);
      if (deferred) {
        this.pendingRequests.delete(message.id);
        if ('error' in message && message.error) {
          deferred.reject(new Error(message.error.message));
        } else {
          deferred.resolve(message as MCPResponse);
        }
      }
    }

    // 处理通知消息
    if ('method' in message && !('id' in message)) {
      this.emit('notification', message);
    }
  }

  /**
   * 发送请求并等待响应
   */
  private async sendRequest<T = any>(
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    if (this.state !== MCPClientState.CONNECTED || !this.process) {
      throw new Error('Not connected to MCP server');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response.result as T);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin?.write(message);
    });
  }

  /**
   * 初始化 MCP 协议
   */
  private async initialize(): Promise<MCPInitializeResult> {
    const params: MCPInitializeParams = {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'open-taiji-mcp-client',
        version: '1.0.0',
      },
    };

    return this.sendRequest<MCPInitializeResult>('initialize', params);
  }

  /**
   * 获取可用工具列表
   */
  async listTools(): Promise<MCPTool[]> {
    const result = await this.sendRequest<MCPToolsListResult>('tools/list');
    return result.tools;
  }

  /**
   * 调用工具
   */
  async callTool(params: MCPToolCallParams): Promise<MCPToolCallResult> {
    return this.sendRequest<MCPToolCallResult>('tools/call', params);
  }

  /**
   * 调用工具的便捷方法
   */
  async call<T = any>(toolName: string, args?: Record<string, any>): Promise<T> {
    const result = await this.callTool({
      name: toolName,
      arguments: args,
    });

    if (result.isError) {
      const errorText = result.content
        .map((c) => c.text || '')
        .join('\n');
      throw new Error(`Tool execution error: ${errorText}`);
    }

    // 解析响应内容
    const textContent = result.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    if (textContent) {
      try {
        return JSON.parse(textContent) as T;
      } catch {
        return textContent as unknown as T;
      }
    }

    return result.content as unknown as T;
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    let retries = 0;
    
    while (retries < this.config.maxRetries) {
      try {
        this.disconnect();
        await this.connect();
        return;
      } catch (err) {
        retries++;
        if (retries >= this.config.maxRetries) {
          throw err;
        }
        await new Promise((resolve) => 
          setTimeout(resolve, this.config.retryDelay * retries)
        );
      }
    }
  }

  /**
   * 获取当前状态
   */
  getState(): MCPClientState {
    return this.state;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === MCPClientState.CONNECTED;
  }

  /**
   * 获取服务器能力
   */
  getCapabilities(): any {
    return this.serverCapabilities;
  }

  /**
   * 设置状态并发出事件
   */
  private setState(state: MCPClientState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this.pendingRequests.clear();
  }
}

export default MCPClient;
