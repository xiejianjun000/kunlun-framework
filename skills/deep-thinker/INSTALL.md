# Deep Thinker 安装指南

## 安装步骤

### 方法 1：手动安装（推荐）

```bash
# 1. 进入 openclaw skills 目录
cd ~/.openclaw/skills/

# 2. 复制技能文件夹
cp -r /path/to/deep-thinker .

# 3. 验证安装
openclaw skill list | grep deep-thinker
```

### 方法 2：使用 openclaw CLI

```bash
# 从本地目录安装
openclaw skill install /path/to/deep-thinker

# 验证安装
openclaw skill status deep-thinker
```

### 方法 3：从 GitHub 安装（如果已上传）

```bash
openclaw skill install https://github.com/yourusername/deep-thinker
```

---

## 安装后验证

### 1. 检查技能状态
```bash
openclaw skill status deep-thinker
```

应该显示：
- 技能名称：deep-thinker
- 版本：1.0.0
- 状态：已安装

### 2. 测试技能

在 OpenClaw 对话中测试：

```
用户: 用 deep-thinker 快速思考一下，什么是深度思考？
```

应该看到包含以下内容的输出：
- 📌 问题理解
- 🔍 多维度分析
- 💡 关键洞察
- 🎯 可行动建议

---

## 配置选项

### 调整默认深度

编辑 `~/.openclaw/skills/deep-thinker/SKILL.md`，修改默认输出模式：

```markdown
### 输出深度控制

**简洁模式**（默认）：
- 触发词："快速思考"、"简要分析"

**标准模式**（默认）：
- 触发词："分析"、"思考"

**深度模式**：
- 触发词："深度分析"、"全面思考"
```

### 添加行业知识

如果需要特定行业的知识库，可以在 SKILL.md 中添加：

```markdown
### 行业知识适配

本技能可以结合特定行业知识：
- **技术领域**：自动引用技术决策模式
- **商业领域**：自动引用商业分析框架
- **产品领域**：自动引用产品设计原则
```

---

## 卸载

```bash
openclaw skill uninstall deep-thinker
```

---

## 更新

```bash
# 从本地目录更新
openclaw skill install /path/to/deep-thinker --force

# 或手动替换文件
cp -r /new/path/to/deep-thinker ~/.openclaw/skills/
```

---

## 故障排查

### 问题 1：技能没有被自动触发

**原因**：触发关键词可能不匹配

**解决**：
1. 检查 SKILL.md 中的触发条件
2. 明确说"用 deep-thinker 分析"
3. 检查技能是否正确安装：`openclaw skill list`

### 问题 2：输出太长

**解决**：
- 说"快速思考"或"简要分析"
- 或者说"只给3个关键洞察，不要展开"

### 问题 3：分析不够深入

**解决**：
- 明确说"深度分析"或"全面思考"
- 提供更多背景信息
- 指定使用的方法："用第一性原理和系统性思维深度分析"

### 问题 4：技能报错

**检查**：
```bash
# 查看技能日志
openclaw skill logs deep-thinker

# 检查技能文件
cat ~/.openclaw/skills/deep-thinker/SKILL.md
```

---

## 系统要求

- OpenClaw (小龙虾) 任何版本
- Python 3.7+ (如果要运行 scripts/ 中的脚本)
- 无其他依赖

---

## 下一步

安装完成后，建议：

1. 阅读 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) 了解快速使用方法
2. 查看 [examples/business-analysis.md](examples/business-analysis.md) 了解案例
3. 在实际对话中测试技能

---

## 获取帮助

如果遇到问题：
1. 查看 [README.md](README.md) 使用指南
2. 检查 [SKILL.md](SKILL.md) 中的详细说明
3. 在 OpenClaw 社区寻求帮助

---

**版本**: 1.0.0
**最后更新**: 2025-03-20
