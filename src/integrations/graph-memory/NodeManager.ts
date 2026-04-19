/**
 * NodeManager - 节点管理器
 * 
 * 负责节点的CRUD操作和查询功能
 */

import Database = require('better-sqlite3');
import { v4 as uuidv4 } from 'uuid';
import type {
  GraphNode,
  NodeKind,
  CreateNodeInput,
  UpdateNodeInput,
  NodeMetadata,
  NodeSearchOptions,
  GraphStats,
} from './types';

export class NodeManager {
  private db: Database.Database;
  private stmtCache = new Map<string, Database.Statement>();

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  /**
   * 预处理SQL语句
   */
  private prepareStatements(): void {
    // 插入或更新节点
    this.stmtCache.set('upsertNode', this.db.prepare(`
      INSERT INTO nodes (id, kind, qualified_name, name, content, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        qualified_name = excluded.qualified_name,
        name = excluded.name,
        content = excluded.content,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `));

    // 根据ID查询节点
    this.stmtCache.set('getNodeById', this.db.prepare(`
      SELECT * FROM nodes WHERE id = ?
    `));

    // 根据qualified_name查询节点
    this.stmtCache.set('getNodeByQualifiedName', this.db.prepare(`
      SELECT * FROM nodes WHERE qualified_name = ?
    `));

    // 根据类型查询节点
    this.stmtCache.set('getNodesByKind', this.db.prepare(`
      SELECT * FROM nodes WHERE kind = ?
    `));

    // 批量查询节点
    this.stmtCache.set('batchGetNodes', this.db.prepare(`
      SELECT * FROM nodes WHERE id IN ($ids)
    `));

    // 删除节点
    this.stmtCache.set('deleteNode', this.db.prepare(`
      DELETE FROM nodes WHERE id = ?
    `));

    // 全量查询节点
    this.stmtCache.set('getAllNodes', this.db.prepare(`
      SELECT * FROM nodes
    `));

    // 统计节点数量
    this.stmtCache.set('countNodes', this.db.prepare(`
      SELECT COUNT(*) as count FROM nodes
    `));

    // 按类型统计节点
    this.stmtCache.set('countNodesByKind', this.db.prepare(`
      SELECT kind, COUNT(*) as count FROM nodes GROUP BY kind
    `));
  }

  /**
   * 获取预处理语句
   */
  private getStmt(name: string): Database.Statement {
    const stmt = this.stmtCache.get(name);
    if (!stmt) {
      throw new Error(`Statement not found: ${name}`);
    }
    return stmt;
  }

  /**
   * 创建或更新节点
   */
  upsert(input: CreateNodeInput): GraphNode {
    const now = Date.now();
    const id = input.id || uuidv4();
    const metadata = JSON.stringify(input.metadata || {});

    this.getStmt('upsertNode').run(
      id,
      input.kind,
      input.qualifiedName,
      input.name,
      input.content || null,
      metadata,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * 批量创建或更新节点
   */
  upsertBatch(inputs: CreateNodeInput[]): GraphNode[] {
    const now = Date.now();
    const upsert = this.db.transaction((items: CreateNodeInput[]) => {
      const results: GraphNode[] = [];
      for (const input of items) {
        const id = input.id || uuidv4();
        const metadata = JSON.stringify(input.metadata || {});
        this.db.prepare(`
          INSERT INTO nodes (id, kind, qualified_name, name, content, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            kind = excluded.kind,
            qualified_name = excluded.qualified_name,
            name = excluded.name,
            content = excluded.content,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at
        `).run(
          id,
          input.kind,
          input.qualifiedName,
          input.name,
          input.content || null,
          metadata,
          now,
          now
        );
        results.push(this.getById(id)!);
      }
      return results;
    });

    return upsert(inputs);
  }

  /**
   * 根据ID获取节点
   */
  getById(id: string): GraphNode | null {
    const row = this.getStmt('getNodeById').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToNode(row) : null;
  }

  /**
   * 根据qualified_name获取节点
   */
  getByQualifiedName(qualifiedName: string): GraphNode | null {
    const row = this.getStmt('getNodeByQualifiedName').get(qualifiedName) as Record<string, unknown> | undefined;
    return row ? this.rowToNode(row) : null;
  }

  /**
   * 根据类型获取所有节点
   */
  getByKind(kind: NodeKind): GraphNode[] {
    const rows = this.getStmt('getNodesByKind').all(kind) as Record<string, unknown>[];
    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 批量获取节点
   */
  getByIds(ids: string[]): GraphNode[] {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM nodes WHERE id IN (${placeholders})
    `).all(...ids) as Record<string, unknown>[];

    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 搜索节点（全文搜索 + 模糊匹配）
   */
  search(query: string, options: NodeSearchOptions = {}): GraphNode[] {
    const { kinds, limit = 50 } = options;

    if (!query.trim()) {
      return this.getAll({ kinds, limit });
    }

    // 尝试FTS5搜索
    try {
      const ftsQuery = this.buildFTSQuery(query);
      let sql = `
        SELECT n.* FROM nodes_fts f
        JOIN nodes n ON f.id = n.id
        WHERE nodes_fts MATCH ?
      `;
      const params: (string | number)[] = [ftsQuery];

      if (kinds && kinds.length > 0) {
        const kindPlaceholders = kinds.map(() => '?').join(',');
        sql += ` AND n.kind IN (${kindPlaceholders})`;
        params.push(...kinds);
      }

      sql += ` ORDER BY rank LIMIT ?`;
      params.push(limit);

      const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
      if (rows.length > 0) {
        return rows.map(row => this.rowToNode(row));
      }
    } catch {
      // FTS5不可用或搜索失败，使用LIKE搜索
    }

    // 回退到LIKE搜索
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const conditions = words.flatMap(word => [
      'LOWER(name) LIKE ?',
      'LOWER(qualified_name) LIKE ?',
      'LOWER(content) LIKE ?'
    ]);
    const params: (string | number)[] = words.flatMap(word => [`%${word}%`, `%${word}%`, `%${word}%`]);

    let sql = `SELECT * FROM nodes WHERE ${conditions.join(' AND ')}`;
    
    if (kinds && kinds.length > 0) {
      const kindPlaceholders = kinds.map(() => '?').join(',');
      sql += ` AND kind IN (${kindPlaceholders})`;
      params.push(...kinds);
    }

    sql += ` LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 构建FTS查询字符串
   */
  private buildFTSQuery(query: string): string {
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 1) {
      return `"${words[0].replace(/"/g, '""')}"`;
    }
    return words.map(w => `"${w.replace(/"/g, '""')}"`).join(' AND ');
  }

  /**
   * 获取所有节点
   */
  getAll(options: NodeSearchOptions = {}): GraphNode[] {
    const { kinds, limit = 1000, offset = 0 } = options;

    let sql = 'SELECT * FROM nodes';
    const params: (string | number)[] = [];

    if (kinds && kinds.length > 0) {
      const kindPlaceholders = kinds.map(() => '?').join(',');
      sql += ` WHERE kind IN (${kindPlaceholders})`;
      params.push(...kinds);
    }

    sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 更新节点
   */
  update(id: string, input: UpdateNodeInput): GraphNode | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.content !== undefined) {
      updates.push('content = ?');
      params.push(input.content);
    }

    if (input.metadata !== undefined) {
      const newMetadata = { ...existing.metadata, ...input.metadata };
      updates.push('metadata = ?');
      params.push(JSON.stringify(newMetadata));
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    this.db.prepare(`
      UPDATE nodes SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return this.getById(id);
  }

  /**
   * 删除节点
   */
  delete(id: string): boolean {
    const result = this.getStmt('deleteNode').run(id);
    return result.changes > 0;
  }

  /**
   * 批量删除节点
   */
  deleteBatch(ids: string[]): number {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => '?').join(',');
    const result = this.db.prepare(`
      DELETE FROM nodes WHERE id IN (${placeholders})
    `).run(...ids);

    return result.changes;
  }

  /**
   * 获取节点统计
   */
  getStats(): { total: number; byKind: Record<string, number> } {
    const countResult = this.getStmt('countNodes').get() as { count: number };
    const kindRows = this.getStmt('countNodesByKind').all() as Array<{ kind: string; count: number }>;

    const byKind: Record<string, number> = {};
    for (const row of kindRows) {
      byKind[row.kind] = row.count;
    }

    return {
      total: countResult.count,
      byKind,
    };
  }

  /**
   * 检查节点是否存在
   */
  exists(id: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM nodes WHERE id = ? LIMIT 1
    `).get(id);
    return row !== undefined;
  }

  /**
   * 检查qualified_name是否存在
   */
  existsByQualifiedName(qualifiedName: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM nodes WHERE qualified_name = ? LIMIT 1
    `).get(qualifiedName);
    return row !== undefined;
  }

  /**
   * 获取按行数排序的节点
   */
  getBySize(minLines: number, maxLines?: number, limit = 50): GraphNode[] {
    let sql = `
      SELECT * FROM nodes 
      WHERE metadata LIKE '%lineStart%'
    `;
    const params: (string | number)[] = [];

    if (maxLines !== undefined) {
      sql = `
        SELECT * FROM nodes 
        WHERE json_extract(metadata, '$.lineStart') IS NOT NULL
          AND json_extract(metadata, '$.lineEnd') IS NOT NULL
          AND (json_extract(metadata, '$.lineEnd') - json_extract(metadata, '$.lineStart') + 1) BETWEEN ? AND ?
        ORDER BY (json_extract(metadata, '$.lineEnd') - json_extract(metadata, '$.lineStart') + 1) DESC
        LIMIT ?
      `;
      params.push(minLines, maxLines, limit);
    } else {
      sql = `
        SELECT * FROM nodes 
        WHERE json_extract(metadata, '$.lineStart') IS NOT NULL
          AND json_extract(metadata, '$.lineEnd') IS NOT NULL
          AND (json_extract(metadata, '$.lineEnd') - json_extract(metadata, '$.lineStart') + 1) >= ?
        ORDER BY (json_extract(metadata, '$.lineEnd') - json_extract(metadata, '$.lineStart') + 1) DESC
        LIMIT ?
      `;
      params.push(minLines, limit);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToNode(row));
  }

  /**
   * 将数据库行转换为节点对象
   */
  private rowToNode(row: Record<string, unknown>): GraphNode {
    let metadata: NodeMetadata = {};
    try {
      if (row.metadata) {
        metadata = JSON.parse(row.metadata as string);
      }
    } catch {
      metadata = {};
    }

    return {
      id: row.id as string,
      kind: row.kind as NodeKind,
      qualifiedName: row.qualified_name as string,
      name: row.name as string,
      content: row.content as string | undefined,
      metadata,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }

  /**
   * 关闭管理器（清理缓存）
   */
  close(): void {
    this.stmtCache.clear();
  }
}
