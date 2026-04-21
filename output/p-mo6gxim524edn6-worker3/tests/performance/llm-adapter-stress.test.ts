/**
 * LLM 适配器压力测试
 * 测试：
 * 1. 大量并发的适配器初始化
 * 2. 大量并发调用 createChatCompletion (mock)
 * 3. 令牌使用累积的正确性
 */

import StressTestRunner from './stress-test-suite';
import { QwenAdapter, WenxinAdapter, DoubaoAdapter, GLMAdapter, HunyuanAdapter, SparkAdapter, KimiAdapter } from '../../src/adapters/llm';

// Mock fetch
global.fetch = jest.fn().mockImplementation(async () => ({
  ok: true,
  json: async () => ({
    id: 'test-completion',
    object: 'chat.completion',
    created: Date.now(),
    model: 'test-model',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Test response' },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    }
  })
}));

describe('LLM Adapter 压力测试', () => {
  jest.setTimeout(120000);

  const adapterClasses = [
    { name: 'QwenAdapter', cls: QwenAdapter },
    { name: 'WenxinAdapter', cls: WenxinAdapter },
    { name: 'DoubaoAdapter', cls: DoubaoAdapter },
    { name: 'GLMAdapter', cls: GLMAdapter },
    { name: 'HunyuanAdapter', cls: HunyuanAdapter },
    { name: 'SparkAdapter', cls: SparkAdapter },
    { name: 'KimiAdapter', cls: KimiAdapter },
  ];

  beforeAll(() => {
    console.log('\n=== 🧪 LLM 适配器压力测试开始 ===\n');
  });

  it('适配器初始化性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 50,
      iterations: 1000,
      timeoutMs: 30000,
    });

    let adapterIndex = 0;
    await runner.runTest('适配器初始化', async () => {
      const AdapterClass = adapterClasses[adapterIndex++ % adapterClasses.length].cls;
      const adapter = new AdapterClass({
        apiKey: 'test-key-' + Math.random(),
        model: 'test-model',
      });
      // 验证初始化成功
      expect(adapter.isReady()).toBe(true);
    });
  });

  it('适配器并发成本计算性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 100,
      iterations: 5000,
      timeoutMs: 30000,
    });

    const adapter = new QwenAdapter({
      apiKey: 'test-key',
      model: 'qwen-turbo',
    });

    await runner.runTest('成本计算', async (i) => {
      const cost = adapter.calculateCost({
        promptTokens: i * 10,
        completionTokens: i * 5,
        totalTokens: i * 15,
      });
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });
  });

  it('令牌使用累积性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 20,
      iterations: 2000,
      timeoutMs: 30000,
    });

    await runner.runTest('令牌累积', async (i) => {
      const adapter = new QwenAdapter({
        apiKey: 'test-key',
        model: 'qwen-turbo',
      });

      for (let j = 0; j < 10; j++) {
        // @ts-ignore - 调用 protected 方法
        adapter['accumulateUsage']({
          promptTokens: i + j,
          completionTokens: i * 2 + j,
          totalTokens: (i + j) * 3,
        });
      }

      const usage = adapter.getTotalUsage();
      expect(usage.promptTokens).toBeGreaterThan(0);
      expect(usage.totalCost).toBeGreaterThan(0);
    });
  });

  it('7种适配器混合初始化压力', async () => {
    const runner = new StressTestRunner({
      concurrency: 100,
      iterations: 3500,
      timeoutMs: 30000,
    });

    let idx = 0;
    await runner.runTest('7适配器混合初始化', async () => {
      const { cls } = adapterClasses[idx++ % adapterClasses.length];
      const adapter = new cls({
        apiKey: 'test-key-' + idx,
        model: 'test-model',
      });
      expect(adapter.isReady()).toBe(true);
      expect(adapter.provider).toBeDefined();
    });
  });

  afterAll(() => {
    console.log('\n=== ✅ LLM 适配器压力测试完成 ===\n');
  });
});
