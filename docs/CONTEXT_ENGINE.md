# Context Engine 使用文档

## 概述

Context Engine（上下文引擎）是OpenCLAW的核心能力，负责连接Actor、技能和记忆系统，实现智能的上下文管理。

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                     ContextEngine                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Scanner    │→ │  Assembler    │→ │   Injector       │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
        ↓                  ↓                   ↓
   Memory/Skill/      Priority/T          Prompt
   Personality        Token Budget        Injection
```

## 快速开始

### 1. 基础用法

```typescript
import { 
  createContextEngine, 
  ConversationRequest 
} from './src/core/context';

async function main() {
  // 创建引擎
  const engine = createContextEngine({
    defaultTokenBudget: 8000,
  });

  await engine.initialize();

  // 处理请求
  const request: ConversationRequest = {
    userId: 'user-123',
    message: 'Hello, how are you?',
    tokenBudget: 4000,
  };

  const result = await engine.processRequest(request);
  
  console.log('Prompt:', result.prompt);
  console.log('Tokens Used:', result.stats.tokensUsed);

  await engine.destroy();
}

main();
```

### 2. 绑定系统

```typescript
import { createFullContextEngine } from './src/core/context';

// 创建并绑定所有系统
const engine = createFullContextEngine(
  config,
  memorySystem,      // IMemorySystem
  skillSystem,       // ISkillSystem  
  personalitySystem, // IPersonalitySystem
  knowledgeBase      // IKnowledgeBase
);

await engine.initialize();
```

### 3. 便捷方法

```typescript
// 快速处理
const result = await engine.process('user-1', 'Hello', {
  tokenBudget: 4000,
  systemPrompt: 'You are a helpful assistant.',
});

// 批量处理
const results = await engine.processBatch([
  { userId: 'user-1', message: 'Hello 1', tokenBudget: 4000 },
  { userId: 'user-2', message: 'Hello 2', tokenBudget: 4000 },
]);
```

## 核心组件

### ContextScanner

扫描各类上下文来源。

```typescript
import { createContextScanner } from './src/core/context';

const scanner = createContextScanner({
  memorySearchLimit: 10,
  skillSearchLimit: 5,
  minRelevanceThreshold: 0.3,
});

// 绑定系统
scanner
  .bindMemorySystem(memorySystem)
  .bindSkillSystem(skillSystem)
  .bindPersonalitySystem(personalitySystem)
  .bindKnowledgeBase(knowledgeBase);

// 执行扫描
const result = await scanner.scan(request);
console.log('Memories:', result.memories);
console.log('Skills:', result.skills);
console.log('Personality:', result.personality);
```

### ContextAssembler

按优先级组装上下文，管理Token预算。

```typescript
import { createContextAssembler } from './src/core/context';

const assembler = createContextAssembler({
  defaultTokenBudget: 8000,
  priorityWeights: {
    memory: 0.3,
    skill: 0.25,
    personality: 0.15,
    knowledge: 0.2,
    history: 0.1,
  },
});

// 组装上下文
const result = assembler.assemble(rawContext, 8000);
console.log('Assembled tokens:', result.context.totalTokens);
console.log('Truncated items:', result.truncatedItems);
```

### ContextInjector

将上下文注入到Prompt。

```typescript
import { createContextInjector, InjectionStrategy } from './src/core/context';

const injector = createContextInjector(
  InjectionStrategy.SEQUENTIAL  // 可选: SEQUENTIAL, CHUNKED, INTERPOLATED, HIERARCHICAL, COMPRESSED
);

// 注入上下文
const result = injector.inject(systemPrompt, assembledContext);
console.log('Injected prompt:', result.prompt);
```

## 注入策略

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| `SEQUENTIAL` | 按优先级顺序追加 | 通用场景 |
| `CHUNKED` | 分块注入，用[CUT]分隔 | 长上下文 |
| `INTERPOLATED` | 替换{{CONTEXT}}占位符 | 模板化Prompt |
| `HIERARCHICAL` | 按层级组织 | 结构化输出 |
| `COMPRESSED` | 紧凑格式 | 极小Token预算 |

### 使用示例

```typescript
// 模板化Prompt
const prompt = `You are a coding assistant.

## System Info
{{SYSTEM}}

## User Profile
{{USER_PROFILE}}

## Context
{{CONTEXT}}

{{SKILLS}}
{{MEMORIES}}

Please respond to the user's request.`;

// 使用INTERPOLATED策略
const result = injector.injectWithStrategy(
  prompt,
  context,
  InjectionStrategy.INTERPOLATED
);
```

## 事件处理

```typescript
engine.on({
  onScanStart: (request) => {
    console.log('Scanning for:', request.message);
  },
  onScanComplete: (result) => {
    console.log('Found:', result.metadata.itemsFound, 'items');
  },
  onAssembleStart: (raw) => {
    console.log('Assembling context...');
  },
  onAssembleComplete: (result) => {
    console.log('Assembled with', result.optimization.passes, 'passes');
  },
  onInjectComplete: (result) => {
    console.log('Injected, tokens:', result.actualTokens);
  },
  onProcessComplete: (result) => {
    console.log('Complete!', result.stats.totalTime, 'ms');
  },
  onError: (error, stage) => {
    console.error('Error at', stage, ':', error.message);
  },
});
```

## 与ActorSystem集成

```typescript
import { ContextAwareActor } from './src/examples/ContextAwareActor';

class MyActor extends ContextAwareActor {
  createReceive() {
    return async (message) => {
      if (message.type === 'Conversation') {
        const processed = await this.handleConversation(message.request);
        // 使用处理后的prompt进行LLM调用
        const response = await callLLM(processed.prompt);
        message.replyTo.tell({ response });
      }
    };
  }
}

// 创建Actor
const actor = system.actorOf(createAssistantProps(), 'my-assistant');
```

## 配置参考

### ContextEngineConfig

```typescript
interface ContextEngineConfig {
  /** 默认Token预算 */
  defaultTokenBudget?: number;        // 默认: 8000
  
  /** 最大Token预算 */
  maxTokenBudget?: number;           // 默认: 128000
  
  /** 记忆搜索限制 */
  memorySearchLimit?: number;        // 默认: 10
  
  /** 技能搜索限制 */
  skillSearchLimit?: number;         // 默认: 5
  
  /** 最小相关性阈值 */
  minRelevanceThreshold?: number;     // 默认: 0.3
  
  /** 默认注入策略 */
  defaultInjectionStrategy?: InjectionStrategy;
  
  /** 优先级权重 */
  priorityWeights?: {
    memory: number;      // 默认: 0.3
    skill: number;       // 默认: 0.25
    personality: number; // 默认: 0.15
    knowledge: number;   // 默认: 0.2
    history: number;     // 默认: 0.1
  };
  
  /** 是否启用人格上下文 */
  enablePersonality?: boolean;        // 默认: true
  
  /** 是否启用知识库 */
  enableKnowledge?: boolean;          // 默认: true
  
  /** 是否启用历史上下文 */
  enableHistory?: boolean;            // 默认: true
  
  /** 历史消息保留数量 */
  historyMessageLimit?: number;       // 默认: 10
}
```

## 系统接口

### IMemorySystem

```typescript
interface IMemorySystem {
  /** 搜索记忆 */
  search(options: MemorySearchOptions): Promise<MemoryContext[]>;
  
  /** 获取记忆 */
  get(id: string): Promise<MemoryContext | null>;
  
  /** 记录记忆访问 */
  recordAccess(id: string): Promise<void>;
}
```

### ISkillSystem

```typescript
interface ISkillSystem {
  /** 匹配技能 */
  match(query: string, userId: string): Promise<SkillContext[]>;
  
  /** 获取技能 */
  get(id: string): Promise<SkillContext | null>;
}
```

### IPersonalitySystem

```typescript
interface IPersonalitySystem {
  /** 获取用户画像 */
  getProfile(userId: string, tenantId?: string): Promise<PersonalityContext | null>;
  
  /** 更新画像 */
  updateProfile(profile: Partial<PersonalityContext>): Promise<void>;
}
```

## 类型定义

### ConversationRequest

```typescript
interface ConversationRequest {
  userId: string;
  tenantId?: string;
  message: string;
  systemPrompt?: string;
  tokenBudget?: number;
  history?: ConversationMessage[];
  sessionId?: string;
  metadata?: Record<string, unknown>;
  intentTags?: string[];
  priority?: number;
}
```

### ProcessedContext

```typescript
interface ProcessedContext {
  prompt: string;                    // 最终Prompt
  context: AssembledContext;          // 组装后的上下文
  injection: InjectionResult;        // 注入结果
  stats: ProcessingStats;            // 统计信息
}
```

### ProcessingStats

```typescript
interface ProcessingStats {
  totalTime: number;                 // 总处理时间(ms)
  scanTime: number;                  // 扫描耗时
  assembleTime: number;              // 组装耗时
  injectionTime: number;             // 注入耗时
  memoriesFound: number;             // 找到的记忆数
  skillsFound: number;                // 找到的技能数
  tokensUsed: number;                // 使用的Token数
  tokenBudgetUsage: number;          // Token预算使用率
}
```

## 最佳实践

### 1. Token预算分配

```typescript
const config: ContextEngineConfig = {
  defaultTokenBudget: 8000,
  priorityWeights: {
    // 根据场景调整权重
    memory: 0.35,     // 需要大量记忆时
    skill: 0.30,      // 需要技能指导时
    personality: 0.10,
    knowledge: 0.15,
    history: 0.10,
  },
};
```

### 2. 选择合适的注入策略

```typescript
// 简单场景
const injector = createContextInjector(InjectionStrategy.SEQUENTIAL);

// 长上下文
const injector = createContextInjector(InjectionStrategy.CHUNKED);

// 模板化Prompt
const injector = createContextInjector(InjectionStrategy.INTERPOLATED);

// 结构化输出
const injector = createContextInjector(InjectionStrategy.HIERARCHICAL);

// 极小预算
const injector = createContextInjector(InjectionStrategy.COMPRESSED);
```

### 3. 缓存策略

```typescript
class CachedContextEngine extends ContextEngine {
  private cache: Map<string, ProcessedContext> = new Map();
  
  async processRequest(request: ConversationRequest): Promise<ProcessedContext> {
    const cacheKey = `${request.userId}:${request.sessionId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const result = await super.processRequest(request);
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

### 4. 错误处理

```typescript
try {
  const result = await engine.processRequest(request);
} catch (error) {
  if (error.message.includes('timeout')) {
    // 超时处理
  } else if (error.message.includes('token')) {
    // Token超限处理
  } else {
    // 其他错误
  }
}
```

## 性能优化

### 1. 并行绑定系统

```typescript
await Promise.all([
  engine.bindMemorySystem(memorySystem),
  engine.bindSkillSystem(skillSystem),
  engine.bindPersonalitySystem(personalitySystem),
]);
```

### 2. 批量处理

```typescript
// 代替逐个处理
for (const req of requests) {
  await engine.processRequest(req);
}

// 使用批量处理
const results = await engine.processBatch(requests);
```

### 3. 适当调整阈值

```typescript
const config = {
  // 提高阈值减少检索量
  minRelevanceThreshold: 0.5,
  memorySearchLimit: 5,
  skillSearchLimit: 3,
};
```

## 常见问题

### Q: 如何处理Token超限？

A: ContextAssembler会自动截断内容。可以通过调整权重或提高预算来解决。

### Q: 如何禁用某些上下文来源？

A: 在配置中设置：

```typescript
const engine = createContextEngine({
  enablePersonality: false,  // 禁用人格
  enableKnowledge: false,   // 禁用知识库
  enableHistory: false,     // 禁用历史
});
```

### Q: 如何自定义格式化？

```typescript
const injector = createContextInjector(
  InjectionStrategy.SEQUENTIAL,
  {
    includeTitles: false,
    includeSeparators: true,
    maxLineWidth: 80,
    indent: '  ',
  }
);
```

## 许可

Apache-2.0
