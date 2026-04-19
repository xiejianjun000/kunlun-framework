#!/usr/bin/env node

/**
 * stellar-init - Initialize Stellar Memory system in current workspace
 * Creates all required directories and empty files.
 */

const { StellarMemory } = require('../lib/core');

// Get workspace from command line or use cwd
const workspace = process.argv[2] || process.cwd();

const memory = new StellarMemory(workspace);

if (memory.isInitialized()) {
  console.log('⚠️  Stellar Memory already initialized in this workspace.');
  console.log('If you want to reinitialize, delete existing files first.');
  process.exit(0);
}

const success = memory.initialize();

if (success) {
  console.log('');
  console.log('🌟 Stellar Memory initialized successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Add this to your AGENTS.md instructions:');
  console.log('');
  console.log('   When starting a session:');
  console.log('   - Read SESSION-STATE.json for current context');
  console.log('   - Use stellar-search to find relevant memories');
  console.log('   - Store important information with stellar-store');
  console.log('');
  console.log('2. Dream consolidation runs automatically daily via cron');
  console.log('   You can also run it manually: stellar-dream');
  console.log('');
  console.log('Enjoy your evolving AI memory! ✨');
} else {
  console.error('❌ Initialization failed');
  process.exit(1);
}
