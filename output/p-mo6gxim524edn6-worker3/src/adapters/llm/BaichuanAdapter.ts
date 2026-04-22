/**
 * Baichuan LLM Adapter
 * 百川智能大模型适配器
 *
 * API Documentation: https://platform.baichuan-ai.com/docs/api
 * Base URL: https://api.baichuan-ai.com/v1
 *
 * Supported Models:
 * - Baichuan4: baichuan4
 * - Baichuan3 Turbo: baichuan3-turbo
 * - Baichuan2 53B: baichuan2-53b
 * - Baichuan2 13B: baichuan2-13b
 * - Baichuan2 7B: baichuan2-7b
 *
 * Pricing (per 1k tokens, CNY):
 * - Baichuan4: 0.03 (prompt), 0.03 (completion)
 * - Baichuan3 Turbo: 0.012 (prompt), 0.012 (completion)
 * - Baichuan2 53B: 0.02 (prompt), 0.02 (completion)
 * - Baichuan2 13B: 0.008 (prompt), 0.008 (completion)
 * - Baichuan2 7B: 0.004 (prompt), 0.004 (completion)
 *
 * Authentication: Bearer token in Authorization header
 */

import { BaseLLMAdapter } from './BaseLLMAdapter';
import {
  LLMConfig,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMBaseError,
  APIResponse
} from './interfaces/ILLMAdapter';
import { Logger } from '../../utils/logger';

/**
 * Baichuan 大模型适配器
 * 实现百川智能 API 的完整接口封装
 *
 * @example
 * ```typescript
 * const adapter = new BaichuanAdapter({
 *   apiKey: 'your-api-key',
 *   model: 'baichuan3-turbo'
 * });
 *
 * const response = await adapter.createChatCompletion([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class BaichuanAdapter extends BaseLLMAdapter {
  /** 提供商名称 */
  public readonly provider = 'baichuan';
  protected readonly logger: Logger;

  constructor(config?: LLMConfig) {
    super(config);
    this.logger = new Logger('BaichuanAdapter');
  }

  /**
   * 初始化适配器
   * 设置百川智能的默认 API 端点和计费参数
   *
   * @param config - 配置对象，包含 API Key 和模型名称
   */
  initialize(config: LLMConfig): void {
    const mergedConfig: LLMConfig = {
      baseUrl: 'https://api.baichuan-ai.com/v1',
      costPer1kPrompt: 0.012,
      costPer1kCompletion: 0.012,
      ...config
    };
    super.initialize(mergedConfig);
  }

  /**
   * 创建非流式聊天补全
   *
   * @param messages - 对话消息列表
   * @param options - 请求选项（温度、最大 Token 数等）
   * @returns 完整的响应对象
   */
  async createChatCompletion(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): Promise<LLMResponse> {
    this.ensureReady();
    const startTime = Date.now();

    return this.fetchWithRetry(async () => {
      const url = `${this._config.baseUrl}/chat/completions`;
      const body = this.buildRequestBody(messages, { ...options, stream: false });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options?.timeoutMs ?? this._config.timeoutMs ?? 30000)
      });

      const data = await response.json() as APIResponse;

      if (!response.ok) {
        this.handleApiError(response, data);
      }

      const result = this.parseResponse(data, startTime);
      this.accumulateUsage(result.usage.promptTokens, result.usage.completionTokens);
      return result;
    });
  }

  /**
   * 创建流式聊天补全
   * 使用 Server-Sent Events (SSE) 协议接收响应流
   *
   * @param messages - 对话消息列表
   * @param options - 请求选项
   * @returns 异步生成器，逐个返回响应片段
   */
  async* createChatCompletionStream(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    this.ensureReady();

    const url = `${this._config.baseUrl}/chat/completions`;
    const body = this.buildRequestBody(messages, { ...options, stream: true });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs ?? this._config.timeoutMs ?? 60000)
    });

    if (!response.ok) {
      const data = await response.json();
      this.handleApiError(response, data);
    }

    if (!response.body) {
      throw new LLMBaseError('No response body', 'NO_RESPONSE_BODY');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isFirst = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (!trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6).trim();
        if (dataStr === '[DONE]') break;

        try {
          const data: APIResponse = JSON.parse(dataStr);
          const delta = data.choices?.[0]?.delta?.content || '';

          if (delta) {
            yield {
              content: delta,
              isFirst,
              isLast: false,
              finishReason: data.choices?.[0]?.finish_reason
            };
            isFirst = false;
          }

          if (data.usage) {
            this.accumulateUsage(
              data.usage.prompt_tokens,
              data.usage.completion_tokens
            );
          }
        } catch (parseError) {
          this.logger.debug(`Failed to parse SSE chunk: ${dataStr}`, parseError);
        }
      }
    }

    yield {
      content: '',
      isFirst: false,
      isLast: true,
      finishReason: 'stop'
    };
  }

  /**
   * 构建请求体
   * 转换内部消息格式为百川 API 所需的格式
   *
   * @param messages - 对话消息列表
   * @param options - 请求选项
   * @returns API 请求体
   */
  private buildRequestBody(messages: LLMMessage[], options: Partial<LLMRequestOptions>) {
    return {
      model: options.model ?? this._config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: options.temperature ?? 0.7,
      top_p: options.topP,
      max_tokens: options.maxTokens,
      stop: options.stop,
      stream: options.stream
    };
  }

  /**
   * 解析 API 响应
   *
   * @param data - API 返回的原始数据
   * @param startTime - 请求开始时间
   * @returns 标准化的响应对象
   */
  private parseResponse(data: APIResponse, startTime: number): LLMResponse {
    const choice = data.choices?.[0];
    const message = choice?.message;
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return this.createSuccessResponse(
      message?.content || '',
      data.model || this._config.model,
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      Date.now() - startTime,
      data
    );
  }

  /**
   * 确保适配器已初始化并准备好
   *
   * @throws {LLMBaseError} 如果适配器未初始化或缺少 API Key
   */
  private ensureReady(): void {
    if (!this.isReady()) {
      throw new LLMBaseError('BaichuanAdapter not initialized or API key missing', 'NOT_INITIALIZED');
    }
  }
}
