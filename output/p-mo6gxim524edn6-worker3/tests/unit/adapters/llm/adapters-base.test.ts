import { QwenAdapter } from '../../../../src/adapters/llm/QwenAdapter';
import { WenxinAdapter } from '../../../../src/adapters/llm/WenxinAdapter';
import { HunyuanAdapter } from '../../../../src/adapters/llm/HunyuanAdapter';
import { DoubaoAdapter } from '../../../../src/adapters/llm/DoubaoAdapter';
import { SparkAdapter } from '../../../../src/adapters/llm/SparkAdapter';
import { GLMAdapter } from '../../../../src/adapters/llm/GLMAdapter';
import { KimiAdapter } from '../../../../src/adapters/llm/KimiAdapter';
import { BaseLLMAdapter } from '../../../../src/adapters/llm/BaseLLMAdapter';

describe('All 7 Chinese LLM Adapters', () => {
  describe('QwenAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new QwenAdapter({ apiKey: 'test', model: 'qwen-turbo' });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('qwen');
      expect(adapter.isReady()).toBe(true);
    });

    it('should throw error when call createChatCompletion without key', async () => {
      const adapter = new QwenAdapter();
      await expect(adapter.createChatCompletion([
        { role: 'user', content: 'hi' }
      ])).rejects.toThrow();
    });
  });

  describe('WenxinAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new WenxinAdapter({
        apiKey: 'test',
        clientId: 'cid',
        clientSecret: 'csc',
        model: 'ernie-3.5'
      });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('wenxin');
    });
  });

  describe('HunyuanAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new HunyuanAdapter({ apiKey: 'test', model: 'hunyuan-lite' });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('hunyuan');
    });
  });

  describe('DoubaoAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new DoubaoAdapter({ apiKey: 'test', model: 'doubao-pro-4k' });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('doubao');
    });
  });

  describe('SparkAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new SparkAdapter({ apiKey: 'test', model: 'spark-v3.5' });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('spark');
    });
  });

  describe('GLMAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new GLMAdapter({ apiKey: 'test', model: 'glm-4' });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('glm');
    });
  });

  describe('KimiAdapter', () => {
    it('should be instanceof BaseLLMAdapter', () => {
      const adapter = new KimiAdapter({ apiKey: 'test', model: 'moonshot-v1-8k' });
      expect(adapter).toBeInstanceOf(BaseLLMAdapter);
      expect(adapter.provider).toBe('kimi');
    });
  });

  describe('Common interface compliance', () => {
    const adapters = [
      { Constructor: QwenAdapter, config: { apiKey: 'k', model: 'm' }, name: 'QwenAdapter' },
      { Constructor: HunyuanAdapter, config: { apiKey: 'k', model: 'm' }, name: 'HunyuanAdapter' },
      { Constructor: DoubaoAdapter, config: { apiKey: 'k', model: 'm' }, name: 'DoubaoAdapter' },
      { Constructor: SparkAdapter, config: { apiKey: 'k', model: 'm' }, name: 'SparkAdapter' },
      { Constructor: GLMAdapter, config: { apiKey: 'k', model: 'm' }, name: 'GLMAdapter' },
      { Constructor: KimiAdapter, config: { apiKey: 'k', model: 'm' }, name: 'KimiAdapter' },
    ];

    adapters.forEach(({ Constructor, config, name }) => {
      it(`${name} implements createChatCompletion`, () => {
        const adapter = new Constructor(config);
        expect(typeof adapter.createChatCompletion).toBe('function');
      });

      it(`${name} implements createChatCompletionStream`, () => {
        const adapter = new Constructor(config);
        expect(typeof adapter.createChatCompletionStream).toBe('function');
      });

      it(`${name} has isReady method`, () => {
        const adapter = new Constructor(config);
        expect(typeof adapter.isReady).toBe('function');
      });

      it(`${name} has calculateCost method`, () => {
        const adapter = new Constructor(config);
        expect(typeof adapter.calculateCost).toBe('function');
      });

      it(`${name} has getTotalUsage method`, () => {
        const adapter = new Constructor(config);
        expect(typeof adapter.getTotalUsage).toBe('function');
      });
    });
  });
});
