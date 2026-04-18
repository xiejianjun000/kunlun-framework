/**
 * OpenTaiji Actor Runtime - 核心类型定义
 * 基于Actor模型的类型系统
 */

// ==================== 消息类型 ====================

/** 消息基类 */
export interface Message {
  readonly type: string;
  readonly payload?: unknown;
  readonly correlationId?: string;
  readonly timestamp?: number;
  readonly priority?: number;
}

/** 系统消息类型 */
export type SystemMessageType =
  | 'ActorStartup'
  | 'ActorShutdown'
  | 'ActorRestart'
  | 'ActorDeath'
  | 'WatchActor'
  | 'UnwatchActor'
  | 'ActorFailure'
  | 'Subscribe'
  | 'Unsubscribe';

/** 系统消息 */
export interface SystemMessage extends Message {
  readonly type: SystemMessageType;
  readonly target?: ActorRef<unknown>;
}

/** Actor失败消息 */
export interface ActorFailureMessage extends Message {
  readonly type: 'ActorFailure';
  readonly payload: {
    actor: ActorRef<unknown>;
    error: Error;
    message?: Message;
  };
}

// ==================== Actor 引用类型 ====================

/** Actor引用接口 */
export interface ActorRef<T = unknown> {
  readonly path: string;
  readonly uid: string;
  tell(message: T, sender?: ActorRef<unknown>): void;
  ask<R>(message: T, timeout?: number): Promise<R>;
}

/** 用户消息包装器 */
export interface Envelope {
  readonly message: Message;
  readonly sender?: ActorRef<unknown>;
  readonly timestamp: number;
  readonly sequenceNumber?: number;
}

// ==================== Actor 生命周期 ====================

/** Actor状态 */
export enum ActorState {
  Unstarted = 'unstarted',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
  Stopped = 'stopped',
  Suspended = 'suspended',
  Restarting = 'restarting'
}

/** Actor生命周期事件 */
export type LifecycleEvent =
  | { type: 'preStart' }
  | { type: 'postStop' }
  | { type: 'preRestart'; reason: Error | undefined }
  | { type: 'postRestart'; reason: Error | undefined };

/** Actor生命周期接口 */
export interface LifecycleCallbacks {
  preStart?(): Promise<void> | void;
  postStop?(): Promise<void> | void;
  preRestart?(reason: Error | undefined): Promise<void> | void;
  postRestart?(reason: Error | undefined): Promise<void> | void;
}

// ==================== 监督策略 ====================

/** 监督策略类型 */
export enum SupervisorStrategyType {
  OneForOne = 'oneForOne',
  AllForOne = 'allForOne',
  Custom = 'custom'
}

/** 重启决策 */
export enum RestartDecision {
  Restart = 'restart',
  Stop = 'stop',
  Resume = 'resume',
  Escalate = 'escalate'
}

/** 监督指令 */
export interface SupervisorDirective {
  readonly decision: RestartDecision;
  readonly maxRetries?: number;
  readonly withinTimeRange?: number;
}

/** 失败统计 */
export interface ActorFailureStats {
  readonly actorPath: string;
  readonly failureCount: number;
  readonly firstFailureTime: number;
  readonly lastFailureTime: number;
  readonly lastCause: Error | undefined;
}

/** 监督策略接口 */
export interface SupervisorStrategy {
  readonly type: SupervisorStrategyType;
  handleFailure(
    child: ActorRef<unknown>,
    cause: Error,
    stats: ActorFailureStats
  ): SupervisorDirective;
  getStats(child: ActorRef<unknown>): ActorFailureStats | undefined;
}

// ==================== 邮箱配置 ====================

/** 邮箱类型 */
export enum MailboxType {
  Unbounded = 'unbounded',
  Bounded = 'bounded',
  Priority = 'priority'
}

/** 邮箱状态 */
export enum MailboxStatus {
  Open = 'open',
  Suspended = 'suspended',
  Closed = 'closed',
  Full = 'full'
}

/** 邮箱配置 */
export interface MailboxConfig {
  readonly mailboxType: MailboxType;
  readonly capacity?: number;
  readonly priorityLevels?: number;
  readonly overflow?: 'reject' | 'block' | 'oldest';
}

// ==================== 调度器配置 ====================

/** 调度器类型 */
export enum DispatcherType {
  Default = 'default',
  Fixed = 'fixed',
  WorkStealing = 'workStealing',
  CallingThread = 'callingThread'
}

/** 调度器配置 */
export interface DispatcherConfig {
  type: DispatcherType;
  throughput?: number;
  parallelism?: number;
  fairMode?: boolean;
}

/** 调度器指标 */
export interface DispatcherMetrics {
  messagesProcessed: number;
  messagesScheduled: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  queueSize: number;
}

// ==================== Actor系统配置 ====================

/** Actor系统配置 */
export interface ActorSystemConfig {
  readonly name: string;
  readonly guardianStrategy?: SupervisorStrategy;
  readonly defaultMailbox?: MailboxConfig;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ==================== 错误恢复 ====================

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

/** Circuit Breaker 状态 */
export enum CircuitState {
  Closed = 'closed',
  Open = 'open',
  HalfOpen = 'halfOpen'
}

/** Circuit Breaker 配置 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

// ==================== ActorProps ====================

/** Actor上下文接口 */
export interface ActorContext {
  readonly self: ActorRef;
  readonly parent: ActorRef | undefined;
  readonly children: ActorRef[];
  readonly actorPath: string;
  readonly actorName: string;
}

/** Actor创建属性 */
export interface Props {
  readonly mailboxConfig?: MailboxConfig;
  readonly supervisorStrategy?: SupervisorStrategy;
  readonly dispatcher?: DispatcherConfig;
}

// ==================== 工具类型 ====================

/** Actor基础接口 */
export interface ActorLike {
  readonly id: string;
  lastFailureTime: number;
  context?: ActorContext;
  receive(message: Message): Promise<void> | void;
  performStart(): Promise<void>;
  performStop(): Promise<void>;
  performRestart(reason: Error): Promise<void>;
  processEnvelope(envelope: Envelope): Promise<void>;
}

/** Actor类构造函数类型 */
export type ActorClass = new (props?: Props) => ActorLike;

/** Actor工厂函数 */
export type ActorFactory = (props?: Props) => ActorLike;

/** 消息处理结果 */
export type ReceiveResult = void | Promise<void>;

/** 消息处理函数 */
export type Receive = (message: Message) => ReceiveResult;

// ==================== MCP类型 ====================

/** MCP工具请求 */
export interface MCPToolRequest {
  readonly type: 'MCPToolRequest';
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
  readonly correlationId?: string;
}

/** MCP工具响应 */
export interface MCPToolResponse {
  readonly type: 'MCPToolResponse';
  readonly toolName: string;
  readonly result: unknown;
  readonly correlationId?: string;
  readonly error?: string;
}
