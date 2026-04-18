/**
 * OpenTaiji Actor Runtime - 核心模块导出
 */

// Types - 基础类型
export type {
  Message,
  SystemMessage,
  ActorFailureMessage,
  ActorRef,
  Envelope,
  ActorState,
  LifecycleEvent,
  LifecycleCallbacks,
  SupervisorDirective,
  ActorFailureStats,
  SupervisorStrategy,
  MailboxConfig,
  DispatcherConfig,
  DispatcherMetrics,
  ActorSystemConfig,
  ErrorContext,
  BackoffConfig,
  RetryState,
  CircuitBreakerConfig,
  ActorContext,
  Props,
  ActorLike,
  ActorClass,
  ActorFactory,
  ReceiveResult,
  Receive
} from './types';

export {
  SupervisorStrategyType,
  RestartDecision,
  MailboxType,
  MailboxStatus,
  DispatcherType,
  ErrorClassification,
  CircuitState
} from './types';

export type { MCPToolRequest, MCPToolResponse } from './types';

// Actor
export type { IActorContext, IActorSystem } from './Actor';
export { Actor, ReceiveActor, StatefulActor, EventSourcedActor } from './Actor';

// ActorSystem
export { ActorSystem, ActorRecord, ActorContextImpl } from './ActorSystem';
export type { ActorSystemMetrics } from './ActorSystem';

// Mailbox
export {
  IMailbox,
  MailboxBase,
  UnboundedMailbox,
  BoundedMailbox,
  PriorityMailbox,
  DEFAULT_BOUNDED_CAPACITY,
  createMailbox
} from './Mailbox';

// Supervisor
export {
  OneForOneSupervisorStrategy,
  AllForOneSupervisorStrategy,
  defaultSupervisorStrategy
} from './Supervisor';

// ActorRef
export { LocalActorRef, DeadLetterActorRef, ActorRefs, props, generateActorName } from './ActorRef';

// Dispatcher
export type { MessageTask, ExecutionContext } from './Dispatcher';
export {
  IDispatcher,
  BaseDispatcher,
  CallingThreadDispatcher,
  DefaultDispatcher,
  WorkStealingDispatcher,
  MailboxDispatcher,
  createDispatcher
} from './Dispatcher';

// Error Recovery
export type {
  RetryPolicy,
  RecoveryHandler,
  RecoveryResult
} from './ErrorRecovery';
export {
  BackoffCalculator,
  ErrorClassifier,
  DefaultRetryPolicy,
  ActorRecoveryHandler,
  ErrorRecoveryExecutor,
  CircuitBreaker
} from './ErrorRecovery';

// MCP Integration
export type {
  MCPActorFactoryOptions,
  IMCToolCaller,
  MCPClientConfig,
  MCPToolDefinition,
  MCPToolCallRequest,
  MCPToolCallResponse,
  MCPToolResult,
  MCPResource,
  MCPResourceContent
} from './MCPIntegration';
export { MCPActorError, DefaultMCPToolCaller, createMCPActorFactory, MCPActorRefDecorator, withMCPCapabilities } from './MCPIntegration';
