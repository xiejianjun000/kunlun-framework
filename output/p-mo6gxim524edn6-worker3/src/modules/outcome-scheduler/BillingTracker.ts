import { BillingRecord } from './interfaces/IOutcomeScheduler';

/**
 * 计费追踪器
 * 追踪每次执行的计费记录
 */
export class BillingTracker {
  private records: BillingRecord[] = [];

  /**
   * 添加计费记录
   */
  addRecord(jobId: string, executionId: string, amount: number, item: string): void {
    this.records.push({
      jobId,
      executionId,
      amount,
      timestamp: Date.now(),
      item
    });
  }

  /**
   * 获取时间范围内的计费汇总
   */
  getSummary(startTime?: number, endTime?: number): {
    totalAmount: number;
    records: BillingRecord[];
  } {
    let filtered = this.records;
    
    if (startTime !== undefined) {
      filtered = filtered.filter(r => r.timestamp >= startTime);
    }
    if (endTime !== undefined) {
      filtered = filtered.filter(r => r.timestamp <= endTime);
    }

    const totalAmount = filtered.reduce((sum, r) => sum + r.amount, 0);
    return {
      totalAmount,
      records: filtered
    };
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): BillingRecord[] {
    return [...this.records];
  }

  /**
   * 按任务ID获取记录
   */
  getRecordsByJob(jobId: string): BillingRecord[] {
    return this.records.filter(r => r.jobId === jobId);
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.records = [];
  }

  /**
   * 获取总金额
   */
  getTotalAmount(): number {
    return this.records.reduce((sum, r) => sum + r.amount, 0);
  }
}
