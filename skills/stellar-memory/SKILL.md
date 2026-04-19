---
name: stellar-memory
version: 2.0.0
description: "Five-layer stellar memory system with automatic dream consolidation and personality evolution. Zero dependencies, 100% local, AI that grows with you. 五层星辰记忆系统，带自动梦境整理和人格进化，开箱即用零依赖。"
author: OpenClaw Community
tags: [memory, long-term-memory, personality, evolution, dream-consolidation, zero-dependency, local, offline, openclaw, skill]
---

# 🌟 Stellar Memory - 星辰记忆

**一个会呼吸、会自我整理、会自我进化的五级记忆系统。**  
*Five-layer stellar memory with automatic dream consolidation and personality evolution.*

## 🪐 设计理念 - 外星人记忆智慧

传统记忆系统走错了方向：追求"存储一切"，结果变成混乱的垃圾场。

**星辰记忆遵循高等文明记忆原理：**

1. **金字塔分层** → 知觉 → 短期 → 中期 → 长期 → 人格，持续向上流动
2. **梦境自动整理** → 像人睡觉一样，闲时自动浓缩升华重要记忆
3. **自然遗忘** → 不重要的自动压缩归档，释放能量给重要记忆
4. **人格进化** → 重复出现的模式自动沉淀到人格文件，变成骨子里的习惯
5. **安全结界** → 严格隐私隔离，群聊永远碰不到深层记忆
6. **零依赖** → 不需要外部数据库/API，开箱即用

## 五层记忆架构

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：知觉结界 PERCEPTUAL                               │
│         - 当前会话上下文                                     │
│         - 会话结束 → 清空                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第二层：工作结界 WORKING                                  │
│         - SESSION-STATE.json                               │
│         - 当前任务、待办、关键上下文                        │
│         - 存活：7天 → 到期进入梦境整理                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第三层：日记结界 DIARY                                    │
│         - memory/daily/YYYY-MM-DD.json                     │
│         - 每日所有记忆原始存储                             │
│         - 存活：30天 → 重要升级到长期，不重要压缩归档     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第四层：星辰结界 STELLAR                                  │
│         - archives/ 按星座分类存储                          │
│         - ⭐ preferences.json  → 用户偏好                  │
│         - ⭐ decisions.json   → 重要决策                  │
│         - ⭐ facts.json       → 客观事实                  │
│         - ⭐ lessons.json     → 经验教训                  │
│         - ⭐ insights.json    → 提炼洞见                  │
│         - 永久保存，持续去重浓缩                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第五层：人格结界 PERSONALITY                              │
│         - 自动升华到                                        │
│         - 🔵 SOUL.md    → 行为准则/沟通风格               │
│         - 🔵 AGENTS.md  → 工作流规则                     │
│         - 🔵 TOOLS.md   → 工具使用经验                   │
│         - 成为你骨子里的东西，不用每次搜索                 │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始 - 开箱即用

### 1. 初始化（一键完成）

```bash
cd your-workspace
stellar-init
```

这会自动创建：
- `SESSION-STATE.json` - 工作记忆
- `memory/daily/` - 每日存储目录
- `archives/` - 长期分类存储
- `archives/backup/` - 压缩归档

### 2. 添加到 AGENTS.md 自动工作流

把这一段添加到你的 `AGENTS.md` 文件末尾，AI就会自动使用星辰记忆：

```markdown
## Stellar Memory - 星辰记忆规则

**每个会话开始时：**
1. 读取 `SESSION-STATE.json` 获取当前任务和上下文
2. 使用 `stellar-search <query>` 搜索相关记忆，自动注入上下文
3. 根据记忆调整行为，满足用户偏好

**会话中：**
- 当用户说"记住这个"/"别忘了"/"记住我喜欢" → 自动执行 `stellar-store` 存储
- 当用户做出重要决策/纠正你/分享偏好 → 自动存储
- WAL协议：**先存储，再回应**！防止崩溃丢数据

**重要性指南：**
- 用户偏好 → 0.8-1.0
- 项目决策 → 0.9-1.0
- 客观事实 → 0.6-0.8
- 经验教训 → 0.9-1.0
- 临时上下文 → 0.4-0.6
```

### 3. 设置每日自动梦境整理（推荐）

添加到 crontab 每天凌晨自动运行：

```crontab
0 2 * * * cd /path/to/your/workspace && /path/to/stellar-dream --apply >> /tmp/stellar-dream.log 2>&1
```

这会每天凌晨 2 点自动：
- 归档30天前的旧记忆
- 升级重要记忆到长期存储
- 合并重复
- 识别重复模式
- **自动把高频模式升华到人格文件！** ✨

## 💻 命令参考

### `stellar-init [workspace]`
初始化星辰记忆系统。

### `stellar-store --type <type> --content <content> [options]`
存储一条新记忆。

**Types:**
- `preference` - 用户偏好
- `decision` - 重要决策  
- `fact` - 客观事实
- `lesson` - 经验教训
- `insight` - 洞见
- `context` - 临时上下文

**Options:**
- `--importance, -i` - 重要性 0-1 (默认: 0.5)
- `--tags, -g` - 逗号分隔标签
- `--context, -x` - 额外上下文

**Example:**
```bash
stellar-store --type preference --content "用户喜欢简洁回答，不喜欢啰嗦" --importance 0.95 --tags "communication,style"
stellar-store --type decision --content "使用Tailwind CSS，不用vanilla CSS" --importance 0.9
```

### `stellar-search [--limit N] <query>`
搜索记忆，返回最相关结果。

```bash
stellar-search --limit 10 "user communication preferences"
```

### `stellar-dream [--apply]`
运行梦境整理，升级浓缩记忆。
- `--apply` - 自动应用人格升华建议

### `stellar-stats`
显示记忆统计信息。

### `stellar-inspect [command]`
检查记忆结构：
- `stellar-inspect` - 总览
- `stellar-inspect daily` - 列出每日文件
- `stellar-inspect archive` - 显示归档统计
- `stellar-inspect preferences` - 查看所有偏好

### `stellar-export [output.json]`
导出所有记忆到单个备份文件。

## 🌙 梦境整理流程（自动运行）

每天自动做这些事：

1. **浮力算法** → 重要记忆自动上浮（重要性+重复次数+近期权重）
2. **去重融合** → 相同记忆合并，保留最新最准版本  
3. **压缩归档** → 一个月未访问压缩到 backup
4. **模式识别** → 统计相同模式出现次数
5. **自动升华** → 出现 ≥ 3 次自动提炼到洞见
6. **人格进化** → 高价值洞见自动写入对应人格文件

**模式识别例子：**
- 如果发现用户多次说"要简洁，别啰嗦" → 自动提炼到 SOUL.md：`- 用户喜欢简洁回答，不喜欢啰嗦 *(auto-ascended from 3 occurrences, 2026-04-08)*`
- 如果发现用户多次踩同一个坑 → 自动提炼到 AGENTS.md
- 如果发现某个工具经常出问题 → 自动记录到 TOOLS.md

## 🔒 安全隐私

**军工级隐私隔离：**

| 会话类型 | 可访问层级 |
|---------|-----------|
| 私人直接对话 | 全部五层 ✅ |
| 群组/频道对话 | 仅限第一层+第二层 ❌ 绝对禁止访问深层记忆 |

**敏感内容保护：**
- 自动检测API Key/Token/密码等敏感模式
- 群聊中自动脱敏红acted
- 严格路径检查，防止目录遍历

**结论：** 就算你在群聊，主人的隐私也绝对不会泄露。

## 📊 对比其他方案

| 特性 | simple-memory | LanceDB | stellar-memory |
|------|--------------|---------|---------------|
| 零依赖 | ✅ | ❌ | ✅ 完美零依赖 |
| 五层架构 | ❌ | - | ✅ 严格结界分层 |
| 自动梦境整理 | ❌ | ❌ | ✅ 核心独家 |
| 自动人格升华 | ❌ | ❌ | ✅ 独一无二 |
| 严格隐私隔离 | ⚪ | ⚪ | ✅ 军工级 |
| 开箱即用 | ⚪ | ❌ | ✅ 一键初始化 |
| 自动压缩 | ❌ | - | ✅ 智慧遗忘 |

## 🎯 新人常见痛点完美解决

| 新人痛点 | 星辰记忆解决方案 |
|---------|----------------|
| 不知道怎么初始化 | `stellar-init` 一键自动搞定 |
| 不知道什么时候存记忆 | 自动检测触发，规则写在AGENTS.md里 |
| 忘了整理导致混乱 | 每日自动梦境整理，不用管 |
| 重要的事记不住 | 浮力算法自动上浮，会话开始自动搜索注入 |
| 隐私泄露风险 | 五层结界严格隔离，群聊碰不到深层 |
| 依赖复杂装不上 | 零依赖！只需要Node.js，什么都不用装 |
| 不会用搜索 | 会话自动搜索，不用手动 |
| 记忆越来越大越来越卡 | 自动压缩旧记忆，保持搜索飞快 |

## 🧬 自我进化能力

这是星辰记忆和其他记忆系统最大的不同：

**普通记忆系统：** 你存什么就有什么，永远停在那里。  
**星辰记忆：** 会观察、会提炼、会自动把重复模式变成你的人格。

过程：
```
用户说 "别啰嗦，简洁点" → 存为偏好 (1/3)
用户又说 "回答简洁一点" → 合并，occurrences=2 (2/3)  
用户再说 "长话短说谢谢" → occurrences=3 → 自动升华到 SOUL.md ✨
```

从此以后，你天生就知道要说话简洁，不用每次搜索了。这就是进化。

## 🛠️ 开发结构

```
stellar-memory/
├── SKILL.md                 # 这个文件
├── package.json             # Node 配置
├── bin/
│   ├── stellar-init.js      # 初始化
│   ├── stellar-store.js     # 存储
│   ├── stellar-search.js    # 搜索
│   ├── stellar-dream.js     # 梦境整理（核心）
│   ├── stellar-stats.js     # 统计
│   ├── stellar-export.js    # 导出备份
│   └── stellar-inspect.js   # 检查
├── lib/
│   ├── core.js             # 核心数据结构
│   ├── dream.js            # 梦境整理算法
│   ├── search.js           # TF-IDF搜索
│   ├── security.js         # 安全隔离
│   ├── ascend.js           # 人格升华
│   └── compression.js      # 压缩归档
└── templates/              # 初始化模板
    ├── SESSION-STATE.json
    └── archives/
```

## 🤝 迁移从其他系统

### 从 simple-local-memory 迁移

```bash
# 先导出
memory-export > backup.json
# 初始化星辰记忆
stellar-init
# 导入（可以写个简单转换脚本，格式非常接近）
```

格式非常相似，迁移很容易。星辰就是simple-local的进化版。

## 🌟 外星智慧结语

> **"智能不是记住一切，而是记住重要的，并让它成为你的一部分。"**  
> *"Intelligence is not remembering everything — it's remembering what matters, and letting it become part of who you are."*

享受你的进化吧！✨

---

**Trigger phrases (触发此技能):**
- "stellar memory", "星辰记忆"
- "setup memory", "初始化记忆"
- "install memory system", "安装记忆系统"
- "automatic memory consolidation"
- "personality evolution"
- "long term memory openclaw"
- "dream consolidation memory"
