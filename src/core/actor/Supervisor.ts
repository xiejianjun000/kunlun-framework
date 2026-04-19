/**
 * OpenTaiji Actor System - Supervisor监督策略
 * 实现容错和恢复机制
 */

import {
  SupervisorStrategyType,
  SupervisorDirective,
  RestartDecision,
  ActorFailureStats,
  ActorRef
} from './types';

export { RestartDecision };

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 10;

/** 默认时间窗口（秒） */
const DEFAULT_WITHIN_TIME_RANGE = 30;

/**
 * OneForOne 监督策略
 * 只影响失败的子Actor
 */
export class OneForOneSupervisorStrategy implements SupervisorStrategy {
  readonly type = SupervisorStrategyType.OneForOne;
  
  private readonly maxRetries: number;
  private readonly withinTimeRange: number;
  private readonly decider: (cause: Error) => RestartDecision;
  private failureStats: Map<string, ActorFailureStats> = new Map();
  
  constructor(
    decider?: (cause: Error) => RestartDecision,
    maxRetries: number = DEFAULT_MAX_RETRIES,
    withinTimeRange: number = DEFAULT_WITHIN_TIME_RANGE
  ) {
    this.decider = decider || (() => RestartDecision.Restart);
    this.maxRetries = maxRetries;
    this.withinTimeRange = withinTimeRange;
  }
  
  handleFailure(
    child: ActorRef<unknown>,
    cause: Error,
    stats: ActorFailureStats
  ): SupervisorDirective {
    const childPath = child.path.toString();
    const currentStats = this.getStats(child) || this.createInitialStats(child);
    
    const now = Date.now();
    const windowStart = now - (this.withinTimeRange * 1000);
    
    let failureCount = currentStats.failureCount;
    let firstFailureTime = currentStats.firstFailureTime;
    
    if (currentStats.lastFailureTime > windowStart) {
      failureCount++;
    } else {
      failureCount = 1;
      firstFailureTime = now;
    }
    
    this.updateStats(child, {
      ...currentStats,
      failureCount,
      firstFailureTime,
      lastFailureTime: now,
      lastCause: cause
    });
    
    if (failureCount > this.maxRetries) {
      return {
        decision: RestartDecision.Stop,
        maxRetries: this.maxRetries,
        withinTimeRange: this.withinTimeRange
      };
    }
    
    const decision = this.decider(cause);
    return {
      decision,
      maxRetries: this.maxRetries,
      withinTimeRange: this.withinTimeRange
    };
  }
  
  getStats(child: ActorRef<unknown>): ActorFailureStats | undefined {
    return this.failureStats.get(child.path.toString());
  }
  
  private createInitialStats(child: ActorRef<unknown>): ActorFailureStats {
    return {
      actorPath: child.path,
      failureCount: 0,
      firstFailureTime: Date.now(),
      lastFailureTime: 0,
      lastCause: undefined
    };
  }
  
  private updateStats(child: ActorRef<unknown>, stats: ActorFailureStats): void {
    this.failureStats.set(child.path.toString(), stats);
  }
  
  static defaultStrategy(): OneForOneSupervisorStrategy {
    return new OneForOneSupervisorStrategy(
      (cause: Error) => {
        if (cause.message?.includes('fatal') || cause.name === 'FatalError') {
          return RestartDecision.Stop;
        }
        return RestartDecision.Restart;
      }
    );
  }
  
  static stopStrategy(): OneForOneSupervisorStrategy {
    return new OneForOneSupervisorStrategy(
      () => RestartDecision.Stop,
      0
    );
  }
  
  static resumeStrategy(): OneForOneSupervisorStrategy {
    return new OneForOneSupervisorStrategy(
      () => RestartDecision.Resume,
      Infinity
    );
  }
}

/**
 * AllForOne 监督策略
 * 影响所有子Actor，无论哪个失败
 */
export class AllForOneSupervisorStrategy implements SupervisorStrategy {
  readonly type = SupervisorStrategyType.AllForOne;
  
  private readonly maxRetries: number;
  private readonly withinTimeRange: number;
  private readonly decider: (cause: Error) => RestartDecision;
  private failureStats: Map<string, ActorFailureStats> = new Map();
  private parentGroupStats: Map<string, {
    failureCount: number;
    firstFailureTime: number;
    lastFailureTime: number;
    lastCause: Error | undefined;
  }> = new Map();
  
  constructor(
    decider?: (cause: Error) => RestartDecision,
    maxRetries: number = DEFAULT_MAX_RETRIES,
    withinTimeRange: number = DEFAULT_WITHIN_TIME_RANGE
  ) {
    this.decider = decider || (() => RestartDecision.Restart);
    this.maxRetries = maxRetries;
    this.withinTimeRange = withinTimeRange;
  }
  
  handleFailure(
    child: ActorRef<unknown>,
    cause: Error,
    stats: ActorFailureStats
  ): SupervisorDirective {
    const parentPath = child.path.parent()?.toString() || '';
    const now = Date.now();
    const windowStart = now - (this.withinTimeRange * 1000);
    
    let groupStats = this.parentGroupStats.get(parentPath) || {
      failureCount: 0,
      firstFailureTime: now,
      lastFailureTime: 0,
      lastCause: undefined
    };
    
    if (groupStats.lastFailureTime > windowStart) {
      groupStats.failureCount++;
    } else {
      groupStats.failureCount = 1;
      groupStats.firstFailureTime = now;
    }
    
    groupStats.lastFailureTime = now;
    groupStats.lastCause = cause;
    
    this.parentGroupStats.set(parentPath, groupStats);
    
    this.updateStats(child, {
      ...stats,
      failureCount: groupStats.failureCount,
      lastFailureTime: now,
      lastCause: cause
    });
    
    if (groupStats.failureCount > this.maxRetries) {
      return {
        decision: RestartDecision.Stop,
        maxRetries: this.maxRetries,
        withinTimeRange: this.withinTimeRange
      };
    }
    
    const decision = this.decider(cause);
    return {
      decision,
      maxRetries: this.maxRetries,
      withinTimeRange: this.withinTimeRange
    };
  }
  
  getStats(child: ActorRef<unknown>): ActorFailureStats | undefined {
    return this.failureStats.get(child.path.toString());
  }
  
  getGroupStats(parentPath: string): {
    failureCount: number;
    firstFailureTime: number;
    lastFailureTime: number;
    lastCause: Error | undefined;
  } | undefined {
    return this.parentGroupStats.get(parentPath);
  }
  
  private updateStats(child: ActorRef<unknown>, stats: ActorFailureStats): void {
    this.failureStats.set(child.path.toString(), stats);
  }
  
  static defaultStrategy(): AllForOneSupervisorStrategy {
    return new AllForOneSupervisorStrategy(
      (cause: Error) => {
        if (cause.message?.includes('fatal') || cause.name === 'FatalError') {
          return RestartDecision.Stop;
        }
        return RestartDecision.Restart;
      }
    );
  }
  
  static stopStrategy(): AllForOneSupervisorStrategy {
    return new AllForOneSupervisorStrategy(
      () => RestartDecision.Stop,
      0
    );
  }
}

/**
 * 自定义监督策略
 */
export class CustomSupervisorStrategy implements SupervisorStrategy {
  readonly type = SupervisorStrategyType.Custom;
  
  constructor(
    private handler: (
      child: ActorRef<unknown>,
      cause: Error,
      stats: ActorFailureStats
    ) => SupervisorDirective,
    private statsGetter?: (child: ActorRef<unknown>) => ActorFailureStats | undefined
  ) {}
  
  handleFailure(
    child: ActorRef<unknown>,
    cause: Error,
    stats: ActorFailureStats
  ): SupervisorDirective {
    return this.handler(child, cause, stats);
  }
  
  getStats(child: ActorRef<unknown>): ActorFailureStats | undefined {
    return this.statsGetter?.(child);
  }
}

/**
 * 监督策略工厂
 */
export class SupervisorStrategyFactory {
  static oneForOne(
    decider?: (cause: Error) => RestartDecision,
    maxRetries?: number,
    withinTimeRange?: number
  ): OneForOneSupervisorStrategy {
    return new OneForOneSupervisorStrategy(decider, maxRetries, withinTimeRange);
  }
  
  static allForOne(
    decider?: (cause: Error) => RestartDecision,
    maxRetries?: number,
    withinTimeRange?: number
  ): AllForOneSupervisorStrategy {
    return new AllForOneSupervisorStrategy(decider, maxRetries, withinTimeRange);
  }
  
  static custom(
    handler: (
      child: ActorRef<unknown>,
      cause: Error,
      stats: ActorFailureStats
    ) => SupervisorDirective
  ): CustomSupervisorStrategy {
    return new CustomSupervisorStrategy(handler);
  }
}

// ==================== 预设的监督策略 ====================

export const defaultSupervisorStrategy = OneForOneSupervisorStrategy.defaultStrategy();
export const stopAllStrategy = AllForOneSupervisorStrategy.stopStrategy();
export const stopOneStrategy = OneForOneSupervisorStrategy.stopStrategy();

/**
 * 监督策略接口
 */
export interface SupervisorStrategy {
  readonly type: SupervisorStrategyType;
  
  handleFailure(
    child: ActorRef<unknown>,
    cause: Error,
    stats: ActorFailureStats
  ): SupervisorDirective;
  
  getStats(child: ActorRef<unknown>): ActorFailureStats | undefined;
}
