import { ExecutionRecord, ExecutionResult } from './interfaces/IOutcomeScheduler';

/**
 * 执行历史记录
 * 持久化保存每次执行结果
 */
export class ExecutionHistory {
  private records: Map<string, ExecutionRecord[]> = new Map();

  /**
   * 添加执行记录
   */
  addRecord(jobId: string, executionId: string, result: ExecutionResult): void {
    const record: ExecutionRecord = {
      jobId,
      executionId,
      result,
      createdAt: Date.now()
    };

    if (!this.records.has(jobId)) {
      this.records.set(jobId, []);
    }
    this.records.get(jobId)!.push(record);
  }

  /**
   * 获取任务的执行历史
   */
  getHistory(jobId: string): ExecutionRecord[] {
    return this.records.get(jobId) || [];
  }

  /**
   * 获取所有任务的所有执行记录
   */
  getAllHistory(): ExecutionRecord[] {
    const all: ExecutionRecord[] = [];
    for (const [, records] of this.records) {
      all.push(...records);
    }
    return all;
  }

  /**
   * 获取最近N条记录
   */
  getRecent(count: number): ExecutionRecord[] {
    const all = this.getAllHistory();
    all.sort((a, b) => b.createdAt - a.createdAt);
    return all.slice(0, count);
  }

  /**
   * 清空任务历史
   */
  clearJobHistory(jobId: string): boolean {
    if (!this.records.has(jobId)) {
      return false;
    }
    this.records.delete(jobId);
    return true;
  }

  /**
   * 清空所有历史
   */
  clearAll(): void {
    this.records.clear();
  }

  /**
   * 获取总执行次数
   */
  getTotalExecutions(): number {
    let total = 0;
    for (const [, records] of this.records) {
      total += records.length;
    }
    return total;
  }

  /**
   * 获取成功率
   */
  getSuccessRate(jobId?: string): number {
    let records: ExecutionRecord[];
    if (jobId) {
      records = this.getHistory(jobId);
    } else {
      records = this.getAllHistory();
    }

    if (records.length === 0) {
      return 0;
    }

    const successCount = records.filter(r => r.result.success).length;
    return successCount / records.length;
  }
}
