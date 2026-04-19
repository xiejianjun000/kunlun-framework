/**
 * LLM Manager - 大语言模型管理器
 * 
 * 提供统一的多提供商LLM调用接口，支持：
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude)
 * - DeepSeek
 * 
 * 支持模型路由、失败回退、成本追踪等功能
 */

import {
  LLMAdapter,
  AdapterConfig,
  LLMRequestBase,
  LLMResponse,
  LLMStreamResponse,
  LLMManagerConfig,
  CallOptions,
  LLMProvider,
  LLMError,
  LLMRateLimitError,
} from './types';
import { OpenAIAdapter, OpenAIAdapterConfig } from './OpenAIAdapter';
import { AnthropicAdapter, AnthropicAdapterConfig } from './AnthropicAdapter';
import { DeepSeekAdapter, DeepSeekAdapterConfig } from './DeepSeekAdapter';

/**
 * 提供商配置映射
 */
export type ProviderConfigMap = {
  openai?: OpenAIAdapterConfig;
  anthropic?: AnthropicAdapterConfig;
  deepseek?: DeepSeekAdapterConfig;
};

/**
 * 调用统计
 */
export interface CallStatistics {
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  success: boolean;
  errorType?: string;
  latency: number;
  timestamp: number;
}

/**
 * LLM管理器
 */
export class LLMManager {
  private adapters: Map<LLMProvider, LLMAdapter> = new Map();
  private defaultProvider: LLMProvider;
  private modelMapping?: Record<string, { provider: LLMProvider; model: string }>;
  private statistics: CallStatistics[] = [];
  private maxStatisticsSize: number = 1000;
  
  constructor(config: ProviderConfigMap, managerConfig?: LLMManagerConfig) {
    // 初始化各个提供商的适配器
    if (config.openai) {
      this.adapters.set('openai', new OpenAIAdapter(config.openai));
    }
    
    if (config.anthropic) {
      this.adapters.set('anthropic', new AnthropicAdapter(config.anthropic));
    }
    
    if (config.deepseek) {
      this.adapters.set('deepseek', new DeepSeekAdapter(config.deepseek));
    }
    
    this.defaultProvider = managerConfig?.defaultProvider || 'openai';
    this.modelMapping = managerConfig?.modelMapping;
    
    // 验证至少有一个适配器
    if (this.adapters.size === 0) {
      throw new Error('At least one LLM provider must be configured');
    }
  }
  
  /**
   * 获取指定提供商的适配器
   */
  getAdapter(provider?: LLMProvider): LLMAdapter | undefined {
    return this.adapters.get(provider || this.defaultProvider);
  }
  
  /**
   * 获取当前默认提供商
   */
  getDefaultProvider(): LLMProvider {
    return this.defaultProvider;
  }
  
  /**
   * 设置默认提供商
   */
  setDefaultProvider(provider: LLMProvider): void {
    if (!this.adapters.has(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    this.defaultProvider = provider;
  }
  
  /**
   * 检查提供商是否已配置
   */
  hasProvider(provider: LLMProvider): boolean {
    return this.adapters.has(provider);
  }
  
  /**
   * 获取所有已配置的提供商
   */
  getProviders(): LLMProvider[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * 发送非流式请求
   */
  async complete(
    request: LLMRequestBase,
    options?: CallOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const { adapter, model } = this.resolveAdapter(options);
    
    try {
      // 如果指定了模型，更新适配器模型
      if (model) {
        adapter.setModel(model);
      }
      
      const response = await adapter.complete(request);
      
      // 记录统计
      this.recordStatistics({
        provider: options?.provider || this.defaultProvider,
        model: adapter.getModel(),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.total_tokens,
        success: true,
        latency: Date.now() - startTime,
        timestamp: Date.now(),
      });
      
      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      const provider = options?.provider || this.defaultProvider;
      
      // 记录失败统计
      this.recordStatistics({
        provider,
        model: adapter.getModel(),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        success: false,
        errorType: (error as Error).name,
        latency,
        timestamp: Date.now(),
      });
      
      // 如果启用了回退，尝试其他提供商
      if (options?.enableFallback && !(error instanceof LLMError && error.statusCode === 401)) {
        const fallbackResponse = await this.tryFallback(request, options, error as LLMError);
        if (fallbackResponse) {
          return fallbackResponse;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * 发送流式请求
   */
  async stream(
    request: LLMRequestBase,
    options?: CallOptions
  ): Promise<LLMStreamResponse> {
    const startTime = Date.now();
    const { adapter, model } = this.resolveAdapter(options);
    
    // 如果指定了模型，更新适配器模型
    if (model) {
      adapter.setModel(model);
    }
    
    // 流式响应暂不支持自动回退
    return adapter.stream(request);
  }
  
  /**
   * 尝试使用回退提供商
   */
  private async tryFallback(
    request: LLMRequestBase,
    options: CallOptions,
    originalError: LLMError
  ): Promise<LLMResponse | null> {
    // 只对限流和服务器错误进行回退
    if (
      !(originalError instanceof LLMRateLimitError) &&
      !(originalError.statusCode && originalError.statusCode >= 500)
    ) {
      return null;
    }
    
    // 获取其他可用的提供商
    const fallbackProviders = this.getProviders().filter(
      p => p !== (options?.provider || this.defaultProvider)
    );
    
    for (const provider of fallbackProviders) {
      const adapter = this.adapters.get(provider);
      if (!adapter) continue;
      
      try {
        const response = await adapter.complete(request);
        
        // 记录统计
        this.recordStatistics({
          provider,
          model: adapter.getModel(),
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.total_tokens,
          success: true,
          latency: Date.now() - Date.now(), // 忽略延迟计算
          timestamp: Date.now(),
        });
        
        return response;
      } catch (error) {
        // 继续尝试下一个提供商
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * 解析适配器和模型
   */
  private resolveAdapter(options?: CallOptions): { adapter: LLMAdapter; model?: string } {
    let provider = options?.provider || this.defaultProvider;
    let model = options?.model;
    
    // 如果没有指定模型，尝试使用模型映射
    if (!model && this.modelMapping) {
      const mapping = this.modelMapping[provider];
      if (mapping) {
        provider = mapping.provider;
        model = mapping.model;
      }
    }
    
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    
    return { adapter, model };
  }
  
  /**
   * 记录调用统计
   */
  private recordStatistics(stats: CallStatistics): void {
    this.statistics.push(stats);
    
    // 限制统计数量
    if (this.statistics.length > this.maxStatisticsSize) {
      this.statistics = this.statistics.slice(-this.maxStatisticsSize);
    }
  }
  
  /**
   * 获取调用统计
   */
  getStatistics(limit?: number): CallStatistics[] {
    if (limit) {
      return this.statistics.slice(-limit);
    }
    return [...this.statistics];
  }
  
  /**
   * 获取总使用量统计
   */
  getTotalUsage(): {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
  } {
    return this.statistics.reduce(
      (acc, stat) => ({
        totalInputTokens: acc.totalInputTokens + stat.inputTokens,
        totalOutputTokens: acc.totalOutputTokens + stat.outputTokens,
        totalCalls: acc.totalCalls + 1,
        successCalls: acc.successCalls + (stat.success ? 1 : 0),
        failedCalls: acc.failedCalls + (stat.success ? 0 : 1),
      }),
      {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
      }
    );
  }
  
  /**
   * 按提供商获取使用量统计
   */
  getUsageByProvider(): Record<LLMProvider, {
    inputTokens: number;
    outputTokens: number;
    calls: number;
    successRate: number;
  }> {
    const result: Record<LLMProvider, any> = {
      openai: { inputTokens: 0, outputTokens: 0, calls: 0, successRate: 0 },
      anthropic: { inputTokens: 0, outputTokens: 0, calls: 0, successRate: 0 },
      deepseek: { inputTokens: 0, outputTokens: 0, calls: 0, successRate: 0 },
    };
    
    for (const stat of this.statistics) {
      const provider = result[stat.provider];
      if (provider) {
        provider.inputTokens += stat.inputTokens;
        provider.outputTokens += stat.outputTokens;
        provider.calls += 1;
      }
    }
    
    // 计算成功率
    for (const provider of Object.keys(result) as LLMProvider[]) {
      const stats = this.statistics.filter(s => s.provider === provider);
      if (stats.length > 0) {
        result[provider].successRate = stats.filter(s => s.success).length / stats.length;
      }
    }
    
    return result;
  }
  
  /**
   * 健康检查所有提供商
   */
  async checkAllProviders(): Promise<Record<LLMProvider, boolean>> {
    const results: Record<LLMProvider, boolean> = {
      openai: false,
      anthropic: false,
      deepseek: false,
    };
    
    await Promise.all(
      Array.from(this.adapters.entries()).map(async ([provider, adapter]) => {
        try {
          results[provider] = await adapter.ping();
        } catch {
          results[provider] = false;
        }
      })
    );
    
    return results;
  }
  
  /**
   * 清空统计
   */
  clearStatistics(): void {
    this.statistics = [];
  }
}

/**
 * 便捷函数：创建默认配置的LLM管理器
 */
export function createLLMManager(
  config: ProviderConfigMap,
  defaultProvider?: LLMProvider
): LLMManager {
  return new LLMManager(config, { defaultProvider });
}
