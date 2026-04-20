import { BaseLLMAdapter } from './BaseLLMAdapter';
import { ILLMAdapter, LLMMessage, LLMCompletionOptions, LLMCompletionResult, BaseLLMAdapterConfig } from './interfaces/ILLMAdapter';
/**
 * 智谱GLM适配器
 * 支持 GLM-4、GLM-3 系列模型
 */
export declare class GLMAdapter extends BaseLLMAdapter implements ILLMAdapter {
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
export declare const GLMDefaultPricing: {
    'glm-4': {
        prompt: number;
        completion: number;
    };
    'glm-3-turbo': {
        prompt: number;
        completion: number;
    };
};
