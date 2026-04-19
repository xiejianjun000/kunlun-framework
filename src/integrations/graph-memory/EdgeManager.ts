/**
 * EdgeManager - 边管理器
 * 
 * 负责边的CRUD操作和查询功能
 */

import Database = require('better-sqlite3');
import { v4 as uuidv4 } from 'uuid';
import type {
  GraphEdge,
  EdgeKind,
  ConfidenceTier,
  CreateEdgeInput,
  UpdateEdgeInput,
  EdgeMetadata,
  EdgeSearchOptions,
  TraversalDirection,
} from './types';

export class EdgeManager {
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
    // 插入边
    this.stmtCache.set('insertEdge', this.db.prepare(`
      INSERT INTO edges (id, source_id, target_id, kind, confidence_tier, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `));

    // 插入或更新边
    this.stmtCache.set('upsertEdge', this.db.prepare(`
      INSERT INTO edges (id, source_id, target_id, kind, confidence_tier, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_id = excluded.source_id,
        target_id = excluded.target_id,
        kind = excluded.kind,
        confidence_tier = excluded.confidence_tier,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `));

    // 根据ID查询边
    this.stmtCache.set('getEdgeById', this.db.prepare(`
      SELECT * FROM edges WHERE id = ?
    `));

    // 根据源节点查询边
    this.stmtCache.set('getEdgesBySource', this.db.prepare(`
      SELECT * FROM edges WHERE source_id = ?
    `));

    // 根据目标节点查询边
    this.stmtCache.set('getEdgesByTarget', this.db.prepare(`
      SELECT * FROM edges WHERE target_id = ?
    `));

    // 根据类型查询边
    this.stmtCache.set('getEdgesByKind', this.db.prepare(`
      SELECT * FROM edges WHERE kind = ?
    `));

    // 删除边
    this.stmtCache.set('deleteEdge', this.db.prepare(`
      DELETE FROM edges WHERE id = ?
    `));

    // 删除源节点的所有边
    this.stmtCache.set('deleteEdgesBySource', this.db.prepare(`
      DELETE FROM edges WHERE source_id = ?
    `));

    // 删除目标节点的所有边
    this.stmtCache.set('deleteEdgesByTarget', this.db.prepare(`
      DELETE FROM edges WHERE target_id = ?
    `));

    // 全量查询边
    this.stmtCache.set('getAllEdges', this.db.prepare(`
      SELECT * FROM edges
    `));

    // 统计边数量
    this.stmtCache.set('countEdges', this.db.prepare(`
      SELECT COUNT(*) as count FROM edges
    `));

    // 按类型统计边
    this.stmtCache.set('countEdgesByKind', this.db.prepare(`
      SELECT kind, COUNT(*) as count FROM edges GROUP BY kind
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
   * 创建边
   */
  create(input: CreateEdgeInput): GraphEdge {
    const now = Date.now();
    const id = input.id || uuidv4();
    const metadata = JSON.stringify(input.metadata || {});

    this.getStmt('insertEdge').run(
      id,
      input.sourceId,
      input.targetId,
      input.kind,
      input.confidenceTier || 'EXTRACTED',
      metadata,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * 创建或更新边（存在则更新，不存在则创建）
   */
  upsert(input: CreateEdgeInput): GraphEdge {
    const now = Date.now();
    const id = input.id || this.generateEdgeId(input.sourceId, input.targetId, input.kind);
    const metadata = JSON.stringify(input.metadata || {});

    this.getStmt('upsertEdge').run(
      id,
      input.sourceId,
      input.targetId,
      input.kind,
      input.confidenceTier || 'EXTRACTED',
      metadata,
      now,
      now
    );

    return this.getById(id)!;
  }

  /**
   * 批量创建或更新边
   */
  upsertBatch(inputs: CreateEdgeInput[]): GraphEdge[] {
    const now = Date.now();
    const upsert = this.db.transaction((items: CreateEdgeInput[]) => {
      const results: GraphEdge[] = [];
      for (const input of items) {
        const id = input.id || this.generateEdgeId(input.sourceId, input.targetId, input.kind);
        const metadata = JSON.stringify(input.metadata || {});
        this.db.prepare(`
          INSERT INTO edges (id, source_id, target_id, kind, confidence_tier, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            source_id = excluded.source_id,
            target_id = excluded.target_id,
            kind = excluded.kind,
            confidence_tier = excluded.confidence_tier,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at
        `).run(
          id,
          input.sourceId,
          input.targetId,
          input.kind,
          input.confidenceTier || 'EXTRACTED',
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
   * 生成边的唯一ID
   */
  private generateEdgeId(sourceId: string, targetId: string, kind: EdgeKind): string {
    return `${sourceId}::${kind}::${targetId}`;
  }

  /**
   * 根据ID获取边
   */
  getById(id: string): GraphEdge | null {
    const row = this.getStmt('getEdgeById').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToEdge(row) : null;
  }

  /**
   * 根据源节点获取所有出边
   */
  getBySource(sourceId: string, kinds?: EdgeKind[]): GraphEdge[] {
    let sql = 'SELECT * FROM edges WHERE source_id = ?';
    const params: string[] = [sourceId];

    if (kinds && kinds.length > 0) {
      const kindPlaceholders = kinds.map(() => '?').join(',');
      sql += ` AND kind IN (${kindPlaceholders})`;
      params.push(...kinds);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 根据目标节点获取所有入边
   */
  getByTarget(targetId: string, kinds?: EdgeKind[]): GraphEdge[] {
    let sql = 'SELECT * FROM edges WHERE target_id = ?';
    const params: string[] = [targetId];

    if (kinds && kinds.length > 0) {
      const kindPlaceholders = kinds.map(() => '?').join(',');
      sql += ` AND kind IN (${kindPlaceholders})`;
      params.push(...kinds);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 根据类型获取所有边
   */
  getByKind(kind: EdgeKind): GraphEdge[] {
    const rows = this.getStmt('getEdgesByKind').all(kind) as Record<string, unknown>[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 批量获取边
   */
  getByIds(ids: string[]): GraphEdge[] {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT * FROM edges WHERE id IN (${placeholders})
    `).all(...ids) as Record<string, unknown>[];

    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 搜索边
   */
  search(options: EdgeSearchOptions = {}): GraphEdge[] {
    const { sourceId, targetId, kinds, limit = 100 } = options;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (sourceId) {
      conditions.push('source_id = ?');
      params.push(sourceId);
    }

    if (targetId) {
      conditions.push('target_id = ?');
      params.push(targetId);
    }

    if (kinds && kinds.length > 0) {
      const kindPlaceholders = kinds.map(() => '?').join(',');
      conditions.push(`kind IN (${kindPlaceholders})`);
      params.push(...kinds);
    }

    let sql = 'SELECT * FROM edges';
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ` ORDER BY updated_at DESC LIMIT ?`;
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 获取所有边
   */
  getAll(limit = 10000): GraphEdge[] {
    const rows = this.db.prepare(`
      SELECT * FROM edges ORDER BY updated_at DESC LIMIT ?
    `).all(limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 更新边
   */
  update(id: string, input: UpdateEdgeInput): GraphEdge | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.confidenceTier !== undefined) {
      updates.push('confidence_tier = ?');
      params.push(input.confidenceTier);
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
      UPDATE edges SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    return this.getById(id);
  }

  /**
   * 删除边
   */
  delete(id: string): boolean {
    const result = this.getStmt('deleteEdge').run(id);
    return result.changes > 0;
  }

  /**
   * 删除节点的所有边（出边和入边）
   */
  deleteAllByNode(nodeId: string): number {
    const result1 = this.getStmt('deleteEdgesBySource').run(nodeId);
    const result2 = this.getStmt('deleteEdgesByTarget').run(nodeId);
    return result1.changes + result2.changes;
  }

  /**
   * 删除源节点的所有边
   */
  deleteBySource(sourceId: string): number {
    const result = this.getStmt('deleteEdgesBySource').run(sourceId);
    return result.changes;
  }

  /**
   * 删除目标节点的所有边
   */
  deleteByTarget(targetId: string): number {
    const result = this.getStmt('deleteEdgesByTarget').run(targetId);
    return result.changes;
  }

  /**
   * 获取边的统计
   */
  getStats(): { total: number; byKind: Record<string, number> } {
    const countResult = this.getStmt('countEdges').get() as { count: number };
    const kindRows = this.getStmt('countEdgesByKind').all() as Array<{ kind: string; count: number }>;

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
   * 检查边是否存在
   */
  exists(id: string): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM edges WHERE id = ? LIMIT 1
    `).get(id);
    return row !== undefined;
  }

  /**
   * 检查特定关系是否存在
   */
  existsRelation(sourceId: string, targetId: string, kind: EdgeKind): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM edges WHERE source_id = ? AND target_id = ? AND kind = ? LIMIT 1
    `).get(sourceId, targetId, kind);
    return row !== undefined;
  }

  /**
   * 获取两个节点之间的所有边
   */
  getBetweenNodes(nodeId1: string, nodeId2: string): GraphEdge[] {
    const rows = this.db.prepare(`
      SELECT * FROM edges 
      WHERE (source_id = ? AND target_id = ?) 
         OR (source_id = ? AND target_id = ?)
    `).all(nodeId1, nodeId2, nodeId2, nodeId1) as Record<string, unknown>[];
    return rows.map(row => this.rowToEdge(row));
  }

  /**
   * 获取某节点的所有邻居节点ID
   */
  getNeighborIds(nodeId: string, direction: TraversalDirection = 'both'): string[] {
    let sql: string;
    switch (direction) {
      case 'outgoing':
        sql = 'SELECT target_id as neighbor_id FROM edges WHERE source_id = ?';
        break;
      case 'incoming':
        sql = 'SELECT source_id as neighbor_id FROM edges WHERE target_id = ?';
        break;
      default:
        sql = `
          SELECT source_id as neighbor_id FROM edges WHERE target_id = ?
          UNION
          SELECT target_id as neighbor_id FROM edges WHERE source_id = ?
        `;
    }

    const rows = this.db.prepare(sql).all(
      direction === 'both' ? [nodeId, nodeId] : [nodeId]
    ) as Array<{ neighbor_id: string }>;

    return rows.map(r => r.neighbor_id);
  }

  /**
   * 将数据库行转换为边对象
   */
  private rowToEdge(row: Record<string, unknown>): GraphEdge {
    let metadata: EdgeMetadata = {};
    try {
      if (row.metadata) {
        metadata = JSON.parse(row.metadata as string);
      }
    } catch {
      metadata = {};
    }

    return {
      id: row.id as string,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      kind: row.kind as EdgeKind,
      confidenceTier: (row.confidence_tier as ConfidenceTier) || 'EXTRACTED',
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
