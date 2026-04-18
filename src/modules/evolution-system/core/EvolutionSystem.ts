/**
 * 进化系统主类
 * Evolution System - Main Class
 */

import { EventEmitter } from 'events';
import {
  IEvolutionSystem,
  EvolutionConfig,
  EvolutionResult,
  EvolutionContext,
  EvolutionOptions,
  EvolutionStatus,
  EvolutionHistoryRecord,
  HistoryQueryOptions,
  EvolutionVersion,
  EvolutionAnalysisReport,
  Reward,
  RewardType,
  RewardContext,
  EvolutionExportData,
  EvolutionEventType,
  EvolutionEventData,
  DEFAULT_EVOLUTION_CONFIG,
  EvolutionDirection,
} from '../interfaces';
import { EvolutionEngine } from './EvolutionEngine';
import { EvolutionScheduler } from './EvolutionScheduler';
import { EvolutionLogger, EvolutionLogEntry } from './EvolutionLogger';
import { EvolutionHistory } from '../history/EvolutionHistory';
import { EvolutionAnalyzer } from '../history/EvolutionAnalyzer';
import { EvolutionaryReward } from '../rewards/EvolutionaryReward';
import { LLMEnhancedReward } from '../rewards/LLMEnhancedReward';
import { LLMOptimizer, LLMOptimizerConfig } from './LLMOptimizer';

/** 进化系统状态 */
interface EvolutionSystemState {
  status: EvolutionStatus;
  currentEvolutionId: string | null;
  currentFitness: Map<string, number>;  // key: `${userId}:${tenantId}`
  config: Map<string, EvolutionConfig>;  // key: `${userId}:${tenantId}`
}

/** 进化系统配置 */
export interface EvolutionSystemConfig {
  /** LLM优化器配置 */
  llmOptimizer?: Partial<LLMOptimizerConfig>;
  /** 是否使用LLM增强 */
  useLLMEnhancement?: boolean;
}

/**
 * 进化系统主类
 * 负责管理整个进化流程，包括调度、引擎、奖励和历史记录
 */
export class EvolutionSystem implements IEvolutionSystem {
  private readonly engine: EvolutionEngine;
  private readonly scheduler: EvolutionScheduler;
  private readonly logger: EvolutionLogger;
  private readonly history: EvolutionHistory;
  private readonly analyzer: EvolutionAnalyzer;
  private readonly baseRewardModel: EvolutionaryReward;
  private readonly llmRewardModel: LLMEnhancedReward;
  private readonly llmOptimizer: LLMOptimizer;
  private readonly eventEmitter: EventEmitter;
  private readonly state: EvolutionSystemState;
  private isInitialized: boolean = false;
  private useLLMEnhancement: boolean = true;

  /**
   * 构造函数
   * @param storageAdapter 存储适配器（可选）
   * @param config 系统配置（可选）
   */
  constructor(storageAdapter?: unknown, config?: EvolutionSystemConfig) {
    this.engine = new EvolutionEngine();
    this.scheduler = new EvolutionScheduler();
    this.logger = new EvolutionLogger();
    this.history = new EvolutionHistory(storageAdapter);
    this.analyzer = new EvolutionAnalyzer();
    this.baseRewardModel = new EvolutionaryReward();
    this.llmRewardModel = new LLMEnhancedReward({
      llmOptimizer: config?.llmOptimizer,
    });
    this.llmOptimizer = this.llmRewardModel.getLLMOptimizer();
    this.eventEmitter = new EventEmitter();
    this.useLLMEnhancement = config?.useLLMEnhancement ?? true;
    this.state = {
      status: EvolutionStatus.IDLE,
      currentEvolutionId: null,
      currentFitness: new Map(),
      config: new Map(),
    };
  }

  /**
   * 初始化进化系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.history.initialize();
    
    // 检查LLM状态
    if (this.llmOptimizer.isAvailable()) {
      this.logger.info('EvolutionSystem initialized with LLM enhancement');
    } else {
      this.logger.warn('EvolutionSystem initialized without LLM - using fallback mode');
    }
    
    this.isInitialized = true;
  }

  /**
   * 检查LLM是否可用
   */
  isLLMAvailable(): boolean {
    return this.llmOptimizer.isAvailable();
  }

  /**
   * 获取进化引擎统计
   */
  getEvolutionStats(): {
    totalEvolutions: number;
    successfulEvolutions: number;
    averageFitnessImprovement: number;
    llmEnhancementUsage: number;
    strategyUsage: Record<string, number>;
  } {
    return this.engine.getStats();
  }

  /**
   * 配置LLM增强
   * @param enabled 是否启用LLM增强
   */
  configureLLMEnhancement(enabled: boolean): void {
    this.useLLMEnhancement = enabled && this.llmOptimizer.isAvailable();
    this.logger.info(`LLM enhancement ${this.useLLMEnhancement ? 'enabled' : 'disabled'}`);
  }

  /**
   * 检查系统是否运行中
   */
  isRunning(): boolean {
    return this.state.status === EvolutionStatus.RUNNING;
  }

  /**
   * 执行单次进化
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param options 进化选项
   */
  async evolve(
    userId: string,
    tenantId: string,
    options?: EvolutionOptions
  ): Promise<EvolutionResult> {
    const startTime = Date.now();
    const evolutionId = this.generateEvolutionId();

    this.logger.info(`Starting evolution ${evolutionId} for user ${userId}`);

    // 构建进化上下文
    const context = await this.buildEvolutionContext(userId, tenantId, options);

    // 触发事件
    this.emitEvent(EvolutionEventType.EVOLUTION_START, {
      userId,
      tenantId,
      evolutionId,
    });

    try {
      this.state.status = EvolutionStatus.RUNNING;
      this.state.currentEvolutionId = evolutionId;

      // 计算奖励（使用LLM增强或基础奖励模型）
      const rewards = await this.calculateRewards(context);

      // 执行进化
      const result = await this.engine.evolve(context, rewards, options);

      // 更新状态
      await this.updateEvolutionState(userId, tenantId, result);

      // 记录历史
      await this.recordEvolution(userId, tenantId, evolutionId, context, result, rewards);

      // 触发事件
      if (result.success) {
        this.emitEvent(EvolutionEventType.EVOLUTION_COMPLETE, {
          userId,
          tenantId,
          evolutionId,
          data: { result },
        });

        if (result.fitnessScore > context.currentFitness) {
          this.emitEvent(EvolutionEventType.FITNESS_IMPROVED, {
            userId,
            tenantId,
            evolutionId,
            data: { improvement: result.improvement },
          });
        }
      } else {
        this.emitEvent(EvolutionEventType.EVOLUTION_FAILED, {
          userId,
          tenantId,
          evolutionId,
          data: { error: result.error },
        });
      }

      this.logger.info(
        `Evolution ${evolutionId} completed: success=${result.success}, fitness=${result.fitnessScore}`
      );

      return {
        ...result,
        evolutionId,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Evolution ${evolutionId} failed: ${errorMessage}`);

      this.emitEvent(EvolutionEventType.EVOLUTION_FAILED, {
        userId,
        tenantId,
        evolutionId,
        data: { error: errorMessage },
      });

      return {
        evolutionId,
        success: false,
        fitnessScore: context.currentFitness,
        improvement: 0,
        mutations: [],
        executionTime: Date.now() - startTime,
        error: errorMessage,
      };
    } finally {
      this.state.status = EvolutionStatus.IDLE;
      this.state.currentEvolutionId = null;
    }
  }

  /**
   * 批量进化
   * @param userIds 用户ID列表
   * @param tenantId 租户ID
   * @param options 进化选项
   */
  async batchEvolve(
    userIds: string[],
    tenantId: string,
    options?: EvolutionOptions
  ): Promise<EvolutionResult[]> {
    const results: EvolutionResult[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.evolve(userId, tenantId, options);
        results.push(result);
      } catch (error) {
        results.push({
          evolutionId: this.generateEvolutionId(),
          success: false,
          fitnessScore: 0,
          improvement: 0,
          mutations: [],
          executionTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 获取进化历史
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param options 查询选项
   */
  async getHistory(
    userId: string,
    tenantId: string,
    options?: HistoryQueryOptions
  ): Promise<EvolutionHistoryRecord[]> {
    return this.history.query(userId, tenantId, options);
  }

  /**
   * 获取当前适应度
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getCurrentFitness(userId: string, tenantId: string): Promise<number> {
    const key = `${userId}:${tenantId}`;
    return this.state.currentFitness.get(key) ?? 0.5;
  }

  /**
   * 获取进化状态
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getStatus(userId: string, tenantId: string): Promise<EvolutionStatus> {
    if (this.state.currentEvolutionId) {
      return this.state.status;
    }
    return EvolutionStatus.IDLE;
  }

  /**
   * 暂停进化
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async pause(userId: string, tenantId: string): Promise<void> {
    this.state.status = EvolutionStatus.PAUSED;
    await this.scheduler.pause(userId, tenantId);
    this.logger.info(`Evolution paused for user ${userId}`);
  }

  /**
   * 恢复进化
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async resume(userId: string, tenantId: string): Promise<void> {
    this.state.status = EvolutionStatus.RUNNING;
    await this.scheduler.resume(userId, tenantId);
    this.logger.info(`Evolution resumed for user ${userId}`);
  }

  /**
   * 回滚到指定版本
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param versionId 版本ID
   */
  async rollback(userId: string, tenantId: string, versionId: string): Promise<boolean> {
    try {
      const version = await this.history.getVersion(userId, tenantId, versionId);
      if (!version) {
        return false;
      }

      // 从历史记录中恢复状态
      const historyRecord = await this.history.getHistoryByEvolutionId(
        userId,
        tenantId,
        versionId
      );
      if (!historyRecord) {
        return false;
      }

      // 更新当前适应度
      const key = `${userId}:${tenantId}`;
      this.state.currentFitness.set(key, version.fitnessScore);

      // 记录回滚历史
      await this.history.recordRollback(userId, tenantId, versionId);

      this.emitEvent(EvolutionEventType.ROLLBACK_COMPLETE, {
        userId,
        tenantId,
        data: { versionId, restoredFitness: version.fitnessScore },
      });

      this.logger.info(`Rollback completed for user ${userId} to version ${versionId}`);
      return true;
    } catch (error) {
      this.logger.error(`Rollback failed: ${error}`);
      return false;
    }
  }

  /**
   * 获取可用版本
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getVersions(userId: string, tenantId: string): Promise<EvolutionVersion[]> {
    return this.history.getVersions(userId, tenantId);
  }

  /**
   * 获取分析报告
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getAnalysisReport(userId: string, tenantId: string): Promise<EvolutionAnalysisReport> {
    const history = await this.history.query(userId, tenantId, { limit: 1000 });
    return this.analyzer.generateReport(userId, tenantId, history);
  }

  /**
   * 添加奖励
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param reward 奖励信息
   */
  async addReward(userId: string, tenantId: string, reward: Reward): Promise<void> {
    await this.history.addReward(userId, tenantId, reward);

    this.emitEvent(EvolutionEventType.REWARD_ADDED, {
      userId,
      tenantId,
      data: { reward },
    });

    this.logger.info(`Reward added for user ${userId}: type=${reward.type}, value=${reward.value}`);
  }

  /**
   * 获取奖励历史
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getRewardHistory(userId: string, tenantId: string): Promise<Reward[]> {
    return this.history.getRewards(userId, tenantId);
  }

  /**
   * 配置进化参数
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param config 配置更新
   */
  async configureEvolution(
    userId: string,
    tenantId: string,
    config: Partial<EvolutionConfig>
  ): Promise<void> {
    const key = `${userId}:${tenantId}`;
    const currentConfig = this.state.config.get(key) ?? { ...DEFAULT_EVOLUTION_CONFIG };

    const mergedConfig = { ...currentConfig, ...config };
    this.state.config.set(key, mergedConfig);

    // 持久化配置
    await this.history.saveConfig(userId, tenantId, mergedConfig);

    this.logger.info(`Evolution config updated for user ${userId}`);
  }

  /**
   * 获取当前配置
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async getConfig(userId: string, tenantId: string): Promise<EvolutionConfig> {
    const key = `${userId}:${tenantId}`;
    return this.state.config.get(key) ?? { ...DEFAULT_EVOLUTION_CONFIG };
  }

  /**
   * 导出进化数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  async exportData(userId: string, tenantId: string): Promise<EvolutionExportData> {
    const history = await this.history.query(userId, tenantId, { limit: 10000 });
    const rewards = await this.history.getRewards(userId, tenantId);
    const config = await this.getConfig(userId, tenantId);
    const fitness = await this.getCurrentFitness(userId, tenantId);

    return {
      version: '1.0.0',
      exportedAt: new Date(),
      userId,
      tenantId,
      fitness,
      config,
      history,
      rewards,
      traits: {},
    };
  }

  /**
   * 导入进化数据
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param data 导入数据
   */
  async importData(userId: string, tenantId: string, data: EvolutionExportData): Promise<boolean> {
    try {
      // 导入历史记录
      for (const record of data.history) {
        await this.history.record(userId, tenantId, record);
      }

      // 导入奖励
      for (const reward of data.rewards) {
        await this.history.addReward(userId, tenantId, reward);
      }

      // 导入配置
      await this.configureEvolution(userId, tenantId, data.config);

      // 更新适应度
      const key = `${userId}:${tenantId}`;
      this.state.currentFitness.set(key, data.fitness);

      this.logger.info(`Data imported for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Data import failed: ${error}`);
      return false;
    }
  }

  /**
   * 订阅进化事件
   * @param event 事件类型
   * @param handler 事件处理器
   */
  on(event: EvolutionEventType, handler: (data: EvolutionEventData) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * 取消订阅
   * @param event 事件类型
   * @param handler 事件处理器
   */
  off(event: EvolutionEventType, handler: (data: EvolutionEventData) => void): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * 启动定时调度
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  startScheduler(userId: string, tenantId: string): void {
    this.scheduler.schedule(userId, tenantId, async () => {
      await this.evolve(userId, tenantId);
    });
  }

  /**
   * 停止定时调度
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  stopScheduler(userId: string, tenantId: string): void {
    this.scheduler.cancel(userId, tenantId);
  }

  /**
   * 获取调度器状态
   */
  getSchedulerStatus(): { running: number; paused: number } {
    return this.scheduler.getStatus();
  }

  /**
   * 获取日志条目
   * @param limit 限制数量
   */
  getLogs(limit?: number): EvolutionLogEntry[] {
    return this.logger.getEntries(limit);
  }

  // ============== 私有方法 ==============

  /**
   * 计算奖励
   * 根据配置选择LLM增强或基础奖励模型
   */
  private async calculateRewards(context: RewardContext): Promise<{ type: RewardType; value: number }[]> {
    if (this.useLLMEnhancement && this.llmRewardModel.isLLMAvailable()) {
      try {
        const result = await this.llmRewardModel.calculateDetailed(context);
        return [{
          type: result.type,
          value: result.value,
        }];
      } catch (error) {
        this.logger.warn(`LLM reward calculation failed, falling back to base model: ${error}`);
      }
    }
    
    // 使用基础奖励模型
    try {
      const result = await this.baseRewardModel.calculate(context);
      return [{
        type: RewardType.TASK_SUCCESS,
        value: result,
      }];
    } catch {
      return [{
        type: RewardType.TASK_SUCCESS,
        value: 0,
      }];
    }
  }

  /**
   * 构建进化上下文
   */
  private async buildEvolutionContext(
    userId: string,
    tenantId: string,
    options?: EvolutionOptions
  ): Promise<EvolutionContext> {
    const key = `${userId}:${tenantId}`;
    const config = this.state.config.get(key) ?? { ...DEFAULT_EVOLUTION_CONFIG };
    const currentFitness = await this.getCurrentFitness(userId, tenantId);
    const history = await this.history.query(userId, tenantId, { limit: 100 });

    return {
      userId,
      tenantId,
      currentFitness,
      targetFitness: options?.targetFitness,
      direction: options?.direction ?? EvolutionDirection.BALANCED,
      constraints: [],
      historyCount: history.length,
      metadata: options?.metadata ?? {},
    };
  }

  /**
   * 更新进化状态
   */
  private async updateEvolutionState(
    userId: string,
    tenantId: string,
    result: EvolutionResult
  ): Promise<void> {
    const key = `${userId}:${tenantId}`;
    if (result.success) {
      this.state.currentFitness.set(key, result.fitnessScore);
    }
  }

  /**
   * 记录进化历史
   */
  private async recordEvolution(
    userId: string,
    tenantId: string,
    evolutionId: string,
    context: EvolutionContext,
    result: EvolutionResult,
    rewards: { type: RewardType; value: number }[]
  ): Promise<void> {
    const record: EvolutionHistoryRecord = {
      recordId: this.generateRecordId(),
      userId,
      tenantId,
      evolutionId,
      triggerType: context.metadata?.triggerType as any ?? 'manual',
      triggeredAt: new Date(Date.now() - result.executionTime),
      startedAt: new Date(Date.now() - result.executionTime),
      completedAt: new Date(),
      status: result.success ? EvolutionStatus.COMPLETED : EvolutionStatus.FAILED,
      fitnessScore: result.fitnessScore,
      fitnessDelta: result.improvement,
      mutationCount: result.mutations.length,
      rewards: {
        taskSuccess: rewards.find(r => r.type === RewardType.TASK_SUCCESS)?.value ?? 0,
        userFeedback: rewards.filter(r => r.type.toString().includes('feedback')).reduce((sum, r) => sum + r.value, 0),
        evolutionary: rewards.filter(r => r.type.toString().includes('bonus')).reduce((sum, r) => sum + r.value, 0),
        penalties: rewards.filter(r => r.type.toString().includes('penalty')).reduce((sum, r) => sum + r.value, 0),
        total: rewards.reduce((sum, r) => sum + r.value, 0),
      },
      metadata: {},
    };

    await this.history.record(userId, tenantId, record);
  }

  /**
   * 触发事件
   */
  private emitEvent(type: EvolutionEventType, data: Partial<EvolutionEventData>): void {
    this.eventEmitter.emit(type, {
      type,
      timestamp: new Date(),
      ...data,
    } as EvolutionEventData);
  }

  /**
   * 生成进化ID
   */
  private generateEvolutionId(): string {
    return `evo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成记录ID
   */
  private generateRecordId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 工厂函数：创建进化系统实例
 */
export function createEvolutionSystem(
  storageAdapter?: unknown,
  config?: EvolutionSystemConfig
): EvolutionSystem {
  return new EvolutionSystem(storageAdapter, config);
}
