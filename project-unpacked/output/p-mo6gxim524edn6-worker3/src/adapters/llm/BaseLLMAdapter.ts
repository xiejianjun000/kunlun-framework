import {
  ILLMAdapter,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  TokenUsage,
  BaseLLMAdapterConfig
} from './interfaces/ILLMAdapter';

/**
 * 基础LLM适配器抽象类
 * 提供通用的token统计、成本计算和错误处理功能
 */
export abstract class BaseLLMAdapter implements ILLMAdapter {
  public abstract readonly name: string;
  public abstract readonly version: string;
  public abstract readonly model: string;

  protected endpoint?: string;
  protected apiKey: string;
  protected timeout: number;
  protected maxRetries: number;
  protected costPer1kPrompt: number;
  protected costPer1kCompletion: number;

  private totalPromptTokens: number = 0;
  private totalCompletionTokens: number = 0;

  constructor(config: BaseLLMAdapterConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 60000;
    this.maxRetries = config.maxRetries ?? 3;
    this.costPer1kPrompt = config.costPer1kPrompt ?? 0.001;
    this.costPer1kCompletion = config.costPer1kCompletion ?? 0.002;
  }

  /**
   * 检查适配器是否就绪
   */
  isReady(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * 抽象方法：执行完成请求
   */
  abstract complete(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionOptions>
  ): Promise<LLMCompletionResult>;

  /**
   * 抽象方法：执行流式完成请求
   */
  abstract completeStream(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionOptions>
  ): AsyncGenerator<string, void, unknown>;

  /**
   * 获取当前token使用统计
   */
  getTokenUsage(): TokenUsage {
    const totalTokens = this.totalPromptTokens + this.totalCompletionTokens;
    return {
      totalPromptTokens: this.totalPromptTokens,
      totalCompletionTokens: this.totalCompletionTokens,
      totalTokens,
      estimatedCostUsd: this.calculateCost(this.totalPromptTokens, this.totalCompletionTokens)
    };
  }

  /**
   * 重置统计
   */
  resetTokenUsage(): void {
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
  }

  /**
   * 计算成本
   */
  calculateCost(promptTokens: number, completionTokens: number): number {
    const promptCost = (promptTokens / 1000) * this.costPer1kPrompt;
    const completionCost = (completionTokens / 1000) * this.costPer1kCompletion;
    return promptCost + completionCost;
  }

  /**
   * 累计token使用
   */
  protected accumulateUsage(promptTokens: number, completionTokens: number): void {
    this.totalPromptTokens += promptTokens;
    this.totalCompletionTokens += completionTokens;
  }

  /**
   * 带重试的请求
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && retries < this.maxRetries) {
        // 指数退避
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries + 1);
      }
      
      return response;
    } catch (error) {
      if (retries < this.maxRetries) {
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  }

  /**
   * 处理错误结果
   */
  protected handleError(error: unknown): LLMCompletionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      text: '',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      success: false,
      error: errorMessage
    };
  }
}
