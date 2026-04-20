import { QwenAdapter } from '../../../../src/adapters/llm/QwenAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('QwenAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'qwen-turbo'
  };

  it('should create an instance', () => {
    const adapter = new QwenAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('QwenAdapter');
    expect(adapter.model).toBe('qwen-turbo');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const customConfig = {
      ...config,
      endpoint: 'https://custom.endpoint/api'
    };
    const adapter = new QwenAdapter(customConfig);
    expect(adapter).toBeDefined();
  });

  it('should return error when apiKey is empty', () => {
    const adapter = new QwenAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });

  it('should get empty usage on new instance', () => {
    const adapter = new QwenAdapter(config);
    const usage = adapter.getTokenUsage();
    expect(usage.totalTokens).toBe(0);
    expect(usage.estimatedCostUsd).toBe(0);
  });

  it('should reset usage correctly', () => {
    const adapter = new QwenAdapter(config);
    adapter.resetTokenUsage();
    const usage = adapter.getTokenUsage();
    expect(usage.totalTokens).toBe(0);
  });
});
