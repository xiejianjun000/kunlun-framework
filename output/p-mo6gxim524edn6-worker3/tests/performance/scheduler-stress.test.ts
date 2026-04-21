/**
 * 任务调度器压力测试
 * 测试任务添加、移除、更新等核心操作的性能
 */

import StressTestRunner from './stress-test-suite';
import { OutcomeScheduler } from '../../src/modules/outcome-scheduler';

// 创建标准的 job 配置 - 禁用自动调度以加快压力测试
function createJob(id: string, options?: { enabled?: boolean }) {
  return {
    id,
    name: `Job ${id}`,
    template: 'Test template',
    channels: [{ type: 'feishu' as const, name: 'feishu', destination: 'test', config: {} }],
    needRender: false,
    schedule: {
      type: 'every' as const,
      expression: '60',
      enabled: options?.enabled ?? false
    }
  };
}

describe('任务调度器压力测试', () => {
  jest.setTimeout(120000);

  it('批量添加任务性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 20,
      iterations: 1000,
      timeoutMs: 60000,
    });

    await runner.runTest('批量添加任务', async (i) => {
      const scheduler = new OutcomeScheduler();
      // 每个实例添加 50 个任务
      for (let j = 0; j < 50; j++) {
        scheduler.addJob(createJob(`job-${i}-${j}`));
      }
      expect(scheduler.getAllJobs()).toHaveLength(50);
    });
  });

  it('任务添加与移除并发性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 50,
      iterations: 2000,
      timeoutMs: 60000,
    });

    const scheduler = new OutcomeScheduler();
    let jobId = 0;

    await runner.runTest('任务添加/移除', async () => {
      const id = `concurrent-job-${jobId++}`;
      scheduler.addJob(createJob(id));
      const removed = scheduler.removeJob(id);
      expect(removed).toBe(true);
    });
  });

  it('任务暂停/恢复性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 30,
      iterations: 1500,
      timeoutMs: 60000,
    });

    const scheduler = new OutcomeScheduler();
    const jobIds: string[] = [];

    // 先添加 500 个任务
    for (let i = 0; i < 500; i++) {
      const id = `pause-job-${i}`;
      scheduler.addJob(createJob(id));
      jobIds.push(id);
    }

    let idx = 0;
    await runner.runTest('任务暂停/恢复', async () => {
      const id = jobIds[idx++ % jobIds.length];
      if (idx % 2 === 0) {
        scheduler.pauseJob(id);
      } else {
        scheduler.resumeJob(id);
      }
      expect(true).toBe(true);
    });
  });

  it('任务配置更新性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 20,
      iterations: 1000,
      timeoutMs: 60000,
    });

    const scheduler = new OutcomeScheduler();

    // 添加 100 个任务
    for (let i = 0; i < 100; i++) {
      scheduler.addJob(createJob(`update-job-${i}`));
    }

    let idx = 0;
    await runner.runTest('任务配置更新', async () => {
      const id = `update-job-${idx++ % 100}`;
      scheduler.updateJob(id, {
        name: `Updated Name ${Date.now()}`,
        template: 'Updated template'
      });
      const jobs = scheduler.getAllJobs();
      const job = jobs.find(j => j.id === id);
      expect(job?.name).toContain('Updated');
    });
  });

  it('手动触发任务执行性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 50,
      iterations: 2000,
      timeoutMs: 60000,
    });

    const scheduler = new OutcomeScheduler();
    scheduler.addJob(createJob('trigger-test-job', { enabled: false }));

    await runner.runTest('手动触发任务', async () => {
      const result = await scheduler.triggerJob('trigger-test-job');
      expect(result.success).toBe(true);
      expect(result.content).toBe('Test template');
    });
  });

  it('获取任务列表性能（大量任务）', async () => {
    const runner = new StressTestRunner({
      concurrency: 10,
      iterations: 500,
      timeoutMs: 60000,
    });

    const scheduler = new OutcomeScheduler();

    // 添加 2000 个任务
    for (let i = 0; i < 2000; i++) {
      scheduler.addJob(createJob(`list-job-${i}`, { enabled: false }));
    }

    await runner.runTest('获取2000任务列表', async () => {
      const jobs = scheduler.getAllJobs();
      expect(jobs).toHaveLength(2000);
    });
  });

  it('计费统计性能', async () => {
    const runner = new StressTestRunner({
      concurrency: 20,
      iterations: 1000,
      timeoutMs: 60000,
    });

    const scheduler = new OutcomeScheduler();
    const job: any = createJob('billing-test-job', { enabled: false });
    job.costPerExecution = 0.01;
    scheduler.addJob(job);

    // 先执行 100 次产生记录
    for (let i = 0; i < 100; i++) {
      await scheduler.triggerJob('billing-test-job');
    }

    await runner.runTest('计费统计查询', async () => {
      const summary = scheduler.getBillingSummary();
      expect(summary.totalAmount).toBeGreaterThan(0);
      expect(summary.records.length).toBeGreaterThanOrEqual(100);
    });
  });

  afterAll(() => {
    console.log('\n=== ✅ 任务调度器压力测试完成 ===\n');
  });
});
