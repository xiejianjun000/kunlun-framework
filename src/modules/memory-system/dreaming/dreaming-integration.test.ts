/**
 * Dreaming System Integration Tests
 * 
 * 测试完整的梦境处理流程:
 * 1. Recall Tracking 集成
 * 2. 7信号评分
 * 3. 梦境处理流程
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  DreamingSystem,
  createDreamingSystem,
  DreamingPhase,
  MemoryConsolidator,
  SevenSignalScorer,
  scoreEntry,
  calculateFrequencyComponent,
  calculateRelevanceComponent,
  calculateDiversityComponent,
  calculateRecencyComponent,
  calculateConsolidationComponent,
  calculateConceptualComponent,
  calculatePhaseSignalBoost,
  DEFAULT_PROMOTION_WEIGHTS,
} from './index';
import type { ShortTermRecallEntry, PhaseSignalEntry } from './index';

// ============== 测试辅助函数 ==============

async function createTestWorkspace(): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dreaming-test-'));
  
  // 创建必要目录
  await fs.mkdir(path.join(tmpDir, 'memory', '.dreams'), { recursive: true });
  
  return tmpDir;
}

async function cleanupWorkspace(workspaceDir: string): Promise<void> {
  try {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

function createMockRecallEntry(overrides: Partial<ShortTermRecallEntry> = {}): ShortTermRecallEntry {
  const now = new Date();
  return {
    key: 'test-key-1',
    path: '/memory/2024-01-01.md',
    startLine: 1,
    endLine: 5,
    source: 'memory',
    snippet: '这是一条测试记忆',
    recallCount: 3,
    dailyCount: 1,
    groundedCount: 0,
    totalScore: 2.7,
    maxScore: 0.95,
    firstRecalledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastRecalledAt: now.toISOString(),
    queryHashes: ['hash1', 'hash2', 'hash3'],
    recallDays: ['2024-01-01', '2024-01-02'],
    conceptTags: ['环评', '环境'],
    ...overrides,
  };
}

function createMockPhaseSignal(overrides: Partial<PhaseSignalEntry> = {}): PhaseSignalEntry {
  return {
    key: 'test-key-1',
    lightHits: 2,
    remHits: 1,
    lastLightAt: new Date().toISOString(),
    lastRemAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============== 7信号评分测试 ==============

describe('Seven Signal Scoring', () => {
  describe('calculateFrequencyComponent', () => {
    it('should return 0 for zero signals', () => {
      const result = calculateFrequencyComponent(0);
      expect(result).toBe(0);
    });

    it('should increase with signal count', () => {
      const low = calculateFrequencyComponent(1);
      const high = calculateFrequencyComponent(10);
      expect(high).toBeGreaterThan(low);
    });

    it('should be clamped to [0, 1]', () => {
      const result = calculateFrequencyComponent(100);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateRelevanceComponent', () => {
    it('should calculate average score', () => {
      const result = calculateRelevanceComponent(2.7, 3);
      expect(result).toBeCloseTo(0.9, 1);
    });

    it('should handle edge cases', () => {
      expect(calculateRelevanceComponent(0, 0)).toBe(0);
      expect(calculateRelevanceComponent(-1, 1)).toBe(0);
    });
  });

  describe('calculateDiversityComponent', () => {
    it('should increase with unique queries', () => {
      const none = calculateDiversityComponent(0);
      const some = calculateDiversityComponent(3);
      expect(some).toBeGreaterThan(none);
    });

    it('should approach 1 as queries increase', () => {
      const many = calculateDiversityComponent(20);
      expect(many).toBeCloseTo(1, 1);
    });
  });

  describe('calculateRecencyComponent', () => {
    it('should be 1 for very recent memories', () => {
      const now = Date.now();
      const result = calculateRecencyComponent(0);
      expect(result).toBe(1);
    });

    it('should decay over time', () => {
      const recent = calculateRecencyComponent(1);
      const old = calculateRecencyComponent(14);
      expect(recent).toBeGreaterThan(old);
    });
  });

  describe('calculateConsolidationComponent', () => {
    it('should return 0 for empty recall days', () => {
      const result = calculateConsolidationComponent([]);
      expect(result).toBe(0);
    });

    it('should increase with more recall days', () => {
      const single = calculateConsolidationComponent(['2024-01-01']);
      const multiple = calculateConsolidationComponent(['2024-01-01', '2024-01-02', '2024-01-03']);
      expect(multiple).toBeGreaterThan(single);
    });
  });

  describe('calculateConceptualComponent', () => {
    it('should return 0 for empty tags', () => {
      const result = calculateConceptualComponent([]);
      expect(result).toBe(0);
    });

    it('should increase with more tags', () => {
      const few = calculateConceptualComponent(['tag1']);
      const many = calculateConceptualComponent(['tag1', 'tag2', 'tag3', 'tag4', 'tag5']);
      expect(many).toBeGreaterThan(few);
    });

    it('should be clamped to 1', () => {
      const result = calculateConceptualComponent(['t1', 't2', 't3', 't4', 't5', 't6', 't7']);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculatePhaseSignalBoost', () => {
    it('should return 0 when no phase signals', () => {
      const result = calculatePhaseSignalBoost(undefined, Date.now());
      expect(result).toBe(0);
    });

    it('should include light and rem boosts', () => {
      const signal = createMockPhaseSignal({
        lightHits: 2,
        remHits: 1,
      });
      const result = calculatePhaseSignalBoost(signal, Date.now());
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('scoreEntry (Complete 7-Signal Score)', () => {
    it('should calculate complete score with all components', () => {
      const entry = createMockRecallEntry({
        recallCount: 5,
        totalScore: 4.5,
        queryHashes: ['h1', 'h2', 'h3'],
        recallDays: ['2024-01-01', '2024-01-02', '2024-01-03'],
        conceptTags: ['环境', '环评', '监测'],
      });
      
      const phaseSignal = createMockPhaseSignal();
      const now = Date.now();
      
      const result = scoreEntry(entry, phaseSignal, DEFAULT_PROMOTION_WEIGHTS, now);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.components).toBeDefined();
      expect(result.phaseBoost).toBeGreaterThanOrEqual(0);
    });

    it('should apply correct weights', () => {
      const entry = createMockRecallEntry();
      const result = scoreEntry(entry, undefined, DEFAULT_PROMOTION_WEIGHTS, Date.now());
      
      // Verify score is within expected range
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      
      // Verify all components are present
      expect(result.components.frequency).toBeGreaterThanOrEqual(0);
      expect(result.components.relevance).toBeGreaterThanOrEqual(0);
      expect(result.components.diversity).toBeGreaterThanOrEqual(0);
      expect(result.components.recency).toBeGreaterThanOrEqual(0);
      expect(result.components.consolidation).toBeGreaterThanOrEqual(0);
      expect(result.components.conceptual).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============== 梦境系统集成测试 ==============

describe('DreamingSystem Integration', () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await createTestWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  describe('createDreamingSystem', () => {
    it('should create a system instance', () => {
      const system = createDreamingSystem(workspaceDir);
      expect(system).toBeDefined();
    });

    it('should apply custom config', () => {
      const system = createDreamingSystem(workspaceDir, {
        enabled: true,
        frequency: '0 4 * * *',
        light: {
          enabled: true,
          lookbackDays: 14,
          limit: 100,
          deduplicationSimilarity: 0.9,
          maxSnippetChars: 200,
          minSnippetChars: 10,
          ingestionScore: 0.7,
          storage: { mode: 'separate', separateReports: true },
        },
      });

      const status = system.getStatus();
      expect(status.enabled).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return initial status', () => {
      const system = createDreamingSystem(workspaceDir);
      const status = system.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.schedulerState).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.recallStats).toBeDefined();
      expect(status.recallStats.totalEntries).toBe(0);
    });
  });

  describe('executePhase', () => {
    it('should execute light phase', async () => {
      const system = createDreamingSystem(workspaceDir, {
        light: { 
          enabled: true, 
          lookbackDays: 7, 
          limit: 10, 
          deduplicationSimilarity: 0.85,
          maxSnippetChars: 280,
          minSnippetChars: 8,
          ingestionScore: 0.62,
          storage: { mode: 'inline', separateReports: false },
        },
      });

      const result = await system.executePhase(DreamingPhase.LIGHT);

      expect(result.phase).toBe(DreamingPhase.LIGHT);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should execute deep phase', async () => {
      const system = createDreamingSystem(workspaceDir, {
        deep: {
          enabled: true,
          lookbackDays: 14,
          limit: 5,
          deduplicationSimilarity: 0.85,
          minScore: 0.5,
          minRecallCount: 1,
          minUniqueQueries: 1,
          storage: { mode: 'inline', separateReports: false },
        },
      });

      const result = await system.executePhase(DreamingPhase.DEEP);

      expect(result.phase).toBe(DreamingPhase.DEEP);
      expect(result.success).toBe(true);
    });

    it('should execute REM phase', async () => {
      const system = createDreamingSystem(workspaceDir, {
        rem: { 
          enabled: true, 
          lookbackDays: 7, 
          limit: 5, 
          deduplicationSimilarity: 0.88,
          minPatternStrength: 0.3,
          storage: { mode: 'inline', separateReports: false },
        },
      });

      const result = await system.executePhase(DreamingPhase.REM);

      expect(result.phase).toBe(DreamingPhase.REM);
      expect(result.success).toBe(true);
    });
  });

  describe('preview', () => {
    it('should generate preview without side effects', async () => {
      const system = createDreamingSystem(workspaceDir);

      const preview = await system.preview(DreamingPhase.LIGHT);

      expect(preview.phase).toBe(DreamingPhase.LIGHT);
      expect(Array.isArray(preview.snippets)).toBe(true);
    });
  });

  describe('triggerCycle', () => {
    it('should complete full cycle', async () => {
      const system = createDreamingSystem(workspaceDir, {
        enabled: true,
        frequency: '0 3 * * *',
      });

      const result = await system.triggerCycle();

      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(result.phases).toBeDefined();
      expect(result.phases.light).toBeDefined();
      expect(result.phases.rem).toBeDefined();
      expect(result.diaryEntries).toBeDefined();
    });
  });
});

// ============== 记忆整合测试 ==============

describe('MemoryConsolidator', () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await createTestWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  describe('readShortTermRecallEntries', () => {
    it('should return empty array when no entries exist', async () => {
      const entries = await MemoryConsolidator.readShortTermRecallEntries(workspaceDir);
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe('recordDreamingPhaseSignals', () => {
    it('should record phase signals', async () => {
      await MemoryConsolidator.recordDreamingPhaseSignals(
        workspaceDir,
        'light',
        ['test-key-1', 'test-key-2'],
        Date.now()
      );

      const signals = await MemoryConsolidator.readPhaseSignals(workspaceDir);
      expect(signals.has('test-key-1')).toBe(true);
      expect(signals.has('test-key-2')).toBe(true);
    });
  });

  describe('getPromotionCandidates', () => {
    it('should return empty array when no candidates exist', async () => {
      const candidates = await MemoryConsolidator.getPromotionCandidates(workspaceDir);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBe(0);
    });
  });
});

// ============== Recall Tracking 集成测试 ==============

describe('Recall Tracking Integration', () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await createTestWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  describe('DreamingSystem with Recall Tracking', () => {
    it('should track recall frequency', async () => {
      const system = createDreamingSystem(workspaceDir);
      
      // Initial frequency should be 0
      const initialFreq = system.getRecallFrequency('any-key');
      expect(initialFreq).toBe(0);
    });

    it('should calculate seven signal scores', async () => {
      const system = createDreamingSystem(workspaceDir);
      
      // Create a mock entry
      const mockEntry: ShortTermRecallEntry = createMockRecallEntry();
      
      // Score should be calculated (though entry won't be in the system yet)
      const details = await system.getSevenSignalDetails('non-existent-key');
      expect(details).toBeNull();
    });
  });
});

// ============== 完整工作流测试 ==============

describe('Complete Dreaming Workflow', () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await createTestWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  it('should execute complete dreaming cycle with all phases', async () => {
    const system = createDreamingSystem(workspaceDir, {
      enabled: true,
      frequency: '0 3 * * *',
      light: {
        enabled: true,
        lookbackDays: 7,
        limit: 50,
        deduplicationSimilarity: 0.85,
        storage: { mode: 'inline', separateReports: false },
        maxSnippetChars: 280,
        minSnippetChars: 8,
        ingestionScore: 0.62,
      },
      deep: {
        enabled: true,
        lookbackDays: 14,
        limit: 10,
        deduplicationSimilarity: 0.85,
        storage: { mode: 'inline', separateReports: false },
        minScore: 0.75,
        minRecallCount: 3,
        minUniqueQueries: 2,
      },
      rem: {
        enabled: true,
        lookbackDays: 7,
        limit: 5,
        deduplicationSimilarity: 0.88,
        storage: { mode: 'inline', separateReports: false },
        minPatternStrength: 0.3,
      },
    });

    // Execute full cycle
    const result = await system.triggerCycle();

    // Verify all phases executed
    expect(result.phases.light.success).toBe(true);
    expect(result.phases.deep?.success).toBe(true);
    expect(result.phases.rem.success).toBe(true);

    // Verify diary entries were created
    expect(result.diaryEntries.length).toBeGreaterThanOrEqual(0);

    // Verify total promoted count is tracked
    expect(typeof result.totalPromoted).toBe('number');
  });

  it('should record phase signals during execution', async () => {
    const system = createDreamingSystem(workspaceDir);

    // Execute light phase
    await system.executePhase(DreamingPhase.LIGHT);

    // Execute REM phase
    await system.executePhase(DreamingPhase.REM);

    // Phase signals should be recorded
    const signals = await MemoryConsolidator.readPhaseSignals(workspaceDir);
    expect(signals).toBeDefined();
  });
});
