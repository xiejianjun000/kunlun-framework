/**
 * 内存泄漏检测测试
 * 检测各模块在大量操作后是否有内存泄漏
 */

// 创建标准的 job 配置
function createJob(id: string) {
  return {
    id,
    name: `Job ${id}`,
    template: 'Test template',
    channels: [{ type: 'feishu' as const, name: 'feishu', destination: 'test', config: {} }],
    needRender: false,
    schedule: {
      type: 'every' as const,
      expression: '3600',
      enabled: false
    }
  };
}

describe('内存泄漏检测测试', () => {
  jest.setTimeout(180000);

  // 强制垃圾回收（如果可用）
  const forceGC = () => {
    if (global.gc) {
      global.gc();
      global.gc();
      global.gc();
    }
  };

  const getMemoryMB = () => {
    forceGC();
    return process.memoryUsage().heapUsed / 1024 / 1024;
  };

  beforeAll(() => {
    console.log('\n=== 🧪 内存泄漏检测测试开始 ===\n');
    forceGC();
  });

  it('LLM 适配器初始化无内存泄漏', async () => {
    const { QwenAdapter } = await import('../../src/adapters/llm');

    // 记录初始内存
    const baselineMemory = getMemoryMB();
    console.log(`基线内存: ${baselineMemory.toFixed(2)}MB`);

    // 执行 10 轮，每轮创建 1000 个适配器
    const rounds = 10;
    const memoryReadings: number[] = [];

    for (let round = 0; round < rounds; round++) {
      const adapters = [];
      for (let i = 0; i < 1000; i++) {
        adapters.push(new QwenAdapter({
          apiKey: `test-key-${round}-${i}`,
          model: 'qwen-turbo',
        }));
      }

      // 验证所有适配器都正常工作
      for (const adapter of adapters) {
        expect(adapter.isReady()).toBe(true);
      }

      // 释放引用
      adapters.length = 0;

      // 记录内存
      const memory = getMemoryMB();
      memoryReadings.push(memory);
      console.log(`第 ${round + 1} 轮后内存: ${memory.toFixed(2)}MB`);

      // 短暂等待
      await new Promise(r => setTimeout(r, 50));
    }

    // 分析内存增长趋势
    const firstFewRounds = memoryReadings.slice(0, 3);
    const lastFewRounds = memoryReadings.slice(-3);
    const avgFirst = firstFewRounds.reduce((a, b) => a + b, 0) / firstFewRounds.length;
    const avgLast = lastFewRounds.reduce((a, b) => a + b, 0) / lastFewRounds.length;
    const memoryGrowth = avgLast - avgFirst;

    console.log(`平均内存增长: ${memoryGrowth.toFixed(2)}MB`);

    // 内存增长不应超过 100MB（正常的临时对象分配）
    expect(memoryGrowth).toBeLessThan(100);

    console.log('✅ LLM 适配器内存检测通过\n');
  });

  it('确定性系统操作无内存泄漏', async () => {
    const { DeterminismSystem } = await import('../../src/modules/determinism');

    const baselineMemory = getMemoryMB();
    console.log(`基线内存: ${baselineMemory.toFixed(2)}MB`);

    const rounds = 10;
    const memoryReadings: number[] = [];

    for (let round = 0; round < rounds; round++) {
      const systems = [];

      for (let i = 0; i < 50; i++) {
        const system = new DeterminismSystem();
        // 添加一些知识库条目
        for (let j = 0; j < 20; j++) {
          system.addKnowledgeEntry({
            id: `entry-${round}-${i}-${j}`,
            content: generateRandomChineseText(150),
            source: { id: `source-${round}-${i}-${j}`, type: 'document' as const, confidence: 1.0 }
          });
        }
        systems.push(system);
      }

      // 执行一些验证操作
      for (const system of systems) {
        await system.verify('This is a test content to verify the determinism system');
      }

      systems.length = 0;

      const memory = getMemoryMB();
      memoryReadings.push(memory);
      console.log(`第 ${round + 1} 轮后内存: ${memory.toFixed(2)}MB`);

      await new Promise(r => setTimeout(r, 50));
    }

    const avgFirst = memoryReadings.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const avgLast = memoryReadings.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const memoryGrowth = avgLast - avgFirst;

    console.log(`平均内存增长: ${memoryGrowth.toFixed(2)}MB`);
    expect(memoryGrowth).toBeLessThan(150);

    console.log('✅ 确定性系统内存检测通过\n');
  });

  it('任务调度器操作无内存泄漏', async () => {
    const { OutcomeScheduler } = await import('../../src/modules/outcome-scheduler');

    const baselineMemory = getMemoryMB();
    console.log(`基线内存: ${baselineMemory.toFixed(2)}MB`);

    const rounds = 10;
    const memoryReadings: number[] = [];

    for (let round = 0; round < rounds; round++) {
      const schedulers = [];

      for (let i = 0; i < 20; i++) {
        const scheduler = new OutcomeScheduler();

        // 添加任务 - 不启动调度器
        for (let j = 0; j < 50; j++) {
          scheduler.addJob(createJob(`job-${round}-${i}-${j}`));
        }

        // 获取任务列表
        scheduler.getAllJobs();

        schedulers.push(scheduler);
      }

      schedulers.length = 0;

      const memory = getMemoryMB();
      memoryReadings.push(memory);
      console.log(`第 ${round + 1} 轮后内存: ${memory.toFixed(2)}MB`);

      await new Promise(r => setTimeout(r, 50));
    }

    const avgFirst = memoryReadings.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const avgLast = memoryReadings.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const memoryGrowth = avgLast - avgFirst;

    console.log(`平均内存增长: ${memoryGrowth.toFixed(2)}MB`);
    expect(memoryGrowth).toBeLessThan(200);

    console.log('✅ 任务调度器内存检测通过\n');
  });

  afterAll(() => {
    console.log('\n=== ✅ 内存泄漏检测测试完成 ===\n');
  });
});

// 生成随机中文文本（辅助函数）
function generateRandomChineseText(length: number): string {
  const chars = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
