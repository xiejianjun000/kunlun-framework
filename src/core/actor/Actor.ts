/**
 * OpenTaiji Actor System - Actor基类
 * 实现核心的消息处理和生命周期管理
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ActorPath,
  ActorRef,
  Props,
  ActorSelection
} from './ActorPath';
import { 
  ActorState,
  Message,
  Envelope,
  LifecycleCallbacks,
  SupervisorDirective,
  MailboxConfig
} from './types';

export { ActorState };
import { 
  IMailbox, 
  UnboundedMailbox,
  MailboxFactory 
} from './Mailbox';

/** 消息处理函数类型 */
export type Receive = (message: Message) => Promise<void> | void;

/**
 * Actor上下文接口
 */
export interface IActorContext {
  /** 当前Actor的引用 */
  readonly self: ActorRef;
  
  /** 父Actor引用 */
  readonly parent: ActorRef | undefined;
  
  /** 子Actor列表 */
  readonly children: ReadonlySet<ActorRef>;
  
  /** Actor路径 */
  readonly actorPath: ActorPath;
  
  /** Actor名称 */
  readonly actorName: string;
  
  /** 系统引用 */
  getSystem(): IActorSystem;
  
  /** 创建子Actor */
  spawn<T extends Actor>(props: Props): ActorRef<T>;
  
  /** 创建命名子Actor */
  spawnNamed<T extends Actor>(props: Props, name: string): ActorRef<T>;
  
  /** 停止Actor */
  stop(): Promise<void>;
  
  /** 停止子Actor */
  stopChild(child: ActorRef): Promise<void>;
  
  /** 设置监督策略 */
  setSupervisorStrategy(directive: SupervisorDirective): void;
  
  /** 获取消息调度器 */
  getDispatcher(): string;
}

/**
 * Actor系统接口
 */
export interface IActorSystem {
  readonly name: string;
  readonly path: ActorPath;
  
  /** 获取Actor引用 */
  actorOf(props: Props, name?: string): ActorRef;
  
  /** 查找Actor */
  findActor(path: ActorPath): ActorRef | undefined;
  
  /** 选择Actor */
  select(pathPattern: string): ActorSelection;
  
  /** 停止Actor */
  stop(actor: ActorRef): Promise<void>;
  
  /** 获取死信Actor */
  deadLetters(): ActorRef;
  
  /** 获取事件流 */
  eventStream(): ActorRef;
  
  /** 终止系统 */
  terminate(): Promise<void>;
}

/**
 * Actor基类
 * 所有Actor的抽象基类
 */
export abstract class Actor implements LifecycleCallbacks {
  /** Actor ID */
  readonly id: string = uuidv4();
  
  /** 上下文（子类初始化时设置） */
  protected context!: IActorContext;
  
  /** 邮箱 */
  protected mailbox: IMailbox;
  
  /** 当前状态 */
  protected _state: ActorState = ActorState.Unstarted;
  
  /** 是否正在处理消息 */
  protected _processing: boolean = false;
  
  /** 重启次数 */
  protected restartCount: number = 0;
  
  /** 上次失败时间 */
  protected lastFailureTime: number = 0;
  
  /** 上次失败原因 */
  protected lastFailureReason: Error | undefined;
  
  constructor(mailboxConfig?: MailboxConfig) {
    this.mailbox = new UnboundedMailbox();
  }
  
  // ==================== 生命周期回调 ====================
  
  /**
   * Actor启动前调用
   */
  async preStart?(): Promise<void>;
  
  /**
   * Actor停止后调用
   */
  async postStop?(): Promise<void>;
  
  /**
   * Actor重启前调用
   */
  async preRestart?(reason: Error | undefined): Promise<void>;
  
  /**
   * Actor重启后调用
   */
  async postRestart?(reason: Error | undefined): Promise<void>;
  
  // ==================== 消息处理 ====================
  
  /**
   * 消息处理入口
   * 子类必须实现此方法
   */
  abstract receive(message: Message): Promise<void>;
  
  /**
   * 处理信封（包含发送者信息）
   * 默认实现提取消息并传递给receive
   */
  protected async handleEnvelope(envelope: Envelope): Promise<void> {
    try {
      this._state = ActorState.Running;
      await this.receive(envelope.message);
    } catch (error) {
      await this.handleFailure(error as Error, envelope);
    }
  }
  
  /**
   * 公共消息处理入口
   * 供ActorSystem调用
   */
  public processEnvelope(envelope: Envelope): Promise<void> {
    return this.handleEnvelope(envelope);
  }
  
  /**
   * 处理失败
   * 抛出错误让监督者处理
   */
  protected async handleFailure(error: Error, envelope: Envelope): Promise<void> {
    this.lastFailureTime = Date.now();
    this.lastFailureReason = error;
    
    // 记录错误日志
    console.error(`[Actor:${this.context?.actorPath}] Error processing message:`, error);
    
    // 通知监督者处理
    throw error;
  }
  
  /**
   * 发送消息给自己
   */
  protected self(): ActorRef {
    return this.context.self;
  }
  
  /**
   * 获取当前状态
   */
  get state(): ActorState {
    return this._state;
  }
  
  // ==================== Actor管理 ====================
  
  /**
   * 创建子Actor
   */
  protected spawn<T extends Actor>(actorClass: new () => T): ActorRef<T> {
    return this.context.spawn(new Props(() => new actorClass()));
  }
  
  /**
   * 创建命名子Actor
   */
  protected spawnNamed<T extends Actor>(actorClass: new () => T, name: string): ActorRef<T> {
    return this.context.spawnNamed(new Props(() => new actorClass()), name);
  }
  
  /**
   * 停止Actor
   */
  protected stop(): Promise<void> {
    return this.context.stop();
  }
  
  /**
   * 停止子Actor
   */
  protected stopChild(child: ActorRef): Promise<void> {
    return this.context.stopChild(child);
  }
  
  // ==================== 消息发送 ====================
  
  /**
   * 发送异步消息（fire-and-forget）
   */
  protected tell(target: ActorRef, message: Message): void {
    target.tell(message, this.context.self);
  }
  
  /**
   * 发送请求并等待响应
   */
  protected ask<T>(target: ActorRef, message: Message, timeout?: number): Promise<T> {
    return target.ask<T>(message, timeout);
  }
  
  /**
   * 转发消息（保留原始发送者）
   */
  protected forward(target: ActorRef, message: Message): void {
    const originalSender = this.getCurrentSender();
    target.tell(message, originalSender);
  }
  
  /**
   * 获取当前处理消息的发送者
   */
  protected getCurrentSender(): ActorRef | undefined {
    return undefined;
  }
  
  // ==================== 邮箱操作 ====================
  
  /**
   * 将消息放入邮箱
   */
  protected pushToMailbox(envelope: Envelope): void {
    this.mailbox.push(envelope);
  }
  
  /**
   * 从邮箱取出消息
   */
  protected popFromMailbox(): Envelope | undefined {
    return this.mailbox.pop();
  }
  
  /**
   * 查看邮箱但不移除
   */
  protected peekMailbox(): Envelope | undefined {
    return this.mailbox.peek();
  }
  
  /**
   * 邮箱是否为空
   */
  protected mailboxIsEmpty(): boolean {
    return this.mailbox.isEmpty();
  }
  
  /**
   * 邮箱大小
   */
  protected mailboxSize(): number {
    return this.mailbox.size();
  }
  
  /**
   * 暂停邮箱
   */
  protected suspendMailbox(): void {
    this.mailbox.suspend();
  }
  
  /**
   * 恢复邮箱
   */
  protected resumeMailbox(): void {
    this.mailbox.resume();
  }
  
  // ==================== 内部方法 ====================
  
  /**
   * 初始化上下文
   * 由ActorSystem调用
   */
  init(context: IActorContext): void {
    this.context = context;
    this._state = ActorState.Starting;
  }
  
  /**
   * 执行启动
   */
  async performStart(): Promise<void> {
    try {
      this._state = ActorState.Starting;
      
      if (this.preStart) {
        await this.preStart();
      }
      
      this._state = ActorState.Running;
    } catch (error) {
      this._state = ActorState.Stopped;
      throw error;
    }
  }
  
  /**
   * 执行停止
   */
  async performStop(): Promise<void> {
    try {
      this._state = ActorState.Stopping;
      
      // 处理邮箱中剩余消息
      while (!this.mailbox.isEmpty()) {
        const envelope = this.mailbox.pop();
        if (envelope) {
          this.context.getSystem().deadLetters().tell(
            { type: 'deadLetter', message: envelope.message, recipient: this.context.self },
            undefined
          );
        }
      }
      
      if (this.postStop) {
        await this.postStop();
      }
      
      this._state = ActorState.Stopped;
    } catch (error) {
      console.error(`[Actor:${this.context?.actorPath}] Error during stop:`, error);
      this._state = ActorState.Stopped;
    }
  }
  
  /**
   * 执行重启
   */
  async performRestart(reason: Error | undefined): Promise<void> {
    try {
      this._state = ActorState.Restarting;
      this.restartCount++;
      
      if (this.preRestart) {
        await this.preRestart(reason);
      }
      
      // 清理邮箱
      this.mailbox.clear();
      
      if (this.postRestart) {
        await this.postRestart(reason);
      }
      
      this._state = ActorState.Running;
    } catch (error) {
      console.error(`[Actor:${this.context?.actorPath}] Error during restart:`, error);
      this._state = ActorState.Stopped;
      throw error;
    }
  }
}

/**
 * Actor上下文实现
 */
export class ActorContextImpl implements IActorContext {
  readonly self: ActorRef;
  readonly parent: ActorRef | undefined;
  private readonly _children: Set<ActorRef> = new Set();
  private readonly _path: ActorPath;
  private readonly _name: string;
  private readonly _system: IActorSystem;
  private supervisorDirective: SupervisorDirective | undefined;
  private readonly _dispatcher: string;
  
  constructor(
    self: ActorRef,
    parent: ActorRef | undefined,
    path: ActorPath,
    name: string,
    system: IActorSystem,
    dispatcher: string = 'default'
  ) {
    this.self = self;
    this.parent = parent;
    this._path = path;
    this._name = name;
    this._system = system;
    this._dispatcher = dispatcher;
  }
  
  get children(): ReadonlySet<ActorRef> {
    return this._children;
  }
  
  get actorPath(): ActorPath {
    return this._path;
  }
  
  get actorName(): string {
    return this._name;
  }
  
  getSystem(): IActorSystem {
    return this._system;
  }
  
  spawn<T extends Actor>(props: Props): ActorRef<T> {
    return this._system.actorOf(props) as ActorRef<T>;
  }
  
  spawnNamed<T extends Actor>(props: Props, name: string): ActorRef<T> {
    return this._system.actorOf(props, name) as ActorRef<T>;
  }
  
  async stop(): Promise<void> {
    await this._system.stop(this.self);
  }
  
  async stopChild(child: ActorRef): Promise<void> {
    await this._system.stop(child);
  }
  
  setSupervisorStrategy(directive: SupervisorDirective): void {
    this.supervisorDirective = directive;
  }
  
  getDispatcher(): string {
    return this._dispatcher;
  }
  
  addChild(child: ActorRef): void {
    this._children.add(child);
  }
  
  removeChild(child: ActorRef): void {
    this._children.delete(child);
  }
  
  clearChildren(): void {
    this._children.clear();
  }
}
