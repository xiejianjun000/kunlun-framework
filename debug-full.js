
const { DreamConsolidator } = require('/root/.openclaw/workspace/skills/stellar-memory/lib/dream');
const { StellarMemory } = require('/root/.openclaw/workspace/skills/stellar-memory/lib/core');

const consolidator = new DreamConsolidator('/root/.openclaw/workspace');
const memory = new StellarMemory('/root/.openclaw/workspace');

const all = memory.getAllMemories();
console.log('Total memories:', all.length);

all.forEach(item => {
  console.log('\nItem:');
  console.log('  content:', item.content.substring(0, 50));
  console.log('  occurrences:', item.occurrences);
  console.log('  category (item.category):', item.category);
  console.log('  type:', item.type);
  console.log('  occurrences >= 3:', item.occurrences >= 3);
});

const CATEGORIES = require('/root/.openclaw/workspace/skills/stellar-memory/lib/core').CATEGORIES;
console.log('\nCATEGORIES:', CATEGORIES);
