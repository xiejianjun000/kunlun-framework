import { WFGYVerifier } from '../../../../src/modules/determinism';
import type { WFGYRule, WFGYKnowledgeEntry } from '../../../../src/modules/determinism';

describe('WFGYVerifier', () => {
  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const verifier = new WFGYVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.name).toBe('WFGYVerifier');
      expect(verifier.version).toBe('1.0.0');
      expect(verifier.isReady()).toBe(true);
    });

    it('should accept custom rules and knowledge base', () => {
      const rules: WFGYRule[] = [{
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test rule description',
        pattern: /hello/,
        expected: true
      }];

      const knowledge: WFGYKnowledgeEntry[] = [{
        symbol: 'test',
        meaning: 'Test symbol',
        allowedContexts: ['test'],
        source: {
          id: 'test-source',
          type: 'document',
          confidence: 0.9
        }
      }];

      const verifier = new WFGYVerifier({
        rules,
        knowledgeBase: knowledge,
        minimumScore: 0.8
      });

      expect(verifier.getRules()).toHaveLength(1);
      expect(verifier.getKnowledgeBaseSize()).toBe(1);
    });
  });

  describe('addRule', () => {
    it('should add a new rule', () => {
      const verifier = new WFGYVerifier();
      const rule: WFGYRule = {
        id: 'test-rule',
        name: 'Test',
        description: 'Test',
        pattern: /test/,
        expected: true
      };

      verifier.addRule(rule);
      expect(verifier.getRules()).toHaveLength(1);
      expect(verifier.getRules()[0].id).toBe('test-rule');
    });
  });

  describe('removeRule', () => {
    it('should remove an existing rule', () => {
      const verifier = new WFGYVerifier();
      const rule: WFGYRule = {
        id: 'test-rule',
        name: 'Test',
        description: 'Test',
        pattern: /test/,
        expected: true
      };

      verifier.addRule(rule);
      expect(verifier.getRules()).toHaveLength(1);

      const result = verifier.removeRule('test-rule');
      expect(result).toBe(true);
      expect(verifier.getRules()).toHaveLength(0);
    });

    it('should return false for non-existent rule', () => {
      const verifier = new WFGYVerifier();
      const result = verifier.removeRule('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('verifySymbols', () => {
    it('should return valid when no rules', () => {
      const verifier = new WFGYVerifier();
      const result = verifier.verifySymbols('any content');
      expect(result.valid).toBe(true);
      expect(result.symbolConsistency).toBe(1);
      expect(result.matchedRules).toBe(0);
      expect(result.violatedRules).toBe(0);
    });

    it('should pass when rule matches expected', () => {
      const verifier = new WFGYVerifier({
        rules: [{
          id: 'contains-hello',
          name: 'Contains Hello',
          description: 'Content should contain hello',
          pattern: /hello/i,
          expected: true
        }]
      });

      const result = verifier.verifySymbols('say hello to world');
      expect(result.valid).toBe(true);
      expect(result.symbolConsistency).toBe(1);
      expect(result.matchedRules).toBe(1);
      expect(result.violatedRules).toBe(0);
    });

    it('should fail when rule does not match expected', () => {
      const verifier = new WFGYVerifier({
        rules: [{
          id: 'contains-hello',
          name: 'Contains Hello',
          description: 'Content should contain hello',
          pattern: /hello/i,
          expected: true
        }]
      });

      const result = verifier.verifySymbols('say hi to world');
      expect(result.valid).toBe(false);
      expect(result.symbolConsistency).toBe(0);
      expect(result.matchedRules).toBe(0);
      expect(result.violatedRules).toBe(1);
    });

    it('should handle function patterns', () => {
      const verifier = new WFGYVerifier({
        rules: [{
          id: 'length-check',
          name: 'Length Check',
          description: 'Content should be longer than 10 chars',
          pattern: (content) => content.length > 10,
          expected: true
        }]
      });

      expect(verifier.verifySymbols('short').valid).toBe(false);
      expect(verifier.verifySymbols('this is long enough').valid).toBe(true);
    });

    it('should calculate weighted consistency correctly', () => {
      const verifier = new WFGYVerifier({
        minimumScore: 0.5,
        rules: [
          {
            id: 'rule1',
            name: 'Rule 1',
            description: 'Rule 1',
            pattern: /test/,
            expected: true,
            weight: 0.2
          },
          {
            id: 'rule2',
            name: 'Rule 2',
            description: 'Rule 2',
            pattern: /content/,
            expected: true,
            weight: 0.8
          }
        ]
      });

      // "test" matches (0.2), "content" doesn't (0.8) → total score 0.2 < 0.5 → invalid
      const result = verifier.verifySymbols('this is a test');
      expect(result.symbolConsistency).toBe(0.2);
      expect(result.valid).toBe(false);
    });
  });

  describe('verify', () => {
    it('should return correct DeterminismResult', async () => {
      const knowledgeEntry: WFGYKnowledgeEntry = {
        symbol: 'article1',
        meaning: 'First Article',
        allowedContexts: ['article'],
        source: {
          id: 'article-1',
          type: 'document',
          confidence: 0.95
        }
      };

      const verifier = new WFGYVerifier({
        rules: [{
          id: 'check-article',
          name: 'Check Article',
          description: 'Should mention article1',
          pattern: /article1/,
          expected: true
        }],
        knowledgeBase: [knowledgeEntry]
      });

      const result = await verifier.verify('article1 says hello');
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe(1);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].id).toBe('article-1');
      expect(result.hallucinationRisk).toBe(0);
    });
  });

  describe('knowledge base operations', () => {
    it('should add and remove knowledge entries', () => {
      const verifier = new WFGYVerifier();
      const entry: WFGYKnowledgeEntry = {
        symbol: 'test',
        meaning: 'Test',
        allowedContexts: ['test'],
        source: {
          id: 'test-id',
          type: 'document',
          confidence: 0.9
        }
      };

      verifier.addKnowledgeEntry(entry);
      expect(verifier.getKnowledgeBaseSize()).toBe(1);

      const removed = verifier.removeKnowledgeEntry('test');
      expect(removed).toBe(true);
      expect(verifier.getKnowledgeBaseSize()).toBe(0);
    });
  });

  describe('weight normalization', () => {
    it('should normalize weights to sum to 1 during initialization', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'rule1', name: 'Rule 1', description: 'Rule 1', pattern: /test/, expected: true, weight: 2 },
          { id: 'rule2', name: 'Rule 2', description: 'Rule 2', pattern: /content/, expected: true, weight: 2 }
        ]
      });

      const rules = verifier.getRules();
      const totalWeight = rules.reduce((sum, r) => sum + (r.weight ?? 0), 0);
      expect(totalWeight).toBeCloseTo(1.0);
      expect(rules[0].weight).toBeCloseTo(0.5);
      expect(rules[1].weight).toBeCloseTo(0.5);
    });

    it('should normalize weights after adding a new rule', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'rule1', name: 'Rule 1', description: 'Rule 1', pattern: /test/, expected: true, weight: 1 }
        ]
      });

      expect(verifier.getRules()[0].weight).toBeCloseTo(1.0);

      verifier.addRule({
        id: 'rule2', name: 'Rule 2', description: 'Rule 2', pattern: /content/, expected: true, weight: 1
      });

      const rules = verifier.getRules();
      const totalWeight = rules.reduce((sum, r) => sum + (r.weight ?? 0), 0);
      expect(totalWeight).toBeCloseTo(1.0);
      expect(rules[0].weight).toBeCloseTo(0.5);
      expect(rules[1].weight).toBeCloseTo(0.5);
    });

    it('should renormalize after removing a rule', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'rule1', name: 'Rule 1', description: 'Rule 1', pattern: /test/, expected: true, weight: 1 },
          { id: 'rule2', name: 'Rule 2', description: 'Rule 2', pattern: /content/, expected: true, weight: 1 },
          { id: 'rule3', name: 'Rule 3', description: 'Rule 3', pattern: /hello/, expected: true, weight: 2 }
        ]
      });

      // Initial weights should be normalized: 0.25, 0.25, 0.5
      let rules = verifier.getRules();
      expect(rules[0].weight).toBeCloseTo(0.25);
      expect(rules[1].weight).toBeCloseTo(0.25);
      expect(rules[2].weight).toBeCloseTo(0.5);

      // Remove rule3 (weight 2)
      verifier.removeRule('rule3');

      // Remaining rules should be renormalized to 0.5 each
      rules = verifier.getRules();
      const totalWeight = rules.reduce((sum, r) => sum + (r.weight ?? 0), 0);
      expect(totalWeight).toBeCloseTo(1.0);
      expect(rules[0].weight).toBeCloseTo(0.5);
      expect(rules[1].weight).toBeCloseTo(0.5);
    });

    it('should handle zero weights by setting equal weights', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'rule1', name: 'Rule 1', description: 'Rule 1', pattern: /test/, expected: true, weight: 0 },
          { id: 'rule2', name: 'Rule 2', description: 'Rule 2', pattern: /content/, expected: true, weight: 0 }
        ]
      });

      const rules = verifier.getRules();
      const totalWeight = rules.reduce((sum, r) => sum + (r.weight ?? 0), 0);
      expect(totalWeight).toBeCloseTo(1.0);
      expect(rules[0].weight).toBeCloseTo(0.5);
      expect(rules[1].weight).toBeCloseTo(0.5);
    });

    it('should not change already normalized weights', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'rule1', name: 'Rule 1', description: 'Rule 1', pattern: /test/, expected: true, weight: 0.3 },
          { id: 'rule2', name: 'Rule 2', description: 'Rule 2', pattern: /content/, expected: true, weight: 0.7 }
        ]
      });

      const rules = verifier.getRules();
      expect(rules[0].weight).toBeCloseTo(0.3);
      expect(rules[1].weight).toBeCloseTo(0.7);
    });

    it('should preserve relative weight proportions after normalization', () => {
      const verifier = new WFGYVerifier({
        rules: [
          { id: 'rule1', name: 'Rule 1', description: 'Rule 1', pattern: /a/, expected: true, weight: 10 },
          { id: 'rule2', name: 'Rule 2', description: 'Rule 2', pattern: /b/, expected: true, weight: 20 },
          { id: 'rule3', name: 'Rule 3', description: 'Rule 3', pattern: /c/, expected: true, weight: 30 }
        ]
      });

      const rules = verifier.getRules();
      // Original ratio 1:2:3 should be preserved as 1/6, 2/6, 3/6
      expect(rules[0].weight).toBeCloseTo(1/6);
      expect(rules[1].weight).toBeCloseTo(2/6);
      expect(rules[2].weight).toBeCloseTo(3/6);
    });
  });
});
