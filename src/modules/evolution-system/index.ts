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
  type EvolutionSchedulerConfig,
} from './core/EvolutionScheduler';

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

export {
  GeneticStrategy,
  type GeneticStrategyConfig,
} from './strategies/GeneticStrategy';

export {
  ReinforcementStrategy,
  type ReinforcementStrategyConfig,
} from './strategies/ReinforcementStrategy';

export {
  GradientStrategy,
  type GradientStrategyConfig,
} from './strategies/GradientStrategy';

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
