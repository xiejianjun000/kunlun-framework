import { BaseLLMAdapter } from './BaseLLMAdapter';
import {
  ILLMAdapter,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  BaseLLMAdapterConfig
} from './interfaces/ILLMAdapter';

/**
 * 阿里通义千问适配器
 * 支持通义千问系列模型：qwen-turbo, qwen-plus, qwen-72b-chat
 */
export class QwenAdapter extends BaseLLMAdapter implements ILLMAdapter {
  public readonly name: string = 'QwenAdapter';
  public readonly version: string = '1.0.0';
  public readonly model: string;

  private defaultEndpoint: string = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  constructor(config: BaseLLMAdapterConfig) {
    super(config);
    this.model = config.model;
    if (config.endpoint) {
      this.endpoint = config.endpoint;
    }
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
      const qwenMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
        content: msg.content
      }));

      const requestBody = {
        model: this.model,
        input: {
          messages: qwenMessages
        },
        parameters: {
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.8,
          max_tokens: options?.maxTokens ?? 1500,
          top_k: options?.topK ?? 50,
          stop: options?.stop,
          enable_search: false
        }
      };

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
      
      const text = data.output?.text || '';
      const usage = data.usage || {};
      const promptTokens = usage.input_tokens || 0;
      const completionTokens = usage.output_tokens || 0;
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

    const qwenMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
      content: msg.content
    }));

    const requestBody = {
      model: this.model,
      input: {
        messages: qwenMessages
      },
      parameters: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.8,
        max_tokens: options?.maxTokens ?? 1500,
        top_k: options?.topK ?? 50,
        stop: options?.stop,
        enable_search: false,
        incremental_output: true
      }
    };

    const response = await this.fetchWithRetry(
      (this.endpoint || this.defaultEndpoint).replace('/generation', '/stream-generation'),
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
    let usageAccumulated = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const data: any = JSON.parse(jsonStr);
            if (data.output?.text) {
              yield data.output.text;
            }
            // 最后一条消息包含usage
            if (data.usage && !usageAccumulated) {
              const promptTokens = data.usage.input_tokens || 0;
              const completionTokens = data.usage.output_tokens || 0;
              this.accumulateUsage(promptTokens, completionTokens);
              usageAccumulated = true;
            }
          } catch {
            // Ignore parsing errors on partial chunks
          }
        }
      }
    }
  }
}

/**
 * 默认价格（2024年价格，单位：美元/1K tokens）
 */
export const QwenDefaultPricing = {
  'qwen-turbo': { prompt: 0.0008, completion: 0.0008 },
  'qwen-plus': { prompt: 0.0028, completion: 0.0028 },
  'qwen-72b-chat': { prompt: 0.0035, completion: 0.0035 }
};
