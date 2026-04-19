/**
 * Recall Tracking Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RecallTracker,
  createRecallTracker,
  RecallSignalRecorder,
  RecallStatistics,
  buildRecallKey,
  hashQuery,
  normalizeIsoDay,
  getCurrentDay,
  createEmptyRecallStore,
  createRecallSignal,
  calculateRecencyScore,
  calculateFrequencyScore,
  calculateRelevanceScore,
  calculateDiversityScore,
  calculateConsolidationScore,
  calculatePromotionScore,
  rankPromotionCandidates,
  DEFAULT_PROMOTION_WEIGHTS,
  type RecallStore,
  type RecallEntry,
  type MemorySearchResult,
  type PromotionCandidate,
} from './index';

describe('RecallSignalRecorder', () => {
  let recorder: RecallSignalRecorder;

  beforeEach(() => {
    recorder = new RecallSignalRecorder();
  });

  describe('buildRecallKey', () => {
    it('should build a consistent key from result', () => {
      const result = {
        source: 'memory',
        path: 'memory/2024-01-01.md',
        startLine: 1,
        endLine: 5,
      };

      const key1 = recorder.buildRecallKey(result);
      const key2 = recorder.buildRecallKey(result);

      expect(key1).toBe(key2);
      expect(key1).toBe('memory:memory/2024-01-01.md:1:5');
    });
  });

  describe('hashQuery', () => {
    it('should produce consistent hashes', () => {
      const hash1 = recorder.hashQuery('Hello World');
      const hash2 = recorder.hashQuery('Hello World');

      expect(hash1).toBe(hash2);
    });

    it('should be case insensitive', () => {
      const hash1 = recorder.hashQuery('Hello World');
      const hash2 = recorder.hashQuery('hello world');

      expect(hash1).toBe(hash2);
    });

    it('should normalize whitespace', () => {
      const hash1 = recorder.hashQuery('Hello   World');
      const hash2 = recorder.hashQuery('Hello World');

      expect(hash1).toBe(hash2);
    });
  });

  describe('processResults', () => {
    it('should create new entries for new results', () => {
      const store = createEmptyRecallStore();
      const results: MemorySearchResult[] = [
        {
          path: 'memory/2024-01-01.md',
          startLine: 1,
          endLine: 5,
          score: 0.92,
          snippet: 'Test snippet',
          source: 'memory',
        },
      ];

      const updated = recorder.processResults(store, results, 'test query', Date.now());

      expect(Object.keys(updated.entries).length).toBe(1);
      const entry = updated.entries[Object.keys(updated.entries)[0]];
      expect(entry.recallCount).toBe(1);
      expect(entry.totalScore).toBe(0.92);
      expect(entry.maxScore).toBe(0.92);
    });

    it('should update existing entries', () => {
      const store = createEmptyRecallStore();
      const results: MemorySearchResult[] = [
        {
          path: 'memory/2024-01-01.md',
          startLine: 1,
          endLine: 5,
          score: 0.92,
          snippet: 'Test snippet',
          source: 'memory',
        },
      ];

      // First recall
      let updated = recorder.processResults(store, results, 'test query', Date.now());
      
      // Second recall with same result
      updated = recorder.processResults(updated, results, 'test query', Date.now());

      const entry = updated.entries[Object.keys(updated.entries)[0]];
      expect(entry.recallCount).toBe(2);
      expect(entry.totalScore).toBeCloseTo(1.84);
    });
  });
});

describe('RecallStatistics', () => {
  let statistics: RecallStatistics;

  beforeEach(() => {
    statistics = new RecallStatistics();
  });

  describe('calculateRecencyScore', () => {
    it('should return 1.0 for very recent recalls', () => {
      const now = Date.now();
      const recentRecall = new Date(now - 1000).toISOString(); // 1 second ago

      const score = statistics.calculateRecencyScore(recentRecall, now);

      expect(score).toBeCloseTo(1.0, 1);
    });

    it('should decay over time', () => {
      const now = Date.now();
      const oldRecall = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days ago

      const score = statistics.calculateRecencyScore(oldRecall, now);

      expect(score).toBeCloseTo(0.5, 1); // ~0.5 for half-life
    });
  });

  describe('calculateFrequencyScore', () => {
    it('should increase with recall count', () => {
      const score1 = statistics.calculateFrequencyScore(1);
      const score5 = statistics.calculateFrequencyScore(5);
      const score10 = statistics.calculateFrequencyScore(10);

      expect(score5).toBeGreaterThan(score1);
      expect(score10).toBeGreaterThan(score5);
    });

    it('should cap at 1.0', () => {
      const score = statistics.calculateFrequencyScore(100);

      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should return the score clamped to 0-1', () => {
      expect(statistics.calculateRelevanceScore(0.5)).toBeCloseTo(0.5);
      expect(statistics.calculateRelevanceScore(1.5)).toBeLessThanOrEqual(1.0);
      expect(statistics.calculateRelevanceScore(-0.5)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateDiversityScore', () => {
    it('should reward unique queries', () => {
      const score1 = statistics.calculateDiversityScore(1, 10);
      const score5 = statistics.calculateDiversityScore(5, 10);

      expect(score5).toBeGreaterThan(score1);
    });
  });

  describe('rankPromotionCandidates', () => {
    it('should rank entries by promotion score', () => {
      const store: RecallStore = {
        version: 1,
        updatedAt: new Date().toISOString(),
        entries: {
          'memory:path1:1:5': {
            key: 'memory:path1:1:5',
            path: 'path1',
            startLine: 1,
            endLine: 5,
            source: 'memory',
            snippet: 'test',
            recallCount: 10,
            dailyCount: 2,
            groundedCount: 0,
            totalScore: 9.0,
            maxScore: 0.95,
            firstRecalledAt: new Date().toISOString(),
            lastRecalledAt: new Date().toISOString(),
            queryHashes: ['hash1', 'hash2'],
            recallDays: ['2024-01-01', '2024-01-02'],
            conceptTags: ['test'],
          },
          'memory:path2:1:5': {
            key: 'memory:path2:1:5',
            path: 'path2',
            startLine: 1,
            endLine: 5,
            source: 'memory',
            snippet: 'test',
            recallCount: 2,
            dailyCount: 1,
            groundedCount: 0,
            totalScore: 1.8,
            maxScore: 0.9,
            firstRecalledAt: new Date().toISOString(),
            lastRecalledAt: new Date().toISOString(),
            queryHashes: ['hash1'],
            recallDays: ['2024-01-01'],
            conceptTags: [],
          },
        },
      };

      const candidates = rankPromotionCandidates(store, { version: 1, updatedAt: new Date().toISOString(), entries: {} });

      expect(candidates.length).toBeGreaterThan(0);
      // Entry with more recalls should rank higher
      expect(candidates[0].recallCount).toBeGreaterThanOrEqual(candidates[candidates.length - 1].recallCount);
    });
  });
});

describe('RecallTracker', () => {
  let tracker: RecallTracker;

  beforeEach(() => {
    tracker = createRecallTracker();
  });

  describe('recordRecalls', () => {
    it('should record recall signals', async () => {
      await tracker.recordRecalls({
        query: 'test query',
        results: [
          {
            path: 'memory/2024-01-01.md',
            startLine: 1,
            endLine: 5,
            score: 0.92,
            snippet: 'Test memory content',
            source: 'memory',
          },
        ],
      });

      const entries = await tracker.getAllEntries();
      expect(Object.keys(entries).length).toBe(1);
    });

    it('should aggregate multiple recalls', async () => {
      await tracker.recordRecalls({
        query: 'test query',
        results: [
          {
            path: 'memory/2024-01-01.md',
            startLine: 1,
            endLine: 5,
            score: 0.92,
            snippet: 'Test memory content',
            source: 'memory',
          },
        ],
      });

      await tracker.recordRecalls({
        query: 'different query',
        results: [
          {
            path: 'memory/2024-01-01.md',
            startLine: 1,
            endLine: 5,
            score: 0.88,
            snippet: 'Test memory content updated',
            source: 'memory',
          },
        ],
      });

      const entries = await tracker.getAllEntries();
      const entry = entries[Object.keys(entries)[0]];
      
      expect(entry.recallCount).toBe(2);
      expect(entry.queryHashes.length).toBe(2);
    });
  });

  describe('rankCandidates', () => {
    it('should return ranked promotion candidates', async () => {
      // Record some recalls
      await tracker.recordRecalls({
        query: 'meeting notes',
        results: [
          {
            path: 'memory/2024-01-01.md',
            startLine: 1,
            endLine: 5,
            score: 0.95,
            snippet: 'Important meeting notes',
            source: 'memory',
          },
          {
            path: 'memory/2024-01-02.md',
            startLine: 1,
            endLine: 5,
            score: 0.75,
            snippet: 'Random notes',
            source: 'memory',
          },
        ],
      });

      const candidates = await tracker.rankCandidates({
        minScore: 0.3,
      });

      expect(candidates.length).toBeGreaterThan(0);
      // Should be sorted by score
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
      }
    });
  });

  describe('markPromoted', () => {
    it('should mark an entry as promoted', async () => {
      await tracker.recordRecalls({
        query: 'test',
        results: [
          {
            path: 'memory/2024-01-01.md',
            startLine: 1,
            endLine: 5,
            score: 0.9,
            snippet: 'test',
            source: 'memory',
          },
        ],
      });

      const entries = await tracker.getAllEntries();
      const key = Object.keys(entries)[0];

      const result = await tracker.markPromoted(key);

      expect(result).toBe(true);
      
      const entry = await tracker.getEntry(key);
      expect(entry?.promotedAt).toBeDefined();
    });
  });

  describe('recordPhaseSignal', () => {
    it('should record phase signals', async () => {
      await tracker.recordRecalls({
        query: 'test',
        results: [
          {
            path: 'memory/2024-01-01.md',
            startLine: 1,
            endLine: 5,
            score: 0.9,
            snippet: 'test',
            source: 'memory',
          },
        ],
      });

      const entries = await tracker.getAllEntries();
      const key = Object.keys(entries)[0];

      await tracker.recordPhaseSignal(key, 'light');
      await tracker.recordPhaseSignal(key, 'rem');

      const signal = await tracker.getPhaseSignal(key);
      
      expect(signal?.lightHits).toBe(1);
      expect(signal?.remHits).toBe(1);
    });
  });

  describe('audit', () => {
    it('should return audit summary', async () => {
      const audit = await tracker.audit();

      expect(audit).toBeDefined();
      expect(audit.exists).toBe(true);
      expect(audit.storePath).toBe('memory:recall-store');
    });
  });
});

describe('Integration: MemorySystem Recall Tracking', () => {
  it('should create a tracker and record recalls', async () => {
    const tracker = createRecallTracker();

    await tracker.recordRecalls({
      query: 'project requirements',
      results: [
        {
          path: 'memory/2024-01-01.md',
          startLine: 10,
          endLine: 20,
          score: 0.93,
          snippet: 'Project requirements document',
          source: 'memory',
        },
        {
          path: 'memory/2024-01-02.md',
          startLine: 5,
          endLine: 15,
          score: 0.87,
          snippet: 'Additional requirements',
          source: 'memory',
        },
      ],
      userId: 'user1',
    });

    const stats = await tracker.getStatistics();

    expect(stats.totalEntries).toBe(2);
    expect(stats.totalRecalls).toBe(2);
    expect(stats.avgScore).toBeCloseTo(0.9, 1);
  });

  it('should rank candidates for dreaming promotion', async () => {
    const tracker = createRecallTracker();

    // Record multiple recalls for one entry
    const queries = ['query1', 'query2', 'query3'];
    
    for (const query of queries) {
      await tracker.recordRecalls({
        query,
        results: [
          {
            path: 'memory/important.md',
            startLine: 1,
            endLine: 10,
            score: 0.95,
            snippet: 'Important content',
            source: 'memory',
          },
        ],
      });
    }

    // Record single recall for another entry
    await tracker.recordRecalls({
      query: 'query',
      results: [
        {
          path: 'memory/less-important.md',
          startLine: 1,
          endLine: 5,
          score: 0.7,
          snippet: 'Less important',
          source: 'memory',
        },
      ],
    });

    const candidates = await tracker.rankCandidates({
      minScore: 0.3,
    });

    expect(candidates.length).toBeGreaterThan(0);
    
    // The entry with more recalls should rank higher
    const importantCandidate = candidates.find(c => c.path === 'memory/important.md');
    expect(importantCandidate).toBeDefined();
    expect(importantCandidate!.recallCount).toBe(3);
  });
});
