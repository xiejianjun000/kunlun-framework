/**
 * MCP Module - OpenTaiji MCP Client 实现
 * 
 * 提供与 MCP Server 的通信能力，支持：
 * - 通用 MCP Client (MCPClient)
 * - code-review-graph 专用客户端 (CodeReviewGraphClient)
 * 
 * @example
 * ```typescript
 * import { MCPClient, CodeReviewGraphClient } from './core/mcp';
 * 
 * // 方式1: 使用通用 MCP Client
 * const client = new MCPClient({
 *   serverCommand: 'python',
 *   serverArgs: ['-m', 'code_review_graph'],
 * });
 * await client.connect();
 * const tools = await client.listTools();
 * const result = await client.call('semantic_search_nodes', { query: 'auth' });
 * 
 * // 方式2: 使用 code-review-graph 专用客户端
 * const crg = new CodeReviewGraphClient({
 *   serverCommand: 'code-review-graph',
 *   repoPath: '/path/to/repo',
 * });
 * await crg.connect();
 * const overview = await crg.getArchitectureOverview();
 * const impact = await crg.getImpactRadius('my_function');
 * ```
 */

// 类型定义
export {
  JSONSchema,
  JSONSchemaProperty,
  MCPTool,
  MCPClientConfig,
  MCPRequest,
  MCPResponse,
  MCPResult,
  MCPContent,
  MCPError,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPCapabilities,
  MCPServerCapabilities,
  MCPClientInfo,
  MCPServerInfo,
  MCPToolsListResult,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPNotification,
  MCPClientState,
  GraphStats,
  NodeInfo,
  EdgeInfo,
  Community,
  Flow,
  SearchResult,
  ImpactRadius,
  WikiPage,
  RefactorSuggestion,
} from './types';

// MCP Client
export { MCPClient } from './MCPClient';

// Code Review Graph Client
export {
  CodeReviewGraphClient,
  CodeReviewGraphConfig,
  ArchitectureOverview,
  PatternAnalysis,
  CodeMetrics,
  KnowledgeEntry,
  KnowledgeGap,
} from './CodeReviewGraphClient';

// 默认导出
export { MCPClient as default } from './MCPClient';
