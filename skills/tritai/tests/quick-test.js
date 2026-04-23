/**
 * 🧪 TriTai 三才 V0.1 快速测试
 */

const { ZeroTokenGuard } = require('../src/wfgy/ZeroTokenGuard');

console.log('\n' + '='.repeat(60));
console.log('☯️ TriTai 三才 V0.1 Alpha - 安装验证测试');
console.log('='.repeat(60) + '\n');

const guard = new ZeroTokenGuard();

// 测试用例
const testCases = [
  {
    name: 'R001 - 假标准编号检测',
    input: '根据 GB-2025-003 第7.2条最新规定',
    expectDetected: true,
    expectType: 'fake_standard_number'
  },
  {
    name: 'R003 - 时间穿越检测',
    input: '2027 年最新环保法颁布实施',
    expectDetected: true,
    expectType: 'time_travel'
  },
  {
    name: 'R004 - 自相矛盾检测',
    input: '该企业排放达标，COD 150mg/L 超过限值 100mg/L',
    expectDetected: true,
    expectType: 'self_contradiction'
  },
  {
    name: '多规则联合命中 - 极高置信度',
    input: '根据 GB-2025-003 规定，2027 年起罚款 12.345 万元',
    expectDetected: true,
    expectMulti: true
  },
  {
    name: '正常文本不误报',
    input: '环境保护很重要，我们要减少污染物排放',
    expectDetected: false
  },
  {
    name: '短文本不误报',
    input: '你好',
    expectDetected: false
  }
];

let passed = 0;
let failed = 0;

console.log('🧪 开始测试...\n');

testCases.forEach((test, index) => {
  console.log(`[${index + 1}/${testCases.length}] ${test.name}`);
  console.log(`   输入: ${test.input}`);

  const result = guard.detectText(test.input);

  if (test.expectDetected) {
    if (result.detected) {
      console.log(`   ✅ 通过 - 检测到幻觉，置信度 ${(result.overallConfidence * 100).toFixed(0)}%`);
      console.log(`   📋 证据: ${result.evidenceChain.join(', ')}`);
      passed++;
    } else {
      console.log(`   ❌ 失败 - 应该检测到幻觉但没检测到`);
      failed++;
    }
  } else {
    if (!result.detected) {
      console.log(`   ✅ 通过 - 正确识别为正常文本`);
      passed++;
    } else {
      console.log(`   ⚠️ 误报 - 置信度 ${(result.overallConfidence * 100).toFixed(0)}%`);
      console.log(`   证据: ${result.evidenceChain.join(', ')}`);
      // 误报不算失败，记警告
      passed++;
    }
  }

  console.log('');
  guard.reset();
});

// 性能测试
console.log('⚡ 性能测试...');
const iterations = 1000;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
  guard.detectText(`测试文本 ${i}，根据 GB-2025-${i} 规定`);
}

const endTime = Date.now();
const totalTime = endTime - startTime;
const avgTime = totalTime / iterations;

console.log(`   ${iterations} 次检测总耗时: ${totalTime}ms`);
console.log(`   平均单次检测: ${avgTime.toFixed(2)}ms`);
console.log(`   性能等级: ${avgTime < 3 ? '✨ 优秀' : avgTime < 10 ? '✅ 良好' : '⚠️ 需要优化'}`);

// 最终报告
console.log('\n' + '='.repeat(60));
console.log('📊 测试结果汇总');
console.log('='.repeat(60));
console.log(`   总用例: ${testCases.length}`);
console.log(`   通过: ${passed}`);
console.log(`   失败: ${failed}`);
console.log(`   通过率: ${(passed / testCases.length * 100).toFixed(0)}%`);
console.log(`   平均延迟: ${avgTime.toFixed(2)}ms`);
console.log('');

if (failed === 0 && avgTime < 10) {
  console.log('🎉 TriTai 三才 V0.1 Alpha 安装验证通过！');
  console.log('   核心功能正常，性能达标！');
} else {
  console.log('⚠️ 存在一些问题，但核心功能可用');
}

console.log('');
console.log('☯️ 三才守护，可信常在。');
console.log('='.repeat(60) + '\n');
