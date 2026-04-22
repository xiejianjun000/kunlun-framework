import { MiniMaxAdapter } from '../../../../src/adapters/llm/MiniMaxAdapter';
import { LLMBaseError, AuthenticationError, RateLimitError } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('MiniMaxAdapter', () => {
  let adapter: MiniMaxAdapter;

  beforeEach(() => {
    adapter = new MiniMaxAdapter({
      apiKey: 'test-api-key',
      groupId: 'test-group-id',
      model: 'abab6.5s-chat',
      baseUrl: 'https://api.minimax.chat/v1'
    });
  });

  describe('initialization', () => {
    it('should create instance with correct provider name', () => {
      expect(adapter.provider).toBe('minimax');
    });

    it('should be ready after initialization with API key and group id', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should have correct default configuration', () => {
      expect(adapter.config.apiKey).toBe('test-api-key');
      expect(adapter.config.model).toBe('abab6.5s-chat');
      expect(adapter.config.baseUrl).toBe('https://api.minimax.chat/v1');
    });

    it('should use default base URL if not provided', () => {
      const newAdapter = new MiniMaxAdapter({
        apiKey: 'test',
        groupId: 'gid',
        model: 'abab6.5s-chat'
      });
      expect(newAdapter.config.baseUrl).toBe('https://api.minimax.chat/v1');
    });

    it('should not be ready when initialized without API key', () => {
      const emptyAdapter = new MiniMaxAdapter();
      expect(emptyAdapter.isReady()).toBe(false);
    });

    it('should not be ready when initialized without group id', () => {
      const incompleteAdapter = new MiniMaxAdapter({
        apiKey: 'test',
        model: 'abab6.5s-chat'
      } as any); // 强制类型转换测试缺少 groupId 的情况
      expect(incompleteAdapter.isReady()).toBe(false);
    });
  });

  describe('createChatCompletion', () => {
    it('should throw error when not initialized', async () => {
      const emptyAdapter = new MiniMaxAdapter();
      await expect(
        emptyAdapter.createChatCompletion([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(LLMBaseError);
    });

    it('should use fetchWithRetry for API calls', async () => {
      const mockFetchWithRetry = jest.spyOn(adapter as any, 'fetchWithRetry');
      mockFetchWithRetry.mockResolvedValue({
        content: 'Hello, world!',
        model: 'abab6.5s-chat',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 100
      });

      await adapter.createChatCompletion([{ role: 'user', content: 'Hello' }]);
      expect(mockFetchWithRetry).toHaveBeenCalled();
    });
  });

  describe('createChatCompletionStream', () => {
    it('should throw error when not initialized', async () => {
      const emptyAdapter = new MiniMaxAdapter();
      const stream = emptyAdapter.createChatCompletionStream([
        { role: 'user', content: 'Hello' }
      ]);
      await expect(stream.next()).rejects.toThrow(LLMBaseError);
    });
  });

  describe('cost calculation', () => {
    it('should calculate cost based on usage', () => {
      const cost = adapter.calculateCost({
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000
      });
      // Default pricing: 0.015 per 1k tokens for both
      expect(cost).toBeCloseTo(0.03);
    });

    it('should accumulate usage correctly', () => {
      adapter['accumulateUsage']({
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300
      });

      const total = adapter.getTotalUsage();
      expect(total.promptTokens).toBe(100);
      expect(total.completionTokens).toBe(200);
      expect(total.totalCost).toBeGreaterThan(0);
    });

    it('should reset usage correctly', () => {
      adapter['accumulateUsage']({
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300
      });
      adapter.resetUsage();

      const total = adapter.getTotalUsage();
      expect(total.promptTokens).toBe(0);
      expect(total.completionTokens).toBe(0);
      expect(total.totalCost).toBe(0);
    });
  });

  describe('checkAvailability', () => {
    it('should return false when not initialized', async () => {
      const emptyAdapter = new MiniMaxAdapter();
      expect(await emptyAdapter.checkAvailability()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle API errors correctly', () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response;

      const mockResponseBody = {
        error: {
          message: 'Invalid API key',
          code: 'auth_error'
        }
      };

      expect(() => {
        adapter['handleApiError'](mockResponse, mockResponseBody);
      }).toThrow(AuthenticationError);
    });

    it('should throw RateLimitError for 429 status', () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response;

      const mockResponseBody = { error: { message: 'Rate limit exceeded' } };

      expect(() => {
        adapter['handleApiError'](mockResponse, mockResponseBody);
      }).toThrow(RateLimitError);
    });
  });
});
