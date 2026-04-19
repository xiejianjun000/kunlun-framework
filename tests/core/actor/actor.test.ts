/**
 * OpenTaiji Actor System - 单元测试（精简版）
 */

import {
  ActorSystem,
  Actor,
  ActorPath,
  ActorRef,
  Props,
  UnboundedMailbox,
  BoundedMailbox,
  PriorityMailbox,
  OneForOneSupervisorStrategy,
  AllForOneSupervisorStrategy,
  Stash,
  StashSupport,
  Message,
  RestartDecision,
  MailboxStatus,
  createActorSystem
} from '../../../dist/core/actor';

// ==================== 测试辅助 ====================

class RecordingActor extends Actor {
  public messages: Message[] = [];
  
  async receive(message: Message): Promise<void> {
    this.messages.push(message);
  }
}

class CounterActor extends Actor {
  public count: number = 0;
  
  async receive(message: Message): Promise<void> {
    if ((message as any).type === 'increment') {
      this.count++;
    }
  }
}

// ==================== ActorSystem 测试 ====================

describe('ActorSystem', () => {
  let system: ActorSystem;
  
  beforeEach(() => {
    system = new ActorSystem('test-system');
  });
  
  afterEach(async () => {
    await system.terminate();
  });
  
  test('should create actor system with correct name', () => {
    expect(system.name).toBe('test-system');
    expect(system.path.toString()).toBe('akka://test-system');
  });
  
  test('should create actor and get reference', async () => {
    const props = new Props(() => new RecordingActor());
    const ref = await system.actorOf(props, 'recorder');
    
    expect(ref).toBeDefined();
    expect(ref.path.name).toBe('recorder');
  });
  
  test('should find actor by path', async () => {
    const props = new Props(() => new RecordingActor());
    const ref = await system.actorOf(props, 'finder-test');
    
    const found = system.findActor(ref.path);
    expect(found).toBeDefined();
    expect(found?.uid).toBe(ref.uid);
  });
  
  test('should stop actor', async () => {
    const props = new Props(() => new RecordingActor());
    const ref = await system.actorOf(props);
    
    await system.stop(ref);
    
    const record = (system as any).actors.get(ref.uid);
    expect(record).toBeUndefined();
  });
  
  test('should get dead letters reference', () => {
    const deadLetters = system.deadLetters();
    expect(deadLetters).toBeDefined();
    expect(deadLetters.path.toString()).toContain('deadLetters');
  });
});

// ==================== Actor 测试 ====================

describe('Actor', () => {
  let system: ActorSystem;
  
  beforeEach(() => {
    system = new ActorSystem('actor-test');
  });
  
  afterEach(async () => {
    await system.terminate();
  });
  
  test('should call preStart on initialization', async () => {
    let preStartCalled = false;
    
    class PreStartActor extends Actor {
      async preStart(): Promise<void> {
        preStartCalled = true;
      }
      async receive(): Promise<void> {}
    }
    
    const props = new Props(() => new PreStartActor());
    await system.actorOf(props);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(preStartCalled).toBe(true);
  });
  
  test('should call postStop on termination', async () => {
    let postStopCalled = false;
    
    class PostStopActor extends Actor {
      async receive(): Promise<void> {}
      async postStop(): Promise<void> {
        postStopCalled = true;
      }
    }
    
    const props = new Props(() => new PostStopActor());
    const ref = await system.actorOf(props);
    
    await system.stop(ref);
    expect(postStopCalled).toBe(true);
  });
});

// ==================== Mailbox 测试 ====================

describe('UnboundedMailbox', () => {
  let mailbox: UnboundedMailbox;
  
  beforeEach(() => {
    mailbox = new UnboundedMailbox();
  });
  
  test('should push and pop messages', () => {
    const envelope = { message: { type: 'test' }, timestamp: Date.now() };
    
    expect(mailbox.push(envelope)).toBe(true);
    expect(mailbox.size()).toBe(1);
    expect(mailbox.isEmpty()).toBe(false);
    
    const popped = mailbox.pop();
    expect(popped).toEqual(envelope);
    expect(mailbox.isEmpty()).toBe(true);
  });
  
  test('should peek without removing', () => {
    const envelope = { message: { type: 'test' }, timestamp: Date.now() };
    mailbox.push(envelope);
    
    const peeked = mailbox.peek();
    expect(peeked).toEqual(envelope);
    expect(mailbox.size()).toBe(1);
  });
  
  test('should clear all messages', () => {
    mailbox.push({ message: { type: 'a' }, timestamp: Date.now() });
    mailbox.push({ message: { type: 'b' }, timestamp: Date.now() });
    
    mailbox.clear();
    expect(mailbox.isEmpty()).toBe(true);
  });
  
  test('should suspend and resume', () => {
    mailbox.suspend();
    expect(mailbox.isSuspended()).toBe(true);
    expect(mailbox.status()).toBe(MailboxStatus.Suspended);
    
    mailbox.resume();
    expect(mailbox.isSuspended()).toBe(false);
  });
});

describe('BoundedMailbox', () => {
  test('should respect capacity', () => {
    const mailbox = new BoundedMailbox(2);
    
    expect(mailbox.push({ message: { type: 'a' }, timestamp: Date.now() })).toBe(true);
    expect(mailbox.push({ message: { type: 'b' }, timestamp: Date.now() })).toBe(true);
    expect(mailbox.isFull()).toBe(true);
    expect(mailbox.push({ message: { type: 'c' }, timestamp: Date.now() })).toBe(false);
  });
});

describe('PriorityMailbox', () => {
  test('should order by priority', () => {
    const mailbox = new PriorityMailbox((msg: Message) => (msg as any).priority ?? 0);
    
    mailbox.push({ message: { type: 'low', priority: 1 } as any, timestamp: Date.now() });
    mailbox.push({ message: { type: 'high', priority: 3 } as any, timestamp: Date.now() });
    mailbox.push({ message: { type: 'medium', priority: 2 } as any, timestamp: Date.now() });
    
    expect(mailbox.pop()?.message).toEqual({ type: 'high', priority: 3 });
    expect(mailbox.pop()?.message).toEqual({ type: 'medium', priority: 2 });
    expect(mailbox.pop()?.message).toEqual({ type: 'low', priority: 1 });
  });
});

// ==================== Supervisor 测试 ====================

describe('OneForOneSupervisorStrategy', () => {
  test('should restart on failure by default', () => {
    const strategy = OneForOneSupervisorStrategy.defaultStrategy();
    const ref = new ActorRef(ActorPath.root('test').child('actor'));
    
    const directive = strategy.handleFailure(
      ref,
      new Error('test error'),
      { actorPath: ref.path, failureCount: 0, firstFailureTime: 0, lastFailureTime: 0, lastCause: undefined }
    );
    
    expect(directive.decision).toBe(RestartDecision.Restart);
  });
  
  test('should stop after max retries', () => {
    const strategy = new OneForOneSupervisorStrategy(
      () => RestartDecision.Restart,
      3,
      30
    );
    
    const ref = new ActorRef(ActorPath.root('test').child('actor'));
    const stats = { actorPath: ref.path, failureCount: 4, firstFailureTime: Date.now(), lastFailureTime: Date.now(), lastCause: undefined };
    
    const directive = strategy.handleFailure(ref, new Error('test error'), stats);
    expect(directive.decision).toBe(RestartDecision.Stop);
  });
});

// ==================== Stash 测试 ====================

describe('Stash', () => {
  test('should stash and unstash messages', () => {
    const stash = new Stash();
    
    stash.stash({ type: 'a' } as Message);
    stash.stash({ type: 'b' } as Message);
    
    expect(stash.stashSize()).toBe(2);
    
    const messages = stash.unstashAll();
    expect(messages).toHaveLength(2);
    expect(stash.stashIsEmpty()).toBe(true);
  });
  
  test('should unstash in LIFO order', () => {
    const stash = new Stash();
    
    stash.stash({ type: 'a' } as Message);
    stash.stash({ type: 'b' } as Message);
    
    expect(stash.unstash()).toEqual({ type: 'b' });
    expect(stash.unstash()).toEqual({ type: 'a' });
  });
  
  test('should throw on overflow', () => {
    const stash = new Stash(2);
    
    stash.stash({ type: 'a' } as Message);
    stash.stash({ type: 'b' } as Message);
    
    expect(() => stash.stash({ type: 'c' } as Message)).toThrow('Stash overflow');
  });
});

// ==================== ActorPath 测试 ====================

describe('ActorPath', () => {
  test('should parse valid actor path', () => {
    const path = ActorPath.parse('akka://test/user/parent/child');
    
    expect(path.systemName).toBe('test');
    expect(path.name).toBe('child');
    expect(path.depth).toBe(3);
    expect(path.isUserActor).toBe(true);
  });
  
  test('should create child path', () => {
    const parent = ActorPath.parse('akka://test/user/parent');
    const child = parent.child('child');
    
    expect(child.toString()).toBe('akka://test/user/parent/child');
    expect(child.depth).toBe(parent.depth + 1);
  });
  
  test('should detect remote path', () => {
    const path = ActorPath.parse('akka://test/@remote:2552/user/actor');
    
    expect(path.isRemote).toBe(true);
    expect(path.remoteAddress).toBe('remote:2552');
  });
});

// ==================== Props 测试 ====================

describe('Props', () => {
  test('should create props with producer', () => {
    const props = new Props(() => new RecordingActor());
    const actor = props.createActorInstance();
    
    expect(actor).toBeInstanceOf(RecordingActor);
  });
  
  test('should configure mailbox type', () => {
    const props = new Props(() => new RecordingActor())
      .withMailbox('bounded');
    
    expect(props.mailboxType).toBe('bounded');
  });
  
  test('should configure dispatcher', () => {
    const props = new Props(() => new RecordingActor())
      .withDispatcher('my-dispatcher');
    
    expect(props.dispatcher).toBe('my-dispatcher');
  });
});

// ==================== ActorRef 测试 ====================

describe('ActorRef', () => {
  test('should create ref with unique uid', () => {
    const path = ActorPath.parse('akka://test/user/actor');
    const ref1 = new ActorRef(path);
    const ref2 = new ActorRef(path);
    
    expect(ref1.uid).not.toBe(ref2.uid);
  });
  
  test('should compare refs by uid', () => {
    const path = ActorPath.parse('akka://test/user/actor');
    const ref1 = new ActorRef(path);
    const ref2 = new ActorRef(path, ref1.uid);
    
    expect(ref1.equals(ref2)).toBe(true);
  });
});
