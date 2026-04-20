# OpenTaiji

生产级多智能体目标规划框架

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![status](https://img.shields.io/badge/status-WIP-yellow.svg)](https://github.com/opentaiji/opentaiji)

## 📖 简介

OpenTaiji 是一个生产级多智能体目标规划框架，目标是在 6-9 个月内将其打造为功能完整、文档准确、测试充分、安全可靠的生产级多智能体框架。

**当前状态：功能完整性 30%，文档准确性 35%，测试覆盖率 ~40%**

**当前阶段：Phase 1 - 功能补齐（解决"纸上功能"问题）**

## 🎯 功能实现状态

| 功能 | 状态 | 版本 | 备注 |
|------|------|------|------|
| Actor Runtime | ✅ 已实现 | v0.1.0 | |
| 技能执行引擎 | ✅ 已实现 | v0.1.0 | |
| 记忆系统 | ⚠️ 部分实现 | v0.1.0 | 基础存储已实现 |
| WFGY防幻觉系统 | 🚧 开发中 | - | 预计v0.2.0 |
| Self-Consistency检查 | 📋 计划中 | - | |
| 溯源索引 | 📋 计划中 | - | |
| 幻觉检测 | 📋 计划中 | - | |
| 成果调度器 | ⚠️ 部分实现 | v0.1.0 | 仅支持基础cron |
| 模板引擎 | 📋 计划中 | - | |
| 多渠道推送 | 📋 计划中 | - | |
| 执行追踪 | 📋 计划中 | - | |
| 计费追踪 | 📋 计划中 | - | |
| OpenAI 适配器 | ✅ 已实现 | v0.1.0 | |
| Anthropic 适配器 | ✅ 已实现 | v0.1.0 | |
| 通义千问适配器 | 📋 计划中 | - | |
| 文心一言适配器 | 📋 计划中 | - | |
| 腾讯混元适配器 | 📋 计划中 | - | |
| 字节豆包适配器 | 📋 计划中 | - | |
| 讯飞星火适配器 | 📋 计划中 | - | |
| 智谱GLM适配器 | 📋 计划中 | - | |
| Kimi适配器 | 📋 计划中 | - | |
| 多租户隔离 | ⚠️ 部分实现 | v0.1.0 | 基础支持 |
| 资源配额 | 📋 计划中 | - | |
| 可观测性指标 | 📋 计划中 | - | |

**状态说明：**
- ✅ 已实现：功能完整，可使用
- ⚠️ 部分实现：部分功能可用，仍在开发
- 🚧 开发中：当前迭代开发中
- 📋 计划中：计划开发，尚未实现

## 🚀 当前版本

**v0.1.0 (2026-04-20)**

### 已实现功能

- Actor 运行时基础框架
- 基础技能执行引擎
- OpenAI / Anthropic LLM 适配
- 基础多租户支持
- 基础记忆存储

### 已实现 API

#### Taiji 核心接口

```typescript
import { Taiji } from 'opentaiji';

// 初始化 Taiji 实例
const taiji = new Taiji({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }
});

// 执行技能
const result = await taiji.executeSkill(skillName, params);
console.log(result.output);
```

#### 技能定义示例

```typescript
import { Skill, SkillContext } from 'opentaiji';

export class MySkill extends Skill {
  name = 'my-skill';
  description = '我的第一个技能';

  async execute(params: any, context: SkillContext) {
    // 技能实现
    return {
      success: true,
      output: 'Hello World'
    };
  }
}

// 注册技能
taiji.registerSkill(new MySkill());
```

## 📋 开发进度

### 里程碑定义

| 里程碑 | 时间 | 核心交付物 | 验收标准 | 当前状态 |
|---------|------|-----------|---------|---------|
| M1 | 第1个月 | WFGY防幻觉系统 | 功能实现+测试通过 | ⏳ 未开始 |
| M2 | 第2个月 | 成果调度器+国产大模型 | 功能完整+文档一致 | ⏳ 未开始 |
| M3 | 第3个月 | 测试体系建立 | 覆盖率≥80% | ⏳ 未开始 |
| M4 | 第4个月 | 性能基准+可观测性 | 性能报告+监控上线 | ⏳ 未开始 |
| M5 | 第5个月 | 试点项目启动 | ≥1个项目上线 | ⏳ 未开始 |
| M6 | 第6个月 | 安全审计+生产验证 | 审计通过+案例报告 | ⏳ 未开始 |
| M7 | 第7个月 | 社区建设启动 | Stars≥100 | ⏳ 未开始 |
| M8 | 第8个月 | 技能市场上线 | 官方技能≥10 | ⏳ 未开始 |
| M9 | 第9个月 | v1.0正式发布 | 生产级认证 | ⏳ 未开始 |

### 项目分阶段目标

- **Phase 1 (M1-M2):** 功能补齐 - 解决"纸上功能"问题  
  目标：实现README承诺的所有核心功能，确保文档与代码一致
  
- **Phase 2 (M3-M4):** 质量提升 - 测试、文档、性能  
  目标：测试覆盖率≥80%，建立性能基准
  
- **Phase 3 (M5-M6):** 生产验证 - 真实场景、安全审计  
  目标：真实业务场景验证，通过第三方安全审计
  
- **Phase 4 (M7-M9):** 生态建设 - 社区、案例、推广  
  目标：建立活跃开发者社区，上线技能市场

### 当前阶段：Phase 1 (M1-M2) 功能补齐

**核心任务：**

1. **WFGY符号层防幻觉系统** (M1)
   - WFGYVerifier 符号层验证器
   - SelfConsistencyChecker 自一致性检查
   - SourceTracer 知识溯源索引
   - HallucinationDetector 幻觉检测器

2. **成果调度器完善** (M2)
   - OutcomeScheduler 核心调度
   - TemplateEngine 模板引擎  
   - ChannelPusher 多渠道推送
   - BillingTracker 计费追踪

3. **国产大模型适配器** (M2)
   - 通义千问
   - 文心一言
   - 腾讯混元
   - 字节豆包

## 💾 安装

```bash
npm install opentaiji
# 或者
yarn add opentaiji
```

## 🔧 快速开始

### 基础使用

```typescript
import { Taiji, Skill } from 'opentaiji';

// 初始化
const taiji = new Taiji({
  llm: {
    provider: 'openai',
    apiKey: 'your-api-key'
  }
});

// 定义技能
class GreetingSkill extends Skill {
  name = 'greeting';
  description = '打招呼';

  async execute({ name }: { name: string }) {
    return {
      success: true,
      message: `Hello, ${name}!`
    };
  }
}

// 注册并执行
taiji.registerSkill(new GreetingSkill());
const result = await taiji.executeSkill('greeting', { name: 'World' });
console.log(result.message);
// Output: Hello, World!
```

## 📚 已实现 API 参考

### 类: Taiji

#### constructor(config: TaijiConfig)

创建 Taiji 实例

**配置项：**
```typescript
interface TaijiConfig {
  llm: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model?: string;
    baseURL?: string;
  };
  memory?: {
    provider: 'memory-lancedb' | 'memory-local';
    connectionString?: string;
  };
  tenant?: {
    enabled: boolean;
    defaultTenantId?: string;
  };
}
```

#### taiji.registerSkill(skill: Skill): void

注册一个技能

#### taiji.executeSkill(name: string, params: any, context?: SkillContext): Promise<SkillResult>

执行技能

**返回：**
```typescript
interface SkillResult {
  success: boolean;
  output?: any;
  error?: Error;
}
```

### 类: Skill

抽象基类，用于定义技能

```typescript
abstract class Skill {
  abstract name: string;
  abstract description: string;
  abstract execute(params: any, context: SkillContext): Promise<SkillResult>;
}
```

## 🗺️ 生产级标准

OpenTaiji 遵循严格的生产级标准定义：

| 维度 | 生产级标准 | 当前状态 | 目标完成 |
|------|-----------|---------|---------|
| 功能完整性 | 核心功能100%实现，无过度承诺 | 30% | M2 |
| 测试覆盖率 | ≥80%，含单元/集成/E2E测试 | ~40% | M3 |
| 文档准确性 | 文档与代码100%一致 | 80% | M2 |
| 性能指标 | 有基准测试数据，满足SLA | 无 | M4 |
| 安全审计 | 通过第三方安全审计 | 未进行 | M6 |
| 社区活跃度 | ≥100 Stars，≥10贡献者 | 0 | M7 |
| 生产案例 | ≥3个真实业务案例 | 0 | M6 |

### 成功量化指标

| 指标 | 当前 | M3目标 | M6目标 | M9目标 |
|------|------|-------|-------|-------|
| 功能完整性 | 30% | 70% | 90% | 100% |
| 测试覆盖率 | 40% | 80% | 85% | 90% |
| 文档准确性 | 35% | 80% | 95% | 100% |
| GitHub Stars | 0 | 50 | 200 | 500 |
| 贡献者 | 0 | 3 | 10 | 20 |
| 生产案例 | 0 | 0 | 3 | 5 |

## 🤝 贡献

欢迎贡献！目前项目处于早期开发阶段，暂时不接受外部贡献。请关注项目进展，预计 M3 阶段后开放贡献。

## 📄 许可证

MIT © OpenTaiji

## 🔗 相关链接

- [项目规划](./INPUT.md)
- [问题反馈](https://github.com/opentaiji/opentaiji/issues)

## 🤔 核心问题

当前项目存在以下核心问题需要解决：

| 问题类别 | 严重程度 | 具体表现 |
|---------|---------|---------|
| 功能缺失 | 🔴 致命 | WFGY防幻觉、Self-Consistency、溯源索引等核心功能未实现 |
| 文档不一致 | 🔴 致命 | 原文档过度承诺，与实际代码严重不符 |
| 测试不足 | 🟠 严重 | 测试覆盖率低，无集成测试，无性能测试 |
| 无社区 | 🟠 严重 | 0 Stars，无贡献者，无用户反馈 |
| 无生产验证 | 🟠 严重 | 无真实业务场景验证 |
| 安全审计缺失 | 🟡 中等 | 无第三方安全审计 |

---

**最后更新：** 2026-04-20  
**项目制定日期：** 2026年4月20日  
**预计周期：** 6-9个月  
**维护者：** OpenTaiji Team
