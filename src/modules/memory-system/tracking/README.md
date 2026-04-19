# Recall Tracking Module

Recall Tracking模块为MemorySystem提供召回信号记录能力，为Dreaming评分算法提供数据基础。

## 功能特性

- **召回信号记录**: 记录每次检索触发的记忆召回
- **频率统计**: 跟踪每个记忆条目的召回频率
- **相关性评分**: 基于查询相关性计算评分
- **时效性计算**: 使用半衰期模型计算时效性分数
- **提升候选排序**: 为Dreaming提供提升候选排序
- **阶段信号支持**: 支持Light/REM睡眠阶段信号

## 模块结构

```
tracking/
├── types.ts              # 类型定义
├── RecallSignal.ts        # 召回信号记录器
├── RecallStatistics.ts    # 召回统计分析
├── RecallTracker.ts       # 核心追踪器
├── index.ts              # 导出
└── recall-tracking.test.ts # 测试
```

## 快速开始

### 1. 基本使用

```typescript
import { RecallTracker, createRecallTracker } from './tracking';

// 创建追踪器
const tracker = createRecallTracker();

// 记录检索召回
await tracker.recordRecalls({
  query: 'project requirements',
  results: [
    {
      path: 'memory/2024-01-01.md',
      startLine: 1,
      endLine: 10,
      score: 0.93,
      snippet: 'Project requirements document',
      source: 'memory',
    },
  ],
  userId: 'user1',
});

// 获取统计信息
const stats = await tracker.getStatistics();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Total recalls: ${stats.totalRecalls}`);
```

### 2. 获取提升候选

```typescript
// 获取用于Dreaming的提升候选
const candidates = await tracker.rankCandidates({
  minScore: 0.75,           // 最低分数
  minRecallCount: 3,        // 最低召回次数
  minUniqueQueries: 2,      // 最低唯一查询数
});

// 按分数排序的候选列表
for (const candidate of candidates) {
  console.log(`Score: ${candidate.score.toFixed(3)}`);
  console.log(`Path: ${candidate.path}`);
  console.log(`Recall count: ${candidate.recallCount}`);
  console.log(`Components:`, candidate.components);
}
```

### 3. 集成到MemorySystem

```typescript
import { MemorySystem } from './MemorySystem';

// 启用Recall Tracking
const memorySystem = new MemorySystem({
  enableRecallTracking: true,  // 启用召回追踪
});

await memorySystem.initialize();

// 检索时会自动记录召回信号
const results = await memorySystem.retrieve('query', 'user1');

// 获取Recall Tracking统计
const stats = await memorySystem.getRecallTrackingStats();

// 获取提升候选
const candidates = await memorySystem.getRecallPromotionCandidates({
  minScore: 0.7,
});
```

### 4. 记录梦境阶段信号

```typescript
// 记录Light睡眠阶段信号
await tracker.recordPhaseSignal(entryKey, 'light');

// 记录REM睡眠阶段信号
await tracker.recordPhaseSignal(entryKey, 'rem');

// 获取信号
const signal = await tracker.getPhaseSignal(entryKey);
console.log(`Light hits: ${signal?.lightHits}`);
console.log(`REM hits: ${signal?.remHits}`);
```

## 评分算法

### 提升分数计算

总分由以下组件加权组成：

| 组件 | 权重 | 描述 |
|------|------|------|
| frequency | 0.24 | 召回频率 |
| relevance | 0.30 | 平均相关性 |
| diversity | 0.15 | 查询多样性 |
| recency | 0.15 | 时效性（半衰期衰减） |
| consolidation | 0.10 | 巩固程度（跨天数） |
| conceptual | 0.06 | 概念标签覆盖 |

### 时效性计算

使用指数衰减模型：

```
score = 0.5^(elapsed / halfLife)
```

默认半衰期为14天。

## API参考

### RecallTracker

| 方法 | 描述 |
|------|------|
| `recordRecalls(options)` | 记录召回信号 |
| `getAllEntries()` | 获取所有召回条目 |
| `getEntry(key)` | 获取指定条目 |
| `rankCandidates(options)` | 获取提升候选排序 |
| `markPromoted(key)` | 标记条目已提升 |
| `markGrounded(key)` | 标记条目已验证 |
| `recordPhaseSignal(key, phase)` | 记录阶段信号 |
| `getPhaseSignal(key)` | 获取阶段信号 |
| `getStatistics()` | 获取统计信息 |
| `audit()` | 获取审计信息 |

### RecallStatistics

| 方法 | 描述 |
|------|------|
| `calculateRecencyScore()` | 计算时效性分数 |
| `calculateFrequencyScore()` | 计算频率分数 |
| `calculateRelevanceScore()` | 计算相关性分数 |
| `calculateDiversityScore()` | 计算多样性分数 |
| `rankCandidates()` | 排序提升候选 |

## 配置

### RecallTrackingConfig

```typescript
interface RecallTrackingConfig {
  maxQueryHashes?: number;           // 每条目最大查询哈希数 (默认: 32)
  maxRecallDays?: number;            // 最大追踪天数 (默认: 16)
  defaultRecencyHalfLifeDays?: number; // 默认时效半衰期 (默认: 14)
  minPromotionScore?: number;         // 最低提升分数 (默认: 0.75)
  minPromotionRecallCount?: number;   // 最低召回次数 (默认: 3)
  minPromotionUniqueQueries?: number; // 最低唯一查询数 (默认: 2)
  phaseSignalHalfLifeDays?: number;   // 阶段信号半衰期 (默认: 14)
  maxPromotionAgeDays?: number;       // 最大提升年龄 (默认: 30)
}
```

## 数据结构

### RecallEntry

```typescript
interface RecallEntry {
  key: string;              // 唯一键
  path: string;             // 记忆路径
  startLine: number;        // 起始行
  endLine: number;          // 结束行
  source: 'memory' | 'wiki'; // 来源
  snippet: string;          // 摘要
  recallCount: number;      // 召回次数
  dailyCount: number;       // 今日召回
  groundedCount: number;     // 验证次数
  totalScore: number;       // 总分数
  maxScore: number;         // 最高分数
  firstRecalledAt: string;  // 首次召回时间
  lastRecalledAt: string;   // 最近召回时间
  queryHashes: string[];    // 查询哈希列表
  recallDays: string[];     // 召回日期列表
  conceptTags: string[];     // 概念标签
  claimHash?: string;        // 声明哈希
  promotedAt?: string;       // 提升时间
}
```

### PromotionCandidate

```typescript
interface PromotionCandidate {
  key: string;
  path: string;
  recallCount: number;
  uniqueQueries: number;
  score: number;
  avgScore: number;
  ageDays: number;
  components: {
    frequency: number;
    relevance: number;
    diversity: number;
    recency: number;
    consolidation: number;
    conceptual: number;
  };
}
```
