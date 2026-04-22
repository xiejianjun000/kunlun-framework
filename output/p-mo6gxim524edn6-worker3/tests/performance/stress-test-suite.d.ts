export interface StressTestResult {
    testName: string;
    totalOps: number;
    totalTimeMs: number;
    opsPerSecond: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    successRate: number;
    memoryBeforeMB: number;
    memoryAfterMB: number;
    memoryDeltaMB: number;
    errors: string[];
}
export interface StressTestConfig {
    concurrency: number;
    iterations: number;
    timeoutMs?: number;
    warmupIterations?: number;
}
export declare class StressTestRunner {
    private config;
    private results;
    constructor(config: StressTestConfig);
    runTest(testName: string, testFn: (index: number) => Promise<unknown>): Promise<StressTestResult>;
    private percentile;
    private printResult;
    getResults(): StressTestResult[];
    printSummary(): void;
    private calculateScore;
}
export default StressTestRunner;
//# sourceMappingURL=stress-test-suite.d.ts.map