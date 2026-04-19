/**
 * ContextEngine - 核心上下文引擎
 * Context Engine - OpenTaiji的核心能力
 * 
 * 职责：
 * 1. 协调Scanner、Assembler、Injector三者
 * 2. 处理对话请求的完整流程
 * 3. 提供统一的对外接口
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ConversationRequest,
  ProcessedContext,
  AssembledContext,
  ProcessingStats,
  ContextEngineConfig,
  InjectionStrategy,
  IMemorySystem,
  ISkillSystem,
  IPersonalitySystem,
  IKnowledgeBase,
  ContextPriority,
  ContextSource,
  estimateTokens,
} from './types';
import { ContextScanner, ScanResult, createContextScanner } from './ContextScanner';
import { ContextAssembler, AssembleResult, createContextAssembler } from './ContextAssembler';
import { ContextInjector, createContextInjector } from './ContextInjector';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ContextEngineConfig> = {
  defaultTokenBudget: 8000,
  maxTokenBudget: 128000,
  memorySearchLimit: 10,
  skillSearchLimit: 5,
  minRelevanceThreshold: 0.3,
  defaultInjectionStrategy: InjectionStrategy.SEQUENTIAL,
  priorityWeights: {
    memory: 0.3,
    skill: 0.25,
    personality: 0.15,
    knowledge: 0.2,
    history: 0.1,
  },
  enablePersonality: true,
  enableKnowledge: true,
  enableHistory: true,
  historyMessageLimit: 10,
};

/**
 * 引擎状态
 */
export enum EngineState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZED = 'initialized',
  RUNNING = 'running',
  STOPPED = 'stopped',
}

/**
 * 上下文引擎事件
 */
export interface ContextEngineEvents {
  /** 扫描开始 */
  onScanStart?: (request: ConversationRequest) => void;
  /** 扫描完成 */
  onScanComplete?: (result: ScanResult) => void;
  /** 组装开始 */
  onAssembleStart?: (raw: any) => void;
  /** 组装完成 */
  onAssembleComplete?: (result: AssembleResult) => void;
  /** 注入开始 */
  onInjectStart?: (context: AssembledContext) => void;
  /** 注入完成 */
  onInjectComplete?: (result: any) => void;
  /** 处理完成 */
  onProcessComplete?: (result: ProcessedContext) => void;
  /** 错误 */
  onError?: (error: Error, stage: string) => void;
}

/**
 * 上下文引擎
 * 
 * 核心入口，协调所有上下文处理流程
 */
export class ContextEngine {
  private config: Required<ContextEngineConfig>;
  private scanner: ContextScanner;
  private assembler: ContextAssembler;
  private injector: ContextInjector;
  private state: EngineState = EngineState.UNINITIALIZED;
  private eventHandlers: ContextEngineEvents = {};
  private requestCount: number = 0;

  /**
   * 构造函数
   */
  constructor(config?: ContextEngineConfig);
  /**
   * 构造函数（带扫描器）
   */
  constructor(scanner: ContextScanner, assembler: ContextAssembler, injector: ContextInjector);
  constructor(
    scannerOrConfig?: ContextScanner | ContextEngineConfig,
    assembler?: ContextAssembler,
    injector?: ContextInjector
  ) {
    // 根据参数类型选择初始化方式
    if (scannerOrConfig instanceof ContextScanner) {
      // 方式1: 注入已有的组件
      this.scanner = scannerOrConfig;
      this.assembler = assembler || createContextAssembler();
      this.injector = injector || createContextInjector();
      this.config = DEFAULT_CONFIG;
    } else {
      // 方式2: 使用配置创建
      this.config = { ...DEFAULT_CONFIG, ...scannerOrConfig };
      this.scanner = createContextScanner(this.config);
      this.assembler = createContextAssembler(this.config);
      this.injector = createContextInjector(this.config.defaultInjectionStrategy);
    }
  }

  // ============== 生命周期方法 ==============

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    if (this.state === EngineState.INITIALIZED || this.state === EngineState.RUNNING) {
      console.warn('[ContextEngine] Already initialized');
      return;
    }

    this.state = EngineState.INITIALIZED;
    console.log('[ContextEngine] Initialized successfully');
  }

  /**
   * 销毁引擎
   */
  async destroy(): Promise<void> {
    this.state = EngineState.STOPPED;
    console.log('[ContextEngine] Destroyed');
  }

  // ============== 系统绑定 ==============

  /**
   * 绑定记忆系统
   */
  bindMemorySystem(system: IMemorySystem): this {
    this.scanner.bindMemorySystem(system);
    return this;
  }

  /**
   * 绑定技能系统
   */
  bindSkillSystem(system: ISkillSystem): this {
    this.scanner.bindSkillSystem(system);
    return this;
  }

  /**
   * 绑定人格系统
   */
  bindPersonalitySystem(system: IPersonalitySystem): this {
    this.scanner.bindPersonalitySystem(system);
    return this;
  }

  /**
   * 绑定知识库
   */
  bindKnowledgeBase(kb: IKnowledgeBase): this {
    this.scanner.bindKnowledgeBase(kb);
    return this;
  }

  // ============== 事件处理 ==============

  /**
   * 注册事件处理器
   */
  on(events: ContextEngineEvents): this {
    this.eventHandlers = { ...this.eventHandlers, ...events };
    return this;
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof ContextEngineEvents>(
    event: K,
    ...args: Parameters<NonNullable<ContextEngineEvents[K]>>
  ): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      (handler as Function)(...args);
    }
  }

  // ============== 核心处理方法 ==============

  /**
   * 处理对话请求
   * 
   * 核心方法：执行完整的上下文处理流程
   * 
   * @param request 对话请求
   * @returns 处理后的上下文
   */
  async processRequest(request: ConversationRequest): Promise<ProcessedContext> {
    const startTime = Date.now();
    this.requestCount++;
    this.state = EngineState.RUNNING;

    try {
      // 1. 扫描相关上下文
      const scanResult = await this.scan(request);

      // 2. 组装优化上下文
      const assembleResult = await this.assemble(scanResult, request);

      // 3. 注入到Prompt
      const injectionResult = await this.inject(
        assembleResult.context,
        request.systemPrompt,
        request.tokenBudget
      );

      // 4. 构建最终结果
      const totalTime = Date.now() - startTime;
      const stats: ProcessingStats = {
        totalTime,
        scanTime: scanResult.metadata.duration,
        assembleTime: assembleResult.context.metadata.assembleDuration || 0,
        injectionTime: 0, // 注入时间较短，不单独统计
        memoriesFound: scanResult.memories.length,
        skillsFound: scanResult.skills.length,
        tokensUsed: injectionResult.actualTokens,
        tokenBudgetUsage: injectionResult.actualTokens / (request.tokenBudget || this.config.defaultTokenBudget),
      };

      const processedContext: ProcessedContext = {
        prompt: injectionResult.prompt,
        context: assembleResult.context,
        injection: injectionResult,
        stats,
      };

      // 触发完成事件
      this.emit('onProcessComplete', processedContext);

      return processedContext;
    } catch (error) {
      this.emit('onError', error as Error, 'processRequest');
      throw error;
    } finally {
      this.state = EngineState.INITIALIZED;
    }
  }

  /**
   * 扫描上下文
   */
  private async scan(request: ConversationRequest): Promise<ScanResult> {
    this.emit('onScanStart', request);
    
    const result = await this.scanner.scan(request);
    
    this.emit('onScanComplete', result);
    
    return result;
  }

  /**
   * 组装上下文
   */
  private async assemble(scanResult: ScanResult, request: ConversationRequest): Promise<AssembleResult> {
    const raw = {
      memory: scanResult.memories,
      skills: scanResult.skills,
      personality: scanResult.personality,
      knowledge: scanResult.knowledge,
      system: scanResult.system,
      history: scanResult.history,
    };

    this.emit('onAssembleStart', raw);

    const tokenBudget = request.tokenBudget || this.config.defaultTokenBudget;
    const result = this.assembler.assemble(raw, tokenBudget);
    
    // 附加原始请求
    result.context.request = request;

    this.emit('onAssembleComplete', result);

    return result;
  }

  /**
   * 注入上下文
   */
  private async inject(
    context: AssembledContext,
    systemPrompt?: string,
    tokenBudget?: number
  ): Promise<any> {
    this.emit('onInjectStart', context);

    // 获取默认提示词或使用提供的
    const prompt = systemPrompt || this.getDefaultSystemPrompt();
    
    const result = this.injector.inject(prompt, context);

    this.emit('onInjectComplete', result);

    return result;
  }

  /**
   * 获取默认系统提示词
   */
  private getDefaultSystemPrompt(): string {
    return `You are an AI assistant powered by OpenTaiji framework.
Your role is to help users with their requests while considering their preferences and history.

{{CONTEXT}}`;
  }

  // ============== 便捷方法 ==============

  /**
   * 快速处理（简化接口）
   */
  async process(
    userId: string,
    message: string,
    options?: {
      systemPrompt?: string;
      tokenBudget?: number;
      history?: ConversationRequest['history'];
    }
  ): Promise<ProcessedContext> {
    const request: ConversationRequest = {
      userId,
      message,
      systemPrompt: options?.systemPrompt,
      tokenBudget: options?.tokenBudget,
      history: options?.history,
      sessionId: uuidv4(),
    };

    return this.processRequest(request);
  }

  /**
   * 批量处理
   */
  async processBatch(requests: ConversationRequest[]): Promise<ProcessedContext[]> {
    return Promise.all(requests.map((req) => this.processRequest(req)));
  }

  // ============== 状态查询 ==============

  /**
   * 获取引擎状态
   */
  getState(): EngineState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    requestCount: number;
    state: EngineState;
    config: ContextEngineConfig;
  } {
    return {
      requestCount: this.requestCount,
      state: this.state,
      config: this.config,
    };
  }
}

/**
 * 创建上下文引擎（工厂函数）
 */
export function createContextEngine(config?: ContextEngineConfig): ContextEngine {
  return new ContextEngine(config);
}

/**
 * 创建完整配置的上下文引擎
 */
export function createFullContextEngine(
  config: ContextEngineConfig,
  memorySystem?: IMemorySystem,
  skillSystem?: ISkillSystem,
  personalitySystem?: IPersonalitySystem,
  knowledgeBase?: IKnowledgeBase
): ContextEngine {
  const engine = new ContextEngine(config);
  
  if (memorySystem) engine.bindMemorySystem(memorySystem);
  if (skillSystem) engine.bindSkillSystem(skillSystem);
  if (personalitySystem) engine.bindPersonalitySystem(personalitySystem);
  if (knowledgeBase) engine.bindKnowledgeBase(knowledgeBase);
  
  return engine;
}

// ============== 导出所有组件 ==============

export {
  ContextScanner,
  ContextAssembler,
  ContextInjector,
  createContextScanner,
  createContextAssembler,
  createContextInjector,
};

export default ContextEngine;
