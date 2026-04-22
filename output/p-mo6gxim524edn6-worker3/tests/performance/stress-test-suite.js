"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StressTestRunner = void 0;
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../../src/utils/logger");
const logger = new logger_1.Logger('StressTest');
class StressTestRunner {
    config;
    results = [];
    constructor(config) {
        this.config = config;
    }
    async runTest(testName, testFn) {
        logger.info(`Starting stress test: ${testName}`);
        logger.info(`Config: concurrency=${this.config.concurrency}, iterations=${this.config.iterations}`);
        const warmup = this.config.warmupIterations ?? Math.min(100, Math.floor(this.config.iterations * 0.1));
        logger.info(`Warming up with ${warmup} iterations...`);
        for (let i = 0; i < warmup; i++) {
            await testFn(i).catch(() => { });
        }
        const memoryBefore = process.memoryUsage();
        const memoryBeforeMB = memoryBefore.heapUsed / 1024 / 1024;
        const startTime = perf_hooks_1.performance.now();
        const latencies = [];
        const errors = [];
        let completed = 0;
        const workers = [];
        const iterationsPerWorker = Math.ceil(this.config.iterations / this.config.concurrency);
        for (let w = 0; w < this.config.concurrency; w++) {
            const worker = (async () => {
                for (let i = 0; i < iterationsPerWorker; i++) {
                    const globalIndex = w * iterationsPerWorker + i;
                    if (globalIndex >= this.config.iterations)
                        break;
                    const opStart = perf_hooks_1.performance.now();
                    try {
                        await testFn(globalIndex);
                        latencies.push(perf_hooks_1.performance.now() - opStart);
                    }
                    catch (err) {
                        errors.push(`Iteration ${globalIndex}: ${err instanceof Error ? err.message : String(err)}`);
                    }
                    completed++;
                    if (completed % 1000 === 0) {
                        const progress = ((completed / this.config.iterations) * 100).toFixed(1);
                        logger.debug(`Progress: ${progress}% (${completed}/${this.config.iterations})`);
                    }
                }
            })();
            workers.push(worker);
        }
        await Promise.all(workers);
        const totalTimeMs = perf_hooks_1.performance.now() - startTime;
        const memoryAfter = process.memoryUsage();
        const memoryAfterMB = memoryAfter.heapUsed / 1024 / 1024;
        latencies.sort((a, b) => a - b);
        const successCount = latencies.length;
        const successRate = successCount / this.config.iterations;
        const result = {
            testName,
            totalOps: this.config.iterations,
            totalTimeMs,
            opsPerSecond: this.config.iterations / (totalTimeMs / 1000),
            avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            p50LatencyMs: this.percentile(latencies, 50),
            p95LatencyMs: this.percentile(latencies, 95),
            p99LatencyMs: this.percentile(latencies, 99),
            minLatencyMs: latencies[0] ?? 0,
            maxLatencyMs: latencies[latencies.length - 1] ?? 0,
            successRate,
            memoryBeforeMB,
            memoryAfterMB,
            memoryDeltaMB: memoryAfterMB - memoryBeforeMB,
            errors: errors.slice(0, 50),
        };
        this.results.push(result);
        this.printResult(result);
        return result;
    }
    percentile(sortedArray, p) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.floor((p / 100) * (sortedArray.length - 1));
        return sortedArray[index];
    }
    printResult(result) {
        logger.info(`=== ${result.testName} - 测试完成 ===`);
        logger.info(`总操作数: ${result.totalOps}`);
        logger.info(`总耗时: ${result.totalTimeMs.toFixed(2)}ms`);
        logger.info(`吞吐量: ${result.opsPerSecond.toFixed(2)} ops/sec`);
        logger.info(`成功率: ${(result.successRate * 100).toFixed(2)}%`);
        logger.info(`平均延迟: ${result.avgLatencyMs.toFixed(2)}ms`);
        logger.info(`P50 延迟: ${result.p50LatencyMs.toFixed(2)}ms`);
        logger.info(`P95 延迟: ${result.p95LatencyMs.toFixed(2)}ms`);
        logger.info(`P99 延迟: ${result.p99LatencyMs.toFixed(2)}ms`);
        logger.info(`内存变化: ${result.memoryBeforeMB.toFixed(1)}MB -> ${result.memoryAfterMB.toFixed(1)}MB (+${result.memoryDeltaMB.toFixed(1)}MB)`);
        if (result.errors.length > 0) {
            logger.warn(`错误数量: ${result.errors.length}`);
        }
        logger.info('');
    }
    getResults() {
        return this.results;
    }
    printSummary() {
        logger.info('');
        logger.info('========================================');
        logger.info('       📊 压力测试汇总报告');
        logger.info('========================================');
        logger.info('');
        for (const result of this.results) {
            logger.info(`📌 ${result.testName}`);
            logger.info(`   吞吐量: ${result.opsPerSecond.toFixed(2)} ops/sec`);
            logger.info(`   P99 延迟: ${result.p99LatencyMs.toFixed(2)}ms`);
            logger.info(`   成功率: ${(result.successRate * 100).toFixed(2)}%`);
            logger.info(`   内存增长: +${result.memoryDeltaMB.toFixed(1)}MB`);
            logger.info('');
        }
        const allSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;
        const avgMemoryGrowth = this.results.reduce((sum, r) => sum + r.memoryDeltaMB, 0) / this.results.length;
        logger.info('========================================');
        logger.info(`总体成功率: ${(allSuccessRate * 100).toFixed(2)}%`);
        logger.info(`平均内存增长: ${avgMemoryGrowth.toFixed(1)}MB`);
        logger.info(`整体评分: ${this.calculateScore()}/100`);
        logger.info('========================================');
    }
    calculateScore() {
        let score = 0;
        for (const result of this.results) {
            score += Math.min(result.successRate * 40, 40);
            const memoryScore = result.memoryDeltaMB < 10 ? 30 : Math.max(0, 30 - (result.memoryDeltaMB - 10) * 0.5);
            score += memoryScore;
            const throughputScore = Math.min(result.opsPerSecond / 100, 30);
            score += throughputScore;
        }
        return Math.round(score / this.results.length);
    }
}
exports.StressTestRunner = StressTestRunner;
exports.default = StressTestRunner;
//# sourceMappingURL=stress-test-suite.js.map