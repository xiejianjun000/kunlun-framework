/**
 * CrossSessionSearch.ts - Cross-Session Semantic Search Engine
 * 
 * Features:
 * - Search across multiple sessions by user
 * - LLM-powered summary compression
 * - Contextual result highlighting
 * - Time-range based filtering
 * - Relevance ranking with multiple signals
 */

import FTS5Indexer, { SearchResult, MemoryEntry } from './FTS5Indexer';

export interface CrossSessionQuery {
  query: string;
  userId: string;
  sessionIds?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  useSummary?: boolean;
}

export interface SessionContext {
  sessionId: string;
  title: string;
  createdAt: string;
  relevanceScore: number;
  matchedEntries: {
    entry: MemoryEntry;
    score: number;
    highlight: string;
  }[];
  synthesizedSummary?: string;
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  sessions: SessionContext[];
  synthesizedContext?: string;
}

/**
 * Cross-session search with result synthesis
 */
export class CrossSessionSearch {
  private indexer: FTS5Indexer;
  private llmClient?: LLMClientInterface;

  constructor(indexer: FTS5Indexer, llmClient?: LLMClientInterface) {
    this.indexer = indexer;
    this.llmClient = llmClient;
  }

  /**
   * Execute cross-session search with optional LLM synthesis
   */
  async search(query: CrossSessionQuery): Promise<SearchResponse> {
    const {
      query: searchQuery,
      userId,
      sessionIds,
      timeRange,
      limit = 10,
      useSummary = true
    } = query;

    // Build search options
    const searchOptions: any = {
      userId,
      limit: limit * 3, // Get more results for filtering
      minScore: 0.1
    };

    if (timeRange) {
      searchOptions.dateRange = timeRange;
    }

    // Execute search
    const rawResults = this.indexer.search(searchQuery, searchOptions);

    // Filter by session IDs if specified
    const filteredResults = sessionIds
      ? rawResults.filter(r => sessionIds.includes(r.entry.sessionId))
      : rawResults;

    // Group results by session
    const sessionMap = this.groupBySession(filteredResults);

    // Build session contexts
    const sessions: SessionContext[] = [];
    let totalResults = 0;

    for (const [sessionId, results] of sessionMap) {
      if (totalResults >= limit) break;

      const sessionMeta = this.indexer.getSessionMetadata(sessionId);
      const entries = results.slice(0, 3).map(r => ({
        entry: r.entry,
        score: r.score,
        highlight: r.highlights[0] || r.entry.content.substring(0, 200)
      }));

      const sessionContext: SessionContext = {
        sessionId,
        title: sessionMeta?.title || `Session ${sessionId.substring(0, 8)}`,
        createdAt: sessionMeta?.createdAt || new Date().toISOString(),
        relevanceScore: Math.max(...results.map(r => r.score)),
        matchedEntries: entries
      };

      // Generate LLM summary if available and requested
      if (this.llmClient && useSummary && entries.length > 0) {
        try {
          sessionContext.synthesizedSummary = await this.generateSummary(
            searchQuery,
            entries.map(e => e.entry.content)
          );
        } catch (error) {
          // Fallback to simple concatenation
          sessionContext.synthesizedSummary = entries
            .map(e => e.entry.content.substring(0, 100))
            .join('... ');
        }
      }

      sessions.push(sessionContext);
      totalResults += entries.length;
    }

    // Sort sessions by relevance
    sessions.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Generate overall context if LLM available
    let synthesizedContext: string | undefined;
    if (this.llmClient && sessions.length > 0) {
      try {
        synthesizedContext = await this.generateOverallContext(
          searchQuery,
          sessions
        );
      } catch (error) {
        // Silently fail - synthesized context is optional
      }
    }

    return {
      query: searchQuery,
      totalResults,
      sessions: sessions.slice(0, 5),
      synthesizedContext
    };
  }

  /**
   * Group search results by session
   */
  private groupBySession(results: SearchResult[]): Map<string, SearchResult[]> {
    const sessionMap = new Map<string, SearchResult[]>();
    
    for (const result of results) {
      const sessionId = result.entry.sessionId;
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, []);
      }
      sessionMap.get(sessionId)!.push(result);
    }
    
    return sessionMap;
  }

  /**
   * Generate summary for a session using LLM
   */
  private async generateSummary(query: string, contents: string[]): Promise<string> {
    if (!this.llmClient) {
      throw new Error('LLM client not configured');
    }

    const prompt = `Given the search query: "${query}"
And the following relevant content from memory:
${contents.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide a brief 2-3 sentence summary that answers the search query.`;

    const response = await this.llmClient.complete(prompt, {
      maxTokens: 200,
      temperature: 0.3
    });

    return response.text.trim();
  }

  /**
   * Generate overall context from multiple sessions
   */
  private async generateOverallContext(
    query: string,
    sessions: SessionContext[]
  ): Promise<string> {
    if (!this.llmClient) {
      throw new Error('LLM client not configured');
    }

    const sessionSummaries = sessions.map(s => 
      `- ${s.title}: ${s.synthesizedSummary || s.matchedEntries[0]?.highlight || ''}`
    ).join('\n');

    const prompt = `Based on the search query: "${query}"
Synthesize information from the following memory sessions:
${sessionSummaries}

Provide a comprehensive 3-4 sentence synthesis that answers the query, noting any patterns or contradictions across sessions.`;

    const response = await this.llmClient.complete(prompt, {
      maxTokens: 300,
      temperature: 0.3
    });

    return response.text.trim();
  }

  /**
   * Find related sessions based on shared content
   */
  findRelatedSessions(
    userId: string,
    sessionId: string,
    limit: number = 5
  ): { sessionId: string; title: string; sharedContentCount: number }[] {
    // Get all sessions for user
    const userSessions = this.indexer.getUserSessions(userId, 50);
    const currentSession = userSessions.find(s => s.sessionId === sessionId);
    
    if (!currentSession) {
      return [];
    }

    // Get content from current session
    const currentContent = this.indexer.search('', {
      sessionId,
      limit: 100
    });

    // Extract key terms from current session
    const keyTerms = this.extractKeyTerms(
      currentContent.map(r => r.entry.content)
    );

    // Find sessions with overlapping content
    const sessionScores = new Map<string, number>();
    
    for (const session of userSessions) {
      if (session.sessionId === sessionId) continue;

      const sessionResults = this.indexer.search('', {
        sessionId: session.sessionId,
        limit: 50
      });

      const sessionTerms = this.extractKeyTerms(
        sessionResults.map(r => r.entry.content)
      );

      // Calculate Jaccard similarity
      const intersection = keyTerms.filter(t => sessionTerms.includes(t)).length;
      const union = new Set([...keyTerms, ...sessionTerms]).size;
      const similarity = union > 0 ? intersection / union : 0;

      if (similarity > 0.1) {
        sessionScores.set(session.sessionId, similarity);
      }
    }

    // Return top related sessions
    return Array.from(sessionScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([sid, score]) => {
        const meta = this.indexer.getSessionMetadata(sid);
        return {
          sessionId: sid,
          title: meta?.title || `Session ${sid.substring(0, 8)}`,
          sharedContentCount: Math.round(score * 100)
        };
      });
  }

  /**
   * Extract key terms from content (simple TF-based approach)
   */
  private extractKeyTerms(contents: string[]): string[] {
    const wordCount = new Map<string, number>();
    
    for (const content of contents) {
      // Simple tokenization
      const words = content.toLowerCase()
        .split(/[\s,.!?;:'"()\[\]{}]+/)
        .filter(w => w.length > 3 && !this.isStopWord(w));
      
      for (const word of words) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    // Return top terms
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Simple stop word filter
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
      '的', '了', '是', '在', '和', '与', '或', '也', '这', '那', '有', '我'
    ]);
    return stopWords.has(word);
  }

  /**
   * Get conversation timeline for a user
   */
  getTimeline(
    userId: string,
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): { sessionId: string; title: string; date: string; entryCount: number }[] {
    const { limit = 20, startDate, endDate } = options;
    
    let sessions = this.indexer.getUserSessions(userId, limit * 2);

    // Filter by date range
    if (startDate || endDate) {
      sessions = sessions.filter(s => {
        const sessionDate = new Date(s.createdAt);
        if (startDate && sessionDate < startDate) return false;
        if (endDate && sessionDate > endDate) return false;
        return true;
      });
    }

    return sessions.slice(0, limit).map(s => ({
      sessionId: s.sessionId,
      title: s.title || `Session ${s.sessionId.substring(0, 8)}`,
      date: s.createdAt,
      entryCount: s.messageCount
    }));
  }
}

/**
 * LLM Client interface for summary generation
 */
export interface LLMClientInterface {
  complete(prompt: string, options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<{
    text: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
}

/**
 * Create a simple LLM client wrapper
 */
export function createLLMClient(config: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}): LLMClientInterface {
  return {
    async complete(prompt: string, options = {}) {
      const response = await fetch(config.baseUrl || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 200,
          temperature: options.temperature || 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json() as { 
        choices?: Array<{ message?: { content?: string } }>; 
        usage?: { 
          prompt_tokens?: number; 
          completion_tokens?: number; 
          total_tokens?: number;
        } 
      };
      return {
        text: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined
      };
    }
  };
}

export default CrossSessionSearch;
