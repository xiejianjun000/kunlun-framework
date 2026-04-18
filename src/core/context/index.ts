/**
 * Context Engine - 上下文引擎
 * 
 * OpenTaiji的核心能力，连接Actor/技能/记忆系统
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

// ============== 导出所有模块 ==============

// 核心引擎
export { 
  ContextEngine, 
  createContextEngine, 
  createFullContextEngine,
  EngineState,
} from './ContextEngine';

export type { ContextEngineEvents } from './ContextEngine';

// 扫描器
export { 
  ContextScanner, 
  createContextScanner,
} from './ContextScanner';

export type { ScanResult } from './ContextScanner';

// 组装器
export { 
  ContextAssembler, 
  createContextAssembler,
} from './ContextAssembler';

export type { AssembleResult } from './ContextAssembler';

// 注入器
export { 
  ContextInjector, 
  createContextInjector,
} from './ContextInjector';

// 类型定义
export * from './types';

// ============== 便捷使用 ==============

import { ContextEngine, createContextEngine } from './ContextEngine';
import { ContextScanner, createContextScanner } from './ContextScanner';
import { ContextAssembler, createContextAssembler } from './ContextAssembler';
import { ContextInjector, createContextInjector } from './ContextInjector';
import { 
  InjectionStrategy,
  ContextEngineConfig,
  ConversationRequest,
  ProcessedContext,
  IMemorySystem,
  ISkillSystem,
  IPersonalitySystem,
  IKnowledgeBase,
} from './types';

/**
 * 创建默认配置的Context Engine
 */
export function createDefaultEngine(): ContextEngine {
  return createContextEngine({
    defaultTokenBudget: 8000,
    maxTokenBudget: 128000,
    memorySearchLimit: 10,
    skillSearchLimit: 5,
    minRelevanceThreshold: 0.3,
    defaultInjectionStrategy: InjectionStrategy.SEQUENTIAL,
    priorityWeights: {
      memory: 0.3,
      skill: 0.25,
      personality: 0.15,
      knowledge: 0.2,
      history: 0.1,
    },
    enablePersonality: true,
    enableKnowledge: true,
    enableHistory: true,
    historyMessageLimit: 10,
  });
}

/**
 * 快速处理请求
 */
export async function processWithContext(
  request: ConversationRequest,
  config?: {
    memorySystem?: IMemorySystem;
    skillSystem?: ISkillSystem;
    personalitySystem?: IPersonalitySystem;
    knowledgeBase?: IKnowledgeBase;
    engineConfig?: ContextEngineConfig;
  }
): Promise<ProcessedContext> {
  const engine = createContextEngine(config?.engineConfig);

  if (config?.memorySystem) engine.bindMemorySystem(config.memorySystem);
  if (config?.skillSystem) engine.bindSkillSystem(config.skillSystem);
  if (config?.personalitySystem) engine.bindPersonalitySystem(config.personalitySystem);
  if (config?.knowledgeBase) engine.bindKnowledgeBase(config.knowledgeBase);

  await engine.initialize();
  
  try {
    return await engine.processRequest(request);
  } finally {
    await engine.destroy();
  }
}

// ============== 版本信息 ==============

export const CONTEXT_ENGINE_VERSION = '1.0.0';
export const CONTEXT_ENGINE_NAME = 'OpenTaiji Context Engine';
