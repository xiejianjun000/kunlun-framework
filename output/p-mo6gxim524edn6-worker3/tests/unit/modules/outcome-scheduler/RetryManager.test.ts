import { RetryManager } from '../../../../src/modules/outcome-scheduler/RetryManager';

describe('RetryManager', () => {
  it('should create with default config', () => {
    const manager = new RetryManager();
    expect(manager).toBeDefined();
    expect(manager.getDefaultConfig().maxRetries).toBe(3);
  });

  it('should accept custom config', () => {
    const manager = new RetryManager({
      maxRetries: 5,
      retryIntervalMs: 5000,
      exponentialBackoff: false
    });
    expect(manager.getDefaultConfig().maxRetries).toBe(5);
    expect(manager.getDefaultConfig().exponentialBackoff).toBe(false);
  });

  it('should execute successfully on first try', async () => {
    const manager = new RetryManager();
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await manager.executeWithRetry(operation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result).toBe('success');
    }
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed', async () => {
    const manager = new RetryManager({
      maxRetries: 2,
      retryIntervalMs: 10
    });
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const result = await manager.executeWithRetry(operation);
    expect(result.success).toBe(true);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should fail after max retries', async () => {
    const manager = new RetryManager({
      maxRetries: 2,
      retryIntervalMs: 10
    });
    const operation = jest.fn().mockRejectedValue(new Error('always fail'));
    
    const result = await manager.executeWithRetry(operation);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retries).toBe(3); // 1 initial + 2 retries = 3
      expect(operation).toHaveBeenCalledTimes(3);
    }
  });
});
