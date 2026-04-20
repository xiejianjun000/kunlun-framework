# OpenTaiji 测试体系 - WFGY防幻觉系统

## 目录结构

```
output/p-mo6gxim524edn6-worker1/
├── README.md                          # 本文件
├── test-plan.md                       # 测试计划
├── jest.config.js                     # Jest 配置
└── tests/
    └── unit/
        └── modules/
            └── determinism/           # WFGY防幻觉系统单元测试
                ├── WFGYVerifier.test.ts
                ├── SelfConsistencyChecker.test.ts
                ├── SourceTracer.test.ts
                ├── HallucinationDetector.test.ts
                └── determinism-system.test.ts
```

## 测试范围

本次测试覆盖WFGY防幻觉系统的所有核心组件：

| 组件 | 测试文件 | 目标覆盖率 |
|------|----------|------------|
| WFGYVerifier | WFGYVerifier.test.ts | ≥85% |
| SelfConsistencyChecker | SelfConsistencyChecker.test.ts | ≥85% |
| SourceTracer | SourceTracer.test.ts | ≥85% |
| HallucinationDetector | HallucinationDetector.test.ts | ≥85% |
| DeterminismSystem | determinism-system.test.ts | ≥85% |

## 运行测试

### 安装依赖
```bash
npm install --save-dev jest ts-jest @types/jest typescript
```

### 运行所有测试
```bash
npx jest --config output/p-mo6gxim524edn6-worker1/jest.config.js
```

### 只运行WFGY模块测试
```bash
npx jest --config output/p-mo6gxim524edn6-worker1/jest.config.js tests/unit/modules/determinism/
```

### 生成覆盖率报告
```bash
npx jest --config output/p-mo6gxim524edn6-worker1/jest.config.js --coverage
```

覆盖率报告将生成在 `coverage/` 目录。

## 测试设计说明

### WFGYVerifier.test.ts
- 测试构造函数（默认选项和自定义选项）
- 测试 `isReady()` 方法
- 测试验证功能：有效内容、无效内容、边界条件
- 测试规则添加和删除
- 测试特殊情况：空内容、长内容、特殊字符

### SelfConsistencyChecker.test.ts
- 测试不同一致性情况：完全一致、部分一致、完全不一致
- 测试相似度计算
- 测试自定义阈值和样本数
- 测试样本生成功能

### SourceTracer.test.ts
- 测试知识溯源功能
- 测试来源添加、删除、查询
- 测试统计信息
- 测试覆盖度计算和置信度过滤

### HallucinationDetector.test.ts
- 测试幻觉检测功能
- 测试矛盾分析
- 测试事实合理性检查
- 测试模式匹配功能

### determinism-system.test.ts
- 整体集成测试
- 测试不同验证模式
- 测试选项处理
- 测试完整验证流程

## 覆盖率要求

Jest配置已设置覆盖率阈值：
- 全局语句覆盖率：≥85%
- 分支覆盖率：≥85%
- 函数覆盖率：≥90%
- 行覆盖率：≥85%

如果不满足覆盖率要求，测试将会失败。

## 后续扩展

- 集成测试：在 `tests/integration/` 目录添加模块间集成测试
- E2E测试：在 `tests/e2e/` 目录添加完整流程测试
- 性能测试：在 `tests/performance/` 目录添加性能基准测试
- 安全测试：在 `tests/security/` 目录添加安全测试
