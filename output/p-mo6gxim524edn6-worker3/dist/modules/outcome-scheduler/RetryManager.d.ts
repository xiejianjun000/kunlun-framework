import { RetryConfig } from './interfaces/IOutcomeScheduler';
/**
 * 重试管理器
 * 处理失败任务的重试逻辑
 */
export declare class RetryManager {
    private readonly globalConfig?;
    private defaultConfig;
    constructor(globalConfig?: Partial<RetryConfig> | undefined);
    /**
     * 执行带重试的操作
     */
    executeWithRetry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<{
        success: true;
        result: T;
    } | {
        success: false;
        error: Error;
        retries: number;
    }>;
    /**
     * 计算延迟
     */
    private calculateDelay;
    /**
     * 睡眠
     */
    private sleep;
    /**
     * 获取默认配置
     */
    getDefaultConfig(): Required<RetryConfig>;
}
