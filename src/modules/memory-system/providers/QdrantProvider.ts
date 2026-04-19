/**
 * OpenTaiji Memory System - Qdrant Vector Database Provider
 * 
 * Vector-based memory provider using Qdrant for semantic search.
 * Supports embedding-based retrieval and hybrid search.
 * 
 * @module memory-system/providers/QdrantProvider
 */

import type {
  ProviderName,
  SessionKey,
  SessionContext,
  ToolSchema,
  MemoryEntry,
  MemorySearchOptions,
  MemorySearchResult,
  ProviderHealthStatus,
  ConfigField,
  MemoryStats,
} from './types';
import { MemoryProvider } from './MemoryProvider';

interface QdrantConfig {
  url?: string;
  apiKey?: string;
  collectionName?: string;
  vectorSize?: number;
  distance?: 'Cosine' | 'Euclidean' | 'Dot';
  timeout?: number;
  preferGrpc?: boolean;
}

interface QdrantPoint {
  id: string;
  vector?: number[];
  payload: Record<string, unknown>;
  score?: number;
}

interface QdrantSearchParams {
  limit: number;
  offset?: number;
  with_payload?: boolean;
  with_vector?: boolean;
  score_threshold?: number;
  filter?: Record<string, unknown>;
}

/**
 * Qdrant vector database provider for semantic memory storage.
 * 
 * Features:
 * - Vector-based semantic search
 * - Metadata filtering
 * - Session-scoped storage
 * - Automatic embedding generation (via configured embedder)
 */
export class QdrantProvider extends MemoryProvider {
  readonly name: ProviderName = 'qdrant';
  
  private _config: QdrantConfig;
  private _sessionId: SessionKey = '';
  private _context: SessionContext | null = null;
  private _collectionName: string;
  private _vectorSize: number;
  private _distance: 'Cosine' | 'Euclidean' | 'Dot';
  private _initialized: boolean = false;
  
  // HTTP client for Qdrant REST API
  private _baseUrl: string;
  private _timeout: number;
  private _useGrpc: boolean;

  constructor(config: QdrantConfig = {}) {
    super();
    this._config = config;
    this._baseUrl = config.url || process.env.QDRANT_URL || 'http://localhost:6333';
    this._collectionName = config.collectionName || 'opentaiji_memory';
    this._vectorSize = config.vectorSize || 1536; // OpenAI ada-002 default
    this._distance = config.distance || 'Cosine';
    this._timeout = config.timeout || 30000;
    this._useGrpc = config.preferGrpc || false;
  }

  // ─────────────────────────────────────────────────────────────
  // Required Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if Qdrant is configured and accessible.
   * No network calls — just check config.
   */
  isAvailable(): boolean {
    // Check if Qdrant URL is configured
    const hasUrl = Boolean(this._config.url || process.env.QDRANT_URL);
    // API key is optional for local instances
    const hasApiKey = Boolean(this._config.apiKey || process.env.QDRANT_API_KEY);
    return hasUrl;
  }

  /**
   * Initialize Qdrant connection and ensure collection exists.
   */
  async initialize(sessionId: SessionKey, context: SessionContext): Promise<void> {
    this._sessionId = sessionId;
    this._context = context;

    // Use profile-scoped collection for isolation
    const profileSuffix = context.openTaijiHome ? 
      `_${Buffer.from(context.openTaijiHome).toString('base64').slice(0, 8)}` : '';
    
    this._collectionName = this._config.collectionName 
      ? `${this._config.collectionName}${profileSuffix}`
      : `opentaiji_memory${profileSuffix}`;

    // Ensure collection exists
    await this._ensureCollection();

    this._initialized = true;
  }

  /**
   * Return tool schemas for Qdrant memory operations.
   */
  getToolSchemas(): ToolSchema[] {
    return [
      {
        name: 'qdrant_search',
        description: `Search Qdrant semantic memory. Use for finding past context, 
discussions, decisions, or facts stored across sessions. Returns entries ranked 
by semantic similarity to your query.`,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results (default: 5)',
              default: 5,
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
            sessionId: {
              type: 'string',
              description: 'Filter by session ID (optional)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'qdrant_add',
        description: `Add an entry to Qdrant semantic memory. 
Use to persist important facts, decisions, or context that should be 
remembered across sessions. Include enough context for future retrieval.`,
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The memory content to store',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
            importance: {
              type: 'number',
              description: 'Importance score 0-1 (default: 0.5)',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'qdrant_delete',
        description: `Delete a memory entry by ID from Qdrant.`,
        parameters: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Memory entry ID to delete',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  /**
   * Handle Qdrant tool calls.
   */
  async handleToolCall(
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<string> {
    try {
      switch (toolName) {
        case 'qdrant_search':
          return await this._handleSearch(args);
        case 'qdrant_add':
          return await this._handleAdd(args);
        case 'qdrant_delete':
          return await this._handleDelete(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────

  getConfigSchema(): ConfigField[] {
    return [
      {
        key: 'url',
        description: 'Qdrant server URL',
        default: 'http://localhost:6333',
        required: true,
      },
      {
        key: 'apiKey',
        description: 'Qdrant API key (for cloud instances)',
        secret: true,
        env_var: 'QDRANT_API_KEY',
      },
      {
        key: 'collectionName',
        description: 'Collection name for memory storage',
        default: 'opentaiji_memory',
      },
      {
        key: 'vectorSize',
        description: 'Embedding vector dimensions',
        default: '1536',
        choices: ['768', '1024', '1536', '3072'],
      },
      {
        key: 'distance',
        description: 'Distance metric for similarity search',
        default: 'Cosine',
        choices: ['Cosine', 'Euclidean', 'Dot'],
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // Memory Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Search semantic memory.
   */
  async search(options: MemorySearchOptions): Promise<MemorySearchResult> {
    if (!options.query) {
      return { entries: [], totalCount: 0 };
    }

    try {
      // Generate embedding for query (would use embedder in production)
      const queryEmbedding = await this._generateEmbedding(options.query);
      
      const searchParams: QdrantSearchParams = {
        limit: options.limit || 5,
        offset: options.offset || 0,
        with_payload: true,
        with_vector: false,
      };

      // Add filters
      const filters: Record<string, unknown>[] = [];
      
      if (options.sessionId) {
        filters.push({ key: 'sessionId', match: { value: options.sessionId } });
      }
      
      if (options.tags && options.tags.length > 0) {
        filters.push({ key: 'tags', match: { any: options.tags } });
      }

      if (filters.length > 0) {
        searchParams.filter = {
          must: filters,
        };
      }

      const response = await this._request('POST', `/collections/${this._collectionName}/points/search`, {
        vector: queryEmbedding,
        ...searchParams,
      });

      const points = (response.result as QdrantPoint[]) || [];
      const entries: MemoryEntry[] = points.map((point: QdrantPoint) => ({
        id: point.id,
        content: point.payload.content as string,
        metadata: point.payload.metadata as Record<string, unknown> || {},
        timestamp: point.payload.timestamp as number || 0,
        sessionId: point.payload.sessionId as string || '',
        tags: point.payload.tags as string[] || [],
        importance: point.payload.importance as number,
      }));

      return {
        entries,
        totalCount: entries.length,
        scores: points.map((_: unknown, i: number) => 
          (points[i] as { score: number }).score
        ),
      };
    } catch (error) {
      console.error('Qdrant search error:', error);
      return { entries: [], totalCount: 0 };
    }
  }

  /**
   * Read a single entry.
   */
  async read(id: string): Promise<MemoryEntry | null> {
    try {
      const response = await this._request('GET', 
        `/collections/${this._collectionName}/points/${id}`
      );

      if (!response.result) {
        return null;
      }

      const point = response.result as QdrantPoint;
      return {
        id: point.id,
        content: point.payload.content as string,
        metadata: point.payload.metadata as Record<string, unknown> || {},
        timestamp: point.payload.timestamp as number || 0,
        sessionId: point.payload.sessionId as string || '',
        tags: point.payload.tags as string[] || [],
        importance: point.payload.importance as number,
      };
    } catch {
      return null;
    }
  }

  /**
   * Write a memory entry.
   */
  async write(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    const id = this._generateId();
    const embedding = entry.embedding || await this._generateEmbedding(entry.content);

    const point: QdrantPoint = {
      id,
      vector: embedding,
      payload: {
        content: entry.content,
        metadata: entry.metadata,
        timestamp: entry.timestamp || Date.now(),
        sessionId: entry.sessionId || this._sessionId,
        tags: entry.tags || [],
        importance: entry.importance || 0.5,
      },
    };

    await this._request('PUT', `/collections/${this._collectionName}/points`, {
      points: [point],
    });

    return { id, ...entry };
  }

  /**
   * Delete a memory entry.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this._request('DELETE', `/collections/${this._collectionName}/points/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Health & Stats
  // ─────────────────────────────────────────────────────────────

  async checkHealth(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    try {
      const response = await this._request('GET', '/collections');
      return {
        name: this.name,
        healthy: Boolean(response.result),
        latency: Date.now() - start,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
      };
    } catch (error) {
      return {
        name: this.name,
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        lastCheck: Date.now(),
        consecutiveFailures: 1,
      };
    }
  }

  async getStats(): Promise<MemoryStats> {
    try {
      const response = await this._request('GET', `/collections/${this._collectionName}`);
      const collectionInfo = response.result as { points_count: number } | undefined;
      return {
        totalEntries: collectionInfo?.points_count || 0,
        sessionsCount: 0,
      };
    } catch {
      return { totalEntries: 0, sessionsCount: 0 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────

  private async _ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      await this._request('GET', `/collections/${this._collectionName}`);
    } catch {
      // Create collection
      await this._request('PUT', '/collections/' + this._collectionName, {
        vectors: {
          size: this._vectorSize,
          distance: this._distance,
        },
      });
    }
  }

  private async _request(
    method: string, 
    path: string, 
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const url = `${this._baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = this._config.apiKey || process.env.QDRANT_API_KEY;
    if (apiKey) {
      headers['api-key'] = apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Qdrant API error ${response.status}: ${error}`);
      }

      return (await response.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async _generateEmbedding(text: string): Promise<number[]> {
    // In production, this would call an embedding API
    // For now, return a mock embedding
    // TODO: Integrate with configured embedder (OpenAI, local, etc.)
    const dimension = this._vectorSize;
    const embedding = new Array(dimension).fill(0);
    
    // Simple hash-based pseudo-embedding for demo
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Deterministic pseudo-random based on hash
    const seed = Math.abs(hash);
    for (let i = 0; i < dimension; i++) {
      const x = Math.sin(seed + i) * 10000;
      embedding[i] = x - Math.floor(x);
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / magnitude);
  }

  private _generateId(): string {
    return `qdrant_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Tool Handlers
  // ─────────────────────────────────────────────────────────────

  private async _handleSearch(args: Record<string, unknown>): Promise<string> {
    const result = await this.search({
      query: args.query as string,
      limit: args.limit as number,
      tags: args.tags as string[],
      sessionId: args.sessionId as string,
    });

    return JSON.stringify({
      success: true,
      entries: result.entries,
      totalCount: result.totalCount,
    });
  }

  private async _handleAdd(args: Record<string, unknown>): Promise<string> {
    const entry = await this.write({
      content: args.content as string,
      metadata: {},
      timestamp: Date.now(),
      sessionId: this._sessionId,
      tags: args.tags as string[],
      importance: args.importance as number,
    });

    return JSON.stringify({
      success: true,
      id: entry.id,
    });
  }

  private async _handleDelete(args: Record<string, unknown>): Promise<string> {
    const deleted = await this.delete(args.id as string);
    return JSON.stringify({
      success: deleted,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle Hooks
  // ─────────────────────────────────────────────────────────────

  async shutdown(): Promise<void> {
    // No persistent connections to close for REST client
    this._initialized = false;
  }
}
