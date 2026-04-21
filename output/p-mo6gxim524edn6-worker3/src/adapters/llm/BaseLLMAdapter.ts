import {
  ILLMAdapter,
  LLMConfig,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMTokenUsage,
  AuthenticationError,
  RateLimitError,
  ServiceUnavailableError,
  ContextLengthError,
  ContentPolicyError,
  TimeoutError,
  LLMBaseError,
  APIResponse
} from './interfaces/ILLMAdapter';
import { Logger } from '../../utils/logger';
import { createLLMConfigValidator, assertValidConfig } from '../../utils/validation';

export type ErrorHandler = (error: unknown) => LLMResponse;

export abstract class BaseLLMAdapter implements ILLMAdapter {
  public abstract readonly provider: string;

  protected _config!: LLMConfig;
  protected _isInitialized: boolean = false;
  protected _totalUsage: LLMTokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
  protected _totalCost: number = 0;
  protected readonly logger: Logger;

  constructor(config?: LLMConfig) {
    this.logger = new Logger('BaseLLMAdapter');
    if (config) {
      this.initialize(config);
    }
  }

  get model(): string {
    return this._config?.model ?? '';
  }

  get config(): Readonly<LLMConfig> {
    return this._config;
  }

  initialize(config: LLMConfig): void {
    // 合并默认值
    const mergedConfig: LLMConfig = {
      timeoutMs: 30000,
      maxRetries: 3,
      costPer1kPrompt: 0.001,
      costPer1kCompletion: 0.002,
      ...config
    };

    // 配置验证
    const validator = createLLMConfigValidator<Record<string, unknown>>();
    const validationResult = validator.validate(mergedConfig as unknown as Record<string, unknown>);
    
    // 警告仅记录日志，不阻止初始化
    for (const warning of validationResult.warnings) {
      this.logger.warn(`Config warning: ${warning}`);
    }

    // 错误阻止初始化
    assertValidConfig(validationResult);

    this._config = mergedConfig;
    this._isInitialized = true;
    this._totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    this._totalCost = 0;
    this.logger.info(`Adapter initialized with model: ${mergedConfig.model}`);
  }

  isReady(): boolean {
    return this._isInitialized && !!this._config.apiKey;
  }

  async checkAvailability(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }
    try {
      await this.createChatCompletion([{ role: 'user', content: 'Hi' }], { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }

  abstract createChatCompletion(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): Promise<LLMResponse>;

  abstract createChatCompletionStream(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): AsyncGenerator<any, void, unknown>;

  calculateCost(usage: LLMTokenUsage): number {
    const costPer1kPrompt = this._config.costPer1kPrompt ?? 0.001;
    const costPer1kCompletion = this._config.costPer1kCompletion ?? 0.002;
    const promptCost = (usage.promptTokens / 1000) * costPer1kPrompt;
    const completionCost = (usage.completionTokens / 1000) * costPer1kCompletion;
    return promptCost + completionCost;
  }

  getTotalUsage(): LLMTokenUsage & { totalCost: number } {
    return {
      ...this._totalUsage,
      totalCost: this._totalCost
    };
  }

  resetUsage(): void {
    this._totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    this._totalCost = 0;
  }

  protected accumulateUsage(usage: LLMTokenUsage): void;
  protected accumulateUsage(promptTokens: number, completionTokens: number): void;
  protected accumulateUsage(arg1: LLMTokenUsage | number, arg2?: number): void {
    let promptTokens: number;
    let completionTokens: number;

    if (typeof arg1 === 'object') {
      promptTokens = arg1.promptTokens;
      completionTokens = arg1.completionTokens;
    } else {
      promptTokens = arg1;
      completionTokens = arg2 ?? 0;
    }

    this._totalUsage.promptTokens += promptTokens;
    this._totalUsage.completionTokens += completionTokens;
    this._totalUsage.totalTokens += promptTokens + completionTokens;
    this._totalCost += this.calculateCost({
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    });
  }

  protected async fetchWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const maxRetries = this._config?.maxRetries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new TimeoutError('Request timed out');
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        if (
          lastError instanceof AuthenticationError ||
          lastError instanceof ContentPolicyError ||
          lastError instanceof ContextLengthError ||
          lastError instanceof TimeoutError
        ) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          const retryDelayMs = this.calculateRetryDelay(attempt + 1);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    throw lastError ?? new Error('Request failed after max retries');
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelayMs = 1000;
    const maxDelayMs = 30000;
    const exponentialBackoffMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
    const jitterMs = Math.random() * 0.5 * exponentialBackoffMs;
    return exponentialBackoffMs + jitterMs;
  }

  protected handleApiError(response: Response, responseBody: unknown): never {
    const status = response.status;
    let message = `HTTP ${status}`;

    if (typeof responseBody === 'object' && responseBody !== null) {
      const body = responseBody as Record<string, unknown>;
      const error = body.error;
      if (typeof error === 'object' && error !== null) {
        const e = error as Record<string, unknown>;
        message = String(e.message || e.msg || message);
      } else if (typeof body.message === 'string') {
        message = body.message;
      }
    }

    switch (status) {
      case 401:
      case 403:
        throw new AuthenticationError(message);
      case 429:
        throw new RateLimitError(message);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServiceUnavailableError(message);
      case 400:
        if (message.includes('context length') || message.includes('maximum context')) {
          throw new ContextLengthError(message);
        }
        if (message.includes('content policy') || message.includes('safety')) {
          throw new ContentPolicyError(message);
        }
        throw new LLMBaseError(message, 'BAD_REQUEST');
      default:
        throw new LLMBaseError(message, `HTTP_${status}`);
    }
  }

  protected createSuccessResponse(
    content: string,
    model: string,
    usage: LLMTokenUsage,
    latencyMs: number,
    rawResponse: unknown = null
  ): LLMResponse {
    return {
      content,
      model,
      usage,
      latencyMs,
      finishReason: 'stop',
      rawResponse
    };
  }
}
