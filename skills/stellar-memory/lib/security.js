/**
 * Stellar Memory - Security Module
 * 
 * Enforces strict memory isolation between:
 * - Private conversations (full access)
 * - Group conversations (layer 1-2 only, NO deep memory access)
 * 
 * This prevents accidental privacy leakage in group chats.
 * "Trust is good, security is better." - Alien Proverb
 */

const fs = require('fs');
const path = require('path');

// Memory layer definitions
const LAYERS = {
  PERCEPTUAL: 1,    // Current session only - safe everywhere
  WORKING: 2,       // Working memory - still session-based
  DIARY: 3,         // Daily memory - contains potentially sensitive info
  STELLAR: 4,       // Long-term archive - definitely sensitive
  PERSONALITY: 5    // Personality files - most sensitive
};

// Sensitive patterns that should never leak in group chats
const SENSITIVE_PATTERNS = [
  /api[_-]key/i,
  /secret/i,
  /token/i,
  /password/i,
  /private/i,
  /confidential/i,
  /credential/i,
  /oauth/i,
  /auth[_-]token/i,
  /access[_-]token/i,
  /[a-f0-9]{32}/i,  // MD5-like hashes
  /gh[ps]_[A-Za-z0-9]{36,}/i,  // GitHub tokens
  /sk_[A-Za-z0-9]{48}/i,  // OpenAI keys
];

class SecurityManager {
  constructor(workspacePath = process.cwd()) {
    this.workspacePath = workspacePath;
  }
  
  /**
   * Check if current chat type has access to requested layer
   * @param {number} layer - Memory layer (1-5)
   * @param {string} chatType - 'private' | 'group'
   * @returns {boolean}
   */
  hasAccess(layer, chatType) {
    if (chatType === 'private') {
      return true; // Private chat has full access
    }
    
    // Group chat can only access layers 1-2
    return layer <= LAYERS.WORKING;
  }
  
  /**
   * Enforce access check - throw error if access denied
   * @param {number} layer 
   * @param {string} chatType 
   * @throws {Error} If access denied
   */
  enforceAccess(layer, chatType) {
    if (!this.hasAccess(layer, chatType)) {
      throw new Error(`[SECURITY] Access denied to layer ${layer} in ${chatType} chat. ` +
                     `Deep memory is only accessible in private conversations.`);
    }
  }
  
  /**
   * Check if content contains sensitive information that should be redacted
   * @param {string} content 
   * @returns {boolean}
   */
  containsSensitiveContent(content) {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(content));
  }
  
  /**
   * Redact sensitive content for safe output
   * @param {string} content 
   * @returns {string} Redacted content
   */
  redactSensitiveContent(content) {
    let redacted = content;
    
    SENSITIVE_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    
    return redacted;
  }
  
  /**
   * Filter search results based on chat type
   * @param {Array} results - Search results
   * @param {string} chatType
   * @returns {Array} Filtered results
   */
  filterResultsForChat(results, chatType) {
    if (chatType === 'private') {
      return results; // No filtering in private
    }
    
    // In group chat, only return results from working memory
    // and filter any sensitive content from what's returned
    return results.filter(result => {
      // Only allow low-layer results
      const layer = this.resultToLayer(result);
      return this.hasAccess(layer, 'group');
    }).map(result => {
      if (this.containsSensitiveContent(result.content)) {
        return {
          ...result,
          content: '[Result contains sensitive information - redacted in group chat]',
          redacted: true
        };
      }
      return result;
    });
  }
  
  /**
   * Determine which layer a result comes from
   * @param {Object} result
   * @returns {number}
   */
  resultToLayer(result) {
    if (result.layer) {
      return result.layer;
    }
    
    // Infer from category
    if (result.category) {
      return LAYERS.STELLAR;
    }
    
    if (result.daily) {
      return LAYERS.DIARY;
    }
    
    return LAYERS.WORKING;
  }
  
  /**
   * Validate memory content before storing - check for obvious issues
   * @param {Object} memory
   * @returns {Object} {valid: boolean, error: string}
   */
  validateMemory(memory) {
    if (!memory.content || memory.content.trim().length === 0) {
      return {
        valid: false,
        error: 'Memory content cannot be empty'
      };
    }
    
    if (!memory.type) {
      return {
        valid: false,
        error: 'Memory type is required'
      };
    }
    
    if (memory.importance !== undefined) {
      const imp = parseFloat(memory.importance);
      if (imp < 0 || imp > 1) {
        return {
          valid: false,
          error: 'Importance must be between 0 and 1'
        };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Audit - check if any unauthorized access attempts were made
   * Logs for debugging, but doesn't block
   */
  logAccessAttempt(layer, chatType, authorized, path = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      layer,
      chatType,
      authorized,
      path
    };
    
    console.log(`[SECURITY] ${authorized ? 'ALLOWED' : 'DENIED'} layer ${layer} access in ${chatType}`);
    
    // Could write to a security log file in future
    return logEntry;
  }
  
  /**
   * Generate a security summary for debugging
   */
  getSecuritySummary() {
    return {
      layers: LAYERS,
      sensitivePatternCount: SENSITIVE_PATTERNS.length,
      rules: {
        'private-chat': 'full access to all layers',
        'group-chat': 'layers 1-2 only, sensitive content redacted'
      }
    };
  }
  
  /**
   * Check if memory system directory structure is secure
   * (permissions are correct, no world-readable sensitive files)
   */
  checkDirectorySecurity() {
    const sensitivePaths = [
      path.join(this.workspacePath, 'archives'),
      path.join(this.workspacePath, 'memory'),
      path.join(this.workspacePath, 'SESSION-STATE.json')
    ];
    
    const issues = [];
    
    sensitivePaths.forEach(p => {
      if (!fs.existsSync(p)) {
        return;
      }
      
      try {
        const stat = fs.statSync(p);
        // Check permissions on Unix-like systems
        if (process.platform !== 'win32') {
          const mode = stat.mode & 0o777;
          // If world-writable or world-readable on a sensitive file, warn
          if ((mode & 0o007) !== 0) {
            issues.push({
              path: p,
              issue: 'World-readable/writable permissions',
              mode: mode.toString(8)
            });
          }
        }
      } catch (e) {
        issues.push({
          path: p,
          issue: `Cannot stat: ${e.message}`
        });
      }
    });
    
    return {
      secure: issues.length === 0,
      issues
    };
  }
}

module.exports = {
  SecurityManager,
  LAYERS,
  SENSITIVE_PATTERNS
};
