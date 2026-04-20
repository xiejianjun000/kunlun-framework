import { HunyuanAdapter } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/HunyuanAdapter';
import type { BaseLLMAdapterConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/interfaces/ILLMAdapter';

// Mock fetch
global.fetch = jest.fn();

describe('HunyuanAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'hunyuan-standard'
  };

  let adapter: HunyuanAdapter;

  beforeEach(() => {
    adapter = new HunyuanAdapter(config);
    (fetch as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('should create HunyuanAdapter with correct configuration', () => {
      expect(adapter).toBeInstanceOf(HunyuanAdapter);
      expect(adapter.name).toBe('HunyuanAdapter');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.model).toBe('hunyuan-standard');
    });
  });

  describe('isReady', () => {
    it('should return true when apiKey is configured', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should return false when apiKey is empty', () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new HunyuanAdapter(emptyConfig);
      expect(emptyAdapter.isReady()).toBe(false);
    });
  });

  describe('complete', () => {
    it('should return error when not ready', async () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new HunyuanAdapter(emptyConfig);
      
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
