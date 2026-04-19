/**
 * OpenTaiji Actor Runtime - Mailbox实现
 * 消息队列管理
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
  push(envelope: Envelope): boolean;
  pop(): Envelope | undefined;
  peek(): Envelope | undefined;
  clear(): void;
  isEmpty(): boolean;
  isFull(): boolean;
  size(): number;
  status(): MailboxStatus;
  suspend(): void;
  resume(): void;
  isSuspended(): boolean;
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
 * 容量无限制
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

  constructor(
    capacity: number = DEFAULT_BOUNDED_CAPACITY,
    overflow: 'reject' | 'block' | 'oldest' = 'reject'
  ) {
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
    let inserted = false;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.priorityFn(this.queue[i].message) < priority) {
        this.queue.splice(i, 0, envelope);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(envelope);
    }

    this.notifyMessage(envelope);
    return true;
  }

  isFull(): boolean {
    return false;
  }
}

/** 邮箱工厂 */
export function createMailbox(config?: MailboxConfig): IMailbox {
  if (!config) {
    return new UnboundedMailbox();
  }

  switch (config.mailboxType) {
    case MailboxType.Bounded:
      return new BoundedMailbox(
        config.capacity ?? DEFAULT_BOUNDED_CAPACITY,
        config.overflow ?? 'reject'
      );
    case MailboxType.Priority:
      return new PriorityMailbox();
    case MailboxType.Unbounded:
    default:
      return new UnboundedMailbox();
  }
}
