/**
 * Stellar Memory - Compression Module
 * 
 * Intelligent compression for old memories:
 * - Remove redundant information
 * - Keep only the essential insight
 * - Still accessible if needed, but doesn't bloat search
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Compress old daily file
 * - If there are no high-importance memories, we can compress it
 * - Important memories are already promoted to archive
 */
function compressDailyFile(sourcePath, backupDir) {
  if (!fs.existsSync(sourcePath)) {
    return { success: false, reason: 'Source not found' };
  }
  
  const fileName = path.basename(sourcePath);
  const targetPath = path.join(backupDir, `${fileName}.gz`);
  
  try {
    const content = fs.readFileSync(sourcePath);
    const compressed = zlib.gzipSync(content);
    fs.writeFileSync(targetPath, compressed);
    fs.unlinkSync(sourcePath);
    
    return {
      success: true,
      originalSize: content.length,
      compressedSize: compressed.length,
      ratio: ((1 - compressed.length / content.length) * 100).toFixed(1)
    };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Decompress for reading when needed
 */
function decompressDailyFile(compressedPath, outputDir) {
  if (!fs.existsSync(compressedPath)) {
    return { success: false, reason: 'Compressed file not found' };
  }
  
  const fileName = path.basename(compressedPath).replace('.gz', '');
  const targetPath = path.join(outputDir, fileName);
  
  try {
    const compressed = fs.readFileSync(compressedPath);
    const decompressed = zlib.gunzipSync(compressed);
    fs.writeFileSync(targetPath, decompressed);
    
    return {
      success: true,
      size: decompressed.length
    };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Merge multiple similar memories into one condensed memory
 * Keeps the most important one, adds the context from others
 */
function condenseMemories(memories) {
  if (memories.length <= 1) {
    return memories; // Nothing to condense
  }
  
  // Find the one with highest importance + most recent
  let best = memories[0];
  memories.forEach(m => {
    const mImp = m.importance || 0.5;
    const bImp = best.importance || 0.5;
    const mDate = new Date(m.last_occurred || m.timestamp);
    const bDate = new Date(best.last_occurred || best.timestamp);
    
    if (mImp > bImp || (mImp === bImp && mDate > bDate)) {
      best = m;
    }
  });
  
  // Add occurrences count
  best.occurrences = memories.length;
  
  // Merge tags
  const allTags = new Set();
  memories.forEach(m => {
    if (m.tags) {
      m.tags.forEach(t => allTags.add(t));
    }
  });
  best.tags = Array.from(allTags);
  
  // Keep first seen date
  const dates = memories.map(m => new Date(m.first_seen || m.timestamp));
  best.first_seen = new Date(Math.min(...dates)).toISOString();
  best.last_occurred = new Date(Math.max(...dates.map(m => 
    new Date(m.last_occurred || m.timestamp)
  ))).toISOString();
  
  return [best]; // Return the condensed version
}

/**
 * Remove low-value memories from active index
 * Only keep them in backup
 */
function filterLowValue(memories, minImportance = 0.3) {
  const keep = [];
  const archive = [];
  
  memories.forEach(m => {
    const imp = m.importance || 0.5;
    if (imp >= minImportance) {
      keep.push(m);
    } else {
      archive.push(m);
    }
  });
  
  return { keep, archive };
}

/**
 * Calculate memory storage statistics
 */
function getStorageStats(basePath) {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    compressedSize: 0,
    uncompressedSize: 0,
    compressedFiles: 0,
    uncompressedFiles: 0
  };
  
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walk(filePath);
      } else {
        stats.totalFiles++;
        stats.totalSize += stat.size;
        if (file.endsWith('.gz')) {
          stats.compressedSize += stat.size;
          stats.compressedFiles++;
        } else {
          stats.uncompressedSize += stat.size;
          stats.uncompressedFiles++;
        }
      }
    });
  }
  
  walk(path.join(basePath, 'memory'));
  walk(path.join(basePath, 'archives'));
  
  if (stats.compressedSize > 0) {
    stats.compressionRatio = (stats.compressedSize / stats.uncompressedSize * 100).toFixed(1);
  }
  
  return stats;
}

module.exports = {
  compressDailyFile,
  decompressDailyFile,
  condenseMemories,
  filterLowValue,
  getStorageStats
};
