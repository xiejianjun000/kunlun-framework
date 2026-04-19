/**
 * 知识缺口检测模块 (基于图谱分析)
 * Knowledge Gap Detection Module (Graph-based Analysis)
 * 
 * @module memory-system/analysis
 * 
 * 与 active/KnowledgeGapDetector (事件驱动) 不同，本模块专注于：
 * - 基于知识图谱结构分析
 * - 检测度失衡、孤立节点、低置信度边、陈旧知识
 * - 为 Dreaming 系统提供"该学什么"的指导
 * 
 * @example
 * ```typescript
 * import { 
 *   GraphBasedGapDetector, 
 *   createGraphBasedGapDetector,
 *   GapType,
 * } from './analysis';
 * 
 * // 创建检测器
 * const detector = createGraphBasedGapDetector({
 *   staleDaysThreshold: 30,
 * });
 * 
 * // 检测缺口
 * const result = detector.detectGaps(graphStore);
 * 
 * // 打印优先行动
 * for (const action of result.priorityActions) {
 *   console.log('-', action);
 * }
 * ```
 */

// 类型导出
export {
  // 缺口类型
  GapType,
  
  // 核心类型
  GraphNode,
  GraphEdge,
  KnowledgeGap,
  GraphStore,
  GapAnalysisResult,
  GapStatistics,
  
  // 配置类型
  GapDetectorConfig,
  GapDetectionContext,
  QuestionTemplate,
  
  // 默认配置
  DEFAULT_GAP_DETECTOR_CONFIG,
  
  // 内存接口类型（用于适配）
} from './types';

// 从 interfaces 重新导出类型
export type { IMemory, IMemoryLink, MemoryRelationType } from '../interfaces';

// 类导出 (重命名以避免与 active/KnowledgeGapDetector 冲突)
export { GraphBasedGapDetector, createGraphBasedGapDetector } from './KnowledgeGapDetector';

// 工具函数导出
export { createGraphStoreFromMemories } from './KnowledgeGapDetector';
