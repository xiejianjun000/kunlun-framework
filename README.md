# OpenTaiji ☯️

**Dynamic Balance for AI Agents**

> 能人所不能，亦守所为当守

---

## 一句话定位

**OpenTaiji** 是中国大陆首个整合 **OpenCLAW** + **Hermes** + **Claude Code** 的开源多智能体框架 —— 用太极哲学平衡 AI 的**无限能力**与**安全可控**。

**但这不是我们的真正定位。**

真正定位：**让开发者从"卖AI工具"升级为"卖成果订阅"的自动化基础设施**

---

## 为什么世界需要 OpenTaiji？

### 红杉资本的预言

> **"下一个万亿美元的公司，将是一家伪装成服务公司的软件公司"**

这意味着：

| 维度 | 工具型产品 | 服务型产品 |
|------|-----------|-----------|
| 交付物 | 功能、API、账号 | 报告、已完成的任务 |
| 用户预期 | 用户需学会使用才能获得价值 | 用户只需定义目标，直接验收成果 |
| 与大模型关系 | 竞争（模型升级→工具贬值） | 共生（模型升级→成本下降） |
| 护城河 | 功能对比 | 数据积累 + 服务惯性 |

### 传统框架的问题

| 框架 | 核心能力 | 局限性 |
|------|---------|--------|
| **LangChain** | AI应用开发 | 工具型思维，无成果交付能力 |
| **AutoGen** | 多智能体对话 | 无商业化闭环 |
| **OpenCLAW** | 本地优先Agent | 无学习闭环，每次对话从零开始 |
| **Hermes** | 自进化Agent | 英文生态，无国产模型直连 |

### OpenTaiji 的解决方案

```
传统模式：开发者做AI工具 → 用户学会使用 → 获得价值
太极模式：开发者定义成果 → 太极自动交付 → 用户直接验收
```

**示例**：

❌ **传统模式**：
```
开发者："我做了一个碳排监测工具，您可以调用API"
用户："你们比XX碳管理SaaS好用多少？"
结果：陷入功能对比，定价困难
```

✅ **太极模式**：
```
开发者：定义"每周一早8点推送碳排报告"
太极：自动调度 → 执行 → 推送 → 计费
用户：每周收到一份《碳排简报》
结果：用户为报告价值买单，续费因为报告有用
```

---

## 核心能力

### 🔄 Actor Runtime（来自 OpenCLAW）

```typescript
// 基于Actor模型的并发调度
const agent = new TaijiAgent({
  name: "carbon-monitor",
  memory: new GraphMemory(),
  skills: [reportSkill, alertSkill]
});

// 支撑千人级并发访问
agent.start();
```

- Actor模型并发调度
- 监督树 + 错误恢复机制
- 千人级并发支撑

### 🧠 持久记忆系统（来自 Hermes）

```typescript
// 三层存储：HOT → WARM → COLD
const memory = new GraphMemory({
  hotTTL: 3600,    // 1小时
  warmTTL: 86400,  // 1天
  coldTTL: Infinity
});

// 7信号评分梦境处理
await memory.consolidate();
```

- HOT/WARM/COLD 三层存储
- Recall Tracking（召回信号追踪）
- 7信号评分梦境处理
- Q&A → 图谱 闭环学习

### 🎯 成果调度器（核心创新）

```typescript
// 开发者只需定义成果模板
const reportSkill = {
  name: "每周碳排报告",
  trigger: "cron: 0 8 * * 1", // 每周一早8点
  template: "碳排报告模板.md",
  dataSource: ["influxdb", "policy_db"],
  output: {
    format: "pdf",
    channel: ["email", "wechat"]
  }
};

// 太极自动处理：调度 → 执行 → 推送 → 计费
await taiji.registerSkill(reportSkill);
```

**这是太极区别于其他框架的核心能力**：
- 不是提供API让用户调用
- 而是定义成果，系统自动交付

### 🔐 确定性保障

```typescript
// WFGY符号层：防幻觉
const result = await taiji.execute(skill, {
  verification: "wfgy",      // 符号层验证
  consistency: true,          // Self-Consistency
  traceSource: true           // 溯源索引
});

// 每个结论可追溯到知识来源
console.log(result.sources);
// [{ law: "生态环境法典第123条", case: "XX案例" }]
```

- WFGY符号层：防幻觉
- Self-Consistency：多路径验证
- 溯源索引：每个结论可追溯

### 🏢 企业级多租户

```typescript
// 租户隔离 + 配额管理
const tenant = await taiji.createTenant({
  name: "娄底市局",
  quota: { users: 600, storage: "100GB" }
});

// RBAC权限控制
await tenant.setRole("执法支队", {
  skills: ["执法文书", "法典检索"],
  dataAccess: "department"
});
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenTaiji Core                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L1 Actor Runtime    │ Actor · Mailbox · Supervisor          │
│  L2 Memory System    │ GraphMemory · Recall · Dreaming       │
│  L3 Skill Engine     │ Registry · Executor · Hooks           │
│  L4 成果调度器        │ Scheduler · Template · Pusher         │
│  L5 确定性保障       │ WFGY · Consistency · Trace            │
│  L6 Multi-Tenant     │ Isolation · Quota · RBAC              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Adapters            │ LLM · Vector · Message · Storage      │
└─────────────────────────────────────────────────────────────┘
```

**设计原则**：
- **框架提供能力**：接口定义 + 扩展点 + 适配器 + 插件系统
- **项目定义业务**：具体业务逻辑 + 技能包 + 知识库

---

## 中国特色的差异化

### 🇨🇳 中文深度适配

```typescript
// 中文语义 Embedding 模型
const embedder = new ChineseEmbedder({
  model: "text-embedding-3-small-zh"
});

// 中文 FTS 分词（非空格切分）
const searcher = new FTS5Search({
  tokenizer: "chinese",
  indexPath: "./data/index.db"
});
```

### 🔗 国产大模型直连

```typescript
// 一键切换国产大模型
const taiji = new TaijiFramework({
  llm: {
    provider: "dashscope", // 通义千问
    model: "qwen-max"
    // provider: "wenxin"  // 文心一言
    // provider: "kimi"    // 月之暗面
  }
});
```

支持的大模型：
- 百度文心 · 阿里通义 · 腾讯混元
- 字节豆包 · 讯飞星火
- 智谱 GLM · 月之暗面 Kimi

### 💬 中国特色平台

```typescript
// 微信公众号/小程序
await taiji.addChannel(new WeChatChannel());

// 飞书（已支持）
await taiji.addChannel(new FeishuChannel());

// 钉钉
await taiji.addChannel(new DingTalkChannel());

// 企业微信
await taiji.addChannel(new WeComChannel());
```

---

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/xiejianjun000/open-taiji.git
cd open-taiji

# 安装依赖
npm install

# 编译
npm run build

# 运行测试
npm test
```

### 5分钟创建第一个成果订阅

```typescript
import { TaijiFramework, Skill } from 'open-taiji';

// 1. 初始化框架
const taiji = new TaijiFramework({
  llm: { provider: "dashscope", model: "qwen-max" },
  memory: { type: "sqlite", path: "./data/memory.db" }
});

// 2. 定义成果模板
const dailyReport: Skill = {
  name: "每日简报",
  trigger: "cron: 0 8 * * *", // 每天早8点
  template: `
# {{date}} 每日简报

## 昨日数据
- 访问量: {{stats.visits}}
- 活跃用户: {{stats.activeUsers}}

## 今日待办
{{#each todos}}
- {{this}}
{{/each}}
  `,
  execute: async (ctx) => {
    const stats = await getStats();
    const todos = await getTodos();
    return { stats, todos };
  }
};

// 3. 注册成果
await taiji.registerSkill(dailyReport);

// 4. 启动服务
await taiji.start();

console.log("成果订阅服务已启动，每天早8点自动推送简报");
```

---

## 项目数据

| 指标 | 数值 |
|------|------|
| 总代码量 | 91,357 行 |
| 测试用例 | 86+ |
| 核心模块 | 14 个 |
| 开源协议 | Apache 2.0 |

---

## 路线图

### v0.1.0（当前）
- ✅ 核心框架搭建
- ✅ Actor Runtime集成
- ✅ GraphMemory SQLite
- ✅ Dreaming System（7信号评分）

### v0.2.0（2026 Q2）
- 🔲 成果调度器完善
- 🔲 飞书/企微/钉钉 Adapter
- 🔲 国产大模型直连

### v0.3.0（2026 Q3）
- 🔲 Taiji Cloud托管服务
- 🔲 技能市场上线
- 🔲 开发者分成机制

### v1.0.0（2026 Q4）
- 🔲 企业级RBAC
- 🔲 审计日志
- 🔲 多租户完善

---

## 商业模式

### 开源核心 + 云托管 + 成果订阅

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: OpenTaiji Core                              │
│ • Apache 2.0 开源免费                                │
│ • 吸引开发者，建立生态                                │
├─────────────────────────────────────────────────────┤
│ Layer 2: Taiji Cloud                                 │
│ • 智能体托管：500元/月/实例                          │
│ • 技能市场：抽成20-30%                              │
├─────────────────────────────────────────────────────┤
│ Layer 3: 成果订阅                                    │
│ • 开发者定义成果 → 用户订阅 → 分成                   │
└─────────────────────────────────────────────────────┘
```

### 验证案例

| 项目 | 成果订阅内容 | 年费 |
|------|-------------|------|
| **冷钢碳排监测** | 每周报告 + 月度合规 + 实时预警 | 5-15万/年 |
| **娄底市局** | 每日晨报 + 周报 + 政策分析 | 144万/年 |

---

## 贡献指南

我们欢迎所有形式的贡献！

### 开发环境搭建

```bash
# Fork 仓库
git clone https://github.com/YOUR_USERNAME/open-taiji.git

# 安装依赖
npm install

# 创建分支
git checkout -b feature/your-feature

# 运行测试
npm test

# 提交PR
```

### 贡献类型

- 🐛 Bug修复
- ✨ 新功能开发
- 📝 文档完善
- 🌍 国际化（英文文档）
- 🔌 适配器开发（国产大模型、平台集成）

---

## 社区

- **GitHub**: https://github.com/xiejianjun000/open-taiji
- **Discord**: Coming Soon
- **微信群**: Coming Soon

---

## 开源协议

**Apache 2.0** — 商业友好，无传染性

---

**Built with ❤️ in China · Open to the World**

> "好的架构让商业自然发生，好的激励让生态自驱动。"
> 
> "用户买的是能力，不是基座；技术要打包在服务里卖。"

---

## Star History

如果这个项目对你有帮助，请给我们一个 ⭐️！

[![Star History Chart](https://api.star-history.com/svg?repos=xiejianjun000/open-taiji&type=Date)](https://star-history.com/#xiejianjun000/open-taiji&Date)
