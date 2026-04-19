# GraphMemory - 图存储模块

基于SQLite的图存储实现，用于OpenTaiji记忆系统。

## 核心特性

- **节点管理**: 支持多种节点类型（File, Class, Function, Concept等）
- **边管理**: 支持多种边类型（CALLS, IMPORTS, DEPENDS_ON等）
- **图遍历**: BFS/DFS遍历算法
- **最短路径**: 无权最短路径查询
- **影响力半径**: 从种子节点出发的影响范围分析
- **社区发现**: 基于Union-Find的连通分量检测
- **全文搜索**: 支持FTS5的节点内容搜索

## 安装

依赖已包含在 `package.json` 中：
- `better-sqlite3`: SQLite数据库驱动
- `@types/better-sqlite3`: TypeScript类型定义
- `uuid`: UUID生成

## 快速开始

```typescript
import { createGraphMemoryStore } from './integrations/graph-memory';

// 创建存储实例
const store = createGraphMemoryStore({
  dbPath: './memory-graph.db',
  enableWAL: true,
});

// 创建节点
const node = store.createNode({
  kind: 'Concept',
  qualifiedName: 'open-taiji:graph-memory',
  name: 'GraphMemory',
  content: '基于SQLite的图存储模块',
  metadata: {
    importance: 10,
    tags: ['storage', 'graph', 'sqlite'],
  },
});

// 创建边
const targetNode = store.createNode({
  kind: 'Project',
  qualifiedName: 'open-taiji',
  name: 'OpenTaiji',
});

store.upsertEdge({
  sourceId: node.id,
  targetId: targetNode.id,
  kind: 'DEPENDS_ON',
});

// 图查询
const neighbors = store.getNeighbors(node.id);
const path = store.shortestPath(startNodeId, endNodeId);
const impact = store.getImpactRadius([node.id], 3);

// 获取统计
const stats = store.getStats();
console.log(stats);

// 关闭存储
store.close();
```

## API参考

### GraphMemoryStore

主存储类，提供统一的节点/边操作接口。

#### 节点操作

```typescript
// 创建节点
createNode(input: CreateNodeInput): GraphNode

// 批量创建节点
createNodes(inputs: CreateNodeInput[]): GraphNode[]

// 获取节点
getNode(id: string): GraphNode | null

// 搜索节点
searchNodes(query: string, options?: NodeSearchOptions): GraphNode[]

// 按类型获取
getNodesByKind(kind: NodeKind): GraphNode[]

// 更新节点
updateNode(id: string, input: UpdateNodeInput): GraphNode | null

// 删除节点
deleteNode(id: string): boolean
```

#### 边操作

```typescript
// 创建边
createEdge(input: CreateEdgeInput): GraphEdge

// 创建或更新边
upsertEdge(input: CreateEdgeInput): GraphEdge

// 获取边
getEdge(id: string): GraphEdge | null

// 获取出边
getOutgoingEdges(nodeId: string, kinds?: EdgeKind[]): GraphEdge[]

// 获取入边
getIncomingEdges(nodeId: string, kinds?: EdgeKind[]): GraphEdge[]

// 删除边
deleteEdge(id: string): boolean
```

#### 图查询

```typescript
// 获取邻居
getNeighbors(nodeId: string, options?: NeighborQueryOptions): GraphNode[]

// BFS遍历
bfs(startNodeId: string, options?: TraversalOptions): Map<string, number>

// DFS遍历
dfs(startNodeId: string, options?: TraversalOptions): Set<string>

// 最短路径
shortestPath(startNodeId: string, endNodeId: string): PathResult | null

// 影响力半径
getImpactRadius(seedNodeIds: string[], maxDepth?: number, maxNodes?: number): ImpactRadiusResult

// 子图提取
getSubgraph(nodeIds: string[]): SubgraphResult

// 调用链
getCallChain(startNodeId: string, maxDepth?: number): GraphNode[]

// 调用者
getCallers(targetNodeId: string, maxDepth?: number): GraphNode[]
```

#### 社区发现

```typescript
// 检测社区
detectCommunities(): Community[]

// 获取节点社区
getNodeCommunity(nodeId: string): Community | null

// 获取社区成员
getCommunityMembers(communityId: number): CommunityMembersResult | null
```

### 节点类型 (NodeKind)

```
- File: 文件节点
- Class: 类节点
- Function: 函数节点
- Method: 方法节点
- Type: 类型节点
- Interface: 接口节点
- Enum: 枚举节点
- Test: 测试节点
- Variable: 变量节点
- Concept: 概念节点
- Entity: 实体节点
- Document: 文档节点
- Person: 人物节点
- Project: 项目节点
```

### 边类型 (EdgeKind)

```
- CALLS: 调用关系
- IMPORTS: 导入关系
- IMPORTS_FROM: 从某处导入
- INHERITS: 继承关系
- IMPLEMENTS: 实现关系
- CONTAINS: 包含关系
- TESTED_BY: 被测试关系
- DEPENDS_ON: 依赖关系
- REFERENCES: 引用关系
- ASSOCIATED_WITH: 关联关系
- RELATED_TO: 相关关系
- EXTENDS: 扩展关系
```

### 置信度层级 (ConfidenceTier)

```
- EXTRACTED: 从代码中直接提取
- INFERRED: 推断得出
- DERIVED: 派生得出
```

## 数据库Schema

```sql
-- 节点表
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    qualified_name TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    content TEXT,
    metadata JSON DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 边表
CREATE TABLE edges (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    confidence_tier TEXT DEFAULT 'EXTRACTED',
    metadata JSON DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- 元数据表
CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
```

## 最佳实践

### 1. 使用事务批量操作

```typescript
// 原子性存储文件数据
store.storeFileData(filePath, nodes, edges);

// 或者使用transaction
store.transaction(() => {
  store.createNodes(nodes);
  store.createEdges(edges);
  store.touch();
});
```

### 2. 利用索引优化查询

```typescript
// 节点表索引
CREATE INDEX idx_nodes_kind ON nodes(kind);
CREATE INDEX idx_nodes_qualified ON nodes(qualified_name);

// 边表索引
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
CREATE INDEX idx_edges_kind ON edges(kind);
```

### 3. 定期维护

```typescript
// 清理孤立节点
store.pruneOrphanNodes();

// 清理过期节点
store.pruneStaleNodes(30 * 24 * 60 * 60 * 1000); // 30天

// VACUUM数据库
store.vacuum();

// 分析数据库
store.analyze();
```

### 4. WAL模式

```typescript
// 推荐配置
const store = createGraphMemoryStore({
  dbPath: './memory-graph.db',
  enableWAL: true,      // 启用WAL提高并发性能
  busyTimeout: 5000,   // 5秒busy timeout
  cacheSize: 2000,     // 2MB缓存
});
```

## 与MemorySystem集成

```typescript
import { createGraphMemoryStore } from './integrations/graph-memory';
import { KnowledgeGapDetector } from './modules/memory-system/active/KnowledgeGapDetector';

// 创建存储
const store = createGraphMemoryStore();

// 创建知识缺口检测器
const gapDetector = new KnowledgeGapDetector();

// 将检测到的知识存储到图中
const gapNode = store.createNode({
  kind: 'Concept',
  qualifiedName: `gap:${gap.id}`,
  name: gap.topic,
  content: gap.description,
  metadata: {
    domain: gap.domain,
    severity: gap.severity,
    memoryId: gap.id,
  },
});
```

## 文件结构

```
src/integrations/graph-memory/
├── index.ts              # 模块导出
├── types.ts              # 类型定义
├── schema.sql            # 数据库Schema
├── GraphMemoryStore.ts   # 主存储类
├── NodeManager.ts        # 节点管理器
├── EdgeManager.ts        # 边管理器
├── GraphQuery.ts         # 图查询API
└── examples.ts           # 使用示例
```

## 许可

Apache-2.0
