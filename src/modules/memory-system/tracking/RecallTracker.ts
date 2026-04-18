/**
 * RecallTracker.ts - Core Recall Tracking System
 * 
 * Main tracker that integrates recall signal recording and statistics.
 * Provides a complete recall tracking solution for the memory system.
 */

import type {
  RecallEntry,
  RecallStore,
  PhaseSignal,
  PhaseSignalStore,
  MemorySearchResult,
  RecordRecallsOptions,
  RankCandidatesOptions,
  PromotionCandidate,
  RecallTrackingConfig,
  RecallAuditSummary,
  RecallSignal,
} from './types';
import { DEFAULT_RECALL_TRACKING_CONFIG } from './types';
import { RecallSignalRecorder, createRecallSignal } from './RecallSignal';
import { RecallStatistics, defaultStatistics } from './RecallStatistics';

/**
 * In-memory recall store with persistence callbacks
 */
export interface RecallStoreAdapter {
  load(): Promise<RecallStore>;
  save(store: RecallStore): Promise<void>;
}

/**
 * In-memory phase signal store with persistence callbacks
 */
export interface PhaseSignalStoreAdapter {
  load(): Promise<PhaseSignalStore>;
  save(store: PhaseSignalStore): Promise<void>;
}

/**
 * Default in-memory adapters
 */
const memoryAdapters: Record<string, RecallStore | PhaseSignalStore | null> = {
  recallStore: null,
  phaseSignalStore: null,
};

/**
 * Create a simple in-memory adapter
 */
export function createMemoryRecallStoreAdapter(
  initialStore?: RecallStore
): RecallStoreAdapter {
  let store = initialStore ?? {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: {},
  };

  return {
    async load() {
      return store;
    },
    async save(newStore: RecallStore) {
      store = newStore;
    },
  };
}

/**
 * Create a simple in-memory phase signal adapter
 */
export function createMemoryPhaseSignalAdapter(
  initialStore?: PhaseSignalStore
): PhaseSignalStoreAdapter {
  let store = initialStore ?? {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: {},
  };

  return {
    async load() {
      return store;
    },
    async save(newStore: PhaseSignalStore) {
      store = newStore;
    },
  };
}

/**
 * RecallTracker class - Core recall tracking implementation
 */
export class RecallTracker {
  private recorder: RecallSignalRecorder;
  private statistics: RecallStatistics;
  private recallAdapter: RecallStoreAdapter;
  private phaseAdapter: PhaseSignalStoreAdapter;
  private config: Required<RecallTrackingConfig>;

  constructor(
    recallAdapter: RecallStoreAdapter,
    phaseAdapter: PhaseSignalStoreAdapter,
    config: RecallTrackingConfig = {}
  ) {
    this.recallAdapter = recallAdapter;
    this.phaseAdapter = phaseAdapter;
    this.config = {
      maxQueryHashes: config.maxQueryHashes ?? DEFAULT_RECALL_TRACKING_CONFIG.maxQueryHashes,
      maxRecallDays: config.maxRecallDays ?? DEFAULT_RECALL_TRACKING_CONFIG.maxRecallDays,
      defaultRecencyHalfLifeDays: config.defaultRecencyHalfLifeDays ?? DEFAULT_RECALL_TRACKING_CONFIG.defaultRecencyHalfLifeDays,
      minPromotionScore: config.minPromotionScore ?? DEFAULT_RECALL_TRACKING_CONFIG.minPromotionScore,
      minPromotionRecallCount: config.minPromotionRecallCount ?? DEFAULT_RECALL_TRACKING_CONFIG.minPromotionRecallCount,
      minPromotionUniqueQueries: config.minPromotionUniqueQueries ?? DEFAULT_RECALL_TRACKING_CONFIG.minPromotionUniqueQueries,
      phaseSignalHalfLifeDays: config.phaseSignalHalfLifeDays ?? DEFAULT_RECALL_TRACKING_CONFIG.phaseSignalHalfLifeDays,
      maxPromotionAgeDays: config.maxPromotionAgeDays ?? DEFAULT_RECALL_TRACKING_CONFIG.maxPromotionAgeDays,
    };

    this.recorder = new RecallSignalRecorder({
      maxQueryHashes: this.config.maxQueryHashes,
      maxRecallDays: this.config.maxRecallDays,
    });

    this.statistics = new RecallStatistics({
      recencyHalfLifeDays: this.config.defaultRecencyHalfLifeDays,
      minScore: this.config.minPromotionScore,
      minRecallCount: this.config.minPromotionRecallCount,
      minUniqueQueries: this.config.minPromotionUniqueQueries,
      maxAgeDays: this.config.maxPromotionAgeDays,
    });
  }

  /**
   * Record recall signals from search results
   */
  async recordRecalls(options: RecordRecallsOptions): Promise<void> {
    const nowMs = options.nowMs ?? Date.now();
    
    // Load current store
    const store = await this.recallAdapter.load();
    
    // Process results
    const updatedStore = this.recorder.processResults(
      store,
      options.results,
      options.query,
      nowMs
    );

    // Save updated store
    await this.recallAdapter.save(updatedStore);
  }

  /**
   * Get all recall entries
   */
  async getAllEntries(): Promise<Record<string, RecallEntry>> {
    const store = await this.recallAdapter.load();
    return store.entries;
  }

  /**
   * Get a specific recall entry
   */
  async getEntry(key: string): Promise<RecallEntry | undefined> {
    const store = await this.recallAdapter.load();
    return store.entries[key];
  }

  /**
   * Get promotion candidates ranked by score
   */
  async rankCandidates(
    options: RankCandidatesOptions = {},
    nowMs?: number
  ): Promise<PromotionCandidate[]> {
    const [recallStore, phaseStore] = await Promise.all([
      this.recallAdapter.load(),
      this.phaseAdapter.load(),
    ]);

    return this.statistics.rankCandidates(recallStore, phaseStore, options, nowMs);
  }

  /**
   * Mark an entry as promoted
   */
  async markPromoted(
    key: string,
    promotedAt?: string
  ): Promise<boolean> {
    const store = await this.recallAdapter.load();
    const entry = store.entries[key];

    if (!entry) return false;

    entry.promotedAt = promotedAt ?? new Date().toISOString();
    store.updatedAt = new Date().toISOString();

    await this.recallAdapter.save(store);
    return true;
  }

  /**
   * Mark an entry as grounded (verified relevant)
   */
  async markGrounded(key: string, grounded: boolean = true): Promise<boolean> {
    const store = await this.recallAdapter.load();
    const entry = store.entries[key];

    if (!entry) return false;

    if (grounded) {
      entry.groundedCount = (entry.groundedCount ?? 0) + 1;
    }

    store.updatedAt = new Date().toISOString();
    await this.recallAdapter.save(store);
    return true;
  }

  /**
   * Record phase signals for dreaming scoring
   */
  async recordPhaseSignal(
    key: string,
    phase: 'light' | 'rem',
    nowMs?: number
  ): Promise<void> {
    const currentTime = nowMs ?? Date.now();
    const nowIso = new Date(currentTime).toISOString();
    
    const store = await this.phaseAdapter.load();
    
    let signal = store.entries[key];
    if (!signal) {
      signal = {
        key,
        lightHits: 0,
        remHits: 0,
      };
    }

    if (phase === 'light') {
      signal.lightHits += 1;
      signal.lastLightAt = nowIso;
    } else {
      signal.remHits += 1;
      signal.lastRemAt = nowIso;
    }

    store.entries[key] = signal;
    store.updatedAt = nowIso;

    await this.phaseAdapter.save(store);
  }

  /**
   * Get phase signal for an entry
   */
  async getPhaseSignal(key: string): Promise<PhaseSignal | undefined> {
    const store = await this.phaseAdapter.load();
    return store.entries[key];
  }

  /**
   * Get recall statistics
   */
  async getStatistics() {
    const store = await this.recallAdapter.load();
    return this.statistics.getStatistics(store);
  }

  /**
   * Audit the recall tracking system
   */
  async audit(): Promise<RecallAuditSummary> {
    const store = await this.recallAdapter.load();
    const entries = Object.values(store.entries);

    const issues: RecallAuditSummary['issues'] = [];
    
    // Check for empty store
    if (entries.length === 0) {
      issues.push({
        severity: 'warn',
        code: 'recall-store-empty',
        message: 'Recall store is empty.',
        fixable: true,
      });
    }

    // Check for invalid entries
    const validEntries = entries.filter(e => 
      e.key && e.path && e.recallCount >= 0
    );
    
    const invalidCount = entries.length - validEntries.length;
    if (invalidCount > 0) {
      issues.push({
        severity: 'warn',
        code: 'recall-store-invalid',
        message: `Found ${invalidCount} invalid entry(ies).`,
        fixable: true,
      });
    }

    const promotedCount = entries.filter(e => e.promotedAt).length;
    const spacedEntryCount = entries.filter(e => 
      (e.recallDays?.length ?? 0) > 1
    ).length;
    const conceptTaggedCount = entries.filter(e => 
      (e.conceptTags?.length ?? 0) > 0
    ).length;

    return {
      storePath: 'memory:recall-store',
      updatedAt: store.updatedAt,
      exists: true,
      entryCount: entries.length,
      promotedCount,
      spacedEntryCount,
      conceptTaggedEntryCount: conceptTaggedCount,
      invalidEntryCount: invalidCount,
      issues,
    };
  }

  /**
   * Clear all recall data
   */
  async clear(): Promise<void> {
    const emptyStore: RecallStore = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: {},
    };

    const emptyPhaseStore: PhaseSignalStore = {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries: {},
    };

    await Promise.all([
      this.recallAdapter.save(emptyStore),
      this.phaseAdapter.save(emptyPhaseStore),
    ]);
  }

  /**
   * Get configuration
   */
  getConfig(): Required<RecallTrackingConfig> {
    return { ...this.config };
  }

  /**
   * Get the statistics instance
   */
  getStatisticsInstance(): RecallStatistics {
    return this.statistics;
  }

  /**
   * Get the recorder instance
   */
  getRecorderInstance(): RecallSignalRecorder {
    return this.recorder;
  }
}

/**
 * Create a default in-memory recall tracker
 */
export function createRecallTracker(
  initialRecallStore?: RecallStore,
  initialPhaseStore?: PhaseSignalStore
): RecallTracker {
  return new RecallTracker(
    createMemoryRecallStoreAdapter(initialRecallStore),
    createMemoryPhaseSignalAdapter(initialPhaseStore)
  );
}

/**
 * Default global tracker instance
 */
let globalTracker: RecallTracker | null = null;

/**
 * Get or create the global recall tracker
 */
export function getGlobalRecallTracker(): RecallTracker {
  if (!globalTracker) {
    globalTracker = createRecallTracker();
  }
  return globalTracker;
}

/**
 * Set the global recall tracker (for dependency injection)
 */
export function setGlobalRecallTracker(tracker: RecallTracker): void {
  globalTracker = tracker;
}
