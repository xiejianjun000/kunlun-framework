/**
 * WFGYVerifier 补充测试 — 覆盖之前未覆盖的分支
 * 目标: 将 WFGY 模块覆盖率从 94.77% 提升到 98%+
 */
import { WFGYVerifier } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/WFGYVerifier';
import type { WFGYVerificationResult } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/interfaces/IDeterminismSystem';

describe('WFGYVerifier — Coverage Supplement', () => {
  describe('normalizeWeights — zero total weight', () => {
    it('should normalize weights to equal values when all weights are zero', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true, weight: 0 },
          { id: 'r2', name: 'R2', description: 'R2', pattern: /b/, expected: true, weight: 0 },
          { id: 'r3', name: 'R3', description: 'R3', pattern: /c/, expected: true, weight: 0 }
        ]
      });

      const rules = verifier.getRules();
      expect(rules).toHaveLength(3);
      // Each weight should be 1/3 since total was 0
      expect(rules[0].weight).toBeCloseTo(1 / 3, 5);
      expect(rules[1].weight).toBeCloseTo(1 / 3, 5);
      expect(rules[2].weight).toBeCloseTo(1 / 3, 5);
    });
  });

  describe('normalizeWeights — non-normalized weights', () => {
    it('should normalize weights when sum != 1.0', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true, weight: 2.0 },
          { id: 'r2', name: 'R2', description: 'R2', pattern: /b/, expected: true, weight: 3.0 }
        ]
      });

      const rules = verifier.getRules();
      // After normalization: 2/5 and 3/5
      expect(rules[0].weight).toBeCloseTo(0.4, 5);
      expect(rules[1].weight).toBeCloseTo(0.6, 5);
    });
  });

  describe('verifySymbols — weight zero edge case', () => {
    it('should return consistency 1.0 when totalWeight is 0 (no rules match weight path)', () => {
      const verifier = new WFGYVerifier({ rules: [] });
      const result = verifier.verifySymbols('any content');

      expect(result.valid).toBe(true);
      expect(result.symbolConsistency).toBe(1.0);
      expect(result.matchedRules).toBe(0);
      expect(result.violatedRules).toBe(0);
    });
  });

  describe('verifySymbols — undefined content', () => {
    it('should return invalid result for undefined content', () => {
      // @ts-ignore
      const verifier = new WFGYVerifier({
        rules: [{ id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true }]
      });
      const result: WFGYVerificationResult = verifier.verifySymbols(undefined);

      expect(result.valid).toBe(false);
      expect(result.symbolConsistency).toBe(0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].rule).toBe('null-content');
    });
  });

  describe('verifySymbols — minimumScore threshold', () => {
    it('should mark valid as false when consistency < minimumScore but no violations', () => {
      const verifier = new WFGYVerifier({
        minimumScore: 0.9,
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /match/, expected: true, weight: 0.5 },
          { id: 'r2', name: 'R2', description: 'R2', pattern: /no-match/, expected: true, weight: 0.5 }
        ]
      });

      const result = verifier.verifySymbols('match this');
      // r1 passes (0.5 weight), r2 fails (0.5 weight) → consistency = 0.5 < 0.9
      expect(result.symbolConsistency).toBeCloseTo(0.5, 5);
      expect(result.valid).toBe(false);
      expect(result.violatedRules).toBe(1);
    });
  });

  describe('buildVerificationMessage — failure case', () => {
    it('should return failure message when verification fails', async () => {
      const verifier = new WFGYVerifier({
        rules: [
          {
            id: 'fail-rule',
            name: 'Fail Rule',
            description: 'Always fails',
            pattern: /never-match-xyz/,
            expected: true,
            violationMessage: 'Custom violation message'
          }
        ]
      });

      const result = await verifier.verify('hello world');
      expect(result.message).toBeDefined();
      expect(result.message).toContain('WFGY验证失败');
    });
  });

  describe('extractSymbols — lazy regex compilation', () => {
    it('should correctly extract symbols with special regex characters', async () => {
      const verifier = new WFGYVerifier({
        knowledgeBase: [
          {
            symbol: 'C++',
            meaning: 'C plus plus',
            allowedContexts: ['programming'],
            source: { id: 'src1', content: 'C++', type: 'document', confidence: 0.9 }
          }
        ]
      });

      // Verify that the + sign in "C++" is escaped properly
      const result = await verifier.verify('I love C++ programming');
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('should deduplicate symbols when same symbol appears multiple times', async () => {
      const verifier = new WFGYVerifier({
        knowledgeBase: [
          {
            symbol: 'PYTHON',
            meaning: 'Python language',
            allowedContexts: ['programming'],
            source: { id: 'python-src', content: 'Python', type: 'document', confidence: 0.95 }
          }
        ]
      });

      const result = await verifier.verify('PYTHON is great. PYTHON is popular. PYTHON is versatile.');
      // Symbol appears 3 times but should be extracted only once (deduplicated)
      expect(result.sources).toHaveLength(1);
    });

    it('should return empty array when knowledge base is empty', () => {
      const verifier = new WFGYVerifier();
      // @ts-ignore — accessing private method for testing
      const symbols = (verifier as any).extractSymbols('some text');
      expect(symbols).toEqual([]);
    });
  });

  describe('addRule — re-normalizes weights', () => {
    it('should re-normalize weights when adding a new rule', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true, weight: 1.0 }
        ]
      });

      const initialRules = verifier.getRules();
      expect(initialRules[0].weight).toBeCloseTo(1.0, 5);

      verifier.addRule({
        id: 'r2',
        name: 'R2',
        description: 'R2',
        pattern: /b/,
        expected: true
      });

      const updatedRules = verifier.getRules();
      expect(updatedRules).toHaveLength(2);
      // After adding, weights should be re-normalized to 0.5 each
      expect(updatedRules[0].weight).toBeCloseTo(0.5, 5);
      expect(updatedRules[1].weight).toBeCloseTo(0.5, 5);
    });
  });

  describe('addRule — with zero weight', () => {
    it('should handle adding a rule with weight 0', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true, weight: 0.5 }
        ]
      });

      verifier.addRule({
        id: 'r2',
        name: 'R2',
        description: 'R2',
        pattern: /b/,
        expected: true,
        weight: 0
      });

      const rules = verifier.getRules();
      expect(rules).toHaveLength(2);
    });
  });

  describe('removeRule — re-normalizes weights', () => {
    it('should re-normalize weights after removing a rule', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true, weight: 0.5 },
          { id: 'r2', name: 'R2', description: 'R2', pattern: /b/, expected: true, weight: 0.5 }
        ]
      });

      verifier.removeRule('r2');
      const rules = verifier.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].weight).toBeCloseTo(1.0, 5);
    });

    it('should return false when rule id does not exist', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true }
        ]
      });

      const result = verifier.removeRule('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('removeKnowledgeEntry — invalidates regex cache', () => {
    it('should return false for non-existent symbol', () => {
      const verifier = new WFGYVerifier();
      const result = verifier.removeKnowledgeEntry('NOT_FOUND');
      expect(result).toBe(false);
    });

    it('should invalidate regex cache when entry is removed', () => {
      const verifier = new WFGYVerifier({
        knowledgeBase: [
          {
            symbol: 'SYM1',
            meaning: 'Symbol 1',
            allowedContexts: ['test'],
            source: { id: 's1', content: 'sym1', type: 'document', confidence: 0.8 }
          }
        ]
      });

      // First verify — this compiles the regex
      verifier.verifySymbols('SYM1 present');

      // Remove entry — should invalidate regex cache
      const removed = verifier.removeKnowledgeEntry('SYM1');
      expect(removed).toBe(true);
      expect(verifier.getKnowledgeBaseSize()).toBe(0);

      // @ts-ignore — check internal regex was reset
      expect((verifier as any).symbolRegex).toBeNull();
    });
  });

  describe('getRules — returns copy', () => {
    it('should return a copy of rules, not the internal array', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'r1', name: 'R1', description: 'R1', pattern: /a/, expected: true }
        ]
      });

      const rules1 = verifier.getRules();
      const rules2 = verifier.getRules();
      expect(rules1).not.toBe(rules2); // Different references
    });
  });

  describe('verify — null/undefined edge cases', () => {
    it('should handle null with message in result', async () => {
      const verifier = new WFGYVerifier({
        rules: [{ id: 'r1', name: 'R1', description: 'R1', pattern: /x/, expected: true }]
      });

      // @ts-ignore
      const result = await verifier.verify(null);
      expect(result.verified).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should handle undefined with message in result', async () => {
      const verifier = new WFGYVerifier({
        rules: [{ id: 'r1', name: 'R1', description: 'R1', pattern: /x/, expected: true }]
      });

      // @ts-ignore
      const result = await verifier.verify(undefined);
      expect(result.verified).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should handle empty string', async () => {
      const verifier = new WFGYVerifier({
        rules: [{ id: 'r1', name: 'R1', description: 'R1', pattern: /.+/, expected: true }]
      });

      const result = await verifier.verify('');
      expect(result.verified).toBe(false);
    });
  });
});
