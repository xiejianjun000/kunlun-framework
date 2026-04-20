/**
 * LLM完成选项
 */
export interface LLMCompletionOptions {
    /**
     * 温度参数 0-1
     */
    temperature?: number;
    /**
     * 最大生成token数
     */
    maxTokens?: number;
    /**
     * Top-p采样
     */
    topP?: number;
    /**
     * Top-k采样
     */
    topK?: number;
    /**
     * 频率惩罚
     */
    frequencyPenalty?: number;
    /**
     * 存在惩罚
     */
    presencePenalty?: number;
    /**
     * 停止词
     */
    stop?: string[];
    /**
     * 是否流式返回
     */
    stream?: boolean;
    /**
     * 系统提示词
     */
    systemPrompt?: string;
}
/**
 * LLM完成消息
 */
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
/**
 * LLM完成结果
 */
export interface LLMCompletionResult {
    /**
     * 生成的文本
     */
    text: string;
    /**
     * 提示token数
     */
    promptTokens: number;
    /**
     * 完成token数
     */
    completionTokens: number;
    /**
     * 总token数
     */
    totalTokens: number;
    /**
     * 是否成功
     */
    success: boolean;
    /**
     * 错误信息（如果失败）
     */
    error?: string;
    /**
     * 模型返回的原始数据
     */
    rawResponse?: unknown;
}
/**
 * Token成本统计
 */
export interface TokenUsage {
    /**
     * 总prompt tokens
     */
    totalPromptTokens: number;
    /**
     * 总completion tokens
     */
    totalCompletionTokens: number;
    /**
     * 总tokens
     */
    totalTokens: number;
    /**
     * 估算成本（美元）
     */
    estimatedCostUsd: number;
}
/**
 * LLM适配器接口
 * 所有国产大模型适配器必须实现此接口
 */
export interface ILLMAdapter {
    /**
     * 适配器名称
     */
    readonly name: string;
    /**
     * 模型版本
     */
    readonly version: string;
    /**
     * 模型标识
     */
    readonly model: string;
    /**
     * 检查适配器是否就绪
     */
    isReady(): boolean;
    /**
     * 完成文本生成
     * @param messages 对话消息
     * @param options 生成选项
     */
    complete(messages: LLMMessage[], options?: Partial<LLMCompletionOptions>): Promise<LLMCompletionResult>;
    /**
     * 流式文本生成
     * @param messages 对话消息
     * @param options 生成选项
     */
    completeStream(messages: LLMMessage[], options?: Partial<LLMCompletionOptions>): AsyncGenerator<string, void, unknown>;
    /**
     * 获取累计token使用统计
     */
    getTokenUsage(): TokenUsage;
    /**
     * 重置token使用统计
     */
    resetTokenUsage(): void;
    /**
     * 估算token成本
     * @param promptTokens prompt tokens
     * @param completionTokens completion tokens
     */
    calculateCost(promptTokens: number, completionTokens: number): number;
}
/**
 * 适配器配置基类
 */
export interface BaseLLMAdapterConfig {
    /**
     * API端点
     */
    endpoint?: string;
    /**
     * API密钥
     */
    apiKey: string;
    /**
     * 模型名称
     */
    model: string;
    /**
     * 请求超时（毫秒）
     */
    timeout?: number;
    /**
     * 最大重试次数
     */
    maxRetries?: number;
    /**
     * 价格：每1K prompt tokens (USD)
     */
    costPer1kPrompt?: number;
    /**
     * 价格：每1K completion tokens (USD)
     */
    costPer1kCompletion?: number;
}
