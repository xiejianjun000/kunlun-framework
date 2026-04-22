# 🏯 OpenTaiji - 国产大模型确定性输出引擎

<div align="center">

<!-- AUTO-GENERATED-START: PACKAGE_VERSION -->
`1.0.0`
<!-- AUTO-GENERATED-END -->

**国产大模型适配器 &nbsp;|&nbsp; WFGY 确定性验证体系 &nbsp;|&nbsp; 可解释 · 可追踪 · 可复现

[![CI](.github/workflows/ci.yml)
[![Code Quality](.github/workflows/code-quality.yml)
[![Build Verification](.github/workflows/build.yml)

</div>

---

## 📑 目录

<!-- AUTO-GENERATED-START: TOC -->
- [✨ 核心特性](#-核心特性)
- [🚀 快速开始](#-快速开始)
- [📦 安装依赖](#-安装依赖)
- [🔧 配置说明](#-配置说明)
- [🧪 测试覆盖率](#-测试覆盖率)
- [📚 模块架构](#-模块架构)
- [🤝 贡献指南](#-贡献指南)
- [📄 许可证](#-许可证)
<!-- AUTO-GENERATED-END -->

---

## ✨ 核心特性

### 🎯 **WFGY 确定性验证体系**
- **W**hy - 为什么这么说？（来源追踪）
- **F**act - 事实依据是什么？（幻觉检测）
- **G**round - 落地执行的依据？（自一致性检查）
- **Y**ield - 最终产出的验证？（成果验证器）

### 🔌 **国产大模型适配器**
支持 8+ 国产主流大模型，统一接口规范：

| 模型 | 厂商 | 状态 |
|------|------|------|
| 文心一言 | 百度 | ✅ 已集成 |
| 通义千问 | 阿里 | ✅ 已集成 |
| 智谱 GLM | 智谱 AI | ✅ 已集成 |
| 讯飞星火 | 科大讯飞 | ✅ 已集成 |
| 腾讯混元 | 腾讯 | ✅ 已集成 |
| 字节豆包 | 字节跳动 | ✅ 已集成 |
| Kimi | 月之暗面 | ✅ 已集成 |

### 🧠 **核心能力**
- **混合记忆系统** - 向量 + 关键词混合检索
- **成果调度器** - 定时任务、执行历史、智能重试
- **梦境整合** - 多阶段知识融合与自修复
- **Wiki 知识图谱** - 结构化知识管理

---

## 🚀 快速开始

### 前置要求
- Node.js >= 20.0.0
- npm >= 10.0.0

### 安装
```bash
git clone https://github.com/xiejianjun000/open-taiji.git
cd open-taiji
npm install
```

### 基本使用
```typescript
import { OpenTaijiSystem } from './src/modules/OpenTaijiSystem';

const system = new OpenTaijiSystem({
  llmAdapter: 'qwen',
  enableWFGY: true,
  enableMemory: true,
});

const result = await system.process('用户问题', {
  traceSources: true,
  verifyFacts: true,
});

console.log('输出结果:', result.output);
console.log('置信度:', result.confidence);
console.log('引用来源:', result.sources);
```

---

## 📦 安装依赖

```bash
# 安装全部依赖
npm install

# 编译 TypeScript
npm run build

# 运行测试
npm test
```

---

## 🔧 配置说明

### NPM Scripts

<!-- AUTO-GENERATED-START: NPM_SCRIPTS -->
| 命令 | 描述 |
|------|------|
| `npm run build` | 编译 TypeScript 源代码到 JavaScript |
| `npm run test` | 运行 Jest 测试套件 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |
| `npm run lint` | 运行 ESLint 代码质量检查 |
| `npm run docs:update` | 自动更新 README 文档 |
<!-- AUTO-GENERATED-END -->

### 环境变量配置
创建 `.env` 文件：
```env
# 大模型 API 密钥（按需配置）
QWEN_API_KEY=your_qwen_key
WENXIN_API_KEY=your_wenxin_key
GLM_API_KEY=your_glm_key
SPARK_API_KEY=your_spark_key
HUNYUAN_API_KEY=your_hunyuan_key
DOUBAO_API_KEY=your_doubao_key
KIMI_API_KEY=your_kimi_key
```

---

## 🧪 测试覆盖率

> 运行 `npm run test:coverage` 生成最新覆盖率报告

<!-- AUTO-GENERATED-START: TEST_COVERAGE -->
> ⚠️ 覆盖率报告尚未生成，请先运行 `npm run test:coverage`
<!-- AUTO-GENERATED-END -->

---

## 📚 模块架构

### 核心模块

<!-- AUTO-GENERATED-START: MODULE_LIST -->
| 模块 | 路径 | 描述 |
|------|------|------|
| `determinism` | `src/modules/determinism/` | WFGY 确定性输出验证引擎，幻觉检测、自一致性检查、源追踪 |
| `memory` | `src/modules/memory/` | 混合向量记忆系统，语义搜索、长期记忆管理 |
| `outcome-scheduler` | `src/modules/outcome-scheduler/` | 成果调度器，定时任务、执行历史、模板引擎 |
| `wiki` | `src/modules/wiki/` | 知识图谱与 Wiki 系统 |
| `dreaming` | `src/modules/dreaming/` | 梦境整合系统，多阶段知识融合与修复 |

### LLM 适配器

| 适配器 | 路径 | 状态 |
|--------|------|------|
| `SparkAdapter` | `src/adapters/llm/SparkAdapter.ts` | ✅ 已实现 |
| `DoubaoAdapter` | `src/adapters/llm/DoubaoAdapter.ts` | ✅ 已实现 |
| `WenxinAdapter` | `src/adapters/llm/WenxinAdapter.ts` | ✅ 已实现 |
| `HunyuanAdapter` | `src/adapters/llm/HunyuanAdapter.ts` | ✅ 已实现 |
| `KimiAdapter` | `src/adapters/llm/KimiAdapter.ts` | ✅ 已实现 |
| `QwenAdapter` | `src/adapters/llm/QwenAdapter.ts` | ✅ 已实现 |
| `GLMAdapter` | `src/adapters/llm/GLMAdapter.ts` | ✅ 已实现 |
<!-- AUTO-GENERATED-END -->

### 目录结构
```
opentaiji/
├── src/
│   ├── adapters/llm/      # 大模型适配器
│   ├── modules/             # 核心功能模块
│   │   ├── determinism/    # WFGY 确定性验证
│   │   ├── memory/          # 混合记忆系统
│   │   ├── outcome-scheduler/ # 成果调度器
│   │   ├── wiki/            # Wiki 知识图谱
│   │   └── dreaming/       # 梦境整合
│   └── utils/               # 工具函数
├── tests/                   # 测试用例
├── dist/                    # 编译产物
├── examples/                # 示例代码
└── taiji-website/         # 官方网站
```

---

## 🤖 GitHub Actions CI/CD

项目已配置完整的自动化流水线：

| 流水线 | 触发条件 | 主要功能 |
|--------|----------|----------|
| **CI Pipeline** | Push / PR | 测试、类型检查、覆盖率 |
| **Code Quality** | 代码变更 | ESLint、依赖安全审计 |
| **Build Verification** | 主分支推送 | 构建验证、产物检查 |
| **Auto Update README** | 配置/源码/覆盖率变更 | 自动更新文档 |

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范
- 遵循 TypeScript 最佳实践
- 运行 `npm run lint` 确保代码质量
- 新增功能必须包含单元测试

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

<div align="center">

**最后自动更新**: <!-- AUTO-GENERATED-START: LAST_UPDATED -->2026-04-22 08:55
<!-- AUTO-GENERATED-END -->

*本文档由 [markdown-magic](https://github.com/DavidWells/markdown-magic) 自动生成*

</div>
