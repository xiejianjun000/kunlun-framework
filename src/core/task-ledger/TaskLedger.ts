/**
 * TaskLedger - Durable Task Ledger Main Class
 * SQLite-backed persistent task management for OpenTaiji EvolutionSystem
 * Inspired by reflow-ts (GitHub: danfry1/reflow-ts)
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  TaskStatus,
  type TaskRecord,
  type TaskHistoryRecord,
  type StorageAdapter,
  type TaskLedgerConfig,
  type TaskQueryFilters,
  type StaleTaskRecord,
  type RecoverySummary,
  type TaskStatistics,
  type CreateTaskInput,
  type UpdateTaskInput
} from './types';
import { TaskRecordEntity, TaskRecordFactory } from './TaskRecord';
import { TaskRecovery } from './TaskRecovery';

/**
 * SQLite Storage Adapter implementation
 */
class SQLiteStorageAdapter implements StorageAdapter {
  private db: Database.Database;
  private initialized = false;

  constructor(dbPath: string) {
    this.db = new Database(dbPath) as Database.Database;
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    try {
      const schema = readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    } catch {
      // Schema already exists or custom schema
    }
    this.initialized = true;
  }

  async createTask(task: Partial<TaskRecord>): Promise<TaskRecord> {
    const now = new Date().toISOString();
    const id = task.id || randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, name, type, status, priority,
        input_data, output_data, error_data,
        current_step, completed_steps, attempt_count, max_attempts,
        created_at, updated_at, started_at, completed_at, scheduled_at,
        lease_expires_at, worker_id, progress, metadata
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    stmt.run(
      id,
      task.name || 'Unnamed Task',
      task.type || 'default',
      task.status || 'pending',
      task.priority || 0,
      task.input_data || null,
      task.output_data || null,
      task.error_data || null,
      task.current_step || null,
      JSON.stringify(task.completed_steps || []),
      task.attempt_count || 0,
      task.max_attempts || 3,
      task.created_at || now,
      task.updated_at || now,
      task.started_at || null,
      task.completed_at || null,
      task.scheduled_at || null,
      task.lease_expires_at || null,
      task.worker_id || null,
      task.progress || 0,
      JSON.stringify(task.metadata || {})
    );

    return (await this.getTask(id))!;
  }

  async getTask(id: string): Promise<TaskRecord | null> {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as TaskRecord | undefined;
    if (!row) return null;
    return this.parseTaskRow(row);
  }

  async updateTask(id: string, updates: UpdateTaskInput): Promise<TaskRecord | null> {
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.output_data !== undefined) {
      fields.push('output_data = ?');
      values.push(typeof updates.output_data === 'string' ? updates.output_data : JSON.stringify(updates.output_data));
    }
    if (updates.error_data !== undefined) {
      fields.push('error_data = ?');
      values.push(typeof updates.error_data === 'string' ? updates.error_data : JSON.stringify(updates.error_data));
    }
    if (updates.current_step !== undefined) {
      fields.push('current_step = ?');
      values.push(updates.current_step);
    }
    if (updates.completed_steps !== undefined) {
      fields.push('completed_steps = ?');
      values.push(JSON.stringify(updates.completed_steps));
    }
    if (updates.attempt_count !== undefined) {
      fields.push('attempt_count = ?');
      values.push(updates.attempt_count);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }
    if (updates.started_at !== undefined) {
      fields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.lease_expires_at !== undefined) {
      fields.push('lease_expires_at = ?');
      values.push(updates.lease_expires_at);
    }
    if (updates.worker_id !== undefined) {
      fields.push('worker_id = ?');
      values.push(updates.worker_id);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(id);
    const stmt = this.db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getTask(id);
  }

  async deleteTask(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async queryTasks(filters: TaskQueryFilters): Promise<TaskRecord[]> {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        sql += ` AND status IN (${filters.status.map(() => '?').join(', ')})`;
        params.push(...filters.status);
      } else {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
    }
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        sql += ` AND type IN (${filters.type.map(() => '?').join(', ')})`;
        params.push(...filters.type);
      } else {
        sql += ' AND type = ?';
        params.push(filters.type);
      }
    }
    if (filters.priority?.gte !== undefined) {
      sql += ' AND priority >= ?';
      params.push(filters.priority.gte);
    }
    if (filters.priority?.lte !== undefined) {
      sql += ' AND priority <= ?';
      params.push(filters.priority.lte);
    }
    if (filters.created_after) {
      sql += ' AND created_at >= ?';
      params.push(filters.created_after);
    }
    if (filters.created_before) {
      sql += ' AND created_at <= ?';
      params.push(filters.created_before);
    }
    if (filters.worker_id) {
      sql += ' AND worker_id = ?';
      params.push(filters.worker_id);
    }

    sql += ` ORDER BY ${filters.order_by || 'created_at'} ${filters.order_dir || 'asc'}`;
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as TaskRecord[];
    return rows.map(row => this.parseTaskRow(row));
  }

  async getTaskCount(filters: TaskQueryFilters): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        sql += ` AND status IN (${filters.status.map(() => '?').join(', ')})`;
        params.push(...filters.status);
      } else {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  async addHistoryRecord(record: Omit<TaskHistoryRecord, 'id'>): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO task_history (
        task_id, event_type, event_data, task_snapshot,
        worker_id, timestamp, error_message, stack_trace
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.task_id,
      record.event_type,
      record.event_data || null,
      record.task_snapshot || null,
      record.worker_id || null,
      record.timestamp,
      record.error_message || null,
      record.stack_trace || null
    );
  }

  async getTaskHistory(taskId: string, limit = 100): Promise<TaskHistoryRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM task_history 
      WHERE task_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(taskId, limit) as TaskHistoryRecord[];
  }

  async claimTask(taskId: string, workerId: string, leaseExpires: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET worker_id = ?, lease_expires_at = ?, updated_at = ?
      WHERE id = ? AND (worker_id IS NULL OR worker_id = ? OR lease_expires_at < datetime('now'))
    `);
    const result = stmt.run(workerId, leaseExpires, new Date().toISOString(), taskId, workerId);
    return result.changes > 0;
  }

  async releaseTask(taskId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET worker_id = NULL, lease_expires_at = NULL, updated_at = ?
      WHERE id = ?
    `);
    const result = stmt.run(new Date().toISOString(), taskId);
    return result.changes > 0;
  }

  async heartbeatTask(taskId: string, leaseExpires: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET lease_expires_at = ?, updated_at = ?
      WHERE id = ? AND worker_id IS NOT NULL
    `);
    const result = stmt.run(leaseExpires, new Date().toISOString(), taskId);
    return result.changes > 0;
  }

  async getStaleTasks(maxStaleAgeMs: number): Promise<StaleTaskRecord[]> {
    const threshold = new Date(Date.now() - maxStaleAgeMs).toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE status = 'running' 
        AND lease_expires_at IS NOT NULL 
        AND lease_expires_at < ?
    `);
    const rows = stmt.all(threshold) as TaskRecord[];
    
    return rows.map(row => ({
      id: 0,
      task_id: row.id,
      detected_at: new Date().toISOString(),
      last_heartbeat: row.lease_expires_at!,
      reason: 'Lease expired without completion'
    }));
  }

  async reclaimTask(taskId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = 'pending', worker_id = NULL, lease_expires_at = NULL, updated_at = ?
      WHERE id = ? AND status = 'running'
    `);
    const result = stmt.run(new Date().toISOString(), taskId);
    return result.changes > 0;
  }

  async checkIdempotencyKey(key: string): Promise<string | null> {
    const stmt = this.db.prepare(`
      SELECT task_id FROM idempotency_keys 
      WHERE key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    const row = stmt.get(key) as { task_id: string } | undefined;
    return row?.task_id || null;
  }

  async setIdempotencyKey(key: string, taskId: string, expiresAt?: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, task_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(key, taskId, new Date().toISOString(), expiresAt || null);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction(fn)();
  }

  private parseTaskRow(row: any): TaskRecord {
    return {
      ...row,
      completed_steps: typeof row.completed_steps === 'string' 
        ? JSON.parse(row.completed_steps) 
        : row.completed_steps || [],
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata || {}
    };
  }

  close(): void {
    this.db.close();
  }
}

/**
 * TaskLedger - Main class for durable task management
 */
export class TaskLedger {
  private storage: SQLiteStorageAdapter;
  private factory: TaskRecordFactory;
  private recovery: TaskRecovery;
  private config: TaskLedgerConfig;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: TaskLedgerConfig) {
    this.config = config;
    this.storage = new SQLiteStorageAdapter(config.dbPath);
    this.factory = new TaskRecordFactory(this.storage);
    this.recovery = new TaskRecovery(
      this.storage,
      config.workerId,
      {
        max_stale_age_ms: config.staleThresholdMs,
        lease_duration_ms: config.leaseDurationMs,
        heartbeat_interval_ms: config.heartbeatIntervalMs,
        auto_reclaim: config.autoRecovery
      }
    );
  }

  /**
   * Initialize the TaskLedger
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    if (this.config.autoRecovery) {
      this.recovery.start();
    }
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<TaskRecordEntity> {
    return this.factory.create(input);
  }

  /**
   * Load existing task
   */
  async loadTask(id: string): Promise<TaskRecordEntity | null> {
    return this.factory.load(id);
  }

  /**
   * Query tasks
   */
  async queryTasks(filters: TaskQueryFilters): Promise<TaskRecordEntity[]> {
    const tasks = await this.storage.queryTasks(filters);
    return tasks.map(task => new TaskRecordEntity(this.storage, task));
  }

  /**
   * Get task history
   */
  async getTaskHistory(taskId: string, limit = 100): Promise<TaskHistoryRecord[]> {
    return this.storage.getTaskHistory(taskId, limit);
  }

  /**
   * Claim next available task
   */
  async claimNextTask(): Promise<{ task: TaskRecordEntity | null; reclaimed: boolean }> {
    const { task, reclaimed } = await this.recovery.getNextAvailableTask();
    if (!task) return { task: null, reclaimed: false };

    const claimResult = await this.recovery.claimTask(task.id);
    if (!claimResult.claimed) {
      return { task: null, reclaimed };
    }

    const entity = new TaskRecordEntity(this.storage, claimResult.task!);
    await entity.markStarted();
    
    return { task: entity, reclaimed };
  }

  /**
   * Start polling for available tasks
   */
  startPolling(callback: (task: TaskRecordEntity) => Promise<void>, intervalMs = 1000): void {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        const { task } = await this.claimNextTask();
        if (task) {
          await callback(task);
        }
      } catch (error) {
        console.error('[TaskLedger] Polling error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Get recovery instance for direct operations
   */
  getRecovery(): TaskRecovery {
    return this.recovery;
  }

  /**
   * Get task statistics
   */
  async getStatistics(): Promise<TaskStatistics> {
    const allTasks = await this.storage.queryTasks({});
    const completedTasks = allTasks.filter(t => t.status === TaskStatus.COMPLETED);
    
    const by_status = Object.values(TaskStatus).reduce((acc, status) => {
      acc[status] = allTasks.filter(t => t.status === status).length;
      return acc;
    }, {} as Record<TaskStatus, number>);

    const by_type = allTasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completionTimes = completedTasks
      .filter(t => t.completed_at && t.created_at)
      .map(t => new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime());
    
    const avg_completion_time_ms = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    const failedTasks = allTasks.filter(t => t.status === TaskStatus.FAILED).length;
    const success_rate = allTasks.length > 0 
      ? completedTasks.length / allTasks.length 
      : 0;

    return {
      total: allTasks.length,
      by_status,
      by_type,
      avg_completion_time_ms,
      success_rate
    };
  }

  /**
   * Run stale task recovery manually
   */
  async runRecovery(): Promise<RecoverySummary> {
    return this.recovery.detectAndReclaimStaleTasks();
  }

  /**
   * Shutdown the TaskLedger
   */
  async shutdown(): Promise<void> {
    this.stopPolling();
    this.recovery.stop();
    this.storage.close();
  }
}

export { TaskRecordEntity, TaskRecordFactory } from './TaskRecord';
export { TaskRecovery, RecoveryUtils } from './TaskRecovery';
export * from './types';
