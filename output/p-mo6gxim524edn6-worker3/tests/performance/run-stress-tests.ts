#!/usr/bin/env ts-node

/**
 * 压力测试运行入口
 * 运行所有压力测试并生成详细报告
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_FILES = [
  'llm-adapter-stress.test.ts',
  'determinism-stress.test.ts',
  'scheduler-stress.test.ts',
  'memory-leak.test.ts',
];

const REPORT_FILE = path.join(__dirname, '../../../STRESS-TEST-REPORT.md');

async function runCommand(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: path.join(__dirname, '../../'),
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '--expose-gc' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data.toString());
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data.toString());
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function main() {
  const startTime = Date.now();
  const results: Array<{ test: string; passed: boolean; duration: number }> = [];

  console.log('========================================');
  console.log('     🚀 OpenTaiji 全模块压力测试');
  console.log('========================================');
  console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试数量: ${TEST_FILES.length}`);
  console.log('');

  for (const testFile of TEST_FILES) {
    console.log(`\n📌 开始测试: ${testFile}`);
    console.log('----------------------------------------');

    const testStart = Date.now();
    const { code, stdout, stderr } = await runCommand('npx', [
      'jest',
      `tests/performance/${testFile}`,
      '--verbose',
      '--no-coverage',
      '--forceExit',
    ]);

    const duration = Date.now() - testStart;
    const passed = code === 0;

    results.push({ test: testFile, passed, duration });

    console.log('----------------------------------------');
    console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`耗时: ${(duration / 1000).toFixed(2)}秒`);
    console.log('');
  }

  const totalDuration = Date.now() - startTime;
  const passedCount = results.filter(r => r.passed).length;

  // 生成报告
  let report = `# OpenTaiji 压力测试报告\n\n`;
  report += `> 测试时间: ${new Date().toLocaleString('zh-CN')}\n`;
  report += `> 总耗时: ${(totalDuration / 1000).toFixed(2)}秒\n`;
  report += `> 通过率: ${passedCount}/${results.length} (${((passedCount / results.length) * 100).toFixed(1)}%)\n\n`;

  report += `## 📊 测试结果汇总\n\n`;
  report += `| 测试文件 | 状态 | 耗时 |\n`;
  report += `|----------|------|------|\n`;

  for (const result of results) {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    const duration = (result.duration / 1000).toFixed(2) + '秒';
    report += `| ${result.test} | ${status} | ${duration} |\n`;
  }

  report += `\n## 💻 测试环境\n\n`;
  report += `- Node.js 版本: ${process.version}\n`;
  report += `- 平台: ${process.platform}\n`;
  report += `- CPU 核心数: ${require('os').cpus().length}\n`;
  report += `- 总内存: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB\n\n`;

  report += `## 📈 整体评分\n\n`;
  const score = Math.round((passedCount / results.length) * 100);
  report += `**综合得分: ${score} / 100**\n\n`;

  if (score === 100) {
    report += `🎉 所有压力测试全部通过！系统性能表现优秀！\n`;
  } else if (score >= 80) {
    report += `✅ 大部分测试通过，整体表现良好\n`;
  } else if (score >= 60) {
    report += `⚠️ 部分测试未通过，需要关注性能问题\n`;
  } else {
    report += `❌ 较多测试未通过，需要紧急修复\n`;
  }

  report += `\n## 🎯 测试覆盖模块\n\n`;
  report += `- ✅ LLM 适配器 (7种适配器并发性能)\n`;
  report += `- ✅ 确定性系统 (WFGY 验证、溯源、幻觉检测)\n`;
  report += `- ✅ 任务调度器 (添加、移除、暂停、恢复、并发)\n`;
  report += `- ✅ 内存泄漏检测 (长时间运行稳定性)\n`;

  fs.writeFileSync(REPORT_FILE, report);

  console.log('\n========================================');
  console.log('        🏁 压力测试全部完成');
  console.log('========================================');
  console.log(`报告已保存到: ${REPORT_FILE}`);
  console.log('');
  console.log(report);

  process.exit(passedCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('压力测试运行失败:', err);
  process.exit(1);
});
