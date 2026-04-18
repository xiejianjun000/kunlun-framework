/**
 * 记忆系统主类
 * Memory System - Main Implementation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IMemory,
  IMemorySystem,
  IMemorySystemConfig,
  IMemoryStoreConfig,
  IVectorStoreConfig,
  IMemoryRetrieveOptions,
  IMemorySearchResult,
  IMemorySystemStats,
  IRetentionPolicy,
  IImportanceScorer,
  IMemoryLink,
  MemoryTier,
  MemoryRelationType,
  MemorySystemEvent,
  MemoryStoreHook,
  MemoryRetrieveHook,
  MemoryMigrationHook,
  MemoryCleanupHook,
  DEFAULT_RETENTION_POLICY,
} from './interfaces';
import { MemoryStore } from './storage/MemoryStore';
import { MemoryIndexer } from './indexing/MemoryIndexer';
import { MemoryRetriever } from './retrieval/MemoryRetriever';
import { MemoryProcessor } from './processing/MemoryProcessor';
import { MemoryConsolidator } from './processing/MemoryConsolidator';
import { MemoryPruner } from './processing/MemoryPruner';
import { ImportanceScorer } from './scoring/ImportanceScorer';
import { MemoryLinker } from './linking/MemoryLinker';
import { VectorStoreAdapter } from './adapters/VectorStoreAdapter';
import { QdrantAdapter } from './adapters/QdrantAdapter';

export interface MemorySystemOptions extends Partial<IMemorySystemConfig> {}

/**
 * 记忆系统主类
 * 
 * 实现IMemorySystem接口，提供完整的记忆存储、检索、巩固和管理功能
 * 
 * @example
 * ```typescript
 * const memorySystem = new MemorySystem({
 *   storeConfig: {
 *     dbType: 'sqlite',
 *     connectionString: './data/memory.db'
 *   },
 *   vectorStoreConfig: {
 *     type: 'qdrant',
 *     url: 'http://localhost:6333'
 *   }
 * });
 * 
 * await memorySystem.initialize();
 * 
 * // 存储记忆
 * const memoryId = await memorySystem.store({
 *   userId: 'user1',
 *   tenantId: 'tenant1',
 *   content: '用户询问如何安装Node.js',
 *   type: 'conversation',
 *   tier: MemoryTier.WARM
 * }, 'user1');
 * 
 * // 检索记忆
 * const results = await memorySystem.retrieve('Node.js 安装', 'user1');
 * 
 * await memorySystem.destroy();
 * ```
 */
export class MemorySystem extends EventEmitter implements IMemorySystem {
  // ============== 配置属性 ==============
  private readonly config: Required<IMemorySystemConfig>;
  private readonly store: MemoryStore;
  private readonly indexer: MemoryIndexer;
  private readonly retriever: MemoryRetriever;
  private readonly processor: MemoryProcessor;
  private readonly consolidator: MemoryConsolidator;
  private readonly pruner: MemoryPruner;
  private readonly importanceScorer: ImportanceScorer;
  private readonly linker: MemoryLinker;
  private vectorAdapter: VectorStoreAdapter | null = null;

  // ============== 状态属性 ==============
  private isInitialized: boolean = false;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly retentionPolicies: Map<string, IRetentionPolicy> = new Map();
  private readonly importanceScorers: Map<string, IImportanceScorer> = new Map();

  // ============== 钩子列表 ==============
  private memoryStoreHooks: MemoryStoreHook[] = [];
  private memoryRetrieveHooks: MemoryRetrieveHook[] = [];
  private memoryMigrationHooks: MemoryMigrationHook[] = [];
  private memoryCleanupHooks: MemoryCleanupHook[] = [];

  /**
   * 构造函数
   * @param options 记忆系统配置选项
   */
  constructor(options: MemorySystemOptions = {}) {
    super();

    // 合并配置
    this.config = {
      multiTenant: options.multiTenant ?? true,
      storeConfig: options.storeConfig ?? {
        dbType: 'sqlite',
        connectionString: './data/memory.db',
      },
      vectorStoreConfig: options.vectorStoreConfig ?? {
        type: 'local',
      },
      defaultRetentionPolicy: options.defaultRetentionPolicy ?? DEFAULT_RETENTION_POLICY,
      defaultImportanceScorer: options.defaultImportanceScorer,
      maxConcurrentOps: options.maxConcurrentOps ?? 10,
      debugMode: options.debugMode ?? false,
    };

    // 初始化各个组件
    this.store = new MemoryStore(this.config.storeConfig);
    this.indexer = new MemoryIndexer();
    this.retriever = new MemoryRetriever();
    this.processor = new MemoryProcessor();
    this.consolidator = new MemoryConsolidator(this.store);
    this.pruner = new MemoryPruner(this.store);
    this.importanceScorer = new ImportanceScorer();
    this.linker = new MemoryLinker(this.store);
  }

  // ============== 生命周期方法 ==============

  /**
   * 初始化记忆系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('warn', '记忆系统已经初始化，跳过');
      return;
    }

    this.log('info', '正在初始化记忆系统...');

    try {
      // 初始化存储层
      await this.store.initialize();

      // 初始化向量适配器
      if (this.config.vectorStoreConfig) {
        await this.initializeVectorAdapter();
      }

      // 设置默认重要性评分器
      this.importanceScorer.setStrategy('default');

      // 启动自动清理定时器
      this.startCleanupTimer();

      this.isInitialized = true;
      this.log('info', '记忆系统初始化完成');
    } catch (error) {
      this.emit(MemorySystemEvent.SYSTEM_ERROR, error);
      throw error;
    }
  }

  /**
   * 销毁记忆系统
   */
  async destroy(): Promise<void> {
    this.log('info', '正在销毁记忆系统...');

    // 停止清理定时器
    this.stopCleanupTimer();

    // 销毁存储层
    await this.store.destroy();

    // 销毁向量适配器
    if (this.vectorAdapter) {
      await this.vectorAdapter.destroy();
      this.vectorAdapter = null;
    }

    // 清空钩子
    this.memoryStoreHooks = [];
    this.memoryRetrieveHooks = [];
    this.memoryMigrationHooks = [];
    this.memoryCleanupHooks = [];

    this.isInitialized = false;
    this.log('info', '记忆系统已销毁');
  }

  // ============== 记忆操作 ==============

  /**
   * 存储记忆
   */
  async store(
    memory: Omit<IMemory, 'id' | 'createdAt' | 'accessedAt' | 'accessCount'>,
    userId: string
  ): Promise<string> {
    this.ensureInitialized();

    // 生成唯一ID
    const memoryId = uuidv4();
    const now = new Date();

    // 创建完整记忆对象
    const fullMemory: IMemory = {
      ...memory,
      id: memoryId,
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      metadata: memory.metadata ?? {},
      isArchived: memory.isArchived ?? false,
      tags: memory.tags ?? [],
      linkedMemoryIds: memory.linkedMemoryIds ?? [],
    };

    // 处理记忆内容（清洗、分块、去重）
    const processedMemory = await this.processor.process(fullMemory);
    
    // 生成向量嵌入
    if (this.vectorAdapter && processedMemory.content) {
      const embedding = await this.vectorAdapter.generateEmbedding(processedMemory.content);
      processedMemory.embedding = embedding;
      
      // 存储到向量数据库
      await this.vectorAdapter.upsert(
        this.getCollectionName(userId),
        [{
          id: memoryId,
          vector: embedding,
          payload: {
            userId,
            content: processedMemory.content,
            type: processedMemory.type,
            tier: processedMemory.tier,
          }
        }]
      );
    }

    // 计算重要性评分
    const scorer = this.importanceScorers.get(userId) ?? this.config.defaultImportanceScorer;
    if (scorer) {
      processedMemory.importanceScore = await scorer.score(processedMemory);
    }

    // 存储到数据库
    await this.store.save(processedMemory);

    // 执行存储后钩子
    await this.executeStoreHooks(processedMemory);

    // 发现并创建关联
    await this.linker.discoverAndLink(processedMemory, userId);

    this.emit(MemorySystemEvent.MEMORY_STORED, processedMemory);
    this.log('debug', `记忆已存储: ${memoryId}`);

    return memoryId;
  }

  /**
   * 批量存储记忆
   */
  async storeBatch(
    memories: Omit<IMemory, 'id' | 'createdAt' | 'accessedAt' | 'accessCount'>[],
    userId: string
  ): Promise<string[]> {
    this.ensureInitialized();

    const memoryIds: string[] = [];
    
    for (const memory of memories) {
      const id = await this.store(memory, userId);
      memoryIds.push(id);
    }

    this.log('info', `批量存储完成: ${memoryIds.length} 条记忆`);
    return memoryIds;
  }

  /**
   * 检索记忆
   */
  async retrieve(
    query: string,
    userId: string,
    options: IMemoryRetrieveOptions = {}
  ): Promise<IMemorySearchResult[]> {
    this.ensureInitialized();

    const mode = options.mode ?? 'hybrid';
    const limit = options.limit ?? 10;

    let results: IMemorySearchResult[] = [];

    if (mode === 'semantic' || mode === 'hybrid') {
      // 语义搜索
      if (this.vectorAdapter) {
        const semanticResults = await this.vectorAdapter.search(
          this.getCollectionName(userId),
          await this.vectorAdapter.generateEmbedding(query),
          {
            limit,
            score_threshold: options.similarityThreshold,
          }
        );

        for (const hit of semanticResults) {
          const memory = await this.store.getById(hit.id, userId);
          if (memory && this.matchesFilters(memory, options)) {
            results.push({
              memory,
              score: hit.score,
              matchedSegments: hit.payload?.content ? [hit.payload.content] : undefined,
            });
          }
        }
      }
    }

    if (mode === 'keyword' || mode === 'hybrid') {
      // 关键词搜索
      const keywordResults = await this.store.search(
        query,
        userId,
        {
          tiers: options.tiers,
          timeRange: options.timeRange,
          limit,
          includeArchived: options.includeArchived,
        }
      );

      for (const memory of keywordResults) {
        if (this.matchesFilters(memory, options)) {
          const existingIndex = results.findIndex(r => r.memory.id === memory.id);
          if (existingIndex === -1) {
            results.push({
              memory,
              score: this.calculateKeywordScore(memory, query),
            });
          }
        }
      }
    }

    // 应用检索后钩子
    results = await this.executeRetrieveHooks(results, query);

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 应用分页
    const offset = options.offset ?? 0;
    results = results.slice(offset, offset + limit);

    this.emit(MemorySystemEvent.MEMORY_RETRIEVED, results, query);
    this.log('debug', `检索完成: ${results.length} 条结果`);

    return results;
  }

  /**
   * 获取记忆
   */
  async get(memoryId: string, userId: string): Promise<IMemory | null> {
    this.ensureInitialized();

    const memory = await this.store.getById(memoryId, userId);
    
    if (memory) {
      // 更新访问时间和次数
      memory.accessedAt = new Date();
      memory.accessCount += 1;
      await this.store.update(memory);
    }

    return memory;
  }

  /**
   * 更新记忆
   */
  async update(
    memoryId: string,
    updates: Partial<IMemory>,
    userId: string
  ): Promise<IMemory> {
    this.ensureInitialized();

    const memory = await this.store.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    // 合并更新
    const updatedMemory: IMemory = {
      ...memory,
      ...updates,
      id: memory.id, // 保持ID不变
      userId: memory.userId, // 保持userId不变
      tenantId: memory.tenantId, // 保持tenantId不变
      createdAt: memory.createdAt, // 保持创建时间不变
      accessedAt: new Date(),
    };

    // 如果内容更新，重新生成向量
    if (updates.content && this.vectorAdapter) {
      updatedMemory.embedding = await this.vectorAdapter.generateEmbedding(updates.content);
    }

    // 保存更新
    await this.store.update(updatedMemory);

    // 重新计算重要性
    const scorer = this.importanceScorers.get(userId) ?? this.config.defaultImportanceScorer;
    if (scorer) {
      updatedMemory.importanceScore = await scorer.score(updatedMemory);
    }

    this.emit(MemorySystemEvent.MEMORY_UPDATED, updatedMemory);
    this.log('debug', `记忆已更新: ${memoryId}`);

    return updatedMemory;
  }

  /**
   * 删除记忆
   */
  async delete(memoryId: string, userId: string): Promise<void> {
    this.ensureInitialized();

    // 从向量数据库删除
    if (this.vectorAdapter) {
      await this.vectorAdapter.delete(this.getCollectionName(userId), [memoryId]);
    }

    // 删除关联
    await this.linker.removeAllLinks(memoryId, userId);

    // 从存储删除
    await this.store.delete(memoryId, userId);

    this.emit(MemorySystemEvent.MEMORY_DELETED, { memoryId, userId });
    this.log('debug', `记忆已删除: ${memoryId}`);
  }

  /**
   * 归档记忆
   */
  async archive(memoryId: string, userId: string): Promise<void> {
    this.ensureInitialized();

    const memory = await this.store.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    memory.isArchived = true;
    await this.store.update(memory);

    this.emit(MemorySystemEvent.MEMORY_ARCHIVED, { memoryId, userId });
    this.log('debug', `记忆已归档: ${memoryId}`);
  }

  // ============== 记忆层级管理 ==============

  /**
   * 巩固记忆
   */
  async consolidate(memoryId: string, userId: string): Promise<void> {
    this.ensureInitialized();

    const memory = await this.store.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    // 执行巩固流程
    const consolidatedMemory = await this.consolidator.consolidate(memory, userId);

    // 保存更新
    await this.store.update(consolidatedMemory);

    this.emit(MemorySystemEvent.MEMORY_CONSOLIDATED, { memoryId, userId });
    this.log('debug', `记忆已巩固: ${memoryId}`);
  }

  /**
   * 迁移记忆到指定层级
   */
  async migrateToTier(
    memoryId: string,
    targetTier: MemoryTier,
    userId: string
  ): Promise<void> {
    this.ensureInitialized();

    const memory = await this.store.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    const sourceTier = memory.tier;
    
    // 执行迁移钩子
    await this.executeMigrationHooks(memory, sourceTier, targetTier);

    // 更新层级
    memory.tier = targetTier;
    await this.store.update(memory);

    // 更新向量数据库
    if (this.vectorAdapter && memory.embedding) {
      await this.vectorAdapter.upsert(
        this.getCollectionName(userId),
        [{
          id: memoryId,
          vector: memory.embedding,
          payload: {
            userId,
            content: memory.content,
            type: memory.type,
            tier: targetTier,
          }
        }]
      );
    }

    this.emit(MemorySystemEvent.MEMORY_MIGRATED, { memoryId, userId, sourceTier, targetTier });
    this.log('debug', `记忆已迁移: ${memoryId} from ${sourceTier} to ${targetTier}`);
  }

  // ============== 保留策略 ==============

  /**
   * 设置保留策略
   */
  async setRetentionPolicy(policy: IRetentionPolicy, userId: string): Promise<void> {
    this.ensureInitialized();
    this.retentionPolicies.set(userId, policy);
    this.log('debug', `保留策略已设置: ${userId}`);
  }

  /**
   * 获取保留策略
   */
  getRetentionPolicy(userId: string): IRetentionPolicy {
    return this.retentionPolicies.get(userId) ?? this.config.defaultRetentionPolicy;
  }

  // ============== 重要性评分 ==============

  /**
   * 设置重要性评分器
   */
  async setImportanceScorer(scorer: IImportanceScorer, userId: string): Promise<void> {
    this.ensureInitialized();
    this.importanceScorers.set(userId, scorer);
    this.log('debug', `重要性评分器已设置: ${userId}`);
  }

  /**
   * 评估记忆重要性
   */
  async evaluateImportance(memoryId: string, userId: string): Promise<number> {
    this.ensureInitialized();

    const memory = await this.store.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    const scorer = this.importanceScorers.get(userId) ?? this.importanceScorer;
    return await scorer.score(memory);
  }

  // ============== 关联分析 ==============

  /**
   * 创建记忆关联
   */
  async linkMemories(
    sourceId: string,
    targetId: string,
    relationType: MemoryRelationType,
    strength: number,
    userId: string
  ): Promise<void> {
    this.ensureInitialized();

    await this.linker.createLink(sourceId, targetId, relationType, strength, userId);
    
    // 更新源记忆的关联列表
    const sourceMemory = await this.store.getById(sourceId, userId);
    if (sourceMemory) {
      if (!sourceMemory.linkedMemoryIds) {
        sourceMemory.linkedMemoryIds = [];
      }
      if (!sourceMemory.linkedMemoryIds.includes(targetId)) {
        sourceMemory.linkedMemoryIds.push(targetId);
        await this.store.update(sourceMemory);
      }
    }

    this.emit(MemorySystemEvent.MEMORY_LINKED, { sourceId, targetId, relationType });
  }

  /**
   * 获取记忆关联
   */
  async getMemoryLinks(memoryId: string, userId: string): Promise<IMemoryLink[]> {
    this.ensureInitialized();
    return await this.linker.getLinks(memoryId, userId);
  }

  /**
   * 发现相关记忆
   */
  async discoverRelatedMemories(
    memoryId: string,
    userId: string,
    limit: number = 10
  ): Promise<IMemory[]> {
    this.ensureInitialized();

    const links = await this.linker.getLinks(memoryId, userId);
    const relatedIds = links.map(link => link.targetMemoryId).slice(0, limit);

    const memories: IMemory[] = [];
    for (const id of relatedIds) {
      const memory = await this.store.getById(id, userId);
      if (memory) {
        memories.push(memory);
      }
    }

    return memories;
  }

  // ============== 维护操作 ==============

  /**
   * 执行清理
   */
  async performCleanup(): Promise<number> {
    this.ensureInitialized();

    this.log('info', '开始执行记忆清理...');

    let cleanedCount = 0;

    // 对每个用户执行清理
    const userIds = await this.store.getAllUserIds();
    
    for (const userId of userIds) {
      const policy = this.getRetentionPolicy(userId);
      
      if (!policy.autoCleanupEnabled) {
        continue;
      }

      const cleaned = await this.pruner.prune(userId, policy);
      cleanedCount += cleaned.length;
    }

    // 执行清理钩子
    const cleanedMemories = await this.store.getRecentDeleted();
    await this.executeCleanupHooks(cleanedMemories);

    this.emit(MemorySystemEvent.MEMORY_CLEANED, { count: cleanedCount });
    this.log('info', `清理完成: ${cleanedCount} 条记忆`);

    return cleanedCount;
  }

  /**
   * 重建索引
   */
  async rebuildIndex(userId?: string): Promise<void> {
    this.ensureInitialized();

    this.log('info', `开始重建索引${userId ? ` for ${userId}` : ''}...`);

    // 清除现有索引
    await this.indexer.clear();

    // 获取所有记忆
    const memories = userId
      ? await this.store.getByUserId(userId)
      : await this.store.getAll();

    // 重建索引
    for (const memory of memories) {
      await this.indexer.index(memory);
    }

    this.log('info', `索引重建完成: ${memories.length} 条记忆`);
  }

  /**
   * 获取系统统计
   */
  async getStats(userId?: string): Promise<IMemorySystemStats> {
    this.ensureInitialized();

    const memories = userId
      ? await this.store.getByUserId(userId)
      : await this.store.getAll();

    const memoriesByTier: Record<MemoryTier, number> = {
      [MemoryTier.HOT]: 0,
      [MemoryTier.WORKING]: 0,
      [MemoryTier.WARM]: 0,
      [MemoryTier.COLD]: 0,
    };

    let totalImportance = 0;
    const userIds = new Set<string>();

    for (const memory of memories) {
      memoriesByTier[memory.tier]++;
      totalImportance += memory.importanceScore;
      userIds.add(memory.userId);
    }

    const totalLinks = await this.linker.getTotalLinkCount(userId);

    return {
      userCount: userIds.size,
      totalMemories: memories.length,
      memoriesByTier,
      avgImportanceScore: memories.length > 0 ? totalImportance / memories.length : 0,
      totalLinks,
      lastCleanupTime: this.pruner.getLastCleanupTime(),
      storageSizeBytes: await this.store.getStorageSize(),
    };
  }

  // ============== 钩子管理 ==============

  /**
   * 注册记忆存储钩子
   */
  onMemoryStore(callback: MemoryStoreHook): void {
    this.memoryStoreHooks.push(callback);
  }

  /**
   * 注册记忆检索钩子
   */
  onMemoryRetrieve(callback: MemoryRetrieveHook): void {
    this.memoryRetrieveHooks.push(callback);
  }

  /**
   * 注册记忆迁移钩子
   */
  onMemoryMigration(callback: MemoryMigrationHook): void {
    this.memoryMigrationHooks.push(callback);
  }

  /**
   * 注册记忆清理钩子
   */
  onMemoryCleanup(callback: MemoryCleanupHook): void {
    this.memoryCleanupHooks.push(callback);
  }

  // ============== 私有方法 ==============

  /**
   * 初始化向量适配器
   */
  private async initializeVectorAdapter(): Promise<void> {
    const config = this.config.vectorStoreConfig!;

    switch (config.type) {
      case 'qdrant':
        this.vectorAdapter = new QdrantAdapter({
          url: config.url ?? 'http://localhost:6333',
          apiKey: config.apiKey,
          collectionPrefix: config.collectionPrefix ?? 'Taiji_',
        });
        break;
      case 'local':
      default:
        // 使用Qdrant本地模式
        this.vectorAdapter = new QdrantAdapter({
          url: config.url ?? 'http://localhost:6333',
          apiKey: config.apiKey,
          collectionPrefix: config.collectionPrefix ?? 'Taiji_',
        });
        break;
    }

    await this.vectorAdapter.initialize();
  }

  /**
   * 获取Collection名称
   */
  private getCollectionName(userId: string): string {
    const prefix = this.config.vectorStoreConfig?.collectionPrefix ?? 'Taiji_';
    return `${prefix}memories_${userId}`;
  }

  /**
   * 确保系统已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('记忆系统未初始化，请先调用 initialize()');
    }
  }

  /**
   * 检查记忆是否匹配过滤器
   */
  private matchesFilters(memory: IMemory, options: IMemoryRetrieveOptions): boolean {
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
  }

  /**
   * 计算关键词匹配分数
   */
  private calculateKeywordScore(memory: IMemory, query: string): number {
    const content = memory.content.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    for (const word of queryWords) {
      if (content.includes(word)) {
        matchCount++;
      }
    }

    return matchCount / queryWords.length;
  }

  /**
   * 执行存储钩子
   */
  private async executeStoreHooks(memory: IMemory): Promise<void> {
    for (const hook of this.memoryStoreHooks) {
      try {
        await hook(memory);
      } catch (error) {
        this.log('error', `存储钩子执行失败: ${error}`);
      }
    }
  }

  /**
   * 执行检索钩子
   */
  private async executeRetrieveHooks(
    results: IMemorySearchResult[],
    query: string
  ): Promise<IMemorySearchResult[]> {
    let processedResults = results;
    for (const hook of this.memoryRetrieveHooks) {
      try {
        processedResults = await hook(processedResults, query);
      } catch (error) {
        this.log('error', `检索钩子执行失败: ${error}`);
      }
    }
    return processedResults;
  }

  /**
   * 执行迁移钩子
   */
  private async executeMigrationHooks(
    memory: IMemory,
    fromTier: MemoryTier,
    toTier: MemoryTier
  ): Promise<void> {
    for (const hook of this.memoryMigrationHooks) {
      try {
        await hook(memory, fromTier, toTier);
      } catch (error) {
        this.log('error', `迁移钩子执行失败: ${error}`);
      }
    }
  }

  /**
   * 执行清理钩子
   */
  private async executeCleanupHooks(cleanedMemories: IMemory[]): Promise<void> {
    for (const hook of this.memoryCleanupHooks) {
      try {
        await hook(cleanedMemories);
      } catch (error) {
        this.log('error', `清理钩子执行失败: ${error}`);
      }
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    const interval = this.config.defaultRetentionPolicy.cleanupIntervalSeconds * 1000;
    
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        this.log('error', `自动清理失败: ${error}`);
      }
    }, interval);
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 日志记录
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.config.debugMode || level !== 'debug') {
      console.log(`[MemorySystem][${level.toUpperCase()}] ${message}`);
    }
  }
}

// ============== 导出 ==============

export {
  MemorySystem,
  MemoryTier,
  ImportanceLevel,
  MemoryRelationType,
  MemorySystemEvent,
  DEFAULT_RETENTION_POLICY,
} from './interfaces';

export { MemoryStore } from './storage/MemoryStore';
export { MemoryIndexer } from './indexing/MemoryIndexer';
export { MemoryRetriever } from './retrieval/MemoryRetriever';
export { MemoryProcessor } from './processing/MemoryProcessor';
export { MemoryConsolidator } from './processing/MemoryConsolidator';
export { MemoryPruner } from './processing/MemoryPruner';
export { ImportanceScorer } from './scoring/ImportanceScorer';
export { MemoryLinker } from './linking/MemoryLinker';
export { VectorStoreAdapter } from './adapters/VectorStoreAdapter';
export { QdrantAdapter } from './adapters/QdrantAdapter';
