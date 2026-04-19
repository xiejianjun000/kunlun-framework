/**
 * GraphMemory Usage Examples
 * 
 * 图存储使用示例
 */

import { createGraphMemoryStore, GraphMemoryStore } from './index';
import type { CreateNodeInput, CreateEdgeInput, NodeKind, EdgeKind } from './types';

// ==================== 基础使用 ====================

export async function basicUsageExample(): Promise<void> {
  // 创建存储实例
  const store = createGraphMemoryStore({
    dbPath: './memory-graph.db',
    enableWAL: true,
  });

  // 创建节点
  const conceptNode = store.createNode({
    kind: 'Concept',
    qualifiedName: 'open-taiji:graph-memory',
    name: 'GraphMemory',
    content: '基于SQLite的图存储模块',
    metadata: {
      importance: 10,
      tags: ['storage', 'graph', 'sqlite'],
    },
  });

  const projectNode = store.createNode({
    kind: 'Project',
    qualifiedName: 'open-taiji',
    name: 'OpenTaiji',
    content: '开源多智能体框架',
    metadata: {
      language: 'TypeScript',
    },
  });

  const personNode = store.createNode({
    kind: 'Person',
    qualifiedName: 'open-taiji:contributors',
    name: 'Contributors',
    content: 'OpenTaiji项目贡献者',
  });

  // 创建边
  store.upsertEdge({
    sourceId: conceptNode.id,
    targetId: projectNode.id,
    kind: 'DEPENDS_ON',
    confidenceTier: 'EXTRACTED',
    metadata: {
      reason: 'GraphMemory是OpenTaiji的核心组件',
    },
  });

  store.upsertEdge({
    sourceId: projectNode.id,
    targetId: personNode.id,
    kind: 'ASSOCIATED_WITH',
  });

  console.log('Created nodes:', [conceptNode, projectNode, personNode]);
  console.log('Graph stats:', store.getStats());

  store.close();
}

// ==================== 图遍历示例 ====================

export async function traversalExample(): Promise<void> {
  const store = createGraphMemoryStore();

  // 创建测试数据
  const nodes = store.createNodes([
    { kind: 'Concept', qualifiedName: 'A', name: 'A' },
    { kind: 'Concept', qualifiedName: 'B', name: 'B' },
    { kind: 'Concept', qualifiedName: 'C', name: 'C' },
    { kind: 'Concept', qualifiedName: 'D', name: 'D' },
    { kind: 'Concept', qualifiedName: 'E', name: 'E' },
  ]);

  // 创建边: A -> B -> C -> D, A -> E
  store.createEdges([
    { sourceId: nodes[0].id, targetId: nodes[1].id, kind: 'RELATED_TO' },
    { sourceId: nodes[1].id, targetId: nodes[2].id, kind: 'RELATED_TO' },
    { sourceId: nodes[2].id, targetId: nodes[3].id, kind: 'RELATED_TO' },
    { sourceId: nodes[0].id, targetId: nodes[4].id, kind: 'RELATED_TO' },
  ]);

  // BFS遍历
  const bfsResult = store.bfs(nodes[0].id, { maxDepth: 2 });
  console.log('BFS result:', bfsResult);

  // 最短路径
  const path = store.shortestPath(nodes[0].id, nodes[3].id);
  console.log('Shortest path:', path);

  // 影响力半径
  const impact = store.getImpactRadius([nodes[0].id], 2);
  console.log('Impact radius:', impact);

  // 获取邻居
  const neighbors = store.getNeighbors(nodes[0].id);
  console.log('Neighbors:', neighbors);

  store.close();
}

// ==================== 搜索示例 ====================

export async function searchExample(): Promise<void> {
  const store = createGraphMemoryStore();

  // 创建包含内容的节点
  store.createNodes([
    { kind: 'Function', qualifiedName: 'file1:processData', name: 'processData', content: '处理数据的主函数' },
    { kind: 'Function', qualifiedName: 'file1:validateInput', name: 'validateInput', content: '验证输入参数' },
    { kind: 'Class', qualifiedName: 'file2:DataProcessor', name: 'DataProcessor', content: '数据处理器类' },
    { kind: 'Function', qualifiedName: 'file2:processBatch', name: 'processBatch', content: '批量处理数据' },
  ]);

  // 搜索节点
  const results1 = store.searchNodes('process');
  console.log('Search "process":', results1);

  const results2 = store.searchNodes('验证');
  console.log('Search "验证":', results2);

  // 按类型搜索
  const functions = store.getNodesByKind('Function');
  console.log('All functions:', functions);

  store.close();
}

// ==================== 社区发现示例 ====================

export async function communityExample(): Promise<void> {
  const store = createGraphMemoryStore();

  // 创建多个相关节点的社区
  const community1Nodes = store.createNodes([
    { kind: 'Class', qualifiedName: 'AuthService', name: 'AuthService' },
    { kind: 'Function', qualifiedName: 'AuthService:login', name: 'login' },
    { kind: 'Function', qualifiedName: 'AuthService:logout', name: 'logout' },
    { kind: 'Function', qualifiedName: 'AuthService:validate', name: 'validate' },
  ]);

  const community2Nodes = store.createNodes([
    { kind: 'Class', qualifiedName: 'UserService', name: 'UserService' },
    { kind: 'Function', qualifiedName: 'UserService:getProfile', name: 'getProfile' },
    { kind: 'Function', qualifiedName: 'UserService:updateProfile', name: 'updateProfile' },
  ]);

  // 创建社区内部边
  for (let i = 1; i < community1Nodes.length; i++) {
    store.upsertEdge({
      sourceId: community1Nodes[0].id,
      targetId: community1Nodes[i].id,
      kind: 'CONTAINS',
    });
  }

  for (let i = 1; i < community2Nodes.length; i++) {
    store.upsertEdge({
      sourceId: community2Nodes[0].id,
      targetId: community2Nodes[i].id,
      kind: 'CONTAINS',
    });
  }

  // 跨社区边较少
  store.upsertEdge({
    sourceId: community1Nodes[1].id,
    targetId: community2Nodes[1].id,
    kind: 'CALLS',
  });

  // 检测社区
  const communities = store.detectCommunities();
  console.log('Detected communities:', communities);

  // 获取节点所在社区
  const nodeCommunity = store.getNodeCommunity(community1Nodes[0].id);
  console.log('AuthService community:', nodeCommunity);

  // 获取社区成员
  if (communities.length > 0) {
    const members = store.getCommunityMembers(communities[0].id);
    console.log('Community members:', members);
  }

  store.close();
}

// ==================== 批量操作示例 ====================

export async function batchOperationExample(): Promise<void> {
  const store = createGraphMemoryStore();

  // 批量存储文件数据
  const filePath = 'src/services/auth.ts';
  const nodes: CreateNodeInput[] = [
    { kind: 'File', qualifiedName: filePath, name: 'auth.ts' },
    { kind: 'Function', qualifiedName: `${filePath}:login`, name: 'login', metadata: { lineStart: 10, lineEnd: 50 } },
    { kind: 'Function', qualifiedName: `${filePath}:logout`, name: 'logout', metadata: { lineStart: 55, lineEnd: 80 } },
  ];

  const fileNode = nodes[0];
  const edges: CreateEdgeInput[] = [
    { sourceId: fileNode.id!, targetId: nodes[1].id!, kind: 'CONTAINS' },
    { sourceId: fileNode.id!, targetId: nodes[2].id!, kind: 'CONTAINS' },
  ];

  // 原子性存储
  store.storeFileData(filePath, nodes, edges);
  console.log('File data stored successfully');

  // 批量更新
  store.createNodes([
    { kind: 'Function', qualifiedName: `${filePath}:register`, name: 'register' },
    { kind: 'Function', qualifiedName: `${filePath}:resetPassword`, name: 'resetPassword' },
  ]);

  console.log('Stats after batch:', store.getStats());

  store.close();
}

// ==================== 调用链分析示例 ====================

export async function callChainExample(): Promise<void> {
  const store = createGraphMemoryStore();

  // 创建调用链: main -> process -> validate -> format -> save
  const nodes = store.createNodes([
    { kind: 'Function', qualifiedName: 'main', name: 'main' },
    { kind: 'Function', qualifiedName: 'process', name: 'process' },
    { kind: 'Function', qualifiedName: 'validate', name: 'validate' },
    { kind: 'Function', qualifiedName: 'format', name: 'format' },
    { kind: 'Function', qualifiedName: 'save', name: 'save' },
  ]);

  store.createEdges([
    { sourceId: nodes[0].id, targetId: nodes[1].id, kind: 'CALLS' },
    { sourceId: nodes[1].id, targetId: nodes[2].id, kind: 'CALLS' },
    { sourceId: nodes[2].id, targetId: nodes[3].id, kind: 'CALLS' },
    { sourceId: nodes[3].id, targetId: nodes[4].id, kind: 'CALLS' },
  ]);

  // 获取调用链
  const callChain = store.getCallChain(nodes[0].id);
  console.log('Call chain from main:', callChain);

  // 获取调用者
  const callers = store.getCallers(nodes[2].id);
  console.log('Who calls validate:', callers);

  // 最短路径
  const path = store.shortestPath(nodes[0].id, nodes[4].id);
  console.log('Path from main to save:', path);

  store.close();
}

// ==================== 运行所有示例 ====================

async function runExamples(): Promise<void> {
  console.log('=== Basic Usage ===');
  await basicUsageExample();

  console.log('\n=== Traversal ===');
  await traversalExample();

  console.log('\n=== Search ===');
  await searchExample();

  console.log('\n=== Community Detection ===');
  await communityExample();

  console.log('\n=== Batch Operations ===');
  await batchOperationExample();

  console.log('\n=== Call Chain Analysis ===');
  await callChainExample();

  console.log('\n=== All examples completed ===');
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples().catch(console.error);
}
