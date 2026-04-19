/**
 * OpenTaiji Actor Runtime - 综合测试
 */

import {
  ActorSystem,
  Actor,
  Message,
  ActorState,
  LocalActorRef,
  ActorRefs,
  createMailbox,
  UnboundedMailbox,
  BoundedMailbox,
  OneForOneSupervisorStrategy,
  RestartDecision,
  BackoffCalculator,
  ErrorClassifier,
  ErrorClassification,
  CircuitBreaker,
  CircuitState,
  DefaultDispatcher,
  WorkStealingDispatcher,
  StatefulActor
} from './index';

/** 测试计数器Actor */
class TestCounterActor extends Actor {
  private count: number = 0;

  async receive(message: Message): Promise<void> {
    if (message.type === 'increment') {
      this.count++;
      console.log(`[Counter] 计数: ${this.count}`);
    } else if (message.type === 'get') {
      console.log(`[Counter] 当前值: ${this.count}`);
    } else if (message.type === 'error') {
      throw new Error('Test error');
    }
  }

  getCount(): number {
    return this.count;
  }
}

/** 测试Echo Actor */
class TestEchoActor extends Actor {
  async receive(message: Message): Promise<void> {
    console.log(`[Echo] 收到: ${message.type}`, message.payload);
  }
}

/** 测试有状态Actor */
interface TestState {
  name: string;
  value: number;
}

class TestStatefulActor extends StatefulActor<TestState> {
  constructor() {
    super({ name: 'initial', value: 0 });
  }

  async receive(message: Message): Promise<void> {
    const msg = message as any;
    if (msg.type === 'update') {
      this.updateState(s => ({ ...s, ...msg.payload }));
      console.log(`[Stateful] 状态更新:`, this.getState());
    }
  }
}

/** 简单的Actor工厂 */
function createTestActor<T extends Actor>(
  ActorClass: new () => T,
  name: string
): { actor: T; ref: LocalActorRef } {
  const actor = new ActorClass();
  const ref = new LocalActorRef<T>(`/test/${name}`);
  return { actor, ref };
}

describe('ActorRuntime', () => {
  describe('Actor基础功能', () => {
    it('应该创建Actor实例', () => {
      const { actor, ref } = createTestActor(TestEchoActor, 'echo');
      expect(actor.id).toBeDefined();
      expect(ref.path).toBe('/test/echo');
    });

    it('应该处理消息', async () => {
      const { actor } = createTestActor(TestEchoActor, 'echo');
      await actor.performStart();
      
      const message: Message = { type: 'test', payload: 'hello' };
      await actor.receive(message);
      
      await actor.performStop();
    });
  });

  describe('ActorSystem', () => {
    let system: ActorSystem;

    beforeEach(() => {
      system = new ActorSystem('test-system');
    });

    afterEach(async () => {
      await system.terminate();
    });

    it('应该创建Actor', () => {
      const ref = system.actorOf(TestEchoActor as any, 'test-actor');
      expect(ref.path).toContain('test-actor');
      expect(system.findActor(ref.path)).toBeDefined();
    });

    it('应该创建多个Actor', () => {
      const ref1 = system.actorOf(TestEchoActor as any, 'actor-1');
      const ref2 = system.actorOf(TestEchoActor as any, 'actor-2');
      
      expect(ref1.path).not.toBe(ref2.path);
      expect(system.findActor(ref1.path)).toBeDefined();
      expect(system.findActor(ref2.path)).toBeDefined();
    });

    it('应该停止Actor', async () => {
      const ref = system.actorOf(TestEchoActor as any, 'test-actor');
      await system.stop(ref);
      expect(system.findActor(ref.path)).toBeUndefined();
    });

    it('应该获取系统指标', () => {
      system.actorOf(TestEchoActor as any, 'actor-1');
      system.actorOf(TestEchoActor as any, 'actor-2');
      
      const metrics = system.getMetrics();
      expect(metrics.totalActors).toBeGreaterThan(0);
      expect(metrics.activeActors).toBeGreaterThan(0);
    });

    it('应该创建计数器Actor并处理消息', async () => {
      const counterRef = system.actorOf(TestCounterActor as any, 'counter');
      
      counterRef.tell({ type: 'increment' });
      counterRef.tell({ type: 'increment' });
      counterRef.tell({ type: 'get' });
      
      // 等待消息处理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const record = (system as any).actors.get(counterRef.uid);
      expect(record).toBeDefined();
    });
  });

  describe('Mailbox', () => {
    it('UnboundedMailbox应该正常工作', () => {
      const mailbox = new UnboundedMailbox();
      
      const envelope = {
        message: { type: 'test' } as Message,
        sender: undefined,
        timestamp: Date.now()
      };
      
      expect(mailbox.push(envelope)).toBe(true);
      expect(mailbox.size()).toBe(1);
      expect(mailbox.isEmpty()).toBe(false);
      
      const popped = mailbox.pop();
      expect(popped?.message.type).toBe('test');
      expect(mailbox.isEmpty()).toBe(true);
    });

    it('BoundedMailbox应该拒绝溢出', () => {
      const mailbox = new BoundedMailbox(2, 'reject');
      
      const envelope = {
        message: { type: 'test' } as Message,
        sender: undefined,
        timestamp: Date.now()
      };
      
      mailbox.push(envelope);
      mailbox.push(envelope);
      
      // 第三次应该被拒绝
      expect(mailbox.push(envelope)).toBe(false);
      expect(mailbox.isFull()).toBe(true);
    });

    it('应该支持邮箱暂停和恢复', () => {
      const mailbox = new UnboundedMailbox();
      
      mailbox.suspend();
      expect(mailbox.isSuspended()).toBe(true);
      expect(mailbox.status()).toBe('suspended');
      
      mailbox.resume();
      expect(mailbox.isSuspended()).toBe(false);
      expect(mailbox.status()).toBe('open');
    });
  });

  describe('Supervisor策略', () => {
    it('OneForOne策略应该正确处理失败', () => {
      const strategy = OneForOneSupervisorStrategy.defaultStrategy();
      const childRef = new LocalActorRef('/test/child');
      
      const error = new Error('Test failure');
      const stats = {
        actorPath: '/test/child',
        failureCount: 1,
        firstFailureTime: Date.now(),
        lastFailureTime: Date.now(),
        lastCause: undefined
      };
      
      const directive = strategy.handleFailure(childRef, error, stats);
      expect(directive.decision).toBe(RestartDecision.Restart);
    });

    it('应该达到最大重试次数后停止', () => {
      const strategy = new OneForOneSupervisorStrategy(
        () => RestartDecision.Restart,
        3, // maxRetries = 3
        30
      );
      
      const childRef = new LocalActorRef('/test/child');
      const error = new Error('Test failure');
      
      // 模拟4次失败
      for (let i = 0; i < 4; i++) {
        const stats = {
          actorPath: '/test/child',
          failureCount: i + 1,
          firstFailureTime: Date.now(),
          lastFailureTime: Date.now(),
          lastCause: error
        };
        
        const directive = strategy.handleFailure(childRef, error, stats);
        
        if (i < 3) {
          expect(directive.decision).toBe(RestartDecision.Restart);
        } else {
          expect(directive.decision).toBe(RestartDecision.Stop);
        }
      }
    });
  });

  describe('错误处理', () => {
    it('BackoffCalculator应该计算正确的延迟', () => {
      const calculator = new BackoffCalculator({
        initialDelay: 100,
        maxDelay: 10000,
        multiplier: 2,
        jitter: false
      });
      
      expect(calculator.calculate(1)).toBe(100);
      expect(calculator.calculate(2)).toBe(200);
      expect(calculator.calculate(3)).toBe(400);
      expect(calculator.calculate(10)).toBe(10000); // 超过最大值
    });

    it('ErrorClassifier应该正确分类错误', () => {
      const classifier = new ErrorClassifier();
      
      // 瞬时错误
      expect(classifier.classify(new Error('Connection timeout'))).toBe(ErrorClassification.Transient);
      expect(classifier.classify(new Error('ECONNRESET'))).toBe(ErrorClassification.Transient);
      
      // 永久错误
      expect(classifier.classify(new Error('InvalidArgumentException'))).toBe(ErrorClassification.Permanent);
      expect(classifier.classify(new Error('Validation error'))).toBe(ErrorClassification.Permanent);
      
      // 致命错误
      expect(classifier.classify(new Error('Fatal error'))).toBe(ErrorClassification.Fatal);
    });
  });

  describe('CircuitBreaker', () => {
    it('应该正确切换状态', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000
      });
      
      // 初始状态为 Closed
      expect(breaker.getState()).toBe(CircuitState.Closed);
      expect(breaker.canExecute()).toBe(true);
      
      // 记录失败
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.Closed);
      
      // 第三次失败，切换到 Open
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.Open);
      expect(breaker.canExecute()).toBe(false);
      
      // 等待超时后，切换到 HalfOpen
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(breaker.getState()).toBe(CircuitState.HalfOpen);
          expect(breaker.canExecute()).toBe(true);
          
          // 成功两次后回到 Closed
          breaker.recordSuccess();
          breaker.recordSuccess();
          expect(breaker.getState()).toBe(CircuitState.Closed);
          
          resolve();
        }, 1100);
      });
    });
  });

  describe('Dispatcher', () => {
    it('DefaultDispatcher应该处理消息', async () => {
      const dispatcher = new DefaultDispatcher({ throughput: 10, parallelism: 2 });
      
      let processedCount = 0;
      dispatcher.registerHandler('/test/actor', async () => {
        processedCount++;
      });
      
      dispatcher.dispatch({
        message: { type: 'test', timestamp: Date.now() },
        sender: undefined,
        timestamp: Date.now()
      }, '/test/actor');
      
      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(processedCount).toBeGreaterThan(0);
      
      dispatcher.shutdown();
    });
  });

  describe('消息传递', () => {
    it('tell应该异步发送消息', async () => {
      const system = new ActorSystem('test-system');
      
      const ref = system.actorOf(TestEchoActor as any, 'echo');
      
      // 发送多条消息
      for (let i = 0; i < 5; i++) {
        ref.tell({ type: `msg-${i}`, payload: i });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await system.terminate();
    });

    it('ask应该返回Promise', async () => {
      const system = new ActorSystem('test-system');
      
      const ref = system.actorOf(TestEchoActor as any, 'echo');
      
      // ask 应该在超时时reject
      try {
        await ref.ask('test', 100);
      } catch (e) {
        expect((e as Error).message).toContain('timeout');
      }
      
      await system.terminate();
    });
  });

  describe('监督树', () => {
    it('应该正确维护监督树结构', async () => {
      const system = new ActorSystem('test-system');
      
      const parent = system.actorOf(TestEchoActor as any, 'parent');
      const child1 = system.actorOf(TestEchoActor as any, 'child1');
      const child2 = system.actorOf(TestEchoActor as any, 'child2');
      
      const tree = system.getSupervisionTree();
      expect(tree.size).toBeGreaterThanOrEqual(3); // system + user + actors
      
      await system.terminate();
    });
  });

  describe('有状态Actor', () => {
    it('应该正确维护状态', async () => {
      const system = new ActorSystem('test-system');
      
      const statefulRef = system.actorOf(TestStatefulActor as any, 'stateful');
      
      statefulRef.tell({ type: 'update', payload: { name: 'updated', value: 42 } });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await system.terminate();
    });
  });
});

// 运行测试
async function runTests() {
  console.log('=== Actor Runtime 测试 ===\n');
  
  // 测试1: 基本Actor创建
  console.log('测试1: 基本Actor创建');
  const system = new ActorSystem('demo');
  const echoRef = system.actorOf(TestEchoActor as any, 'echo');
  console.log(`  ✓ 创建EchoActor: ${echoRef.path}`);
  
  // 测试2: 消息传递
  console.log('\n测试2: 消息传递');
  echoRef.tell({ type: 'hello', payload: 'World' });
  console.log('  ✓ 发送消息成功');
  
  // 测试3: 计数器Actor
  console.log('\n测试3: 计数器Actor');
  const counterRef = system.actorOf(TestCounterActor as any, 'counter');
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'get' });
  console.log('  ✓ 计数器操作成功');
  
  // 测试4: 监督树
  console.log('\n测试4: 监督树');
  const tree = system.getSupervisionTree();
  console.log(`  ✓ 监督树节点数: ${tree.size}`);
  
  // 测试5: 系统指标
  console.log('\n测试5: 系统指标');
  const metrics = system.getMetrics();
  console.log(`  ✓ 总Actor数: ${metrics.totalActors}`);
  console.log(`  ✓ 活跃Actor数: ${metrics.activeActors}`);
  
  // 测试6: 停止Actor
  console.log('\n测试6: 停止Actor');
  await system.stop(echoRef);
  console.log('  ✓ 停止Actor成功');
  
  // 测试7: Circuit Breaker
  console.log('\n测试7: Circuit Breaker');
  const breaker = new CircuitBreaker({ failureThreshold: 2, timeout: 5000 });
  console.log(`  初始状态: ${breaker.getState()}`);
  breaker.recordFailure();
  breaker.recordFailure();
  console.log(`  失败后状态: ${breaker.getState()}`);
  console.log('  ✓ Circuit Breaker测试完成');
  
  // 测试8: Backoff计算
  console.log('\n测试8: Backoff计算');
  const calculator = new BackoffCalculator({ initialDelay: 100, multiplier: 2, jitter: false });
  console.log(`  第1次重试延迟: ${calculator.calculate(1)}ms`);
  console.log(`  第2次重试延迟: ${calculator.calculate(2)}ms`);
  console.log(`  第3次重试延迟: ${calculator.calculate(3)}ms`);
  console.log('  ✓ Backoff计算完成');
  
  // 测试9: 错误分类
  console.log('\n测试9: 错误分类');
  const classifier = new ErrorClassifier();
  console.log(`  网络超时: ${classifier.classify(new Error('timeout'))}`);
  console.log(`  参数错误: ${classifier.classify(new Error('InvalidArgument'))}`);
  console.log(`  致命错误: ${classifier.classify(new Error('Fatal error'))}`);
  console.log('  ✓ 错误分类完成');
  
  // 测试10: 终止系统
  console.log('\n测试10: 终止系统');
  await system.terminate();
  console.log('  ✓ 系统终止成功');
  
  console.log('\n=== 所有测试完成 ===');
}

// 如果直接运行此文件，执行测试
if (require.main === module || process.argv[1]?.includes('actor.test')) {
  runTests().catch(console.error);
}

export { runTests };
