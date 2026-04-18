/**
 * Qdrant向量数据库适配器
 * Qdrant Vector Database Adapter
 */

import {
  VectorStoreAdapter,
  VectorSearchResult,
  VectorSearchOptions,
  VectorUpsertItem,
  VectorStoreConfig,
} from './VectorStoreAdapter';

export interface QdrantConfig {
  /** Qdrant服务器URL */
  url: string;
  /** API密钥（可选） */
  apiKey?: string;
  /** Collection前缀 */
  collectionPrefix?: string;
  /** 默认向量维度 */
  defaultDimension?: number;
  /** 请求超时（毫秒） */
  timeout?: number;
}

const DEFAULT_CONFIG: Partial<QdrantConfig> = {
  collectionPrefix: 'Taiji_',
  defaultDimension: 1536,
  timeout: 30000,
};

/**
 * Qdrant向量数据库适配器
 * 
 * 实现VectorStoreAdapter接口，提供Qdrant向量数据库操作
 * 
 * @example
 * ```typescript
 * const adapter = new QdrantAdapter({
 *   url: 'http://localhost:6333',
 *   apiKey: 'your-api-key'
 * });
 * 
 * await adapter.initialize();
 * await adapter.createCollection({
 *   collectionName: 'memories',
 *   dimension: 1536
 * });
 * 
 * await adapter.upsert('memories', [{
 *   id: 'memory-1',
 *   vector: [0.1, 0.2, ...],
 *   payload: { content: 'test' }
 * }]);
 * 
 * const results = await adapter.search('memories', [0.1, 0.2, ...]);
 * ```
 */
export class QdrantAdapter implements VectorStoreAdapter {
  private config: QdrantConfig;
  private isInitialized: boolean = false;
  private baseUrl: string;

  /**
   * 构造函数
   * @param config Qdrant配置
   */
  constructor(config: QdrantConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = this.config.url.replace(/\/$/, '');
  }

  // ============== 生命周期 ==============

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 检查连接
      const response = await this.request('GET', '/health');
      if (response.status !== 'ok') {
        throw new Error('Qdrant健康检查失败');
      }

      this.isInitialized = true;
      console.log('[QdrantAdapter] 初始化完成');
    } catch (error) {
      console.error('[QdrantAdapter] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 销毁适配器
   */
  async destroy(): Promise<void> {
    this.isInitialized = false;
    console.log('[QdrantAdapter] 已销毁');
  }

  // ============== Collection操作 ==============

  /**
   * 创建Collection
   */
  async createCollection(config: VectorStoreConfig): Promise<void> {
    const name = this.getFullCollectionName(config.collectionName);
    
    // 检查是否已存在
    if (await this.collectionExists(config.collectionName)) {
      console.log(`[QdrantAdapter] Collection已存在: ${name}`);
      return;
    }

    const distanceMap: Record<string, string> = {
      cosine: 'Cosine',
      euclidean: 'Euclid',
      dotproduct: 'Dot',
    };

    await this.request('PUT', `/collections/${name}`, {
      vectors: {
        size: config.dimension,
        distance: distanceMap[config.distance ?? 'cosine'] ?? 'Cosine',
      },
    });

    console.log(`[QdrantAdapter] Collection已创建: ${name}`);
  }

  /**
   * 删除Collection
   */
  async deleteCollection(name: string): Promise<void> {
    const fullName = this.getFullCollectionName(name);
    
    await this.request('DELETE', `/collections/${fullName}`);
    console.log(`[QdrantAdapter] Collection已删除: ${fullName}`);
  }

  /**
   * Collection是否存在
   */
  async collectionExists(name: string): Promise<boolean> {
    const fullName = this.getFullCollectionName(name);
    
    try {
      const response = await this.request('GET', `/collections/${fullName}`);
      return response.result !== null;
    } catch {
      return false;
    }
  }

  // ============== 向量操作 ==============

  /**
   * 插入或更新向量
   */
  async upsert(collectionName: string, items: VectorUpsertItem[]): Promise<void> {
    const fullName = this.getFullCollectionName(collectionName);

    const points = items.map(item => ({
      id: item.id,
      vector: item.vector,
      payload: item.payload ?? {},
    }));

    await this.request('PUT', `/collections/${fullName}/points`, {
      points,
    });

    console.log(`[QdrantAdapter] 已插入 ${points.length} 个向量到 ${fullName}`);
  }

  /**
   * 删除向量
   */
  async delete(collectionName: string, ids: string[]): Promise<void> {
    const fullName = this.getFullCollectionName(collectionName);

    await this.request('POST', `/collections/${fullName}/points/delete`, {
      points: ids,
    });

    console.log(`[QdrantAdapter] 已删除 ${ids.length} 个向量`);
  }

  /**
   * 获取向量
   */
  async get(collectionName: string, id: string): Promise<VectorUpsertItem | null> {
    const fullName = this.getFullCollectionName(collectionName);

    try {
      const response = await this.request('POST', `/collections/${fullName}/points/${id}`);
      
      if (response.result) {
        return {
          id: response.result.id,
          vector: response.result.vector,
          payload: response.result.payload,
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 搜索相似向量
   */
  async search(
    collectionName: string,
    vector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const fullName = this.getFullCollectionName(collectionName);

    const searchParams: any = {
      vector,
      limit: options.limit ?? 10,
      offset: options.offset ?? 0,
      with_payload: true,
    };

    // 设置分数阈值
    if (options.score_threshold !== undefined) {
      searchParams.score_threshold = options.score_threshold;
    }

    // 设置过滤条件
    if (options.filter) {
      searchParams.filter = this.buildFilter(options.filter);
    }

    const response = await this.request('POST', `/collections/${fullName}/points/search`, searchParams);

    return (response.result ?? []).map((point: any) => ({
      id: point.id,
      score: point.score,
      payload: point.payload,
    }));
  }

  /**
   * 批量搜索
   */
  async searchBatch(
    collectionName: string,
    queries: number[][],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[][]> {
    const fullName = this.getFullCollectionName(collectionName);

    const searchParams = {
      search: queries.map(vector => ({
        vector,
        limit: options.limit ?? 10,
        offset: options.offset ?? 0,
        with_payload: true,
        ...(options.score_threshold !== undefined && { score_threshold: options.score_threshold }),
        ...(options.filter && { filter: this.buildFilter(options.filter) }),
      })),
    };

    const response = await this.request('POST', `/collections/${fullName}/points/search_batch`, searchParams);

    return (response.result ?? []).map((results: any[]) =>
      results.map((point: any) => ({
        id: point.id,
        score: point.score,
        payload: point.payload,
      }))
    );
  }

  // ============== 嵌入生成 ==============

  /**
   * 生成文本嵌入
   * 
   * 注意：这是一个简化实现，实际项目中应使用专门的嵌入服务
   * 如 OpenAI Embeddings、Sentence Transformers 等
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // 简化实现：基于文本的伪嵌入
    // 实际应用中应调用外部嵌入服务
    const dimension = this.config.defaultDimension ?? 1536;
    const words = text.toLowerCase().split(/\s+/);
    
    const embedding = new Array(dimension).fill(0);
    
    // 简单的词哈希嵌入
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < Math.min(word.length, 10); j++) {
        const idx = (word.charCodeAt(j) * (j + 1) + i) % dimension;
        embedding[idx] += Math.sin(word.charCodeAt(j) * (j + 1));
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
   * 批量生成嵌入
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  // ============== 工具方法 ==============

  /**
   * 获取Collection信息
   */
  async getCollectionInfo(collectionName: string): Promise<{
    vectorsCount: number;
    pointsCount: number;
  }> {
    const fullName = this.getFullCollectionName(collectionName);

    try {
      const response = await this.request('GET', `/collections/${fullName}`);
      
      return {
        vectorsCount: response.result?.vectors_count ?? 0,
        pointsCount: response.result?.points_count ?? 0,
      };
    } catch {
      return {
        vectorsCount: 0,
        pointsCount: 0,
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('GET', '/health');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  // ============== 私有方法 ==============

  /**
   * 发送HTTP请求
   */
  private async request(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['api-key'] = this.config.apiKey;
    }

    const options: RequestInit = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    };

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.config.timeout ?? 30000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Qdrant请求失败: ${response.status} - ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Qdrant请求错误: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 获取完整的Collection名称
   */
  private getFullCollectionName(name: string): string {
    return `${this.config.collectionPrefix ?? 'Taiji_'}${name}`;
  }

  /**
   * 构建过滤条件
   */
  private buildFilter(conditions: Record<string, any>): any {
    const must: any[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (Array.isArray(value)) {
        must.push({
          key,
          match: { any: value },
        });
      } else if (typeof value === 'string') {
        must.push({
          key,
          match: { value },
        });
      } else {
        must.push({
          key,
          match: { value },
        });
      }
    }

    return {
      must,
    };
  }
}

// 注册到工厂
VectorStoreAdapterFactory.register('qdrant', QdrantAdapter);
