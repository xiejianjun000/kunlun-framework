# 昆仑框架 (Kunlun Framework)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/xiejianjun000/kunlun-framework?style=social)](https://github.com/xiejianjun000/kunlun-framework/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/xiejianjun000/kunlun-framework?style=social)](https://github.com/xiejianjun000/kunlun-framework/network/members)

> **开源多智能体框架** - 整合 OpenCLAW v2026.4.15 + Hermes v0.9.0 + Claude Code
>
> **Apache 2.0 许可证** - 所有能力100%开源，不阉割

---

## 🎯 核心定位

**昆仑框架 = 能力基座 + 接口定义 + 扩展点 + 适配器**

- ✅ **框架提供能力**：接口定义、扩展点、适配器、插件系统
- ✅ **项目定义业务**：具体业务逻辑、技能包、知识库

---

## 🏗️ 五层架构

```
L1 接入层 → 微信/企业微信/飞书/20+平台
L2 网关层 → 认证 + 路由 + 限流
L3 协调层 → Actor Runtime + Dreaming System
L4 执行层 → 技能 + 记忆 + 人格 + 进化
L5 数据层 → PostgreSQL + Qdrant + Redis + Kafka + Neo4j
```

---

## 🚀 核心能力

### 人格蒸馏系统
```typescript
五维画像：
- 沟通风格 (communication_style)
- 决策模式 (decision_making)
- 学习偏好 (learning_preference)
- 创造力 (creativity)
- 风险偏好 (risk_tolerance)
```

### 技能自动生成
```
模式识别 → 候选生成 → 用户确认 → 质量验证
```

### 技能生态兼容
```
UnifiedSkill = ClawHub + Hermes + Kunlun
```

### 自我修改能力
```
代码自修改 + 配置自调整 + 架构自优化
```

### 💓 心跳自检系统

昆仑框架内置心跳功能，提供周期性健康检查和实时自检能力。

#### 三道防线

| 层级 | 触发时机 | 纠偏动作 |
|------|----------|----------|
| 实时自检 | 回复生成前 | 检查是否符合SOUL人设 |
| 心跳巡检 | 每30分钟 | 检查最近行为是否合规 |
| 用户反馈 | 收到"跑偏了" | 立即触发深度纠偏 |

#### 内置检查项

| 检查项 | 说明 | 严重级别 |
|--------|------|----------|
| `persona_compliance` | 人设合规检查 - 检查最近对话是否符合SOUL人设 | high |
| `tool_call` | 工具调用检查 - 检查是否有连续失败超过阈值 | high |
| `memory_pollution` | 记忆污染检查 - 检查记忆文件是否有矛盾内容 | medium |
| `task_completion` | 任务完成检查 - 检查是否有长时间未完成的任务 | medium |
| `system_health` | 系统健康检查 - 检查资源使用情况 | low |

#### 心跳模块文件结构

```
src/core/heartbeat/
├── index.ts              # 模块导出
├── CheckItem.ts          # 接口定义
├── HeartbeatManager.ts   # 心跳管理器（主类）
├── HeartbeatChecker.ts   # 检查器（执行检查）
├── HeartbeatScheduler.ts # 调度器（定时触发）
├── heartbeat.md          # 检查清单模板
└── checkers/
    └── BuiltinCheckers.ts # 5个内置检查器实现
```

---

## 🔒 安全机制

### 三大系统安全整合
- **OpenCLAW**：沙箱隔离（Docker容器）
- **Hermes**：权限控制（六类五级）
- **Claude Code**：双保险（沙箱+权限）

### ⚠️ 主动授权
**涉及电脑安全的操作必须主动跳出授权**

```typescript
必须授权的操作：
- 危险命令（sudo、rm -rf、curl | bash）
- 敏感文件（~/.ssh、.env、credentials）
- 未知域名
- 系统修改（/etc、/usr/local）
- 进程管理（kill、systemctl）
```

### 三级安全预设
| 预设 | 沙箱 | 文件访问 | 命令执行 | 适用场景 |
|------|------|---------|---------|----------|
| developer | 关闭 | 任意 | 任意 | 开发者 |
| standard（默认） | 开启 | 用户文件夹 | 无管理员 | 普通用户 |
| enterprise | 严格 | 仅应用 | 仅应用内 | 企业 |

---

## 📦 安装

```bash
npm install kunlun-framework
```

---

## 🎬 快速开始

### 1. 创建框架实例

```typescript
import { KunlunFramework } from 'kunlun-framework';

const kunlun = new KunlunFramework({
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

  // 心跳系统配置（可选，默认启用）
  heartbeat: {
    interval: 30 * 60 * 1000, // 30分钟
    enableBuiltinCheckers: true,
    failureThreshold: 3,
  }
});
```

### 2. 初始化框架

```typescript
await kunlun.initialize(); // 心跳系统自动启动
```

### 3. 使用心跳功能

```typescript
// 手动触发检查
const results = await kunlun.triggerHeartbeatCheck();

// 添加自定义检查项
kunlun.addHeartbeatCheckItem({
  id: 'my_check',
  name: '自定义检查',
  description: '检查自定义业务逻辑',
  severity: 'medium',
  check: async () => {
    return {
      itemId: 'my_check',
      itemName: '自定义检查',
      status: 'pass',
      message: '检查通过',
      timestamp: new Date(),
    };
  },
});

// 获取心跳状态
const status = kunlun.getHeartbeatStatus();
console.log('心跳运行状态:', status.isRunning);
```

---

## 🔌 适配器系统

### 存储适配器

```typescript
// 本地存储
import { LocalStorageAdapter } from 'kunlun-framework/adapters/storage/local';

// AWS S3
import { S3StorageAdapter } from 'kunlun-framework/adapters/storage/s3';

// MinIO
import { MinioStorageAdapter } from 'kunlun-framework/adapters/storage/minio';
```

### 消息适配器

```typescript
// 微信
import { WeChatAdapter } from 'kunlun-framework/adapters/messaging/wechat';

// 企业微信
import { WeComAdapter } from 'kunlun-framework/adapters/messaging/wecom';

// 飞书
import { FeishuAdapter } from 'kunlun-framework/adapters/messaging/feishu';
```

### LLM适配器

```typescript
// OpenAI
import { OpenAIAdapter } from 'kunlun-framework/adapters/llm/openai';

// DeepSeek
import { DeepSeekAdapter } from 'kunlun-framework/adapters/llm/deepseek';

// 本地模型
import { LocalModelAdapter } from 'kunlun-framework/adapters/llm/local';
```

---

## 🔧 扩展点系统

### 注册扩展点

```typescript
kunlun.registerExtension(
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

await kunlun.installPlugin(plugin);
```

---

## 📊 可扩展性

**昆仑框架支持任意规模（1-N人）**

```
1人使用 → 单租户模式，资源最小化
10人使用 → 多租户模式，按需分配
100人使用 → 分库分表，负载均衡
1000人使用 → 弹性伸缩，自动扩容
10000人使用 → 集群部署，分布式架构
```

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 测试覆盖率
npm run test:coverage

# 运行心跳模块测试
npm test -- --testPathPattern=heartbeat
```

---

## 📚 文档

- [架构设计](./docs/architecture.md)
- [核心接口](./docs/interfaces.md)
- [扩展点系统](./docs/extensions.md)
- [适配器开发](./docs/adapters.md)
- [安全机制](./docs/security.md)
- [心跳系统](./src/core/heartbeat/heartbeat.md)
- [部署指南](./docs/deployment.md)

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

Apache 2.0 - 详见 [LICENSE](./LICENSE)

---

## 🙏 致谢

昆仑框架整合了以下优秀开源项目的核心能力：

- [OpenCLAW](https://github.com/clawdotnet/openclaw) - 多平台消息网关
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - 自我学习与记忆系统
- [Claude Code](https://code.claude.com) - 专业代码生成能力

---

**昆仑框架团队**  
📧 contact@kunlun-framework.dev  
🌐 https://kunlun-framework.dev
