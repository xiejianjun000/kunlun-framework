import { WenxinAdapter } from '../../../../src/adapters/llm/WenxinAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('WenxinAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'client-id:client-secret',
    model: 'ernie-bot'
  };

  it('should create an instance', () => {
    const adapter = new WenxinAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('WenxinAdapter');
    expect(adapter.model).toBe('ernie-bot');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const customConfig = {
      ...config,
      endpoint: 'https://custom.endpoint'
    };
    const adapter = new WenxinAdapter(customConfig);
    expect(adapter).toBeDefined();
  });

  it('should report not ready when apiKey empty', () => {
    const adapter = new WenxinAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });
});
