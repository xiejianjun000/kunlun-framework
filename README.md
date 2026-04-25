<div align="center">

# ☯️ OpenTaiji

**太极生两仪 · 确定性与随机性的阴阳平衡 · 多智能体运行时框架（实验性）**

⚠️ **本项目处于早期实验阶段（Pre-Alpha）**，核心能力集中在 WFGY 防幻觉验证系统与 LLM 适配器骨架层。大部分架构模块尚在规划中，请勿用于生产环境。

[![GitHub Stars](https://img.shields.io/github/stars/opentaiji/opentaiji?style=social)](https://github.com/opentaiji/opentaiji)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](package.json)
[![Status](https://img.shields.io/badge/status-experimental-orange.svg)](#-功能实现状态)

**太极哲学 × LLM 创造力 × Actor 模型（规划中） = 下一代智能体运行时**

[快速开始](#-快速开始) • [设计哲学](#-设计哲学) • [功能实现状态](#-功能实现状态) • [WFGY 防幻觉](#-wfgy-防幻觉系统) • [贡献指南](#-贡献指南)

</div>

---

## 🎯 为什么是 OpenTaiji？

在大模型的狂热浪潮中，我们看到了两个极端：
- **纯黑盒的随机性崇拜**：把一切丢给 LLM，幻觉频出，结果不可控
- **纯规则的僵硬工程**：写死所有分支，失去了 AI 的创造力

这两种路径，都无法通向真正可用的生产级智能系统。

**OpenTaiji 走第三条路**：用太极哲学指导工程设计，在确定性与随机性之间找到动态平衡。我们不崇拜 LLM 的神力，也不迷信工程的绝对正确。我们构建的是一个可进化、可观察、可信赖的智能体运行时操作系统。

> ⚠️ 当前版本是概念验证（PoC）级别的原型，距离生产级框架还有较长距离。项目由 AI Agent 团队辅助生成，需要人类工程师深度参与才能走向成熟。

---

## ⚠️ 功能实现状态

**这是项目中最重要的表格**——我们选择诚实面对当前实现状态，不做过度承诺。

| 模块 | 状态 | 说明 |
|------|------|------|
| **WFGY 防幻觉系统** | ✅ 已实现 | 项目最完整模块，测试覆盖率 ~95%，含验证器/自一致性/知识溯源/幻觉检测 |
| **记忆系统** | ⚠️ 部分实现 | 三层内存 Map 存储 + 评分 + 晋升机制，无持久化后端，语义检索为占位 |
| **梦境系统** | ⚠️ 部分实现 | 五阶段流程框架已搭建，聚类算法为简化版，阶段 2-5 核心逻辑待完善 |
| **LLM 适配器（19 个）** | ⚠️ 骨架实现 | 统一接口 + 基类（重试/错误分类/统计）完整，但大部分适配器未真正调用厂商 API |
| **成果调度器** | ⚠️ 部分实现 | Cron/at/every 调度 + 模板引擎 + Webhook 推送已实现，测试覆盖率 ~57% |
| **Actor 运行时** | ❌ 规划中 | README 原始描述为"万物皆 Actor"，但当前代码中不存在 Actor 基类实现 |
| **人格引擎** | ❌ 规划中 | Big Five 人格特质提取，仅接口定义 |
| **进化系统** | ❌ 规划中 | 遗传/梯度/强化学习三大策略，仅接口定义 |
| **多租户系统** | ❌ 规划中 | 无代码 |
| **安全模块** | ❌ 规划中 | 无代码 |
| **消息适配器** | ❌ 规划中 | 仅有 Webhook 推送，双向通信未实现 |
| **注册系统** | ❌ 规划中 | 无代码 |
| **心跳系统** | ❌ 规划中 | 无代码 |
| **上下文引擎** | ❌ 规划中 | 无代码 |
| **任务账本** | ❌ 规划中 | 无代码 |

**整体评估**：
- ✅ **可运行**：WFGY 防幻觉系统（推荐作为独立工具包使用）
- ⚠️ **可用但有局限**：LLM 适配器骨架、成果调度器、记忆系统（内存级）
- ❌ **尚不存在**：Actor 运行时、人格引擎、进化系统、多租户、八卦支撑模块

---

## 🧘 设计哲学

### 道：三大设计原则

OpenTaiji 的每一行代码，都遵循这三条设计原则：

| 原则 | 解释 | 工程体现 |
|------|------|----------|
| **分布式** | 没有上帝节点，每个 Actor 都是独立主体 | Actor 邮箱驱动，无共享内存，消息传递通信（规划中） |
| **可进化** | 系统不是「写完」的，是「长出来」的 | 三大进化策略，人格持续迭代，记忆动态增长（规划中） |
| **自组织** | 没有中央调度，智能体自己决定做什么 | 监督树自愈，任务账本恢复，上下文自组装（规划中） |

### 无极：无限扩展的插件化架构

> 无极而太极，太极本无极也也

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

WFGY (Witness & Fact Grounded Verifier) 符号层防幻觉系统，是 OpenTaiji 的确定性基石，也是项目中**唯一达到生产级质量的模块**。

```
┌───────────────────────────────────────────────────────────────────┐
│                      WFGY 防幻觉五重验证                          │
├────────────────┬───────────────────┬──────────────┬───────────────┤
│  WFGYVerifier  │ SelfConsistency   │ SourceTracer │ Hallucination │
│  符号层规则验证  │ 多路径自一致性检查  │ 知识溯源索引  │ 幻觉风险检测器  │
└────────────────┴───────────────────┴──────────────┴───────────────┘
```

- **符号层规则验证 (WFGYVerifier)**：基于知识库的事实匹配，支持正则表达式和函数两种匹配模式，输出必须在知识边界内。自动权重归一化，延迟编译符号正则表达式（性能优化）。**测试覆盖率 94.77%**。
- **多路径自一致性 (SelfConsistencyChecker)**：对同一问题采样多次，投票选出一致结果。实现了三种相似度算法：Jaccard 相似度、Levenshtein 距离相似度（空间复杂度优化到 O(min(n,m))）、余弦相似度（基于词频向量）。
- **知识溯源索引 (SourceTracer)**：每个结论都能追溯到原始知识来源，可审计。倒排索引 + 关键词匹配，支持覆盖率统计和批量操作。
- **幻觉风险检测 (HallucinationDetector)**：综合评分 = WFGY(40%) + 自一致性(30%) + 知识溯源(30%)，支持句子级疑似片段定位。
- **DeterminismSystem**：五大组件协同工作的统合入口，通过构造函数注入子组件，便于测试和替换。

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

**已规划适配器（19 个国产模型，骨架实现）**：

| 适配器 | 对应模型 | 厂商 | 状态 |
|--------|---------|------|------|
| QwenAdapter | 通义千问 | 阿里 | ⚠️ 骨架 |
| WenxinAdapter | 文心一言 | 百度 | ⚠️ 骨架 |
| HunyuanAdapter | 混元 | 腾讯 | ⚠️ 骨架 |
| DoubaoAdapter | 豆包 | 字节 | ⚠️ 骨架 |
| SparkAdapter | 星火 | 讯飞 | ⚠️ 骨架 |
| GLMAdapter | GLM | 智谱 | ⚠️ 骨架 |
| KimiAdapter | Kimi | 月之暗面 | ⚠️ 骨架 |
| BaichuanAdapter | 百川 | 百川智能 | ⚠️ 骨架 |
| YiAdapter | Yi | 零一万物 | ⚠️ 骨架 |
| StepFunAdapter | Step | 阶跃星辰 | ⚠️ 骨架 |
| MiniMaxAdapter | MiniMax | MiniMax | ⚠️ 骨架 |
| ZhiNao360Adapter | 360智脑 | 360 | ⚠️ 骨架 |
| SenseNovaAdapter | 日日新 | 商汤 | ⚠️ 骨架 |
| PanguAdapter | 盘古 | 华为 | ⚠️ 骨架 |
| YuyanAdapter | 玉言 | 网易 | ⚠️ 骨架 |
| XiaoaiAdapter | 小爱 | 小米 | ⚠️ 骨架 |
| HongshanAdapter | 红杉 | 出门问问 | ⚠️ 骨架 |
| XuanyuanAdapter | 轩辕 | 度小满 | ⚠️ 骨架 |
| TiangongAdapter | 天工 | 昆仑万维 | ⚠️ 骨架 |

⚠️ **重要说明**：所有适配器目前为骨架实现（方法签名 + 基类框架）。BaseLLMAdapter 基类包含 `fetchWithRetry`（指数退避 + 抖动）、完整的错误分类（AuthError / RateLimitError / ContextLengthError 等）、Token 用量统计和成本计算。但大部分适配器尚未真正调用各厂商 API，需要后续逐一接入。

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

## 🎯 当前版本核心能力

### WFGY 防幻觉系统（✅ 可用）

这是项目中最成熟、最有价值的部分，可以独立使用：

```typescript
import { DeterminismSystem } from "@opentaiji/core";

const ds = new DeterminismSystem({
  wfgyVerifier: new WFGYVerifier({ rules: [...], knowledgeBase }),
  consistencyChecker: new SelfConsistencyChecker(),
  sourceTracer: new SourceTracer(),
  hallucinationDetector: new HallucinationDetector()
});

const result = await ds.verify("LLM 的输出内容", { threshold: 0.7 });
console.log(result.verified, result.confidence, result.sources);
```

### 记忆系统（⚠️ 内存级）

七层记忆架构的设计已搭建，当前实现为三层内存 Map 存储：

```
第七层：记忆图谱    → ⚠️ WikiSystem 部分实现
第六层：向量化存储  → ❌ 占位实现
第五层：活跃记忆    → ✅ Map 存储
第四层：评分机制    → ✅ 重要性/时效性/相关性评分
第三层：追踪系统    → ✅ 使用频率和场景记录
第二层：检索引擎    → ⚠️ 关键字匹配，语义检索待实现
第一层：索引系统    → ✅ 基础索引
```

**特色设计**：记忆晋升前自动进行 WFGY 幻觉风险检测，高风险记忆自动过滤，不晋升到长期记忆。

### 成果调度器（⚠️ 部分可用）

支持三种调度类型（cron / at / every），包含模板引擎、Webhook 推送、执行历史追踪。

---

## 🧩 八卦支撑模块（规划中）

以下模块目前**仅有概念设计，尚无代码实现**。保留八卦架构作为项目愿景，但明确标注当前状态：

| 卦象 | 卦名 | 模块 | 核心能力 | 状态 |
|------|------|------|---------|------|
| ☰ | 乾 | **多租户系统** | 资源隔离、配额管理、计费统计 | ❌ 规划中 |
| ☷ | 坤 | **安全模块** | 操作审计、安全扫描、Secret 管理 | ❌ 规划中 |
| ☲ | 离 | **注册系统** | 多渠道注册、OAuth 集成 | ❌ 规划中 |
| ☵ | 坎 | **心跳系统** | 健康检查、监控指标上报 | ❌ 规划中 |
| ☶ | 艮 | **上下文引擎** | 上下文智能组装、依赖扫描 | ❌ 规划中 |
| ☳ | 震 | **任务账本** | 执行记录、断点恢复 | ❌ 规划中 |
| ☴ | 巽 | **消息适配器** | 多渠道消息收发 | ❌ 规划中 |
| ☱ | 兑 | **成果调度器** | 定时调度、多渠道推送 | ⚠️ 部分实现 |

---

## 📥 快速开始

### 安装

```bash
npm install @opentaiji/core
# 或者
yarn add @opentaiji/core
```

### WFGY 防幻觉验证（推荐用法）

```typescript
import { DeterminismSystem, WFGYVerifier, SelfConsistencyChecker, SourceTracer, HallucinationDetector } from "@opentaiji/core";

// 初始化防幻觉系统
const ds = new DeterminismSystem();

// 添加验证规则
ds.wfgyVerifier.addRule({
  pattern: /根据.*资料/,
  expected: true,
  weight: 1.0
});

// 验证 LLM 输出
const result = await ds.verify("这是一段来自 LLM 的回复内容", {
  threshold: 0.7,
  samples: 3
});

console.log(`验证结果: ${result.verified ? '通过' : '未通过'}`);
console.log(`置信度: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`幻觉风险: ${(result.hallucinationRisk * 100).toFixed(1)}%`);
```

### 更多示例

随着项目完善，将逐步补充以下示例：
- [ ] WFGY 规则配置与知识库集成
- [ ] LLM 适配器接入真实 API
- [ ] 记忆系统持久化
- [ ] Actor 运行时（待实现）

---

## 🔧 架构概览

```
┌───────────────────────────────────────────────────────────────┐
│                    OpenTaiji 架构（当前实现状态）                │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              应用层 (你的代码)                           │  │
│  │  ┌──────────────┐  ┌──────────────────┐                 │  │
│  │  │ WFGY 验证器  │  │ 成果调度器        │                 │  │
│  │  │ ✅ 已实现     │  │ ⚠️ 部分实现       │                 │  │
│  │  └──────────────┘  └──────────────────┘                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │          Actor 运行时引擎（青龙）—— ❌ 规划中             │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                  │                  │                 │
│  ┌───────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐        │
│  │ 人格系统(朱雀) │  │ 记忆系统(玄武)│  │ 进化系统(白虎)│        │
│  │  ❌ 规划中     │  │ ⚠️ 部分实现   │  │  ❌ 规划中    │        │
│  └───────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │       WFGY 防幻觉系统 —— ✅ 已实现（核心亮点）            │  │
│  │   WFGYVerifier + SelfConsistency + SourceTracer        │  │
│  │   + HallucinationDetector + DeterminismSystem          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │   LLM 适配器层 —— ⚠️ 19 个骨架实现，待接入真实 API        │  │
│  │   Qwen / Wenxin / Hunyuan / Doubao / Spark / GLM ...   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 📖 API 文档

### 核心 API

| API | 说明 | 状态 |
|-----|------|------|
| `DeterminismSystem.verify(content, options)` | WFGY 防幻觉验证 | ✅ 可用 |
| `WFGYVerifier.addRule(rule)` | 添加验证规则 | ✅ 可用 |
| `SelfConsistencyChecker.check(samples)` | 多路径自一致性检查 | ✅ 可用 |
| `SourceTracer.trace(content)` | 知识溯源 | ✅ 可用 |
| `HallucinationDetector.detect(content)` | 综合幻觉检测 | ✅ 可用 |
| `MemorySystem.store(key, value)` | 记忆存储 | ⚠️ 内存级 |
| `OutcomeScheduler.schedule(type, config)` | 成果调度 | ⚠️ 部分可用 |
| `taiji.spawnActor(ActorClass)` | 生成 Actor | ❌ 规划中 |
| `taiji.registerSkill(skill)` | 注册技能 | ❌ 规划中 |

---

## 🧪 测试与质量

| 指标 | 实际值 | 状态 |
|------|--------|------|
| 整体语句覆盖率 | ~50% | ⚠️ 模块间差异大 |
| WFGY 防幻觉 | 94.77% | ✅ 优秀 |
| 成果调度器 | ~57% | ⚠️ 一般 |
| LLM 适配器 | ~24% | ⚠️ 骨架为主 |
| 单元测试数 | ~150 个 | ✅ |
| 集成测试 | 0 | ❌ 待补充 |
| E2E 测试 | 0 | ❌ 待补充 |

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

---

## 🗺️ 未来路线图

### v0.2.0（规划中）
- [ ] 完善 WFGY 测试覆盖至 100%
- [ ] 记忆系统持久化（SQLite / 文件存储）
- [ ] 实现 3-5 个真实的 LLM 适配器（Qwen / GLM / Kimi）
- [ ] 补充集成测试

### v0.5.0（规划中）
- [ ] Actor 运行时原型实现
- [ ] 10+ 个真实 LLM 适配器
- [ ] 人格引擎 MVP
- [ ] 完整的示例和文档

### v1.0.0（愿景）
- [ ] 生产级 Actor 运行时
- [ ] 全部八卦支撑模块
- [ ] 完整的进化系统
- [ ] Docker / K8s 部署支持

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！特别是以下方向：

### 当前最需要的贡献

| 方向 | 说明 |
|------|------|
| **LLM 适配器** | 将骨架适配器接入真实厂商 API |
| **集成测试** | 验证各模块间的实际协作 |
| **持久化存储** | 将内存 Map 替换为 SQLite 或其他后端 |
| **文档改进** | 补充使用示例和开发文档 |
| **WFGY 规则库** | 贡献实际场景的验证规则 |

### 快速开始

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

---

## ❓ FAQ

### Q: OpenTaiji 现在能用吗？

**A:** WFGY 防幻觉系统已经可以独立使用，测试覆盖率 ~95%。其他模块（LLM 适配器骨架、记忆系统、成果调度器）可以使用但有明显局限。Actor 运行时、人格引擎、进化系统等尚未实现。

### Q: OpenTaiji 和 LangChain 有什么区别？

**A:** LangChain 是成熟的 LLM 工具链，有丰富的生态和工具集成。OpenTaiji 的差异化在于"防幻觉验证"和"记忆系统"设计，但目前实现深度远不及 LangChain。长期愿景是做一个完整的 Agent 运行时，但当前阶段更适合定位为「LLM 输出防幻觉验证工具包」。

### Q: WFGY 防幻觉真的有用吗？

**A:** WFGY 不是「禁止」LLM 发挥，而是给输出「打标签」：
- 高置信度的内容，直接用
- 低置信度的内容，标注出来，提醒用户注意
- 关键场景（比如法律、医疗），开启多轮自一致性验证

你可以根据场景调整阈值，找到适合你的平衡点。这是项目中最有实用价值的部分。

### Q: 支持哪些国产大模型？

**A:** 已规划 19 个国产大模型适配器（通义千问、文心一言、混元、豆包、星火、GLM、Kimi 等），但目前均为骨架实现，尚未真正调用各厂商 API。欢迎贡献真实的适配器！

### Q: 可以商用吗？

**A:** 可以。OpenTaiji 使用 MIT 许可证。但请注意项目处于早期实验阶段，不建议直接用于生产环境。

---

## 💬 社区与联系方式

- 🐙 [GitHub Issues](https://github.com/opentaiji/opentaiji/issues) - Bug 反馈，功能请求
- 📧 [邮件列表](mailto:community@opentaiji.dev) - 正式通知，重大更新

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

## ⚠️ 重要声明

1. **实验性项目**：本项目处于早期实验阶段（Pre-Alpha），不适合生产使用
2. **代码来源**：项目代码主要由 AI Agent 团队生成，需要人类工程师深度审查和重写
3. **诚实承诺**：我们会持续更新「功能实现状态」表格，确保文档与代码保持一致
4. **欢迎监督**：如果你发现文档描述与实际代码不符，请提 Issue，我们会立即修正

---

<div align="center">

**用太极哲学，构建下一代智能系统。**

*道生一，一生二，二生三，三生万物。*

Made with ❤️ by the OpenTaiji Team

</div>

---

*最后更新：2026-04-25*  
*文档版本：v1.1（诚实版）*
