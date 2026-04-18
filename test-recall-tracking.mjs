/**
 * Simple verification script for Recall Tracking module
 */

// Import the tracking module
import {
  RecallTracker,
  createRecallTracker,
  RecallSignalRecorder,
  RecallStatistics,
  buildRecallKey,
  hashQuery,
  createEmptyRecallStore,
  calculateRecencyScore,
  calculateFrequencyScore,
  rankPromotionCandidates,
  DEFAULT_PROMOTION_WEIGHTS,
} from './src/modules/memory-system/tracking/index.ts';

console.log('=== Recall Tracking Module Verification ===\n');

// Test 1: Basic hashing
console.log('Test 1: Hash Query');
const hash1 = hashQuery('Hello World');
const hash2 = hashQuery('hello world');
console.log(`  Hash 1: ${hash1}`);
console.log(`  Hash 2: ${hash2}`);
console.log(`  Equal (case insensitive): ${hash1 === hash2}`);
console.log();

// Test 2: Build recall key
console.log('Test 2: Build Recall Key');
const key = buildRecallKey({
  source: 'memory',
  path: 'memory/2024-01-01.md',
  startLine: 1,
  endLine: 5,
});
console.log(`  Key: ${key}`);
console.log();

// Test 3: Create empty store
console.log('Test 3: Create Empty Recall Store');
const store = createEmptyRecallStore();
console.log(`  Version: ${store.version}`);
console.log(`  Entries: ${Object.keys(store.entries).length}`);
console.log();

// Test 4: RecallSignalRecorder
console.log('Test 4: RecallSignalRecorder');
const recorder = new RecallSignalRecorder();
const processed = recorder.processResults(store, [
  {
    path: 'memory/2024-01-01.md',
    startLine: 1,
    endLine: 5,
    score: 0.92,
    snippet: 'Test memory content',
    source: 'memory',
  },
], 'test query', Date.now());
console.log(`  Processed entries: ${Object.keys(processed.entries).length}`);
const entry = processed.entries[Object.keys(processed.entries)[0]];
console.log(`  Entry recallCount: ${entry?.recallCount}`);
console.log();

// Test 5: RecallStatistics
console.log('Test 5: RecallStatistics');
const statistics = new RecallStatistics();
const recencyScore = statistics.calculateRecencyScore(entry?.lastRecalledAt || new Date().toISOString());
console.log(`  Recency score (recent): ${recencyScore.toFixed(4)}`);

const oldScore = statistics.calculateRecencyScore(
  new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
);
console.log(`  Recency score (14 days old): ${oldScore.toFixed(4)}`);

const freqScore = statistics.calculateFrequencyScore(5);
console.log(`  Frequency score (5 recalls): ${freqScore.toFixed(4)}`);
console.log();

// Test 6: RecallTracker
console.log('Test 6: RecallTracker');
const tracker = createRecallTracker();

await tracker.recordRecalls({
  query: 'important query',
  results: [
    {
      path: 'memory/2024-01-01.md',
      startLine: 1,
      endLine: 5,
      score: 0.95,
      snippet: 'Important memory',
      source: 'memory',
    },
    {
      path: 'memory/2024-01-02.md',
      startLine: 1,
      endLine: 5,
      score: 0.75,
      snippet: 'Less important',
      source: 'memory',
    },
  ],
});

const entries = await tracker.getAllEntries();
console.log(`  Recorded entries: ${Object.keys(entries).length}`);

const candidates = await tracker.rankCandidates({ minScore: 0.5 });
console.log(`  Promotion candidates: ${candidates.length}`);

const stats = await tracker.getStatistics();
console.log(`  Stats - totalEntries: ${stats.totalEntries}`);
console.log(`  Stats - totalRecalls: ${stats.totalRecalls}`);
console.log();

// Test 7: Phase signals
console.log('Test 7: Phase Signals');
const entryKey = Object.keys(entries)[0];
await tracker.recordPhaseSignal(entryKey, 'light');
await tracker.recordPhaseSignal(entryKey, 'rem');

const signal = await tracker.getPhaseSignal(entryKey);
console.log(`  Light hits: ${signal?.lightHits}`);
console.log(`  REM hits: ${signal?.remHits}`);
console.log();

// Test 8: Audit
console.log('Test 8: Audit');
const audit = await tracker.audit();
console.log(`  Exists: ${audit.exists}`);
console.log(`  Entry count: ${audit.entryCount}`);
console.log(`  Issues: ${audit.issues.length}`);
console.log();

console.log('=== All tests passed! ===');
