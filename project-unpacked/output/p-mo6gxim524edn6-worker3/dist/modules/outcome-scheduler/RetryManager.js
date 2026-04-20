"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryManager = void 0;
/**
 * 重试管理器
 * 处理失败任务的重试逻辑
 */
class RetryManager {
    constructor(globalConfig) {
        this.globalConfig = globalConfig;
        this.defaultConfig = {
            maxRetries: 3,
            retryIntervalMs: 1000,
            exponentialBackoff: true
        };
        this.defaultConfig = {
            ...this.defaultConfig,
            ...globalConfig
        };
    }
    /**
     * 执行带重试的操作
     */
    async executeWithRetry(operation, config) {
        const mergedConfig = {
            ...this.defaultConfig,
            ...config
        };
        let lastError = null;
        let retries = 0;
        while (retries <= mergedConfig.maxRetries) {
            try {
                const result = await operation();
                return { success: true, result };
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                retries++;
                if (retries <= mergedConfig.maxRetries) {
                    const delay = this.calculateDelay(retries, mergedConfig);
                    await this.sleep(delay);
                }
            }
        }
        return {
            success: false,
            error: lastError,
            retries
        };
    }
    /**
     * 计算延迟
     */
    calculateDelay(retry, config) {
        if (config.exponentialBackoff) {
            return config.retryIntervalMs * Math.pow(2, retry - 1);
        }
        return config.retryIntervalMs;
    }
    /**
     * 睡眠
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return { ...this.defaultConfig };
    }
}
exports.RetryManager = RetryManager;
