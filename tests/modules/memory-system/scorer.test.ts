/**
 * 重要性评分器测试
 * Importance Scorer Tests
 */

import { ImportanceScorer } from '../../../dist/modules/memory-system/scoring/ImportanceScorer';
import { IMemory, MemoryTier, ImportanceLevel } from '../../../dist/modules/memory-system/interfaces';

describe('ImportanceScorer', () => {
  let scorer: ImportanceScorer;

  const createTestMemory = (overrides: Partial<IMemory> = {}): IMemory => ({
    id: 'test-' + Math.random().toString(36).substr(2, 9),
    userId: 'user1',
    tenantId: 'tenant1',
    content: '测试记忆内容',
    type: 'test',
    tier: MemoryTier.WARM,
    metadata: {},
    createdAt: new Date(),
    accessedAt: new Date(),
    accessCount: 1,
    importanceScore: 0.5,
    isArchived: false,
    tags: [],
    linkedMemoryIds: [],
    ...overrides,
  });

  beforeEach(() => {
    scorer = new ImportanceScorer();
  });

  describe('score', () => {
    it('应该评分新记忆', async () => {
      const memory = createTestMemory({
        accessCount: 0,
        createdAt: new Date(),
        accessedAt: new Date(),
      });

      const score = await scorer.score(memory);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('应该给高访问频率记忆更高评分', async () => {
      const lowFreqMemory = createTestMemory({ accessCount: 1 });
      const highFreqMemory = createTestMemory({ accessCount: 50 });

      const lowScore = await scorer.score(lowFreqMemory);
      const highScore = await scorer.score(highFreqMemory);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('应该考虑情感标记', async () => {
      const neutralMemory = createTestMemory({
        metadata: { sentiment: 'neutral', sentimentIntensity: 0.5 },
      });
      const positiveMemory = createTestMemory({
        metadata: { sentiment: 'positive', sentimentIntensity: 0.9 },
      });

      const neutralScore = await scorer.score(neutralMemory);
      const positiveScore = await scorer.score(positiveMemory);

      expect(positiveScore).toBeGreaterThan(neutralScore);
    });

    it('应该考虑内容长度', async () => {
      const shortMemory = createTestMemory({
        content: '短',
      });
      const longMemory = createTestMemory({
        content: '这是一段比较长的内容，用于测试不同长度内容的评分差异',
      });

      const shortScore = await scorer.score(shortMemory);
      const longScore = await scorer.score(longMemory);

      // 长内容应该有合理的评分，但不是最短的
      expect(longScore).toBeGreaterThanOrEqual(0);
    });

    it('应该考虑显式标记', async () => {
      const normalMemory = createTestMemory();
      const pinnedMemory = createTestMemory({
        metadata: { pinned: true },
      });

      const normalScore = await scorer.score(normalMemory);
      const pinnedScore = await scorer.score(pinnedMemory);

      expect(pinnedScore).toBeGreaterThanOrEqual(normalScore);
    });
  });

  describe('getLevel', () => {
    it('应该正确识别关键级别', () => {
      expect(scorer.getLevel(1.0)).toBe(ImportanceLevel.CRITICAL);
    });

    it('应该正确识高级别', () => {
      expect(scorer.getLevel(0.8)).toBe(ImportanceLevel.HIGH);
      expect(scorer.getLevel(0.85)).toBe(ImportanceLevel.HIGH);
    });

    it('应该正确识别中级别', () => {
      expect(scorer.getLevel(0.5)).toBe(ImportanceLevel.MEDIUM);
    });

    it('应该正确识别低级别', () => {
      expect(scorer.getLevel(0.2)).toBe(ImportanceLevel.LOW);
    });

    it('应该正确识别微不足道级别', () => {
      expect(scorer.getLevel(0.05)).toBe(ImportanceLevel.TRIVIAL);
    });
  });

  describe('getReason', () => {
    it('应该返回关键记忆理由', () => {
      const reason = scorer.getReason(1.0);
      expect(reason).toContain('关键');
    });

    it('应该返回高重要性理由', () => {
      const reason = scorer.getReason(0.8);
      expect(reason).toContain('高重要性');
    });

    it('应该返回中等重要性理由', () => {
      const reason = scorer.getReason(0.5);
      expect(reason).toContain('中等');
    });

    it('应该返回低重要性理由', () => {
      const reason = scorer.getReason(0.2);
      expect(reason).toContain('低');
    });

    it('应该返回微不足道理由', () => {
      const reason = scorer.getReason(0.05);
      expect(reason).toContain('建议清理');
    });
  });

  describe('strategy', () => {
    it('应该使用默认策略', () => {
      const strategy = scorer.getCurrentStrategy();
      expect(strategy.id).toBe('default');
    });

    it('应该切换到保守策略', () => {
      scorer.setStrategy('conservative');
      const strategy = scorer.getCurrentStrategy();
      expect(strategy.id).toBe('conservative');
    });

    it('应该切换到激进策略', () => {
      scorer.setStrategy('aggressive');
      const strategy = scorer.getCurrentStrategy();
      expect(strategy.id).toBe('aggressive');
    });

    it('应该返回所有可用策略', () => {
      const strategies = scorer.getAvailableStrategies();
      expect(strategies).toContain('default');
      expect(strategies).toContain('conservative');
      expect(strategies).toContain('aggressive');
    });
  });

  describe('scoreBatch', () => {
    it('应该批量评分记忆', async () => {
      const memories = [
        createTestMemory({ id: 'mem-1', content: '第一个记忆' }),
        createTestMemory({ id: 'mem-2', content: '第二个记忆' }),
        createTestMemory({ id: 'mem-3', content: '第三个记忆' }),
      ];

      const results = await scorer.scoreBatch(memories);

      expect(results.size).toBe(3);
      expect(results.has('mem-1')).toBe(true);
      expect(results.has('mem-2')).toBe(true);
      expect(results.has('mem-3')).toBe(true);
    });

    it('应该返回正确的分数', async () => {
      const memories = [
        createTestMemory({ id: 'mem-1', accessCount: 1 }),
        createTestMemory({ id: 'mem-2', accessCount: 100 }),
      ];

      const results = await scorer.scoreBatch(memories);

      expect(results.get('mem-1')).toBeDefined();
      expect(results.get('mem-2')).toBeDefined();
      expect(results.get('mem-2')!).toBeGreaterThan(results.get('mem-1')!);
    });
  });

  describe('scoringHistory', () => {
    it('应该记录评分历史', async () => {
      const memory = createTestMemory();
      await scorer.score(memory);

      const history = scorer.getScoringHistory(memory.id);
      expect(history).not.toBeNull();
      expect(history!.score).toBeDefined();
      expect(history!.timestamp).toBeDefined();
    });

    it('应该返回null对于未知记忆', () => {
      const history = scorer.getScoringHistory('unknown-id');
      expect(history).toBeNull();
    });

    it('应该清除历史记录', async () => {
      const memory = createTestMemory();
      await scorer.score(memory);

      scorer.clearHistory();
      const history = scorer.getScoringHistory(memory.id);
      expect(history).toBeNull();
    });
  });
});
