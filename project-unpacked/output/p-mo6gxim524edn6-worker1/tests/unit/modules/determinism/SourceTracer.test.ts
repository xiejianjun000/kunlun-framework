import { SourceTracer } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SourceTracer';
import type { SourceReference, SourceTraceResult } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/interfaces/IDeterminismSystem';
import type { SourceTracerConfig, KnowledgeIndexEntry } from '../../../../../../output/p-mo6gxim524edn6-worker3/src/modules/determinism/SourceTracer';

describe('SourceTracer', () => {
  let tracer: SourceTracer;

  beforeEach(() => {
    tracer = new SourceTracer({ minMatchThreshold: 0.1 });
  });

  describe('constructor', () => {
    it('should create a SourceTracer instance', () => {
      expect(tracer).toBeInstanceOf(SourceTracer);
      expect(tracer.name).toBe('SourceTracer');
      expect(tracer.version).toBe('1.0.0');
    });

    it('should accept custom configuration', () => {
      const customConfig: SourceTracerConfig = {
        minMatchThreshold: 0.7,
        maxSources: 20
      };
      const customTracer = new SourceTracer(customConfig);
      expect(customTracer).toBeInstanceOf(SourceTracer);
    });
  });

  describe('isReady', () => {
    it('should return true when tracer is ready', () => {
      expect(tracer.isReady()).toBe(true);
    });
  });

  describe('verify', () => {
    it('should return verification result with trace information', async () => {
      tracer.addEntry({
        id: 'known-source',
        content: 'Known information for testing',
        source: {
          id: 'known-source',
          content: 'Known information for testing',
          type: 'document',
          confidence: 0.9
        }
      });
      
      const result = await tracer.verify('Known information for testing');
      
      expect(result.verified).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.hallucinationRisk).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle null content gracefully', async () => {
      // @ts-ignore
      const result = await tracer.verify(null);
      
      expect(result.verified).toBe(false);
      expect(result.hallucinationRisk).toBe(1);
    });
  });

  describe('addEntry', () => {
    it('should add a single knowledge entry to the index', () => {
      const entry: KnowledgeIndexEntry = {
        id: 'test-source',
        content: 'Test content',
        source: {
          id: 'test-source',
          content: 'Test content',
          type: 'knowledge-base',
          confidence: 0.9
        }
      };
      
      tracer.addEntry(entry);
      expect((tracer as any).index.size).toBe(1);
    });

    it('should build inverted index from keywords', () => {
      const entry: KnowledgeIndexEntry = {
        id: 'test-source',
        content: 'Test content about sky and blue',
        keywords: ['sky', 'blue'],
        source: {
          id: 'test-source',
          content: 'Test content about sky and blue',
          type: 'document',
          confidence: 0.9
        }
      };
      
      tracer.addEntry(entry);
      expect((tracer as any).invertedIndex.has('sky')).toBe(true);
    });
  });

  describe('addEntries', () => {
    it('should add multiple entries in batch', () => {
      const entries: KnowledgeIndexEntry[] = [
        {
          id: 'entry-1',
          content: 'Entry one',
          source: {
            id: 'entry-1',
            content: 'Entry one',
            type: 'document',
            confidence: 0.8
          }
        },
        {
          id: 'entry-2',
          content: 'Entry two',
          source: {
            id: 'entry-2',
            content: 'Entry two',
            type: 'document',
            confidence: 0.8
          }
        }
      ];
      
      tracer.addEntries(entries);
      expect((tracer as any).index.size).toBe(2);
    });
  });

  describe('removeEntry', () => {
    it('should remove an existing entry from the index', () => {
      const entry: KnowledgeIndexEntry = {
        id: 'to-remove',
        content: 'Remove me',
        source: {
          id: 'to-remove',
          content: 'Remove me',
          type: 'document',
          confidence: 0.5
        }
      };
      tracer.addEntry(entry);
      const initialCount = (tracer as any).index.size;
      
      const removed = tracer.removeEntry('to-remove');
      
      expect(removed).toBe(true);
      expect((tracer as any).index.size).toBe(initialCount - 1);
    });

    it('should return false when removing non-existent entry', () => {
      const initialCount = (tracer as any).index.size;
      const removed = tracer.removeEntry('non-existent');
      
      expect(removed).toBe(false);
      expect((tracer as any).index.size).toBe(initialCount);
    });
  });

  describe('trace', () => {
    it('should find matching sources for content', () => {
      // Add test sources with explicit keywords that match
      const entries: KnowledgeIndexEntry[] = [
        {
          id: 'sky-source',
          content: 'The sky is blue on a clear day',
          keywords: ['sky', 'blue', 'clear'],
          matchThreshold: 0.1,
          source: {
            id: 'sky-source',
            content: 'The sky is blue on a clear day',
            type: 'document',
            confidence: 0.95
          }
        },
        {
          id: 'ocean-source',
          content: 'The ocean is deep blue',
          keywords: ['ocean', 'blue', 'deep'],
          matchThreshold: 0.1,
          source: {
            id: 'ocean-source',
            content: 'The ocean is deep blue',
            type: 'document',
            confidence: 0.9
          }
        }
      ];
      entries.forEach(s => tracer.addEntry(s));
      
      const content = 'I believe the sky is blue';
      const result: SourceTraceResult = tracer.trace(content);
      
      expect(Array.isArray(result.sources)).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.coverage).toBeGreaterThan(0);
      expect(result.averageConfidence).toBeGreaterThan(0);
    });

    it('should return empty sources array when no matches found', () => {
      const content = 'This content matches nothing in the knowledge base';
      const result: SourceTraceResult = tracer.trace(content);
      
      expect(result.sources).toHaveLength(0);
      expect(result.coverage).toBe(0);
      expect(result.averageConfidence).toBe(0);
    });

    it('should respect maximum sources limit', () => {
      for (let i = 0; i < 20; i++) {
        tracer.addEntry({
          id: `source-${i}`,
          content: 'Content that matches',
          keywords: ['content', 'matches', 'test'],
          matchThreshold: 0.1,
          source: {
            id: `source-${i}`,
            content: 'Content that matches',
            type: 'document',
            confidence: 0.8
          }
        });
      }
      
      const limitedTracer = new SourceTracer({ maxSources: 5, minMatchThreshold: 0.1 });
      const result = limitedTracer.trace('This content matches');
      
      expect(result.sources.length).toBeLessThanOrEqual(5);
    });

    it('should handle null content gracefully', () => {
      const result = tracer.trace(null);
      expect(result.sources).toHaveLength(0);
      expect(result.coverage).toBe(0);
    });
  });

  describe('getIndexSize', () => {
    it('should return 0 for empty index', () => {
      expect(tracer.getIndexSize()).toBe(0);
    });

    it('should return correct size after adding entries', () => {
      const initialSize = tracer.getIndexSize();
      
      tracer.addEntry({
        id: 'new-entry',
        content: 'New content',
        keywords: ['new', 'content'],
        source: {
          id: 'new-entry',
          content: 'New content',
          type: 'document',
          confidence: 0.8
        }
      });
      
      expect(tracer.getIndexSize()).toBe(initialSize + 1);
    });
  });

  describe('clearIndex', () => {
    it('should clear all entries from the index', () => {
      tracer.addEntry({
        id: 'test',
        content: 'test',
        keywords: ['test'],
        source: {
          id: 'test',
          content: 'test',
          type: 'document',
          confidence: 0.5
        }
      });
      
      expect(tracer.getIndexSize()).toBeGreaterThan(0);
      
      tracer.clearIndex();
      
      expect(tracer.getIndexSize()).toBe(0);
      expect((tracer as any).invertedIndex.size).toBe(0);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from content', () => {
      // @ts-ignore - private method for testing
      const keywords = tracer.extractKeywords('The quick brown fox jumps over the lazy dog');
      
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = tracer.trace('');
      
      expect(result.sources).toHaveLength(0);
      expect(result.coverage).toBe(0);
    });

    it('should handle multiple entries with overlapping keywords', () => {
      for (let i = 0; i < 10; i++) {
        tracer.addEntry({
          id: `entry-${i}`,
          content: 'This entry contains the word test',
          keywords: ['this', 'entry', 'contains', 'word', 'test'],
          matchThreshold: 0.1,
          source: {
            id: `entry-${i}`,
            content: 'This entry contains the word test',
            type: 'document',
            confidence: 0.8
          }
        });
      }
      
      const result = tracer.trace('This is a test');
      
      expect(result.sources.length).toBeGreaterThan(0);
    });
  });
});
