/**
 * LLM优化器模块
 * LLM Optimizer - 使用LLM进行进化优化决策
 */

import OpenAI from 'openai';
import {
  EvolutionHistoryRecord,
  EvolutionMutation,
  MutationType,
  StrategyContext,
  RewardContext,
} from '../interfaces';

// ============== 类型定义 ==============

/** LLM调用配置 */
export interface LLMOptimizerConfig {
  /** OpenAI API Key */
  apiKey?: string;
  /** API基础URL */
  baseURL?: string;
  /** 模型名称 */
  model: string;
  /** 最大Token数 */
  maxTokens: number;
  /** 温度参数 */
  temperature: number;
  /** 是否启用LLM优化 */
  enabled: boolean;
  /** 缓存TTL(ms) */
  cacheTTL: number;
}

/** 优化建议 */
export interface OptimizationSuggestion {
  /** 建议类型 */
  type: 'mutation' | 'parameter_adjust' | 'strategy_switch' | 'rejection';
  /** 建议描述 */
  description: string;
  /** 建议的变异 */
  mutations?: EvolutionMutation[];
  /** 参数调整 */
  parameterAdjustments?: Record<string, number>;
  /** 建议的策略 */
  suggestedStrategy?: string;
  /** 置信度 */
  confidence: number;
  /** LLM生成的原始内容 */
  rawContent?: string;
}

/** 适应度预测 */
export interface FitnessPrediction {
  /** 预测的适应度 */
  predictedFitness: number;
  /** 置信区间 */
  confidenceInterval: [number, number];
  /** 预测依据 */
  reasoning: string;
}

/** 变异效果评估 */
export interface MutationEffectEvaluation {
  /** 变异ID */
  mutationId: string;
  /** 预期效果 */
  expectedEffect: 'positive' | 'negative' | 'neutral' | 'uncertain';
  /** 效果描述 */
  description: string;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
  /** 建议是否应用 */
  recommended: boolean;
}

/** 历史交互样本 */
interface InteractionSample {
  /** 用户查询 */
  query: string;
  /** Agent响应 */
  response: string;
  /** 用户反馈 */
  feedback?: {
    type: 'positive' | 'negative' | 'correction';
    content: string;
  };
  /** 任务是否成功 */
  taskSuccess: boolean;
  /** 时间戳 */
  timestamp: Date;
}

/** LLM分析结果 */
interface LLMAnalysisResult {
  /** 识别的问题 */
  identifiedIssues: string[];
  /** 成功模式 */
  successPatterns: string[];
  /** 改进建议 */
  improvementSuggestions: string[];
  /** 预测的适应度变化 */
  predictedFitnessChange: number;
}

// ============== 缓存管理 ==============

/** 简单内存缓存 */
class LLMCache {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * 设置缓存
   */
  set(key: string, data: unknown, ttl: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
}

// ============== LLM优化器 ==============

/**
 * LLM优化器
 * 使用LLM进行进化策略优化和变异决策
 */
export class LLMOptimizer {
  private config: Required<LLMOptimizerConfig>;
  private client: OpenAI | null = null;
  private cache: LLMCache;

  constructor(config?: Partial<LLMOptimizerConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? process.env.OPENAI_API_KEY ?? '',
      baseURL: config?.baseURL ?? process.env.OPENAI_API_BASE_URL ?? '',
      model: config?.model ?? 'gpt-4o-mini',
      maxTokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 0.7,
      enabled: config?.enabled ?? true,
      cacheTTL: config?.cacheTTL ?? 300000, // 5分钟
    };

    this.cache = new LLMCache();
    this.initializeClient();
  }

  /**
   * 初始化OpenAI客户端
   */
  private initializeClient(): void {
    if (!this.config.enabled || !this.config.apiKey) {
      console.warn('LLM Optimizer: OpenAI API key not configured, LLM features disabled');
      return;
    }

    try {
      const clientConfig = {
        apiKey: this.config.apiKey,
      };

      if (this.config.baseURL) {
        (clientConfig as Record<string, unknown>).baseURL = this.config.baseURL;
      }

      this.client = new OpenAI(clientConfig);
      console.log(`LLM Optimizer initialized with model: ${this.config.model}`);
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.client = null;
    }
  }

  /**
   * 检查LLM是否可用
   */
  isAvailable(): boolean {
    return this.config.enabled && this.client !== null;
  }

  /**
   * 生成变异建议
   * 基于历史分析和当前状态，生成最优变异方案
   */
  async generateMutationSuggestions(
    context: StrategyContext,
    interactionHistory?: InteractionSample[]
  ): Promise<OptimizationSuggestion> {
    if (!this.isAvailable()) {
      return this.getDefaultSuggestion();
    }

    const cacheKey = this.generateCacheKey('mutation', context);
    const cached = this.cache.get<OptimizationSuggestion>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildMutationPrompt(context, interactionHistory);
      const response = await this.callLLM(prompt);
      const suggestion = this.parseMutationResponse(response);

      this.cache.set(cacheKey, suggestion, this.config.cacheTTL);
      return suggestion;
    } catch (error) {
      console.error('LLM mutation suggestion failed:', error);
      return this.getDefaultSuggestion();
    }
  }

  /**
   * 评估变异效果
   * 使用LLM评估给定变异可能带来的效果
   */
  async evaluateMutationEffects(
    mutations: EvolutionMutation[],
    context: StrategyContext
  ): Promise<MutationEffectEvaluation[]> {
    if (!this.isAvailable() || mutations.length === 0) {
      return mutations.map(m => this.getDefaultEvaluation(m.mutationId));
    }

    try {
      const prompt = this.buildEvaluationPrompt(mutations, context);
      const response = await this.callLLM(prompt);
      return this.parseEvaluationResponse(response, mutations);
    } catch (error) {
      console.error('LLM mutation evaluation failed:', error);
      return mutations.map(m => this.getDefaultEvaluation(m.mutationId));
    }
  }

  /**
   * 预测适应度变化
   * 基于当前状态和历史数据预测进化后的适应度
   */
  async predictFitness(
    currentFitness: number,
    context: StrategyContext,
    proposedMutations?: EvolutionMutation[]
  ): Promise<FitnessPrediction> {
    if (!this.isAvailable()) {
      return this.getDefaultPrediction(currentFitness);
    }

    try {
      const prompt = this.buildPredictionPrompt(currentFitness, context, proposedMutations);
      const response = await this.callLLM(prompt);
      return this.parsePredictionResponse(response, currentFitness);
    } catch (error) {
      console.error('LLM fitness prediction failed:', error);
      return this.getDefaultPrediction(currentFitness);
    }
  }

  /**
   * 分析历史交互
   * 从交互历史中提取成功模式和潜在问题
   */
  async analyzeInteractionHistory(
    samples: InteractionSample[]
  ): Promise<LLMAnalysisResult> {
    if (!this.isAvailable() || samples.length === 0) {
      return {
        identifiedIssues: [],
        successPatterns: [],
        improvementSuggestions: [],
        predictedFitnessChange: 0,
      };
    }

    const cacheKey = `analysis_${samples.length}_${samples[samples.length - 1]?.timestamp?.getTime()}`;
    const cached = this.cache.get<LLMAnalysisResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildAnalysisPrompt(samples);
      const response = await this.callLLM(prompt);
      const result = this.parseAnalysisResponse(response);

      this.cache.set(cacheKey, result, this.config.cacheTTL);
      return result;
    } catch (error) {
      console.error('LLM history analysis failed:', error);
      return {
        identifiedIssues: [],
        successPatterns: [],
        improvementSuggestions: [],
        predictedFitnessChange: 0,
      };
    }
  }

  /**
   * 选择最优策略
   * 基于当前状态和历史表现推荐最佳进化策略
   */
  async recommendStrategy(
    context: StrategyContext,
    availableStrategies: { id: string; name: string; description: string }[]
  ): Promise<string> {
    if (!this.isAvailable()) {
      return this.selectDefaultStrategy(context);
    }

    try {
      const prompt = this.buildStrategyRecommendationPrompt(context, availableStrategies);
      const response = await this.callLLM(prompt);
      return this.parseStrategyResponse(response, availableStrategies);
    } catch (error) {
      console.error('LLM strategy recommendation failed:', error);
      return this.selectDefaultStrategy(context);
    }
  }

  /**
   * 生成改进建议
   * 基于问题分析生成具体的改进方案
   */
  async generateImprovementSuggestions(
    issues: string[],
    currentTraits: Record<string, unknown>
  ): Promise<string[]> {
    if (!this.isAvailable() || issues.length === 0) {
      return issues.map(i => `建议改进: ${i}`);
    }

    try {
      const prompt = this.buildImprovementPrompt(issues, currentTraits);
      const response = await this.callLLM(prompt);
      return this.parseImprovementResponse(response);
    } catch (error) {
      console.error('LLM improvement suggestion failed:', error);
      return issues.map(i => `建议改进: ${i}`);
    }
  }

  // ============== 私有方法 ==============

  /**
   * 调用LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('LLM client not initialized');
    }

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个AI Agent进化优化专家，帮助分析历史表现、评估变异效果、生成优化建议。请用JSON格式回复。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const content = response.choices[0]?.message?.content ?? '';
    return content;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, context: StrategyContext): string {
    const fitness = context.currentState.fitness ?? 0;
    const historyLen = context.history.length;
    return `${type}_${fitness}_${historyLen}_${Math.floor(Date.now() / (this.config.cacheTTL / 1000))}`;
  }

  /**
   * 构建变异建议提示词
   */
  private buildMutationPrompt(
    context: StrategyContext,
    interactionHistory?: InteractionSample[]
  ): string {
    const currentState = JSON.stringify(context.currentState, null, 2);
    const historySummary = context.history.length > 0
      ? `历史进化次数: ${context.history.length}, 最近适应度: ${context.history[context.history.length - 1]?.fitnessScore}`
      : '无历史记录';

    const interactionSummary = interactionHistory && interactionHistory.length > 0
      ? `最近交互样本数: ${interactionHistory.length}, 成功率: ${interactionHistory.filter(s => s.taskSuccess).length / interactionHistory.length}`
      : '无交互历史';

    return `## 当前状态
${currentState}

## 进化历史
${historySummary}

## 交互历史
${interactionSummary}

## 约束条件
${context.constraints.length > 0 ? JSON.stringify(context.constraints) : '无'}

请分析以上信息，生成最优的变异建议。
返回JSON格式:
{
  "type": "mutation" | "parameter_adjust" | "strategy_switch" | "rejection",
  "description": "建议描述",
  "mutations": [{"type": "trait|behavior|parameter", "path": "属性路径", "newValue": 新值, "strength": 0.1-1}],
  "parameterAdjustments": {"参数名": 调整值},
  "confidence": 0-1
}`;
  }

  /**
   * 构建评估提示词
   */
  private buildEvaluationPrompt(
    mutations: EvolutionMutation[],
    context: StrategyContext
  ): string {
    const mutationsJson = JSON.stringify(mutations, null, 2);
    const currentFitness = context.currentState.fitness ?? 0;

    return `## 当前适应度
${currentFitness}

## 待评估变异
${mutationsJson}

请评估每个变异的预期效果。
返回JSON数组格式:
[
  {
    "mutationId": "变异ID",
    "expectedEffect": "positive|negative|neutral|uncertain",
    "description": "效果描述",
    "riskLevel": "low|medium|high",
    "recommended": true/false
  }
]`;
  }

  /**
   * 构建预测提示词
   */
  private buildPredictionPrompt(
    currentFitness: number,
    context: StrategyContext,
    proposedMutations?: EvolutionMutation[]
  ): string {
    const mutationsInfo = proposedMutations && proposedMutations.length > 0
      ? JSON.stringify(proposedMutations, null, 2)
      : '无';

    const recentHistory = context.history.slice(-5);
    const historyInfo = recentHistory.length > 0
      ? `最近5次进化适应度: ${recentHistory.map(r => r.fitnessScore).join(', ')}`
      : '无历史';

    return `## 当前适应度
${currentFitness}

## 历史适应度
${historyInfo}

## 拟议变异
${mutationsInfo}

请预测应用变异后的适应度变化。
返回JSON格式:
{
  "predictedFitness": 0-1,
  "confidenceInterval": [下限, 上限],
  "reasoning": "预测依据说明"
}`;
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(samples: InteractionSample[]): string {
    const recentSamples = samples.slice(-10);
    const summary = recentSamples.map((s, i) =>
      `[样本${i + 1}] 查询: ${s.query.substring(0, 50)}..., 成功: ${s.taskSuccess}, 反馈: ${s.feedback?.type ?? '无'}`
    ).join('\n');

    return `## 最近交互样本
${summary}

请分析这些交互样本，识别：
1. 成功模式（什么做法有效）
2. 问题（什么导致了失败或低质量）
3. 改进建议

返回JSON格式:
{
  "identifiedIssues": ["问题1", "问题2"],
  "successPatterns": ["模式1", "模式2"],
  "improvementSuggestions": ["建议1", "建议2"],
  "predictedFitnessChange": -1到1的数值
}`;
  }

  /**
   * 构建策略推荐提示词
   */
  private buildStrategyRecommendationPrompt(
    context: StrategyContext,
    strategies: { id: string; name: string; description: string }[]
  ): string {
    const currentFitness = context.currentState.fitness ?? 0;
    const historyCount = context.history.length;

    return `## 当前状态
- 适应度: ${currentFitness}
- 历史进化次数: ${historyCount}

## 可用策略
${strategies.map(s => `- ${s.id}: ${s.name} - ${s.description}`).join('\n')}

请根据当前状态选择最合适的策略。
返回JSON格式:
{
  "recommendedStrategy": "策略ID",
  "reasoning": "选择理由"
}`;
  }

  /**
   * 构建改进建议提示词
   */
  private buildImprovementPrompt(
    issues: string[],
    currentTraits: Record<string, unknown>
  ): string {
    return `## 识别的问题
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

## 当前特质配置
${JSON.stringify(currentTraits, null, 2)}

请针对每个问题生成具体的改进建议。
返回JSON数组:
["建议1", "建议2", ...]`;
  }

  // ============== 解析方法 ==============

  /**
   * 解析变异响应
   */
  private parseMutationResponse(response: string): OptimizationSuggestion {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.type ?? 'rejection',
          description: parsed.description ?? '无建议',
          mutations: parsed.mutations ?? [],
          parameterAdjustments: parsed.parameterAdjustments,
          confidence: parsed.confidence ?? 0.5,
          rawContent: response,
        };
      }
    } catch (error) {
      console.error('Failed to parse mutation response:', error);
    }
    return this.getDefaultSuggestion();
  }

  /**
   * 解析评估响应
   */
  private parseEvaluationResponse(
    response: string,
    mutations: EvolutionMutation[]
  ): MutationEffectEvaluation[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse evaluation response:', error);
    }
    return mutations.map(m => this.getDefaultEvaluation(m.mutationId));
  }

  /**
   * 解析预测响应
   */
  private parsePredictionResponse(
    response: string,
    currentFitness: number
  ): FitnessPrediction {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          predictedFitness: Math.max(0, Math.min(1, parsed.predictedFitness ?? currentFitness)),
          confidenceInterval: parsed.confidenceInterval ?? [currentFitness - 0.1, currentFitness + 0.1],
          reasoning: parsed.reasoning ?? '无',
        };
      }
    } catch (error) {
      console.error('Failed to parse prediction response:', error);
    }
    return this.getDefaultPrediction(currentFitness);
  }

  /**
   * 解析分析响应
   */
  private parseAnalysisResponse(response: string): LLMAnalysisResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          identifiedIssues: parsed.identifiedIssues ?? [],
          successPatterns: parsed.successPatterns ?? [],
          improvementSuggestions: parsed.improvementSuggestions ?? [],
          predictedFitnessChange: parsed.predictedFitnessChange ?? 0,
        };
      }
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
    }
    return {
      identifiedIssues: [],
      successPatterns: [],
      improvementSuggestions: [],
      predictedFitnessChange: 0,
    };
  }

  /**
   * 解析策略响应
   */
  private parseStrategyResponse(
    response: string,
    strategies: { id: string }[]
  ): string {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const recommended = parsed.recommendedStrategy;
        if (strategies.some(s => s.id === recommended)) {
          return recommended;
        }
      }
    } catch (error) {
      console.error('Failed to parse strategy response:', error);
    }
    return strategies[0]?.id ?? 'genetic';
  }

  /**
   * 解析改进建议响应
   */
  private parseImprovementResponse(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // 尝试按行解析
      const lines = response.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 0) {
        return lines.map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim());
      }
    }
    return [];
  }

  // ============== 默认实现 ==============

  /**
   * 获取默认建议
   */
  private getDefaultSuggestion(): OptimizationSuggestion {
    return {
      type: 'rejection',
      description: 'LLM不可用，使用默认策略',
      confidence: 0.3,
    };
  }

  /**
   * 获取默认评估
   */
  private getDefaultEvaluation(mutationId: string): MutationEffectEvaluation {
    return {
      mutationId,
      expectedEffect: 'uncertain',
      description: '无法评估',
      riskLevel: 'medium',
      recommended: true,
    };
  }

  /**
   * 获取默认预测
   */
  private getDefaultPrediction(currentFitness: number): FitnessPrediction {
    return {
      predictedFitness: currentFitness,
      confidenceInterval: [currentFitness - 0.05, currentFitness + 0.05],
      reasoning: '基于规则的简单预测',
    };
  }

  /**
   * 选择默认策略
   */
  private selectDefaultStrategy(context: StrategyContext): string {
    if (context.history.length > 50) {
      return 'reinforcement';
    }
    if ((context.currentState.fitness as number) < 0.3) {
      return 'gradient';
    }
    return 'genetic';
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clearExpired();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LLMOptimizerConfig>): void {
    Object.assign(this.config, config);
    if (config.apiKey || config.baseURL) {
      this.initializeClient();
    }
  }
}
