/**
 * 记忆存储管理
 * Memory Store - PostgreSQL/SQLite Backend
 */

import Database from 'better-sqlite3';
import {
  IMemory,
  IMemoryStoreConfig,
  MemoryTier,
  IRetentionPolicy,
} from '../interfaces';

export interface MemorySearchOptions {
  tiers?: MemoryTier[];
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  tags?: string[];
}

/**
 * 记忆存储管理类
 * 
 * 提供记忆的持久化存储，支持SQLite和PostgreSQL后端
 * 
 * @example
 * ```typescript
 * const store = new MemoryStore({
 *   dbType: 'sqlite',
 *   connectionString: './data/memory.db'
 * });
 * 
 * await store.initialize();
 * await store.save(memory);
 * const memories = await store.getByUserId('user1');
 * await store.destroy();
 * ```
 */
export class MemoryStore {
  private readonly config: IMemoryStoreConfig;
  private db: Database.Database | null = null;
  private tableName: string;
  private linksTableName: string;

  /**
   * 构造函数
   * @param config 存储配置
   */
  constructor(config: IMemoryStoreConfig) {
    this.config = {
      tablePrefix: 'memory_',
      poolSize: 10,
      vectorDimension: 1536,
      ...config,
    };
    this.tableName = `${this.config.tablePrefix}memories`;
    this.linksTableName = `${this.config.tablePrefix}links`;
  }

  // ============== 生命周期 ==============

  /**
   * 初始化存储
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    try {
      this.db = new Database(this.config.connectionString);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      await this.createTables();
      this.createIndexes();

      console.log(`[MemoryStore] 初始化完成: ${this.config.connectionString}`);
    } catch (error) {
      console.error('[MemoryStore] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 销毁存储
   */
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[MemoryStore] 已销毁');
    }
  }

  // ============== 记忆操作 ==============

  /**
   * 保存记忆
   * @param memory 记忆对象
   * @returns 记忆ID
   */
  async save(memory: IMemory): Promise<string> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      INSERT INTO ${this.tableName} (
        id, user_id, tenant_id, content, type, tier, embedding,
        metadata, created_at, accessed_at, access_count,
        importance_score, is_archived, tags, linked_memory_ids
      ) VALUES (
        @id, @userId, @tenantId, @content, @type, @tier, @embedding,
        @metadata, @createdAt, @accessedAt, @accessCount,
        @importanceScore, @isArchived, @tags, @linkedMemoryIds
      )
    `);

    stmt.run({
      id: memory.id,
      userId: memory.userId,
      tenantId: memory.tenantId,
      content: memory.content,
      type: memory.type,
      tier: memory.tier,
      embedding: memory.embedding ? JSON.stringify(memory.embedding) : null,
      metadata: JSON.stringify(memory.metadata),
      createdAt: memory.createdAt.toISOString(),
      accessedAt: memory.accessedAt.toISOString(),
      accessCount: memory.accessCount,
      importanceScore: memory.importanceScore,
      isArchived: memory.isArchived ? 1 : 0,
      tags: memory.tags ? JSON.stringify(memory.tags) : null,
      linkedMemoryIds: memory.linkedMemoryIds ? JSON.stringify(memory.linkedMemoryIds) : null,
    });

    return memory.id;
  }

  /**
   * 更新记忆
   * @param memory 记忆对象
   * @returns 更新后的记忆
   */
  async update(memory: IMemory): Promise<IMemory> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      UPDATE ${this.tableName} SET
        content = @content,
        type = @type,
        tier = @tier,
        embedding = @embedding,
        metadata = @metadata,
        accessed_at = @accessedAt,
        access_count = @accessCount,
        importance_score = @importanceScore,
        is_archived = @isArchived,
        tags = @tags,
        linked_memory_ids = @linkedMemoryIds
      WHERE id = @id AND user_id = @userId
    `);

    stmt.run({
      id: memory.id,
      userId: memory.userId,
      content: memory.content,
      type: memory.type,
      tier: memory.tier,
      embedding: memory.embedding ? JSON.stringify(memory.embedding) : null,
      metadata: JSON.stringify(memory.metadata),
      accessedAt: memory.accessedAt.toISOString(),
      accessCount: memory.accessCount,
      importanceScore: memory.importanceScore,
      isArchived: memory.isArchived ? 1 : 0,
      tags: memory.tags ? JSON.stringify(memory.tags) : null,
      linkedMemoryIds: memory.linkedMemoryIds ? JSON.stringify(memory.linkedMemoryIds) : null,
    });

    return memory;
  }

  /**
   * 根据ID获取记忆
   * @param memoryId 记忆ID
   * @param userId 用户ID
   * @returns 记忆对象或null
   */
  async getById(memoryId: string, userId: string): Promise<IMemory | null> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE id = ? AND user_id = ?
    `);

    const row = stmt.get(memoryId, userId) as any;
    return row ? this.rowToMemory(row) : null;
  }

  /**
   * 删除记忆
   * @param memoryId 记忆ID
   * @param userId 用户ID
   */
  async delete(memoryId: string, userId: string): Promise<void> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      DELETE FROM ${this.tableName}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(memoryId, userId);
  }

  /**
   * 根据用户ID获取记忆
   * @param userId 用户ID
   * @param options 查询选项
   * @returns 记忆列表
   */
  async getByUserId(userId: string, options: MemorySearchOptions = {}): Promise<IMemory[]> {
    this.ensureInitialized();

    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
    const params: any[] = [userId];

    if (!options.includeArchived) {
      sql += ` AND is_archived = 0`;
    }

    if (options.tiers && options.tiers.length > 0) {
      sql += ` AND tier IN (${options.tiers.map(() => '?').join(',')})`;
      params.push(...options.tiers);
    }

    if (options.timeRange?.start) {
      sql += ` AND created_at >= ?`;
      params.push(options.timeRange.start.toISOString());
    }

    if (options.timeRange?.end) {
      sql += ` AND created_at <= ?`;
      params.push(options.timeRange.end.toISOString());
    }

    if (options.tags && options.tags.length > 0) {
      // SQLite不支持JSON数组直接查询，使用LIKE
      for (const tag of options.tags) {
        sql += ` AND tags LIKE ?`;
        params.push(`%"${tag}"%`);
      }
    }

    sql += ` ORDER BY accessed_at DESC`;

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToMemory(row));
  }

  /**
   * 搜索记忆
   * @param query 搜索关键词
   * @param userId 用户ID
   * @param options 搜索选项
   * @returns 记忆列表
   */
  async search(
    query: string,
    userId: string,
    options: MemorySearchOptions = {}
  ): Promise<IMemory[]> {
    this.ensureInitialized();

    let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND content LIKE ?`;
    const params: any[] = [userId, `%${query}%`];

    if (!options.includeArchived) {
      sql += ` AND is_archived = 0`;
    }

    if (options.tiers && options.tiers.length > 0) {
      sql += ` AND tier IN (${options.tiers.map(() => '?').join(',')})`;
      params.push(...options.tiers);
    }

    sql += ` ORDER BY importance_score DESC, access_count DESC`;

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToMemory(row));
  }

  /**
   * 获取所有记忆
   * @returns 记忆列表
   */
  async getAll(): Promise<IMemory[]> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`SELECT * FROM ${this.tableName}`);
    const rows = stmt.all() as any[];

    return rows.map(row => this.rowToMemory(row));
  }

  /**
   * 获取所有用户ID
   * @returns 用户ID列表
   */
  async getAllUserIds(): Promise<string[]> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`SELECT DISTINCT user_id FROM ${this.tableName}`);
    const rows = stmt.all() as any[];

    return rows.map(row => row.user_id);
  }

  /**
   * 获取最近的已删除记忆
   * @returns 已删除的记忆列表
   */
  async getRecentDeleted(): Promise<IMemory[]> {
    // SQLite不直接支持软删除，这里返回空数组
    // 在实际实现中，可以使用软删除或单独的deleted_memories表
    return [];
  }

  /**
   * 获取存储大小
   * @returns 存储大小（字节）
   */
  async getStorageSize(): Promise<number> {
    this.ensureInitialized();

    try {
      const stmt = this.db!.prepare(`
        SELECT page_count * page_size as size 
        FROM pragma_page_count(), pragma_page_size()
      `);
      const result = stmt.get() as any;
      return result?.size ?? 0;
    } catch {
      return 0;
    }
  }

  // ============== 关联操作 ==============

  /**
   * 保存记忆关联
   * @param link 关联对象
   */
  async saveLink(link: any): Promise<void> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO ${this.linksTableName} (
        id, source_memory_id, target_memory_id, relation_type,
        strength, created_at, metadata
      ) VALUES (
        @id, @sourceMemoryId, @targetMemoryId, @relationType,
        @strength, @createdAt, @metadata
      )
    `);

    stmt.run({
      id: link.id,
      sourceMemoryId: link.sourceMemoryId,
      targetMemoryId: link.targetMemoryId,
      relationType: link.relationType,
      strength: link.strength,
      createdAt: link.createdAt.toISOString(),
      metadata: link.metadata ? JSON.stringify(link.metadata) : null,
    });
  }

  /**
   * 获取记忆关联
   * @param memoryId 记忆ID
   * @param userId 用户ID
   * @returns 关联列表
   */
  async getLinks(memoryId: string, userId: string): Promise<any[]> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      SELECT l.* FROM ${this.linksTableName} l
      INNER JOIN ${this.tableName} m ON (
        l.source_memory_id = m.id OR l.target_memory_id = m.id
      )
      WHERE m.id = ? AND m.user_id = ?
    `);

    const rows = stmt.all(memoryId, userId) as any[];
    return rows.map(row => this.rowToLink(row));
  }

  /**
   * 获取关联总数
   * @param userId 用户ID
   * @returns 关联数量
   */
  async getLinkCount(userId?: string): Promise<number> {
    this.ensureInitialized();

    let sql = `SELECT COUNT(*) as count FROM ${this.linksTableName}`;
    const params: any[] = [];

    if (userId) {
      sql = `
        SELECT COUNT(*) as count FROM ${this.linksTableName} l
        INNER JOIN ${this.tableName} m ON l.source_memory_id = m.id
        WHERE m.user_id = ?
      `;
      params.push(userId);
    }

    const stmt = this.db!.prepare(sql);
    const result = stmt.get(...params) as any;
    return result?.count ?? 0;
  }

  /**
   * 删除记忆的所有关联
   * @param memoryId 记忆ID
   * @param userId 用户ID
   */
  async deleteLinks(memoryId: string, userId: string): Promise<void> {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      DELETE FROM ${this.linksTableName}
      WHERE source_memory_id = ? OR target_memory_id = ?
    `);

    stmt.run(memoryId, memoryId);
  }

  // ============== 私有方法 ==============

  /**
   * 确保存储已初始化
   */
  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('MemoryStore未初始化，请先调用initialize()');
    }
  }

  /**
   * 创建表结构
   */
  private async createTables(): Promise<void> {
    // 记忆表
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        tier TEXT DEFAULT 'warm',
        embedding TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        access_count INTEGER DEFAULT 0,
        importance_score REAL DEFAULT 0.5,
        is_archived INTEGER DEFAULT 0,
        tags TEXT,
        linked_memory_ids TEXT
      )
    `);

    // 关联表
    this.db!.exec(`
      CREATE TABLE IF NOT EXISTS ${this.linksTableName} (
        id TEXT PRIMARY KEY,
        source_memory_id TEXT NOT NULL,
        target_memory_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        strength REAL DEFAULT 0.5,
        created_at TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source_memory_id) REFERENCES ${this.tableName}(id),
        FOREIGN KEY (target_memory_id) REFERENCES ${this.tableName}(id)
      )
    `);

    // 删除已删除记忆的关联
    this.db!.exec(`
      DELETE FROM ${this.linksTableName}
      WHERE source_memory_id NOT IN (SELECT id FROM ${this.tableName})
      OR target_memory_id NOT IN (SELECT id FROM ${this.tableName})
    `);
  }

  /**
   * 创建索引
   */
  private createIndexes(): void {
    this.db!.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON ${this.tableName}(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_tenant_id ON ${this.tableName}(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_memories_tier ON ${this.tableName}(tier);
      CREATE INDEX IF NOT EXISTS idx_memories_accessed_at ON ${this.tableName}(accessed_at);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON ${this.tableName}(importance_score);
      CREATE INDEX IF NOT EXISTS idx_memories_archived ON ${this.tableName}(is_archived);
      CREATE INDEX IF NOT EXISTS idx_links_source ON ${this.linksTableName}(source_memory_id);
      CREATE INDEX IF NOT EXISTS idx_links_target ON ${this.linksTableName}(target_memory_id);
    `);
  }

  /**
   * 将行数据转换为记忆对象
   */
  private rowToMemory(row: any): IMemory {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      content: row.content,
      type: row.type,
      tier: row.tier as MemoryTier,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at),
      accessedAt: new Date(row.accessed_at),
      accessCount: row.access_count,
      importanceScore: row.importance_score,
      isArchived: Boolean(row.is_archived),
      tags: row.tags ? JSON.parse(row.tags) : [],
      linkedMemoryIds: row.linked_memory_ids ? JSON.parse(row.linked_memory_ids) : [],
    };
  }

  /**
   * 将行数据转换为关联对象
   */
  private rowToLink(row: any): any {
    return {
      id: row.id,
      sourceMemoryId: row.source_memory_id,
      targetMemoryId: row.target_memory_id,
      relationType: row.relation_type,
      strength: row.strength,
      createdAt: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }
}
