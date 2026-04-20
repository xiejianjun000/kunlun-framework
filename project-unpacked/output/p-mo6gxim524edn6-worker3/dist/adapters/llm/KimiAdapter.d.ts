import { BaseLLMAdapter } from './BaseLLMAdapter';
import { ILLMAdapter, LLMMessage, LLMCompletionOptions, LLMCompletionResult, BaseLLMAdapterConfig } from './interfaces/ILLMAdapter';
/**
 * 月之暗面Kimi适配器
 * 支持 Kimi 大模型系列
 */
export declare class KimiAdapter extends BaseLLMAdapter implements ILLMAdapter {
    readonly name: string;
    readonly version: string;
    readonly model: string;
    private defaultEndpoint;
    constructor(config: BaseLLMAdapterConfig);
    /**
     * 完成文本生成
     */
    complete(messages: LLMMessage[], options?: Partial<LLMCompletionOptions>): Promise<LLMCompletionResult>;
    /**
     * 流式生成
     */
    completeStream(messages: LLMMessage[], options?: Partial<LLMCompletionOptions>): AsyncGenerator<string, void, unknown>;
}
/**
 * 默认价格（2024年价格，单位：美元/1K tokens）
 */
export declare const KimiDefaultPricing: {
    'moonshot-v1-8k': {
        prompt: number;
        completion: number;
    };
    'moonshot-v1-32k': {
        prompt: number;
        completion: number;
    };
    'moonshot-v1-128k': {
        prompt: number;
        completion: number;
    };
};
