/**
 * Stellar Memory - Dream Consolidation
 * 
 * Automatic memory processing during "sleep" (off-peak hours):
 * 1. Move important memories from daily to archives
 * 2. Compress old memories that haven't been accessed
 * 3. Identify recurring patterns
 * 4. Ascend high-frequency patterns to personality files
 */

const fs = require('fs');
const path = require('path');
const { StellarMemory, CATEGORIES, getCurrentDate } = require('./core');

// How many days before archiving daily files
const DAYS_BEFORE_ARCHIVE = 30;

// How many occurrences before ascending to insight
const OCCURRENCES_FOR_ASCENT = 3;

// How many occurrences before suggesting personality file update
const OCCURRENCES_FOR_PERSONALITY = 3;

class DreamConsolidator extends StellarMemory {
  constructor(workspacePath = process.cwd()) {
    super(workspacePath);
    this.personalityFiles = {
      'SOUL.md': this.getPath('SOUL.md'),
      'AGENTS.md': this.getPath('AGENTS.md'),
      'TOOLS.md': this.getPath('TOOLS.md')
    };
  }
  
  // Run full dream consolidation
  runConsolidation() {
    console.log('🌙 Starting dream consolidation...');
    
    let changes = {
      archived_dailies: 0,
      upgraded_to_archive: 0,
      merged_duplicates: 0,
      patterns_identified: 0,
      insights_ascended: 0,
      personality_suggestions: []
    };
    
    // Step 1: Archive old daily files
    changes.archived_dailies = this.archiveOldDailyFiles();
    
    // Step 2: Process daily memories - promote high importance to archive
    const upgradeResult = this.promoteHighImportanceFromDaily();
    changes.upgraded_to_archive = upgradeResult;
    
    // Step 3: Merge duplicates across archive
    const mergeResult = this.mergeDuplicatesInArchives();
    changes.merged_duplicates = mergeResult;
    
    // Step 4: Identify recurring patterns
    const patternResult = this.identifyRecurringPatterns();
    changes.patterns_identified = patternResult.count;
    changes.insights_ascended = patternResult.ascended;
    changes.personality_suggestions = patternResult.personalitySuggestions;
    
    // Step 5: Update insights archive
    this.saveInsights(patternResult.insights);
    
    console.log('✅ Dream consolidation complete!');
    console.log(`📊 Stats: ${JSON.stringify(changes, null, 2)}`);
    
    return changes;
  }
  
  // Archive daily files older than DAYS_BEFORE_ARCHIVE
  archiveOldDailyFiles() {
    const dailyFiles = this.getAllDailyFiles();
    let archived = 0;
    const today = new Date();
    
    dailyFiles.forEach(fileName => {
      const dateStr = fileName.replace('.json', '');
      const fileDate = new Date(dateStr);
      const daysOld = (today - fileDate) / (1000 * 60 * 60 * 24);
      
      if (daysOld > DAYS_BEFORE_ARCHIVE) {
        // Check if file has any high-importance memories (> 0.8)
        const dailyData = this.getDailyMemories(dateStr);
        const hasHighImportance = dailyData.memories.some(m => m.importance >= 0.8);
        
        if (!hasHighImportance) {
          // Compress to backup - we can keep just the important ones
          this.compressDailyToBackup(dateStr);
          archived++;
        }
      }
    });
    
    return archived;
  }
  
  // Compress a daily file to backup
  compressDailyToBackup(dateStr) {
    const sourcePath = this.getPath('memory/daily', `${dateStr}.json`);
    const backupPath = this.getPath('archives/backup', `${dateStr}.json.br`);
    
    // For simplicity, we just move it - real compression can be added later
    // In this zero-dependency version, we just keep it as JSON
    if (require('fs').existsSync(sourcePath)) {
      // Read and gzip compression isn't available in zero-dep, just copy
      const data = require('fs').readFileSync(sourcePath, 'utf8');
      require('fs').writeFileSync(this.getPath('archives/backup', `${dateStr}.json`), data);
      require('fs').unlinkSync(sourcePath);
    }
  }
  
  // Promote high-importance memories from daily to archive
  promoteHighImportanceFromDaily() {
    const dailyFiles = this.getAllDailyFiles();
    let promoted = 0;
    
    dailyFiles.forEach(fileName => {
      const dateStr = fileName.replace('.json', '');
      const dailyData = this.getDailyMemories(dateStr);
      
      dailyData.memories.forEach(memory => {
        // If importance >= 0.8 and not already in archive category
        if (memory.importance >= 0.8 && CATEGORIES.includes(memory.type)) {
          // Check if already exists (by content similarity)
          // Filename is plural (preferences.json), memory.type is singular (preference)
          const archiveFilename = `${memory.type}s.json`;
          const archivePath = this.getPath('archives', archiveFilename);
          const archiveData = this.safeReadJson(archivePath, { category: memory.type, items: [] });
          
          const duplicate = this.findSimilarInArchive(archiveData, memory.content);
          if (!duplicate) {
            archiveData.items.push({
              ...memory,
              first_seen: memory.timestamp,
              last_occurred: memory.timestamp
            });
            this.safeWriteJson(archivePath, archiveData);
            promoted++;
          }
        }
      });
    });
    
    return promoted;
  }
  
  // Merge duplicates in all archives
  mergeDuplicatesInArchives() {
    let merged = 0;
    
    CATEGORIES.forEach(category => {
      const archiveFilename = `${category}s.json`;
      const archivePath = this.getPath('archives', archiveFilename);
      const archiveData = this.safeReadJson(archivePath, { category, items: [] });
      
      // Use a map to find duplicates by content similarity
      const uniqueItems = [];
      const seen = [];
      
      archiveData.items.forEach(item => {
        let found = false;
        for (const seenItem of seen) {
          const similarity = this.calculateSimilarity(item.content, seenItem.content);
          if (similarity > 0.6) {
            // Merge - keep the one with higher importance, increment occurrences
            seenItem.occurrences = (seenItem.occurrences || 1) + 1;
            seenItem.last_occurred = item.last_occurred || item.timestamp;
            seenItem.importance = Math.max(seenItem.importance, item.importance || 0.5);
            merged++;
            found = true;
            break;
          }
        }
        if (!found) {
          seen.push(item);
          uniqueItems.push(item);
        }
      });
      
      if (merged > 0) {
        archiveData.items = uniqueItems;
        this.safeWriteJson(archivePath, archiveData);
      }
    });
    
    return merged;
  }
  
  // Calculate Jaccard similarity between two texts
  calculateSimilarity(text1, text2) {
    const tokens1 = new Set(this.tokenize(text1));
    const tokens2 = new Set(this.tokenize(text2));
    
    let intersection = 0;
    tokens1.forEach(t => {
      if (tokens2.has(t)) intersection++;
    });
    
    const union = tokens1.size + tokens2.size - intersection;
    return intersection / union;
  }
  
  // Tokenize wrapper - supports Chinese
  tokenize(text) {
    const { tokenize } = require('./core');
    return tokenize(text);
  }
  
  // Identify recurring patterns that should ascend to insights
  identifyRecurringPatterns() {
    const result = {
      count: 0,
      ascended: 0,
      insights: [],
      personalitySuggestions: []
    };
    
    // Check all categories for recurring patterns
    CATEGORIES.forEach(category => {
      // Filename is plural (preferences.json), category type is singular (preference)
      const archiveFilename = `${category}s.json`;
      const archivePath = this.getPath('archives', archiveFilename);
      const archiveData = this.safeReadJson(archivePath, { category, items: [] });
      
      if (!archiveData.items) return;
      
      archiveData.items.forEach(item => {
        const occurrences = item.occurrences || 1;
        result.count++;
        
        if (occurrences >= OCCURRENCES_FOR_ASCENT) {
          // This pattern has occurred enough - ascend to insight
          if (category !== 'insight') {
            const alreadyInsight = this.isAlreadyInInsights(item);
            if (!alreadyInsight) {
              this.addToInsights(item);
              result.ascended++;
            }
          }
          
          // If it's a behavior/pattern and occurs enough, suggest personality update
          if (occurrences >= OCCURRENCES_FOR_PERSONALITY) {
            const suggestion = this.suggestPersonalityUpdate(item, category);
            if (suggestion) {
              result.personalitySuggestions.push(suggestion);
            }
          }
          
          result.insights.push(item);
        }
      });
    });
    
    return result;
  }
  
  // Check if this item is already in insights
  isAlreadyInInsights(item) {
    const insightsPath = this.getPath('archives', 'insights.json');
    const insightsData = this.safeReadJson(insightsPath, { category: 'insights', items: [] });
    
    return this.findSimilarInArchive(insightsData, item.content) !== null;
  }
  
  // Add item to insights archive
  addToInsights(item) {
    const insightsPath = this.getPath('archives', 'insights.json');
    const insightsData = this.safeReadJson(insightsPath, { category: 'insights', items: [] });
    
    insightsData.items.push({
      id: item.id,
      original_category: item.type,
      content: item.content,
      importance: Math.min(1.0, (item.importance || 0.5) + 0.1),
      occurrences: item.occurrences,
      first_seen: item.first_seen,
      last_occurred: item.last_occurred,
      ascended_at: new Date().toISOString(),
      tags: item.tags || []
    });
    
    this.safeWriteJson(insightsPath, insightsData);
  }
  
  // Save collected insights
  saveInsights(insights) {
    // Insights are already saved incrementally
    return insights.length;
  }
  
  // Suggest an update to personality file (SOUL.md/AGENTS.md/TOOLS.md)
  suggestPersonalityUpdate(item, category) {
    // Determine which personality file this should go to
    
    let targetFile = null;
    let section = null;
    
    if (category === 'preference') {
      // Preferences usually go to SOUL.md - communication style/preferences
      if (item.content.toLowerCase().includes('speak') || 
          item.content.toLowerCase().includes('talk') ||
          item.content.toLowerCase().includes('concise') ||
          item.content.toLowerCase().includes('brief') ||
          item.content.toLowerCase().includes('vibe') ||
          item.content.toLowerCase().includes('简洁') ||
          item.content.toLowerCase().includes('回答') ||
          item.content.toLowerCase().includes('说话')) {
        targetFile = 'SOUL.md';
        section = '我怎么说话';
      } else if (item.content.toLowerCase().includes('work') ||
                 item.content.toLowerCase().includes('task') ||
                 item.content.toLowerCase().includes('session') ||
                 item.content.toLowerCase().includes('工作')) {
        targetFile = 'AGENTS.md';
        section = 'workflow';
      }
    } else if (category === 'lesson') {
      // Lessons about tools go to TOOLS.md
      if (item.content.toLowerCase().includes('tool') ||
          item.content.toLowerCase().includes('command') ||
          item.content.toLowerCase().includes('error') ||
          item.content.toLowerCase().includes('工具') ||
          item.content.toLowerCase().includes('错误')) {
        targetFile = 'TOOLS.md';
        section = 'gotchas';
      }
      // Workflow lessons go to AGENTS.md
      else if (item.content.toLowerCase().includes('process') ||
               item.content.toLowerCase().includes('step') ||
               item.content.toLowerCase().includes('workflow') ||
               item.content.toLowerCase().includes('流程')) {
        targetFile = 'AGENTS.md';
        section = 'best practices';
      }
    } else if (category === 'decision') {
      // Major project decisions can go to AGENTS.md context
      targetFile = 'AGENTS.md';
      section = 'project decisions';
    }
    
    if (!targetFile) {
      // Default to insights.json, no personality suggestion
      return null;
    }
    
    const filePath = this.personalityFiles[targetFile];
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    // Generate the suggestion text
    const suggestionText = this.generatePersonalitySuggestion(item, category, section);
    
    return {
      targetFile,
      section,
      suggestion: suggestionText,
      item
    };
  }
  
  // Generate the actual suggestion text
  generatePersonalitySuggestion(item, category, section) {
    // Extract the core insight
    let content = item.content.trim();
    
    // Make it concise as a rule
    if (!content.endsWith('.')) content += '.';
    
    // Add the suggestion in a natural way for the file
    const timestamp = new Date().toISOString().split('T')[0];
    return `- ${content}  *(auto-ascended from ${item.occurrences} occurrences, ${timestamp})*`;
  }
  
  // Apply personality suggestion (when approved by user)
  applyPersonalitySuggestion(suggestion) {
    const { targetFile, suggestion: suggestionText, section } = suggestion;
    const filePath = this.personalityFiles[targetFile];
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Try to find the section
    let inserted = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes(section.toLowerCase()) && 
          (line.startsWith('#') || line.startsWith('##') || line.startsWith('-'))) {
        // Insert after this line
        lines.splice(i + 1, 0, suggestionText);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      // Append to end
      lines.push('');
      lines.push(`## ${section}`);
      lines.push(suggestionText);
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ Added suggestion to ${targetFile}`);
    return true;
  }
  
  // Wrapper for safe read json
  safeReadJson(filePath, defaultValue) {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e.message);
      return defaultValue;
    }
  }
  
  // Wrapper for safe write json
  safeWriteJson(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error(`Error writing ${filePath}:`, e.message);
      return false;
    }
  }
}

module.exports = {
  DreamConsolidator,
  DAYS_BEFORE_ARCHIVE,
  OCCURRENCES_FOR_ASCENT
};
