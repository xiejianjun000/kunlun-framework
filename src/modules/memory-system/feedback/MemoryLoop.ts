/**
 * 记忆循环核心类
 * Memory Loop - Q&A → Markdown → Graph Enrichment
 * 
 * 实现闭环学习：每次对话都能丰富知识库
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryRecord,
  ExtractedKnowledge,
  KnowledgeRelation,
  MemoryLoopConfig,
  GraphInjector,
  MarkdownFormatOptions,
  MemoryLoopStats,
} from './types';

/**
 * Markdown 格式化默认选项
 */
const DEFAULT_MARKDOWN_OPTIONS: MarkdownFormatOptions = {
  includeTimestamp: true,
  includeMetadata: true,
  includeRelatedNodes: true,
  tagPrefix: 'taiji-memory',
};

/**
 * 记忆循环核心类
 * 
 * 实现 Q&A → Markdown → 反哺图谱的闭环学习
 * 
 * @example
 * ```typescript
 * const loop = new MemoryLoop({
 *   memoryDir: './.taiji-memory',
 *   autoEnrichGraph: true,
 *   graphInjector: myGraphInjector
 * });
 * 
 * // 保存 Q&A 记录
 * await loop.saveQARecord(
 *   '什么是闭包？',
 *   '闭包是...',
 *   ['closure', 'javascript']
 * );
 * 
 * // 列出所有记忆
 * const memories = await loop.listMemories();
 * 
 * // 解析并注入图谱
 * const knowledge = await loop.parseMemoryFile(memories[0].path);
 * await loop.enrichGraph(knowledge);
 * ```
 */
export class MemoryLoop {
  private readonly config: MemoryLoopConfig;
  private readonly markdownOptions: MarkdownFormatOptions;
  private stats: MemoryLoopStats;

  /**
   * 构造函数
   * @param config 记忆循环配置
   */
  constructor(config: Partial<MemoryLoopConfig> = {}) {
    this.config = {
      memoryDir: '.taiji-memory',
      fileExtension: '.md',
      autoEnrichGraph: true,
      confidenceThreshold: 0.6,
      ...config,
    };
    this.markdownOptions = { ...DEFAULT_MARKDOWN_OPTIONS };
    this.stats = {
      totalRecords: 0,
      sessionRecords: 0,
      graphUpdates: 0,
      lastUpdateTime: Date.now(),
    };
  }

  /**
   * 初始化记忆目录
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.config.memoryDir, { recursive: true });
    await fs.mkdir(path.join(this.config.memoryDir, 'archive'), { recursive: true });
    console.log(`[MemoryLoop] 初始化完成: ${this.config.memoryDir}`);
    await this.refreshStats();
  }

  /**
   * 保存 Q&A 结果为 Markdown
   * 
   * @param question 问题
   * @param answer 答案
   * @param nodes 关联的图节点（可选）
   * @returns 保存的文件路径
   */
  async saveQARecord(
    question: string,
    answer: string,
    nodes?: string[]
  ): Promise<string> {
    const timestamp = Date.now();
    const id = uuidv4();
    const filename = this.generateFilename(question, timestamp);
    const filePath = path.join(this.config.memoryDir, filename);

    const markdown = this.formatAsMarkdown({
      path: filePath,
      question,
      answer,
      type: this.inferType(question, answer),
      timestamp,
      relatedNodes: nodes || [],
    });

    await fs.writeFile(filePath, markdown, 'utf-8');
    
    this.stats.sessionRecords++;
    this.stats.lastUpdateTime = timestamp;

    console.log(`[MemoryLoop] 保存 Q&A 记录: ${filePath}`);

    return filePath;
  }

  /**
   * 列出所有记忆文件
   * 
   * @param options 过滤选项
   * @returns 记忆记录列表
   */
  async listMemories(options?: {
    type?: string;
    since?: number;
    limit?: number;
  }): Promise<MemoryRecord[]> {
    const memories: MemoryRecord[] = [];
    
    try {
      const files = await fs.readdir(this.config.memoryDir);
      
      for (const file of files) {
        if (!file.endsWith(this.config.fileExtension) || file === 'index.json') {
          continue;
        }

        const filePath = path.join(this.config.memoryDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          continue;
        }

        const record = await this.parseMemoryFile(filePath);
        
        // 应用过滤
        if (options?.type && record.type !== options.type) {
          continue;
        }
        if (options?.since && record.timestamp < options.since) {
          continue;
        }

        memories.push(record);
      }

      // 按时间倒序排序
      memories.sort((a, b) => b.timestamp - a.timestamp);

      // 应用限制
      if (options?.limit) {
        return memories.slice(0, options.limit);
      }

      return memories;
    } catch (error) {
      console.error('[MemoryLoop] 列出记忆失败:', error);
      return [];
    }
  }

  /**
   * 解析 Markdown 文件并提取知识点
   * 
   * @param filePath 文件路径
   * @returns 提取的知识结构
   */
  async parseMemoryFile(filePath: string): Promise<MemoryRecord> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 解析 Markdown 元数据
    const frontMatter = this.parseFrontMatter(content);
    const body = this.parseBody(content);
    
    return {
      path: filePath,
      question: (frontMatter.question as string) || body.question || '',
      type: (frontMatter.type as string) || 'general',
      timestamp: (frontMatter.timestamp as number) || Date.now(),
      relatedNodes: (frontMatter.relatedNodes as string[]) || [],
      answer: body.answer,
      metadata: frontMatter.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * 将知识点注入图存储
   * 
   * @param knowledge 提取的知识结构
   * @returns 是否成功
   */
  async enrichGraph(knowledge: ExtractedKnowledge): Promise<void> {
    if (!this.config.graphInjector) {
      console.warn('[MemoryLoop] 未配置图注入器，跳过图谱更新');
      return;
    }

    if (knowledge.confidence < this.config.confidenceThreshold) {
      console.log(`[MemoryLoop] 置信度 ${knowledge.confidence} 低于阈值，跳过`);
      return;
    }

    try {
      // 注入节点
      await this.config.graphInjector.injectNodes(knowledge.concepts);
      
      // 注入关系
      await this.config.graphInjector.injectRelations(knowledge.relations);
      
      this.stats.graphUpdates++;
      this.stats.lastUpdateTime = Date.now();

      console.log(`[MemoryLoop] 图谱更新成功: ${knowledge.concepts.length} 节点, ${knowledge.relations.length} 关系`);
    } catch (error) {
      console.error('[MemoryLoop] 图谱更新失败:', error);
      throw error;
    }
  }

  /**
   * 提取知识点（从记忆记录）
   * 
   * @param record 记忆记录
   * @returns 提取的知识结构
   */
  extractKnowledge(record: MemoryRecord): ExtractedKnowledge {
    // 提取概念
    const concepts = this.extractConcepts(record.question, record.answer || '');
    
    // 提取关系
    const relations = this.extractRelations(record.question, record.answer || '', concepts);
    
    // 计算置信度
    const confidence = this.calculateConfidence(record, concepts, relations);

    return {
      concepts,
      relations,
      confidence,
      source: record.path,
      extractedAt: Date.now(),
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): MemoryLoopStats {
    return { ...this.stats };
  }

  /**
   * 刷新统计信息
   */
  async refreshStats(): Promise<void> {
    const memories = await this.listMemories();
    this.stats.totalRecords = memories.length;
  }

  // ============== 私有方法 ==============

  /**
   * 生成文件名
   */
  private generateFilename(question: string, timestamp: number): string {
    const slug = question
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .substring(0, 50)
      .replace(/-+/g, '-');
    
    const date = new Date(timestamp).toISOString().split('T')[0];
    return `${date}-${slug}-${timestamp}.md`;
  }

  /**
   * 格式化 Markdown
   */
  private formatAsMarkdown(record: MemoryRecord): string {
    const lines: string[] = [];

    // Front Matter
    lines.push('---');
    lines.push(`id: ${path.basename(record.path, '.md')}`);
    lines.push(`question: "${record.question.replace(/"/g, '\\"')}"`);
    lines.push(`type: ${record.type}`);
    lines.push(`timestamp: ${record.timestamp}`);
    
    if (this.markdownOptions.includeRelatedNodes && record.relatedNodes.length > 0) {
      lines.push(`relatedNodes:`);
      record.relatedNodes.forEach(node => lines.push(`  - ${node}`));
    }

    if (this.markdownOptions.includeMetadata) {
      lines.push(`tags:`);
      lines.push(`  - ${this.markdownOptions.tagPrefix}`);
      lines.push(`  - ${record.type}`);
    }
    
    lines.push('---');
    lines.push('');

    // 内容
    lines.push(`# ${record.question}`);
    lines.push('');
    lines.push(record.answer || '');
    lines.push('');

    // 底部元数据
    lines.push('---');
    lines.push('');
    lines.push(`> 💡 记忆于 ${new Date(record.timestamp).toLocaleString('zh-CN')} 自动保存`);
    
    if (record.relatedNodes.length > 0) {
      lines.push(`> 🔗 关联节点: ${record.relatedNodes.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * 解析 Front Matter
   */
  private parseFrontMatter(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!match) {
      return result;
    }

    const lines = match[1].split('\n');
    let currentKey: string | null = null;
    let isArray = false;
    let arrayValues: string[] = [];

    for (const line of lines) {
      const kvMatch = line.match(/^(\w+):\s*(.*)$/);
      
      if (kvMatch) {
        if (currentKey && isArray) {
          result[currentKey] = arrayValues;
        }
        
        currentKey = kvMatch[1];
        const value = kvMatch[2].trim();
        
        if (value === '' || value === '[]') {
          isArray = true;
          arrayValues = [];
        } else if (value.startsWith('"') && value.endsWith('"')) {
          result[currentKey] = value.slice(1, -1);
          currentKey = null;
        } else {
          result[currentKey] = value;
          currentKey = null;
        }
      } else if (line.trim().startsWith('-') && currentKey) {
        const item = line.trim().substring(1).trim();
        if (item) {
          arrayValues.push(item);
        }
      }
    }

    if (currentKey && isArray) {
      result[currentKey] = arrayValues;
    }

    return result;
  }

  /**
   * 解析正文
   */
  private parseBody(content: string): { question?: string; answer?: string } {
    const match = content.match(/^#\s+(.+?)\n\n([\s\S]*?)(?=\n---$)/);
    
    if (match) {
      return {
        question: match[1],
        answer: match[2].trim(),
      };
    }

    return {};
  }

  /**
   * 推断类型
   */
  private inferType(question: string, answer: string): string {
    const text = `${question} ${answer}`.toLowerCase();
    
    if (text.includes('如何') || text.includes('步骤') || text.includes('方法')) {
      return 'tutorial';
    }
    if (text.includes('为什么') || text.includes('原因') || text.includes('原理')) {
      return 'explanation';
    }
    if (text.includes('是什么') || text.includes('定义')) {
      return 'definition';
    }
    if (text.includes('比较') || text.includes('区别') || text.includes('对比')) {
      return 'comparison';
    }
    
    return 'general';
  }

  /**
   * 提取概念
   */
  private extractConcepts(question: string, answer: string): string[] {
    const text = `${question} ${answer}`;
    const concepts = new Set<string>();
    
    // 提取技术术语模式
    const patterns = [
      /[A-Z][a-z]+(?:\w+)*(?:[A-Z]\w*)*/g,  // CamelCase
      /[a-z]+[-_][a-z]+/gi,                  // snake_case, kebab-case
      /[\u4e00-\u9fa5]{2,}(?:技术|方法|模式|原理|机制|系统)/g,  // 中文术语
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          if (m.length > 2) {
            concepts.add(m);
          }
        });
      }
    }

    return Array.from(concepts).slice(0, 20);
  }

  /**
   * 提取关系
   */
  private extractRelations(
    question: string,
    answer: string,
    concepts: string[]
  ): KnowledgeRelation[] {
    const relations: KnowledgeRelation[] = [];
    const text = `${question} ${answer}`.toLowerCase();

    // 基于上下文的因果关系
    const causalPatterns = [
      { pattern: /(\w+)\s+(?:导致|引起|产生|造成)\s+(\w+)/g, type: 'causes' },
      { pattern: /(\w+)\s+(?:依赖|基于|使用|采用)\s+(\w+)/g, type: 'depends_on' },
      { pattern: /(\w+)\s+(?:包含|包括|拥有)\s+(\w+)/g, type: 'contains' },
      { pattern: /(\w+)\s+(?:实现|完成|达成)\s+(\w+)/g, type: 'achieves' },
    ];

    for (const { pattern, type } of causalPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const from = match[1];
        const to = match[2];
        
        if (concepts.includes(from) && concepts.includes(to)) {
          relations.push({
            from,
            to,
            type,
            confidence: 0.8,
          });
        }
      }
    }

    return relations;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    record: MemoryRecord,
    concepts: string[],
    relations: KnowledgeRelation[]
  ): number {
    let confidence = 0.5;

    // 基于内容长度
    const contentLength = (record.answer || '').length;
    if (contentLength > 500) confidence += 0.1;
    if (contentLength > 1000) confidence += 0.1;

    // 基于概念数量
    if (concepts.length > 3) confidence += 0.1;
    if (concepts.length > 5) confidence += 0.1;

    // 基于关系数量
    if (relations.length > 0) confidence += 0.1;

    // 基于关联节点
    if (record.relatedNodes.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }
}

/**
 * 创建记忆循环实例
 */
export function createMemoryLoop(config?: Partial<MemoryLoopConfig>): MemoryLoop {
  return new MemoryLoop(config);
}
