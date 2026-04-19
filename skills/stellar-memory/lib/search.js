/**
 * Stellar Memory - Search Module
 * 
 * TF-IDF based search with importance and recency boosting.
 * Zero dependencies, works everywhere.
 */

const { tokenize } = require('./core');

/**
 * Calculate TF-IDF based relevance score
 * @param {Array<string>} queryTokens - Tokenized query
 * @param {string} content - Memory content
 * @param {number} importance - Importance 0-1
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Relevance score
 */
function calculateRelevance(queryTokens, content, importance = 0.5, timestamp) {
  const contentTokens = tokenize(content);
  let matches = 0;
  
  const contentTokenSet = new Set(contentTokens);
  queryTokens.forEach(queryToken => {
    if (contentTokenSet.has(queryToken)) {
      matches++;
    }
  });
  
  if (matches === 0) {
    return 0;
  }
  
  // Term frequency - normalized by content length
  const tf = matches / Math.max(contentTokens.length, 1);
  
  // Recency boost - newer memories get higher score
  const recencyBoost = calculateRecencyBoost(timestamp);
  
  // Importance boost - important memories get higher score
  // importance is already 0-1, so (1 + importance) gives 1-2 boost
  const importanceBoost = 1 + importance;
  
  // Combined formula: higher = better
  // Multiply all factors - each contributes positively
  const score = tf * importanceBoost * (1 + recencyBoost) * 100;
  
  return score;
}

/**
 * Calculate recency boost - exponential decay
 * @param {string} timestamp - ISO timestamp
 * @returns {number} Boost value 0-1
 */
function calculateRecencyBoost(timestamp) {
  if (!timestamp) {
    return 0.5; // No timestamp - average boost
  }
  
  const memoryDate = new Date(timestamp);
  const now = new Date();
  const daysDiff = (now - memoryDate) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: 1/(1 + daysDiff)
  // Today = 1, 1 day = 0.5, 2 days = 0.33, etc.
  return 1 / (1 + daysDiff);
}

/**
 * Build inverted index for faster search
 * @param {Array} memories - List of all memories
 * @returns {Object} Inverted index: token -> [memory indices]
 */
function buildInvertedIndex(memories) {
  const invertedIndex = {};
  
  memories.forEach((memory, index) => {
    const tokens = tokenize(memory.content);
    const uniqueTokens = new Set(tokens);
    
    uniqueTokens.forEach(token => {
      if (!invertedIndex[token]) {
        invertedIndex[token] = [];
      }
      invertedIndex[token].push(index);
    });
  });
  
  return invertedIndex;
}

/**
 * Search using inverted index for faster lookups
 * @param {string} query - Search query
 * @param {Array} memories - All memories to search through
 * @param {number} limit - Max results to return
 * @param {Object} invertedIndex - Pre-built inverted index
 * @returns {Array} Scored and sorted results
 */
function searchWithInvertedIndex(query, memories, limit = 5, invertedIndex) {
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) {
    return [];
  }
  
  // Get candidate memories that contain at least one query token
  const candidateIndices = new Set();
  queryTokens.forEach(token => {
    if (invertedIndex[token]) {
      invertedIndex[token].forEach(idx => candidateIndices.add(idx));
    }
  });
  
  // Score all candidates
  const candidates = Array.from(candidateIndices).map(index => {
    const memory = memories[index];
    const score = calculateRelevance(
      queryTokens,
      memory.content,
      memory.importance || 0.5,
      memory.timestamp || memory.first_seen
    );
    
    return {
      ...memory,
      score
    };
  });
  
  // Sort by score descending, return top N
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Simple linear search - no pre-processing needed
 * @param {string} query - Search query
 * @param {Array} memories - All memories
 * @param {number} limit - Max results
 * @returns {Array} Scored results
 */
function simpleSearch(query, memories, limit = 5) {
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) {
    return [];
  }
  
  const scored = memories.map(memory => {
    const score = calculateRelevance(
      queryTokens,
      memory.content,
      memory.importance || 0.5,
      memory.timestamp || memory.first_seen
    );
    
    return {
      ...memory,
      score
    };
  }).filter(result => result.score > 0);
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Search by category - filter before scoring
 * @param {string} query 
 * @param {Array} memories 
 * @param {string} category 
 * @param {number} limit 
 * @returns {Array}
 */
function searchByCategory(query, memories, category, limit = 5) {
  const categoryMemories = memories.filter(m => m.category === category || m.type === category);
  return simpleSearch(query, categoryMemories, limit);
}

/**
 * Get all memories sorted by recency
 * @param {Array} memories 
 * @param {number} limit 
 * @returns {Array}
 */
function getRecentMemories(memories, limit = 10) {
  return memories
    .sort((a, b) => {
      const dateA = new Date(a.timestamp || a.first_seen);
      const dateB = new Date(b.timestamp || b.first_seen);
      return dateB - dateA;
    })
    .slice(0, limit);
}

/**
 * Get high importance memories (importance >= threshold)
 * @param {Array} memories 
 * @param {number} threshold 
 * @returns {Array}
 */
function getImportantMemories(memories, threshold = 0.8) {
  return memories
    .filter(m => (m.importance || 0) >= threshold)
    .sort((a, b) => (b.importance || 0) - (a.importance || 0));
}

module.exports = {
  calculateRelevance,
  calculateRecencyBoost,
  buildInvertedIndex,
  searchWithInvertedIndex,
  simpleSearch,
  searchByCategory,
  getRecentMemories,
  getImportantMemories
};
