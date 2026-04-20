import { BillingTracker } from '../../../../src/modules/outcome-scheduler/BillingTracker';

describe('BillingTracker', () => {
  it('should start with empty records', () => {
    const tracker = new BillingTracker();
    expect(tracker.getTotalAmount()).toBe(0);
    expect(tracker.getAllRecords()).toHaveLength(0);
  });

  it('should add records', () => {
    const tracker = new BillingTracker();
    tracker.addRecord('job-1', 'exec-1', 100, 'execution');
    tracker.addRecord('job-1', 'exec-2', 200, 'execution');
    
    expect(tracker.getTotalAmount()).toBe(300);
    expect(tracker.getAllRecords()).toHaveLength(2);
  });

  it('should get records by job', () => {
    const tracker = new BillingTracker();
    tracker.addRecord('job-1', 'exec-1', 100, 'execution');
    tracker.addRecord('job-2', 'exec-1', 200, 'execution');
    
    const job1 = tracker.getRecordsByJob('job-1');
    expect(job1).toHaveLength(1);
    expect(job1[0].amount).toBe(100);
  });

  it('should get summary with time range', () => {
    const tracker = new BillingTracker();
    const now = Date.now();
    tracker.addRecord('job-1', 'exec-1', 100, 'execution');
    
    const summary = tracker.getSummary(now - 10000, now + 10000);
    expect(summary.totalAmount).toBe(100);
    expect(summary.records).toHaveLength(1);
  });

  it('should clear all records', () => {
    const tracker = new BillingTracker();
    tracker.addRecord('job-1', 'exec-1', 100, 'execution');
    expect(tracker.getTotalAmount()).toBe(100);
    
    tracker.clear();
    expect(tracker.getTotalAmount()).toBe(0);
  });
});
