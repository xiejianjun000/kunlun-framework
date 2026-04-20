"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingTracker = void 0;
/**
 * 计费追踪器
 * 追踪每次执行的计费记录
 */
class BillingTracker {
    constructor() {
        this.records = [];
    }
    /**
     * 添加计费记录
     */
    addRecord(jobId, executionId, amount, item) {
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
    getSummary(startTime, endTime) {
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
    getAllRecords() {
        return [...this.records];
    }
    /**
     * 按任务ID获取记录
     */
    getRecordsByJob(jobId) {
        return this.records.filter(r => r.jobId === jobId);
    }
    /**
     * 清空所有记录
     */
    clear() {
        this.records = [];
    }
    /**
     * 获取总金额
     */
    getTotalAmount() {
        return this.records.reduce((sum, r) => sum + r.amount, 0);
    }
}
exports.BillingTracker = BillingTracker;
