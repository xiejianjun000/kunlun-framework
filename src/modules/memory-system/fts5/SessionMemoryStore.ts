/**
 * SessionMemoryStore.ts - Session Memory Storage Manager
 * 
 * Features:
 * - Per-session independent storage
 * - Automatic merge to user-level index
 * - Date-based retrieval
 * - Memory consolidation
 */

import FTS5Indexer, { MemoryEntry } from './FTS5Indexer';

export interface SessionMemory {
  sessionId: string;
  userId: string;
  entries: MemoryEntry[];
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    title?: string;
    tags?: string[];
    summary?: string;
  };
}

export interface MemoryConsolidationOptions {
  maxEntriesPerSession: number;
  minSummaryLength: number;
  consolidateOldSessions: boolean;
  consolidationAgeDays: number;
}

const DEFAULT_CONSOLIDATION_OPTIONS: MemoryConsolidationOptions = {
  maxEntriesPerSession: 100,
  minSummaryLength: 50,
  consolidateOldSessions: true,
  consolidationAgeDays: 30
};

/**
 * Session memory store with consolidation support
 */
export class SessionMemoryStore {
  private indexer: FTS5Indexer;
  private sessionCache: Map<string, SessionMemory> = new Map();
  private consolidationOptions: MemoryConsolidationOptions;

  constructor(indexer: FTS5Indexer, options?: Partial<MemoryConsolidationOptions>) {
    this.indexer = indexer;
    this.consolidationOptions = { ...DEFAULT_CONSOLIDATION_OPTIONS, ...options };
  }

  /**
   * Store a memory entry for a session
   */
  async store(
    userId: string,
    sessionId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    // Store in FTS index
    const entryId = await this.indexer.indexEntry(
      userId,
      sessionId,
      content,
      metadata
    );

    // Update session cache
    const session = await this.getOrCreateSession(userId, sessionId);
    session.entries.push({
      id: entryId,
      userId,
      sessionId,
      content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    session.updatedAt = new Date();

    return entryId;
  }

  /**
   * Store multiple entries at once (batch)
   */
  async storeBatch(
    userId: string,
    sessionId: string,
    entries: { content: string; metadata?: Record<string, unknown> }[]
  ): Promise<string[]> {
    const ids: string[] = [];
    
    for (const entry of entries) {
      const id = await this.store(userId, sessionId, entry.content, entry.metadata);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Get or create a session memory object
   */
  private async getOrCreateSession(userId: string, sessionId: string): Promise<SessionMemory> {
    // Check cache first
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    // Check if session exists in database
    const meta = this.indexer.getSessionMetadata(sessionId);
    
    const session: SessionMemory = {
      sessionId,
      userId,
      entries: [],
      createdAt: meta ? new Date(meta.createdAt) : new Date(),
      updatedAt: meta ? new Date(meta.lastActiveAt) : new Date(),
      metadata: {
        title: meta?.title
      }
    };

    // Load existing entries from database
    const entries = this.indexer.search('', {
      sessionId,
      limit: this.consolidationOptions.maxEntriesPerSession
    });

    session.entries = entries.map(r => r.entry);
    this.sessionCache.set(sessionId, session);

    return session;
  }

  /**
   * Retrieve session memory
   */
  async getSession(sessionId: string): Promise<SessionMemory | null> {
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    const meta = this.indexer.getSessionMetadata(sessionId);
    if (!meta) {
      return null;
    }

    // Get user ID from session metadata
    const sessions = this.indexer.getUserSessions('', 1000);
    const sessionMeta = sessions.find(s => s.sessionId === sessionId);
    
    if (!sessionMeta) {
      return null;
    }

    return this.getOrCreateSession(sessionMeta.title || '', sessionId);
  }

  /**
   * Get recent sessions for a user
   */
  async getRecentSessions(userId: string, limit: number = 10): Promise<SessionMemory[]> {
    const sessionMetas = this.indexer.getUserSessions(userId, limit);
    const sessions: SessionMemory[] = [];

    for (const meta of sessionMetas) {
      const session = await this.getOrCreateSession(userId, meta.sessionId);
      sessions.push(session);
    }

    return sessions;
  }

  /**
   * Delete session and all its entries
   */
  async deleteSession(sessionId: string): Promise<number> {
    // Clear cache
    this.sessionCache.delete(sessionId);

    // Delete from index
    return this.indexer.deleteSession(sessionId);
  }

  /**
   * Delete specific entry
   */
  async deleteEntry(entryId: string): Promise<boolean> {
    // Clear from session cache
    for (const session of this.sessionCache.values()) {
      const index = session.entries.findIndex(e => e.id === entryId);
      if (index !== -1) {
        session.entries.splice(index, 1);
        break;
      }
    }

    // Delete from index
    return this.indexer.deleteEntry(entryId);
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: { title?: string; tags?: string[]; summary?: string }
  ): Promise<void> {
    if (metadata.title) {
      this.indexer.updateSessionTitle(sessionId, metadata.title);
    }

    const session = this.sessionCache.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...metadata };
    }
  }

  /**
   * Consolidate old sessions to save space
   */
  async consolidate(options?: Partial<MemoryConsolidationOptions>): Promise<{
    consolidatedSessions: number;
    removedEntries: number;
    createdSummaries: number;
  }> {
    const opts = { ...this.consolidationOptions, ...options };
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - opts.consolidationAgeDays);

    let consolidatedSessions = 0;
    let removedEntries = 0;
    let createdSummaries = 0;

    // Get all sessions
    const allSessions = this.indexer.getUserSessions('', 1000);

    for (const sessionMeta of allSessions) {
      const sessionDate = new Date(sessionMeta.createdAt);
      
      // Skip recent sessions
      if (sessionDate > cutoffDate || !opts.consolidateOldSessions) {
        continue;
      }

      const session = await this.getOrCreateSession(sessionMeta.sessionId);
      
      // Skip if already consolidated
      if (session.metadata.summary) {
        continue;
      }

      // Consolidate if over limit
      if (session.entries.length > opts.maxEntriesPerSession) {
        const excessEntries = session.entries.length - opts.maxEntriesPerSession;
        
        // Keep most recent entries
        const recentEntries = session.entries
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, opts.maxEntriesPerSession);

        // Delete excess entries
        for (const entry of session.entries) {
          if (!recentEntries.find(e => e.id === entry.id)) {
            this.indexer.deleteEntry(entry.id);
            removedEntries++;
          }
        }

        // Generate summary
        const summaryContent = recentEntries
          .map(e => e.content)
          .join(' ');
        
        if (summaryContent.length >= opts.minSummaryLength) {
          const summary = this.generateSessionSummary(summaryContent);
          await this.updateSessionMetadata(session.sessionId, { summary });
          createdSummaries++;
        }

        session.entries = recentEntries;
        session.metadata.summary = this.generateSessionSummary(summaryContent);
        consolidatedSessions++;
      }
    }

    return { consolidatedSessions, removedEntries, createdSummaries };
  }

  /**
   * Generate a summary for a session (simple extractive)
   */
  private generateSessionSummary(content: string, maxLength: number = 500): string {
    // Extract key sentences based on position and length
    const sentences = content.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 20);
    
    if (sentences.length === 0) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    // Take first 3 sentences or until max length
    let summary = '';
    for (const sentence of sentences.slice(0, 5)) {
      if ((summary + sentence).length > maxLength) {
        break;
      }
      summary += sentence.trim() + '. ';
    }

    return summary.trim();
  }

  /**
   * Merge sessions (combine entries from multiple sessions)
   */
  async mergeSessions(
    targetSessionId: string,
    sourceSessionIds: string[],
    userId: string
  ): Promise<number> {
    let mergedCount = 0;

    for (const sourceId of sourceSessionIds) {
      if (sourceId === targetSessionId) continue;

      const sourceSession = await this.getOrCreateSession(userId, sourceId);
      
      // Re-index entries under target session
      for (const entry of sourceSession.entries) {
        await this.store(
          userId,
          targetSessionId,
          entry.content,
          { ...entry.metadata, mergedFrom: sourceId }
        );
        mergedCount++;
      }

      // Delete source session
      await this.deleteSession(sourceId);
    }

    return mergedCount;
  }

  /**
   * Search within a session
   */
  searchInSession(
    sessionId: string,
    query: string,
    options: { limit?: number; minScore?: number } = {}
  ): { entry: MemoryEntry; score: number; highlight: string }[] {
    const results = this.indexer.search(query, {
      sessionId,
      limit: options.limit || 20,
      minScore: options.minScore || 0.1
    });

    return results.map(r => ({
      entry: r.entry,
      score: r.score,
      highlight: r.highlights[0] || r.entry.content.substring(0, 200)
    }));
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    entryCount: number;
    totalCharacters: number;
    averageEntryLength: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const session = this.sessionCache.get(sessionId);
    
    if (!session || session.entries.length === 0) {
      return {
        entryCount: 0,
        totalCharacters: 0,
        averageEntryLength: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    const totalCharacters = session.entries.reduce((sum, e) => sum + e.content.length, 0);
    const dates = session.entries.map(e => e.createdAt.getTime());

    return {
      entryCount: session.entries.length,
      totalCharacters,
      averageEntryLength: Math.round(totalCharacters / session.entries.length),
      oldestEntry: new Date(Math.min(...dates)),
      newestEntry: new Date(Math.max(...dates))
    };
  }

  /**
   * Clear session cache
   */
  clearCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedSessions: number;
    totalCachedEntries: number;
  } {
    let totalEntries = 0;
    for (const session of this.sessionCache.values()) {
      totalEntries += session.entries.length;
    }

    return {
      cachedSessions: this.sessionCache.size,
      totalCachedEntries: totalEntries
    };
  }
}

export default SessionMemoryStore;
