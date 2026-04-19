
const { DreamConsolidator } = require('/root/.openclaw/workspace/skills/stellar-memory/lib/dream');

const consolidator = new DreamConsolidator('/root/.openclaw/workspace');
const result = consolidator.identifyRecurringPatterns();

console.log('Result:', JSON.stringify(result, null, 2));
