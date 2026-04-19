
const { StellarMemory } = require('/root/.openclaw/workspace/skills/stellar-memory/lib/core');

const memory = new StellarMemory('/root/.openclaw/workspace');
const all = memory.getAllMemories();

console.log('Total memories found:', all.length);
console.log('Memories:', JSON.stringify(all, null, 2));
