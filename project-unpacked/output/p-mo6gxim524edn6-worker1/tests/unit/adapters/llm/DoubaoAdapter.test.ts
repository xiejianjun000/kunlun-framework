import { DoubaoAdapter } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/DoubaoAdapter';
import type { BaseLLMAdapterConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/interfaces/ILLMAdapter';

// Mock fetch
global.fetch = jest.fn();

describe('DoubaoAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'doubao-lite'
  };

  let adapter: DoubaoAdapter;

  beforeEach(() => {
    adapter = new DoubaoAdapter(config);
    (fetch as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('should create DoubaoAdapter with correct configuration', () => {
      expect(adapter).toBeInstanceOf(DoubaoAdapter);
      expect(adapter.name).toBe('DoubaoAdapter');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.model).toBe('doubao-lite');
    });
  });

  describe('isReady', () => {
    it('should return true when apiKey is configured', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should return false when apiKey is empty', () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new DoubaoAdapter(emptyConfig);
      expect(emptyAdapter.isReady()).toBe(false);
    });
  });

  describe('complete', () => {
    it('should return error when not ready', async () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new DoubaoAdapter(emptyConfig);
      
      const result = await emptyAdapter.complete([
        { role: 'user', content: 'Hello' }
      ]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should handle exception and return error result', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await adapter.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('token usage', () => {
    it('should start with zero usage', () => {
      const usage = adapter.getTokenUsage();
      expect(usage.totalTokens).toBe(0);
    });
  });
});
