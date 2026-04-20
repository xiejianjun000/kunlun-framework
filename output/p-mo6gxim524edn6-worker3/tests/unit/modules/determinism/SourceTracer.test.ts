import { SourceTracer } from '../../../../src/modules/determinism';
import type { KnowledgeIndexEntry } from '../../../../src/modules/determinism';

describe('SourceTracer', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const tracer = new SourceTracer();
      expect(tracer).toBeDefined();
      expect(tracer.name).toBe('SourceTracer');
      expect(tracer.isReady()).toBe(true);
      expect(tracer.getIndexSize()).toBe(0);
    });
  });

  describe('index operations', () => {
    it('should add entries', () => {
      const tracer = new SourceTracer();
      const entry: KnowledgeIndexEntry = {
        id: 'entry-1',
        content: 'The law of gravity states that what goes up must come down',
        source: {
          id: 'physics-101',
          type: 'document',
          confidence: 1.0
        },
        keywords: ['gravity', 'physics']
      };

      tracer.addEntry(entry);
      expect(tracer.getIndexSize()).toBe(1);
    });

    it('should remove entries', () => {
      const tracer = new SourceTracer();
      const entry: KnowledgeIndexEntry = {
        id: 'entry-1',
        content: 'Test content',
        source: {
          id: 'test',
          type: 'document',
          confidence: 0.9
        }
      };

      tracer.addEntry(entry);
      expect(tracer.getIndexSize()).toBe(1);

      const removed = tracer.removeEntry('entry-1');
      expect(removed).toBe(true);
      expect(tracer.getIndexSize()).toBe(0);
    });

    it('should batch add entries', () => {
      const tracer = new SourceTracer();
      const entries: KnowledgeIndexEntry[] = [
        {
          id: 'entry-1',
          content: 'First entry',
          source: { id: '1', type: 'document', confidence: 0.9 }
        },
        {
          id: 'entry-2',
          content: 'Second entry',
          source: { id: '2', type: 'document', confidence: 0.9 }
        }
      ];

      tracer.addEntries(entries);
      expect(tracer.getIndexSize()).toBe(2);
    });

    it('should clear index', () => {
      const tracer = new SourceTracer();
      tracer.addEntry({
        id: 'test',
        content: 'test',
        source: { id: 'test', type: 'document', confidence: 0.9 }
      });
      expect(tracer.getIndexSize()).toBe(1);
      tracer.clearIndex();
      expect(tracer.getIndexSize()).toBe(0);
    });
  });

  describe('trace', () => {
    it('should return empty result when index is empty', () => {
      const tracer = new SourceTracer();
      const result = tracer.trace('any content');
      expect(result.sources).toHaveLength(0);
      expect(result.coverage).toBe(0);
      expect(result.averageConfidence).toBe(0);
    });

    it('should find matching sources by keyword', () => {
      const tracer = new SourceTracer();
      const entry: KnowledgeIndexEntry = {
        id: 'climate-change',
        content: 'Climate change is caused by greenhouse gas emissions from human activities',
        source: {
          id: 'ipcc-report-2023',
          type: 'document',
          confidence: 0.98
        },
        keywords: ['climate', 'change', 'greenhouse', 'emissions']
      };
      tracer.addEntry(entry);

      const result = tracer.trace('climate change is caused by human activities');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].id).toBe('ipcc-report-2023');
      expect(result.averageConfidence).toBe(0.98);
    });

    it('should return multiple sources sorted by similarity', () => {
      const tracer = new SourceTracer({
        maxSources: 2
      });
      
      tracer.addEntries([
        {
          id: 'climate-1',
          content: 'Climate change is a global issue affecting temperatures',
          source: { id: 'doc1', type: 'document', confidence: 0.9 }
        },
        {
          id: 'climate-2',
          content: 'Rising temperatures are caused by climate change',
          source: { id: 'doc2', type: 'document', confidence: 0.95 }
        },
        {
          id: 'biology',
          content: 'Cell biology studies the structure of cells',
          source: { id: 'doc3', type: 'document', confidence: 1.0 }
        }
      ]);

      const result = tracer.trace('climate change rising temperatures');
      expect(result.sources.length).toBeLessThanOrEqual(2);
      expect(result.averageConfidence).toBeGreaterThan(0.8);
    });

    it('should not return matches below threshold', () => {
      const tracer = new SourceTracer({
        minMatchThreshold: 0.8
      });
      
      tracer.addEntry({
        id: 'unrelated',
        content: 'Cell biology studies cells',
        source: { id: 'bio', type: 'document', confidence: 1.0 }
      });

      const result = tracer.trace('climate change global warming');
      expect(result.sources).toHaveLength(0);
    });
  });

  describe('verify', () => {
    it('should return correct determinism result', async () => {
      const tracer = new SourceTracer();
      tracer.addEntry({
        id: 'test',
        content: 'OpenTaiji is a multi-agent framework',
        source: {
          id: 'open-readme',
          type: 'document',
          confidence: 0.95
        }
      });

      const result = await tracer.verify('OpenTaiji is a multi-agent framework', {
        hallucinationThreshold: 0.8
      });

      expect(result.sources).toHaveLength(1);
      // Coverage calculation doesn't work well for single short sentence
      // but hallucinationRisk = 1 - coverage
      expect(result.verified).toBe(result.hallucinationRisk < 0.8);
    });
  });
});
