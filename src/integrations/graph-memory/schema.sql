-- GraphMemory SQLite Schema
-- 图存储数据库Schema，用于OpenTaiji记忆系统

-- ============================================================================
-- Nodes 表 - 存储图中的所有节点
-- ============================================================================
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,                    -- 节点唯一标识符
    kind TEXT NOT NULL,                      -- 节点类型：File, Class, Function, Type, Test, Concept, Entity等
    qualified_name TEXT UNIQUE NOT NULL,     -- 完全限定名称，用于唯一标识和快速查找
    name TEXT NOT NULL,                      -- 简短名称
    content TEXT,                            -- 节点内容摘要
    metadata JSON DEFAULT '{}',              -- 额外元数据（JSON格式）
    created_at INTEGER NOT NULL,             -- 创建时间戳（毫秒）
    updated_at INTEGER NOT NULL              -- 更新时间戳（毫秒）
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
CREATE INDEX IF NOT EXISTS idx_nodes_qualified ON nodes(qualified_name);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_nodes_created_at ON nodes(created_at);
CREATE INDEX IF NOT EXISTS idx_nodes_updated_at ON nodes(updated_at);

-- ============================================================================
-- Edges 表 - 存储节点之间的关系
-- ============================================================================
CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,                     -- 边唯一标识符
    source_id TEXT NOT NULL,                 -- 源节点ID
    target_id TEXT NOT NULL,                  -- 目标节点ID
    kind TEXT NOT NULL,                       -- 边类型：CALLS, IMPORTS, INHERITS, DEPENDS_ON, CONTAINS, REFERENCES等
    confidence_tier TEXT DEFAULT 'EXTRACTED', -- 置信度层级：EXTRACTED, INFERRED, DERIVED
    metadata JSON DEFAULT '{}',               -- 额外元数据（JSON格式）
    created_at INTEGER NOT NULL,             -- 创建时间戳（毫秒）
    updated_at INTEGER NOT NULL,             -- 更新时间戳（毫秒）
    FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_kind ON edges(kind);
CREATE INDEX IF NOT EXISTS idx_edges_source_kind ON edges(source_id, kind);
CREATE INDEX IF NOT EXISTS idx_edges_target_kind ON edges(target_id, kind);
CREATE INDEX IF NOT EXISTS idx_edges_confidence ON edges(confidence_tier);

-- 防止重复边的约束（同一对节点之间同类型的边只能有一条）
CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_unique_relation 
ON edges(source_id, target_id, kind);

-- ============================================================================
-- Metadata 表 - 存储数据库元数据
-- ============================================================================
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- ============================================================================
-- 全文搜索虚拟表 - 节点内容搜索
-- ============================================================================
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    id UNINDEXED,
    name,
    content,
    content='nodes',
    content_rowid='rowid'
);

-- FTS触发器 - 保持索引同步
CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(rowid, id, name, content) VALUES (NEW.rowid, NEW.id, NEW.name, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, id, name, content) VALUES('delete', OLD.rowid, OLD.id, OLD.name, OLD.content);
END;

CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, id, name, content) VALUES('delete', OLD.rowid, OLD.id, OLD.name, OLD.content);
    INSERT INTO nodes_fts(rowid, id, name, content) VALUES (NEW.rowid, NEW.id, NEW.name, NEW.content);
END;

-- ============================================================================
-- 社区检测表 - 存储图聚类结果
-- ============================================================================
CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    size INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communities_name ON communities(name);

-- ============================================================================
-- 图统计缓存表
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_stats (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
