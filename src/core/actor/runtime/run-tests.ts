/**
 * OpenTaiji Actor Runtime - 测试运行脚本
 */

import {
  ActorSystem,
  Actor,
  Message,
  LocalActorRef,
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
  
  // 测试10: Mailbox 测试
  console.log('\n测试10: Mailbox');
  const mailbox = new UnboundedMailbox();
  const envelope = {
    message: { type: 'test' } as Message,
    sender: undefined,
    timestamp: Date.now()
  };
  mailbox.push(envelope);
  console.log(`  邮箱大小: ${mailbox.size()}`);
  console.log('  ✓ Mailbox测试完成');
  
  // 测试11: 有界邮箱
  console.log('\n测试11: 有界邮箱');
  const boundedMailbox = new BoundedMailbox(2, 'reject');
  boundedMailbox.push(envelope);
  boundedMailbox.push(envelope);
  const result = boundedMailbox.push(envelope);
  console.log(`  邮箱已满，拒绝溢出: ${!result}`);
  console.log('  ✓ 有界邮箱测试完成');
  
  // 测试12: 终止系统
  console.log('\n测试12: 终止系统');
  await system.terminate();
  console.log('  ✓ 系统终止成功');
  
  console.log('\n=== 所有测试完成 ===');
}

runTests().catch(console.error);
