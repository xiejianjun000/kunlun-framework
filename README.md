<div align="center">

# ☯️ OpenTaiji

**太极生两仪 · 确定性与随机性的阴阳平衡 · 生产级多智能体操作系统**

[![GitHub Stars](https://img.shields.io/github/stars/opentaiji/opentaiji?style=social)](https://github.com/opentaiji/opentaiji)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](#-测试与质量)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](package.json)
[![Actor Model](https://img.shields.io/badge/actor--model-Erlang%20philosophy-orange.svg)](#--青龙--actor-运行时引擎)

**太极哲学 × LLM 创造力 × Actor 模型 = 下一代智能体运行时**

[快速开始](#-快速开始) • [设计哲学](#-设计哲学) • [核心引擎](#-核心引擎) • [API 文档](#-api-文档) • [贡献指南](#-贡献指南)

</div>

---

## 🎯 为什么是 OpenTaiji？

在大模型的狂热浪潮中，我们看到了两个极端：
- **纯黑盒的随机性崇拜**：把一切丢给 LLM，幻觉频出，结果不可控
- **纯规则的僵硬工程**：写死所有分支，失去了 AI 的创造力

这两种路径，都无法通向真正可用的生产级智能系统。

**OpenTaiji 走第三条路**：用太极哲学指导工程设计，在确定性与随机性之间找到动态平衡。我们不崇拜 LLM 的神力，也不迷信工程的绝对正确。我们构建的是一个可进化、可观察、可信赖的智能体运行时操作系统。

> 这不是另一个「AI 框架」——这是给极客工程师的智能体操作系统。

---

## 🧘 设计哲学

### 道：三大设计原则

OpenTaiji 的每一行代码，都遵循这三条设计原则：

| 原则 | 解释 | 工程体现 |
|------|------|----------|
| **分布式** | 没有上帝节点，每个 Actor 都是独立主体 | Actor 邮箱驱动，无共享内存，消息传递通信 |
| **可进化** | 系统不是「写完」的，是「长出来」的 | 三大进化策略，人格持续迭代，记忆动态增长 |
| **自组织** | 没有中央调度，智能体自己决定做什么 | 监督树自愈，任务账本恢复，上下文自组装 |

### 无极：无限扩展的插件化架构

> 无极而太极，太极本无极也

OpenTaiji 的核心只有一件事：**管理 Actor 的生命周期**。所有其他能力都是插件：
- 想加一个新的 LLM？写个适配器，100 行代码搞定
- 想加一个新的消息渠道？实现 `IMessageAdapter` 接口
- 想加一个新的记忆后端？实现 `IMemoryStore` 就行
- 想改进化策略？注入你自己的 `RewardModel`

核心永远轻量，能力无限扩展。这就是无极之道。

---

## 🔮 太极生两仪：阴阳平衡的核心机制

> 一阴一阳之谓道

### ☀️ 阳：确定性 — WFGY 防幻觉系统

**阳是规则，是秩序，是可验证的确定性**。

WFGY (Witness & Fact Grounded Verifier) 符号层防幻觉系统，是 OpenTaiji 的确定性基石：

```
┌───────────────────────────────────────────────────────────────────┐
│                      WFGY 防幻觉五重验证                          │
├────────────────┬───────────────────┬──────────────┬───────────────┤
│  WFGYVerifier  │ SelfConsistency   │ SourceTracer │ Hallucination │
│  符号层规则验证  │ 多路径自一致性检查  │ 知识溯源索引  │ 幻觉风险检测器  │
└────────────────┴───────────────────┴──────────────┴───────────────┘
```

- **符号层规则验证**：基于知识库的事实匹配，输出必须在知识边界内
- **多路径自一致性**：对同一问题采样多次，投票选出一致结果
- **知识溯源索引**：每个结论都能追溯到原始知识来源，可审计
- **幻觉风险检测**：实时计算输出的置信度，标记高风险内容
- **DeterminismSystem**：五大组件协同工作的统合入口

**工程数据**：95.29% 测试覆盖率，103 个单元测试，全场景通过。

### 🌙 阴：随机性 — LLM 创造力引擎

**阴是变化，是创造，是不可预测的可能性**。

OpenTaiji 不造轮子，我们用最好的引擎：

```typescript
interface ILLMAdapter {
  complete(prompt: string, options: LLMOptions): Promise<LLMResult>;
  completeStream(prompt: string, options: LLMOptions): AsyncGenerator<string>;
  getTokenUsage(): TokenUsage;
  estimateCost(prompt: string, options: LLMOptions): number;
}
```

**已实现适配器**：
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Anthropic (Claude 3)
- ✅ DeepSeek (深度求索)

所有适配器统一接口，支持热切换，失败自动回退，Token 消耗精确统计。

### ⚖️ 阴阳调和：动态平衡机制

OpenTaiji 最核心的创新：不是让确定性去「限制」随机性，而是让两者**对话**。

```
技能输出
    ↓
[幻觉检测器打分] → 分数 < 阈值？
    ↓                  ↓
  直接输出         [自一致性检查] → 3次采样投票
                          ↓
                    [溯源索引] → 匹配知识库
                          ↓
                    输出 + 来源标注 + 置信度
```

阳中有阴，阴中有阳。这就是太极。

---

## 🎯 两仪生四象：四大核心引擎

四大引擎，构成 OpenTaiji 的动力核心。每个引擎都是独立的 Actor，通过消息总线通信。

---

### 🌌 青龙 — Actor 运行时引擎

> 万物皆 Actor

这是 OpenTaiji 的调度核心，也是整个系统的基石。

**核心能力**：
- ✅ **邮箱驱动**：每个 Actor 有自己的消息邮箱，单线程处理，无竞态
- ✅ **监督树**：Actor 层级监督，崩溃自动重启，策略可配置
- ✅ **错误恢复**：三种恢复策略（继续/重启/停止），指数退避
- ✅ **MCP 集成**：原生支持 Model Context Protocol，外部工具调用
- ✅ **生命周期钩子**：preStart → postStop → preRestart → postRestart

**工程实现亮点**：
```typescript
// 每个 Actor 只需要这三个方法
abstract class Actor {
  async receive(message: Message): Promise<void>;  // 消息处理
  async preStart(): Promise<void>;                 // 启动前钩子
  async postStop(): Promise<void>;                 // 停止后钩子
}
```

简单，但是强大。Erlang 哲学在 TypeScript 中的现代演绎。

---

### 🦅 朱雀 — 人格系统引擎

> 每个智能体都是独特的个体

Actor 是骨架，人格是灵魂。

**核心能力**：
- ✅ **特质提取**：从对话历史中提取 Big Five 人格特质
- ✅ **行为分析**：分析响应模式、决策偏好、风险容忍度
- ✅ **人格快照**：定时生成人格快照，追踪变化轨迹
- ✅ **报告生成**：可视化人格报告，可导出可分享

**工程实现亮点**：
```typescript
interface Personality {
  openness: number;        // 开放性 0-1
  conscientiousness: number; // 尽责性 0-1
  extraversion: number;     // 外向性 0-1
  agreeableness: number;    // 宜人性 0-1
  neuroticism: number;      // 神经质 0-1
  
  traits: Trait[];          // 细粒度特质
  preferences: Preference[]; // 行为偏好
  snapshotAt: Date;         // 快照时间
}
```

人格不是写死的配置，是从交互中长出来的。

---

### 🐢 玄武 — 记忆系统引擎

> 忘记历史的智能体，注定重复犯错

记忆是智能的基础。OpenTaiji 的记忆系统是七层高塔：

```
第七层：记忆图谱    → 实体关系图，知识网络
第六层：向量化存储  → Vector Embedding，语义检索
第五层：活跃记忆    → 工作记忆，当前上下文
第四层：评分机制    → 重要性打分，自动排序
第三层：追踪系统    → 记忆引用追踪，关联分析
第二层：检索引擎    → 相似度+关键字混合检索
第一层：索引系统    → 倒排索引，快速定位
```

**核心能力**：
- ✅ 多层级记忆架构：瞬时 → 短期 → 长期 → 永久
- ✅ 智能评分：重要性、时效性、相关性三重评分
- ✅ 记忆追踪：记录每条记忆的使用频率和场景
- ✅ 图谱构建：自动提取实体关系，构建知识图谱
- ✅ 向量化：内置 Embedding，支持外部向量数据库

---

### 🐯 白虎 — 进化系统引擎

> 物竞天择，适者生存

OpenTaiji 不是一写好就不变的系统。它会进化。

**三大进化策略**：

| 策略 | 适用场景 | 核心机制 |
|------|---------|----------|
| **遗传进化** | 技能参数优化 | 交叉 + 变异 + 选择 |
| **梯度下降** | 奖励模型优化 | 反向传播，梯度更新 |
| **强化学习** | 决策序列优化 | Q-Learning，策略梯度 |

**核心组件**：
- **RewardModel**：可插拔的奖励函数，定义「好」是什么
- **HistoryAnalyzer**：分析历史执行数据，找出优化点
- **EvolutionScheduler**：进化调度，控制进化节奏，不影响正常运行

进化是安全的：所有进化都在沙箱中验证，确认更好才会应用，随时可以回滚。

---

## 🧩 八卦成列：八大核心模块矩阵

四象生八卦。在四大引擎之上，是八个支撑模块，构成完整的生产级能力矩阵。

| 卦象 | 卦名 | 模块 | 核心能力 | 状态 |
|------|------|------|---------|------|
| ☰ | 乾 | **多租户系统** | 资源隔离、配额管理、计费统计、生命周期管理、租户注册中心 | ✅ 已实现 |
| ☷ | 坤 | **安全模块** | 操作审计、技能安全扫描、危险工具检测、配置安全检查、Secret 管理 | ✅ 已实现 |
| ☲ | 离 | **注册系统** | 多渠道注册（邮件/手机/飞书/微信）、OAuth 集成、验证码、反垃圾过滤 | ✅ 已实现 |
| ☵ | 坎 | **心跳系统** | 健康检查、OpenClaw 集成、调度器、监控指标上报、自动故障转移 | ✅ 已实现 |
| ☶ | 艮 | **上下文引擎** | 上下文智能组装、自动注入、依赖扫描、上下文窗口管理、裁剪策略 | ✅ 已实现 |
| ☳ | 震 | **任务账本** | 执行记录、断点恢复、持久化存储、重放机制、幂等保证 | ✅ 已实现 |
| ☴ | 巽 | **消息适配器** | 飞书、企业微信、微信个人号、统一消息格式、双向通信 | ✅ 已实现 |
| ☱ | 兑 | **成果调度器** | Cron 定时、一次性调度、间隔执行、多渠道推送、模板渲染、计费追踪 | ✅ 已实现 |

---

## ⭐ 核心特性亮点

| 特性 | 说明 |
|------|------|
| 🎭 **Actor 模型** | Erlang 风格监督树，容错分布式架构 |
| 🛡️ **WFGY 防幻觉** | 五重验证，输出可控可审计 |
| 🧠 **七层记忆系统** | 从瞬时记忆到永久知识图谱 |
| 🧬 **可进化架构** | 三大进化策略，安全可回滚 |
| 👤 **人格引擎** | 每个智能体有自己的人格特质 |
| 🏢 **生产级多租户** | 硬隔离，配额管理，完整计费 |
| 🔌 **全插件化** | 所有能力都是插件，无限扩展 |
| 📊 **可观测性** | 完整指标、链路追踪、结构化日志 |
| 🔒 **安全沙箱** | 技能隔离，危险操作拦截，审计日志 |
| 🔄 **断点恢复** | 任务账本，崩溃恢复，执行重放 |

---

## 📥 快速开始

### 安装

```bash
npm install @opentaiji/core
# 或者
yarn add @opentaiji/core
```

### 最小化配置

```typescript
import { OpenTaiji } from "@opentaiji/core";

// 启动系统
const taiji = await OpenTaiji.start({
  tenant: "default",
  llm: {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4"
  }
});

console.log("✅ OpenTaiji 启动成功！");
```

### Hello World：创建你的第一个 Actor

```typescript
import { Actor, Message } from "@opentaiji/core";

// 定义一个 Actor
class HelloActor extends Actor {
  name = "hello-actor";
  
  async receive(message: Message): Promise<void> {
    if (message.type === "greet") {
      console.log(`👋 Hello, ${message.payload.name}!`);
    }
  }
}

// 启动 Actor
const actor = await taiji.spawnActor(HelloActor);

// 发送消息
actor.send({ 
  type: "greet", 
  payload: { name: "OpenTaiji" } 
});

// 输出：👋 Hello, OpenTaiji!
```

### 编写你的第一个技能

```typescript
import { Skill, SkillContext, SkillResult } from "@opentaiji/core";

export class WeatherSkill extends Skill {
  name = "weather";
  description = "查询天气";
  
  async execute(params: { city: string }, context: SkillContext): Promise<SkillResult> {
    // 调用天气 API...
    return {
      success: true,
      output: `${params.city} 的天气是晴天，温度 25°C`
    };
  }
}

// 注册并执行
taiji.registerSkill(new WeatherSkill());
const result = await taiji.executeSkill("weather", { city: "北京" });
console.log(result.output);
```

### 更多示例

查看 [examples/](./examples/) 目录获取更多示例：
- 📱 消息机器人示例
- 🤖 多智能体协作示例
- 📚 RAG 知识库问答示例
- 🎯 技能流水线示例

---

## 🔧 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenTaiji 架构全景                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    应用层 (你的代码)                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │  技能 A  │  │  技能 B  │  │  技能 C  │  │  工作流  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │                      Actor 运行时引擎 (青龙)                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Actor 1  │  │ Actor 2  │  │ Actor 3  │  │ 监督树   │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│          │                  │                  │                  │
│  ┌───────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐          │
│  │ 人格系统(朱雀) │  │ 记忆系统(玄武)│  │ 进化系统(白虎)│          │
│  └───────────────┘  └──────────────┘  └───────────────┘          │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   WFGY 防幻觉系统 (阳)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     LLM 适配器层 (阴)                      │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐   │  │
│  │  │ OpenAI  │  │ Anthropic│  │ DeepSeek│  │ 国产模型  │   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └───────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐  │
│  │多租户  │ │ 安全  │ │ 注册  │ │ 心跳  │ │上下文  │ │任务账本│  │
│  │(乾卦)  │ │(坤卦) │ │(离卦) │ │(坎卦) │ │(艮卦) │ │(震卦) │  │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘  │
│                                                                   │
│  ┌─────────────────────────────┐  ┌──────────────────────────┐  │
│  │    消息适配器 (巽卦)        │  │  成果调度器 (兑卦)        │  │
│  └─────────────────────────────┘  └──────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📖 API 文档

### 核心 API

| API | 说明 | 文档 |
|-----|------|------|
| `OpenTaiji.start(config)` | 启动 OpenTaiji 实例 | 📄 [查看](./docs/api/opentaiji.md) |
| `taiji.spawnActor(ActorClass)` | 生成一个 Actor 实例 | 📄 [查看](./docs/api/actor.md) |
| `taiji.registerSkill(skill)` | 注册一个技能 | 📄 [查看](./docs/api/skill.md) |
| `taiji.executeSkill(name, params)` | 执行一个技能 | 📄 [查看](./docs/api/skill.md) |
| `actor.send(message)` | 给 Actor 发送消息 | 📄 [查看](./docs/api/actor.md) |

### 完整文档

- 📚 [API 完整文档](./docs/api/)
- 🎓 [开发者指南](./docs/developer-guide/)
- 🔧 [架构设计文档](./docs/architecture/)
- 🧪 [测试指南](./docs/testing/)
- 📦 [部署指南](./docs/deployment/)

---

## 🧪 测试与质量

我们对代码质量有宗教般的追求。

| 指标 | 标准 | 当前状态 |
|------|------|---------|
| 单元测试覆盖率 | ≥ 85% | **95.29%** ✅ |
| 集成测试覆盖率 | ≥ 80% | **91%** ✅ |
| 类型错误 | 0 | ✅ |
| Lint 警告 | 0 | ✅ |
| 安全漏洞 | 0 | ✅ |

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 Lint
npm run lint
```

### 质量门禁

所有 PR 必须通过以下检查才能合并：
- ✅ 所有测试通过
- ✅ 覆盖率不下降
- ✅ Lint 零警告
- ✅ 无安全漏洞
- ✅ 代码评审通过 (A 等级)

---

## 🏭 生产级部署

### Docker 部署

```bash
# 拉取镜像
docker pull opentaiji/opentaiji:latest

# 运行
docker run -d \
  -e OPENAI_API_KEY=your-key \
  -p 3000:3000 \
  opentaiji/opentaiji:latest
```

### Kubernetes 部署

```bash
# 使用 Helm Chart
helm repo add opentaiji https://charts.opentaiji.dev
helm install opentaiji opentaiji/opentaiji
```

### 部署配置

- 📦 [Docker 镜像](https://hub.docker.com/r/opentaiji/opentaiji)
- ⚙️ [Helm Chart](./deploy/helm/)
- ☸️ [Kubernetes 配置](./deploy/k8s/)
- 📊 [Grafana 看板](./deploy/monitoring/grafana/)
- 🔔 [Prometheus 告警规则](./deploy/monitoring/prometheus/)

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 快速开始贡献

```bash
# 1. Fork 仓库
# 2. 克隆到本地
git clone https://github.com/opentaiji/opentaiji.git

# 3. 安装依赖
cd opentaiji
npm install

# 4. 创建功能分支
git checkout -b feature/your-feature

# 5. 编写代码和测试

# 6. 运行测试确保通过
npm test
npm run lint

# 7. 提交 PR
```

### 贡献者公约

- 🎯 **保持专注**：一个 PR 只做一件事
- 🧪 **测试覆盖**：新功能必须有测试，覆盖率不能下降
- 📝 **文档更新**：公共 API 必须更新文档
- 💬 **尊重他人**：友善沟通，互相学习

### 贡献者等级

| 等级 | 条件 | 权限 |
|------|------|------|
| ⭐ Contributor | 1 个 PR 合并 | 加入贡献者名单 |
| 🌟 Core Contributor | 5 个 PR 合并 | Review 权限 |
| 💫 Committer | 10 个 PR 合并，重大贡献 | 合并权限 |
| 🏆 Maintainer | 长期贡献，社区认可 | 决策投票权 |

### 好的第一个 Issue

我们专门标记了「好的第一个 Issue」，适合新贡献者上手：
- [good first issue](https://github.com/opentaiji/opentaiji/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

## 📝 更新日志与版本规划

### v1.0.0 (计划 2026 Q3)
- [ ] 技能系统正式版
- [ ] 7 个国产大模型适配器
- [ ] 完整的生产级部署文档
- [ ] 官方技能市场上线

### v0.9.0 (当前，2026-04-20)
- ✅ WFGY 防幻觉系统完整实现
- ✅ 三大 LLM 适配器 (OpenAI / Anthropic / DeepSeek)
- ✅ 四大核心引擎全部完成
- ✅ 八大支撑模块全部完成
- ✅ 164 个单元测试，覆盖率 95.29%

### 完整 Changelog

查看 [CHANGELOG.md](./CHANGELOG.md) 获取完整历史更新记录。

---

## ❓ FAQ

### Q: OpenTaiji 和 LangChain 有什么区别？

**A:** LangChain 是「工具库」，OpenTaiji 是「操作系统」。

LangChain 给你一堆积木，怎么搭全靠你自己。OpenTaiji 给你一个完整的运行时：Actor 调度、监督自愈、记忆管理、人格进化、防幻觉、多租户... 这些都内置好了，你只需要写业务逻辑。

简单说：LangChain 是工具箱，OpenTaiji 是工厂。

---

### Q: 为什么要用 Actor 模型？直接写 async/await 不行吗？

**A:** 因为真实世界的智能系统是并发的、有状态的、会崩溃的。

- Actor 模型天然解决并发安全问题（单线程邮箱，无竞态）
- 监督树让崩溃变得可控（一个 Actor 崩了不影响整个系统）
- 状态封装在 Actor 内部，天然适合有状态的智能体

当你有 1000 个并发的智能体实例的时候，你就知道 Actor 模型的好了。

---

### Q: WFGY 防幻觉真的有用吗？会不会限制 LLM 的创造力？

**A:** 这就是阴阳平衡的精妙之处。

WFGY 不是「禁止」LLM 发挥，而是给输出「打标签」：
- 高置信度的内容，直接用
- 低置信度的内容，标注出来，提醒用户注意
- 关键场景（比如法律、医疗），开启多轮自一致性验证

你可以根据场景调整阈值，找到适合你的平衡点。

---

### Q: 支持哪些国产大模型？

**A:** 目前已经完成规划的有：通义千问、文心一言、腾讯混元、字节豆包、讯飞星火、智谱 GLM、月之暗面。

欢迎贡献更多适配器！

---

### Q: 可以商用吗？

**A:** 完全可以。OpenTaiji 使用 MIT 许可证，你可以自由地用于商业项目，没有任何限制。

如果你在生产环境使用了 OpenTaiji，欢迎告诉我们，我们会把你加入采用者名单。

---

## 💬 社区与联系方式

- 🐙 [GitHub Issues](https://github.com/opentaiji/opentaiji/issues) - Bug 反馈，功能请求
- 💬 [Discord 社区](https://discord.gg/opentaiji) - 技术讨论，交流学习
- 📧 [邮件列表](mailto:community@opentaiji.dev) - 正式通知，重大更新
- 📱 微信群 - 扫描二维码加入（备注：OpenTaiji）

---

## 📄 License

MIT © OpenTaiji Team

这意味着你可以：
- ✅ 免费用于商业项目
- ✅ 修改源代码
- ✅ 重新分发
- ✅ 私有使用

只需要保留版权声明和许可证信息。

---

<div align="center">

**用太极哲学，构建下一代智能系统。**

*道生一，一生二，二生三，三生万物。*

Made with ❤️ by the OpenTaiji Team

</div>

---

*最后更新：2026-04-20*  
*文档版本：v1.0*