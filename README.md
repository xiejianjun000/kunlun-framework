# OpenTaiji ☯️

**Dynamic Balance for AI Agents**

> 太极生两仪，两仪生四象，四象生八卦

---

## 🏯 太极哲学 · 框架之本

**OpenTaiji** 是中国大陆首个基于 **Actor模型** + **图记忆系统** + **梦境进化** 的开源多智能体运行时。

太极的核心智慧是 **平衡、转化、生生不息** —— 这正是现代多智能体系统最需要的架构哲学：

| 太极智慧 | AI工程映射 |
|---------|-----------|
| **阴阳平衡** | 能力扩展 ↔ 安全边界 |
| **动静相生** | 实时响应 ↔ 深度思考 |
| **周而复始** | 对话交互 → 梦境沉淀 → 能力进化 → 更优对话 |
| **万法归宗** | 多智能体协同 ↔ 核心Actor调度 |

> 「人法地，地法天，天法道，道法自然」
> 
> 好的系统不是设计出来的，是长出来的。OpenTaiji 提供的不是固定的功能，而是让智能体自然生长的生态环境。

---

## 🌌 核心架构：一炁化三清

OpenTaiji 的架构严格遵循道家宇宙观设计：

```
                          ☯️ 一炁（框架核心）
                            │
            ┌───────────────┼───────────────┐
            │               │               │
         🧠 神            💨 气            🦴 精
      （认知层）       （运行时）       （记忆层）
            │               │               │
            │               │               │
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │ Skill引擎   │  │ Actor系统   │  │ Graph记忆   │
   │ 人格系统    │  │ 邮箱消息    │  │ 7信号评分   │
   │ 进化策略    │  │ 监督树      │  │ 梦境合成    │
   └─────────────┘  │ Stash机制  │  │ 矛盾修复    │
                     └─────────────┘  └─────────────┘
```

### L1：精 — 记忆层 (Memory System)
> 「结圣胎，养慧命」—— 智能体的知识根基

```typescript
// 基于图结构的持久化记忆
const memory = GraphMemorySystem.create({
  storage: { type: "sqlite", path: "./data/memory.db" },
  dreaming: {
    enabled: true,
    phases: ["dreams", "repair", "narrative"],
  },
  scoring: {
    signals: 7,  // 7信号评分体系
  },
});

// 存入记忆 → 关联实体 → 梦境沉淀 → 智慧涌现
await memory.remember({
  type: "observation",
  content: "企业A的COD排放浓度为120mg/L",
  source: "监测系统",
});

await memory.dream(); // 梦境：关联 → 聚合 → 修复矛盾 → 生成叙事
```

**实际已实现特性**：
- ✅ 实体-断言-证据 三层图谱结构
- ✅ FTS5全文检索 + 向量相似度混合查询
- ✅ 7信号记忆质量评分体系
- ✅ 完整梦境三阶段：做梦(Dreams) → 修复(Repair) → 叙事(Narrative)
- ✅ 矛盾检测与自动修复机制
- ✅ 回忆追踪（Recall Tracking）信号闭环

### L2：气 — 运行时 (Actor System)
> 「气脉常通，周流不息」—— 消息驱动的响应引擎

```typescript
// 基于Actor模型的并发运行时
const system = new ActorSystem({ name: "taiji-system" });

// 1. 创建智能体（有监督的生命周期）
const monitorAgent = await system.createActor(
  "environmental-monitor",
  { supervisor: "root" }
);

// 2. 邮箱驱动的消息传递（背压+缓冲+有序）
await monitorAgent.send({
  type: "data-received",
  payload: { source: "sensor-001", value: 85 },
});

// 3. Stash机制：暂存无法立即处理的消息
// 4. 监督树：故障自动隔离与重启
// 5. Actor路径寻址与层级管理
```

**实际已实现特性**：
- ✅ Actor完整生命周期管理
- ✅ Mailbox邮箱系统（有序消息队列）
- ✅ Stash消息暂存机制
- ✅ Supervisor监督树（故障自愈）
- ✅ ActorPath分层寻址系统
- ✅ Hook扩展点（启动前/停止前/收到消息）

### L3：神 — 认知层 (Cognitive Layer)
> 「寂然不动，感而遂通天下」—— 学习与进化的智慧

```typescript
// 人格系统
const personality = new PersonalitySystem({
  traits: ["conscientious", "analytical", "collaborative"],
  evolution: {
    enabled: true,
    strategy: "reward-based",
  },
});

// 技能系统
const skillSystem = new SkillSystem({
  skillsPath: "./skills",
  isolation: "process",
});

// 进化系统
const evolution = new EvolutionSystem({
  rewardFunction: (interaction) => {
    return interaction.helpfulness * 0.6 + interaction.correctness * 0.4;
  },
});
```

**实际已实现特性**：
- ✅ 人格模型系统（Personality Model）
- ✅ 技能注册与隔离执行
- ✅ 多策略进化系统（奖励驱动）
- ✅ 注册与认证系统
- ✅ OAuth框架集成
- ✅ 多租户隔离框架

---

## 💎 四大核心发明（已在代码中验证）

### 1. 🌀 梦境闭环学习
> 「至人无梦，愚人无梦；不梦不梦，乃真梦」

人类睡觉时，大脑在做什么？—— 整合记忆，修复矛盾，生成智慧。

**OpenTaiji 也一样**：
1. **白天（对话）**：接收信息，存入图谱
2. **夜晚（梦境）**：
   - **Dreams**：聚类相似记忆，发现关联
   - **Repair**：检测矛盾断言，修复不一致
   - **Narrative**：生成连续叙事，从碎片到智慧
3. **第二天**：带着进化的记忆重新服务

```
对话交互 → 图谱存储 → 梦境沉淀 → 智慧涌现
     ↑                           │
     └───────────────────────────┘
```

### 2. 🌳 7信号记忆质量评估
> 「虚一而静，谓之大清明」

不是所有记忆都有同等价值。OpenTaiji 从7个维度评估每条记忆的质量：

```
1. 重要性 (Importance)  ──────┐
2. 时效性 (Timeliness)  ──────┤
3. 准确性 (Accuracy)    ──────┤  
4. 来源可靠性 (Source)  ──────┤  → 综合质量分
5. 情感强度 (Emotion)   ──────┤
6. 关联度 (Relatedness) ──────┤
7. 复用频率 (Frequency) ──────┘
```

梦境阶段自动淘汰低质量记忆，保留高价值知识 —— 就像人类的大脑会遗忘。

### 3. 🔄 监督树自愈架构
> 「高以下为基，贵以贱为本」

Actor模型的监督层级，确保系统不会单点崩溃：

```
Root Supervisor (根监督者)
  ├── User-1 Agent   ── 崩溃 → 自动重启
  ├── User-2 Agent
  ├── User-3 Agent
  └── System Agents
        ├── Memory Host
        ├── Skill Daemon
        └── Heartbeat Checker
```

如果一个智能体崩溃，不会影响其他智能体，更不会让整个系统崩溃。

### 4. 💓 心跳检查系统
> 「不出户，知天下；不窥牖，见天道」

内置的健康检查框架，让系统有了「觉知」：

```typescript
taiji.addHeartbeatCheckItem({
  id: "memory-health",
  check: async (ctx) => {
    const size = await ctx.getMemorySize();
    return size < 100000 ? "pass" : "warning";
  },
});
```

可扩展的检查项系统，让系统自我诊断，自我报告。

---

## 📦 实际已交付模块

### 核心框架 (`src/core/`)
```
├── actor/              # Actor系统（8个子模块）
│   ├── Actor.ts        # 智能体基类
│   ├── ActorSystem.ts  # 系统入口
│   ├── ActorPath.ts    # 路径寻址
│   ├── Mailbox.ts      # 邮箱系统
│   ├── Stash.ts        # 消息暂存
│   └── Supervisor.ts   # 监督树
├── heartbeat/          # 心跳检查系统
├── multi-tenant/       # 多租户框架
├── task-ledger/        # 任务账本
├── security/           # 安全框架
├── interfaces/         # 类型定义
├── mcp/                # MCP协议
└── config/             # 配置管理
```

### 模块系统 (`src/modules/`)
```
├── memory-system/      # 图记忆系统（17子模块）
│   ├── dreaming/       # 梦境合成三阶段
│   ├── graph/          # 图谱存储
│   ├── scoring/        # 7信号评分
│   ├── retrieval/      # 混合检索
│   ├── fts5/           # 全文搜索
│   └── tracking/       # 回忆追踪
├── personality-system/ # 人格系统
├── evolution-system/   # 进化系统（7种策略）
├── skill-system/       # 技能引擎
└── registration/       # 注册认证
```

### 测试体系 (`tests/`)
```
├── production/         # v1.0 生产级测试（8模块全覆盖）
│   ├── 核心引擎测试
│   ├── 记忆图谱测试
│   └── 极限压力测试
└── production-v2/      # v2.0 卓越级测试
    ├── CLEAR五维评估框架
    ├── 大规模并发测试（1万+智能体）
    ├── 复杂场景博弈测试
    └── 故障注入韧性测试
```

---

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/xiejianjun000/open-taiji.git
cd open-taiji

# 安装依赖
npm install

# 编译TypeScript
npm run build

# 运行测试套件
npm test
```

### 30秒启动最小系统

```typescript
import { createTaijiFramework } from "open-taiji";

// 1. 创建框架实例（最小配置）
const taiji = createTaijiFramework({
  logger: { level: "info" },
  heartbeat: {
    enabled: true,
    intervalMinutes: 5,
  },
});

// 2. 初始化
await taiji.initialize();
console.log("☯️ OpenTaiji 已启动，系统开始运行...");

// 3. 系统开始自我感知、心跳自检
```

### 创建第一个有记忆的智能体

```typescript
import { GraphMemorySystem } from "open-taiji/modules/memory-system";

const memory = new GraphMemorySystem({
  storagePath: "./data/agent-memory.db",
  dreaming: {
    enabled: true,
    hour: 3, // 每天凌晨3点做梦
  },
});

// 存入记忆
await memory.remember({
  type: "fact",
  content: "COD排放标准限值为100mg/L",
  source: "GB 8978-1996",
  confidence: 0.95,
});

// 触发梦境（知识沉淀）
await memory.dream();
```

---

## 📊 项目真实数据

| 指标 | 真实数值 |
|------|---------|
| **总代码量** | 6,986 行（src目录） |
| **核心模块** | 6 大系统 + 17 个子模块 |
| **测试用例** | 86+ 个（含 v1.0 + v2.0 测试体系） |
| **测试覆盖率** | 持续提升中 |
| **开源协议** | Apache 2.0 |

---

## 🎯 路线图（真实版本）

### v1.0.0（当前 - 2026 Q2）
- ✅ Actor 运行时系统（Mailbox + Supervisor + Stash）
- ✅ Graph 图记忆系统（含梦境三阶段）
- ✅ 心跳健康检查框架
- ✅ 人格系统框架
- ✅ 进化系统框架
- ✅ 任务账本系统
- ✅ 多租户框架
- ✅ v1.0 生产级测试体系
- ✅ v2.0 卓越级测试体系

### v1.1.0（2026 Q3）
- 🔲 WFGY 防幻觉验证引擎集成
- 🔲 真实 LLM 适配器层（OpenAI + 国产模型）
- 🔲 飞书/企微/钉钉 通道适配器
- 🔲 完整的开发文档

### v1.2.0（2026 Q4）
- 🔲 技能市场雏形
- 🔲 示例 Agent 模板库
- 🔲 性能优化与基准测试

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 开发环境

```bash
# Fork & Clone
git clone https://github.com/YOUR_USERNAME/open-taiji.git
cd open-taiji

# 安装依赖
npm install

# 运行测试
npm test

# 运行特定模块测试
npm test tests/modules/memory-system
```

### 可以贡献的方向

- 🧠 **记忆系统**：优化检索算法，新增梦境策略
- 🤖 **Actor系统**：优化调度，新增监督策略
- 🔌 **适配器**：LLM、向量数据库、消息平台
- 📝 **文档**：使用指南、最佳实践、英文翻译
- 🧪 **测试**：补充测试用例，提高覆盖率
- ✨ **特性**：新的模块、新的机制

---

## 📜 开源协议

**Apache 2.0** — 商业友好，无传染性。

你可以：
- ✅ 免费商用
- ✅ 修改源码
- ✅ 分发再售

只需要保留版权声明。

---

## ⚛️ 太极智慧

> 「道生一，一生二，二生三，三生万物」
>
> OpenTaiji 的「道」，就是让 AI 真正有用、可靠、可持续生长的基本规律。

> 「上善若水，水善利万物而不争」
>
> 好的框架像水一样 —— 默默支撑，无处不在，让你感觉不到它的存在，但又离不开它。

---

**Built with ☯️ in China · Open to the World**

---

## ⭐ Star History

如果这个项目对你有启发，请给我们一颗星！这是对我们最大的鼓励。

[![Star History Chart](https://api.star-history.com/svg?repos=xiejianjun000/open-taiji&type=Date)](https://star-history.com/#xiejianjun000/open-taiji&Date)
