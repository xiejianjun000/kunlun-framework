# OpenTaiji贡献指南

> **版本**: 1.0.0
> **更新日期**: 2026年4月18日

感谢您对OpenTaiji的关注！本指南将帮助您了解如何参与OpenTaiji的开发。

---

## 目录

1. [开始之前](#1-开始之前)
2. [开发环境](#2-开发环境)
3. [代码规范](#3-代码规范)
4. [开发流程](#4-开发流程)
5. [测试指南](#5-测试指南)
6. [文档贡献](#6-文档贡献)
7. [提交规范](#7-提交规范)
8. [审核流程](#8-审核流程)

---

## 1. 开始之前

### 1.1 行为准则

我们期望所有贡献者遵守以下行为准则：

- **尊重**：尊重他人的想法、技能和贡献
- **包容**：欢迎不同背景和经验水平的贡献者
- **专业**：保持专业和建设性的沟通
- **透明**：公开讨论和决策过程

### 1.2 许可证

OpenTaiji采用 Apache License 2.0 许可证。所有贡献的代码都将使用此许可证。

### 1.3 选择任务

您可以通过以下方式找到贡献任务：

1. **Good First Issues**：适合新手的入门任务
2. **Help Wanted**：需要帮助的任务
3. **Open Issues**：所有公开的任务

---

## 2. 开发环境

### 2.1 环境要求

| 工具 | 版本要求 |
|------|----------|
| Node.js | >= 20.0.0 |
| npm | >= 10.0.0 |
| Git | >= 2.30.0 |
| TypeScript | >= 5.3.0 |

### 2.2 克隆项目

```bash
# 克隆仓库
git clone https://github.com/open-taiji/open-taiji.git

# 进入目录
cd open-taiji

# 安装依赖
npm install
```

### 2.3 配置开发环境

```bash
# 复制环境配置示例
cp .env.example .env

# 编辑配置
vim .env
```

### 2.4 验证安装

```bash
# 运行测试
npm test

# 构建项目
npm run build
```

---

## 3. 代码规范

### 3.1 TypeScript规范

**命名规范**：

```typescript
// 类名：PascalCase
class TaijiFramework {}

// 接口名：PascalCase，前缀 I
interface ITaijiFramework {}

// 类型名：PascalCase
type SkillInfo = {};

// 枚举名：PascalCase，枚举值：UPPER_SNAKE_CASE
enum MemoryTier {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

// 变量/函数：camelCase
const skillRegistry = new SkillRegistry();
function executeSkill() {}
```

**类型定义**：

```typescript
// 推荐：使用接口定义对象结构
interface UserProfile {
  userId: string;
  tenantId: string;
  createdAt: Date;
}

// 推荐：使用类型别名定义联合类型
type MemoryType = 'conversation' | 'knowledge' | 'task';

// 推荐：显式声明返回类型
function createProfile(userId: string): Promise<PersonalityProfile> {
  // ...
}
```

### 3.2 注释规范

**文件头注释**：

```typescript
/**
 * 模块名称
 * 
 * 模块描述
 * 
 * @author 作者名称
 * @version 1.0.0
 * @module 模块名
 */
```

**类/接口注释**：

```typescript
/**
 * 类描述
 * 
 * @example
 * ```typescript
 * const instance = new MyClass();
 * instance.doSomething();
 * ```
 */
class MyClass {
  /**
   * 方法描述
   * 
   * @param paramName 参数描述
   * @returns 返回值描述
   * @throws 可能的异常
   */
  public doSomething(paramName: string): Promise<Result> {
    // ...
  }
}
```

### 3.3 导入顺序

```typescript
// 1. Node.js 内置模块
import * as path from 'path';
import * as fs from 'fs';

// 2. 第三方模块
import { EventEmitter } from 'events';
import { z } from 'zod';

// 3. 框架内部模块
import { TaijiFramework } from './core/TaijiFramework';
import { SkillSystem } from './modules/skill-system/SkillSystem';

// 4. 类型导入（单独一行）
import type { SkillInfo } from './interfaces';
import type { IMemory } from './interfaces';
```

### 3.4 错误处理

```typescript
// 推荐：使用自定义错误类
class TaijiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'TaijiError';
  }
}

class SkillNotFoundError extends TaijiError {
  constructor(skillId: string) {
    super(
      `Skill not found: ${skillId}`,
      'SKILL_NOT_FOUND',
      { skillId }
    );
    this.name = 'SkillNotFoundError';
  }
}

// 使用示例
try {
  await skillSystem.executeSkill(skillId, input, userId);
} catch (error) {
  if (error instanceof SkillNotFoundError) {
    console.error(`技能 ${error.details.skillId} 不存在`);
  } else if (error instanceof TaijiError) {
    console.error(`业务错误 [${error.code}]: ${error.message}`);
  } else {
    throw error; // 重新抛出未知错误
  }
}
```

---

## 4. 开发流程

### 4.1 创建分支

```bash
# 确保在最新代码上
git checkout main
git pull origin main

# 创建功能分支
git checkout -b feature/your-feature-name

# 或修复分支
git checkout -b fix/issue-description
```

### 4.2 分支命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 功能 | feature/功能名称 | feature/multi-tenant-support |
| 修复 | fix/问题描述 | fix/memory-leak-issue |
| 重构 | refactor/重构范围 | refactor/skill-system |
| 文档 | docs/文档类型 | docs/api-reference |
| 测试 | test/测试范围 | test/integration-tests |

### 4.3 开发步骤

1. **编写代码**：遵循代码规范
2. **编写测试**：确保测试覆盖
3. **运行测试**：本地验证
4. **提交代码**：遵循提交规范
5. **推送分支**：推送到远程
6. **创建PR**：发起Pull Request

### 4.4 代码示例

```typescript
// src/modules/example/ExampleModule.ts

/**
 * 示例模块
 * 
 * @module ExampleModule
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { IExampleModule, ExampleConfig, ExampleResult } from './interfaces';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Partial<ExampleConfig> = {
  timeout: 30000,
  retries: 3
};

/**
 * 示例模块类
 */
export class ExampleModule extends EventEmitter implements IExampleModule {
  private readonly config: Required<ExampleConfig>;
  
  constructor(config: ExampleConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 执行操作
   * 
   * @param input - 输入参数
   * @returns 操作结果
   */
  public async execute(input: string): Promise<ExampleResult> {
    const id = uuidv4();
    
    try {
      this.emit('start', { id, input });
      
      // 执行逻辑
      const result = await this.processInput(input);
      
      this.emit('complete', { id, result });
      
      return {
        success: true,
        id,
        data: result
      };
    } catch (error) {
      const errorResult: ExampleResult = {
        success: false,
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.emit('error', { id, error });
      
      return errorResult;
    }
  }
  
  /**
   * 处理输入
   */
  private async processInput(input: string): Promise<string> {
    // 实现逻辑
    return input.toUpperCase();
  }
}
```

---

## 5. 测试指南

### 5.1 测试框架

OpenTaiji使用 Jest 作为测试框架：

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- integration.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 5.2 测试文件组织

```
tests/
├── unit/                    # 单元测试
│   ├── modules/
│   │   ├── skill-system/
│   │   │   ├── registry.test.ts
│   │   │   └── executor.test.ts
│   │   └── memory-system/
│   │       └── store.test.ts
│   └── core/
│       └── heartbeat.test.ts
├── integration/             # 集成测试
│   ├── integration.test.ts
│   └── multi-tenant.test.ts
└── fixtures/               # 测试数据
    └── skills/
```

### 5.3 单元测试示例

```typescript
// tests/unit/modules/example.test.ts

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExampleModule } from '../../../src/modules/example/ExampleModule';

describe('ExampleModule', () => {
  let module: ExampleModule;
  
  beforeEach(() => {
    module = new ExampleModule({ timeout: 5000 });
  });
  
  describe('execute()', () => {
    it('应该成功执行操作', async () => {
      const result = await module.execute('test input');
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.data).toBe('TEST INPUT');
    });
    
    it('应该处理错误情况', async () => {
      // 使用mock模拟错误
      jest.spyOn(module as any, 'processInput')
        .mockRejectedValue(new Error('Process failed'));
      
      const result = await module.execute('error input');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Process failed');
    });
    
    it('应该触发正确的事件', async () => {
      const startHandler = jest.fn();
      const completeHandler = jest.fn();
      
      module.on('start', startHandler);
      module.on('complete', completeHandler);
      
      await module.execute('event test');
      
      expect(startHandler).toHaveBeenCalled();
      expect(completeHandler).toHaveBeenCalled();
    });
  });
  
  describe('配置验证', () => {
    it('应该使用默认配置', () => {
      const defaultModule = new ExampleModule({});
      expect(defaultModule).toBeDefined();
    });
  });
});
```

### 5.4 集成测试示例

```typescript
// tests/integration/example.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ExampleModule } from '../../src/modules/example/ExampleModule';
import { DatabaseAdapter } from '../../src/adapters/storage/DatabaseAdapter';

describe('ExampleModule 集成测试', () => {
  let module: ExampleModule;
  let db: DatabaseAdapter;
  
  beforeAll(async () => {
    // 初始化数据库连接
    db = new DatabaseAdapter({
      type: 'sqlite',
      path: ':memory:'
    });
    await db.connect();
    
    // 创建模块实例
    module = new ExampleModule({
      database: db,
      timeout: 10000
    });
  });
  
  afterAll(async () => {
    await db.disconnect();
  });
  
  it('应该与数据库交互', async () => {
    const result = await module.execute('database test');
    
    expect(result.success).toBe(true);
    // 验证数据库操作
  });
});
```

### 5.5 测试覆盖率要求

| 类型 | 最低覆盖率 |
|------|------------|
| 语句覆盖 | 80% |
| 分支覆盖 | 75% |
| 函数覆盖 | 90% |
| 行覆盖 | 80% |

---

## 6. 文档贡献

### 6.1 文档类型

| 类型 | 位置 | 说明 |
|------|------|------|
| API文档 | API.md | API参考文档 |
| 架构文档 | ARCHITECTURE.md | 架构设计文档 |
| 指南文档 | *.md | 使用指南 |
| 代码注释 | 代码文件 | 行内文档 |

### 6.2 文档格式

```markdown
# 文档标题

> **版本**: 1.0.0
> **更新日期**: 2026-04-18

---

## 章节标题

### 子章节

正文内容...

#### 代码示例

\`\`\`typescript
// 示例代码
\`\`\`

#### 表格

| 列1 | 列2 | 列3 |
|------|------|------|
| 值1 | 值2 | 值3 |

#### 列表

- 第一项
- 第二项
  - 子项
  - 子项

#### 注意事项

> ⚠️ 重要提示内容
```

---

## 7. 提交规范

### 7.1 提交信息格式

```
<类型>(<范围>): <简短描述>

[可选的详细描述]

[可选的脚注]
```

### 7.2 类型标识

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | 错误修复 |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构（不影响功能） |
| test | 测试相关 |
| chore | 构建/工具相关 |

### 7.3 提交示例

```bash
# 功能提交
git commit -m "feat(skill-system): 添加技能版本管理功能

- 支持技能版本回滚
- 添加版本历史记录
- 优化版本兼容检查

Closes #123"

# 修复提交
git commit -m "fix(memory): 修复并发访问时的内存泄漏

在极端并发场景下，内存清理未正确执行。
添加了锁机制确保原子性操作。

Fixes #456"

# 文档提交
git commit -m "docs: 更新API文档中的示例代码

修正了错误的参数类型，增加了返回值说明"
```

### 7.4 提交前检查

```bash
# 运行测试
npm test

# 运行lint
npm run lint

# 检查代码格式
npm run format:check
```

---

## 8. 审核流程

### 8.1 Pull Request流程

1. **创建PR**：填写PR模板
2. **自动化检查**：CI自动运行测试和lint
3. **代码审核**：至少1人审核
4. **合并**：通过审核后合并

### 8.2 PR模板

```markdown
## 描述
<!-- 简要描述这个PR解决的问题 -->

## 改动
<!-- 列出具体的改动 -->

### 新增
<!-- 新增的功能或模块 -->

### 修改
<!-- 修改的内容 -->

### 删除
<!-- 删除的内容 -->

## 测试
<!-- 测试情况说明 -->

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成

## 截图/日志
<!-- 如有UI改动或重要日志，请添加 -->

## 注意事项
<!-- 需要reviewer注意的事项 -->
```

### 8.3 审核标准

代码审核会检查以下方面：

| 检查项 | 说明 |
|--------|------|
| 功能正确性 | 代码是否正确实现需求 |
| 代码质量 | 是否遵循代码规范 |
| 测试覆盖 | 是否有足够的测试 |
| 性能影响 | 是否有性能问题 |
| 安全影响 | 是否有安全隐患 |
| 文档更新 | 是否更新相关文档 |

---

## 常见问题

### Q: 如何开始第一个贡献？

A: 建议从"Good First Issue"开始，这些任务通常：
- 有详细的说明
- 相对独立，不涉及复杂逻辑
- 有示例可以参考

### Q: 提交被拒绝了怎么办？

A: 不要气馁！审核者会给出具体的改进建议：
1. 仔细阅读审核意见
2. 根据建议修改代码
3. 提交新的更新

### Q: 遇到问题如何求助？

A: 可以：
1. 在GitHub Issue中提问
2. 加入我们的社区讨论群
3. 查看已有的Q&A

---

## 联系方式

- **GitHub Issues**: [提交Issue](https://github.com/open-taiji/open-taiji/issues)
- **社区讨论**: [Discussions](https://github.com/open-taiji/open-taiji/discussions)
- **邮箱**: support@open-taiji.dev

---

感谢您的贡献！🚀
