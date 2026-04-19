/**
 * DreamingSystem 接口适配层
 * 
 * 作用：桥接 OpenCLAW 原版 dreaming.ts 与 OpenTaiji MemorySystem
 * 
 * OpenCLAW 原版：
 * - 使用 plugin-sdk memory-core 接口
 * - 7信号评分: frequency(0.24) + relevance(0.30) + diversity(0.15)
 *              + recency(0.15) + consolidation(0.10) + conceptual(0.06)
 * - 14天半衰期指数衰减
 * 
 * OpenTaiji 版本：
 * - 使用 SQLite storage + FTS5 索引
 * - 与 OpenTaiji DreamingScheduler 集成
 */

// ---------------------------------------------------------------------------
// OpenCLAW 原版信号权重配置
// ---------------------------------------------------------------------------

export const OPENCLAW_SIGNAL_WEIGHTS = {
  frequency: 0.24,
  relevance: 0.30,
  diversity: 0.15,
  recency: 0.15,
  consolidation: 0.10,
  conceptual: 0.06,
} as const;

export const OPENCLAW_PHASE_CONFIG = {
  lightBoostMax: 0.06,
  remBoostMax: 0.09,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenCLAWDreamingConfig {
  memoryDir: string;
  dryRun: boolean;
  minPromotableScore: number;
  maxPromotionsPerNight: number;
  signalWeights: typeof OPENCLAW_SIGNAL_WEIGHTS;
  phaseConfig: typeof OPENCLAW_PHASE_CONFIG;
}

export interface OpenCLAWDreamingStore {
  queryCandidates(criteria: {
    minRecallCount?: number;
    maxAge?: number;
    excludeIds?: string[];
  }): Promise<OpenCLAWDreamingCandidate[]>;
  getRecallStats(entryId: string): Promise<{
    recallCount: number;
    lastRecall: Date;
    queryHashes: string[];
    recallDays: number[];
  }>;
  promote(entryId: string, targetTier: "long_term"): Promise<void>;
  getMemorySummary(): Promise<string>;
}

export interface OpenCLAWDreamingCandidate {
  id: string;
  recallCount?: number;
  concepts?: string[];
  consolidationLevel?: number;
  score?: number;
}

// ---------------------------------------------------------------------------
// 7信号评分算法（移植自 OpenCLAW dreaming-phases.ts）
// ---------------------------------------------------------------------------

/**
 * 计算单个记忆的7信号总评分
 * 
 * OpenCLAW 公式:
 * score = 0.24*frequency + 0.30*relevance + 0.15*diversity
 *         + 0.15*recency + 0.10*consolidation + 0.06*conceptual
 *         + phaseBoost
 * 
 * 其中 recency 使用 14天半衰期的指数衰减
 */
export function calculateSevenSignalScore(
  candidate: {
    recallCount?: number;
    concepts?: string[];
    consolidationLevel?: number;
  },
  stats: {
    recallCount: number;
    lastRecall: Date;
    queryHashes: string[];
    recallDays: number[];
  },
  config: OpenCLAWDreamingConfig
): number {
  const w = config.signalWeights;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // 1. Frequency: recall count normalized (max 10/day)
  const frequencyScore = Math.min((stats.recallCount || 0) / 10, 1) * w.frequency;

  // 2. Relevance: based on query diversity (unique query hashes)
  const uniqueQueries = new Set(stats.queryHashes || []).size;
  const relevanceScore = Math.min(uniqueQueries / 5, 1) * w.relevance;

  // 3. Diversity: spread across different days
  const diversityScore = Math.min((stats.recallDays || []).length / 7, 1) * w.diversity;

  // 4. Recency: exponential decay with 14-day half-life
  const daysSinceRecall = (now - (stats.lastRecall?.getTime() || now)) / DAY_MS;
  const recencyScore = Math.pow(0.5, daysSinceRecall / 14) * w.recency;

  // 5. Consolidation: already partially consolidated memories score higher
  const consolidationScore = (candidate.consolidationLevel ?? 0) * w.consolidation;

  // 6. Conceptual: number of concept tags (max 5)
  const conceptScore = Math.min((candidate.concepts ?? []).length / 5, 1) * w.conceptual;

  return (
    frequencyScore +
    relevanceScore +
    diversityScore +
    recencyScore +
    consolidationScore +
    conceptScore
  );
}

/**
 * Dreaming Cycle 运行结果
 */
export interface DreamCycleResult {
  candidatesScored: number;
  promoted: string[];
  rejected: number;
  summary: string;
  phase: "light" | "rem" | "deep";
}

/**
 * DreamingOpenCLAWAdapter
 * 
 * 将 OpenCLAW 的 Dreaming 逻辑适配到 OpenTaiji 的存储
 */
export class DreamingOpenCLAWAdapter {
  private store: OpenCLAWDreamingStore;
  private config: OpenCLAWDreamingConfig;

  constructor(
    store: OpenCLAWDreamingStore,
    config: Partial<OpenCLAWDreamingConfig> = {}
  ) {
    this.store = store;
    this.config = {
      memoryDir: config.memoryDir ?? "./memory",
      dryRun: config.dryRun ?? false,
      minPromotableScore: config.minPromotableScore ?? 0.5,
      maxPromotionsPerNight: config.maxPromotionsPerNight ?? 10,
      signalWeights: config.signalWeights ?? { ...OPENCLAW_SIGNAL_WEIGHTS },
      phaseConfig: config.phaseConfig ?? { ...OPENCLAW_PHASE_CONFIG },
    };
  }

  /**
   * 运行完整的 Dreaming 循环（OpenCLAW 原版逻辑）
   */
  async runDreamCycle(): Promise<DreamCycleResult> {
    const candidates = await this.store.queryCandidates({
      minRecallCount: 2,
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    });

    if (candidates.length === 0) {
      return {
        candidatesScored: 0,
        promoted: [],
        rejected: 0,
        summary: "No candidates found",
        phase: "deep",
      };
    }

    // Score each candidate using 7-signal algorithm
    const scored = await Promise.all(
      candidates.map(async (candidate) => {
        const stats = await this.store.getRecallStats(candidate.id);
        return {
          ...candidate,
          recallCount: stats.recallCount,
          lastRecall: stats.lastRecall,
          queryHashes: stats.queryHashes,
          recallDays: stats.recallDays,
          score: calculateSevenSignalScore(candidate, stats, this.config),
        };
      })
    );

    // Sort by score (descending)
    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Promote top candidates (respecting max limit)
    const promoted: string[] = [];
    for (const candidate of scored) {
      if (promoted.length >= this.config.maxPromotionsPerNight) break;
      if ((candidate.score ?? 0) >= this.config.minPromotableScore) {
        if (!this.config.dryRun) {
          await this.store.promote(candidate.id, "long_term");
        }
        promoted.push(candidate.id);
      }
    }

    const summary = await this.store.getMemorySummary();

    return {
      candidatesScored: candidates.length,
      promoted,
      rejected: candidates.length - promoted.length,
      summary,
      phase: promoted.length > 0 ? "deep" : "light",
    };
  }

  getConfig(): OpenCLAWDreamingConfig {
    return { ...this.config };
  }
}
