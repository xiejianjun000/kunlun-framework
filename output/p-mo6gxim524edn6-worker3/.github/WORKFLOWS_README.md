# GitHub Actions 工作流配置说明

本文档说明了 OpenTaiji 项目配置的 GitHub Actions CI/CD 工作流及其使用方法。

## 📋 工作流概览

| 工作流文件 | 名称 | 触发时机 | 主要功能 |
|-----------|------|---------|---------|
| `ci.yml` | CI Pipeline | `push` / `pull_request` | 类型检查、单元测试、覆盖率 |
| `build.yml` | Build Verification | `push` / `pull_request` | TypeScript 构建验证 |
| `code-quality.yml` | Code Quality | `push` / `pull_request` | ESLint、依赖审计 |

---

## 🔧 各工作流详细说明

### 1. 主 CI 工作流 (ci.yml)

**触发条件：**
- 推送到 `main` / `master` / `develop` 分支
- 针对上述分支的 Pull Request（创建、更新、重开时）
- 手动触发（workflow_dispatch）

**执行步骤：**
1. ✅ **Checkout 代码** - 拉取最新代码
2. ✅ **Node.js 环境设置** - 使用 Node.js 20.x，自动缓存 node_modules
3. ✅ **依赖安装** - `npm ci`（确定性安装）
4. ✅ **TypeScript 类型检查** - `tsc --noEmit`（仅检查类型，不生成产物）
5. ✅ **Jest 测试套件** - 运行所有单元测试
6. ✅ **测试覆盖率** - 生成覆盖率报告
7. ✅ **产物上传** - 覆盖率报告保存 14 天

**优化特性：**
- 跳过 Markdown 和文档文件变更时的运行
- 使用 `actions/setup-node` 内置的 npm 缓存，加速依赖安装
- 排除 `taiji-website` 前端目录变更时的核心库测试

---

### 2. 构建验证工作流 (build.yml)

**触发条件：**
- 推送到 `main` / `master` 分支
- 针对主干分支的 Pull Request
- 手动触发

**执行步骤：**
1. ✅ **Checkout 代码**
2. ✅ **Node.js 环境 + 缓存**
3. ✅ **依赖安装**
4. ✅ **TypeScript 编译** - `npm run build`（完整编译到 dist 目录）
5. ✅ **构建产物验证** - 检查 dist 目录和 index.js 是否生成
6. ✅ **产物上传** - 构建产物保存 7 天

**设计目的：**
- 确保 TypeScript 代码可以正常编译
- 验证发布前的构建状态
- 保留构建产物供后续检查使用

---

### 3. 代码质量检查工作流 (code-quality.yml)

**触发条件：**
- 仅当 `.ts` 源文件、ESLint 配置或 package.json 变更时触发
- 手动触发

**包含三个并行 Job：**

#### Job 1: ESLint 代码检查
- 运行 `npm run lint`
- 确保代码符合项目编码规范
- TypeScript 特定规则检查

#### Job 2: 依赖安全审计
- 运行 `npm audit`
- 检查 npm 依赖包的安全漏洞
- 中等以上级别漏洞会标记警告
- 设置为非阻塞（continue-on-error）

#### Job 3: Lockfile 验证
- 验证 package-lock.json 格式有效性
- 防止损坏的锁文件导致构建失败

---

## 🚀 缓存策略说明

所有工作流都使用了 GitHub Actions 的 npm 缓存机制：

```yaml
cache: 'npm'
cache-dependency-path: package-lock.json
```

**缓存原理：**
- 基于 `package-lock.json` 内容生成缓存 key
- 相同 key 的运行可以直接复用 node_modules
- 通常可以将依赖安装时间从 1-2 分钟缩短到 10-30 秒

---

## 📊 测试覆盖率

CI 工作流自动生成测试覆盖率报告并作为 Artifact 上传：

- **位置：** `coverage/` 目录
- **格式：** lcov + text
- **保留时间：** 14 天
- **阈值要求：** 85% 分支、函数、行、语句覆盖率

可以在 GitHub Actions 运行详情页下载覆盖率报告查看详细数据。

---

## 🔍 如何使用

### 查看工作流状态
1. 进入项目 GitHub 仓库
2. 点击 **Actions** 标签页
3. 可以看到所有工作流的运行历史和状态

### PR 状态检查
- 所有工作流会自动在 PR 页面显示状态
- ❌ 红色表示失败，✅ 绿色表示通过
- 建议在所有检查通过后再合并 PR

### 手动触发工作流
1. 进入 Actions 标签页
2. 选择要运行的工作流
3. 点击 **Run workflow** 按钮
4. 选择分支后确认运行

---

## 📝 工作流文件位置

```
.github/
├── workflows/
│   ├── ci.yml              # 主 CI 工作流
│   ├── build.yml           # 构建验证工作流
│   └── code-quality.yml    # 代码质量检查
└── WORKFLOWS_README.md     # 本文档
```

---

## 💡 最佳实践建议

1. **PR 必须通过所有检查** - 建议在仓库设置中启用分支保护，要求检查通过才能合并
2. **及时修复 ESLint 警告** - 保持代码质量一致
3. **关注依赖审计结果** - 定期更新有安全漏洞的依赖包
4. **保持覆盖率不下降** - 新代码应该附带相应的测试

---

## 🔄 扩展建议

未来可以考虑添加的工作流：

- `publish.yml` - npm 自动发布（打 tag 时触发）
- `release-drafter.yml` - 自动生成 Release Notes
- `stale.yml` - 自动处理过期的 Issue 和 PR
- `labeler.yml` - 自动为 PR 添加标签
