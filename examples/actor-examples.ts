/**
 * OpenTaiji Actor System - 示例代码
 * 
 * 本文件展示Actor系统的各种使用场景
 */

import {
  ActorSystem,
  Actor,
  ActorPath,
  ActorRef,
  Props,
  Message,
  RestartDecision,
  OneForOneSupervisorStrategy,
  AllForOneSupervisorStrategy,
  PriorityMailbox,
  BoundedMailbox,
  UnboundedMailbox,
  StashSupport,
  createActorSystem,
  actorOf
} from '../src/core/actor';

// ==================== 示例1: 基础Echo Actor ====================

/**
 * 最简单的Actor示例：回声服务
 */
class EchoActor extends Actor {
  async receive(message: Message): Promise<void> {
    console.log(`[Echo] Received: ${JSON.stringify(message)}`);
    
    // 获取发送者并回复
    const sender = this.getCurrentSender();
    if (sender) {
      sender.tell(
        { type: 'echo-reply', original: message, timestamp: Date.now() },
        this.self()
      );
    }
  }
}

async function exampleBasicEcho() {
  console.log('\n=== 示例1: 基础Echo Actor ===\n');
  
  const system = createActorSystem('echo-system');
  
  // 创建Echo Actor
  const echoRef = actorOf(system, () => new EchoActor(), 'echo');
  console.log(`Created Echo Actor: ${echoRef.path}`);
  
  // 发送消息
  echoRef.tell({ type: 'hello', payload: 'World!' });
  
  // 等待消息处理
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 终止系统
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 示例2: 计数器Actor ====================

/**
 * 有状态的计数器Actor
 */
class CounterActor extends Actor {
  private count: number = 0;
  private maxValue: number;
  
  constructor(maxValue: number = 1000) {
    super();
    this.maxValue = maxValue;
  }
  
  async receive(message: Message): Promise<void> {
    const sender = this.getCurrentSender();
    
    switch ((message as any).type) {
      case 'increment':
        this.count = Math.min(this.count + 1, this.maxValue);
        console.log(`[Counter] Incremented to: ${this.count}`);
        break;
        
      case 'decrement':
        this.count = Math.max(this.count - 1, 0);
        console.log(`[Counter] Decremented to: ${this.count}`);
        break;
        
      case 'get':
        if (sender) {
          sender.tell(
            { type: 'count-value', value: this.count },
            this.self()
          );
        }
        break;
        
      case 'reset':
        this.count = 0;
        console.log(`[Counter] Reset to: ${this.count}`);
        break;
        
      case 'set':
        this.count = (message as any).value;
        console.log(`[Counter] Set to: ${this.count}`);
        break;
    }
  }
  
  // 暴露当前值
  getCount(): number {
    return this.count;
  }
}

async function exampleCounter() {
  console.log('\n=== 示例2: 计数器Actor ===\n');
  
  const system = createActorSystem('counter-system');
  const counterRef = actorOf(system, () => new CounterActor(100));
  
  // 操作计数器
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'get' });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 使用 ask 获取值
  const response = await counterRef.ask<{ type: string; value: number }>(
    { type: 'get' },
    1000
  );
  console.log(`[Counter] Current value via ask: ${response.value}`);
  
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 示例3: 父子Actor层级 ====================

/**
 * 父Actor管理多个子Actor
 */
class WorkerActor extends Actor {
  private id: string;
  
  constructor(id: string) {
    super();
    this.id = id;
  }
  
  async receive(message: Message): Promise<void> {
    console.log(`[Worker-${this.id}] Processing: ${JSON.stringify(message)}`);
    
    // 模拟处理
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 回复父Actor
    const sender = this.getCurrentSender();
    if (sender) {
      sender.tell(
        { type: 'work-complete', workerId: this.id, result: 'done' },
        this.self()
      );
    }
  }
}

class SupervisorParentActor extends Actor {
  private workers: Map<string, ActorRef> = new Map();
  private pendingTasks: number = 0;
  private completedTasks: number = 0;
  
  async preStart(): Promise<void> {
    console.log('[Supervisor] Starting...');
    
    // 创建3个子Worker
    for (let i = 1; i <= 3; i++) {
      const workerId = `worker-${i}`;
      const workerRef = this.spawnNamed(WorkerActor, workerId);
      this.workers.set(workerId, workerRef);
      console.log(`[Supervisor] Spawned ${workerId}`);
    }
  }
  
  async receive(message: Message): Promise<void> {
    const workerId = (message as any).workerId;
    
    switch ((message as any).type) {
      case 'start-work':
        this.pendingTasks = (message as any).count || 5;
        console.log(`[Supervisor] Starting ${this.pendingTasks} tasks`);
        
        // 分发任务给所有worker
        for (const [id, worker] of this.workers) {
          for (let i = 0; i < Math.ceil(this.pendingTasks / this.workers.size); i++) {
            worker.tell(
              { type: 'process', taskId: `${id}-task-${i}` },
              this.self()
            );
          }
        }
        break;
        
      case 'work-complete':
        this.completedTasks++;
        console.log(`[Supervisor] Task completed by ${workerId}. Progress: ${this.completedTasks}/${this.pendingTasks}`);
        
        if (this.completedTasks >= this.pendingTasks) {
          console.log('[Supervisor] All tasks completed!');
          this.completedTasks = 0;
          this.pendingTasks = 0;
        }
        break;
        
      case 'stop-workers':
        console.log('[Supervisor] Stopping all workers...');
        for (const worker of this.workers.values()) {
          await this.stopChild(worker);
        }
        this.workers.clear();
        break;
    }
  }
}

async function exampleHierarchy() {
  console.log('\n=== 示例3: 父子Actor层级 ===\n');
  
  const system = createActorSystem('hierarchy-system');
  const supervisorRef = actorOf(
    system,
    () => new SupervisorParentActor(),
    'supervisor'
  );
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 开始工作
  supervisorRef.tell({ type: 'start-work', count: 6 });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 停止所有worker
  supervisorRef.tell({ type: 'stop-workers' });
  
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 示例4: 带Stash的消息暂存 ====================

/**
 * 初始化工过程中暂存消息的Actor
 */
class InitializingActor extends StashSupport {
  private initialized: boolean = false;
  private stashCount: number = 0;
  private processedCount: number = 0;
  
  async preStart(): Promise<void> {
    console.log('[InitializingActor] Starting initialization...');
    
    // 模拟初始化耗时
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.initialized = true;
    console.log('[InitializingActor] Initialization complete!');
    
    // 处理暂存的消息
    if (!this.isStashEmpty()) {
      console.log(`[InitializingActor] Processing ${this.getStashSize()} stashed messages`);
      const messages = this.doUnstashAll();
      for (const msg of messages) {
        await this.processMessage(msg);
        this.processedCount++;
      }
    }
  }
  
  async receive(message: Message): Promise<void> {
    if (!this.initialized) {
      // 暂存消息直到初始化完成
      this.doStash(message);
      this.stashCount++;
      console.log(`[InitializingActor] Stashed message. Total: ${this.stashCount}`);
      return;
    }
    
    await this.processMessage(message);
  }
  
  private async processMessage(message: Message): Promise<void> {
    console.log(`[InitializingActor] Processed: ${JSON.stringify(message)}`);
    this.processedCount++;
  }
  
  getStats(): { stash: number; processed: number; initialized: boolean } {
    return {
      stash: this.stashCount,
      processed: this.processedCount,
      initialized: this.initialized
    };
  }
}

async function exampleStash() {
  console.log('\n=== 示例4: 消息暂存 ===\n');
  
  const system = createActorSystem('stash-system');
  const actorRef = actorOf(
    system,
    () => new InitializingActor(),
    'init-actor'
  );
  
  // 在初始化完成前发送消息
  actorRef.tell({ type: 'early-message', data: 'message 1' });
  actorRef.tell({ type: 'early-message', data: 'message 2' });
  actorRef.tell({ type: 'early-message', data: 'message 3' });
  
  // 等待初始化完成和消息处理
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 发送初始化后的消息
  actorRef.tell({ type: 'late-message', data: 'message 4' });
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 示例5: 自定义监督策略 ====================

/**
 * 具有容错能力的Worker
 */
class FaultyWorkerActor extends Actor {
  private attempts: number = 0;
  private maxAttempts: number = 3;
  
  async receive(message: Message): Promise<void> {
    if ((message as any).type === 'risky-task') {
      this.attempts++;
      console.log(`[FaultyWorker] Attempt ${this.attempts}`);
      
      if (this.attempts < this.maxAttempts) {
        // 模拟随机失败
        throw new Error(`Transient failure on attempt ${this.attempts}`);
      }
      
      console.log(`[FaultyWorker] Task completed successfully!`);
      this.attempts = 0;
    }
  }
}

/**
 * 使用指数退避策略的监督者
 */
class ResilientSupervisor extends Actor {
  private workerRef: ActorRef | undefined;
  private restartCount: number = 0;
  
  async preStart(): Promise<void> {
    console.log('[ResilientSupervisor] Starting with exponential backoff...');
    
    // 使用指数退避策略
    const props = new Props(() => new FaultyWorkerActor());
    this.workerRef = this.context.spawn(props);
  }
  
  async receive(message: Message): Promise<void> {
    if ((message as any).type === 'execute-task') {
      console.log('[ResilientSupervisor] Delegating task to worker...');
      this.workerRef?.tell({ type: 'risky-task' });
    }
    
    if ((message as any).type === 'worker-restarted') {
      this.restartCount++;
      console.log(`[ResilientSupervisor] Worker restarted. Total restarts: ${this.restartCount}`);
    }
  }
  
  getRestartCount(): number {
    return this.restartCount;
  }
}

async function exampleSupervisor() {
  console.log('\n=== 示例5: 自定义监督策略 ===\n');
  
  // 创建带指数退避的策略
  const exponentialBackoff = new OneForOneSupervisorStrategy(
    (cause) => {
      console.log(`[Supervisor] Handling failure: ${cause.message}`);
      return RestartDecision.Restart;
    },
    5,  // 最多重试5次
    60  // 60秒时间窗口
  );
  
  const system = createActorSystem('supervisor-system', {
    guardianStrategy: exponentialBackoff
  });
  
  const supervisorRef = actorOf(
    system,
    () => new ResilientSupervisor(),
    'resilient-supervisor'
  );
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 执行任务（会触发多次失败和重启）
  supervisorRef.tell({ type: 'execute-task' });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 示例6: 优先级消息处理 ====================

/**
 * 优先级消息处理Actor
 */
class PriorityWorkerActor extends Actor {
  constructor() {
    super({
      mailboxType: 'priority' as any,
      priorityLevels: 5
    });
  }
  
  async receive(message: Message): Promise<void> {
    const priority = (message as any).priority || 0;
    console.log(`[PriorityWorker] Processing message with priority ${priority}: ${JSON.stringify(message)}`);
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

async function examplePriority() {
  console.log('\n=== 示例6: 优先级消息处理 ===\n');
  
  const system = createActorSystem('priority-system');
  
  // 创建带优先级邮箱的Actor
  const priorityMailbox = new PriorityMailbox(
    (msg: Message) => (msg as any).priority ?? 0
  );
  
  class PriorityActor extends Actor {
    constructor() {
      super();
    }
    
    async receive(message: Message): Promise<void> {
      console.log(`[Priority] Processing: ${JSON.stringify(message)}`);
    }
  }
  
  const props = new Props(() => new PriorityActor());
  const ref = await system.actorOf(props, 'priority-actor');
  
  // 按随机顺序发送不同优先级的消息
  const messages = [
    { type: 'task', priority: 1, data: 'low priority' },
    { type: 'task', priority: 3, data: 'high priority' },
    { type: 'task', priority: 2, data: 'medium priority' },
    { type: 'task', priority: 5, data: 'critical' },
    { type: 'task', priority: 0, data: 'lowest priority' },
  ];
  
  // 随机发送
  for (const msg of messages.sort(() => Math.random() - 0.5)) {
    ref.tell(msg);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 示例7: Ask/Reply模式 ====================

/**
 * 计算服务的请求/响应模式
 */
class CalculatorActor extends Actor {
  async receive(message: Message): Promise<void> {
    const sender = this.getCurrentSender();
    if (!sender) return;
    
    const msg = message as any;
    
    switch (msg.type) {
      case 'add':
        const sum = (msg.a || 0) + (msg.b || 0);
        console.log(`[Calculator] ${msg.a} + ${msg.b} = ${sum}`);
        sender.tell({ type: 'result', operation: 'add', value: sum }, this.self());
        break;
        
      case 'multiply':
        const product = (msg.a || 0) * (msg.b || 0);
        console.log(`[Calculator] ${msg.a} * ${msg.b} = ${product}`);
        sender.tell({ type: 'result', operation: 'multiply', value: product }, this.self());
        break;
        
      case 'divide':
        if (msg.b === 0) {
          sender.tell({ type: 'error', message: 'Division by zero' }, this.self());
        } else {
          const quotient = msg.a / msg.b;
          console.log(`[Calculator] ${msg.a} / ${msg.b} = ${quotient}`);
          sender.tell({ type: 'result', operation: 'divide', value: quotient }, this.self());
        }
        break;
    }
  }
}

async function exampleAskReply() {
  console.log('\n=== 示例7: Ask/Reply模式 ===\n');
  
  const system = createActorSystem('ask-reply-system');
  const calcRef = actorOf(system, () => new CalculatorActor(), 'calculator');
  
  // 使用 ask 发送请求
  try {
    const addResult = await calcRef.ask<{ type: string; value: number }>(
      { type: 'add', a: 10, b: 5 },
      5000
    );
    console.log(`[Main] Add result: ${addResult.value}`);
    
    const multResult = await calcRef.ask<{ type: string; value: number }>(
      { type: 'multiply', a: 6, b: 7 },
      5000
    );
    console.log(`[Main] Multiply result: ${multResult.value}`);
    
    const divResult = await calcRef.ask<{ type: string; value: number }>(
      { type: 'divide', a: 20, b: 4 },
      5000
    );
    console.log(`[Main] Divide result: ${divResult.value}`);
    
    // 测试错误情况
    const errorResult = await calcRef.ask<{ type: string; message?: string }>(
      { type: 'divide', a: 10, b: 0 },
      5000
    );
    console.log(`[Main] Error result: ${errorResult.message}`);
    
  } catch (error) {
    console.error('[Main] Ask failed:', error);
  }
  
  await system.terminate();
  console.log('System terminated\n');
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     OpenTaiji Actor System - Examples             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  try {
    await exampleBasicEcho();
    await exampleCounter();
    await exampleHierarchy();
    await exampleStash();
    await exampleSupervisor();
    await examplePriority();
    await exampleAskReply();
    
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     All examples completed successfully!           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Example error:', error);
  }
}

// 运行示例
runAllExamples();
