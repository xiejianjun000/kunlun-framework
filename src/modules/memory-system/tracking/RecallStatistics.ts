/**
 * RecallStatistics.ts - Recall Statistics Analyzer
 * 
 * Analyzes recall patterns and computes statistics.
 * Based on OpenCLAW's short-term promotion scoring logic.
 */

import type {
  RecallEntry,
  RecallStore,
  PromotionCandidate,
  PromotionComponents,
  PromotionWeights,
  PhaseSignal,
  PhaseSignalStore,
  RankCandidatesOptions,
} from './types';
import { DEFAULT_PROMOTION_WEIGHTS, DEFAULT_RECALL_TRACKING_CONFIG } from './types';
import { normalizeIsoDay } from './RecallSignal';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Configuration for statistics calculation
 */
export interface StatisticsConfig {
  recencyHalfLifeDays: number;
  weights: PromotionWeights;
  minScore: number;
  minRecallCount: number;
  minUniqueQueries: number;
  maxAgeDays: number;
}

/**
 * Default statistics configuration
 */
const DEFAULT_STATISTICS_CONFIG: StatisticsConfig = {
  recencyHalfLifeDays: DEFAULT_RECALL_TRACKING_CONFIG.defaultRecencyHalfLifeDays,
  weights: DEFAULT_PROMOTION_WEIGHTS,
  minScore: DEFAULT_RECALL_TRACKING_CONFIG.minPromotionScore,
  minRecallCount: DEFAULT_RECALL_TRACKING_CONFIG.minPromotionRecallCount,
  minUniqueQueries: DEFAULT_RECALL_TRACKING_CONFIG.minPromotionUniqueQueries,
  maxAgeDays: DEFAULT_RECALL_TRACKING_CONFIG.maxPromotionAgeDays,
};

/**
 * Calculate recency score using exponential decay (half-life model)
 */
export function calculateRecencyScore(
  lastRecalledAt: string,
  nowMs: number,
  halfLifeDays: number
): number {
  const lastRecall = new Date(lastRecalledAt).getTime();
  const elapsedMs = nowMs - lastRecall;
  const halfLifeMs = halfLifeDays * DAY_MS;
  
  if (elapsedMs <= 0) return 1.0;
  
  // Exponential decay: score = 0.5^(elapsed / halfLife)
  return Math.pow(0.5, elapsedMs / halfLifeMs);
}

/**
 * Calculate frequency score (normalized recall count)
 */
export function calculateFrequencyScore(
  recallCount: number,
  maxRecallCount: number = 10
): number {
  if (maxRecallCount <= 0) return 0;
  return Math.min(1.0, recallCount / maxRecallCount);
}

/**
 * Calculate diversity score (unique queries ratio)
 */
export function calculateDiversityScore(
  uniqueQueries: number,
  totalRecalls: number
): number {
  if (totalRecalls <= 0) return 0;
  return Math.min(1.0, uniqueQueries / Math.sqrt(totalRecalls));
}

/**
 * Calculate relevance score (average score)
 */
export function calculateRelevanceScore(
  avgScore: number
): number {
  return Math.max(0, Math.min(1, avgScore));
}

/**
 * Calculate consolidation score (number of distinct recall days)
 */
export function calculateConsolidationScore(
  recallDays: string[],
  maxDays: number = 16
): number {
  if (recallDays.length === 0) return 0;
  // Penalize single-day spikes, reward distributed recalls
  const daySpread = recallDays.length;
  return Math.min(1.0, daySpread / Math.min(maxDays, 7));
}

/**
 * Calculate conceptual score (based on concept tag coverage)
 */
export function calculateConceptualScore(conceptTags: string[]): number {
  if (conceptTags.length === 0) return 0.5; // Neutral for no tags
  // More tags generally indicate richer semantic content
  return Math.min(1.0, 0.3 + (conceptTags.length * 0.1));
}

/**
 * Calculate phase signal boost (for dreaming scoring)
 */
export function calculatePhaseSignalBoost(
  entry: RecallEntry,
  phaseSignals: Record<string, PhaseSignal>,
  nowMs: number,
  halfLifeDays: number = 14
): number {
  const signal = phaseSignals[entry.key];
  if (!signal) return 0;

  const halfLifeMs = halfLifeDays * DAY_MS;
  let boost = 0;

  // Light phase boost
  if (signal.lightHits > 0 && signal.lastLightAt) {
    const elapsed = nowMs - new Date(signal.lastLightAt).getTime();
    const decay = Math.pow(0.5, elapsed / halfLifeMs);
    boost += signal.lightHits * 0.02 * decay;
  }

  // REM phase boost (stronger)
  if (signal.remHits > 0 && signal.lastRemAt) {
    const elapsed = nowMs - new Date(signal.lastRemAt).getTime();
    const decay = Math.pow(0.5, elapsed / halfLifeMs);
    boost += signal.remHits * 0.03 * decay;
  }

  return Math.min(0.15, boost); // Cap at 0.15
}

/**
 * Calculate total promotion score
 */
export function calculatePromotionScore(
  components: PromotionComponents,
  weights: PromotionWeights
): number {
  const score =
    components.frequency * weights.frequency +
    components.relevance * weights.relevance +
    components.diversity * weights.diversity +
    components.recency * weights.recency +
    components.consolidation * weights.consolidation +
    components.conceptual * weights.conceptual;

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate all promotion components for an entry
 */
export function calculatePromotionComponents(
  entry: RecallEntry,
  phaseSignals: Record<string, PhaseSignal>,
  nowMs: number,
  config: StatisticsConfig,
  phaseSignalBoost?: number
): PromotionComponents {
  const avgScore = entry.recallCount > 0 ? entry.totalScore / entry.recallCount : 0;
  const uniqueQueries = entry.queryHashes.length;

  const components: PromotionComponents = {
    frequency: calculateFrequencyScore(entry.recallCount),
    relevance: calculateRelevanceScore(avgScore),
    diversity: calculateDiversityScore(uniqueQueries, entry.recallCount),
    recency: calculateRecencyScore(entry.lastRecalledAt, nowMs, config.recencyHalfLifeDays),
    consolidation: calculateConsolidationScore(entry.recallDays),
    conceptual: calculateConceptualScore(entry.conceptTags),
  };

  // Apply phase signal boost if available
  if (phaseSignalBoost !== undefined) {
    components.relevance = Math.min(1, components.relevance + phaseSignalBoost);
  }

  return components;
}

/**
 * Rank entries as promotion candidates
 */
export function rankPromotionCandidates(
  store: RecallStore,
  phaseSignals: PhaseSignalStore,
  options: RankCandidatesOptions = {},
  nowMs?: number
): PromotionCandidate[] {
  const currentTime = nowMs ?? Date.now();
  
  const config: StatisticsConfig = {
    recencyHalfLifeDays: options.recencyHalfLifeDays ?? DEFAULT_STATISTICS_CONFIG.recencyHalfLifeDays,
    weights: { ...DEFAULT_STATISTICS_CONFIG.weights, ...options.weights },
    minScore: options.minScore ?? DEFAULT_STATISTICS_CONFIG.minScore,
    minRecallCount: options.minRecallCount ?? DEFAULT_STATISTICS_CONFIG.minRecallCount,
    minUniqueQueries: options.minUniqueQueries ?? DEFAULT_STATISTICS_CONFIG.minUniqueQueries,
    maxAgeDays: options.maxAgeDays ?? DEFAULT_STATISTICS_CONFIG.maxAgeDays,
  };

  const candidates: PromotionCandidate[] = [];
  const phaseSignalMap = phaseSignals.entries;

  for (const entry of Object.values(store.entries)) {
    // Skip already promoted unless explicitly included
    if (entry.promotedAt && !options.includePromoted) {
      continue;
    }

    // Apply filters
    if (entry.recallCount < config.minRecallCount) continue;
    if (entry.queryHashes.length < config.minUniqueQueries) continue;

    // Calculate age
    const firstRecall = new Date(entry.firstRecalledAt).getTime();
    const ageDays = (currentTime - firstRecall) / DAY_MS;
    if (config.maxAgeDays > 0 && ageDays > config.maxAgeDays) continue;

    // Calculate phase signal boost
    const phaseSignalBoost = calculatePhaseSignalBoost(
      entry,
      phaseSignalMap,
      currentTime,
      DEFAULT_RECALL_TRACKING_CONFIG.phaseSignalHalfLifeDays
    );

    // Calculate components
    const components = calculatePromotionComponents(
      entry,
      phaseSignalMap,
      currentTime,
      config,
      phaseSignalBoost
    );

    // Calculate overall score
    const score = calculatePromotionScore(components, config.weights);

    // Apply minimum score filter
    if (score < config.minScore) continue;

    candidates.push({
      key: entry.key,
      path: entry.path,
      startLine: entry.startLine,
      endLine: entry.endLine,
      source: entry.source,
      snippet: entry.snippet,
      recallCount: entry.recallCount,
      dailyCount: entry.dailyCount,
      groundedCount: entry.groundedCount,
      signalCount: phaseSignalMap[entry.key]
        ? phaseSignalMap[entry.key].lightHits + phaseSignalMap[entry.key].remHits
        : 0,
      avgScore: entry.recallCount > 0 ? entry.totalScore / entry.recallCount : 0,
      maxScore: entry.maxScore,
      uniqueQueries: entry.queryHashes.length,
      claimHash: entry.claimHash,
      promotedAt: entry.promotedAt,
      firstRecalledAt: entry.firstRecalledAt,
      lastRecalledAt: entry.lastRecalledAt,
      ageDays,
      score,
      recallDays: entry.recallDays,
      conceptTags: entry.conceptTags,
      components,
    });
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Get recall statistics for a store
 */
export function getRecallStatistics(store: RecallStore): {
  totalEntries: number;
  totalRecalls: number;
  avgRecallCount: number;
  maxRecallCount: number;
  promotedCount: number;
  avgScore: number;
  conceptTaggedCount: number;
} {
  const entries = Object.values(store.entries);
  
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalRecalls: 0,
      avgRecallCount: 0,
      maxRecallCount: 0,
      promotedCount: 0,
      avgScore: 0,
      conceptTaggedCount: 0,
    };
  }

  const totalRecalls = entries.reduce((sum, e) => sum + e.recallCount, 0);
  const maxRecallCount = Math.max(...entries.map(e => e.recallCount));
  const promotedCount = entries.filter(e => e.promotedAt).length;
  const conceptTaggedCount = entries.filter(e => e.conceptTags.length > 0).length;
  
  const totalScore = entries.reduce((sum, e) => sum + e.totalScore, 0);
  const avgScore = totalRecalls > 0 ? totalScore / totalRecalls : 0;

  return {
    totalEntries: entries.length,
    totalRecalls,
    avgRecallCount: totalRecalls / entries.length,
    maxRecallCount,
    promotedCount,
    avgScore,
    conceptTaggedCount,
  };
}

/**
 * Calculate spaced repetition intervals
 */
export function calculateSpacedRepetitionIntervals(
  recallDays: string[],
  nowMs: number
): { nextReview: string; intervalDays: number; easeFactor: number } {
  if (recallDays.length < 2) {
    return {
      nextReview: new Date(nowMs + DAY_MS).toISOString(),
      intervalDays: 1,
      easeFactor: 2.5,
    };
  }

  const sortedDays = [...recallDays].sort().reverse();
  const lastRecall = new Date(sortedDays[0]).getTime();
  const previousRecall = new Date(sortedDays[1]).getTime();
  
  const actualInterval = (lastRecall - previousRecall) / DAY_MS;
  
  // SM-2 inspired calculation
  let intervalDays: number;
  if (recallDays.length === 2) {
    intervalDays = 1;
  } else {
    intervalDays = Math.round(actualInterval * 2.5);
  }
  
  const easeFactor = Math.max(1.3, 2.5 - (actualInterval - 1) * 0.1);
  const nextReview = new Date(nowMs + intervalDays * DAY_MS);

  return {
    nextReview: nextReview.toISOString(),
    intervalDays: Math.max(1, intervalDays),
    easeFactor,
  };
}

/**
 * RecallStatistics class - Analyzes recall patterns
 */
export class RecallStatistics {
  private config: StatisticsConfig;

  constructor(config: Partial<StatisticsConfig> = {}) {
    this.config = {
      recencyHalfLifeDays: config.recencyHalfLifeDays ?? DEFAULT_STATISTICS_CONFIG.recencyHalfLifeDays,
      weights: config.weights ?? { ...DEFAULT_STATISTICS_CONFIG.weights },
      minScore: config.minScore ?? DEFAULT_STATISTICS_CONFIG.minScore,
      minRecallCount: config.minRecallCount ?? DEFAULT_STATISTICS_CONFIG.minRecallCount,
      minUniqueQueries: config.minUniqueQueries ?? DEFAULT_STATISTICS_CONFIG.minUniqueQueries,
      maxAgeDays: config.maxAgeDays ?? DEFAULT_STATISTICS_CONFIG.maxAgeDays,
    };
  }

  /**
   * Calculate recency score
   */
  calculateRecencyScore(lastRecalledAt: string, nowMs?: number): number {
    return calculateRecencyScore(lastRecalledAt, nowMs ?? Date.now(), this.config.recencyHalfLifeDays);
  }

  /**
   * Calculate frequency score
   */
  calculateFrequencyScore(recallCount: number, maxRecallCount?: number): number {
    return calculateFrequencyScore(recallCount, maxRecallCount);
  }

  /**
   * Calculate diversity score
   */
  calculateDiversityScore(uniqueQueries: number, totalRecalls: number): number {
    return calculateDiversityScore(uniqueQueries, totalRecalls);
  }

  /**
   * Calculate relevance score
   */
  calculateRelevanceScore(avgScore: number): number {
    return calculateRelevanceScore(avgScore);
  }

  /**
   * Calculate consolidation score
   */
  calculateConsolidationScore(recallDays: string[]): number {
    return calculateConsolidationScore(recallDays);
  }

  /**
   * Calculate conceptual score
   */
  calculateConceptualScore(conceptTags: string[]): number {
    return calculateConceptualScore(conceptTags);
  }

  /**
   * Calculate promotion components
   */
  calculatePromotionComponents(
    entry: RecallEntry,
    phaseSignals: Record<string, PhaseSignal>,
    nowMs?: number
  ): PromotionComponents {
    return calculatePromotionComponents(
      entry,
      phaseSignals,
      nowMs ?? Date.now(),
      this.config
    );
  }

  /**
   * Calculate overall promotion score
   */
  calculatePromotionScore(components: PromotionComponents): number {
    return calculatePromotionScore(components, this.config.weights);
  }

  /**
   * Rank entries as promotion candidates
   */
  rankCandidates(
    store: RecallStore,
    phaseSignals: PhaseSignalStore,
    options?: RankCandidatesOptions,
    nowMs?: number
  ): PromotionCandidate[] {
    return rankPromotionCandidates(store, phaseSignals, {
      ...options,
      recencyHalfLifeDays: this.config.recencyHalfLifeDays,
      minScore: this.config.minScore,
      minRecallCount: this.config.minRecallCount,
      minUniqueQueries: this.config.minUniqueQueries,
      maxAgeDays: this.config.maxAgeDays,
      weights: this.config.weights,
    }, nowMs);
  }

  /**
   * Get statistics for a store
   */
  getStatistics(store: RecallStore) {
    return getRecallStatistics(store);
  }

  /**
   * Calculate spaced repetition intervals
   */
  calculateSpacedRepetition(recallDays: string[], nowMs?: number) {
    return calculateSpacedRepetitionIntervals(recallDays, nowMs ?? Date.now());
  }

  /**
   * Get current configuration
   */
  getConfig(): StatisticsConfig {
    return { ...this.config };
  }
}

/**
 * Default statistics instance
 */
export const defaultStatistics = new RecallStatistics();
