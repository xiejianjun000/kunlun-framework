import { BaseLLMAdapter } from './BaseLLMAdapter';
import {
  ILLMAdapter,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  BaseLLMAdapterConfig
} from './interfaces/ILLMAdapter';

/**
 * 百度文心一言适配器
 * 支持 ERNIE-Bot 系列模型
 */
export class WenxinAdapter extends BaseLLMAdapter implements ILLMAdapter {
  public readonly name: string = 'WenxinAdapter';
  public readonly version: string = '1.0.0';
  public readonly model: string;

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: BaseLLMAdapterConfig & { clientId?: string; clientSecret?: string }) {
    super(config);
    this.model = config.model;
  }

  /**
   * 获取access token（带缓存）
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // 如果直接配置了access token，直接使用
    if (this.apiKey.includes('.')) {
      return this.apiKey;
    }

    // 否则通过client id + client secret获取
    // 文心需要API_KEY = client_id, SECRET_KEY = client_secret
    const [clientId, clientSecret] = this.apiKey.split(':');
    if (!clientId || !clientSecret) {
      throw new Error('Invalid API key format. Expected clientId:clientSecret');
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;
    
    const response = await fetch(url, { method: 'POST' });
    const data: any = await response.json();
    
    if (!data.access_token) {
      throw new Error(`Failed to get access token: ${data.error_description}`);
    }

    this.accessToken = (data.access_token as string) || '';
    this.tokenExpiresAt = Date.now() + ((data.expires_in as number) - 60) * 1000;
    return this.accessToken;
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
      const accessToken = await this.getAccessToken();
      
      // 转换消息格式
      const wenxinMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const requestBody = {
        messages: wenxinMessages,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.8,
        max_output_tokens: options?.maxTokens ?? 1500,
        stop: options?.stop
      };

      const endpoint = this.endpoint || `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${this.model}`;
      const url = `${endpoint}?access_token=${accessToken}`;

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return this.handleError(new Error(`API error: ${response.status} - ${errorText}`));
      }

      const data: any = await response.json();
      
      if (data.error_code) {
        return this.handleError(new Error(`API error: ${data.error_code} - ${data.error_msg}`));
      }

      const text = data.result || '';
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
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

    try {
      const accessToken = await this.getAccessToken();

      const wenxinMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const requestBody = {
        messages: wenxinMessages,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.8,
        max_output_tokens: options?.maxTokens ?? 1500,
        stop: options?.stop,
        stream: true
      };

      const endpoint = this.endpoint || `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${this.model}`;
      const url = `${endpoint}?access_token=${accessToken}`;

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      });

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
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data: any = JSON.parse(jsonStr);
              if (data.result) {
                yield data.result;
              }
              if (data.usage && !gotUsage) {
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                this.accumulateUsage(promptTokens, completionTokens);
                gotUsage = true;
              }
            } catch {
              // Ignore partial chunk parsing errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Wenxin stream error:', error);
    }
  }
}

/**
 * 默认价格（2024年价格，单位：美元/1K tokens）
 */
export const WenxinDefaultPricing = {
  'ernie-bot-4': { prompt: 0.012, completion: 0.024 },
  'ernie-bot': { prompt: 0.0008, completion: 0.0016 },
  'ernie-bot-turbo': { prompt: 0.0004, completion: 0.0008 }
};
