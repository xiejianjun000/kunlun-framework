/**
 * Recall Tracking Module
 * 
 * Provides recall tracking capabilities for the memory system.
 * Enables Dreaming scoring by recording recall signals and computing statistics.
 * 
 * @example
 * ```typescript
 * import { RecallTracker, createRecallTracker } from './tracking';
 * 
 * // Create a tracker
 * const tracker = createRecallTracker();
 * 
 * // Record recalls from search results
 * await tracker.recordRecalls({
 *   query: "meeting notes",
 *   results: [
 *     { path: "memory/2024-01-01.md", startLine: 1, endLine: 5, score: 0.92, snippet: "...", source: "memory" }
 *   ]
 * });
 * 
 * // Get promotion candidates for dreaming
 * const candidates = await tracker.rankCandidates({ minScore: 0.7 });
 * ```
 */

// Types
export * from './types';

// Core classes
export { RecallTracker, createRecallTracker, getGlobalRecallTracker, setGlobalRecallTracker } from './RecallTracker';
export type { RecallStoreAdapter, PhaseSignalStoreAdapter } from './RecallTracker';
export { createMemoryRecallStoreAdapter, createMemoryPhaseSignalAdapter } from './RecallTracker';

// Signal recording
export { RecallSignalRecorder, defaultRecorder } from './RecallSignal';
export { 
  buildRecallKey, 
  hashQuery, 
  normalizeIsoDay, 
  getCurrentDay, 
  mergeRecentDistinct,
  normalizeSnippet,
  createRecallEntry,
  updateRecallEntry,
  processRecallResults,
  createEmptyRecallStore,
  createRecallSignal
} from './RecallSignal';

// Statistics
export { RecallStatistics, defaultStatistics } from './RecallStatistics';
export {
  calculateRecencyScore,
  calculateFrequencyScore,
  calculateDiversityScore,
  calculateRelevanceScore,
  calculateConsolidationScore,
  calculateConceptualScore,
  calculatePhaseSignalBoost,
  calculatePromotionScore,
  calculatePromotionComponents,
  rankPromotionCandidates,
  getRecallStatistics,
  calculateSpacedRepetitionIntervals
} from './RecallStatistics';
export type { StatisticsConfig } from './RecallStatistics';
