/**
 * Adapter Configuration Examples
 * 适配器配置示例
 */

import type { UnifiedAdapterConfig, RoutingRule, FeishuConfig, WeComConfig, WechatConfig } from './types';

/**
 * 飞书配置示例
 */
export const feishuConfigExample: UnifiedAdapterConfig['feishu'] = {
  enabled: true,
  appId: 'cli_xxxxxxxxxxxxxxxx',           // 飞书应用AppID
  appSecret: 'your-app-secret',              // 飞书应用AppSecret
  domain: 'feishu',                          // 或 'lark' (国际版)
  connectionMode: 'websocket',               // websocket 或 webhook
  webhookPath: '/feishu/events',            // Webhook路径
  
  // Webhook模式专用
  encryptKey: 'your-encrypt-key',           // 消息加密密钥
  verificationToken: 'your-token',          // 回调验证Token
  
  // 消息处理
  requireMention: false,                     // 群聊是否需要@机器人
  receiveMessageTypes: ['text', 'post', 'interactive'],
  
  // 机器人配置
  botName: 'OpenTaiji Bot',
};

/**
 * 企业微信配置示例
 */
export const wecomConfigExample: UnifiedAdapterConfig['wecom'] = {
  enabled: true,
  corpId: 'wwxxxxxxxxxxxxxxxx',             // 企业ID
  corpName: '示例公司',
  agentId: 1000001,                          // 应用AgentID
  appSecret: 'your-corp-secret',            // 应用Secret
  
  // 回调模式专用
  callbackToken: 'your-callback-token',     // 回调Token
  encodingAesKey: 'your-aes-key-32-chars-xxx', // AES密钥(43位)
  
  // 连接配置
  connectionMode: 'webhook',
  webhookUrl: 'https://your-domain.com/wecom/callback',
  
  timeoutMs: 30000,
};

/**
 * 微信个人号配置示例 (使用Wechaty)
 */
export const wechatConfigExample: UnifiedAdapterConfig['wechat'] = {
  enabled: true,
  
  // 协议选择
  protocol: 'web',                          // web 或 padplus
  
  // 微信需要通过外部登录获取token
  // 具体配置取决于使用的puppet
  appSecret: 'puppet-token',                // puppet token
  
  // 行为配置
  autoFriend: false,                         // 自动通过好友请求
  adminUsers: ['wxid_xxxxx'],               // 管理员用户ID
  
  // 机器人昵称
  nickname: 'OpenTaiji',
};

/**
 * 完整配置示例
 */
export const fullConfigExample: UnifiedAdapterConfig = {
  feishu: feishuConfigExample,
  wecom: wecomConfigExample,
  // wechat: wechatConfigExample,            // 微信个人号需要特殊环境
};

/**
 * 路由规则示例
 */
export const routingRulesExample: RoutingRule[] = [
  // 特定群聊路由到指定Agent
  {
    match: {
      platform: 'feishu',
      sessionType: 'group',
      channelId: 'oc_group_001',
    },
    agentId: 'feishu-support-agent',
    priority: 1,
  },
  
  // 包含特定关键词的消息路由
  {
    match: {
      keyword: /^!admin/,
    },
    agentId: 'admin-agent',
    priority: 2,
  },
  
  // 所有p2p消息使用默认Agent
  {
    match: {
      sessionType: 'p2p',
    },
    agentId: 'default-agent',
    priority: 10,
  },
  
  // 其他群聊消息
  {
    match: {
      platform: 'feishu',
      sessionType: 'group',
    },
    agentId: 'feishu-group-agent',
    priority: 20,
  },
];

/**
 * 环境变量配置方式
 */
export const envConfigExample: UnifiedAdapterConfig = {
  feishu: {
    enabled: process.env.FEISHU_ENABLED === 'true',
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    encryptKey: process.env.FEISHU_ENCRYPT_KEY,
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
    connectionMode: (process.env.FEISHU_CONNECTION_MODE as 'websocket' | 'webhook') || 'websocket',
  },
  wecom: {
    enabled: process.env.WECOM_ENABLED === 'true',
    corpId: process.env.WECOM_CORP_ID || '',
    agentId: process.env.WECOM_AGENT_ID ? parseInt(process.env.WECOM_AGENT_ID) : undefined,
    appSecret: process.env.WECOM_APP_SECRET,
    callbackToken: process.env.WECOM_CALLBACK_TOKEN,
    encodingAesKey: process.env.WECOM_ENCODING_AES_KEY,
    connectionMode: 'webhook',
    webhookUrl: process.env.WECOM_WEBHOOK_URL,
  },
};

/**
 * 配置文件格式 (config.json)
 */
export const configJsonExample = JSON.stringify({
  adapters: {
    feishu: {
      enabled: true,
      appId: "cli_xxx",
      appSecret: "${FEISHU_APP_SECRET}",
      connectionMode: "websocket"
    },
    wecom: {
      enabled: true,
      corpId: "wwxxx",
      agentId: 1000001,
      appSecret: "${WECOM_APP_SECRET}"
    }
  },
  routing: {
    defaultAgent: "default-agent",
    rules: [
      {
        match: { platform: "feishu", sessionType: "p2p" },
        agentId: "feishu-p2p-agent",
        priority: 1
      }
    ]
  }
}, null, 2);

export default {
  feishuConfigExample,
  wecomConfigExample,
  wechatConfigExample,
  fullConfigExample,
  routingRulesExample,
  envConfigExample,
  configJsonExample,
};
