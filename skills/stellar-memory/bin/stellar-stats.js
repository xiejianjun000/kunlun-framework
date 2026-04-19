#!/usr/bin/env node

/**
 * stellar-stats - Show memory statistics
 */

const { StellarMemory } = require('../lib/core');
const { SecurityManager } = require('../lib/security');

const workspace = process.cwd();
const memory = new StellarMemory(workspace);
const security = new SecurityManager(workspace);

if (!memory.isInitialized()) {
  console.error('❌ Stellar Memory not initialized. Run `stellar-init` first.');
  process.exit(1);
}

const stats = memory.getStats();
const securityCheck = security.checkDirectorySecurity();

console.log('📊 Stellar Memory Statistics');
console.log('=' .repeat(40));
console.log(`Total memories in archive: ${stats.total_memories}`);
console.log('');
console.log('By category:');
Object.entries(stats.by_category).forEach(([category, count]) => {
  console.log(`  ${category}: ${count}`);
});
console.log('');
console.log(`Daily memory files: ${stats.total_daily_files}`);
console.log(`High-importance memories (>= 0.8): ${stats.high_importance_count}`);
console.log('');
if (stats.oldest_memory) {
  console.log(`Oldest memory: ${stats.oldest_memory.split('T')[0]}`);
}
if (stats.newest_memory) {
  console.log(`Newest memory: ${stats.newest_memory.split('T')[0]}`);
}

console.log('');
console.log('🔒 Security Check');
console.log('=' .repeat(40));
if (securityCheck.secure) {
  console.log('✅ Directory security looks good');
} else {
  console.log('⚠️  Some security issues found:');
  securityCheck.issues.forEach(issue => {
    console.log(`  - ${issue.path}: ${issue.issue}`);
  });
}

console.log('');
console.log('Security rules active:');
const summary = security.getSecuritySummary();
console.log(`- ${summary.rules['private-chat']}`);
console.log(`- ${summary.rules['group-chat']}`);
