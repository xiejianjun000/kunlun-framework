/**
 * EvolutionSystem TaskLedger Integration Guide
 * 如何将TaskLedger集成到EvolutionSystem
 */

// ============================================================
// 方式1: 在EvolutionSystem中导入TaskLedger
// ============================================================

import { TaskLedger, type TaskRecordEntity, type CreateTaskInput } from './src/core/task-ledger/TaskLedger';

/**
 * 扩展EvolutionSystem以支持TaskLedger
 */
export class EvolutionSystemWithTaskLedger {
  private taskLedger: TaskLedger | null = null;
  private workerId: string;

  constructor(workerId: string = 'evolution-worker') {
    this.workerId = workerId;
  }

  /**
   * 初始化TaskLedger
   */
  async initializeTaskLedger(dbPath: string = './evolution-tasks.db'): Promise<void> {
    this.taskLedger = new TaskLedger({
      dbPath,
      workerId: this.workerId,
      leaseDurationMs: 60000,      // 1 minute lease
      heartbeatIntervalMs: 15000,  // Heartbeat every 15s
      staleThresholdMs: 120000,    // 2 minutes before stale
      autoRecovery: true
    });

    await this.taskLedger.initialize();
    console.log('[EvolutionSystem] TaskLedger initialized');
  }

  /**
   * 创建进化任务
   */
  async createEvolutionTask(
    name: string,
    evolutionType: string,
    inputData: any
  ): Promise<TaskRecordEntity> {
    if (!this.taskLedger) {
      throw new Error('TaskLedger not initialized');
    }

    return this.taskLedger.createTask({
      name,
      type: evolutionType,
      input_data: inputData,
      max_attempts: 3,
      idempotency_key: `evo-${evolutionType}-${Date.now()}`
    });
  }

  /**
   * 启动进化任务处理
   */
  async startEvolutionProcessing(
    processor: (task: TaskRecordEntity) => Promise<void>
  ): Promise<void> {
    if (!this.taskLedger) {
      throw new Error('TaskLedger not initialized');
    }

    this.taskLedger.startPolling(async (task) => {
      console.log(`[EvolutionSystem] Processing task: ${task.name}`);
      
      try {
        await processor(task);
      } catch (error) {
        console.error(`[EvolutionSystem] Task failed: ${error}`);
        await task.markFailed(error as Error);
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * 获取进化统计
   */
  async getEvolutionStats(): Promise<any> {
    if (!this.taskLedger) return null;
    return this.taskLedger.getStatistics();
  }

  /**
   * 关闭系统
   */
  async shutdown(): Promise<void> {
    if (this.taskLedger) {
      await this.taskLedger.shutdown();
    }
  }
}

// ============================================================
// 使用示例
// ============================================================

/**
 * 示例：完整的进化任务处理流程
 */
async function example() {
  const system = new EvolutionSystemWithTaskLedger('evo-worker-1');
  
  // 1. 初始化
  await system.initializeTaskLedger('./data/evolution-tasks.db');
  
  // 2. 创建进化任务
  const task = await system.createEvolutionTask(
    'skill-optimization-001',
    'skill_optimization',
    { skillId: 'coding-skill', metrics: { accuracy: 0.7 } }
  );
  console.log('Created task:', task.id);
  
  // 3. 启动处理
  await system.startEvolutionProcessing(async (evoTask) => {
    const input = evoTask.getInputData();
    console.log('Processing evolution:', input);
    
    // 模拟进化步骤
    await evoTask.updateProgress(25);
    await evoTask.addCompletedStep('analyze');
    
    await evoTask.updateProgress(50);
    await evoTask.addCompletedStep('optimize');
    
    await evoTask.updateProgress(75);
    await evoTask.addCompletedStep('validate');
    
    await evoTask.updateProgress(100);
    await evoTask.markCompleted({ evolved: true });
  });
  
  // 4. 检查统计
  const stats = await system.getEvolutionStats();
  console.log('Evolution stats:', stats);
  
  // 5. 关闭
  await system.shutdown();
}

// ============================================================
// 方式2: 使用TaskLedger管理EvolutionSystem的任务状态
// ============================================================

import { TaskStatus } from './src/core/task-ledger/types';

/**
 * 任务状态与进化状态的映射
 */
const TASK_STATUS_TO_EVOLUTION_STATE: Record<string, string> = {
  [TaskStatus.PENDING]: 'queued',
  [TaskStatus.RUNNING]: 'executing',
  [TaskStatus.COMPLETED]: 'completed',
  [TaskStatus.FAILED]: 'failed',
  [TaskStatus.WAITING_RETRY]: 'retrying'
};

/**
 * 持久化进化任务状态
 */
export class PersistentEvolutionTask {
  constructor(
    private taskEntity: TaskRecordEntity
  ) {}

  get id(): string { return this.taskEntity.id; }
  get name(): string { return this.taskEntity.name; }
  get state(): string { 
    return TASK_STATUS_TO_EVOLUTION_STATE[this.taskEntity.status] || 'unknown';
  }
  get inputData(): any { return this.taskEntity.getInputData(); }
  get outputData(): any { return this.taskEntity.getOutputData(); }
  get progress(): number { return this.taskEntity.getProgress(); }
  get attemptCount(): number { return this.taskEntity.attemptCount; }
  get canRetry(): boolean { return this.taskEntity.canRetry(); }

  async markExecuting(): Promise<void> {
    await this.taskEntity.markStarted();
  }

  async markCompleted(output: any): Promise<void> {
    await this.taskEntity.markCompleted(output);
  }

  async markFailed(error: Error): Promise<void> {
    await this.taskEntity.markFailed(error);
  }

  async updateProgress(progress: number, step?: string): Promise<void> {
    if (step) {
      await this.taskEntity.addCompletedStep(step, progress);
    } else {
      await this.taskEntity.updateProgress(progress);
    }
  }
}

export { example };
