import * as outcomeScheduler from '../../../../src/modules/outcome-scheduler';

describe('Outcome Scheduler Module Index', () => {
  it('should export all components', () => {
    expect(outcomeScheduler.OutcomeScheduler).toBeDefined();
    expect(outcomeScheduler.TemplateEngine).toBeDefined();
    expect(outcomeScheduler.ChannelPusher).toBeDefined();
    expect(outcomeScheduler.BillingTracker).toBeDefined();
    expect(outcomeScheduler.ExecutionHistory).toBeDefined();
    expect(outcomeScheduler.RetryManager).toBeDefined();
  });
});
