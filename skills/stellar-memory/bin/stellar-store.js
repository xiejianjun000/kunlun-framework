#!/usr/bin/env node

/**
 * stellar-store - Store a new memory
 * 
 * Usage:
 *   stellar-store --type preference --content "User prefers dark mode" --importance 0.9 --tags "ui,preference"
 *   stellar-store -t decision -c "Use React for this project" -i 0.95
 */

const { StellarMemory } = require('../lib/core');
const { SecurityManager } = require('../lib/security');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  type: null,
  content: null,
  importance: 0.5,
  tags: [],
  context: null
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--type':
    case '-t':
      options.type = args[++i];
      break;
    case '--content':
    case '-c':
      options.content = args[++i];
      break;
    case '--importance':
    case '-i':
      options.importance = parseFloat(args[++i]);
      break;
    case '--tags':
    case '-g':
      options.tags = args[++i].split(',').map(t => t.trim());
      break;
    case '--context':
    case '-x':
      options.context = args[++i];
      break;
    default:
      // If content wasn't captured by flag, collect remaining args as content
      if (!options.content) {
        options.content = args.slice(i).join(' ');
      }
      break;
  }
}

// Validate
const security = new SecurityManager();
const validation = security.validateMemory(options);
if (!validation.valid) {
  console.error(`❌ Invalid memory: ${validation.error}`);
  console.log(`
Usage:
  stellar-store --type <type> --content <content> [options]
  
Types: preference, decision, fact, lesson, insight, context
Options:
  --importance, -i  0-1 (default: 0.5)
  --tags, -g        comma-separated tags
  --context, -x     additional context
`);
  process.exit(1);
}

// Store
const workspace = process.cwd();
const memory = new StellarMemory(workspace);
const stored = memory.storeMemory(options);

console.log(`✅ Memory stored successfully!`);
console.log(`ID: ${stored.id}`);
console.log(`Type: ${stored.type}`);
console.log(`Importance: ${stored.importance}`);
console.log(`Timestamp: ${stored.timestamp}`);
