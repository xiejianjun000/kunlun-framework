import { SparkAdapter } from '../../../../src/adapters/llm/SparkAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('SparkAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'lite'
  };

  it('should create an instance', () => {
    const adapter = new SparkAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('SparkAdapter');
    expect(adapter.model).toBe('lite');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const adapter = new SparkAdapter({ ...config, endpoint: 'https://custom.api' });
    expect(adapter).toBeDefined();
  });

  it('should report not ready when apiKey empty', () => {
    const adapter = new SparkAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });
});
