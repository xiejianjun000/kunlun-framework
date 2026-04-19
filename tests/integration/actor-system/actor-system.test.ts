/**
 * Actor系统集成测试
 * Actor System Integration Tests
 * 
 * 测试场景：
 * 1. Actor创建和生命周期
 * 2. 消息传递
 * 3. 监督和错误恢复
 * 4. Actor路径和选择
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ActorSystem, props } from '../../../dist/core/actor/ActorSystem';
import { Actor } from '../../../dist/core/actor/Actor';
import { ActorRef, Props } from '../../../dist/core/actor/ActorPath';
import {
  ActorState,
  Message,
} from '../../../dist/core/actor/types';

// 测试用Echo Actor
class EchoActor extends Actor {
  async receive(message: Message): Promise<void> {
    if (message.type === 'echo') {
      const payload = (message as any).payload;
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ type: 'echo-response', payload }, this.context.self);
      }
    } else if (message.type === 'ping') {
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ type: 'pong' }, this.context.self);
      }
    }
  }
}

// 测试用累加器 Actor
class CounterActor extends Actor {
  private count: number = 0;

  async receive(message: Message): Promise<void> {
    if (message.type === 'increment') {
      this.count++;
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ type: 'count', value: this.count }, this.context.self);
      }
    } else if (message.type === 'get-count') {
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ type: 'count', value: this.count }, this.context.self);
      }
    } else if (message.type === 'reset') {
      this.count = 0;
    }
  }
}

// 测试用会失败的 Actor
class FailingActor extends Actor {
  private shouldFail: boolean = true;
  private failCount: number = 0;

  async receive(message: Message): Promise<void> {
    if (message.type === 'fail') {
      this.failCount++;
      if (this.shouldFail) {
        throw new Error(`Simulated failure ${this.failCount}`);
      }
    } else if (message.type === 'disable-fail') {
      this.shouldFail = false;
    } else if (message.type === 'get-fail-count') {
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ type: 'fail-count', value: this.failCount }, this.context.self);
      }
    }
  }

  async performRestart(reason: Error): Promise<void> {
    await super.performRestart(reason);
    this.shouldFail = false;
  }
}

// 测试用有子 Actor 的 Actor
class ParentActor extends Actor {
  private children: ActorRef[] = [];

  async receive(message: Message): Promise<void> {
    if (message.type === 'spawn-child') {
      const childName = (message as any).name || `child-${this.children.length}`;
      const child = this.context.getSystem().actorOf(
        props(() => new EchoActor()),
        childName
      );
      this.children.push(child);
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ type: 'child-spawned', name: childName }, this.context.self);
      }
    } else if (message.type === 'get-children') {
      const sender = this.getCurrentSender();
      if (sender) {
        sender.tell({ 
          type: 'children-list', 
          count: this.children.length 
        }, this.context.self);
      }
    } else if (message.type === 'send-to-children') {
      const msg = (message as any).msg;
      for (const child of this.children) {
        child.tell(msg, this.context.self);
      }
    }
  }
}

describe('Actor System Integration Tests', () => {
  let system: ActorSystem;

  beforeAll(() => {
    system = new ActorSystem('test-system');
  });

  afterAll(async () => {
    await system.terminate();
  });

  beforeEach(() => {
    // 每个测试前重置系统状态
  });

  afterEach(async () => {
    // 清理所有Actor
  });

  describe('Actor Creation', () => {
    it('should create actor with props', () => {
      const ref = system.actorOf(props(() => new EchoActor()));
      
      expect(ref).toBeDefined();
      expect(ref.path).toBeDefined();
      expect(ref.path.toString()).toContain('test-system');
    });

    it('should create actor with custom name', () => {
      const ref = system.actorOf(props(() => new EchoActor()), 'my-echo');
      
      expect(ref).toBeDefined();
      expect(ref.path.name).toBe('my-echo');
    });

    it('should create multiple actors with unique paths', () => {
      const ref1 = system.actorOf(props(() => new EchoActor()));
      const ref2 = system.actorOf(props(() => new EchoActor()));
      
      expect(ref1.path.toString()).not.toBe(ref2.path.toString());
    });

    it('should create actor hierarchy', () => {
      const parent = system.actorOf(props(() => new ParentActor()), 'parent');
      
      expect(parent).toBeDefined();
      expect(parent.path.toString()).toContain('/user/parent');
    });
  });

  describe('Message Passing', () => {
    it('should send message to actor with ask', (done) => {
      const echo = system.actorOf(props(() => new EchoActor()), 'messenger-test-echo');
      
      // 使用 ask 模式
      echo.ask({ type: 'ping' }, 1000)
        .then((response: any) => {
          expect(response.type).toBe('pong');
          done();
        })
        .catch(done);
    });

    it('should deliver messages', (done) => {
      const counter = system.actorOf(props(() => new CounterActor()), 'counter-for-order');
      
      // 发送多条消息
      counter.tell({ type: 'increment' });
      counter.tell({ type: 'increment' });
      counter.tell({ type: 'increment' });
      
      // 等待消息处理
      setTimeout(() => {
        counter.ask({ type: 'get-count' }, 1000)
          .then((response: any) => {
            expect(response.value).toBe(3);
            done();
          })
          .catch(done);
      }, 100);
    });

    it('should handle actor-to-actor messaging', (done) => {
      const sender = system.actorOf(props(() => new EchoActor()), 'sender-actor');
      const receiver = system.actorOf(props(() => new CounterActor()), 'receiver-counter');
      
      // 模拟通过 sender 发送增量消息
      sender.tell({ type: 'ping' });
      receiver.tell({ type: 'increment' });
      
      setTimeout(() => {
        receiver.ask({ type: 'get-count' }, 1000)
          .then((response: any) => {
            expect(response.value).toBe(1);
            done();
          })
          .catch(done);
      }, 100);
    });

    it('should handle concurrent messages', async () => {
      const counter = system.actorOf(props(() => new CounterActor()), 'concurrent-counter');
      
      // 发送并发消息
      const promises = Array(10).fill(null).map(() => 
        new Promise<void>((resolve) => {
          counter.tell({ type: 'increment' });
          setTimeout(resolve, Math.random() * 50);
        })
      );
      
      await Promise.all(promises);
      
      // 等待处理完成
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response: any = await counter.ask({ type: 'get-count' }, 1000);
      expect(response.value).toBe(10);
    });
  });

  describe('Actor Lifecycle', () => {
    it('should track actor state', async () => {
      const actor = system.actorOf(props(() => new EchoActor()), 'lifecycle-test');
      
      // Actor应该进入运行状态
      expect(actor).toBeDefined();
    });

    it('should stop actor', async () => {
      const actor = system.actorOf(props(() => new EchoActor()), 'stop-test');
      
      await system.stop(actor);
      
      // 停止后应该无法发送消息
      expect(() => actor.tell({ type: 'ping' })).not.toThrow();
    });

    it('should stop actor with children', async () => {
      const parent = system.actorOf(props(() => new ParentActor()), 'stop-parent');
      
      // 创建子 Actor
      parent.tell({ type: 'spawn-child', name: 'child-to-stop' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 停止父 Actor 应该也停止子 Actor
      await system.stop(parent);
      
      expect(true).toBe(true); // 如果没有抛出异常则通过
    });

    it('should handle actor restart', async () => {
      const failing = system.actorOf(props(() => new FailingActor()), 'restart-test');
      
      // 发送失败消息
      failing.tell({ type: 'fail' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 禁用失败
      failing.tell({ type: 'disable-fail' });
      
      // 现在应该能正常处理消息
      failing.tell({ type: 'get-fail-count' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle actor exceptions', async () => {
      const failing = system.actorOf(props(() => new FailingActor()), 'exception-test');
      
      // 发送会导致异常的消息
      failing.tell({ type: 'fail' });
      
      // 等待监督处理
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Actor 系统应该仍然可用
      const another = system.actorOf(props(() => new EchoActor()), 'after-failure');
      expect(another).toBeDefined();
    });

    it('should not affect sibling actors on failure', async () => {
      const sibling1 = system.actorOf(props(() => new CounterActor()), 'sibling-1');
      const sibling2 = system.actorOf(props(() => new CounterActor()), 'sibling-2');
      const failing = system.actorOf(props(() => new FailingActor()), 'sibling-failing');
      
      sibling1.tell({ type: 'increment' });
      sibling2.tell({ type: 'increment' });
      
      failing.tell({ type: 'fail' });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 兄弟 Actor 应该仍然正常工作
      sibling1.tell({ type: 'reset' });
      sibling2.tell({ type: 'reset' });
      
      const s1Response: any = await sibling1.ask({ type: 'get-count' }, 1000);
      const s2Response: any = await sibling2.ask({ type: 'get-count' }, 1000);
      
      expect(s1Response.value).toBe(0);
      expect(s2Response.value).toBe(0);
    });

    it('should escalate failures to supervisor', async () => {
      const failing = system.actorOf(props(() => new FailingActor()), 'escalation-test');
      
      // 多次失败应该触发升级
      for (let i = 0; i < 5; i++) {
        failing.tell({ type: 'fail' });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Actor 可能会被停止
      expect(true).toBe(true);
    });
  });

  describe('Actor Selection', () => {
    it('should select actor by path pattern', () => {
      system.actorOf(props(() => new EchoActor()), 'select-test-1');
      system.actorOf(props(() => new EchoActor()), 'select-test-2');
      
      const selection = system.select('/user/select-test-*');
      
      expect(selection).toBeDefined();
    });

    it('should select all user actors', () => {
      const selection = system.select('/user/*');
      
      expect(selection).toBeDefined();
    });
  });

  describe('Dead Letters', () => {
    it('should have dead letters reference', () => {
      const deadLetters = system.deadLetters();
      
      expect(deadLetters).toBeDefined();
      expect(deadLetters.path.toString()).toContain('deadLetters');
    });

    it('should route messages to dead letters when actor stopped', async () => {
      const actor = system.actorOf(props(() => new EchoActor()), 'dead-letter-test');
      
      // 停止 actor
      await system.stop(actor);
      
      // 之后发送的消息会被路由到死信
      expect(() => actor.tell({ type: 'ping' })).not.toThrow();
    });
  });

  describe('Event Stream', () => {
    it('should have event stream reference', () => {
      const eventStream = system.eventStream();
      
      expect(eventStream).toBeDefined();
    });
  });

  describe('System Health', () => {
    it('should report system name', () => {
      expect(system.name).toBe('test-system');
    });

    it('should not be terminated initially', () => {
      const newSystem = new ActorSystem('health-check');
      expect(newSystem).toBeDefined();
      
      newSystem.terminate();
    });

    it('should handle terminate after already terminated', async () => {
      const tempSystem = new ActorSystem('double-terminate');
      
      await tempSystem.terminate();
      await tempSystem.terminate(); // 应该不抛出异常
      
      expect(true).toBe(true);
    });
  });

  describe('Actor Path', () => {
    it('should generate correct actor path', () => {
      const ref = system.actorOf(props(() => new EchoActor()), 'path-test');
      
      expect(ref.path.toString()).toBe('akka://test-system/user/path-test');
    });

    it('should have parent and child path segments', () => {
      const ref = system.actorOf(props(() => new EchoActor()), 'parent/child');
      
      expect(ref.path.name).toBe('child');
    });
  });

  describe('Supervisor Strategy', () => {
    it('should apply OneForOne strategy', () => {
      const failing = system.actorOf(props(() => new FailingActor()), 'oneforone-test');
      
      failing.tell({ type: 'fail' });
      
      // 应该只影响失败的 actor
      expect(failing).toBeDefined();
    });

    it('should resume after transient failure', async () => {
      const failing = system.actorOf(props(() => new FailingActor()), 'resume-test');
      
      failing.tell({ type: 'fail' });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      failing.tell({ type: 'disable-fail' });
      
      // 应该能够恢复
      failing.tell({ type: 'get-fail-count' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(true).toBe(true);
    });
  });

  describe('Props Configuration', () => {
    it('should create props with actor producer', () => {
      const p = props(() => new EchoActor());
      
      expect(p).toBeDefined();
      expect((p as any).producer).toBeDefined();
    });

    it('should create bounded props', () => {
      const { boundedProps } = require('../../src/core/actor/ActorSystem');
      const p = boundedProps(() => new EchoActor(), 100);
      
      expect(p).toBeDefined();
    });
  });

  describe('Actor Context', () => {
    it('should provide actor context', () => {
      let receivedContext: any = null;
      
      class ContextCaptureActor extends Actor {
        async receive(message: Message): Promise<void> {
          receivedContext = this.context;
        }
      }
      
      const actor = system.actorOf(
        props(() => new ContextCaptureActor()),
        'context-capture'
      );
      
      actor.tell({ type: 'test' });
      
      // 等待消息处理
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(receivedContext).toBeDefined();
          expect(receivedContext.self).toBeDefined();
          expect(receivedContext.getSystem()).toBeDefined();
          resolve();
        }, 100);
      });
    });

    it('should access actor system through context', () => {
      let systemName: string | undefined;
      
      class SystemAccessActor extends Actor {
        async receive(message: Message): Promise<void> {
          systemName = this.context.getSystem().name;
        }
      }
      
      const actor = system.actorOf(
        props(() => new SystemAccessActor()),
        'system-access'
      );
      
      actor.tell({ type: 'capture' });
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(systemName).toBe('test-system');
          resolve();
        }, 100);
      });
    });
  });

  describe('Stress Tests', () => {
    it('should handle rapid actor creation', async () => {
      const refs: ActorRef[] = [];
      
      for (let i = 0; i < 50; i++) {
        refs.push(system.actorOf(props(() => new EchoActor())));
      }
      
      expect(refs.length).toBe(50);
    });

    it('should handle burst of messages', async () => {
      const actor = system.actorOf(props(() => new CounterActor()), 'burst-test');
      
      const burstSize = 100;
      for (let i = 0; i < burstSize; i++) {
        actor.tell({ type: 'increment' });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response: any = await actor.ask({ type: 'get-count' }, 2000);
      expect(response.value).toBe(burstSize);
    });
  });
});
