/**
 * LLM Adapter Module - 大语言模型适配器模块
 * 
 * @example
 * ```typescript
 * import { 
 *   LLMManager, 
 *   OpenAIAdapter, 
 *   AnthropicAdapter,
 *   DeepSeekAdapter 
 * } from './adapters/llm';
 * 
 * // 创建管理器
 * const manager = new LLMManager({
 *   openai: { apiKey: 'sk-...' },
 *   anthropic: { apiKey: 'sk-ant-...' },
 *   deepseek: { apiKey: 'sk-...' }
 * });
 * 
 * // 发送请求
 * const response = await manager.complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   model: 'gpt-4'
 * });
 * 
 * console.log(response.content);
 * ```
 */

// 类型定义
export * from './types';

// 适配器
export { OpenAIAdapter, OPENAI_MODELS } from './OpenAIAdapter';
export type { OpenAIAdapterConfig } from './OpenAIAdapter';

export { AnthropicAdapter, ANTHROPIC_MODELS } from './AnthropicAdapter';
export type { AnthropicAdapterConfig } from './AnthropicAdapter';

export { DeepSeekAdapter, DEEPSEEK_MODELS } from './DeepSeekAdapter';
export type { DeepSeekAdapterConfig } from './DeepSeekAdapter';

// 管理器
export { LLMManager, createLLMManager } from './LLMManager';
export type { 
  ProviderConfigMap, 
  CallStatistics 
} from './LLMManager';
