/**
 * 记忆关联分析器
 * Memory Linker - 知识图谱
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IMemory,
  IMemoryLink,
  MemoryRelationType,
} from '../interfaces';
import { MemoryStore } from '../storage/MemoryStore';

export interface LinkDiscoveryConfig {
  /** 相似度阈值 */
  similarityThreshold: number;
  /** 最大关联数 */
  maxLinksPerMemory: number;
  /** 是否自动创建关联 */
  autoLinkEnabled: boolean;
  /** 关联类型优先级 */
  relationTypePriority: MemoryRelationType[];
}

const DEFAULT_LINK_CONFIG: LinkDiscoveryConfig = {
  similarityThreshold: 0.6,
  maxLinksPerMemory: 10,
  autoLinkEnabled: true,
  relationTypePriority: [
    MemoryRelationType.CAUSAL,
    MemoryRelationType.TOPIC,
    MemoryRelationType.SEMANTIC,
    MemoryRelationType.TEMPORAL,
    MemoryRelationType.REFERENCE,
  ],
};

/**
 * 记忆关联分析器
 * 
 * 提供记忆间的关联分析功能，支持知识图谱构建
 * 
 * @example
 * ```typescript
 * const linker = new MemoryLinker(store);
 * 
 * await linker.discoverAndLink(memory, 'user1');
 * const links = await linker.getLinks(memory.id, 'user1');
 * ```
 */
export class MemoryLinker {
  private store: MemoryStore;
  private config: LinkDiscoveryConfig;

  // 缓存
  private linkCache: Map<string, IMemoryLink[]> = new Map();
  private cacheValidUntil: Date | null = null;

  /**
   * 构造函数
   * @param store 记忆存储
   * @param config 关联配置
   */
  constructor(store: MemoryStore, config: Partial<LinkDiscoveryConfig> = {}) {
    this.store = store;
    this.config = { ...DEFAULT_LINK_CONFIG, ...config };
  }

  /**
   * 发现并创建关联
   * @param memory 记忆对象
   * @param userId 用户ID
   * @returns 创建的关联列表
   */
  async discoverAndLink(memory: IMemory, userId: string): Promise<IMemoryLink[]> {
    if (!this.config.autoLinkEnabled) {
      return [];
    }

    // 获取相关记忆
    const candidateMemories = await this.store.getByUserId(userId, {
      limit: 100,
    });

    const newLinks: IMemoryLink[] = [];

    for (const candidate of candidateMemories) {
      // 跳过自己
      if (candidate.id === memory.id) {
        continue;
      }

      // 检查是否已有关联
      const existingLinks = await this.store.getLinks(memory.id, userId);
      if (existingLinks.some(link => 
        link.targetMemoryId === candidate.id || link.sourceMemoryId === candidate.id
      )) {
        continue;
      }

      // 分析关联
      const relation = await this.analyzeRelation(memory, candidate);

      if (relation.strength >= this.config.similarityThreshold) {
        // 创建关联
        const link = await this.createLink(
          memory.id,
          candidate.id,
          relation.type,
          relation.strength,
          userId,
          { confidence: relation.confidence }
        );
        newLinks.push(link);

        // 检查最大关联数
        if (newLinks.length >= this.config.maxLinksPerMemory) {
          break;
        }
      }
    }

    // 清除缓存
    this.clearCache();

    return newLinks;
  }

  /**
   * 创建关联
   */
  async createLink(
    sourceId: string,
    targetId: string,
    relationType: MemoryRelationType,
    strength: number,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<IMemoryLink> {
    const link: IMemoryLink = {
      id: uuidv4(),
      sourceMemoryId: sourceId,
      targetMemoryId: targetId,
      relationType,
      strength,
      createdAt: new Date(),
      metadata,
    };

    await this.store.saveLink(link);

    return link;
  }

  /**
   * 获取关联
   */
  async getLinks(memoryId: string, userId: string): Promise<IMemoryLink[]> {
    // 检查缓存
    if (this.isCacheValid()) {
      const cached = this.linkCache.get(memoryId);
      if (cached) {
        return cached;
      }
    }

    const links = await this.store.getLinks(memoryId, userId);

    // 更新缓存
    this.linkCache.set(memoryId, links);
    this.cacheValidUntil = new Date(Date.now() + 5 * 60 * 1000); // 5分钟

    return links;
  }

  /**
   * 删除关联
   */
  async removeLink(linkId: string, userId: string): Promise<void> {
    // 从缓存中移除
    for (const [memoryId, links] of this.linkCache.entries()) {
      const index = links.findIndex(link => link.id === linkId);
      if (index !== -1) {
        links.splice(index, 1);
        break;
      }
    }

    // 注意：这里需要添加store.deleteLink方法
  }

  /**
   * 删除记忆的所有关联
   */
  async removeAllLinks(memoryId: string, userId: string): Promise<void> {
    await this.store.deleteLinks(memoryId, userId);
    this.linkCache.delete(memoryId);
  }

  /**
   * 获取总关联数
   */
  async getTotalLinkCount(userId?: string): Promise<number> {
    return await this.store.getLinkCount(userId);
  }

  /**
   * 分析两个记忆之间的关联
   */
  async analyzeRelation(
    source: IMemory,
    target: IMemory
  ): Promise<{
    type: MemoryRelationType;
    strength: number;
    confidence: number;
  }> {
    // 计算各类型的关联强度
    const relations: Array<{
      type: MemoryRelationType;
      strength: number;
      confidence: number;
    }> = [];

    // 1. 语义相似度
    const semanticStrength = await this.calculateSemanticSimilarity(source, target);
    relations.push({
      type: MemoryRelationType.SEMANTIC,
      strength: semanticStrength,
      confidence: 0.8,
    });

    // 2. 时间关系
    const temporalRelation = this.analyzeTemporalRelation(source, target);
    relations.push(temporalRelation);

    // 3. 主题关系
    const topicRelation = this.analyzeTopicRelation(source, target);
    relations.push(topicRelation);

    // 4. 关键词重叠
    const keywordRelation = this.analyzeKeywordRelation(source, target);
    relations.push(keywordRelation);

    // 5. 因果关系（简化版本）
    const causalRelation = this.analyzeCausalRelation(source, target);
    relations.push(causalRelation);

    // 选择最强关联
    relations.sort((a, b) => {
      // 综合考虑强度和置信度
      const scoreA = a.strength * a.confidence;
      const scoreB = b.strength * b.confidence;
      return scoreB - scoreA;
    });

    const bestRelation = relations[0];

    // 合并相似类型的关联
    const mergedStrength = this.mergeRelationStrengths(relations);

    return {
      type: bestRelation.type,
      strength: Math.min(1, mergedStrength),
      confidence: bestRelation.confidence,
    };
  }

  /**
   * 计算语义相似度
   */
  private async calculateSemanticSimilarity(source: IMemory, target: IMemory): Promise<number> {
    // 如果有嵌入向量，使用余弦相似度
    if (source.embedding && target.embedding) {
      return this.cosineSimilarity(source.embedding, target.embedding);
    }

    // 降级方案：基于内容的词重叠
    return this.jaccardSimilarity(
      source.content.toLowerCase(),
      target.content.toLowerCase()
    );
  }

  /**
   * 分析时间关系
   */
  private analyzeTemporalRelation(
    source: IMemory,
    target: IMemory
  ): { type: MemoryRelationType; strength: number; confidence: number } {
    const timeDiff = Math.abs(
      source.createdAt.getTime() - target.createdAt.getTime()
    );
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    let strength = 0;
    let confidence = 0.5;

    // 1小时内
    if (hoursDiff <= 1) {
      strength = 0.9;
      confidence = 0.9;
    }
    // 24小时内
    else if (hoursDiff <= 24) {
      strength = 0.6;
      confidence = 0.7;
    }
    // 一周内
    else if (hoursDiff <= 168) {
      strength = 0.3;
      confidence = 0.5;
    }
    // 一个月内
    else if (hoursDiff <= 720) {
      strength = 0.1;
      confidence = 0.3;
    }

    return {
      type: MemoryRelationType.TEMPORAL,
      strength,
      confidence,
    };
  }

  /**
   * 分析主题关系
   */
  private analyzeTopicRelation(
    source: IMemory,
    target: IMemory
  ): { type: MemoryRelationType; strength: number; confidence: number } {
    const sourceTopic = source.metadata?.topic;
    const targetTopic = target.metadata?.topic;

    if (sourceTopic && targetTopic && sourceTopic === targetTopic) {
      return {
        type: MemoryRelationType.TOPIC,
        strength: 0.85,
        confidence: 0.9,
      };
    }

    // 检查标签重叠
    const sourceTags = source.tags ?? [];
    const targetTags = target.tags ?? [];
    const commonTags = sourceTags.filter(tag => targetTags.includes(tag));

    if (commonTags.length > 0) {
      const overlapRatio = commonTags.length / Math.max(sourceTags.length, targetTags.length);
      return {
        type: MemoryRelationType.TOPIC,
        strength: 0.5 + overlapRatio * 0.3,
        confidence: 0.7,
      };
    }

    return {
      type: MemoryRelationType.TOPIC,
      strength: 0,
      confidence: 0.3,
    };
  }

  /**
   * 分析关键词关系
   */
  private analyzeKeywordRelation(
    source: IMemory,
    target: IMemory
  ): { type: MemoryRelationType; strength: number; confidence: number } {
    const sourceKeywords = source.metadata?.keywords ?? [];
    const targetKeywords = target.metadata?.keywords ?? [];

    if (sourceKeywords.length === 0 || targetKeywords.length === 0) {
      return {
        type: MemoryRelationType.SEMANTIC,
        strength: 0,
        confidence: 0.2,
      };
    }

    const common = sourceKeywords.filter(k => targetKeywords.includes(k));
    const jaccard = common.length / (sourceKeywords.length + targetKeywords.length - common.length);

    return {
      type: MemoryRelationType.SEMANTIC,
      strength: jaccard * 0.8,
      confidence: 0.6,
    };
  }

  /**
   * 分析因果关系（简化版本）
   */
  private analyzeCausalRelation(
    source: IMemory,
    target: IMemory
  ): { type: MemoryRelationType; strength: number; confidence: number } {
    // 简化版本：检查是否包含因果关键词
    const causalKeywords = ['所以', '因此', '因为', '导致', '结果', '所以', 
                           'therefore', 'because', 'thus', 'hence', 'result'];

    const sourceLower = source.content.toLowerCase();
    const targetLower = target.content.toLowerCase();

    let sourceHasCausal = false;
    let targetHasCausal = false;

    for (const keyword of causalKeywords) {
      if (sourceLower.includes(keyword)) sourceHasCausal = true;
      if (targetLower.includes(keyword)) targetHasCausal = true;
    }

    if (sourceHasCausal && targetHasCausal) {
      return {
        type: MemoryRelationType.CAUSAL,
        strength: 0.7,
        confidence: 0.5,
      };
    }

    return {
      type: MemoryRelationType.CAUSAL,
      strength: 0,
      confidence: 0.2,
    };
  }

  /**
   * 合并关联强度
   */
  private mergeRelationStrengths(
    relations: Array<{ type: MemoryRelationType; strength: number; confidence: number }>
  ): number {
    let maxStrength = 0;
    let weightedSum = 0;
    let totalConfidence = 0;

    for (const relation of relations) {
      maxStrength = Math.max(maxStrength, relation.strength);
      weightedSum += relation.strength * relation.confidence;
      totalConfidence += relation.confidence;
    }

    // 综合最大强度和加权平均
    return maxStrength * 0.6 + (totalConfidence > 0 ? weightedSum / totalConfidence : 0) * 0.4;
  }

  // ============== 辅助方法 ==============

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
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
   * 计算Jaccard相似度
   */
  private jaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    if (!this.cacheValidUntil) {
      return false;
    }
    return new Date() < this.cacheValidUntil;
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.linkCache.clear();
    this.cacheValidUntil = null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LinkDiscoveryConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache();
  }

  /**
   * 获取配置
   */
  getConfig(): LinkDiscoveryConfig {
    return { ...this.config };
  }
}
