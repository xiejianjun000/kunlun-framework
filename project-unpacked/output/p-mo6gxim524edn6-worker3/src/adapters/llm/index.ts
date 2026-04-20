/**
 * @module adapters/llm
 * @description 国产大模型适配器集合
 */

// 导出接口
export * from './interfaces/ILLMAdapter';

// 导出基类
export { BaseLLMAdapter } from './BaseLLMAdapter';

// 导出各个适配器
export { QwenAdapter, QwenDefaultPricing } from './QwenAdapter';
export { WenxinAdapter, WenxinDefaultPricing } from './WenxinAdapter';
export { HunyuanAdapter, HunyuanDefaultPricing } from './HunyuanAdapter';
export { DoubaoAdapter, DoubaoDefaultPricing } from './DoubaoAdapter';
export { GLMAdapter, GLMDefaultPricing } from './GLMAdapter';
export { KimiAdapter, KimiDefaultPricing } from './KimiAdapter';
export { SparkAdapter, SparkDefaultPricing } from './SparkAdapter';
