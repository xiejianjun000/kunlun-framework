/**
 * 强化学习进化策略 - LLM增强版
 * Reinforcement Learning Evolution Strategy with LLM Enhancement
 */

import {
  StrategyContext,
  StrategyResult,
  EvolutionMutation,
  MutationType,
  StrategyCondition,
  StrategyConditionType,
} from '../interfaces';
import { EvolutionStrategy, EvolutionStrategyConfig } from './EvolutionStrategy';
import { LLMOptimizer } from '../core/LLMOptimizer';

// ============== 类型定义 ==============

/** Q-Learning 配置 */
interface QLearningConfig {
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
  llmGuidedExploration: boolean;
}

/** Q表条目 */
interface QTableEntry {
  state: string;
  action: string;
  qValue: number;
  visitCount: number;
  lastUpdated: number;
}

/** LLM增强强化策略配置 */
export interface LLMEnhancedReinforcementConfig extends EvolutionStrategyConfig {
  qLearning: QLearningConfig;
  historyWindowSize: number;
  actionSpace: string[];
  llmActionGuidance: boolean;
  llmRewardEstimation: boolean;
}

/** 动作执行结果 */
interface ActionResult {
  newState: Record<string, unknown>;
  reward: number;
  llmReward?: number;
  confidence: number;
}

/** 状态动作对 */
interface StateActionPair {
  state: string;
  action: string;
  qValue: number;
  expectedReward: number;
  llmSuggestion?: string;
}

// ============== 强化学习策略实现 ==============

/**
 * LLM增强强化学习进化策略
 * 结合Q-Learning和LLM分析进行自适应学习
 */
export class LLMEnhancedReinforcementStrategy extends EvolutionStrategy {
  declare protected config: Required<LLMEnhancedReinforcementConfig>;
  private llmOptimizer: LLMOptimizer;
  private qTable: Map<string, QTableEntry> = new Map();
  private lastState: string = '';
  private lastAction: string = '';
  private stateActionHistory: StateActionPair[] = [];
  private learningProgress: number[] = [];

  constructor(config?: Partial<LLMEnhancedReinforcementConfig>) {
    const defaultConfig: LLMEnhancedReinforcementConfig = {
      id: 'reinforcement-llm',
      name: 'LLM-Enhanced Reinforcement Strategy',
      description: '结合Q-Learning和LLM分析的强化学习进化策略',
      maxMutations: 5,
      mutationProbability: 0.1,
      crossoverProbability: 0,
      eliteRatio: 0,
      maxIterations: 20,
      convergenceThreshold: 0.01,
      qLearning: {
        learningRate: config?.qLearning?.learningRate ?? 0.1,
        discountFactor: config?.qLearning?.discountFactor ?? 0.9,
        epsilon: config?.qLearning?.epsilon ?? 0.3,
        epsilonDecay: config?.qLearning?.epsilonDecay ?? 0.99,
        minEpsilon: config?.qLearning?.minEpsilon ?? 0.01,
        llmGuidedExploration: config?.qLearning?.llmGuidedExploration ?? true,
      },
      historyWindowSize: config?.historyWindowSize ?? 10,
      actionSpace: config?.actionSpace ?? [
        'increase_trait',
        'decrease_trait',
        'modify_behavior',
        'adjust_param',
        'no_op',
      ],
      llmActionGuidance: config?.llmActionGuidance ?? true,
      llmRewardEstimation: config?.llmRewardEstimation ?? true,
    };

    super(defaultConfig);
    this.config = defaultConfig as Required<LLMEnhancedReinforcementConfig>;
    this.llmOptimizer = new LLMOptimizer();
  }

  /**
   * 执行LLM增强强化学习进化
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = Date.now();

    try {
      // 1. 获取当前状态
      const currentState = this.getStateFromContext(context);

      // 2. LLM状态分析
      const llmStateAnalysis = await this.analyzeStateWithLLM(context);

      // 3. 选择动作（ε-greedy + LLM指导）
      const action = await this.selectActionWithLLM(currentState, context, llmStateAnalysis);

      // 4. 执行动作
      const actionResult = await this.executeActionWithLLM(action, context);

      // 5. 更新Q表
      if (this.lastState) {
        await this.updateQTableWithLLM(this.lastState, this.lastAction, actionResult, currentState);
      }

      // 6. 生成变异
      const mutations = this.generateMutations(action, actionResult, context);

      // 7. LLM验证和优化
      const optimizedMutations = await this.optimizeMutationsWithLLM(mutations, context);

      // 8. 衰减探索率
      this.config.qLearning.epsilon = Math.max(
        this.config.qLearning.minEpsilon,
        this.config.qLearning.epsilon * this.config.qLearning.epsilonDecay
      );

      // 9. 更新状态
      this.lastState = currentState;
      this.lastAction = action;

      // 10. 记录学习进度
      this.learningProgress.push(actionResult.reward);
      if (this.learningProgress.length > 100) {
        this.learningProgress.shift();
      }

      return {
        success: optimizedMutations.length > 0,
        newState: {
          ...context.currentState,
          fitness: actionResult.newState.fitness as number,
        },
        mutations: optimizedMutations,
        fitnessDelta: (actionResult.newState.fitness as number) - ((context.currentState.fitness as number) ?? 0.5),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        newState: context.currentState,
        mutations: [],
        fitnessDelta: 0,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取适用条件
   */
  getApplicableConditions(): StrategyCondition[] {
    return [
      { type: StrategyConditionType.HISTORY_LENGTH, params: { min: 20 } },
      { type: StrategyConditionType.ERROR_RATE, params: { max: 0.2 } },
    ];
  }

  /**
   * 从上下文获取状态
   */
  private getStateFromContext(context: StrategyContext): string {
    const fitness = (context.currentState.fitness as number) ?? 0.5;
    const historyLen = context.history.length;
    const recentTrend = this.calculateRecentTrend(context);

    // 离散化
    const fitnessBin = Math.floor(fitness * 10);
    const historyBin = Math.min(Math.floor(historyLen / 10), 9);
    const trendBin = recentTrend > 0.01 ? 1 : recentTrend < -0.01 ? -1 : 0;

    return `f${fitnessBin}_h${historyBin}_t${trendBin}`;
  }

  /**
   * 计算最近趋势
   */
  private calculateRecentTrend(context: StrategyContext): number {
    if (context.history.length < 2) {
      return 0;
    }

    const recent = context.history.slice(-5);
    if (recent.length < 2) {
      return 0;
    }

    return (recent[recent.length - 1].fitnessScore - recent[0].fitnessScore) / recent.length;
  }

  /**
   * 使用LLM分析状态
   */
  private async analyzeStateWithLLM(context: StrategyContext): Promise<{
    recommendedAction?: string;
    confidence: number;
    reasoning: string;
  }> {
    if (!this.config.llmActionGuidance || !this.llmOptimizer.isAvailable()) {
      return { confidence: 0, reasoning: 'LLM不可用' };
    }

    try {
      const strategies = this.config.actionSpace.map(action => ({
        id: action,
        name: action,
        description: this.getActionDescription(action),
      }));

      const recommendedAction = await this.llmOptimizer.recommendStrategy(context, strategies);

      return {
        recommendedAction,
        confidence: 0.7,
        reasoning: `LLM推荐动作: ${recommendedAction}`,
      };
    } catch (error) {
      console.error('LLM state analysis failed:', error);
      return { confidence: 0, reasoning: 'LLM分析失败' };
    }
  }

  /**
   * 获取动作描述
   */
  private getActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      increase_trait: '增加特质参数值',
      decrease_trait: '减少特质参数值',
      modify_behavior: '修改行为模式',
      adjust_param: '调整算法参数',
      no_op: '不执行任何操作',
    };
    return descriptions[action] ?? action;
  }

  /**
   * LLM增强动作选择
   */
  private async selectActionWithLLM(
    state: string,
    context: StrategyContext,
    llmAnalysis: { recommendedAction?: string; confidence: number; reasoning: string }
  ): Promise<string> {
    // ε-greedy策略
    const shouldExplore = Math.random() < this.config.qLearning.epsilon;

    if (shouldExplore) {
      // 探索：优先选择LLM推荐的动作
      if (this.config.qLearning.llmGuidedExploration && llmAnalysis.recommendedAction) {
        // 80%选择LLM推荐，20%随机
        if (Math.random() < 0.8) {
          return llmAnalysis.recommendedAction;
        }
      }

      // 随机选择
      return this.config.actionSpace[Math.floor(Math.random() * this.config.actionSpace.length)];
    }

    // 利用：使用LLM增强的Q值选择
    return this.getBestActionWithLLM(state, llmAnalysis);
  }

  /**
   * 获取最佳动作（LLM增强）
   */
  private getBestActionWithLLM(state: string, llmAnalysis: {
    recommendedAction?: string;
    confidence: number;
  }): string {
    let bestAction = 'no_op';
    let bestQValue = -Infinity;

    for (const action of this.config.actionSpace) {
      const entry = this.qTable.get(`${state}_${action}`);
      let qValue = entry?.qValue ?? 0;

      // LLM推荐加成
      if (llmAnalysis.recommendedAction === action && llmAnalysis.confidence > 0.5) {
        qValue += llmAnalysis.confidence * 0.1;
      }

      // 访问次数惩罚（鼓励探索未充分尝试的动作）
      const visitCount = entry?.visitCount ?? 0;
      if (visitCount < 5) {
        qValue += 0.05 * (5 - visitCount) / 5;
      }

      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * 执行动作（LLM增强）
   */
  private async executeActionWithLLM(
    action: string,
    context: StrategyContext
  ): Promise<ActionResult> {
    const currentFitness = (context.currentState.fitness as number) ?? 0.5;
    let newFitness = currentFitness;
    const delta: Record<string, unknown> = {};

    // 基于动作执行变化
    switch (action) {
      case 'increase_trait':
        newFitness = Math.min(1, currentFitness + 0.05);
        delta.traitAdjustment = 0.05;
        break;

      case 'decrease_trait':
        newFitness = Math.max(0, currentFitness - 0.03);
        delta.traitAdjustment = -0.03;
        break;

      case 'modify_behavior':
        newFitness = currentFitness + (Math.random() - 0.5) * 0.1;
        delta.behaviorModified = true;
        break;

      case 'adjust_param':
        newFitness = currentFitness + (Math.random() - 0.5) * 0.08;
        delta.paramAdjusted = true;
        break;

      case 'no_op':
        break;
    }

    // LLM奖励估计
    let llmReward: number | undefined;
    let confidence = 0.5;

    if (this.config.llmRewardEstimation && this.llmOptimizer.isAvailable()) {
      try {
        const prediction = await this.llmOptimizer.predictFitness(currentFitness, context);
        llmReward = prediction.predictedFitness - currentFitness;
        confidence = 1 - (prediction.confidenceInterval[1] - prediction.confidenceInterval[0]);
      } catch (error) {
        console.error('LLM reward estimation failed:', error);
      }
    }

    newFitness = Math.max(0, Math.min(1, newFitness));

    // 综合奖励
    const baseReward = newFitness - currentFitness;
    const combinedReward = llmReward !== undefined
      ? (1 - confidence) * baseReward + confidence * llmReward
      : baseReward;

    return {
      newState: {
        ...context.currentState,
        fitness: newFitness,
        ...delta,
      },
      reward: combinedReward,
      llmReward,
      confidence,
    };
  }

  /**
   * 更新Q表（LLM增强）
   */
  private async updateQTableWithLLM(
    state: string,
    action: string,
    actionResult: ActionResult,
    nextState: string
  ): Promise<void> {
    const key = `${state}_${action}`;
    const entry = this.qTable.get(key) ?? {
      state,
      action,
      qValue: 0,
      visitCount: 0,
      lastUpdated: Date.now(),
    };

    // 计算最大Q值
    const maxNextQ = Math.max(
      ...this.config.actionSpace.map(a => {
        const nextEntry = this.qTable.get(`${nextState}_${a}`);
        return nextEntry?.qValue ?? 0;
      }),
      0
    );

    // LLM增强的Q-Learning更新
    const qLearning = this.config.qLearning;
    let learningRate = qLearning.learningRate;

    // 根据置信度调整学习率
    if (actionResult.confidence < 0.5) {
      learningRate *= 0.5; // 低置信度时减小学习率
    }

    // 标准Q-Learning更新
    entry.qValue = entry.qValue + learningRate * (
      actionResult.reward + qLearning.discountFactor * maxNextQ - entry.qValue
    );

    entry.visitCount++;
    entry.lastUpdated = Date.now();

    this.qTable.set(key, entry);

    // 记录状态动作对
    this.stateActionHistory.push({
      state,
      action,
      qValue: entry.qValue,
      expectedReward: actionResult.reward,
      llmSuggestion: actionResult.llmReward !== undefined ? 'used' : undefined,
    });

    // 保持历史记录在合理范围
    if (this.stateActionHistory.length > 1000) {
      this.stateActionHistory = this.stateActionHistory.slice(-500);
    }
  }

  /**
   * 生成变异
   */
  private generateMutations(
    action: string,
    actionResult: ActionResult,
    context: StrategyContext
  ): EvolutionMutation[] {
    const mutations: EvolutionMutation[] = [];

    if (action === 'no_op') {
      return mutations;
    }

    const currentFitness = actionResult.newState.fitness as number;
    const prevFitness = context.currentState.fitness as number;
    const fitnessChange = currentFitness - prevFitness;

    // 根据动作类型生成变异
    switch (action) {
      case 'increase_trait':
      case 'decrease_trait':
        mutations.push({
          mutationId: `rl_trait_${Date.now()}`,
          type: MutationType.TRAIT,
          path: 'fitness',
          oldValue: prevFitness,
          newValue: currentFitness,
          strength: Math.abs(fitnessChange),
          validated: true,
        });
        break;

      case 'modify_behavior':
        mutations.push({
          mutationId: `rl_behavior_${Date.now()}`,
          type: MutationType.BEHAVIOR,
          path: 'behaviorPattern',
          oldValue: context.currentState.behaviorPattern ?? 'default',
          newValue: `modified_${Date.now()}`,
          strength: Math.abs(fitnessChange),
          validated: true,
        });
        break;

      case 'adjust_param':
        mutations.push({
          mutationId: `rl_param_${Date.now()}`,
          type: MutationType.PARAMETER,
          path: 'evolutionParam',
          oldValue: context.currentState.evolutionParam ?? 0.5,
          newValue: Math.random(),
          strength: Math.abs(fitnessChange),
          validated: true,
        });
        break;
    }

    return mutations.slice(0, this.config.maxMutations);
  }

  /**
   * 使用LLM优化变异
   */
  private async optimizeMutationsWithLLM(
    mutations: EvolutionMutation[],
    context: StrategyContext
  ): Promise<EvolutionMutation[]> {
    if (!this.llmOptimizer.isAvailable() || mutations.length === 0) {
      return mutations;
    }

    try {
      const evaluations = await this.llmOptimizer.evaluateMutationEffects(mutations, context);

      return mutations.filter((mutation, index) => {
        const evaluation = evaluations[index];
        return evaluation?.recommended !== false && evaluation?.riskLevel !== 'high';
      });
    } catch (error) {
      console.error('LLM mutation optimization failed:', error);
      return mutations;
    }
  }

  /**
   * 获取Q表
   */
  getQTable(): Map<string, QTableEntry> {
    return new Map(this.qTable);
  }

  /**
   * 获取学习进度统计
   */
  getLearningStats(): {
    totalStateActions: number;
    averageReward: number;
    recentTrend: number;
    explorationRate: number;
  } {
    const totalStateActions = this.stateActionHistory.length;
    const averageReward = this.learningProgress.length > 0
      ? this.learningProgress.reduce((a, b) => a + b, 0) / this.learningProgress.length
      : 0;

    const recentTrend = this.learningProgress.length >= 10
      ? (this.learningProgress.slice(-5).reduce((a, b) => a + b, 0) / 5) -
        (this.learningProgress.slice(-10, -5).reduce((a, b) => a + b, 0) / 5)
      : 0;

    return {
      totalStateActions,
      averageReward,
      recentTrend,
      explorationRate: this.config.qLearning.epsilon,
    };
  }

  /**
   * 导出Q表
   */
  exportQTable(): { state: string; action: string; qValue: number; visitCount: number }[] {
    return Array.from(this.qTable.values()).map(entry => ({
      state: entry.state,
      action: entry.action,
      qValue: entry.qValue,
      visitCount: entry.visitCount,
    }));
  }

  /**
   * 导入Q表
   */
  importQTable(entries: { state: string; action: string; qValue: number; visitCount: number }[]): void {
    for (const entry of entries) {
      this.qTable.set(`${entry.state}_${entry.action}`, {
        ...entry,
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * 重置Q表
   */
  resetQTable(): void {
    this.qTable.clear();
    this.stateActionHistory = [];
    this.learningProgress = [];
    this.lastState = '';
    this.lastAction = '';
  }
}

// 保持向后兼容
export { LLMEnhancedReinforcementStrategy as ReinforcementStrategy };
