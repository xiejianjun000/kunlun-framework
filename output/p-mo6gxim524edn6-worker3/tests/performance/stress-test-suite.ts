/**
 * OpenTaiji 全模块压力测试套件
 * 测试范围：
 * 1. LLM 适配器 - 大量并发请求
 * 2. 确定性系统 (Determinism) - 大量文本验证
 * 3. 任务调度器 - 大量并发任务
 * 4. 整体性能指标
 */

import { performance } from 'perf_hooks';
import { Logger } from '../../src/utils/logger';

const logger = new Logger('StressTest');

/**
 * 压力测试结果统计
 */
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

/**
 * 测试配置
 */
export interface StressTestConfig {
  concurrency: number;
  iterations: number;
  timeoutMs?: number;
  warmupIterations?: number;
}

/**
 * 基准测试运行器
 */
export class StressTestRunner {
  private results: StressTestResult[] = [];

  constructor(private config: StressTestConfig) {}

  /**
   * 运行单个测试
   */
  async runTest(
    testName: string,
    testFn: (index: number) => Promise<unknown>
  ): Promise<StressTestResult> {
    logger.info(`Starting stress test: ${testName}`);
    logger.info(`Config: concurrency=${this.config.concurrency}, iterations=${this.config.iterations}`);

    // 预热
    const warmup = this.config.warmupIterations ?? Math.min(100, Math.floor(this.config.iterations * 0.1));
    logger.info(`Warming up with ${warmup} iterations...`);
    for (let i = 0; i < warmup; i++) {
      await testFn(i).catch(() => {});
    }

    // 记录初始内存
    const memoryBefore = process.memoryUsage();
    const memoryBeforeMB = memoryBefore.heapUsed / 1024 / 1024;

    // 记录开始时间
    const startTime = performance.now();
    const latencies: number[] = [];
    const errors: string[] = [];
    let completed = 0;

    // 并发执行任务
    const workers: Promise<void>[] = [];
    const iterationsPerWorker = Math.ceil(this.config.iterations / this.config.concurrency);

    for (let w = 0; w < this.config.concurrency; w++) {
      const worker = (async () => {
        for (let i = 0; i < iterationsPerWorker; i++) {
          const globalIndex = w * iterationsPerWorker + i;
          if (globalIndex >= this.config.iterations) break;

          const opStart = performance.now();
          try {
            await testFn(globalIndex);
            latencies.push(performance.now() - opStart);
          } catch (err) {
            errors.push(`Iteration ${globalIndex}: ${err instanceof Error ? err.message : String(err)}`);
          }
          completed++;

          // 进度报告
          if (completed % 1000 === 0) {
            const progress = ((completed / this.config.iterations) * 100).toFixed(1);
            logger.debug(`Progress: ${progress}% (${completed}/${this.config.iterations})`);
          }
        }
      })();
      workers.push(worker);
    }

    await Promise.all(workers);

    const totalTimeMs = performance.now() - startTime;

    // 记录结束内存
    const memoryAfter = process.memoryUsage();
    const memoryAfterMB = memoryAfter.heapUsed / 1024 / 1024;

    // 计算统计数据
    latencies.sort((a, b) => a - b);
    const successCount = latencies.length;
    const successRate = successCount / this.config.iterations;

    const result: StressTestResult = {
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
      errors: errors.slice(0, 50), // 只保留前50个错误
    };

    this.results.push(result);
    this.printResult(result);

    return result;
  }

  /**
   * 计算百分位数
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.floor((p / 100) * (sortedArray.length - 1));
    return sortedArray[index];
  }

  /**
   * 打印测试结果
   */
  private printResult(result: StressTestResult): void {
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

  /**
   * 获取所有结果
   */
  getResults(): StressTestResult[] {
    return this.results;
  }

  /**
   * 打印汇总报告
   */
  printSummary(): void {
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

    // 总体评分
    const allSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;
    const avgMemoryGrowth = this.results.reduce((sum, r) => sum + r.memoryDeltaMB, 0) / this.results.length;

    logger.info('========================================');
    logger.info(`总体成功率: ${(allSuccessRate * 100).toFixed(2)}%`);
    logger.info(`平均内存增长: ${avgMemoryGrowth.toFixed(1)}MB`);
    logger.info(`整体评分: ${this.calculateScore()}/100`);
    logger.info('========================================');
  }

  /**
   * 计算整体评分
   */
  private calculateScore(): number {
    let score = 0;
    for (const result of this.results) {
      // 成功率占 40%
      score += Math.min(result.successRate * 40, 40);
      // 内存增长占 30%
      const memoryScore = result.memoryDeltaMB < 10 ? 30 : Math.max(0, 30 - (result.memoryDeltaMB - 10) * 0.5);
      score += memoryScore;
      // 吞吐量占 30%（按绝对值相对评分）
      const throughputScore = Math.min(result.opsPerSecond / 100, 30);
      score += throughputScore;
    }
    return Math.round(score / this.results.length);
  }
}

export default StressTestRunner;
