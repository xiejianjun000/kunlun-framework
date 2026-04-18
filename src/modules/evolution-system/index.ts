/**
 * 进化系统主模块导出
 * Evolution System Module - Main Export
 */

// 核心模块
export {
  EvolutionSystem,
  createEvolutionSystem,
} from './core/EvolutionSystem';

export {
  EvolutionEngine,
} from './core/EvolutionEngine';

export {
  EvolutionScheduler,
  type TaskStatus,
} from './core/EvolutionScheduler';

export {
  type EvolutionSchedulerConfig,
} from './core/types';

export {
  EvolutionLogger,
  LogLevel,
  type EvolutionLogEntry,
  type EvolutionLoggerConfig,
  type LogQuery,
  type LogStats,
} from './core/EvolutionLogger';

// 奖励模型
export {
  RewardModel,
  CompositeRewardModel,
  type RewardModelConfig,
} from './rewards/RewardModel';

export {
  TaskSuccessReward,
  type TaskSuccessRewardConfig,
} from './rewards/TaskSuccessReward';

export {
  UserFeedbackReward,
  type UserFeedbackRewardConfig,
} from './rewards/UserFeedbackReward';

export {
  EvolutionaryReward,
  type EvolutionaryRewardConfig,
} from './rewards/EvolutionaryReward';

// 进化策略
export {
  EvolutionStrategy,
  type EvolutionStrategyConfig,
} from './strategies/EvolutionStrategy';

// 向后兼容别名
export {
  LLMEnhancedGeneticStrategy as GeneticStrategy,
  LLMEnhancedReinforcementStrategy as ReinforcementStrategy,
  LLMEnhancedGradientStrategy as GradientStrategy,
} from './strategies';

// 特质管理
export {
  TraitManager,
  type TraitManagerConfig,
} from './traits/TraitManager';

export {
  TraitMutator,
  type TraitMutatorConfig,
} from './traits/TraitMutator';

export {
  TraitValidator,
  type TraitValidatorConfig,
} from './traits/TraitValidator';

export * from './traits/types';

// 历史记录
export {
  EvolutionHistory,
} from './history/EvolutionHistory';

export {
  EvolutionAnalyzer,
  type EvolutionAnalyzerConfig,
} from './history/EvolutionAnalyzer';

// 接口定义
export * from './interfaces';

// 版本信息
export const EVOLUTION_SYSTEM_VERSION = '1.0.0';
export const EVOLUTION_SYSTEM_NAME = 'Taiji Evolution System';
