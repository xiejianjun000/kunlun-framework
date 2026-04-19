/**
 * OpenTaiji Actor System - 模块导出
 * 
 * 真正的Actor模型实现，基于Akka/Erlang OTP原则
 */

// ==================== 类型导出 ====================

export {
  // 消息类型
  Message,
  SystemMessage,
  Envelope,
  
  // Actor引用
  ActorRef,
  
  // Actor状态
  ActorState,
  
  // 生命周期
  LifecycleEvent,
  LifecycleCallbacks,
  
  // 监督策略
  SupervisorStrategyType,
  SupervisorDirective,
  RestartDecision,
  ActorFailureStats,
  SupervisorStrategy,
  
  // 邮箱
  MailboxConfig,
  MailboxType,
  
  // 路由器
  RouterType,
  RouterConfig,
  
  // 系统配置
  ActorSystemConfig,
  RemoteConfig,
  Serializer,
  SerializationRegistry,
  
  // 死信
  DeadLetter,
  DeadLetterHandler,
  
  // 事件流
  EventBusMessage,
  EventSubscription,
  
  // 调度器
  ScheduledTask,
  Scheduler,
  Disposable,
  
  // 工具类型
  ActorClass,
  ActorFactory,
  ReceiveResult,
  PropsConfig
} from './types';

// ==================== ActorPath 导出 ====================

export {
  ActorPath,
  ActorRef as ActorRefImpl,
  ActorSelection,
  Props,
  LocalActorRef,
  SYSTEM_ACTOR_PATH,
  USER_GUARDIAN_PATH,
  SYSTEM_GUARDIAN_PATH,
  DEAD_LETTERS_PATH,
  EVENT_STREAM_PATH
} from './ActorPath';

// ==================== Actor 导出 ====================

export {
  Actor,
  IActorContext,
  IActorSystem,
  ActorContextImpl,
  Receive
} from './Actor';

// ==================== ActorSystem 导出 ====================

export {
  ActorSystem,
  props,
  boundedProps
} from './ActorSystem';

// ==================== Mailbox 导出 ====================

export {
  IMailbox,
  MailboxStatus,
  UnboundedMailbox,
  BoundedMailbox,
  PriorityMailbox,
  MailboxFactory,
  MonitoredMailbox,
  DEFAULT_BOUNDED_CAPACITY
} from './Mailbox';

// ==================== Supervisor 导出 ====================

export {
  OneForOneSupervisorStrategy,
  AllForOneSupervisorStrategy,
  CustomSupervisorStrategy,
  SupervisorStrategyFactory,
  defaultSupervisorStrategy,
  stopAllStrategy,
  stopOneStrategy
} from './Supervisor';

// ==================== Stash 导出 ====================

export {
  Stash,
  IStash,
  StashSupport,
  StashPolicy,
  DefaultStashPolicy,
  BatchStashPolicy,
  UnstashTrigger
} from './Stash';

// ==================== 快捷函数 ====================

import { ActorSystem } from './ActorSystem';
import { Actor } from './Actor';
import { ActorPath, ActorRef, Props } from './ActorPath';
import { OneForOneSupervisorStrategy } from './Supervisor';
import { RestartDecision, ActorSystemConfig } from './types';

/**
 * 创建Actor系统
 */
export function createActorSystem(
  name: string,
  config?: Partial<ActorSystemConfig>
): ActorSystem {
  return new ActorSystem(name, config);
}

/**
 * 创建带默认监督策略的Actor
 */
export function actorOf<T extends Actor>(
  system: ActorSystem,
  producer: () => T,
  name?: string
): ActorRef<T> {
  const props = new Props(producer);
  return system.actorOf(props, name) as ActorRef<T>;
}

/**
 * 发送消息
 */
export function tell(ref: ActorRef, message: any, sender?: ActorRef): void {
  ref.tell(message, sender);
}

/**
 * 发送请求
 */
export async function ask<T>(ref: ActorRef, message: any, timeout?: number): Promise<T> {
  return ref.ask<T>(message, timeout);
}

// ==================== 预定义的Supervisor策略 ====================

export const alwaysRestartStrategy = new OneForOneSupervisorStrategy(
  () => RestartDecision.Restart
);

export const neverRestartStrategy = new OneForOneSupervisorStrategy(
  () => RestartDecision.Stop,
  0
);

export const resumeStrategy = new OneForOneSupervisorStrategy(
  () => RestartDecision.Resume,
  Infinity
);
