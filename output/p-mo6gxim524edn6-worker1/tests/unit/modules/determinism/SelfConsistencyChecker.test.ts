import { SelfConsistencyChecker } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';
import type { SelfConsistencyResult } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/interfaces/IDeterminismSystem';
import type { SelfConsistencyCheckerConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';

describe('SelfConsistencyChecker', () => {
  let checker: SelfConsistencyChecker;

  beforeEach(() => {
    checker = new SelfConsistencyChecker();
  });

  describe('constructor', () => {
    it('should create a SelfConsistencyChecker with default options', () => {
      expect(checker).toBeInstanceOf(SelfConsistencyChecker);
      expect(checker.name).toBe('SelfConsistencyChecker');
      expect(checker.version).toBe('1.0.0');
    });

    it('should accept custom sample count and pass threshold', () => {
      const customConfig: SelfConsistencyCheckerConfig = {
        defaultSamples: 5,
        passThreshold: 0.8
      };
      const customChecker = new SelfConsistencyChecker(customConfig);
      expect(customChecker).toBeInstanceOf(SelfConsistencyChecker);
    });
  });

  describe('isReady', () => {
    it('should return true when checker is ready', () => {
      expect(checker.isReady()).toBe(true);
    });
  });

  describe('verify', () => {
    it('should work when samples are provided', async () => {
      const samples = [
        'The answer is 42',
        'The answer is 42',
        'The answer is forty two'
      ];
      const result = await checker.verify('test', undefined, samples);
      
      expect(result.verified).toBeDefined();
      expect(result.consistencyScore).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should return default result when no samples provided', async () => {
      const result = await checker.verify('Single content');
      
      expect(result.verified).toBe(true);
      expect(result.consistencyScore).toBe(1);
      expect(result.hallucinationRisk).toBe(0);
      expect(result.message).toContain('跳过自一致性检查');
    });
  });

  describe('checkConsistency', () => {
    it('should return high consistency score for identical samples', () => {
      const samples = [
        'The sky is blue',
        'The sky is blue',
        'The sky is blue'
      ];
      const result: SelfConsistencyResult = checker.checkConsistency(samples);
      
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.passed).toBe(result.score >= (checker as any).passThreshold);
      expect(result.details.length).toBeGreaterThan(0);
    });

    it('should return low consistency score for different samples', () => {
      const samples = [
        'The sky is blue',
        'Cats like fish',
        'Programming is fun'
      ];
      const result: SelfConsistencyResult = checker.checkConsistency(samples);
      
      expect(result.score).toBeLessThan(0.5);
    });

    it('should handle custom pass threshold', () => {
      const customChecker = new SelfConsistencyChecker({
        passThreshold: 0.5
      });
      const samples = [
        'Hello world',
        'Hello there',
        'Hello everyone'
      ];
      const result = customChecker.checkConsistency(samples);
      
      expect(result.score).toBeDefined();
      expect(result.passed).toBe(result.score >= 0.5);
    });

    it('should calculate pairwise similarities correctly', () => {
      const samples = [
        'This is the first sample',
        'This is the second sample',
        'This is the third sample'
      ];
      const result = checker.checkConsistency(samples);
      
      expect(result.details).toHaveLength(3);
      result.details.forEach(detail => {
        expect(detail.pathId).toBeDefined();
        expect(detail.content).toBeDefined();
        expect(detail.similarity).toBeGreaterThanOrEqual(0);
        expect(detail.similarity).toBeLessThanOrEqual(1);
      });
    });

    it('should return score 1 when samples array has less than 2 valid samples', () => {
      const result = checker.checkConsistency(['Only one sample', null, undefined]);
      
      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
    });

    it('should filter out null and undefined samples', () => {
      const result = checker.checkConsistency([
        'Valid sample',
        null,
        undefined,
        '',
        '   '
      ]);
      
      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
    });
  });

  describe('getDefaultSamples', () => {
    it('should return the default sample count', () => {
      expect((checker as any).defaultSamples).toBe(3);
    });
  });

  describe('getPassThreshold', () => {
    it('should return the current pass threshold', () => {
      expect((checker as any).passThreshold).toBe(0.7);
    });
  });

  describe('edge cases', () => {
    it('should handle very long samples', () => {
      const longSample1 = 'a'.repeat(5000);
      const longSample2 = 'a'.repeat(5000);
      const result = checker.checkConsistency([longSample1, longSample2]);
      
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.passed).toBe(result.score >= (checker as any).passThreshold);
    });

    it('should handle samples of different lengths', () => {
      const result = checker.checkConsistency([
        'Short',
        'This is a much longer sample text that contains more words'
      ]);
      
      expect(result.score).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should handle special characters in samples', () => {
      const result = checker.checkConsistency([
        'Hello! @#$%^',
        'Hello! @#$%^',
        'Hello! @#$%^'
      ]);
      
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.passed).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = checker.checkConsistency(['', '']);
      
      expect(result.score).toBe(1);
      expect(result.passed).toBe(true);
    });
  });
});
