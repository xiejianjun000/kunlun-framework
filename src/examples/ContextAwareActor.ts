/**
 * ContextEngine与ActorSystem集成示例
 * Example: Integrating ContextEngine with ActorSystem
 * 
 * 展示如何在OpenTaiji的Actor模型中使用ContextEngine
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { 
  ContextEngine, 
  createContextEngine, 
  ConversationRequest, 
  ProcessedContext,
  InjectionStrategy,
} from '../core/context';

// ============== 消息类型 ==============

/**
 * 对话消息
 */
interface IAConversationMessage {
  type: 'Conversation';
  request: ConversationRequest;
  /** 回复目标Actor（用于发送结果） */
  replyTo?: any;
}

/**
 * 上下文更新消息
 */
interface IAContextUpdateMessage {
  type: 'ContextUpdate';
  userId: string;
  memory?: { id: string; content: string };
  preference?: Record<string, unknown>;
}

/**
 * 上下文查询消息
 */
interface IAContextQueryMessage {
  type: 'ContextQuery';
  userId: string;
  query: string;
  replyTo?: any;
}

/**
 * Actor响应
 */
interface IAActorResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============== 消息联合类型 ==============

type IAActorMessage = IAConversationMessage | IAContextUpdateMessage | IAContextQueryMessage | { type: string; [key: string]: any };

// ============== ContextAwareActor ==============

/**
 * ContextAwareActor - 支持上下文的Actor基类
 * 
 * 集成了ContextEngine的Actor，自动处理上下文
 */
export abstract class ContextAwareActor {
  protected contextEngine: ContextEngine;
  protected userContexts: Map<string, ProcessedContext> = new Map();
  protected actorName: string;
  
  // Actor必需的属性
  protected _state: 'unstarted' | 'starting' | 'running' | 'stopping' | 'stopped' = 'unstarted';

  constructor(actorName: string) {
    this.actorName = actorName;
    
    // 初始化ContextEngine
    this.contextEngine = createContextEngine({
      defaultTokenBudget: 8000,
      maxTokenBudget: 128000,
      memorySearchLimit: 10,
      skillSearchLimit: 5,
      minRelevanceThreshold: 0.3,
      defaultInjectionStrategy: InjectionStrategy.SEQUENTIAL,
      enablePersonality: true,
      enableKnowledge: true,
      enableHistory: true,
      historyMessageLimit: 10,
    });
  }

  /**
   * Actor启动时的钩子
   */
  async preStart(): Promise<void> {
    await this.contextEngine.initialize();
    this._state = 'starting';
    console.log(`[ContextAwareActor:${this.actorName}] Started with ContextEngine`);
  }

  /**
   * Actor停止时的钩子
   */
  async postStop(): Promise<void> {
    await this.contextEngine.destroy();
    this._state = 'stopped';
    console.log(`[ContextAwareActor:${this.actorName}] Stopped`);
  }

  /**
   * 处理对话请求
   */
  protected async handleConversation(
    request: ConversationRequest
  ): Promise<ProcessedContext> {
    return this.contextEngine.processRequest(request);
  }

  /**
   * 缓存上下文
   */
  protected cacheContext(userId: string, context: ProcessedContext): void {
    this.userContexts.set(userId, context);
  }

  /**
   * 获取缓存的上下文
   */
  protected getCachedContext(userId: string): ProcessedContext | undefined {
    return this.userContexts.get(userId);
  }

  /**
   * 清除用户上下文缓存
   */
  protected clearUserContext(userId: string): void {
    this.userContexts.delete(userId);
  }

  /**
   * 消息处理逻辑 - 子类必须实现
   */
  abstract receive(message: IAActorMessage): Promise<void>;
}

// ============== 具体实现示例 ==============

/**
 * 对话助手Actor
 */
export interface AssistantActorProps {
  /** Actor名称 */
  name?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 知识库ID */
  knowledgeBaseId?: string;
}

export class AssistantActor extends ContextAwareActor {
  private systemPrompt: string;

  constructor(props: AssistantActorProps) {
    super(props.name || 'assistant');
    this.systemPrompt = props.systemPrompt || 'You are a helpful assistant.';
  }

  /**
   * 消息处理逻辑
   */
  async receive(message: IAActorMessage): Promise<void> {
    this._state = 'running';

    const msgType = (message as any).type;

    if (msgType === 'Conversation') {
      await this.handleConversationMessage(message as IAConversationMessage);
    } else if (msgType === 'ContextUpdate') {
      await this.handleContextUpdate(message as IAContextUpdateMessage);
    } else if (msgType === 'ContextQuery') {
      await this.handleContextQuery(message as IAContextQueryMessage);
    } else {
      console.warn(`[AssistantActor] Unknown message type: ${msgType}`);
    }
  }

  /**
   * 处理对话消息
   */
  private async handleConversationMessage(msg: IAConversationMessage): Promise<void> {
    try {
      const { request, replyTo } = msg;

      // 添加系统提示词
      request.systemPrompt = this.systemPrompt;

      // 处理请求
      const processedContext = await this.handleConversation(request);

      // 缓存上下文
      this.cacheContext(request.userId, processedContext);

      // 发送响应
      replyTo?.tell({
        success: true,
        data: {
          prompt: processedContext.prompt,
          stats: processedContext.stats,
        },
      });
    } catch (error) {
      const { replyTo } = msg;
      replyTo?.tell({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * 处理上下文更新
   */
  private async handleContextUpdate(msg: IAContextUpdateMessage): Promise<void> {
    // 在实际实现中，这里会更新记忆或偏好
    console.log(`[AssistantActor] Context update for ${msg.userId}:`, msg);
    
    // 清除缓存以强制重新加载
    this.clearUserContext(msg.userId);
  }

  /**
   * 处理上下文查询
   */
  private async handleContextQuery(msg: IAContextQueryMessage): Promise<void> {
    try {
      // 检查缓存
      const cached = this.getCachedContext(msg.userId);
      
      msg.replyTo?.tell({
        success: true,
        data: {
          hasCached: !!cached,
          cachedTokens: cached?.stats.tokensUsed,
        },
      });
    } catch (error) {
      msg.replyTo?.tell({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

// ============== 工厂函数 ==============

/**
 * 创建助手Actor
 */
export function createAssistant(props: AssistantActorProps): AssistantActor {
  return new AssistantActor(props);
}

// ============== 使用示例 ==============

/**
 * 示例：如何使用ContextEngine with Actor
 */
export async function exampleUsage(): Promise<void> {
  // 1. 创建助手Actor
  const assistant = createAssistant({
    name: 'coding-assistant',
    systemPrompt: 'You are a coding assistant. {{CONTEXT}}',
  });

  // 2. 初始化Actor
  await assistant.preStart();

  // 3. 创建模拟回复Actor
  const replyActor = {
    responses: [] as any[],
    tell(response: any) {
      this.responses.push(response);
      console.log('[ReplyActor] Received:', response.success ? 'SUCCESS' : 'FAILED');
    },
  };

  // 4. 发送对话请求
  await assistant.receive({
    type: 'Conversation',
    request: {
      userId: 'user-123',
      message: 'How do I implement a binary search tree in TypeScript?',
      tokenBudget: 8000,
      history: [
        { role: 'user', content: 'I need help with data structures', timestamp: Date.now() - 60000 },
        { role: 'assistant', content: 'Which data structure are you interested in?', timestamp: Date.now() - 30000 },
      ],
    },
    replyTo: replyActor,
  });

  // 5. 查询上下文状态
  await assistant.receive({
    type: 'ContextQuery',
    userId: 'user-123',
    query: 'data structures',
    replyTo: replyActor,
  });

  // 6. 更新用户偏好
  await assistant.receive({
    type: 'ContextUpdate',
    userId: 'user-123',
    preference: { responseStyle: 'detailed' },
  });

  // 7. 停止Actor
  await assistant.postStop();

  console.log('[Example] Assistant actor created and messages sent');
  console.log('[Example] Total responses received:', replyActor.responses.length);
}

export default AssistantActor;
