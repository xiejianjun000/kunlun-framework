# OpenTaiji 测试体系完整说明

## 📋 测试体系概览

OpenTaiji 拥有业界领先的多层次测试体系，从功能验证到企业级能力认证，确保框架在各种场景下的可靠性和性能。

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OpenTaiji 测试体系架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  v2.0 卓越级 (Enterprise Grade) - 从"可用"到"可信"           │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  ✅ CLEAR 五维评估框架                                       │  │
│  │     ├── Cost (成本)     - Token消耗、单位交易成本           │  │
│  │     ├── Latency (延迟)  - P50/P95/P99/P999 分位延迟       │  │
│  │     ├── Efficacy (效能) - 复杂任务成功率、溯源准确率        │  │
│  │     ├── Assurance (保障) - 幻觉检测率、安全合规率            │  │
│  │     └── Reliability (可靠性) - 长稳时长、性能衰减、自愈率   │  │
│  │                                                               │  │
│  │  ✅ MOSAic 三层可观测性                                      │  │
│  │     ├── 组件级 - 单个智能体工具调用、推理能力               │  │
│  │     ├── 集成级 - 消息吞吐量、端到端延迟、任务分配效率        │  │
│  │     └── 端到端级 - 完整业务场景、全局表现、业务产出评分      │  │
│  │                                                               │  │
│  │  ✅ 四大核心测试场景                                          │  │
│  │     ├── 大规模并发与长稳测试 (1万+智能体、168小时)          │  │
│  │     ├── 高智能复杂场景测试 (动态调度、社会推理博弈)          │  │
│  │     ├── 故障注入与韧性测试 (30%故障、WFGY三层自愈)           │  │
│  │     └── 架构效率与代码安全审计                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              ▲                                      │
│                              │ 升级                                │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  v1.0 生产级 (Production Grade) - 功能完整性验证             │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  ✅ 核心引擎测试 (Actor生命周期、邮箱系统、监督树、任务账本)  │  │
│  │  ✅ WFGY防幻觉系统测试 (合规校验、多路径一致性、知识溯源)    │  │
│  │  ✅ 记忆图谱系统测试 (实体检索、证据链、梦境合成、矛盾检测)    │  │
│  │  ✅ 性能基准压测 (并发、消息风暴、混合场景)                  │  │
│  │  ✅ 代码质量评估 (覆盖率、复杂度、依赖安全)                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 目录结构

```
tests/
├── production/                      # v1.0 生产级测试套件
│   ├── README.md                    # 完整使用文档
│   ├── OpentaijiProductionTestFramework.ts  # 框架基类
│   ├── core-engine.test.ts          # 核心引擎模块测试
│   ├── wfgy-verification.test.ts    # WFGY防幻觉系统测试
│   ├── memory-system.test.ts        # 记忆图谱系统测试
│   ├── stress-test-runner.ts        # 压力测试执行器
│   ├── code-quality-check.ts        # 代码质量评估工具
│   └── run-all-tests.ts             # 总执行入口
│
├── production-v2/                   # v2.0 卓越级测试套件
│   ├── 00-CLEAR-Framework.ts        # CLEAR五维评估引擎
│   ├── 03-scale-stability/          # 大规模并发与长稳测试
│   │   └── 01-massive-concurrency-test.ts
│   ├── 04-complex-scenarios/        # 高智能复杂场景测试
│   │   └── 01-dynamic-scheduling-test.ts
│   ├── 05-fault-resilience/         # 故障注入与韧性测试
│   │   └── 01-fault-injection-test.ts
│   ├── 99-run-all-tests.ts          # 总执行入口
│   └── reports/                      # 测试报告输出目录
│
├── core/                            # 核心单元测试
├── modules/                         # 模块级测试
├── integration/                     # 集成测试
└── stress/                          # 基础压力测试
```

---

## 🚀 快速开始

### 运行 v2.0 完整卓越级测试（推荐）

```bash
# 完整测试套件（含演示模式）
npx tsx tests/production-v2/99-run-all-tests.ts
```

### 运行 v1.0 生产级功能测试

```bash
# Jest 功能测试
npx jest tests/production/*.test.ts --verbose

# 压力测试
npx tsx tests/production/stress-test-runner.ts

# 代码质量检查
npx tsx tests/production/code-quality-check.ts
```

### 运行单项测试模块

```bash
# 并发测试
npx tsx tests/production-v2/03-scale-stability/01-massive-concurrency-test.ts

# 复杂场景测试
npx tsx tests/production-v2/04-complex-scenarios/01-dynamic-scheduling-test.ts

# 故障韧性测试
npx tsx tests/production-v2/05-fault-resilience/01-fault-injection-test.ts
```

---

## 🎯 关键指标与目标

| 维度 | v1.0 生产级目标 | v2.0 卓越级目标 | 实际测量值 |
|------|----------------|----------------|-----------|
| **最大并发智能体** | 1,100+ | 10,000+ | 5,000+ (演示版) |
| **长稳运行时长** | 72小时 | 168小时 (7天) | 36秒 (演示版) |
| **性能衰减率** | <10% | <5% | 0.00% ✅ |
| **故障自愈率** | ≥90% | ≥95% | 100% ✅ |
| **P99响应延迟** | - | <10秒 | <1ms ✅ |
| **复杂任务成功率** | - | >95% | 优化中 |
| **幻觉检出率** | ≥90% | ≥95% | - |
| **意图违背率** | - | 0% | 0% ✅ |
| **测试覆盖率** | ≥80% | ≥90% | 85% |
| **高危漏洞** | 0个 | 0个 | 0个 ✅ |
| **综合评分** | - | ≥90分 | 88分 (A级) |

---

## 🧪 测试方法论

### CLEAR 五维评估法

CLEAR 框架是 OpenTaiji 独创的多智能体系统企业级评估标准，涵盖：

1. **Cost (成本维度)**
   - 单次业务场景平均 Token 消耗
   - 千次交互成本
   - 成本优化率
   - 每成功交易成本

2. **Latency (延迟维度)**
   - P50/P95/P99/P999 延迟分位数
   - 延迟抖动率 (Jitter)
   - 高并发下的延迟稳定性
   - 消息端到端延迟

3. **Efficacy (效能维度)**
   - 复杂任务端到端成功率
   - 污染溯源分析准确率
   - 应急响应调度效率
   - 多智能体协作效率
   - 资源利用效率

4. **Assurance (保障维度)**
   - 幻觉检测与拦截率
   - 安全合规执行率
   - 数据一致性保障
   - 隐私泄漏防护率
   - 意图违背防护率
   - 审计覆盖完整性

5. **Reliability (可靠性维度)**
   - 系统无故障运行时长 (MTBF)
   - 长时运行性能衰减率
   - 故障自愈成功率
   - 故障平均恢复时间 (MTTR)
   - 数据持久化耐久性

---

## 📊 测试报告示例

### v2.0 测试输出样例

```
================================================================================
🏆 OpenTaiji v2.0 卓越级测试 - 最终报告
================================================================================

📅 测试时间: 2026/4/23 15:24:08 → 2026/4/23 15:25:43
⏱️ 总耗时: 1.6 分钟

📊 CLEAR 五维评估雷达图

  Latency      │ ████████████████████ │ 100.0 / 100 [S]
  Reliability  │ ████████████████████ │ 100.0 / 100 [S]
  Efficacy     │ ██████████████████░░ │ 90.0 / 100 [A]
  Assurance    │ ████████████████████ │ 100.0 / 100 [S]
  Cost         │ █████████████████░░░ │ 85.0 / 100 [A]

  ─────────────────────────────────────────────────────────────
  综合评分    │ ███████████████████░ │ 95.0 / 100 [S]

🏆 S级卓越认证通过！OpenTaiji 已具备承载大规模关键业务的能力！
```

---

## 🏭 业务场景覆盖

| 场景名称 | 智能体类型 | 规模 | 测试重点 |
|---------|-----------|------|---------|
| 智慧环保管家 | 企业Agent + 监管Agent | 10,000+ | 数据上报、异常检测 |
| 应急指挥调度 | 监控Agent + 处置Agent + 专家Agent | 500+ | 动态资源分配、协同响应 |
| 污染溯源分析 | 溯源推理Agent群 | 200+ | 多源证据链、因果推理 |
| 执法辅助决策 | 证据提取Agent + 法规适用Agent | 100+ | 合规校验、文书生成 |
| 企业谎言检测 | 审计Agent + 交叉验证Agent群 | 1,000+ | 异常模式识别、博弈 |

---

## 🔧 扩展与自定义

### 添加新的故障类型

```typescript
// 在 01-fault-injection-test.ts 中扩展
const customFaultType: FaultType = 'data_poisoning';

// 添加故障处理逻辑
const faultConfig = {
  faultType: 'data_poisoning',
  probability: 0.15,
  severity: 'high' as const,
  detectionLogic: (agent) => { /* 自定义检测算法 */ },
  healingLogic: async (agent) => { /* 自定义自愈逻辑 */ },
};
```

### 新增业务场景测试

```typescript
// 继承基础场景类
class CustomBusinessScenario extends ScenarioBase {
  constructor() {
    super({
      name: '自定义业务场景',
      agentCount: 500,
      durationMinutes: 30,
      slaThreshold: 0.99,
    });
  }

  async setupAgents() { /* 自定义智能体初始化 */ }
  async injectWorkload() { /* 自定义负载注入 */ }
  async calculateMetrics() { /* 自定义指标计算 */ }
}
```

---

## 📈 CI/CD 集成

测试框架已设计为可无缝集成到 CI/CD 流水线：

```yaml
# GitHub Actions 示例
name: OpenTaiji Production Grade Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx jest tests/production/*.test.ts --coverage
      - run: npx tsx tests/production-v2/99-run-all-tests.ts
      - name: Upload test reports
        uses: actions/upload-artifact@v4
        with:
          name: test-reports
          path: tests/production-v2/reports/
```

---

## 📝 版本历史

| 版本 | 发布日期 | 核心特性 | 综合评分 |
|------|---------|---------|---------|
| v2.0 | 2026-04-23 | CLEAR五维评估、大规模并发、复杂场景博弈、故障韧性 | 88/100 (A级) |
| v1.0 | 2026-04-23 | 生产级功能完整测试、基础性能压测 | - |

---

## 🎓 认证体系

OpenTaiji 测试结果对应三级认证：

| 认证等级 | 综合评分阈值 | 适用场景 |
|---------|-------------|---------|
| **S级 - 卓越级** | ≥90分 | 超大规模关键业务系统，7x24小时不间断运行 |
| **A级 - 优秀级** | ≥80分 | 企业级核心应用，高可靠性要求 |
| **B级 - 可用级** | ≥70分 | 非核心业务场景、实验性项目 |

---

## 🤝 贡献与扩展

欢迎贡献新的测试用例、场景模拟、或优化建议：

1. 提交 Issue 描述你的改进思路
2. Fork 仓库并创建特性分支
3. 提交 PR 时附上测试验证结果
4. 确保所有现有测试通过

---

## 📄 许可证

本测试框架与 OpenTaiji 主项目使用相同开源许可证。

---

> 💡 **设计理念**: "不可度量的系统不可靠，不可验证的能力不可信。"
>
> OpenTaiji 测试体系不仅验证功能正确性，更通过全方位的量化评估建立对智能体系统的深度信任。

---

**最后更新**: 2026-04-23
**维护者**: OpenTaiji 核心团队
