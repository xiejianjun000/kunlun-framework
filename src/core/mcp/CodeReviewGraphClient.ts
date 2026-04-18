/**
 * Code Review Graph Client
 * 基于 MCP 协议封装 code-review-graph 的 22 个工具
 * 
 * 工具分类：
 * - 架构与导航: get_architecture_overview, list_communities, get_community, query_graph, list_flows, get_flow
 * - 搜索与发现: semantic_search_nodes, get_impact_radius, find_large_functions, find_complex_modules
 * - 文档生成: generate_wiki, get_wiki_page, generate_module_documentation
 * - 重构支持: refactor, apply_refactor, preview_refactor
 * - 代码分析: analyze_patterns, get_code_metrics, find_related_tests
 * - 知识管理: add_knowledge, query_knowledge, get_knowledge_gaps
 * - 上下文: get_minimal_context, get_detailed_context, get_file_context
 */

import { MCPClient } from './MCPClient';
import {
  MCPClientConfig,
  Community,
  Flow,
  NodeInfo,
  SearchResult,
  ImpactRadius,
  WikiPage,
  RefactorSuggestion,
  GraphStats,
} from './types';

export interface CodeReviewGraphConfig extends MCPClientConfig {
  /** 代码库根目录 */
  repoPath: string;
  /** 语言过滤器 (可选) */
  languages?: string[];
}

export interface ArchitectureOverview {
  communities: Community[];
  entry_points: string[];
  dependency_summary: {
    most_connected: NodeInfo[];
    isolated_modules: string[];
  };
}

export interface PatternAnalysis {
  patterns: Array<{
    type: string;
    locations: NodeInfo[];
    description: string;
  }>;
  statistics: Record<string, number>;
}

export interface CodeMetrics {
  complexity: number;
  coupling: number;
  cohesion: number;
  maintainability_index: number;
  lines_of_code: number;
  cyclomatic_complexity: number;
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  category: string;
  tags: string[];
  confidence: number;
}

export interface KnowledgeGap {
  area: string;
  description: string;
  related_nodes: NodeInfo[];
  priority: 'high' | 'medium' | 'low';
}

export class CodeReviewGraphClient {
  private client: MCPClient;
  private config: CodeReviewGraphConfig;
  private toolsCache: Map<string, any> | null = null;

  constructor(config: CodeReviewGraphConfig) {
    this.config = config;
    this.client = new MCPClient({
      serverCommand: config.serverCommand,
      serverArgs: config.serverArgs,
      cwd: config.cwd,
      env: config.env,
    });

    // 转发事件
    this.client.on('connected', () => this.emit('connected'));
    this.client.on('disconnected', (info) => this.emit('disconnected', info));
    this.client.on('error', (err) => this.emit('error', err));
  }

  private emit(event: string, ...args: any[]): void {
    // 事件转发代理
  }

  /**
   * 连接到 MCP Server
   */
  async connect(): Promise<void> {
    await this.client.connect();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.client.disconnect();
  }

  /**
   * 重建知识图谱
   */
  async buildGraph(fullRebuild: boolean = false): Promise<{ success: boolean; stats?: GraphStats }> {
    return this.client.call('build', {
      repo_path: this.config.repoPath,
      full_rebuild: fullRebuild,
      languages: this.config.languages,
    });
  }

  /**
   * 更新知识图谱 (增量)
   */
  async updateGraph(): Promise<{ success: boolean; stats?: GraphStats }> {
    return this.client.call('update_graph', {
      repo_path: this.config.repoPath,
    });
  }

  /**
   * 获取图谱统计信息
   */
  async getGraphStats(): Promise<GraphStats> {
    return this.client.call('stats', {
      repo_path: this.config.repoPath,
    });
  }

  // ==================== 架构与导航 ====================

  /**
   * 获取架构概览
   * 基于社区检测自动生成架构图
   */
  async getArchitectureOverview(): Promise<ArchitectureOverview> {
    return this.client.call('get_architecture_overview', {
      repo_path: this.config.repoPath,
    });
  }

  /**
   * 列出所有社区/模块
   */
  async listCommunities(): Promise<Community[]> {
    return this.client.call('list_communities', {
      repo_path: this.config.repoPath,
    });
  }

  /**
   * 获取指定社区详情
   */
  async getCommunity(communityId: string): Promise<Community & { nodes: NodeInfo[] }> {
    return this.client.call('get_community', {
      repo_path: this.config.repoPath,
      community_id: communityId,
    });
  }

  /**
   * 查询图谱关系
   * 支持: callers_of, callees_of, imports_of, importers_of, children_of, tests_for, inheritors_of, file_summary
   */
  async queryGraph(
    pattern: 'callers_of' | 'callees_of' | 'imports_of' | 'importers_of' | 
             'children_of' | 'tests_for' | 'inheritors_of' | 'file_summary',
    nodeName: string,
    maxResults: number = 50
  ): Promise<{ nodes: NodeInfo[]; edges: any[] }> {
    return this.client.call('query_graph', {
      repo_path: this.config.repoPath,
      pattern,
      node_name: nodeName,
      max_results: maxResults,
    });
  }

  /**
   * 列出执行路径
   */
  async listFlows(entryPoint?: string): Promise<Flow[]> {
    return this.client.call('list_flows', {
      repo_path: this.config.repoPath,
      entry_point: entryPoint,
    });
  }

  /**
   * 获取指定执行路径详情
   */
  async getFlow(flowId: string): Promise<Flow & { path: string[]; call_graph: any }> {
    return this.client.call('get_flow', {
      repo_path: this.config.repoPath,
      flow_id: flowId,
    });
  }

  // ==================== 搜索与发现 ====================

  /**
   * 语义搜索节点
   * 支持按名称或语义相似度搜索代码实体
   */
  async semanticSearchNodes(
    query: string,
    maxResults: number = 20,
    searchType: 'name' | 'semantic' | 'hybrid' = 'hybrid'
  ): Promise<SearchResult> {
    return this.client.call('semantic_search_nodes', {
      repo_path: this.config.repoPath,
      query,
      max_results: maxResults,
      search_type: searchType,
    });
  }

  /**
   * 获取影响半径
   * 分析"如果修改这个函数，会影响哪些代码"
   */
  async getImpactRadius(
    nodeName: string,
    maxDepth: number = 3
  ): Promise<ImpactRadius> {
    return this.client.call('get_impact_radius', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
      max_depth: maxDepth,
    });
  }

  /**
   * 查找大函数/复杂模块
   */
  async findLargeFunctions(
    threshold: number = 100,
    metric: 'lines' | 'cyclomatic' | 'cognitive' = 'lines'
  ): Promise<NodeInfo[]> {
    return this.client.call('find_large_functions', {
      repo_path: this.config.repoPath,
      threshold,
      metric,
    });
  }

  /**
   * 查找复杂模块
   */
  async findComplexModules(threshold: number = 10): Promise<Community[]> {
    return this.client.call('find_complex_modules', {
      repo_path: this.config.repoPath,
      threshold,
    });
  }

  // ==================== 文档生成 ====================

  /**
   * 生成文档
   * 从图谱结构自动生成 Markdown 文档
   */
  async generateWiki(): Promise<{ pages: WikiPage[]; summary: string }> {
    return this.client.call('generate_wiki', {
      repo_path: this.config.repoPath,
    });
  }

  /**
   * 获取指定模块的文档
   */
  async getWikiPage(modulePath: string): Promise<WikiPage> {
    return this.client.call('get_wiki_page', {
      repo_path: this.config.repoPath,
      module_path: modulePath,
    });
  }

  /**
   * 生成模块文档
   */
  async generateModuleDocumentation(
    modulePath: string,
    includeExamples: boolean = true
  ): Promise<string> {
    return this.client.call('generate_module_documentation', {
      repo_path: this.config.repoPath,
      module_path: modulePath,
      include_examples: includeExamples,
    });
  }

  // ==================== 重构支持 ====================

  /**
   * 重构预览
   * 预览重命名/提取/内联等重构的影响
   */
  async refactor(
    nodeName: string,
    refactorType: 'rename' | 'extract' | 'inline' | 'move',
    newName?: string
  ): Promise<RefactorSuggestion[]> {
    return this.client.call('refactor', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
      refactor_type: refactorType,
      new_name: newName,
    });
  }

  /**
   * 执行重构
   */
  async applyRefactor(
    nodeName: string,
    refactorType: 'rename' | 'extract' | 'inline' | 'move',
    newName?: string,
    dryRun: boolean = true
  ): Promise<{ success: boolean; changes: string[] }> {
    return this.client.call('apply_refactor', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
      refactor_type: refactorType,
      new_name: newName,
      dry_run: dryRun,
    });
  }

  /**
   * 预览重构效果
   */
  async previewRefactor(
    nodeName: string,
    refactorType: 'rename' | 'extract' | 'inline' | 'move',
    newName?: string
  ): Promise<{ before: string; after: string; affected_files: string[] }> {
    return this.client.call('preview_refactor', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
      refactor_type: refactorType,
      new_name: newName,
    });
  }

  // ==================== 代码分析 ====================

  /**
   * 分析代码模式
   */
  async analyzePatterns(
    patternTypes?: string[]
  ): Promise<PatternAnalysis> {
    return this.client.call('analyze_patterns', {
      repo_path: this.config.repoPath,
      pattern_types: patternTypes,
    });
  }

  /**
   * 获取代码度量
   */
  async getCodeMetrics(
    nodeName: string
  ): Promise<CodeMetrics> {
    return this.client.call('get_code_metrics', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
    });
  }

  /**
   * 查找相关测试
   */
  async findRelatedTests(nodeName: string): Promise<NodeInfo[]> {
    return this.client.call('find_related_tests', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
    });
  }

  // ==================== 知识管理 ====================

  /**
   * 添加知识条目
   */
  async addKnowledge(
    content: string,
    category: string,
    tags: string[]
  ): Promise<KnowledgeEntry> {
    return this.client.call('add_knowledge', {
      repo_path: this.config.repoPath,
      content,
      category,
      tags,
    });
  }

  /**
   * 查询知识库
   */
  async queryKnowledge(
    query: string,
    category?: string,
    maxResults: number = 10
  ): Promise<KnowledgeEntry[]> {
    return this.client.call('query_knowledge', {
      repo_path: this.config.repoPath,
      query,
      category,
      max_results: maxResults,
    });
  }

  /**
   * 获取知识空白
   * 识别代码库中缺乏文档或注释的区域
   */
  async getKnowledgeGaps(): Promise<KnowledgeGap[]> {
    return this.client.call('get_knowledge_gaps', {
      repo_path: this.config.repoPath,
    });
  }

  // ==================== 上下文获取 ====================

  /**
   * 获取最小上下文
   * 为 LLM 提供进行代码审查所需的最小上下文
   */
  async getMinimalContext(task: string): Promise<{
    summary: string;
    key_files: string[];
    relevant_nodes: NodeInfo[];
  }> {
    return this.client.call('get_minimal_context', {
      repo_path: this.config.repoPath,
      task,
    });
  }

  /**
   * 获取详细上下文
   */
  async getDetailedContext(
    nodeName: string,
    includeRelated: boolean = true
  ): Promise<{
    node: NodeInfo;
    callers: NodeInfo[];
    callees: NodeInfo[];
    source_code: string;
  }> {
    return this.client.call('get_detailed_context', {
      repo_path: this.config.repoPath,
      node_name: nodeName,
      include_related: includeRelated,
    });
  }

  /**
   * 获取文件上下文
   */
  async getFileContext(
    filePath: string,
    includeImports: boolean = true,
    includeExports: boolean = true
  ): Promise<{
    file: NodeInfo;
    imports: NodeInfo[];
    exports: NodeInfo[];
    definitions: NodeInfo[];
  }> {
    return this.client.call('get_file_context', {
      repo_path: this.config.repoPath,
      file_path: filePath,
      include_imports: includeImports,
      include_exports: includeExports,
    });
  }

  // ==================== Hub 和 Bridge 节点分析 ====================

  /**
   * 查找 Hub 节点
   * Hub 节点是高度连接的节点，通常是核心模块或基础设施
   */
  async findHubNodes(topN: number = 10): Promise<NodeInfo[]> {
    return this.client.call('find_hub_nodes', {
      repo_path: this.config.repoPath,
      top_n: topN,
    });
  }

  /**
   * 查找 Bridge 节点
   * Bridge 节点连接不同模块，它们的改变可能影响多个社区
   */
  async findBridgeNodes(topN: number = 10): Promise<NodeInfo[]> {
    return this.client.call('find_bridge_nodes', {
      repo_path: this.config.repoPath,
      top_n: topN,
    });
  }

  // ==================== 便捷封装方法 ====================

  /**
   * 分析代码变更的影响
   */
  async analyzeChangeImpact(
    changedFile: string
  ): Promise<{
    directly_affected: string[];
    indirectly_affected: string[];
    risk_level: 'low' | 'medium' | 'high';
    testing_suggestions: string[];
  }> {
    const impact = await this.getImpactRadius(changedFile);
    const relatedTests = await this.findRelatedTests(changedFile);
    
    const riskLevel = impact.affected_nodes.length > 50 ? 'high' : 
                      impact.affected_nodes.length > 20 ? 'medium' : 'low';
    
    return {
      directly_affected: impact.changed_files,
      indirectly_affected: impact.affected_nodes.map(n => n.name),
      risk_level: riskLevel,
      testing_suggestions: relatedTests.map(t => t.file_path),
    };
  }

  /**
   * 分析代码库的架构健康度
   */
  async analyzeArchitectureHealth(): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const overview = await this.getArchitectureOverview();
    const largeFunctions = await this.findLargeFunctions(80);
    const complexModules = await this.findComplexModules(15);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (overview.communities.length > 50) {
      issues.push('模块划分过于细碎，可能存在过度设计');
      recommendations.push('考虑合并相关社区，减少模块间依赖');
    }
    
    if (largeFunctions.length > 20) {
      issues.push(`发现 ${largeFunctions.length} 个大函数，建议重构`);
      recommendations.push('优先处理复杂度最高的大函数');
    }
    
    if (complexModules.length > 10) {
      issues.push(`发现 ${complexModules.length} 个复杂模块`);
      recommendations.push('复杂模块应考虑拆分或提取公共逻辑');
    }
    
    // 计算健康度分数 (100 - 扣分)
    const score = Math.max(0, 100 - issues.length * 15 - largeFunctions.length * 2);
    
    return { score, issues, recommendations };
  }

  /**
   * 获取客户端状态
   */
  isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * 获取原始 MCP 客户端 (高级用法)
   */
  getRawClient(): MCPClient {
    return this.client;
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    this.client.destroy();
  }
}

export default CodeReviewGraphClient;
