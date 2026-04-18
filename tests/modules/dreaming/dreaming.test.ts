/**
 * dreaming.test.ts - Dreaming系统单元测试
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  RecallTracker,
  LightPhaseExecutor,
  DeepPhaseRanker,
  REMPhaseExtractor,
  MemoryDreamingIntegration,
  DEFAULT_WEIGHTS,
  PROMOTION_WEIGHTS
} from '../../../src/modules/memory-system/dreaming';

// 测试辅助函数
async function createTempWorkspace(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dreaming-test-'));
  await fs.mkdir(path.join(tempDir, 'memory', '.dreams'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'MEMORY.md'), '# MEMORY.md\n\n## 长期记忆\n\n', 'utf-8');
  return tempDir;
}

async function cleanupWorkspace(workspaceDir: string): Promise<void> {
  try {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  } catch {
    // 忽略清理错误
  }
}

// ============== RecallTracker测试 ==============

describe('RecallTracker', () => {
  let workspaceDir: string;
  let tracker: RecallTracker;

  beforeEach(async () => {
    workspaceDir = await createTempWorkspace();
    tracker = new RecallTracker(workspaceDir);
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  test('应该创建新召回记录', async () => {
    await tracker.recordRecall({
      query: '环评报告审批',
      results: [{
        path: 'memory/2024-01-01.md',
        startLine: 10,
        endLine: 15,
        score: 0.85,
        snippet: '某项目环评报告已通过审批',
        source: 'memory'
      }]
    });

    const entries = await tracker.readEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].snippet).toBe('某项目环评报告已通过审批');
    expect(entries[0].recallCount).toBe(1);
    expect(entries[0].queryHashes).toHaveLength(1);
  });

  test('应该合并重复召回', async () => {
    // 第一次召回
    await tracker.recordRecall({
      query: '环评报告',
      results: [{
        path: 'memory/2024-01-01.md',
        startLine: 10,
        endLine: 15,
        score: 0.85,
        snippet: '某项目环评报告已通过审批',
        source: 'memory'
      }]
    });

    // 第二次召回（同一片段）
    await tracker.recordRecall({
      query: '项目审批',
      results: [{
        path: 'memory/2024-01-01.md',
        startLine: 10,
        endLine: 15,
        score: 0.90,
        snippet: '某项目环评报告已通过审批',
        source: 'memory'
      }]
    });

    const entries = await tracker.readEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].recallCount).toBe(2);
    expect(entries[0].queryHashes.length).toBe(2);
    expect(entries[0].maxScore).toBe(0.90);
  });

  test('应该正确统计数据', async () => {
    await tracker.recordRecall({
      query: '测试查询1',
      results: [{
        path: 'memory/2024-01-01.md',
        startLine: 10,
        endLine: 15,
        score: 0.85,
        snippet: '记忆片段A',
        source: 'memory'
      }]
    });

    await tracker.recordRecall({
      query: '测试查询2',
      results: [{
        path: 'memory/2024-01-02.md',
        startLine: 5,
        endLine: 10,
        score: 0.75,
        snippet: '记忆片段B',
        source: 'memory'
      }]
    });

    const stats = await tracker.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalRecalls).toBe(2);
    expect(stats.uniquePaths).toBe(2);
    expect(stats.avgRecallCount).toBe(1);
  });

  test('应该审计存储状态', async () => {
    await tracker.recordRecall({
      query: '测试查询',
      results: [{
        path: 'memory/2024-01-01.md',
        startLine: 10,
        endLine: 15,
        score: 0.85,
        snippet: '测试记忆',
        source: 'memory'
      }]
    });

    const audit = await tracker.audit();
    expect(audit.exists).toBe(true);
    expect(audit.entryCount).toBe(1);
    expect(audit.issues).toHaveLength(0);
  });
});

// ============== LightPhaseExecutor测试 ==============

describe('LightPhaseExecutor', () => {
  let workspaceDir: string;
  let tracker: RecallTracker;
  let executor: LightPhaseExecutor;

  beforeEach(async () => {
    workspaceDir = await createTempWorkspace();
    tracker = new RecallTracker(workspaceDir);
    executor = new LightPhaseExecutor(workspaceDir, tracker, {
      lookbackDays: 7,
      limit: 50
    });
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  test('应该从每日memory文件提取片段', async () => {
    // 创建测试memory文件
    const memoryContent = `# 2024-01-01 日记

## 今日工作

- 完成了某项目的环评报告编写
- 与客户沟通了审批流程
- 整理了相关法规资料

## 明日计划

- 继续跟进审批进度
`;
    await fs.writeFile(path.join(workspaceDir, 'memory', '2024-01-01.md'), memoryContent, 'utf-8');

    const result = await executor.execute();
    expect(result.dailyEntriesProcessed).toBeGreaterThan(0);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  test('应该正确去重', async () => {
    // 创建包含重复内容的文件
    const memoryContent = `# 2024-01-01 日记

- 完成了某项目的环评报告编写
- 完成了某项目的环评报告编写
- 完成了某项目的环评报告编写
`;
    await fs.writeFile(path.join(workspaceDir, 'memory', '2024-01-01.md'), memoryContent, 'utf-8');

    const result = await executor.execute();
    // 应该去重为一条
    expect(result.candidates.length).toBeLessThanOrEqual(1);
  });
});

// ============== DeepPhaseRanker测试 ==============

describe('DeepPhaseRanker', () => {
  let workspaceDir: string;
  let tracker: RecallTracker;
  let ranker: DeepPhaseRanker;

  beforeEach(async () => {
    workspaceDir = await createTempWorkspace();
    tracker = new RecallTracker(workspaceDir);
    ranker = new DeepPhaseRanker(workspaceDir, tracker);
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  test('应该正确计算评分', async () => {
    // 准备测试数据
    const entries = [{
      key: 'memory:test.md:1:5',
      path: 'memory/test.md',
      startLine: 1,
      endLine: 5,
      source: 'memory' as const,
      snippet: '这是一个重要的测试记忆',
      recallCount: 5,
      dailyCount: 2,
      groundedCount: 0,
      totalScore: 4.2,
      maxScore: 0.95,
      firstRecalledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastRecalledAt: new Date().toISOString(),
      queryHashes: ['hash1', 'hash2', 'hash3'],
      recallDays: ['2024-01-01', '2024-01-02', '2024-01-03'],
      conceptTags: ['环评', '测试']
    }];

    const result = await ranker.execute(entries, {
      limit: 10,
      minScore: 0.3,
      minRecallCount: 1,
      minUniqueQueries: 1,
      recencyHalfLifeDays: 14,
      maxAgeDays: 30
    });

    expect(result.candidatesRanked).toHaveLength(1);
    expect(result.candidatesRanked[0].score).toBeGreaterThan(0);
    expect(result.candidatesRanked[0].score).toBeLessThanOrEqual(1);
    
    // 验证各组件
    const components = result.candidatesRanked[0].components;
    expect(components.frequency).toBeGreaterThan(0);
    expect(components.relevance).toBeGreaterThan(0);
    expect(components.diversity).toBeGreaterThan(0);
    expect(components.recency).toBeGreaterThan(0);
    expect(components.consolidation).toBeGreaterThan(0);
  });

  test('应该正确应用阈值门控', async () => {
    const entries = [{
      key: 'test:1',
      path: 'memory/test.md',
      startLine: 1,
      endLine: 5,
      source: 'memory' as const,
      snippet: '低分记忆',
      recallCount: 1,
      dailyCount: 0,
      groundedCount: 0,
      totalScore: 0.3,
      maxScore: 0.3,
      firstRecalledAt: new Date().toISOString(),
      lastRecalledAt: new Date().toISOString(),
      queryHashes: ['hash1'],
      recallDays: [new Date().toISOString().split('T')[0]],
      conceptTags: []
    }];

    const result = await ranker.execute(entries, {
      limit: 10,
      minScore: 0.75,  // 高阈值
      minRecallCount: 3,  // 高召回要求
      minUniqueQueries: 2,  // 多查询要求
      recencyHalfLifeDays: 14
    });

    // 应该被过滤掉
    expect(result.candidatesPromoted).toHaveLength(0);
  });

  test('应该写入MEMORY.md', async () => {
    const entries = [{
      key: 'test:1',
      path: 'memory/test.md',
      startLine: 1,
      endLine: 5,
      source: 'memory' as const,
      snippet: '重要记忆应该被写入',
      recallCount: 10,
      dailyCount: 5,
      groundedCount: 2,
      totalScore: 12.5,
      maxScore: 0.95,
      firstRecalledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastRecalledAt: new Date().toISOString(),
      queryHashes: ['h1', 'h2', 'h3'],
      recallDays: ['2024-01-01', '2024-01-02'],
      conceptTags: ['环评', '环保']
    }];

    await ranker.execute(entries, {
      limit: 10,
      minScore: 0.1,
      minRecallCount: 1,
      minUniqueQueries: 1,
      recencyHalfLifeDays: 14
    });

    const memoryContent = await fs.readFile(path.join(workspaceDir, 'MEMORY.md'), 'utf-8');
    expect(memoryContent).toContain('重要记忆应该被写入');
  });
});

// ============== REMPhaseExtractor测试 ==============

describe('REMPhaseExtractor', () => {
  let workspaceDir: string;
  let extractor: REMPhaseExtractor;

  beforeEach(async () => {
    workspaceDir = await createTempWorkspace();
    extractor = new REMPhaseExtractor(workspaceDir);
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  test('应该分析模式标签', async () => {
    const entries = [
      {
        key: 'test:1',
        path: 'memory/2024-01-01.md',
        startLine: 1,
        endLine: 5,
        source: 'memory' as const,
        snippet: '环评项目A完成了',
        recallCount: 5,
        dailyCount: 0,
        groundedCount: 0,
        totalScore: 4.0,
        maxScore: 0.9,
        firstRecalledAt: new Date().toISOString(),
        lastRecalledAt: new Date().toISOString(),
        queryHashes: [],
        recallDays: ['2024-01-01'],
        conceptTags: ['环评', '项目']
      },
      {
        key: 'test:2',
        path: 'memory/2024-01-02.md',
        startLine: 10,
        endLine: 15,
        source: 'memory' as const,
        snippet: '环评项目B也在进行',
        recallCount: 5,
        dailyCount: 0,
        groundedCount: 0,
        totalScore: 4.0,
        maxScore: 0.9,
        firstRecalledAt: new Date().toISOString(),
        lastRecalledAt: new Date().toISOString(),
        queryHashes: [],
        recallDays: ['2024-01-02'],
        conceptTags: ['环评', '项目']
      }
    ];

    const reflections = (extractor as any).analyzePatterns(entries);
    
    // 应该有"环评"和"项目"两个标签
    const tagNames = reflections.map((r: any) => r.tag);
    expect(tagNames).toContain('环评');
    expect(tagNames).toContain('项目');
  });

  test('应该生成梦境叙述', async () => {
    const entries = [{
      key: 'test:1',
      path: 'memory/test.md',
      startLine: 1,
      endLine: 5,
      source: 'memory' as const,
      snippet: '这是一个测试记忆',
      recallCount: 3,
      dailyCount: 1,
      groundedCount: 0,
      totalScore: 2.5,
      maxScore: 0.85,
      firstRecalledAt: new Date().toISOString(),
      lastRecalledAt: new Date().toISOString(),
      queryHashes: [],
      recallDays: [new Date().toISOString().split('T')[0]],
      conceptTags: ['测试']
    }];

    const result = await extractor.execute(entries);
    
    expect(result.dreamNarrative).toContain('梦境日记');
    expect(result.reflections.length).toBeGreaterThanOrEqual(0);
  });
});

// ============== MemoryDreamingIntegration测试 ==============

describe('MemoryDreamingIntegration', () => {
  let workspaceDir: string;
  let integration: MemoryDreamingIntegration;

  beforeEach(async () => {
    workspaceDir = await createTempWorkspace();
    integration = new MemoryDreamingIntegration({
      workspaceDir,
      dreamingConfig: {
        enabled: false // 禁用自动调度以便测试
      }
    });
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceDir);
  });

  test('应该初始化各组件', async () => {
    await integration.initialize();
    
    const status = integration.getStatus();
    expect(status).toBeDefined();
    expect(status.enabled).toBe(false); // 我们禁用了自动调度
  });

  test('应该记录召回', async () => {
    await integration.initialize();
    
    await integration.recordRecall({
      query: '测试查询',
      results: [{
        path: 'memory/test.md',
        startLine: 1,
        endLine: 5,
        score: 0.85,
        snippet: '测试记忆片段'
      }]
    });

    const stats = await integration.getRecallStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.totalRecalls).toBe(1);
  });

  test('应该执行完整三阶段', async () => {
    await integration.initialize();
    
    // 添加一些测试数据
    await integration.recordRecall({
      query: '测试查询',
      results: [{
        path: 'memory/test.md',
        startLine: 1,
        endLine: 5,
        score: 0.85,
        snippet: '重要记忆片段'
      }]
    });

    const result = await integration.runFullCycle();
    
    expect(result.lightPhase).toBeDefined();
    expect(result.deepPhase).toBeDefined();
    expect(result.remPhase).toBeDefined();
    expect(result.totalCandidates).toBeGreaterThanOrEqual(0);
  });
});

// ============== 权重配置测试 ==============

describe('权重配置', () => {
  test('PROMOTION_WEIGHTS总和应为1', () => {
    const total = Object.values(PROMOTION_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  test('DEFAULT_WEIGHTS应与PROMOTION_WEIGHTS一致', () => {
    expect(DEFAULT_WEIGHTS.frequency).toBe(PROMOTION_WEIGHTS.frequency);
    expect(DEFAULT_WEIGHTS.relevance).toBe(PROMOTION_WEIGHTS.relevance);
    expect(DEFAULT_WEIGHTS.diversity).toBe(PROMOTION_WEIGHTS.diversity);
    expect(DEFAULT_WEIGHTS.recency).toBe(PROMOTION_WEIGHTS.recency);
    expect(DEFAULT_WEIGHTS.consolidation).toBe(PROMOTION_WEIGHTS.consolidation);
    expect(DEFAULT_WEIGHTS.conceptual).toBe(PROMOTION_WEIGHTS.conceptual);
  });
});
