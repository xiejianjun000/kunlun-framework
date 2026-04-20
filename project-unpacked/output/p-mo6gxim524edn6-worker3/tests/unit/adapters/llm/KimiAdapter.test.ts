import { KimiAdapter } from '../../../../src/adapters/llm/KimiAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('KimiAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'moonshot-v1-8k'
  };

  it('should create an instance', () => {
    const adapter = new KimiAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('KimiAdapter');
    expect(adapter.model).toBe('moonshot-v1-8k');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const adapter = new KimiAdapter({ ...config, endpoint: 'https://custom.api' });
    expect(adapter).toBeDefined();
  });

  it('should report not ready when apiKey empty', () => {
    const adapter = new KimiAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });
});
