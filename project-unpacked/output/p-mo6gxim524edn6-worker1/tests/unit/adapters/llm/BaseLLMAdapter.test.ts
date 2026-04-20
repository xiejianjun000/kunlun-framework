import { BaseLLMAdapter } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/BaseLLMAdapter';
import type { BaseLLMAdapterConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/interfaces/ILLMAdapter';

// 创建一个具体子类用于测试抽象类
class TestAdapter extends BaseLLMAdapter {
  public readonly name = 'TestAdapter';
  public readonly version = '1.0.0';
  public readonly model = 'test-model';

  complete = jest.fn();
  completeStream = jest.fn();
}

describe('BaseLLMAdapter', () => {
  const validConfig: BaseLLMAdapterConfig = {
    apiKey: 'test-api-key',
    model: 'test-model',
    endpoint: 'https://api.test.com/v1',
    timeout: 30000,
    maxRetries: 3,
    costPer1kPrompt: 0.001,
    costPer1kCompletion: 0.002
  };

  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(validConfig);
  });

  describe('constructor', () => {
    it('should create adapter with all configuration', () => {
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.name).toBe('TestAdapter');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.model).toBe('test-model');
    });

    it('should use default values when optional config not provided', () => {
      const minimalConfig = {
        apiKey: 'test-key',
        model: 'test'
      };
      const minimalAdapter = new TestAdapter(minimalConfig);
      
      expect(minimalAdapter).toBeInstanceOf(BaseLLMAdapter);
      // 默认值生效
      expect(minimalAdapter.isReady()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('should return true when apiKey is configured', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should return false when apiKey is empty', () => {
      const emptyConfig = {
        apiKey: '',
        model: 'test'
      };
      const emptyAdapter = new TestAdapter(emptyConfig);
      expect(emptyAdapter.isReady()).toBe(false);
    });
  });

  describe('getTokenUsage', () => {
    it('should return zero usage for new adapter', () => {
      const usage = adapter.getTokenUsage();
      
      expect(usage.totalPromptTokens).toBe(0);
      expect(usage.totalCompletionTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
      expect(usage.estimatedCostUsd).toBe(0);
    });
  });

  describe('resetTokenUsage', () => {
    it('should reset all token counts to zero', () => {
      // @ts-ignore - accumulateUsage is protected
      adapter.accumulateUsage(100, 50);
      expect(adapter.getTokenUsage().totalTokens).toBe(150);
      
      adapter.resetTokenUsage();
      expect(adapter.getTokenUsage().totalTokens).toBe(0);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly with custom pricing', () => {
      // 1000 prompt tokens + 1000 completion tokens
      // pricing: 0.001 / 1K prompt + 0.002 / 1K completion
      const cost = adapter.calculateCost(1000, 1000);
      
      expect(cost).toBe(0.001 + 0.002);
    });

    it('should calculate cost correctly with partial tokens', () => {
      // 500 prompt tokens = 0.5 * 0.001 = 0.0005
      // 200 completion tokens = 0.2 * 0.002 = 0.0004
      // total = 0.0009
      const cost = adapter.calculateCost(500, 200);
      
      expect(cost).toBeCloseTo(0.0009);
    });

    it('should return zero for zero tokens', () => {
      const cost = adapter.calculateCost(0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('accumulateUsage', () => {
    it('should accumulate token counts correctly', () => {
      // @ts-ignore
      adapter.accumulateUsage(100, 50);
      expect(adapter.getTokenUsage().totalPromptTokens).toBe(100);
      expect(adapter.getTokenUsage().totalCompletionTokens).toBe(50);
      
      // @ts-ignore
      adapter.accumulateUsage(50, 25);
      expect(adapter.getTokenUsage().totalPromptTokens).toBe(150);
      expect(adapter.getTokenUsage().totalCompletionTokens).toBe(75);
    });
  });

  describe('handleError', () => {
    it('should return proper error result with Error object', () => {
      const error = new Error('Test error message');
      // @ts-ignore - handleError is protected
      const result = adapter.handleError(error);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error message');
      expect(result.text).toBe('');
      expect(result.totalTokens).toBe(0);
    });

    it('should handle unknown error types', () => {
      // @ts-ignore
      const result = adapter.handleError('string error');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });
  });
});
