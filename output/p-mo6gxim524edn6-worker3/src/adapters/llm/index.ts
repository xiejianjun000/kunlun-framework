/**
 * LLM Adapter Collection
 *
 * Supported Providers (20 total):
 * - DeepSeek V4 (Flash/Pro) - DeepSeek AI (NEW) ⚡ 原生推理能力
 * - Qwen (Tongyi Qianwen) - Alibaba
 * - Wenxin (ERNIE) - Baidu
 * - Hunyuan - Tencent
 * - Doubao - ByteDance
 * - Spark - iFlytek
 * - GLM - ZhiPu AI
 * - Kimi - Moonshot AI
 * - Baichuan - Baichuan AI
 * - Yi - Lingyi Wanwu
 * - StepFun - StepFun AI
 * - MiniMax - MiniMax AI
 * - ZhiNao360 - 360 AI
 * - SenseNova - 商汤日日新
 * - Pangu - 华为云盘古
 * - Yuyan - 网易玉言
 * - Xiaoai - 小米小爱
 * - Hongshan - 出门问问红杉
 * - Xuanyuan - 度小满轩辕
 * - Tiangong - 昆仑万维天工
 */

export * from './interfaces/ILLMAdapter';
export { BaseLLMAdapter } from './BaseLLMAdapter';

export { DeepSeekAdapter, DEEPSEEK_V4_MODELS } from './DeepSeekAdapter';
export { QwenAdapter } from './QwenAdapter';
export { WenxinAdapter, WenxinConfig } from './WenxinAdapter';
export { HunyuanAdapter } from './HunyuanAdapter';
export { DoubaoAdapter } from './DoubaoAdapter';
export { SparkAdapter } from './SparkAdapter';
export { GLMAdapter } from './GLMAdapter';
export { KimiAdapter } from './KimiAdapter';
export { BaichuanAdapter } from './BaichuanAdapter';
export { YiAdapter } from './YiAdapter';
export { StepFunAdapter } from './StepFunAdapter';
export { MiniMaxAdapter, MiniMaxConfig } from './MiniMaxAdapter';
export { ZhiNao360Adapter } from './ZhiNao360Adapter';
export { SenseNovaAdapter } from './SenseNovaAdapter';
export { PanguAdapter, PanguConfig } from './PanguAdapter';
export { YuyanAdapter } from './YuyanAdapter';
export { XiaoaiAdapter } from './XiaoaiAdapter';
export { HongshanAdapter } from './HongshanAdapter';
export { XuanyuanAdapter } from './XuanyuanAdapter';
export { TiangongAdapter } from './TiangongAdapter';

import { LLMConfig } from './interfaces/ILLMAdapter';
import { DeepSeekAdapter } from './DeepSeekAdapter';
import { QwenAdapter } from './QwenAdapter';
import { WenxinAdapter, WenxinConfig } from './WenxinAdapter';
import { HunyuanAdapter } from './HunyuanAdapter';
import { DoubaoAdapter } from './DoubaoAdapter';
import { SparkAdapter } from './SparkAdapter';
import { GLMAdapter } from './GLMAdapter';
import { KimiAdapter } from './KimiAdapter';
import { BaichuanAdapter } from './BaichuanAdapter';
import { YiAdapter } from './YiAdapter';
import { StepFunAdapter } from './StepFunAdapter';
import { MiniMaxAdapter, MiniMaxConfig } from './MiniMaxAdapter';
import { ZhiNao360Adapter } from './ZhiNao360Adapter';
import { SenseNovaAdapter } from './SenseNovaAdapter';
import { PanguAdapter, PanguConfig } from './PanguAdapter';
import { YuyanAdapter } from './YuyanAdapter';
import { XiaoaiAdapter } from './XiaoaiAdapter';
import { HongshanAdapter } from './HongshanAdapter';
import { XuanyuanAdapter } from './XuanyuanAdapter';
import { TiangongAdapter } from './TiangongAdapter';

export type SupportedProvider =
  | 'deepseek'
  | 'qwen'
  | 'wenxin'
  | 'hunyuan'
  | 'doubao'
  | 'spark'
  | 'glm'
  | 'kimi'
  | 'baichuan'
  | 'yi'
  | 'stepfun'
  | 'minimax'
  | 'zhinao360'
  | 'sensenova'
  | 'pangu'
  | 'yuyan'
  | 'xiaoai'
  | 'hongshan'
  | 'xuanyuan'
  | 'tiangong';

export type LLMAdapterConfig = LLMConfig | WenxinConfig | MiniMaxConfig | PanguConfig;

/**
 * LLM Adapter Factory - Creates appropriate adapter based on provider name
 */
export class LLMAdapterFactory {
  static create(provider: 'deepseek', config: LLMConfig): DeepSeekAdapter;
  static create(provider: 'qwen', config: LLMConfig): QwenAdapter;
  static create(provider: 'wenxin', config: WenxinConfig): WenxinAdapter;
  static create(provider: 'hunyuan', config: LLMConfig): HunyuanAdapter;
  static create(provider: 'doubao', config: LLMConfig): DoubaoAdapter;
  static create(provider: 'spark', config: LLMConfig): SparkAdapter;
  static create(provider: 'glm', config: LLMConfig): GLMAdapter;
  static create(provider: 'kimi', config: LLMConfig): KimiAdapter;
  static create(provider: 'baichuan', config: LLMConfig): BaichuanAdapter;
  static create(provider: 'yi', config: LLMConfig): YiAdapter;
  static create(provider: 'stepfun', config: LLMConfig): StepFunAdapter;
  static create(provider: 'minimax', config: MiniMaxConfig): MiniMaxAdapter;
  static create(provider: 'zhinao360', config: LLMConfig): ZhiNao360Adapter;
  static create(provider: 'sensenova', config: LLMConfig): SenseNovaAdapter;
  static create(provider: 'pangu', config: PanguConfig): PanguAdapter;
  static create(provider: 'yuyan', config: LLMConfig): YuyanAdapter;
  static create(provider: 'xiaoai', config: LLMConfig): XiaoaiAdapter;
  static create(provider: 'hongshan', config: LLMConfig): HongshanAdapter;
  static create(provider: 'xuanyuan', config: LLMConfig): XuanyuanAdapter;
  static create(provider: 'tiangong', config: LLMConfig): TiangongAdapter;
  static create(provider: SupportedProvider, config: LLMAdapterConfig): any {
    switch (provider) {
      case 'deepseek':
        return new DeepSeekAdapter(config as LLMConfig);
      case 'qwen':
        return new QwenAdapter(config as LLMConfig);
      case 'wenxin':
        return new WenxinAdapter(config as WenxinConfig);
      case 'hunyuan':
        return new HunyuanAdapter(config as LLMConfig);
      case 'doubao':
        return new DoubaoAdapter(config as LLMConfig);
      case 'spark':
        return new SparkAdapter(config as LLMConfig);
      case 'glm':
        return new GLMAdapter(config as LLMConfig);
      case 'kimi':
        return new KimiAdapter(config as LLMConfig);
      case 'baichuan':
        return new BaichuanAdapter(config as LLMConfig);
      case 'yi':
        return new YiAdapter(config as LLMConfig);
      case 'stepfun':
        return new StepFunAdapter(config as LLMConfig);
      case 'minimax':
        return new MiniMaxAdapter(config as MiniMaxConfig);
      case 'zhinao360':
        return new ZhiNao360Adapter(config as LLMConfig);
      case 'sensenova':
        return new SenseNovaAdapter(config as LLMConfig);
      case 'pangu':
        return new PanguAdapter(config as PanguConfig);
      case 'yuyan':
        return new YuyanAdapter(config as LLMConfig);
      case 'xiaoai':
        return new XiaoaiAdapter(config as LLMConfig);
      case 'hongshan':
        return new HongshanAdapter(config as LLMConfig);
      case 'xuanyuan':
        return new XuanyuanAdapter(config as LLMConfig);
      case 'tiangong':
        return new TiangongAdapter(config as LLMConfig);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

/**
 * Provider-to-model mapping
 */
export const DEFAULT_MODELS: Record<SupportedProvider, string> = {
  deepseek: 'deepseek-v4-pro',
  qwen: 'qwen-turbo',
  wenxin: 'ernie-3.5',
  hunyuan: 'hunyuan-lite',
  doubao: 'doubao-pro-4k',
  spark: 'spark-v3.5',
  glm: 'glm-4',
  kimi: 'moonshot-v1-8k',
  baichuan: 'baichuan3-turbo',
  yi: 'yi-medium',
  stepfun: 'step-1.8',
  minimax: 'abab6.5s-chat',
  zhinao360: '360gpt-turbo',
  sensenova: 'sensenova-pro',
  pangu: 'pangu-70b',
  yuyan: 'yuyan-v2-34b',
  xiaoai: 'xiaoai-pro',
  hongshan: 'hongshan-pro',
  xuanyuan: 'xuanyuan-finance',
  tiangong: 'tiangong-pro'
};

/**
 * Default pricing for each provider (cost per 1k tokens, CNY)
 */
export const DeepSeekDefaultPricing = { prompt: 0.001, completion: 0.002 }; // V4 Pro
export const QwenDefaultPricing = { prompt: 0.0008, completion: 0.0008 };
export const WenxinDefaultPricing = { prompt: 0.0008, completion: 0.0016 };
export const HunyuanDefaultPricing = { prompt: 0.0008, completion: 0.0008 };
export const DoubaoDefaultPricing = { prompt: 0.0003, completion: 0.0006 };
export const SparkDefaultPricing = { prompt: 0.0004, completion: 0.0004 };
export const GLMDefaultPricing = { prompt: 0.0005, completion: 0.0005 };
export const KimiDefaultPricing = { prompt: 0.0003, completion: 0.0003 };
export const BaichuanDefaultPricing = { prompt: 0.012, completion: 0.012 };
export const YiDefaultPricing = { prompt: 0.01, completion: 0.01 };
export const StepFunDefaultPricing = { prompt: 0.008, completion: 0.008 };
export const MiniMaxDefaultPricing = { prompt: 0.015, completion: 0.015 };
export const ZhiNao360DefaultPricing = { prompt: 0.008, completion: 0.008 };
export const SenseNovaDefaultPricing = { prompt: 0.01, completion: 0.01 };
export const PanguDefaultPricing = { prompt: 0.02, completion: 0.02 };
export const YuyanDefaultPricing = { prompt: 0.01, completion: 0.01 };
export const XiaoaiDefaultPricing = { prompt: 0.008, completion: 0.008 };
export const HongshanDefaultPricing = { prompt: 0.01, completion: 0.01 };
export const XuanyuanDefaultPricing = { prompt: 0.025, completion: 0.025 };
export const TiangongDefaultPricing = { prompt: 0.01, completion: 0.01 };
