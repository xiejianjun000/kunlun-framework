/**
 * 记忆处理器
 * Memory Processor - 内容清洗/分块/去重
 */

import { IMemory } from '../interfaces';

export interface ProcessingResult {
  /** 处理后的内容 */
  content: string;
  /** 分块列表 */
  chunks: string[];
  /** 提取的关键词 */
  keywords: string[];
  /** 是否去重 */
  isDuplicate: boolean;
  /** 重复记忆ID */
  duplicateOf?: string;
}

export interface ProcessorConfig {
  /** 最大块大小 */
  maxChunkSize: number;
  /** 块重叠大小 */
  chunkOverlap: number;
  /** 最小内容长度 */
  minContentLength: number;
  /** 最大内容长度 */
  maxContentLength: number;
  /** 是否启用去重 */
  enableDeduplication: boolean;
  /** 相似度阈值 */
  similarityThreshold: number;
}

/**
 * 记忆处理器
 * 
 * 提供记忆内容的处理功能，包括清洗、分块和去重
 * 
 * @example
 * ```typescript
 * const processor = new MemoryProcessor();
 * const result = await processor.process(memory);
 * console.log(result.chunks); // 分块结果
 * ```
 */
export class MemoryProcessor {
  private config: ProcessorConfig;
  private recentMemories: Map<string, { content: string; userId: string; timestamp: Date }> = new Map();

  /**
   * 构造函数
   * @param config 处理配置
   */
  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = {
      maxChunkSize: 512,
      chunkOverlap: 50,
      minContentLength: 10,
      maxContentLength: 10000,
      enableDeduplication: true,
      similarityThreshold: 0.9,
      ...config,
    };
  }

  /**
   * 处理记忆
   * @param memory 记忆对象
   * @returns 处理结果
   */
  async process(memory: IMemory): Promise<IMemory> {
    // 1. 内容清洗
    let content = this.cleanContent(memory.content);

    // 2. 内容长度检查
    if (content.length < this.config.minContentLength) {
      content = this.padContent(content);
    } else if (content.length > this.config.maxContentLength) {
      content = this.truncateContent(content);
    }

    // 3. 分块
    const chunks = this.chunkContent(content);

    // 4. 关键词提取
    const keywords = this.extractKeywords(content);

    // 5. 更新记忆
    const processedMemory: IMemory = {
      ...memory,
      content,
      metadata: {
        ...memory.metadata,
        keywords,
        chunkCount: chunks.length,
        processedAt: new Date(),
      },
    };

    // 6. 去重检查
    if (this.config.enableDeduplication) {
      const duplicate = await this.findDuplicate(processedMemory);
      if (duplicate) {
        processedMemory.metadata.isDuplicate = true;
        processedMemory.metadata.duplicateOf = duplicate.id;
        processedMemory.metadata.originalId = memory.id;
      }
    }

    // 更新最近记忆缓存
    this.recentMemories.set(memory.id, {
      content,
      userId: memory.userId,
      timestamp: new Date(),
    });

    // 清理过期缓存（保留最近100条）
    if (this.recentMemories.size > 100) {
      const oldest = Array.from(this.recentMemories.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
        .slice(0, this.recentMemories.size - 100);
      for (const [id] of oldest) {
        this.recentMemories.delete(id);
      }
    }

    return processedMemory;
  }

  /**
   * 批量处理
   * @param memories 记忆列表
   * @returns 处理后的记忆列表
   */
  async processBatch(memories: IMemory[]): Promise<IMemory[]> {
    const results: IMemory[] = [];
    for (const memory of memories) {
      const processed = await this.process(memory);
      results.push(processed);
    }
    return results;
  }

  /**
   * 内容清洗
   */
  cleanContent(content: string): string {
    let cleaned = content;

    // 移除特殊字符（保留中文、英文、数字和基本标点）
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

    // 规范化空白字符
    cleaned = cleaned.replace(/\s+/g, ' ');

    // 规范化引号
    cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");

    // 移除多余空格
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
    cleaned = cleaned.replace(/([.,!?;:])\s+/g, '$1 ');

    // 首尾去空白
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * 分块处理
   */
  chunkContent(content: string): string[] {
    if (content.length <= this.config.maxChunkSize) {
      return [content];
    }

    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(content);

    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.config.maxChunkSize) {
        currentChunk += sentence + ' ';
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        // 保持重叠
        if (this.config.chunkOverlap > 0 && chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const words = lastChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(this.config.chunkOverlap / 5));
          currentChunk = overlapWords.join(' ') + ' ' + sentence + ' ';
        } else {
          currentChunk = sentence + ' ';
        }
      }
    }

    // 添加最后一个块
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 提取关键词
   */
  extractKeywords(content: string): string[] {
    const stopWords = new Set([
      '的', '了', '和', '是', '在', '我', '有', '个', '人', '这',
      '不', '也', '就', '都', '要', '会', '可以', '能', '到', '说',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'that', 'with', 'for', 'this', 'but', 'not', 'you', 'all',
    ]);

    // 简单分词
    const words = content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 2 && !stopWords.has(word));

    // 词频统计
    const freq: Map<string, number> = new Map();
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }

    // 排序并返回前10个
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 查找重复
   */
  private async findDuplicate(memory: IMemory): Promise<{ id: string; similarity: number } | null> {
    const contentLower = memory.content.toLowerCase();

    for (const [id, cached] of this.recentMemories.entries()) {
      // 同一用户才比较
      if (cached.userId !== memory.userId) {
        continue;
      }

      // 时间检查（5分钟内）
      const timeDiff = Math.abs(new Date().getTime() - cached.timestamp.getTime());
      if (timeDiff > 5 * 60 * 1000) {
        continue;
      }

      // 计算相似度
      const similarity = this.calculateSimilarity(contentLower, cached.content.toLowerCase());
      if (similarity >= this.config.similarityThreshold) {
        return { id, similarity };
      }
    }

    return null;
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Jaccard相似度
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 填充内容
   */
  private padContent(content: string): string {
    return content.padEnd(this.config.minContentLength, ' ');
  }

  /**
   * 截断内容
   */
  private truncateContent(content: string): string {
    return content.slice(0, this.config.maxContentLength);
  }

  /**
   * 分割句子
   */
  private splitIntoSentences(content: string): string[] {
    // 简单句子分割（中文句号、英文句号、问号、感叹号）
    const sentences = content
      .split(/(?<=[。.!?])\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // 如果分割后仍超过块大小，再次分割
    const result: string[] = [];
    for (const sentence of sentences) {
      if (sentence.length <= this.config.maxChunkSize) {
        result.push(sentence);
      } else {
        // 按逗号分割
        const parts = sentence.split(/(?<=，,)\s*/);
        let current = '';
        for (const part of parts) {
          if (current.length + part.length <= this.config.maxChunkSize) {
            current += part;
          } else {
            if (current) result.push(current);
            current = part;
          }
        }
        if (current) result.push(current);
      }
    }

    return result;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.recentMemories.clear();
  }
}
