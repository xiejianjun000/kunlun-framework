import { HunyuanAdapter } from '../../../../src/adapters/llm/HunyuanAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('HunyuanAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'hunyuan-standard'
  };

  it('should create an instance', () => {
    const adapter = new HunyuanAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('HunyuanAdapter');
    expect(adapter.model).toBe('hunyuan-standard');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const adapter = new HunyuanAdapter({ ...config, endpoint: 'https://custom.api' });
    expect(adapter).toBeDefined();
  });

  it('should report not ready when apiKey empty', () => {
    const adapter = new HunyuanAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });
});
