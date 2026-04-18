# OpenTaiji 三阶段记忆整合系统

基于 OpenTaiji Actor 运行时实现的三阶段记忆整合系统，模拟认知科学中的记忆巩固过程，将短期记忆信号转化为持久长期知识。

## 核心理念

OpenTaiji 的记忆系统受认知科学启发，采用**三阶段记忆整合**架构：

```
Light Phase（浅睡）→ Deep Phase（深睡）→ REM Phase（快速眼动）
```

每个阶段对应不同的认知处理深度，最终实现记忆的智能化筛选和长期存储。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenTaiji Memory System                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Actor Runtime                                             │
│       │                                                     │
│       ▼                                                     │
│   RecallTracker ──────► 短期记忆信号采集                    │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────────────────────────────┐              │
│   │         DreamingScheduler               │              │
│   │  ┌─────────┬─────────┬─────────┐       │              │
│   │  │  Light  │  Deep   │   REM   │       │              │
│   │  │ Phase   │ Phase   │ Phase   │       │              │
│   │  └─────────┴─────────┴─────────┘       │              │
│   └─────────────────────────────────────────┘              │
│       │                                                     │
│       ▼                                                     │
│   MEMORY.md ◄──── 长期记忆存储                              │
│   DREAMS.md ◄──── 梦境日记（可读）                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 三阶段机制

### Light Phase（浅睡阶段）

**目标**：收集和筛选候选记忆

```typescript
// 读取近期记忆信号
// 去重 + 筛选候选条目
// 输出：候选排队列表
```

- 从 RecallTracker 读取短期记忆信号
- 按时间窗口筛选活跃条目
- 去重并生成候选队列

### Deep Phase（深睡阶段）

**目标**：评分和晋升

```typescript
// 7信号加权评分
// 阈值门控
// 写入MEMORY.md
```

**OpenTaiji 7信号评分算法**：

| 信号 | 权重 | 说明 |
|------|------|------|
| frequency | 0.24 | 记忆访问频率 |
| relevance | 0.30 | 语义相关性 |
| diversity | 0.15 | 上下文多样性 |
| recency | 0.15 | 时间新鲜度 |
| consolidation | 0.10 | 巩固强度 |
| conceptual | 0.06 | 概念标签密度 |

### REM Phase（快速眼动阶段）

**目标**：模式提取和日记生成

```typescript
// 模式标签提取
// 主题摘要生成
// 写入DREAMS.md
```

- 分析记忆中的模式标签
- 提取候选持久真理
- 生成人类可读的梦境日记

## 快速开始

### 安装

```bash
npm install @opentaiji/memory-dreaming
```

### 基本使用

```typescript
import { MemoryDreamingIntegration } from '@opentaiji/memory-dreaming';

// 初始化
const dreaming = new MemoryDreamingIntegration({
  workspaceDir: './workspace',
  dreamingConfig: {
    enabled: true,
    cron: '0 3 * * *', // 每天凌晨3点
    limit: 10,
    minScore: 0.75,
  }
});

await dreaming.initialize();
dreaming.start();
```

### 记录召回

```typescript
// 每次记忆检索时记录
await dreaming.recordRecall({
  query: '用户查询内容',
  results: [
    {
      path: 'memory/2024-01-01.md',
      startLine: 1,
      endLine: 10,
      score: 0.95,
      snippet: '记忆片段内容'
    }
  ]
});
```

### 手动触发

```typescript
const result = await dreaming.runFullCycle();
console.log(`提升记忆: ${result.totalPromoted} 条`);
```

## 核心组件

### RecallTracker

追踪每条记忆的召回统计：

- `recallCount` - 总召回次数
- `uniqueQueries` - 独立查询数
- `recallDays` - 跨天召回记录
- `queryHashes` - 查询哈希（去重）

### DreamingScheduler

基于 Actor Heartbeat 的定时调度：

- Cron 表达式配置
- 时区支持
- 错误重试机制

### DeepPhaseRanker

7信号加权评分核心算法：

```typescript
const score = 
  0.24 * frequency +
  0.30 * relevance +
  0.15 * diversity +
  0.15 * recency +
  0.10 * consolidation +
  0.06 * conceptual +
  phaseBoost;
```

## 与 Actor 系统集成

```typescript
import { Actor } from '@opentaiji/actor';

class MemoryActor extends Actor {
  private dreaming: MemoryDreamingIntegration;

  async preStart() {
    this.dreaming = new MemoryDreamingIntegration({
      workspaceDir: this.config.workspaceDir
    });
    await this.dreaming.initialize();
  }

  async receive(message) {
    // 处理消息时记录召回
    if (message.type === 'recall') {
      await this.dreaming.recordRecall(message.recall);
    }
  }
}
```

## 配置选项

```typescript
interface DreamingConfig {
  // 是否启用
  enabled: boolean;
  
  // Cron调度表达式
  cron: string;
  
  // 时区
  timezone: string;
  
  // 每次提升上限
  limit: number;
  
  // 最低评分阈值
  minScore: number;
  
  // 最低召回次数
  minRecallCount: number;
  
  // 最低独立查询数
  minUniqueQueries: number;
  
  // 回溯天数
  lookbackDays: number;
}
```

## 文件结构

```
workspace/
├── MEMORY.md              # 长期记忆存储
├── DREAMS.md              # 梦境日记
└── memory/
    └── .dreams/
        ├── short-term-recall.json    # 短期召回记录
        ├── phase-signals.json        # 阶段信号
        └── dream-YYYY-MM-DD.md       # 每日梦境
```

## 技术特点

1. **Actor原生集成** - 完全基于 OpenTaiji Actor 运行时
2. **认知科学启发** - 三阶段模拟人类记忆巩固
3. **可配置评分** - 支持自定义权重和阈值
4. **事件驱动** - 完整的事件钩子系统
5. **增量处理** - 高效的内存和磁盘使用

## License

Apache 2.0
