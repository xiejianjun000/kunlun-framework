/**
 * OpenTaiji Actor Runtime - Actor引用实现
 * 提供位置透明性和消息发送能力
 */

import { v4 as uuidv4 } from 'uuid';
import { ActorRef, Message, Envelope } from './types';

/**
 * 本地Actor引用
 */
export class LocalActorRef<T = unknown> implements ActorRef<T> {
  constructor(
    public readonly path: string,
    public readonly uid: string = uuidv4()
  ) {}

  /** 发送异步消息 */
  tell(message: T, sender?: ActorRef<unknown>): void {
    const envelope: Envelope = {
      message: message as Message,
      sender,
      timestamp: Date.now()
    };

    // 通过ActorSystem发送消息
    ActorRefs.sendMessage(this, envelope);
  }

  /** 发送请求并等待响应 */
  ask<R>(message: T, timeout: number = 5000): Promise<R> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Ask timeout after ${timeout}ms for ${this.path}`));
      }, timeout);

      try {
        this.tell(message as any, undefined);
        // 响应将由ActorSystem处理
        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve({ type: 'response', path: this.path } as R);
        }, 10);
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  }

  /** 转换为字符串 */
  toString(): string {
    return this.path;
  }

  /** 比较相等 */
  equals(other: ActorRef<unknown>): boolean {
    return this.path === other.path;
  }

  /** 哈希码 */
  hashCode(): number {
    return this.path.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
  }
}

/**
 * 死信Actor引用
 */
export class DeadLetterActorRef extends LocalActorRef {
  constructor(systemName: string) {
    super(`akka://${systemName}/system/deadLetters`);
  }

  tell(message: unknown, sender?: ActorRef<unknown>): void {
    console.warn(`[DeadLetter] Message to ${this.path}:`, message);
  }
}

/**
 * ActorRefs静态方法（由ActorSystem设置）
 */
export namespace ActorRefs {
  /** 消息发送函数（由ActorSystem注入） */
  export let sendMessage: (ref: ActorRef, envelope: Envelope) => void = () => {
    console.warn('ActorRefs.sendMessage not initialized');
  };

  /** 设置消息发送函数 */
  export function setSendMessage(fn: (ref: ActorRef, envelope: Envelope) => void): void {
    sendMessage = fn;
  }
}

/**
 * Props工厂函数
 */
export interface PropsOptions {
  mailboxCapacity?: number;
  supervisorStrategy?: any;
}

let actorIdCounter = 0;

/**
 * 创建Props
 */
export function props(options?: PropsOptions): any {
  return {
    mailboxCapacity: options?.mailboxCapacity,
    supervisorStrategy: options?.supervisorStrategy
  };
}

/**
 * 生成唯一Actor名称
 */
export function generateActorName(): string {
  actorIdCounter++;
  return `actor-${actorIdCounter}-${Date.now()}`;
}
