/**
 * 核心模块导出
 * Core Module - Index
 */

export {
  TaijiFramework,
  createTaijiFramework,
  type TaijiFrameworkConfig,
} from './OpenTaijiFramework';

// 心跳模块
export {
  HeartbeatManager,
  HeartbeatChecker,
  HeartbeatScheduler,
  CheckerContext,
  CheckItem,
  CheckResult,
  CheckSeverity,
  CheckStatus,
  HeartbeatOptions,
  HeartbeatStats,
  DEFAULT_CHECK_OPTIONS,
  createPersonaComplianceChecker,
  createToolCallChecker,
  createMemoryPollutionChecker,
  createTaskCompletionChecker,
  createSystemHealthChecker,
  createAllBuiltinCheckers,
} from './heartbeat';


// Context Engine - 核心上下文引擎
export {
  // 核心引擎
  ContextEngine,
  createContextEngine,
  createFullContextEngine,
  EngineState,
  type ContextEngineEvents,
  
  // 扫描器
  ContextScanner,
  createContextScanner,
  type ScanResult,
  
  // 组装器
  ContextAssembler,
  createContextAssembler,
  type AssembleResult,
  
  // 注入器
  ContextInjector,
  createContextInjector,
  
  // 便捷函数
  createDefaultEngine,
  processWithContext,
  
  // 版本信息
  CONTEXT_ENGINE_VERSION,
  CONTEXT_ENGINE_NAME,
} from './context';
