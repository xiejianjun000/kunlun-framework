/**
 * VectorDbAdapter.ts
 * 向量数据库适配器接口
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { IPersonalityProfile, BehaviorData } from '../../core/interfaces/IPersonalitySystem';

/**
 * 向量数据库适配器接口
 * 
 * 定义向量存储和相似度搜索操作的接口规范
 * 具体实现可使用 Qdrant、Milvus、Pinecone 等
 */
export interface VectorDbAdapter {
  /**
   * 初始化适配器
   */
  initialize(): Promise<void>;

  /**
   * 关闭连接
   */
  close(): Promise<void>;

  /**
   * 插入或更新人格画像向量
   * @param profile 人格画像
   */
  upsertPersonalityProfile(profile: IPersonalityProfile): Promise<void>;

  /**
   * 搜索相似人格画像
   * @param profile 人格画像
   * @param limit 返回数量限制
   */
  searchSimilarProfiles(
    profile: IPersonalityProfile,
    limit?: number
  ): Promise<Array<{
    profile: IPersonalityProfile;
    similarity: number;
  }>>;

  /**
   * 删除人格画像向量
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  deletePersonalityProfile(userId: string, tenantId: string): Promise<void>;

  /**
   * 插入行为向量
   * @param behavior 行为数据
   */
  upsertBehavior(behavior: BehaviorData): Promise<void>;

  /**
   * 搜索相似行为
   * @param query 查询内容
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param limit 返回数量限制
   */
  searchSimilarBehaviors(
    query: string,
    userId: string,
    tenantId: string,
    limit?: number
  ): Promise<Array<{
    behavior: BehaviorData;
    similarity: number;
  }>>;

  /**
   * 删除行为向量
   * @param behaviorId 行为ID
   */
  deleteBehavior(behaviorId: string): Promise<void>;

  /**
   * 创建集合
   * @param name 集合名称
   * @param dimension 向量维度
   */
  createCollection(name: string, dimension: number): Promise<void>;

  /**
   * 删除集合
   * @param name 集合名称
   */
  deleteCollection(name: string): Promise<void>;
}

/**
 * 内存向量数据库适配器（用于测试和开发）
 */
export class MemoryVectorDbAdapter implements VectorDbAdapter {
  private profileVectors: Map<string, {
    profile: IPersonalityProfile;
    vector: number[];
  }> = new Map();

  private behaviorVectors: Map<string, {
    behavior: BehaviorData;
    vector: number[];
  }> = new Map();

  async initialize(): Promise<void> {
    console.log('[MemoryVectorDbAdapter] Initialized');
  }

  async close(): Promise<void> {
    this.profileVectors.clear();
    this.behaviorVectors.clear();
  }

  async upsertPersonalityProfile(profile: IPersonalityProfile): Promise<void> {
    const key = `${profile.tenantId}:${profile.userId}`;
    this.profileVectors.set(key, {
      profile,
      vector: this.generateProfileVector(profile)
    });
  }

  async searchSimilarProfiles(
    profile: IPersonalityProfile,
    limit: number = 5
  ): Promise<Array<{ profile: IPersonalityProfile; similarity: number }>> {
    const queryVector = this.generateProfileVector(profile);
    const results: Array<{ profile: IPersonalityProfile; similarity: number }> = [];

    for (const [, data] of this.profileVectors) {
      const similarity = this.cosineSimilarity(queryVector, data.vector);
      results.push({
        profile: data.profile,
        similarity
      });
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async deletePersonalityProfile(userId: string, tenantId: string): Promise<void> {
    const key = `${tenantId}:${userId}`;
    this.profileVectors.delete(key);
  }

  async upsertBehavior(behavior: BehaviorData): Promise<void> {
    this.behaviorVectors.set(behavior.id, {
      behavior,
      vector: this.generateBehaviorVector(behavior)
    });
  }

  async searchSimilarBehaviors(
    query: string,
    userId: string,
    tenantId: string,
    limit: number = 5
  ): Promise<Array<{ behavior: BehaviorData; similarity: number }>> {
    const queryVector = this.generateTextVector(query);
    const results: Array<{ behavior: BehaviorData; similarity: number }> = [];

    for (const [, data] of this.behaviorVectors) {
      if (data.behavior.userId === userId && data.behavior.tenantId === tenantId) {
        const similarity = this.cosineSimilarity(queryVector, data.vector);
        results.push({
          behavior: data.behavior,
          similarity
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async deleteBehavior(behaviorId: string): Promise<void> {
    this.behaviorVectors.delete(behaviorId);
  }

  async createCollection(name: string, dimension: number): Promise<void> {
    console.log(`[MemoryVectorDbAdapter] Created collection: ${name} (dimension: ${dimension})`);
  }

  async deleteCollection(name: string): Promise<void> {
    console.log(`[MemoryVectorDbAdapter] Deleted collection: ${name}`);
  }

  /**
   * 生成画像向量
   */
  private generateProfileVector(profile: IPersonalityProfile): number[] {
    const dims = profile.dimensions.personality.dimensions;
    return [
      (dims.extraversion_introversion?.value as number) || 0.5,
      (dims.openness_conservatism?.value as number) || 0.5,
      (dims.rationality_emotion?.value as number) || 0.5,
      (dims.risk_tolerance?.value as number) || 0.5
    ];
  }

  /**
   * 生成行为向量
   */
  private generateBehaviorVector(behavior: BehaviorData): number[] {
    return this.generateTextVector(behavior.content);
  }

  /**
   * 生成文本向量（简化版）
   */
  private generateTextVector(text: string): number[] {
    // 简化的向量生成，实际应使用嵌入模型
    const dimension = 10;
    const vector = new Array(dimension).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % dimension] += text.charCodeAt(i);
    }
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => magnitude > 0 ? v / magnitude : 0);
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export default MemoryVectorDbAdapter;
