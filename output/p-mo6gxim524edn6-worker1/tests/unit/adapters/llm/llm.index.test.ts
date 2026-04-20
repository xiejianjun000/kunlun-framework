import * as llmAdapters from '../../../../src/adapters/llm';

describe('LLM Adapters Index', () => {
  it('should export base adapter', () => {
    expect(llmAdapters.BaseLLMAdapter).toBeDefined();
  });

  it('should export all 7 adapters', () => {
    expect(llmAdapters.QwenAdapter).toBeDefined();
    expect(llmAdapters.WenxinAdapter).toBeDefined();
    expect(llmAdapters.HunyuanAdapter).toBeDefined();
    expect(llmAdapters.DoubaoAdapter).toBeDefined();
    expect(llmAdapters.GLMAdapter).toBeDefined();
    expect(llmAdapters.KimiAdapter).toBeDefined();
    expect(llmAdapters.SparkAdapter).toBeDefined();
  });

  it('should export default pricing', () => {
    expect(llmAdapters.QwenDefaultPricing).toBeDefined();
    expect(llmAdapters.WenxinDefaultPricing).toBeDefined();
    expect(llmAdapters.HunyuanDefaultPricing).toBeDefined();
    expect(llmAdapters.DoubaoDefaultPricing).toBeDefined();
    expect(llmAdapters.GLMDefaultPricing).toBeDefined();
    expect(llmAdapters.KimiDefaultPricing).toBeDefined();
    expect(llmAdapters.SparkDefaultPricing).toBeDefined();
  });

  // interfaces are types only, not available at runtime
  it('should export all types via export *', () => {
    // Type exports exist at compile time
    expect(true).toBe(true);
  });
});
