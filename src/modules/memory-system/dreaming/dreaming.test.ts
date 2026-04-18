/**
 * Dreaming System Tests
 */

import { describe, it, expect } from 'vitest';
import {
  clampScore,
  calculateFrequencyComponent,
  calculateRelevanceComponent,
  calculateDiversityComponent,
  calculateRecencyComponent,
  calculateConsolidationComponent,
  calculateConceptualComponent,
  calculatePhaseSignalBoost,
  scoreEntry,
  rankCandidates,
  totalSignalCountForEntry,
} from './SevenSignalScorer';
import type { ShortTermRecallEntry, PhaseSignalEntry } from './types';

describe('SevenSignalScorer', () => {
  describe('clampScore', () => {
    it('should clamp values to [0, 1]', () => {
      expect(clampScore(0.5)).toBe(0.5);
      expect(clampScore(-0.5)).toBe(0);
      expect(clampScore(1.5)).toBe(1);
      expect(clampScore(NaN)).toBe(0);
      // Note: Number.isFinite(Infinity) is false, so Infinity is clamped to 0
      expect(clampScore(Infinity)).toBe(0);
    });
  });

  describe('calculateFrequencyComponent', () => {
    it('should calculate frequency with log normalization', () => {
      expect(calculateFrequencyComponent(0)).toBe(0);
      expect(calculateFrequencyComponent(1)).toBeCloseTo(Math.log(2) / Math.log(11), 3);
      // log(11) ≈ 2.398, log(11)/log(11) = 1
      expect(calculateFrequencyComponent(10)).toBeCloseTo(1, 2);
    });
  });

  describe('calculateRelevanceComponent', () => {
    it('should calculate average score', () => {
      expect(calculateRelevanceComponent(0.6, 2)).toBe(0.3);
      expect(calculateRelevanceComponent(1.0, 4)).toBe(0.25);
    });
  });

  describe('calculateDiversityComponent', () => {
    it('should calculate diversity with exponential decay', () => {
      expect(calculateDiversityComponent(0)).toBe(0);
      expect(calculateDiversityComponent(3)).toBeCloseTo(0.63, 1);
      expect(calculateDiversityComponent(10)).toBeGreaterThan(0.9);
    });
  });

  describe('calculateRecencyComponent', () => {
    it('should decay with half-life of 14 days', () => {
      const dayMs = 24 * 60 * 60 * 1000;
      
      expect(calculateRecencyComponent(0, 14)).toBe(1);
      expect(calculateRecencyComponent(14, 14)).toBeCloseTo(0.5, 2);
      expect(calculateRecencyComponent(28, 14)).toBeCloseTo(0.25, 2);
    });
  });

  describe('calculateConsolidationComponent', () => {
    it('should measure multi-day recurrence', () => {
      expect(calculateConsolidationComponent([])).toBe(0);
      expect(calculateConsolidationComponent(['2024-01-01'])).toBeCloseTo(0.63, 1);
      expect(calculateConsolidationComponent(['2024-01-01', '2024-01-02', '2024-01-03']))
        .toBeGreaterThan(0.9);
    });
  });

  describe('calculateConceptualComponent', () => {
    it('should normalize concept tag count', () => {
      expect(calculateConceptualComponent([])).toBe(0);
      expect(calculateConceptualComponent(['a', 'b'])).toBe(0.4);
      expect(calculateConceptualComponent(['a', 'b', 'c', 'd', 'e'])).toBe(1);
    });
  });

  describe('calculatePhaseSignalBoost', () => {
    it('should return 0 for undefined signals', () => {
      expect(calculatePhaseSignalBoost(undefined, Date.now())).toBe(0);
    });

    it('should apply light and REM boosts', () => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      const lightSignal: PhaseSignalEntry = {
        key: 'test',
        lightHits: 1,
        remHits: 0,
        lastLightAt: new Date(now - dayMs).toISOString(), // 1 day ago
      };
      
      const boost = calculatePhaseSignalBoost(lightSignal, now);
      expect(boost).toBeGreaterThan(0);
      expect(boost).toBeLessThanOrEqual(0.06);
    });
  });

  describe('scoreEntry', () => {
    it('should calculate combined score', () => {
      const entry: ShortTermRecallEntry = {
        key: 'test',
        path: '/memory/2024-01-01.md',
        startLine: 1,
        endLine: 1,
        source: 'memory',
        snippet: 'Test memory entry',
        recallCount: 5,
        dailyCount: 2,
        groundedCount: 0,
        totalScore: 2.5,
        maxScore: 1,
        firstRecalledAt: new Date().toISOString(),
        lastRecalledAt: new Date().toISOString(),
        queryHashes: ['hash1', 'hash2', 'hash3'],
        recallDays: ['2024-01-01', '2024-01-02'],
        conceptTags: ['环评', '环境'],
      };
      
      const result = scoreEntry(entry, undefined, undefined, Date.now());
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.components.frequency).toBeGreaterThan(0);
    });
  });

  describe('rankCandidates', () => {
    it('should rank entries by score', () => {
      const entries: ShortTermRecallEntry[] = [
        {
          key: 'low',
          path: '/memory/2024-01-01.md',
          startLine: 1,
          endLine: 1,
          source: 'memory',
          snippet: 'Low priority',
          recallCount: 1,
          dailyCount: 0,
          groundedCount: 0,
          totalScore: 0.3,
          maxScore: 1,
          firstRecalledAt: new Date().toISOString(),
          lastRecalledAt: new Date().toISOString(),
          queryHashes: [],
          recallDays: [],
          conceptTags: [],
        },
        {
          key: 'high',
          path: '/memory/2024-01-01.md',
          startLine: 2,
          endLine: 2,
          source: 'memory',
          snippet: 'High priority memory',
          recallCount: 10,
          dailyCount: 5,
          groundedCount: 0,
          totalScore: 5.0,
          maxScore: 1,
          firstRecalledAt: new Date().toISOString(),
          lastRecalledAt: new Date().toISOString(),
          queryHashes: ['h1', 'h2', 'h3', 'h4'],
          recallDays: ['2024-01-01', '2024-01-02', '2024-01-03'],
          conceptTags: ['环评', '环境', '监测', '排放'],
        },
      ];
      
      const candidates = rankCandidates(entries, undefined, undefined, {
        minRecallCount: 0,
      });
      
      expect(candidates.length).toBe(2);
      expect(candidates[0].key).toBe('high');
      expect(candidates[1].key).toBe('low');
    });
  });

  describe('totalSignalCountForEntry', () => {
    it('should sum all signal counts', () => {
      const entry: ShortTermRecallEntry = {
        key: 'test',
        path: '/memory/2024-01-01.md',
        startLine: 1,
        endLine: 1,
        source: 'memory',
        snippet: 'Test',
        recallCount: 5,
        dailyCount: 3,
        groundedCount: 2,
        totalScore: 1,
        maxScore: 1,
        firstRecalledAt: new Date().toISOString(),
        lastRecalledAt: new Date().toISOString(),
        queryHashes: [],
        recallDays: [],
        conceptTags: [],
      };
      
      expect(totalSignalCountForEntry(entry)).toBe(10);
    });
  });
});
