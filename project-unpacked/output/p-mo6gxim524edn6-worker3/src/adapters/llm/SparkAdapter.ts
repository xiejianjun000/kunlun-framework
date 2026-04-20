import { BaseLLMAdapter } from './BaseLLMAdapter';
import {
  ILLMAdapter,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  BaseLLMAdapterConfig
} from './interfaces/ILLMAdapter';

/**
 * 讯飞星火适配器
 * 支持星火大模型系列
 */
export class SparkAdapter extends BaseLLMAdapter implements ILLMAdapter {
  public readonly name: string = 'SparkAdapter';
  public readonly version: string = '1.0.0';
  public readonly model: string;

  private defaultEndpoint: string = 'https://spark-api-open.xf-yun.com/v1/chat/completions';

  constructor(config: BaseLLMAdapterConfig) {
    super(config);
    this.model = config.model;
  }

  /**
   * 完成文本生成
   */
  async complete(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionOptions>
  ): Promise<LLMCompletionResult> {
    if (!this.isReady()) {
      return this.handleError(new Error('API key not configured'));
    }

    try {
      const sparkMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const requestBody: any = {
        model: this.model,
        messages: sparkMessages,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.8,
        max_tokens: options?.maxTokens ?? 1500,
        stream: false
      };

      if (options?.stop) {
        requestBody.stop = options.stop;
      }

      const response = await this.fetchWithRetry(
        this.endpoint || this.defaultEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return this.handleError(new Error(`API error: ${response.status} - ${errorText}`));
      }

      const data: any = await response.json();
      
      const choice = data.choices?.[0];
      const text = choice?.message?.content || '';
      const usage = data.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = promptTokens + completionTokens;

      this.accumulateUsage(promptTokens, completionTokens);

      return {
        text,
        promptTokens,
        completionTokens,
        totalTokens,
        success: true,
        rawResponse: data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 流式生成
   */
  async *completeStream(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionOptions>
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isReady()) {
      yield '';
      return;
    }

    const sparkMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const requestBody: any = {
      model: this.model,
      messages: sparkMessages,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.8,
      max_tokens: options?.maxTokens ?? 1500,
      stream: true
    };

    if (options?.stop) {
      requestBody.stop = options.stop;
    }

    const response = await this.fetchWithRetry(
      this.endpoint || this.defaultEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok || !response.body) {
      yield '';
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotUsage = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          if (jsonStr === '[DONE]') break;

          try {
            const data: any = JSON.parse(jsonStr);
            const delta = data.choices?.[0]?.delta;
            if (delta?.content) {
              yield delta.content;
            }
            if (data.usage && !gotUsage) {
              const promptTokens = data.usage.prompt_tokens || 0;
              const completionTokens = data.usage.completion_tokens || 0;
              this.accumulateUsage(promptTokens, completionTokens);
              gotUsage = true;
            }
          } catch {
            // Ignore partial chunk
          }
        }
      }
    }
  }
}

/**
 * 默认价格（2024年价格，单位：美元/1K tokens）
 */
export const SparkDefaultPricing = {
  'lite': { prompt: 0.0004, completion: 0.0004 },
  'pro-128k': { prompt: 0.002, completion: 0.002 },
  'ultra': { prompt: 0.004, completion: 0.004 }
};
