# OpenTaiji Actor System

> **真正的Actor模型实现** - 基于Akka/Erlang OTP原则

---

## 核心特性

| 特性 | 描述 |
|------|------|
| **位置透明性** | 通过ActorRef进行消息传递，不关心Actor位置 |
| **容错机制** | Supervisor策略自动处理失败和恢复 |
| **邮箱队列** | 支持无界/有界/优先级队列 |
| **生命周期** | preStart/postStop/preRestart/postRestart钩子 |
| **消息暂存** | Stash支持临时保存消息 |

---

## 快速开始

### 基本使用

```typescript
import { 
  ActorSystem, 
  Actor, 
  createActorSystem, 
  actorOf,
  Message 
} from './src/core/actor';

// 1. 定义你的Actor
class EchoActor extends Actor {
  async receive(message: Message): Promise<void> {
    console.log('Received:', message);
  }
}

// 2. 创建Actor系统
const system = createActorSystem('my-system');

// 3. 创建Actor
const echoRef = actorOf(system, () => new EchoActor(), 'echo');

// 4. 发送消息
echoRef.tell({ type: 'hello', payload: 'world!' });

// 5. 使用ask等待响应
const response = await echoRef.ask({ type: 'ping' }, 5000);

// 6. 终止系统
await system.terminate();
```

---

## 架构设计

### Actor模型核心概念

```
┌─────────────────────────────────────────────────────────┐
│                     ActorSystem                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                   Guardian Actors                    │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │ │
│  │  │  /user  │  │ /system │  │ /system │            │ │
│  │  │ guardian│  │deadLetters│ │eventStream│          │ │
│  │  └────┬────┘  └─────────┘  └─────────┘            │ │
│  │       │                                             │ │
│  │  ┌────▼────┐                                        │ │
│  │  │ Parent  │ ←─── Supervision                       │ │
│  │  │ Actor   │                                        │ │
│  │  └───┬─┬───┘                                        │ │
│  │      │ │                                             │ │
│  │  ┌───▼─┴───┐  ┌─────────┐                           │ │
│  │  │ Child1 │  │ Child2 │ ←─── Mailbox               │ │
│  │  └─────────┘  └─────────┘                           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 文件结构

```
src/core/actor/
├── index.ts          # 模块导出
├── types.ts          # 类型定义
├── ActorPath.ts      # Actor路径和引用
├── Actor.ts          # Actor基类
├── ActorSystem.ts    # Actor系统核心
├── Mailbox.ts        # 邮箱实现
├── Supervisor.ts     # 监督策略
└── Stash.ts          # 消息暂存支持
```

---

## 核心组件

### 1. Actor 基类

```typescript
class MyActor extends Actor {
  async receive(message: Message): Promise<void> {
    // 处理消息
  }
}
```

### 2. Mailbox 邮箱

```typescript
// 无界邮箱（默认）
const unbounded = new UnboundedMailbox();

// 有界邮箱
const bounded = new BoundedMailbox(100, 'reject');

// 优先级邮箱
const priority = new PriorityMailbox(
  (msg) => (msg as any).priority ?? 0,
  5
);
```

### 3. Supervisor 监督策略

```typescript
// OneForOne策略 - 只影响失败的子Actor
const oneForOne = new OneForOneSupervisorStrategy(
  (cause) => RestartDecision.Restart,
  3,  // 最大重试次数
  60  // 时间窗口（秒）
);

// AllForOne策略 - 所有子Actor一起重启
const allForOne = new AllForOneSupervisorStrategy(
  () => RestartDecision.Restart
);
```

---

## 测试

```bash
npm test -- --testPathPattern="actor"
```

---

## 许可证

Apache 2.0
