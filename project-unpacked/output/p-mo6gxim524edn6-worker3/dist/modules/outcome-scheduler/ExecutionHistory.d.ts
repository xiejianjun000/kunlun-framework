import { ExecutionRecord, ExecutionResult } from './interfaces/IOutcomeScheduler';
/**
 * 执行历史记录
 * 持久化保存每次执行结果
 */
export declare class ExecutionHistory {
    private records;
    /**
     * 添加执行记录
     */
    addRecord(jobId: string, executionId: string, result: ExecutionResult): void;
    /**
     * 获取任务的执行历史
     */
    getHistory(jobId: string): ExecutionRecord[];
    /**
     * 获取所有任务的所有执行记录
     */
    getAllHistory(): ExecutionRecord[];
    /**
     * 获取最近N条记录
     */
    getRecent(count: number): ExecutionRecord[];
    /**
     * 清空任务历史
     */
    clearJobHistory(jobId: string): boolean;
    /**
     * 清空所有历史
     */
    clearAll(): void;
    /**
     * 获取总执行次数
     */
    getTotalExecutions(): number;
    /**
     * 获取成功率
     */
    getSuccessRate(jobId?: string): number;
}
