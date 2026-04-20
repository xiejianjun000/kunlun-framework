/**
 * LLM Adapter Collection
 * 
 * Supported Providers:
 * - Qwen (Tongyi Qianwen) - Alibaba
 * - Wenxin (ERNIE) - Baidu
 * - Hunyuan - Tencent
 * - Doubao - ByteDance
 * - Spark - iFlytek
 * - GLM - ZhiPu AI
 * - Kimi - Moonshot AI
 */

export * from './interfaces/ILLMAdapter';
export { BaseLLMAdapter } from './BaseLLMAdapter';

export { QwenAdapter } from './QwenAdapter';
export { WenxinAdapter, WenxinConfig } from './WenxinAdapter';
export { HunyuanAdapter } from './HunyuanAdapter';
export { DoubaoAdapter } from './DoubaoAdapter';
export { SparkAdapter } from './SparkAdapter';
export { GLMAdapter } from './GLMAdapter';
export { KimiAdapter } from './KimiAdapter';

import { LLMConfig } from './interfaces/ILLMAdapter';
import { QwenAdapter } from './QwenAdapter';
import { WenxinAdapter, WenxinConfig } from './WenxinAdapter';
import { HunyuanAdapter } from './HunyuanAdapter';
import { DoubaoAdapter } from './DoubaoAdapter';
import { SparkAdapter } from './SparkAdapter';
import { GLMAdapter } from './GLMAdapter';
import { KimiAdapter } from './KimiAdapter';

export type SupportedProvider =
  | 'qwen'
  | 'wenxin'
  | 'hunyuan'
  | 'doubao'
  | 'spark'
  | 'glm'
  | 'kimi';

export type LLMAdapterConfig = LLMConfig | WenxinConfig;

/**
 * LLM Adapter Factory - Creates appropriate adapter based on provider name
 */
export class LLMAdapterFactory {
  static create(provider: 'qwen', config: LLMConfig): QwenAdapter;
  static create(provider: 'wenxin', config: WenxinConfig): WenxinAdapter;
  static create(provider: 'hunyuan', config: LLMConfig): HunyuanAdapter;
  static create(provider: 'doubao', config: LLMConfig): DoubaoAdapter;
  static create(provider: 'spark', config: LLMConfig): SparkAdapter;
  static create(provider: 'glm', config: LLMConfig): GLMAdapter;
  static create(provider: 'kimi', config: LLMConfig): KimiAdapter;
  static create(provider: SupportedProvider, config: LLMAdapterConfig): any {
    switch (provider) {
      case 'qwen':
        return new QwenAdapter(config);
      case 'wenxin':
        return new WenxinAdapter(config as WenxinConfig);
      case 'hunyuan':
        return new HunyuanAdapter(config);
      case 'doubao':
        return new DoubaoAdapter(config);
      case 'spark':
        return new SparkAdapter(config);
      case 'glm':
        return new GLMAdapter(config);
      case 'kimi':
        return new KimiAdapter(config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

/**
 * Provider-to-model mapping
 */
export const DEFAULT_MODELS: Record<SupportedProvider, string> = {
  qwen: 'qwen-turbo',
  wenxin: 'ernie-3.5',
  hunyuan: 'hunyuan-lite',
  doubao: 'doubao-pro-4k',
  spark: 'spark-v3.5',
  glm: 'glm-4',
  kimi: 'moonshot-v1-8k'
};

/**
 * Default pricing for each provider (cost per 1k tokens)
 */
export const QwenDefaultPricing = { prompt: 0.0008, completion: 0.0008 };
export const WenxinDefaultPricing = { prompt: 0.0008, completion: 0.0016 };
export const HunyuanDefaultPricing = { prompt: 0.0008, completion: 0.0008 };
export const DoubaoDefaultPricing = { prompt: 0.0003, completion: 0.0006 };
export const SparkDefaultPricing = { prompt: 0.0004, completion: 0.0004 };
export const GLMDefaultPricing = { prompt: 0.0005, completion: 0.0005 };
export const KimiDefaultPricing = { prompt: 0.0003, completion: 0.0003 };
