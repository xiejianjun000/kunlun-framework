# 昆仑框架 Web 聊天界面

> 昆仑框架的多智能体交互界面 - 支持与十三神智能体对话

## 功能特性

### 🎯 核心功能
- **智能体选择器** - 从左侧列表选择不同的智能体（十三神）
- **实时聊天** - 支持与智能体进行自然语言对话
- **会话管理** - 创建、切换、删除会话
- **历史消息** - 自动保存对话历史

### 🎨 界面特点
- **深色主题** - 护眼的深色配色方案
- **响应式设计** - 适配桌面端和移动端
- **流畅动画** - 消息滑入、状态切换等动效
- **Markdown支持** - 支持粗体、斜体、代码等格式

### 🔧 技术栈
- **React 18** - 现代化UI框架
- **TypeScript** - 类型安全
- **Vite** - 快速开发构建
- **Zustand** - 轻量级状态管理
- **CSS Modules** - 组件化样式

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
cd web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看界面。

### 构建生产版本

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 项目结构

```
web/
├── public/
│   └── avatars/          # 智能体头像
├── src/
│   ├── api/              # API 服务
│   │   └── chat.ts       # 聊天相关 API
│   ├── components/       # React 组件
│   │   ├── AgentSelector.tsx   # 智能体选择器
│   │   ├── ChatSidebar.tsx     # 会话列表
│   │   ├── ChatWindow.tsx     # 聊天主窗口
│   │   ├── Header.tsx         # 顶部栏
│   │   ├── Layout.tsx         # 布局组件
│   │   └── MessageItem.tsx    # 消息条目
│   ├── hooks/            # 自定义 Hooks
│   │   └── useChatStore.ts    # 聊天状态管理
│   ├── styles/           # 全局样式
│   │   └── global.css
│   ├── types/            # TypeScript 类型
│   │   └── index.ts
│   ├── App.tsx           # 应用入口
│   └── main.tsx          # React 入口
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 与昆仑框架后端对接

### 配置 API 地址

在项目根目录创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

### API 接口规范

聊天界面需要后端提供以下 REST API：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/agents` | GET | 获取智能体列表 |
| `/api/agents/:id` | GET | 获取智能体详情 |
| `/api/conversations` | GET | 获取会话列表 |
| `/api/conversations` | POST | 创建新会话 |
| `/api/conversations/:id` | DELETE | 删除会话 |
| `/api/conversations/:id/messages` | GET | 获取会话消息 |
| `/api/chat` | POST | 发送消息 |

### WebSocket 实时消息

通过 WebSocket 连接 `/ws/chat?conversationId=xxx` 实现实时消息推送。

消息格式：
```json
{
  "type": "message",
  "payload": {
    "id": "msg-xxx",
    "role": "assistant",
    "content": "你好！",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## 十三神智能体

昆仑框架内置了8个专业智能体：

| 智能体 | 专长 | 状态 |
|--------|------|------|
| 中岳 | 战略分析、长期规划 | 🟢 在线 |
| 白鲸 | 创意设计、创新思维 | 🟢 在线 |
| 天禄 | 知识问答、信息检索 | 🟢 在线 |
| 闪耀 | 效率优化、任务管理 | 🟡 忙碌 |
| 兜率天 | 心理咨询、成长指导 | 🟢 在线 |
| 月白 | 文学创作、翻译润色 | 🟢 在线 |
| 乾坤 | 技术开发、架构设计 | 🟢 在线 |
| 银靓 | 数据分析、趋势预测 | ⚪ 离线 |

## 使用说明

1. **选择智能体** - 从左侧列表点击选择一个智能体
2. **开始对话** - 在底部输入框输入消息，按 Enter 发送
3. **新建会话** - 点击"新建对话"按钮开始新会话
4. **切换会话** - 从中间列表选择历史会话

## 开发指南

### 添加新智能体

在 `src/hooks/useChatStore.ts` 的 `mockAgents` 数组中添加：

```typescript
{
  id: 'agent-new',
  name: '新智能体',
  avatar: '/avatars/new.svg',
  description: '描述信息',
  status: 'online',
  capabilities: ['能力1', '能力2'],
}
```

### 自定义主题

修改 `src/styles/global.css` 中的 CSS 变量：

```css
:root {
  --primary-color: #6366f1;  /* 主色调 */
  --bg-primary: #0f172a;      /* 主背景 */
  --text-primary: #f8fafc;    /* 主文字色 */
  /* ... */
}
```

## License

Apache-2.0
