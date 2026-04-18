/**
 * OpenTaiji Actor Runtime - 消息调度器
 * 实现消息的分发、调度和并发控制
 */

import { ActorRef, Envelope, Message, ActorState } from './types';
import { IMailbox, MailboxStatus } from './Mailbox';

/** 调度器类型 */
export enum DispatcherType {
  Default = 'default',
  Fixed = 'fixed',
  WorkStealing = 'workStealing',
  CallingThread = 'callingThread'
}

/** 调度器配置 */
export interface DispatcherConfig {
  type: DispatcherType;
  throughput?: number;
  parallelism?: number;
  fairMode?: boolean;
}

/** 调度器指标 */
export interface DispatcherMetrics {
  messagesProcessed: number;
  messagesScheduled: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  queueSize: number;
}

/** 默认调度器指标 */
const DEFAULT_METRICS: DispatcherMetrics = {
  messagesProcessed: 0,
  messagesScheduled: 0,
  totalProcessingTime: 0,
  averageProcessingTime: 0,
  maxProcessingTime: 0,
  queueSize: 0
};

/** 消息处理任务 */
export interface MessageTask {
  envelope: Envelope;
  actorPath: string;
  receiveTime: number;
  processStartTime?: number;
  priority: number;
}

/** 调度器接口 */
export interface IDispatcher {
  /** 提交任务到调度器 */
  schedule(task: MessageTask): void;
  
  /** 执行调度 */
  dispatch(envelope: Envelope, actorPath: string): void;
  
  /** 注册处理器 */
  registerHandler(actorPath: string, handler: (envelope: Envelope) => Promise<void>): void;
  
  /** 注销处理器 */
  unregisterHandler(actorPath: string): void;
  
  /** 获取指标 */
  getMetrics(): DispatcherMetrics;
  
  /** 关闭调度器 */
  shutdown(): void;
  
  /** 获取调度器类型 */
  getType(): DispatcherType;
}

/** 执行上下文 */
export interface ExecutionContext {
  dispatch(message: Message): void;
  execute(fn: () => void | Promise<void>): void;
  schedule(fn: () => void | Promise<void>, delayMs?: number): void;
}

/** 基础调度器实现 */
export abstract class BaseDispatcher implements IDispatcher {
  protected config: DispatcherConfig;
  protected isRunning: boolean = true;
  protected messageHandlers: Map<string, (envelope: Envelope) => Promise<void>> = new Map();
  protected metrics: DispatcherMetrics = { ...DEFAULT_METRICS };

  constructor(config: Partial<DispatcherConfig> = {}) {
    this.config = {
      type: DispatcherType.Default,
      throughput: 100,
      parallelism: 4,
      fairMode: false,
      ...config
    };
  }

  abstract dispatch(envelope: Envelope, actorPath: string): void;
  abstract schedule(task: MessageTask): void;

  getType(): DispatcherType {
    return this.config.type;
  }

  /** 注册消息处理器 */
  registerHandler(actorPath: string, handler: (envelope: Envelope) => Promise<void>): void {
    this.messageHandlers.set(actorPath, handler);
  }

  /** 注销消息处理器 */
  unregisterHandler(actorPath: string): void {
    this.messageHandlers.delete(actorPath);
  }

  /** 获取处理器 */
  getHandler(actorPath: string): ((envelope: Envelope) => Promise<void>) | undefined {
    return this.messageHandlers.get(actorPath);
  }

  /** 更新指标 */
  protected updateMetrics(processingTime: number): void {
    this.metrics.messagesProcessed++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime = 
      this.metrics.totalProcessingTime / this.metrics.messagesProcessed;
    this.metrics.maxProcessingTime = Math.max(
      this.metrics.maxProcessingTime,
      processingTime
    );
  }

  /** 获取指标 */
  getMetrics(): DispatcherMetrics {
    return { ...this.metrics };
  }

  /** 重置指标 */
  resetMetrics(): void {
    this.metrics = { ...DEFAULT_METRICS };
  }

  shutdown(): void {
    this.isRunning = false;
    this.messageHandlers.clear();
  }
}

/** 调用线程调度器（同步执行） */
export class CallingThreadDispatcher extends BaseDispatcher {
  constructor() {
    super({ type: DispatcherType.CallingThread });
  }

  dispatch(envelope: Envelope, actorPath: string): void {
    const handler = this.getHandler(actorPath);
    if (!handler) return;

    const startTime = Date.now();
    this.metrics.messagesScheduled++;

    try {
      const result = handler(envelope);
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error(`Error processing message for ${actorPath}:`, error);
        });
      }
    } catch (error) {
      console.error(`Error processing message for ${actorPath}:`, error);
    }

    this.updateMetrics(Date.now() - startTime);
  }

  schedule(task: MessageTask): void {
    this.metrics.messagesScheduled++;
    this.dispatch(task.envelope, task.actorPath);
  }
}

/** 默认调度器（异步执行） */
export class DefaultDispatcher extends BaseDispatcher {
  private queue: MessageTask[] = [];
  private processing: Set<string> = new Set();
  private parallelism: number;

  constructor(config?: Partial<DispatcherConfig>) {
    super({
      type: DispatcherType.Default,
      throughput: 100,
      parallelism: 4,
      ...config
    });
    this.parallelism = this.config.parallelism || 4;
  }

  dispatch(envelope: Envelope, actorPath: string): void {
    this.metrics.messagesScheduled++;
    
    const task: MessageTask = {
      envelope,
      actorPath,
      receiveTime: Date.now(),
      priority: this.getPriority(envelope.message)
    };

    this.schedule(task);
  }

  schedule(task: MessageTask): void {
    this.metrics.messagesScheduled++;
    this.queue.push(task);
    this.metrics.queueSize = this.queue.length;

    // 按优先级排序
    this.queue.sort((a, b) => b.priority - a.priority);

    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing.size >= this.parallelism) {
      return; // 达到并行上限
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.processing.add(task.actorPath);
    this.metrics.queueSize = this.queue.length;

    const startTime = Date.now();

    try {
      const handler = this.getHandler(task.actorPath);
      if (handler) {
        await handler(task.envelope);
      }
    } catch (error) {
      console.error(`Error processing message for ${task.actorPath}:`, error);
    }

    this.processing.delete(task.actorPath);
    this.updateMetrics(Date.now() - startTime);

    // 继续处理下一个任务
    if (this.queue.length > 0) {
      this.processNext();
    }
  }

  private getPriority(message: Message): number {
    // 系统消息高优先级
    if ((message as any).type?.startsWith('Actor')) {
      return 100;
    }
    // 带优先级的消息
    return (message as any).priority ?? 0;
  }

  shutdown(): void {
    super.shutdown();
    this.queue = [];
    this.processing.clear();
  }
}

/** 工作窃取调度器 */
export class WorkStealingDispatcher extends BaseDispatcher {
  private queues: Map<string, MessageTask[]> = new Map();
  private activeActors: Set<string> = new Set();
  private stealIndex: number = 0;
  private stealingWorkers: number = 0;
  private maxStealingWorkers: number;

  constructor(config?: Partial<DispatcherConfig>) {
    super({
      type: DispatcherType.WorkStealing,
      throughput: 100,
      parallelism: 4,
      ...config
    });
    this.maxStealingWorkers = this.config.parallelism || 4;
  }

  dispatch(envelope: Envelope, actorPath: string): void {
    this.metrics.messagesScheduled++;
    
    const task: MessageTask = {
      envelope,
      actorPath,
      receiveTime: Date.now(),
      priority: 0
    };

    // 将任务放入对应Actor的队列
    if (!this.queues.has(actorPath)) {
      this.queues.set(actorPath, []);
    }
    const queue = this.queues.get(actorPath);
    if (queue) {
      queue.push(task);
    }
    this.updateQueueSizeMetric();

    // 如果Actor未激活，尝试激活
    if (!this.activeActors.has(actorPath)) {
      this.activateActor(actorPath);
    }
  }

  private updateQueueSizeMetric(): void {
    let total = 0;
    this.queues.forEach(q => {
      total += q.length;
    });
    this.metrics.queueSize = total;
  }

  schedule(task: MessageTask): void {
    this.dispatch(task.envelope, task.actorPath);
  }

  private async activateActor(actorPath: string): Promise<void> {
    if (!this.isRunning) return;

    this.activeActors.add(actorPath);

    const processActorTasks = async () => {
      while (this.isRunning && this.activeActors.has(actorPath)) {
        const queue = this.queues.get(actorPath);
        if (!queue || queue.length === 0) {
          // 尝试窃取其他Actor的任务
          const stolen = this.stealWork();
          if (!stolen) {
            this.activeActors.delete(actorPath);
            break;
          }
          continue;
        }

        const task = queue.shift()!;
        this.updateQueueSizeMetric();

        const startTime = Date.now();
        try {
          const handler = this.getHandler(actorPath);
          if (handler) {
            await handler(task.envelope);
          }
        } catch (error) {
          console.error(`Error processing message for ${actorPath}:`, error);
        }
        this.updateMetrics(Date.now() - startTime);

        // 公平模式：短暂让出控制权
        if (this.config.fairMode && Math.random() < 0.1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    };

    processActorTasks().catch(console.error);
  }

  private stealWork(): boolean {
    if (this.stealingWorkers >= this.maxStealingWorkers) {
      return false;
    }

    const actorPaths = Array.from(this.queues.keys());
    if (actorPaths.length === 0) {
      return false;
    }

    // 轮询选择 Victim
    this.stealIndex = (this.stealIndex + 1) % actorPaths.length;
    const victimPath = actorPaths[this.stealIndex];
    
    const victimQueue = this.queues.get(victimPath);
    if (!victimQueue || victimQueue.length <= 1) {
      return false; // Victim队列为空或只有1个任务
    }

    // 从 Victim 队列头部窃取任务
    const stolenTask = victimQueue.shift()!;
    
    // 将任务放到当前Actor的队列
    const stolenKey = victimPath + '-stolen';
    if (!this.queues.has(stolenKey)) {
      this.queues.set(stolenKey, []);
    }
    const stolenQueue = this.queues.get(stolenKey);
    if (stolenQueue) {
      stolenQueue.push(stolenTask);
    }

    // 激活窃取者
    this.stealingWorkers++;
    this.activateActor(stolenKey).finally(() => {
      this.stealingWorkers--;
    });

    return true;
  }

  shutdown(): void {
    super.shutdown();
    this.queues.clear();
    this.activeActors.clear();
  }
}

/** 调度器工厂 */
export function createDispatcher(config?: DispatcherConfig): IDispatcher {
  switch (config?.type) {
    case DispatcherType.CallingThread:
      return new CallingThreadDispatcher();
    case DispatcherType.WorkStealing:
      return new WorkStealingDispatcher(config);
    case DispatcherType.Fixed:
    case DispatcherType.Default:
    default:
      return new DefaultDispatcher(config);
  }
}

/** Actor邮箱处理器 - 桥接邮箱和调度器 */
export class MailboxDispatcher {
  private mailbox: IMailbox;
  private dispatcher: IDispatcher;
  private actorPath: string;
  private isProcessing: boolean = false;
  private messageHandler?: (envelope: Envelope) => Promise<void>;
  private processingLoop?: Promise<void>;

  constructor(
    mailbox: IMailbox,
    dispatcher: IDispatcher,
    actorPath: string,
    messageHandler?: (envelope: Envelope) => Promise<void>
  ) {
    this.mailbox = mailbox;
    this.dispatcher = dispatcher;
    this.actorPath = actorPath;
    this.messageHandler = messageHandler;

    // 注册处理器
    if (messageHandler) {
      this.dispatcher.registerHandler(actorPath, this.wrapHandler(messageHandler));
    }
  }

  /** 设置消息处理器 */
  setMessageHandler(handler: (envelope: Envelope) => Promise<void>): void {
    this.messageHandler = handler;
    this.dispatcher.registerHandler(this.actorPath, this.wrapHandler(handler));
  }

  /** 包装消息处理器 */
  private wrapHandler(handler: (envelope: Envelope) => Promise<void>): (envelope: Envelope) => Promise<void> {
    return async (envelope: Envelope) => {
      if (this.mailbox.isSuspended()) {
        // 邮箱暂停，将消息重新入队
        this.mailbox.push(envelope);
        return;
      }

      this.isProcessing = true;
      try {
        await handler(envelope);
      } finally {
        this.isProcessing = false;
        // 处理完一个消息后，继续处理邮箱中的下一条
        this.processNext();
      }
    };
  }

  /** 发送消息到邮箱 */
  send(envelope: Envelope): boolean {
    const result = this.mailbox.push(envelope);
    
    // 如果当前没有在处理消息，启动处理循环
    if (!this.isProcessing && result) {
      this.processNext();
    }
    
    return result;
  }

  /** 处理邮箱中的下一条消息 */
  private processNext(): void {
    if (this.processingLoop) return;

    this.processingLoop = this.processLoop();
  }

  private async processLoop(): Promise<void> {
    while (!this.mailbox.isEmpty() && !this.mailbox.isSuspended()) {
      const envelope = this.mailbox.pop();
      if (!envelope) break;

      this.dispatcher.dispatch(envelope, this.actorPath);
    }
    this.processingLoop = undefined;
  }

  /** 暂停邮箱 */
  suspend(): void {
    this.mailbox.suspend();
  }

  /** 恢复邮箱 */
  resume(): void {
    this.mailbox.resume();
    this.processNext();
  }

  /** 获取邮箱状态 */
  getStatus(): MailboxStatus {
    return this.mailbox.status();
  }

  /** 是否正在处理 */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /** 关闭 */
  shutdown(): void {
    this.dispatcher.unregisterHandler(this.actorPath);
    this.mailbox.clear();
    this.isProcessing = false;
    this.processingLoop = undefined;
  }
}
