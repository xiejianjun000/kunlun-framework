import { DeterminismSystem } from '../../../../src/modules/determinism';
import type { WFGYRule, KnowledgeIndexEntry } from '../../../../src/modules/determinism';

describe('DeterminismSystem', () => {
  describe('constructor', () => {
    it('should create a complete system with all components', () => {
      const system = new DeterminismSystem();
      expect(system).toBeDefined();
      expect(system.name).toBe('DeterminismSystem');
      expect(system.isReady()).toBe(true);
      expect(system.wfgyVerifier).toBeDefined();
      expect(system.consistencyChecker).toBeDefined();
      expect(system.sourceTracer).toBeDefined();
      expect(system.hallucinationDetector).toBeDefined();
    });

    it('should accept configuration for all components', () => {
      const rules: WFGYRule[] = [{
        id: 'test',
        name: 'Test',
        description: 'Test',
        pattern: /test/,
        expected: true
      }];

      const system = new DeterminismSystem({
        wfgy: {
          rules,
          minimumScore: 0.8
        },
        consistency: {
          defaultSamples: 5,
          passThreshold: 0.8
        },
        sourceTrace: {
          minMatchThreshold: 0.7
        },
        hallucination: {
          defaultThreshold: 0.7,
          weights: {
            wfgy: 0.5,
            consistency: 0.3,
            sourceTrace: 0.2
          }
        }
      });

      expect(system.wfgyVerifier.getRules()).toHaveLength(1);
      expect(system.consistencyChecker.getDefaultSamples()).toBe(5);
    });
  });

  describe('convenience methods', () => {
    it('should proxy WFGY operations', () => {
      const system = new DeterminismSystem();
      const rule: WFGYRule = {
        id: 'test-rule',
        name: 'Test',
        description: 'Test',
        pattern: /test/,
        expected: true
      };

      system.addWFGYRule(rule);
      expect(system.getWFGYRles()).toHaveLength(1);

      const removed = system.removeWFGYRule('test-rule');
      expect(removed).toBe(true);
      expect(system.getWFGYRles()).toHaveLength(0);
    });

    it('should proxy knowledge entry operations', () => {
      const system = new DeterminismSystem();
      const entry: KnowledgeIndexEntry = {
        id: 'test-entry',
        content: 'Test content',
        source: {
          id: 'test',
          type: 'document',
          confidence: 0.9
        }
      };

      system.addKnowledgeEntry(entry);
      expect(system.getKnowledgeIndexSize()).toBe(1);

      const removed = system.removeKnowledgeEntry('test-entry');
      expect(removed).toBe(true);
      expect(system.getKnowledgeIndexSize()).toBe(0);
    });

    it('should batch add entries', () => {
      const system = new DeterminismSystem();
      system.addKnowledgeEntries([
        {
          id: '1',
          content: 'Entry 1',
          source: { id: '1', type: 'document', confidence: 0.9 }
        },
        {
          id: '2',
          content: 'Entry 2',
          source: { id: '2', type: 'document', confidence: 0.9 }
        }
      ]);

      expect(system.getKnowledgeIndexSize()).toBe(2);
      system.clearKnowledgeIndex();
      expect(system.getKnowledgeIndexSize()).toBe(0);
    });
  });

  describe('verify', () => {
    it('should perform full verification', async () => {
      const system = new DeterminismSystem();
      
      system.addWFGYRule({
        id: 'no-fake',
        name: 'No Fake',
        description: 'Should not contain fake',
        pattern: /fake/,
        expected: false
      });

      system.addKnowledgeEntry({
        id: 'paris',
        content: 'Paris is capital of France',
        source: {
          id: 'geo-1',
          type: 'document',
          confidence: 1.0
        }
      });

      const result = await system.verify('Paris is the capital of France');
      expect(result.verified).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle null content', async () => {
      const system = new DeterminismSystem();
      const result = await system.verify(null);
      expect(result.verified).toBe(false);
      expect(result.hallucinationRisk).toBe(1);
    });
  });

  describe('individual component access', () => {
    it('should allow separate verification steps', () => {
      const system = new DeterminismSystem();
      
      system.addWFGYRule({
        id: 'test',
        name: 'Test',
        description: 'Test',
        pattern: /hello/,
        expected: true
      });

      const wfgyResult = system.verifySymbols('hello world');
      expect(wfgyResult.valid).toBe(true);

      const consistencyResult = system.checkConsistency([
        'hello world',
        'hello world'
      ]);
      expect(consistencyResult.score).toBeGreaterThan(0.9);

      system.addKnowledgeEntry({
        id: 'test',
        content: 'hello world',
        source: { id: 'test', type: 'document', confidence: 1 }
      });

      const traceResult = system.trace('hello world');
      expect(traceResult.sources).toHaveLength(1);
    });
  });

  describe('configuration', () => {
    it('should set thresholds', () => {
      const system = new DeterminismSystem();
      system.setHallucinationThreshold(0.75);
      system.setConsistencyThreshold(0.85);
      
      expect(system.hallucinationDetector.getDefaultThreshold()).toBe(0.75);
      expect(system.consistencyChecker.getPassThreshold()).toBe(0.85);
    });
  });
});
