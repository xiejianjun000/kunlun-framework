/**
 * ☯️ TriTai 三才 - CommonJS 兼容入口
 */

const { ZeroTokenGuard } = require('./src/wfgy/ZeroTokenGuard');
const { WfgyEngine } = require('./src/wfgy/WfgyEngine');
const TriTaiSkill = require('./src/index').default;

module.exports = {
  TriTaiSkill,
  ZeroTokenGuard,
  WfgyEngine,
  version: '0.1.0-alpha'
};

// 直接运行时执行自检
if (require.main === module) {
  console.log('\n☯️ 三才已安装成功！');
  console.log('版本: 0.1.0-alpha\n');

  const guard = new ZeroTokenGuard();
  const test = '根据 GB-2025-003 第7.2条，罚款 12.34 万元';

  console.log('🧪 快速演示:');
  console.log(`输入: ${test}\n`);

  const result = guard.detectText(test);
  if (result.detected) {
    console.log('🚨 检测到幻觉！');
    console.log(`   置信度: ${(result.overallConfidence * 100).toFixed(0)}%`);
    console.log(`   风险等级: ${result.severity}`);
    console.log('\n📋 证据链:');
    result.evidenceChain.forEach(e => console.log(`   • ${e}`));
  } else {
    console.log('✅ 正常文本');
  }

  console.log('\n✅ 三才安装成功，守护已就绪！\n');
}
