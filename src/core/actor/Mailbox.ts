/**
 * OpenTaiji Actor System - Mailbox实现
 * 消息队列管理，支持有界队列、优先级队列等
 */

import { 
  Message, 
  Envelope, 
  MailboxConfig, 
  MailboxType
} from './types';

/** 默认邮箱容量 */
export const DEFAULT_BOUNDED_CAPACITY = 1000;

/** 邮箱状态 */
export enum MailboxStatus {
  Open = 'open',
  Suspended = 'suspended',
  Closed = 'closed',
  Full = 'full'
}

/**
 * 邮箱接口
 * 管理Actor的消息队列
 */
export interface IMailbox {
  /** 推送消息到队列 */
  push(envelope: Envelope): boolean;
  
  /** 从队列取出消息 */
  pop(): Envelope | undefined;
  
  /** 查看但不移除消息 */
  peek(): Envelope | undefined;
  
  /** 清空队列 */
  clear(): void;
  
  /** 队列是否为空 */
  isEmpty(): boolean;
  
  /** 队列是否已满 */
  isFull(): boolean;
  
  /** 当前消息数量 */
  size(): number;
  
  /** 状态 */
  status(): MailboxStatus;
  
  /** 暂停处理 */
  suspend(): void;
  
  /** 恢复处理 */
  resume(): void;
  
  /** 是否已暂停 */
  isSuspended(): boolean;
  
  /** 注册消费者回调 */
  onMessage(handler: (envelope: Envelope) => void | Promise<void>): void;
}

/**
 * 邮箱实现基类
 */
export abstract class MailboxBase implements IMailbox {
  protected queue: Envelope[] = [];
  protected _status: MailboxStatus = MailboxStatus.Open;
  protected messageHandlers: Array<(envelope: Envelope) => void | Promise<void>> = [];
  
  abstract push(envelope: Envelope): boolean;
  abstract isFull(): boolean;
  
  pop(): Envelope | undefined {
    return this.queue.shift();
  }
  
  peek(): Envelope | undefined {
    return this.queue[0];
  }
  
  clear(): void {
    this.queue = [];
  }
  
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
  
  size(): number {
    return this.queue.length;
  }
  
  status(): MailboxStatus {
    return this._status;
  }
  
  suspend(): void {
    this._status = MailboxStatus.Suspended;
  }
  
  resume(): void {
    this._status = MailboxStatus.Open;
  }
  
  isSuspended(): boolean {
    return this._status === MailboxStatus.Suspended;
  }
  
  onMessage(handler: (envelope: Envelope) => void | Promise<void>): void {
    this.messageHandlers.push(handler);
  }
  
  protected notifyMessage(envelope: Envelope): void {
    for (const handler of this.messageHandlers) {
      handler(envelope);
    }
  }
}

/**
 * 无界邮箱
 * 容量无限制，使用数组实现
 */
export class UnboundedMailbox extends MailboxBase {
  push(envelope: Envelope): boolean {
    if (this._status === MailboxStatus.Closed) {
      return false;
    }
    this.queue.push(envelope);
    this.notifyMessage(envelope);
    return true;
  }
  
  isFull(): boolean {
    return false;
  }
}

/**
 * 有界邮箱
 * 容量有限，支持溢出策略
 */
export class BoundedMailbox extends MailboxBase {
  private readonly capacity: number;
  private readonly overflowStrategy: 'reject' | 'block' | 'oldest';
  
  constructor(capacity: number = DEFAULT_BOUNDED_CAPACITY, overflow: 'reject' | 'block' | 'oldest' = 'reject') {
    super();
    this.capacity = capacity;
    this.overflowStrategy = overflow;
  }
  
  push(envelope: Envelope): boolean {
    if (this._status === MailboxStatus.Closed) {
      return false;
    }
    
    if (this.queue.length >= this.capacity) {
      switch (this.overflowStrategy) {
        case 'reject':
          this._status = MailboxStatus.Full;
          return false;
        case 'block':
          return false;
        case 'oldest':
          this.queue.shift();
          break;
      }
    }
    
    this.queue.push(envelope);
    this.notifyMessage(envelope);
    return true;
  }
  
  isFull(): boolean {
    return this.queue.length >= this.capacity;
  }
}

/**
 * 优先级邮箱
 * 根据消息优先级排序
 */
export class PriorityMailbox extends MailboxBase {
  private readonly priorityFn: (message: Message) => number;
  
  constructor(
    priorityFn: (message: Message) => number = (msg) => (msg as any).priority ?? 0
  ) {
    super();
    this.priorityFn = priorityFn;
  }
  
  push(envelope: Envelope): boolean {
    if (this._status === MailboxStatus.Closed) {
      return false;
    }
    
    const priority = this.priorityFn(envelope.message);
    const insertIndex = this.findInsertIndex(priority);
    this.queue.splice(insertIndex, 0, envelope);
    this.notifyMessage(envelope);
    return true;
  }
  
  isFull(): boolean {
    return false;
  }
  
  private findInsertIndex(priority: number): number {
    let low = 0;
    let high = this.queue.length;
    
    while (low < high) {
      const mid = (low + high) >>> 1;
      const midPriority = this.priorityFn(this.queue[mid].message);
      if (midPriority < priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    
    return low;
  }
}

/**
 * 邮箱工厂
 */
export class MailboxFactory {
  private static mailboxImplementations: Map<MailboxType, new (...args: any[]) => MailboxBase> = new Map([
    [MailboxType.Unbounded, UnboundedMailbox],
    [MailboxType.Bounded, BoundedMailbox],
    [MailboxType.Priority, PriorityMailbox],
  ]);
  
  /**
   * 创建邮箱实例
   */
  static create(type: MailboxType, config?: Partial<MailboxConfig>): MailboxBase {
    const ImplementationClass = this.mailboxImplementations.get(type) || UnboundedMailbox;
    
    switch (type) {
      case MailboxType.Bounded:
        return new ImplementationClass(
          config?.capacity ?? DEFAULT_BOUNDED_CAPACITY,
          config?.overflow ?? 'reject'
        ) as BoundedMailbox;
      case MailboxType.Priority:
        return new ImplementationClass(
          (msg: Message) => (msg as any).priority ?? 0
        ) as PriorityMailbox;
      default:
        return new ImplementationClass();
    }
  }
  
  /**
   * 注册自定义邮箱类型
   */
  static register(type: MailboxType, implementation: new (...args: any[]) => MailboxBase): void {
    this.mailboxImplementations.set(type, implementation);
  }
}

/**
 * 邮箱装饰器 - 用于监控邮箱状态
 */
export class MonitoredMailbox implements IMailbox {
  constructor(
    private inner: MailboxBase,
    private metrics?: {
      onPush?: (size: number) => void;
      onPop?: (size: number) => void;
      onFull?: () => void;
      onSuspend?: () => void;
      onResume?: () => void;
    }
  ) {}
  
  push(envelope: Envelope): boolean {
    const success = this.inner.push(envelope);
    if (success) {
      this.metrics?.onPush?.(this.inner.size());
    } else {
      this.metrics?.onFull?.();
    }
    return success;
  }
  
  pop(): Envelope | undefined {
    const envelope = this.inner.pop();
    if (envelope) {
      this.metrics?.onPop?.(this.inner.size());
    }
    return envelope;
  }
  
  peek(): Envelope | undefined {
    return this.inner.peek();
  }
  
  clear(): void {
    this.inner.clear();
  }
  
  isEmpty(): boolean {
    return this.inner.isEmpty();
  }
  
  isFull(): boolean {
    return this.inner.isFull();
  }
  
  size(): number {
    return this.inner.size();
  }
  
  status(): MailboxStatus {
    return this.inner.status();
  }
  
  suspend(): void {
    this.inner.suspend();
    this.metrics?.onSuspend?.();
  }
  
  resume(): void {
    this.inner.resume();
    this.metrics?.onResume?.();
  }
  
  isSuspended(): boolean {
    return this.inner.isSuspended();
  }
  
  onMessage(handler: (envelope: Envelope) => void | Promise<void>): void {
    this.inner.onMessage(handler);
  }
}
