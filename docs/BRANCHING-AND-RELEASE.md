# OpenTaiji 分支管理和发布规范

## 📋 目录

- [分支策略](#分支策略)
- [工作流程](#工作流程)
- [版本管理](#版本管理)
- [发布流程](#发布流程)
- [Changelog 规范](#changelog-规范)
- [紧急修复流程](#紧急修复流程)

---

## 🌿 分支策略

### 概述

我们采用 **简化的 GitHub Flow**，适合小团队的快速迭代开发。

### 分支类型

| 分支名称 | 类型 | 说明 | 保护 |
|----------|------|------|------|
| `main` | 长期分支 | 主分支，稳定可发布 | ✅ 是 |
| `feature/*` | 临时分支 | 功能开发分支 | ❌ 否 |
| `bugfix/*` | 临时分支 | Bug 修复分支 | ❌ 否 |
| `hotfix/*` | 临时分支 | 紧急修复分支 | ❌ 否 |
| `docs/*` | 临时分支 | 文档改进分支 | ❌ 否 |
| `chore/*` | 临时分支 | 日常维护分支 | ❌ 否 |

### 分支命名规范

```
<类型>/<描述>
<类型>/<issue编号>-<描述>
```

#### 类型说明

- `feature` - 新功能开发
- `bugfix` - 普通 Bug 修复
- `hotfix` - 生产环境紧急修复
- `docs` - 文档改进
- `chore` - 构建、工具、依赖更新等

#### 描述规范

- 使用英文小写
- 使用连字符 `-` 分隔单词
- 简洁明了，不超过 50 字符

#### 示例

```
feature/add-chat-history
bugfix/123-fix-message-timeout
hotfix/fix-api-authentication
docs/update-contributing-guide
chore/update-dependencies
```

### 保护分支规则

`main` 分支受到严格保护：

- ❌ 不允许直接推送
- ✅ 只能通过 Pull Request 合并
- ✅ 必须通过 CI 检查
- ✅ 至少需要 1 个审查批准
- ✅ 必须与最新代码同步

---

## 🔄 工作流程

### 标准开发流程

```
1. 从 main 创建功能分支
        ↓
2. 在分支上开发和提交
        ↓
3. 运行本地测试
        ↓
4. 推送到远程分支
        ↓
5. 创建 Pull Request
        ↓
6. CI 自动检查
        ↓
7. 代码审查和修改
        ↓
8. 审查通过，Squash 合并到 main
        ↓
9. 删除功能分支
```

### 详细步骤

#### 1. 准备工作

```bash
# 确保本地 main 是最新的
git checkout main
git pull origin main
```

#### 2. 创建分支

```bash
# 功能开发
git checkout -b feature/your-feature-name

# Bug 修复
git checkout -b bugfix/123-fix-something
```

#### 3. 开发和提交

```bash
# 修改代码...

# 提交（带 DCO 签名）
git commit -s -m "feat: add new feature"
```

#### 4. 推送分支

```bash
git push origin feature/your-feature-name
```

#### 5. 创建 Pull Request

- 访问 GitHub 仓库页面
- 点击 "Compare & pull request"
- 填写 PR 模板的所有内容
- 关联相关 Issue
- 添加适当的标签
- 请求审查

#### 6. 合并 PR

审查通过后，由维护者合并：

- 选择 **"Squash and merge"** 方式
- 整理提交信息，确保符合规范
- 确认合并
- 删除远程分支

---

## 📦 版本管理

### 版本号规范

我们严格遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)：

```
MAJOR.MINOR.PATCH
```

| 部分 | 说明 | 示例 |
|------|------|------|
| MAJOR | 不兼容的 API 变更 | `1.0.0` → `2.0.0` |
| MINOR | 向后兼容的功能新增 | `1.0.0` → `1.1.0` |
| PATCH | 向后兼容的 Bug 修复 | `1.0.0` → `1.0.1` |

### 预发布版本

在正式发布前，可以使用预发布版本标签：

```
MAJOR.MINOR.PATCH-<标识符>
```

标识符：
- `alpha` - 内部测试版本，功能可能不完整
- `beta` - 公开测试版本，可能存在已知问题
- `rc` - 发布候选版本，功能基本稳定

示例：
```
1.0.0-alpha.1
1.0.0-beta.2
1.0.0-rc.1
```

### 版本升级规则

| 变更类型 | 版本号变化 |
|----------|------------|
| 破坏性变更 | MAJOR + 1，MINOR 和 PATCH 归零 |
| 新增功能 | MINOR + 1，PATCH 归零 |
| Bug 修复 | PATCH + 1 |

---

## 🚀 发布流程

### 发布时机

- 当累积了足够的功能或修复
- 当有重要的安全修复需要尽快发布
- 定期发布（如每周/每月一次）

### 发布前检查

在发布前，确保：

- [ ] `main` 分支所有 CI 检查通过
- [ ] 所有已知的严重 Bug 已修复
- [ ] 文档已更新
- [ ] 测试覆盖率达标
- [ ] Changelog 已更新

### 发布步骤

#### 1. 准备发布分支

```bash
git checkout main
git pull origin main
```

#### 2. 更新版本号

```bash
# 使用 npm version 命令自动更新 package.json 和创建 tag
npm version patch  # 补丁版本 1.0.0 → 1.0.1
npm version minor  # 次要版本 1.0.0 → 1.1.0
npm version major  # 主要版本 1.0.0 → 2.0.0

# 预发布版本
npm version prerelease --preid=alpha  # 1.0.0 → 1.0.1-alpha.0
```

#### 3. 更新 Changelog

```bash
# 手动更新 CHANGELOG.md
# 或使用工具生成
npm run changelog
```

#### 4. 提交变更

```bash
git add CHANGELOG.md
git commit -s -m "chore(release): prepare for vX.Y.Z"
```

#### 5. 创建 Tag

```bash
# npm version 已经创建了 tag，确认一下
git tag -n

# 如果需要手动创建
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

#### 6. 推送到 GitHub

```bash
git push origin main --follow-tags
```

#### 7. 创建 GitHub Release

1. 访问 [Releases](https://github.com/xiejianjun000/open-taiji/releases) 页面
2. 点击 "Draft a new release"
3. 选择刚才创建的 tag
4. 填写 Release 标题和描述
5. 如果是预发布版本，勾选 "This is a pre-release"
6. 点击 "Publish release"

### Release Notes 模板

```markdown
## vX.Y.Z (YYYY-MM-DD)

### 🚀 新功能
- 功能 A 描述 (#123)
- 功能 B 描述 (#124)

### 🐛 Bug 修复
- 修复问题 A (#125)
- 修复问题 B (#126)

### 📝 文档
- 更新安装指南 (#127)

### 🔧 其他
- 依赖更新 (#128)

**完整变更日志**: https://github.com/xiejianjun000/open-taiji/compare/vA.B.C...vX.Y.Z
```

---

## 📝 Changelog 规范

### Changelog 格式

我们遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 格式：

```markdown
# Changelog

## [Unreleased]

### 🚀 新增
- 未发布的新功能

### 🐛 修复
- 未发布的 Bug 修复

## [X.Y.Z] - YYYY-MM-DD

### 🚀 新增
- 具体的新功能列表

### 🐛 修复
- 具体的 Bug 修复列表

### 📝 文档
- 文档改进

### 🔧 其他
- 依赖更新、配置变更等

[Unreleased]: https://github.com/xiejianjun000/open-taiji/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/xiejianjun000/open-taiji/compare/vA.B.C...vX.Y.Z
```

### 变更类型

- `🚀 新增` - 新功能
- `🐛 修复` - Bug 修复
- `🔄 变更` - 现有功能变更
- `🗑️ 移除` - 移除功能
- `⚡ 性能` - 性能优化
- `📝 文档` - 文档改进
- `🔧 其他` - 构建、工具、依赖等

---

## 🔥 紧急修复流程

当生产环境出现严重问题时，使用 Hotfix 流程：

### 流程步骤

```
1. 从 main 创建 hotfix 分支
        ↓
2. 紧急修复问题
        ↓
3. 快速但充分的测试
        ↓
4. 创建 PR 到 main
        ↓
5. 优先审查和合并
        ↓
6. 立即发布新版本
        ↓
7. 通知用户
```

### 详细步骤

#### 1. 创建 Hotfix 分支

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-issue
```

#### 2. 修复和提交

```bash
# 修复问题...
git commit -s -m "fix: critical security fix"
```

#### 3. 创建紧急 PR

- 标记为 `priority-critical`
- 说明紧急性
- 请求立即审查

#### 4. 快速发布

```bash
# 合并后
git checkout main
git pull origin main

# 发布补丁版本
npm version patch
git push origin main --follow-tags

# 创建 GitHub Release
```

#### 5. 事后复盘

修复完成后进行复盘：

- 问题的根本原因是什么？
- 如何避免类似问题再次发生？
- 监控和告警是否需要改进？

---

## ✅ 检查清单

### 新建 PR 前

- [ ] 代码已格式化（`npm run format`）
- [ ] Lint 检查通过（`npm run lint`）
- [ ] 所有测试通过（`npm test`）
- [ ] 相关文档已更新
- [ ] 提交信息符合规范

### 发布前

- [ ] CI 全部通过
- [ ] 版本号已更新
- [ ] Changelog 已更新
- [ ] 文档已更新
- [ ] Tag 已创建
- [ ] Release Notes 已编写

---

## 📚 参考资源

- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
