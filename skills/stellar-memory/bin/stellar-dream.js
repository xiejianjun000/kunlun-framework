#!/usr/bin/env node

/**
 * stellar-dream - Run dream consolidation (memory upgrade and compression)
 * 
 * This is meant to run automatically daily via cron, but can be run manually.
 * It does:
 * 1. Archive old daily files
 * 2. Promote high-importance memories to archive
 * 3. Merge duplicates
 * 4. Identify recurring patterns
 * 5. Ascend frequent patterns to insights
 * 6. Suggest personality file updates for very frequent patterns
 */

const { DreamConsolidator } = require('../lib/dream');

// Parse arguments
const args = process.argv.slice(2);
const applySuggestions = args.includes('--apply');
const workspace = process.cwd();

console.log('🌙 Stellar Memory Dream Consolidation');
console.log('=' .repeat(50));

const consolidator = new DreamConsolidator(workspace);
const changes = consolidator.runConsolidation();

// Ensure all properties have defaults
changes.personalitySuggestions = changes.personalitySuggestions || [];

console.log('\n📊 Consolidation Summary:');
console.log(`- Archived daily files: ${changes.archived_dailies}`);
console.log(`- Upgraded to archive: ${changes.upgraded_to_archive}`);
console.log(`- Merged duplicates: ${changes.merged_duplicates}`);
console.log(`- Patterns identified: ${changes.patterns_identified}`);
console.log(`- Insights ascended: ${changes.insights_ascended}`);

if (changes.personalitySuggestions.length > 0) {
  console.log('\n💡 Personality file suggestions:');
  console.log('The following patterns occurred frequently enough to ascend:');
  console.log('');
  
  changes.personalitySuggestions.forEach((suggestion, i) => {
    console.log(`${i + 1}. [${suggestion.targetFile} → ${suggestion.section}]`);
    console.log(`   ${suggestion.suggestion}`);
    console.log('');
  });
  
  if (applySuggestions) {
    console.log('\n⚡ Applying suggestions...');
    changes.personalitySuggestions.forEach(suggestion => {
      consolidator.applyPersonalitySuggestion(suggestion);
    });
    console.log('✅ All suggestions applied!');
  } else {
    console.log('\nTo apply these suggestions automatically, run:');
    console.log('  stellar-dream --apply');
  }
} else {
  console.log('\n✨ No personality suggestions this time.');
}

console.log('\n🌙 Dream consolidation complete! Memory is now organized.');
