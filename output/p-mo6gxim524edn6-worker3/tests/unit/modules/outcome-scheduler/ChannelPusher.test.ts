import { ChannelPusher } from '../../../../src/modules/outcome-scheduler/ChannelPusher';
import { RetryManager } from '../../../../src/modules/outcome-scheduler/RetryManager';

describe('ChannelPusher', () => {
  it('should create with default retry manager', () => {
    const pusher = new ChannelPusher();
    expect(pusher).toBeDefined();
  });

  it('should create with custom retry manager', () => {
    const retry = new RetryManager({ maxRetries: 5 });
    const pusher = new ChannelPusher(retry);
    expect(pusher).toBeDefined();
  });
});
