/**
 * LLM Adapter Types - 大语言模型适配器类型定义
 */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'developer';

export interface TextContentBlock {
  type: 'text';
  text: string;
}

export interface ImageContentBlock {
  type: 'image';
  source: {
    type: 'url' | 'base64';
    url?: string;
    data?: string;
    media_type?: string;
  };
}

export type ContentBlock = TextContentBlock | ImageContentBlock;

export interface MessageParam {
  role: MessageRole;
  content: string | ContentBlock[];
  name?: string;
  tool_call_id?: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  output: string;
  is_error?: boolean;
}

export interface LLMRequestBase {
  messages: MessageParam[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  tools?: ToolDefinition[];
  stop_sequences?: string[];
  system?: string;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  reasoning_tokens?: number;
}

export type StopReason = 
  | 'end_turn' 
  | 'stop_sequence' 
  | 'max_tokens' 
  | 'tool_use'
  | 'content_filter';

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  stop_reason: StopReason;
  usage: Usage;
  raw?: any;
}

export type StreamEvent = {
  type: string;
  index?: number;
  delta?: string;
  content_type?: string;
  id?: string;
  name?: string;
  arguments?: string;
  message?: any;
  delta_content?: any;
  usage?: any;
  error?: string;
};

export interface LLMStreamResponse {
  [Symbol.asyncIterator](): AsyncIterator<StreamEvent>;
  controller: AbortController;
  toReadableStream(): ReadableStream;
  tee(): [LLMStreamResponse, LLMStreamResponse];
}

export interface AdapterConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
  defaultMaxTokens?: number;
  headers?: Record<string, string>;
}

export interface LLMAdapter {
  name: string;
  supportedModels: string[];
  
  complete(request: LLMRequestBase): Promise<LLMResponse>;
  stream(request: LLMRequestBase): Promise<LLMStreamResponse>;
  getModel(): string;
  setModel(model: string): void;
  ping(): Promise<boolean>;
}

export interface ModelCost {
  inputPrice: number;
  outputPrice: number;
}

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek';

export interface LLMManagerConfig {
  defaultProvider?: LLMProvider;
  fallbacks?: Array<{
    provider: LLMProvider;
    models: string[];
  }>;
  modelMapping?: Record<string, {
    provider: LLMProvider;
    model: string;
  }>;
}

export interface CallOptions {
  provider?: LLMProvider;
  model?: string;
  enableFallback?: boolean;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly provider?: LLMProvider
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMAuthenticationError extends LLMError {
  constructor(message: string, provider?: LLMProvider) {
    super(message, 'AUTHENTICATION_ERROR', 401, provider);
    this.name = 'LLMAuthenticationError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    provider?: LLMProvider
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, provider);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMContextLengthError extends LLMError {
  constructor(message: string, provider?: LLMProvider) {
    super(message, 'CONTEXT_LENGTH_ERROR', 422, provider);
    this.name = 'LLMContextLengthError';
  }
}

export class LLMConnectionError extends LLMError {
  constructor(message: string, public readonly cause?: Error, provider?: LLMProvider) {
    super(message, 'CONNECTION_ERROR', undefined, provider);
    this.name = 'LLMConnectionError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message: string = 'Request timed out', provider?: LLMProvider) {
    super(message, 'TIMEOUT_ERROR', undefined, provider);
    this.name = 'LLMTimeoutError';
  }
}

// Anthropic特定类型
export interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'thinking' | 'redacted_thinking';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  thinking?: string;
}

export interface AnthropicMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: StopReason;
  stop_sequence: string | null;
  usage: Usage;
}
