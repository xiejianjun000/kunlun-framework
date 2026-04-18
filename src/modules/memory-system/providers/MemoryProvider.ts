/**
 * OpenTaiji Memory System - MemoryProvider Abstract Base Class
 * 
 * Defines the interface for pluggable memory providers.
 * 基于OpenTaiji Memory架构设计.
 * 
 * Architecture:
 * - Built-in memory (MEMORY.md/USER.md) is always active, not removable
 * - External providers are additive, one at a time
 * - All providers receive lifecycle events via MemoryManager orchestration
 * 
 * @module memory-system/providers/MemoryProvider
 */

import type {
  ProviderName,
  SessionKey,
  SessionContext,
  ToolSchema,
  ToolCallResult,
  ConfigField,
  MemorySearchResult,
  MemorySearchOptions,
  MemoryEntry,
  CompressionContext,
  DelegationContext,
  MemoryWriteEvent,
  ProviderHealthStatus,
  MemoryStats,
  EventHandler,
  ProviderEvent,
} from './types';

/**
 * Abstract base class for memory providers.
 * 
 * External memory backends (Qdrant, LanceDB, etc.) implement this interface
 * and register via the plugin system.
 * 
 * Key Design Principles:
 * 1. Built-in memory is always active as the first provider
 * 2. Only ONE external provider runs at a time (prevents tool schema bloat)
 * 3. sync_turn() MUST be non-blocking
 * 4. Profile isolation via openTaijiHome in initialize()
 */
export abstract class MemoryProvider {
  /** Provider identifier (e.g., 'qdrant', 'lancedb', 'builtin') */
  abstract readonly name: ProviderName;

  // ─────────────────────────────────────────────────────────────
  // Required Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if this provider is available.
   * 
   * Called during agent init to decide whether to activate.
   * MUST NOT make network calls — just check config and deps.
   */
  abstract isAvailable(): boolean;

  /**
   * Initialize for a session.
   * 
   * Called once at agent startup. May create connections,
   * create resources (collections, tables), warm up cache, etc.
   * 
   * @param sessionId - Current session identifier
   * @param context - Session context with platform, user info, etc.
   */
  abstract initialize(sessionId: SessionKey, context: SessionContext): void | Promise<void>;

  /**
   * Return tool schemas this provider exposes.
   * 
   * Each schema follows OpenAI function calling format.
   * Return empty array if no tools (context-only provider).
   */
  abstract getToolSchemas(): ToolSchema[];

  /**
   * Handle a tool call for one of this provider's tools.
   * 
   * Only called for tool names returned by getToolSchemas().
   * Must return a JSON string (the tool result).
   * 
   * @param toolName - Name of the tool to handle
   * @param args - Tool arguments
   * @returns JSON string result
   */
  abstract handleToolCall(
    toolName: string, 
    args: Record<string, unknown>
  ): string | Promise<string>;

  // ─────────────────────────────────────────────────────────────
  // Configuration Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Return config fields this provider needs for setup.
   * 
   * Used by 'memory setup' wizard to walk user through configuration.
   * 
   * @returns Array of config field definitions
   */
  getConfigSchema(): ConfigField[] {
    return [];
  }

  /**
   * Write non-secret config to provider's native location.
   * 
   * Called by 'memory setup' after collecting inputs.
   * Secrets go to .env automatically.
   * 
   * @param values - Non-secret config values
   * @param openTaijiHome - Profile-scoped storage root
   */
  saveConfig(values: Record<string, unknown>, openTaijiHome: string): void {
    // Default: no-op for providers using only env vars
  }

  // ─────────────────────────────────────────────────────────────
  // Optional Lifecycle Hooks
  // ─────────────────────────────────────────────────────────────

  /**
   * Return text to include in system prompt.
   * 
   * For STATIC provider info (instructions, status).
   * Dynamic recall context goes through prefetch() instead.
   */
  systemPromptBlock(): string {
    return '';
  }

  /**
   * Recall relevant context for the upcoming turn.
   * 
   * Called before each API call. Should be fast — use background
   * threads for actual recall, return cached results here.
   * 
   * @param query - Search query string
   * @param sessionId - Current session (for multi-session providers)
   */
  prefetch(query: string, sessionId?: SessionKey): string | Promise<string> {
    return '';
  }

  /**
   * Queue background recall for the NEXT turn.
   * 
   * Called after each turn completes. Result consumed by prefetch()
   * on next turn. Providers doing background prefetching should override.
   */
  queuePrefetch(query: string, sessionId?: SessionKey): void {
    // Default: no-op
  }

  /**
   * Persist a completed turn to backend.
   * 
   * MUST be non-blocking — queue for background processing if backend
   * has latency. All network I/O should use daemon threads.
   * 
   * @param userContent - User message content
   * @param assistantContent - Assistant response content
   * @param sessionId - Current session
   */
  syncTurn(
    userContent: string, 
    assistantContent: string, 
    sessionId?: SessionKey
  ): void | Promise<void> {
    // Default: no-op
  }

  /**
   * Called at the start of each turn.
   * 
   * Use for turn-counting, scope management, periodic maintenance.
   * 
   * @param turnNumber - Current turn number
   * @param message - User message
   * @param kwargs - Additional context (remainingTokens, model, platform, etc.)
   */
  onTurnStart(
    turnNumber: number, 
    message: string, 
    kwargs?: Record<string, unknown>
  ): void {
    // Default: no-op
  }

  /**
   * Called when a session ends (explicit exit or timeout).
   * 
   * Use for end-of-session extraction, summarization.
   * NOT called after every turn — only at session boundaries.
   * 
   * @param messages - Full conversation history
   */
  onSessionEnd(messages: Array<{role: string; content: string}>): void | Promise<void> {
    // Default: no-op
  }

  /**
   * Called before context compression discards old messages.
   * 
   * Extract insights from messages about to be compressed.
   * Returned text is included in compression summary prompt.
   */
  onPreCompress(context: CompressionContext): string {
    return '';
  }

  /**
   * Called when built-in memory tool writes an entry.
   * 
   * Mirror built-in memory writes to external backend.
   */
  onMemoryWrite(event: MemoryWriteEvent): void {
    // Default: no-op
  }

  /**
   * Called on PARENT agent when subagent completes.
   * 
   * Parent's memory provider observes the task+result pair.
   * Subagent itself has no provider session (skip_memory=True).
   */
  onDelegation(context: DelegationContext): void {
    // Default: no-op
  }

  /**
   * Clean shutdown — flush queues, close connections.
   */
  shutdown(): void | Promise<void> {
    // Default: no-op
  }

  // ─────────────────────────────────────────────────────────────
  // Health & Statistics
  // ─────────────────────────────────────────────────────────────

  /**
   * Check provider health status.
   * 
   * May include latency measurement, connectivity check.
   */
  async checkHealth(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    try {
      const available = this.isAvailable();
      return {
        name: this.name,
        healthy: available,
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

  /**
   * Get memory statistics for this provider.
   */
  async getStats(): Promise<MemoryStats> {
    return {
      totalEntries: 0,
      sessionsCount: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Direct Memory Operations (for built-in provider)
  // ─────────────────────────────────────────────────────────────

  /**
   * Search memory entries.
   * 
   * Default implementation using search options.
   * Providers can override for optimized queries.
   */
  async search(options: MemorySearchOptions): Promise<MemorySearchResult> {
    return {
      entries: [],
      totalCount: 0,
    };
  }

  /**
   * Read a single memory entry by ID.
   */
  async read(id: string): Promise<MemoryEntry | null> {
    return null;
  }

  /**
   * Write a memory entry.
   */
  async write(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    throw new Error('Not implemented');
  }

  /**
   * Delete a memory entry.
   */
  async delete(id: string): Promise<boolean> {
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // Event System
  // ─────────────────────────────────────────────────────────────

  private _eventHandlers: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribe to provider events.
   */
  on(event: ProviderEvent['type'], handler: EventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, []);
    }
    this._eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unsubscribe from provider events.
   */
  off(event: ProviderEvent['type'], handler: EventHandler): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit a provider event.
   */
  protected emit(event: ProviderEvent): void {
    const handlers = this._eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            result.catch(console.error);
          }
        } catch (error) {
          console.error(`Event handler error for ${event.type}:`, error);
        }
      }
    }
  }
}

/**
 * Built-in memory provider identifier.
 */
export const BUILTIN_PROVIDER_NAME = 'builtin';

/**
 * Check if provider is the built-in one.
 */
export function isBuiltinProvider(provider: MemoryProvider): boolean {
  return provider.name === BUILTIN_PROVIDER_NAME;
}
