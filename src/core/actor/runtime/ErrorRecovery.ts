/**
 * OpenTaiji Actor Runtime - 错误处理与恢复机制
 * 实现容错、重试、回退等高级功能
 */

import {
  ActorRef,
  ActorState,
  RestartDecision,
  ActorFailureStats,
  Envelope,
  Message
} from './types';

/** 错误分类 */
export enum ErrorClassification {
  Recoverable = 'recoverable',
  Transient = 'transient',
  Permanent = 'permanent',
  Fatal = 'fatal'
}

/** 错误上下文 */
export interface ErrorContext {
  actorPath: string;
  actorId: string;
  message?: Message;
  timestamp: number;
  error: Error;
  classification: ErrorClassification;
  previousFailures: number;
}

/** 回退策略配置 */
export interface BackoffConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
}

/** 重试状态 */
export interface RetryState {
  attemptNumber: number;
  lastAttemptTime: number;
  nextRetryTime: number;
  backoffMs: number;
}

/** 默认回退配置 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelay: 100,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true
};

/** 回退计算器 */
export class BackoffCalculator {
  private config: BackoffConfig;

  constructor(config: Partial<BackoffConfig> = {}) {
    this.config = { ...DEFAULT_BACKOFF_CONFIG, ...config };
  }

  /** 计算下一次重试的延迟 */
  calculate(attemptNumber: number): number {
    let delay = this.config.initialDelay * Math.pow(this.config.multiplier, attemptNumber - 1);
    
    // 应用最大延迟限制
    delay = Math.min(delay, this.config.maxDelay);
    
    // 添加抖动
    if (this.config.jitter) {
      const jitterFactor = 0.5 + Math.random() * 0.5; // 0.5 - 1.0
      delay = delay * jitterFactor;
    }
    
    return Math.floor(delay);
  }

  /** 重置状态 */
  reset(): void {
    // 无状态实现
  }
}

/** 错误分类器 */
export class ErrorClassifier {
  /** 对错误进行分类 */
  classify(error: Error, context?: Partial<ErrorContext>): ErrorClassification {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    // 致命错误
    if (
      name.includes('fatal') ||
      name.includes('critical') ||
      message.includes('fatal') ||
      message.includes('cannot recover')
    ) {
      return ErrorClassification.Fatal;
    }

    // 永久性错误（不应该重试）
    if (
      name.includes('validation') ||
      name.includes('illegalargument') ||
      message.includes('invalid') ||
      message.includes('malformed')
    ) {
      return ErrorClassification.Permanent;
    }

    // 瞬时错误（网络、超时等，应该重试）
    if (
      name.includes('timeout') ||
      name.includes('network') ||
      name.includes('connection') ||
      name.includes('econnreset') ||
      name.includes('etimedout')
    ) {
      return ErrorClassification.Transient;
    }

    // 默认归类为可恢复错误
    return ErrorClassification.Recoverable;
  }
}

/** 重试策略 */
export interface RetryPolicy {
  shouldRetry(error: Error, attemptNumber: number, context: ErrorContext): boolean;
  getMaxAttempts(): number;
  getBackoffDelay(attemptNumber: number): number;
}

/** 默认重试策略 */
export class DefaultRetryPolicy implements RetryPolicy {
  private readonly maxAttempts: number;
  private readonly backoffCalculator: BackoffCalculator;
  private readonly errorClassifier: ErrorClassifier;

  constructor(
    maxAttempts: number = 3,
    backoffConfig?: Partial<BackoffConfig>
  ) {
    this.maxAttempts = maxAttempts;
    this.backoffCalculator = new BackoffCalculator(backoffConfig);
    this.errorClassifier = new ErrorClassifier();
  }

  shouldRetry(error: Error, attemptNumber: number, context: ErrorContext): boolean {
    if (attemptNumber >= this.maxAttempts) {
      return false;
    }

    const classification = this.errorClassifier.classify(error, context);
    
    // 永久和致命错误不重试
    if (classification === ErrorClassification.Permanent) {
      return false;
    }

    if (classification === ErrorClassification.Fatal) {
      return false;
    }

    return true;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  getBackoffDelay(attemptNumber: number): number {
    return this.backoffCalculator.calculate(attemptNumber);
  }
}

/** 恢复策略处理器 */
export interface RecoveryHandler {
  canHandle(error: Error): boolean;
  handle(error: Error, context: ErrorContext): Promise<RecoveryResult>;
}

/** 恢复结果 */
export interface RecoveryResult {
  success: boolean;
  decision: RestartDecision;
  retryAttempt?: number;
  nextAction?: 'retry' | 'escalate' | 'stop' | 'resume';
  delayMs?: number;
  error?: Error;
}

/** Actor恢复器 */
export class ActorRecoveryHandler {
  private handlers: Map<string, RecoveryHandler> = new Map();
  private retryPolicy: RetryPolicy;

  constructor(retryPolicy?: RetryPolicy) {
    this.retryPolicy = retryPolicy || new DefaultRetryPolicy();
  }

  /** 注册恢复处理器 */
  registerHandler(name: string, handler: RecoveryHandler): void {
    this.handlers.set(name, handler);
  }

  /** 设置重试策略 */
  setRetryPolicy(policy: RetryPolicy): void {
    this.retryPolicy = policy;
  }

  /** 尝试恢复Actor */
  async attemptRecovery(
    error: Error,
    context: ErrorContext,
    retryState?: RetryState
  ): Promise<RecoveryResult> {
    const attemptNumber = retryState?.attemptNumber ?? 1;

    // 检查是否可以重试
    if (!this.retryPolicy.shouldRetry(error, attemptNumber, context)) {
      return {
        success: false,
        decision: RestartDecision.Stop,
        nextAction: 'stop'
      };
    }

    // 查找适用的处理器
    for (const [, handler] of Array.from(this.handlers.entries())) {
      if (handler.canHandle(error)) {
        const result = await handler.handle(error, context);
        if (result.success) {
          const delay = this.retryPolicy.getBackoffDelay(attemptNumber);
          return {
            ...result,
            retryAttempt: attemptNumber,
            delayMs: delay
          };
        }
      }
    }

    // 默认处理：重试
    const classification = new ErrorClassifier().classify(error, context);
    
    if (classification === ErrorClassification.Fatal) {
      return {
        success: false,
        decision: RestartDecision.Stop,
        nextAction: 'stop'
      };
    }

    const delay = this.retryPolicy.getBackoffDelay(attemptNumber);
    return {
      success: true,
      decision: RestartDecision.Restart,
      retryAttempt: attemptNumber,
      nextAction: 'retry',
      delayMs: delay
    };
  }
}

/** 错误恢复策略执行器 */
export class ErrorRecoveryExecutor {
  private recoveryHandler: ActorRecoveryHandler;
  private failureStats: Map<string, ActorFailureStats> = new Map();

  constructor(recoveryHandler?: ActorRecoveryHandler) {
    this.recoveryHandler = recoveryHandler || new ActorRecoveryHandler();
  }

  /** 执行错误恢复 */
  async executeRecovery(
    actorPath: string,
    actorId: string,
    error: Error,
    envelope?: Envelope
  ): Promise<RecoveryResult> {
    const context: ErrorContext = {
      actorPath,
      actorId,
      message: envelope?.message,
      timestamp: Date.now(),
      error,
      classification: new ErrorClassifier().classify(error),
      previousFailures: this.getFailureCount(actorPath)
    };

    // 更新失败统计
    this.recordFailure(actorPath, error);

    // 尝试恢复
    return this.recoveryHandler.attemptRecovery(
      error,
      context,
      this.getRetryState(actorPath)
    );
  }

  /** 记录失败 */
  private recordFailure(actorPath: string, error: Error): void {
    const existingStats = this.failureStats.get(actorPath);
    const newStats = {
      actorPath,
      failureCount: (existingStats?.failureCount ?? 0) + 1,
      firstFailureTime: existingStats?.firstFailureTime ?? Date.now(),
      lastFailureTime: Date.now(),
      lastCause: error
    };

    this.failureStats.set(actorPath, newStats);
  }

  /** 获取失败次数 */
  private getFailureCount(actorPath: string): number {
    return this.failureStats.get(actorPath)?.failureCount ?? 0;
  }

  /** 获取重试状态 */
  private getRetryState(actorPath: string): RetryState {
    const stats = this.failureStats.get(actorPath);
    return {
      attemptNumber: stats?.failureCount ?? 0,
      lastAttemptTime: stats?.lastFailureTime ?? 0,
      nextRetryTime: 0,
      backoffMs: 0
    };
  }

  /** 重置失败统计 */
  resetFailureStats(actorPath: string): void {
    this.failureStats.delete(actorPath);
  }

  /** 获取失败统计 */
  getFailureStats(actorPath: string): ActorFailureStats | undefined {
    return this.failureStats.get(actorPath);
  }
}

/** Circuit Breaker 状态 */
export enum CircuitState {
  Closed = 'closed',     // 正常，允许请求通过
  Open = 'open',         // 断路，拒绝请求
  HalfOpen = 'halfOpen' // 半开，允许部分请求通过
}

/** Circuit Breaker 配置 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

/** Circuit Breaker 实现 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.Closed;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000
    };
  }

  /** 检查是否可以执行请求 */
  canExecute(): boolean {
    if (this.state === CircuitState.Closed) {
      return true;
    }

    if (this.state === CircuitState.Open) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.timeout) {
        this.state = CircuitState.HalfOpen;
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // HalfOpen状态允许请求通过
    return true;
  }

  /** 记录成功 */
  recordSuccess(): void {
    if (this.state === CircuitState.HalfOpen) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.Closed;
        this.failureCount = 0;
      }
    } else if (this.state === CircuitState.Closed) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /** 记录失败 */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HalfOpen) {
      this.state = CircuitState.Open;
    } else if (this.state === CircuitState.Closed && this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.Open;
    }
  }

  /** 获取当前状态 */
  getState(): CircuitState {
    return this.state;
  }

  /** 重置 */
  reset(): void {
    this.state = CircuitState.Closed;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/** 带熔断的Actor调用包装器 */
export class CircuitBreakerWrapper {
  private circuitBreaker: CircuitBreaker;
  private actorRef: ActorRef<unknown>;

  constructor(actorRef: ActorRef<unknown>, config?: Partial<CircuitBreakerConfig>) {
    this.actorRef = actorRef;
    this.circuitBreaker = new CircuitBreaker(config);
  }

  /** 发送消息（带熔断保护） */
  tell(message: unknown, sender?: ActorRef<unknown>): boolean {
    if (!this.circuitBreaker.canExecute()) {
      return false;
    }

    try {
      this.actorRef.tell(message, sender);
      this.circuitBreaker.recordSuccess();
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      return false;
    }
  }

  /** 异步发送消息 */
  async tellAsync(message: unknown, sender?: ActorRef<unknown>): Promise<boolean> {
    if (!this.circuitBreaker.canExecute()) {
      return false;
    }

    try {
      this.actorRef.tell(message, sender);
      this.circuitBreaker.recordSuccess();
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      return false;
    }
  }

  /** 获取熔断器状态 */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /** 获取原始引用 */
  getRef(): ActorRef<unknown> {
    return this.actorRef;
  }
}
