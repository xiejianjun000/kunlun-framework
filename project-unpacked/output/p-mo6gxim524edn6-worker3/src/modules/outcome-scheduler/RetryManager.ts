import { RetryConfig } from './interfaces/IOutcomeScheduler';

/**
 * 重试管理器
 * 处理失败任务的重试逻辑
 */
export class RetryManager {
  private defaultConfig: Required<RetryConfig> = {
    maxRetries: 3,
    retryIntervalMs: 1000,
    exponentialBackoff: true
  };

  constructor(private readonly globalConfig?: Partial<RetryConfig>) {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...globalConfig
    };
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<{ success: true; result: T } | { success: false; error: Error; retries: number }> {
    const mergedConfig: Required<RetryConfig> = {
      ...this.defaultConfig,
      ...config
    };

    let lastError: Error | null = null;
    let retries = 0;

    while (retries <= mergedConfig.maxRetries) {
      try {
        const result = await operation();
        return { success: true, result };
      } catch (error) {
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
      error: lastError!,
      retries
    };
  }

  /**
   * 计算延迟
   */
  private calculateDelay(retry: number, config: Required<RetryConfig>): number {
    if (config.exponentialBackoff) {
      return config.retryIntervalMs * Math.pow(2, retry - 1);
    }
    return config.retryIntervalMs;
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Required<RetryConfig> {
    return { ...this.defaultConfig };
  }
}
