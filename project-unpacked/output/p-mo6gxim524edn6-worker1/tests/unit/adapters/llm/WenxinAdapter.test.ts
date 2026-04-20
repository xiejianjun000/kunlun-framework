import { WenxinAdapter } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/WenxinAdapter';
import type { BaseLLMAdapterConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/interfaces/ILLMAdapter';

// Mock fetch
global.fetch = jest.fn();

describe('WenxinAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'ernie-bot-4',
    endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat'
  };

  let adapter: WenxinAdapter;

  beforeEach(() => {
    adapter = new WenxinAdapter(config);
    (fetch as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('should create WenxinAdapter with correct configuration', () => {
      expect(adapter).toBeInstanceOf(WenxinAdapter);
      expect(adapter.name).toBe('WenxinAdapter');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.model).toBe('ernie-bot-4');
    });
  });

  describe('isReady', () => {
    it('should return true when apiKey is configured', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should return false when apiKey is empty', () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new WenxinAdapter(emptyConfig);
      expect(emptyAdapter.isReady()).toBe(false);
    });
  });

  describe('complete', () => {
    it('should return error when not ready', async () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new WenxinAdapter(emptyConfig);
      
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
      expect(result.error).toBeDefined();
    });
  });

  describe('token usage', () => {
    it('should start with zero usage', () => {
      const usage = adapter.getTokenUsage();
      expect(usage.totalTokens).toBe(0);
    });

    it('should reset token usage correctly', () => {
      adapter.resetTokenUsage();
      expect(adapter.getTokenUsage().totalTokens).toBe(0);
    });
  });
});
