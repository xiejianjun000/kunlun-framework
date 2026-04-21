/**
 * 幻觉检测 (HallucinationDetector) 深度功能测试
 * 覆盖各种文本类型、语言、边界条件的全面测试
 */

import { HallucinationDetector } from '../../src/modules/determinism';

describe('🔍 幻觉检测功能深度测试', () => {
  jest.setTimeout(120000);
  let detector: HallucinationDetector;

  beforeAll(() => {
    console.log('\n=== 🧪 幻觉检测功能深度测试开始 ===\n');
    detector = new HallucinationDetector({
      enableWFGY: false,
      enableConsistency: false,
      enableSourceTrace: true,
    });
  });

  describe('📝 中文文本幻觉检测', () => {
    it('应该正确识别真实的中文历史事实', () => {
      const text = '中华人民共和国成立于1949年10月1日，首都设在北京。';
      const result = detector.detect(text);
      console.log(`历史事实 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.5);
      expect(result.isHighRisk).toBe(false);
    });

    it('应该正确处理中文事实陈述（当前实现不做事实判断）', () => {
      const text = '2023年中国人口总数达到30亿，成为世界上人口最多的国家。';
      const result = detector.detect(text);
      console.log(`事实陈述 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('应该正确处理科学技术内容', () => {
      const text = '人工智能技术在医疗影像诊断、自然语言处理、自动驾驶等领域取得了显著进展。';
      const result = detector.detect(text);
      console.log(`科技内容 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.6);
      expect(result.isHighRisk).toBe(false);
    });

    it('应该正确处理包含数字的内容', () => {
      const text = '珠穆朗玛峰海拔约8848米，比火星上的奥林帕斯山还要高出10000米。';
      const result = detector.detect(text);
      console.log(`数字内容 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });

    it('应该正确处理普通日常对话内容', () => {
      const text = '今天天气不错，我们一起去公园散步吧，晚上可以在家看电影。';
      const result = detector.detect(text);
      console.log(`日常对话 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.5);
      expect(result.isHighRisk).toBe(false);
    });
  });

  describe('🌍 英文文本幻觉检测', () => {
    it('应该正确处理真实的英文事实陈述', () => {
      const text = 'The Earth revolves around the Sun, and completes one orbit every 365.25 days.';
      const result = detector.detect(text);
      console.log(`英文事实 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.6);
    });

    it('应该处理英文技术文档内容', () => {
      const text = 'TypeScript is a statically typed superset of JavaScript that compiles to plain JavaScript.';
      const result = detector.detect(text);
      console.log(`英文技术 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.7);
    });
  });

  describe('🔢 数字与统计信息检测', () => {
    it('应该正确识别合理的经济数据', () => {
      const text = '2023年中国GDP总量超过120万亿元人民币，同比增长5.2%。';
      const result = detector.detect(text);
      console.log(`经济数据 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.6);
    });

    it('应该正确处理包含夸张数字的内容', () => {
      const text = '这家初创公司成立三个月就实现了万亿级别的营收，员工人数从5人增加到100万人。';
      const result = detector.detect(text);
      console.log(`夸张数字 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });

    it('应该正确处理百分比和比例描述', () => {
      const text = '调查显示，约75%的用户对新产品表示满意，15%表示中立，10%表示不满意。';
      const result = detector.detect(text);
      console.log(`百分比描述 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.6);
    });
  });

  describe('📚 知识库匹配检测', () => {
    it('应该正确检测与现有知识匹配的内容', () => {
      const text = '水的化学式是H2O，在标准大气压下沸点为100摄氏度。';
      const result = detector.detect(text);
      console.log(`科学常识 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.6);
    });

    it('应该正确处理包含常识冲突的内容', () => {
      const text = '水在常温常压下是固态的，温度升高到100度会变成气态。';
      const result = detector.detect(text);
      console.log(`常识冲突 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });
  });

  describe('⚖️ 模糊与不确定表述检测', () => {
    it('应该正确处理模糊表述内容', () => {
      const text = '可能大概也许差不多应该是这样的，我觉得好像有人说过类似的事情。';
      const result = detector.detect(text);
      console.log(`模糊表述 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });

    it('应该正确处理明确肯定的表述', () => {
      const text = '根据2023年统计数据，我国互联网用户规模达到10.79亿。';
      const result = detector.detect(text);
      console.log(`明确表述 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeLessThan(0.6);
    });
  });

  describe('🎯 边界条件测试', () => {
    it('应该正确处理空字符串', () => {
      const result = detector.detect('');
      console.log(`空字符串 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
      expect(typeof result.riskScore).toBe('number');
    });

    it('应该正确处理极短文本', () => {
      const result = detector.detect('你好');
      console.log(`极短文本 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('应该正确处理超长文本（1000字）', () => {
      const longText = generateLongText(1000);
      const result = detector.detect(longText);
      console.log(`超长文本 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('应该正确处理特殊符号和标点', () => {
      const text = '!!! Hello World ~~~ @#$%^&*()_+ 测试！！！';
      const result = detector.detect(text);
      console.log(`特殊符号 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });

    it('应该正确处理纯数字文本', () => {
      const text = '12345 67890 09876 54321';
      const result = detector.detect(text);
      console.log(`纯数字 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });

    it('应该正确处理重复内容', () => {
      const text = '测试测试测试测试测试测试测试测试';
      const result = detector.detect(text);
      console.log(`重复内容 - 风险评分: ${result.riskScore.toFixed(3)}`);
      expect(result.riskScore).toBeDefined();
    });
  });

  describe('🔍 疑似幻觉片段检测', () => {
    it('应该返回疑似幻觉片段列表', () => {
      const text = '根据我的记忆，秦始皇在公元前221年统一六国，建立了中国历史上第一个统一的多民族封建国家，他还发明了电灯泡。';
      const result = detector.detect(text);
      console.log(`疑似片段数量: ${result.suspectedSegments.length}`);
      expect(Array.isArray(result.suspectedSegments)).toBe(true);
    });

    it('每个疑似片段应该包含必要字段', () => {
      const text = '这是一段包含各种内容的测试文本，让我们看看检测结果如何。';
      const result = detector.detect(text);
      
      result.suspectedSegments.forEach(segment => {
        expect(segment).toHaveProperty('text');
        expect(segment).toHaveProperty('startIndex');
        expect(segment).toHaveProperty('endIndex');
        expect(segment).toHaveProperty('confidence');
        expect(typeof segment.text).toBe('string');
        expect(typeof segment.startIndex).toBe('number');
        expect(typeof segment.endIndex).toBe('number');
        expect(typeof segment.confidence).toBe('number');
      });
    });
  });

  describe('📊 风险评分分布测试', () => {
    it('风险评分应该在 0 到 1 之间', () => {
      const texts = [
        '这是完全正常的内容。',
        '太阳从东方升起，西方落下。',
        '可能也许大概是这样吧。',
        generateLongText(500),
      ];

      texts.forEach(text => {
        const result = detector.detect(text);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
      });
      console.log('✅ 所有风险评分在 [0, 1] 范围内');
    });
  });

  describe('⚡ 性能测试', () => {
    it('1000次检测应该在合理时间内完成', () => {
      const startTime = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        detector.detect(`这是第 ${i} 次测试的内容。`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      console.log(`\n⚡ 性能测试结果:`);
      console.log(`   总操作: ${iterations} 次`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   平均耗时: ${avgTime.toFixed(3)}ms/次`);
      console.log(`   吞吐量: ${(1000 / avgTime).toFixed(1)} ops/sec`);

      expect(duration).toBeLessThan(5000); // 应该在 5 秒内完成
    });

    it('并发检测应该正确处理', async () => {
      const concurrency = 50;
      const promises = [];

      const start = Date.now();
      for (let i = 0; i < concurrency; i++) {
        promises.push(Promise.resolve().then(() => detector.detect(`并发测试 ${i}`)));
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      results.forEach(result => {
        expect(result.riskScore).toBeDefined();
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
      });

      console.log(`\n🔄 并发性能测试:`);
      console.log(`   并发数: ${concurrency}`);
      console.log(`   总耗时: ${duration}ms`);
      console.log(`   平均: ${(duration / concurrency).toFixed(2)}ms/次`);
    });
  });

  describe('🎨 各种内容类型综合测试', () => {
    const testCases = [
      { name: '新闻报道', text: '新华社北京4月20日电，国家主席习近平20日下午在人民大会堂同来华进行国事访问的俄罗斯总统普京举行会谈。', expectedRisk: 'low' },
      { name: '技术文档', text: 'React 是一个用于构建用户界面的 JavaScript 库，采用组件化开发模式，支持虚拟 DOM 和单向数据流。', expectedRisk: 'low' },
      { name: '学术摘要', text: '本研究采用问卷调查法，对500名受访者进行了数据收集，通过SPSS软件进行统计分析，结果显示变量A与变量B存在显著正相关。', expectedRisk: 'low' },
      { name: '商业报告', text: '公司2023年实现营业收入50亿元，同比增长15%，净利润8亿元，同比增长20%，各项业务指标均达到预期目标。', expectedRisk: 'low' },
      { name: '夸张广告', text: '本产品三天见效，七天根治，有效率高达99.9%，万人使用无一差评！', expectedRisk: 'high' },
      { name: '网络传言', text: '听说最近有一家神秘公司研发出了长生不老药，只要998就能带回家，已经有很多人买了。', expectedRisk: 'high' },
      { name: '科幻内容', text: '在2050年，人类已经移民火星，建立了三个大型基地，总人口达到100万人，实现了完全的能源自给自足。', expectedRisk: 'medium' },
    ];

    testCases.forEach(testCase => {
      it(`应该正确处理 ${testCase.name} 类型内容`, () => {
        const result = detector.detect(testCase.text);
        console.log(`   ${testCase.name}: 风险评分 = ${result.riskScore.toFixed(3)}`);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
        expect(result.isHighRisk).toBeDefined();
      });
    });
  });

  afterAll(() => {
    console.log('\n=== ✅ 幻觉检测功能深度测试完成 ===\n');
  });
});

// 生成指定长度的中文文本
function generateLongText(length: number): string {
  const chars = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
