import { HallucinationDetector } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/HallucinationDetector';
import type { HallucinationDetectionResult } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/interfaces/IDeterminismSystem';
import type { HallucinationDetectorConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/HallucinationDetector';
import { WFGYVerifier } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/WFGYVerifier';
import { SelfConsistencyChecker } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';
import { SourceTracer } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SourceTracer';

describe('HallucinationDetector', () => {
  let detector: HallucinationDetector;

  beforeEach(() => {
    detector = new HallucinationDetector();
  });

  describe('constructor', () => {
    it('should create a HallucinationDetector with default configuration', () => {
      expect(detector).toBeInstanceOf(HallucinationDetector);
      expect(detector.name).toBe('HallucinationDetector');
      expect(detector.version).toBe('1.0.0');
    });

    it('should accept custom configuration', () => {
      const customConfig: HallucinationDetectorConfig = {
        defaultThreshold: 0.5,
        enableWFGY: true,
        enableConsistency: false,
        enableSourceTrace: false,
        weights: {
          wfgy: 1.0
        }
      };
      const customDetector = new HallucinationDetector(customConfig);
      expect(customDetector).toBeInstanceOf(HallucinationDetector);
    });
  });

  describe('isReady', () => {
    it('should return true when detector is ready', () => {
      expect(detector.isReady()).toBe(true);
    });
  });

  describe('verify', () => {
    it('should return verification result with hallucination information', async () => {
      const result = await detector.verify('Some content to check for hallucinations');
      
      expect(result.verified).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
      expect(result.hallucinationRisk).toBeGreaterThanOrEqual(0);
      expect(result.hallucinationRisk).toBeLessThanOrEqual(1);
      expect(result.message).toBeDefined();
    });

    it('should return high hallucination risk for null content', async () => {
      // @ts-ignore
      const result = await detector.verify(null);
      
      expect(result.verified).toBe(false);
      expect(result.hallucinationRisk).toBeGreaterThan(0.8);
    });
  });

  describe('detect', () => {
    it('should return detection result with hallucination risk score', async () => {
      const content = 'The Earth revolves around the Sun';
      const result: HallucinationDetectionResult = await detector.detect(content);
      
      expect(result.riskScore).toBeDefined();
      expect(result.isHighRisk).toBeDefined();
      expect(Array.isArray(result.suspectedSegments)).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('detect with integrated components', () => {
    it('should integrate results from WFGY, consistency, and source trace', async () => {
      const wfgy = new WFGYVerifier();
      const consistency = new SelfConsistencyChecker();
      const sourceTracer = new SourceTracer();
      
      detector.setWFGYVerifier(wfgy);
      detector.setConsistencyChecker(consistency);
      detector.setSourceTracer(sourceTracer);
      
      expect(detector.getWFGYVerifier()).toBeDefined();
      expect(detector.getConsistencyChecker()).toBeDefined();
      expect(detector.getSourceTracer()).toBeDefined();
      
      const result = await detector.detect('Test content that should be checked by all components');
      expect(result).toBeDefined();
    });
  });

  describe('getDefaultThreshold', () => {
    it('should return the configured default threshold', () => {
      const threshold = detector.getDefaultThreshold();
      expect(typeof threshold).toBe('number');
      expect(threshold).toBeGreaterThanOrEqual(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });
  });

  describe('set/get components', () => {
    it('should correctly set and get WFGYVerifier', () => {
      const wfgy = new WFGYVerifier();
      detector.setWFGYVerifier(wfgy);
      expect(detector.getWFGYVerifier()).toBe(wfgy);
    });

    it('should correctly set and get SelfConsistencyChecker', () => {
      const checker = new SelfConsistencyChecker();
      detector.setConsistencyChecker(checker);
      expect(detector.getConsistencyChecker()).toBe(checker);
    });

    it('should correctly set and get SourceTracer', () => {
      const tracer = new SourceTracer();
      detector.setSourceTracer(tracer);
      expect(detector.getSourceTracer()).toBe(tracer);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await detector.detect('');
      
      expect(result.riskScore).toBe(0);
      expect(result.isHighRisk).toBe(result.riskScore > detector.getDefaultThreshold());
      expect(result.suspectedSegments).toHaveLength(0);
    });

    it('should handle very long content', async () => {
      let longContent = '';
      for (let i = 0; i < 100; i++) {
        longContent += 'This is sentence number ' + i + '. ';
      }
      longContent += 'But the real truth is that dragons live in my garage.';
      
      const result = await detector.detect(longContent);
      
      expect(result).toBeDefined();
      expect(result.riskScore).toBeDefined();
      expect(result.isHighRisk).toBeDefined();
    });

    it('should work correctly when some components are disabled', async () => {
      const disabledConfig: HallucinationDetectorConfig = {
        enableWFGY: false,
        enableConsistency: false,
        enableSourceTrace: false
      };
      const disabledDetector = new HallucinationDetector(disabledConfig);
      
      const result = await disabledDetector.detect('Test content with all components disabled');
      
      expect(result).toBeDefined();
      expect(result.riskScore).toBeDefined();
    });

    it('should handle custom weights', async () => {
      const customWeightsConfig: HallucinationDetectorConfig = {
        weights: {
          wfgy: 0.2,
          consistency: 0.3,
          sourceTrace: 0.5
        }
      };
      const weightedDetector = new HallucinationDetector(customWeightsConfig);
      
      const result = await weightedDetector.detect('Test content with custom weights');
      
      expect(result).toBeDefined();
    });
  });
});
