
const { StellarMemory } = require('/root/.openclaw/workspace/skills/stellar-memory/lib/core');

const memory = new StellarMemory('/root/.openclaw/workspace');
const all = memory.getAllMemories();

console.log('All items:');
all.forEach(item => {
  console.log(`- ${item.content.substring(0, 40)}... occurrences: ${item.occurrences}`);
});
