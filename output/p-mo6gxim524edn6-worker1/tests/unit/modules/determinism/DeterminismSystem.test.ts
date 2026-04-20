import { DeterminismSystem } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/DeterminismSystem';
import type { DeterminismSystemConfig } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/DeterminismSystem';
import { WFGYVerifier } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/WFGYVerifier';
import { SelfConsistencyChecker } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SelfConsistencyChecker';
import { SourceTracer } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SourceTracer';
import { HallucinationDetector } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/HallucinationDetector';

describe('DeterminismSystem', () => {
  let system: DeterminismSystem;

  beforeEach(() => {
    system = new DeterminismSystem();
  });

  describe('constructor', () => {
    it('should create a DeterminismSystem with default configuration', () => {
      expect(system).toBeInstanceOf(DeterminismSystem);
      expect(system.name).toBe('DeterminismSystem');
      expect(system.version).toBe('1.0.0');
      
      expect(system.wfgyVerifier).toBeInstanceOf(WFGYVerifier);
      expect(system.consistencyChecker).toBeInstanceOf(SelfConsistencyChecker);
      expect(system.sourceTracer).toBeInstanceOf(SourceTracer);
      expect(system.hallucinationDetector).toBeInstanceOf(HallucinationDetector);
    });

    it('should accept custom configuration for all components', () => {
      const customConfig: DeterminismSystemConfig = {
        wfgy: {
          minimumScore: 0.7
        },
        consistency: {
          defaultSamples: 5
        },
        sourceTrace: {
          minMatchThreshold: 0.7,
          maxSources: 15
        },
        hallucination: {
          defaultThreshold: 0.7,
          enableWFGY: true,
          enableConsistency: true
        }
      };
      
      const customSystem = new DeterminismSystem(customConfig);
      expect(customSystem).toBeInstanceOf(DeterminismSystem);
      expect(customSystem.wfgyVerifier).toBeInstanceOf(WFGYVerifier);
      expect(customSystem.consistencyChecker).toBeInstanceOf(SelfConsistencyChecker);
      expect(customSystem.sourceTracer).toBeInstanceOf(SourceTracer);
      expect(customSystem.hallucinationDetector).toBeInstanceOf(HallucinationDetector);
    });

    it('should inject component references into hallucination detector', () => {
      expect(system.hallucinationDetector.getWFGYVerifier()).toBe(system.wfgyVerifier);
      expect(system.hallucinationDetector.getConsistencyChecker()).toBe(system.consistencyChecker);
      expect(system.hallucinationDetector.getSourceTracer()).toBe(system.sourceTracer);
    });
  });

  describe('isReady', () => {
    it('should return true when all components are ready', () => {
      expect(system.isReady()).toBe(true);
    });
  });

  describe('verify', () => {
    it('should return comprehensive verification result combining all components', async () => {
      // Add some knowledge to make verification meaningful
      system.addKnowledgeEntry({
        id: 'test-knowledge',
        content: 'The Earth is round',
        source: {
          id: 'test-knowledge',
          content: 'The Earth is round',
          type: 'document',
          confidence: 0.95
        }
      });
      
      system.addWFGYRule({
        id: 'rule-1',
        name: 'Earth shape rule',
        pattern: /Earth/,
        description: 'Validates Earth shape statements',
        expected: true
      });
      
      const result = await system.verify('The Earth is round');
      
      expect(result.verified).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
      expect(result.consistencyScore).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle null content gracefully', async () => {
      // @ts-ignore
      const result = await system.verify(null);
      
      expect(result.verified).toBe(false);
      expect(result.hallucinationRisk).toBeGreaterThan(0.5);
    });

    it('should work correctly with custom options', async () => {
      const result = await system.verify('Test content', {
        hallucinationThreshold: 0.5
      });
      
      expect(result).toBeDefined();
      expect(result.verified).toBeDefined();
    });
  });

  describe('component access', () => {
    it('should expose all component instances publicly', () => {
      expect(system.wfgyVerifier).toBeDefined();
      expect(system.consistencyChecker).toBeDefined();
      expect(system.sourceTracer).toBeDefined();
      expect(system.hallucinationDetector).toBeDefined();
    });
  });

  describe('convenience methods', () => {
    it('should delegate addWFGYRule to wfgyVerifier', () => {
      system.addWFGYRule({
        id: 'test-rule',
        name: 'Test Rule',
        pattern: /test/,
        description: 'Test description',
        expected: true
      });
      
      expect(system.getWFGYRles().length).toBeGreaterThan(0);
    });

    it('should delegate removeWFGYRule to wfgyVerifier', () => {
      system.addWFGYRule({
        id: 'to-remove',
        name: 'To Remove',
        pattern: /remove/,
        description: 'To be removed',
        expected: true
      });
      
      const removed = system.removeWFGYRule('to-remove');
      expect(removed).toBe(true);
    });

    it('should delegate knowledge entry operations to sourceTracer', () => {
      expect(system.getKnowledgeIndexSize()).toBe(0);
      
      system.addKnowledgeEntry({
        id: 'test-entry',
        content: 'Test entry',
        source: {
          id: 'test-entry',
          content: 'Test entry',
          type: 'document',
          confidence: 0.8
        }
      });
      
      expect(system.getKnowledgeIndexSize()).toBe(1);
      
      const removed = system.removeKnowledgeEntry('test-entry');
      expect(removed).toBe(true);
      expect(system.getKnowledgeIndexSize()).toBe(0);
    });

    it('should delegate bulk addKnowledgeEntries to sourceTracer', () => {
      system.addKnowledgeEntries([
        {
          id: 'entry-1',
          content: 'Entry 1',
          source: {
            id: 'entry-1',
            content: 'Entry 1',
            type: 'document',
            confidence: 0.8
          }
        },
        {
          id: 'entry-2',
          content: 'Entry 2',
          source: {
            id: 'entry-2',
            content: 'Entry 2',
            type: 'document',
            confidence: 0.8
          }
        }
      ]);
      
      expect(system.getKnowledgeIndexSize()).toBe(2);
    });

    it('should delegate clearKnowledgeIndex to sourceTracer', () => {
      system.addKnowledgeEntry({
        id: 'test',
        content: 'test',
        source: {
          id: 'test',
          content: 'test',
          type: 'document',
          confidence: 0.5
        }
      });
      
      expect(system.getKnowledgeIndexSize()).toBeGreaterThan(0);
      system.clearKnowledgeIndex();
      expect(system.getKnowledgeIndexSize()).toBe(0);
    });

    it('should delegate setHallucinationThreshold', () => {
      // Just verify it doesn't throw
      expect(() => system.setHallucinationThreshold(0.7)).not.toThrow();
    });

    it('should delegate setConsistencyThreshold', () => {
      // Just verify it doesn't throw
      expect(() => system.setConsistencyThreshold(0.7)).not.toThrow();
    });
  });

  describe('delegated methods', () => {
    it('should delegate verifySymbols to wfgyVerifier', () => {
      system.addWFGYRule({
        id: 'test-rule',
        name: 'Test Rule',
        pattern: /test/,
        description: 'Test',
        expected: true
      });
      
      const result = system.verifySymbols('test content');
      expect(result).toBeDefined();
      expect(result.symbolConsistency).toBeDefined();
      expect(result.valid).toBeDefined();
    });

    it('should delegate checkConsistency to consistencyChecker', () => {
      const result = system.checkConsistency(['sample 1', 'sample 1', 'sample 1']);
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should delegate trace to sourceTracer', () => {
      const result = system.trace('test content');
      expect(result).toBeDefined();
      expect(result.sources).toBeDefined();
    });

    it('should delegate detectHallucination to hallucinationDetector', async () => {
      const result = await system.detectHallucination('test content');
      expect(result).toBeDefined();
      expect(result.riskScore).toBeDefined();
    });
  });

  describe('full integration test', () => {
    it('should perform complete end-to-end verification with multiple components', async () => {
      // Setup knowledge base
      const knowledgeEntries = [
        {
          id: 'law-001',
          content: '中华人民共和国宪法规定，国家尊重和保障人权',
          keywords: ['宪法', '人权', '保障'],
          source: {
            id: 'law-001',
            content: '中华人民共和国宪法规定，国家尊重和保障人权',
            type: 'law' as const,
            confidence: 1.0
          }
        },
        {
          id: 'law-002',
          content: '公民的人身自由不受侵犯',
          keywords: ['公民', '人身自由', '不受侵犯'],
          source: {
            id: 'law-002',
            content: '公民的人身自由不受侵犯',
            type: 'law' as const,
            confidence: 1.0
          }
        }
      ];
      
      knowledgeEntries.forEach(entry => system.addKnowledgeEntry(entry));
      
      // Add WFGY rules
      system.addWFGYRule({
        id: 'constitutional-rules',
        name: '宪法基本原则',
        pattern: /宪法|人权|公民|自由/,
        description: '匹配宪法相关内容',
        expected: true
      });
      
      // Verify realistic content
      const content = '根据中华人民共和国宪法，国家尊重和保障人权，公民的人身自由不受侵犯。';
      const result = await system.verify(content);
      
      expect(result.verified).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await system.verify('');
      
      expect(result.verified).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
    });

    it('should work with some components disabled', () => {
      const disabledConfig: DeterminismSystemConfig = {
        hallucination: {
          enableWFGY: false,
          enableConsistency: false,
          enableSourceTrace: false
        }
      };
      
      const disabledSystem = new DeterminismSystem(disabledConfig);
      expect(disabledSystem.isReady()).toBe(true);
    });
  });
});
