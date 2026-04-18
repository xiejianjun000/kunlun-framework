/**
 * LightPhaseExecutor.ts - 浅睡阶段执行器
 * 
 * OpenTaiji三阶段记忆整合，实现Light Phase功能：
 * - 读取HOT/WARM记忆
 * - 读取每日memory文件
 * - 读取session transcripts
 * - 去重筛选
 * - 生成候选列表
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ShortTermRecallEntry, 
  ShortTermRecallStore,
  MemorySnippet,
  DailySnippetChunk,
  RecallRecordParams
} from './types';
import { RecallTracker } from './RecallTracker';

const DAY_MS = 24 * 60 * 60 * 1000;

// 每日memory文件名正则
const DAILY_MEMORY_FILENAME_RE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;

// 每日memory配置
const DAILY_INGESTION_CONFIG = {
  maxSnippetChars: 280,
  minSnippetChars: 8,
  maxChunkLines: 4,
  score: 0.62
};

// Session配置
const SESSION_INGESTION_CONFIG = {
  maxSnippetChars: 280,
  minSnippetChars: 12,
  maxMessagesPerSweep: 240,
  maxMessagesPerFile: 80,
  minMessagesPerFile: 12,
  score: 0.58
};

export interface LightPhaseResult {
  dailyEntriesProcessed: number;
  sessionEntriesProcessed: number;
  totalCandidatesGenerated: number;
  candidates: ShortTermRecallEntry[];
}

export class LightPhaseExecutor {
  private workspaceDir: string;
  private recallTracker: RecallTracker;
  private lookbackDays: number;
  private limit: number;
  private timezone?: string;

  constructor(
    workspaceDir: string, 
    recallTracker: RecallTracker,
    config?: {
      lookbackDays?: number;
      limit?: number;
      timezone?: string;
    }
  ) {
    this.workspaceDir = workspaceDir;
    this.recallTracker = recallTracker;
    this.lookbackDays = config?.lookbackDays ?? 7;
    this.limit = config?.limit ?? 50;
    this.timezone = config?.timezone;
  }

  /**
   * 执行Light Phase
   */
  async execute(): Promise<LightPhaseResult> {
    const candidates: ShortTermRecallEntry[] = [];
    let dailyEntriesProcessed = 0;
    let sessionEntriesProcessed = 0;

    // 1. 摄入每日memory文件信号
    const dailyCandidates = await this.ingestDailyMemorySignals();
    candidates.push(...dailyCandidates);
    dailyEntriesProcessed = dailyCandidates.length;

    // 2. 摄入session transcripts信号（如果有）
    const sessionCandidates = await this.ingestSessionSignals();
    candidates.push(...sessionCandidates);
    sessionEntriesProcessed = sessionCandidates.length;

    // 3. 去重和筛选
    const deduplicated = this.deduplicateEntries(candidates);

    return {
      dailyEntriesProcessed,
      sessionEntriesProcessed,
      totalCandidatesGenerated: deduplicated.length,
      candidates: deduplicated.slice(0, this.limit)
    };
  }

  /**
   * 摄入每日memory文件信号
   */
  private async ingestDailyMemorySignals(): Promise<ShortTermRecallEntry[]> {
    const memoryDir = path.join(this.workspaceDir, 'memory');
    const cutoffMs = this.calculateLookbackCutoffMs();
    
    let entries: ShortTermRecallEntry[] = [];

    try {
      const files = await fs.readdir(memoryDir, { withFileTypes: true });
      
      // 过滤并排序文件
      const dailyFiles = files
        .filter(entry => entry.isFile())
        .map(entry => {
          const match = entry.name.match(DAILY_MEMORY_FILENAME_RE);
          if (!match) return null;
          const day = match[1];
          const dayMs = Date.parse(`${day}T23:59:59.999Z`);
          if (!Number.isFinite(dayMs) || dayMs < cutoffMs) return null;
          return { fileName: entry.name, day, dayMs };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null)
        .sort((a, b) => b.day.localeCompare(a.day));

      // 处理每个文件
      const totalCap = Math.max(20, this.limit * 4);
      const perFileCap = Math.max(6, Math.ceil(totalCap / Math.max(1, dailyFiles.length)));
      
      for (const file of dailyFiles) {
        if (entries.length >= totalCap) break;
        
        const filePath = path.join(memoryDir, file.fileName);
        const chunks = await this.extractDailySnippets(filePath, perFileCap);
        
        for (const chunk of chunks) {
          const entry = this.createRecallEntry({
            path: `memory/${file.fileName}`,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            snippet: chunk.snippet,
            score: DAILY_INGESTION_CONFIG.score,
            source: 'daily',
            dayBucket: file.day
          });
          
          entries.push(entry);
        }
      }
    } catch (error) {
      console.error('[LightPhaseExecutor] 摄入每日memory信号失败:', error);
    }

    return entries;
  }

  /**
   * 摄入session signals（简化版本）
   */
  private async ingestSessionSignals(): Promise<ShortTermRecallEntry[]> {
    // 在OpenTaiji中，session信号的摄入可以扩展
    // 这里提供基础实现
    return [];
  }

  /**
   * 从每日memory文件提取片段
   */
  private async extractDailySnippets(
    filePath: string, 
    limit: number
  ): Promise<DailySnippetChunk[]> {
    const raw = await fs.readFile(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    const chunks: DailySnippetChunk[] = [];
    
    let activeHeading: string | null = null;
    let chunkLines: string[] = [];
    let chunkKind: 'list' | 'paragraph' | null = null;
    let chunkStartLine = 0;
    let chunkEndLine = 0;
    const fileName = path.basename(filePath, '.md');

    const flushChunk = () => {
      if (chunkLines.length === 0) return;
      
      const joiner = chunkKind === 'list' ? '; ' : ' ';
      const body = chunkLines.join(joiner).trim();
      const prefixed = activeHeading ? `${activeHeading}: ${body}` : body;
      const snippet = prefixed.slice(0, DAILY_INGESTION_CONFIG.maxSnippetChars).replace(/\s+/g, ' ').trim();
      
      if (snippet.length >= DAILY_INGESTION_CONFIG.minSnippetChars) {
        chunks.push({
          day: fileName,
          startLine: chunkStartLine,
          endLine: chunkEndLine,
          snippet
        });
      }
      
      chunkLines = [];
      chunkKind = null;
      chunkStartLine = 0;
      chunkEndLine = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith('<!--')) {
        flushChunk();
        continue;
      }
      
      // 检测标题
      const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        flushChunk();
        const heading = headingMatch[1]?.replace(/^\d+\.\s+/, '').replace(/^[-*+]\s+/, '').trim();
        if (heading && !this.isGenericHeading(heading)) {
          activeHeading = heading.slice(0, DAILY_INGESTION_CONFIG.maxSnippetChars);
        }
        continue;
      }
      
      // 检测列表项
      const listMatch = trimmed.replace(/^\d+\.\s+/, '').replace(/^[-*+]\s+/, '');
      if (listMatch.length < DAILY_INGESTION_CONFIG.minSnippetChars) {
        continue;
      }
      
      const nextKind = /^([-*+]\s+|\d+\.\s+)/.test(trimmed) ? 'list' : 'paragraph';
      const shouldSplit = 
        chunkLines.length > 0 && 
        (chunkKind !== nextKind || 
         chunkLines.length >= DAILY_INGESTION_CONFIG.maxChunkLines ||
         (activeHeading ? activeHeading.length + chunkLines.join(' ').length : 0) >= DAILY_INGESTION_CONFIG.maxSnippetChars);
      
      if (shouldSplit) {
        flushChunk();
      }
      
      if (chunkLines.length === 0) {
        chunkStartLine = i + 1;
        chunkKind = nextKind;
      }
      
      chunkLines.push(listMatch);
      chunkEndLine = i + 1;
      
      if (chunks.length >= limit) break;
    }
    
    flushChunk();
    return chunks.slice(0, limit);
  }

  /**
   * 检测是否为通用标题
   */
  private isGenericHeading(heading: string): boolean {
    const lower = heading.toLowerCase().trim();
    const generics = [
      'today', 'yesterday', 'tomorrow',
      'morning', 'afternoon', 'evening', 'night'
    ];
    return generics.includes(lower);
  }

  /**
   * 创建召回记录
   */
  private createRecallEntry(params: {
    path: string;
    startLine: number;
    endLine: number;
    snippet: string;
    score: number;
    source: string;
    dayBucket?: string;
  }): ShortTermRecallEntry {
    const now = new Date().toISOString();
    const key = this.buildEntryKey(params.path, params.startLine, params.endLine);
    
    return {
      key,
      path: params.path,
      startLine: params.startLine,
      endLine: params.endLine,
      source: params.source as ShortTermRecallEntry['source'],
      snippet: params.snippet,
      recallCount: 1,
      dailyCount: params.source === 'daily' ? 1 : 0,
      groundedCount: 0,
      totalScore: params.score,
      maxScore: params.score,
      firstRecalledAt: now,
      lastRecalledAt: now,
      queryHashes: [this.hashQuery(params.snippet)],
      recallDays: [params.dayBucket || now.split('T')[0]],
      conceptTags: this.deriveConceptTags(params.path, params.snippet)
    };
  }

  /**
   * 构建条目键
   */
  private buildEntryKey(path: string, startLine: number, endLine: number): string {
    return `${path}:${startLine}:${endLine}`;
  }

  /**
   * 计算查询哈希
   */
  private hashQuery(query: string): string {
    // 简化实现
    let hash = 0;
    const normalized = query.toLowerCase().trim();
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).slice(0, 12);
  }

  /**
   * 派生概念标签
   */
  private deriveConceptTags(path: string, snippet: string): string[] {
    const tags: string[] = [];
    
    // 基于路径提取标签
    const pathParts = path.split('/');
    for (const part of pathParts) {
      if (part.includes('-') || part.includes('_')) {
        const subParts = part.split(/[-_]/);
        tags.push(...subParts.filter(p => p.length > 2 && p.length < 20));
      }
    }
    
    // 基于关键词提取标签
    const keywords = [
      '环评', '环保', '生态', '碳排', '监测', '污染', '治理',
      '项目', '报告', '审批', '标准', '法规', '政策'
    ];
    
    for (const keyword of keywords) {
      if (snippet.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    return Array.from(new Set(tags)).slice(0, 6);
  }

  /**
   * 去重条目
   */
  private deduplicateEntries(entries: ShortTermRecallEntry[]): ShortTermRecallEntry[] {
    const deduped: ShortTermRecallEntry[] = [];
    const seen = new Map<string, number>();

    for (const entry of entries) {
      // 使用Jaccard相似度去重
      const duplicateIndex = deduped.findIndex(existing => 
        existing.path === entry.path && 
        this.jaccardSimilarity(existing.snippet, entry.snippet) >= 0.88
      );

      if (duplicateIndex >= 0) {
        // 合并重复条目
        const existing = deduped[duplicateIndex];
        existing.recallCount += entry.recallCount;
        existing.dailyCount += entry.dailyCount;
        existing.totalScore = Math.max(existing.totalScore, entry.totalScore);
        existing.maxScore = Math.max(existing.maxScore, entry.maxScore);
        existing.queryHashes = this.mergeUnique(existing.queryHashes, entry.queryHashes, 32);
        existing.recallDays = this.mergeUnique(existing.recallDays, entry.recallDays, 16);
        existing.conceptTags = this.mergeUnique(existing.conceptTags, entry.conceptTags, 6);
        
        if (new Date(entry.lastRecalledAt) > new Date(existing.lastRecalledAt)) {
          existing.lastRecalledAt = entry.lastRecalledAt;
        }
      } else {
        deduped.push({ ...entry });
      }
    }

    return deduped;
  }

  /**
   * 合并唯一值
   */
  private mergeUnique<T>(existing: T[], additions: T[], limit: number): T[] {
    const seen = new Set(existing);
    const merged = [...existing];
    
    for (const item of additions) {
      if (!seen.has(item)) {
        seen.add(item);
        merged.push(item);
        if (merged.length >= limit) break;
      }
    }
    
    return merged;
  }

  /**
   * 计算Jaccard相似度
   */
  private jaccardSimilarity(left: string, right: string): number {
    const leftTokens = new Set(this.tokenize(left));
    const rightTokens = new Set(this.tokenize(right));
    
    if (leftTokens.size === 0 || rightTokens.size === 0) {
      return left.trim().toLowerCase() === right.trim().toLowerCase() ? 1 : 0;
    }
    
    let intersection = 0;
    const leftArray = Array.from(leftTokens);
    for (let i = 0; i < leftArray.length; i++) {
      if (rightTokens.has(leftArray[i])) intersection++;
    }
    
    const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  /**
   * 计算回溯截止时间
   */
  private calculateLookbackCutoffMs(): number {
    return Date.now() - this.lookbackDays * DAY_MS;
  }

  /**
   * 格式化日期
   */
  formatDate(ms: number): string {
    const date = new Date(ms);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default LightPhaseExecutor;
