import * as llmAdapters from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/index';

describe('LLM Adapters index', () => {
  it('should export all adapters', () => {
    expect(llmAdapters.BaseLLMAdapter).toBeDefined();
    expect(llmAdapters.QwenAdapter).toBeDefined();
    expect(llmAdapters.WenxinAdapter).toBeDefined();
    expect(llmAdapters.DoubaoAdapter).toBeDefined();
    expect(llmAdapters.GLMAdapter).toBeDefined();
    expect(llmAdapters.HunyuanAdapter).toBeDefined();
    expect(llmAdapters.KimiAdapter).toBeDefined();
    expect(llmAdapters.SparkAdapter).toBeDefined();
  });
});
