# 昆仑（Kunlun）- 多智能体开源框架

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

> 基于Actor模型 + LLM对话引擎的多智能体开源框架，为政务、企业提供千人级智能体系统解决方案。

## 🚀 一句话介绍

昆仑是一个多智能体协作框架，让每个用户都能拥有独立人格、永久记忆、持续进化的AI助手。

## ✨ 核心特性

### 🏗️ 架构能力
- **Actor模型**：原生支持并发，轻松应对千人级访问
- **多租户架构**：每个用户独立隔离，数据安全有保障
- **五层架构**：接入层 → 网关层 → 协调层 → 执行层 → 数据层

### 🧠 智能能力
- **技能系统**：沙箱执行 + 12个生命周期钩子 + 配额管理
- **记忆系统**：四层记忆架构 + 知识图谱 + 多模式检索
- **进化系统**：遗传算法 + 强化学习 + 自我优化
- **人格系统**：五维画像 + 行为蒸馏 + 渐进式更新

### 🔐 安全能力
- **心跳巡检**：30分钟自动巡检，三道防线保障
- **敏感操作检测**：涉及电脑安全主动授权
- **审计日志**：完整操作记录，可追溯可回放

## 🎯 适用场景

| 场景 | 描述 |
|------|------|
| 🏛️ 政务服务 | 智能审批、政策咨询、公文处理 |
| 🏢 企业办公 | 知识管理、流程自动化、智能助手 |
| 🎓 教育培训 | 个性化教学、学习追踪、能力评估 |
| 🏥 医疗健康 | 病历管理、诊断辅助、健康咨询 |

## 📦 快速开始

```bash
# 克隆仓库
git clone https://github.com/kunlun-ai/kunlun-framework.git

# 安装依赖
cd kunlun-framework
npm install

# 运行示例
npm run example:basic
```

```typescript
import { KunlunFramework } from 'kunlun-framework';

// 创建框架实例
const framework = new KunlunFramework({
  multiTenant: true,
  heartbeat: { interval: 1800000 } // 30分钟
});

// 初始化
await framework.initialize();

// 注册用户
const user = await framework.registration.register({
  channel: 'feishu',
  name: '张三',
  department: '环评审批科'
});

// 安装技能
await framework.skills.install(user.id, 'eia-review-skill');

// 存储记忆
await framework.memory.store(user.id, {
  content: '今日完成3份环评报告审查',
  importance: 0.8
});
```

## 🏛️ 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    昆仑框架架构                          │
├─────────────────────────────────────────────────────────┤
│  L1 接入层    │ 前端UI + 消息网关（微信/飞书/邮件等）      │
│  L2 网关层    │ API Gateway + Message Router             │
│  L3 协调层    │ Actor Runtime + Multi-Agent Coordinator  │
│  L4 执行层    │ Skill Engine + Memory + Personality      │
│  L5 数据层    │ PostgreSQL + Qdrant + Redis + Kafka      │
└─────────────────────────────────────────────────────────┘
```

## 📊 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.0+ |
| 运行时 | Node.js 18+ / Deno |
| 数据库 | PostgreSQL / MySQL |
| 向量库 | Qdrant / Pinecone / Weaviate |
| 缓存 | Redis |
| 消息队列 | Kafka / RabbitMQ |
| 容器 | Docker / Kubernetes |

## 🔌 生态

- **昆仑·生态环境**：环评审批、法规库、水气土监测
- **昆仑·教育**：智能教学、学习追踪
- **昆仑·医疗**：病历管理、诊断辅助
- **技能市场**：社区共享技能

## 📖 文档

- [快速开始](./docs/quick-start.md)
- [API文档](./API.md)
- [架构设计](./ARCHITECTURE.md)
- [贡献指南](./CONTRIBUTING.md)

## 🤝 贡献

欢迎贡献代码、报告问题、提出建议！

```bash
# Fork → Clone → Branch → Commit → PR
git checkout -b feature/my-feature
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

## 📄 许可证

- **核心框架**：Apache 2.0
- **企业扩展**：商业许可证
- **社区插件**：MIT / Apache 2.0

## 🌟 Star History

如果这个项目对你有帮助，请给我们一个 Star ⭐

---

**技术哲学**：*"好的架构让商业自然发生，好的激励让生态自驱动。"*

**官网**：https://kunlun.ai  
**社区**：https://github.com/kunlun-ai/kunlun-framework/discussions  
**邮箱**：contact@kunlun.ai
