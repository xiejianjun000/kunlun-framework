/**
 * MiniMax LLM Adapter
 * MiniMax ABAB 大模型适配器
 *
 * API Documentation: https://www.minimaxi.com/document/guides
 * Base URL: https://api.minimax.chat/v1
 *
 * Supported Models:
 * - abab6.5-chat: abab6.5-chat
 * - abab6.5s-chat: abab6.5s-chat
 * - abab5.5-chat: abab5.5-chat
 *
 * Pricing (per 1k tokens, CNY):
 * - abab6.5: 0.03 (prompt), 0.03 (completion)
 * - abab6.5s: 0.015 (prompt), 0.015 (completion)
 * - abab5.5: 0.01 (prompt), 0.01 (completion)
 *
 * Authentication:
 * - Authorization: Bearer {API_KEY}
 * - Request URL includes Group ID: ?GroupId={GROUP_ID}
 * - NOTE: MiniMax requires both API Key and Group ID for authentication
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
 * MiniMax 配置接口
 * 扩展标准配置，添加 Group ID 支持
 */
export interface MiniMaxConfig extends LLMConfig {
  /** MiniMax Group ID (必需) */
  groupId: string;
}

/**
 * MiniMax 大模型适配器
 * 实现 MiniMax API 的完整接口封装
 *
 * @example
 * ```typescript
 * const adapter = new MiniMaxAdapter({
 *   apiKey: 'your-api-key',
 *   groupId: 'your-group-id',
 *   model: 'abab6.5-chat'
 * });
 *
 * const response = await adapter.createChatCompletion([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class MiniMaxAdapter extends BaseLLMAdapter {
  /** 提供商名称 */
  public readonly provider = 'minimax';
  protected readonly logger: Logger;
  protected _groupId?: string;

  constructor(config?: MiniMaxConfig) {
    super(config);
    this.logger = new Logger('MiniMaxAdapter');
    if (config?.groupId) {
      this._groupId = config.groupId;
    }
  }

  /**
   * 初始化适配器
   * 设置 MiniMax 的默认 API 端点和计费参数
   *
   * @param config - MiniMax 配置对象，包含 API Key、Group ID 和模型名称
   */
  initialize(config: MiniMaxConfig): void {
    const mergedConfig: MiniMaxConfig = {
      baseUrl: 'https://api.minimax.chat/v1',
      costPer1kPrompt: 0.015,
      costPer1kCompletion: 0.015,
      ...config
    };
    this._groupId = config.groupId;
    super.initialize(mergedConfig);
  }

  /**
   * 检查适配器是否已准备就绪
   * MiniMax 需要额外验证 Group ID
   */
  isReady(): boolean {
    return super.isReady() && !!this._groupId;
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
      const url = `${this._config.baseUrl}/text/chatcompletion_v2?GroupId=${this._groupId}`;
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

      const data = await response.json() as MiniMaxAPIResponse;

      if (!response.ok || !data.base_resp?.status_code || data.base_resp.status_code !== 0) {
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

    const url = `${this._config.baseUrl}/text/chatcompletion_v2?GroupId=${this._groupId}`;
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
          const data: MiniMaxStreamResponse = JSON.parse(dataStr);
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
              data.usage.total_tokens,
              0
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
   * 转换内部消息格式为 MiniMax API 所需的格式
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
   * 解析 MiniMax API 响应
   *
   * @param data - MiniMax API 返回的原始数据
   * @param startTime - 请求开始时间
   * @returns 标准化的响应对象
   */
  private parseResponse(data: MiniMaxAPIResponse, startTime: number): LLMResponse {
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
   * MiniMax 需要 API Key 和 Group ID
   *
   * @throws {LLMBaseError} 如果适配器未初始化或缺少 API Key/Group ID
   */
  private ensureReady(): void {
    if (!this.isReady()) {
      throw new LLMBaseError('MiniMaxAdapter not initialized or API key/Group ID missing', 'NOT_INITIALIZED');
    }
  }
}

/**
 * MiniMax API 响应接口
 * MiniMax 使用自定义的响应格式
 */
interface MiniMaxBaseResp {
  status_code: number;
  status_msg: string;
}

interface MiniMaxAPIResponse {
  base_resp?: MiniMaxBaseResp;
  model: string;
  choices: Array<{
    index: number;
    finish_reason?: string;
    message?: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MiniMaxStreamResponse {
  base_resp?: MiniMaxBaseResp;
  model: string;
  choices: Array<{
    index: number;
    finish_reason?: string;
    delta?: {
      role?: string;
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}
