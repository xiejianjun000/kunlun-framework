# OpenTaiji 集成测试框架

## 概述

本目录包含 OpenTaiji 项目的集成测试，验证各模块之间的协作。

## 测试结构

```
tests/integration/
├── README.md                    # 本文件
├── index.ts                     # 测试索引
├── jest.config.js               # Jest配置
├── mcp/                         # MCP集成测试
│   └── mcp-client.test.ts       # MCP Client测试
├── graph-memory/                # GraphMemory集成测试
│   └── graph-memory.test.ts     # 图存储测试
├── memory-system/               # Memory系统集成测试
│   └── memory-system.test.ts    # 记忆系统测试
└── actor-system/               # Actor系统集成测试
    └── actor-system.test.ts     # Actor运行时测试
```

## 测试模块

### 1. MCP集成测试 (`mcp/`)
测试 MCP (Model Context Protocol) Client 的功能：
- 连接和断开管理
- 工具调用
- 状态管理和事件
- 重连机制
- 消息处理

### 2. GraphMemory集成测试 (`graph-memory/`)
测试 SQLite 图存储的功能：
- 节点 CRUD 操作
- 边管理
- 图遍历
- 社区发现
- 事务操作

### 3. Memory系统集成测试 (`memory-system/`)
测试记忆循环系统的功能：
- 记忆存储和检索
- 记忆层次结构 (Hot/Warm/Cold)
- 记忆循环处理
- 记忆统计和清理
- 多租户隔离

### 4. Actor系统集成测试 (`actor-system/`)
测试 Actor 运行时系统的功能：
- Actor 创建和生命周期
- 消息传递
- 监督和错误恢复
- Actor 路径和选择
- 死信处理

## 运行测试

### 运行所有集成测试
```bash
cd open-taiji
npm test
```

### 运行特定模块的测试
```bash
# MCP 测试
npm test -- --testPathPattern="mcp-client.test.ts"

# GraphMemory 测试
npm test -- --testPathPattern="graph-memory.test.ts"

# Memory系统测试
npm test -- --testPathPattern="memory-system.test.ts"

# Actor系统测试
npm test -- --testPathPattern="actor-system.test.ts"
```

### 运行测试并监听变化
```bash
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

## 测试规范

### 文件命名
- 测试文件必须以 `*.test.ts` 结尾
- 使用描述性的测试名称

### 测试结构
```typescript
describe('模块名', () => {
  describe('功能组', () => {
    it('应该执行特定操作', () => {
      // 测试代码
    });
  });
});
```

### 常用断言
- `expect(value).toBe(expected)` - 精确相等
- `expect(value).toEqual(expected)` - 深度相等
- `expect(value).toBeDefined()` - 已定义
- `expect(value).toBeNull()` - 为 null
- `expect(() => fn()).toThrow()` - 抛出异常
- `expect.arrayContaining(arr)` - 数组包含

### 异步测试
```typescript
// Promise 风格
it('should do something', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expected);
});

// Callback 风格
it('should do something', (done) => {
  someAsyncFunction().then(result => {
    expect(result).toBe(expected);
    done();
  });
});
```

### Mock 使用
```typescript
jest.mock('module-name', () => ({
  functionName: jest.fn()
}));

const mockFn = require('module-name').functionName;
mockFn.mockReturnValue('mocked value');
```

## 测试数据

### 内存数据库
集成测试使用内存 SQLite 数据库 (`:memory:`)，无需外部依赖。

### 测试清理
每个测试套件在 `beforeEach` 中清理数据，确保测试隔离。

## 调试

### 查看详细输出
```bash
npm test -- --verbose
```

### 停在第一个失败
```bash
npm test -- --bail
```

### 运行特定测试
```bash
npm test -- --testNamePattern="should create actor"
```

## CI/CD 集成

测试命令：
```bash
npm test -- --ci --coverage
```

生成 JUnit XML 报告：
```bash
npm test -- --ci --reporters=default --reporters=jest-junit
```

## 贡献指南

新增测试时请：
1. 在对应的测试目录中创建 `*.test.ts` 文件
2. 使用描述性的测试名称
3. 添加适当的 setup/teardown
4. 确保测试独立可运行
5. 更新本 README
