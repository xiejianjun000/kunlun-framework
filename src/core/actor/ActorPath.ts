/**
 * OpenTaiji Actor System - Actor路径和引用
 * 实现位置透明性和Actor选择器
 */

import { v4 as uuidv4 } from 'uuid';
import { Actor, IActorSystem } from './Actor';

/** Actor路径字符串格式 */
export type ActorPathString = string;

/** 系统Actor路径 */
export const SYSTEM_ACTOR_PATH = 'akka://open-taiji/system';

/** 用户 Guardian 路径 */
export const USER_GUARDIAN_PATH = 'akka://open-taiji/user';

/** 系统 Guardian 路径 */
export const SYSTEM_GUARDIAN_PATH = 'akka://open-taiji/system';

/** 死信Actor路径 */
export const DEAD_LETTERS_PATH = 'akka://open-taiji/system/deadLetters';

/** 事件流Actor路径 */
export const EVENT_STREAM_PATH = 'akka://open-taiji/system/eventStream';

/**
 * Actor路径
 * 格式: akka://actor-system-name/@remote-address/user/parent1/.../actor-name
 */
export class ActorPath {
  private readonly _serialized: string;
  private readonly _segments: readonly string[];
  
  private constructor(
    public readonly systemName: string,
    public readonly remoteAddress: string | undefined,
    segments: string[]
  ) {
    this._segments = Object.freeze([...segments]);
    this._serialized = this.buildPathString();
  }
  
  /** 从字符串创建Actor路径 */
  static parse(pathString: string): ActorPath {
    const match = pathString.match(/^akka:\/\/([^/]+)(\/(.+))?$/);
    if (!match) {
      throw new Error(`Invalid actor path: ${pathString}`);
    }
    
    const systemName = match[1];
    const pathPart = match[3] || '';
    const segments = pathPart.split('/').filter(s => s.length > 0);
    
    // 解析远程地址
    let remoteAddress: string | undefined;
    if (segments.length > 0 && segments[0].startsWith('@')) {
      remoteAddress = segments[0].substring(1);
    }
    
    return new ActorPath(systemName, remoteAddress, segments);
  }
  
  /** 创建根路径 */
  static root(systemName: string): ActorPath {
    return new ActorPath(systemName, undefined, []);
  }
  
  /** 创建子路径 */
  child(name: string): ActorPath {
    return new ActorPath(
      this.systemName,
      this.remoteAddress,
      [...this._segments, name]
    );
  }
  
  /** 获取父路径 */
  parent(): ActorPath | undefined {
    if (this._segments.length === 0) {
      return undefined;
    }
    return new ActorPath(
      this.systemName,
      this.remoteAddress,
      this._segments.slice(0, -1)
    );
  }
  
  /** 获取Actor名称（路径最后一段） */
  get name(): string {
    return this._segments.length > 0 
      ? this._segments[this._segments.length - 1] 
      : '';
  }
  
  /** 获取层级深度 */
  get depth(): number {
    return this._segments.length;
  }
  
  /** 是否为根路径 */
  get isRoot(): boolean {
    return this._segments.length === 0;
  }
  
  /** 是否为远程路径 */
  get isRemote(): boolean {
    return this.remoteAddress !== undefined;
  }
  
  /** 是否为系统Actor */
  get isSystemActor(): boolean {
    return this._segments.length > 0 && this._segments[0] === 'system';
  }
  
  /** 是否为用户Actor */
  get isUserActor(): boolean {
    return this._segments.length > 0 && this._segments[0] === 'user';
  }
  
  /** 获取路径段列表 */
  get segments(): readonly string[] {
    return this._segments;
  }
  
  /** 获取远程地址 */
  get address(): string | undefined {
    return this.remoteAddress;
  }
  
  /** 转换为字符串 */
  toString(): string {
    return this._serialized;
  }
  
  /** 转换为URL安全的字符串 */
  toUriEncoded(): string {
    return encodeURIComponent(this._serialized);
  }
  
  private buildPathString(): string {
    let path = `akka://${this.systemName}`;
    if (this.remoteAddress) {
      path += `/${this.remoteAddress}`;
    }
    for (const segment of this._segments) {
      path += `/${segment}`;
    }
    return path;
  }
  
  /** 路径相等比较 */
  equals(other: ActorPath): boolean {
    return this._serialized === other._serialized;
  }
  
  /** 哈希码 */
  hashCode(): number {
    return this._serialized.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
  }
}

/**
 * Actor引用
 * 提供位置透明性，允许跨进程发送消息
 */
export class ActorRef<T = unknown> {
  constructor(
    public readonly path: ActorPath,
    public readonly uid: string = uuidv4()
  ) {}
  
  /** 发送异步消息 */
  tell(message: T, sender?: ActorRef<unknown>): void {
    throw new Error('ActorRef.tell must be overridden');
  }
  
  /** 发送请求并等待响应 */
  ask<R>(message: T, timeout: number = 5000): Promise<R> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Ask timeout after ${timeout}ms`));
      }, timeout);
      
      try {
        // 发送消息，携带回复引用
        this.tell(message as any, undefined);
        // 模拟收到响应 - 实际由ActorSystem实现
        setTimeout(() => {
          clearTimeout(timeoutId);
          resolve({ type: 'response' } as R);
        }, 10);
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  }
  
  /** 转换为字符串 */
  toString(): string {
    return `${this.constructor.name}[${this.path}]`;
  }
  
  /** 路径相等比较 */
  equals(other: ActorRef): boolean {
    return this.uid === other.uid;
  }
  
  /** 哈希码 */
  hashCode(): number {
    return this.uid.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
  }
  
  /** 引用相等比较 */
  compareTo(other: ActorRef): number {
    return this.uid.localeCompare(other.uid);
  }
  
  /** 是否为本地引用 */
  isLocal(): boolean {
    return true;
  }
}

/**
 * 本地Actor引用
 */
export class LocalActorRef<T = unknown> extends ActorRef<T> {
  constructor(
    path: ActorPath,
    uid: string = uuidv4(),
    private sender: (message: T, sender?: ActorRef<unknown>) => void = () => {}
  ) {
    super(path, uid);
  }
  
  tell(message: T, sender?: ActorRef<unknown>): void {
    this.sender(message, sender);
  }
  
  override isLocal(): boolean {
    return true;
  }
}

/**
 * Actor选择器
 * 用于按路径模式匹配多个Actor
 */
export class ActorSelection {
  constructor(
    public readonly anchorRef: ActorRef,
    public readonly pathPattern: string
  ) {}
  
  /** 发送消息给所有匹配的Actor */
  tell(message: unknown, sender?: ActorRef<unknown>): void {
    const matches = this.resolveMatches();
    for (const ref of matches) {
      ref.tell(message, sender);
    }
  }
  
  /** 解析匹配的Actor引用列表 */
  resolveMatches(): ActorRef[] {
    return [];
  }
  
  /** 获取路径模式 */
  getPathPattern(): string {
    return this.pathPattern;
  }
  
  toString(): string {
    return `ActorSelection[anchor=${this.anchorRef}, pattern=${this.pathPattern}]`;
  }
}

/**
 * Props - Actor创建配置
 * 不可变配置对象，用于创建Actor实例
 */
export class Props {
  constructor(
    public readonly producer: () => Actor,
    public readonly mailboxType: string = 'unbounded',
    public readonly dispatcher: string = 'default',
    public readonly supervisor: ActorRef | undefined = undefined,
    public readonly args: unknown[] = []
  ) {}
  
  /** 创建Props */
  static create(producer: () => Actor): Props {
    return new Props(producer);
  }
  
  /** 创建带邮箱配置的Props */
  withMailbox(mailboxType: string): Props {
    return new Props(
      this.producer,
      mailboxType,
      this.dispatcher,
      this.supervisor,
      this.args
    );
  }
  
  /** 创建带调度器配置的Props */
  withDispatcher(dispatcher: string): Props {
    return new Props(
      this.producer,
      this.mailboxType,
      dispatcher,
      this.supervisor,
      this.args
    );
  }
  
  /** 创建带监督者配置的Props */
  withSupervisor(supervisor: ActorRef): Props {
    return new Props(
      this.producer,
      this.mailboxType,
      this.dispatcher,
      supervisor,
      this.args
    );
  }
  
  /** 创建带参数的Props */
  withArgs(...args: unknown[]): Props {
    return new Props(
      this.producer,
      this.mailboxType,
      this.dispatcher,
      this.supervisor,
      args
    );
  }
  
  /** 创建新的Actor实例 */
  createActorInstance(): Actor {
    return this.producer();
  }
}
