/**
 * Actor System Type Definitions
 * Actor系统类型定义
 */

/** Actor引用 */
export interface ActorRef {
  /** Actor ID */
  id: string;
  /** 发送消息 */
  send(message: ActorMessage): Promise<void>;
  /** 请求-响应 */
  ask<T = unknown>(message: ActorMessage, timeout?: number): Promise<T>;
}

/** Actor系统接口 */
export interface ActorSystem {
  /** 注册Actor */
  register(actor: Actor): void;
  /** 获取Actor引用 */
  getActor(id: string): ActorRef | undefined;
  /** 发送消息 */
  send(to: string, message: ActorMessage): Promise<void>;
  /** 停止系统 */
  shutdown(): Promise<void>;
}

/** Actor接口 */
export interface Actor {
  /** Actor ID */
  id: string;
  /** 处理消息 */
  receive(message: ActorMessage): Promise<void>;
  /** 生命周期钩子: 启动 */
  preStart?(): Promise<void>;
  /** 生命周期钩子: 停止 */
  postStop?(): Promise<void>;
}

/** Actor消息基类 */
export interface ActorMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: string;
  /** 时间戳 */
  timestamp: number;
  /** 负载 */
  payload: unknown;
}

/** Actor路径 */
export interface ActorPath {
  /** 路径字符串 */
  path: string;
  /** 父路径 */
  parent?: ActorPath;
}

/** Actor选择器 */
export interface ActorSelection {
  /** 选择器路径 */
  path: string;
  /** 匹配所有 */
  tell(message: ActorMessage): Promise<void>;
  /** 询问 */
  ask<T = unknown>(message: ActorMessage, timeout?: number): Promise<T>;
}

/** Actor生命周期事件 */
export type ActorLifeCycleEvent = 
  | 'preStart'
  | 'postStop'
  | 'preRestart'
  | 'postRestart';

/** Supervisor策略 */
export type SupervisorStrategy = 
  | 'escalate'      // 升级到父Actor
  | 'resume'         // 继续执行,跳过错误消息
  | 'restart'        // 重启Actor
  | 'stop';          // 停止Actor

/** Supervisor指令 */
export interface SupervisorDirective {
  /** 策略 */
  strategy: SupervisorStrategy;
  /** 孩子Actor */
  child?: string;
}

/** Actor配置 */
export interface ActorConfig {
  /** Actor ID */
  id: string;
  /** 消息处理超时(ms) */
  messageTimeout?: number;
  /** Supervisor策略 */
  supervisorStrategy?: SupervisorStrategy;
  /** 邮箱容量 */
  mailboxCapacity?: number;
}

/** 消息信封 */
export interface MessageEnvelope {
  /** 消息 */
  message: ActorMessage;
  /** 发送者 */
  sender?: ActorRef;
  /** 时间戳 */
  timestamp: number;
}
