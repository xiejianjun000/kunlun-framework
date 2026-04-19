/**
 * Stellar Memory - Ascend Module
 * 
 * Automatic personality evolution:
 * Recurring patterns get promoted from memory to actual personality files
 * (SOUL.md, AGENTS.md, TOOLS.md) so the AI behaves correctly without searching.
 * 
 * "What you repeat becomes who you are." - Alien Wisdom
 */

const fs = require('fs');
const path = require('path');

const CATEGORIES = {
  PREFERENCE_TO_SOUL: [
    { keywords: ['speak', 'talk', 'concise', 'brief', 'short', 'vibe', 'style'], target: 'SOUL.md', section: 'communication' },
    { keywords: ['prefer', 'like', 'dislike', 'hate', 'love'], target: 'SOUL.md', section: 'preferences' },
  ],
  LESSON_TO_TOOLS: [
    { keywords: ['tool', 'command', 'error', 'issue', 'problem', 'gotcha'], target: 'TOOLS.md', section: 'gotchas' },
  ],
  DECISION_TO_AGENTS: [
    { keywords: ['workflow', 'process', 'step', 'rule', 'decision', 'project'], target: 'AGENTS.md', section: 'workflow' },
  ]
};

class AscensionManager {
  constructor(workspacePath = process.cwd()) {
    this.workspacePath = workspacePath;
    this.personalityFiles = {
      'SOUL.md': this.getPath('SOUL.md'),
      'AGENTS.md': this.getPath('AGENTS.md'),
      'TOOLS.md': this.getPath('TOOLS.md')
    };
  }
  
  getPath(...segments) {
    return path.join(this.workspacePath, ...segments);
  }
  
  /**
   * Determine where this insight should ascend to
   */
  findTargetFile(item) {
    const content = item.content.toLowerCase();
    
    // Check which category matches
    for (const [category, mappings] of Object.entries(CATEGORIES)) {
      for (const mapping of mappings) {
        const hasKeyword = mapping.keywords.some(k => content.includes(k));
        if (hasKeyword) {
          const targetPath = this.personalityFiles[mapping.target];
          if (!fs.existsSync(targetPath)) {
            return null; // File doesn't exist yet
          }
          return {
            targetFile: mapping.target,
            targetPath,
            section: mapping.section
          };
        }
      }
    }
    
    return null; // No match
  }
  
  /**
   * Format the content for insertion
   */
  formatForInsertion(item, occurrences) {
    let content = item.content.trim();
    
    // Ensure it ends with period
    if (!content.endsWith('.') && !content.endsWith('!') && !content.endsWith('?')) {
      content += '.';
    }
    
    const date = new Date().toISOString().split('T')[0];
    return `- ${content}  *(auto-ascended from ${occurrences} occurrences, ${date})*`;
  }
  
  /**
   * Insert the insight into the personality file
   */
  insertIntoFile(targetPath, formattedContent, sectionName) {
    if (!fs.existsSync(targetPath)) {
      return { success: false, reason: 'File does not exist' };
    }
    
    let content = fs.readFileSync(targetPath, 'utf8');
    const lines = content.split('\n');
    
    // Try to find the section
    let insertIndex = -1;
    const sectionLower = sectionName.toLowerCase();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes(sectionLower) && (line.startsWith('#') || line.startsWith('##') || line.startsWith('-'))) {
        insertIndex = i + 1;
        break;
      }
    }
    
    if (insertIndex === -1) {
      // Couldn't find section, append to end with new heading
      lines.push('');
      lines.push(`## ${this.capitalize(sectionName)}`);
      lines.push(formattedContent);
    } else {
      // Insert after the section heading
      lines.splice(insertIndex, 0, formattedContent);
    }
    
    fs.writeFileSync(targetPath, lines.join('\n'), 'utf8');
    return { success: true };
  }
  
  /**
   * Check if this content is already in the file
   */
  isAlreadyPresent(targetPath, content) {
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    
    const fileContent = fs.readFileSync(targetPath, 'utf8').toLowerCase();
    const contentTokens = content.toLowerCase().split(/\s+/).filter(t => t.length > 4);
    
    // If more than 50% of the long tokens are present, consider it duplicate
    let matches = 0;
    contentTokens.forEach(token => {
      if (fileContent.includes(token)) matches++;
    });
    
    return matches / Math.max(contentTokens.length, 1) > 0.5;
  }
  
  /**
   * Ascend a recurring pattern to personality file
   */
  ascend(item) {
    const occurrences = item.occurrences || 1;
    
    // Need at least N occurrences to ascend
    if (occurrences < 3) {
      return { 
        success: false, 
        reason: `Only ${occurrences} occurrences, need at least 3 to ascend` 
      };
    }
    
    const target = this.findTargetFile(item);
    if (!target) {
      return { success: false, reason: 'No matching target file found' };
    }
    
    if (this.isAlreadyPresent(target.targetPath, item.content)) {
      return { success: false, reason: 'Content already exists in target file' };
    }
    
    const formatted = this.formatForInsertion(item, occurrences);
    const result = this.insertIntoFile(target.targetPath, formatted, target.section);
    
    if (result.success) {
      console.log(`✅ Ascended to ${target.targetFile} → ${target.section}`);
      console.log(`   Content: ${formatted}`);
    }
    
    return result;
  }
  
  /**
   * Ascend all ready insights
   */
  ascendAll(insights) {
    const results = {
      succeeded: 0,
      failed: 0,
      items: []
    };
    
    insights.forEach(item => {
      if ((item.occurrences || 1) >= 3) {
        const result = this.ascend(item);
        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
        }
        results.items.push({ item, result });
      }
    });
    
    return results;
  }
  
  /**
   * Get all candidate insights for ascension
   */
  getCandidates(allMemories) {
    return allMemories.filter(m => (m.occurrences || 1) >= 3);
  }
  
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = {
  AscensionManager,
  CATEGORIES
};
