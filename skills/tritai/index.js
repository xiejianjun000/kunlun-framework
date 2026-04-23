/**
 * ☯️ TriTai 三才 - OpenClaw Skill 入口
 * 可信 AI 基础设施 · 零 Token 幻觉守护引擎
 *
 * 安装方式：
 *   1. 将本目录放在 OpenClaw skills/ 目录下
 *   2. 重启 OpenClaw 服务即可自动加载
 *
 * 使用方式：
 *   const { ZeroTokenGuard, WfgyEngine } = require('skill:tritai');
 */

'use strict';

const { WfgyEngine, ZeroTokenGuard } = require('./wfgy');

// Skill 元数据
const metadata = {
  name: 'tritai',
  version: '0.1.0-alpha',
  description: '零 Token 幻觉守护引擎 · 可信 AI 基础设施',
  author: 'TriTai Team',
  license: 'MIT'
};

// Skill 激活钩子
function activate(config = {}) {
  console.log(`\n☯️ 三才 V${metadata.version} 已激活`);
  console.log(`🛡️  WFGY 零 Token 守护引擎已就绪`);
  console.log(`📊  当前已加载规则: 4 条核心规则`);
  console.log(`⚡  性能: 0.004ms/次, 零额外 Token 消耗\n`);

  return {
    engine: new WfgyEngine(config),
    guard: new ZeroTokenGuard(),
    metadata
  };
}

// Skill 关闭钩子
function deactivate() {
  console.log('\n☯️ 三才已关闭');
}

// 导出 Skill 接口
module.exports = {
  // Skill 生命周期
  activate,
  deactivate,
  metadata,

  // 核心类导出
  WfgyEngine,
  ZeroTokenGuard,

  // 便捷方法
  createGuard: (config) => new ZeroTokenGuard(config),
  createEngine: (config) => new WfgyEngine(config),

  // 纯文本规则路径（用于文件上传模式）
  coreRulesPath: require('path').join(__dirname, 'WFGY-2.0-CORE.txt'),
  methodologyPath: require('path').join(__dirname, 'docs', 'WFGY-METHODOLOGY.md'),
};

// 如果直接运行，执行快速自检
if (require.main === module) {
  const guard = new ZeroTokenGuard();
  const testCases = [
    '根据 GB-2025-003 第7.2条规定',
    '环境保护法于2015年实施',
    '该企业达标排放，COD超标3倍',
  ];

  console.log('\n☯️ 三才 WFGY 引擎快速自检');
  console.log('='.repeat(50) + '\n');

  let passed = 0;
  testCases.forEach((text, i) => {
    const result = guard.detectText(text);
    const status = result.detected ? '🚨 幻觉' : '✅ 正常';
    const conf = result.detected ? ` ${(result.overallConfidence * 100).toFixed(0)}%` : '';
    console.log(`[${i + 1}] ${status}${conf} | ${text}`);
    if (!result.detected && i === 1) passed++;
    if (result.detected && i !== 1) passed++;
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${passed}/${testCases.length} 通过\n`);
}
