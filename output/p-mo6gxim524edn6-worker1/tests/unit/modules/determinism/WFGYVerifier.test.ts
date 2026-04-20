import { WFGYVerifier } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/WFGYVerifier';
import type { WFGYVerificationResult } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/interfaces/IDeterminismSystem';
import type { WFGYVerifierConfig, WFGYRule, WFGYKnowledgeEntry } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/WFGYVerifier';

describe('WFGYVerifier', () => {
  let verifier: WFGYVerifier;

  beforeEach(() => {
    // Add a default rule to match non-empty content
    verifier = new WFGYVerifier({
      rules: [
        {
          id: 'min-length',
          name: 'Minimum Length',
          description: 'Content must not be empty',
          pattern: (content) => content.length > 0,
          expected: true,
          violationMessage: 'Content cannot be empty'
        }
      ]
    });
  });

  describe('constructor', () => {
    it('should create a WFGYVerifier instance with default options', () => {
      const emptyVerifier = new WFGYVerifier();
      expect(emptyVerifier).toBeInstanceOf(WFGYVerifier);
      expect(emptyVerifier.name).toBe('WFGYVerifier');
      expect(emptyVerifier.version).toBe('1.0.0');
    });

    it('should initialize with custom rules if provided', () => {
      const customRules: WFGYRule[] = [
        {
          id: 'test-rule-1',
          name: 'Test Rule',
          description: 'Testing custom rule',
          pattern: /^test/,
          expected: true
        }
      ];
      const customConfig: WFGYVerifierConfig = { 
        rules: customRules,
        minimumScore: 0.9
      };
      const customVerifier = new WFGYVerifier(customConfig);
      expect(customVerifier).toBeInstanceOf(WFGYVerifier);
    });

    it('should initialize with knowledge base', () => {
      const knowledgeEntries: WFGYKnowledgeEntry[] = [{
        symbol: 'TEST',
        meaning: 'Test symbol',
        allowedContexts: ['test'],
        source: {
          id: 'test-source',
          content: 'Test source',
          type: 'document',
          confidence: 0.9
        }
      }];
      const customConfig: WFGYVerifierConfig = {
        knowledgeBase: knowledgeEntries
      };
      const customVerifier = new WFGYVerifier(customConfig);
      expect(customVerifier).toBeInstanceOf(WFGYVerifier);
    });
  });

  describe('isReady', () => {
    it('should return true when verifier is ready', () => {
      expect(verifier.isReady()).toBe(true);
    });
  });

  describe('verify', () => {
    it('should return verified true for valid content', async () => {
      const content = 'This is a valid content that follows all WFGY rules';
      const result = await verifier.verify(content);
      
      expect(result.verified).toBe(true);
      expect(result.confidence).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.hallucinationRisk).toBeLessThan(1);
    });

    it('should return verified false for null content', async () => {
      // @ts-ignore - Testing invalid input
      const result = await verifier.verify(null);
      
      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.hallucinationRisk).toBe(1);
    });

    it('should return verified false for undefined content', async () => {
      // @ts-ignore - Testing invalid input
      const result = await verifier.verify(undefined);
      
      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.hallucinationRisk).toBe(1);
    });

    it('should include sources from knowledge base when symbols match', async () => {
      const knowledge: WFGYKnowledgeEntry[] = [{
        symbol: 'VALID',
        meaning: 'Valid symbol',
        allowedContexts: ['test'],
        source: {
          id: 'source-1',
          content: 'VALID means valid',
          type: 'document',
          confidence: 0.95
        }
      }];
      const kbVerifier = new WFGYVerifier({ knowledgeBase: knowledge });
      
      const result = await kbVerifier.verify('This is VALID content');
      
      expect(result.sources.length).toBe(1);
      expect(result.sources[0].id).toBe('source-1');
    });

    it('should include message with verification result', async () => {
      const result = await verifier.verify('Valid content');
      expect(result.message).toBeDefined();
      expect(result.message).toContain('WFGY验证通过');
    });
  });

  describe('verifySymbols', () => {
    it('should return valid true for content that passes all symbol rules', () => {
      const content = 'This is a valid content that follows all WFGY rules';
      const result: WFGYVerificationResult = verifier.verifySymbols(content);
      
      expect(result.valid).toBe(true);
      expect(result.symbolConsistency).toBeGreaterThanOrEqual(0);
      expect(result.symbolConsistency).toBeLessThanOrEqual(1);
      expect(result.matchedRules).toBeGreaterThanOrEqual(0);
      expect(result.violatedRules).toBe(0);
    });

    it('should return valid false for empty content', () => {
      const content = '';
      const result: WFGYVerificationResult = verifier.verifySymbols(content);
      
      expect(result.valid).toBe(false);
      expect(result.violatedRules).toBeGreaterThan(0);
    });

    it('should handle null content gracefully', () => {
      // @ts-ignore - Testing invalid input
      const result: WFGYVerificationResult = verifier.verifySymbols(null);
      
      expect(result.valid).toBe(false);
      expect(result.symbolConsistency).toBe(0);
      expect(result.details).toBeDefined();
    });

    it('should provide details about violated rules', () => {
      const invalidContent = '';
      const result: WFGYVerificationResult = verifier.verifySymbols(invalidContent);
      
      expect(result.valid).toBe(false);
      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
      if (result.details) {
        expect(result.details.some(d => !d.passed)).toBe(true);
      }
    });

    it('should return valid when there are no rules', () => {
      const noRuleVerifier = new WFGYVerifier({ rules: [] });
      const result = noRuleVerifier.verifySymbols('any content');
      
      expect(result.valid).toBe(true);
      expect(result.symbolConsistency).toBe(1);
      expect(result.matchedRules).toBe(0);
      expect(result.violatedRules).toBe(0);
    });

    it('should calculate correct symbol consistency score with weighted rules', () => {
      const weightedVerifier = new WFGYVerifier({
        rules: [
          {
            id: 'rule1',
            name: 'Rule 1',
            description: 'First rule',
            pattern: /test/,
            expected: true,
            weight: 0.5
          },
          {
            id: 'rule2', 
            name: 'Rule 2',
            description: 'Second rule',
            pattern: /fail/,
            expected: false,
            weight: 0.5
          }
        ]
      });
      
      const result = weightedVerifier.verifySymbols('test content here');
      
      expect(result.symbolConsistency).toBe(1); // Both rules passed
      expect(result.valid).toBe(true);
    });
  });

  describe('addRule', () => {
    it('should add a new rule to the verifier', () => {
      const initialRuleCount = verifier.getRules().length;
      
      verifier.addRule({
        id: 'custom-rule',
        name: 'Custom Rule',
        description: 'Custom rule description',
        pattern: /custom/,
        expected: true
      });
      
      expect(verifier.getRules().length).toBe(initialRuleCount + 1);
    });
  });

  describe('removeRule', () => {
    it('should remove an existing rule by id', () => {
      verifier.addRule({
        id: 'to-remove',
        name: 'To Remove',
        description: 'Rule to remove',
        pattern: /test/,
        expected: true
      });
      const initialRuleCount = verifier.getRules().length;
      
      const removed = verifier.removeRule('to-remove');
      
      expect(removed).toBe(true);
      expect(verifier.getRules().length).toBe(initialRuleCount - 1);
    });

    it('should return false when trying to remove non-existent rule', () => {
      const initialRuleCount = verifier.getRules().length;
      const removed = verifier.removeRule('non-existent-rule');
      
      expect(removed).toBe(false);
      expect(verifier.getRules().length).toBe(initialRuleCount);
    });
  });

  describe('addKnowledgeEntry', () => {
    it('should add a new knowledge base entry', () => {
      const initialSize = verifier.getKnowledgeBaseSize();
      
      verifier.addKnowledgeEntry({
        symbol: 'NEW_SYMBOL',
        meaning: 'New symbol meaning',
        allowedContexts: ['context'],
        source: {
          id: 'source-id',
          content: 'Source content',
          type: 'document',
          confidence: 0.9
        }
      });
      
      expect(verifier.getKnowledgeBaseSize()).toBe(initialSize + 1);
    });
  });

  describe('removeKnowledgeEntry', () => {
    it('should remove an existing knowledge entry', () => {
      verifier.addKnowledgeEntry({
        symbol: 'TO_REMOVE',
        meaning: 'To remove',
        allowedContexts: ['test'],
        source: {
          id: 'test',
          content: 'test',
          type: 'document',
          confidence: 0.5
        }
      });
      
      const initialSize = verifier.getKnowledgeBaseSize();
      const removed = verifier.removeKnowledgeEntry('TO_REMOVE');
      
      expect(removed).toBe(true);
      expect(verifier.getKnowledgeBaseSize()).toBe(initialSize - 1);
    });

    it('should return false for non-existent entry', () => {
      const initialSize = verifier.getKnowledgeBaseSize();
      const removed = verifier.removeKnowledgeEntry('NOT_THERE');
      
      expect(removed).toBe(false);
      expect(verifier.getKnowledgeBaseSize()).toBe(initialSize);
    });
  });

  describe('getRules', () => {
    it('should return all current rules', () => {
      const rules = verifier.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('getKnowledgeBaseSize', () => {
    it('should return zero for empty knowledge base', () => {
      expect(verifier.getKnowledgeBaseSize()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(10000);
      const result = await verifier.verify(longContent);
      
      expect(result).toBeDefined();
      expect(result.verified).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle content with special characters', async () => {
      const specialContent = '!@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`';
      const result = await verifier.verify(specialContent);
      
      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
    });

    it('should handle content with markdown formatting', async () => {
      const markdownContent = `
# Heading

## Subheading

- List item 1
- List item 2

**Bold text** *Italic text*
`;
      const result = await verifier.verify(markdownContent);
      
      expect(result).toBeDefined();
      expect(result.verified).toBe(true);
    });

    it('should handle function patterns in rules', async () => {
      const functionVerifier = new WFGYVerifier({
        rules: [
          {
            id: 'even-length',
            name: 'Even Length',
            description: 'Content must have even length',
            pattern: (content: string) => content.length % 2 === 0,
            expected: true
          }
        ]
      });
      
      const evenResult = await functionVerifier.verify('abcd');
      expect(evenResult.verified).toBe(true);
      
      const oddResult = await functionVerifier.verify('abc');
      expect(oddResult.verified).toBe(false);
    });
  });
});
