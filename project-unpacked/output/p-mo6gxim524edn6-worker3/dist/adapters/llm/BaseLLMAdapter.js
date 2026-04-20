"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMAdapter = void 0;
/**
 * 基础LLM适配器抽象类
 * 提供通用的token统计、成本计算和错误处理功能
 */
class BaseLLMAdapter {
    constructor(config) {
        this.totalPromptTokens = 0;
        this.totalCompletionTokens = 0;
        this.endpoint = config.endpoint;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout ?? 60000;
        this.maxRetries = config.maxRetries ?? 3;
        this.costPer1kPrompt = config.costPer1kPrompt ?? 0.001;
        this.costPer1kCompletion = config.costPer1kCompletion ?? 0.002;
    }
    /**
     * 检查适配器是否就绪
     */
    isReady() {
        return !!this.apiKey && this.apiKey.length > 0;
    }
    /**
     * 获取当前token使用统计
     */
    getTokenUsage() {
        const totalTokens = this.totalPromptTokens + this.totalCompletionTokens;
        return {
            totalPromptTokens: this.totalPromptTokens,
            totalCompletionTokens: this.totalCompletionTokens,
            totalTokens,
            estimatedCostUsd: this.calculateCost(this.totalPromptTokens, this.totalCompletionTokens)
        };
    }
    /**
     * 重置统计
     */
    resetTokenUsage() {
        this.totalPromptTokens = 0;
        this.totalCompletionTokens = 0;
    }
    /**
     * 计算成本
     */
    calculateCost(promptTokens, completionTokens) {
        const promptCost = (promptTokens / 1000) * this.costPer1kPrompt;
        const completionCost = (completionTokens / 1000) * this.costPer1kCompletion;
        return promptCost + completionCost;
    }
    /**
     * 累计token使用
     */
    accumulateUsage(promptTokens, completionTokens) {
        this.totalPromptTokens += promptTokens;
        this.totalCompletionTokens += completionTokens;
    }
    /**
     * 带重试的请求
     */
    async fetchWithRetry(url, options, retries = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok && retries < this.maxRetries) {
                // 指数退避
                const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retries + 1);
            }
            return response;
        }
        catch (error) {
            if (retries < this.maxRetries) {
                const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retries + 1);
            }
            throw error;
        }
    }
    /**
     * 处理错误结果
     */
    handleError(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            text: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            success: false,
            error: errorMessage
        };
    }
}
exports.BaseLLMAdapter = BaseLLMAdapter;
