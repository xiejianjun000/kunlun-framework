import { LLMAdapterFactory, DEFAULT_MODELS } from '../../../../src/adapters/llm';
import { QwenAdapter } from '../../../../src/adapters/llm/QwenAdapter';
import { WenxinAdapter } from '../../../../src/adapters/llm/WenxinAdapter';
import { HunyuanAdapter } from '../../../../src/adapters/llm/HunyuanAdapter';
import { DoubaoAdapter } from '../../../../src/adapters/llm/DoubaoAdapter';
import { SparkAdapter } from '../../../../src/adapters/llm/SparkAdapter';
import { GLMAdapter } from '../../../../src/adapters/llm/GLMAdapter';
import { KimiAdapter } from '../../../../src/adapters/llm/KimiAdapter';
import { BaichuanAdapter } from '../../../../src/adapters/llm/BaichuanAdapter';
import { YiAdapter } from '../../../../src/adapters/llm/YiAdapter';
import { StepFunAdapter } from '../../../../src/adapters/llm/StepFunAdapter';
import { MiniMaxAdapter } from '../../../../src/adapters/llm/MiniMaxAdapter';
import { ZhiNao360Adapter } from '../../../../src/adapters/llm/ZhiNao360Adapter';

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

    it('should create BaichuanAdapter for "baichuan"', () => {
      const adapter = LLMAdapterFactory.create('baichuan', {
        apiKey: 'test',
        model: 'baichuan3-turbo'
      });
      expect(adapter).toBeInstanceOf(BaichuanAdapter);
      expect(adapter.provider).toBe('baichuan');
      expect(adapter.isReady()).toBe(true);
    });

    it('should create YiAdapter for "yi"', () => {
      const adapter = LLMAdapterFactory.create('yi', {
        apiKey: 'test',
        model: 'yi-medium'
      });
      expect(adapter).toBeInstanceOf(YiAdapter);
      expect(adapter.provider).toBe('yi');
      expect(adapter.isReady()).toBe(true);
    });

    it('should create StepFunAdapter for "stepfun"', () => {
      const adapter = LLMAdapterFactory.create('stepfun', {
        apiKey: 'test',
        model: 'step-1.8'
      });
      expect(adapter).toBeInstanceOf(StepFunAdapter);
      expect(adapter.provider).toBe('stepfun');
      expect(adapter.isReady()).toBe(true);
    });

    it('should create MiniMaxAdapter for "minimax"', () => {
      const adapter = LLMAdapterFactory.create('minimax', {
        apiKey: 'test',
        groupId: 'test-group-id',
        model: 'abab6.5s-chat'
      });
      expect(adapter).toBeInstanceOf(MiniMaxAdapter);
      expect(adapter.provider).toBe('minimax');
      expect(adapter.isReady()).toBe(true);
    });

    it('should create ZhiNao360Adapter for "zhinao360"', () => {
      const adapter = LLMAdapterFactory.create('zhinao360', {
        apiKey: 'test',
        model: '360gpt-turbo'
      });
      expect(adapter).toBeInstanceOf(ZhiNao360Adapter);
      expect(adapter.provider).toBe('zhinao360');
      expect(adapter.isReady()).toBe(true);
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
    it('should contain all 12 providers with default models', () => {
      // Original 7 providers
      expect(DEFAULT_MODELS.qwen).toBeDefined();
      expect(DEFAULT_MODELS.wenxin).toBeDefined();
      expect(DEFAULT_MODELS.hunyuan).toBeDefined();
      expect(DEFAULT_MODELS.doubao).toBeDefined();
      expect(DEFAULT_MODELS.spark).toBeDefined();
      expect(DEFAULT_MODELS.glm).toBeDefined();
      expect(DEFAULT_MODELS.kimi).toBeDefined();

      // New 5 providers
      expect(DEFAULT_MODELS.baichuan).toBeDefined();
      expect(DEFAULT_MODELS.yi).toBeDefined();
      expect(DEFAULT_MODELS.stepfun).toBeDefined();
      expect(DEFAULT_MODELS.minimax).toBeDefined();
      expect(DEFAULT_MODELS.zhinao360).toBeDefined();
    });

    it('should have correct default model names for new providers', () => {
      expect(DEFAULT_MODELS.baichuan).toBe('baichuan3-turbo');
      expect(DEFAULT_MODELS.yi).toBe('yi-medium');
      expect(DEFAULT_MODELS.stepfun).toBe('step-1.8');
      expect(DEFAULT_MODELS.minimax).toBe('abab6.5s-chat');
      expect(DEFAULT_MODELS.zhinao360).toBe('360gpt-turbo');
    });
  });
});
