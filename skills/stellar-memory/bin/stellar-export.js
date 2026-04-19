#!/usr/bin/env node

/**
 * stellar-export - Export all memories to a single backup file
 * 
 * Usage:
 *   stellar-export backup.json
 */

const { StellarMemory } = require('../lib/core');

const args = process.argv.slice(2);
const outputPath = args[0] || `stellar-backup-${new Date().toISOString().split('T')[0]}.json`;

const workspace = process.cwd();
const memory = new StellarMemory(workspace);

if (!memory.isInitialized()) {
  console.error('❌ Stellar Memory not initialized. Run `stellar-init` first.');
  process.exit(1);
}

console.log(`📤 Exporting all memories to ${outputPath}...`);

const success = memory.exportAll(outputPath);

if (success) {
  console.log('✅ Export complete!');
} else {
  console.error('❌ Export failed');
  process.exit(1);
}
