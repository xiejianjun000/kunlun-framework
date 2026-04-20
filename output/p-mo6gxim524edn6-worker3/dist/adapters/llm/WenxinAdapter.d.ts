import { BaseLLMAdapter } from './BaseLLMAdapter';
import { ILLMAdapter, LLMMessage, LLMCompletionOptions, LLMCompletionResult, BaseLLMAdapterConfig } from './interfaces/ILLMAdapter';
/**
 * 百度文心一言适配器
 * 支持 ERNIE-Bot 系列模型
 */
export declare class WenxinAdapter extends BaseLLMAdapter implements ILLMAdapter {
    readonly name: string;
    readonly version: string;
    readonly model: string;
    private accessToken;
    private tokenExpiresAt;
    constructor(config: BaseLLMAdapterConfig & {
        clientId?: string;
        clientSecret?: string;
    });
    /**
     * 获取access token（带缓存）
     */
    private getAccessToken;
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
export declare const WenxinDefaultPricing: {
    'ernie-bot-4': {
        prompt: number;
        completion: number;
    };
    'ernie-bot': {
        prompt: number;
        completion: number;
    };
    'ernie-bot-turbo': {
        prompt: number;
        completion: number;
    };
};
