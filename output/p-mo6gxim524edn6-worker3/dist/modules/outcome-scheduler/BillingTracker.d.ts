import { BillingRecord } from './interfaces/IOutcomeScheduler';
/**
 * 计费追踪器
 * 追踪每次执行的计费记录
 */
export declare class BillingTracker {
    private records;
    /**
     * 添加计费记录
     */
    addRecord(jobId: string, executionId: string, amount: number, item: string): void;
    /**
     * 获取时间范围内的计费汇总
     */
    getSummary(startTime?: number, endTime?: number): {
        totalAmount: number;
        records: BillingRecord[];
    };
    /**
     * 获取所有记录
     */
    getAllRecords(): BillingRecord[];
    /**
     * 按任务ID获取记录
     */
    getRecordsByJob(jobId: string): BillingRecord[];
    /**
     * 清空所有记录
     */
    clear(): void;
    /**
     * 获取总金额
     */
    getTotalAmount(): number;
}
