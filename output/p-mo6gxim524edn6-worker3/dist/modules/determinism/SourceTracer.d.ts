import { IDeterminismSystem, DeterminismResult, DeterminismOptions, SourceReference, SourceTraceResult } from './interfaces/IDeterminismSystem';
/**
 * 知识索引条目
 */
export interface KnowledgeIndexEntry {
    /**
     * 条目ID
     */
    id: string;
    /**
     * 内容文本
     */
    content: string;
    /**
     * 来源引用
     */
    source: SourceReference;
    /**
     * 关键词（用于检索）
     */
    keywords?: string[];
    /**
     * 相似度匹配阈值，默认0.6
     */
    matchThreshold?: number;
    /**
     * 分词结果缓存（私有，用于性能优化）
     * @internal
     */
    _cachedWords?: Set<string>;
}
/**
 * SourceTracer配置
 */
export interface SourceTracerConfig {
    /**
     * 最小匹配相似度，默认0.6
     */
    minMatchThreshold?: number;
    /**
     * 每个查询最大返回来源数量，默认10
     */
    maxSources?: number;
}
/**
 * 知识溯源索引
 * 将模型输出中的每个结论追溯到其知识来源，支持检测无来源的虚构内容
 */
export declare class SourceTracer implements IDeterminismSystem {
    readonly name: string;
    readonly version: string;
    private index;
    private invertedIndex;
    private minMatchThreshold;
    private maxSources;
    private ready;
    constructor(config?: SourceTracerConfig);
    /**
     * 检查追踪器是否就绪
     */
    isReady(): boolean;
    /**
     * 添加知识条目到索引
     * @param entry 知识条目
     */
    addEntry(entry: KnowledgeIndexEntry): void;
    /**
     * 从索引移除条目
     * @param id 条目ID
     */
    removeEntry(id: string): boolean;
    /**
     * 批量添加知识条目
     * @param entries 知识条目列表
     */
    addEntries(entries: KnowledgeIndexEntry[]): void;
    /**
     * 对内容进行溯源，找到匹配的知识来源
     * @param content 需要溯源的内容
     * @param options 溯源选项
     */
    verify(content: string, options?: Partial<DeterminismOptions>): Promise<DeterminismResult>;
    /**
     * 执行溯源查询
     * @param content 需要溯源的内容
     */
    trace(content: string | null | undefined): SourceTraceResult;
    /**
     * 计算内容覆盖率
     */
    private calculateCoverage;
    /**
     * 计算两段内容的相似度（基于Jaccard）
     */
    private calculateContentSimilarity;
    /**
     * 从内容提取关键词
     */
    private extractKeywords;
    /**
     * 获取索引中的条目总数
     */
    getIndexSize(): number;
    /**
     * 清空索引
     */
    clearIndex(): void;
}
