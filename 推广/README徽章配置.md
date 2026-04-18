# README徽章配置指南

## 标准徽章格式

将以下代码复制到你的 `README.md` 顶部：

```markdown
<div align="center">

# 昆仑框架 Kunlun Framework

> 开源的多智能体协作引擎 | Actor模型驱动 | 环保领域垂直解决方案

![Star](https://img.shields.io/github/stars/kunlun-tech/kunlun?style=social)
![Fork](https://img.shields.io/github/forks/kunlun-tech/kunlun?style=social)
![License](https://img.shields.io/github/license/kunlun-tech/kunlun)
![TypeScript](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=typescript)
![Python](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=python)
![Build Status](https://img.shields.io/github/actions/workflow/status/kunlun-tech/kunlun/ci.yml?branch=main)
![Coverage](https://img.shields.io/codecov/c/github/kunlun-tech/kunlun/main)
![Version](https://img.shields.io/pypi/v/kunlun-framework)
![Downloads](https://img.shields.io/pypi/dm/kunlun-framework)
![Last Commit](https://img.shields.io/github/last-commit/kunlun-tech/kunlun/main)
![Contributors](https://img.shields.io/github/contributors/kunlun-tech/kunlun)
![Open Issues](https://img.shields.io/github/issues/kunlun-tech/kunlun)
![Closed Issues](https://img.shields.io/github/issues-closed/kunlun-tech/kunlun)

[English](./README.md) | [中文](./README_zh.md)

</div>
```

---

## 徽章来源与配置

### 1. Star History（星标历史）

**服务**: [Star History](https://star-history.com/)

```markdown
[![Star History Chart](https://api.star-history.com/svg?repos=kunlun-tech/kunlun&type=Date)](https://star-history.com/#kunlun-tech/kunlun&type=Date)
```

**备用方案** - 使用 shields.io + 外部数据:

```markdown
![Star History](https://img.shields.io/badge/dynamic/json?color=green&label=stars&query=$.stars&url=https://api.sulfugames.org/star-history/kunlun-tech/kunlun)
```

### 2. License（许可证）

```markdown
![License](https://img.shields.io/github/license/kunlun-tech/kunlun)
```

常用许可证徽章变体：

```markdown
<!-- Apache 2.0 -->
![Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)

<!-- MIT -->
![MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

<!-- 自定义 -->
![License](https://img.shields.io/github/license/kunlun-tech/kunlun?style=flat-square)
```

### 3. TypeScript（主要语言）

```markdown
![TypeScript](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=typescript)
```

其他语言徽章：

```markdown
![Python](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=python&logoColor=3776AB)
![Go](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=go)
```

### 4. Build Status（构建状态）

**GitHub Actions**:

```markdown
![Build](https://img.shields.io/github/actions/workflow/status/kunlun-tech/kunlun/ci.yml?branch=main&event=push&logo=github)
```

**其他CI**:

```markdown
<!-- Travis CI -->
![Travis CI](https://img.shields.io/travis/kunlun-tech/kunlun/main)

<!-- CircleCI -->
![CircleCI](https://img.shields.io/circleci/build/github/kunlun-tech/kunlun/main)

<!-- GitLab CI -->
![GitLab CI](https://img.shields.io/gitlab/pipeline/kunlun-tech/kunlun/main)
```

### 5. Coverage（测试覆盖率）

**Codecov**:

```markdown
[![codecov](https://codecov.io/gh/kunlun-tech/kunlun/branch/main/graph/badge.svg)](https://codecov.io/gh/kunlun-tech/kunlun)
```

**Coveralls**:

```markdown
[![Coverage Status](https://coveralls.io/repos/github/kunlun-tech/kunlun/badge.svg?branch=main)](https://coveralls.io/github/kunlun-tech/kunlun)
```

**使用shields.io**:

```markdown
![Coverage](https://img.shields.io/codecov/c/github/kunlun-tech/kunlun/main?logo=codecov)
```

---

## 完整README头部模板

```markdown
<div align="center">

# 🏔️ 昆仑框架 Kunlun Framework

**新一代多智能体协作引擎 | Actor模型驱动 | 环保领域垂直解决方案**

<!-- 主要徽章 -->
[![License](https://img.shields.io/github/license/kunlun-tech/kunlun)](https://github.com/kunlun-tech/kunlun/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/kunlun-tech/kunlun?style=social)](https://github.com/kunlun-tech/kunlun/stargazers)
[![Forks](https://img.shields.io/github/forks/kunlun-tech/kunlun?style=social)](https://github.com/kunlun-tech/kunlun/network/members)
[![Last Commit](https://img.shields.io/github/last-commit/kunlun-tech/kunlun/main)](https://github.com/kunlun-tech/kunlun/commits/main)
[![Contributors](https://img.shields.io/github/contributors/kunlun-tech/kunlun)](https://github.com/kunlun-tech/kunlun/graphs/contributors)

<!-- 技术徽章 -->
[![TypeScript](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=typescript)](https://github.com/kunlun-tech/kunlun)
[![Python](https://img.shields.io/github/languages/top/kunlun-tech/kunlun?logo=python&logoColor=3776AB)](https://github.com/kunlun-tech/kunlun)
[![Node.js Version](https://img.shields.io/node/v/kunlun-framework)](https://nodejs.org/)
[![Python Version](https://img.shields.io/pypi/pyversions/kunlun-framework)](https://pypi.org/project/kunlun-framework/)

<!-- 构建与测试 -->
[![Build Status](https://img.shields.io/github/actions/workflow/status/kunlun-tech/kunlun/ci.yml?branch=main&logo=github)](https://github.com/kunlun-tech/kunlun/actions)
[![Coverage](https://img.shields.io/codecov/c/github/kunlun-tech/kunlun/main?logo=codecov)](https://codecov.io/gh/kunlun-tech/kunlun)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/kunlun-tech/kunlun/codeql.yml?branch=main&logo=github)](https://github.com/kunlun-tech/kunlun/security/code-scanning)

<!-- 版本与下载 -->
[![Version](https://img.shields.io/pypi/v/kunlun-framework?color=blue&label=pypi)](https://pypi.org/project/kunlun-framework/)
[![Downloads](https://img.shields.io/pypi/dm/kunlun-framework?color=brightgreen)](https://pypi.org/project/kunlun-framework/)
[![npm Version](https://img.shields.io/npm/v/kunlun-framework?color=orange)](https://www.npmjs.com/package/kunlun-framework)

<!-- 问题状态 -->
[![Open Issues](https://img.shields.io/github/issues/kunlun-tech/kunlun)](https://github.com/kunlun-tech/kunlun/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed/kunlun-tech/kunlun)](https://github.com/kunlun-tech/kunlun/issues?q=is%3Aissue+is%3Aclosed)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<!-- Star History -->
[![Star History Chart](https://api.star-history.com/svg?repos=kunlun-tech/kunlun&type=Date)](https://star-history.com/#kunlun-tech/kunlun&type=Date)

</div>
```

---

## 徽章颜色参考

| 用途 | 推荐颜色 | 示例 |
|------|----------|------|
| 许可证 | blue | `blue` |
| 构建成功 | brightgreen | `brightgreen` |
| 构建失败 | red | `red` |
| 版本号 | blue | `blue` |
| 下载量 | brightgreen | `brightgreen` |
| 星标数 | green | `green` |
| 警告 | yellow | `yellow` |
| 测试覆盖率 | green | `green` |

---

## 常见问题

### Q: 如何获取Codecov Token？

1. 登录 [Codecov](https://codecov.io/)
2. 关联你的GitHub仓库
3. 在仓库设置中获取 Token
4. 在GitHub Secrets中配置 `CODECOV_TOKEN`

### Q: shields.io 服务不稳定？

可以使用以下替代方案：

```markdown
<!-- 直接使用图片URL -->
![Build](https://github.com/kunlun-tech/kunlun/workflows/CI/badge.svg)
```

### Q: Star History 需要API Key？

免费版可以使用公开API，无需Key。如需更丰富的功能，可访问 [Star History Pro](https://star-history.com/pricing)。

---

## 徽章预览工具

- [Shields.io](https://shields.io/) - 自定义徽章
- [Badgen](https://badgen.net/) - 快速生成
- [For Badgers](https://forbadgers.com/) - 徽章集合
- [GitHub Profile Badges](https://github-profilebadges.com/) - 个人主页徽章
