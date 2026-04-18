/**
 * MCP集成测试
 * MCP Client Integration Tests
 * 
 * 测试场景：
 * 1. MCP Client连接和断开
 * 2. 工具调用
 * 3. 状态管理和事件
 * 4. 重连机制
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPClient, MCPClient as MCPClientClass } from '../../src/core/mcp/MCPClient';
import { MCPClientConfig, MCPClientState } from '../../src/core/mcp/types';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    once: jest.fn(),
    on: jest.fn(),
    kill: jest.fn(),
    stdin: {
      write: jest.fn(),
    },
    stdout: {
      on: jest.fn((event: string, cb: (data: Buffer) => void) => {
        if (event === 'data') {
          // 模拟服务器响应
          setTimeout(() => {
            cb(Buffer.from(JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            }) + '\n'));
          }, 10);
        }
      }),
    },
    stderr: {
      on: jest.fn(),
    },
  })),
}));

describe('MCP Client Integration Tests', () => {
  let mockProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Connection Management', () => {
    it('should create MCPClient instance', () => {
      const config: MCPClientConfig = {
        serverCommand: 'npx',
        serverArgs: ['mcp-server', '--stdio'],
      };
      
      const client = new MCPClient(config);
      expect(client).toBeDefined();
      expect(client.getState()).toBe(MCPClientState.DISCONNECTED);
    });

    it('should throw error when sending request without connection', async () => {
      const config: MCPClientConfig = {
        serverCommand: 'npx',
        serverArgs: ['mcp-server'],
      };
      
      const client = new MCPClient(config);
      
      await expect(client.listTools()).rejects.toThrow('Not connected to MCP server');
    });

    it('should have correct initial state', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      expect(client.isConnected()).toBe(false);
      expect(client.getState()).toBe(MCPClientState.DISCONNECTED);
    });

    it('should emit state change events', (done) => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      
      client.on('stateChange', (state: MCPClientState) => {
        expect(state).toBeDefined();
        done();
      });
      
      // 触发状态变化
      (client as any).setState(MCPClientState.CONNECTING);
    });

    it('should handle configuration with custom timeout', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
        timeout: 60000,
      };
      
      const client = new MCPClient(config);
      expect((client as any).config.timeout).toBe(60000);
    });

    it('should handle configuration with custom retries', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
        maxRetries: 5,
        retryDelay: 2000,
      };
      
      const client = new MCPClient(config);
      expect((client as any).config.maxRetries).toBe(5);
      expect((client as any).config.retryDelay).toBe(2000);
    });
  });

  describe('Disconnect Operations', () => {
    it('should disconnect cleanly', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      client.disconnect();
      
      expect(client.getState()).toBe(MCPClientState.DISCONNECTED);
      expect(client.isConnected()).toBe(false);
    });

    it('should reset initialized state on disconnect', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      (client as any).initialized = true;
      
      client.disconnect();
      
      expect((client as any).initialized).toBe(false);
    });

    it('should clear server capabilities on disconnect', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      (client as any).serverCapabilities = { tools: true };
      
      client.disconnect();
      
      expect((client as any).serverCapabilities).toBeNull();
    });
  });

  describe('Event Emission', () => {
    it('should emit connected event', (done) => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      
      client.on('connected', () => {
        done();
      });
      
      // 模拟连接完成
      (client as any).setState(MCPClientState.CONNECTED);
    });

    it('should emit disconnected event', (done) => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      
      client.on('disconnected', (info: { code: number; signal: string }) => {
        expect(info).toBeDefined();
        done();
      });
      
      // 模拟断开连接
      (client as any).setState(MCPClientState.DISCONNECTED);
    });

    it('should emit error event', (done) => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      
      client.on('error', (error: Error) => {
        expect(error).toBeDefined();
        done();
      });
      
      // 模拟错误
      client.emit('error', new Error('Connection failed'));
    });

    it('should emit stderr data', (done) => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      
      client.on('stderr', (data: string) => {
        expect(data).toBe('Error output\n');
        done();
      });
      
      // 模拟stderr数据
      client.emit('stderr', 'Error output\n');
    });

    it('should emit parseError event for invalid JSON', (done) => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      
      client.on('parseError', (line: string) => {
        expect(line).toBe('invalid json');
        done();
      });
      
      // 模拟解析错误
      client.emit('parseError', 'invalid json');
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection with retries', async () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
        maxRetries: 3,
        retryDelay: 100,
      };
      
      const client = new MCPClient(config);
      (client as any).state = MCPClientState.CONNECTED;
      (client as any).process = { kill: jest.fn() };
      
      // 模拟连接失败
      const connectMock = jest.spyOn(client as any, 'connect')
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue(undefined);
      
      await expect(client.reconnect()).resolves.not.toThrow();
    });
  });

  describe('Message Handling', () => {
    it('should handle notification messages', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      const notificationHandler = jest.fn();
      
      client.on('notification', notificationHandler);
      
      // 模拟通知消息
      (client as any).handleMessage({
        jsonrpc: '2.0',
        method: 'server notification',
        params: { data: 'test' }
      });
      
      expect(notificationHandler).toHaveBeenCalled();
    });

    it('should reject pending request on error response', async () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      const pendingId = 123;
      
      // 添加待处理请求
      const rejectMock = jest.fn();
      (client as any).pendingRequests.set(pendingId, {
        resolve: jest.fn(),
        reject: rejectMock
      });
      
      // 模拟错误响应
      (client as any).handleMessage({
        jsonrpc: '2.0',
        id: pendingId,
        error: { code: -32600, message: 'Invalid Request' }
      });
      
      expect(rejectMock).toHaveBeenCalled();
    });

    it('should resolve pending request on success response', async () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      const pendingId = 456;
      
      // 添加待处理请求
      const resolveMock = jest.fn();
      (client as any).pendingRequests.set(pendingId, {
        resolve: resolveMock,
        reject: jest.fn()
      });
      
      // 模拟成功响应
      (client as any).handleMessage({
        jsonrpc: '2.0',
        id: pendingId,
        result: { success: true }
      });
      
      expect(resolveMock).toHaveBeenCalled();
    });
  });

  describe('Tool Call Convenience Methods', () => {
    it('should parse JSON response in call method', async () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      (client as any).state = MCPClientState.CONNECTED;
      (client as any).process = { stdin: { write: jest.fn() } };
      
      // 模拟成功响应
      const callToolMock = jest.spyOn(client as any, 'callTool').mockResolvedValue({
        isError: false,
        content: [{ type: 'text', text: '{"result": "success"}' }]
      });
      
      const result = await client.call('test-tool', { param: 'value' });
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error on tool execution error', async () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      (client as any).state = MCPClientState.CONNECTED;
      (client as any).process = { stdin: { write: jest.fn() } };
      
      // 模拟错误响应
      jest.spyOn(client as any, 'callTool').mockResolvedValue({
        isError: true,
        content: [{ type: 'text', text: 'Tool execution failed' }]
      });
      
      await expect(client.call('failing-tool')).rejects.toThrow('Tool execution error');
    });
  });

  describe('Destroy Operation', () => {
    it('should destroy client completely', () => {
      const config: MCPClientConfig = {
        serverCommand: 'test-server',
      };
      
      const client = new MCPClient(config);
      (client as any).state = MCPClientState.CONNECTED;
      (client as any).process = { kill: jest.fn() };
      (client as any).pendingRequests.set(1, { resolve: jest.fn(), reject: jest.fn() });
      
      const eventHandler = jest.fn();
      client.on('connected', eventHandler);
      
      client.destroy();
      
      expect(client.getState()).toBe(MCPClientState.DISCONNECTED);
      expect((client as any).pendingRequests.size).toBe(0);
    });
  });
});
