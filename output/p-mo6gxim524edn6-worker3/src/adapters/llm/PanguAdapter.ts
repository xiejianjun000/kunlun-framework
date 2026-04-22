/**
 * Pangu LLM Adapter
 * 华为云盘古大模型适配器
 *
 * API Documentation: https://support.huaweicloud.com/api-pangu/
 * Base URL: https://{endpoint}/v1/{project_id}/completions
 *
 * Supported Models:
 * - pangu-7b: 盘古 7B 模型
 * - pangu-70b: 盘古 70B 模型
 * - pangu-350b: 盘古 350B 模型
 * - pangu-finance: 盘古金融模型
 *
 * Pricing (per 1k tokens, CNY):
 * - pangu-7b: 0.008 (prompt), 0.008 (completion)
 * - pangu-70b: 0.02 (prompt), 0.02 (completion)
 * - pangu-350b: 0.04 (prompt), 0.04 (completion)
 *
 * Authentication:
 * - X-Auth-Token: IAM Token
 * - 需要先获取 IAM Token 才能调用 API
 */

import { BaseLLMAdapter } from './BaseLLMAdapter';
import {
  LLMConfig,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMBaseError,
  AuthenticationError
} from './interfaces/ILLMAdapter';
import { Logger } from '../../utils/logger';

/**
 * Pangu 配置接口
 * 扩展标准配置，添加华为云特定参数
 */
export interface PanguConfig extends LLMConfig {
  /** 华为云 Project ID */
  projectId: string;
  /** 华为云区域端点，如 cn-north-4 */
  region?: string;
  /** IAM Token，如果已获取则使用 */
  iamToken?: string;
}

/**
 * 华为云盘古大模型适配器
 * 实现华为云 Pangu API 的完整接口封装
 *
 * @example
 * ```typescript
 * const adapter = new PanguAdapter({
 *   apiKey: 'your-iam-token',
 *   projectId: 'your-project-id',
 *   model: 'pangu-70b'
 * });
 *
 * const response = await adapter.createChatCompletion([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */
export class PanguAdapter extends BaseLLMAdapter {
  /** 提供商名称 */
  public readonly provider = 'pangu';
  protected readonly logger: Logger;
  protected _projectId?: string;
  protected _region?: string;

  constructor(config?: PanguConfig) {
    super(config);
    this.logger = new Logger('PanguAdapter');
  }

  /**
   * 初始化适配器
   * 设置 Pangu 的默认 API 端点和计费参数
   *
   * @param config - Pangu 配置对象
   */
  initialize(config: PanguConfig): void {
    const region = config.region ?? 'cn-north-4';
    const mergedConfig: PanguConfig = {
      baseUrl: `https://pangu.${region}.myhuaweicloud.com`,
      costPer1kPrompt: 0.02,
      costPer1kCompletion: 0.02,
      ...config
    };
    this._projectId = config.projectId;
    this._region = region;
    super.initialize(mergedConfig);
  }

  /**
   * 检查适配器是否已准备就绪
   * Pangu 需要 Project ID
   */
  isReady(): boolean {
    return super.isReady() && !!(this._config as PanguConfig).projectId;
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
      const projectId = (this._config as PanguConfig).projectId;
      const url = `${this._config.baseUrl}/v1/${projectId}/chat/completions`;
      const body = this.buildRequestBody(messages, { ...options, stream: false });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this._config.apiKey
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options?.timeoutMs ?? this._config.timeoutMs ?? 30000)
      });

      const data = await response.json() as PanguAPIResponse;

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

    const projectId = (this._config as PanguConfig).projectId;
    const url = `${this._config.baseUrl}/v1/${projectId}/chat/completions`;
    const body = this.buildRequestBody(messages, { ...options, stream: true });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': this._config.apiKey
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
          const data: PanguStreamResponse = JSON.parse(dataStr);
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
   * 转换内部消息格式为 Pangu API 所需的格式
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
   * 解析 Pangu API 响应
   *
   * @param data - Pangu API 返回的原始数据
   * @param startTime - 请求开始时间
   * @returns 标准化的响应对象
   */
  private parseResponse(data: PanguAPIResponse, startTime: number): LLMResponse {
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
   * Pangu 需要 API Key 和 Project ID
   *
   * @throws {LLMBaseError} 如果适配器未初始化或缺少参数
   */
  private ensureReady(): void {
    if (!this.isReady()) {
      throw new LLMBaseError('PanguAdapter not initialized or API key/Project ID missing', 'NOT_INITIALIZED');
    }
  }

  /**
   * 处理 API 错误
   * 华为云有特定的错误码格式
   */
  protected handleApiError(response: Response, responseBody: unknown): never {
    const status = response.status;
    let message = `HTTP ${status}`;

    if (typeof responseBody === 'object' && responseBody !== null) {
      const body = responseBody as Record<string, unknown>;
      if (body.error_code && body.error_msg) {
        message = `${body.error_code}: ${body.error_msg}`;
      } else if (body.error) {
        const e = body.error as Record<string, unknown>;
        message = String(e.message || e.msg || message);
      }
    }

    switch (status) {
      case 401:
      case 403:
        throw new AuthenticationError(message);
      case 429:
        throw new LLMBaseError(message, 'RATE_LIMIT');
      case 500:
      case 502:
      case 503:
      case 504:
        throw new LLMBaseError(message, 'SERVICE_UNAVAILABLE');
      default:
        throw new LLMBaseError(message, `HTTP_${status}`);
    }
  }
}

/**
 * Pangu API 响应接口
 */
interface PanguAPIResponse {
  id: string;
  object: string;
  created: number;
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
  error_code?: string;
  error_msg?: string;
}

interface PanguStreamResponse {
  id: string;
  object: string;
  created: number;
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
    prompt_tokens: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
