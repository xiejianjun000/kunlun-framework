# OpenTaiji 太极

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/xiejianjun000/open-taiji?style=social)](https://github.com/xiejianjun000/open-taiji/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/xiejianjun000/open-taiji?style=social)](https://github.com/xiejianjun000/open-taiji/network/members)

> **动态平衡的开源多智能体框架**
>
> Apache 2.0 许可证 · 所有能力100%开源，不阉割

---

## 🎯 核心理念

**太极生两仪，两仪生四象，四象生八卦。**

OpenTaiji相信：**智能不是静态的，而是在动态中寻求平衡。**

我们构建的不是冰冷的工具，而是能够持续学习、自我进化的智能体系统。就像太极一样，柔中带刚，静中有动，在变化中找到最优解。

---

## ⚡ 为什么选择OpenTaiji？

**传统框架 vs OpenTaiji**

```
传统框架：你调教它
├── 手动配置 → 写模板 → 定义规则 → 维护更新
└── 停留在你配置的水平

OpenTaiji：它学习你
├── 自然对话 → 实时学习 → 自动进化 → 越用越懂
└── 持续提升，永不停滞
```

**时间轴对比**：

| 时间 | 传统框架 | OpenTaiji |
|------|---------|-----------|
| Day 1 | 配置 → 基础问答 | 配置 → 基础问答 + **开始学习** |
| Day 10 | 还是基础问答 | 已记住你的偏好、风格、常用技能 |
| Day 100 | 还是基础问答 | 像老朋友一样，预判你的需求 |

**不是"开箱就懂你"，而是"开箱就开始懂你"。**

---

## ✨ 核心优势

### 🔄 动态人格蒸馏

**业界首创的动态人格进化系统**

传统人格复刻是"一次性提取"——生成一个.skill文件就结束了。OpenTaiji不同：

```
传统方式：用户数据 → 提取 → .skill文件 → 静止
OpenTaiji：用户数据 → 五维画像 → 持续进化 → 三层进化体系
```

**五维人格画像**：
- 沟通风格 (communication_style)
- 决策模式 (decision_making)
- 学习偏好 (learning_preference)
- 创造力 (creativity)
- 风险偏好 (risk_tolerance)

**三层进化体系**：
- **个人层**：单次对话学习 → 行为调整
- **部门层**：团队反馈聚合 → 风格统一
- **系统层**：组织规范注入 → 合规保障

### ⚡ Actor并发模型

**N×1架构，支撑千人级并发**

每个用户一个Actor，独立状态、独立记忆、独立进化：
- 自然隔离：用户间数据天然隔离
- 弹性扩展：Actor数量随负载自动调整
- 容错恢复：单个Actor崩溃不影响其他用户

### 🔧 技能自动生成

**从任务轨迹自动提取可复用技能**

传统框架需要手动编写技能，OpenTaiji能自动学习：

```
任务执行 → 轨迹分析 → 模式提取 → 技能生成 → 用户确认 → 质量验证
```

**核心能力**：
- **轨迹分析**：自动识别成功任务的关键步骤
- **模式提取**：LLM辅助提取可复用模式
- **技能生成**：自动生成标准SKILL.md文件
- **进化追踪**：技能版本管理、使用统计、效果评估

**内置模式模板**：
- 文件操作模式（读→改→验证）
- API调用模式（准备→执行→解析）
- 搜索模式（查询→过滤→提取）

### 🔌 MCP协议原生支持

**Model Context Protocol，打通模型与工具的桥梁**

内置28个MCP工具，开箱即用：
- 文件操作：读写、搜索、监控
- 代码分析：语法树、依赖图、质量检测
- 网络访问：HTTP请求、API调用
- 数据处理：格式转换、数据清洗

### 🧠 知识图谱记忆

**SQLite原生图存储，无需额外依赖**

- NodeManager：节点CRUD + 批量导入
- EdgeManager：关系管理 + 类型约束
- GraphQuery：路径查询 + 社区发现

### 🌙 梦境强化系统

**睡眠中的智能体更聪明**

基于7种信号评分的梦境学习：
- 用户反馈权重
- 任务成功率
- 知识覆盖率
- 人设一致性
- 技能使用频率
- 创新尝试次数
- 错误恢复能力

---

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     接入层 (L1)                          │
│   微信 · 企业微信 · 飞书 · 钉钉 · Slack · Discord          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     网关层 (L2)                          │
│        认证 · 路由 · 限流 · 多租户隔离                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     协调层 (L3)                          │
│   Actor Runtime · Dreaming System · 心跳自检              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     执行层 (L4)                          │
│   技能系统 · 记忆系统 · 人格系统 · 进化系统                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     数据层 (L5)                          │
│   PostgreSQL · Qdrant · Redis · Kafka · Neo4j           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎬 快速开始

### 安装

```bash
npm install open-taiji
```

### 创建框架实例

```typescript
import { TaijiFramework } from 'open-taiji';

const Taiji = new TaijiFramework({
  // 多租户配置
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },
  
  // 技能系统配置
  skillSystem: {
    maxSkillsPerUser: 100,
    skillIsolation: 'venv'
  },
  
  // 记忆系统配置
  memorySystem: {
    vectorDb: {
      adapter: 'qdrant',
      url: 'localhost:6333'
    }
  },
  
  // 安全配置
  security: {
    level: 'standard',
    approvalRequired: [
      'dangerous_commands',
      'sensitive_files',
      'system_modifications'
    ]
  },

  // 心跳系统配置
  heartbeat: {
    interval: 30 * 60 * 1000, // 30分钟
    enableBuiltinCheckers: true,
    failureThreshold: 3,
  }
});

await Taiji.initialize();
```

### 使用人格蒸馏

```typescript
// 开始人格学习
const distiller = Taiji.getPersonalityDistiller();

// 注入对话历史
await distiller.ingestHistory(conversationHistory);

// 生成五维画像
const profile = await distiller.extractProfile();

// 持续进化
await distiller.evolve(feedback);
```

### 使用知识图谱

```typescript
const graph = Taiji.getGraphMemory();

// 添加节点
await graph.addNode({
  type: 'concept',
  content: 'Actor模型',
  metadata: { domain: 'distributed-systems' }
});

// 建立关系
await graph.addEdge({
  from: 'actor-model',
  to: 'message-passing',
  type: 'uses',
  weight: 0.9
});

// 路径查询
const path = await graph.findPath('actor-model', 'distributed-systems');
```

---

## 💼 应用场景

### 👤 个人用户

**打造你的数字分身**

- 记忆持久化：重要对话自动归档，随时回顾
- 风格复刻：学习你的表达方式，越用越像你
- 技能进化：常用操作自动生成技能包
- 隐私保护：本地部署，数据完全自主

### 🏢 企业用户

**构建企业级AI助手矩阵**

- 多部门协同：财务、法务、技术各司其职
- 知识沉淀：企业知识图谱自动构建
- 流程自动化：审批、报表、通知全自动
- 合规审计：所有行为可追溯

### 🏛️ 政务用户

**智慧政务新范式**

- 政策问答：精准解读，引用原文
- 材料预审：自动校验完整性
- 舆情监测：实时预警，智能分析
- 数据脱敏：敏感信息自动识别

### 🏥 医疗用户

**医疗AI的安全之选**

- 病历分析：结构化提取，辅助诊断
- 药物交互：自动检测配伍禁忌
- 患者随访：智能提醒，数据采集
- 隐私合规：符合医疗数据安全标准

### 💰 金融用户

**金融场景的专业保障**

- 合规审查：自动识别风险条款
- 报告生成：财报、尽调报告自动撰写
- 反欺诈：异常行为模式识别
- 监管对接：标准化数据报送

---

## 🔒 安全机制

### 三级安全预设

| 预设 | 沙箱 | 文件访问 | 命令执行 | 适用场景 |
|------|------|---------|---------|----------|
| developer | 关闭 | 任意 | 任意 | 开发者 |
| standard（默认） | 开启 | 用户文件夹 | 无管理员 | 普通用户 |
| enterprise | 严格 | 仅应用 | 仅应用内 | 企业 |

### 主动授权

**涉及安全的操作必须用户确认**：

```typescript
必须授权的操作：
- 危险命令（sudo、rm -rf、curl | bash）
- 敏感文件（~/.ssh、.env、credentials）
- 系统修改（/etc、/usr/local）
- 进程管理（kill、systemctl）
```

### 心跳自检

**三道防线确保系统稳定**：

| 层级 | 触发时机 | 纠偏动作 |
|------|----------|----------|
| 实时自检 | 回复生成前 | 检查是否符合SOUL人设 |
| 心跳巡检 | 每30分钟 | 检查最近行为是否合规 |
| 用户反馈 | 收到"跑偏了" | 立即触发深度纠偏 |

---

## 🔧 扩展点系统

### 注册扩展点

```typescript
Taiji.registerExtension(
  ExtensionPoint.SKILL_INSTALL,
  async (context) => {
    console.log('技能已安装:', context.skillId);
    return context;
  }
);
```

### 创建插件

```typescript
const plugin = {
  id: 'my-plugin',
  name: '我的插件',
  version: '1.0.0',
  
  onInstall: async (context) => {
    console.log('插件安装中...');
  },
  
  extensions: [
    {
      point: ExtensionPoint.MEMORY_STORE,
      handler: async (memory) => {
        // 自定义记忆存储逻辑
        return memory;
      }
    }
  ]
};

await Taiji.installPlugin(plugin);
```

---

## 🔌 适配器系统

### 存储适配器

```typescript
// 本地存储
import { LocalStorageAdapter } from 'open-taiji/adapters/storage/local';

// AWS S3
import { S3StorageAdapter } from 'open-taiji/adapters/storage/s3';

// MinIO
import { MinioStorageAdapter } from 'open-taiji/adapters/storage/minio';
```

### 消息适配器

```typescript
// 微信
import { WeChatAdapter } from 'open-taiji/adapters/messaging/wechat';

// 企业微信
import { WeComAdapter } from 'open-taiji/adapters/messaging/wecom';

// 飞书
import { FeishuAdapter } from 'open-taiji/adapters/messaging/feishu';
```

### LLM适配器

```typescript
// OpenAI
import { OpenAIAdapter } from 'open-taiji/adapters/llm/openai';

// DeepSeek
import { DeepSeekAdapter } from 'open-taiji/adapters/llm/deepseek';

// 本地模型
import { LocalModelAdapter } from 'open-taiji/adapters/llm/local';
```

---

## 📊 项目规模

### 代码统计

| 模块 | 代码行数 | 核心能力 |
|------|---------|---------|
| **核心层** | 22,837行 | Actor运行时、MCP客户端、多租户、心跳系统 |
| **模块层** | 53,600行 | 技能系统、人格系统、进化系统、记忆系统 |
| **集成层** | 5,537行 | MCP Client、GraphMemory SQLite |
| **适配层** | 6,722行 | LLM适配器、消息适配器、存储适配器 |

### 核心模块详解

| 子模块 | 行数 | 来源 |
|--------|------|------|
| Actor Runtime | 7,458 | 并发模型核心 |
| 多租户系统 | 6,999 | 租户隔离与管理 |
| 技能系统 | 9,278 | 含自动生成模块 |
| 人格系统 | 6,401 | 五维画像+蒸馏 |
| 进化系统 | 9,499 | 三层进化体系 |
| 记忆系统 | 20,627 | 含梦境强化系统 |
| MCP Client | 2,714 | 28工具集成 |
| GraphMemory | 2,823 | SQLite图存储 |

### 质量指标

| 指标 | 数值 |
|------|------|
| 测试用例 | 86+ |
| 编译通过率 | 95%+ |
| 文档覆盖率 | 100% |

---

## 🤝 贡献指南

我们欢迎所有形式的贡献：

1. **提交Issue**：Bug报告、功能建议
2. **提交PR**：代码修复、功能实现
3. **完善文档**：使用案例、最佳实践
4. **分享经验**：博客文章、技术分享

---

## 📮 联系我们

- **项目负责人**：awep000@qq.com
- **项目助手**：kaka-eco@coze.email
- **GitHub**：https://github.com/xiejianjun000/open-taiji

---

## 📜 许可证

Apache 2.0 License - 自由使用、修改、分发

---

**太极之道，动态平衡。智能进化，永无止境。**
