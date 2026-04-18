/**
 * MCP传输层实现
 * MCP Transport Layer
 * 
 * 支持两种传输方式：
 * - stdio: 标准输入输出（适用于本地进程通信）
 * - SSE: Server-Sent Events（适用于HTTP长连接）
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as readline from 'readline';
import {
  TransportType,
  StdioTransportConfig,
  SSELransportConfig,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  MCPCode,
  MCPError,
  ConnectionState,
} from './types';

/**
 * 传输层基类
 */
export abstract class MCPTransport extends EventEmitter {
  protected state: ConnectionState = ConnectionState.IDLE;
  protected messageId: number = 0;
  
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: JSONRPCRequest | JSONRPCNotification): void;
  abstract getType(): TransportType;
  
  /** 获取当前连接状态 */
  public getState(): ConnectionState {
    return this.state;
  }
  
  /** 生成唯一的消息ID */
  protected generateId(): number {
    return ++this.messageId;
  }
  
  /** 发送消息并返回Promise响应 */
  protected async sendRequest<R = unknown>(
    method: string, 
    params?: Record<string, unknown>
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };
      
      const timeout = setTimeout(() => {
        cleanup();
        reject(new MCPError(
          MCPCode.CONNECTION_TIMEOUT,
          `请求超时: ${method}`
        ));
      }, 30000);
      
      const cleanup = () => {
        this.off('message', messageHandler);
        clearTimeout(timeout);
      };
      
      const messageHandler = (msg: JSONRPCRequest | JSONRPCResponse | JSONRPCNotification) => {
        if ('id' in msg && msg.id === id) {
          cleanup();
          if ('error' in msg && msg.error) {
            reject(new MCPError(
              msg.error.code,
              msg.error.message,
              msg.error.data
            ));
          } else if ('result' in msg) {
            resolve(msg.result as R);
          }
        }
      };
      
      this.on('message', messageHandler);
      this.send(request);
    });
  }
}

/**
 * Stdio传输层 - 用于与本地MCP服务器进程通信
 */
export class StdioTransport extends MCPTransport {
  private process: ChildProcess | null = null;
  private readonly config: StdioTransportConfig;
  private pendingRequests: Map<number, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  constructor(config: StdioTransportConfig) {
    super();
    this.config = config;
  }
  
  /**
   * 连接到MCP服务器进程
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }
    
    this.setState(ConnectionState.CONNECTING);
    
    try {
      const spawnOptions: SpawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...this.config.env,
        },
        detached: false,
      };
      
      if (this.config.cwd) {
        spawnOptions.cwd = this.config.cwd;
      }
      
      // 启动进程
      this.process = spawn(this.config.command, this.config.args || [], spawnOptions);
      
      // 设置stdout读取
      const stdout = readline.createInterface({
        input: this.process.stdout!,
        crlfDelay: Infinity,
      });
      
      // 设置stderr日志
      this.process.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          this.emit('log' as any, 'error', `[MCP Stderr] ${message}`);
        }
      });
      
      // 处理进程退出
      this.process.on('exit', (code, signal) => {
        this.handleDisconnect(code, signal);
      });
      
      this.process.on('error', (error) => {
        this.emit('error', error);
        this.setState(ConnectionState.ERROR);
      });
      
      // 处理stdout消息
      stdout.on('line', (line) => {
        this.handleMessage(line);
      });
      
      this.setState(ConnectionState.CONNECTED);
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      throw new MCPError(
        MCPCode.CONNECTION_FAILED,
        `无法启动MCP服务器进程: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      // 清理所有待处理的请求
      const requestKeys = Array.from(this.pendingRequests.keys());
      for (const id of requestKeys) {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.reject(new MCPError(
            MCPCode.CONNECTION_CLOSED,
            '连接已关闭'
          ));
        }
      }
      this.pendingRequests.clear();
      
      // 终止进程
      this.process.kill('SIGTERM');
      
      // 等待进程退出，最多5秒
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
        
        this.process!.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      this.process = null;
    }
    
    this.setState(ConnectionState.DISCONNECTED);
    this.emit('close');
  }
  
  /**
   * 发送消息
   */
  send(message: JSONRPCRequest | JSONRPCNotification): void {
    if (this.process?.stdin) {
      this.process.stdin.write(JSON.stringify(message) + '\n');
    }
  }
  
  /**
   * 获取传输类型
   */
  getType(): TransportType {
    return 'stdio';
  }
  
  /**
   * 处理收到的消息
   */
  private handleMessage(line: string): void {
    if (!line.trim()) {
      return;
    }
    
    try {
      const message = JSON.parse(line) as 
        | JSONRPCRequest 
        | JSONRPCResponse 
        | JSONRPCNotification;
      
      this.emit('message', message);
    } catch (error) {
      this.emit('error', new Error(`解析消息失败: ${line}`));
    }
  }
  
  /**
   * 处理断开连接
   */
  private handleDisconnect(code: number | null, signal: string | null): void {
    const wasConnected = this.state === ConnectionState.CONNECTED;
    
    // 清理待处理的请求
    const requestKeys = Array.from(this.pendingRequests.keys());
    for (const id of requestKeys) {
      const pending = this.pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(new MCPError(
          MCPCode.CONNECTION_CLOSED,
          `MCP服务器进程退出: code=${code}, signal=${signal}`
        ));
      }
    }
    this.pendingRequests.clear();
    
    this.setState(ConnectionState.DISCONNECTED);
    
    if (wasConnected) {
      this.emit('close');
    }
  }
  
  /**
   * 更新连接状态
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }
}

/**
 * SSE传输层 - 用于与远程MCP服务器通信
 */
export class SSETransport extends MCPTransport {
  private readonly config: SSELransportConfig;
  private abortController: AbortController | null = null;
  private messageBuffer: string = '';
  
  constructor(config: SSELransportConfig) {
    super();
    this.config = config;
  }
  
  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }
    
    this.setState(ConnectionState.CONNECTING);
    this.abortController = new AbortController();
    
    try {
      // 使用fetch进行SSE连接
      const response = await fetch(this.config.url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...this.config.headers,
        },
        signal: this.abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('响应体为空');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      this.setState(ConnectionState.CONNECTED);
      
      // 持续读取SSE数据
      this.readStream(reader, decoder);
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new MCPError(
            MCPCode.CONNECTION_CLOSED,
            '连接已被中止'
          );
        }
        throw new MCPError(
          MCPCode.CONNECTION_FAILED,
          `SSE连接失败: ${error.message}`
        );
      }
      
      throw new MCPError(
        MCPCode.CONNECTION_FAILED,
        'SSE连接失败'
      );
    }
  }
  
  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.messageBuffer = '';
    this.setState(ConnectionState.DISCONNECTED);
    this.emit('close');
  }
  
  /**
   * 发送消息（POST到服务器）
   */
  send(message: JSONRPCRequest | JSONRPCNotification): void {
    fetch(this.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify(message),
    }).catch((error) => {
      this.emit('error', new Error(`发送消息失败: ${error.message}`));
    });
  }
  
  /**
   * 获取传输类型
   */
  getType(): TransportType {
    return 'sse';
  }
  
  /**
   * 读取SSE数据流
   */
  private async readStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder
  ): Promise<void> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        this.messageBuffer += chunk;
        
        // 处理SSE消息
        this.processBuffer();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.emit('error', error);
        this.setState(ConnectionState.ERROR);
      }
    }
  }
  
  /**
   * 处理消息缓冲区
   */
  private processBuffer(): void {
    const lines = this.messageBuffer.split('\n');
    
    // 保留最后一行（可能是不完整的）
    this.messageBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          continue;
        }
        
        try {
          const message = JSON.parse(data) as 
            | JSONRPCRequest 
            | JSONRPCResponse 
            | JSONRPCNotification;
          this.emit('message', message);
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
  
  /**
   * 更新连接状态
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }
}

/**
 * 传输层工厂
 */
export class TransportFactory {
  /**
   * 根据配置创建传输层实例
   */
  static create(config: StdioTransportConfig | SSELransportConfig): MCPTransport {
    switch (config.type) {
      case 'stdio':
        return new StdioTransport(config);
      case 'sse':
        return new SSETransport(config as SSELransportConfig);
      default:
        throw new Error(`不支持的传输类型: ${(config as any).type}`);
    }
  }
  
  /**
   * 从服务器配置自动检测传输类型
   */
  static autoDetect(config: {
    command?: string;
    url?: string;
    args?: string[];
  }): StdioTransportConfig | SSELransportConfig {
    if (config.url) {
      return { type: 'sse', url: config.url };
    }
    
    if (config.command) {
      return {
        type: 'stdio',
        command: config.command,
        args: config.args || [],
      };
    }
    
    throw new Error('服务器配置必须包含 command 或 url');
  }
}
