#!/usr/bin/env node
/**
 * OpenTaiji CLI Entry Point
 * OpenTaiji 命令行入口
 */

import { showBanner } from '../utils/banner';
import { version } from '../../package.json';

// 显示欢迎 Banner
showBanner();

// 处理命令行参数
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'version':
  case '-v':
  case '--version':
    console.log(`OpenTaiji v${version}`);
    break;

  case 'help':
  case '-h':
  case '--help':
    console.log('Usage: taiji [command] [options]');
    console.log();
    console.log('Commands:');
    console.log('  version, -v, --version    Show version information');
    console.log('  help, -h, --help         Show help information');
    console.log('  init                     Initialize a new OpenTaiji project');
    console.log();
    break;

  case 'init':
    console.log('🚀 Initializing new OpenTaiji project...');
    console.log('Coming soon!');
    break;

  default:
    if (command) {
      console.log(`Unknown command: ${command}`);
      console.log('Use "taiji help" for usage.');
      process.exit(1);
    }
    // 无参数时只显示 Banner，已经完成
    break;
}

console.log();
