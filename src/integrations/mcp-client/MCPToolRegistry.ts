/**
 * MCP工具注册表
 * MCP Tool Registry
 * 
 * 负责管理MCP服务器发现的工具、资源和提示词
 */

import { EventEmitter } from 'events';
import {
  MCPTool,
  MCPResource,
  MCPResourceTemplate,
  MCPPrompt,
  ServerCapabilities,
  ToolCallResult,
  MCPError,
  MCPCode,
} from './types';

/**
 * 工具执行器接口
 */
export interface ToolExecutor {
  (params: Record<string, unknown>): Promise<ToolCallResult>;
}

/**
 * 注册表条目接口
 */
export interface RegistryEntry<T> {
  /** 原始数据 */
  data: T;
  
  /** 服务器名称 */
  serverName: string;
  
  /** 注册时间 */
  registeredAt: Date;
  
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 工具注册表
 * 统一管理来自多个MCP服务器的Tools、Resources和Prompts
 */
export class MCPToolRegistry extends EventEmitter {
  // 工具注册表
  private tools: Map<string, RegistryEntry<MCPTool>> = new Map();
  
  // 资源注册表
  private resources: Map<string, RegistryEntry<MCPResource>> = new Map();
  
  // 资源模板注册表
  private resourceTemplates: Map<string, RegistryEntry<MCPResourceTemplate>> = new Map();
  
  // 提示词注册表
  private prompts: Map<string, RegistryEntry<MCPPrompt>> = new Map();
  
  // 服务器能力映射
  private serverCapabilities: Map<string, ServerCapabilities> = new Map();
  
  // 工具执行器
  private toolExecutors: Map<string, ToolExecutor> = new Map();
  
  // 工具变更监听器
  private toolsChangeListeners: Set<() => void> = new Set();
  
  constructor() {
    super();
  }
  
  // ============== 服务器管理 ==============
  
  /**
   * 注册服务器能力
   */
  registerServerCapabilities(serverName: string, capabilities: ServerCapabilities): void {
    this.serverCapabilities.set(serverName, capabilities);
  }
  
  /**
   * 获取服务器能力
   */
  getServerCapabilities(serverName: string): ServerCapabilities | undefined {
    return this.serverCapabilities.get(serverName);
  }
  
  /**
   * 获取所有服务器名称
   */
  getServerNames(): string[] {
    return Array.from(this.serverCapabilities.keys());
  }
  
  /**
   * 移除服务器及其所有条目
   */
  unregisterServer(serverName: string): void {
    // 移除工具
    const toolKeys = Array.from(this.tools.keys());
    for (const name of toolKeys) {
      const entry = this.tools.get(name);
      if (entry && entry.serverName === serverName) {
        this.tools.delete(name);
        this.emit('tool:removed', name);
      }
    }
    
    // 移除资源
    const resourceKeys = Array.from(this.resources.keys());
    for (const uri of resourceKeys) {
      const entry = this.resources.get(uri);
      if (entry && entry.serverName === serverName) {
        this.resources.delete(uri);
      }
    }
    
    // 移除资源模板
    const templateKeys = Array.from(this.resourceTemplates.keys());
    for (const template of templateKeys) {
      const entry = this.resourceTemplates.get(template);
      if (entry && entry.serverName === serverName) {
        this.resourceTemplates.delete(template);
      }
    }
    
    // 移除提示词
    const promptKeys = Array.from(this.prompts.keys());
    for (const name of promptKeys) {
      const entry = this.prompts.get(name);
      if (entry && entry.serverName === serverName) {
        this.prompts.delete(name);
        this.emit('prompt:removed', name);
      }
    }
    
    // 移除服务器能力
    this.serverCapabilities.delete(serverName);
    
    // 移除执行器
    const executorKeys = Array.from(this.toolExecutors.keys());
    for (const name of executorKeys) {
      const tool = this.tools.get(name);
      if (!tool) {
        this.toolExecutors.delete(name);
      }
    }
    
    this.emit('server:unregistered', serverName);
  }
  
  // ============== 工具管理 ==============
  
  /**
   * 注册工具
   */
  registerTool(
    tool: MCPTool, 
    serverName: string,
    executor?: ToolExecutor
  ): void {
    const existing = this.tools.get(tool.name);
    const now = new Date();
    
    const entry: RegistryEntry<MCPTool> = {
      data: tool,
      serverName,
      registeredAt: existing?.registeredAt || now,
      updatedAt: now,
    };
    
    this.tools.set(tool.name, entry);
    
    if (executor) {
      this.toolExecutors.set(tool.name, executor);
    }
    
    if (existing) {
      this.emit('tool:updated', tool);
    } else {
      this.emit('tool:added', tool);
    }
  }
  
  /**
   * 批量注册工具
   */
  registerTools(
    tools: MCPTool[], 
    serverName: string,
    executor?: ToolExecutor
  ): void {
    for (const tool of tools) {
      this.registerTool(tool, serverName, executor);
    }
  }
  
  /**
   * 获取工具
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name)?.data;
  }
  
  /**
   * 获取所有工具
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values()).map((entry) => entry.data);
  }
  
  /**
   * 获取指定服务器的工具
   */
  getToolsByServer(serverName: string): MCPTool[] {
    return Array.from(this.tools.values())
      .filter((entry) => entry.serverName === serverName)
      .map((entry) => entry.data);
  }
  
  /**
   * 按名称前缀搜索工具
   */
  searchTools(prefix: string): MCPTool[] {
    return Array.from(this.tools.values())
      .filter((entry) => entry.data.name.startsWith(prefix))
      .map((entry) => entry.data);
  }
  
  /**
   * 移除工具
   */
  removeTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      this.toolExecutors.delete(name);
      this.emit('tool:removed', name);
    }
    return deleted;
  }
  
  /**
   * 工具是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * 获取工具数量
   */
  getToolCount(): number {
    return this.tools.size;
  }
  
  /**
   * 设置工具执行器
   */
  setToolExecutor(name: string, executor: ToolExecutor): void {
    this.toolExecutors.set(name, executor);
  }
  
  /**
   * 获取工具执行器
   */
  getToolExecutor(name: string): ToolExecutor | undefined {
    return this.toolExecutors.get(name);
  }
  
  /**
   * 执行工具
   */
  async executeTool(name: string, params: Record<string, unknown>): Promise<ToolCallResult> {
    const executor = this.toolExecutors.get(name);
    if (!executor) {
      throw new MCPError(
        MCPCode.TOOL_NOT_FOUND,
        `工具不存在: ${name}`
      );
    }
    
    return executor(params);
  }
  
  // ============== 资源管理 ==============
  
  /**
   * 注册资源
   */
  registerResource(resource: MCPResource, serverName: string): void {
    const existing = this.resources.get(resource.uri);
    const now = new Date();
    
    const entry: RegistryEntry<MCPResource> = {
      data: resource,
      serverName,
      registeredAt: existing?.registeredAt || now,
      updatedAt: now,
    };
    
    this.resources.set(resource.uri, entry);
    
    if (existing) {
      this.emit('resource:updated', resource);
    } else {
      this.emit('resource:added', resource);
    }
  }
  
  /**
   * 批量注册资源
   */
  registerResources(resources: MCPResource[], serverName: string): void {
    for (const resource of resources) {
      this.registerResource(resource, serverName);
    }
  }
  
  /**
   * 获取资源
   */
  getResource(uri: string): MCPResource | undefined {
    return this.resources.get(uri)?.data;
  }
  
  /**
   * 获取所有资源
   */
  getAllResources(): MCPResource[] {
    return Array.from(this.resources.values()).map((entry) => entry.data);
  }
  
  /**
   * 按服务器获取资源
   */
  getResourcesByServer(serverName: string): MCPResource[] {
    return Array.from(this.resources.values())
      .filter((entry) => entry.serverName === serverName)
      .map((entry) => entry.data);
  }
  
  /**
   * 移除资源
   */
  removeResource(uri: string): boolean {
    return this.resources.delete(uri);
  }
  
  /**
   * 资源是否存在
   */
  hasResource(uri: string): boolean {
    return this.resources.has(uri);
  }
  
  // ============== 资源模板管理 ==============
  
  /**
   * 注册资源模板
   */
  registerResourceTemplate(template: MCPResourceTemplate, serverName: string): void {
    const now = new Date();
    
    const entry: RegistryEntry<MCPResourceTemplate> = {
      data: template,
      serverName,
      registeredAt: now,
      updatedAt: now,
    };
    
    this.resourceTemplates.set(template.uriTemplate, entry);
    this.emit('resourceTemplate:added', template);
  }
  
  /**
   * 获取所有资源模板
   */
  getAllResourceTemplates(): MCPResourceTemplate[] {
    return Array.from(this.resourceTemplates.values()).map((entry) => entry.data);
  }
  
  // ============== 提示词管理 ==============
  
  /**
   * 注册提示词
   */
  registerPrompt(prompt: MCPPrompt, serverName: string): void {
    const existing = this.prompts.get(prompt.name);
    const now = new Date();
    
    const entry: RegistryEntry<MCPPrompt> = {
      data: prompt,
      serverName,
      registeredAt: existing?.registeredAt || now,
      updatedAt: now,
    };
    
    this.prompts.set(prompt.name, entry);
    
    if (existing) {
      this.emit('prompt:updated', prompt);
    } else {
      this.emit('prompt:added', prompt);
    }
  }
  
  /**
   * 批量注册提示词
   */
  registerPrompts(prompts: MCPPrompt[], serverName: string): void {
    for (const prompt of prompts) {
      this.registerPrompt(prompt, serverName);
    }
  }
  
  /**
   * 获取提示词
   */
  getPrompt(name: string): MCPPrompt | undefined {
    return this.prompts.get(name)?.data;
  }
  
  /**
   * 获取所有提示词
   */
  getAllPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values()).map((entry) => entry.data);
  }
  
  /**
   * 按服务器获取提示词
   */
  getPromptsByServer(serverName: string): MCPPrompt[] {
    return Array.from(this.prompts.values())
      .filter((entry) => entry.serverName === serverName)
      .map((entry) => entry.data);
  }
  
  /**
   * 移除提示词
   */
  removePrompt(name: string): boolean {
    return this.prompts.delete(name);
  }
  
  /**
   * 提示词是否存在
   */
  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }
  
  // ============== 工具变更监听 ==============
  
  /**
   * 添加工具变更监听器
   */
  addToolsChangeListener(listener: () => void): void {
    this.toolsChangeListeners.add(listener);
  }
  
  /**
   * 移除工具变更监听器
   */
  removeToolsChangeListener(listener: () => void): void {
    this.toolsChangeListeners.delete(listener);
  }
  
  /**
   * 通知工具变更
   */
  notifyToolsChanged(): void {
    const listeners = Array.from(this.toolsChangeListeners);
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        console.error('工具变更监听器执行失败:', error);
      }
    }
    this.emit('tools:changed');
  }
  
  // ============== 统计信息 ==============
  
  /**
   * 获取注册表统计信息
   */
  getStats(): {
    toolCount: number;
    resourceCount: number;
    resourceTemplateCount: number;
    promptCount: number;
    serverCount: number;
    toolsByServer: Record<string, number>;
    resourcesByServer: Record<string, number>;
    promptsByServer: Record<string, number>;
  } {
    const toolsByServer: Record<string, number> = {};
    const resourcesByServer: Record<string, number> = {};
    const promptsByServer: Record<string, number> = {};
    
    const toolEntries = Array.from(this.tools.values());
    for (const entry of toolEntries) {
      toolsByServer[entry.serverName] = (toolsByServer[entry.serverName] || 0) + 1;
    }
    
    const resourceEntries = Array.from(this.resources.values());
    for (const entry of resourceEntries) {
      resourcesByServer[entry.serverName] = (resourcesByServer[entry.serverName] || 0) + 1;
    }
    
    const promptEntries = Array.from(this.prompts.values());
    for (const entry of promptEntries) {
      promptsByServer[entry.serverName] = (promptsByServer[entry.serverName] || 0) + 1;
    }
    
    return {
      toolCount: this.tools.size,
      resourceCount: this.resources.size,
      resourceTemplateCount: this.resourceTemplates.size,
      promptCount: this.prompts.size,
      serverCount: this.serverCapabilities.size,
      toolsByServer,
      resourcesByServer,
      promptsByServer,
    };
  }
  
  // ============== 工具变更支持 ==============
  
  /**
   * 清空注册表
   */
  clear(): void {
    this.tools.clear();
    this.resources.clear();
    this.resourceTemplates.clear();
    this.prompts.clear();
    this.serverCapabilities.clear();
    this.toolExecutors.clear();
    this.emit('cleared');
  }
  
  /**
   * 导出所有数据
   */
  exportAll(): {
    tools: MCPTool[];
    resources: MCPResource[];
    resourceTemplates: MCPResourceTemplate[];
    prompts: MCPPrompt[];
    capabilities: Record<string, ServerCapabilities>;
  } {
    return {
      tools: this.getAllTools(),
      resources: this.getAllResources(),
      resourceTemplates: this.getAllResourceTemplates(),
      prompts: this.getAllPrompts(),
      capabilities: Object.fromEntries(this.serverCapabilities),
    };
  }
}
