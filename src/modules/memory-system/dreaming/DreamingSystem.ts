/**
 * DreamingSystem - 梦境主系统
 * 
 * 整合三阶段记忆整合的完整梦境系统
 * 集成Recall Tracking实现7信号评分和梦境处理
 * 
 * 核心流程:
 * 1. 唤醒梦境 - 从RecallTracker获取召回信号
 * 2. 计算7信号评分 - 使用SevenSignalScorer
 * 3. 梦境处理 - 调用DreamingProcessor
 * 4. 更新记忆 - 写回知识图谱
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  DreamingSystemConfig,
  DreamingPhase,
  DreamingResult,
  DreamingCycleResult,
  ShortTermRecallEntry,
  DreamDiaryPreview,
  DreamingSchedulerCallback,
  PromotionCandidate,
  RecallEntry,
  PhaseSignalEntry,
} from './types';
import { DreamingPhase as Phase, DEFAULT_DREAMING_CONFIG, DEFAULT_PROMOTION_WEIGHTS } from './types';
import { DreamingScheduler, createDreamingScheduler } from './DreamingScheduler';
import { MemoryConsolidator } from './MemoryConsolidator';
import {
  SevenSignalScorer,
  scoreEntry,
  rankCandidates,
  calculatePhaseSignalBoost,
} from './SevenSignalScorer';
import {
  DreamingProcessor,
  createDreamingProcessor,
  type DreamingProcessingResult,
} from './DreamingProcessor';

// ============== 常量 ==============

const DAILY_MEMORY_PATH_RE = /^(\d{4})-(\d{2})-(\d{2})\.md$/;
const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_DEDUP_SIMILARITY = 0.85;
const DAY_MS = 24 * 60 * 60 * 1000;

// ============== 日记生成 ==============

/**
 * 生成梦境日记条目
 */
async function generateDreamDiaryEntry(
  workspaceDir: string,
  phase: DreamingPhase,
  snippets: string[],
  themes?: string[],
  timezone?: string
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleString('zh-CN', { timeZone: timezone });
  
  // 简单的摘要生成
  const summary = snippets.length > 0
    ? snippets.slice(0, 3).join('; ')
    : 'No significant patterns found.';
  
  const phaseName = {
    [Phase.LIGHT]: '浅睡眠',
    [Phase.DEEP]: '深睡眠',
    [Phase.REM]: 'REM睡眠',
  }[phase] || phase;
  
  let entry = `### ${phaseName} - ${dateStr}\n\n`;
  entry += `*时间: ${timeStr}*\n\n`;
  entry += `**摘要**: ${summary}\n\n`;
  
  if (themes && themes.length > 0) {
    entry += `**主题模式**:\n`;
    for (const theme of themes.slice(0, 5)) {
      entry += `- ${theme}\n`;
    }
    entry += '\n';
  }
  
  entry += `---\n\n`;
  
  return entry;
}

// ============== 记忆摄入 ==============

/**
 * 从每日记忆中摄入信号
 */
async function ingestDailyMemorySignals(
  workspaceDir: string,
  lookbackDays: number,
  nowMs: number
): Promise<ShortTermRecallEntry[]> {
  const entries: ShortTermRecallEntry[] = [];
  const cutoffDate = new Date(nowMs - lookbackDays * 24 * 60 * 60 * 1000);
  
  const memoryDir = path.join(workspaceDir, 'memory');
  
  try {
    const files = await fs.readdir(memoryDir);
    
    for (const file of files) {
      // 匹配日期文件: YYYY-MM-DD.md
      const match = file.match(DAILY_MEMORY_PATH_RE);
      if (!match) continue;
      
      const fileDate = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
      if (fileDate < cutoffDate) continue;
      
      const filePath = path.join(memoryDir, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;
      
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // 提取非标题、非注释的行作为候选
      let currentHeading = '';
      let lineInFile = 0;
      
      for (const line of lines) {
        lineInFile++;
        const trimmed = line.trim();
        
        // 跳过空行和注释
        if (!trimmed || trimmed.startsWith('<!--') || trimmed.startsWith('#')) {
          if (trimmed.startsWith('##')) {
            currentHeading = trimmed.replace(/^##+\s*/, '').trim();
          }
          continue;
        }
        
        // 跳过太短的行
        if (trimmed.length < 8) continue;
        
        // 移除列表标记
        const snippet = trimmed.replace(/^[-*+]\s*/, '').replace(/^\d+\.\s*/, '');
        if (snippet.length < 8) continue;
        
        const key = Buffer.from(`${file}:${lineInFile}:${snippet.slice(0, 50)}`).toString('base64');
        
        entries.push({
          key,
          path: filePath,
          startLine: lineInFile,
          endLine: lineInFile,
          source: 'memory',
          snippet: currentHeading ? `${currentHeading}: ${snippet}` : snippet,
          recallCount: 1,
          dailyCount: 1,
          groundedCount: 0,
          totalScore: 0.62, // DAILY_INGESTION_SCORE
          maxScore: 1,
          firstRecalledAt: fileDate.toISOString(),
          lastRecalledAt: fileDate.toISOString(),
          queryHashes: [],
          recallDays: [fileDate.toISOString().slice(0, 10)],
          conceptTags: extractConceptTags(snippet),
        });
      }
    }
  } catch (err) {
    console.error('[DreamingSystem] Failed to ingest daily memories:', err);
  }
  
  return entries;
}

/**
 * 提取概念标签（简化实现）
 */
function extractConceptTags(snippet: string): string[] {
  const tags: string[] = [];
  const normalized = snippet.toLowerCase();
  
  // 简单关键词匹配
  const keywords = [
    '项目', '环评', '环境', '评估', '报告', '监测', '排放', '生态',
    '环保', '审批', '验收', '标准', '规范', '技术', '方案', '措施',
    '管理', '处理', '风险', '污染', '修复', '保护', '资源', '能源',
  ];
  
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      tags.push(keyword);
    }
  }
  
  return tags;
}

// ============== 去重逻辑 ==============

/**
 * 计算相似度
 */
function calculateSimilarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\s+/));
  const bWords = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = Array.from(aWords).filter(w => bWords.has(w)).length;
  const union = new Set([...Array.from(aWords), ...Array.from(bWords)]).size;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * 去重条目
 */
function dedupeEntries(
  entries: ShortTermRecallEntry[],
  similarityThreshold: number = DEFAULT_DEDUP_SIMILARITY
): ShortTermRecallEntry[] {
  const result: ShortTermRecallEntry[] = [];
  
  for (const entry of entries) {
    let isDuplicate = false;
    
    for (const existing of result) {
      const sim = calculateSimilarity(entry.snippet, existing.snippet);
      if (sim >= similarityThreshold) {
        isDuplicate = true;
        // 合并信号
        existing.recallCount += entry.recallCount;
        existing.dailyCount += entry.dailyCount;
        existing.totalScore = Math.max(existing.totalScore, entry.totalScore);
        break;
      }
    }
    
    if (!isDuplicate) {
      result.push(entry);
    }
  }
  
  return result;
}

// ============== RecallTracker集成 ==============

/**
 * RecallTracker适配器 - 文件系统实现
 */
export class FileSystemRecallAdapter {
  private workspaceDir: string;
  private storePath: string;
  private signalPath: string;
  private recallEntries: Map<string, RecallEntry> = new Map();
  private phaseSignals: Map<string, PhaseSignalEntry> = new Map();
  private dirty = false;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.storePath = path.join(workspaceDir, 'memory', '.dreams', 'recall-store.json');
    this.signalPath = path.join(workspaceDir, 'memory', '.dreams', 'phase-signals.json');
  }

  async load(): Promise<void> {
    try {
      // 加载召回存储
      const storeRaw = await fs.readFile(this.storePath, 'utf-8').catch(() => '{}');
      const store = JSON.parse(storeRaw);
      this.recallEntries.clear();
      if (store.entries) {
        for (const [key, entry] of Object.entries(store.entries)) {
          this.recallEntries.set(key, entry as RecallEntry);
        }
      }
      
      // 加载阶段信号
      const signalRaw = await fs.readFile(this.signalPath, 'utf-8').catch(() => '{}');
      const signals = JSON.parse(signalRaw);
      this.phaseSignals.clear();
      if (signals.entries) {
        for (const [key, signal] of Object.entries(signals.entries)) {
          this.phaseSignals.set(key, signal as PhaseSignalEntry);
        }
      }
    } catch (err) {
      console.error('[FileSystemRecallAdapter] Failed to load:', err);
    }
  }

  async save(): Promise<void> {
    if (!this.dirty) return;
    
    try {
      await fs.mkdir(path.dirname(this.storePath), { recursive: true });
      
      // 保存召回存储
      await fs.writeFile(
        this.storePath,
        JSON.stringify({
          version: 1,
          updatedAt: new Date().toISOString(),
          entries: Object.fromEntries(this.recallEntries),
        }, null, 2)
      );
      
      // 保存阶段信号
      await fs.writeFile(
        this.signalPath,
        JSON.stringify({
          version: 1,
          updatedAt: new Date().toISOString(),
          entries: Object.fromEntries(this.phaseSignals),
        }, null, 2)
      );
      
      this.dirty = false;
    } catch (err) {
      console.error('[FileSystemRecallAdapter] Failed to save:', err);
    }
  }

  getRecallEntries(): Map<string, RecallEntry> {
    return this.recallEntries;
  }

  getPhaseSignals(): Map<string, PhaseSignalEntry> {
    return this.phaseSignals;
  }

  setDirty(): void {
    this.dirty = true;
  }

  getRecallFrequency(key: string): number {
    return this.recallEntries.get(key)?.recallCount ?? 0;
  }

  getPhaseSignal(key: string): PhaseSignalEntry | undefined {
    return this.phaseSignals.get(key);
  }
}

// ============== 梦境系统类 ==============

export class DreamingSystem {
  private config: DreamingSystemConfig;
  private scheduler: DreamingScheduler;
  private workspaceDir: string;
  private diaryPath: string;
  private processor: DreamingProcessor;
  private recallAdapter: FileSystemRecallAdapter;
  
  // 7信号评分统计
  private scoreCache: Map<string, { score: number; components: ReturnType<typeof scoreEntry>['components'] }> = new Map();
  private lastScoreUpdate: number = 0;

  constructor(
    workspaceDir: string,
    config?: Partial<DreamingSystemConfig>
  ) {
    this.workspaceDir = workspaceDir;
    this.config = { ...DEFAULT_DREAMING_CONFIG, ...config };
    this.diaryPath = path.join(workspaceDir, 'DREAMS.md');
    
    // 初始化调度器
    this.scheduler = createDreamingScheduler(this.config);
    this.scheduler.setExecutor(this.executePhase.bind(this));
    
    // 初始化梦境处理器
    this.processor = createDreamingProcessor(workspaceDir, undefined, {
      maxCandidates: this.config.deep.limit,
      minScore: this.config.deep.minScore,
      minRecallCount: this.config.deep.minRecallCount,
      minUniqueQueries: this.config.deep.minUniqueQueries,
      timezone: this.config.timezone,
    });
    
    // 初始化RecallTracker适配器
    this.recallAdapter = new FileSystemRecallAdapter(workspaceDir);
  }

  /**
   * 启动梦境系统
   */
  async start(): Promise<void> {
    console.log('[DreamingSystem] Starting...');
    
    // 加载RecallTracker数据
    await this.recallAdapter.load();
    
    this.scheduler.start();
  }
  
  /**
   * 停止梦境系统
   */
  stop(): void {
    console.log('[DreamingSystem] Stopping...');
    this.scheduler.stop();
  }
  
  /**
   * 获取状态
   */
  getStatus(): {
    enabled: boolean;
    schedulerState: ReturnType<DreamingScheduler['getState']>;
    config: DreamingSystemConfig;
    recallStats: {
      totalEntries: number;
      avgScore: number;
    };
  } {
    return {
      enabled: this.config.enabled,
      schedulerState: this.scheduler.getState(),
      config: this.scheduler.getConfig(),
      recallStats: this.getRecallStats(),
    };
  }

  /**
   * 获取Recall统计
   */
  getRecallStats(): { totalEntries: number; avgScore: number } {
    const entries = this.recallAdapter.getRecallEntries();
    let totalScore = 0;
    const keys = Array.from(entries.keys());
    
    for (const key of keys) {
      const cached = this.scoreCache.get(key);
      if (cached) {
        totalScore += cached.score;
      }
    }
    
    return {
      totalEntries: entries.size,
      avgScore: entries.size > 0 ? totalScore / entries.size : 0,
    };
  }
  
  /**
   * 添加完成回调
   */
  onComplete(callback: DreamingSchedulerCallback): void {
    this.scheduler.onComplete(callback);
  }
  
  /**
   * 手动触发梦境周期
   */
  async triggerCycle(): Promise<DreamingCycleResult> {
    return this.scheduler.trigger();
  }

  /**
   * 获取召回频率（从RecallTracker）
   */
  getRecallFrequency(key: string): number {
    return this.recallAdapter.getRecallFrequency(key);
  }

  /**
   * 获取阶段信号（从RecallTracker）
   */
  getPhaseSignal(key: string): PhaseSignalEntry | undefined {
    return this.recallAdapter.getPhaseSignal(key);
  }

  /**
   * 计算7信号评分
   * 
   * 评分公式:
   * score = 0.24*frequency + 0.30*relevance + 0.15*diversity + 
   *         0.15*recency + 0.10*consolidation + 0.06*conceptual + phaseBoost
   */
  calculateSevenSignalScore(
    entry: ShortTermRecallEntry,
    nowMs?: number
  ): { score: number; components: ReturnType<typeof scoreEntry>['components']; phaseBoost: number } {
    const now = nowMs ?? Date.now();
    const phaseSignal = this.recallAdapter.getPhaseSignal(entry.key);
    
    return scoreEntry(entry, phaseSignal, DEFAULT_PROMOTION_WEIGHTS, now);
  }

  /**
   * 更新评分缓存
   */
  async updateScoreCache(nowMs?: number): Promise<void> {
    const now = nowMs ?? Date.now();
    const entries = this.recallAdapter.getRecallEntries();
    
    this.scoreCache.clear();
    const entriesArray = Array.from(entries.entries());
    for (const [key, entry] of entriesArray) {
      // 将RecallEntry转换为ShortTermRecallEntry格式
      const shortTermEntry: ShortTermRecallEntry = {
        key: entry.key,
        path: entry.path,
        startLine: entry.startLine,
        endLine: entry.endLine,
        source: entry.source as 'memory' | 'session' | 'grounded',
        snippet: entry.snippet,
        recallCount: entry.recallCount,
        dailyCount: entry.dailyCount,
        groundedCount: entry.groundedCount,
        totalScore: entry.totalScore,
        maxScore: entry.maxScore,
        firstRecalledAt: entry.firstRecalledAt,
        lastRecalledAt: entry.lastRecalledAt,
        queryHashes: entry.queryHashes,
        recallDays: entry.recallDays,
        conceptTags: entry.conceptTags,
        promotedAt: entry.promotedAt,
      };
      
      const result = this.calculateSevenSignalScore(shortTermEntry, now);
      this.scoreCache.set(key, {
        score: result.score,
        components: result.components,
      });
    }
    
    this.lastScoreUpdate = now;
  }

  /**
   * 获取高优先级记忆
   */
  async getHighPriorityMemories(
    limit?: number,
    nowMs?: number
  ): Promise<Array<{ entry: RecallEntry; score: number; components: ReturnType<typeof scoreEntry>['components'] }>> {
    await this.updateScoreCache(nowMs);
    
    const entries = Array.from(this.recallAdapter.getRecallEntries().values())
      .filter(e => !e.promotedAt)
      .map(entry => ({
        entry,
        score: this.scoreCache.get(entry.key)?.score ?? 0,
        components: this.scoreCache.get(entry.key)?.components ?? {
          frequency: 0,
          relevance: 0,
          diversity: 0,
          recency: 0,
          consolidation: 0,
          conceptual: 0,
        },
      }))
      .filter(item => item.score >= this.config.deep.minScore)
      .sort((a, b) => b.score - a.score);
    
    return entries.slice(0, limit ?? this.config.deep.limit);
  }
  
  /**
   * 执行单个阶段
   */
  async executePhase(phase: DreamingPhase): Promise<DreamingResult> {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    
    try {
      switch (phase) {
        case Phase.LIGHT:
          return await this.runLightPhase(nowMs);
        case Phase.DEEP:
          return await this.runDeepPhase(nowMs);
        case Phase.REM:
          return await this.runRemPhase(nowMs);
        default:
          throw new Error(`Unknown phase: ${phase}`);
      }
    } catch (err) {
      return {
        phase,
        success: false,
        entriesProcessed: 0,
        error: err instanceof Error ? err.message : String(err),
        timestamp: nowIso,
      };
    }
  }

  /**
   * 执行浅睡眠阶段
   * 
   * 阶段1: 唤醒梦境 - 加载召回信号
   * 阶段2: 摄入新记忆
   */
  private async runLightPhase(nowMs: number): Promise<DreamingResult> {
    const config = this.config.light;
    
    // 重新加载RecallTracker数据
    await this.recallAdapter.load();
    
    // 获取现有召回条目
    const existingEntries = Array.from(this.recallAdapter.getRecallEntries().values()) as ShortTermRecallEntry[];
    
    // 从每日记忆摄入新信号
    const newEntries = await ingestDailyMemorySignals(
      this.workspaceDir,
      config.lookbackDays,
      nowMs
    );
    
    // 合并并去重
    const allEntries: ShortTermRecallEntry[] = [...existingEntries, ...newEntries];
    const deduplicated = dedupeEntries(allEntries, config.deduplicationSimilarity);
    
    // 限制数量
    const limited = deduplicated.slice(0, config.limit);
    
    // 记录阶段信号
    await MemoryConsolidator.recordDreamingPhaseSignals(
      this.workspaceDir,
      'light',
      limited.map(e => e.key),
      nowMs
    );
    
    // 生成日记
    if (config.enabled) {
      const diaryEntry = await generateDreamDiaryEntry(
        this.workspaceDir,
        Phase.LIGHT,
        limited.map(e => e.snippet)
      );
      await this.appendToDiary(diaryEntry);
    }
    
    return {
      phase: Phase.LIGHT,
      success: true,
      entriesProcessed: limited.length,
      timestamp: new Date(nowMs).toISOString(),
    };
  }

  /**
   * 执行深睡眠阶段
   * 
   * 阶段1: 唤醒梦境 - 获取召回信号
   * 阶段2: 计算7信号评分
   * 阶段3: 选择高优先级记忆
   * 阶段4: 调用LLM进行记忆整合
   * 阶段5: 更新知识图谱
   */
  private async runDeepPhase(nowMs: number): Promise<DreamingResult> {
    const config = this.config.deep;
    
    // 重新加载RecallTracker数据
    await this.recallAdapter.load();
    
    // 获取候选条目（使用RecallTracker）
    const candidates = await MemoryConsolidator.getPromotionCandidates(
      this.workspaceDir,
      {
        minScore: config.minScore,
        minRecallCount: config.minRecallCount,
        minUniqueQueries: config.minUniqueQueries,
        limit: config.limit,
        nowMs,
      }
    );
    
    if (candidates.length === 0) {
      return {
        phase: Phase.DEEP,
        success: true,
        entriesProcessed: 0,
        entriesPromoted: 0,
        timestamp: new Date(nowMs).toISOString(),
      };
    }
    
    // 调用DreamingProcessor进行梦境处理
    const processingResult = await this.processor.processDream(Phase.DEEP, nowMs);
    
    // 执行整合
    const result = await MemoryConsolidator.consolidateMemory({
      workspaceDir: this.workspaceDir,
      candidates,
      limit: config.limit,
      minScore: config.minScore,
      minRecallCount: config.minRecallCount,
      minUniqueQueries: config.minUniqueQueries,
      timezone: this.config.timezone,
      nowMs,
    });
    
    return {
      phase: Phase.DEEP,
      success: true,
      entriesProcessed: candidates.length,
      entriesPromoted: result.appended,
      score: candidates[0]?.score,
      timestamp: new Date(nowMs).toISOString(),
    };
  }

  /**
   * 执行REM阶段
   * 
   * 阶段1: 唤醒梦境 - 获取召回信号
   * 阶段2: 生成反思信号
   * 阶段3: 提取主题模式
   */
  private async runRemPhase(nowMs: number): Promise<DreamingResult> {
    const config = this.config.rem;
    
    // 重新加载RecallTracker数据
    await this.recallAdapter.load();
    
    // 读取近期条目
    const entries = await MemoryConsolidator.readShortTermRecallEntries(
      this.workspaceDir,
      nowMs
    );
    
    // 过滤在回溯范围内的条目
    const cutoff = new Date(nowMs - config.lookbackDays * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter(e => {
      const date = new Date(e.lastRecalledAt);
      return date >= cutoff;
    });
    
    // 获取高优先级记忆
    const highPriority = await this.getHighPriorityMemories(config.limit, nowMs);
    
    // 构建反思
    const reflections = this.buildReflections(recentEntries);
    
    // 生成反思信号
    const reflectionSignals = await this.processor.generateReflectionSignals(
      highPriority.map(h => ({
        key: h.entry.key,
        path: h.entry.path,
        startLine: h.entry.startLine,
        endLine: h.entry.endLine,
        source: (h.entry.source || 'memory') as 'memory' | 'session' | 'grounded',
        snippet: h.entry.snippet,
        recallCount: h.entry.recallCount,
        dailyCount: h.entry.dailyCount,
        groundedCount: h.entry.groundedCount,
        totalScore: h.entry.totalScore,
        maxScore: h.entry.maxScore,
        firstRecalledAt: h.entry.firstRecalledAt,
        lastRecalledAt: h.entry.lastRecalledAt,
        queryHashes: h.entry.queryHashes,
        recallDays: h.entry.recallDays,
        conceptTags: h.entry.conceptTags,
        // 添加缺失的属性
        avgScore: h.score,
        uniqueQueries: h.entry.queryHashes.length,
        ageDays: (nowMs - new Date(h.entry.firstRecalledAt).getTime()) / DAY_MS,
        score: h.score,
        components: h.components,
      }))
    );
    
    // 选择候选真理
    const candidateTruths = this.selectCandidateTruths(recentEntries, config.limit);
    
    // 记录阶段信号
    await MemoryConsolidator.recordDreamingPhaseSignals(
      this.workspaceDir,
      'rem',
      [...highPriority.map(h => h.entry.key), ...candidateTruths.map(c => c.key)],
      nowMs
    );
    
    // 生成日记
    if (config.enabled) {
      const diaryEntry = await generateDreamDiaryEntry(
        this.workspaceDir,
        Phase.REM,
        candidateTruths.map(c => c.snippet),
        [...reflections, ...reflectionSignals]
      );
      await this.appendToDiary(diaryEntry);
    }
    
    return {
      phase: Phase.REM,
      success: true,
      entriesProcessed: recentEntries.length,
      timestamp: new Date(nowMs).toISOString(),
    };
  }

  /**
   * 构建反思
   */
  private buildReflections(entries: ShortTermRecallEntry[]): string[] {
    const tagStats = new Map<string, number>();
    
    for (const entry of entries) {
      for (const tag of entry.conceptTags) {
        tagStats.set(tag, (tagStats.get(tag) ?? 0) + 1);
      }
    }
    
    const ranked = Array.from(tagStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return ranked.map(([tag, count]) => 
      `${tag} (出现 ${count} 次)`
    );
  }

  /**
   * 选择候选真理
   */
  private selectCandidateTruths(
    entries: ShortTermRecallEntry[],
    limit: number
  ): ShortTermRecallEntry[] {
    return entries
      .filter(e => !e.promotedAt)
      .sort((a, b) => {
        // 按信号数量和评分排序
        const scoreA = a.recallCount * a.totalScore;
        const scoreB = b.recallCount * b.totalScore;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }
  
  /**
   * 追加到日记
   */
  private async appendToDiary(entry: string): Promise<void> {
    try {
      let existing = '';
      try {
        existing = await fs.readFile(this.diaryPath, 'utf-8');
      } catch {
        existing = '# 梦境日记\n\n';
      }
      
      await fs.writeFile(this.diaryPath, existing + entry, 'utf-8');
    } catch (err) {
      console.error('[DreamingSystem] Failed to write diary:', err);
    }
  }
  
  /**
   * 预览梦境效果（不执行写入）
   */
  async preview(phase: DreamingPhase): Promise<DreamDiaryPreview> {
    const nowMs = Date.now();
    const entries = await MemoryConsolidator.readShortTermRecallEntries(
      this.workspaceDir,
      nowMs
    );
    
    const config = phase === Phase.LIGHT 
      ? this.config.light 
      : phase === Phase.DEEP 
        ? this.config.deep 
        : this.config.rem;
    
    const cutoff = new Date(nowMs - config.lookbackDays * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter(e => new Date(e.lastRecalledAt) >= cutoff);
    
    // 获取7信号评分
    const scored = await this.getHighPriorityMemories(10, nowMs);
    
    return {
      phase,
      snippets: recentEntries.slice(0, 10).map(e => e.snippet),
      themes: this.buildReflections(recentEntries),
      candidateTruths: scored.map(h => ({
        snippet: h.entry.snippet,
        confidence: h.score,
        evidence: `7信号: f=${h.components.frequency.toFixed(2)}, r=${h.components.relevance.toFixed(2)}, d=${h.components.diversity.toFixed(2)}, rec=${h.components.recency.toFixed(2)}, c=${h.components.consolidation.toFixed(2)}, ct=${h.components.conceptual.toFixed(2)}`,
      })),
    };
  }

  /**
   * 获取7信号评分详情
   */
  async getSevenSignalDetails(key: string, nowMs?: number): Promise<{
    score: number;
    components: {
      frequency: number;
      relevance: number;
      diversity: number;
      recency: number;
      consolidation: number;
      conceptual: number;
      phaseBoost: number;
    };
  } | null> {
    await this.recallAdapter.load();
    
    const entry = this.recallAdapter.getRecallEntries().get(key);
    if (!entry) return null;
    
    const shortTermEntry: ShortTermRecallEntry = {
      key: entry.key,
      path: entry.path,
      startLine: entry.startLine,
      endLine: entry.endLine,
      source: entry.source as 'memory' | 'session' | 'grounded',
      snippet: entry.snippet,
      recallCount: entry.recallCount,
      dailyCount: entry.dailyCount,
      groundedCount: entry.groundedCount,
      totalScore: entry.totalScore,
      maxScore: entry.maxScore,
      firstRecalledAt: entry.firstRecalledAt,
      lastRecalledAt: entry.lastRecalledAt,
      queryHashes: entry.queryHashes,
      recallDays: entry.recallDays,
      conceptTags: entry.conceptTags,
    };
    
    const result = this.calculateSevenSignalScore(shortTermEntry, nowMs);
    
    return {
      score: result.score,
      components: {
        ...result.components,
        phaseBoost: result.phaseBoost,
      },
    };
  }
}

// ============== 导出 ==============

export function createDreamingSystem(
  workspaceDir: string,
  config?: Partial<DreamingSystemConfig>
): DreamingSystem {
  return new DreamingSystem(workspaceDir, config);
}

export const DreamingSystemModule = {
  DreamingSystem,
  createDreamingSystem,
  FileSystemRecallAdapter,
};

export default DreamingSystem;
