/**
 * DeepPhaseRanker.ts - 深睡阶段评分排序器
 * 
 * OpenTaiji三阶段记忆整合，实现Deep Phase功能：
 * - 7信号评分算法
 * - 阈值门控
 * - 写入MEMORY.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ShortTermRecallEntry,
  PromotionCandidate,
  PromotionComponents,
  PromotionWeights,
  ApplyPromotionResult,
  PhaseSignalStore
} from './types';
import { RecallTracker } from './RecallTracker';

const DAY_MS = 24 * 60 * 60 * 1000;

// 默认权重（基于OpenTaiji研究）
export const DEFAULT_WEIGHTS: PromotionWeights = {
  frequency: 0.24,
  relevance: 0.30,
  diversity: 0.15,
  recency: 0.15,
  consolidation: 0.10,
  conceptual: 0.06
};

// 阶段信号配置
const PHASE_SIGNAL_CONFIG = {
  lightBoostMax: 0.06,
  remBoostMax: 0.09,
  halfLifeDays: 14
};

// 存储路径
const MEMORY_FILE = 'MEMORY.md';
const PHASE_SIGNALS_FILE = 'memory/.dreams/phase-signals.json';

export interface DeepPhaseResult {
  candidatesRanked: PromotionCandidate[];
  candidatesPromoted: PromotionCandidate[];
  applied: ApplyPromotionResult;
}

export interface DeepPhaseOptions {
  limit: number;
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
  recencyHalfLifeDays?: number;
  maxAgeDays?: number;
  weights?: Partial<PromotionWeights>;
}

export class DeepPhaseRanker {
  private workspaceDir: string;
  private recallTracker: RecallTracker;
  private weights: PromotionWeights;
  private phaseSignals: Map<string, { lightHits: number; remHits: number; lastLightAt?: string; lastRemAt?: string }>;

  constructor(
    workspaceDir: string,
    recallTracker: RecallTracker,
    options?: { weights?: Partial<PromotionWeights> }
  ) {
    this.workspaceDir = workspaceDir;
    this.recallTracker = recallTracker;
    this.weights = { ...DEFAULT_WEIGHTS, ...options?.weights };
    this.phaseSignals = new Map();
  }

  /**
   * 执行Deep Phase
   */
  async execute(entries: ShortTermRecallEntry[], options: DeepPhaseOptions): Promise<DeepPhaseResult> {
    const nowMs = Date.now();
    
    // 1. 加载阶段信号
    await this.loadPhaseSignals();
    
    // 2. 计算候选评分
    const candidates = this.rankCandidates(entries, options, nowMs);
    
    // 3. 应用阈值门控
    const promoted = candidates.filter(c => this.passesGate(c, options));
    
    // 4. 写入MEMORY.md
    const applied = await this.applyPromotions(promoted.slice(0, options.limit), options, nowMs);
    
    // 5. 更新阶段信号
    await this.updatePhaseSignals(promoted, nowMs);
    
    return {
      candidatesRanked: candidates,
      candidatesPromoted: promoted,
      applied
    };
  }

  /**
   * 加载阶段信号
   */
  private async loadPhaseSignals(): Promise<void> {
    const signalsPath = path.join(this.workspaceDir, PHASE_SIGNALS_FILE);
    
    try {
      const raw = await fs.readFile(signalsPath, 'utf-8');
      const store: PhaseSignalStore = JSON.parse(raw);
      
      for (const [key, entry] of Object.entries(store.entries)) {
        this.phaseSignals.set(key, {
          lightHits: entry.lightHits,
          remHits: entry.remHits,
          lastLightAt: entry.lastLightAt,
          lastRemAt: entry.lastRemAt
        });
      }
    } catch (error) {
      // 文件不存在或解析失败，使用空信号
      this.phaseSignals.clear();
    }
  }

  /**
   * 候选评分排序
   */
  private rankCandidates(
    entries: ShortTermRecallEntry[],
    options: DeepPhaseOptions,
    nowMs: number
  ): PromotionCandidate[] {
    const halfLifeDays = options.recencyHalfLifeDays ?? 14;
    
    return entries
      .filter(entry => !entry.promotedAt) // 排除已提升的
      .map(entry => this.scoreCandidate(entry, halfLifeDays, nowMs))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score || a.snippet.localeCompare(b.snippet));
  }

  /**
   * 计算单个候选评分
   */
  private scoreCandidate(
    entry: ShortTermRecallEntry,
    halfLifeDays: number,
    nowMs: number
  ): PromotionCandidate {
    const components = this.calculateComponents(entry, halfLifeDays, nowMs);
    
    // 计算总评分
    const score =
      components.frequency * this.weights.frequency +
      components.relevance * this.weights.relevance +
      components.diversity * this.weights.diversity +
      components.recency * this.weights.recency +
      components.consolidation * this.weights.consolidation +
      components.conceptual * this.weights.conceptual +
      components.phaseBoost;

    return {
      key: entry.key,
      path: entry.path,
      startLine: entry.startLine,
      endLine: entry.endLine,
      source: entry.source,
      snippet: entry.snippet,
      recallCount: entry.recallCount,
      dailyCount: entry.dailyCount,
      groundedCount: entry.groundedCount,
      signalCount: entry.recallCount + entry.dailyCount + entry.groundedCount,
      avgScore: this.calculateAvgScore(entry),
      maxScore: entry.maxScore,
      uniqueQueries: entry.queryHashes.length,
      claimHash: entry.claimHash,
      firstRecalledAt: entry.firstRecalledAt,
      lastRecalledAt: entry.lastRecalledAt,
      ageDays: this.calculateAgeDays(entry, nowMs),
      score: Math.max(0, Math.min(1, score)),
      recallDays: entry.recallDays,
      conceptTags: entry.conceptTags,
      components
    };
  }

  /**
   * 计算评分组件
   */
  private calculateComponents(
    entry: ShortTermRecallEntry,
    halfLifeDays: number,
    nowMs: number
  ): PromotionComponents {
    // 1. Frequency (0.24) - 回忆频率
    const signalCount = Math.max(1, entry.recallCount + entry.dailyCount + entry.groundedCount);
    const frequency = Math.min(1, Math.log1p(signalCount) / Math.log1p(10));

    // 2. Relevance (0.30) - 相关性（基于平均分）
    const relevance = this.calculateAvgScore(entry);

    // 3. Diversity (0.15) - 多样性（基于独立查询数）
    const diversity = Math.min(1, entry.queryHashes.length / 6);

    // 4. Recency (0.15) - 新近度（基于遗忘曲线）
    const ageDays = this.calculateAgeDays(entry, nowMs);
    const recency = this.calculateRecency(ageDays, halfLifeDays);

    // 5. Consolidation (0.10) - 巩固度（基于间隔重复）
    const consolidation = this.calculateConsolidation(entry.recallDays);

    // 6. Conceptual (0.06) - 概念标签
    const conceptual = Math.min(1, entry.conceptTags.length / 6);

    // 7. Phase Boost - 阶段增强
    const phaseBoost = this.calculatePhaseBoost(entry.key, nowMs);

    return {
      frequency,
      relevance,
      diversity,
      recency,
      consolidation,
      conceptual,
      phaseBoost
    };
  }

  /**
   * 计算平均分
   */
  private calculateAvgScore(entry: ShortTermRecallEntry): number {
    const signalCount = entry.recallCount + entry.dailyCount + entry.groundedCount;
    return signalCount > 0 
      ? Math.max(0, Math.min(1, entry.totalScore / signalCount))
      : 0;
  }

  /**
   * 计算记忆年龄
   */
  private calculateAgeDays(entry: ShortTermRecallEntry, nowMs: number): number {
    const firstRecalledMs = Date.parse(entry.firstRecalledAt);
    if (!Number.isFinite(firstRecalledMs)) {
      return 0;
    }
    return Math.max(0, (nowMs - firstRecalledMs) / DAY_MS);
  }

  /**
   * 计算新近度（遗忘曲线）
   */
  private calculateRecency(ageDays: number, halfLifeDays: number): number {
    if (ageDays < 0 || !Number.isFinite(halfLifeDays) || halfLifeDays <= 0) {
      return 1;
    }
    const lambda = Math.LN2 / halfLifeDays;
    return Math.exp(-lambda * ageDays);
  }

  /**
   * 计算巩固度
   */
  private calculateConsolidation(recallDays: string[]): number {
    if (recallDays.length === 0) return 0;
    if (recallDays.length === 1) return 0.2;

    const parsed = recallDays
      .map(d => Date.parse(`${d}T00:00:00.000Z`))
      .filter(d => Number.isFinite(d))
      .sort((a, b) => a - b);

    if (parsed.length <= 1) return 0.2;

    const spanDays = Math.max(0, (parsed[parsed.length - 1] - parsed[0]) / DAY_MS);
    const spacing = Math.min(1, Math.log1p(parsed.length - 1) / Math.log1p(4));
    const span = Math.min(1, spanDays / 7);

    return Math.max(0, Math.min(1, 0.55 * spacing + 0.45 * span));
  }

  /**
   * 计算阶段增强
   */
  private calculatePhaseBoost(key: string, nowMs: number): number {
    const signal = this.phaseSignals.get(key);
    if (!signal) return 0;

    // Light阶段增强
    const lightStrength = Math.min(1, Math.log1p(Math.max(0, signal.lightHits)) / Math.log1p(6));
    const lightAgeDays = signal.lastLightAt 
      ? Math.max(0, (nowMs - Date.parse(signal.lastLightAt)) / DAY_MS)
      : PHASE_SIGNAL_CONFIG.halfLifeDays;
    const lightRecency = this.calculateRecency(lightAgeDays, PHASE_SIGNAL_CONFIG.halfLifeDays);
    const lightBoost = PHASE_SIGNAL_CONFIG.lightBoostMax * lightStrength * lightRecency;

    // REM阶段增强
    const remStrength = Math.min(1, Math.log1p(Math.max(0, signal.remHits)) / Math.log1p(6));
    const remAgeDays = signal.lastRemAt 
      ? Math.max(0, (nowMs - Date.parse(signal.lastRemAt)) / DAY_MS)
      : PHASE_SIGNAL_CONFIG.halfLifeDays;
    const remRecency = this.calculateRecency(remAgeDays, PHASE_SIGNAL_CONFIG.halfLifeDays);
    const remBoost = PHASE_SIGNAL_CONFIG.remBoostMax * remStrength * remRecency;

    return Math.max(0, Math.min(1, lightBoost + remBoost));
  }

  /**
   * 通过阈值门控
   */
  private passesGate(candidate: PromotionCandidate, options: DeepPhaseOptions): boolean {
    if (candidate.score < options.minScore) return false;
    if (candidate.recallCount < options.minRecallCount) return false;
    if (candidate.uniqueQueries < options.minUniqueQueries) return false;
    
    if (options.maxAgeDays && candidate.ageDays > options.maxAgeDays) return false;
    
    return true;
  }

  /**
   * 应用提升（写入MEMORY.md）
   */
  private async applyPromotions(
    candidates: PromotionCandidate[],
    options: DeepPhaseOptions,
    nowMs: number
  ): Promise<ApplyPromotionResult> {
    const memoryPath = path.join(this.workspaceDir, MEMORY_FILE);
    let existingContent = '';
    let appended = 0;
    let reconciledExisting = 0;
    const appliedCandidates: PromotionCandidate[] = [];

    try {
      existingContent = await fs.readFile(memoryPath, 'utf-8');
    } catch (error) {
      // 文件不存在，创建新文件
      existingContent = '# MEMORY.md\n\n## 长期记忆\n\n';
    }

    const lines = existingContent.split('\n');
    const newLines: string[] = [];
    const promotedAt = new Date(nowMs).toISOString();

    for (const candidate of candidates) {
      if (appliedCandidates.length >= options.limit) break;

      // 检查是否已存在类似内容
      const exists = this.checkExistingContent(lines, candidate.snippet);
      
      if (exists) {
        reconciledExisting++;
        continue;
      }

      // 添加新内容
      const memoryEntry = this.formatMemoryEntry(candidate, promotedAt);
      newLines.push(memoryEntry);
      appliedCandidates.push({
        ...candidate,
        promotedAt
      });
      appended++;
    }

    // 写入文件
    if (newLines.length > 0) {
      const updatedContent = existingContent + '\n' + newLines.join('\n');
      await fs.writeFile(memoryPath, updatedContent, 'utf-8');
    }

    return {
      applied: appliedCandidates.length,
      appended,
      reconciledExisting,
      appliedCandidates
    };
  }

  /**
   * 检查是否已存在类似内容
   */
  private checkExistingContent(lines: string[], snippet: string): boolean {
    const normalizedSnippet = snippet.toLowerCase().replace(/\s+/g, ' ').trim();
    
    for (const line of lines) {
      const normalizedLine = line.toLowerCase().replace(/\s+/g, ' ').trim();
      if (this.jaccardSimilarity(normalizedLine, normalizedSnippet) >= 0.9) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 计算Jaccard相似度
   */
  private jaccardSimilarity(left: string, right: string): number {
    const leftTokens = new Set(this.tokenize(left));
    const rightTokens = new Set(this.tokenize(right));
    
    if (leftTokens.size === 0 || rightTokens.size === 0) {
      return left === right ? 1 : 0;
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
      .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
      .filter(t => t.length > 0);
  }

  /**
   * 格式化记忆条目
   */
  private formatMemoryEntry(candidate: PromotionCandidate, promotedAt: string): string {
    const tags = candidate.conceptTags.length > 0 
      ? candidate.conceptTags.map(t => `\`${t}\``).join(' ')
      : '';
    
    return `
### ${this.formatDate(new Date())} 整合记忆

- **来源**: ${candidate.path}:${candidate.startLine}-${candidate.endLine}
- **内容**: ${candidate.snippet}
- **评分**: ${candidate.score.toFixed(3)} (频率=${candidate.components.frequency.toFixed(2)}, 相关=${candidate.components.relevance.toFixed(2)}, 多样=${candidate.components.diversity.toFixed(2)}, 新近=${candidate.components.recency.toFixed(2)}, 巩固=${candidate.components.consolidation.toFixed(2)}, 概念=${candidate.components.conceptual.toFixed(2)}, 增强=${candidate.components.phaseBoost.toFixed(3)})
- **召回**: ${candidate.recallCount}次, ${candidate.uniqueQueries}个独立查询
- **标签**: ${tags || '无'}
- **提升时间**: ${promotedAt}
`;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 更新阶段信号
   */
  private async updatePhaseSignals(
    candidates: PromotionCandidate[],
    nowMs: number
  ): Promise<void> {
    const nowIso = new Date(nowMs).toISOString();
    const entries: PhaseSignalStore['entries'] = {};

    for (const candidate of candidates) {
      const existing = this.phaseSignals.get(candidate.key) || {
        lightHits: 0,
        remHits: 0
      };

      entries[candidate.key] = {
        key: candidate.key,
        lightHits: existing.lightHits,
        remHits: existing.remHits + 1,
        lastLightAt: existing.lastLightAt,
        lastRemAt: nowIso
      };
    }

    const store: PhaseSignalStore = {
      version: 1,
      updatedAt: nowIso,
      entries
    };

    const signalsDir = path.join(this.workspaceDir, 'memory', '.dreams');
    await fs.mkdir(signalsDir, { recursive: true });
    
    const signalsPath = path.join(signalsDir, 'phase-signals.json');
    await fs.writeFile(signalsPath, JSON.stringify(store, null, 2), 'utf-8');
  }
}

export default DeepPhaseRanker;
