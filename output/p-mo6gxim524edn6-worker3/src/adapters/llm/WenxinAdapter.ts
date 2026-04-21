import { BaseLLMAdapter } from './BaseLLMAdapter';
import {
  LLMConfig,
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMBaseError
} from './interfaces/ILLMAdapter';
import { Logger } from '../../utils/logger';

export interface WenxinConfig extends LLMConfig {
  clientId?: string;
  clientSecret?: string;
}

interface WenxinMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface WenxinResponse {
  result: string;
  need_clear_history?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error_code?: number;
  error_msg?: string;
  is_end?: boolean;
}

/**
 * 文心一言 Token 响应类型
 */
interface WenxinTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

export class WenxinAdapter extends BaseLLMAdapter {
  public readonly provider = 'wenxin';

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  protected readonly logger: Logger;

  constructor(config?: WenxinConfig) {
    super(config);
    this.logger = new Logger('WenxinAdapter');
  }

  initialize(config: WenxinConfig): void {
    const mergedConfig: WenxinConfig = {
      baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      costPer1kPrompt: 0.0008,
      costPer1kCompletion: 0.0016,
      ...config
    };
    super.initialize(mergedConfig);
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return String(this.accessToken);
    }

    const config = this._config as WenxinConfig;
    const clientId = config.clientId ?? '';
    const clientSecret = config.clientSecret ?? '';
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this._config.timeoutMs ?? 30000)
    });

    if (!response.ok) {
      throw new LLMBaseError(`Failed to get access token: HTTP ${response.status}`, 'TOKEN_ERROR');
    }

    const data = (await response.json()) as WenxinTokenResponse;

    if (data.error) {
      throw new LLMBaseError(`Token error: ${data.error_description || data.error}`, 'TOKEN_ERROR');
    }

    this.accessToken = data.access_token || '';
    this.tokenExpiresAt = Date.now() + ((data.expires_in || 0) - 60) * 1000;

    return String(this.accessToken);
  }

  async createChatCompletion(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): Promise<LLMResponse> {
    this.ensureReady();
    const startTime = Date.now();

    return this.fetchWithRetry(async () => {
      const accessToken = await this.getAccessToken();
      const url = `${this._config.baseUrl}/chat/${this._config.model}?access_token=${accessToken}`;
      const body = this.buildRequestBody(messages, { ...options, stream: false });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options?.timeoutMs ?? this._config.timeoutMs ?? 30000)
      });

      const data = await response.json() as WenxinResponse;

      if (!response.ok || data.error_code) {
        this.handleApiError(response, data);
      }

      const result = this.parseResponse(data, startTime);
      this.accumulateUsage(result.usage.promptTokens, result.usage.completionTokens);
      return result;
    });
  }

  async* createChatCompletionStream(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    this.ensureReady();
    const startTime = Date.now();

    const accessToken = await this.getAccessToken();
    const url = `${this._config.baseUrl}/chat/${this._config.model}?access_token=${accessToken}`;
    const body = this.buildRequestBody(messages, { ...options, stream: true });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs ?? this._config.timeoutMs ?? 60000)
    });

    if (!response.ok) {
      const data = (await response.json()) as WenxinResponse;
      this.handleApiError(response, data);
    }

    if (!response.body) {
      throw new LLMBaseError('No response body', 'NO_RESPONSE_BODY');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isFirst = true;
    let promptTokens = 0;

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
          const data = JSON.parse(dataStr) as WenxinResponse;

          if (data.usage) {
            promptTokens = data.usage.prompt_tokens || 0;
          }

          const delta = data.result || '';
          if (delta) {
            yield {
              content: delta,
              isFirst,
              isLast: false,
              finishReason: data.is_end ? 'stop' : undefined
            };
            isFirst = false;
          }

          if (data.is_end && data.usage) {
            this.accumulateUsage(
              promptTokens,
              data.usage.completion_tokens || 0
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

  private buildRequestBody(messages: LLMMessage[], options: Partial<LLMRequestOptions> & { stream?: boolean }) {
    const wenxinMessages: WenxinMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const systemMessages = messages.filter(m => m.role === 'system');
    const system = systemMessages.length > 0
      ? systemMessages.map(m => m.content).join('\n')
      : undefined;

    return {
      messages: wenxinMessages,
      system,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP,
      max_output_tokens: options.maxTokens,
      stop: options.stop,
      stream: options.stream
    };
  }

  private parseResponse(data: WenxinResponse, startTime: number): LLMResponse {
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return this.createSuccessResponse(
      data.result || '',
      this._config.model,
      {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      },
      Date.now() - startTime,
      data
    );
  }

  private ensureReady(): void {
    if (!this.isReady()) {
      throw new LLMBaseError('WenxinAdapter not initialized', 'NOT_INITIALIZED');
    }
  }
}
