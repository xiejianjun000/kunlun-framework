import { ChannelConfig, ChannelType } from './interfaces/IOutcomeScheduler';
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
export declare class ChannelPusher {
    private retryManager;
    constructor(retryManager?: RetryManager);
    /**
     * 推送到所有配置的渠道
     */
    pushToAll(content: string, channels: ChannelConfig[]): Promise<PushResult[]>;
    /**
     * 推送到单个渠道
     */
    push(content: string, channel: ChannelConfig): Promise<PushResult>;
    /**
     * 实际执行推送
     */
    private doPush;
    /**
     * 推送邮件（通过webhook）
     */
    private pushEmail;
    /**
     * 推送到飞书
     */
    private pushFeishu;
    /**
     * 推送到钉钉
     */
    private pushDingtalk;
    /**
     * 推送到企业微信
     */
    private pushWecom;
}
