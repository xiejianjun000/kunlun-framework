import { OutcomeScheduler } from '../../../../src/modules/outcome-scheduler/OutcomeScheduler';
import type { ScheduledJob } from '../../../../src/modules/outcome-scheduler/interfaces/IOutcomeScheduler';

describe('OutcomeScheduler', () => {
  it('should create an instance', () => {
    const scheduler = new OutcomeScheduler();
    expect(scheduler).toBeDefined();
    expect(scheduler.name).toBe('OutcomeScheduler');
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should add jobs', () => {
    const scheduler = new OutcomeScheduler();
    const job: ScheduledJob = {
      id: 'test-job',
      name: 'Test Job',
      schedule: {
        type: 'every',
        expression: '60',
        enabled: true
      },
      template: 'Hello world',
      channels: [],
      needRender: false
    };

    scheduler.addJob(job);
    expect(scheduler.getAllJobs()).toHaveLength(1);
  });

  it('should throw when adding duplicate job', () => {
    const scheduler = new OutcomeScheduler();
    const job: ScheduledJob = {
      id: 'test-job',
      name: 'Test Job',
      schedule: {
        type: 'every',
        expression: '60',
        enabled: true
      },
      template: 'Hello world',
      channels: [],
      needRender: false
    };

    scheduler.addJob(job);
    expect(() => scheduler.addJob(job)).toThrow();
  });

  it('should remove jobs', () => {
    const scheduler = new OutcomeScheduler();
    const job: ScheduledJob = {
      id: 'test-job',
      name: 'Test Job',
      schedule: {
        type: 'every',
        expression: '60',
        enabled: true
      },
      template: 'Hello world',
      channels: [],
      needRender: false
    };

    scheduler.addJob(job);
    const removed = scheduler.removeJob('test-job');
    expect(removed).toBe(true);
    expect(scheduler.getAllJobs()).toHaveLength(0);
  });

  it('should have template engine', () => {
    const scheduler = new OutcomeScheduler();
    expect(scheduler.templateEngine).toBeDefined();
    scheduler.templateEngine.registerTemplate('test', 'Hello {{name}}');
    expect(scheduler.templateEngine.hasTemplate('test')).toBe(true);
  });

  it('should have billing tracker', () => {
    const scheduler = new OutcomeScheduler();
    expect(scheduler.billingTracker).toBeDefined();
    expect(scheduler.billingTracker.getTotalAmount()).toBe(0);
  });

  it('should have execution history', () => {
    const scheduler = new OutcomeScheduler();
    expect(scheduler.executionHistory).toBeDefined();
    expect(scheduler.executionHistory.getTotalExecutions()).toBe(0);
  });

  it('should manually trigger job execution', async () => {
    const scheduler = new OutcomeScheduler();
    const job: ScheduledJob = {
      id: 'test-job',
      name: 'Test Job',
      schedule: {
        type: 'every',
        expression: '60',
        enabled: true
      },
      template: 'Hello {{name}}',
      defaultVariables: { name: 'World' },
      channels: [],
      needRender: true
    };

    scheduler.addJob(job);
    const result = await scheduler.triggerJob('test-job');
    
    expect(result.success).toBe(true);
    expect(result.content).toBe('Hello World');
    expect(result.retries).toBe(0);
  });

  it('should render template with variables on manual trigger', async () => {
    const scheduler = new OutcomeScheduler();
    const job: ScheduledJob = {
      id: 'report-job',
      name: 'Daily Report',
      schedule: {
        type: 'cron',
        expression: '0 9 * * *',
        enabled: true
      },
      template: 'Daily report generated at {{executionTime}}',
      channels: [],
      needRender: true
    };

    scheduler.addJob(job);
    const result = await scheduler.triggerJob('report-job');
    
    expect(result.success).toBe(true);
    expect(result.content).toContain('Daily report generated at');
    expect(scheduler.executionHistory.getHistory('report-job')).toHaveLength(1);
  });

  it('should get billing summary', async () => {
    const scheduler = new OutcomeScheduler();
    const job: ScheduledJob = {
      id: 'test-job',
      name: 'Test Job',
      schedule: { type: 'every', expression: '60', enabled: true },
      template: 'test',
      channels: [],
      needRender: false,
      costPerExecution: 100
    };

    scheduler.addJob(job);
    await scheduler.triggerJob('test-job');
    
    const summary = scheduler.getBillingSummary();
    expect(summary.totalAmount).toBe(100);
  });
});
