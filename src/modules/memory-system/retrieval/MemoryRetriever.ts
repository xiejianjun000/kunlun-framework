/**
 * 记忆检索器
 * Memory Retriever - 相似度搜索 + 时间衰减
 */

import {
  IMemory,
  IMemorySearchResult,
  IMemoryRetrieveOptions,
  MemoryTier,
} from '../interfaces';

export interface RetrievalConfig {
  /** 默认相似度阈值 */
  defaultSimilarityThreshold: number;
  /** 默认结果数量 */
  defaultLimit: number;
  /** 时间衰减因子 */
  timeDecayFactor: number;
  /** 层级权重 */
  tierWeights: Record<MemoryTier, number>;
  /** 重要性权重 */
  importanceWeight: number;
  /** 访问频率权重 */
  accessFrequencyWeight: number;
  /** 时间距离权重 */
  timeDistanceWeight: number;
}

const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  defaultSimilarityThreshold: 0.5,
  defaultLimit: 10,
  timeDecayFactor: 0.1,
  tierWeights: {
    [MemoryTier.HOT]: 1.0,
    [MemoryTier.WORKING]: 0.9,
    [MemoryTier.WARM]: 0.7,
    [MemoryTier.COLD]: 0.5,
  },
  importanceWeight: 0.3,
  accessFrequencyWeight: 0.2,
  timeDistanceWeight: 0.5,
};

/**
 * 记忆检索器
 * 
 * 提供记忆的智能检索功能，支持语义搜索、关键词搜索和混合搜索
 * 结合时间衰减和重要性评分进行结果排序
 * 
 * @example
 * ```typescript
 * const retriever = new MemoryRetriever(config);
 * 
 * const results = await retriever.retrieve(memories, '如何安装Node.js', {
 *   mode: 'hybrid',
 *   limit: 10,
 *   similarityThreshold: 0.6
 * });
 * ```
 */
export class MemoryRetriever {
  private config: RetrievalConfig;

  /**
   * 构造函数
   * @param config 检索配置
   */
  constructor(config: Partial<RetrievalConfig> = {}) {
    this.config = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  }

  /**
   * 检索记忆
   * @param memories 记忆列表
   * @param query 查询文本
   * @param options 检索选项
   * @returns 检索结果列表
   */
  async retrieve(
    memories: IMemory[],
    query: string,
    options: IMemoryRetrieveOptions = {}
  ): Promise<IMemorySearchResult[]> {
    const mode = options.mode ?? 'hybrid';
    const limit = options.limit ?? this.config.defaultLimit;
    const threshold = options.similarityThreshold ?? this.config.defaultSimilarityThreshold;

    let results: IMemorySearchResult[] = [];

    // 根据模式进行检索
    if (mode === 'semantic') {
      results = this.semanticSearch(memories, query, threshold);
    } else if (mode === 'keyword') {
      results = this.keywordSearch(memories, query, threshold);
    } else {
      // 混合模式
      const semanticResults = this.semanticSearch(memories, query, threshold);
      const keywordResults = this.keywordSearch(memories, query, threshold);
      results = this.hybridMerge(semanticResults, keywordResults);
    }

    // 应用过滤器
    results = this.applyFilters(results, options);

    // 应用时间衰减和综合评分
    results = this.applyReranking(results);

    // 排序并限制数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 语义搜索
   * 使用向量余弦相似度
   */
  private semanticSearch(
    memories: IMemory[],
    query: string,
    threshold: number
  ): IMemorySearchResult[] {
    const results: IMemorySearchResult[] = [];

    for (const memory of memories) {
      if (!memory.embedding || memory.embedding.length === 0) {
        continue;
      }

      // 计算余弦相似度
      const similarity = this.calculateCosineSimilarity(memory.embedding, this.simpleEmbed(query));

      if (similarity >= threshold) {
        results.push({
          memory,
          score: similarity,
          matchedSegments: this.extractMatchedSegments(memory.content, query),
        });
      }
    }

    return results;
  }

  /**
   * 关键词搜索
   * 基于BM25算法的简化版本
   */
  private keywordSearch(
    memories: IMemory[],
    query: string,
    threshold: number
  ): IMemorySearchResult[] {
    const queryWords = this.tokenize(query);
    const results: IMemorySearchResult[] = [];

    // 计算每个查询词的 IDF
    const idfMap = new Map<string, number>();
    for (const word of queryWords) {
      const docCount = this.countDocumentsWithTerm(memories, word);
      idfMap.set(word, Math.log(memories.length / (1 + docCount)));
    }

    for (const memory of memories) {
      const contentWords = this.tokenize(memory.content);
      
      // 计算词频匹配分数
      let matchCount = 0;
      for (const queryWord of queryWords) {
        if (contentWords.includes(queryWord)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        // TF-IDF 简化版本 - 使用平均 IDF
        const tf = matchCount / contentWords.length;
        const avgIdf = Array.from(idfMap.values()).reduce((a, b) => a + b, 0) / idfMap.size;
        const score = tf * avgIdf;

        if (score >= threshold * 0.1) { // 降低阈值因为是简化版本
          results.push({
            memory,
            score: Math.min(1, score * 10), // 归一化
            matchedSegments: this.extractMatchedSegments(memory.content, query),
          });
        }
      }
    }

    return results;
  }

  /**
   * 混合合并
   * 使用RRF (Reciprocal Rank Fusion) 算法
   */
  private hybridMerge(
    semanticResults: IMemorySearchResult[],
    keywordResults: IMemorySearchResult[]
  ): IMemorySearchResult[] {
    const scores: Map<string, number> = new Map();
    const memories: Map<string, IMemory> = new Map();
    const k = 60; // RRF参数

    // 添加语义搜索结果
    for (let i = 0; i < semanticResults.length; i++) {
      const result = semanticResults[i];
      const rrfScore = 1 / (k + i + 1);
      scores.set(result.memory.id, (scores.get(result.memory.id) ?? 0) + rrfScore);
      memories.set(result.memory.id, result.memory);
    }

    // 添加关键词搜索结果
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const rrfScore = 1 / (k + i + 1);
      scores.set(result.memory.id, (scores.get(result.memory.id) ?? 0) + rrfScore);
      memories.set(result.memory.id, result.memory);
    }

    // 构建最终结果
    const mergedResults: IMemorySearchResult[] = [];
    for (const [id, score] of scores.entries()) {
      const memory = memories.get(id)!;
      mergedResults.push({
        memory,
        score,
        matchedSegments: this.extractMatchedSegments(memory.content, ''),
      });
    }

    return mergedResults;
  }

  /**
   * 应用过滤器
   */
  private applyFilters(
    results: IMemorySearchResult[],
    options: IMemoryRetrieveOptions
  ): IMemorySearchResult[] {
    return results.filter(result => {
      const memory = result.memory;

      // 层级过滤
      if (options.tiers && options.tiers.length > 0) {
        if (!options.tiers.includes(memory.tier)) {
          return false;
        }
      }

      // 时间范围过滤
      if (options.timeRange) {
        if (options.timeRange.start && memory.createdAt < options.timeRange.start) {
          return false;
        }
        if (options.timeRange.end && memory.createdAt > options.timeRange.end) {
          return false;
        }
      }

      // 标签过滤
      if (options.tags && options.tags.length > 0) {
        if (!memory.tags || !memory.tags.some(tag => options.tags!.includes(tag))) {
          return false;
        }
      }

      // 归档过滤
      if (!options.includeArchived && memory.isArchived) {
        return false;
      }

      return true;
    });
  }

  /**
   * 应用重新排序
   * 结合时间衰减、层级权重和重要性评分
   */
  private applyReranking(results: IMemorySearchResult[]): IMemorySearchResult[] {
    const now = new Date();

    return results.map(result => {
      const memory = result.memory;
      
      // 计算时间衰减分数
      const hoursSinceCreation = (now.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60);
      const timeDecayScore = Math.exp(-this.config.timeDecayFactor * hoursSinceCreation / 24);

      // 层级权重
      const tierWeight = this.config.tierWeights[memory.tier] ?? 0.5;

      // 重要性权重
      const importanceScore = memory.importanceScore;

      // 访问频率权重
      const accessScore = Math.min(1, memory.accessCount / 100);

      // 综合评分
      const rerankScore = 
        result.score * 0.4 +                    // 原始相似度
        timeDecayScore * this.config.timeDistanceWeight +   // 时间衰减
        tierWeight * 0.1 +                      // 层级权重
        importanceScore * this.config.importanceWeight +   // 重要性
        accessScore * this.config.accessFrequencyWeight;  // 访问频率

      return {
        ...result,
        score: Math.min(1, rerankScore), // 归一化到0-1
      };
    });
  }

  // ============== 辅助方法 ==============

  /**
   * 计算余弦相似度
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 简单嵌入（用于没有向量化时的降级方案）
   */
  private simpleEmbed(text: string): number[] {
    const dimension = 384; // 默认维度
    const words = this.tokenize(text);
    const embedding = new Array(dimension).fill(0);

    for (const word of words) {
      const hash = this.simpleHash(word);
      for (let i = 0; i < Math.min(dimension, 10); i++) {
        embedding[(hash + i) % dimension] += Math.sin(hash * (i + 1));
      }
    }

    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  /**
   * 简单哈希
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2);
  }

  /**
   * 提取匹配片段
   */
  private extractMatchedSegments(content: string, query: string): string[] {
    const segments: string[] = [];
    const queryWords = this.tokenize(query);

    if (queryWords.length === 0) {
      return [content.slice(0, 200)]; // 返回开头部分
    }

    for (const word of queryWords) {
      const index = content.toLowerCase().indexOf(word);
      if (index !== -1) {
        const start = Math.max(0, index - 30);
        const end = Math.min(content.length, index + word.length + 30);
        segments.push(content.slice(start, end));
      }
    }

    return segments.length > 0 ? [...new Set(segments)] : [content.slice(0, 200)];
  }

  /**
   * 统计包含特定词的文档数
   */
  private countDocumentsWithTerm(memories: IMemory[], term: string): number {
    const termLower = term.toLowerCase();
    return memories.filter(m => m.content.toLowerCase().includes(termLower)).length;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RetrievalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): RetrievalConfig {
    return { ...this.config };
  }
}
