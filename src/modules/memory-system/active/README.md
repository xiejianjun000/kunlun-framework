# Active Memory System - 主动记忆系统

基于OpenTaiji主动记忆架构 v1.0实现的主动记忆管理系统。

## 核心功能

### 1. 主动记忆召回 (Active Memory Recall)
- 在主回复生成前自动检索相关记忆
- 支持三种查询模式: `message`, `recent`, `full`
- 智能摘要压缩，最大字符数可配置
- 结果缓存机制，支持TTL过期

### 2. 用户偏好追踪 (Preference Tracker)
- 显式偏好追踪 - 用户明确表达的偏好
- 隐式偏好推断 - 从对话行为中学习
- 偏好衰减机制 - 长时间未确认的偏好自动衰减
- 置信度评估 - 基于证据权重计算

### 3. 知识缺口检测 (Knowledge Gap Detector)
- 自动识别用户知识缺口
- 严重程度分级: low, medium, high, critical
- 相关领域分类: technical, personal, professional, general
- 主动建议和监控机制

## 架构设计

```
ActiveMemoryManager
├── PreferenceTracker       # 偏好追踪器
├── KnowledgeGapDetector    # 知识缺口检测器
├── Cache System           # 结果缓存
└── Event System          # 事件驱动
```

## 事件类型

| 事件 | 描述 |
|------|------|
| `memory.recalled` | 记忆召回完成 |
| `memory.cached` | 结果被缓存 |
| `preference.detected` | 检测到偏好 |
| `preference.updated` | 偏好更新 |
| `gap.detected` | 发现知识缺口 |
| `gap.resolved` | 缺口已解决 |
| `heartbeat.tick` | 心跳信号 |
| `query.started` | 查询开始 |
| `query.completed` | 查询完成 |
| `config.changed` | 配置变更 |

## 使用示例

```typescript
import { ActiveMemoryManager } from './active/ActiveMemoryManager';
import { DEFAULT_ACTIVE_MEMORY_CONFIG } from './active/types';

// 创建管理器
const manager = new ActiveMemoryManager({
  enabled: true,
  queryMode: 'recent',
  maxSummaryChars: 220,
  heartbeat: { enabled: true, backgroundScan: true }
});

// 订阅事件
manager.subscribe('my-listener', (event) => {
  console.log('Memory event:', event.type, event.data);
});

// 执行记忆召回
const result = await manager.recall({
  agentId: 'main',
  sessionKey: 'agent:main:session-1',
  query: '用户问：我喜欢什么食物？',
  recentTurns: [
    { role: 'user', text: '我最喜欢吃拉面' },
    { role: 'assistant', text: '好的，我记住了' }
  ]
});

// 获取统计
const stats = manager.getStats();
console.log('Cache hit rate:', stats.cacheHits / stats.totalQueries);

// 获取状态
const state = manager.getState();
console.log('Enabled:', state.isEnabled);
```

## 查询模式

### message 模式
仅检索当前消息相关的记忆，最快速。

### recent 模式 (默认)
检索最近对话上下文相关的记忆，平衡速度和准确性。

### full 模式
进行全面的记忆图谱检索，最彻底但最慢。

## 提示风格

| 风格 | 描述 |
|------|------|
| `balanced` | 平衡模式，平衡召回率和精确度 |
| `strict` | 严格模式，只返回高度相关的记忆 |
| `contextual` | 上下文模式，更宽松 |
| `recall-heavy` | 召回优先，倾向于返回更多记忆 |
| `precision-heavy` | 精确优先，只返回最相关的 |
| `preference-only` | 仅偏好，只关注用户偏好 |

## 心跳集成

管理器支持心跳机制，可与HeartbeatManager集成：

```typescript
// 心跳配置
heartbeat: {
  enabled: true,
  checkOnHeartbeat: true,
  heartbeatIntervalMs: 60000,
  batchSize: 10,
  backgroundScan: true
}
```

心跳触发时自动：
1. 清理过期缓存
2. 衰减过期偏好
3. 检查知识缺口

## 文件列表

- `types.ts` - 类型定义
- `ActiveMemoryManager.ts` - 主动记忆管理器核心
- `PreferenceTracker.ts` - 用户偏好追踪器
- `KnowledgeGapDetector.ts` - 知识缺口检测器
- `README.md` - 本文档

## 集成到MemorySystem

```typescript
import { MemorySystem } from '../MemorySystem';

class MemorySystem {
  private activeMemoryManager: ActiveMemoryManager;
  
  // 在before_prompt_build时调用
  async beforePromptBuild(params: BeforePromptBuildParams) {
    const result = await this.activeMemoryManager.recall({
      agentId: params.agentId,
      sessionKey: params.sessionKey,
      query: params.prompt,
      recentTurns: params.messages
    });
    
    if (result.summary) {
      return { prependContext: this.activeMemoryManager.buildPromptPrefix(result.summary) };
    }
  }
}
```

## License

MIT
