/**
 * 向量存储适配器接口
 * Vector Store Adapter Interface
 */

export interface VectorSearchResult {
  /** 记忆ID */
  id: string;
  /** 相似度分数 */
  score: number;
  /** 负载数据 */
  payload?: Record<string, any>;
}

export interface VectorSearchOptions {
  /** 结果数量限制 */
  limit?: number;
  /** 分数阈值 */
  score_threshold?: number;
  /** 偏移量 */
  offset?: number;
  /** 过滤条件 */
  filter?: Record<string, any>;
}

export interface VectorUpsertItem {
  /** 向量ID */
  id: string;
  /** 向量数据 */
  vector: number[];
  /** 负载数据 */
  payload?: Record<string, any>;
}

export interface VectorStoreConfig {
  /** 向量维度 */
  dimension: number;
  /** 距离度量 */
  distance?: 'cosine' | 'euclidean' | 'dotproduct';
  /** Collection名称 */
  collectionName: string;
}

/**
 * 向量存储适配器接口
 * 
 * 定义向量数据库操作的抽象接口，支持Qdrant、Chroma等后端
 * 
 * @example
 * ```typescript
 * interface MyVectorAdapter extends VectorStoreAdapter {
 *   // 实现具体方法
 * }
 * ```
 */
export interface VectorStoreAdapter {
  // ============== 生命周期 ==============

  /**
   * 初始化适配器
   */
  initialize(): Promise<void>;

  /**
   * 销毁适配器
   */
  destroy(): Promise<void>;

  // ============== Collection操作 ==============

  /**
   * 创建Collection
   * @param config Collection配置
   */
  createCollection(config: VectorStoreConfig): Promise<void>;

  /**
   * 删除Collection
   * @param name Collection名称
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * Collection是否存在
   * @param name Collection名称
   */
  collectionExists(name: string): Promise<boolean>;

  // ============== 向量操作 ==============

  /**
   * 插入或更新向量
   * @param collectionName Collection名称
   * @param items 向量列表
   */
  upsert(collectionName: string, items: VectorUpsertItem[]): Promise<void>;

  /**
   * 删除向量
   * @param collectionName Collection名称
   * @param ids 向量ID列表
   */
  delete(collectionName: string, ids: string[]): Promise<void>;

  /**
   * 获取向量
   * @param collectionName Collection名称
   * @param id 向量ID
   */
  get(collectionName: string, id: string): Promise<VectorUpsertItem | null>;

  /**
   * 搜索相似向量
   * @param collectionName Collection名称
   * @param vector 查询向量
   * @param options 搜索选项
   */
  search(
    collectionName: string,
    vector: number[],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;

  /**
   * 批量搜索
   * @param collectionName Collection名称
   * @param queries 查询向量列表
   * @param options 搜索选项
   */
  searchBatch(
    collectionName: string,
    queries: number[][],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[][]>;

  // ============== 嵌入生成 ==============

  /**
   * 生成文本嵌入
   * @param text 输入文本
   * @returns 嵌入向量
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * 批量生成嵌入
   * @param texts 文本列表
   * @returns 嵌入向量列表
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  // ============== 工具方法 ==============

  /**
   * 获取Collection信息
   * @param collectionName Collection名称
   */
  getCollectionInfo(collectionName: string): Promise<{
    vectorsCount: number;
    pointsCount: number;
  }>;

  /**
   * 检查健康状态
   */
  healthCheck(): Promise<boolean>;
}

/**
 * 向量存储适配器工厂
 */
export class VectorStoreAdapterFactory {
  private static adapters: Map<string, new (config: any) => VectorStoreAdapter> = new Map();

  /**
   * 注册适配器
   * @param type 适配器类型
   * @param adapter 适配器类
   */
  static register(type: string, adapter: new (config: any) => VectorStoreAdapter): void {
    this.adapters.set(type, adapter);
  }

  /**
   * 创建适配器
   * @param type 适配器类型
   * @param config 配置
   */
  static create(type: string, config: any): VectorStoreAdapter {
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw new Error(`未知的向量存储适配器类型: ${type}`);
    }
    return new AdapterClass(config);
  }

  /**
   * 获取支持的适配器类型
   */
  static getSupportedTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
