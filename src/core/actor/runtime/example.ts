/**
 * OpenTaiji Actor Runtime - 使用示例
 */

import { ActorSystem, Actor, Message } from './index';

// 定义一个简单的Echo Actor
class EchoActor extends Actor {
  async receive(message: Message): Promise<void> {
    console.log(`[EchoActor] 收到消息:`, message.type, message.payload);
    
    // 回复发送者
    if (this.context?.parent) {
      this.context.parent.tell({
        type: 'response',
        payload: `Echo: ${message.payload}`
      }, this.context.self);
    }
  }
}

// 定义一个计数器Actor
class CounterActor extends Actor {
  private count: number = 0;

  async receive(message: Message): Promise<void> {
    if (message.type === 'increment') {
      this.count++;
      console.log(`[CounterActor] 计数: ${this.count}`);
    } else if (message.type === 'get') {
      if (this.context?.parent) {
        this.context.parent.tell({
          type: 'count',
          payload: this.count
        }, this.context.self);
      }
    }
  }
}

// 运行示例
async function main() {
  console.log('=== OpenTaiji Actor Runtime 示例 ===\n');

  // 创建Actor系统
  const system = new ActorSystem('demo-system');
  console.log(`Actor系统已创建: ${system.name}`);

  // 创建Echo Actor
  const echoRef = system.actorOf(EchoActor as any, 'echo-actor');
  console.log(`EchoActor 已创建: ${echoRef.path}`);

  // 创建Counter Actor
  const counterRef = system.actorOf(CounterActor as any, 'counter-actor');
  console.log(`CounterActor 已创建: ${counterRef.path}`);

  // 发送消息
  console.log('\n--- 发送消息 ---');
  echoRef.tell({ type: 'hello', payload: '你好，Actor!' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'increment' });
  counterRef.tell({ type: 'get' });

  // 等待消息处理
  await new Promise(resolve => setTimeout(resolve, 100));

  // 停止Actor
  console.log('\n--- 停止Actor ---');
  await system.stop(echoRef);
  console.log('EchoActor 已停止');

  await system.stop(counterRef);
  console.log('CounterActor 已停止');

  // 终止系统
  console.log('\n--- 终止系统 ---');
  await system.terminate();
  console.log('Actor系统已终止');

  console.log('\n=== 示例完成 ===');
}

// 运行
main().catch(console.error);
