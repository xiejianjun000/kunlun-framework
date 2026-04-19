/**
 * Recall Tracking Types
 * 
 * Type definitions for recall tracking system.
 * Based on OpenCLAW's short-term promotion and recall tracking implementation.
 */

/**
 * Represents a single recall signal from a memory search
 */
export interface RecallSignal {
  /** Unique identifier for this recall */
  id: string;
  /** Path to the recalled memory entry */
  path: string;
  /** Source type (memory, wiki, etc.) */
  source: 'memory' | 'wiki';
  /** Start line in the source file */
  startLine: number;
  /** End line in the source file */
  endLine: number;
  /** Snippet text that was recalled */
  snippet: string;
  /** Relevance score from the search (0-1) */
  score: number;
  /** Query that triggered this recall */
  query: string;
  /** Query hash for deduplication */
  queryHash: string;
  /** Timestamp when the recall occurred */
  timestamp: string;
  /** Session key that initiated the recall */
  sessionKey?: string;
  /** User ID associated with this recall */
  userId?: string;
}

/**
 * Aggregated recall statistics for a single memory entry
 */
export interface RecallEntry {
  /** Unique key identifying this memory entry */
  key: string;
  /** Path to the memory file */
  path: string;
  /** Start line in the source file */
  startLine: number;
  /** End line in the source file */
  endLine: number;
  /** Source type */
  source: 'memory' | 'wiki';
  /** Last recalled snippet text */
  snippet: string;
  /** Total number of recalls */
  recallCount: number;
  /** Number of recalls today */
  dailyCount: number;
  /** Number of recalls marked as grounded (verified relevant) */
  groundedCount: number;
  /** Sum of all relevance scores */
  totalScore: number;
  /** Maximum relevance score achieved */
  maxScore: number;
  /** First time this entry was recalled */
  firstRecalledAt: string;
  /** Most recent time this entry was recalled */
  lastRecalledAt: string;
  /** Hashes of unique queries that recalled this entry */
  queryHashes: string[];
  /** Days on which this entry was recalled */
  recallDays: string[];
  /** Concept tags derived from the snippet */
  conceptTags: string[];
  /** Hash of the claim/statement in the snippet */
  claimHash?: string;
  /** Timestamp when this entry was promoted to long-term memory */
  promotedAt?: string;
}

/**
 * Phase signal for dreaming scoring (Light/REM sleep phases)
 */
export interface PhaseSignal {
  /** Unique key identifying the memory entry */
  key: string;
  /** Number of Light sleep phase hits */
  lightHits: number;
  /** Number of REM sleep phase hits */
  remHits: number;
  /** Last time this entry was hit by Light sleep phase */
  lastLightAt?: string;
  /** Last time this entry was hit by REM sleep phase */
  lastRemAt?: string;
}

/**
 * Statistics for a recall session
 */
export interface RecallSessionStats {
  /** Total results returned by search */
  resultCount: number;
  /** Results actually surfaced to user (after clamping/filtering) */
  surfacedCount: number;
  /** Unique entries recalled */
  uniqueEntries: number;
  /** Average relevance score of recalled entries */
  avgScore: number;
  /** Query that triggered this session */
  query: string;
  /** Timezone for day calculations */
  timezone?: string;
}

/**
 * Promotion scoring components
 */
export interface PromotionComponents {
  /** Frequency score - how often this entry is recalled */
  frequency: number;
  /** Relevance score - average relevance of recalls */
  relevance: number;
  /** Diversity score - variety of queries that recall this entry */
  diversity: number;
  /** Recency score - how recently this entry was recalled */
  recency: number;
  /** Consolidation score - number of distinct recall days */
  consolidation: number;
  /** Conceptual score - coverage of concept tags */
  conceptual: number;
}

/**
 * Promotion candidate for short-term memory promotion
 */
export interface PromotionCandidate {
  /** Unique key identifying this memory entry */
  key: string;
  /** Path to the memory file */
  path: string;
  /** Start line in the source file */
  startLine: number;
  /** End line in the source file */
  endLine: number;
  /** Source type */
  source: 'memory' | 'wiki';
  /** Snippet text */
  snippet: string;
  /** Total number of recalls */
  recallCount: number;
  /** Number of recalls today */
  dailyCount?: number;
  /** Number of recalls marked as grounded */
  groundedCount?: number;
  /** Phase signal count (light + rem hits) */
  signalCount?: number;
  /** Average relevance score */
  avgScore: number;
  /** Maximum relevance score */
  maxScore: number;
  /** Number of unique queries */
  uniqueQueries: number;
  /** Hash of the claim/statement */
  claimHash?: string;
  /** Timestamp when promoted */
  promotedAt?: string;
  /** First recall timestamp */
  firstRecalledAt: string;
  /** Last recall timestamp */
  lastRecalledAt: string;
  /** Age in days since first recall */
  ageDays: number;
  /** Overall promotion score (0-1) */
  score: number;
  /** Days on which recalled */
  recallDays: string[];
  /** Concept tags */
  conceptTags: string[];
  /** Detailed scoring components */
  components: PromotionComponents;
}

/**
 * Recall tracking configuration
 */
export interface RecallTrackingConfig {
  /** Maximum query hashes to store per entry */
  maxQueryHashes?: number;
  /** Maximum recall days to track per entry */
  maxRecallDays?: number;
  /** Default recency half-life in days */
  defaultRecencyHalfLifeDays?: number;
  /** Minimum score for promotion consideration */
  minPromotionScore?: number;
  /** Minimum recall count for promotion */
  minPromotionRecallCount?: number;
  /** Minimum unique queries for promotion */
  minPromotionUniqueQueries?: number;
  /** Phase signal half-life in days */
  phaseSignalHalfLifeDays?: number;
  /** Maximum age in days for promotion candidates */
  maxPromotionAgeDays?: number;
}

/**
 * Promotion weights for scoring
 */
export interface PromotionWeights {
  frequency: number;
  relevance: number;
  diversity: number;
  recency: number;
  consolidation: number;
  conceptual: number;
}

/**
 * Default promotion weights
 */
export const DEFAULT_PROMOTION_WEIGHTS: PromotionWeights = {
  frequency: 0.24,
  relevance: 0.30,
  diversity: 0.15,
  recency: 0.15,
  consolidation: 0.10,
  conceptual: 0.06,
};

/**
 * Default recall tracking configuration
 */
export const DEFAULT_RECALL_TRACKING_CONFIG: Required<RecallTrackingConfig> = {
  maxQueryHashes: 32,
  maxRecallDays: 16,
  defaultRecencyHalfLifeDays: 14,
  minPromotionScore: 0.75,
  minPromotionRecallCount: 3,
  minPromotionUniqueQueries: 2,
  phaseSignalHalfLifeDays: 14,
  maxPromotionAgeDays: 30,
};

/**
 * Recall store structure
 */
export interface RecallStore {
  version: number;
  updatedAt: string;
  entries: Record<string, RecallEntry>;
}

/**
 * Phase signal store structure
 */
export interface PhaseSignalStore {
  version: number;
  updatedAt: string;
  entries: Record<string, PhaseSignal>;
}

/**
 * Search result from memory search
 */
export interface MemorySearchResult {
  path: string;
  startLine: number;
  endLine: number;
  score: number;
  snippet: string;
  source: 'memory' | 'wiki';
}

/**
 * Recall tracking options
 */
export interface RecordRecallsOptions {
  /** Workspace directory path */
  workspaceDir?: string;
  /** Search query */
  query: string;
  /** Raw search results */
  results: MemorySearchResult[];
  /** Current timestamp in milliseconds */
  nowMs?: number;
  /** Timezone for day calculations */
  timezone?: string;
  /** User ID for the recall session */
  userId?: string;
  /** Session key for the recall session */
  sessionKey?: string;
}

/**
 * Ranking options for promotion candidates
 */
export interface RankCandidatesOptions {
  /** Minimum score threshold */
  minScore?: number;
  /** Minimum recall count */
  minRecallCount?: number;
  /** Minimum unique queries */
  minUniqueQueries?: number;
  /** Maximum age in days */
  maxAgeDays?: number;
  /** Include already promoted entries */
  includePromoted?: boolean;
  /** Recency half-life in days */
  recencyHalfLifeDays?: number;
  /** Custom promotion weights */
  weights?: Partial<PromotionWeights>;
  /** Current timestamp in milliseconds */
  nowMs?: number;
}

/**
 * Audit issue types
 */
export type RecallAuditIssueCode =
  | 'recall-store-unreadable'
  | 'recall-store-empty'
  | 'recall-store-invalid'
  | 'recall-lock-stale'
  | 'recall-lock-unreadable';

/**
 * Audit issue severity
 */
export type RecallAuditSeverity = 'warn' | 'error';

/**
 * Individual audit issue
 */
export interface RecallAuditIssue {
  severity: RecallAuditSeverity;
  code: RecallAuditIssueCode;
  message: string;
  fixable: boolean;
}

/**
 * Audit summary for recall tracking system
 */
export interface RecallAuditSummary {
  storePath: string;
  updatedAt?: string;
  exists: boolean;
  entryCount: number;
  promotedCount: number;
  spacedEntryCount: number;
  conceptTaggedEntryCount: number;
  invalidEntryCount: number;
  issues: RecallAuditIssue[];
}
