/**
 * OpenAI Adapter - OpenAI API适配器
 */

import {
  LLMAdapter,
  AdapterConfig,
  LLMRequestBase,
  LLMResponse,
  LLMStreamResponse,
  StreamEvent,
  MessageParam,
  ToolCall,
  Usage,
  StopReason,
  LLMError,
  LLMAuthenticationError,
  LLMRateLimitError,
  LLMContextLengthError,
  LLMConnectionError,
  LLMTimeoutError,
} from './types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
];

export interface OpenAIAdapterConfig extends AdapterConfig {
  organization?: string;
}

interface ToolCallState {
  id?: string;
  name?: string;
  arguments?: string;
}

export class OpenAIAdapter implements LLMAdapter {
  name: string = 'openai';
  supportedModels: string[] = [...OPENAI_MODELS];
  
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private model: string;
  private defaultMaxTokens: number;
  private organization?: string;
  private headers: Record<string, string>;
  
  constructor(config: OpenAIAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || DEFAULT_BASE_URL;
    this.timeout = config.timeout || 120000;
    this.maxRetries = config.maxRetries || 3;
    this.model = config.defaultModel || 'gpt-4o-mini';
    this.defaultMaxTokens = config.defaultMaxTokens || 4096;
    this.organization = config.organization;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }
  
  getModel(): string {
    return this.model;
  }
  
  setModel(model: string): void {
    this.model = model;
  }
  
  async complete(request: LLMRequestBase): Promise<LLMResponse> {
    const openaiRequest = this.buildRequest(request, false);
    const response = await this.executeRequest(openaiRequest);
    return this.parseResponse(response);
  }
  
  async stream(request: LLMRequestBase): Promise<LLMStreamResponse> {
    const openaiRequest = this.buildRequest(request, true);
    const response = await this.executeStreamRequest(openaiRequest);
    return this.createStreamResponse(response);
  }
  
  async ping(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const resp = await fetch(`${this.baseURL}/models`, {
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return resp.ok;
    } catch {
      return false;
    }
  }
  
  private buildRequest(request: LLMRequestBase, stream: boolean): any {
    const messages: MessageParam[] = [];
    
    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }
    
    messages.push(...request.messages);
    
    const openaiRequest: any = {
      model: this.model,
      messages,
      max_tokens: request.max_tokens || this.defaultMaxTokens,
      stream,
    };
    
    if (request.temperature !== undefined) {
      openaiRequest.temperature = request.temperature;
    }
    
    if (request.top_p !== undefined) {
      openaiRequest.top_p = request.top_p;
    }
    
    if (request.tools && request.tools.length > 0) {
      openaiRequest.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      }));
    }
    
    if (request.stop_sequences && request.stop_sequences.length > 0) {
      openaiRequest.stop = request.stop_sequences;
    }
    
    return openaiRequest;
  }
  
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.headers,
      'Authorization': `Bearer ${this.apiKey}`,
    };
    
    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }
    
    return headers;
  }
  
  private async executeRequest(request: any): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          await this.handleErrorResponse(response);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new LLMTimeoutError(undefined, 'openai');
          }
          
          if (error instanceof LLMError) {
            throw error;
          }
        }
        
        if (attempt < this.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw new LLMConnectionError(
      `Request failed after ${this.maxRetries + 1} attempts`,
      lastError || undefined,
      'openai'
    );
  }
  
  private async executeStreamRequest(request: any): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.buildHeaders(),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const body = await response.text();
        throw await this.handleErrorResponseFromBody(response, body);
      }
      
      return response;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new LLMTimeoutError(undefined, 'openai');
      }
      throw new LLMConnectionError(
        (error as Error).message,
        error as Error,
        'openai'
      );
    }
  }
  
  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let errorBody: any;
    
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    
    const message = errorBody?.error?.message || errorBody?.message || `HTTP ${status}`;
    
    switch (status) {
      case 401:
        throw new LLMAuthenticationError(message, 'openai');
      case 403:
        throw new LLMAuthenticationError('Access forbidden', 'openai');
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new LLMRateLimitError(
          message,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          'openai'
        );
      case 422:
        if (message.includes('context_length') || message.includes('maximum context')) {
          throw new LLMContextLengthError(message, 'openai');
        }
        throw new LLMError(message, 'VALIDATION_ERROR', status, 'openai');
      default:
        if (status >= 500) {
          throw new LLMError(message, 'SERVER_ERROR', status, 'openai');
        }
        throw new LLMError(message, 'REQUEST_ERROR', status, 'openai');
    }
  }
  
  private async handleErrorResponseFromBody(response: Response, body: string): Promise<never> {
    const status = response.status;
    
    try {
      const json = JSON.parse(body);
      const message = json?.error?.message || json?.message || `HTTP ${status}`;
      
      switch (status) {
        case 401:
          throw new LLMAuthenticationError(message, 'openai');
        case 429:
          throw new LLMRateLimitError(message, undefined, 'openai');
        case 422:
          if (message.includes('context_length')) {
            throw new LLMContextLengthError(message, 'openai');
          }
          throw new LLMError(message, 'VALIDATION_ERROR', status, 'openai');
        default:
          throw new LLMError(message, 'REQUEST_ERROR', status, 'openai');
      }
    } catch (e) {
      if (e instanceof LLMError) {
        throw e;
      }
      throw new LLMError(`HTTP ${status}: ${body}`, 'REQUEST_ERROR', status, 'openai');
    }
  }
  
  private async parseResponse(response: Response): Promise<LLMResponse> {
    const data: any = await response.json();
    
    let content = '';
    const toolCalls: ToolCall[] = [];
    let stopReason: StopReason = 'end_turn';
    
    const choice = data.choices?.[0];
    if (choice?.message) {
      content = choice.message.content || '';
      
      if (choice.message.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function?.name || '',
            input: typeof tc.function?.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function?.arguments || {},
          });
        }
      }
      
      switch (choice.finish_reason) {
        case 'stop':
          stopReason = 'stop_sequence';
          break;
        case 'length':
          stopReason = 'max_tokens';
          break;
        case 'tool_calls':
          stopReason = 'tool_use';
          break;
        default:
          stopReason = 'end_turn';
      }
    }
    
    const usage: Usage = {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    };
    
    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      stop_reason: stopReason,
      usage,
      raw: data,
    };
  }
  
  private createStreamResponse(response: Response): LLMStreamResponse {
    const controller = new AbortController();
    const toolCallStates: Map<number, ToolCallState> = new Map();
    
    function processLine(line: string): StreamEvent[] {
      const events: StreamEvent[] = [];
      
      if (!line.startsWith('data: ')) return events;
      
      const dataStr = line.slice(6).trim();
      if (dataStr === '[DONE]') {
        events.push({ type: 'done' });
        return events;
      }
      
      try {
        const chunk: any = JSON.parse(dataStr);
        
        if (chunk.usage) {
          events.push({
            type: 'usage',
            usage: {
              input_tokens: chunk.usage.prompt_tokens || 0,
              output_tokens: chunk.usage.completion_tokens || 0,
            },
          });
        }
        
        const choice = chunk.choices?.[0];
        if (!choice) return events;
        
        const index = choice.index ?? 0;
        
        if (choice.delta?.content) {
          events.push({
            type: 'content_delta',
            index,
            delta: choice.delta.content,
          });
        }
        
        if (choice.delta?.tool_calls) {
          for (const toolCall of choice.delta.tool_calls) {
            const toolIndex = toolCall.index ?? 0;
            let state = toolCallStates.get(toolIndex);
            
            if (!state) {
              state = {};
              toolCallStates.set(toolIndex, state);
            }
            
            if (toolCall.id) {
              state.id = toolCall.id;
              events.push({
                type: 'tool_call_start',
                index: toolIndex,
                id: toolCall.id,
                name: state.name || '',
              });
            }
            
            if (toolCall.function?.name) {
              state.name = toolCall.function.name;
              events.push({
                type: 'tool_call_delta',
                index: toolIndex,
                id: state.id,
                name: toolCall.function.name,
              });
            }
            
            if (toolCall.function?.arguments) {
              state.arguments = (state.arguments || '') + toolCall.function.arguments;
              events.push({
                type: 'tool_call_delta',
                index: toolIndex,
                id: state.id,
                name: state.name,
                arguments: toolCall.function.arguments,
              });
            }
          }
        }
        
        if (choice.finish_reason) {
          events.push({ type: 'content_stop', index });
        }
      } catch (e) {
        // 忽略解析错误
      }
      
      return events;
    }
    
    async function* streamIterator(): AsyncIterator<StreamEvent> {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new LLMConnectionError('Response body is null', undefined, 'openai');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) {
            if (buffer.trim()) {
              const events = processLine(buffer.trim());
              for (const event of events) {
                yield event;
              }
            }
            yield { type: 'done' };
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              const events = processLine(trimmed);
              for (const event of events) {
                yield event;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
    
    // 创建tee分割
    const leftQueue: StreamEvent[] = [];
    const rightQueue: StreamEvent[] = [];
    let iter: AsyncIterator<StreamEvent> | null = null;
    
    function getIter(): AsyncIterator<StreamEvent> {
      if (!iter) {
        iter = streamIterator();
      }
      return iter;
    }
    
    const left: LLMStreamResponse = {
      [Symbol.asyncIterator](): AsyncIterator<StreamEvent> {
        let index = 0;
        return {
          next(): Promise<IteratorResult<StreamEvent>> {
            if (index < leftQueue.length) {
              return Promise.resolve({ value: leftQueue[index++], done: false });
            }
            return getIter().next().then(result => {
              if (!result.done) {
                leftQueue.push(result.value);
                index++;
              }
              return result;
            });
          },
        };
      },
      controller,
      toReadableStream(): ReadableStream {
        return new ReadableStream();
      },
      tee(): [LLMStreamResponse, LLMStreamResponse] {
        return [left, right];
      },
    };
    
    const right: LLMStreamResponse = {
      [Symbol.asyncIterator](): AsyncIterator<StreamEvent> {
        let index = 0;
        return {
          next(): Promise<IteratorResult<StreamEvent>> {
            if (index < rightQueue.length) {
              return Promise.resolve({ value: rightQueue[index++], done: false });
            }
            return getIter().next().then(result => {
              if (!result.done) {
                rightQueue.push(result.value);
                index++;
              }
              return result;
            });
          },
        };
      },
      controller,
      toReadableStream(): ReadableStream {
        return new ReadableStream();
      },
      tee(): [LLMStreamResponse, LLMStreamResponse] {
        return [left, right];
      },
    };
    
    return {
      [Symbol.asyncIterator](): AsyncIterator<StreamEvent> {
        return streamIterator();
      },
      controller,
      toReadableStream(): ReadableStream {
        return new ReadableStream({
          async start(c) {
            try {
              const iter = streamIterator();
              let result = await iter.next();
              while (!result.done) {
                c.enqueue(new TextEncoder().encode(JSON.stringify(result.value) + '\n'));
                result = await iter.next();
              }
            } finally {
              c.close();
            }
          },
          cancel() {
            controller.abort();
          },
        });
      },
      tee(): [LLMStreamResponse, LLMStreamResponse] {
        return [left, right];
      },
    };
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
