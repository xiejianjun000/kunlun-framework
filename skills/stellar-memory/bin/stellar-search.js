#!/usr/bin/env node

/**
 * stellar-search - Search memory for relevant content
 * 
 * Usage:
 *   stellar-search "user preferences about design"
 *   stellar-search --limit 10 "what did we decide about the database"
 */

const { StellarMemory } = require('../lib/core');
const { simpleSearch } = require('../lib/search');
const { SecurityManager } = require('../lib/security');

// Parse arguments
const args = process.argv.slice(2);
let limit = 5;
let query = '';
let chatType = 'private'; // Default to private - this is CLI

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' || args[i] === '-l') {
    limit = parseInt(args[++i], 10);
  } else if (args[i] === '--group') {
    chatType = 'group';
  } else {
    query += ' ' + args[i];
  }
}

query = query.trim();

if (!query) {
  console.error('❌ Please provide a search query');
  console.log('Usage: stellar-search [--limit N] <query>');
  process.exit(1);
}

// Search
const workspace = process.cwd();
const memory = new StellarMemory(workspace);
const security = new SecurityManager(workspace);

const allMemories = memory.getAllMemories();
const results = simpleSearch(query, allMemories, limit);

// Apply security filtering based on chat type
const filteredResults = security.filterResultsForChat(results, chatType);

if (filteredResults.length === 0) {
  console.log('No matching memories found.');
  process.exit(0);
}

console.log(`Found ${filteredResults.length} matching memories:\n`);

filteredResults.forEach((result, index) => {
  const category = result.category || result.type || 'unknown';
  const importance = (result.importance || 0.5).toFixed(2);
  const score = result.score.toFixed(2);
  const date = result.last_occurred || result.timestamp || result.first_seen;
  
  console.log(`[${index + 1}] ${category} (importance: ${importance}, score: ${score})`);
  console.log(`Date: ${date.split('T')[0]}`);
  console.log(`Content: ${result.redacted ? result.content : result.content}`);
  if (result.tags && result.tags.length > 0) {
    console.log(`Tags: ${result.tags.join(', ')}`);
  }
  if (result.occurrences > 1) {
    console.log(`Occurrences: ${result.occurrences}`);
  }
  console.log('---');
});
