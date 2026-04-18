/**
 * Code Review Graph Client 使用示例
 * 展示如何使用专用客户端进行代码分析
 */

import { CodeReviewGraphClient } from '../core/mcp';

async function main() {
  // 创建客户端
  const client = new CodeReviewGraphClient({
    serverCommand: 'python',
    serverArgs: ['-m', 'code_review_graph'],
    repoPath: '/path/to/your/project',
    languages: ['typescript', 'javascript', 'python'],
  });

  try {
    // 连接
    await client.connect();
    console.log('✓ Connected to code-review-graph');

    // 1. 构建知识图谱
    console.log('\n--- Building Graph ---');
    const buildResult = await client.buildGraph(false);
    console.log('✓ Graph built:', buildResult.stats);

    // 2. 获取架构概览
    console.log('\n--- Architecture Overview ---');
    const overview = await client.getArchitectureOverview();
    console.log(`Found ${overview.communities.length} communities`);
    console.log(`Entry points: ${overview.entry_points.join(', ')}`);

    // 3. 列出所有模块
    console.log('\n--- Communities ---');
    const communities = await client.listCommunities();
    communities.slice(0, 5).forEach((c) => {
      console.log(`  ${c.name}: ${c.node_count} nodes, ${c.files.length} files`);
    });

    // 4. 语义搜索
    console.log('\n--- Semantic Search ---');
    const searchResult = await client.semanticSearchNodes('user authentication', 5);
    console.log(`Found ${searchResult.nodes.length} related nodes`);
    searchResult.nodes.forEach((node) => {
      console.log(`  - ${node.name} (${node.type}) at ${node.file_path}`);
    });

    // 5. 分析影响半径
    console.log('\n--- Impact Analysis ---');
    const impact = await client.getImpactRadius('authenticate_user', 3);
    console.log(`Impacted ${impact.affected_nodes.length} nodes`);
    console.log(`Changed files: ${impact.changed_files.join(', ')}`);
    console.log(`Affected communities: ${impact.impacted_communities.join(', ')}`);

    // 6. 查找大函数
    console.log('\n--- Large Functions ---');
    const largeFunctions = await client.findLargeFunctions(100, 'lines');
    console.log(`Found ${largeFunctions.length} functions > 100 lines`);
    largeFunctions.slice(0, 3).forEach((fn) => {
      console.log(`  - ${fn.name} at ${fn.file_path}:${fn.line_number}`);
    });

    // 7. 查询调用关系
    console.log('\n--- Call Graph Query ---');
    const callGraph = await client.queryGraph('callers_of', 'process_request', 20);
    console.log(`Found ${callGraph.nodes.length} callers`);
    console.log(`Edges: ${callGraph.edges.length}`);

    // 8. 生成文档
    console.log('\n--- Generate Wiki ---');
    const wiki = await client.generateWiki();
    console.log(`Generated ${wiki.pages.length} documentation pages`);

    // 9. 获取知识空白
    console.log('\n--- Knowledge Gaps ---');
    const gaps = await client.getKnowledgeGaps();
    console.log(`Found ${gaps.length} areas needing documentation`);
    gaps.filter((g) => g.priority === 'high').forEach((g) => {
      console.log(`  ⚠ ${g.area}: ${g.description}`);
    });

    // 10. 架构健康度分析
    console.log('\n--- Architecture Health ---');
    const health = await client.analyzeArchitectureHealth();
    console.log(`Health Score: ${health.score}/100`);
    if (health.issues.length > 0) {
      console.log('Issues:');
      health.issues.forEach((issue) => console.log(`  - ${issue}`));
    }
    if (health.recommendations.length > 0) {
      console.log('Recommendations:');
      health.recommendations.forEach((rec) => console.log(`  - ${rec}`));
    }

    // 11. 代码变更影响分析
    console.log('\n--- Change Impact Analysis ---');
    const changeImpact = await client.analyzeChangeImpact('src/services/auth.ts');
    console.log(`Risk Level: ${changeImpact.risk_level}`);
    console.log(`Directly Affected: ${changeImpact.directly_affected.length} files`);
    console.log(`Testing Suggestions: ${changeImpact.testing_suggestions.length} tests`);

    // 12. Hub 和 Bridge 节点分析
    console.log('\n--- Critical Nodes ---');
    const hubNodes = await client.findHubNodes(5);
    console.log('Hub Nodes (highly connected):');
    hubNodes.forEach((node) => {
      console.log(`  - ${node.name}`);
    });

    const bridgeNodes = await client.findBridgeNodes(5);
    console.log('Bridge Nodes (cross-module):');
    bridgeNodes.forEach((node) => {
      console.log(`  - ${node.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.disconnect();
  }
}

main();
