/**
 * 确定性系统 (Determinism) 压力测试
 * 测试：
 * 1. 大量文本幻觉检测性能
 * 2. 知识库索引与检索性能
 * 3. 自一致性验证性能
 * 4. 完整验证链路性能
 */

import StressTestRunner from './stress-test-suite';
import { DeterminismSystem, HallucinationDetector, SourceTracer, SelfConsistencyChecker, WFGYVerifier } from '../../src/modules/determinism';

// 生成随机中文文本
function generateRandomChineseText(length: number): string {
  const chars = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成模拟的多路径采样结果
function generateMultipleSamples(count: number): string[] {
  const samples: string[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(generateRandomChineseText(50 + Math.floor(Math.random() * 50)));
  }
  return samples;
}

// 创建标准 SourceReference
function createSourceRef(id: string, name: string) {
  return {
    id,
    type: 'document' as const,
    confidence: 1.0,
    content: name
  };
}

describe('确定性系统压力测试', () => {
  jest.setTimeout(180000);

  beforeAll(() => {
    console.log('\n=== 🧪 确定性系统压力测试开始 ===\n');
  });

  it('HallucinationDetector 幻觉检测性能', async () => {
    // CI 环境下使用较低的并发和迭代次数
    const isCI = process.env.CI === 'true';
    const runner = new StressTestRunner({
      concurrency: isCI ? 10 : 20,
      iterations: isCI ? 500 : 2000,
      timeoutMs: 60000,
    });

    const detector = new HallucinationDetector({
      enableWFGY: false,
      enableConsistency: false,
      enableSourceTrace: false,
    });

    await runner.runTest('幻觉检测', async () => {
      const text = generateRandomChineseText(200);
      const result = detector.detect(text);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });
  });

  it('DeterminismSystem 完整验证链路性能', async () => {
    const isCI = process.env.CI === 'true';
    const runner = new StressTestRunner({
      concurrency: isCI ? 5 : 10,
      iterations: isCI ? 100 : 500,
      timeoutMs: 120000,
    });

    const system = new DeterminismSystem();
    // 添加一些知识
    for (let i = 0; i < 50; i++) {
      system.addKnowledgeEntry({
        id: `knowledge-${i}`,
        content: generateRandomChineseText(150),
        source: createSourceRef(`doc-${i}`, `doc-${i}.md`)
      });
    }

    await runner.runTest('DeterminismSystem 完整验证', async () => {
      const text = generateRandomChineseText(300);
      const result = await system.verify(text);
      expect(result.verified).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  it('SourceTracer 溯源索引性能', async () => {
    const isCI = process.env.CI === 'true';
    const runner = new StressTestRunner({
      concurrency: isCI ? 10 : 20,
      iterations: isCI ? 500 : 2000,
      timeoutMs: 60000,
    });

    const tracer = new SourceTracer();
    // 添加知识库条目
    for (let i = 0; i < 100; i++) {
      tracer.addEntry({
        id: `source-${i}`,
        content: generateRandomChineseText(200),
        source: createSourceRef(`source-${i}`, `document-${i}.md`)
      });
    }

    await runner.runTest('SourceTracer 溯源', async () => {
      const text = generateRandomChineseText(150);
      const result = tracer.trace(text);
      expect(result.coverage).toBeGreaterThanOrEqual(0);
      expect(result.coverage).toBeLessThanOrEqual(1);
    });
  });

  it('SelfConsistencyChecker 一致性验证性能', async () => {
    const isCI = process.env.CI === 'true';
    const runner = new StressTestRunner({
      concurrency: isCI ? 15 : 30,
      iterations: isCI ? 1000 : 3000,
      timeoutMs: 60000,
    });

    const checker = new SelfConsistencyChecker();
    const samples = generateMultipleSamples(10);

    await runner.runTest('自一致性验证', async () => {
      const result = checker.checkConsistency(samples);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  it('SourceTracer 大量条目添加性能', async () => {
    const isCI = process.env.CI === 'true';
    const runner = new StressTestRunner({
      concurrency: isCI ? 5 : 10,
      iterations: isCI ? 100 : 500,
      timeoutMs: 60000,
    });

    let entryId = 0;
    await runner.runTest('SourceTracer 条目添加', async () => {
      const tracer = new SourceTracer();
      // 每个实例添加 100 个条目
      for (let i = 0; i < 100; i++) {
        tracer.addEntry({
          id: `entry-${entryId++}-${i}`,
          content: generateRandomChineseText(100),
          source: createSourceRef(`entry-${i}`, 'test document')
        });
      }
      expect(tracer.getIndexSize()).toBe(100);
    });
  });

  afterAll(() => {
    console.log('\n=== ✅ 确定性系统压力测试完成 ===\n');
  });
});
