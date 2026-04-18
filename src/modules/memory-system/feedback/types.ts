/**
 * 反馈记忆系统类型定义
 * Feedback Memory System Types
 */

/**
 * 记忆记录
 */
export interface MemoryRecord {
  /** 文件路径 */
  path: string;
  /** 问题 */
  question: string;
  /** 记忆类型 */
  type: string;
  /** 时间戳 */
  timestamp: number;
  /** 关联的图节点 */
  relatedNodes: string[];
  /** 答案内容 */
  answer?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 提取的知识结构
 */
export interface ExtractedKnowledge {
  /** 概念列表 */
  concepts: string[];
  /** 关系列表 */
  relations: KnowledgeRelation[];
  /** 置信度 */
  confidence: number;
  /** 来源路径 */
  source?: string;
  /** 提取时间 */
  extractedAt: number;
}

/**
 * 知识关系
 */
export interface KnowledgeRelation {
  /** 源概念 */
  from: string;
  /** 目标概念 */
  to: string;
  /** 关系类型 */
  type: string;
  /** 置信度 */
  confidence?: number;
}

/**
 * 记忆循环配置
 */
export interface MemoryLoopConfig {
  /** 记忆目录路径 */
  memoryDir: string;
  /** 文件扩展名 */
  fileExtension: string;
  /** 是否启用自动图谱注入 */
  autoEnrichGraph: boolean;
  /** 知识提取置信度阈值 */
  confidenceThreshold: number;
  /** 图谱注入器 */
  graphInjector?: GraphInjector;
}

/**
 * 图谱注入器接口
 */
export interface GraphInjector {
  /** 注入节点 */
  injectNodes(nodes: string[]): Promise<void>;
  /** 注入关系 */
  injectRelations(relations: KnowledgeRelation[]): Promise<void>;
  /** 批量注入 */
  batchInject(knowledge: ExtractedKnowledge): Promise<void>;
}

/**
 * 文件监听器配置
 */
export interface FileWatcherConfig {
  /** 监听目录 */
  watchDir: string;
  /** 监听事件类型 */
  events: FileWatcherEvent[];
  /** 是否递归监听子目录 */
  recursive: boolean;
  /** 防抖延迟(ms) */
  debounceMs: number;
}

/**
 * 文件监听事件类型
 */
export enum FileWatcherEvent {
  ADD = 'add',
  CHANGE = 'change',
  UNLINK = 'unlink',
}

/**
 * 文件变化事件
 */
export interface FileChangeEvent {
  /** 事件类型 */
  event: FileWatcherEvent;
  /** 文件路径 */
  path: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 记忆循环统计
 */
export interface MemoryLoopStats {
  /** 总记录数 */
  totalRecords: number;
  /** 本次会话记录数 */
  sessionRecords: number;
  /** 图谱更新次数 */
  graphUpdates: number;
  /** 最后更新时间 */
  lastUpdateTime: number;
}

/**
 * Markdown 格式选项
 */
export interface MarkdownFormatOptions {
  /** 是否包含时间戳 */
  includeTimestamp: boolean;
  /** 是否包含元数据 */
  includeMetadata: boolean;
  /** 是否包含关联节点 */
  includeRelatedNodes: boolean;
  /** 标签前缀 */
  tagPrefix: string;
}
