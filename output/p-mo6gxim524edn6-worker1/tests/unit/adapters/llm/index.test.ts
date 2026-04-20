import {
  BaseLLMAdapter,
  QwenAdapter,
  WenxinAdapter,
  DoubaoAdapter,
  GLMAdapter,
  HunyuanAdapter,
  KimiAdapter,
  SparkAdapter,
  QwenDefaultPricing
} from '../../../../../../output/p-mo6gxim524edn6-worker3/src/adapters/llm/index';

describe('LLM Adapters 模块导出', () => {
  it('应该正确导出 BaseLLMAdapter 抽象基类', () => {
    expect(BaseLLMAdapter).toBeDefined();
    expect(typeof BaseLLMAdapter).toBe('function');
  });

  it('应该正确导出 QwenAdapter (通义千问)', () => {
    expect(QwenAdapter).toBeDefined();
    expect(typeof QwenAdapter).toBe('function');
    expect(QwenDefaultPricing).toBeDefined();
  });

  it('应该正确导出 WenxinAdapter (文心一言)', () => {
    expect(WenxinAdapter).toBeDefined();
    expect(typeof WenxinAdapter).toBe('function');
  });

  it('应该正确导出 DoubaoAdapter (豆包)', () => {
    expect(DoubaoAdapter).toBeDefined();
    expect(typeof DoubaoAdapter).toBe('function');
  });

  it('应该正确导出 GLMAdapter (智谱清言)', () => {
    expect(GLMAdapter).toBeDefined();
    expect(typeof GLMAdapter).toBe('function');
  });

  it('应该正确导出 HunyuanAdapter (腾讯混元)', () => {
    expect(HunyuanAdapter).toBeDefined();
    expect(typeof HunyuanAdapter).toBe('function');
  });

  it('应该正确导出 KimiAdapter (月之暗面)', () => {
    expect(KimiAdapter).toBeDefined();
    expect(typeof KimiAdapter).toBe('function');
  });

  it('应该正确导出 SparkAdapter (讯飞星火)', () => {
    expect(SparkAdapter).toBeDefined();
    expect(typeof SparkAdapter).toBe('function');
  });

  it('应该正确导出 QwenDefaultPricing 定价配置', () => {
    expect(QwenDefaultPricing).toBeDefined();
    expect(QwenDefaultPricing['qwen-turbo']).toBeDefined();
    expect(QwenDefaultPricing['qwen-plus']).toBeDefined();
    expect(QwenDefaultPricing['qwen-72b-chat']).toBeDefined();
  });
});
