import { BaseLLMAdapter } from '../../../../src/adapters/llm/BaseLLMAdapter';
import { LLMMessage, LLMResponse, LLMTokenUsage } from '../../../../src/adapters/llm/interfaces/ILLMAdapter';

class TestAdapter extends BaseLLMAdapter {
  public readonly provider = 'test';

  async createChatCompletion(): Promise<LLMResponse> {
    return {
      content: 'Hello',
      model: 'test-model',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      latencyMs: 100
    };
  }

  async* createChatCompletionStream() {
    yield { content: 'Hello', isFirst: true, isLast: false };
  }
}

describe('BaseLLMAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter({
      apiKey: 'test-key',
      model: 'test-model',
      costPer1kPrompt: 0.01,
      costPer1kCompletion: 0.02
    });
  });

  describe('initialization', () => {
    it('should be ready after initialization', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should have correct config', () => {
      expect(adapter.config.model).toBe('test-model');
      expect(adapter.config.apiKey).toBe('test-key');
    });

    it('should have provider name', () => {
      expect(adapter.provider).toBe('test');
    });
  });

  describe('usage tracking', () => {
    it('should start with zero usage', () => {
      const usage = adapter.getTotalUsage();
      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
      expect(usage.totalCost).toBe(0);
    });

    it('should accumulate usage correctly', () => {
      const usage1: LLMTokenUsage = { promptTokens: 100, completionTokens: 200, totalTokens: 300 };
      const usage2: LLMTokenUsage = { promptTokens: 200, completionTokens: 300, totalTokens: 500 };

      adapter['accumulateUsage'](usage1);
      adapter['accumulateUsage'](usage2);

      const total = adapter.getTotalUsage();
      expect(total.promptTokens).toBe(300);
      expect(total.completionTokens).toBe(500);
      expect(total.totalTokens).toBe(800);
    });

    it('should calculate cost correctly', () => {
      const cost = adapter.calculateCost({
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000
      });
      expect(cost).toBeCloseTo(0.03); // 0.01 + 0.02
    });

    it('should reset usage', () => {
      adapter['accumulateUsage']({ promptTokens: 100, completionTokens: 200, totalTokens: 300 });
      adapter.resetUsage();

      const total = adapter.getTotalUsage();
      expect(total.totalTokens).toBe(0);
      expect(total.totalCost).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await adapter['fetchWithRetry'](operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second attempt', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await adapter['fetchWithRetry'](operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('check availability', () => {
    it('should return false when not initialized', async () => {
      const emptyAdapter = new TestAdapter();
      expect(await emptyAdapter.checkAvailability()).toBe(false);
    });
  });
});
