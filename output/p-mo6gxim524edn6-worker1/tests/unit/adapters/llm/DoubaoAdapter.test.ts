import { DoubaoAdapter } from '../../../../src/adapters/llm/DoubaoAdapter';
import type { BaseLLMAdapterConfig } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('DoubaoAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'doubao-pro-4k'
  };

  it('should create an instance', () => {
    const adapter = new DoubaoAdapter(config);
    expect(adapter).toBeDefined();
    expect(adapter.name).toBe('DoubaoAdapter');
    expect(adapter.model).toBe('doubao-pro-4k');
    expect(adapter.isReady()).toBe(true);
  });

  it('should accept custom endpoint', () => {
    const adapter = new DoubaoAdapter({ ...config, endpoint: 'https://custom.api' });
    expect(adapter).toBeDefined();
  });

  it('should report not ready when apiKey empty', () => {
    const adapter = new DoubaoAdapter({ ...config, apiKey: '' });
    expect(adapter.isReady()).toBe(false);
  });
});
