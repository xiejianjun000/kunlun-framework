/**
 * 记忆系统测试
 * Memory System Tests
 */

import {
  MemorySystem,
  MemoryTier,
  MemoryProcessor,
  MemoryIndexer,
  MemoryRetriever,
  ImportanceScorer,
  MemoryStore,
} from '../src/modules/memory-system';

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
}));

describe('MemoryProcessor', () => {
  let processor: MemoryProcessor;

  beforeEach(() => {
    processor = new MemoryProcessor();
  });

  describe('cleanContent', () => {
    it('应该清理空白字符', () => {
      const input = '这是    一个   测试';
      const result = processor.cleanContent(input);
      expect(result).toBe('这是 一个 测试');
    });

    it('应该移除特殊字符', () => {
      const input = '测试\x00\x01内容';
      const result = processor.cleanContent(input);
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x01');
    });

    it('应该规范化引号', () => {
      const input = '他说"你好"';
      const result = processor.cleanContent(input);
      expect(result).toBe('他说"你好"');
    });
  });

  describe('extractKeywords', () => {
    it('应该提取关键词', () => {
      const content = '这是一个关于Node.js安装和配置的教程';
      const keywords = processor.extractKeywords(content);
      expect(keywords).toContain('node.js');
      expect(keywords).toContain('安装');
      expect(keywords).toContain('配置');
      expect(keywords).toContain('教程');
    });

    it('应该过滤停用词', () => {
      const content = '这是一个测试的内容';
      const keywords = processor.extractKeywords(content);
      expect(keywords).not.toContain('的');
      expect(keywords).not.toContain('了');
      expect(keywords).not.toContain('一个');
    });
  });

  describe('chunkContent', () => {
    it('应该正确分块短内容', () => {
      const content = '短内容';
      processor.updateConfig({ maxChunkSize: 10 });
      const chunks = processor.chunkContent(content);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe('短内容');
    });

    it('应该正确分块长内容', () => {
      const content = '这是第一句话。这是第二句话。这是第三句话。';
      processor.updateConfig({ maxChunkSize: 15, chunkOverlap: 0 });
      const chunks = processor.chunkContent(content);
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});

describe('MemoryIndexer', () => {
  let indexer: MemoryIndexer;

  beforeEach(() => {
    indexer = new MemoryIndexer();
  });

  describe('index', () => {
    it('应该正确索引记忆', async () => {
      const memory = {
        id: 'test-1',
        userId: 'user1',
        tenantId: 'tenant1',
        content: '学习TypeScript编程',
        type: 'learning',
        tier: MemoryTier.WARM,
        metadata: {},
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1,
        importanceScore: 0.5,
        isArchived: false,
        tags: [],
        linkedMemoryIds: [],
      };

      await indexer.index(memory);
      const stats = indexer.getStats();
      expect(stats.totalMemories).toBe(1);
    });
  });

  describe('searchByKeyword', () => {
    it('应该通过关键词搜索', async () => {
      const memory = {
        id: 'test-1',
        userId: 'user1',
        tenantId: 'tenant1',
        content: 'Node.js安装教程',
        type: 'tutorial',
        tier: MemoryTier.WARM,
        metadata: {},
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1,
        importanceScore: 0.6,
        isArchived: false,
        tags: [],
        linkedMemoryIds: [],
      };

      await indexer.index(memory);
      const results = indexer.searchByKeyword('node.js');
      expect(results).toContain('test-1');
    });
  });

  describe('findRelated', () => {
    it('应该找到相关记忆', async () => {
      const memory1 = {
        id: 'test-1',
        userId: 'user1',
        tenantId: 'tenant1',
        content: '学习TypeScript',
        type: 'learning',
        tier: MemoryTier.WARM,
        metadata: {},
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1,
        importanceScore: 0.5,
        isArchived: false,
        tags: ['编程'],
        linkedMemoryIds: [],
      };

      const memory2 = {
        id: 'test-2',
        userId: 'user1',
        tenantId: 'tenant1',
        content: 'TypeScript类型系统',
        type: 'learning',
        tier: MemoryTier.WARM,
        metadata: {},
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1,
        importanceScore: 0.5,
        isArchived: false,
        tags: ['编程'],
        linkedMemoryIds: [],
      };

      await indexer.index(memory1);
      await indexer.index(memory2);

      const related = await indexer.findRelated('test-1');
      expect(related).toContain('test-2');
    });
  });

  describe('clear', () => {
    it('应该清除所有索引', async () => {
      const memory = {
        id: 'test-1',
        userId: 'user1',
        tenantId: 'tenant1',
        content: '测试内容',
        type: 'test',
        tier: MemoryTier.WARM,
        metadata: {},
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1,
        importanceScore: 0.5,
        isArchived: false,
        tags: [],
        linkedMemoryIds: [],
      };

      await indexer.index(memory);
      indexer.clear();
      
      const stats = indexer.getStats();
      expect(stats.totalMemories).toBe(0);
    });
  });
});

describe('ImportanceScorer', () => {
  let scorer: ImportanceScorer;

  beforeEach(() => {
    scorer = new ImportanceScorer();
  });

  describe('score', () => {
    it('应该评分高访问频率的记忆', async () => {
      const memory = {
        id: 'test-1',
        userId: 'user1',
        tenantId: 'tenant1',
        content: '经常访问的内容',
        type: 'important',
        tier: MemoryTier.HOT,
        metadata: { sentiment: 'positive', sentimentIntensity: 0.8 },
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 50,
        importanceScore: 0.5,
        isArchived: false,
        tags: ['重要'],
        linkedMemoryIds: [],
      };

      const score = await scorer.score(memory);
      expect(score).toBeGreaterThan(0.5);
    });

    it('应该评分低访问频率的记忆', async () => {
      const memory = {
        id: 'test-1',
        userId: 'user1',
        tenantId: 'tenant1',
        content: '很少访问的内容',
        type: 'general',
        tier: MemoryTier.COLD,
        metadata: {},
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        accessedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        accessCount: 1,
        importanceScore: 0.3,
        isArchived: false,
        tags: [],
        linkedMemoryIds: [],
      };

      const score = await scorer.score(memory);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('getLevel', () => {
    it('应该正确返回重要性级别', () => {
      expect(scorer.getLevel(0.95)).toBe(1.0); // CRITICAL
      expect(scorer.getLevel(0.7)).toBe(0.8);  // HIGH
      expect(scorer.getLevel(0.5)).toBe(0.5);  // MEDIUM
      expect(scorer.getLevel(0.2)).toBe(0.2);  // LOW
      expect(scorer.getLevel(0.1)).toBe(0.0);  // TRIVIAL
    });
  });

  describe('strategy', () => {
    it('应该支持策略切换', () => {
      scorer.setStrategy('conservative');
      const strategy = scorer.getCurrentStrategy();
      expect(strategy.id).toBe('conservative');

      scorer.setStrategy('aggressive');
      const aggressiveStrategy = scorer.getCurrentStrategy();
      expect(aggressiveStrategy.id).toBe('aggressive');
    });
  });
});

describe('MemoryRetriever', () => {
  let retriever: MemoryRetriever;

  beforeEach(() => {
    retriever = new MemoryRetriever();
  });

  describe('retrieve', () => {
    it('应该返回关键词匹配结果', async () => {
      const memories = [
        {
          id: 'test-1',
          userId: 'user1',
          tenantId: 'tenant1',
          content: 'Node.js是一个JavaScript运行时',
          type: 'knowledge',
          tier: MemoryTier.WARM,
          metadata: {},
          createdAt: new Date(),
          accessedAt: new Date(),
          accessCount: 5,
          importanceScore: 0.7,
          isArchived: false,
          tags: [],
          linkedMemoryIds: [],
        },
        {
          id: 'test-2',
          userId: 'user1',
          tenantId: 'tenant1',
          content: 'Python是一种编程语言',
          type: 'knowledge',
          tier: MemoryTier.WARM,
          metadata: {},
          createdAt: new Date(),
          accessedAt: new Date(),
          accessCount: 3,
          importanceScore: 0.5,
          isArchived: false,
          tags: [],
          linkedMemoryIds: [],
        },
      ];

      const results = await retriever.retrieve(memories, 'Node.js', {
        mode: 'keyword',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.id).toBe('test-1');
    });

    it('应该支持层级过滤', async () => {
      const memories = [
        {
          id: 'test-1',
          userId: 'user1',
          tenantId: 'tenant1',
          content: '热记忆内容',
          type: 'test',
          tier: MemoryTier.HOT,
          metadata: {},
          createdAt: new Date(),
          accessedAt: new Date(),
          accessCount: 10,
          importanceScore: 0.8,
          isArchived: false,
          tags: [],
          linkedMemoryIds: [],
        },
        {
          id: 'test-2',
          userId: 'user1',
          tenantId: 'tenant1',
          content: '冷记忆内容',
          type: 'test',
          tier: MemoryTier.COLD,
          metadata: {},
          createdAt: new Date(),
          accessedAt: new Date(),
          accessCount: 1,
          importanceScore: 0.3,
          isArchived: false,
          tags: [],
          linkedMemoryIds: [],
        },
      ];

      const results = await retriever.retrieve(memories, '记忆', {
        mode: 'keyword',
        tiers: [MemoryTier.HOT],
        limit: 10,
      });

      expect(results.every(r => r.memory.tier === MemoryTier.HOT)).toBe(true);
    });
  });
});

// 集成测试
describe('MemorySystem Integration', () => {
  // 注意：这些测试需要真实的数据库连接
  // 在CI环境中应该使用mock

  it('should be defined', () => {
    expect(MemorySystem).toBeDefined();
  });

  it('should create instance', () => {
    const system = new MemorySystem({
      storeConfig: {
        dbType: 'sqlite',
        connectionString: ':memory:',
      },
    });
    expect(system).toBeDefined();
  });
});
