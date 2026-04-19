# OpenTaiji FTS5 跨 Session 搜索

基于 SQLite FTS5 的跨 Session 全文搜索引擎，为 OpenTaiji 提供高效的历史记忆检索能力。

## 核心功能

- **跨 Session 搜索** - 在所有历史对话中搜索相关信息
- **BM25 排序** - 业界标准的全文检索排序算法
- **中英文支持** - unicode61 分词器支持中英文混合
- **Session 隔离** - 支持按 Session 精确筛选

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    FTS5 Search Engine                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SessionMemoryStore                                        │
│       │                                                     │
│       ▼                                                     │
│   FTS5Indexer ──────► SQLite FTS5 Virtual Table            │
│       │                                                     │
│       ▼                                                     │
│   CrossSessionSearch                                        │
│       ├── BM25 Ranking                                      │
│       ├── Session Filter                                    │
│       └── Time Range Filter                                 │
│       │                                                     │
│       ▼                                                     │
│   搜索结果                                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

```typescript
import { FTS5Indexer, CrossSessionSearch } from '@opentaiji/fts5';

// 创建索引器
const indexer = new FTS5Indexer({
  dbPath: './data/search.db'
});

// 索引 Session 记忆
await indexer.indexSession({
  sessionId: 'session-001',
  messages: [
    { role: 'user', content: '用户消息内容' },
    { role: 'assistant', content: '助手回复内容' }
  ]
});

// 跨 Session 搜索
const search = new CrossSessionSearch(indexer);
const results = await search.query('关键词', {
  limit: 10,
  sessionIds: ['session-001', 'session-002']
});
```

## API 参考

### FTS5Indexer

```typescript
class FTS5Indexer {
  // 索引 Session
  async indexSession(session: SessionData): Promise<void>;
  
  // 批量索引
  async indexBatch(sessions: SessionData[]): Promise<void>;
  
  // 删除 Session 索引
  async deleteSession(sessionId: string): Promise<void>;
  
  // 重建索引
  async rebuildIndex(): Promise<void>;
}
```

### CrossSessionSearch

```typescript
class CrossSessionSearch {
  // 基础搜索
  async query(
    keyword: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  
  // 带时间范围搜索
  async queryWithTimeRange(
    keyword: string,
    timeRange: { start: Date; end: Date }
  ): Promise<SearchResult[]>;
  
  // 获取相关 Session
  async getRelatedSessions(keyword: string): Promise<string[]>;
}
```

## 技术特点

1. **SQLite FTS5** - 轻量级、高性能全文搜索
2. **BM25 算法** - 业界标准的相关性排序
3. **增量索引** - 支持实时更新
4. **OpenTaiji 原生** - 完全集成到 Actor 运行时

## License

Apache 2.0
