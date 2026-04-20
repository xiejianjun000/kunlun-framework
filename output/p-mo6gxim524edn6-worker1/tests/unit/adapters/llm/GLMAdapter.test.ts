import { GLMAdapter } from '../../../../src/adapters/llm/GLMAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('GLMAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'glm-4'
  };

  it('should create an instance', () => {
    const adapter = new GLMAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('GLMAdapter');
    expect(adapter.model).toBe('glm-4');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const adapter = new GLMAdapter({ ...config, endpoint: 'https://custom.api' });
    expect(adapter).toBeDefined();
  });

  it('should report not ready when apiKey empty', () => {
    const adapter = new GLMAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });
});
