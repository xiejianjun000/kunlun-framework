#!/usr/bin/env node

/**
 * stellar-inspect - Inspect memory structure and validate files
 * 
 * Usage:
 *   stellar-inspect          - Show overall structure
 *   stellar-inspect daily    - List daily files
 *   stellar-inspect archive  - Show archive contents
 *   stellar-inspect preferences - Show preferences
 */

const { StellarMemory, CATEGORIES } = require('../lib/core');

const args = process.argv.slice(2);
const command = args[0] || 'overall';
const workspace = process.cwd();
const memory = new StellarMemory(workspace);

if (!memory.isInitialized()) {
  console.error('❌ Stellar Memory not initialized. Run `stellar-init` first.');
  process.exit(1);
}

console.log('🔍 Stellar Memory Inspection');
console.log('=' .repeat(40));

switch (command) {
  case 'overall':
  case 'o':
    const stats = memory.getStats();
    console.log('Memory system initialized: ✅');
    console.log(`Total memories: ${stats.total_memories}`);
    console.log(`Daily files: ${stats.total_daily_files}`);
    console.log('\nStructure:');
    console.log('  SESSION-STATE.json → Working memory');
    console.log('  memory/daily/ → Daily memories');
    console.log('  archives/ → Long-term by category');
    console.log('  archives/backup/ → Compressed old memories');
    break;
  
  case 'daily':
  case 'd':
    const files = memory.getAllDailyFiles();
    console.log(`Daily memory files (${files.length}):`);
    files.slice(0, 20).forEach(f => {
      const data = memory.getDailyMemories(f.replace('.json', ''));
      console.log(`  ${f}: ${data.memories.length} memories`);
    });
    if (files.length > 20) {
      console.log(`  ... and ${files.length - 20} more`);
    }
    break;
  
  case 'archive':
  case 'a':
    console.log('Archive contents by category:');
    CATEGORIES.forEach(cat => {
      const all = memory.getAllMemories().filter(m => m.category === cat);
      console.log(`  ${cat}: ${all.length} items`);
    });
    break;
  
  default:
    // Show specific category
    if (CATEGORIES.includes(command)) {
      const all = memory.getAllMemories().filter(m => m.category === command);
      console.log(`${command}: ${all.length} items`);
      console.log('');
      all.slice(0, 10).forEach((item, i) => {
        const importance = (item.importance || 0.5).toFixed(2);
        console.log(`  [${i+1}] (${importance}) ${item.content.substring(0, 60)}${item.content.length > 60 ? '...' : ''}`);
      });
      if (all.length > 10) {
        console.log(`  ... and ${all.length - 10} more`);
      }
    } else {
      console.log(`Unknown command: ${command}`);
      console.log('Available commands: overall, daily, archive, <category>');
      process.exit(1);
    }
    break;
}

console.log('');
console.log('Run `stellar-stats` for more detailed statistics.');
