/**
 * SelfConsistencyChecker 补充测试 — 覆盖之前未覆盖的分支
 */
import { SelfConsistencyChecker } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';
import type { SelfConsistencyCheckerConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';

describe('SelfConsistencyChecker — Coverage Supplement', () => {
  describe('cosine similarity strategy', () => {
    it('should use cosine similarity when configured', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'cosine'
      });

      const result = checker.checkConsistency([
        'the quick brown fox',
        'the quick brown fox'
      ]);

      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
    });

    it('should return 0 cosine similarity when no common tokens', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'cosine'
      });

      const result = checker.checkConsistency([
        'apple banana cherry',
        'dog cat mouse'
      ]);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('should handle cosine similarity with single token', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'cosine'
      });

      const result = checker.checkConsistency([
        'hello',
        'hello world'
      ]);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
    });
  });

  describe('levenshtein similarity strategy', () => {
    it('should use levenshtein similarity when configured', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'levenshtein'
      });

      const result = checker.checkConsistency([
        'hello world',
        'hello world'
      ]);

      expect(result.score).toBe(1);
    });

    it('should return 0 levenshtein similarity for completely different strings', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'levenshtein'
      });

      const result = checker.checkConsistency([
        'a',
        'z'
      ]);

      expect(result.score).toBe(0);
    });

    it('should handle levenshtein with single character difference', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'levenshtein'
      });

      const result = checker.checkConsistency([
        'hello',
        'hellp'
      ]);

      expect(result.score).toBeGreaterThan(0.8);
    });

    it('should handle levenshtein with empty strings', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'levenshtein'
      });

      const result = checker.checkConsistency([
        '',
        ''
      ]);

      expect(result.score).toBe(1);
    });

    it('should swap strings to optimize when a is longer', () => {
      const checker = new SelfConsistencyChecker({
        similarityStrategy: 'levenshtein'
      });

      // Long string vs short string — should swap internally
      const result = checker.checkConsistency([
        'this is a much longer string for testing purposes',
        'short'
      ]);

      expect(result.score).toBeDefined();
      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('setPassThreshold', () => {
    it('should clamp threshold to [0, 1] range for values > 1', () => {
      const checker = new SelfConsistencyChecker();
      checker.setPassThreshold(2.0);
      expect(checker.getPassThreshold()).toBe(1);
    });

    it('should clamp threshold to [0, 1] range for values < 0', () => {
      const checker = new SelfConsistencyChecker();
      checker.setPassThreshold(-0.5);
      expect(checker.getPassThreshold()).toBe(0);
    });

    it('should accept valid threshold', () => {
      const checker = new SelfConsistencyChecker();
      checker.setPassThreshold(0.85);
      expect(checker.getPassThreshold()).toBe(0.85);
    });
  });

  describe('verify with samples < 2', () => {
    it('should return default result when only 1 sample provided', async () => {
      const checker = new SelfConsistencyChecker();
      const result = await checker.verify('content', undefined, ['single sample']);

      expect(result.verified).toBe(true);
      expect(result.message).toContain('跳过自一致性检查');
    });

    it('should return default result when samples array is empty', async () => {
      const checker = new SelfConsistencyChecker();
      const result = await checker.verify('content', undefined, []);

      expect(result.verified).toBe(true);
      expect(result.message).toContain('跳过自一致性检查');
    });
  });

  describe('checkConsistency with null/undefined samples', () => {
    it('should treat all-null/undefined samples as single valid sample', () => {
      const checker = new SelfConsistencyChecker();
      const result = checker.checkConsistency([null, undefined, null]);

      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
      expect(result.details).toHaveLength(0);
    });
  });

  describe('constructor with custom similarity strategy', () => {
    it('should accept levenshtein as similarityStrategy', () => {
      const config: SelfConsistencyCheckerConfig = {
        similarityStrategy: 'levenshtein'
      };
      const checker = new SelfConsistencyChecker(config);
      expect(checker.isReady()).toBe(true);
    });

    it('should default to jaccard for unknown strategy', () => {
      const checker = new SelfConsistencyChecker();
      const result = checker.checkConsistency(['hello world', 'hello there']);
      // Jaccard should be used as default
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('getDefaultSamples getter', () => {
    it('should return default of 3', () => {
      const checker = new SelfConsistencyChecker();
      expect(checker.getDefaultSamples()).toBe(3);
    });

    it('should return custom value', () => {
      const checker = new SelfConsistencyChecker({ defaultSamples: 10 });
      expect(checker.getDefaultSamples()).toBe(10);
    });
  });

  describe('edge cases — whitespace-only samples', () => {
    it('should filter whitespace-only as empty', () => {
      const checker = new SelfConsistencyChecker();
      const result = checker.checkConsistency([
        'valid',
        '   ',
        '\t',
        '\n'
      ]);

      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
    });
  });
});
