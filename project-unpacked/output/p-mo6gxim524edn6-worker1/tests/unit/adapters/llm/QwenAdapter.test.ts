import { QwenAdapter, QwenDefaultPricing } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/QwenAdapter';
import type { BaseLLMAdapterConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/interfaces/ILLMAdapter';

// Mock fetch
global.fetch = jest.fn();

describe('QwenAdapter', () => {
  const config: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'qwen-turbo',
    costPer1kPrompt: QwenDefaultPricing['qwen-turbo'].prompt,
    costPer1kCompletion: QwenDefaultPricing['qwen-turbo'].completion
  };

  let adapter: QwenAdapter;

  beforeEach(() => {
    adapter = new QwenAdapter(config);
    (fetch as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('should create QwenAdapter with correct configuration', () => {
      expect(adapter).toBeInstanceOf(QwenAdapter);
      expect(adapter.name).toBe('QwenAdapter');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.model).toBe('qwen-turbo');
    });

    it('should use custom endpoint when provided', () => {
      const customEndpoint = 'https://custom.api.com/gen';
      const customConfig = { ...config, endpoint: customEndpoint };
      const customAdapter = new QwenAdapter(customConfig);
      expect(customAdapter).toBeInstanceOf(QwenAdapter);
    });
  });

  describe('isReady', () => {
    it('should return true when apiKey is configured', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should return false when apiKey is empty', () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new QwenAdapter(emptyConfig);
      expect(emptyAdapter.isReady()).toBe(false);
    });
  });

  describe('complete', () => {
    it('should return error when not ready', async () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new QwenAdapter(emptyConfig);
      
      const result = await emptyAdapter.complete([
        { role: 'user', content: 'Hello' }
      ]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should complete request successfully with valid response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          output: { text: 'Hello, world!' },
          usage: { input_tokens: 10, output_tokens: 20 }
        })
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await adapter.complete([
        { role: 'user', content: 'Say hello' }
      ]);

      expect(result.success).toBe(true);
      expect(result.text).toBe('Hello, world!');
      expect(result.promptTokens).toBe(10);
      expect(result.completionTokens).toBe(20);
      expect(result.totalTokens).toBe(30);
      expect(fetch).toHaveBeenCalled();
    });

    it('should return error when API response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized')
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await adapter.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });

    it('should handle exception and return error result', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await adapter.complete([
        { role: 'user', content: 'Hello' }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should accumulate token usage after successful completion', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          output: { text: 'Test response' },
          usage: { input_tokens: 50, output_tokens: 25 }
        })
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await adapter.complete([{ role: 'user', content: 'Test' }]);
      const usage = adapter.getTokenUsage();

      expect(usage.totalPromptTokens).toBe(50);
      expect(usage.totalCompletionTokens).toBe(25);
      expect(usage.totalTokens).toBe(75);
    });
  });

  describe('completeStream', () => {
    it('should yield empty when not ready', async () => {
      const emptyConfig = { ...config, apiKey: '' };
      const emptyAdapter = new QwenAdapter(emptyConfig);
      const generator = emptyAdapter.completeStream([
        { role: 'user', content: 'Hello' }
      ]);

      const firstChunk = await generator.next();
      expect(firstChunk.done).toBe(false);
      expect(firstChunk.value).toBe('');
    });
  });

  describe('token usage', () => {
    it('should reset token usage correctly', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          output: { text: 'Test' },
          usage: { input_tokens: 10, output_tokens: 10 }
        })
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await adapter.complete([{ role: 'user', content: 'Test' }]);
      expect(adapter.getTokenUsage().totalTokens).toBe(20);

      adapter.resetTokenUsage();
      expect(adapter.getTokenUsage().totalTokens).toBe(0);
    });
  });
});
