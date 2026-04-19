/**
 * OpenTaiji Actor Runtime - ActorSystem
 * 核心Actor运行时系统
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ActorRef,
  ActorLike,
  Message,
  Envelope,
  Props,
  ActorSystemConfig,
  ActorState,
  RestartDecision,
  ActorFailureStats,
  SupervisorStrategy,
  MailboxConfig
} from './types';
import {
  IMailbox,
  createMailbox,
  UnboundedMailbox,
  MailboxStatus
} from './Mailbox';
import {
  OneForOneSupervisorStrategy,
  AllForOneSupervisorStrategy,
  defaultSupervisorStrategy
} from './Supervisor';
import {
  LocalActorRef,
  DeadLetterActorRef,
  ActorRefs,
  generateActorName
} from './ActorRef';
import {
  createDispatcher,
  IDispatcher,
  DispatcherType,
  MailboxDispatcher
} from './Dispatcher';
import { ErrorRecoveryExecutor } from './ErrorRecovery';
import { IActorContext, IActorSystem } from './Actor';

/** Actor记录 */
export interface ActorRecord {
  actor: ActorLike;
  ref: ActorRef;
  context: ActorContextImpl;
  mailbox: IMailbox;
  mailboxDispatcher: MailboxDispatcher;
  state: ActorState;
  children: ActorRef[];
  supervisor: ActorRef | undefined;
  restartCount: number;
  strategy: SupervisorStrategy;
  lastFailureTime: number;
  lastError?: Error;
}

/** 监督树节点 */
interface SupervisionTreeNode {
  actorPath: string;
  parentPath: string | null;
  children: string[];
  failureCount: number;
}

/**
 * Actor上下文实现
 */
export class ActorContextImpl implements IActorContext {
  readonly self: ActorRef;
  readonly parent: ActorRef | undefined;
  children: ActorRef[] = [];
  private actorSystem: ActorSystem;

  constructor(
    actor: ActorLike,
    ref: ActorRef,
    parent: ActorRef | undefined,
    system: ActorSystem
  ) {
    this.self = ref;
    this.parent = parent;
    this.actorSystem = system;
  }

  get actorPath(): string {
    return this.self.path;
  }

  get actorName(): string {
    const parts = this.self.path.split('/');
    return parts[parts.length - 1];
  }

  getSystem(): IActorSystem {
    return this.actorSystem;
  }

  spawn(props: Props): ActorRef {
    return this.actorSystem.actorOf(props);
  }

  spawnNamed(props: Props, name: string): ActorRef {
    return this.actorSystem.actorOf(props, name);
  }

  async stop(): Promise<void> {
    await this.actorSystem.stop(this.self);
  }

  async stopChild(child: ActorRef): Promise<void> {
    await this.actorSystem.stop(child);
  }

  watch(actor: ActorRef): void {
    this.actorSystem.watchActor(this.self, actor);
  }

  unwatch(actor: ActorRef): void {
    this.actorSystem.unwatchActor(this.self, actor);
  }

  addChild(ref: ActorRef): void {
    if (!this.children.includes(ref)) {
      this.children.push(ref);
    }
  }

  removeChild(ref: ActorRef): void {
    const index = this.children.indexOf(ref);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }
}

/** 死信Actor */
class DeadLetterActor implements ActorLike {
  private handlers: Array<(msg: any, sender?: ActorRef) => void> = [];
  readonly id: string = uuidv4();
  lastFailureTime: number = 0;

  receive(message: Message): Promise<void> | void {
    for (const handler of this.handlers) {
      handler(message, this.parent);
    }
    return Promise.resolve();
  }

  addHandler(handler: (msg: any, sender?: ActorRef) => void): void {
    this.handlers.push(handler);
  }

  tell(message: unknown, sender?: ActorRef): void {
    for (const handler of this.handlers) {
      handler(message, sender);
    }
  }

  performStart(): Promise<void> {
    return Promise.resolve();
  }

  performStop(): Promise<void> {
    return Promise.resolve();
  }

  performRestart(reason: Error): Promise<void> {
    return Promise.resolve();
  }

  processEnvelope(envelope: Envelope): Promise<void> {
    return Promise.resolve();
  }

  parent?: ActorRef;
}

/** 监督者Actor */
class SupervisorActor implements ActorLike {
  readonly id: string = uuidv4();
  lastFailureTime: number = 0;
  private children: Map<string, ActorRef> = new Map();
  private strategy: SupervisorStrategy;
  private parent?: ActorRef;

  constructor(strategy: SupervisorStrategy, parent?: ActorRef) {
    this.strategy = strategy;
    this.parent = parent;
  }

  receive(message: Message): Promise<void> | void {
    const msg = message as any;
    if (msg.type === 'ActorFailure' && msg.payload) {
      const { actor, error, message: failedMessage } = msg.payload;
      this.handleChildFailure(actor, error as Error, failedMessage);
    }
    return Promise.resolve();
  }

  private async handleChildFailure(
    child: ActorRef<unknown>,
    error: Error,
    failedMessage: Message
  ): Promise<void> {
    const stats = this.strategy.getStats(child);
    const directive = this.strategy.handleFailure(child, error, stats || {
      actorPath: child.path,
      failureCount: 1,
      firstFailureTime: Date.now(),
      lastFailureTime: Date.now(),
      lastCause: error
    });

    switch (directive.decision) {
      case RestartDecision.Restart:
        // 由外部处理重启
        break;
      case RestartDecision.Stop:
        // 由外部处理停止
        break;
      case RestartDecision.Resume:
        // 恢复继续处理
        break;
      case RestartDecision.Escalate:
        // 上报到父监督者
        if (this.parent) {
          this.parent.tell({
            type: 'ActorFailure',
            payload: { actor: child, error, message: failedMessage }
          } as any);
        }
        break;
    }
  }

  setStrategy(strategy: SupervisorStrategy): void {
    this.strategy = strategy;
  }

  addChild(path: string, ref: ActorRef): void {
    this.children.set(path, ref);
  }

  removeChild(path: string): void {
    this.children.delete(path);
  }

  performStart(): Promise<void> {
    return Promise.resolve();
  }

  performStop(): Promise<void> {
    return Promise.resolve();
  }

  performRestart(reason: Error): Promise<void> {
    return Promise.resolve();
  }

  processEnvelope(envelope: Envelope): Promise<void> {
    const result = this.receive(envelope.message);
    if (result instanceof Promise) {
      return result;
    }
    return Promise.resolve();
  }

  tell(message: unknown, sender?: ActorRef): void {
    this.receive(message as Message);
  }
}

/** 事件流Actor */
class EventStreamActor implements ActorLike {
  readonly id: string = uuidv4();
  lastFailureTime: number = 0;
  private subscribers: Map<string, (event: any) => void> = new Map();

  receive(message: Message): Promise<void> | void {
    const msg = message as any;
    if (msg.type === 'Subscribe' && msg.payload?.path) {
      this.subscribers.set(msg.payload.path, msg.payload.handler);
    } else if (msg.type === 'Unsubscribe' && msg.payload?.path) {
      this.subscribers.delete(msg.payload.path);
    } else {
      // 发布事件到所有订阅者
      for (const handler of Array.from(this.subscribers.values())) {
        try {
          handler(msg);
        } catch (error) {
          console.error('EventStream subscriber error:', error);
        }
      }
    }
    return Promise.resolve();
  }

  performStart(): Promise<void> {
    return Promise.resolve();
  }

  performStop(): Promise<void> {
    return Promise.resolve();
  }

  performRestart(reason: Error): Promise<void> {
    return Promise.resolve();
  }

  processEnvelope(envelope: Envelope): Promise<void> {
    const result = this.receive(envelope.message);
    if (result instanceof Promise) {
      return result;
    }
    return Promise.resolve();
  }

  tell(message: unknown, sender?: ActorRef): void {
    this.receive(message as Message);
  }
}

/**
 * ActorSystem - Actor运行时核心
 */
export class ActorSystem {
  readonly name: string;
  readonly path: string;

  private actors: Map<string, ActorRecord> = new Map();
  private actorPaths: Map<string, string> = new Map();
  private deadLetterActor: DeadLetterActor;
  private deadLetterRef: ActorRef;
  private eventStreamActor: EventStreamActor;
  private eventStreamRef: ActorRef;
  private userGuardian: ActorRef;
  private systemGuardian: ActorRef;
  private supervisorActor: SupervisorActor;

  private _terminated: boolean = false;
  private messageCounter: number = 0;

  private config: ActorSystemConfig;
  private dispatcher: IDispatcher;
  private errorRecovery: ErrorRecoveryExecutor;

  // 监督树
  private supervisionTree: Map<string, SupervisionTreeNode> = new Map();

  // 监视关系
  private watchedBy: Map<string, Set<string>> = new Map(); // actorPath -> watcherPaths

  constructor(name: string, config?: Partial<ActorSystemConfig>) {
    this.name = name;
    this.path = `taiji://${name}`;

    this.config = {
      name,
      logLevel: 'info',
      ...config
    };

    this.dispatcher = createDispatcher({
      type: DispatcherType.Default,
      throughput: 100,
      parallelism: 4
    });

    this.errorRecovery = new ErrorRecoveryExecutor();

    // 初始化系统Actor
    this.deadLetterActor = new DeadLetterActor();
    this.eventStreamActor = new EventStreamActor();
    this.supervisorActor = new SupervisorActor(
      config?.guardianStrategy || defaultSupervisorStrategy
    );

    // 创建系统Actor引用
    this.deadLetterRef = new DeadLetterActorRef(name);
    this.eventStreamRef = new LocalActorRef(`${this.path}/system/eventStream`);
    this.systemGuardian = new LocalActorRef(`${this.path}/system`);
    this.userGuardian = new LocalActorRef(`${this.path}/user`);

    // 初始化消息发送函数
    ActorRefs.setSendMessage((ref, envelope) => {
      this.deliverMessage(ref, envelope);
    });

    // 初始化监督树
    this.initSupervisionTree();
  }

  private initSupervisionTree(): void {
    // 添加系统Actor到监督树
    this.supervisionTree.set(this.systemGuardian.path, {
      actorPath: this.systemGuardian.path,
      parentPath: null,
      children: [],
      failureCount: 0
    });

    this.supervisionTree.set(this.userGuardian.path, {
      actorPath: this.userGuardian.path,
      parentPath: this.systemGuardian.path,
      children: [],
      failureCount: 0
    });
  }

  // ==================== 公共方法 ====================

  actorOf(propsOrClass: Props | (new () => ActorLike), name?: string): ActorRef {
    if (this._terminated) {
      throw new Error('ActorSystem has been terminated');
    }

    const actorName = name || generateActorName();
    const actorPath = `${this.path}/user/${actorName}`;

    // 检查路径是否已存在
    if (this.actorPaths.has(actorPath)) {
      throw new Error(`Actor with path ${actorPath} already exists`);
    }

    // 创建Actor实例
    let actor: ActorLike;
    let props: Props | undefined;

    if (typeof propsOrClass === 'function') {
      actor = new propsOrClass();
      props = undefined;
    } else {
      actor = {
        id: uuidv4(),
        lastFailureTime: 0,
        async receive(message: Message): Promise<void> {},
        async performStart(): Promise<void> {},
        async performStop(): Promise<void> {},
        async performRestart(reason: Error): Promise<void> {},
        async processEnvelope(envelope: Envelope): Promise<void> {
          await this.receive(envelope.message);
        }
      };
      props = propsOrClass;
    }

    // 创建引用
    const ref = new LocalActorRef(actorPath);

    // 创建上下文
    const context = new ActorContextImpl(actor, ref, this.userGuardian, this);

    // 创建邮箱
    const mailbox = createMailbox(props?.mailboxConfig);

    // 创建邮箱调度器
    const mailboxDispatcher = new MailboxDispatcher(
      mailbox,
      this.dispatcher,
      actorPath,
      async (envelope) => {
        await actor.processEnvelope(envelope);
      }
    );

    // 创建记录
    const record: ActorRecord = {
      actor,
      ref,
      context,
      mailbox,
      mailboxDispatcher,
      state: ActorState.Unstarted,
      children: [],
      supervisor: this.userGuardian,
      restartCount: 0,
      strategy: props?.supervisorStrategy || defaultSupervisorStrategy,
      lastFailureTime: 0
    };

    // 设置Actor上下文
    actor.context = context;

    // 注册Actor
    this.actors.set(ref.uid, record);
    this.actorPaths.set(actorPath, ref.uid);

    // 更新监督树
    this.addToSupervisionTree(actorPath, this.userGuardian.path);

    // 启动Actor
    this.startActor(record);

    // 添加到父Actor的子列表
    this.addChildToParent(this.userGuardian, ref);

    return ref;
  }

  findActor(path: string): ActorRef | undefined {
    const uid = this.actorPaths.get(path);
    if (!uid) return undefined;
    return this.actors.get(uid)?.ref;
  }

  async stop(actor: ActorRef): Promise<void> {
    const record = this.getActorRecord(actor);
    if (!record) return;

    // 停止所有子Actor
    for (const child of record.children.slice()) {
      await this.stop(child);
    }

    record.state = ActorState.Stopping;
    await record.actor.performStop();

    // 从监督树移除
    this.removeFromSupervisionTree(actor.path);

    // 从父Actor移除
    if (record.context.parent) {
      this.removeChildFromParent(record.context.parent, actor);
    }

    // 清理资源
    record.mailboxDispatcher.shutdown();

    this.removeActor(actor);
  }

  deadLetters(): ActorRef {
    return this.deadLetterRef;
  }

  eventStream(): ActorRef {
    return this.eventStreamRef;
  }

  async terminate(): Promise<void> {
    if (this._terminated) return;
    this._terminated = true;

    const records = Array.from(this.actors.values());
    for (const record of records) {
      try {
        await record.actor.performStop();
      } catch (error) {
        console.error(`Error stopping actor:`, error);
      }
    }

    this.actors.clear();
    this.actorPaths.clear();
    this.supervisionTree.clear();
    this.watchedBy.clear();

    this.dispatcher.shutdown();
  }

  // ==================== 监视机制 ====================

  watchActor(watcher: ActorRef, target: ActorRef): void {
    const targetPath = target.path;
    if (!this.watchedBy.has(targetPath)) {
      this.watchedBy.set(targetPath, new Set());
    }
    this.watchedBy.get(targetPath)!.add(watcher.path);
  }

  unwatchActor(watcher: ActorRef, target: ActorRef): void {
    const targetPath = target.path;
    this.watchedBy.get(targetPath)?.delete(watcher.path);
  }

  private notifyWatchers(actorPath: string, message: Message): void {
    const watchers = this.watchedBy.get(actorPath);
    if (!watchers) return;

    for (const watcherPath of Array.from(watchers)) {
      const watcherRef = this.findActor(watcherPath);
      if (watcherRef) {
        watcherRef.tell(message);
      }
    }
  }

  // ==================== 监督树 ====================

  private addToSupervisionTree(actorPath: string, parentPath: string): void {
    const node: SupervisionTreeNode = {
      actorPath,
      parentPath,
      children: [],
      failureCount: 0
    };
    this.supervisionTree.set(actorPath, node);

    // 添加到父节点的children
    const parentNode = this.supervisionTree.get(parentPath);
    if (parentNode) {
      parentNode.children.push(actorPath);
    }
  }

  private removeFromSupervisionTree(actorPath: string): void {
    const node = this.supervisionTree.get(actorPath);
    if (!node) return;

    // 从父节点移除
    if (node.parentPath) {
      const parentNode = this.supervisionTree.get(node.parentPath);
      if (parentNode) {
        parentNode.children = parentNode.children.filter(p => p !== actorPath);
      }
    }

    // 移除所有子节点
    for (const childPath of node.children) {
      this.removeFromSupervisionTree(childPath);
    }

    this.supervisionTree.delete(actorPath);
  }

  getSupervisionTree(): Map<string, SupervisionTreeNode> {
    return new Map(this.supervisionTree);
  }

  // ==================== 内部方法 ====================

  private startActor(record: ActorRecord): void {
    record.state = ActorState.Starting;
    record.actor.performStart()
      .then(() => {
        record.state = ActorState.Running;
      })
      .catch((error) => {
        this.handleActorFailure(record, error);
      });
  }

  private async handleActorFailure(record: ActorRecord, error: Error): Promise<void> {
    record.lastFailureTime = Date.now();
    record.lastError = error;
    record.state = ActorState.Restarting;

    // 获取监督策略
    const strategy = record.strategy;
    const stats = strategy.getStats(record.ref);

    // 执行监督决策
    const directive = strategy.handleFailure(record.ref, error, stats || {
      actorPath: record.ref.path,
      failureCount: record.restartCount,
      firstFailureTime: record.lastFailureTime,
      lastFailureTime: record.lastFailureTime,
      lastCause: error
    });

    switch (directive.decision) {
      case RestartDecision.Restart:
        await this.restartActor(record, error);
        break;
      case RestartDecision.Stop:
        await this.stopActor(record);
        break;
      case RestartDecision.Resume:
        record.state = ActorState.Running;
        break;
      case RestartDecision.Escalate:
        // 上报到父监督者
        if (record.supervisor) {
          record.supervisor.tell({
            type: 'ActorFailure',
            payload: {
              actor: record.ref,
              error,
              message: undefined
            }
          } as unknown as Message);
        }
        break;
    }

    // 通知监视者
    this.notifyWatchers(record.ref.path, {
      type: 'ActorRestart',
      payload: {
        actor: record.ref,
        error,
        decision: directive.decision
      }
    } as any);
  }

  private async restartActor(record: ActorRecord, reason: Error): Promise<void> {
    try {
      await record.actor.performRestart(reason);
      record.restartCount++;
      record.state = ActorState.Running;
      record.mailbox.clear();
    } catch (error) {
      // 重启失败，停止Actor
      await this.stopActor(record);
    }
  }

  private async stopActor(record: ActorRecord): Promise<void> {
    record.state = ActorState.Stopping;
    try {
      await record.actor.performStop();
    } catch (error) {
      console.error(`Error during actor stop:`, error);
    }
    record.state = ActorState.Stopped;

    // 清理
    this.removeFromSupervisionTree(record.ref.path);
    record.mailboxDispatcher.shutdown();
    this.removeActor(record.ref);

    // 通知监视者
    this.notifyWatchers(record.ref.path, {
      type: 'ActorDeath',
      payload: {
        actor: record.ref,
        timestamp: Date.now(),
        reason: record.lastError
      }
    } as any);
  }

  private deliverMessage(ref: ActorRef, envelope: Envelope): void {
    const record = this.getActorRecord(ref);
    if (!record) {
      // 发送到死信
      this.deadLetterActor.tell(envelope.message, envelope.sender);
      return;
    }

    if (record.state === ActorState.Stopped || record.state === ActorState.Stopping) {
      this.deadLetterActor.tell(envelope.message, envelope.sender);
      return;
    }

    // 发送消息到邮箱
    record.mailbox.push(envelope);
  }

  private processMessage(record: ActorRecord, envelope: Envelope): void {
    const startTime = Date.now();

    record.actor.processEnvelope(envelope)
      .then(() => {
        // 处理成功
      })
      .catch((error) => {
        this.handleActorFailure(record, error);
      });
  }

  private getActorRecord(ref: ActorRef): ActorRecord | undefined {
    return this.actors.get(ref.uid);
  }

  private addChildToParent(parent: ActorRef, child: ActorRef): void {
    const parentRecord = this.getActorRecord(parent);
    if (parentRecord) {
      parentRecord.context.addChild(child);
    }
  }

  private removeChildFromParent(parent: ActorRef, child: ActorRef): void {
    const parentRecord = this.getActorRecord(parent);
    if (parentRecord) {
      parentRecord.context.removeChild(child);
    }
  }

  private removeActor(ref: ActorRef): void {
    const path = ref.path;
    const uid = this.actorPaths.get(path);
    if (uid) {
      this.actors.delete(uid);
      this.actorPaths.delete(path);
    }
    this.watchedBy.delete(path);
  }

  // ==================== 系统Actor引用 ====================

  getSystemGuardian(): ActorRef {
    return this.systemGuardian;
  }

  getUserGuardian(): ActorRef {
    return this.userGuardian;
  }

  // ==================== 指标 ====================

  getMetrics(): ActorSystemMetrics {
    return {
      totalActors: this.actors.size,
      activeActors: Array.from(this.actors.values()).filter(r => r.state === ActorState.Running).length,
      stoppedActors: Array.from(this.actors.values()).filter(r => r.state === ActorState.Stopped).length,
      supervisionTree: this.supervisionTree.size,
      dispatcherMetrics: this.dispatcher.getMetrics()
    };
  }
}

/** Actor系统指标 */
export interface ActorSystemMetrics {
  totalActors: number;
  activeActors: number;
  stoppedActors: number;
  supervisionTree: number;
  dispatcherMetrics: any;
}
