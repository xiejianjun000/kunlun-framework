/**
 * Adapter Usage Examples
 * 适配器使用示例
 */

import { 
  AdapterManager, 
  FeishuAdapter, 
  WeComAdapter, 
  WechatAdapter,
  AdapterActorSystem,
  GenericMessageHandlerActor,
} from './index';
import type { MessageContext, MessageContent, UnifiedAdapterConfig } from './types';

/**
 * 示例1: 基础使用
 */
export async function basicExample() {
  // 创建管理器
  const manager = new AdapterManager({
    feishu: {
      enabled: true,
      appId: 'cli_xxx',
      appSecret: 'xxx',
      connectionMode: 'websocket',
    },
  });

  // 注册消息处理器
  manager.onMessage(async (ctx) => {
    console.log(`[${ctx.platform}] ${ctx.sender.displayName || ctx.sender.userId}: ${ctx.content.content}`);
    
    // 回复消息
    await manager.replyMessage(ctx.platform, ctx.messageId, {
      type: 'text',
      content: '收到消息: ' + ctx.content.content,
    });
  });

  // 连接并保持运行
  await manager.connectAll();
  console.log('Adapter running...');
}

/**
 * 示例2: 带路由的消息处理
 */
export async function routingExample() {
  const manager = new AdapterManager();

  // 添加路由规则
  manager.addRoutingRule({
    match: { platform: 'feishu', sessionType: 'p2p' },
    agentId: 'feishu-p2p-agent',
    priority: 1,
  });

  manager.addRoutingRule({
    match: { platform: 'feishu', sessionType: 'group' },
    agentId: 'feishu-group-agent',
    priority: 2,
  });

  // 设置默认Agent
  manager.setDefaultAgent('default-agent');

  // 按平台注册处理器
  manager.onPlatformMessage('feishu', async (ctx) => {
    console.log('Feishu message:', ctx.content.content);
    
    if (ctx.content.content.startsWith('/help')) {
      await manager.replyMessage(ctx.platform, ctx.messageId, {
        type: 'text',
        content: '帮助信息...',
      });
    }
  });

  manager.onPlatformMessage('wecom', async (ctx) => {
    console.log('WeCom message:', ctx.content.content);
  });

  await manager.connectAll();
}

/**
 * 示例3: 与ActorSystem集成
 */
export async function actorIntegrationExample() {
  const manager = new AdapterManager({
    feishu: {
      enabled: true,
      appId: 'cli_xxx',
      appSecret: 'xxx',
    },
  });

  // 创建适配器Actor系统
  const actorSystem = new AdapterActorSystem(manager);

  // 创建消息处理器Actor
  const handler = new GenericMessageHandlerActor(
    actorSystem,
    async (context: MessageContext): Promise<MessageContent | null> => {
      const text = context.content.content.toLowerCase();
      
      if (text.includes('hello')) {
        return {
          type: 'text',
          content: '你好! 我是OpenTaiji智能助手。',
        };
      }
      
      if (text.includes('帮助') || text.includes('help')) {
        return {
          type: 'markdown',
          content: '## 可用命令\n\n- `/help` - 显示帮助\n- `/status` - 查看状态\n- `/quit` - 退出对话',
        };
      }
      
      return null; // 不自动回复
    }
  );

  // 注册处理器
  actorSystem.registerHandlerActor(handler);

  await manager.connectAll();
}

/**
 * 示例4: Webhook处理
 */
export async function webhookExample() {
  const adapter = new FeishuAdapter({
    appId: 'cli_xxx',
    appSecret: 'xxx',
    connectionMode: 'webhook',
    webhookPath: '/feishu/events',
    encryptKey: 'xxx',
    verificationToken: 'xxx',
  });

  adapter.onMessage(async (ctx) => {
    console.log('Webhook received:', ctx.content);
  });

  await adapter.connect();

  // 在Express/Koa等框架中处理webhook
  const expressApp = require('express')();
  
  expressApp.post('/feishu/events', async (req, res) => {
    const headers = req.headers;
    const body = req.body;
    
    // 验证签名
    if (!adapter.verifyWebhook(headers as Record<string, string>, JSON.stringify(body))) {
      return res.status(401).send('Invalid signature');
    }
    
    // 解密消息
    if (body.encrypt) {
      const decrypted = adapter.decryptWebhook(body.encrypt);
      const event = JSON.parse(decrypted);
      adapter.handleFeishuEvent(event);
    } else {
      adapter.handleFeishuEvent(body);
    }
    
    res.send('ok');
  });

  expressApp.listen(3000);
}

/**
 * 示例5: 多平台广播
 */
export async function broadcastExample() {
  const manager = new AdapterManager({
    feishu: { enabled: true, appId: 'xxx', appSecret: 'xxx' },
    wecom: { enabled: true, corpId: 'xxx', agentId: 1000001, appSecret: 'xxx' },
  });

  // 广播到所有平台
  await manager.connectAll();
  
  const result = await manager.broadcastMessage(
    {
      type: 'text',
      content: '系统公告: 服务器将于今晚22:00进行维护。',
    },
    ['wechat'] // 不包括微信
  );

  for (const [platform, msgResult] of result) {
    console.log(`${platform}: ${msgResult.success ? '发送成功' : '发送失败'}`);
  }
}

/**
 * 示例6: 会话管理
 */
export async function sessionManagementExample() {
  const manager = new AdapterManager();

  manager.onMessage((ctx) => {
    // 获取会话信息
    const sessions = manager.getAllStatus();
    console.log('Active sessions:', sessions.size);
    
    // 消息追踪
    console.log('Message from:', ctx.sender.userId);
    console.log('Session:', ctx.sessionId);
    console.log('Channel:', ctx.channelId);
  });

  await manager.connectAll();
}

/**
 * 示例7: 飞书卡片消息
 */
export async function feishuCardExample() {
  const adapter = new FeishuAdapter({
    appId: 'cli_xxx',
    appSecret: 'xxx',
  });

  await adapter.connect();

  // 发送交互式卡片
  const cardContent: MessageContent = {
    type: 'interactive',
    content: '卡片消息',
    metadata: {
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: '任务卡片' },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'markdown',
              content: '**任务名称**: 环评报告审查\n**截止日期**: 2024-03-15',
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '批准' },
                type: 'primary',
                value: { action: 'approve' },
              },
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '拒绝' },
                type: 'danger',
                value: { action: 'reject' },
              },
            ],
          },
        ],
      },
    },
  };

  await adapter.sendMessage('oc_xxx', cardContent);
}

/**
 * 示例8: 错误处理和重连
 */
export async function errorHandlingExample() {
  const manager = new AdapterManager({
    feishu: {
      enabled: true,
      appId: 'cli_xxx',
      appSecret: 'xxx',
    },
  });

  // 监听错误
  manager.on('error', ({ platform, error }) => {
    console.error(`Adapter error [${platform}]:`, error);
  });

  manager.on('reconnect_failed', ({ platform }) => {
    console.error(`Reconnection failed [${platform}], please check configuration`);
  });

  // 获取状态
  const status = manager.getAllStatus();
  for (const [platform, info] of status) {
    console.log(`${platform}: ${info.connected ? 'connected' : 'disconnected'}`);
    console.log(`  - Messages received: ${info.stats.messagesReceived}`);
    console.log(`  - Messages sent: ${info.stats.messagesSent}`);
    console.log(`  - Errors: ${info.stats.errors}`);
  }

  await manager.connectAll();
}

// 运行示例
if (require.main === module) {
  console.log('Running example...');
  // basicExample().catch(console.error);
}

export {
  basicExample,
  routingExample,
  actorIntegrationExample,
  webhookExample,
  broadcastExample,
  sessionManagementExample,
  feishuCardExample,
  errorHandlingExample,
};
