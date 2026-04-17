# 昆仑框架（Kunlun Framework）开发技术方案

> **版本**：v1.0  
> **日期**：2026年4月17日  
> **状态**：技术方案设计阶段

---

## 一、技术架构总览

### 1.1 双语言四层架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Kunlun Framework Architecture                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │               Layer 4: Message Gateway (TypeScript)                │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │  Platform Adapters (20+)                                     │  │  │
│  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │  │  │
│  │  │  │飞书│ │企微│ │钉钉│ │微信│ │Slack│ │Discord│ │Telegram│       │  │  │
│  │  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘         │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │  Message Router | Protocol Converter | Auth Gateway          │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    ↓ gRPC                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │               Layer 3: Actor Runtime (TypeScript)                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │  │
│  │  │  Actor Mesh  │  │  Dispatcher  │  │    Supervisor        │     │  │
│  │  │  消息路由    │  │  任务分发    │  │    故障恢复          │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │  │
│  │  │  State Mgmt  │  │  Dead Letter │  │   Load Balancer      │     │  │
│  │  │  状态管理    │  │  死信队列    │  │   负载均衡           │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    ↓ gRPC                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │               Layer 2: Skill Engine (Python)                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │  │
│  │  │ Skill Loader │  │ Skill Store  │  │  Evolution Engine    │     │  │
│  │  │ 技能加载     │  │ 技能存储     │  │  进化学习            │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │  │
│  │  │Tool Registry │  │ Memory Hub   │  │  RAG Pipeline        │     │  │
│  │  │工具注册      │  │ 记忆中心     │  │  检索增强            │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │               Layer 1: LLM Gateway (Python)                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │  │
│  │  │ Model Router │  │ Prompt Tpl   │  │  Response Cache      │     │  │
│  │  │ 模型路由     │  │ 提示词模板   │  │  响应缓存            │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │  │
│  │  │  Token Pool  │  │ Fallback Mgr │  │  Metrics Collector   │     │  │
│  │  │  Token池     │  │ 降级管理     │  │  指标采集            │     │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈选型

| 层级 | 技术栈 | 核心框架 | 来源 |
|------|--------|---------|------|
| **Message Gateway** | TypeScript 5.x | OpenCLAW Core | OpenCLAW |
| **Actor Runtime** | TypeScript 5.x | OpenCLAW Actor | OpenCLAW |
| **Skill Engine** | Python 3.11+ | Hermes Core | Hermes |
| **LLM Gateway** | Python 3.11+ | 新设计 | 自研 |
| **通信协议** | gRPC + HTTP/2 | gRPC-Node + grpcio | 标准 |
| **数据存储** | PostgreSQL 15 + Redis 7 | pgvector + RedisJSON | 开源 |
| **对象存储** | MinIO | S3兼容 | 开源 |
| **向量数据库** | Qdrant / pgvector | 混合方案 | 开源 |

---

## 二、核心模块详细设计

### 2.1 Message Gateway（消息网关层）

#### 2.1.1 模块职责

```typescript
// Message Gateway 核心职责
interface MessageGateway {
  // 1. 平台适配 - 接入20+消息平台
  adaptPlatform(platform: Platform): PlatformAdapter;
  
  // 2. 协议转换 - 统一消息格式
  convertProtocol(rawMessage: any): KunlunMessage;
  
  // 3. 身份认证 - 租户和用户识别
  authenticate(message: KunlunMessage): AuthContext;
  
  // 4. 消息路由 - 路由到正确的Actor
  route(message: KunlunMessage): ActorReference;
  
  // 5. 状态同步 - 会话状态管理
  syncState(sessionId: string, state: SessionState): void;
}
```

#### 2.1.2 统一消息格式

```typescript
// 昆仑统一消息格式
interface KunlunMessage {
  // 消息标识
  id: string;                    // 全局唯一ID
  timestamp: number;             // 消息时间戳
  
  // 来源信息
  source: {
    platform: Platform;          // 来源平台
    channelId: string;           // 频道ID
    userId: string;              // 用户ID
    tenantId: string;            // 租户ID
  };
  
  // 消息内容
  content: {
    type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'event';
    text?: string;               // 文本内容
    media?: MediaAttachment;     // 媒体附件
    metadata?: Record<string, any>; // 元数据
  };
  
  // 会话上下文
  context: {
    sessionId: string;           // 会话ID
    parentMessageId?: string;    // 父消息ID（回复链）
    threadId?: string;           // 线程ID
  };
  
  // 追踪信息
  trace: {
    traceId: string;             // 分布式追踪ID
    spanId: string;              // 当前Span ID
  };
}

// 支持的平台枚举
enum Platform {
  FEISHU = 'feishu',
  WECOM = 'wecom',
  DINGTALK = 'dingtalk',
  WECHAT = 'wechat',
  SLACK = 'slack',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  // ... 更多平台
}
```

#### 2.1.3 平台适配器架构

```typescript
// 平台适配器基类
abstract class PlatformAdapter {
  abstract platform: Platform;
  
  // 连接管理
  abstract connect(config: PlatformConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  
  // 消息收发
  abstract onMessage(handler: MessageHandler): void;
  abstract sendMessage(message: KunlunMessage): Promise<void>;
  
  // 平台特性
  abstract getFeatures(): PlatformFeatures;
  
  // 格式转换
  protected abstract parseRawMessage(raw: any): KunlunMessage;
  protected abstract formatToPlatform(msg: KunlunMessage): any;
}

// 飞书适配器示例
class FeishuAdapter extends PlatformAdapter {
  platform = Platform.FEISHU;
  
  private client: FeishuClient;
  
  async connect(config: FeishuConfig): Promise<void> {
    this.client = new FeishuClient({
      appId: config.appId,
      appSecret: config.appSecret,
      encryptKey: config.encryptKey,
    });
    
    // 注册事件订阅
    this.client.event.on('message', (event) => {
      const message = this.parseRawMessage(event);
      this.messageHandler(message);
    });
  }
  
  protected parseRawMessage(event: FeishuEvent): KunlunMessage {
    return {
      id: event.event_id,
      timestamp: event.event_time,
      source: {
        platform: Platform.FEISHU,
        channelId: event.event.chat_id,
        userId: event.event.sender.sender_id.user_id,
        tenantId: event.tenant_key,
      },
      content: {
        type: this.mapMessageType(event.event.message.message_type),
        text: event.event.message.content,
      },
      context: {
        sessionId: event.event.chat_id,
      },
      trace: {
        traceId: event.event_id,
        spanId: generateSpanId(),
      },
    };
  }
}
```

#### 2.1.4 消息路由策略

```typescript
// 消息路由器
class MessageRouter {
  private actorRegistry: ActorRegistry;
  private sessionManager: SessionManager;
  
  async route(message: KunlunMessage): Promise<ActorReference> {
    // 1. 获取或创建会话
    const session = await this.sessionManager.getOrCreate(
      message.source.tenantId,
      message.context.sessionId
    );
    
    // 2. 查找绑定的Actor
    if (session.boundActor) {
      return this.actorRegistry.get(session.boundActor);
    }
    
    // 3. 基于规则匹配Actor
    const matchedActor = await this.matchActor(message, session);
    if (matchedActor) {
      return matchedActor;
    }
    
    // 4. 使用默认Actor
    return this.actorRegistry.getDefault(message.source.tenantId);
  }
  
  private async matchActor(
    message: KunlunMessage,
    session: Session
  ): Promise<ActorReference | null> {
    // 基于意图识别匹配
    const intent = await this.recognizeIntent(message);
    
    // 查找技能映射
    const actorMapping = await this.actorRegistry.findBySkill(intent.skill);
    
    return actorMapping;
  }
}
```

---

### 2.2 Actor Runtime（协调层）

#### 2.2.1 Actor核心接口

```typescript
// Actor核心接口
interface KunlunActor {
  // 生命周期
  preStart(): Promise<void>;
  postStop(): Promise<void>;
  preRestart(reason: Error): Promise<void>;
  postRestart(reason: Error): Promise<void>;
  
  // 消息处理
  receive(message: ActorMessage): Promise<ActorResponse>;
  
  // 状态管理
  getState(): ActorState;
  setState(state: ActorState): void;
}

// Actor消息结构
interface ActorMessage {
  msgId: string;
  sender: string;
  receiver: string;
  payload: any;
  metadata: Record<string, any>;
  timestamp: number;
  traceId?: string;
  replyTo?: string;
}

// Actor响应
interface ActorResponse {
  success: boolean;
  messages?: ActorMessage[];
  data?: any;
  error?: Error;
  metrics?: {
    processingTime: number;
    tokenUsed?: number;
  };
}
```

#### 2.2.2 Actor Mesh实现

```typescript
// Actor Mesh - 分布式Actor网络
class ActorMesh {
  private actors: Map<string, ActorCell> = new Map();
  private dispatcher: Dispatcher;
  private supervisor: Supervisor;
  
  // Actor创建
  async createActor(config: ActorConfig): Promise<ActorReference> {
    // 1. 创建Actor Cell（Actor的运行容器）
    const cell = new ActorCell({
      actorId: config.actorId,
      actorType: config.actorType,
      skillBindings: config.skillBindings,
      maxRestarts: config.maxRestarts,
    });
    
    // 2. 初始化Actor实例
    await cell.initialize(config);
    
    // 3. 注册到Mesh
    this.actors.set(config.actorId, cell);
    
    // 4. 注册到Supervisor
    this.supervisor.watch(cell);
    
    return new ActorReference(config.actorId, this);
  }
  
  // Actor发现
  async locateActor(actorId: string): Promise<ActorCell | null> {
    // 本地查找
    if (this.actors.has(actorId)) {
      return this.actors.get(actorId)!;
    }
    
    // 远程查找（分布式场景）
    return this.locateRemoteActor(actorId);
  }
  
  // 消息发送
  async sendMessage(
    target: string,
    message: ActorMessage,
    options?: SendOptions
  ): Promise<ActorResponse> {
    const cell = await this.locateActor(target);
    
    if (!cell) {
      throw new ActorNotFoundError(target);
    }
    
    return this.dispatcher.dispatch(cell, message, options);
  }
}
```

#### 2.2.3 Dispatcher实现

```typescript
// Dispatcher - 任务分发器
class Dispatcher {
  private queue: PriorityQueue<DispatcherTask>;
  private workers: WorkerPool;
  private loadBalancer: LoadBalancer;
  
  async dispatch(
    cell: ActorCell,
    message: ActorMessage,
    options?: SendOptions
  ): Promise<ActorResponse> {
    // 1. 创建分发任务
    const task = new DispatcherTask({
      cell,
      message,
      priority: options?.priority || 'normal',
      timeout: options?.timeout || 30000,
    });
    
    // 2. 加入队列
    await this.queue.enqueue(task);
    
    // 3. 等待执行
    return task.wait();
  }
  
  // Worker处理循环
  private async workerLoop(worker: Worker): Promise<void> {
    while (worker.isRunning) {
      try {
        // 获取任务
        const task = await this.queue.dequeue();
        
        if (!task) {
          await sleep(100);
          continue;
        }
        
        // 执行任务
        const response = await this.executeTask(task, worker);
        
        // 完成任务
        task.complete(response);
        
      } catch (error) {
        // 错误处理
        await this.handleWorkerError(worker, error);
      }
    }
  }
  
  private async executeTask(
    task: DispatcherTask,
    worker: Worker
  ): Promise<ActorResponse> {
    const startTime = Date.now();
    
    try {
      // 设置超时
      const response = await Promise.race([
        task.cell.receive(task.message),
        timeout(task.timeout),
      ]);
      
      // 记录指标
      this.recordMetrics({
        actorId: task.cell.actorId,
        processingTime: Date.now() - startTime,
        success: true,
      });
      
      return response;
      
    } catch (error) {
      // 记录错误
      this.recordMetrics({
        actorId: task.cell.actorId,
        processingTime: Date.now() - startTime,
        success: false,
        error,
      });
      
      throw error;
    }
  }
}
```

#### 2.2.4 Supervisor实现

```typescript
// Supervisor - 故障监督器
class Supervisor {
  private children: Map<string, SupervisedChild> = new Map();
  private strategy: SupervisorStrategy;
  
  // 监督Actor
  watch(cell: ActorCell): void {
    const child = new SupervisedChild({
      cell,
      restartCount: 0,
      lastRestartTime: null,
    });
    
    this.children.set(cell.actorId, child);
    
    // 监听Actor生命周期事件
    cell.on('error', (error) => this.handleChildError(child, error));
    cell.on('stopped', () => this.handleChildStopped(child));
  }
  
  // 处理子Actor错误
  private async handleChildError(
    child: SupervisedChild,
    error: Error
  ): Promise<void> {
    const decision = this.strategy.decide(child, error);
    
    switch (decision.action) {
      case 'restart':
        await this.restartChild(child, error);
        break;
        
      case 'stop':
        await this.stopChild(child);
        break;
        
      case 'escalate':
        throw new EscalateError(child.cell.actorId, error);
        
      case 'resume':
        await child.cell.resume();
        break;
    }
  }
  
  // 重启子Actor
  private async restartChild(
    child: SupervisedChild,
    reason: Error
  ): Promise<void> {
    // 检查重启次数限制
    if (child.restartCount >= child.cell.maxRestarts) {
      await this.stopChild(child);
      return;
    }
    
    // 指数退避
    const backoff = this.calculateBackoff(child);
    await sleep(backoff);
    
    // 执行重启
    await child.cell.restart(reason);
    
    // 更新计数
    child.restartCount++;
    child.lastRestartTime = Date.now();
  }
  
  // 计算退避时间
  private calculateBackoff(child: SupervisedChild): number {
    const baseBackoff = this.strategy.backoffMultiplier * child.restartCount;
    const maxBackoff = this.strategy.maxBackoff;
    return Math.min(baseBackoff * 1000, maxBackoff);
  }
}

// 监督策略
class OneForOneStrategy implements SupervisorStrategy {
  decide(child: SupervisedChild, error: Error): SupervisionDecision {
    // 单个Actor失败，只重启该Actor
    if (this.isRecoverable(error)) {
      return { action: 'restart' };
    }
    return { action: 'stop' };
  }
  
  private isRecoverable(error: Error): boolean {
    // 判断错误是否可恢复
    return !(
      error instanceof FatalError ||
      error instanceof OutOfMemoryError
    );
  }
}
```

#### 2.2.5 Actor-Skill桥接器

```typescript
// Actor-Skill Bridge - TypeScript调用Python Skill
class SkillBridge {
  private grpcClient: SkillEngineClient;
  
  async executeSkill(
    actorMessage: ActorMessage,
    skillConfig: SkillConfig
  ): Promise<SkillResult> {
    // 1. 转换消息格式
    const skillRequest = this.convertToSkillRequest(actorMessage, skillConfig);
    
    // 2. 通过gRPC调用Python Skill Engine
    const response = await this.grpcClient.executeSkill(skillRequest);
    
    // 3. 转换响应格式
    return this.convertToActorResponse(response);
  }
  
  private convertToSkillRequest(
    message: ActorMessage,
    skillConfig: SkillConfig
  ): SkillRequest {
    return {
      skill_id: skillConfig.skillId,
      skill_version: skillConfig.version,
      inputs: message.payload,
      context: {
        tenant_id: message.metadata.tenantId,
        user_id: message.metadata.userId,
        session_id: message.metadata.sessionId,
        trace_id: message.traceId,
      },
      timeout: skillConfig.timeout || 300,
    };
  }
}

// gRPC接口定义 (kunlun.proto)
syntax = "proto3";

package kunlun.v1;

service SkillEngine {
  rpc ExecuteSkill(SkillRequest) returns (SkillResponse);
  rpc StreamSkillExecution(stream SkillRequest) returns (stream SkillEvent);
  rpc GetSkillStatus(SkillStatusRequest) returns (SkillStatusResponse);
}

message SkillRequest {
  string skill_id = 1;
  string skill_version = 2;
  map<string, string> inputs = 3;
  SkillContext context = 4;
  int32 timeout = 5;
}

message SkillContext {
  string tenant_id = 1;
  string user_id = 2;
  string session_id = 3;
  string trace_id = 4;
}

message SkillResponse {
  string skill_id = 1;
  bool success = 2;
  map<string, string> outputs = 3;
  SkillMetrics metrics = 4;
  string error = 5;
}

message SkillMetrics {
  int64 execution_time_ms = 1;
  int32 tokens_used = 2;
  int32 tool_calls = 3;
}
```

---

### 2.3 Skill Engine（执行层）

#### 2.3.1 Skill核心接口

```python
# Skill核心接口
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum

class SkillStatus(Enum):
    LOADED = "loaded"
    RUNNING = "running"
    SUSPENDED = "suspended"
    FAILED = "failed"
    COMPLETED = "completed"

@dataclass
class SkillContext:
    """技能执行上下文"""
    skill_id: str
    skill_version: str
    tenant_id: str
    user_id: str
    session_id: str
    trace_id: str
    timeout: int = 300
    
    # 运行时注入
    tool_registry: 'ToolRegistry' = None
    memory_hub: 'MemoryHub' = None
    llm_gateway: 'LLMGateway' = None

@dataclass
class SkillResult:
    """技能执行结果"""
    skill_id: str
    success: bool
    outputs: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    
    def to_proto(self) -> 'SkillResponse':
        """转换为gRPC响应"""
        return SkillResponse(
            skill_id=self.skill_id,
            success=self.success,
            outputs=self.outputs,
            metrics=SkillMetrics(**self.metrics),
            error=self.error,
        )

# Skill基类
class KunlunSkill(ABC):
    """昆仑技能基类"""
    
    @abstractmethod
    async def execute(
        self,
        inputs: Dict[str, Any],
        context: SkillContext
    ) -> SkillResult:
        """执行技能"""
        pass
    
    @abstractmethod
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """验证输入"""
        pass
    
    async def pre_execute(self, context: SkillContext):
        """执行前钩子"""
        pass
    
    async def post_execute(
        self,
        result: SkillResult,
        context: SkillContext
    ):
        """执行后钩子"""
        pass
```

#### 2.3.2 Skill Loader实现

```python
# Skill加载器
import yaml
from pathlib import Path
from typing import Dict, Optional

class SkillLoader:
    """技能加载器"""
    
    def __init__(self, skill_store: 'SkillStore'):
        self.skill_store = skill_store
        self.loaded_skills: Dict[str, LoadedSkill] = {}
    
    async def load(self, skill_id: str, version: str = "latest") -> LoadedSkill:
        """加载技能"""
        cache_key = f"{skill_id}:{version}"
        
        # 检查缓存
        if cache_key in self.loaded_skills:
            return self.loaded_skills[cache_key]
        
        # 从存储加载
        skill_doc = await self.skill_store.get(skill_id, version)
        
        # 解析SKILL.md
        skill_config = self.parse_skill_doc(skill_doc.content)
        
        # 加载Python模块
        skill_module = await self.load_skill_module(skill_doc.path)
        
        # 创建LoadedSkill
        loaded_skill = LoadedSkill(
            skill_id=skill_id,
            version=skill_doc.version,
            config=skill_config,
            module=skill_module,
            instance=skill_module.Skill(),  # 实例化
        )
        
        # 缓存
        self.loaded_skills[cache_key] = loaded_skill
        
        return loaded_skill
    
    def parse_skill_doc(self, content: str) -> SkillConfig:
        """解析SKILL.md"""
        # YAML front matter解析
        if content.startswith('---'):
            parts = content.split('---', 2)
            yaml_content = parts[1]
            doc_content = parts[2] if len(parts) > 2 else ''
            
            config_dict = yaml.safe_load(yaml_content)
            config_dict['doc_content'] = doc_content
            
            return SkillConfig(**config_dict)
        
        raise SkillParseError("Invalid SKILL.md format")
    
    async def load_skill_module(self, skill_path: Path):
        """动态加载Python模块"""
        import importlib.util
        
        skill_file = skill_path / "skill.py"
        
        if not skill_file.exists():
            raise SkillLoadError(f"skill.py not found in {skill_path}")
        
        spec = importlib.util.spec_from_file_location(
            f"skill_{skill_path.name}",
            skill_file
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        return module
```

#### 2.3.3 Skill Executor实现

```python
# Skill执行器
import asyncio
from typing import Dict, Any

class SkillExecutor:
    """技能执行器"""
    
    def __init__(
        self,
        tool_registry: 'ToolRegistry',
        memory_hub: 'MemoryHub',
        evolution_engine: 'EvolutionEngine',
    ):
        self.tool_registry = tool_registry
        self.memory_hub = memory_hub
        self.evolution_engine = evolution_engine
    
    async def execute(
        self,
        loaded_skill: LoadedSkill,
        inputs: Dict[str, Any],
        context: SkillContext
    ) -> SkillResult:
        """执行技能"""
        start_time = time.time()
        
        try:
            # 1. 验证输入
            if not loaded_skill.instance.validate_inputs(inputs):
                raise SkillValidationError("Invalid inputs")
            
            # 2. 注入运行时依赖
            context.tool_registry = self.tool_registry
            context.memory_hub = self.memory_hub
            
            # 3. 执行前钩子
            await loaded_skill.instance.pre_execute(context)
            
            # 4. 执行技能（带超时控制）
            async with asyncio.timeout(context.timeout):
                result = await loaded_skill.instance.execute(inputs, context)
            
            # 5. 执行后钩子
            await loaded_skill.instance.post_execute(result, context)
            
            # 6. 记录执行轨迹（用于进化）
            await self.record_trajectory(
                loaded_skill.skill_id,
                inputs,
                result,
                success=True,
            )
            
            # 7. 更新指标
            result.metrics['execution_time_ms'] = int(
                (time.time() - start_time) * 1000
            )
            
            return result
            
        except asyncio.TimeoutError:
            return SkillResult(
                skill_id=loaded_skill.skill_id,
                success=False,
                error=f"Skill execution timeout ({context.timeout}s)",
            )
        except Exception as e:
            # 记录失败轨迹
            await self.record_trajectory(
                loaded_skill.skill_id,
                inputs,
                None,
                success=False,
                error=str(e),
            )
            
            return SkillResult(
                skill_id=loaded_skill.skill_id,
                success=False,
                error=str(e),
            )
    
    async def record_trajectory(
        self,
        skill_id: str,
        inputs: Dict[str, Any],
        result: Optional[SkillResult],
        success: bool,
        error: Optional[str] = None,
    ):
        """记录执行轨迹"""
        trajectory = Trajectory(
            skill_id=skill_id,
            inputs=inputs,
            outputs=result.outputs if result else None,
            success=success,
            error=error,
            timestamp=datetime.now(),
        )
        
        await self.evolution_engine.record_trajectory(trajectory)
```

#### 2.3.4 Tool Registry实现

```python
# 工具注册表
from typing import Callable, Dict, Any

class ToolRegistry:
    """工具注册表"""
    
    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self._register_builtin_tools()
    
    def register(self, name: str, tool: 'Tool'):
        """注册工具"""
        self.tools[name] = tool
    
    def get(self, name: str) -> 'Tool':
        """获取工具"""
        if name not in self.tools:
            raise ToolNotFoundError(f"Tool not found: {name}")
        return self.tools[name]
    
    def _register_builtin_tools(self):
        """注册内置工具（继承Hermes）"""
        # 文件操作
        self.register('read_file', ReadFileTool())
        self.register('write_file', WriteFileTool())
        
        # 搜索
        self.register('search_web', SearchWebTool())
        self.register('search_files', SearchFilesTool())
        
        # 终端
        self.register('execute_code', ExecuteCodeTool())
        self.register('terminal', TerminalTool())
        
        # LLM
        self.register('llm_inference', LLMInferenceTool())
        self.register('embed_text', EmbedTextTool())
        
        # 向量检索
        self.register('vector_search', VectorSearchTool())
        
        # ... 更多工具

# 工具基类
class Tool(ABC):
    """工具基类"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        pass
    
    @property
    @abstractmethod
    def parameters_schema(self) -> Dict[str, Any]:
        """JSON Schema格式的参数定义"""
        pass
    
    @abstractmethod
    async def execute(
        self,
        parameters: Dict[str, Any],
        context: ToolContext
    ) -> ToolResult:
        pass

# 文件读取工具示例
class ReadFileTool(Tool):
    """文件读取工具"""
    
    name = "read_file"
    description = "读取文件内容"
    
    parameters_schema = {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "文件路径",
            },
            "offset": {
                "type": "integer",
                "description": "起始行号",
                "default": 0,
            },
            "limit": {
                "type": "integer",
                "description": "读取行数",
                "default": 100,
            },
        },
        "required": ["file_path"],
    }
    
    async def execute(
        self,
        parameters: Dict[str, Any],
        context: ToolContext
    ) -> ToolResult:
        file_path = parameters['file_path']
        offset = parameters.get('offset', 0)
        limit = parameters.get('limit', 100)
        
        # 租户隔离检查
        if not self._check_tenant_access(file_path, context.tenant_id):
            raise PermissionError("Access denied")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()[offset:offset+limit]
                content = ''.join(lines)
            
            return ToolResult(
                success=True,
                output={
                    'content': content,
                    'lines_read': len(lines),
                }
            )
        except FileNotFoundError:
            return ToolResult(
                success=False,
                error=f"File not found: {file_path}",
            )
```

#### 2.3.5 Evolution Engine实现

```python
# 进化学习引擎
from typing import List, Dict
import numpy as np

class EvolutionEngine:
    """进化学习引擎"""
    
    def __init__(
        self,
        trajectory_store: 'TrajectoryStore',
        rl_trainer: 'RLTrainer',
        skill_patcher: 'SkillPatcher',
    ):
        self.trajectory_store = trajectory_store
        self.rl_trainer = rl_trainer
        self.skill_patcher = skill_patcher
        
        # 进化触发阈值
        self.min_trajectories = 100
        self.failure_rate_threshold = 0.2
        self.improvement_threshold = 0.05
    
    async def record_trajectory(self, trajectory: Trajectory):
        """记录执行轨迹"""
        await self.trajectory_store.save(trajectory)
        
        # 检查是否触发进化
        if await self._should_evolve(trajectory.skill_id):
            await self._run_evolution_cycle(trajectory.skill_id)
    
    async def _should_evolve(self, skill_id: str) -> bool:
        """判断是否触发进化"""
        # 获取最近24小时的轨迹数量
        recent_count = await self.trajectory_store.count(
            skill_id=skill_id,
            since=datetime.now() - timedelta(hours=24)
        )
        
        if recent_count < self.min_trajectories:
            return False
        
        # 计算失败率
        recent_trajectories = await self.trajectory_store.get_recent(
            skill_id=skill_id,
            limit=100
        )
        
        failure_rate = sum(
            1 for t in recent_trajectories if not t.success
        ) / len(recent_trajectories)
        
        return failure_rate >= self.failure_rate_threshold
    
    async def _run_evolution_cycle(self, skill_id: str):
        """执行进化周期"""
        logger.info(f"Starting evolution cycle for skill: {skill_id}")
        
        # 1. 收集轨迹数据
        trajectories = await self.trajectory_store.get_for_evolution(skill_id)
        
        # 2. 数据预处理
        processed_data = self._preprocess_trajectories(trajectories)
        
        # 3. RL训练
        training_result = await self.rl_trainer.train(
            data=processed_data,
            skill_id=skill_id,
        )
        
        # 4. 评估改进效果
        if training_result.improvement >= self.improvement_threshold:
            # 生成技能补丁
            patch = self._generate_patch(skill_id, training_result)
            
            # 应用补丁
            await self.skill_patcher.apply(skill_id, patch)
            
            logger.info(
                f"Skill evolved: {skill_id}, "
                f"improvement: {training_result.improvement:.2%}"
            )
        else:
            logger.info(
                f"Evolution skipped: improvement below threshold "
                f"({training_result.improvement:.2%})"
            )
    
    def _preprocess_trajectories(
        self,
        trajectories: List[Trajectory]
    ) -> ProcessedData:
        """预处理轨迹数据"""
        # 提取成功轨迹的模式
        successful = [t for t in trajectories if t.success]
        failed = [t for t in trajectories if not t.success]
        
        # 特征提取
        features = []
        rewards = []
        
        for t in trajectories:
            feature = self._extract_features(t)
            reward = self._calculate_reward(t)
            
            features.append(feature)
            rewards.append(reward)
        
        return ProcessedData(
            features=np.array(features),
            rewards=np.array(rewards),
            successful_count=len(successful),
            failed_count=len(failed),
        )
    
    def _calculate_reward(self, trajectory: Trajectory) -> float:
        """计算奖励分数"""
        if not trajectory.success:
            return 0.0
        
        # 基础奖励
        base_reward = 1.0
        
        # 效率惩罚
        execution_time = trajectory.metrics.get('execution_time_ms', 0)
        efficiency_penalty = execution_time * 0.0001
        
        # 质量奖励
        quality_score = trajectory.metrics.get('quality_score', 0)
        quality_bonus = quality_score * 0.1
        
        return max(0, base_reward - efficiency_penalty + quality_bonus)
    
    def _generate_patch(
        self,
        skill_id: str,
        training_result: TrainingResult
    ) -> SkillPatch:
        """生成技能补丁"""
        return SkillPatch(
            skill_id=skill_id,
            version=training_result.new_version,
            changes=training_result.changes,
            metrics_improvement=training_result.improvement,
            created_at=datetime.now(),
        )
```

---

### 2.4 LLM Gateway（对话层）

#### 2.4.1 模型路由器

```python
# 模型路由器
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class LLMRequest:
    """LLM请求"""
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096
    user_id: str = None
    tenant_id: str = None
    trace_id: str = None
    
    # 路由策略
    strategy: str = 'balanced'  # cost_optimized, latency_optimized, quality_optimized

@dataclass
class LLMResponse:
    """LLM响应"""
    content: str
    model: str
    usage: Dict[str, int]
    latency_ms: int
    cached: bool = False

class ModelRouter:
    """智能模型路由器"""
    
    def __init__(
        self,
        model_registry: 'ModelRegistry',
        cost_tracker: 'CostTracker',
        cache: 'ResponseCache',
    ):
        self.registry = model_registry
        self.cost_tracker = cost_tracker
        self.cache = cache
        
        self.strategies = {
            'cost_optimized': CostOptimizedStrategy(),
            'latency_optimized': LatencyOptimizedStrategy(),
            'quality_optimized': QualityOptimizedStrategy(),
            'balanced': BalancedStrategy(),
        }
    
    async def route(self, request: LLMRequest) -> LLMResponse:
        """路由LLM请求"""
        # 1. 检查缓存
        cached = await self.cache.get(request)
        if cached:
            return LLMResponse(
                content=cached.content,
                model='cached',
                usage={},
                latency_ms=0,
                cached=True,
            )
        
        # 2. 选择策略
        strategy = self.strategies[request.strategy]
        
        # 3. 选择模型
        model = await strategy.select_model(request, self.registry)
        
        # 4. 检查配额
        if not await self.cost_tracker.check_quota(
            request.tenant_id,
            estimated_tokens=self._estimate_tokens(request)
        ):
            raise QuotaExceededError(f"Tenant {request.tenant_id} quota exceeded")
        
        # 5. 调用模型
        start_time = time.time()
        try:
            response = await model.call(request)
            latency_ms = int((time.time() - start_time) * 1000)
            
            # 6. 记录使用
            await self.cost_tracker.record_usage(
                tenant_id=request.tenant_id,
                model=model.name,
                tokens=response.usage['total_tokens'],
                cost=self._calculate_cost(model, response.usage),
            )
            
            # 7. 缓存响应
            if self._should_cache(request, response):
                await self.cache.set(request, response)
            
            return LLMResponse(
                content=response.content,
                model=model.name,
                usage=response.usage,
                latency_ms=latency_ms,
            )
            
        except Exception as e:
            # 降级处理
            return await self._handle_fallback(request, model, e)

class CostOptimizedStrategy:
    """成本优先策略"""
    
    async def select_model(
        self,
        request: LLMRequest,
        registry: ModelRegistry
    ) -> Model:
        """选择成本最低的模型"""
        # 评估任务复杂度
        complexity = self._assess_complexity(request)
        
        if complexity == TaskComplexity.SIMPLE:
            # 简单任务用小模型
            return registry.get('gpt-3.5-turbo')
        elif complexity == TaskComplexity.MEDIUM:
            # 中等任务用中等模型
            return registry.get('gpt-4o-mini')
        else:
            # 复杂任务用大模型
            return registry.get('gpt-4o')
    
    def _assess_complexity(self, request: LLMRequest) -> TaskComplexity:
        """评估任务复杂度"""
        # 基于消息长度、关键词等判断
        total_length = sum(len(m.get('content', '')) for m in request.messages)
        
        if total_length < 500:
            return TaskComplexity.SIMPLE
        elif total_length < 2000:
            return TaskComplexity.MEDIUM
        else:
            return TaskComplexity.COMPLEX
```

#### 2.4.2 响应缓存

```python
# 响应缓存
import hashlib
from typing import Optional

class ResponseCache:
    """语义响应缓存"""
    
    def __init__(self, redis: Redis, embedder: 'Embedder'):
        self.redis = redis
        self.embedder = embedder
        self.similarity_threshold = 0.95
    
    async def get(self, request: LLMRequest) -> Optional[LLMResponse]:
        """获取缓存"""
        # 1. 生成查询向量
        query_text = self._messages_to_text(request.messages)
        query_embedding = await self.embedder.embed(query_text)
        
        # 2. 向量检索相似缓存
        similar_caches = await self._search_similar(query_embedding)
        
        if similar_caches:
            # 返回最相似的缓存
            best_match = similar_caches[0]
            if best_match['similarity'] >= self.similarity_threshold:
                return LLMResponse(
                    content=best_match['content'],
                    model='cached',
                    usage={},
                    latency_ms=0,
                    cached=True,
                )
        
        return None
    
    async def set(self, request: LLMRequest, response: LLMResponse):
        """设置缓存"""
        # 生成缓存键
        query_text = self._messages_to_text(request.messages)
        query_embedding = await self.embedder.embed(query_text)
        
        cache_key = self._generate_cache_key(request)
        
        # 存储缓存
        await self.redis.hset(
            f"llm_cache:{cache_key}",
            mapping={
                'content': response.content,
                'embedding': query_embedding.tobytes(),
                'model': response.model,
                'created_at': datetime.now().isoformat(),
            }
        )
        
        # 设置过期时间（24小时）
        await self.redis.expire(f"llm_cache:{cache_key}", 86400)
    
    def _messages_to_text(self, messages: List[Dict]) -> str:
        """将消息列表转为文本"""
        return '\n'.join(
            f"{m['role']}: {m['content']}"
            for m in messages
        )
```

---

## 三、数据层设计

### 3.1 数据库Schema

```sql
-- 租户表
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',  -- free, pro, enterprise
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    external_id VARCHAR(255),  -- 外部平台用户ID
    platform VARCHAR(50) NOT NULL,  -- feishu, wecom, etc.
    name VARCHAR(255),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_id)
);

-- Actor表
CREATE TABLE actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    actor_type VARCHAR(50) NOT NULL,  -- manager, worker, gateway, monitor
    skill_bindings JSONB DEFAULT '[]',
    config JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'stopped',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill表
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    description TEXT,
    config JSONB NOT NULL,  -- SKILL.md解析后的配置
    content TEXT NOT NULL,  -- SKILL.md原始内容
    author_id UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, version)
);

-- 会话表
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    platform VARCHAR(50) NOT NULL,
    channel_id VARCHAR(255),
    bound_actor_id UUID REFERENCES actors(id),
    state JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 执行轨迹表（进化学习）
CREATE TABLE trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    inputs JSONB NOT NULL,
    outputs JSONB,
    success BOOLEAN NOT NULL,
    error TEXT,
    reward FLOAT,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 记忆表
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID,
    session_id UUID REFERENCES sessions(id),
    memory_type VARCHAR(50) NOT NULL,  -- short_term, working, long_term, semantic
    key VARCHAR(255),
    content JSONB NOT NULL,
    embedding vector(1536),  -- OpenAI embedding维度
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 向量索引
CREATE INDEX idx_memories_embedding ON memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Token使用记录表
CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    cost_usd FLOAT NOT NULL,
    trace_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 分区（按月）
CREATE TABLE token_usage_2026_04 PARTITION OF token_usage
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

### 3.2 数据访问层

```python
# 数据访问层
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class ActorRepository:
    """Actor数据访问"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, actor: Actor) -> Actor:
        """创建Actor"""
        self.session.add(actor)
        await self.session.commit()
        return actor
    
    async def get(self, actor_id: str) -> Optional[Actor]:
        """获取Actor"""
        result = await self.session.execute(
            select(Actor).where(Actor.id == actor_id)
        )
        return result.scalar_one_or_none()
    
    async def find_by_tenant(
        self,
        tenant_id: str,
        actor_type: Optional[str] = None
    ) -> List[Actor]:
        """查找租户下的Actor"""
        query = select(Actor).where(Actor.tenant_id == tenant_id)
        
        if actor_type:
            query = query.where(Actor.actor_type == actor_type)
        
        result = await self.session.execute(query)
        return result.scalars().all()

class TrajectoryRepository:
    """执行轨迹数据访问"""
    
    async def save(self, trajectory: Trajectory):
        """保存轨迹"""
        self.session.add(trajectory)
        await self.session.commit()
    
    async def get_recent(
        self,
        skill_id: str,
        limit: int = 100
    ) -> List[Trajectory]:
        """获取最近的轨迹"""
        result = await self.session.execute(
            select(Trajectory)
            .where(Trajectory.skill_id == skill_id)
            .order_by(Trajectory.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
    
    async def count(
        self,
        skill_id: str,
        since: datetime
    ) -> int:
        """统计轨迹数量"""
        result = await self.session.execute(
            select(func.count(Trajectory.id))
            .where(Trajectory.skill_id == skill_id)
            .where(Trajectory.created_at >= since)
        )
        return result.scalar()
```

---

## 四、部署架构

### 4.1 Docker Compose（开发环境）

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Message Gateway + Actor Runtime (TypeScript)
  kunlun-gateway:
    build:
      context: ./packages/gateway
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
      - "50051:50051"  # gRPC
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - SKILL_ENGINE_URL=http://kunlun-skill:50052
      - DATABASE_URL=postgresql://kunlun:kunlun@postgres:5432/kunlun
    depends_on:
      - redis
      - postgres
      - kunlun-skill
    volumes:
      - ./packages/gateway:/app
      - /app/node_modules

  # Skill Engine + LLM Gateway (Python)
  kunlun-skill:
    build:
      context: ./packages/skill
      dockerfile: Dockerfile
    ports:
      - "50052:50052"  # gRPC
    environment:
      - PYTHON_ENV=development
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://kunlun:kunlun@postgres:5432/kunlun
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
      - postgres
      - qdrant
    volumes:
      - ./packages/skill:/app
      - ./skills:/app/skills

  # PostgreSQL
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=kunlun
      - POSTGRES_USER=kunlun
      - POSTGRES_PASSWORD=kunlun
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Qdrant (向量数据库)
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  # MinIO (对象存储)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=kunlun
      - MINIO_ROOT_PASSWORD=kunlun123
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  minio_data:
```

### 4.2 Kubernetes（生产环境）

```yaml
# kunlun-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kunlun-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kunlun-gateway
  template:
    metadata:
      labels:
        app: kunlun-gateway
    spec:
      containers:
      - name: gateway
        image: kunlun/gateway:latest
        ports:
        - containerPort: 8080
        - containerPort: 50051
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: kunlun-secrets
              key: redis-url
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kunlun-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kunlun-skill
spec:
  replicas: 5
  selector:
    matchLabels:
      app: kunlun-skill
  template:
    metadata:
      labels:
        app: kunlun-skill
    spec:
      containers:
      - name: skill
        image: kunlun/skill:latest
        ports:
        - containerPort: 50052
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: kunlun-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "1"
          limits:
            memory: "2Gi"
            cpu: "2"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kunlun-skill-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kunlun-skill
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
---
apiVersion: v1
kind: Service
metadata:
  name: kunlun-gateway
spec:
  selector:
    app: kunlun-gateway
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: grpc
    port: 50051
    targetPort: 50051
  type: LoadBalancer
```

---

## 五、开发计划

### 5.1 Phase 1: 核心奠基（2026 Q2-Q3）

#### Week 1-4: 基础设施

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| 项目初始化 | 架构师 | monorepo结构、CI/CD配置 | 无 |
| 数据库Schema设计 | 后端 | SQL脚本、ORM模型 | 无 |
| gRPC接口定义 | 架构师 | kunlun.proto | 无 |
| Docker Compose环境 | DevOps | docker-compose.yml | 无 |

#### Week 5-8: Message Gateway

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| 飞书适配器 | 前端 | FeishuAdapter | 无 |
| 企微适配器 | 前端 | WecomAdapter | 无 |
| 消息路由器 | 前端 | MessageRouter | 适配器 |
| 身份认证 | 后端 | AuthGateway | 数据库 |

#### Week 9-12: Actor Runtime

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Actor Mesh | 后端 | ActorMesh类 | gRPC接口 |
| Dispatcher | 后端 | Dispatcher类 | Actor Mesh |
| Supervisor | 后端 | Supervisor类 | Actor Mesh |
| Actor-Skill桥接 | 架构师 | SkillBridge | gRPC客户端 |

#### Week 13-16: Skill Engine

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Skill Loader | AI | SkillLoader类 | 无 |
| Skill Executor | AI | SkillExecutor类 | Tool Registry |
| Tool Registry | AI | ToolRegistry类 | 无 |
| 第一个技能示例 | AI | 环评审查技能 | 全部 |

### 5.2 Phase 2: 能力增强（2026 Q3-Q4）

| 模块 | 核心任务 | 时间 |
|------|---------|------|
| **Evolution Engine** | 轨迹记录、RL训练、技能补丁 | 6周 |
| **Memory Hub** | 多级存储、语义检索 | 4周 |
| **LLM Gateway** | 模型路由、响应缓存、Token管理 | 4周 |
| **企业级功能** | 多租户隔离、权限控制、审计日志 | 6周 |

### 5.3 Phase 3: 生态建设（2026 Q4 - 2027 Q1）

| 模块 | 核心任务 | 时间 |
|------|---------|------|
| **技能市场** | 平台开发、支付集成 | 8周 |
| **开发者工具** | CLI、SDK、文档生成 | 6周 |
| **垂直方案** | 昆仑·环评完整实现 | 8周 |
| **Kunlun Cloud** | 云服务平台、计量计费 | 8周 |

---

## 六、技术风险与缓解

### 6.1 风险矩阵

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|---------|
| **双语言通信延迟** | 中 | 中 | gRPC高效序列化、连接池复用 |
| **状态同步复杂度** | 中 | 高 | 事件溯源、CRDT数据结构 |
| **进化学习不稳定** | 中 | 中 | 人工审核机制、版本回滚 |
| **向量检索性能** | 低 | 中 | 分片索引、混合检索 |
| **多租户隔离失效** | 低 | 极高 | Schema隔离、权限审计 |

### 6.2 技术债务管理

```
技术债务管理策略：

1. 代码规范
   - TypeScript: ESLint + Prettier
   - Python: Black + isort + mypy
   - 提交前自动检查

2. 测试覆盖
   - 单元测试覆盖率 > 80%
   - 集成测试覆盖核心流程
   - E2E测试覆盖关键场景

3. 文档同步
   - API文档自动生成
   - 架构决策记录（ADR）
   - 每月技术评审

4. 重构计划
   - 每个Sprint预留20%时间
   - 季度技术债务清理周
```

---

## 七、关键接口文档

### 7.1 gRPC接口（Actor ↔ Skill）

```protobuf
syntax = "proto3";

package kunlun.v1;

// Actor Runtime → Skill Engine
service SkillEngine {
  // 同步执行技能
  rpc ExecuteSkill(SkillRequest) returns (SkillResponse);
  
  // 流式执行技能（长时间任务）
  rpc StreamSkillExecution(SkillRequest) returns (stream SkillEvent);
  
  // 技能状态查询
  rpc GetSkillStatus(SkillStatusRequest) returns (SkillStatusResponse);
}

message SkillRequest {
  string skill_id = 1;
  string skill_version = 2;
  map<string, string> inputs = 3;
  SkillContext context = 4;
  int32 timeout_seconds = 5;
}

message SkillContext {
  string tenant_id = 1;
  string user_id = 2;
  string session_id = 3;
  string trace_id = 4;
  map<string, string> metadata = 5;
}

message SkillResponse {
  string skill_id = 1;
  bool success = 2;
  map<string, string> outputs = 3;
  SkillMetrics metrics = 4;
  string error = 5;
}

message SkillMetrics {
  int64 execution_time_ms = 1;
  int32 tokens_used = 2;
  int32 tool_calls = 3;
  float quality_score = 4;
}

message SkillEvent {
  enum EventType {
    STARTED = 0;
    PROGRESS = 1;
    TOOL_CALL = 2;
    COMPLETED = 3;
    FAILED = 4;
  }
  
  EventType type = 1;
  string message = 2;
  map<string, string> data = 3;
  int64 timestamp = 4;
}
```

### 7.2 REST API（外部接入）

```yaml
openapi: 3.0.0
info:
  title: Kunlun API
  version: 1.0.0

paths:
  /api/v1/chat:
    post:
      summary: 对话接口
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                session_id:
                  type: string
                context:
                  type: object
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatResponse'

  /api/v1/skills:
    get:
      summary: 列出技能
      parameters:
        - name: q
          in: query
          schema:
            type: string
        - name: category
          in: query
          schema:
            type: string
      responses:
        '200':
          description: 成功

  /api/v1/skills/{skill_id}/execute:
    post:
      summary: 执行技能
      parameters:
        - name: skill_id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                inputs:
                  type: object
                options:
                  type: object
      responses:
        '200':
          description: 成功

components:
  schemas:
    ChatResponse:
      type: object
      properties:
        response:
          type: string
        session_id:
          type: string
        skill_used:
          type: string
        metrics:
          type: object
```

---

## 八、下一步行动

### 8.1 立即行动项

- [ ] **源码深度分析完成** - 补充OpenCLAW和Hermes的具体实现细节
- [ ] **搭建开发环境** - Docker Compose一键启动
- [ ] **实现gRPC通信示例** - TypeScript调用Python
- [ ] **开发第一个适配器** - 飞书平台
- [ ] **开发第一个技能** - 环评报告审查

### 8.2 本周目标

1. 完成源码分析报告
2. 搭建monorepo项目结构
3. 定义gRPC接口
4. 启动数据库Schema设计

---

**文档版本**: v1.0  
**编写日期**: 2026-04-17  
**下次更新**: 源码分析完成后补充细节
