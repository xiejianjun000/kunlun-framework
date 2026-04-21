import {
  IMemorySystem,
  MemoryEntry,
  MemoryTier,
  MemorySearchResult,
  PromotionResult,
  MemorySystemConfig
} from './interfaces/IMemorySystem';
import { DeterminismSystem } from '../determinism/DeterminismSystem';
import { calculateSemanticSimilarity } from './embeddings';
import { hybridSearch } from './hybrid-search';

/**
 * OpenTaiji 记忆系统核心实现
 * 基于 OpenClaw Memory Core 架构移植
 * 与 WFGY 防幻觉系统深度集成
 */
export class MemorySystem implements IMemorySystem {
  public readonly name: string = 'MemorySystem';
  public readonly version: string = '1.0.0';

  /** 瞬时记忆缓存 */
  private ephemeralMemory: Map<string, MemoryEntry> = new Map();
  /** 短期记忆缓存 */
  private shortTermMemory: Map<string, MemoryEntry> = new Map();
  /** 长期记忆缓存 */
  private longTermMemory: Map<string, MemoryEntry> = new Map();
  /** 倒排索引：关键词 -> 记忆ID集合 */
  private invertedIndex: Map<string, Set<string>> = new Map();

  private config: Required<MemorySystemConfig>;
  private wfgySystem: DeterminismSystem | null = null;
  private ready: boolean = false;
  private lastPromotionAt: string = '';

  constructor(config?: MemorySystemConfig) {
    this.config = {
      shortTermMaxSize: config?.shortTermMaxSize ?? 1000,
      longTermMaxSize: config?.longTermMaxSize ?? 10000,
      promotionThreshold: config?.promotionThreshold ?? 0.7,
      importanceWeight: config?.importanceWeight ?? 0.5,
      recencyWeight: config?.recencyWeight ?? 0.3,
      relevanceWeight: config?.relevanceWeight ?? 0.2,
      dreamThresholdCount: config?.dreamThresholdCount ?? 50,
      autoPromotionInterval: config?.autoPromotionInterval ?? 3600000,
      embedding: {
        enabled: config?.embedding?.enabled ?? true,
        model: config?.embedding?.model ?? 'local',
        dimensions: config?.embedding?.dimensions ?? 1536
      },
      wfgyIntegration: {
        enabled: config?.wfgyIntegration?.enabled ?? true,
        verifyBeforePromotion: config?.wfgyIntegration?.verifyBeforePromotion ?? true,
        autoFilterHighRisk: config?.wfgyIntegration?.autoFilterHighRisk ?? true,
        riskThreshold: config?.wfgyIntegration?.riskThreshold ?? 0.8
      }
    };
    this.ready = true;
  }

  /**
   * 注入 WFGY 确定性系统实例
   * 实现深度集成：记忆晋升前自动进行幻觉检测
   */
  setDeterminismSystem(system: DeterminismSystem): void {
    this.wfgySystem = system;
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * 生成唯一记忆ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 更新倒排索引
   */
  private updateInvertedIndex(entry: MemoryEntry, isRemove: boolean = false): void {
    const keywords = entry.keywords || this.extractKeywords(entry.content);
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (!this.invertedIndex.has(lowerKeyword)) {
        if (isRemove) continue;
        this.invertedIndex.set(lowerKeyword, new Set());
      }
      const idSet = this.invertedIndex.get(lowerKeyword)!;
      if (isRemove) {
        idSet.delete(entry.id);
        if (idSet.size === 0) {
          this.invertedIndex.delete(lowerKeyword);
        }
      } else {
        idSet.add(entry.id);
      }
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        if (/[\u4e00-\u9fa5]/.test(word)) {
          return word.length >= 1;
        }
        return word.length > 2;
      })
      .slice(0, 50);
  }

  /**
   * 计算记忆综合评分
   */
  private calculateCombinedScore(entry: MemoryEntry): number {
    const importance = entry.importance ?? 0.5;
    const recency = entry.recency ?? 0.5;
    const relevance = entry.relevance ?? 0.5;

    return (
      importance * this.config.importanceWeight +
      recency * this.config.recencyWeight +
      relevance * this.config.relevanceWeight
    );
  }

  async add(
    entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = this.generateId();

    const memoryEntry: MemoryEntry = {
      id,
      content: entry.content,
      tier: entry.tier ?? MemoryTier.SHORT_TERM,
      source: entry.source,
      importance: entry.importance ?? 0.5,
      recency: 1.0,
      relevance: entry.relevance ?? 0.5,
      score: 0,
      accessCount: 0,
      createdAt: now,
      lastAccessedAt: now,
      entities: entry.entities ?? [],
      keywords: entry.keywords ?? this.extractKeywords(entry.content),
      embedding: entry.embedding,
      wfgyVerified: false,
      hallucinationRisk: entry.hallucinationRisk,
      claimIds: entry.claimIds ?? []
    };

    // 计算综合评分
    memoryEntry.score = this.calculateCombinedScore(memoryEntry);

    // 根据层级存入对应存储
    switch (memoryEntry.tier) {
      case MemoryTier.EPHEMERAL:
        this.ephemeralMemory.set(id, memoryEntry);
        break;
      case MemoryTier.SHORT_TERM:
        this.shortTermMemory.set(id, memoryEntry);
        break;
      case MemoryTier.LONG_TERM:
      case MemoryTier.PERMANENT:
        this.longTermMemory.set(id, memoryEntry);
        break;
    }

    // 更新倒排索引
    this.updateInvertedIndex(memoryEntry);

    return id;
  }

  async addBatch(
    entries: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>[]
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const entry of entries) {
      const id = await this.add(entry);
      ids.push(id);
    }
    return ids;
  }

  async search(
    query: string,
    tier?: MemoryTier,
    limit: number = 10
  ): Promise<MemorySearchResult> {
    const startTime = Date.now();

    // 获取候选记忆池
    let candidates: MemoryEntry[] = [];
    if (tier) {
      switch (tier) {
        case MemoryTier.EPHEMERAL:
          candidates = Array.from(this.ephemeralMemory.values());
          break;
        case MemoryTier.SHORT_TERM:
          candidates = Array.from(this.shortTermMemory.values());
          break;
        case MemoryTier.LONG_TERM:
        case MemoryTier.PERMANENT:
          candidates = Array.from(this.longTermMemory.values());
          break;
      }
    } else {
      // 搜索所有层级
      candidates = [
        ...Array.from(this.ephemeralMemory.values()),
        ...Array.from(this.shortTermMemory.values()),
        ...Array.from(this.longTermMemory.values())
      ];
    }

    if (candidates.length === 0) {
      return {
        entries: [],
        latency: Date.now() - startTime,
        semanticScores: [],
        keywordScores: [],
        combinedScores: []
      };
    }

    // 使用混合检索
    const queryKeywords = this.extractKeywords(query);
    const results = hybridSearch(query, queryKeywords, candidates, this.invertedIndex);

    // 更新访问时间和计数
    for (const entry of results.entries) {
      entry.lastAccessedAt = new Date().toISOString();
      entry.accessCount++;
    }

    return {
      ...results,
      latency: Date.now() - startTime
    };
  }

  async get(id: string): Promise<MemoryEntry | null> {
    // 在所有层级查找
    for (const memoryMap of [this.ephemeralMemory, this.shortTermMemory, this.longTermMemory]) {
      const entry = memoryMap.get(id);
      if (entry) {
        entry.lastAccessedAt = new Date().toISOString();
        entry.accessCount++;
        return entry;
      }
    }
    return null;
  }

  async updateScore(
    id: string,
    scores: { importance?: number; recency?: number; relevance?: number }
  ): Promise<boolean> {
    for (const memoryMap of [this.ephemeralMemory, this.shortTermMemory, this.longTermMemory]) {
      const entry = memoryMap.get(id);
      if (entry) {
        if (scores.importance !== undefined) {
          entry.importance = scores.importance;
        }
        if (scores.recency !== undefined) {
          entry.recency = scores.recency;
        }
        if (scores.relevance !== undefined) {
          entry.relevance = scores.relevance;
        }
        entry.score = this.calculateCombinedScore(entry);
        return true;
      }
    }
    return false;
  }

  /**
   * 执行记忆晋升 - 核心方法
   * 将短期记忆中高质量条目晋升到长期记忆
   * 与 WFGY 系统深度集成：晋升前进行幻觉风险检测
   */
  async promote(): Promise<PromotionResult> {
    const shortTermEntries = Array.from(this.shortTermMemory.values());

    // 按综合评分排序
    const sortedEntries = shortTermEntries
      .map(entry => ({
        ...entry,
        score: this.calculateCombinedScore(entry)
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const promoted: PromotionResult['promoted'] = [];
    const now = new Date().toISOString();

    for (const entry of sortedEntries) {
      // 检查是否达到晋升阈值
      if ((entry.score ?? 0) < this.config.promotionThreshold) {
        continue;
      }

      // WFGY 深度集成：晋升前进行幻觉风险检测
      if (this.config.wfgyIntegration.enabled && this.wfgySystem) {
        try {
          const wfgyResult = await this.wfgySystem.verify(entry.content);

          // 标记 WFGY 验证状态
          entry.wfgyVerified = wfgyResult.verified;
          entry.hallucinationRisk = wfgyResult.hallucinationRisk ?? 0;

          // 高风险记忆自动过滤
          if (this.config.wfgyIntegration.autoFilterHighRisk &&
              (entry.hallucinationRisk ?? 0) > this.config.wfgyIntegration.riskThreshold) {
            // 不晋升，保留在短期记忆但标记为高风险
            continue;
          }
        } catch (error) {
          // WFGY 验证失败不阻断晋升，只是标记为未验证
          entry.wfgyVerified = false;
        }
      }

      // 执行晋升
      entry.tier = MemoryTier.LONG_TERM;
      entry.lastAccessedAt = now;

      // 从短期记忆移除，添加到长期记忆
      this.shortTermMemory.delete(entry.id);
      this.longTermMemory.set(entry.id, entry as MemoryEntry);

      promoted.push({
        id: entry.id,
        fromTier: MemoryTier.SHORT_TERM,
        toTier: MemoryTier.LONG_TERM,
        reason: `综合评分 ${(entry.score ?? 0).toFixed(3)} >= 阈值 ${this.config.promotionThreshold}` +
                (entry.wfgyVerified ? '，WFGY 验证通过' : '')
      });
    }

    this.lastPromotionAt = now;

    // 检查是否达到触发梦境的阈值
    const longTermCount = this.longTermMemory.size;
    const triggerDreaming = longTermCount >= this.config.dreamThresholdCount;

    return {
      promotedCount: promoted.length,
      filteredCount: sortedEntries.length - promoted.length,
      promoted,
      triggerDreaming,
      dreamTriggerReason: triggerDreaming
        ? `长期记忆数量 (${longTermCount}) 达到梦境触发阈值 (${this.config.dreamThresholdCount})`
        : undefined
    };
  }

  async count(tier?: MemoryTier): Promise<number> {
    if (tier) {
      switch (tier) {
        case MemoryTier.EPHEMERAL:
          return this.ephemeralMemory.size;
        case MemoryTier.SHORT_TERM:
          return this.shortTermMemory.size;
        case MemoryTier.LONG_TERM:
        case MemoryTier.PERMANENT:
          return this.longTermMemory.size;
      }
    }
    return this.ephemeralMemory.size + this.shortTermMemory.size + this.longTermMemory.size;
  }

  async delete(id: string): Promise<boolean> {
    for (const memoryMap of [this.ephemeralMemory, this.shortTermMemory, this.longTermMemory]) {
      const entry = memoryMap.get(id);
      if (entry) {
        this.updateInvertedIndex(entry, true);
        memoryMap.delete(id);
        return true;
      }
    }
    return false;
  }

  async clear(tier: MemoryTier): Promise<void> {
    let targetMap: Map<string, MemoryEntry>;
    switch (tier) {
      case MemoryTier.EPHEMERAL:
        targetMap = this.ephemeralMemory;
        break;
      case MemoryTier.SHORT_TERM:
        targetMap = this.shortTermMemory;
        break;
      case MemoryTier.LONG_TERM:
      case MemoryTier.PERMANENT:
        targetMap = this.longTermMemory;
        break;
      default:
        return;
    }

    // 清理倒排索引
    for (const entry of targetMap.values()) {
      this.updateInvertedIndex(entry, true);
    }
    targetMap.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    ephemeralCount: number;
    shortTermCount: number;
    longTermCount: number;
    lastPromotionAt: string;
    invertedIndexSize: number;
  } {
    return {
      ephemeralCount: this.ephemeralMemory.size,
      shortTermCount: this.shortTermMemory.size,
      longTermCount: this.longTermMemory.size,
      lastPromotionAt: this.lastPromotionAt,
      invertedIndexSize: this.invertedIndex.size
    };
  }
}
