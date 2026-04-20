/**
 * LLM Adapter Interface
 * Unified interface for all LLM providers
 *
 * Conforms to standard adapter pattern used by OpenAI/Anthropic/DeepSeek adapters
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: LLMTokenUsage;
  latencyMs: number;
  finishReason?: string;
  rawResponse?: unknown;
}

export interface LLMStreamChunk {
  content: string;
  finishReason?: string;
  isFirst: boolean;
  isLast: boolean;
}

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string | string[];
  stream?: boolean;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeoutMs?: number;
}

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
  costPer1kPrompt?: number;
  costPer1kCompletion?: number;
}

/**
 * Standard API response type for OpenAI-compatible endpoints
 */
export interface APIResponse {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason?: string;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

export interface ILLMAdapter {
  readonly provider: string;
  readonly model: string;
  readonly config: Readonly<LLMConfig>;

  initialize(config: LLMConfig): void;
  isReady(): boolean;
  checkAvailability(): Promise<boolean>;

  createChatCompletion(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): Promise<LLMResponse>;

  createChatCompletionStream(
    messages: LLMMessage[],
    options?: Partial<LLMRequestOptions>
  ): AsyncGenerator<LLMStreamChunk, void, unknown>;

  calculateCost(usage: LLMTokenUsage): number;
  getTotalUsage(): LLMTokenUsage & { totalCost: number };
  resetUsage(): void;
}

export class LLMBaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'LLMBaseError';
  }
}

export class AuthenticationError extends LLMBaseError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends LLMBaseError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends LLMBaseError {
  constructor(message: string = 'Service unavailable') {
    super(message, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

export class ContextLengthError extends LLMBaseError {
  constructor(message: string = 'Context length exceeded') {
    super(message, 'CONTEXT_LENGTH_EXCEEDED');
    this.name = 'ContextLengthError';
  }
}

export class ContentPolicyError extends LLMBaseError {
  constructor(message: string = 'Content policy violation') {
    super(message, 'CONTENT_POLICY_VIOLATION');
    this.name = 'ContentPolicyError';
  }
}

export class TimeoutError extends LLMBaseError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}
