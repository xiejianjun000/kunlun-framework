/**
 * TaskLedger Type Definitions
 * Durable Task Ledger for OpenTaiji EvolutionSystem
 * Inspired by reflow-ts design patterns
 */

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  WAITING_RETRY = 'waiting_retry'
}

export enum TaskEventType {
  CREATED = 'created',
  STARTED = 'started',
  STEPPED = 'stepped',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  HEARTBEAT = 'heartbeat',
  CLAIMED = 'claimed',
  RELEASED = 'released',
  RECLAIMED = 'reclaimed'
}

export interface TaskRecord {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  priority: number;
  
  input_data: string | null;
  output_data: string | null;
  error_data: string | null;
  
  current_step: string | null;
  completed_steps: string[];
  attempt_count: number;
  max_attempts: number;
  
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  
  lease_expires_at: string | null;
  worker_id: string | null;
  
  progress: number;
  metadata: Record<string, unknown>;
}

export interface CreateTaskInput {
  name: string;
  type?: string;
  priority?: number;
  input_data?: unknown;
  max_attempts?: number;
  scheduled_at?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  output_data?: unknown;
  error_data?: unknown;
  current_step?: string;
  completed_steps?: string[];
  attempt_count?: number;
  progress?: number;
  metadata?: Record<string, unknown>;
  started_at?: string | null;
  completed_at?: string | null;
  lease_expires_at?: string | null;
  worker_id?: string | null;
}

export interface TaskHistoryRecord {
  id: number;
  task_id: string;
  event_type: TaskEventType;
  event_data: string | null;
  task_snapshot: string | null;
  worker_id: string | null;
  timestamp: string;
  error_message: string | null;
  stack_trace: string | null;
}

export interface StaleTaskRecord {
  id: number;
  task_id: string;
  detected_at: string;
  last_heartbeat: string;
  reason: string | null;
}

export interface TaskQueryFilters {
  status?: TaskStatus | TaskStatus[];
  type?: string | string[];
  priority?: { gte?: number; lte?: number };
  created_after?: string;
  created_before?: string;
  worker_id?: string;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'priority' | 'updated_at';
  order_dir?: 'asc' | 'desc';
}

export interface RecoveryOptions {
  max_stale_age_ms?: number;
  lease_duration_ms?: number;
  heartbeat_interval_ms?: number;
  auto_reclaim?: boolean;
}

export interface ClaimResult {
  claimed: boolean;
  task: TaskRecord | null;
  reason?: string;
}

export interface TaskExecutionResult {
  success: boolean;
  task: TaskRecord;
  error?: { message: string; stack?: string };
  recovered?: boolean;
}

export interface StorageAdapter {
  initialize(): Promise<void>;
  createTask(task: Partial<TaskRecord>): Promise<TaskRecord>;
  getTask(id: string): Promise<TaskRecord | null>;
  updateTask(id: string, updates: UpdateTaskInput): Promise<TaskRecord | null>;
  deleteTask(id: string): Promise<boolean>;
  queryTasks(filters: TaskQueryFilters): Promise<TaskRecord[]>;
  getTaskCount(filters: TaskQueryFilters): Promise<number>;
  addHistoryRecord(record: Omit<TaskHistoryRecord, 'id'>): Promise<void>;
  getTaskHistory(taskId: string, limit?: number): Promise<TaskHistoryRecord[]>;
  claimTask(taskId: string, workerId: string, leaseExpires: string): Promise<boolean>;
  releaseTask(taskId: string): Promise<boolean>;
  heartbeatTask(taskId: string, leaseExpires: string): Promise<boolean>;
  getStaleTasks(maxStaleAgeMs: number): Promise<StaleTaskRecord[]>;
  reclaimTask(taskId: string): Promise<boolean>;
  checkIdempotencyKey(key: string): Promise<string | null>;
  setIdempotencyKey(key: string, taskId: string, expiresAt?: string): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface TaskLedgerConfig {
  dbPath: string;
  workerId: string;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
  staleThresholdMs?: number;
  cleanupIntervalMs?: number;
  autoRecovery?: boolean;
  maxRecoveryAttempts?: number;
}

export interface TaskStatistics {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_type: Record<string, number>;
  avg_completion_time_ms: number;
  success_rate: number;
}

export interface RecoverySummary {
  stale_tasks_found: number;
  tasks_reclaimed: number;
  errors: string[];
}
