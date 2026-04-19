/**
 * OpenTaiji Adapters - 消息平台适配器模块
 * 
 * @example
 * ```typescript
 * import { AdapterManager, FeishuAdapter, WeComAdapter } from './adapters';
 * 
 * // 创建适配器管理器
 * const manager = new AdapterManager({
 *   feishu: {
 *     enabled: true,
 *     appId: 'cli_xxx',
 *     appSecret: 'xxx',
 *     connectionMode: 'websocket'
 *   },
 *   wecom: {
 *     enabled: true,
 *     corpId: 'wwxxx',
 *     agentId: 1000001
 *   }
 * });
 * 
 * // 注册消息处理器
 * manager.onMessage(async (ctx) => {
 *   console.log(`${ctx.platform}: ${ctx.content.content}`);
 * });
 * 
 * // 连接所有适配器
 * await manager.connectAll();
 * ```
 */

// 类型定义
export * from './types';

// 适配器
export { FeishuAdapter } from './FeishuAdapter';
export { WeComAdapter } from './WeComAdapter';
export { WechatAdapter } from './WechatAdapter';

// 管理器
export { AdapterManager } from './AdapterManager';

// Actor集成
export {
  AdapterActorSystem,
  BaseMessageHandlerActor,
  GenericMessageHandlerActor,
  type InboundMessageActorMessage,
  type OutboundMessageActorMessage,
  type ReplyMessageActorMessage,
  type MessageResultActorMessage,
  type PlatformEventActorMessage,
  type AdapterActorMessage,
} from './ActorIntegration';

// Actor类型
export * from './actor';
