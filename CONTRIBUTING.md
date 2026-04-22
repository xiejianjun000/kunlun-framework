# 贡献指南

感谢您对 OpenTaiji 项目的关注！我们欢迎所有形式的贡献，包括但不限于 Bug 报告、功能建议、代码提交、文档改进等。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
  - [报告 Bug](#报告-bug)
  - [提出功能需求](#提出功能需求)
  - [提交代码](#提交代码)
  - [改进文档](#改进文档)
- [开发流程](#开发流程)
  - [环境搭建](#环境搭建)
  - [分支策略](#分支策略)
  - [提交规范](#提交规范)
  - [代码审查](#代码审查)
- [测试指南](#测试指南)
- [发布流程](#发布流程)
- [社区交流](#社区交流)

---

## 📜 行为准则

参与本项目即表示您同意遵守我们的 [行为准则](CODE_OF_CONDUCT.md)。请确保您的行为符合以下原则：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员保持同理心

---

## 💡 如何贡献

### 报告 Bug

如果您发现了 Bug，请按照以下步骤报告：

1. **搜索现有 Issues** - 确保这个问题还没有被报告过
2. **使用 Bug 模板** - 创建新 Issue 时选择 "Bug 报告" 模板
3. **提供详细信息** - 包含复现步骤、预期行为、实际行为、环境信息等
4. **添加标签** - 如果可能，添加相关的标签

### 提出功能需求

如果您有新的想法或改进建议：

1. **搜索现有 Issues/Discussions** - 确保这个需求还没有被提出过
2. **使用功能需求模板** - 创建新 Issue 时选择 "功能需求" 模板
3. **详细描述** - 说明问题背景、建议方案、使用场景等
4. **参与讨论** - 在社区中讨论您的想法，收集反馈

### 提交代码

1. **Fork 仓库** - 点击 GitHub 页面右上角的 Fork 按钮
2. **克隆仓库** - 将您的 Fork 克隆到本地
3. **创建分支** - 基于 `main` 分支创建功能分支
4. **开发代码** - 实现您的功能或修复 Bug
5. **运行测试** - 确保所有测试通过
6. **提交更改** - 使用规范的提交信息
7. **创建 PR** - 提交 Pull Request 到主仓库

### 改进文档

文档是项目的重要组成部分。您可以：

- 修正错别字或语法错误
- 补充缺失的文档
- 改进文档的清晰度和可读性
- 添加示例代码或教程

---

## 🔧 开发流程

### 环境搭建

#### 前置要求

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/xiejianjun000/open-taiji.git
cd open-taiji

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
```

### 分支策略

我们使用简化的 GitHub Flow：

| 分支 | 说明 | 规则 |
|------|------|------|
| `main` | 主分支，稳定可发布 | 保护分支，只能通过 PR 合并 |
| `feature/*` | 功能开发分支 | 从 main 分支创建，完成后合并回 main |
| `bugfix/*` | Bug 修复分支 | 从 main 分支创建，完成后合并回 main |
| `hotfix/*` | 紧急修复分支 | 从 main 分支创建，完成后合并回 main |
| `docs/*` | 文档改进分支 | 从 main 分支创建，完成后合并回 main |

#### 分支命名规范

```
feature/<功能描述>
bugfix/<issue编号>-<问题描述>
hotfix/<问题描述>
docs/<文档描述>
```

示例：
```
feature/add-user-authentication
bugfix/123-fix-login-crash
hotfix/fix-security-vulnerability
docs/update-installation-guide
```

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码风格调整（不影响代码运行）
- `refactor` - 代码重构（既不是新增功能也不是修复 Bug）
- `perf` - 性能优化
- `test` - 测试相关
- `chore` - 构建过程或辅助工具的变动
- `ci` - CI/CD 相关

#### Scope 范围（可选）

- `core` - 核心模块
- `gateway` - 网关模块
- `cli` - CLI 模块
- `agent` - Agent 模块
- `website` - 网站前端
- `tests` - 测试
- `deps` - 依赖更新

#### Subject

- 使用动词开头（add, fix, update, remove 等）
- 小写开头
- 不超过 50 字符
- 结尾不加句号

#### Body（可选）

- 详细描述变更的内容和原因
- 每行不超过 72 字符

#### Footer（可选）

- 关联 Issue：`Fixes #123`, `Closes #456`
- 破坏性变更：`BREAKING CHANGE: <描述>`
- DCO 签名：`Signed-off-by: Your Name <your@email.com>`

#### 提交示例

```
feat(auth): add user login functionality

- Implement email/password authentication
- Add JWT token generation and validation
- Add login API endpoint

Fixes #123
Signed-off-by: John Doe <john@example.com>
```

### DCO 签名

所有提交必须包含 DCO 签名。可以在提交时添加 `-s` 参数自动签名：

```bash
git commit -s -m "feat: add new feature"
```

---

## 🔍 代码审查

### PR 要求

1. **通过所有 CI 检查** - 测试、lint、构建必须通过
2. **至少一个审查** - 需要至少一个维护者的批准
3. **无合并冲突** - 确保分支与 main 同步
4. **符合代码规范** - 遵循项目的代码风格

### 审查流程

1. **自动检查** - CI 运行测试和 lint
2. **维护者审查** - 项目维护者进行代码审查
3. **修改反馈** - 根据审查意见进行修改
4. **批准合并** - 审查通过后由维护者合并

### 合并策略

- 使用 **Squash and Merge** - 将所有提交压缩为一个提交
- 保持提交历史清晰、整洁

---

## 🧪 测试指南

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/filename.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式（开发时使用）
npm run test:watch
```

### 编写测试

- 所有新功能必须包含相应的测试
- Bug 修复应该添加回归测试
- 测试应该清晰、易读
- 测试覆盖率应该保持在较高水平

---

## 🚀 发布流程

### 版本号规范

我们使用 [语义化版本](https://semver.org/lang/zh-CN/)：

```
MAJOR.MINOR.PATCH
```

- **MAJOR** - 不兼容的 API 变更
- **MINOR** - 向后兼容的功能新增
- **PATCH** - 向后兼容的 Bug 修复

### 发布步骤

1. **更新版本号**
   ```bash
   npm version <major|minor|patch>
   ```

2. **生成 Changelog**
   ```bash
   # 使用 standard-version 或手动更新
   npm run release
   ```

3. **创建 Tag**
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```

4. **推送到 GitHub**
   ```bash
   git push origin main --follow-tags
   ```

5. **创建 GitHub Release**
   - 访问仓库的 Releases 页面
   - 点击 "Draft a new release"
   - 选择 Tag，填写 Release Notes
   - 发布 Release

---

## 💬 社区交流

- **GitHub Issues** - Bug 报告、功能需求
- **GitHub Discussions** - 一般性讨论、技术问答
- **Pull Requests** - 代码审查和讨论

---

## ❓ 常见问题

### 如何开始贡献？

1. 查看带有 `good-first-issue` 标签的 Issue
2. 在 Discussions 中自我介绍并说明您感兴趣的领域
3. 从小的改进开始，比如文档修复或简单的 Bug 修复

### 遇到问题怎么办？

- 搜索现有的 Issues 和 Discussions
- 如果找不到答案，创建新的 Issue 或 Discussion
- 提供尽可能多的信息帮助他人理解您的问题

---

再次感谢您的贡献！🎉
