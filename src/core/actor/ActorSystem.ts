/**
 * OpenTaiji Actor System - ActorSystem
 * 核心Actor运行时系统
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ActorPath,
  ActorRef,
  Props,
  ActorSelection
} from './ActorPath';
import {
  Actor,
  ActorContextImpl,
  IActorSystem,
  ActorState
} from './Actor';
import {
  IMailbox,
  UnboundedMailbox,
  MailboxFactory
} from './Mailbox';
import {
  OneForOneSupervisorStrategy,
  RestartDecision
} from './Supervisor';
import {
  Message,
  Envelope,
  ActorSystemConfig,
  DeadLetter,
  DeadLetterHandler,
  MailboxType
} from './types';

/** Actor记录 */
interface ActorRecord {
  actor: Actor;
  ref: ActorRef;
  context: ActorContextImpl;
  mailbox: IMailbox;
  state: ActorState;
  children: Set<ActorRef>;
  supervisor: ActorRef | undefined;
  restartCount: number;
}

/** 死信Actor */
class DeadLetterActor extends Actor {
  private handlers: DeadLetterHandler[] = [];
  
  async receive(message: Message): Promise<void> {
    if (message.type === 'deadLetter') {
      const deadLetter = message as unknown as DeadLetter;
      for (const handler of this.handlers) {
        handler(deadLetter);
      }
    }
  }
  
  addHandler(handler: DeadLetterHandler): void {
    this.handlers.push(handler);
  }
}

/** 事件流Actor */
class EventStreamActor extends Actor {
  async receive(message: Message): Promise<void> {
    if (message.type === 'publish') {
      const { topic, payload } = message as any;
      const subscribers = (this as any)._subscriptions?.get(topic);
      if (subscribers) {
        for (const subscriber of subscribers) {
          subscriber.tell({ type: 'event', topic, payload, timestamp: Date.now() }, undefined);
        }
      }
    }
  }
}

/** 空Actor用于Guardian */
class GuardianActor extends Actor {
  async receive(message: Message): Promise<void> {}
}

/**
 * ActorSystem - Actor系统核心
 * 管理所有Actor的生命周期和消息路由
 */
export class ActorSystem implements IActorSystem {
  readonly name: string;
  readonly path: ActorPath;
  
  private actors: Map<string, ActorRecord> = new Map();
  private actorNames: Map<string, string> = new Map();
  private deadLetterActor: DeadLetterActor;
  private eventStreamActor: EventStreamActor;
  private deadLetterRef: ActorRef;
  private eventStreamRef: ActorRef;
  private userGuardian: ActorRef;
  private systemGuardian: ActorRef;
  
  private _terminated: boolean = false;
  private messageCounter: number = 0;
  
  private config: ActorSystemConfig;
  
  constructor(name: string, config?: Partial<ActorSystemConfig>) {
    this.name = name;
    this.path = ActorPath.root(name);
    this.config = {
      name,
      defaultMailbox: { mailboxType: MailboxType.Unbounded },
      logLevel: 'info',
      ...config
    };
    
    // 初始化系统Actor
    this.deadLetterActor = new DeadLetterActor();
    this.eventStreamActor = new EventStreamActor();
    
    // 创建系统Actor引用
    this.deadLetterRef = this.createSystemActorRef(
      ActorPath.parse(`akka://${name}/system/deadLetters`),
      this.deadLetterActor
    );
    this.eventStreamRef = this.createSystemActorRef(
      ActorPath.parse(`akka://${name}/system/eventStream`),
      this.eventStreamActor
    );
    
    // 创建Guardian Actor
    this.systemGuardian = this.createGuardian('system');
    this.userGuardian = this.createGuardian('user');
  }
  
  // ==================== IActorSystem 实现 ====================
  
  actorOf(props: Props, name?: string): ActorRef {
    if (this._terminated) {
      throw new Error('ActorSystem has been terminated');
    }
    
    const actorName = name || this.generateActorName();
    const actorPath = this.userGuardian.path.child(actorName);
    
    return this.createActor(props, actorPath, this.userGuardian);
  }
  
  findActor(path: ActorPath): ActorRef | undefined {
    const pathStr = path.toString();
    const uid = this.actorNames.get(pathStr);
    if (!uid) return undefined;
    
    const record = this.actors.get(uid);
    return record?.ref;
  }
  
  select(pathPattern: string): ActorSelection {
    return new ActorSelection(this.userGuardian, pathPattern);
  }
  
  async stop(actor: ActorRef): Promise<void> {
    const record = this.getActorRecord(actor);
    if (!record) return;
    
    for (const child of record.children) {
      await this.stop(child);
    }
    
    record.state = ActorState.Stopping;
    await record.actor.performStop();
    
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
    
    for (const [uid, record] of this.actors) {
      try {
        await record.actor.performStop();
      } catch (error) {
        console.error(`Error stopping actor:`, error);
      }
    }
    
    this.actors.clear();
    this.actorNames.clear();
  }
  
  // ==================== Actor创建 ====================
  
  private createActor(
    props: Props,
    path: ActorPath,
    supervisor: ActorRef | undefined
  ): ActorRef {
    const uid = uuidv4();
    
    // 创建Actor实例
    const actor = props.createActorInstance();
    
    // 创建邮箱
    const mailbox = new UnboundedMailbox();
    
    // 创建引用
    const ref = this.createActorRef(path, uid, actor);
    
    // 创建上下文
    const context = new ActorContextImpl(
      ref,
      supervisor,
      path,
      path.name,
      this,
      props.dispatcher || 'default'
    );
    
    // 初始化Actor
    actor.init(context);
    
    // 创建记录
    const record: ActorRecord = {
      actor,
      ref,
      context,
      mailbox,
      state: ActorState.Starting,
      children: new Set(),
      supervisor,
      restartCount: 0
    };
    
    // 注册
    this.actors.set(uid, record);
    this.actorNames.set(path.toString(), uid);
    
    // 通知父级
    if (supervisor) {
      const parentRecord = this.getActorRecord(supervisor);
      parentRecord?.children.add(ref);
    }
    
    // 注册消息处理
    mailbox.onMessage(async (envelope) => {
      await this.processMessage(ref, envelope);
    });
    
    // 启动Actor
    this.startActor(record);
    
    return ref;
  }
  
  private createActorRef(
    path: ActorPath,
    uid: string,
    actor: Actor
  ): ActorRef {
    const ref = new ActorRef(path, uid);
    
    // 重写tell方法，实现实际的消息发送
    ref.tell = ((message: unknown, sender?: ActorRef) => {
      const record = this.getActorRecord(ref);
      if (!record || record.state === ActorState.Stopped) {
        // 发送到死信队列
        this.deadLetterRef.tell({
          type: 'deadLetter',
          message,
          recipient: ref,
          sender,
          timestamp: Date.now()
        }, undefined);
        return;
      }
      
      const envelope: Envelope = {
        message: message as Message,
        sender,
        timestamp: Date.now()
      };
      
      record.mailbox.push(envelope);
    }) as any;
    
    // 重写ask方法
    ref.ask = ((message: unknown, timeout: number = 5000) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Ask timeout after ${timeout}ms`));
        }, timeout);
        
        // 创建临时回复引用
        const replyRef = new ActorRef(ref.path.parent() || ActorPath.root(this.name));
        const originalTell = replyRef.tell.bind(replyRef);
        
        replyRef.tell = ((msg: any) => {
          clearTimeout(timeoutId);
          resolve(msg);
        }) as any;
        
        // 发送消息
        ref.tell(message, replyRef as any);
      });
    }) as any;
    
    return ref;
  }
  
  private createSystemActorRef(path: ActorPath, actor: Actor): ActorRef {
    const uid = uuidv4();
    const ref = new ActorRef(path, uid);
    const context = new ActorContextImpl(
      ref,
      undefined,
      path,
      path.name,
      this,
      'default'
    );
    
    actor.init(context);
    
    this.actors.set(uid, {
      actor,
      ref,
      context,
      mailbox: new UnboundedMailbox(),
      state: ActorState.Running,
      children: new Set(),
      supervisor: undefined,
      restartCount: 0
    });
    
    this.actorNames.set(path.toString(), uid);
    
    return ref;
  }
  
  private createGuardian(name: string): ActorRef {
    const path = ActorPath.parse(`akka://${this.name}/${name}`);
    const uid = uuidv4();
    const actor = new GuardianActor();
    const ref = new ActorRef(path, uid);
    
    const context = new ActorContextImpl(
      ref,
      undefined,
      path,
      name,
      this,
      'default'
    );
    
    actor.init(context);
    
    this.actors.set(uid, {
      actor,
      ref,
      context,
      mailbox: new UnboundedMailbox(),
      state: ActorState.Running,
      children: new Set(),
      supervisor: undefined,
      restartCount: 0
    });
    
    this.actorNames.set(path.toString(), uid);
    
    return ref;
  }
  
  private startActor(record: ActorRecord): void {
    record.actor.performStart().catch((error) => {
      console.error(`Failed to start actor:`, error);
      this.handleActorFailure(record, error);
    });
  }
  
  // ==================== 消息处理 ====================
  
  private async processMessage(ref: ActorRef, envelope: Envelope): Promise<void> {
    const record = this.getActorRecord(ref);
    if (!record || record.state === ActorState.Stopped) {
      this.deadLetterRef.tell({
        type: 'deadLetter',
        message: envelope.message,
        recipient: ref,
        sender: envelope.sender,
        timestamp: Date.now()
      }, undefined);
      return;
    }
    
    if (record.mailbox.isSuspended()) {
      return;
    }
    
    try {
      await record.actor.processEnvelope(envelope);
    } catch (error) {
      await this.handleActorFailure(record, error as Error, envelope);
    }
  }
  
  private async handleActorFailure(
    record: ActorRecord,
    error: Error,
    envelope?: Envelope
  ): Promise<void> {
    if (record.state === ActorState.Restarting || record.state === ActorState.Stopping) {
      return;
    }
    
    const stats = {
      actorPath: record.ref.path,
      failureCount: record.restartCount,
      firstFailureTime: Date.now(),
      lastFailureTime: Date.now(),
      lastCause: error
    };
    
    // 使用默认的OneForOne策略
    const strategy = new OneForOneSupervisorStrategy();
    const directive = strategy.handleFailure(record.ref, error, stats);
    
    switch (directive.decision) {
      case RestartDecision.Restart:
        await this.restartActor(record, error);
        break;
      case RestartDecision.Stop:
        await this.stopActor(record);
        break;
      case RestartDecision.Resume:
        break;
      case RestartDecision.Escalate:
        if (record.supervisor) {
          const supervisorRecord = this.getActorRecord(record.supervisor);
          if (supervisorRecord) {
            await this.handleActorFailure(supervisorRecord, error, envelope);
          }
        }
        break;
    }
  }
  
  private async restartActor(record: ActorRecord, reason: Error): Promise<void> {
    record.state = ActorState.Restarting;
    record.restartCount++;
    
    try {
      await record.actor.performRestart(reason);
      record.state = ActorState.Running;
    } catch (error) {
      console.error(`Failed to restart actor:`, error);
      await this.stopActor(record);
    }
  }
  
  private async stopActor(record: ActorRecord): Promise<void> {
    record.state = ActorState.Stopping;
    
    for (const child of record.children) {
      const childRecord = this.getActorRecord(child);
      if (childRecord) {
        await this.stopActor(childRecord);
      }
    }
    
    try {
      await record.actor.performStop();
    } catch (error) {
      console.error(`Error during stop:`, error);
    }
    
    this.removeActor(record.ref);
    record.state = ActorState.Stopped;
  }
  
  private removeActor(ref: ActorRef): void {
    const record = this.actors.get(ref.uid);
    if (!record) return;
    
    if (record.supervisor) {
      const parentRecord = this.getActorRecord(record.supervisor);
      parentRecord?.children.delete(ref);
    }
    
    record.context.clearChildren();
    this.actors.delete(ref.uid);
    this.actorNames.delete(record.ref.path.toString());
  }
  
  // ==================== 辅助方法 ====================
  
  private getActorRecord(ref: ActorRef): ActorRecord | undefined {
    return this.actors.get(ref.uid);
  }
  
  private generateActorName(): string {
    return `$anon-${this.messageCounter++}`;
  }
  
  /**
   * 设置默认监督策略
   */
  setDefaultSupervisorStrategy(strategy: any): void {
    // 应用到user guardian
    // 实现略
  }
}

/**
 * Props 工厂函数
 */
export function props<T extends Actor>(
  producer: () => T
): Props {
  return new Props(producer);
}

/**
 * 创建带邮箱配置的Props
 */
export function boundedProps<T extends Actor>(
  producer: () => T,
  capacity: number
): Props {
  return new Props(producer, 'bounded');
}
