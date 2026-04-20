import { ExecutionHistory } from '../../../../src/modules/outcome-scheduler/ExecutionHistory';

describe('ExecutionHistory', () => {
  it('should start empty', () => {
    const history = new ExecutionHistory();
    expect(history.getTotalExecutions()).toBe(0);
  });

  it('should add records', () => {
    const history = new ExecutionHistory();
    history.addRecord('job-1', 'exec-1', {
      success: true,
      content: 'test',
      pushResult: [],
      startTime: Date.now(),
      endTime: Date.now(),
      retries: 0
    });
    
    expect(history.getTotalExecutions()).toBe(1);
    expect(history.getHistory('job-1')).toHaveLength(1);
  });

  it('should get success rate', () => {
    const history = new ExecutionHistory();
    history.addRecord('job-1', 'exec-1', {
      success: true,
      content: 'test',
      pushResult: [],
      startTime: Date.now(),
      endTime: Date.now(),
      retries: 0
    });
    history.addRecord('job-1', 'exec-2', {
      success: false,
      content: 'test',
      pushResult: [],
      startTime: Date.now(),
      endTime: Date.now(),
      retries: 0
    });
    
    expect(history.getSuccessRate('job-1')).toBe(0.5);
  });

  it('should get recent records', () => {
    const history = new ExecutionHistory();
    for (let i = 0; i < 10; i++) {
      history.addRecord('job-1', `exec-${i}`, {
        success: true,
        content: 'test',
        pushResult: [],
        startTime: Date.now() - (10 - i) * 1000,
        endTime: Date.now(),
        retries: 0
      });
    }
    
    const recent = history.getRecent(5);
    expect(recent).toHaveLength(5);
  });

  it('should clear job history', () => {
    const history = new ExecutionHistory();
    history.addRecord('job-1', 'exec-1', {
      success: true,
      content: 'test',
      pushResult: [],
      startTime: Date.now(),
      endTime: Date.now(),
      retries: 0
    });
    
    expect(history.clearJobHistory('job-1')).toBe(true);
    expect(history.getHistory('job-1')).toHaveLength(0);
  });
});
