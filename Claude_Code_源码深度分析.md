# Claude Code 源码深度分析报告

> **分析日期**：2026年4月17日  
> **分析版本**：基于 Claude Code v2.1.88 Source Map 还原源码  
> **数据来源**：claude-code-sourcemap 项目、Gist架构分析、技术博客  

---

## 一、源码结构概览

### 1.1 基本规模指标

| 指标 | 数值 | 说明 |
|------|------|------|
| **总文件数** | 4,756 | 包含所有.ts/.tsx/.js文件 |
| **核心源码** | 1,884 | restored-src/src下的.ts/.tsx文件 |
| **代码行数** | ~512,000 | TypeScript代码 |
| **磁盘占用** | 33 MB | 源码规模 |
| **内置工具** | 80+ | 代码编辑、搜索、任务管理等 |
| **顶层模块** | 35+ | 功能模块目录 |

### 1.2 目录结构解析

```
restored-src/src/
├── main.tsx                     # 主入口（4,683行）
├── QueryEngine.ts              # 查询引擎（1,295行）
├── query.ts                    # 主循环（1,729行）
├── agenttool.tsx               # Agent工具（1,397行）
├── runagent.ts                 # Agent运行（973行）
├── prompts.ts                  # 提示词（914行）
├── tool.ts                     # 工具基类（792行）
├── toolexecution.ts            # 工具执行（1,745行）
│
├── tools/                      # 工具系统（42个子目录）
│   ├── Bash/                   # Bash执行工具
│   ├── FileEdit/               # 文件编辑工具
│   ├── FileRead/               # 文件读取工具
│   ├── Glob/                   # 文件搜索工具
│   ├── Grep/                   # 文本搜索工具
│   ├── Agent/                  # 子Agent工具
│   ├── Skill/                  # 技能工具
│   ├── Task/                   # 任务管理工具
│   ├── MCP/                    # MCP协议工具
│   └── ...                     # 其他30+工具
│
├── commands/                   # 命令系统（86个子目录）
│   ├── commit/                 # Git提交命令
│   ├── review/                 # 代码审查命令
│   ├── config/                 # 配置命令
│   ├── mcp/                    # MCP命令
│   └── ...                     # 其他80+命令
│
├── services/                   # 服务层
│   ├── api/                    # API服务
│   ├── mcp/                    # MCP服务
│   ├── analytics/              # 分析服务
│   ├── lsp/                    # LSP服务
│   └── oauth/                  # OAuth服务
│
├── utils/                      # 工具函数库（564文件）
│   ├── git/                    # Git操作
│   ├── model/                  # 模型相关
│   ├── auth/                   # 认证授权
│   ├── permissions/            # 权限系统
│   ├── hooks/                  # Hook系统
│   └── ...
│
├── components/                 # React组件（389文件）
├── screens/                    # 界面屏幕
├── ink/                        # 自定义终端UI引擎（96文件）
├── coordinator/                 # 多Agent协调器
├── assistant/                  # KAIROS助手模式
├── buddy/                      # AI伴侣系统
├── remote/                     # 远程会话
├── plugins/                    # 插件系统
├── skills/                     # 技能系统
├── voice/                      # 语音交互
├── vim/                        # Vim模式
├── bridge/                     # IDE集成桥接
├── tasks/                      # 任务系统
│
├── entrypoints/                # 入口点
│   ├── cli.tsx                 # CLI会话编排
│   ├── init.ts                 # 初始化
│   ├── mcp.ts                  # MCP服务器模式
│   └── sdk/                    # SDK入口
│
├── state/                      # 状态管理
│   ├── AppStateStore.ts        # 全局状态
│   └── AppState.tsx            # React状态提供者
│
├── bootstrap/                  # 启动引导
└── constants/                  # 常量定义
```

---

## 二、核心机制深入分析

### 2.1 CLI架构设计

Claude Code采用**快路径(Fast-Path)分发+懒加载**的CLI架构：

```
入口流程：
┌─────────────────────────────────────────────────────────┐
│ main.tsx (主入口)                                       │
├─────────────────────────────────────────────────────────┤
│ 1. 并行预取 (Fast-Path)                                 │
│    ├── MDM设置预读                                      │
│    ├── Keychain预取                                    │
│    ├── API预连接                                       │
│    └── 模块动态导入                                     │
├─────────────────────────────────────────────────────────┤
│ 2. 命令路由分发                                         │
│    ├── --version     → 直接打印退出（零加载）           │
│    ├── remote-control → Bridge模式                      │
│    ├── daemon        → 长驻进程模式                     │
│    ├── ps/logs/attach/kill → 后台会话管理              │
│    ├── --worktree --tmux → exec进tmux                  │
│    └── 默认        → 加载main.tsx进入REPL              │
└─────────────────────────────────────────────────────────┘
```

**设计亮点**：
- `--version`等轻量命令零模块加载，提升CI流水线性能
- 所有import都是动态导入，按需加载
- 并行预取在模块加载期间执行，减少冷启动时间

### 2.2 核心执行循环

Claude Code的核心是一个**Streaming Async Generator Loop**：

```
┌─────────────────────────────────────────────────────────────────┐
│                        query() Generator                         │
│                                                                  │
│  用户消息 ─────────────────────────────────────────────────────▶ │
│      │                                                         │
│      ▼                                                         │
│  ┌──────────────────────┐                                       │
│  │ queryModelWithStream│◄──────────────────────┐               │
│  │ ing() — 调用API     │                       │               │
│  └──────────┬───────────┘                       │               │
│             │                                   │               │
│             ▼                                   │               │
│  ┌──────────────────────┐                       │               │
│  │ 流式事件处理:        │                       │               │
│  │  • text deltas      │──▶ yield给UI           │               │
│  │  • thinking deltas  │                       │               │
│  │  • tool_use blocks  │                       │               │
│  └──────────┬───────────┘                       │               │
│             │                                   │               │
│             ▼                                   │               │
│  ┌──────────────────────┐     ┌──────────────┐  │               │
│  │ 有tool_use blocks?   │─YES─▶ runTools()  │  │               │
│  └──────────┬───────────┘     │ ├─ 权限检查  │  │               │
│             │                 │ ├─ 执行工具   │  │               │
│             NO                │ └─ yield结果  │  │               │
│             │                 └──────┬────────┘  │               │
│             ▼                        │           │               │
│  ┌──────────────────────┐           ▼           │               │
│  │ stop_reason =        │    ┌──────────────┐   │               │
│  │  "end_turn" 或        │    │ 追加工具结果 │   │               │
│  │  "max_tokens"        │    │ 到messages[] │───┘               │
│  └──────────┬───────────┘    └──────────────┘                   │
│             │                                                         │
│             ▼                                                         │
│    完成 ── 返回                                                      │
│                                                                  │
│  每次API调用后执行压缩检查:                                          │
│  if tokens > threshold → autoCompact() or microCompact()           │
└─────────────────────────────────────────────────────────────────┘
```

**两层设计分离**：
- **QueryEngine.ts (1,295行)** — 外层循环：重试、预算强制、权限检查、最大轮次限制
- **query.ts (1,729行)** — 内层循环：System Prompt组装、消息历史管理、API流式处理、Hook执行

### 2.3 上下文管理机制

Claude Code实现了**四层压缩策略**，确保长会话不会超出上下文限制：

```
Token使用率 ─────────────────────────────────────────────────────────▶

0%              80%        85%        90%       98%
│               │          │          │          │
│  正常操作     │ Micro-   │ Auto-    │ Session  │ BLOCK
│               │ compact  │ compact  │ memory   │ (硬限制)
│               │ (清除    │ (完整    │ compact  │
│               │  旧工具   │  摘要    │ (提取到  │
│               │  结果)    │  旧消息) │  memory) │
```

| 压缩层级 | 触发阈值 | 策略 | 信息损失 |
|----------|----------|------|----------|
| **Micro-Compact** | 80% | 清除旧工具结果 | 最小化，仅删除原始工具输出 |
| **Auto-Compact** | 85% | 完整摘要旧消息 | 保留关键决策，删除中间过程 |
| **Session Memory** | 90% | 提取到持久memory | 关键信息提取到MEMORY.md |
| **Reactive** | 98% | 截断最旧消息组 | 最后手段，硬截断 |

**持久记忆结构**：
```
~/.claude/projects/<project-slug>/memory/
├── MEMORY.md           ◄── 索引文件（最多200行）
├── user_role.md        ◄── 用户类型
├── feedback_testing.md ◄── 反馈类型
├── project_auth.md     ◄── 项目认证
└── reference_docs.md   ◄── 参考文档
```

### 2.4 工具调用机制

**工具接口设计**：
```typescript
interface Tool {
  name: string
  description: string
  inputJSONSchema: JSONSchema      // Zod验证的输入
  execute(input, context): Promise<Result>  // 核心执行
  validateInput?(input): ValidationResult
  checkPermissions?(input, context): PermissionResult
  
  isConcurrencySafe?: boolean      // 可并行执行？
  isReadOnly?: boolean             // 只读？
  isEnabled?(): boolean            // 特性门控？
  shouldDefer?: boolean            // 延迟加载schema？
}
```

**流式工具执行**：
- `StreamingToolExecutor`在API流中**立即开始执行工具**，无需等待完整响应
- `isConcurrencySafe`标记的工具**并行执行**（最多10个并发）
- 非并发工具获得**独占访问权**
- 大结果**持久化到磁盘**，对话中仅存储文件引用

### 2.5 多Agent系统

Claude Code支持三级多Agent执行：

```
┌────────────────────────────────────────────────────────────────┐
│ Level 1: SUB-AGENT (AgentTool)                                │
│  • 主Agent通过AgentTool生成子Agent                             │
│  • 隔离的文件缓存（从父Agent克隆）                             │
│  • 独立的AbortController                                      │
│  • 独立的transcript录制（JSONL边链）                           │
│  • 按Agent定义过滤的工具池                                     │
│  • 返回文本结果给父Agent                                       │
├────────────────────────────────────────────────────────────────┤
│ Level 2: COORDINATOR MODE (多Worker)                          │
│  • CLAUDE_CODE_COORDINATOR_MODE=1启用                         │
│  • 系统prompt重写为编排模式                                     │
│  • Worker通过AgentTool生成，受限工具                           │
│  • XML任务通知协议汇总结果                                     │
│  • Coordinator聚合并响应用户                                    │
├────────────────────────────────────────────────────────────────┤
│ Level 3: TEAM MODE (持久团队)                                   │
│  • TeamCreateTool创建命名团队                                  │
│  • 团队文件持久化到~/.claude/teams/{name}.json               │
│  • InProcessTeammate在同一进程中运行                          │
│  • SendMessageTool在团队成员间路由消息                         │
│  • 共享scratchpad文件系统进行知识交换                          │
│  • 结构化关闭协议                                              │
└────────────────────────────────────────────────────────────────┘
```

### 2.6 权限与安全系统

**三层权限架构**：

```
工具调用到达
      │
      ▼
┌──────────────┐    ┌────────────┐
│ 检查模式     │───▶│ bypass     │──▶ ALLOW（跳过所有检查）
│              │    │ Permissions│
│              │    └────────────┘
│              │    ┌────────────┐
│              │───▶│ dontAsk    │──▶ DENY（阻止所有）
└──────┬───────┘    └────────────┘
       │
       ▼
┌──────────────┐
│ 应用规则     │
│ 1. Deny     │──▶ if matched → DENY
│ 2. Allow    │──▶ if matched → ALLOW
│ 3. Ask      │──▶ if matched → prompt user
└──────┬───────┘
       │ 无规则匹配
       ▼
┌──────────────┐
│ Auto-mode?   │──YES──▶ LLM分类器
│ (TRANSCRIPT  │         │ ├─ allowlisted tool? → ALLOW
│  CLASSIFIER) │         │ ├─ classifier says safe? → ALLOW
│              │         │ └─ classifier says unsafe? → DENY
└──────┬───────┘
       │ 非auto模式
       ▼
┌──────────────┐
│ 模式特定默认 │
│ default      │──▶ ASK user
│ acceptEdits  │──▶ ALLOW cwd中的文件编辑
│ plan         │──▶ 暂停并显示计划
└──────────────┘
```

### 2.7 Hook系统

Hook是Claude Code的扩展骨架，支持多种事件类型：

```
会话生命周期:
  SessionStart ──▶ 启动/恢复/清除/压缩时触发
  Stop         ──▶ Claude结束响应前触发

用户输入:
  UserPromptSubmit ──▶ 用户提交时触发
                      exit code 2 = BLOCK提交

工具生命周期:
  PreToolUse     ──▶ 工具执行前触发
                    exit code 2 = BLOCK + stderr消息
  PostToolUse    ──▶ 成功执行后触发
  PostToolUseFail──▶ 执行失败后触发

Agent生命周期:
  SubagentStart  ──▶ 子Agent生成时触发
  SubagentStop   ──▶ 子Agent完成时触发

任务生命周期:
  TaskCreated    ──▶ 新任务注册时触发
  TaskCompleted  ──▶ 任务达到终态时触发
```

**Hook类型**：
| 类型 | 说明 | 超时 |
|------|------|------|
| Command Hook | Shell命令 | 退出码0=OK, 2=BLOCK |
| Prompt Hook | LLM评估条件 | 返回{ok: true}或{ok: false} |
| Agent Hook | 完整Agent+工具 | 60s，无递归 |
| HTTP Hook | HTTP请求到端点 | JSON body with context |
| Function Hook | TS回调 | Session-only |

---

## 三、技术优势提取

### 3.1 CLI交互设计

| 优势 | 实现方式 |
|------|----------|
| **快路径优化** | `--version`等命令零模块加载 |
| **懒加载架构** | 所有命令/工具动态导入 |
| **并行预取** | MDM、Keychain、API在模块加载期间并行获取 |
| **流式输出** | Generator函数边收边yield |
| **Vim模式** | 完整INSERT/NORMAL模式支持 |

### 3.2 性能优化

| 优化点 | 技术方案 |
|--------|----------|
| **Prompt缓存** | 冻结快照可被API缓存，降低Token成本 |
| **大结果持久化** | 工具结果存磁盘，对话仅存引用 |
| **并发执行** | 最多10个并发安全工具并行执行 |
| **LRU文件缓存** | 最多100文件/25MB，减少重复读取 |
| **Token估算** | `chars/4`估算(~85%准确)，避免API调用 |

### 3.3 安全设计

| 安全层 | 机制 |
|--------|------|
| **危险文件保护** | .gitconfig、.bashrc等62KB规则文件保护 |
| **命令检测** | rm -rf、git push --force等模式识别 |
| **符号链接防护** | 防止通过符号链接逃逸沙箱 |
| **Bypass Killswitch** | GrowthBook特性门控可禁用bypass模式 |
| **自动模式熔断** | 连续3次拒绝或总计20次拒绝，回退到ASK |

### 3.4 扩展性设计

| 扩展点 | 机制 |
|--------|------|
| **Feature Gates** | 89个唯一feature flag，编译时裁剪 |
| **MCP集成** | stdio/SSE/WS传输，动态OAuth |
| **插件系统** | 内置/市场插件分层加载 |
| **Skills系统** | Markdown格式，工具/模型/参数替换 |
| **SDK入口** | 程序化API嵌入Claude Code |

---

## 四、架构特点总结

### 4.1 技术栈

| 维度 | 选择 | 理由 |
|------|------|------|
| **语言** | TypeScript 100% | 类型安全，大型团队协作 |
| **运行时** | Bun | 快速启动，内置打包 |
| **UI框架** | 自定义Ink (React渲染器) | 完整React生态+终端优化 |
| **构建** | Bun bundling + DCE | 特性门控裁剪 |
| **验证** | Zod | 输入schema验证 |
| **测试** | Vitest | 快速单元测试 |

### 4.2 核心设计模式

| 模式 | 应用 |
|------|------|
| **Generator Pattern** | 流式响应，边收边处理 |
| **Observer Pattern** | 状态变化监听，副作用触发 |
| **Pipeline Pattern** | 权限检查→Hook执行→工具执行 |
| **Strategy Pattern** | 不同压缩策略按阈值触发 |
| **Factory Pattern** | 工具注册，插件加载 |
| **Decorator Pattern** | Hook包装，权限包装 |

### 4.3 未发布功能（从源码发现）

| 功能 | 说明 |
|------|------|
| **KAIROS** | 持久后台Agent模式，监控项目 |
| **ULTRAPLAN** | 浏览器端计划审批 |
| **VOICE_MODE** | 语音输入输出 |
| **BUDDY系统** | 18种宠物伙伴系统 |
| **COORDINATOR_MODE** | 多Worker并行 |
| **UNDERCOVER_MODE** | 开源仓库代码混淆 |

---

## 五、昆仑框架可借鉴点

### 5.1 直接复用（高价值）

| 模块 | 借鉴价值 | 实现建议 |
|------|----------|----------|
| **四层压缩策略** | ⭐⭐⭐⭐⭐ | 直接移植，处理长对话 |
| **流式工具执行** | ⭐⭐⭐⭐⭐ | 提升响应速度 |
| **权限系统架构** | ⭐⭐⭐⭐ | 三层防护机制 |
| **Hook系统** | ⭐⭐⭐⭐ | 灵活扩展点 |

### 5.2 参考设计（中等价值）

| 模块 | 借鉴价值 | 实现建议 |
|------|----------|----------|
| **快路径CLI** | ⭐⭐⭐ | 优化冷启动 |
| **多Agent协调** | ⭐⭐⭐ | 复杂任务分解 |
| **记忆文件结构** | ⭐⭐⭐ | MEMORY.md分层设计 |

### 5.3 不建议借鉴

| 模块 | 原因 |
|------|------|
| **自定义Ink UI** | 开发成本高，昆仑已有飞书UI |
| **Feature Gates** | 复杂度高，昆仑规模不需要 |
| **Bun运行时** | 需保持与OpenCLAW/Hermes兼容 |

---

## 六、关键文件索引

### 6.1 核心文件

| 文件 | 行数 | 功能 |
|------|------|------|
| main.tsx | 4,683 | CLI入口，初始化编排 |
| QueryEngine.ts | 1,295 | 外层控制循环 |
| query.ts | 1,729 | 内层执行循环 |
| toolexecution.ts | 1,745 | 工具执行编排 |
| prompts.ts | 914 | System Prompt构建 |
| tool.ts | 792 | 工具基类 |

### 6.2 工具系统

| 文件 | 功能 |
|------|------|
| tools.ts | 工具注册中心 |
| tools/Bash/ | Bash执行 |
| tools/FileEdit/ | 文件编辑 |
| tools/Agent/ | 子Agent |
| tools/Skill/ | 技能调用 |
| services/mcp/client.ts | MCP客户端(119KB) |

### 6.3 权限系统

| 文件 | 功能 |
|------|------|
| utils/permissions/PermissionMode.ts | 权限模式定义 |
| utils/permissions/permissions.ts | 规则匹配引擎 |
| utils/permissions/autoModeState.ts | 自动模式状态 |
| utils/permissions/filesystem.ts | 危险文件保护(62KB) |

---

> **分析结论**：Claude Code的源码揭示了一个成熟商业级AI编程工具的完整架构。其核心价值在于：流式执行优化、四层压缩策略、多层权限防护、Feature Gated设计。昆仑框架应重点借鉴压缩策略和权限系统，复用其设计思想而非直接移植代码。
