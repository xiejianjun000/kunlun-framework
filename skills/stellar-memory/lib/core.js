/**
 * Stellar Memory - Core Functions
 * Five-layer memory architecture with automatic dream consolidation
 */

const fs = require('fs');
const path = require('path');

// Core constants
const MEMORY_LAYERS = {
  WORKING: 'SESSION-STATE.json',
  DAILY: 'memory/daily',
  ARCHIVE: 'archives',
  BACKUP: 'archives/backup'
};

const CATEGORIES = [
  'preference',
  'decision',
  'fact',
  'lesson',
  'insight'
];

// Utility functions
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeReadJson(filePath, defaultValue = null) {
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

function safeWriteJson(filePath, data) {
  try {
    ensureDirExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e.message);
    return false;
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Calculate recency boost - newer memories score higher
function calculateRecencyBoost(timestamp) {
  const memoryDate = new Date(timestamp);
  const now = new Date();
  const daysDiff = (now - memoryDate) / (1000 * 60 * 60 * 24);
  // Exponential decay - 1/(1 + daysDiff)
  return 1 / (1 + daysDiff);
}

// Tokenize text for TF-IDF search
// Supports both English (word-based) and Chinese (character-based)
function tokenize(text) {
  const lower = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, ' ');
  // Split by whitespace for English words
  const words = lower.split(/\s+/).filter(word => {
    // For Chinese words (contain Chinese characters), keep even if short
    const hasChinese = /[\u4e00-\u9fa5]/.test(word);
    if (hasChinese) {
      // Split Chinese into individual characters for search
      return word.split('').filter(c => c.trim().length > 0);
    }
    // For English words, keep only longer than 2
    return word.length > 2;
  });
  
  // Expand Chinese words into individual characters
  const tokens = [];
  words.forEach(word => {
    const hasChinese = /[\u4e00-\u9fa5]/.test(word);
    if (hasChinese && word.length > 0) {
      word.split('').forEach(c => {
        if (c.trim().length > 0) {
          tokens.push(c);
        }
      });
    } else if (word.length > 0) {
      tokens.push(word);
    }
  });
  
  return tokens;
}

// Calculate TF-IDF based relevance score
function calculateRelevance(queryTokens, memoryContent, importance = 0.5, timestamp) {
  const contentTokens = tokenize(memoryContent);
  let matches = 0;
  
  queryTokens.forEach(queryToken => {
    if (contentTokens.includes(queryToken)) {
      matches++;
    }
  });
  
  const tf = matches / Math.max(contentTokens.length, 1);
  const recencyBoost = calculateRecencyBoost(timestamp);
  
  // Total score = tf * (1 + importance) * (1 + recencyBoost)
  return tf * (1 + importance) * (1 + recencyBoost) * 100;
}

// Core class
class StellarMemory {
  constructor(workspacePath = process.cwd()) {
    this.workspacePath = workspacePath;
  }
  
  getPath(...segments) {
    return path.join(this.workspacePath, ...segments);
  }
  
  // Initialize memory system - create all required directories and files
  initialize() {
    console.log('🚀 Initializing Stellar Memory...');
    
    // Create directories
    ensureDirExists(this.getPath('memory/daily'));
    ensureDirExists(this.getPath('archives'));
    ensureDirExists(this.getPath('archives/backup'));
    
    // Create SESSION-STATE.json if not exists
    const workingPath = this.getPath(MEMORY_LAYERS.WORKING);
    if (!fs.existsSync(workingPath)) {
      const emptyState = {
        current_task: null,
        key_context: [],
        pending_actions: [],
        recent_decisions: [],
        last_updated: getCurrentTimestamp()
      };
      safeWriteJson(workingPath, emptyState);
      console.log('📝 Created SESSION-STATE.json');
    }
    
    // Create category files in archives
    CATEGORIES.forEach(category => {
      const categoryPath = this.getPath(MEMORY_LAYERS.ARCHIVE, `${category}.json`);
      if (!fs.existsSync(categoryPath)) {
        safeWriteJson(categoryPath, {
          category: category,
          created_at: getCurrentTimestamp(),
          items: []
        });
        console.log(`⭐ Created archives/${category}.json`);
      }
    });
    
    // Create .gitkeep
    fs.writeFileSync(this.getPath('memory/daily/.gitkeep'), '');
    fs.writeFileSync(this.getPath('archives/backup/.gitkeep'), '');
    
    console.log('✅ Stellar Memory initialization complete!');
    return true;
  }
  
  // Store a new memory
  storeMemory(options) {
    const {
      type, // preference | decision | fact | lesson | insight | context
      content,
      importance = 0.5,
      tags = [],
      context = null,
      relatedTo = []
    } = options;
    
    const memory = {
      id: generateId(),
      type,
      content,
      importance: parseFloat(importance),
      tags,
      context,
      relatedTo,
      timestamp: getCurrentTimestamp(),
      occurrences: 1
    };
    
    // 1. Write to today's daily memory
    const today = getCurrentDate();
    const dailyPath = this.getPath(MEMORY_LAYERS.DAILY, `${today}.json`);
    let dailyData = safeReadJson(dailyPath, {
      date: today,
      memories: []
    });
    dailyData.memories.push(memory);
    safeWriteJson(dailyPath, dailyData);
    
    // 2. If it's a category type, also add to archives immediately
    if (CATEGORIES.includes(type)) {
      // Filename is plural, memory type is singular
      const archiveFilename = `${type}s.json`;
      const archivePath = this.getPath(MEMORY_LAYERS.ARCHIVE, archiveFilename);
      const archiveData = safeReadJson(archivePath, {
        category: type,
        created_at: getCurrentTimestamp(),
        items: []
      });
      
      // Check for duplicates - merge if similar content exists
      const duplicate = this.findSimilarInArchive(archiveData, content);
      if (duplicate) {
        duplicate.occurrences = (duplicate.occurrences || 1) + 1;
        duplicate.last_occurred = getCurrentTimestamp();
        // Importance increases with occurrences
        duplicate.importance = Math.min(1.0, (duplicate.importance || importance) + 0.05);
      } else {
        archiveData.items.push({
          ...memory,
          first_seen: getCurrentTimestamp(),
          last_occurred: getCurrentTimestamp()
        });
      }
      
      safeWriteJson(archivePath, archiveData);
    }
    
    // 3. Update working memory last_updated
    this.touchWorkingMemory();
    
    return memory;
  }
  
  // Find similar content in archive for deduplication
  findSimilarInArchive(archiveData, content) {
    const contentTokens = new Set(tokenize(content));
    if (contentTokens.size === 0) return null;
    
    for (const item of archiveData.items) {
      const itemTokens = new Set(tokenize(item.content));
      let intersection = 0;
      contentTokens.forEach(t => {
        if (itemTokens.has(t)) intersection++;
      });
      
      const jaccard = intersection / contentTokens.size;
      if (jaccard > 0.5) { // More than 50% overlap = similar
        return item;
      }
    }
    
    return null;
  }
  
  // Search memories by query
  search(query, limit = 5) {
    const queryTokens = tokenize(query);
    const results = [];
    
    // Search all archives
    CATEGORIES.forEach(category => {
      const archivePath = this.getPath(MEMORY_LAYERS.ARCHIVE, `${category}.json`);
      const data = safeReadJson(archivePath, null);
      
      if (data && data.items) {
        data.items.forEach(item => {
          const score = calculateRelevance(
            queryTokens,
            item.content,
            item.importance || 0.5,
            item.timestamp || item.first_seen
          );
          
          if (score > 0) {
            results.push({
              ...item,
              score,
              category
            });
          }
        });
      }
    });
    
    // Sort by score and return top N
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  // Get all memories from all archives
  getAllMemories() {
    const all = [];
    CATEGORIES.forEach(category => {
      // Filename is plural (preferences.json), category type is singular (preference)
      const archiveFilename = `${category}s.json`;
      const archivePath = this.getPath(MEMORY_LAYERS.ARCHIVE, archiveFilename);
      const data = safeReadJson(archivePath, null);
      if (data && data.items) {
        data.items.forEach(item => {
          all.push({ ...item, category });
        });
      }
    });
    return all;
  }
  
  // Get daily memories for a date
  getDailyMemories(date = null) {
    const targetDate = date || getCurrentDate();
    const dailyPath = this.getPath(MEMORY_LAYERS.DAILY, `${targetDate}.json`);
    return safeReadJson(dailyPath, { date: targetDate, memories: [] });
  }
  
  // Get all daily memory files
  getAllDailyFiles() {
    const dailyDir = this.getPath(MEMORY_LAYERS.DAILY);
    if (!fs.existsSync(dailyDir)) {
      return [];
    }
    return fs.readdirSync(dailyDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
  }
  
  // Read working memory
  readWorkingMemory() {
    return safeReadJson(this.getPath(MEMORY_LAYERS.WORKING), {
      current_task: null,
      key_context: [],
      pending_actions: [],
      recent_decisions: [],
      last_updated: getCurrentTimestamp()
    });
  }
  
  // Write working memory
  writeWorkingMemory(data) {
    data.last_updated = getCurrentTimestamp();
    return safeWriteJson(this.getPath(MEMORY_LAYERS.WORKING), data);
  }
  
  // Touch working memory (update timestamp)
  touchWorkingMemory() {
    const data = this.readWorkingMemory();
    data.last_updated = getCurrentTimestamp();
    this.writeWorkingMemory(data);
  }
  
  // Get statistics
  getStats() {
    const stats = {
      total_memories: 0,
      by_category: {},
      total_daily_files: 0,
      oldest_memory: null,
      newest_memory: null,
      high_importance_count: 0 // importance >= 0.8
    };
    
    CATEGORIES.forEach(cat => stats.by_category[cat] = 0);
    
    const allMemories = this.getAllMemories();
    stats.total_memories = allMemories.length;
    
    allMemories.forEach(mem => {
      const ts = new Date(mem.timestamp || mem.first_seen);
      if (!stats.oldest_memory || ts < new Date(stats.oldest_memory)) {
        stats.oldest_memory = ts.toISOString();
      }
      if (!stats.newest_memory || ts > new Date(stats.newest_memory)) {
        stats.newest_memory = ts.toISOString();
      }
      
      stats.by_category[mem.category]++;
      
      if (mem.importance >= 0.8) {
        stats.high_importance_count++;
      }
    });
    
    stats.total_daily_files = this.getAllDailyFiles().length;
    
    return stats;
  }
  
  // Check if memory system is initialized
  isInitialized() {
    const workingPath = this.getPath(MEMORY_LAYERS.WORKING);
    const archivesPath = this.getPath(MEMORY_LAYERS.ARCHIVE);
    return fs.existsSync(workingPath) && fs.existsSync(archivesPath);
  }
  
  // Security check - can this chat type access this memory layer
  static checkAccess(layer, chatType) {
    // layer: 1-5 (1=perceptual, 5=personality)
    // chatType: 'private' | 'group'
    
    if (chatType === 'private') {
      return true; // Private chat can access everything
    }
    
    // Group chat can only access layers 1-2
    return layer <= 2;
  }
  
  // Export all memories to a backup file
  exportAll(outputPath) {
    const exportData = {
      version: '2.0.0',
      exported_at: getCurrentTimestamp(),
      working_memory: this.readWorkingMemory(),
      archives: {},
      daily: {}
    };
    
    CATEGORIES.forEach(category => {
      const archivePath = this.getPath(MEMORY_LAYERS.ARCHIVE, `${category}.json`);
      exportData.archives[category] = safeReadJson(archivePath, null);
    });
    
    this.getAllDailyFiles().forEach(date => {
      const dailyPath = this.getPath(MEMORY_LAYERS.DAILY, date);
      exportData.daily[date] = safeReadJson(dailyPath, null);
    });
    
    return safeWriteJson(outputPath, exportData);
  }
}

module.exports = {
  StellarMemory,
  CATEGORIES,
  MEMORY_LAYERS,
  getCurrentDate,
  getCurrentTimestamp,
  tokenize,
  calculateRelevance
};
