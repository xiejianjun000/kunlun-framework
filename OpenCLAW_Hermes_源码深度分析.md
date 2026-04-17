# OpenCLAW & Hermes Agent 源码深度分析报告

**为昆仑系统架构设计提供技术基座分析**

---

## 一、OpenCLAW 源码分析

### 1.1 仓库概览

| 指标 | 数据 |
|------|------|
| GitHub Stars | 169k+ |
| Forks | 27k+ |
| Commits | 9,008+ |
| 语言 | TypeScript/Node.js |
| 许可证 | MIT |
| 作者 | Peter Steinberger (@steipete) |

### 1.2 仓库结构分析

```
openclaw/
├── src/                           # 核心源码
│   ├── gateway/                   # WebSocket/HTTP 控制平面
│   │   ├── server.ts              # WS服务器核心
│   │   ├── protocol.ts            # JSON-RPC协议
│   │   ├── cron.ts                # 定时任务服务
│   │   └── health.ts              # 健康检查
│   ├── agents/                    # Agent 运行时 (1,074文件, ~235K行)
│   │   ├── runtime/               # Pi RPC Agent封装
│   │   ├── tool-executor/         # 工具执行器
│   │   ├── sandbox/               # Docker沙箱隔离
│   │   └── sessions/              # 会话管理
│   ├── auto-reply/                # 消息处理流水线 (373文件, ~86K行)
│   │   ├── dispatch/              # 消息分发
│   │   ├── queue/                 # 队列管理
│   │   └── approval/             # 审批处理
│   ├── channels/                  # 通道抽象层 (201文件, ~29K行)
│   │   ├── registry/              # 通道注册
│   │   └── adapters/              # 适配器
│   ├── config/                    # 配置系统 (285文件, ~82K行)
│   │   ├── schemas/               # Zod验证模式
│   │   └── store/                # 会话存储
│   ├── infra/                    # 基础设施 (571文件, ~108K行)
│   │   ├── retry/                # 重试机制
│   │   ├── security/             # 安全执行
│   │   └── delivery/             # 消息投递
│   └── tasks/                    # 任务控制平面
│       └── SQLite-backed/         # 持久化任务注册表
├── extensions/                    # 插件系统 (112扩展目录, 99扩展包)
│   ├── telegram/
│   ├── discord/
│   ├── whatsapp/
│   ├── feishu/
│   └── memory-core/              # 记忆核心
├── apps/                         # 客户端应用
│   ├── macos/                    # macOS菜单栏
│   └── ios-android/              # 移动节点
├── ui/                          # Web UI
├── packages/                    # 独立包
└── skills/                      # 技能目录
```

### 1.3 核心模块详解

#### 1.3.1 Gateway 模块 (控制平面)

**架构定位**：Hub-and-Spoke 模型的中心枢纽

```
┌─────────────────────────────────────────────────────────────┐
│                      Gateway                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ WS Server   │  │ HTTP API    │  │ RPC Methods     │   │
│  │ (18789)     │  │ (OpenAI兼容)│  │ (JSON-RPC)     │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Session Mgr │  │ Channel Mgr │  │ Cron Service    │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Plugin Mgr  │  │ Tool Router │  │ Health Probes  │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**核心职责**：
- WebSocket 控制平面（CLI/TUI客户端连接）
- OpenAI 兼容 HTTP API
- 会话管理和路由
- 插件生命周期管理
- Cron 定时任务调度
- 健康检查 (`/health`, `/ready`, `/healthz`, `/readyz`)

#### 1.3.2 Agent Runtime 模块

**文件**: `src/agents/runtime/`

```typescript
// 核心Agent循环
class AgentRuntime {
  async runLoop(ctx: AgentContext): Promise<void> {
    // 1. 构建上下文 (会话历史 + 系统提示 + 记忆)
    const context = await this.contextBuilder.build(ctx);
    
    // 2. 调用LLM推理
    const response = await this.llm.complete(context);
    
    // 3. 执行工具调用
    while (response.hasToolCalls()) {
      const results = await this.toolExecutor.execute(
        response.toolCalls
      );
      
      // 4. 将工具结果加入上下文
      context.addToolResults(results);
      
      // 5. 再次调用LLM
      const nextResponse = await this.llm.complete(context);
      response = nextResponse;
    }
    
    // 6. 返回最终响应
    await this.deliverResponse(response);
  }
}
```

**关键组件**：
| 组件 | 职责 | 文件路径 |
|------|------|----------|
| Model Selector | 模型选择与故障转移 | `agents/model-selector.ts` |
| Tool Executor | 工具注册与执行 | `agents/tool-executor.ts` |
| Sandbox Manager | Docker沙箱隔离 | `agents/sandbox/` |
| Session Manager | 会话状态管理 | `agents/sessions/` |
| Auth Profiles | 认证轮换 | `agents/auth-profiles.ts` |

#### 1.3.3 SubAgent 机制

OpenCLAW 支持父子委托模式的 SubAgent：

```typescript
// sessions_spawn - 创建子Agent
interface SpawnParams {
  task: string;           // 任务描述
  agentId?: string;        // 指定Agent ID
  tools?: Tool[];          // 工具限制
  model?: string;          // 模型选择
}

// 子Agent隔离执行
const childAgent = await sessions.spawn({
  task: "分析这段代码的复杂度",
  tools: ["read_file", "bash"],  // 限制可用工具
  model: "claude-sonnet"
});
```

**隔离机制**：
- 独立会话上下文
- Docker 沙箱执行
- 工具白名单限制
- 结果通过 WS 事件回调

#### 1.3.4 Agent-to-Agent 通信

OpenCLAW 提供 `sessions_*` 工具集实现跨会话通信：

```typescript
// 1. 发现活跃会话
const sessions = await sessions_list();

// 2. 获取会话历史
const history = await sessions_history({
  sessionId: "xxx",
  limit: 50
});

// 3. 发送消息给其他Agent
await sessions_send({
  toSessionId: "yyy",
  message: "帮我处理这个任务",
  replyBack: true,        // 等待回复
  announceStep: true       // 通知进度
});
```

### 1.4 技术优势

| 维度 | 优势 | 实现机制 |
|------|------|----------|
| **并发处理** | Actor模型 + WS事件驱动 | 异步消息队列、无阻塞IO |
| **多智能体协作** | sessions_* 工具集 | 跨会话通信协议 |
| **工具生态** | 112个扩展插件 | 动态加载、TypeBox类型 |
| **安全沙箱** | Docker容器隔离 | per-session沙箱 |
| **扩展性** | Plugin SDK | registerChannel/Tool/Method |
| **多通道** | 15+消息平台适配 | 统一Channel抽象 |

### 1.5 架构特点

```
技术栈:
├── 运行时: Node.js ≥22
├── 语言: TypeScript (全程类型)
├── 构建: pnpm + tsdown
├── 测试: Vitest
├── 验证: Zod schemas
├── 配置: JSON5 (openclaw.json)
└── 部署: Docker / Nix / Systemd
```

---

## 二、Hermes Agent 源码分析

### 2.1 仓库概览

| 指标 | 数据 |
|------|------|
| GitHub Stars | 84.9k |
| Forks | 11.5k |
| Commits | 4,427+ |
| 语言 | Python 93% |
| 许可证 | MIT |
| 作者 | Nous Research (@teknium1) |

### 2.2 仓库结构分析

```
hermes-agent/
├── agent/                        # 核心Agent引擎
│   ├── context_engine.py         # 可插拔上下文引擎
│   ├── context_compressor.py     # 上下文压缩器
│   ├── memory_manager.py         # 记忆管理器
│   ├── prompt_builder.py         # 提示构建器
│   ├── smart_model_routing.py    # 智能模型路由
│   ├── lcm/                      # Lossless Context Management
│   │   ├── engine.py             # LCM核心引擎
│   │   ├── store.py              # 不可变消息存储
│   │   ├── dag.py                # 摘要DAG
│   │   ├── dam/                  # Dense Associative Memory
│   │   └── hrr/                  # Holographic RR存储
│   └── subagents/               # 子Agent支持
├── gateway/                      # 网关服务
│   ├── run.py                   # 网关入口
│   └── adapters/                # 平台适配器
├── tools/                       # 工具系统
│   ├── skill_tools.py           # 技能管理工具
│   ├── memory_tools.py          # 记忆工具
│   ├── cronjob_tools.py         # 定时任务工具
│   └── skills/                  # 内置技能
├── skills/                      # 技能库
│   ├── SKILL.md                 # 技能定义规范
│   └── agentskills.io/          # 技能标准
├── cron/                        # Cron调度器
├── environments/                # 执行环境
├── plugins/                     # 插件系统
└── web/                        # Web界面
```

### 2.3 五层架构

Hermes Agent 采用 **Layered Architecture** 设计：

```
┌──────────────────────────────────────────────────────────────┐
│                    Layer 5: 应用层                           │
│         (CLI / Telegram / Discord / Web / Mobile)            │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                    Layer 4: 网关层                           │
│         (Gateway / Adapters / Session Management)            │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                    Layer 3: 核心引擎层                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ContextEngine │ │MemoryManager │ │PromptBuilder │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐                                       │
│  │SmartRouting  │  ← 可插拔、配置驱动、可独立替换        │
│  └──────────────┘                                       │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                    Layer 2: 模型层                          │
│       (OpenAI / Anthropic / DeepSeek / Ollama / vLLM)       │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                    Layer 1: 工具层                          │
│   (内置工具 + MCP扩展 + Skill技能 + Plugin插件)              │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 核心引擎详解

#### 2.4.1 ContextEngine (上下文引擎)

**文件**: `agent/context_engine.py`

```python
class ContextEngine(ABC):
    """可插拔上下文管理的抽象基类"""
    
    async def on_session_start(self, session: Session) -> None:
        """加载持久化状态"""
        pass
    
    async def update_from_response(self, response: ModelResponse) -> None:
        """每次API调用后更新token计数"""
        pass
    
    async def should_compress(self) -> bool:
        """判断是否触发压缩"""
        pass
    
    async def compress(self) -> List[Message]:
        """执行压缩，返回新的message list"""
        pass
    
    async def on_session_end(self) -> None:
        """会话真正结束时调用"""
        pass
    
    # 可选: 暴露自定义工具
    def get_tool_schemas(self) -> List[ToolSchema]:
        """返回自定义工具schema"""
        pass
    
    async def handle_tool_call(self, tool: Tool) -> ToolResult:
        """处理工具调用"""
        pass
```

**生命周期流程**:
```
on_session_start() → update_from_response() × N → should_compress() → compress()
     ↑                                                           ↓
     └──────────────────── on_session_end() ←───────────────────┘
```

#### 2.4.2 ContextCompressor (默认压缩器)

**文件**: `agent/context_compressor.py`

**四阶段压缩算法**:

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 旧工具输出裁剪 (无LLM, 快速预过滤)                   │
│  - 超过200字符的旧tool_result替换为占位符                      │
│  - 节省大量token (文件内容/终端输出等)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 确定边界                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [0...9] ← protect_first_n (系统+前几条)                │ │
│  │ [3...N]  ← 中间区域 → SUMMARIZED                        │ │
│  │ [N...end]← tail (按token预算或protect_last_n)          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 生成结构化摘要 (LLM辅助)                            │
│  - 迭代式摘要: 保留旧摘要 + 新增进展                          │
│  - Handoff框架: 告诉模型"这是背景参考，不是指令"              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: 组装 + Tool Pair清理                               │
│  - 修复孤立的tool_call/tool_result对                         │
│  - 边界对齐，避免切割工具对                                  │
└─────────────────────────────────────────────────────────────┘
```

**五大设计精华**:

| 设计 | 说明 | 实现 |
|------|------|------|
| 迭代式摘要 | 增量更新而非从头总结 | `_previous_summary` 存储上次摘要 |
| Handoff框架 | "这是交班参考，不是新指令" | `SUMMARY_PREFIX` 标记 |
| Token预算制 | 动态确定尾部保护范围 | `_find_tail_cut_by_tokens()` |
| 焦点压缩 | 相关信息保留更多预算 | `/compact <topic>` 支持 |
| 关键常量 | 防御性设计 | 2000min/0.20ratio/12000ceiling |

**防御性设计**:
```python
def _sanitize_tool_pairs(messages: List[Message]) -> List[Message]:
    """压缩后修复孤立的tool_call/tool_result对"""
    # 移除孤立的tool_results
    # 为缺失结果的tool_calls插入stub
    pass

def _align_boundary_forward/backward():
    """边界不对齐在工具对中间"""
    pass
```

#### 2.4.3 MemoryManager (记忆管理器)

**文件**: `agent/memory_manager.py`

```python
class MemoryManager:
    def __init__(self, memory_providers: List[MemoryProvider]):
        self.providers = memory_providers
        self.builtin = BuiltinMemoryProvider()  # MEMORY.md / USER.md
        self.external = external_providers[0] if external_providers else None
    
    async def prefetch_all(self, query: str) -> str:
        """每轮开始前收集上下文"""
        contexts = []
        for provider in self.providers:
            ctx = await provider.recall(query)
            contexts.append(ctx)
        return "\n\n".join(contexts)
    
    async def sync_all(self, new_info: Dict):
        """每轮结束后写入后端"""
        for provider in self.providers:
            await provider.store(new_info)
    
    async def on_pre_compress(self, messages: List[Message]) -> str:
        """压缩前抢救关键信息"""
        # 关键钩子：让重要信息在压缩时被保留
        pass
```

**核心文件**:
| 文件 | 用途 |
|------|------|
| `MEMORY.md` | 环境事实、经验教训 |
| `USER.md` | 用户偏好 |
| `memories/` | SQLite FTS5 全文搜索 |

#### 2.4.4 LCM (Lossless Context Management)

**三层记忆架构**:

```
┌─────────────────────────────────────────────────────────────┐
│  L1 Hot (Within-turn) — LCM                                 │
│  - Modern Hopfield Network                                  │
│  - 实时LLM摘要 (L1/L2/L3 escalation)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  L2 Warm (Within-session) — DAM                            │
│  - Dense Associative Memory                                 │
│  - 纯NumPy实现                                             │
│  - 2048维单位向量，三元组哈希编码                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  L3 Cold (Cross-session) — HRR Store                       │
│  - Holographic Reduced Representations                     │
│  - SQLite + FTS5 持久化知识存储                             │
│  - 实体解析 + 信任评分                                     │
└─────────────────────────────────────────────────────────────┘
```

**核心模块**:
| 文件 | 职责 |
|------|------|
| `engine.py` | 编排ingest、thresholds、compaction、expand |
| `store.py` | 不可变追加消息存储 |
| `dag.py` | 摘要DAG，递归源追踪 |
| `escalation.py` | 3级: preserve_details → bullet_points → deterministic |

#### 2.4.5 SmartModelRouting (智能路由)

```python
def route(self, message: str, context: Dict) -> ModelConfig:
    """if-else保守策略"""
    
    # 复杂查询 → 主模型
    if (len(message) > 160 or 
        word_count > 28 or 
        has_codeblock or 
        has_url or 
        has_complex_keywords):
        return self.primary_model  # routing_reason: "complex_query"
    
    # 简单查询 → 廉价模型
    else:
        return self.cheap_model    # routing_reason: "simple_turn"
```

### 2.5 Skill 技能系统

#### 2.5.1 SKILL.md 规范

```yaml
---
name: "环评报告合规审查"
version: "1.0.0"
description: "自动审查环评报告的合规性"
tags: ["legal", "review", "environmental"]
category: "compliance"

inputs:
  - name: "report_file"
    type: "file"
    description: "环评报告PDF文件"

outputs:
  - name: "review_result"
    type: "json"
    description: "审查结果JSON"

steps:
  - "使用RAGFlow提取报告关键信息"
  - "与法规知识库进行比对"
  - "生成合规性审查意见"
  - "进行Self-Consistency验证"

triggers:
  - "审查环评报告"
  - "合规检查"

requirements:
  - "python>=3.10"
  - "ragflow_client"

tool_restrictions:
  allowed: ["read_file", "write_file", "search"]
  denied: ["exec", "network"]
---

# Skill Content (Level 0/1/2)
```

#### 2.5.2 自学习机制

```
触发时机:
┌─────────────────────────────────────────────────────────────┐
│  前台自觉 (系统提示引导)                                      │
│  - 5+工具调用复杂任务完成                                    │
│  - 发现非显而易见但可复用工作流                              │
│  - 调用 skill_manage(action='create')                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  后台巡检 (异步兜底)                                         │
│  - 工具调用累计计数 (_iters_since_skill ≥ 10)               │
│  - review_agent 判断是否需要沉淀                             │
└─────────────────────────────────────────────────────────────┘
```

**自修复机制**:
```python
# 当技能过时/错误时，Agent主动patch
skill_manage(
    action="patch",
    name="feature-publish",
    old_string="https://old-registry.xx.xx",
    new_string="https://registry.xx.xx"
)
```

### 2.6 技术优势

| 维度 | 优势 | 实现机制 |
|------|------|----------|
| **学习进化** | GEPA自我进化引擎 | 100-500次收敛策略迭代 |
| **记忆系统** | LCM三层架构 | L1热/L2温/L3冷分层 |
| **上下文管理** | 迭代式摘要+Tool Pair清理 | 5倍压缩率、结构化交接 |
| **技能自学习** | 前后台双重触发 | 前台自觉+后台巡检 |
| **安全机制** | Prompt注入扫描 | 红队模式检测 |
| **多模型** | 200+模型零锁定 | OpenRouter统一路由 |

---

## 三、整合方案设计

### 3.1 优势对比矩阵

| 维度 | OpenCLAW | Hermes | 昆仑框架建议 |
|------|----------|--------|-------------|
| **并发处理** | ⭐⭐⭐⭐⭐ Actor模型 | ⭐⭐⭐ SubAgent | **复用OpenCLAW** |
| **多智能体协作** | ⭐⭐⭐⭐ sessions_* | ⭐⭐⭐ ACP协议 | **整合两者** |
| **AI对话能力** | ⭐⭐⭐⭐ Pi RPC | ⭐⭐⭐⭐⭐ ContextEngine | **复用Hermes** |
| **工具生态** | ⭐⭐⭐⭐⭐ 112扩展 | ⭐⭐⭐⭐ 70+技能 | **整合两者** |
| **学习进化** | ⭐⭐ ClawHub | ⭐⭐⭐⭐⭐ GEPA | **复用Hermes** |
| **记忆系统** | ⭐⭐⭐ 双层文本 | ⭐⭐⭐⭐⭐ LCM三层 | **复用Hermes** |
| **企业级功能** | ⭐⭐⭐⭐ Docker沙箱 | ⭐⭐⭐ 安全体系 | **整合两者** |
| **开发效率** | ⭐⭐⭐ TypeScript | ⭐⭐⭐⭐ Python生态 | **可选** |
| **扩展性** | ⭐⭐⭐⭐ Plugin SDK | ⭐⭐⭐⭐ 可插拔引擎 | **整合两者** |
| **多通道** | ⭐⭐⭐⭐⭐ 15+平台 | ⭐⭐⭐⭐ 15+平台 | **复用OpenCLAW** |

### 3.2 整合策略

#### 3.2.1 直接复用组件

| 组件 | 来源 | 原因 |
|------|------|------|
| **Actor Runtime** | OpenCLAW | 成熟的WS控制平面、事件驱动并发 |
| **Channel Adapters** | OpenCLAW | 15+平台适配器、动态加载 |
| **Plugin SDK** | OpenCLAW | 112扩展生态、TypeBox类型安全 |
| **ContextEngine** | Hermes | 可插拔架构、生命周期管理 |
| **LCM记忆** | Hermes | 三层记忆、HRR持久化 |
| **Skill自学习** | Hermes | GEPA进化、迭代摘要 |
| **SmartRouting** | Hermes | 成本优化、简单查询路由 |

#### 3.2.2 需要重新设计

| 组件 | 设计目标 |
|------|----------|
| **LLM Gateway** | 统一接口：整合OpenCLAW的Pi RPC + Hermes的模型路由 |
| **任务编排引擎** | 整合sessions_* + ACP，支持子Agent树形结构 |
| **企业安全层** | 合并Docker沙箱 + GEPA安全扫描 |
| **Skill运行时** | 整合SKILL.md + Plugin SDK，统一技能加载 |

#### 3.2.3 架构冲突解决

```
冲突点1: TypeScript vs Python
├── OpenCLAW: Node.js/TypeScript
├── Hermes: Python
└── 昆仑方案: 
    ├── 核心层: Python (AI能力强)
    ├── 网关层: TypeScript/Go (高并发)
    └── IPC: gRPC 跨语言通信

冲突点2: Actor vs Event Loop
├── OpenCLAW: WebSocket事件驱动
├── Hermes: asyncio协程
└── 昆仑方案:
    ├── 网关层: 保持WS事件驱动
    └── Agent层: 使用asyncio整合
```

### 3.3 昆仑框架核心架构

```
┌────────────────────────────────────────────────────────────────────┐
│                         昆仑框架 (Kunlun Framework)                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Layer 5: 接入层                              │ │
│  │    CLI │ Web UI │ Mobile │ 15+ Messaging Platforms            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Layer 4: Gateway 控制平面 (Go/TS)                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │ WS Server│  │ HTTP API │  │ Channel  │  │ Session  │      │ │
│  │  │ (OpenCLAW)│  │ (REST)   │  │ Registry │  │ Manager  │      │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │ gRPC                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Layer 3: Agent Runtime (Python)                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │              ContextEngine (Hermes风格)                  │  │ │
│  │  │   ContextCompressor │ LCM │ MemoryManager │ PromptBuilder│  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │ SmartRouting │  │ SubAgent Mgr │  │ Skill Engine │        │ │
│  │  │  (Hermes)    │  │  (整合)      │  │  (Hermes)    │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Layer 2: 工具与技能层                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │内置工具  │  │MCP扩展   │  │SKILL技能 │  │Plugin插件│      │ │
│  │  │          │  │          │  │(自学习)  │  │(OpenCLAW)│      │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Layer 1: 模型层                                    │ │
│  │  OpenAI │ Anthropic │ DeepSeek │ Ollama │ vLLM │ OpenRouter   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 3.4 核心组件详细设计

#### 3.4.1 Actor Runtime 层 (基于OpenCLAW)

```python
# kunlun/actor_runtime.py
from typing import Dict, List, Any
from dataclasses import dataclass
import asyncio

@dataclass
class ActorMessage:
    """Actor消息格式"""
    type: str           # "spawn" | "send" | "cast" | "reply"
    from_id: str
    to_id: str
    content: Any
    reply_to: str = None

class ActorRuntime:
    """整合OpenCLAW的Actor模型"""
    
    def __init__(self):
        self.actors: Dict[str, Actor] = {}
        self.mailbox: asyncio.Queue = asyncio.Queue()
    
    async def spawn(
        self, 
        actor_type: str,
        config: Dict,
        parent: str = None
    ) -> str:
        """创建子Actor"""
        actor_id = self._generate_id()
        actor = Actor(
            id=actor_id,
            type=actor_type,
            config=config,
            parent=parent,
            runtime=self
        )
        self.actors[actor_id] = actor
        await actor.initialize()
        return actor_id
    
    async def send(self, message: ActorMessage) -> Any:
        """发送同步消息 (等待回复)"""
        target = self.actors.get(message.to_id)
        if not target:
            raise ActorNotFound(message.to_id)
        return await target.handle(message)
    
    async def cast(self, message: ActorMessage):
        """发送异步消息 (不等待)"""
        await self.mailbox.put(message)
```

#### 3.4.2 Skill Engine 层 (基于Hermes)

```python
# kunlun/skill_engine.py
from typing import Dict, List, Optional
from dataclasses import dataclass
import yaml

@dataclass
class SkillManifest:
    """技能清单"""
    name: str
    version: str
    description: str
    tags: List[str]
    category: str
    inputs: List[Dict]
    outputs: List[Dict]
    steps: List[str]
    triggers: List[str]
    requirements: List[str]
    tool_restrictions: Dict

class SkillEngine:
    """整合Hermes的Skill自学习系统"""
    
    def __init__(self, workspace: str):
        self.workspace = workspace
        self.skills: Dict[str, SkillManifest] = {}
        self.learner = GEPAEngine()  # 复用Hermes的GEPA
    
    async def load_skills(self):
        """加载工作区技能"""
        skill_paths = Path(self.workspace) / "skills"
        for skill_file in skill_paths.glob("*/SKILL.md"):
            manifest = self._parse_skill_md(skill_file)
            self.skills[manifest.name] = manifest
    
    async def auto_create_skill(
        self,
        task_context: Dict,
        tool_calls: List[Dict],
        result: Any
    ) -> Optional[str]:
        """自动创建技能 (Hermes风格)"""
        
        # 触发条件: 5+工具调用
        if len(tool_calls) < 5:
            return None
        
        # 调用GEPA评估
        should_create = await self.learner.evaluate(task_context)
        
        if should_create:
            skill_md = await self._generate_skill_md(
                task_context, tool_calls, result
            )
            skill_name = self._save_skill(skill_md)
            return skill_name
        
        return None
    
    async def auto_patch_skill(
        self,
        skill_name: str,
        error_context: Dict
    ) -> bool:
        """自动修补技能"""
        
        # 分析错误原因
        if await self._is_skill_issue(error_context):
            old_content = self._get_skill_content(skill_name)
            new_content = await self._generate_patch(
                old_content, error_context
            )
            self._save_skill(new_content)
            return True
        
        return False
```

#### 3.4.3 LLM Gateway 层 (整合两者)

```python
# kunlun/llm_gateway.py
from typing import Dict, Optional, List
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """LLM提供商抽象"""
    
    @abstractmethod
    async def complete(self, messages: List[Dict]) -> Dict:
        pass
    
    @abstractmethod
    def get_context_window(self) -> int:
        pass

class LLMGateway:
    """整合OpenCLAW + Hermes的模型层"""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self.router = SmartModelRouter()  # 复用Hermes
    
    def register_provider(self, name: str, provider: LLMProvider):
        self.providers[name] = provider
    
    async def complete(
        self, 
        messages: List[Dict],
        strategy: str = "auto"
    ) -> Dict:
        """统一推理接口"""
        
        if strategy == "auto":
            # 使用Hermes的SmartRouting
            config = self.router.route(messages)
            provider = self.providers[config.model]
        else:
            provider = self.providers[strategy]
        
        return await provider.complete(messages)
    
    async def parallel_complete(
        self,
        messages: List[Dict],
        models: List[str]
    ) -> Dict[str, Dict]:
        """并行调用多模型 (选举/投票)"""
        tasks = [
            self.providers[model].complete(messages)
            for model in models
        ]
        results = await asyncio.gather(*tasks)
        return dict(zip(models, results))
```

#### 3.4.4 记忆系统层 (基于Hermes LCM)

```python
# kunlun/memory_system.py
from typing import Dict, List, Optional

class MemorySystem:
    """整合Hermes LCM三层记忆"""
    
    def __init__(self, config: MemoryConfig):
        self.l1_hot = LCMLayer(config.l1)      # 热记忆
        self.l2_warm = DAMLayer(config.l2)      # 温记忆
        self.l3_cold = HRRLayer(config.l3)     # 冷记忆
    
    async def recall(self, query: str) -> str:
        """跨层检索"""
        
        # L1 → L2 → L3 级联检索
        l1_result = await self.l1_hot.search(query)
        l2_result = await self.l2_warm.search(query)
        l3_result = await self.l3_cold.search(query)
        
        # RRF融合
        return self._rrf_fusion([l1_result, l2_result, l3_result])
    
    async def store(self, info: Dict):
        """分层存储"""
        await self.l1_hot.store(info)
        
        # 检查是否需要升级到L2
        if await self.l1_hot.should_promote():
            await self.l2_warm.store(await self.l1_hot.to_summary())
    
    async def on_pre_compress(self, messages: List) -> str:
        """压缩前抢救 (Hermes钩子)"""
        critical_info = []
        
        # 抢救关键常量
        for msg in messages:
            if self._is_critical(msg):
                critical_info.append(msg)
        
        return "\n".join(critical_info)
```

### 3.5 实施路线

#### 第一阶段: 源码理解和验证 (4周)

```
目标: 深入理解两个框架的核心机制

任务:
├── 1.1 搭建OpenCLAW开发环境
├── 1.2 搭建Hermes开发环境
├── 1.3 验证SubAgent机制 (OpenCLAW)
├── 1.4 验证Skill自学习 (Hermes)
└── 1.5 输出验证报告
```

#### 第二阶段: 核心组件提取 (6周)

```
目标: 从两个框架提取可复用组件

任务:
├── 2.1 提取OpenCLAW Actor Runtime → Python移植
├── 2.2 提取Hermes ContextEngine → 抽象接口
├── 2.3 提取Hermes LCM → 记忆系统
├── 2.4 提取Hermes Skill Engine → 技能系统
└── 2.5 输出组件规格说明书
```

#### 第三阶段: 架构整合设计 (4周)

```
目标: 设计昆仑框架统一架构

任务:
├── 3.1 设计Kunlun Actor Runtime
├── 3.2 设计LLM Gateway接口
├── 3.3 设计Skill运行时
├── 3.4 设计跨语言IPC机制
└── 3.5 输出架构设计文档
```

#### 第四阶段: 原型实现 (8周)

```
目标: 实现昆仑框架MVP

任务:
├── 4.1 实现Gateway控制平面 (Go)
├── 4.2 实现Agent Runtime (Python)
├── 4.3 实现Skill Engine + LCM
├── 4.4 实现LLM Gateway
├── 4.5 集成测试与优化
└── 4.6 输出MVP版本
```

---

## 四、技术决策建议

### 4.1 关键技术选型

| 决策点 | 推荐方案 | 理由 |
|--------|----------|------|
| **核心语言** | Python + Go | AI能力 + 高并发 |
| **Agent引擎** | Hermes ContextEngine | 可插拔、生命周期完善 |
| **并发模型** | OpenCLAW Actor | 成熟稳定、15+平台验证 |
| **记忆系统** | Hermes LCM | 三层架构、HRR持久化 |
| **技能系统** | Hermes SKILL.md | 自学习、渐进披露 |
| **通信协议** | gRPC + WebSocket | 跨语言 + 实时性 |

### 4.2 风险与应对

| 风险 | 等级 | 应对策略 |
|------|------|----------|
| 跨语言性能损耗 | 中 | gRPC + Protobuf优化 |
| 两个框架设计冲突 | 高 | 设计适配层隔离差异 |
| 技能与工具重复 | 中 | 统一抽象、分层设计 |
| 安全沙箱复杂度 | 中 | 复用OpenCLAW Docker方案 |

### 4.3 预期收益

| 维度 | 预期提升 |
|------|----------|
| **并发能力** | 提升10x (Actor模型) |
| **记忆深度** | 提升5x (三层LCM) |
| **技能复用** | 提升3x (自学习机制) |
| **开发效率** | 提升2x (成熟组件) |

---

## 五、附录

### 5.1 参考链接

- OpenCLAW: https://github.com/openclaw/openclaw
- Hermes Agent: https://github.com/NousResearch/hermes-agent
- OpenCLAW架构文档: https://github.com/mudrii/openclaw-docs/blob/main/ARCHITECTURE.md
- Hermes官方中文站: https://hermesagentai.cn/

### 5.2 核心文件清单

**OpenCLAW关键文件**:
- `src/gateway/server.ts` - WS服务器
- `src/agents/runtime/agent-loop.ts` - Agent循环
- `src/auto-reply/dispatcher.ts` - 消息分发
- `src/channels/registry.ts` - 通道注册

**Hermes关键文件**:
- `agent/context_engine.py` - 上下文引擎
- `agent/context_compressor.py` - 压缩器
- `agent/memory_manager.py` - 记忆管理
- `agent/lcm/engine.py` - LCM核心
- `tools/skill_tools.py` - 技能工具

### 5.3 版本信息

| 项目 | 版本 |
|------|------|
| OpenCLAW | v2026.4.14 |
| Hermes Agent | v0.9.0 (v2026.4.13) |
| 分析日期 | 2026-04-18 |

---

*本报告为昆仑系统架构设计提供技术基座分析，建议在实际开发过程中根据项目需求进行调整。*
