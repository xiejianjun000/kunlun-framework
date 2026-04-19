/**
 * 记忆系统主类
 * Memory System - Main Implementation with Recall Tracking
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
  TIER_TRANSITION_MAP,
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

// Recall Tracking imports
import {
  RecallTracker,
  createRecallTracker,
  getGlobalRecallTracker,
  setGlobalRecallTracker,
  type MemorySearchResult,
  type RecallEntry,
  type PromotionCandidate,
  type RankCandidatesOptions,
  type RecallAuditSummary,
} from './tracking';

export interface MemorySystemOptions extends Partial<IMemorySystemConfig> {
  /** Enable recall tracking for Dreaming scoring */
  enableRecallTracking?: boolean;
  /** Custom recall tracker instance */
  recallTracker?: RecallTracker;
}

export interface RecallTrackingStats {
  totalEntries: number;
  totalRecalls: number;
  promotedCount: number;
  avgRecallCount: number;
  avgScore: number;
}

export interface RecallSessionResult {
  /** Search results returned */
  results: IMemorySearchResult[];
  /** Recall tracking statistics for this session */
  recallStats: {
    resultCount: number;
    uniqueEntries: number;
    avgScore: number;
  };
}

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
 *   },
 *   enableRecallTracking: true  // Enable recall tracking for Dreaming
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
 * // 检索记忆 (with recall tracking)
 * const result = await memorySystem.retrieve('Node.js 安装', 'user1');
 * console.log(`Found ${result.results.length} memories`);
 * console.log(`Recall stats: ${result.recallStats}`);
 * 
 * // Get promotion candidates for Dreaming
 * const candidates = await memorySystem.getRecallPromotionCandidates();
 * console.log(`Found ${candidates.length} candidates for Dreaming`);
 * 
 * await memorySystem.destroy();
 * ```
 */
export class MemorySystem extends EventEmitter implements IMemorySystem {
  // ============== 配置属性 ==============
  private readonly config: Required<IMemorySystemConfig>;
  private readonly _memoryStore: MemoryStore;
  private readonly indexer: MemoryIndexer;
  private readonly retriever: MemoryRetriever;
  private readonly processor: MemoryProcessor;
  private readonly consolidator: MemoryConsolidator;
  private readonly pruner: MemoryPruner;
  private readonly importanceScorer: ImportanceScorer;
  private readonly linker: MemoryLinker;
  private vectorAdapter: VectorStoreAdapter | null = null;

  // ============== Recall Tracking ==============
  private recallTracker: RecallTracker | null = null;
  private readonly enableRecallTracking: boolean;

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
      defaultImportanceScorer: options.defaultImportanceScorer ?? (new ImportanceScorer() as unknown as IImportanceScorer),
      maxConcurrentOps: options.maxConcurrentOps ?? 10,
      debugMode: options.debugMode ?? false,
    };

    // Initialize recall tracking
    this.enableRecallTracking = options.enableRecallTracking ?? false;
    if (options.recallTracker) {
      this.recallTracker = options.recallTracker;
      setGlobalRecallTracker(options.recallTracker);
    }

    // 初始化各个组件
    this._memoryStore = new MemoryStore(this.config.storeConfig);
    this.indexer = new MemoryIndexer();
    this.retriever = new MemoryRetriever();
    this.processor = new MemoryProcessor();
    this.consolidator = new MemoryConsolidator(this._memoryStore);
    this.pruner = new MemoryPruner(this._memoryStore);
    this.importanceScorer = new ImportanceScorer();
    this.linker = new MemoryLinker(this._memoryStore);
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
      await this._memoryStore.initialize();

      // 初始化向量适配器
      if (this.config.vectorStoreConfig) {
        await this.initializeVectorAdapter();
      }

      // 初始化Recall Tracking
      if (this.enableRecallTracking && !this.recallTracker) {
        this.recallTracker = createRecallTracker();
        setGlobalRecallTracker(this.recallTracker);
        this.log('info', 'Recall Tracking 已初始化');
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
    await this._memoryStore.destroy();

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
    await this._memoryStore.save(processedMemory);

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
   * 检索记忆 (集成Recall Tracking)
   * 
   * 当启用Recall Tracking时，此方法会：
   * 1. 执行正常的记忆检索
   * 2. 记录检索结果作为召回信号
   * 3. 返回检索结果及召回统计信息
   */
  async retrieve(
    query: string,
    userId: string,
    options: IMemoryRetrieveOptions = {}
  ): Promise<IMemorySearchResult[]> {
    this.ensureInitialized();

    const mode = options.mode ?? 'hybrid';
    const limit = options.limit ?? 10;
    const minScore = options.minScore ?? 0.5;

    let results: IMemorySearchResult[] = [];

    // 执行检索
    switch (mode) {
      case 'semantic':
        results = await this.retrieveSemantic(query, userId, limit, minScore);
        break;
      case 'keyword':
        results = await this.retrieveKeyword(query, userId, limit, minScore);
        break;
      case 'hybrid':
      default:
        results = await this.retrieveHybrid(query, userId, limit, minScore);
        break;
    }

    // 应用过滤器
    results = results.filter(result => this.matchesFilters(result.memory, options));

    // 限制返回数量
    results = results.slice(0, limit);

    // 执行检索后钩子
    results = await this.executeRetrieveHooks(results, query);

    // Record recall signals if tracking is enabled
    if (this.enableRecallTracking && this.recallTracker && results.length > 0) {
      // Fire and forget - don't block retrieval on recall recording
      this.recordRecallSignals(query, results, userId).catch(err => {
        this.log('error', `记录召回信号失败: ${err}`);
      });
    }

    return results;
  }

  /**
   * 检索记忆并返回召回统计 (扩展接口)
   */
  async retrieveWithRecallTracking(
    query: string,
    userId: string,
    options: IMemoryRetrieveOptions = {}
  ): Promise<RecallSessionResult> {
    this.ensureInitialized();

    const results = await this.retrieve(query, userId, options);
    
    // Calculate recall stats
    const uniqueEntries = new Set<string>();
    let totalScore = 0;

    for (const result of results) {
      uniqueEntries.add(result.memory.id);
      totalScore += result.score;
    }

    return {
      results,
      recallStats: {
        resultCount: results.length,
        uniqueEntries: uniqueEntries.size,
        avgScore: results.length > 0 ? totalScore / results.length : 0,
      },
    };
  }

  /**
   * 记录召回信号 (内部方法)
   */
  private async recordRecallSignals(
    query: string,
    results: IMemorySearchResult[],
    userId: string
  ): Promise<void> {
    if (!this.recallTracker) return;

    // Convert to recall tracking format
    const searchResults: MemorySearchResult[] = results.map(result => ({
      path: `memory/${result.memory.id}.md`,
      startLine: 1,
      endLine: 10,
      score: result.score,
      snippet: result.memory.content.slice(0, 200),
      source: 'memory' as const,
    }));

    // Record the recalls
    await this.recallTracker.recordRecalls({
      query,
      results: searchResults,
      userId,
    });
  }

  /**
   * 获取召回追踪统计
   */
  async getRecallTrackingStats(): Promise<RecallTrackingStats | null> {
    if (!this.recallTracker) {
      return null;
    }

    const stats = await this.recallTracker.getStatistics();
    return {
      totalEntries: stats.totalEntries,
      totalRecalls: stats.totalRecalls,
      promotedCount: stats.promotedCount,
      avgRecallCount: stats.avgRecallCount,
      avgScore: stats.avgScore,
    };
  }

  /**
   * 获取召回提升候选 (用于Dreaming)
   */
  async getRecallPromotionCandidates(
    options: RankCandidatesOptions = {}
  ): Promise<PromotionCandidate[]> {
    if (!this.recallTracker) {
      return [];
    }

    return await this.recallTracker.rankCandidates(options);
  }

  /**
   * 获取所有召回条目
   */
  async getAllRecallEntries(): Promise<Record<string, RecallEntry>> {
    if (!this.recallTracker) {
      return {};
    }

    return await this.recallTracker.getAllEntries();
  }

  /**
   * 获取特定召回条目
   */
  async getRecallEntry(key: string): Promise<RecallEntry | undefined> {
    if (!this.recallTracker) {
      return undefined;
    }

    return await this.recallTracker.getEntry(key);
  }

  /**
   * 标记记忆为已验证相关
   */
  async markRecallAsGrounded(key: string, grounded: boolean = true): Promise<boolean> {
    if (!this.recallTracker) {
      return false;
    }

    return await this.recallTracker.markGrounded(key, grounded);
  }

  /**
   * 标记记忆已提升
   */
  async markRecallAsPromoted(key: string): Promise<boolean> {
    if (!this.recallTracker) {
      return false;
    }

    return await this.recallTracker.markPromoted(key);
  }

  /**
   * 记录梦境阶段信号
   */
  async recordPhaseSignal(key: string, phase: 'light' | 'rem'): Promise<void> {
    if (!this.recallTracker) {
      return;
    }

    await this.recallTracker.recordPhaseSignal(key, phase);
  }

  /**
   * 获取召回追踪审计信息
   */
  async auditRecallTracking(): Promise<RecallAuditSummary | null> {
    if (!this.recallTracker) {
      return null;
    }

    return await this.recallTracker.audit();
  }

  // ============== 原有方法保持不变 ==============

  /**
   * 获取记忆
   */
  async get(memoryId: string, userId: string): Promise<IMemory | null> {
    this.ensureInitialized();

    const memory = await this._memoryStore.getById(memoryId, userId);
    
    if (memory) {
      // 更新访问统计
      memory.accessedAt = new Date();
      memory.accessCount = (memory.accessCount ?? 0) + 1;
      await this._memoryStore.update(memory);
    }

    return memory;
  }

  /**
   * 获取用户所有记忆
   */
  async getByUser(userId: string, options: { includeArchived?: boolean } = {}): Promise<IMemory[]> {
    this.ensureInitialized();

    let memories = await this._memoryStore.getByUserId(userId);
    
    if (!options.includeArchived) {
      memories = memories.filter(m => !m.isArchived);
    }

    return memories;
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

    const memory = await this._memoryStore.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    // 应用更新
    const updatedMemory = {
      ...memory,
      ...updates,
      id: memoryId, // 确保ID不变
    };

    await this._memoryStore.update(updatedMemory);

    // 更新向量数据库
    if (this.vectorAdapter && updatedMemory.embedding) {
      await this.vectorAdapter.upsert(
        this.getCollectionName(userId),
        [{
          id: memoryId,
          vector: updatedMemory.embedding,
          payload: {
            userId,
            content: updatedMemory.content,
            type: updatedMemory.type,
            tier: updatedMemory.tier,
          }
        }]
      );
    }

    this.emit(MemorySystemEvent.MEMORY_UPDATED, updatedMemory);
    return updatedMemory;
    this.log('debug', `记忆已更新: ${memoryId}`);
  }

  /**
   * 删除记忆
   */
  async delete(memoryId: string, userId: string): Promise<IMemory> {
    this.ensureInitialized();

    const memory = await this._memoryStore.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    await this._memoryStore.delete(memoryId, userId);

    // 从向量数据库删除
    if (this.vectorAdapter) {
      await this.vectorAdapter.delete(this.getCollectionName(userId), [memoryId]);
    }

    this.emit(MemorySystemEvent.MEMORY_DELETED, { memoryId, userId });
    this.log('debug', `记忆已删除: ${memoryId}`);
    return memory;
  }

  /**
   * 归档记忆
   */
  async archive(memoryId: string, userId: string): Promise<IMemory> {
    const memory = await this.update(memoryId, { isArchived: true }, userId);
    return memory;
  }

  /**
   * 恢复记忆
   */
  async unarchive(memoryId: string, userId: string): Promise<IMemory> {
    const memory = await this.update(memoryId, { isArchived: false }, userId);
    return memory;
  }

  /**
   * 巩固记忆 (短期→长期)
   */
  async consolidate(memoryId: string, userId: string): Promise<void> {
    this.ensureInitialized();
    
    const memory = await this._memoryStore.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }
    
    // 从当前层级迁移到更冷的层级
    const nextTier = TIER_TRANSITION_MAP[memory.tier];
    if (nextTier && nextTier !== memory.tier) {
      await this.migrate(memoryId, nextTier, userId);
    }
  }

  /**
   * 迁移记忆到指定层级
   */
  async migrateToTier(memoryId: string, targetTier: MemoryTier, userId: string): Promise<void> {
    this.ensureInitialized();
    await this.migrate(memoryId, targetTier, userId);
  }

  /**
   * 迁移记忆层级
   */
  async migrate(
    memoryId: string,
    targetTier: MemoryTier,
    userId: string
  ): Promise<IMemory> {
    this.ensureInitialized();

    const memory = await this._memoryStore.getById(memoryId, userId);
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }

    const sourceTier = memory.tier;
    
    // 执行迁移钩子
    await this.executeMigrationHooks(memory, sourceTier, targetTier);

    // 更新层级
    memory.tier = targetTier;
    await this._memoryStore.update(memory);

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
    return memory;
  }

  // ============== 语义检索 ==============
  private async retrieveSemantic(
    query: string,
    userId: string,
    limit: number,
    minScore: number
  ): Promise<IMemorySearchResult[]> {
    if (!this.vectorAdapter) {
      return [];
    }

    try {
      const queryEmbedding = await this.vectorAdapter.generateEmbedding(query);
      const searchResults = await this.vectorAdapter.search(
        this.getCollectionName(userId),
        queryEmbedding,
        { limit, score_threshold: minScore }
      );

      const results: IMemorySearchResult[] = [];
      for (const searchResult of searchResults) {
        const memory = await this._memoryStore.getById(searchResult.id, userId);
        if (memory) {
          results.push({
            memory,
            score: searchResult.score,
            matchType: 'semantic',
          });
        }
      }

      return results;
    } catch (error) {
      this.log('error', `语义检索失败: ${error}`);
      return [];
    }
  }

  /**
   * 关键词检索
   */
  private async retrieveKeyword(
    query: string,
    userId: string,
    limit: number,
    minScore: number
  ): Promise<IMemorySearchResult[]> {
    const memories = await this._memoryStore.getByUserId(userId);
    const queryLower = query.toLowerCase();
    
    const results: IMemorySearchResult[] = [];
    
    for (const memory of memories) {
      if (memory.isArchived) continue;
      
      const contentLower = memory.content.toLowerCase();
      const keywordScore = this.calculateKeywordScore(memory, query);
      
      if (keywordScore >= minScore) {
        results.push({
          memory,
          score: keywordScore,
          matchType: 'keyword',
        });
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * 混合检索
   */
  private async retrieveHybrid(
    query: string,
    userId: string,
    limit: number,
    minScore: number
  ): Promise<IMemorySearchResult[]> {
    // 并行执行语义和关键词检索
    const [semanticResults, keywordResults] = await Promise.all([
      this.retrieveSemantic(query, userId, limit * 2, 0),
      this.retrieveKeyword(query, userId, limit * 2, 0),
    ]);

    // 合并结果
    const scoreMap = new Map<string, IMemorySearchResult>();
    
    for (const result of semanticResults) {
      scoreMap.set(result.memory.id, {
        ...result,
        matchType: 'hybrid',
        score: result.score * 0.7, // 语义权重70%
      });
    }

    for (const result of keywordResults) {
      const existing = scoreMap.get(result.memory.id);
      if (existing) {
        existing.score = Math.max(existing.score, result.score * 0.3 + existing.score);
      } else {
        scoreMap.set(result.memory.id, {
          ...result,
          matchType: 'hybrid',
          score: result.score * 0.3, // 关键词权重30%
        });
      }
    }

    // 排序并返回
    return Array.from(scoreMap.values())
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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

    const memory = await this._memoryStore.getById(memoryId, userId);
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
    const sourceMemory = await this._memoryStore.getById(sourceId, userId);
    if (sourceMemory) {
      if (!sourceMemory.linkedMemoryIds) {
        sourceMemory.linkedMemoryIds = [];
      }
      if (!sourceMemory.linkedMemoryIds.includes(targetId)) {
        sourceMemory.linkedMemoryIds.push(targetId);
        await this._memoryStore.update(sourceMemory);
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
      const memory = await this._memoryStore.getById(id, userId);
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
    const userIds = await this._memoryStore.getAllUserIds();
    
    for (const userId of userIds) {
      const policy = this.getRetentionPolicy(userId);
      
      if (!policy.autoCleanupEnabled) {
        continue;
      }

      const cleaned = await this.pruner.prune(userId, policy);
      cleanedCount += cleaned.length;
    }

    // 执行清理钩子
    const cleanedMemories = await this._memoryStore.getRecentDeleted();
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
      ? await this._memoryStore.getByUserId(userId)
      : await this._memoryStore.getAll();

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
      ? await this._memoryStore.getByUserId(userId)
      : await this._memoryStore.getAll();

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

    // Include recall tracking stats if available
    const recallStats = await this.getRecallTrackingStats();

    return {
      userCount: userIds.size,
      totalMemories: memories.length,
      memoriesByTier,
      avgImportanceScore: memories.length > 0 ? totalImportance / memories.length : 0,
      totalLinks,
      lastCleanupTime: this.pruner.getLastCleanupTime(),
      storageSizeBytes: await this._memoryStore.getStorageSize(),
      recallTrackingStats: recallStats ? {
        totalRecalls: recallStats.totalRecalls,
        avgRelevanceScore: recallStats.avgScore,
        lastRecallTime: null,
      } : undefined,
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
  private async executeStoreHooks(memory: IMemory): Promise<IMemory> {
    for (const hook of this.memoryStoreHooks) {
      try {
        await hook(memory);
      } catch (error) {
        this.log('error', `存储钩子执行失败: ${error}`);
      }
    }
    return memory;
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
  ): Promise<IMemory> {
    for (const hook of this.memoryMigrationHooks) {
      try {
        await hook(memory, fromTier, toTier);
      } catch (error) {
        this.log('error', `迁移钩子执行失败: ${error}`);
      }
    }
    return memory;
  }

  /**
   * 执行清理钩子
   */
  private async executeCleanupHooks(cleanedMemories: IMemory[]): Promise<IMemory[]> {
    for (const hook of this.memoryCleanupHooks) {
      try {
        await hook(cleanedMemories);
      } catch (error) {
        this.log('error', `清理钩子执行失败: ${error}`);
      }
    }
    return cleanedMemories;
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

// Re-export enums and constants from interfaces
export {
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

// Recall Tracking exports
export * from './tracking';
