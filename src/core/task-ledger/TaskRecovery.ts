/**
 * TaskRecovery - Stale task reclamation and failure recovery
 * Part of TaskLedger durable task system
 * Inspired by reflow-ts stale-run reclamation pattern
 */

import type {
  StorageAdapter,
  TaskRecord,
  StaleTaskRecord,
  RecoveryOptions,
  RecoverySummary,
  ClaimResult,
  TaskEventType
} from './types';
import { TaskStatus } from './types';

export class TaskRecovery {
  private storage: StorageAdapter;
  private workerId: string;
  private options: Required<RecoveryOptions>;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    storage: StorageAdapter,
    workerId: string,
    options: RecoveryOptions = {}
  ) {
    this.storage = storage;
    this.workerId = workerId;
    this.options = {
      max_stale_age_ms: options.max_stale_age_ms ?? 60000,      // 1 minute default
      lease_duration_ms: options.lease_duration_ms ?? 30000,    // 30 seconds default
      heartbeat_interval_ms: options.heartbeat_interval_ms ?? 10000, // 10 seconds
      auto_reclaim: options.auto_reclaim ?? true
    };
  }

  /**
   * Start automatic recovery monitoring
   */
  start(): void {
    if (this.heartbeatInterval) return;

    // Periodic stale task detection and reclamation
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.detectAndReclaimStaleTasks();
      } catch (error) {
        console.error('[TaskRecovery] Cleanup error:', error);
      }
    }, this.options.max_stale_age_ms);
  }

  /**
   * Stop automatic recovery monitoring
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Claim a task for execution (with lease)
   */
  async claimTask(taskId: string): Promise<ClaimResult> {
    const task = await this.storage.getTask(taskId);
    if (!task) {
      return { claimed: false, task: null, reason: 'Task not found' };
    }

    // Check if task is claimable
    if (task.status !== 'pending' && task.status !== 'waiting_retry') {
      return { claimed: false, task, reason: `Task in non-claimable status: ${task.status}` };
    }

    // Check if task is already claimed by another worker
    if (task.worker_id && task.worker_id !== this.workerId) {
      const now = Date.now();
      const leaseExpires = task.lease_expires_at 
        ? new Date(task.lease_expires_at).getTime() 
        : 0;
      
      if (now < leaseExpires) {
        return { claimed: false, task, reason: 'Task claimed by another worker' };
      }
    }

    const leaseExpires = new Date(
      Date.now() + this.options.lease_duration_ms
    ).toISOString();

    const claimed = await this.storage.claimTask(taskId, this.workerId, leaseExpires);
    if (!claimed) {
      return { claimed: false, task, reason: 'Failed to claim task' };
    }

    await this.storage.addHistoryRecord({
      task_id: taskId,
      event_type: 'claimed' as TaskEventType,
      event_data: JSON.stringify({ worker_id: this.workerId, lease_expires: leaseExpires }),
      task_snapshot: JSON.stringify(task),
      worker_id: this.workerId,
      timestamp: new Date().toISOString(),
      error_message: null,
      stack_trace: null
    });

    const updatedTask = await this.storage.getTask(taskId);
    return { claimed: true, task: updatedTask! };
  }

  /**
   * Release a claimed task
   */
  async releaseTask(taskId: string): Promise<boolean> {
    const released = await this.storage.releaseTask(taskId);
    if (released) {
      await this.storage.addHistoryRecord({
        task_id: taskId,
        event_type: 'released' as TaskEventType,
        event_data: JSON.stringify({ worker_id: this.workerId }),
        task_snapshot: null,
        worker_id: this.workerId,
        timestamp: new Date().toISOString(),
        error_message: null,
        stack_trace: null
      });
    }
    return released;
  }

  /**
   * Send heartbeat to extend lease
   */
  async heartbeat(taskId: string): Promise<boolean> {
    const task = await this.storage.getTask(taskId);
    if (!task || task.worker_id !== this.workerId) {
      return false;
    }

    const leaseExpires = new Date(
      Date.now() + this.options.lease_duration_ms
    ).toISOString();

    const success = await this.storage.heartbeatTask(taskId, leaseExpires);
    if (success) {
      await this.storage.addHistoryRecord({
        task_id: taskId,
        event_type: 'heartbeat' as TaskEventType,
        event_data: JSON.stringify({ lease_expires: leaseExpires }),
        task_snapshot: null,
        worker_id: this.workerId,
        timestamp: new Date().toISOString(),
        error_message: null,
        stack_trace: null
      });
    }
    return success;
  }

  /**
   * Start heartbeat interval for a task
   */
  startHeartbeat(taskId: string): void {
    this.stopHeartbeat(taskId);
    
    // Heartbeat stored per task in a Map would be needed for multiple tasks
    // For simplicity, this is a single-task version
    const key = `heartbeat_${taskId}`;
    (this as any)[key] = setInterval(async () => {
      await this.heartbeat(taskId);
    }, this.options.heartbeat_interval_ms);
  }

  /**
   * Stop heartbeat for a task
   */
  stopHeartbeat(taskId: string): void {
    const key = `heartbeat_${taskId}`;
    const interval = (this as any)[key];
    if (interval) {
      clearInterval(interval);
      delete (this as any)[key];
    }
  }

  /**
   * Detect and reclaim stale tasks
   */
  async detectAndReclaimStaleTasks(): Promise<RecoverySummary> {
    const summary: RecoverySummary = {
      stale_tasks_found: 0,
      tasks_reclaimed: 0,
      errors: []
    };

    try {
      // Find stale tasks
      const staleTasks = await this.storage.getStaleTasks(this.options.max_stale_age_ms);
      summary.stale_tasks_found = staleTasks.length;

      for (const staleTask of staleTasks) {
        try {
          // Record stale detection
          await this.recordStaleDetection(staleTask);
          
          // Reclaim the task
          const reclaimed = await this.storage.reclaimTask(staleTask.task_id);
          if (reclaimed) {
            summary.tasks_reclaimed++;
            
            await this.storage.addHistoryRecord({
              task_id: staleTask.task_id,
              event_type: 'reclaimed' as TaskEventType,
              event_data: JSON.stringify({
                detected_at: staleTask.detected_at,
                last_heartbeat: staleTask.last_heartbeat,
                reason: staleTask.reason
              }),
              task_snapshot: null,
              worker_id: null,
              timestamp: new Date().toISOString(),
              error_message: null,
              stack_trace: null
            });
          }
        } catch (error) {
          summary.errors.push(`Failed to reclaim task ${staleTask.task_id}: ${error}`);
        }
      }
    } catch (error) {
      summary.errors.push(`Detection failed: ${error}`);
    }

    return summary;
  }

  /**
   * Record stale task detection
   */
  private async recordStaleDetection(staleTask: StaleTaskRecord): Promise<void> {
    // This would be implemented to record in stale_tasks table
    // For now, just log
    console.log(`[TaskRecovery] Detected stale task: ${staleTask.task_id}`, staleTask);
  }

  /**
   * Get the next available task to claim
   */
  async getNextAvailableTask(): Promise<{ task: TaskRecord | null; reclaimed: boolean }> {
    // First try to find waiting_retry tasks
    let tasks = await this.storage.queryTasks({
      status: TaskStatus.WAITING_RETRY,
      limit: 1,
      order_by: 'created_at',
      order_dir: 'asc'
    });

    if (tasks.length > 0) {
      return { task: tasks[0], reclaimed: false };
    }

    // Then try pending tasks
    tasks = await this.storage.queryTasks({
      status: TaskStatus.PENDING,
      limit: 1,
      order_by: 'priority',
      order_dir: 'desc'
    });

    if (tasks.length > 0) {
      return { task: tasks[0], reclaimed: false };
    }

    // Try to reclaim stale tasks
    if (this.options.auto_reclaim) {
      const summary = await this.detectAndReclaimStaleTasks();
      if (summary.tasks_reclaimed > 0) {
        // Query again after reclamation
        tasks = await this.storage.queryTasks({
          status: TaskStatus.PENDING,
          limit: 1,
          order_by: 'created_at',
          order_dir: 'asc'
        });
        
        if (tasks.length > 0) {
          return { task: tasks[0], reclaimed: true };
        }
      }
    }

    return { task: null, reclaimed: false };
  }

  /**
   * Calculate lease expiration time
   */
  getLeaseExpiresAt(): string {
    return new Date(Date.now() + this.options.lease_duration_ms).toISOString();
  }
}

/**
 * Recovery utilities
 */
export const RecoveryUtils = {
  /**
   * Check if a task is considered stale
   */
  isStale(task: TaskRecord, maxStaleAgeMs: number): boolean {
    if (!task.lease_expires_at) return false;
    return Date.now() > new Date(task.lease_expires_at).getTime() + maxStaleAgeMs;
  },

  /**
   * Calculate remaining lease time in ms
   */
  getRemainingLeaseMs(task: TaskRecord): number {
    if (!task.lease_expires_at) return 0;
    const expiresAt = new Date(task.lease_expires_at).getTime();
    return Math.max(0, expiresAt - Date.now());
  },

  /**
   * Format lease info for display
   */
  formatLeaseInfo(task: TaskRecord): string {
    if (!task.worker_id || !task.lease_expires_at) {
      return 'No active lease';
    }
    const remaining = this.getRemainingLeaseMs(task);
    return `Worker: ${task.worker_id}, Lease: ${remaining}ms remaining`;
  }
};
