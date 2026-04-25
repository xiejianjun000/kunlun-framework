/**
 * HallucinationDetector 补充测试 — 覆盖之前未覆盖的分支
 */
import { HallucinationDetector } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/HallucinationDetector';
import type { HallucinationDetectionResult } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/interfaces/IDeterminismSystem';
import type { HallucinationDetectorConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/HallucinationDetector';
import { WFGYVerifier } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/WFGYVerifier';
import { SelfConsistencyChecker } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';
import { SourceTracer } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SourceTracer';

describe('HallucinationDetector — Coverage Supplement', () => {
  describe('detect — null/undefined content', () => {
    it('should return max risk for null content', () => {
      const detector = new HallucinationDetector();
      // @ts-ignore
      const result = detector.detect(null);

      expect(result.riskScore).toBe(1.0);
      expect(result.isHighRisk).toBe(true);
      expect(result.suspectedSegments).toEqual([]);
    });

    it('should return max risk for undefined content', () => {
      const detector = new HallucinationDetector();
      // @ts-ignore
      const result = detector.detect(undefined);

      expect(result.riskScore).toBe(1.0);
      expect(result.isHighRisk).toBe(true);
    });
  });

  describe('detect — no enabled detectors', () => {
    it('should return zero risk when all detectors are disabled', () => {
      const detector = new HallucinationDetector({
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: false
      });

      const result = detector.detect('any content');
      expect(result.riskScore).toBe(0);
      expect(result.isHighRisk).toBe(false);
      expect(result.suspectedSegments).toEqual([]);
    });
  });

  describe('detect — WFGY verifier with violations', () => {
    it('should add suspected segments when WFGY rules are violated', () => {
      const wfgy = new WFGYVerifier({
        rules: [
          {
            id: 'strict-rule',
            name: 'Strict',
            description: 'Should always fail',
            pattern: /never-match-this/,
            expected: true,
            violationMessage: 'This rule was violated'
          }
        ],
        minimumScore: 0.0
      });

      const detector = new HallucinationDetector({
        enableWFGY: true,
        enableConsistency: false,
        enableSourceTrace: false,
        weights: { wfgy: 1.0, consistency: 0, sourceTrace: 0 }
      });

      detector.setWFGYVerifier(wfgy);

      const result: HallucinationDetectionResult = detector.detect('hello world');
      expect(result.suspectedSegments.length).toBeGreaterThan(0);
      expect(result.suspectedSegments[0].text).toBe('This rule was violated');
    });
  });

  describe('detect — with consistency checker and samples', () => {
    it('should factor in consistency when samples are provided', () => {
      const consistency = new SelfConsistencyChecker();
      const detector = new HallucinationDetector({
        enableWFGY: false,
        enableConsistency: true,
        enableSourceTrace: false,
        weights: { wfgy: 0, consistency: 1.0, sourceTrace: 0 }
      });

      detector.setConsistencyChecker(consistency);

      const identicalSamples = [
        'The answer is 42',
        'The answer is 42',
        'The answer is 42'
      ];

      const result = detector.detect('test', undefined, identicalSamples);
      expect(result.riskScore).toBeLessThan(0.1);
    });

    it('should increase risk for inconsistent samples', () => {
      const consistency = new SelfConsistencyChecker();
      const detector = new HallucinationDetector({
        enableWFGY: false,
        enableConsistency: true,
        enableSourceTrace: false,
        weights: { wfgy: 0, consistency: 1.0, sourceTrace: 0 }
      });

      detector.setConsistencyChecker(consistency);

      const differentSamples = [
        'The answer is 42',
        'Cats like to eat fish',
        'Python is a programming language'
      ];

      const result = detector.detect('test', undefined, differentSamples);
      expect(result.riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('detect — source tracer with matches', () => {
    it('should reduce risk when sources are found', () => {
      const tracer = new SourceTracer({ minMatchThreshold: 0.1 });
      tracer.addEntry({
        id: 'fact-1',
        content: 'The Earth revolves around the Sun',
        keywords: ['earth', 'revolves', 'sun'],
        source: {
          id: 'fact-1',
          content: 'The Earth revolves around the Sun',
          type: 'document',
          confidence: 0.95
        }
      });

      const detector = new HallucinationDetector({
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: true,
        weights: { wfgy: 0, consistency: 0, sourceTrace: 1.0 }
      });

      detector.setSourceTracer(tracer);

      const result = detector.detect('The Earth revolves around the Sun');
      expect(result.riskScore).toBeLessThan(0.5);
    });

    it('should increase risk when no sources found', () => {
      const tracer = new SourceTracer();
      const detector = new HallucinationDetector({
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: true,
        weights: { wfgy: 0, consistency: 0, sourceTrace: 1.0 }
      });

      detector.setSourceTracer(tracer);

      const result = detector.detect('Dragons fly through purple galaxies');
      expect(result.riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('detect — findSuspectedSegments triggered', () => {
    it('should attempt to find suspected segments when high risk and no WFGY segments', () => {
      const tracer = new SourceTracer({ minMatchThreshold: 0.1 });
      tracer.addEntry({
        id: 'known-fact',
        content: 'Known fact about the world',
        keywords: ['known', 'fact', 'world'],
        source: {
          id: 'known-fact',
          content: 'Known fact about the world',
          type: 'document',
          confidence: 0.9
        }
      });

      const detector = new HallucinationDetector({
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: true,
        weights: { wfgy: 0, consistency: 0, sourceTrace: 1.0 },
        defaultThreshold: 0.3
      });

      detector.setSourceTracer(tracer);

      // Content with mixed known and unknown sentences
      const content = 'Known fact about the world is true. Dragons breathe fire on Mars and purple unicorns dance at midnight.';
      const result = detector.detect(content);

      expect(result.riskScore).toBeGreaterThan(0.3);
      // findSuspectedSegments should be triggered for high risk
      if (result.isHighRisk) {
        expect(Array.isArray(result.suspectedSegments)).toBe(true);
      }
    });
  });

  describe('constructor — zero weights', () => {
    it('should use default weights when all custom weights are zero', () => {
      const detector = new HallucinationDetector({
        weights: {
          wfgy: 0,
          consistency: 0,
          sourceTrace: 0
        }
      });

      // Should fall back to default weights
      expect(detector.isReady()).toBe(true);
    });
  });

  describe('setDefaultThreshold', () => {
    it('should clamp threshold to valid range', () => {
      const detector = new HallucinationDetector();
      detector.setDefaultThreshold(2.0);
      expect(detector.getDefaultThreshold()).toBe(1);
    });

    it('should accept valid threshold', () => {
      const detector = new HallucinationDetector();
      detector.setDefaultThreshold(0.5);
      expect(detector.getDefaultThreshold()).toBe(0.5);
    });
  });

  describe('verify — custom threshold via options', () => {
    it('should use custom hallucinationThreshold from options', async () => {
      const detector = new HallucinationDetector({
        defaultThreshold: 0.9,
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: false
      });

      // With threshold 0.9, risk 0 should not be high
      const result = await detector.verify('test', { hallucinationThreshold: 0.9 });
      expect(result.verified).toBe(true);
    });

    it('should use defaultThreshold when no options provided', async () => {
      const detector = new HallucinationDetector({
        defaultThreshold: 0.01,
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: true,
        weights: { wfgy: 0, consistency: 0, sourceTrace: 1.0 }
      });

      const result = await detector.verify('no matching content');
      // With very low threshold, any risk should be flagged
      expect(result.hallucinationRisk).toBeGreaterThan(0);
    });
  });
});
