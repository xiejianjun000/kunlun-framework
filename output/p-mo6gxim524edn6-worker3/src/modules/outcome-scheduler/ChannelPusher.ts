import { ChannelConfig, ChannelType, ExecutionResult } from './interfaces/IOutcomeScheduler';
import { RetryManager } from './RetryManager';

/**
 * 推送结果
 */
export interface PushResult {
  channel: ChannelType;
  success: boolean;
  message?: string;
}

/**
 * 多渠道推送器
 * 支持邮件、飞书、钉钉、企业微信推送
 */
export class ChannelPusher {
  private retryManager: RetryManager;

  constructor(retryManager?: RetryManager) {
    this.retryManager = retryManager || new RetryManager({
      maxRetries: 2,
      retryIntervalMs: 1000
    });
  }

  /**
   * 推送到所有配置的渠道
   */
  async pushToAll(content: string, channels: ChannelConfig[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const channel of channels) {
      const result = await this.push(content, channel);
      results.push(result);
    }

    return results;
  }

  /**
   * 推送到单个渠道
   */
  async push(content: string, channel: ChannelConfig): Promise<PushResult> {
    const result = await this.retryManager.executeWithRetry(async () => {
      await this.doPush(content, channel);
    });

    if (result.success) {
      return {
        channel: channel.type,
        success: true
      };
    } else {
      return {
        channel: channel.type,
        success: false,
        message: result.error?.message
      };
    }
  }

  /**
   * 实际执行推送
   */
  private async doPush(content: string, channel: ChannelConfig): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.pushEmail(content, channel);
        break;
      case 'feishu':
        await this.pushFeishu(content, channel);
        break;
      case 'dingtalk':
        await this.pushDingtalk(content, channel);
        break;
      case 'wecom':
        await this.pushWecom(content, channel);
        break;
      default:
        throw new Error(`Unsupported channel type: ${(channel as any).type}`);
    }
  }

  /**
   * 推送邮件（通过webhook）
   */
  private async pushEmail(content: string, channel: ChannelConfig): Promise<void> {
    const webhookUrl = channel.destination;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: channel.title || 'Outcome Report',
        text: content
      })
    });

    if (!response.ok) {
      throw new Error(`Email push failed: ${response.status}`);
    }
  }

  /**
   * 推送到飞书
   */
  private async pushFeishu(content: string, channel: ChannelConfig): Promise<void> {
    const webhookUrl = channel.destination;
    const body = {
      msg_type: 'text',
      content: {
        text: content
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Feishu push failed: ${response.status}`);
    }

    const data: any = await response.json();
    if (data.code !== 0) {
      throw new Error(`Feishu push failed: ${data.msg}`);
    }
  }

  /**
   * 推送到钉钉
   */
  private async pushDingtalk(content: string, channel: ChannelConfig): Promise<void> {
    const webhookUrl = channel.destination;
    const body = {
      msgtype: 'text',
      text: {
        content: content
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Dingtalk push failed: ${response.status}`);
    }

    const data: any = await response.json();
    if (data.errcode !== 0) {
      throw new Error(`Dingtalk push failed: ${data.errmsg}`);
    }
  }

  /**
   * 推送到企业微信
   */
  private async pushWecom(content: string, channel: ChannelConfig): Promise<void> {
    const webhookUrl = channel.destination;
    const body = {
      msgtype: 'text',
      text: {
        content: content
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`WeCom push failed: ${response.status}`);
    }

    const data: any = await response.json();
    if (data.errcode !== 0) {
      throw new Error(`WeCom push failed: ${data.errmsg}`);
    }
  }
}
