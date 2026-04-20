import { SelfConsistencyChecker } from '../../../../src/modules/determinism';

describe('SelfConsistencyChecker', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const checker = new SelfConsistencyChecker();
      expect(checker).toBeDefined();
      expect(checker.name).toBe('SelfConsistencyChecker');
      expect(checker.isReady()).toBe(true);
      expect(checker.getDefaultSamples()).toBe(3);
    });

    it('should accept custom configuration', () => {
      const checker = new SelfConsistencyChecker({
        defaultSamples: 5,
        passThreshold: 0.8,
        similarityStrategy: 'cosine'
      });
      expect(checker.getDefaultSamples()).toBe(5);
      expect(checker.getPassThreshold()).toBe(0.8);
    });
  });

  describe('checkConsistency', () => {
    it('should return perfect score for single sample', () => {
      const checker = new SelfConsistencyChecker();
      const result = checker.checkConsistency(['single sample']);
      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
      expect(result.details).toHaveLength(0);
    });

    it('should return high score for identical samples', () => {
      const checker = new SelfConsistencyChecker();
      const result = checker.checkConsistency([
        'The quick brown fox jumps over the lazy dog',
        'The quick brown fox jumps over the lazy dog'
      ]);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.passed).toBe(true);
    });

    it('should return lower score for different samples', () => {
      const checker = new SelfConsistencyChecker();
      const result = checker.checkConsistency([
        'The quick brown fox jumps over the lazy dog',
        'A slow red rabbit crawls under the active cat'
      ]);
      expect(result.score).toBeLessThan(0.5);
      expect(result.passed).toBe(false);
    });

    it('should calculate consistency across multiple samples correctly', () => {
      const checker = new SelfConsistencyChecker({
        passThreshold: 0.7
      });
      const result = checker.checkConsistency([
        'AI models can produce hallucinations.',
        'AI models can sometimes generate hallucinations.',
        'AI models frequently produce hallucinations.'
      ]);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.passed).toBe(result.score >= 0.7);
      expect(result.details).toHaveLength(3); // 3 comparisons for 3 samples
    });
  });

  describe('verify', () => {
    it('should verify consistency when samples are provided', async () => {
      const checker = new SelfConsistencyChecker();
      const samples = [
        'Hello world',
        'Hello world'
      ];
      const result = await checker.verify('Hello world', {}, samples);
      expect(result.verified).toBe(true);
      expect(result.consistencyScore).toBeGreaterThan(0.9);
      expect(result.hallucinationRisk).toBeLessThan(0.1);
    });

    it('should return default result when no samples provided', async () => {
      const checker = new SelfConsistencyChecker();
      const result = await checker.verify('Hello world', {});
      expect(result.verified).toBe(true);
      expect(result.consistencyScore).toBe(1);
      expect(result.message).toContain('跳过');
    });
  });

  describe('setPassThreshold', () => {
    it('should clamp threshold between 0 and 1', () => {
      const checker = new SelfConsistencyChecker();
      checker.setPassThreshold(-0.5);
      expect(checker.getPassThreshold()).toBe(0);
      checker.setPassThreshold(1.5);
      expect(checker.getPassThreshold()).toBe(1);
      checker.setPassThreshold(0.75);
      expect(checker.getPassThreshold()).toBe(0.75);
    });
  });

  describe('similarity strategies', () => {
    const strategies = ['jaccard', 'cosine', 'levenshtein'] as const;
    
    strategies.forEach(strategy => {
      it(`should work with ${strategy} similarity`, () => {
        const checker = new SelfConsistencyChecker({
          similarityStrategy: strategy
        });
        const result = checker.checkConsistency([
          'The quick brown fox',
          'The quick brown fox'
        ]);
        expect(result.score).toBeGreaterThan(0.9);
      });
    });
  });
});
