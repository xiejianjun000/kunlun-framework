/**
 * OpenTaiji Actor System - Stash支持
 * 允许Actor暂存消息，在适当时候重新处理
 */

import { Message, Envelope } from './types';

/**
 * Stash接口
 * 提供消息暂存能力
 */
export interface IStash {
  /** 暂存消息到栈 */
  stash(message: Message): void;
  
  /** 暂存信封到栈 */
  stashEnvelope(envelope: Envelope): void;
  
  /** 从栈中弹出消息 */
  unstash(): Message | undefined;
  
  /** 批量弹出所有消息 */
  unstashAll(): Message[];
  
  /** 批量弹出一批消息 */
  unstashBatch(count: number): Message[];
  
  /** 清空暂存栈 */
  clearStash(): void;
  
  /** 获取暂存栈大小 */
  stashSize(): number;
  
  /** 暂存栈是否为空 */
  stashIsEmpty(): boolean;
}

/**
 * Stash实现
 */
export class Stash implements IStash {
  private stack: Envelope[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }
  
  stash(message: Message): void {
    if (this.stack.length >= this.maxSize) {
      throw new Error(`Stash overflow: max size ${this.maxSize} reached`);
    }
    
    this.stack.push({
      message,
      timestamp: Date.now()
    });
  }
  
  stashEnvelope(envelope: Envelope): void {
    if (this.stack.length >= this.maxSize) {
      throw new Error(`Stash overflow: max size ${this.maxSize} reached`);
    }
    
    this.stack.push(envelope);
  }
  
  unstash(): Message | undefined {
    const envelope = this.stack.pop();
    return envelope?.message;
  }
  
  unstashAll(): Message[] {
    const messages = this.stack.map(e => e.message);
    this.stack = [];
    return messages;
  }
  
  unstashBatch(count: number): Message[] {
    const batch: Message[] = [];
    for (let i = 0; i < count && this.stack.length > 0; i++) {
      const envelope = this.stack.pop();
      if (envelope) {
        batch.push(envelope.message);
      }
    }
    return batch;
  }
  
  clearStash(): void {
    this.stack = [];
  }
  
  stashSize(): number {
    return this.stack.length;
  }
  
  stashIsEmpty(): boolean {
    return this.stack.length === 0;
  }
}

/**
 * Stash支持混入
 * 为Actor提供暂存消息的能力
 */
export abstract class StashSupport {
  private _stash: Stash | undefined;
  private _stashEnabled: boolean = true;
  
  /** 获取或创建Stash实例 */
  protected get stash(): Stash {
    if (!this._stash) {
      this._stash = new Stash();
    }
    return this._stash;
  }
  
  /** 是否启用Stash */
  protected set stashEnabled(enabled: boolean) {
    this._stashEnabled = enabled;
  }
  
  protected get stashEnabled(): boolean {
    return this._stashEnabled;
  }
  
  /** 暂存当前消息 */
  protected doStash(message: Message): void {
    if (this._stashEnabled) {
      this.stash.stash(message);
    }
  }
  
  /** 暂存信封 */
  protected doStashEnvelope(envelope: Envelope): void {
    if (this._stashEnabled) {
      this.stash.stashEnvelope(envelope);
    }
  }
  
  /** 取消暂存所有消息 */
  protected doUnstashAll(): Message[] {
    return this.stash.unstashAll();
  }
  
  /** 取消暂存一批消息 */
  protected doUnstashBatch(count: number): Message[] {
    return this.stash.unstashBatch(count);
  }
  
  /** 清空暂存 */
  protected doClearStash(): void {
    this.stash.clearStash();
  }
  
  /** 获取暂存大小 */
  protected getStashSize(): number {
    return this.stash.stashSize();
  }
  
  /** 暂存是否为空 */
  protected isStashEmpty(): boolean {
    return this.stash.stashIsEmpty();
  }
}

/**
 * 自定义Stash策略接口
 */
export interface StashPolicy {
  /** 判断消息是否应该暂存 */
  shouldStash(message: Message): boolean;
  
  /** 获取暂存最大容量 */
  getMaxSize(): number;
  
  /** 获取处理暂存消息的触发条件 */
  getUnstashTrigger(): UnstashTrigger;
}

/** 取消暂存触发条件 */
export type UnstashTrigger = 
  | { type: 'immediate' }
  | { type: 'afterReceive'; messageType: string }
  | { type: 'afterBatch'; count: number }
  | { type: 'custom'; predicate: () => boolean };

/**
 * 默认Stash策略
 */
export class DefaultStashPolicy implements StashPolicy {
  constructor(
    private pattern: RegExp | string[] = []
  ) {}
  
  shouldStash(message: Message): boolean {
    if (Array.isArray(this.pattern)) {
      return this.pattern.includes(message.type);
    }
    if (this.pattern instanceof RegExp) {
      return this.pattern.test(message.type);
    }
    return false;
  }
  
  getMaxSize(): number {
    return 1000;
  }
  
  getUnstashTrigger(): UnstashTrigger {
    return { type: 'immediate' };
  }
}

/**
 * 批量Stash策略
 * 达到一定数量才处理暂存消息
 */
export class BatchStashPolicy implements StashPolicy {
  constructor(
    private batchSize: number = 10,
    private pattern: RegExp | string[] = []
  ) {}
  
  shouldStash(message: Message): boolean {
    if (Array.isArray(this.pattern)) {
      return this.pattern.includes(message.type);
    }
    if (this.pattern instanceof RegExp) {
      return this.pattern.test(message.type);
    }
    return true;
  }
  
  getMaxSize(): number {
    return this.batchSize * 10;
  }
  
  getUnstashTrigger(): UnstashTrigger {
    return { type: 'afterBatch', count: this.batchSize };
  }
}
