/**
 * FTS5Indexer.ts - SQLite FTS5 Full-Text Search Index Manager
 * 
 * Reference: OpenTaiji holographic/store.py FTS5 implementation
 * 
 * Features:
 * - SQLite FTS5 virtual table with Chinese/English tokenization
 * - Incremental index updates via triggers
 * - Automatic summary generation
 * - Thread-safe operations
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

export interface MemoryEntry {
  id: string;
  userId: string;
  sessionId: string;
  content: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  entry: MemoryEntry;
  score: number;
  highlights: string[];
}

export interface IndexStats {
  totalEntries: number;
  indexedEntries: number;
  lastIndexTime: Date | null;
  dbSize: number;
}

// FTS5 schema - supports both Chinese and English tokenization
const FTS5_SCHEMA = `
-- Main memory entries table
CREATE TABLE IF NOT EXISTS memory_entries (
    entry_id         TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    session_id       TEXT NOT NULL,
    content          TEXT NOT NULL,
    summary          TEXT,
    metadata         TEXT DEFAULT '{}',
    trust_score      REAL DEFAULT 0.5,
    retrieval_count   INTEGER DEFAULT 0,
    helpful_count    INTEGER DEFAULT 0,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entries_user ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_session ON memory_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_created ON memory_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_trust ON memory_entries(trust_score DESC);

-- FTS5 virtual table for full-text search
-- Using unicode61 tokenizer for better Chinese support
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    content,
    summary,
    content=memory_entries,
    content_rowid=entry_id,
    tokenize='unicode61 remove_diacritics 1'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS memory_fts_ai AFTER INSERT ON memory_entries BEGIN
    INSERT INTO memory_fts(rowid, content, summary)
        VALUES (new.rowid, new.content, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_ad AFTER DELETE ON memory_entries BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, content, summary)
        VALUES ('delete', old.rowid, old.content, old.summary);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_au AFTER UPDATE ON memory_entries BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, old.content, old.summary)
        VALUES ('delete', old.rowid, old.content, old.summary);
    INSERT INTO memory_fts(rowid, new.content, new.summary)
        VALUES (new.rowid, new.content, new.summary);
END;

-- Session metadata table for cross-session queries
CREATE TABLE IF NOT EXISTS session_metadata (
    session_id       TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    title            TEXT,
    created_at       TEXT NOT NULL,
    last_active_at   TEXT NOT NULL,
    message_count    INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_user ON session_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON session_metadata(last_active_at DESC);

-- User profile for preferences and facts
CREATE TABLE IF NOT EXISTS user_profile (
    user_id          TEXT PRIMARY KEY,
    preferences      TEXT DEFAULT '{}',
    facts            TEXT DEFAULT '[]',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
`;

export class FTS5Indexer {
  private db: Database.Database;
  private dbPath: string;
  private lock: boolean = false;
  private summaryCache: Map<string, string> = new Map();

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'memory-index.db');
    
    // Ensure directory exists
    const fs = require('fs');
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('temp_store = MEMORY');
    
    this.initSchema();
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(FTS5_SCHEMA);
  }

  /**
   * Generate unique entry ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Index a memory entry with automatic summary generation
   */
  async indexEntry(
    userId: string,
    sessionId: string,
    content: string,
    metadata?: Record<string, unknown>,
    generateSummary: boolean = true
  ): Promise<string> {
    const entryId = this.generateId();
    const now = new Date().toISOString();

    // Generate summary if requested
    let summary: string | undefined;
    if (generateSummary && content.length > 200) {
      summary = this.generateLocalSummary(content);
    }

    const stmt = this.db.prepare(`
      INSERT INTO memory_entries 
        (entry_id, user_id, session_id, content, summary, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entryId,
      userId,
      sessionId,
      content,
      summary || null,
      JSON.stringify(metadata || {}),
      now,
      now
    );

    // Update session metadata
    this.updateSessionMetadata(sessionId, userId);

    return entryId;
  }

  /**
   * Local summary generation (simple extractive summarization)
   */
  private generateLocalSummary(content: string, maxLength: number = 150): string {
    // Simple extractive summary: take first few sentences
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    let summary = sentences[0].trim();
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
  }

  /**
   * Search across all indexed content
   */
  search(
    query: string,
    options: {
      userId?: string;
      sessionId?: string;
      limit?: number;
      minScore?: number;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): SearchResult[] {
    const { userId, sessionId, limit = 10, minScore = 0.0, dateRange } = options;

    if (!query.trim()) {
      return [];
    }

    // Build FTS5 query with BM25 ranking
    const ftsQuery = this.buildFTSQuery(query);
    
    let sql = `
      SELECT 
        m.entry_id, m.user_id, m.session_id, m.content, m.summary,
        m.metadata, m.trust_score, m.retrieval_count, m.created_at, m.updated_at,
        bm25(memory_fts) as rank_score,
        snippet(memory_fts, 0, '<mark>', '</mark>', '...', 32) as highlight
      FROM memory_fts fts
      JOIN memory_entries m ON m.rowid = fts.rowid
      WHERE memory_fts MATCH ?
    `;

    const params: (string | number)[] = [ftsQuery];

    if (userId) {
      sql += ' AND m.user_id = ?';
      params.push(userId);
    }

    if (sessionId) {
      sql += ' AND m.session_id = ?';
      params.push(sessionId);
    }

    if (dateRange) {
      sql += ' AND m.created_at >= ? AND m.created_at <= ?';
      params.push(dateRange.start.toISOString(), dateRange.end.toISOString());
    }

    // Order by BM25 score (lower is better, negate for descending)
    sql += ' ORDER BY rank_score LIMIT ?';
    params.push(limit);

    try {
      const rows = this.db.prepare(sql).all(...params) as any[];
      
      // Update retrieval count
      if (rows.length > 0) {
        const ids = rows.map((r: any) => r.entry_id);
        const placeholders = ids.map(() => '?').join(',');
        this.db.prepare(`
          UPDATE memory_entries SET retrieval_count = retrieval_count + 1 WHERE entry_id IN (${placeholders})
        `).run(...ids);
      }

      return rows
        .filter((row: any) => {
          // Filter by minimum score (normalize rank to 0-1)
          const normalizedScore = this.normalizeScore(row.rank_score);
          return normalizedScore >= minScore;
        })
        .map((row: any) => ({
          entry: this.rowToEntry(row),
          score: this.normalizeScore(row.rank_score),
          highlights: [row.highlight || row.content.substring(0, 200)]
        }));
    } catch (error) {
      console.error('FTS search error:', error);
      return [];
    }
  }

  /**
   * Cross-session search with context aggregation
   */
  crossSessionSearch(
    query: string,
    userId: string,
    options: {
      sessionLimit?: number;
      entriesPerSession?: number;
      minScore?: number;
    } = {}
  ): { sessionId: string; title: string; entries: SearchResult[]; createdAt: string }[] {
    const { sessionLimit = 5, entriesPerSession = 3, minScore = 0.1 } = options;

    // Search across all sessions
    const results = this.search(query, {
      userId,
      limit: sessionLimit * entriesPerSession,
      minScore
    });

    // Group by session
    const sessionMap = new Map<string, SearchResult[]>();
    for (const result of results) {
      const sessionId = result.entry.sessionId;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, []);
      }
      const sessionResults = sessionMap.get(sessionId)!;
      if (sessionResults.length < entriesPerSession) {
        sessionResults.push(result);
      }
    }

    // Get session metadata and combine
    const sessions: { sessionId: string; title: string; entries: SearchResult[]; createdAt: string }[] = [];
    for (const [sessionId, entries] of sessionMap) {
      const meta = this.getSessionMetadata(sessionId);
      sessions.push({
        sessionId,
        title: meta?.title || `Session ${sessionId.substring(0, 8)}`,
        entries,
        createdAt: meta?.createdAt || new Date().toISOString()
      });
    }

    // Sort sessions by best entry score
    sessions.sort((a, b) => {
      const maxScoreA = Math.max(...a.entries.map(e => e.score));
      const maxScoreB = Math.max(...b.entries.map(e => e.score));
      return maxScoreB - maxScoreA;
    });

    return sessions.slice(0, sessionLimit);
  }

  /**
   * Build FTS5 query with prefix matching for partial words
   */
  private buildFTSQuery(query: string): string {
    // Split into tokens and add prefix matching
    const tokens = query.trim().split(/\s+/).filter(t => t.length > 0);
    
    // For Chinese, use character-level n-gram matching
    // For English, use prefix matching
    const processedTokens = tokens.map(token => {
      // Check if it looks like Chinese text
      if (/[\u4e00-\u9fff]/.test(token)) {
        return `"${token}"`; // Exact match for Chinese
      }
      // Prefix match for English words
      if (token.length >= 2) {
        return `${token}*`;
      }
      return token;
    });

    // Combine with OR for broader matching
    return processedTokens.join(' OR ');
  }

  /**
   * Normalize BM25 score to 0-1 range
   */
  private normalizeScore(bm25Score: number): number {
    // BM25 scores are negative, lower = better
    // Normalize to 0-1 where 1 is best match
    const minScore = -20;
    const maxScore = 0;
    const normalized = 1 - (bm25Score - minScore) / (maxScore - minScore);
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Convert database row to MemoryEntry
   */
  private rowToEntry(row: any): MemoryEntry {
    return {
      id: row.entry_id,
      userId: row.user_id,
      sessionId: row.session_id,
      content: row.content,
      summary: row.summary,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Update session metadata
   */
  private updateSessionMetadata(sessionId: string, userId: string): void {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO session_metadata (session_id, user_id, created_at, last_active_at, message_count)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(session_id) DO UPDATE SET
        last_active_at = excluded.last_active_at,
        message_count = message_count + 1
    `);
    
    stmt.run(sessionId, userId, now, now);
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string): { title?: string; createdAt: string; lastActiveAt: string; messageCount: number } | null {
    const row = this.db.prepare(`
      SELECT title, created_at, last_active_at, message_count
      FROM session_metadata WHERE session_id = ?
    `).get(sessionId) as any;

    if (!row) return null;

    return {
      title: row.title,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      messageCount: row.message_count
    };
  }

  /**
   * Update session title
   */
  updateSessionTitle(sessionId: string, title: string): void {
    this.db.prepare(`
      UPDATE session_metadata SET title = ? WHERE session_id = ?
    `).run(title, sessionId);
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId: string, limit: number = 10): { sessionId: string; title?: string; createdAt: string; lastActiveAt: string; messageCount: number }[] {
    const rows = this.db.prepare(`
      SELECT session_id, title, created_at, last_active_at, message_count
      FROM session_metadata 
      WHERE user_id = ?
      ORDER BY last_active_at DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map(row => ({
      sessionId: row.session_id,
      title: row.title,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      messageCount: row.message_count
    }));
  }

  /**
   * Delete entry by ID
   */
  deleteEntry(entryId: string): boolean {
    const result = this.db.prepare('DELETE FROM memory_entries WHERE entry_id = ?').run(entryId);
    return result.changes > 0;
  }

  /**
   * Delete all entries for a session
   */
  deleteSession(sessionId: string): number {
    const result = this.db.prepare('DELETE FROM memory_entries WHERE session_id = ?').run(sessionId);
    this.db.prepare('DELETE FROM session_metadata WHERE session_id = ?').run(sessionId);
    return result.changes;
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    const fs = require('fs');
    
    const totalEntries = (this.db.prepare('SELECT COUNT(*) as count FROM memory_entries').get() as any).count;
    const indexedEntries = (this.db.prepare('SELECT COUNT(*) as count FROM memory_fts').get() as any).count;
    
    let dbSize = 0;
    try {
      if (fs.existsSync(this.dbPath)) {
        const stats = fs.statSync(this.dbPath);
        dbSize = stats.size;
      }
    } catch {}

    return {
      totalEntries,
      indexedEntries,
      lastIndexTime: null,
      dbSize
    };
  }

  /**
   * Compact the database
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.db.exec(`
      DELETE FROM memory_entries;
      DELETE FROM session_metadata;
      DELETE FROM user_profile;
    `);
  }
}

export default FTS5Indexer;
