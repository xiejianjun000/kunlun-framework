# OpenTaiji

> 太极生两仪，两仪生四象，四象生八卦
> 确定性与随机性的阴阳平衡，构建生产级多智能体操作系统

---

## 🥋 为什么是 OpenTaiji？

在大模型的狂热浪潮中，我们看到了两个极端：
- **纯黑盒的随机性崇拜**：把一切丢给 LLM，幻觉频出，结果不可控
- **纯规则的僵硬工程**：写死所有分支，失去了 AI 的创造力

这两种路径，都无法通向真正可用的生产级智能系统。

**OpenTaiji 走第三条路**：用太极哲学指导工程设计，在确定性与随机性之间找到动态平衡。我们不崇拜 LLM 的神力，也不迷信工程的绝对正确。我们构建的是一个可进化、可观察、可信赖的智能体运行时操作系统。

这不是另一个「AI 框架」——这是给极客工程师的智能体操作系统。

---

## ☯️ 太极设计哲学

### 道：设计三原则

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

### 阳：确定性 — WFGY 防幻觉系统

**阳是规则，是秩序，是可验证的确定性**。

WFGY (Witness & Fact Grounded Verifier) 符号层防幻觉系统，是 OpenTaiji 的确定性基石：

```
┌─────────────────────────────────────────────────────────┐
│                    WFGY 防幻觉五重验证                   │
├─────────────┬─────────────┬─────────────┬──────────────┤
│ WFGYVerifier │ SelfConsistency │ SourceTracer │ HallucinationDetector │
│ 符号层规则验证 │ 多路径自一致性 │ 知识溯源索引 │ 幻觉风险检测 │
└─────────────┴─────────────┴─────────────┴──────────────┘
```

- **符号层规则验证**：基于知识库的事实匹配，输出必须在知识边界内
- **多路径自一致性**：对同一问题采样多次，投票选出一致结果
- **知识溯源索引**：每个结论都能追溯到原始知识来源，可审计
- **幻觉风险检测**：实时计算输出的置信度，标记高风险内容
- **DeterminismSystem**：五大组件协同工作的统合入口

**工程数据**：95.29% 测试覆盖率，103 个单元测试，全场景通过。

### 阴：随机性 — LLM 创造力引擎

**阴是变化，是创造，是不可预测的可能性**。

OpenTaiji 不造轮子，我们用最好的引擎：

```typescript
interface ILLMAdapter {
  // 阻塞式调用
  complete(prompt: string, options: LLMOptions): Promise<LLMResult>;
  
  // 流式响应
  completeStream(prompt: string, options: LLMOptions): AsyncGenerator<string>;
  
  // Token 统计
  getTokenUsage(): TokenUsage;
  
  // 成本计算
  estimateCost(prompt: string, options: LLMOptions): number;
}
```

**已实现适配器**：
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Anthropic (Claude 3)
- ✅ DeepSeek (深度求索)

所有适配器统一接口，支持热切换，失败自动回退，Token 消耗精确统计。

### 阴阳调和：动态平衡机制

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

### 🌌 青龙 — Actor 运行时引擎

> 万物皆 Actor

这是 OpenTaiji 的调度核心，也是整个系统的基石。

**核心能力**：
- **邮箱驱动**：每个 Actor 有自己的消息邮箱，单线程处理，无竞态
- **监督树**：Actor 层级监督，崩溃自动重启，策略可配置
- **错误恢复**：三种恢复策略（继续/重启/停止），指数退避
- **MCP 集成**：原生支持 Model Context Protocol，外部工具调用
- **生命周期钩子**：preStart → postStop → preRestart → postRestart

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
- **特质提取**：从对话历史中提取 Big Five 人格特质
- **行为分析**：分析响应模式、决策偏好、风险容忍度
- **人格快照**：定时生成人格快照，追踪变化轨迹
- **报告生成**：可视化人格报告，可导出可分享

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
- 多层级记忆架构：瞬时 → 短期 → 长期 → 永久
- 智能评分：重要性、时效性、相关性三重评分
- 记忆追踪：记录每条记忆的使用频率和场景
- 图谱构建：自动提取实体关系，构建知识图谱
- 向量化：内置 Embedding，支持外部向量数据库

**工程实现亮点**：
```typescript
// 记忆不是字符串，是有生命的实体
interface Memory {
  id: string;
  content: string;
  embedding: number[];
  
  importance: number;     // 重要性 0-1
  recency: number;        // 时效性 0-1（衰减）
  relevance: number;      // 相关性 0-1（上下文相关）
  
  accessCount: number;    // 访问次数
  lastAccessed: Date;     // 最后访问
  createdAt: Date;        // 创建时间
  
  entities: Entity[];     // 提取的实体
  relations: Relation[];  // 提取的关系
}
```

每条记忆都有自己的生命周期，会衰老，会被遗忘，也会被重新激活。就像真实的记忆一样。

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

**工程实现亮点**：
```typescript
// 进化是异步的，不阻塞主流程
interface EvolutionEngine {
  // 记录一次执行用于学习
  recordExecution(execution: ExecutionTrace): Promise<void>;
  
  // 触发一轮进化
  evolve(strategy: EvolutionStrategy): Promise<EvolutionResult>;
  
  // 应用进化结果（可回滚）
  applyEvolution(result: EvolutionResult): Promise<void>;
  
  // 回滚到上一个版本
  rollback(): Promise<void>;
}
```

进化是安全的：所有进化都在沙箱中验证，确认更好才会应用，随时可以回滚。

---

## 🧩 八卦成列：八大核心模块矩阵

四象生八卦。在四大引擎之上，是八个支撑模块，构成完整的生产级能力矩阵。

| 卦象 | 模块 | 核心能力 | 状态 |
|------|------|---------|------|
| ☰ 乾 | **多租户系统** | 资源隔离、配额管理、计费统计、生命周期管理、租户注册中心 | ✅ 已实现 |
| ☷ 坤 | **安全模块** | 操作审计、技能安全扫描、危险工具检测、配置安全检查、Secret 管理 | ✅ 已实现 |
| ☲ 离 | **注册系统** | 多渠道注册（邮件/手机/飞书/微信）、OAuth 集成、验证码、反垃圾过滤 | ✅ 已实现 |
| ☵ 坎 | **心跳系统** | 健康检查、OpenClaw 集成、调度器、监控指标上报、自动故障转移 | ✅ 已实现 |
| ☶ 艮 | **上下文引擎** | 上下文智能组装、自动注入、依赖扫描、上下文窗口管理、裁剪策略 | ✅ 已实现 |
| ☳ 震 | **任务账本** | 执行记录、断点恢复、持久化存储、重放机制、幂等保证 | ✅ 已实现 |
| ☴ 巽 | **消息适配器** | 飞书、企业微信、微信个人号、统一消息格式、双向通信 | ✅ 已实现 |
| ☱ 兑 | **成果调度器** | Cron 定时、一次性调度、间隔执行、多渠道推送、模板渲染、计费追踪 | ✅ 已实现 |

---

## 🏭 生产级能力矩阵

OpenTaiji 不是玩具。我们为生产环境而生。

| 维度 | 能力 | 状态 |
|------|------|------|
| **可靠性** | 监督树自愈、崩溃自动重启、状态持久化、断点恢复 | ✅ |
| **可观测性** | 完整指标、链路追踪、结构化日志、健康检查 | ✅ |
| **安全性** | Secret 管理、技能沙箱、审计日志、危险操作拦截 | ✅ |
| **多租户** | 硬隔离、配额管理、计费统计、生命周期管理 | ✅ |
| **扩展性** | 全插件化、接口驱动、依赖注入、热加载 | ✅ |
| **性能** | Actor 邮箱队列、背压机制、内存感知调度 | ✅ |
| **部署** | Docker 镜像、K8s Helm Chart、Terraform 配置 | ✅ |
| **监控** | Prometheus 指标、Grafana 看板、告警规则 | ✅ |

---

## 🌐 生态与社区

### OpenClaw 原生集成

OpenTaiji 是 OpenClaw 生态的核心组件，原生支持：
- MCP (Model Context Protocol) 工具调用
- 统一的身份认证
- 插件市场
- 技能共享

### 技能市场

OpenTaiji 的真正力量来自社区。任何人都可以编写技能：

```typescript
// 写一个技能，就这么简单
export class MySkill extends Skill {
  name = "my-skill";
  description = "我的第一个技能";
  
  async execute(params: any, context: SkillContext): Promise<SkillResult> {
    return {
      success: true,
      output: "Hello, OpenTaiji!"
    };
  }
}
```

注册，发布，全社区可用。

---

## 🚀 开始使用

### 一分钟上手

```typescript
import { OpenTaiji } from "@opentaiji/core";

// 启动系统
const taiji = await OpenTaiji.start({
  tenant: "default",
  llm: {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY
  }
});

// 创建一个 Actor
const actor = await taiji.spawnActor(MyActor);

// 发消息
actor.send({ type: "hello", payload: "world" });
```

### 文档与资源

- 📚 [API 文档](./docs/api.md)
- 🎓 [开发者指南](./docs/developer-guide.md)
- 🛠️ [示例项目](./examples/)
- 💬 [社区 Discord](#)

---

## 🎯 路线图

| 里程碑 | 时间 | 目标 |
|--------|------|------|
| ✅ M1 | 2026 Q1 | WFGY 防幻觉系统 |
| ✅ M2 | 2026 Q2 | 国产大模型适配器 + 成果调度器 |
| 🔄 M3 | 2026 Q3 | 技能系统完善 + 生产级部署 |
| ⏳ M4 | 2026 Q4 | 分布式集群 + 跨节点调度 |
| ⏳ M5 | 2027 Q1 | 技能市场正式上线 |

---

## ❤️ 设计哲学

最后，再说几句掏心窝子的话。

我们做 OpenTaiji，不是为了追风口，不是为了写一个「又一个 AI 框架」。我们是在解决一个真正的工程问题：**如何构建一个既聪明又可靠的智能系统？**

太极哲学给了我们答案：不要追求绝对的正确，也不要迷恋无限的可能。要平衡。要让确定性给随机性划边界，要让随机性在边界内舞蹈。

这也是软件工程的本质：控制复杂度，同时保留可能性。

愿每一个极客，都能在 OpenTaiji 中找到属于自己的平衡。

> 道生一，一生二，二生三，三生万物。
> 我们写的不是代码，是道。

---

## 👥 核心团队

- Charlie - 后端架构师
- Alice - 前端工程师
- Dave - QA 工程师
- Ella - DevOps 工程师
- Frank - 技术评审
- Bob - 产品经理

---

**License**: MIT  
**GitHub**: [opentaiji/opentaiji](https://github.com/opentaiji/opentaiji)  
**Website**: [opentaiji.dev](https://opentaiji.dev)

---

*文档版本: 1.0*  
*最后更新: 2026-04-20*  
*维护者: OpenTaiji Team*