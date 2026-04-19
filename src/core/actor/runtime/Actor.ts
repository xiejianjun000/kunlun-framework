/**
 * OpenTaiji Actor Runtime - Actor基类
 * 实现核心的消息处理和生命周期管理
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ActorRef,
  Message,
  Envelope,
  LifecycleCallbacks,
  Props,
  ActorState
} from './types';
import { IMailbox, createMailbox } from './Mailbox';
import { ErrorClassifier, ErrorClassification } from './ErrorRecovery';

/**
 * Actor上下文接口
 */
export interface IActorContext {
  readonly self: ActorRef;
  readonly parent: ActorRef | undefined;
  readonly children: ActorRef[];
  readonly actorPath: string;
  readonly actorName: string;
  getSystem(): IActorSystem;
  spawn(props: Props): ActorRef;
  spawnNamed(props: Props, name: string): ActorRef;
  stop(): Promise<void>;
  stopChild(child: ActorRef): Promise<void>;
  watch(actor: ActorRef): void;
  unwatch(actor: ActorRef): void;
}

/**
 * Actor系统接口
 */
export interface IActorSystem {
  readonly name: string;
  readonly path: string;
  actorOf(props: Props, name?: string): ActorRef;
  findActor(path: string): ActorRef | undefined;
  stop(actor: ActorRef): Promise<void>;
  deadLetters(): ActorRef;
  eventStream(): ActorRef;
  terminate(): Promise<void>;
}

/**
 * Actor基类
 */
export abstract class Actor implements LifecycleCallbacks {
  /** Actor唯一标识 */
  readonly id: string = uuidv4();

  /** Actor上下文（运行时设置） */
  protected context!: IActorContext;

  /** 邮箱 */
  protected mailbox!: IMailbox;

  /** 当前状态 */
  protected _actorState: ActorState = ActorState.Unstarted;

  /** 是否正在处理消息 */
  protected _processing: boolean = false;

  /** 重启次数 */
  protected restartCount: number = 0;

  /** 上次失败时间 */
  public lastFailureTime: number = 0;

  /** 上次失败原因 */
  protected lastFailureReason: Error | undefined;

  /** 监督者引用 */
  protected supervisor?: ActorRef;

  /** 错误分类器 */
  protected errorClassifier: ErrorClassifier;

  /** 监视者列表 */
  private watchers: Set<ActorRef> = new Set();

  constructor(props?: Props) {
    this.mailbox = createMailbox(props?.mailboxConfig);
    this.errorClassifier = new ErrorClassifier();
  }

  // ==================== 生命周期回调 ====================

  async preStart?(): Promise<void>;
  async postStop?(): Promise<void>;
  async preRestart?(reason: Error | undefined): Promise<void>;
  async postRestart?(reason: Error | undefined): Promise<void>;

  // ==================== 消息处理 ====================

  /** 消息处理入口 - 子类必须实现 */
  abstract receive(message: Message): Promise<void> | void;

  /** 处理信封 */
  protected async handleEnvelope(envelope: Envelope): Promise<void> {
    try {
      this._actorState = ActorState.Running;
      await this.receive(envelope.message);
    } catch (error) {
      await this.handleFailure(error as Error, envelope);
    }
  }

  /** 公共消息处理入口 */
  public processEnvelope(envelope: Envelope): Promise<void> {
    return this.handleEnvelope(envelope);
  }

  /** 处理失败 */
  protected async handleFailure(error: Error, envelope: Envelope): Promise<void> {
    this.lastFailureTime = Date.now();
    this.lastFailureReason = error;
    
    const classification = this.errorClassifier.classify(error);
    
    // 致命错误立即上报
    if (classification === ErrorClassification.Fatal) {
      console.error(`[Actor:${this.context?.actorPath}] Fatal error:`, error.message);
      this.notifySupervisor(error, envelope);
      throw error;
    }

    // 可恢复错误，重试后上报
    console.warn(`[Actor:${this.context?.actorPath}] Recoverable error:`, error.message);
    this.notifySupervisor(error, envelope);
  }

  /** 通知监督者 */
  protected notifySupervisor(error: Error, envelope: Envelope): void {
    if (this.supervisor) {
      this.supervisor.tell({
        type: 'ActorFailure',
        payload: {
          actor: this.context?.self,
          error,
          message: envelope.message
        }
      } as unknown as Message);
    }
  }

  // ==================== 生命周期管理 ====================

  /** 执行启动 */
  async performStart(): Promise<void> {
    if (this._actorState !== ActorState.Unstarted && this._actorState !== ActorState.Restarting) {
      return;
    }

    this._actorState = ActorState.Starting;

    try {
      if (this.preStart) {
        await this.preStart();
      }
      this._actorState = ActorState.Running;
    } catch (error) {
      this._actorState = ActorState.Stopped;
      throw error;
    }
  }

  /** 执行停止 */
  async performStop(): Promise<void> {
    if (this._actorState === ActorState.Stopped || this._actorState === ActorState.Stopping) {
      return;
    }

    this._actorState = ActorState.Stopping;

    try {
      if (this.postStop) {
        await this.postStop();
      }
      this._actorState = ActorState.Stopped;
    } catch (error) {
      this._actorState = ActorState.Stopped;
      console.error(`Error during postStop:`, error);
    }

    // 通知所有监视者
    this.notifyWatchers();
  }

  /** 执行重启 */
  async performRestart(reason: Error): Promise<void> {
    this._actorState = ActorState.Restarting;
    this.restartCount++;

    try {
      if (this.preRestart) {
        await this.preRestart(reason);
      }
      
      // 重置邮箱
      this.mailbox.clear();
      
      if (this.postRestart) {
        await this.postRestart(reason);
      }
      
      this._actorState = ActorState.Running;
    } catch (error) {
      this._actorState = ActorState.Stopped;
      throw error;
    }
  }

  // ==================== 监视机制 ====================

  /** 添加监视者 */
  watch(actor: ActorRef): void {
    this.watchers.add(actor);
  }

  /** 移除监视者 */
  unwatch(actor: ActorRef): void {
    this.watchers.delete(actor);
  }

  /** 通知所有监视者 */
  private notifyWatchers(): void {
    const deathNotification = {
      type: 'ActorDeath',
      payload: {
        actor: this.context?.self,
        timestamp: Date.now(),
        reason: this.lastFailureReason
      }
    };

    for (const watcher of Array.from(this.watchers)) {
      try {
        watcher.tell(deathNotification as unknown as Message);
      } catch (error) {
        console.error(`Error notifying watcher:`, error);
      }
    }
  }

  // ==================== 状态查询 ====================

  /** 获取状态 */
  get state(): ActorState {
    return this._actorState;
  }

  /** 是否运行中 */
  isRunning(): boolean {
    return this._actorState === ActorState.Running;
  }

  /** 是否已停止 */
  isStopped(): boolean {
    return this._actorState === ActorState.Stopped;
  }

  /** 获取重启次数 */
  getRestartCount(): number {
    return this.restartCount;
  }
}

/**
 * 简单Actor - 不需要子类实现receive
 */
export class ReceiveActor extends Actor {
  constructor(
    private handler: (message: Message) => Promise<void> | void,
    props?: Props
  ) {
    super(props);
  }

  receive(message: Message): Promise<void> | void {
    return this.handler(message);
  }
}

/**
 * 有状态Actor基类
 */
export abstract class StatefulActor<T extends object> extends Actor {
  /** 内部状态 */
  protected _state: T;

  constructor(initialState: T, props?: Props) {
    super(props);
    this._state = initialState;
  }

  /** 更新状态 */
  protected updateState(updater: (state: T) => T): void {
    this._state = updater(this._state);
  }

  /** 获取当前状态快照 */
  getState(): Readonly<T> {
    return this._state;
  }

  /** 恢复状态（用于重启后） */
  protected restoreState(state: T): void {
    this._state = state;
  }
}

/**
 * 事件源Actor接口
 */
export interface EventSourcedState<S, E> {
  state: S;
  events: E[];
}

/**
 * 事件源Actor基类
 */
export abstract class EventSourcedActor<S extends object, E = unknown> extends Actor {
  private _state: S;
  private uncommittedEvents: E[] = [];

  constructor(initialState: S, props?: Props) {
    super(props);
    this._state = initialState;
  }

  /** 发布事件 */
  protected publish(event: E): void {
    this.uncommittedEvents.push(event);
    this.applyEvent(event);
  }

  /** 应用事件（子类实现） */
  protected abstract applyEvent(event: E): void;

  /** 获取未提交的事件 */
  getUncommittedEvents(): E[] {
    return [...this.uncommittedEvents];
  }

  /** 清除未提交的事件（持久化后调用） */
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }

  /** 获取当前快照 */
  getSnapshot(): EventSourcedState<S, E> {
    return {
      state: this._state,
      events: this.uncommittedEvents
    };
  }

  /** 获取当前状态 */
  protected get currentState(): S {
    return this._state;
  }

  /** 设置状态 */
  protected set currentState(value: S) {
    this._state = value;
  }
}
