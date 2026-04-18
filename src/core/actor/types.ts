/**
 * OpenTaiji Actor System - 核心类型定义
 * 基于Akka/Erlang OTP原则实现
 */

// ==================== 消息类型 ====================

/** 消息基类 */
export interface Message {
  readonly type: string;
  readonly payload?: unknown;
  readonly correlationId?: string;
  readonly timestamp?: number;
}

/** 系统消息类型 */
export type SystemMessageType = 
  | 'ActorStartup'
  | 'ActorShutdown'
  | 'ActorRestart'
  | 'ActorDeath'
  | 'WatchActor'
  | 'UnwatchActor';

/** 系统消息 */
export interface SystemMessage extends Message {
  readonly type: SystemMessageType;
  readonly target?: any;
}

// ==================== Actor 引用类型 ====================

// 前向声明，避免循环依赖
export interface ActorRef<T = unknown> {
  readonly path: any;
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
  /** 初始状态 */
  Unstarted = 'unstarted',
  /** 正在启动 */
  Starting = 'starting',
  /** 运行中 */
  Running = 'running',
  /** 正在停止 */
  Stopping = 'stopping',
  /** 已停止 */
  Stopped = 'stopped',
  /** 暂停/挂起 */
  Suspended = 'suspended',
  /** 正在重启 */
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
  preStart?(): Promise<void>;
  postStop?(): Promise<void>;
  preRestart?(reason: Error | undefined): Promise<void>;
  postRestart?(reason: Error | undefined): Promise<void>;
}

// ==================== 监督策略 ====================

/** 监督策略类型 */
export enum SupervisorStrategyType {
  /** OneForOne: 只影响失败的子Actor */
  OneForOne = 'oneForOne',
  /** AllForOne: 影响所有子Actor */
  AllForOne = 'allForOne',
  /** 自定义策略 */
  Custom = 'custom'
}

/** 重启决策 */
export enum RestartDecision {
  /** 重启Actor */
  Restart = 'restart',
  /** 停止Actor */
  Stop = 'stop',
  /** 恢复执行 */
  Resume = 'resume',
  /** 向上层监督者上报 */
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
  readonly actorPath: any;
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
  /** 无界队列（默认） */
  Unbounded = 'unbounded',
  /** 有界队列 */
  Bounded = 'bounded',
  /** 优先级队列 */
  Priority = 'priority',
  /** 多 Consumer 队列 */
  MultipleConsumer = 'multipleConsumer'
}

/** 邮箱配置 */
export interface MailboxConfig {
  readonly mailboxType: MailboxType;
  readonly capacity?: number;
  readonly priorityLevels?: number;
  readonly overflow?: 'reject' | 'block' | 'oldest';
  readonly pushTimeout?: number;
}

// ==================== 路由配置 ====================

/** 路由类型 */
export enum RouterType {
  RoundRobin = 'roundRobin',
  Random = 'random',
  Hash = 'hash',
  Broadcast = 'broadcast',
  TailChopping = 'tailChopping',
  ConsistentHashing = 'consistentHashing'
}

/** 路由器配置 */
export interface RouterConfig {
  readonly routerType: RouterType;
  readonly nrOfInstances?: number;
  readonly poolSize?: number;
  readonly virtualNodesFactor?: number;
}

// ==================== Actor 系统配置 ====================

/** Actor系统配置 */
export interface ActorSystemConfig {
  readonly name: string;
  readonly guardianStrategy?: SupervisorStrategy;
  readonly defaultMailbox?: MailboxConfig;
  readonly eventStreamSize?: number;
  readonly schedulerTickDuration?: number;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
  readonly clusterEnabled?: boolean;
  readonly remoteConfig?: RemoteConfig;
}

/** 远程配置 */
export interface RemoteConfig {
  readonly enabled: boolean;
  readonly host?: string;
  readonly port?: number;
  readonly protocol?: 'tcp' | 'http' | 'websocket';
  readonly serialization?: SerializationRegistry;
}

/** 序列化注册表 */
export interface SerializationRegistry {
  register(serializer: Serializer, manifest: string): void;
  getSerializer(manifest: string): Serializer | undefined;
}

/** 序列化器接口 */
export interface Serializer {
  readonly identifier: number;
  readonly manifest: string;
  toBinary(obj: unknown): Buffer;
  fromBinary(bytes: Buffer, manifest: string): unknown;
}

// ==================== 死信处理 ====================

/** 死信 */
export interface DeadLetter {
  readonly message: unknown;
  readonly sender?: ActorRef<unknown>;
  readonly recipient: ActorRef<unknown>;
  readonly timestamp: number;
  readonly reason?: string;
}

/** 死信处理器 */
export type DeadLetterHandler = (letter: DeadLetter) => void;

// ==================== 事件流 ====================

/** 事件总线消息 */
export interface EventBusMessage {
  readonly topic: string;
  readonly payload: unknown;
  readonly timestamp: number;
}

/** 事件订阅 */
export interface EventSubscription {
  readonly topic: string;
  readonly subscriber: ActorRef<unknown>;
  readonly subscriberPath?: any;
}

// ==================== 调度器 ====================

/** 调度任务 */
export interface ScheduledTask {
  readonly taskId: string;
  readonly runnable: () => void | Promise<void>;
  readonly delay: number;
  readonly interval?: number;
  readonly repetitions?: number;
}

/** 调度器接口 */
export interface Scheduler {
  scheduleOnce(delay: number, runnable: () => void): Disposable;
  scheduleRepeating(interval: number, runnable: () => void): Disposable;
  scheduleAt(rate: number, runnable: () => void): Disposable;
}

/** 可释放资源 */
export interface Disposable {
  dispose(): void;
  readonly isDisposed: boolean;
}

// ==================== 工具类型 ====================

/** Actor类构造器 */
export type ActorClass<T = any> = new (...args: any[]) => T;

/** Actor工厂函数 */
export type ActorFactory<T = any> = () => T | Promise<T>;

/** Props配置 */
export interface PropsConfig {
  readonly actorClass?: ActorClass;
  readonly factory?: ActorFactory;
  readonly args?: unknown[];
  readonly mailbox?: MailboxConfig;
  readonly dispatcher?: string;
  readonly router?: RouterConfig;
}

/** 消息处理结果 */
export interface ReceiveResult {
  readonly handled: boolean;
  readonly messagesRemaining: number;
}

/** 执行上下文类型 */
export type ExecutionContext = {
  execute(runnable: Runnable): void;
  reportFailure(error: Error): void;
};

/** 可运行对象 */
export interface Runnable {
  run(): void | Promise<void>;
}
