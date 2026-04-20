import { IDeterminismSystem, DeterminismResult, DeterminismOptions, SelfConsistencyResult } from './interfaces/IDeterminismSystem';
/**
 * 自一致性检查配置
 */
export interface SelfConsistencyCheckerConfig {
    /**
     * 默认采样次数，默认3
     */
    defaultSamples?: number;
    /**
     * 通过阈值 (0-1)，默认0.7，相似度超过该阈值才算通过
     */
    passThreshold?: number;
    /**
     * 相似度计算方法
     */
    similarityStrategy?: 'jaccard' | 'cosine' | 'levenshtein';
}
/**
 * 多路径自一致性检查器
 * 通过对同一问题多次采样生成多个输出，比较输出之间的一致性来检测幻觉
 */
export declare class SelfConsistencyChecker implements IDeterminismSystem {
    readonly name: string;
    readonly version: string;
    private defaultSamples;
    private passThreshold;
    private similarityStrategy;
    private ready;
    constructor(config?: SelfConsistencyCheckerConfig);
    /**
     * 检查系统是否就绪
     */
    isReady(): boolean;
    /**
     * 对单条内容执行一致性验证（不采样，需要提供多个样本）
     * @param samples 多个采样结果
     * @param options 验证选项
     */
    verify(content: string, options?: Partial<DeterminismOptions>, samples?: string[]): Promise<DeterminismResult>;
    /**
     * 检查多路径输出的一致性
     * @param samples 多个采样输出样本
     */
    checkConsistency(samples: (string | null | undefined)[]): SelfConsistencyResult;
    /**
     * 计算两个文本之间的相似度
     */
    private calculateSimilarity;
    /**
     * Jaccard相似度（基于词集合）
     */
    private jaccardSimilarity;
    /**
     * Levenshtein距离相似度
     */
    private levenshteinSimilarity;
    /**
     * 余弦相似度（基于词频）
     */
    private cosineSimilarity;
    /**
     * 简单分词
     */
    private tokenize;
    /**
     * Levenshtein距离计算
     * Optimized version using 1D array to reduce memory allocation
     * Space complexity: O(min(n,m)) instead of O(n*m)
     */
    private levenshteinDistance;
    /**
     * 获取当前阈值
     */
    getPassThreshold(): number;
    /**
     * 设置通过阈值
     */
    setPassThreshold(threshold: number): void;
    /**
     * 获取默认采样次数
     */
    getDefaultSamples(): number;
}
