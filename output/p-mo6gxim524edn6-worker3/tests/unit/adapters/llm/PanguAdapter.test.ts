import { PanguAdapter } from '../../../../src/adapters/llm/PanguAdapter';
import { LLMBaseError, AuthenticationError, RateLimitError } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('PanguAdapter', () => {
  let adapter: PanguAdapter;

  beforeEach(() => {
    adapter = new PanguAdapter({
      apiKey: 'test-api-key',
      projectId: 'test-project-id',
      region: 'cn-north-4',
      model: 'pangu-70b',
      baseUrl: 'https://pangu.cn-north-4.myhuaweicloud.com'
    });
  });

  describe('initialization', () => {
    it('should create instance with correct provider name', () => {
      expect(adapter.provider).toBe('pangu');
    });

    it('should be ready after initialization with API key and project id', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should have correct default configuration', () => {
      expect(adapter.config.apiKey).toBe('test-api-key');
      expect(adapter.config.model).toBe('pangu-70b');
      expect(adapter.config.baseUrl).toBe('https://pangu.cn-north-4.myhuaweicloud.com');
    });

    it('should use default base URL if not provided', () => {
      const newAdapter = new PanguAdapter({
        apiKey: 'test',
        projectId: 'pid',
        model: 'pangu-70b'
      });
      expect(newAdapter.config.baseUrl).toBe('https://pangu.cn-north-4.myhuaweicloud.com');
    });

    it('should not be ready when initialized without API key', () => {
      const emptyAdapter = new PanguAdapter();
      expect(emptyAdapter.isReady()).toBe(false);
    });

    it('should not be ready when initialized without project id', () => {
      const incompleteAdapter = new PanguAdapter({
        apiKey: 'test',
        model: 'pangu-70b'
      } as any);
      expect(incompleteAdapter.isReady()).toBe(false);
    });
  });

  describe('createChatCompletion', () => {
    it('should throw error when not initialized', async () => {
      const emptyAdapter = new PanguAdapter();
      await expect(
        emptyAdapter.createChatCompletion([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(LLMBaseError);
    });

    it('should use fetchWithRetry for API calls', async () => {
      const mockFetchWithRetry = jest.spyOn(adapter as any, 'fetchWithRetry');
      mockFetchWithRetry.mockResolvedValue({
        content: 'Hello, world!',
        model: 'pangu-70b',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 100
      });

      await adapter.createChatCompletion([{ role: 'user', content: 'Hello' }]);
      expect(mockFetchWithRetry).toHaveBeenCalled();
    });
  });

  describe('createChatCompletionStream', () => {
    it('should throw error when not initialized', async () => {
      const emptyAdapter = new PanguAdapter();
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
      // Default pricing: 0.02 per 1k tokens for both
      expect(cost).toBeCloseTo(0.04);
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
      const emptyAdapter = new PanguAdapter();
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
        error_code: 'AUTH_ERROR',
        error_msg: 'Invalid authentication'
      };

      expect(() => {
        adapter['handleApiError'](mockResponse, mockResponseBody);
      }).toThrow(AuthenticationError);
    });

    it('should throw Error for 429 status', () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response;

      const mockResponseBody = { error: { message: 'Rate limit exceeded' } };

      expect(() => {
        adapter['handleApiError'](mockResponse, mockResponseBody);
      }).toThrow();
    });
  });
});
