/**
 * DreamingProcessor - 梦境处理器
 * 
 * 负责执行记忆整合的LLM调用和梦境处理逻辑
 * 集成Recall Tracking实现完整的梦境工作流
 * 
 * 核心流程:
 * 1. 唤醒梦境 - 获取召回信号
 * 2. 处理 - LLM记忆整合
 * 3. 更新 - 写回知识图谱和记忆
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  ShortTermRecallEntry,
  PromotionCandidate,
  PhaseSignalEntry,
  DreamingProcessingConfig,
  RecallEntry,
} from './types';
import { DreamingPhase, DEFAULT_PROMOTION_WEIGHTS } from './types';
import { 
  SevenSignalScorer,
  clampScore,
  rankCandidates,
} from './SevenSignalScorer';
import { MemoryConsolidator } from './MemoryConsolidator';

// ============== 常量 ==============

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PROCESSING_ITEMS = 10;
const DEFAULT_RECENTY_HALF_LIFE_DAYS = 14;
const PHASE_SIGNAL_HALF_LIFE_DAYS = 14;
const PHASE_SIGNAL_LIGHT_BOOST_MAX = 0.06;
const PHASE_SIGNAL_REM_BOOST_MAX = 0.09;

// ============== 类型定义 ==============

/**
 * LLM调用配置
 */
export interface LLMIntegrationConfig {
  /** LLM API endpoint */
  apiEndpoint?: string;
  /** Model name */
  model?: string;
  /** API key */
  apiKey?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

/**
 * 记忆整合结果
 */
export interface ConsolidationResult {
  key: string;
  success: boolean;
  snippet: string;
  integratedContent?: string;
  newConnections?: string[];
  error?: string;
}

/**
 * 梦境处理上下文
 */
export interface DreamingContext {
  workspaceDir: string;
  nowMs: number;
  phase: DreamingPhase;
  recallEntries: Map<string, RecallEntry>;
  phaseSignals: Map<string, PhaseSignalEntry>;
  candidates: PromotionCandidate[];
  processedKeys: Set<string>;
}

/**
 * 记忆整合结果
 */
export interface ConsolidationResult {
  key: string;
  success: boolean;
  snippet: string;
  integratedContent?: string;
  newConnections?: string[];
  error?: string;
}

/**
 * 梦境处理结果
 */
export interface DreamingProcessingResult {
  phase: DreamingPhase;
  entriesProcessed: number;
  entriesConsolidated: number;
  consolidations: ConsolidationResult[];
  score?: number;
  error?: string;
  timestamp: string;
}

// ============== LLM集成接口 ==============

/**
 * LLM集成接口 - 需要外部实现
 */
export interface LLMIntegration {
  /**
   * 生成记忆整合内容
   */
  integrateMemory(
    snippets: string[],
    context: {
      phase: DreamingPhase;
      themes?: string[];
      relatedMemories?: string[];
    },
    config?: Partial<LLMIntegrationConfig>
  ): Promise<{
    integrated: string;
    themes?: string[];
    connections?: string[];
  }>;

  /**
   * 生成反思信号
   */
  generateReflections(
    snippets: string[],
    config?: Partial<LLMIntegrationConfig>
  ): Promise<string[]>;
}

/**
 * 简单的内存LLM集成（用于测试或无外部LLM的场景）
 */
export class SimpleLLMIntegration implements LLMIntegration {
  async integrateMemory(
    snippets: string[],
    context: {
      phase: DreamingPhase;
      themes?: string[];
      relatedMemories?: string[];
    },
    config?: Partial<LLMIntegrationConfig>
  ): Promise<{
    integrated: string;
    themes?: string[];
    connections?: string[];
  }> {
    // 简单的拼接整合
    const integrated = snippets.join(' ');
    return {
      integrated,
      themes: context.themes,
      connections: context.relatedMemories,
    };
  }

  async generateReflections(
    snippets: string[],
    config?: Partial<LLMIntegrationConfig>
  ): Promise<string[]> {
    // 简单的关键词提取
    const allText = snippets.join(' ');
    const words = allText.split(/\s+/).filter(w => w.length > 2);
    const wordFreq = new Map<string, number>();
    
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
}

// ============== 核心处理类 ==============

/**
 * 梦境处理器
 * 
 * 负责执行完整的梦境处理流程
 */
export class DreamingProcessor {
  private workspaceDir: string;
  private config: DreamingProcessingConfig;
  private llmIntegration: LLMIntegration;
  private recallEntries: Map<string, RecallEntry> = new Map();
  private phaseSignals: Map<string, PhaseSignalEntry> = new Map();

  constructor(
    workspaceDir: string,
    llmIntegration?: LLMIntegration,
    config?: Partial<DreamingProcessingConfig>
  ) {
    this.workspaceDir = workspaceDir;
    this.llmIntegration = llmIntegration ?? new SimpleLLMIntegration();
    this.config = {
      maxCandidates: config?.maxCandidates ?? MAX_PROCESSING_ITEMS,
      minScore: config?.minScore ?? 0.75,
      minRecallCount: config?.minRecallCount ?? 3,
      minUniqueQueries: config?.minUniqueQueries ?? 2,
      recencyHalfLifeDays: config?.recencyHalfLifeDays ?? DEFAULT_RECENTY_HALF_LIFE_DAYS,
      weights: config?.weights ?? DEFAULT_PROMOTION_WEIGHTS,
      timezone: config?.timezone ?? 'Asia/Shanghai',
    };
  }

  /**
   * 设置LLM集成
   */
  setLLMIntegration(llm: LLMIntegration): void {
    this.llmIntegration = llm;
  }

  /**
   * 获取召回频率
   */
  getRecallFrequency(key: string): number {
    const entry = this.recallEntries.get(key);
    return entry?.recallCount ?? 0;
  }

  /**
   * 获取阶段信号
   */
  getPhaseSignal(key: string): PhaseSignalEntry | undefined {
    return this.phaseSignals.get(key);
  }

  /**
   * 阶段1: 唤醒梦境 - 加载召回信号
   */
  async awakenDream(
    nowMs?: number,
    lookbackDays?: number
  ): Promise<Map<string, RecallEntry>> {
    const now = nowMs ?? Date.now();
    const lookback = lookbackDays ?? 14;
    const cutoffMs = now - lookback * DAY_MS;
    
    // 从MemoryConsolidator读取召回条目
    const entries = await MemoryConsolidator.readShortTermRecallEntries(
      this.workspaceDir,
      now
    );
    
    // 从MemoryConsolidator读取阶段信号
    const signals = await MemoryConsolidator.readPhaseSignals(
      this.workspaceDir,
      now
    );
    
    // 过滤并加载召回条目
    this.recallEntries.clear();
    for (const entry of entries) {
      const entryTime = new Date(entry.lastRecalledAt).getTime();
      if (entryTime >= cutoffMs) {
        this.recallEntries.set(entry.key, entry);
      }
    }
    
    this.phaseSignals = signals;
    
    console.log(`[DreamingProcessor] Awakened ${this.recallEntries.size} recall entries`);
    return this.recallEntries;
  }

  /**
   * 阶段2: 计算7信号评分
   */
  calculateSevenSignalScores(
    nowMs?: number
  ): PromotionCandidate[] {
    const now = nowMs ?? Date.now();
    
    const entries = Array.from(this.recallEntries.values())
      .filter(e => !e.promotedAt) as ShortTermRecallEntry[];
    
    const candidates = rankCandidates(
      entries,
      this.phaseSignals,
      this.config.weights,
      {
        minScore: this.config.minScore,
        minRecallCount: this.config.minRecallCount,
        minUniqueQueries: this.config.minUniqueQueries,
        nowMs: now,
      }
    );
    
    return candidates.slice(0, this.config.maxCandidates);
  }

  /**
   * 阶段3: 选择高优先级记忆
   */
  selectHighPriorityMemories(
    candidates: PromotionCandidate[],
    limit?: number
  ): PromotionCandidate[] {
    const max = limit ?? this.config.maxCandidates;
    
    return candidates
      .filter(c => c.score >= this.config.minScore)
      .sort((a, b) => {
        // 首先按7信号评分排序
        if (Math.abs(b.score - a.score) > 0.01) {
          return b.score - a.score;
        }
        // 然后按召回频率排序
        return (b.recallCount ?? 0) - (a.recallCount ?? 0);
      })
      .slice(0, max);
  }

  /**
   * 阶段4: 调用LLM进行记忆整合
   */
  async integrateWithLLM(
    candidates: PromotionCandidate[],
    phase: DreamingPhase,
    context?: {
      themes?: string[];
      relatedMemories?: string[];
    }
  ): Promise<ConsolidationResult[]> {
    const results: ConsolidationResult[] = [];
    
    for (const candidate of candidates) {
      try {
        const snippets = [candidate.snippet];
        
        // 调用LLM整合
        const integrated = await this.llmIntegration.integrateMemory(
          snippets,
          {
            phase,
            themes: context?.themes,
            relatedMemories: context?.relatedMemories,
          }
        );
        
        results.push({
          key: candidate.key,
          success: true,
          snippet: candidate.snippet,
          integratedContent: integrated.integrated,
          newConnections: integrated.connections,
        });
        
        // 记录阶段信号
        await MemoryConsolidator.recordDreamingPhaseSignals(
          this.workspaceDir,
          phase === DreamingPhase.REM ? 'rem' : 'light',
          [candidate.key],
          Date.now()
        );
        
      } catch (err) {
        results.push({
          key: candidate.key,
          success: false,
          snippet: candidate.snippet,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    
    return results;
  }

  /**
   * 阶段5: 更新知识图谱
   */
  async updateKnowledgeGraph(
    consolidations: ConsolidationResult[],
    candidates: PromotionCandidate[]
  ): Promise<void> {
    const candidateMap = new Map(
      candidates.map(c => [c.key, c])
    );
    
    for (const result of consolidations) {
      if (!result.success) continue;
      
      const candidate = candidateMap.get(result.key);
      if (!candidate) continue;
      
      // 标记为已晋升
      await MemoryConsolidator.recordDreamingPhaseSignals(
        this.workspaceDir,
        'rem',
        [result.key],
        Date.now()
      );
    }
  }

  /**
   * 阶段6: 执行完整梦境处理流程
   */
  async processDream(
    phase: DreamingPhase,
    nowMs?: number
  ): Promise<DreamingProcessingResult> {
    const now = nowMs ?? Date.now();
    const nowIso = new Date(now).toISOString();
    
    try {
      // 阶段1: 唤醒梦境
      await this.awakenDream(now, phase === DreamingPhase.LIGHT ? 7 : 14);
      
      // 阶段2: 计算7信号评分
      const candidates = this.calculateSevenSignalScores(now);
      
      if (candidates.length === 0) {
        return {
          phase,
          entriesProcessed: 0,
          entriesConsolidated: 0,
          consolidations: [],
          timestamp: nowIso,
        };
      }
      
      // 阶段3: 选择高优先级记忆
      const selected = this.selectHighPriorityMemories(
        candidates,
        phase === DreamingPhase.DEEP ? 5 : 10
      );
      
      // 阶段4: LLM整合
      const consolidations = await this.integrateWithLLM(selected, phase);
      
      // 阶段5: 更新知识图谱
      await this.updateKnowledgeGraph(consolidations, selected);
      
      const successfulConsolidations = consolidations.filter(c => c.success);
      
      return {
        phase,
        entriesProcessed: selected.length,
        entriesConsolidated: successfulConsolidations.length,
        consolidations,
        score: selected[0]?.score,
        timestamp: nowIso,
      };
      
    } catch (err) {
      return {
        phase,
        entriesProcessed: 0,
        entriesConsolidated: 0,
        consolidations: [],
        error: err instanceof Error ? err.message : String(err),
        timestamp: nowIso,
      };
    }
  }

  /**
   * 生成反思信号（用于REM阶段）
   */
  async generateReflectionSignals(
    candidates: PromotionCandidate[]
  ): Promise<string[]> {
    const snippets = candidates.map(c => c.snippet);
    return this.llmIntegration.generateReflections(snippets);
  }

  /**
   * 获取处理统计
   */
  getStatistics(): {
    totalEntries: number;
    candidatesCount: number;
    avgScore: number;
    phaseSignalCounts: { light: number; rem: number };
  } {
    const candidates = this.calculateSevenSignalScores();
    const avgScore = candidates.length > 0
      ? candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length
      : 0;
    
    let lightCount = 0;
    let remCount = 0;
    const signalArray = Array.from(this.phaseSignals.values());
    for (const signal of signalArray) {
      lightCount += signal.lightHits;
      remCount += signal.remHits;
    }
    
    return {
      totalEntries: this.recallEntries.size,
      candidatesCount: candidates.length,
      avgScore,
      phaseSignalCounts: { light: lightCount, rem: remCount },
    };
  }
}

// ============== 工厂函数 ==============

/**
 * 创建梦境处理器
 */
export function createDreamingProcessor(
  workspaceDir: string,
  llmIntegration?: LLMIntegration,
  config?: Partial<DreamingProcessingConfig>
): DreamingProcessor {
  return new DreamingProcessor(workspaceDir, llmIntegration, config);
}

// ============== 导出 ==============

export const DreamingProcessorModule = {
  DreamingProcessor,
  createDreamingProcessor,
  SimpleLLMIntegration,
};

export default DreamingProcessor;
