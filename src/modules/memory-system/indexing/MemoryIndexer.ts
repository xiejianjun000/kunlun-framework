/**
 * 记忆索引器
 * Memory Indexer - 向量化 + 关键词索引
 */

import { IMemory, MemoryTier } from '../interfaces';

export interface IndexEntry {
  memoryId: string;
  keywords: string[];
  topics: string[];
  entities: string[];
  embeddings: number[];
  tier: MemoryTier;
  createdAt: Date;
}

/**
 * 记忆索引器
 * 
 * 提供记忆的索引功能，支持关键词、主题、实体等多维度索引
 * 
 * @example
 * ```typescript
 * const indexer = new MemoryIndexer();
 * 
 * await indexer.index(memory);
 * const results = await indexer.searchByKeyword('安装');
 * const relatedMemories = await indexer.findRelated(memory.id);
 * ```
 */
export class MemoryIndexer {
  // 内存索引存储
  private keywordIndex: Map<string, Set<string>> = new Map();
  private topicIndex: Map<string, Set<string>> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map();
  private memoryIndex: Map<string, IndexEntry> = new Map();

  // 停用词列表
  private readonly stopWords: Set<string> = new Set([
    '的', '了', '和', '是', '在', '我', '有', '个', '人', '这',
    '不', '也', '就', '都', '要', '会', '可以', '能', '到', '说',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  ]);

  /**
   * 索引记忆
   * @param memory 记忆对象
   */
  async index(memory: IMemory): Promise<void> {
    // 提取关键词
    const keywords = this.extractKeywords(memory.content);
    
    // 提取主题
    const topics = this.extractTopics(memory.content);
    
    // 提取实体
    const entities = this.extractEntities(memory.content);

    // 创建索引条目
    const entry: IndexEntry = {
      memoryId: memory.id,
      keywords,
      topics,
      entities,
      embeddings: memory.embedding ?? [],
      tier: memory.tier,
      createdAt: memory.createdAt,
    };

    // 存储条目
    this.memoryIndex.set(memory.id, entry);

    // 更新关键词索引
    for (const keyword of keywords) {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set());
      }
      this.keywordIndex.get(keyword)!.add(memory.id);
    }

    // 更新主题索引
    for (const topic of topics) {
      if (!this.topicIndex.has(topic)) {
        this.topicIndex.set(topic, new Set());
      }
      this.topicIndex.get(topic)!.add(memory.id);
    }

    // 更新实体索引
    for (const entity of entities) {
      if (!this.entityIndex.has(entity)) {
        this.entityIndex.set(entity, new Set());
      }
      this.entityIndex.get(entity)!.add(memory.id);
    }
  }

  /**
   * 移除索引
   * @param memoryId 记忆ID
   */
  async remove(memoryId: string): Promise<void> {
    const entry = this.memoryIndex.get(memoryId);
    if (!entry) {
      return;
    }

    // 从各索引中移除
    for (const keyword of entry.keywords) {
      this.keywordIndex.get(keyword)?.delete(memoryId);
    }
    for (const topic of entry.topics) {
      this.topicIndex.get(topic)?.delete(memoryId);
    }
    for (const entity of entry.entities) {
      this.entityIndex.get(entity)?.delete(memoryId);
    }

    // 移除条目
    this.memoryIndex.delete(memoryId);
  }

  /**
   * 搜索相关记忆
   * @param memoryId 记忆ID
   * @param limit 结果数量
   * @returns 相关的记忆ID列表
   */
  async findRelated(memoryId: string, limit: number = 10): Promise<string[]> {
    const entry = this.memoryIndex.get(memoryId);
    if (!entry) {
      return [];
    }

    // 收集所有相关记忆ID及其分数
    const scores: Map<string, number> = new Map();

    // 关键词匹配
    for (const keyword of entry.keywords) {
      const related = this.keywordIndex.get(keyword);
      if (related) {
        for (const id of related) {
          if (id !== memoryId) {
            scores.set(id, (scores.get(id) ?? 0) + 1);
          }
        }
      }
    }

    // 主题匹配
    for (const topic of entry.topics) {
      const related = this.topicIndex.get(topic);
      if (related) {
        for (const id of related) {
          if (id !== memoryId) {
            scores.set(id, (scores.get(id) ?? 0) + 2);
          }
        }
      }
    }

    // 实体匹配
    for (const entity of entry.entities) {
      const related = this.entityIndex.get(entity);
      if (related) {
        for (const id of related) {
          if (id !== memoryId) {
            scores.set(id, (scores.get(id) ?? 0) + 3);
          }
        }
      }
    }

    // 排序并返回
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([id]) => id);
  }

  /**
   * 按关键词搜索
   * @param keyword 关键词
   * @param limit 结果数量
   * @returns 记忆ID列表
   */
  searchByKeyword(keyword: string, limit: number = 10): string[] {
    const memoryIds = this.keywordIndex.get(keyword.toLowerCase());
    if (!memoryIds) {
      return [];
    }
    return Array.from(memoryIds).slice(0, limit);
  }

  /**
   * 按主题搜索
   * @param topic 主题
   * @param limit 结果数量
   * @returns 记忆ID列表
   */
  searchByTopic(topic: string, limit: number = 10): string[] {
    const memoryIds = this.topicIndex.get(topic.toLowerCase());
    if (!memoryIds) {
      return [];
    }
    return Array.from(memoryIds).slice(0, limit);
  }

  /**
   * 按实体搜索
   * @param entity 实体
   * @param limit 结果数量
   * @returns 记忆ID列表
   */
  searchByEntity(entity: string, limit: number = 10): string[] {
    const memoryIds = this.entityIndex.get(entity.toLowerCase());
    if (!memoryIds) {
      return [];
    }
    return Array.from(memoryIds).slice(0, limit);
  }

  /**
   * 多维度搜索
   * @param query 查询文本
   * @param limit 结果数量
   * @returns 记忆ID列表及匹配分数
   */
  searchMultiDimensional(query: string, limit: number = 10): Array<{ id: string; score: number }> {
    const queryKeywords = this.extractKeywords(query);
    const queryTopics = this.extractTopics(query);
    const queryEntities = this.extractEntities(query);

    const scores: Map<string, number> = new Map();

    // 关键词匹配
    for (const keyword of queryKeywords) {
      const related = this.keywordIndex.get(keyword);
      if (related) {
        for (const id of related) {
          scores.set(id, (scores.get(id) ?? 0) + 1);
        }
      }
    }

    // 主题匹配
    for (const topic of queryTopics) {
      const related = this.topicIndex.get(topic);
      if (related) {
        for (const id of related) {
          scores.set(id, (scores.get(id) ?? 0) + 2);
        }
      }
    }

    // 实体匹配
    for (const entity of queryEntities) {
      const related = this.entityIndex.get(entity);
      if (related) {
        for (const id of related) {
          scores.set(id, (scores.get(id) ?? 0) + 3);
        }
      }
    }

    // 排序并返回
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => ({ id, score }));
  }

  /**
   * 获取索引统计
   */
  getStats(): {
    totalMemories: number;
    keywordCount: number;
    topicCount: number;
    entityCount: number;
  } {
    return {
      totalMemories: this.memoryIndex.size,
      keywordCount: this.keywordIndex.size,
      topicCount: this.topicIndex.size,
      entityCount: this.entityIndex.size,
    };
  }

  /**
   * 清除所有索引
   */
  clear(): void {
    this.keywordIndex.clear();
    this.topicIndex.clear();
    this.entityIndex.clear();
    this.memoryIndex.clear();
  }

  // ============== 私有方法 ==============

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简单的中文分词（基于字符和常见词组）
    const words = content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .filter(word => !this.stopWords.has(word));

    // 去重
    return [...new Set(words)];
  }

  /**
   * 提取主题
   */
  private extractTopics(content: string): string[] {
    // 简单的主题提取（基于关键词匹配）
    const topics: string[] = [];
    const contentLower = content.toLowerCase();

    // 常见主题关键词
    const topicPatterns: Record<string, string[]> = {
      '编程': ['编程', '代码', '开发', '程序', 'function', 'class', '编程'],
      '学习': ['学习', '教程', '课程', '学习', 'study', 'learn', '教程'],
      '工作': ['工作', '项目', '任务', '会议', 'work', 'project', 'task'],
      '生活': ['生活', '日常', '爱好', 'life', 'daily', 'hobby'],
      '技术': ['技术', '系统', '架构', 'technology', 'system', 'tech'],
      '安装': ['安装', '配置', 'setup', 'install', '配置'],
      '问题': ['问题', '错误', 'bug', 'issue', 'error', '解决'],
    };

    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          topics.push(topic);
          break;
        }
      }
    }

    return [...new Set(topics)];
  }

  /**
   * 提取实体（简化版本）
   */
  private extractEntities(content: string): string[] {
    const entities: string[] = [];

    // 提取邮箱
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = content.match(emailRegex);
    if (emails) {
      entities.push(...emails);
    }

    // 提取URL
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex);
    if (urls) {
      entities.push(...urls);
    }

    // 提取@提及
    const mentionRegex = /@[\w]+/g;
    const mentions = content.match(mentionRegex);
    if (mentions) {
      entities.push(...mentions);
    }

    // 提取#标签
    const tagRegex = /#[\w]+/g;
    const tags = content.match(tagRegex);
    if (tags) {
      entities.push(...tags);
    }

    return entities;
  }
}
