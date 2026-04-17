/**
 * 强化学习进化策略
 * Reinforcement Learning Evolution Strategy
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

/** Q-Learning 配置 */
interface QLearningConfig {
  /** 学习率 */
  learningRate: number;
  /** 折扣因子 */
  discountFactor: number;
  /** 探索率 */
  epsilon: number;
  /** 探索衰减率 */
  epsilonDecay: number;
  /** 最小探索率 */
  minEpsilon: number;
}

/** Q表条目 */
interface QTableEntry {
  state: string;
  action: string;
  qValue: number;
  visitCount: number;
}

/**
 * 强化学习策略配置
 */
export interface ReinforcementStrategyConfig extends EvolutionStrategyConfig {
  /** Q-Learning 配置 */
  qLearning: QLearningConfig;
  /** 历史窗口大小 */
  historyWindowSize: number;
  /** 动作空间 */
  actionSpace: string[];
}

/**
 * 强化学习进化策略
 * 使用 Q-Learning 算法学习最优变异策略
 */
export class ReinforcementStrategy extends EvolutionStrategy {
  private config: Required<ReinforcementStrategyConfig>;
  private qTable: Map<string, QTableEntry> = new Map();
  private lastState: string = '';
  private lastAction: string = '';

  constructor(config?: Partial<ReinforcementStrategyConfig>) {
    const defaultConfig: ReinforcementStrategyConfig = {
      id: 'reinforcement',
      name: 'Reinforcement Learning Strategy',
      description: '使用强化学习(Q-Learning)自适应学习最优变异策略',
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
      },
      historyWindowSize: config?.historyWindowSize ?? 10,
      actionSpace: config?.actionSpace ?? [
        'increase_trait',
        'decrease_trait',
        'modify_behavior',
        'adjust_param',
        'no_op',
      ],
    };

    super(defaultConfig);
    this.config = defaultConfig as Required<ReinforcementStrategyConfig>;
  }

  /**
   * 执行强化学习进化
   * @param context 策略上下文
   */
  async execute(context: StrategyContext): Promise<StrategyResult> {
    const startTime = Date.now();

    try {
      // 获取当前状态
      const currentState = this.getStateFromContext(context);

      // 选择动作
      const action = this.selectAction(currentState);

      // 执行动作并获取奖励
      const { newState, reward } = this.executeAction(action, context);

      // 更新Q表
      if (this.lastState) {
        this.updateQTable(this.lastState, this.lastAction, reward, currentState);
      }

      // 生成变异
      const mutations = this.generateMutations(action, context);

      // 衰减探索率
      this.config.qLearning.epsilon = Math.max(
        this.config.qLearning.minEpsilon,
        this.config.qLearning.epsilon * this.config.qLearning.epsilonDecay
      );

      // 更新状态
      this.lastState = currentState;
      this.lastAction = action;

      return {
        success: mutations.length > 0,
        newState: {
          ...context.currentState,
          fitness: newState.fitness,
        },
        mutations,
        fitnessDelta: newState.fitness - ((context.currentState.fitness as number) ?? 0.5),
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
      {
        type: StrategyConditionType.HISTORY_LENGTH,
        params: { min: 20 },
      },
      {
        type: StrategyConditionType.ERROR_RATE,
        params: { max: 0.2 },
      },
    ];
  }

  /**
   * 从上下文获取状态
   */
  private getStateFromContext(context: StrategyContext): string {
    const fitness = (context.currentState.fitness as number) ?? 0.5;
    const historyLen = context.history.length;

    // 离散化适应度
    const fitnessBin = Math.floor(fitness * 10);
    const historyBin = Math.min(Math.floor(historyLen / 10), 9);

    return `f${fitnessBin}_h${historyBin}`;
  }

  /**
   * 选择动作（ε-greedy策略）
   */
  private selectAction(state: string): string {
    // 探索
    if (Math.random() < this.config.qLearning.epsilon) {
      return this.actionSpace[Math.floor(Math.random() * this.actionSpace.length)];
    }

    // 利用
    return this.getBestAction(state);
  }

  /**
   * 获取最佳动作
   */
  private getBestAction(state: string): string {
    let bestAction = 'no_op';
    let bestQValue = -Infinity;

    for (const action of this.config.actionSpace) {
      const entry = this.qTable.get(`${state}_${action}`);
      const qValue = entry?.qValue ?? 0;

      if (qValue > bestQValue) {
        bestQValue = qValue;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * 执行动作
   */
  private executeAction(
    action: string,
    context: StrategyContext
  ): { newState: Record<string, unknown>; reward: number } {
    const currentFitness = (context.currentState.fitness as number) ?? 0.5;
    let newFitness = currentFitness;
    const delta: Record<string, unknown> = {};

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
        // 不做改变
        break;
    }

    newFitness = Math.max(0, Math.min(1, newFitness));

    // 计算奖励
    const reward = newFitness - currentFitness;

    return {
      newState: {
        ...context.currentState,
        fitness: newFitness,
        ...delta,
      },
      reward,
    };
  }

  /**
   * 更新Q表
   */
  private updateQTable(
    state: string,
    action: string,
    reward: number,
    nextState: string
  ): void {
    const key = `${state}_${action}`;
    const entry = this.qTable.get(key) ?? {
      state,
      action,
      qValue: 0,
      visitCount: 0,
    };

    // 计算最大Q值
    const maxNextQ = Math.max(
      ...this.config.actionSpace.map(a => {
        const nextEntry = this.qTable.get(`${nextState}_${a}`);
        return nextEntry?.qValue ?? 0;
      }),
      0
    );

    // Q-Learning 更新
    const qLearning = this.config.qLearning;
    entry.qValue = entry.qValue + qLearning.learningRate * (
      reward + qLearning.discountFactor * maxNextQ - entry.qValue
    );
    entry.visitCount++;

    this.qTable.set(key, entry);
  }

  /**
   * 生成变异
   */
  private generateMutations(
    action: string,
    context: StrategyContext
  ): EvolutionMutation[] {
    const mutations: EvolutionMutation[] = [];

    switch (action) {
      case 'increase_trait':
        mutations.push(
          this.createMutation(
            MutationType.TRAIT,
            'personality.fitness',
            context.currentState.fitness,
            Math.min(1, ((context.currentState.fitness as number) ?? 0.5) + 0.05),
            0.1
          )
        );
        break;

      case 'decrease_trait':
        mutations.push(
          this.createMutation(
            MutationType.TRAIT,
            'personality.fitness',
            context.currentState.fitness,
            Math.max(0, ((context.currentState.fitness as number) ?? 0.5) - 0.03),
            0.08
          )
        );
        break;

      case 'modify_behavior':
        mutations.push(
          this.createMutation(
            MutationType.BEHAVIOR,
            'behavior.pattern',
            context.currentState.behavior?.pattern,
            `pattern_${Date.now()}`,
            0.1
          )
        );
        break;

      case 'adjust_param':
        mutations.push(
          this.createMutation(
            MutationType.PARAMETER,
            'param.learningRate',
            context.currentState.learningRate,
            ((context.currentState.learningRate as number) ?? 0.1) * 1.1,
            0.05
          )
        );
        break;
    }

    return mutations.slice(0, this.config.maxMutations);
  }

  /**
   * 获取Q表统计
   */
  getQTableStats(): {
    totalEntries: number;
    mostVisitedAction: string;
    bestAction: string;
    averageQValue: number;
  } {
    const actionCounts = new Map<string, number>();
    const actionQValues = new Map<string, number[]>();

    for (const entry of this.qTable.values()) {
      const count = actionCounts.get(entry.action) ?? 0;
      actionCounts.set(entry.action, count + entry.visitCount);

      const values = actionQValues.get(entry.action) ?? [];
      values.push(entry.qValue);
      actionQValues.set(entry.action, values);
    }

    let mostVisitedAction = '';
    let maxCount = 0;
    for (const [action, count] of actionCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostVisitedAction = action;
      }
    }

    let bestAction = '';
    let maxAvgQ = -Infinity;
    for (const [action, values] of actionQValues) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > maxAvgQ) {
        maxAvgQ = avg;
        bestAction = action;
      }
    }

    const allQValues = Array.from(this.qTable.values()).map(e => e.qValue);
    const avgQ = allQValues.length > 0
      ? allQValues.reduce((a, b) => a + b, 0) / allQValues.length
      : 0;

    return {
      totalEntries: this.qTable.size,
      mostVisitedAction,
      bestAction,
      averageQValue: avgQ,
    };
  }

  /**
   * 保存Q表
   */
  saveQTable(): Array<{ state: string; action: string; qValue: number; visitCount: number }> {
    return Array.from(this.qTable.values()).map(entry => ({
      state: entry.state,
      action: entry.action,
      qValue: entry.qValue,
      visitCount: entry.visitCount,
    }));
  }

  /**
   * 加载Q表
   */
  loadQTable(data: Array<{ state: string; action: string; qValue: number; visitCount: number }>): void {
    this.qTable.clear();
    for (const entry of data) {
      this.qTable.set(`${entry.state}_${entry.action}`, entry);
    }
  }
}
