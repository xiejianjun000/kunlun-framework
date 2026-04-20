# M2阶段 - 国产大模型适配器 单元测试计划

## 项目信息
- 阶段：M2
- 任务：为国产大模型适配器编写单元测试
- 测试工程师：Dave (p-mo6gxim524edn6-worker1)
- 目标覆盖率：≥ 80%

## 测试范围

需要为以下适配器编写单元测试：

1. ✅ `BaseLLMAdapter.ts` - 基础抽象适配器类
2. ✅ `DoubaoAdapter.ts` - 字节豆包适配器
3. ✅ `GLMAdapter.ts` - 智谱GLM适配器
4. ✅ `HunyuanAdapter.ts` - 腾讯混元适配器
5. ✅ `KimiAdapter.ts` - Moonshot Kimi适配器
6. ✅ `QwenAdapter.ts` - 阿里通义千问适配器
7. ✅ `SparkAdapter.ts` - 讯飞星火适配器
8. ✅ `WenxinAdapter.ts` - 百度文心一言适配器
9. ✅ `index.ts` - 模块导出

## 测试目录结构

```
tests/
└── unit/
    └── adapters/
        └── llm/
            ├── BaseLLMAdapter.test.ts
            ├── DoubaoAdapter.test.ts
            ├── GLMAdapter.test.ts
            ├── HunyuanAdapter.test.ts
            ├── KimiAdapter.test.ts
            ├── QwenAdapter.test.ts
            ├── SparkAdapter.test.ts
            ├── WenxinAdapter.test.ts
            └── index.test.ts
```

## 测试要点

每个适配器测试需要覆盖：

1. **初始化测试**
   - 正确创建实例
   - 配置正确赋值
   - API key检查

2. **isReady测试**
   - 有API key返回true
   - 无API key返回false

3. **complete方法测试**
   - 正常完成请求
   - 未就绪时返回错误
   - 异常处理

4. **completeStream方法测试**
   - 流式生成
   - 错误处理

5. **token统计测试**
   - getTokenUsage返回正确统计
   - resetTokenUsage正确重置
   - accumulateUsage正确累加

6. **成本计算测试**
   - calculateCost计算正确

7. **错误处理测试**
   - 网络错误处理
   - API错误处理
   - 超时处理
   - 重试逻辑

8. **回退逻辑测试**
   - 默认端点使用
   - 自定义端点覆盖

## 测试策略

- 使用jest.mock模拟fetch API
- 不做真正的网络请求
- 模拟成功响应、错误响应、流式响应
- 覆盖所有分支逻辑

## 覆盖率目标

- 语句覆盖率：≥ 80%
- 分支覆盖率：≥ 80%
- 函数覆盖率：≥ 80%
- 行覆盖率：≥ 80%

## 交付物

1. `test-plan-m2.md` - 本测试计划
2. 9个测试文件对应9个源码文件
3. `jest.config.js` 更新覆盖率阈值
4. `m2-test-complete.md` - 完成报告

## 验收标准

- [ ] 创建完整测试目录结构
- [ ] 所有适配器有对应单元测试
- [ ] 所有单元测试编译通过
- [ ] 所有单元测试运行通过
- [ ] 总体覆盖率≥ 80%
