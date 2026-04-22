import { StepFunAdapter } from '../../../../src/adapters/llm/StepFunAdapter';
import { LLMBaseError, AuthenticationError, RateLimitError } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

describe('StepFunAdapter', () => {
  let adapter: StepFunAdapter;

  beforeEach(() => {
    adapter = new StepFunAdapter({
      apiKey: 'test-api-key',
      model: 'step-1.8',
      baseUrl: 'https://api.stepfun.com/v1'
    });
  });

  describe('initialization', () => {
    it('should create instance with correct provider name', () => {
      expect(adapter.provider).toBe('stepfun');
    });

    it('should be ready after initialization', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should have correct default configuration', () => {
      expect(adapter.config.apiKey).toBe('test-api-key');
      expect(adapter.config.model).toBe('step-1.8');
      expect(adapter.config.baseUrl).toBe('https://api.stepfun.com/v1');
    });

    it('should use default base URL if not provided', () => {
      const newAdapter = new StepFunAdapter({
        apiKey: 'test',
        model: 'step-1.8'
      });
      expect(newAdapter.config.baseUrl).toBe('https://api.stepfun.com/v1');
    });

    it('should not be ready when initialized without API key', () => {
      const emptyAdapter = new StepFunAdapter();
      expect(emptyAdapter.isReady()).toBe(false);
    });
  });

  describe('createChatCompletion', () => {
    it('should throw error when not initialized', async () => {
      const emptyAdapter = new StepFunAdapter();
      await expect(
        emptyAdapter.createChatCompletion([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(LLMBaseError);
    });

    it('should use fetchWithRetry for API calls', async () => {
      const mockFetchWithRetry = jest.spyOn(adapter as any, 'fetchWithRetry');
      mockFetchWithRetry.mockResolvedValue({
        content: 'Hello, world!',
        model: 'step-1.8',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 100
      });

      await adapter.createChatCompletion([{ role: 'user', content: 'Hello' }]);
      expect(mockFetchWithRetry).toHaveBeenCalled();
    });
  });

  describe('createChatCompletionStream', () => {
    it('should throw error when not initialized', async () => {
      const emptyAdapter = new StepFunAdapter();
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
      // Default pricing: 0.008 per 1k tokens for both
      expect(cost).toBeCloseTo(0.016);
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
      const emptyAdapter = new StepFunAdapter();
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
