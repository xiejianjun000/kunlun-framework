/**
 * MCP Client 使用示例
 * 展示如何连接到 MCP Server 并调用工具
 */

import { MCPClient } from '../core/mcp';

// 配置 MCP Server 连接
const client = new MCPClient({
  serverCommand: 'python',
  serverArgs: ['-m', 'code_review_graph', '--repo', './my-project'],
  cwd: process.cwd(),
  timeout: 60000, // 60秒超时
});

async function main() {
  try {
    // 连接
    await client.connect();
    console.log('✓ Connected to MCP Server');

    // 获取可用工具
    const tools = await client.listTools();
    console.log(`✓ Found ${tools.length} tools`);
    tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // 调用工具
    const result = await client.call('semantic_search_nodes', {
      query: 'authentication',
      max_results: 10,
    });
    console.log('✓ Search result:', result);

    // 直接调用工具方法
    const impact = await client.callTool({
      name: 'get_impact_radius',
      arguments: {
        node_name: 'authenticate_user',
        max_depth: 2,
      },
    });
    console.log('✓ Impact radius:', impact);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.disconnect();
  }
}

main();
