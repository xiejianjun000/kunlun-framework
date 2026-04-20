import { BaseLLMAdapter } from './BaseLLMAdapter';
import { ILLMAdapter, LLMMessage, LLMCompletionOptions, LLMCompletionResult, BaseLLMAdapterConfig } from './interfaces/ILLMAdapter';
/**
 * 字节豆包适配器
 * 支持豆包系列模型
 */
export declare class DoubaoAdapter extends BaseLLMAdapter implements ILLMAdapter {
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
export declare const DoubaoDefaultPricing: {
    'doubao-lite-4k': {
        prompt: number;
        completion: number;
    };
    'doubao-lite-32k': {
        prompt: number;
        completion: number;
    };
    'doubao-pro-4k': {
        prompt: number;
        completion: number;
    };
    'doubao-pro-32k': {
        prompt: number;
        completion: number;
    };
};
