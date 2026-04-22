# GitHub Webhook 通知配置指南

## 📋 功能说明

配置后，以下事件会自动发送通知到你的群聊机器人：

| 事件 | 触发时机 |
|------|----------|
| ⭐ Star | 有人点赞项目 |
| 🍴 Fork | 有人 Fork 项目 |
| 📝 Issue | 有人创建/编辑/关闭/重新打开 Issue |
| 🔀 PR | 有人创建/编辑/合并/关闭/重新打开/请求评审 PR |

---

## 🚀 快速配置（BOSS 专享版）

**只需要 3 步，5 分钟搞定：**

1. **建群机器人** → 选下面一种方式（推荐飞书）
2. **复制 Webhook 地址** → 从机器人设置里复制
3. **粘贴到 GitHub Secrets** → 仓库 Settings → Secrets and variables → Actions → New repository secret

完成！以后群里就会自动收到通知了。

---

## 📖 详细配置步骤

### 第一步：创建群机器人

选择你使用的聊天工具：

---

#### 🔵 方案 A：飞书（推荐）

**步骤：**

1. 打开飞书，进入你想要接收通知的群聊
2. 点击群右上角「...」→ 「群设置」
3. 找到「群机器人」→ 点击「添加机器人」
4. 选择「自定义机器人」
5. 填写机器人名称：`GitHub 通知`
6. 填写机器人描述：`项目动态自动通知`
7. 点击「添加」
8. **重要：复制生成的 Webhook 地址**（长这样：`https://open.feishu.cn/open-apis/bot/v2/hook/xxx`）
9. 点击「完成」

**飞书机器人安全设置（可选）：**
- 可以设置「自定义关键词」，添加 `GitHub` 关键词
- 可以设置 IP 白名单：GitHub Actions IP 范围
- 也可以不设置，直接使用

---

#### 🟢 方案 B：企业微信

**步骤：**

1. 打开企业微信，进入目标群聊
2. 点击群右上角「...」→ 「群机器人」
3. 点击「添加机器人」
4. 填写机器人名字：`GitHub 通知`
5. 点击「添加机器人」
6. **复制生成的 Webhook 地址**（长这样：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）

---

#### 🔴 方案 C：钉钉

**步骤：**

1. 打开钉钉，进入目标群聊
2. 点击群右上角「...」→ 「智能群助手」
3. 点击「添加机器人」
4. 选择「自定义」→ 点击「添加」
5. 填写机器人名字：`GitHub 通知`
6. **安全设置：选择「自定义关键词」，添加 `GitHub`**（必须设置）
7. 勾选「我已阅读并同意」→ 点击「完成」
8. **复制生成的 Webhook 地址**（长这样：`https://oapi.dingtalk.com/robot/send?access_token=xxx`）

> ⚠️ 钉钉必须设置自定义关键词 `GitHub`，否则消息会被拦截。

---

### 第二步：配置到 GitHub Secrets

**步骤：**

1. 打开你的 GitHub 仓库：`https://github.com/你的用户名/open-taiji`
2. 点击顶部的 **Settings**（设置）
3. 在左侧菜单找到 **Secrets and variables** → 点击 **Actions**
4. 点击 **New repository secret**（新建仓库密钥）
5. 填写：
   - **Name（名称）：** `NOTIFY_WEBHOOK_URL`
   - **Secret（密钥）：** 粘贴你刚才复制的 Webhook 地址
6. 点击 **Add secret**（添加密钥）

✅ 配置完成！

---

## 🧪 测试是否生效

**测试方法：**

1. 自己给项目点个 Star 再取消
2. 或者创建一个测试 Issue 再关闭
3. 检查群聊里是否收到通知

**如果没收到通知：**

1. 检查 Webhook 地址是否正确复制
2. 检查 Secret 名称是否是 `NOTIFY_WEBHOOK_URL`（严格大小写）
3. 去仓库的 Actions 页面查看工作流日志

---

## 📂 工作流文件说明

工作流文件位置：`.github/workflows/webhook-notify.yml`

- 使用 `actions/github-script@v7` 执行脚本
- 自动检测 Webhook 类型（飞书/企业微信/钉钉）
- 发送格式适配各平台消息卡片
- 无额外依赖，纯官方 Action

---

## 🔧 高级配置（可选）

### 自定义触发事件

编辑 `webhook-notify.yml`，在 `on:` 下面添加或删除事件：

```yaml
on:
  watch:
    types: [started]
  fork:
  issues:
    types: [opened, edited, closed, reopened]
  pull_request:
    types: [opened, edited, closed, reopened, review_requested]
  # 可以添加更多事件
  # release:
  #   types: [published]
  # push:
  #   branches: [main]
```

### 支持多个 Webhook

如果需要同时发送到多个群，可以修改工作流脚本，支持逗号分隔的 URL 列表。

---

## ❓ 常见问题

**Q: 工作流运行了但是没收到消息？**
- A: 检查 Webhook URL 是否正确，钉钉需要设置关键词 `GitHub`

**Q: 可以配置多个机器人吗？**
- A: 可以，修改脚本支持数组，或创建多个 Secret 分别调用

**Q: 为什么有些事件没触发？**
- A: GitHub 对某些事件有权限限制，确保工作流有足够权限

---

## 📞 技术支持

如有问题，请：
1. 查看仓库 Actions 页面的工作流日志
2. 检查机器人 Webhook 的调用记录
3. 联系技术团队协助排查
