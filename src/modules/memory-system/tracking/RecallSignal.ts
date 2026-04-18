/**
 * RecallSignal.ts - Recall Signal Recorder
 * 
 * Records recall signals from memory searches.
 * Based on OpenCLAW's short-term recall recording logic.
 */

import { createHash, randomUUID } from 'crypto';
import type {
  RecallSignal,
  RecallEntry,
  RecallStore,
  MemorySearchResult,
  RecordRecallsOptions,
} from './types';
import { DEFAULT_RECALL_TRACKING_CONFIG } from './types';

/**
 * Configuration for recall signal recording
 */
export interface RecallSignalConfig {
  /** Maximum query hashes to store per entry */
  maxQueryHashes: number;
  /** Maximum recall days to track per entry */
  maxRecallDays: number;
  /** Default config */
  defaultConfig: typeof DEFAULT_RECALL_TRACKING_CONFIG;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RecallSignalConfig = {
  maxQueryHashes: DEFAULT_RECALL_TRACKING_CONFIG.maxQueryHashes,
  maxRecallDays: DEFAULT_RECALL_TRACKING_CONFIG.maxRecallDays,
  defaultConfig: DEFAULT_RECALL_TRACKING_CONFIG,
};

/**
 * Generate a recall key from search result
 */
export function buildRecallKey(result: {
  source: string;
  path: string;
  startLine: number;
  endLine: number;
}): string {
  return `${result.source}:${result.path}:${result.startLine}:${result.endLine}`;
}

/**
 * Generate a query hash for deduplication
 */
export function hashQuery(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Normalize a date string to YYYY-MM-DD format
 */
export function normalizeIsoDay(isoString: string | undefined): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDay(nowMs?: number): string {
  const now = nowMs ? new Date(nowMs) : new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Merge recent distinct days, keeping the most recent ones
 */
export function mergeRecentDistinct(
  existingDays: string[],
  newDay: string,
  maxDays: number
): string[] {
  const daySet = new Set<string>(existingDays);
  daySet.add(newDay);
  const sortedDays = Array.from(daySet).sort().reverse();
  return sortedDays.slice(0, maxDays);
}

/**
 * Normalize snippet text
 */
export function normalizeSnippet(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\s+/g, ' ');
}

/**
 * Create a new RecallEntry from search result
 */
export function createRecallEntry(
  result: MemorySearchResult,
  query: string,
  queryHash: string,
  nowMs: number
): RecallEntry {
  const nowIso = new Date(nowMs).toISOString();
  const day = getCurrentDay(nowMs);

  return {
    key: buildRecallKey(result),
    path: result.path,
    startLine: result.startLine,
    endLine: result.endLine,
    source: result.source,
    snippet: normalizeSnippet(result.snippet),
    recallCount: 1,
    dailyCount: 1,
    groundedCount: 0,
    totalScore: result.score,
    maxScore: result.score,
    firstRecalledAt: nowIso,
    lastRecalledAt: nowIso,
    queryHashes: [queryHash],
    recallDays: [day],
    conceptTags: [],
  };
}

/**
 * Update an existing RecallEntry with new recall data
 */
export function updateRecallEntry(
  existing: RecallEntry,
  result: MemorySearchResult,
  queryHash: string,
  nowMs: number,
  config: RecallSignalConfig
): RecallEntry {
  const nowIso = new Date(nowMs).toISOString();
  const currentDay = getCurrentDay(nowMs);
  const existingDay = normalizeIsoDay(existing.lastRecalledAt);

  // Check if this is a new query
  const isNewQuery = !existing.queryHashes.includes(queryHash);
  
  // Check if this is a new day
  const isNewDay = existingDay !== currentDay;

  return {
    ...existing,
    snippet: normalizeSnippet(result.snippet),
    recallCount: existing.recallCount + 1,
    dailyCount: isNewDay ? 1 : existing.dailyCount + 1,
    totalScore: existing.totalScore + result.score,
    maxScore: Math.max(existing.maxScore, result.score),
    lastRecalledAt: nowIso,
    queryHashes: isNewQuery
      ? [...existing.queryHashes, queryHash].slice(-config.maxQueryHashes)
      : existing.queryHashes,
    recallDays: mergeRecentDistinct(
      existing.recallDays,
      currentDay,
      config.maxRecallDays
    ),
  };
}

/**
 * Process search results and update recall store
 */
export function processRecallResults(
  store: RecallStore,
  results: MemorySearchResult[],
  query: string,
  nowMs: number,
  config: RecallSignalConfig = DEFAULT_CONFIG
): RecallStore {
  const queryHash = hashQuery(query);
  const nowIso = new Date(nowMs).toISOString();
  const updatedEntries = { ...store.entries };

  for (const result of results) {
    const key = buildRecallKey(result);
    const existing = updatedEntries[key];

    if (existing) {
      updatedEntries[key] = updateRecallEntry(existing, result, queryHash, nowMs, config);
    } else {
      updatedEntries[key] = createRecallEntry(result, query, queryHash, nowMs);
    }
  }

  return {
    version: store.version,
    updatedAt: nowIso,
    entries: updatedEntries,
  };
}

/**
 * Create an empty recall store
 */
export function createEmptyRecallStore(nowMs?: number): RecallStore {
  return {
    version: 1,
    updatedAt: new Date(nowMs ?? Date.now()).toISOString(),
    entries: {},
  };
}

/**
 * RecordRecallSignals class - Records recall signals from memory searches
 */
export class RecallSignalRecorder {
  private config: RecallSignalConfig;

  constructor(config: Partial<RecallSignalConfig> = {}) {
    this.config = {
      maxQueryHashes: config.maxQueryHashes ?? DEFAULT_CONFIG.maxQueryHashes,
      maxRecallDays: config.maxRecallDays ?? DEFAULT_CONFIG.maxRecallDays,
      defaultConfig: DEFAULT_CONFIG.defaultConfig,
    };
  }

  /**
   * Build a recall key from search result
   */
  buildRecallKey(result: { source: string; path: string; startLine: number; endLine: number }): string {
    return buildRecallKey(result);
  }

  /**
   * Hash a query for deduplication
   */
  hashQuery(query: string): string {
    return hashQuery(query);
  }

  /**
   * Normalize a date string to YYYY-MM-DD format
   */
  normalizeIsoDay(isoString: string | undefined): string | null {
    return normalizeIsoDay(isoString);
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  getCurrentDay(nowMs?: number): string {
    return getCurrentDay(nowMs);
  }

  /**
   * Normalize snippet text
   */
  normalizeSnippet(raw: string): string {
    return normalizeSnippet(raw);
  }

  /**
   * Process search results and update recall store
   */
  processResults(
    store: RecallStore,
    results: MemorySearchResult[],
    query: string,
    nowMs?: number
  ): RecallStore {
    return processRecallResults(store, results, query, nowMs ?? Date.now(), this.config);
  }

  /**
   * Create an empty recall store
   */
  createEmptyStore(nowMs?: number): RecallStore {
    return createEmptyRecallStore(nowMs);
  }

  /**
   * Get the current configuration
   */
  getConfig(): RecallSignalConfig {
    return { ...this.config };
  }
}

/**
 * Create a RecallSignal from search result and query
 */
export function createRecallSignal(
  result: MemorySearchResult,
  query: string,
  options: {
    sessionKey?: string;
    userId?: string;
    nowMs?: number;
  } = {}
): RecallSignal {
  const nowMs = options.nowMs ?? Date.now();
  
  return {
    id: randomUUID(),
    path: result.path,
    source: result.source,
    startLine: result.startLine,
    endLine: result.endLine,
    snippet: normalizeSnippet(result.snippet),
    score: result.score,
    query,
    queryHash: hashQuery(query),
    timestamp: new Date(nowMs).toISOString(),
    sessionKey: options.sessionKey,
    userId: options.userId,
  };
}

/**
 * Default recorder instance
 */
export const defaultRecorder = new RecallSignalRecorder();
