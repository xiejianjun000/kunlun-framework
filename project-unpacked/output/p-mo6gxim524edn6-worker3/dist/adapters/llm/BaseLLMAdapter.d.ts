import { ILLMAdapter, LLMMessage, LLMCompletionOptions, LLMCompletionResult, TokenUsage, BaseLLMAdapterConfig } from './interfaces/ILLMAdapter';
/**
 * 基础LLM适配器抽象类
 * 提供通用的token统计、成本计算和错误处理功能
 */
export declare abstract class BaseLLMAdapter implements ILLMAdapter {
    abstract readonly name: string;
    abstract readonly version: string;
    abstract readonly model: string;
    protected endpoint?: string;
    protected apiKey: string;
    protected timeout: number;
    protected maxRetries: number;
    protected costPer1kPrompt: number;
    protected costPer1kCompletion: number;
    private totalPromptTokens;
    private totalCompletionTokens;
    constructor(config: BaseLLMAdapterConfig);
    /**
     * 检查适配器是否就绪
     */
    isReady(): boolean;
    /**
     * 抽象方法：执行完成请求
     */
    abstract complete(messages: LLMMessage[], options?: Partial<LLMCompletionOptions>): Promise<LLMCompletionResult>;
    /**
     * 抽象方法：执行流式完成请求
     */
    abstract completeStream(messages: LLMMessage[], options?: Partial<LLMCompletionOptions>): AsyncGenerator<string, void, unknown>;
    /**
     * 获取当前token使用统计
     */
    getTokenUsage(): TokenUsage;
    /**
     * 重置统计
     */
    resetTokenUsage(): void;
    /**
     * 计算成本
     */
    calculateCost(promptTokens: number, completionTokens: number): number;
    /**
     * 累计token使用
     */
    protected accumulateUsage(promptTokens: number, completionTokens: number): void;
    /**
     * 带重试的请求
     */
    protected fetchWithRetry(url: string, options: RequestInit, retries?: number): Promise<Response>;
    /**
     * 处理错误结果
     */
    protected handleError(error: unknown): LLMCompletionResult;
}
