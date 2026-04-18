# MCP Module

OpenTaiji MCP Client 实现，支持通过 Model Context Protocol 与 MCP Server 通信。

## 安装

```bash
npm install
```

## 文件结构

```
src/core/mcp/
├── types.ts                  # MCP 协议类型定义
├── MCPClient.ts              # 通用 MCP 客户端实现
├── CodeReviewGraphClient.ts  # code-review-graph 专用客户端
└── index.ts                  # 导出入口
```

## 使用方法

### 1. 使用通用 MCP Client

```typescript
import { MCPClient } from './core/mcp';

const client = new MCPClient({
  serverCommand: 'python',
  serverArgs: ['-m', 'code_review_graph'],
  cwd: process.cwd(),
  timeout: 60000,
});

await client.connect();
const tools = await client.listTools();
const result = await client.call('tool_name', { param: 'value' });
client.disconnect();
```

### 2. 使用 Code Review Graph Client

```typescript
import { CodeReviewGraphClient } from './core/mcp';

const client = new CodeReviewGraphClient({
  serverCommand: 'python',
  serverArgs: ['-m', 'code_review_graph'],
  repoPath: '/path/to/repo',
  languages: ['typescript', 'javascript'],
});

await client.connect();

// 获取架构概览
const overview = await client.getArchitectureOverview();

// 语义搜索
const results = await client.semanticSearchNodes('authentication', 10);

// 分析影响半径
const impact = await client.getImpactRadius('my_function', 3);

// 查找大函数
const largeFunctions = await client.findLargeFunctions(100);

// 生成文档
const wiki = await client.generateWiki();

// 架构健康度分析
const health = await client.analyzeArchitectureHealth();

client.disconnect();
```

## MCP 工具列表

code-review-graph 提供 28 个 MCP 工具，按功能分为：

### 架构与导航
- `get_architecture_overview` - 获取架构概览
- `list_communities` - 列出所有社区
- `get_community` - 获取社区详情
- `query_graph` - 查询调用关系
- `list_flows` - 列出执行路径
- `get_flow` - 获取执行路径详情

### 搜索与发现
- `semantic_search_nodes` - 语义搜索
- `get_impact_radius` - 影响半径分析
- `find_large_functions` - 查找大函数
- `find_complex_modules` - 查找复杂模块

### 文档生成
- `generate_wiki` - 生成文档
- `get_wiki_page` - 获取模块文档
- `generate_module_documentation` - 生成模块文档

### 重构支持
- `refactor` - 重构预览
- `apply_refactor` - 执行重构
- `preview_refactor` - 预览重构效果

### 代码分析
- `analyze_patterns` - 分析代码模式
- `get_code_metrics` - 获取代码度量
- `find_related_tests` - 查找相关测试

### 知识管理
- `add_knowledge` - 添加知识
- `query_knowledge` - 查询知识库
- `get_knowledge_gaps` - 获取知识空白

### 上下文获取
- `get_minimal_context` - 获取最小上下文
- `get_detailed_context` - 获取详细上下文
- `get_file_context` - 获取文件上下文

### 节点分析
- `find_hub_nodes` - 查找 Hub 节点
- `find_bridge_nodes` - 查找 Bridge 节点

## MCP Server 配置

### 方式 1: 直接启动

```bash
# 安装 code-review-graph
pip install better-code-review-graph

# 启动 MCP Server
better-code-review-graph --repo /path/to/repo
```

### 方式 2: 使用 uv

```json
{
  "mcpServers": {
    "code-review-graph": {
      "command": "uv",
      "args": [
        "run",
        "better-code-review-graph",
        "--repo",
        "/path/to/repo"
      ]
    }
  }
}
```

## 事件监听

```typescript
client.on('connected', () => console.log('Connected'));
client.on('disconnected', (info) => console.log('Disconnected:', info));
client.on('error', (err) => console.error('Error:', err));
client.on('stateChange', (state) => console.log('State:', state));
client.on('notification', (msg) => console.log('Notification:', msg));
```

## 错误处理

```typescript
try {
  await client.connect();
} catch (err) {
  if (err.message.includes('timeout')) {
    // 处理超时
    await client.reconnect();
  } else {
    throw err;
  }
}
```

## 许可证

Apache-2.0
