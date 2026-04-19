/**
 * TaskRecord - Individual task record operations
 * Part of TaskLedger durable task system
 */

import { randomUUID } from 'crypto';
import {
  TaskStatus,
  TaskEventType,
  type TaskRecord,
  type TaskHistoryRecord,
  type CreateTaskInput,
  type UpdateTaskInput,
  type StorageAdapter
} from './types';

export class TaskRecordEntity {
  private storage: StorageAdapter;
  private task: TaskRecord;

  constructor(storage: StorageAdapter, task: TaskRecord) {
    this.storage = storage;
    this.task = task;
  }

  get id(): string { return this.task.id; }
  get status(): TaskStatus { return this.task.status; }
  get name(): string { return this.task.name; }
  get type(): string { return this.task.type; }
  get currentStep(): string | null { return this.task.current_step; }
  get completedSteps(): string[] { return this.task.completed_steps; }
  get attemptCount(): number { return this.task.attempt_count; }
  get maxAttempts(): number { return this.task.max_attempts; }
  get workerId(): string | null { return this.task.worker_id; }

  canRetry(): boolean {
    return (
      (this.task.status === TaskStatus.FAILED || 
       this.task.status === TaskStatus.WAITING_RETRY) &&
      this.task.attempt_count < this.task.max_attempts
    );
  }

  isTerminal(): boolean {
    return (
      this.task.status === TaskStatus.COMPLETED ||
      this.task.status === TaskStatus.CANCELLED
    );
  }

  isActive(): boolean {
    return (
      this.task.status === TaskStatus.PENDING ||
      this.task.status === TaskStatus.RUNNING ||
      this.task.status === TaskStatus.WAITING_RETRY
    );
  }

  isStale(maxStaleAgeMs: number): boolean {
    if (!this.task.lease_expires_at) return false;
    return Date.now() > new Date(this.task.lease_expires_at).getTime() + maxStaleAgeMs;
  }

  getInputData<T = unknown>(): T | null {
    if (!this.task.input_data) return null;
    try {
      return JSON.parse(this.task.input_data) as T;
    } catch {
      return null;
    }
  }

  getOutputData<T = unknown>(): T | null {
    if (!this.task.output_data) return null;
    try {
      return JSON.parse(this.task.output_data) as T;
    } catch {
      return null;
    }
  }

  getErrorData(): { message: string; stack?: string } | null {
    if (!this.task.error_data) return null;
    try {
      return JSON.parse(this.task.error_data);
    } catch {
      return null;
    }
  }

  getMetadata<T = Record<string, unknown>>(): T {
    if (!this.task.metadata || typeof this.task.metadata === 'string') {
      try {
        this.task.metadata = JSON.parse(this.task.metadata as string || '{}');
      } catch {
        this.task.metadata = {};
      }
    }
    return this.task.metadata as T;
  }

  getProgress(): number { return this.task.progress; }

  getCreatedAt(): Date { return new Date(this.task.created_at); }
  getUpdatedAt(): Date { return new Date(this.task.updated_at); }
  getCompletedAt(): Date | null {
    return this.task.completed_at ? new Date(this.task.completed_at) : null;
  }

  getCompletionTimeMs(): number | null {
    if (!this.task.completed_at) return null;
    return new Date(this.task.completed_at).getTime() - new Date(this.task.created_at).getTime();
  }

  toRecord(): TaskRecord { return { ...this.task }; }

  async markStarted(): Promise<void> {
    if (this.task.status !== TaskStatus.PENDING) {
      throw new Error(`Cannot start task in status: ${this.task.status}`);
    }
    
    await this.storage.transaction(async () => {
      await this.storage.updateTask(this.task.id, {
        status: TaskStatus.RUNNING,
        started_at: new Date().toISOString(),
        attempt_count: this.task.attempt_count + 1
      });
      
      await this.storage.addHistoryRecord({
        task_id: this.task.id,
        event_type: TaskEventType.STARTED,
        event_data: null,
        task_snapshot: JSON.stringify(this.task),
        worker_id: null,
        timestamp: new Date().toISOString(),
        error_message: null,
        stack_trace: null
      });
    });
    
    this.task = (await this.storage.getTask(this.task.id))!;
  }

  async markCompleted(output?: unknown): Promise<void> {
    if (this.isTerminal()) {
      throw new Error(`Task already terminal: ${this.task.status}`);
    }
    
    await this.storage.transaction(async () => {
      await this.storage.updateTask(this.task.id, {
        status: TaskStatus.COMPLETED,
        completed_at: new Date().toISOString(),
        output_data: output ? JSON.stringify(output) : this.task.output_data,
        progress: 100
      });
      
      await this.storage.addHistoryRecord({
        task_id: this.task.id,
        event_type: TaskEventType.COMPLETED,
        event_data: JSON.stringify({ output }),
        task_snapshot: JSON.stringify(this.task),
        worker_id: this.task.worker_id,
        timestamp: new Date().toISOString(),
        error_message: null,
        stack_trace: null
      });
    });
    
    this.task = (await this.storage.getTask(this.task.id))!;
  }

  async markFailed(error: Error | string): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    const canRetryNow = this.canRetry();
    const newStatus = canRetryNow ? TaskStatus.WAITING_RETRY : TaskStatus.FAILED;
    
    await this.storage.transaction(async () => {
      await this.storage.updateTask(this.task.id, {
        status: newStatus,
        error_data: JSON.stringify({ 
          message: errorMessage, 
          stack: errorStack,
          failed_at: new Date().toISOString()
        })
      });
      
      await this.storage.addHistoryRecord({
        task_id: this.task.id,
        event_type: canRetryNow ? TaskEventType.RETRY : TaskEventType.FAILED,
        event_data: JSON.stringify({ error: errorMessage, can_retry: canRetryNow }),
        task_snapshot: JSON.stringify(this.task),
        worker_id: this.task.worker_id,
        timestamp: new Date().toISOString(),
        error_message: errorMessage,
        stack_trace: errorStack || null
      });
    });
    
    this.task = (await this.storage.getTask(this.task.id))!;
  }

  async updateStep(step: string, completedSteps?: string[], progress?: number): Promise<void> {
    const updates: UpdateTaskInput = { current_step: step };
    if (completedSteps) updates.completed_steps = completedSteps;
    if (progress !== undefined) updates.progress = progress;
    
    await this.storage.updateTask(this.task.id, updates);
    
    await this.storage.addHistoryRecord({
      task_id: this.task.id,
      event_type: TaskEventType.STEPPED,
      event_data: JSON.stringify({ step, progress: progress ?? this.task.progress }),
      task_snapshot: JSON.stringify(this.task),
      worker_id: this.task.worker_id,
      timestamp: new Date().toISOString(),
      error_message: null,
      stack_trace: null
    });
    
    this.task = (await this.storage.getTask(this.task.id))!;
  }

  async cancel(reason?: string): Promise<void> {
    if (this.isTerminal()) {
      throw new Error(`Cannot cancel terminal task: ${this.task.status}`);
    }
    
    await this.storage.transaction(async () => {
      await this.storage.updateTask(this.task.id, {
        status: TaskStatus.CANCELLED,
        completed_at: new Date().toISOString()
      });
      
      await this.storage.addHistoryRecord({
        task_id: this.task.id,
        event_type: TaskEventType.CANCELLED,
        event_data: JSON.stringify({ reason }),
        task_snapshot: JSON.stringify(this.task),
        worker_id: this.task.worker_id,
        timestamp: new Date().toISOString(),
        error_message: null,
        stack_trace: null
      });
    });
    
    this.task = (await this.storage.getTask(this.task.id))!;
  }

  async updateProgress(progress: number): Promise<void> {
    await this.storage.updateTask(this.task.id, { 
      progress: Math.min(100, Math.max(0, progress)) 
    });
    this.task = (await this.storage.getTask(this.task.id))!;
  }

  async addCompletedStep(step: string, progress?: number): Promise<void> {
    const steps = [...this.task.completed_steps, step];
    const updates: UpdateTaskInput = { completed_steps: steps };
    if (progress !== undefined) updates.progress = progress;
    
    await this.storage.updateTask(this.task.id, updates);
    
    await this.storage.addHistoryRecord({
      task_id: this.task.id,
      event_type: TaskEventType.STEPPED,
      event_data: JSON.stringify({ completed_step: step, progress }),
      task_snapshot: JSON.stringify(this.task),
      worker_id: this.task.worker_id,
      timestamp: new Date().toISOString(),
      error_message: null,
      stack_trace: null
    });
    
    this.task = (await this.storage.getTask(this.task.id))!;
  }
}

export class TaskRecordFactory {
  constructor(private storage: StorageAdapter) {}

  async create(input: CreateTaskInput): Promise<TaskRecordEntity> {
    if (input.idempotency_key) {
      const existingTaskId = await this.storage.checkIdempotencyKey(input.idempotency_key);
      if (existingTaskId) {
        const existingTask = await this.storage.getTask(existingTaskId);
        if (existingTask) {
          return new TaskRecordEntity(this.storage, existingTask);
        }
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    
    const task: Partial<TaskRecord> = {
      id,
      name: input.name,
      type: input.type || 'default',
      status: TaskStatus.PENDING,
      priority: input.priority || 0,
      input_data: input.input_data ? JSON.stringify(input.input_data) : null,
      attempt_count: 0,
      max_attempts: input.max_attempts || 3,
      completed_steps: [],
      created_at: now,
      updated_at: now,
      scheduled_at: input.scheduled_at || null,
      lease_expires_at: null,
      worker_id: null,
      progress: 0,
      metadata: input.metadata || {}
    };

    const created = await this.storage.createTask(task);

    await this.storage.addHistoryRecord({
      task_id: id,
      event_type: TaskEventType.CREATED,
      event_data: JSON.stringify({ name: input.name, type: task.type }),
      task_snapshot: JSON.stringify(created),
      worker_id: null,
      timestamp: now,
      error_message: null,
      stack_trace: null
    });

    if (input.idempotency_key) {
      await this.storage.setIdempotencyKey(
        input.idempotency_key,
        id,
        input.scheduled_at || undefined
      );
    }

    return new TaskRecordEntity(this.storage, created);
  }

  async load(id: string): Promise<TaskRecordEntity | null> {
    const task = await this.storage.getTask(id);
    if (!task) return null;
    return new TaskRecordEntity(this.storage, task);
  }

  async getHistory(taskId: string, limit = 100): Promise<TaskHistoryRecord[]> {
    return this.storage.getTaskHistory(taskId, limit);
  }
}
