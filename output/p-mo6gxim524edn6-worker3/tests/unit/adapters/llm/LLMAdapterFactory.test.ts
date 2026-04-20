import { LLMAdapterFactory, DEFAULT_MODELS } from '../../../../src/adapters/llm';
import { QwenAdapter } from '../../../../src/adapters/llm/QwenAdapter';
import { WenxinAdapter } from '../../../../src/adapters/llm/WenxinAdapter';
import { HunyuanAdapter } from '../../../../src/adapters/llm/HunyuanAdapter';
import { DoubaoAdapter } from '../../../../src/adapters/llm/DoubaoAdapter';
import { SparkAdapter } from '../../../../src/adapters/llm/SparkAdapter';
import { GLMAdapter } from '../../../../src/adapters/llm/GLMAdapter';
import { KimiAdapter } from '../../../../src/adapters/llm/KimiAdapter';

describe('LLMAdapterFactory', () => {
  describe('create adapter by provider', () => {
    it('should create QwenAdapter for "qwen"', () => {
      const adapter = LLMAdapterFactory.create('qwen', {
        apiKey: 'test',
        model: 'qwen-turbo'
      });
      expect(adapter).toBeInstanceOf(QwenAdapter);
      expect(adapter.provider).toBe('qwen');
      expect(adapter.isReady()).toBe(true);
    });

    it('should create WenxinAdapter for "wenxin"', () => {
      const adapter = LLMAdapterFactory.create('wenxin', {
        apiKey: 'test',
        clientId: 'cid',
        clientSecret: 'csc',
        model: 'ernie-3.5'
      });
      expect(adapter).toBeInstanceOf(WenxinAdapter);
      expect(adapter.provider).toBe('wenxin');
      expect(adapter.isReady()).toBe(true);
    });

    it('should create HunyuanAdapter for "hunyuan"', () => {
      const adapter = LLMAdapterFactory.create('hunyuan', {
        apiKey: 'test',
        model: 'hunyuan-lite'
      });
      expect(adapter).toBeInstanceOf(HunyuanAdapter);
      expect(adapter.provider).toBe('hunyuan');
    });

    it('should create DoubaoAdapter for "doubao"', () => {
      const adapter = LLMAdapterFactory.create('doubao', {
        apiKey: 'test',
        model: 'doubao-pro-4k'
      });
      expect(adapter).toBeInstanceOf(DoubaoAdapter);
      expect(adapter.provider).toBe('doubao');
    });

    it('should create SparkAdapter for "spark"', () => {
      const adapter = LLMAdapterFactory.create('spark', {
        apiKey: 'test',
        model: 'spark-v3.5'
      });
      expect(adapter).toBeInstanceOf(SparkAdapter);
      expect(adapter.provider).toBe('spark');
    });

    it('should create GLMAdapter for "glm"', () => {
      const adapter = LLMAdapterFactory.create('glm', {
        apiKey: 'test',
        model: 'glm-4'
      });
      expect(adapter).toBeInstanceOf(GLMAdapter);
      expect(adapter.provider).toBe('glm');
    });

    it('should create KimiAdapter for "kimi"', () => {
      const adapter = LLMAdapterFactory.create('kimi', {
        apiKey: 'test',
        model: 'moonshot-v1-8k'
      });
      expect(adapter).toBeInstanceOf(KimiAdapter);
      expect(adapter.provider).toBe('kimi');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        (LLMAdapterFactory as any).create('unknown', {
          apiKey: 'test',
          model: 'test'
        });
      }).toThrow('Unsupported provider: unknown');
    });
  });

  describe('DEFAULT_MODELS', () => {
    it('should contain all 7 providers with default models', () => {
      expect(DEFAULT_MODELS.qwen).toBeDefined();
      expect(DEFAULT_MODELS.wenxin).toBeDefined();
      expect(DEFAULT_MODELS.hunyuan).toBeDefined();
      expect(DEFAULT_MODELS.doubao).toBeDefined();
      expect(DEFAULT_MODELS.spark).toBeDefined();
      expect(DEFAULT_MODELS.glm).toBeDefined();
      expect(DEFAULT_MODELS.kimi).toBeDefined();
    });
  });
});
