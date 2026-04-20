import { BaseLLMAdapter } from './BaseLLMAdapter';
import { ILLMAdapter, LLMMessage, LLMCompletionOptions, LLMCompletionResult, BaseLLMAdapterConfig } from './interfaces/ILLMAdapter';
/**
 * 阿里通义千问适配器
 * 支持通义千问系列模型：qwen-turbo, qwen-plus, qwen-72b-chat
 */
export declare class QwenAdapter extends BaseLLMAdapter implements ILLMAdapter {
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
export declare const QwenDefaultPricing: {
    'qwen-turbo': {
        prompt: number;
        completion: number;
    };
    'qwen-plus': {
        prompt: number;
        completion: number;
    };
    'qwen-72b-chat': {
        prompt: number;
        completion: number;
    };
};
