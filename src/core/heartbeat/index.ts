/**
 * 心跳模块导出
 * Heartbeat Module - Index
 */

// 核心类
export { HeartbeatManager } from './HeartbeatManager';
export { HeartbeatChecker, CheckerContext } from './HeartbeatChecker';
export { HeartbeatScheduler } from './HeartbeatScheduler';

// 接口和类型
export {
  CheckItem,
  CheckResult,
  CheckSeverity,
  CheckStatus,
  HeartbeatOptions,
  HeartbeatStats,
  CheckItemConfig,
  DEFAULT_CHECK_OPTIONS,
} from './CheckItem';

// 内置检查器
export {
  createPersonaComplianceChecker,
  createToolCallChecker,
  createMemoryPollutionChecker,
  createTaskCompletionChecker,
  createSystemHealthChecker,
  createAllBuiltinCheckers,
} from './checkers/BuiltinCheckers';

// 默认实例
import { HeartbeatManager } from './HeartbeatManager';
import { HeartbeatChecker } from './HeartbeatChecker';
import { HeartbeatScheduler } from './HeartbeatScheduler';

export default {
  HeartbeatManager,
  HeartbeatChecker,
  HeartbeatScheduler,
};
