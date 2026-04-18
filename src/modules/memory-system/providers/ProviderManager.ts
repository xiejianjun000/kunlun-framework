/**
 * OpenTaiji Memory System - Provider Manager
 * 
 * Orchestrates multiple memory providers with automatic failover.
 * 基于OpenTaiji Memory架构设计.
 * 
 * Architecture:
 * - Built-in provider is always present, not removable
 * - Only ONE external provider active at a time
 * - Broadcast notification pattern: all providers receive lifecycle events
 * 
 * @module memory-system/providers/ProviderManager
 */

import type {
  ProviderName,
  SessionKey,
  SessionContext,
  ToolSchema,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryEntry,
  ProviderHealthStatus,
  ProviderEvent,
  ProviderEventType,
  EventHandler,
  FallbackStrategy,
  CompressionContext,
  DelegationContext,
  MemoryWriteEvent,
} from './types';
import { MemoryProvider, BUILTIN_PROVIDER_NAME } from './MemoryProvider';

interface ProviderRegistration {
  provider: MemoryProvider;
  isBuiltin: boolean;
}

interface ManagerConfig {
  enableHealthChecks?: boolean;
  healthCheckInterval?: number; // ms
  enableAutoFailover?: boolean;
  fallbackStrategy?: FallbackStrategy;
}

/**
 * Provider Manager - orchestrates memory providers lifecycle.
 * 
 * Key responsibilities:
 * 1. Register providers (builtin + external)
 * 2. Enforce single external provider limit
 * 3. Broadcast lifecycle events to all providers
 * 4. Handle automatic failover on provider failure
 * 5. Route tool calls to correct provider
 */
export class ProviderManager {
  private _providers: Map<ProviderName, ProviderRegistration> = new Map();
  private _activeExternalProvider: ProviderName | null = null;
  private _sessionId: SessionKey = '';
  private _context: SessionContext | null = null;
  private _config: Required<ManagerConfig>;
  
  // Event handling
  private _eventHandlers: Map<ProviderEventType, EventHandler[]> = new Map();
  private _turnCount: number = 0;
  
  // Health monitoring
  private _healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private _healthStatuses: Map<ProviderName, ProviderHealthStatus> = new Map();

  constructor(config: ManagerConfig = {}) {
    this._config = {
      enableHealthChecks: config.enableHealthChecks ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      enableAutoFailover: config.enableAutoFailover ?? true,
      fallbackStrategy: config.fallbackStrategy ?? { type: 'priority' },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Provider Registration
  // ─────────────────────────────────────────────────────────────

  /**
   * Register a provider with the manager.
   * 
   * Built-in providers are always accepted.
   * External providers are limited to one active at a time.
   */
  addProvider(provider: MemoryProvider): void {
    const isBuiltin = provider.name === BUILTIN_PROVIDER_NAME;
    
    // Enforce single external provider
    if (!isBuiltin) {
      if (this._activeExternalProvider && this._activeExternalProvider !== provider.name) {
        const existing = this._providers.get(this._activeExternalProvider);
        if (existing && !existing.isBuiltin) {
          console.warn(
            `[ProviderManager] Replacing external provider '${this._activeExternalProvider}' with '${provider.name}'`
          );
        }
      }
      this._activeExternalProvider = provider.name;
    }

    this._providers.set(provider.name, { provider, isBuiltin });
    
    this._emit({
      type: 'provider:activated',
      providerName: provider.name,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a provider from the manager.
   * Built-in providers cannot be removed.
   */
  removeProvider(name: ProviderName): boolean {
    const reg = this._providers.get(name);
    if (!reg) return false;
    
    if (reg.isBuiltin) {
      console.warn(`[ProviderManager] Cannot remove built-in provider '${name}'`);
      return false;
    }

    this._providers.delete(name);
    
    if (this._activeExternalProvider === name) {
      this._activeExternalProvider = null;
    }

    this._emit({
      type: 'provider:deactivated',
      providerName: name,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Set the active external provider.
   */
  setActiveProvider(name: ProviderName): boolean {
    const reg = this._providers.get(name);
    if (!reg) {
      console.error(`[ProviderManager] Provider '${name}' not found`);
      return false;
    }

    if (reg.isBuiltin) {
      console.warn(`[ProviderManager] '${name}' is built-in, always active`);
      return true;
    }

    this._activeExternalProvider = name;
    return true;
  }

  /**
   * Get a provider by name.
   */
  getProvider(name: ProviderName): MemoryProvider | undefined {
    return this._providers.get(name)?.provider;
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): MemoryProvider[] {
    return Array.from(this._providers.values()).map(r => r.provider);
  }

  /**
   * Get the active external provider.
   */
  getActiveProvider(): MemoryProvider | null {
    if (!this._activeExternalProvider) return null;
    return this._providers.get(this._activeExternalProvider)?.provider || null;
  }

  /**
   * Get built-in provider.
   */
  getBuiltinProvider(): MemoryProvider | null {
    const reg = this._providers.get(BUILTIN_PROVIDER_NAME);
    return reg?.provider || null;
  }

  // ─────────────────────────────────────────────────────────────
  // Lifecycle Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Initialize all providers for a session.
   */
  async initializeAll(sessionId: SessionKey, context: SessionContext): Promise<void> {
    this._sessionId = sessionId;
    this._context = context;
    this._turnCount = 0;

    // Initialize all registered providers
    const initPromises = Array.from(this._providers.values()).map(async (reg) => {
      try {
        await reg.provider.initialize(sessionId, context);
        console.log(`[ProviderManager] Initialized provider '${reg.provider.name}'`);
      } catch (error) {
        console.error(
          `[ProviderManager] Failed to initialize provider '${reg.provider.name}':`,
          error
        );
        // Don't fail initialization, but mark as unhealthy
      }
    });

    await Promise.allSettled(initPromises);

    // Start health checks if enabled
    if (this._config.enableHealthChecks) {
      this._startHealthChecks();
    }
  }

  /**
   * Get combined tool schemas from all providers.
   */
  getAllToolSchemas(): ToolSchema[] {
    const schemas: ToolSchema[] = [];
    
    for (const reg of this._providers.values()) {
      const providerSchemas = reg.provider.getToolSchemas();
      schemas.push(...providerSchemas);
    }

    return schemas;
  }

  /**
   * Route a tool call to the correct provider.
   */
  async handleToolCall(
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<string> {
    // Find which provider owns this tool
    for (const reg of this._providers.values()) {
      const schemas = reg.provider.getToolSchemas();
      if (schemas.some(s => s.name === toolName)) {
        try {
          const start = Date.now();
          const result = await reg.provider.handleToolCall(toolName, args);
          
          this._emit({
            type: 'memory:written',
            providerName: reg.provider.name,
            timestamp: Date.now(),
            data: { toolName, executionTime: Date.now() - start },
          });

          return result;
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            toolName,
          });
        }
      }
    }

    return JSON.stringify({
      success: false,
      error: `Unknown tool: ${toolName}`,
      toolName,
    });
  }

  /**
   * Get combined system prompt blocks from all providers.
   */
  getSystemPromptBlocks(): string[] {
    const blocks: string[] = [];
    
    for (const reg of this._providers.values()) {
      const block = reg.provider.systemPromptBlock();
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Prefetch context from all providers.
   */
  async prefetchAll(query: string): Promise<string> {
    const contexts: string[] = [];

    for (const reg of this._providers.values()) {
      try {
        const context = await Promise.resolve(reg.provider.prefetch(query, this._sessionId));
        if (context) {
          contexts.push(context);
        }
      } catch (error) {
        console.error(`[ProviderManager] Prefetch failed for ${reg.provider.name}:`, error);
      }
    }

    return contexts.join('\n\n');
  }

  /**
   * Queue background prefetch for next turn.
   */
  queuePrefetchAll(query: string): void {
    for (const reg of this._providers.values()) {
      try {
        reg.provider.queuePrefetch(query, this._sessionId);
      } catch (error) {
        console.error(`[ProviderManager] queuePrefetch failed for ${reg.provider.name}:`, error);
      }
    }
  }

  /**
   * Sync turn to all providers.
   */
  async syncAll(userContent: string, assistantContent: string): Promise<void> {
    const syncPromises = Array.from(this._providers.values()).map(async (reg) => {
      try {
        // Non-blocking sync
        const result = reg.provider.syncTurn(userContent, assistantContent, this._sessionId);
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`[ProviderManager] syncTurn failed for ${reg.provider.name}:`, error);
          });
        }
      } catch (error) {
        console.error(`[ProviderManager] syncTurn error for ${reg.provider.name}:`, error);
      }
    });

    // Don't wait for all syncs to complete
    Promise.allSettled(syncPromises);
  }

  /**
   * Notify turn start to all providers.
   */
  onTurnStart(message: string, kwargs?: Record<string, unknown>): void {
    this._turnCount++;
    
    for (const reg of this._providers.values()) {
      try {
        reg.provider.onTurnStart(this._turnCount, message, {
          ...kwargs,
          sessionId: this._sessionId,
          platform: this._context?.platform,
        });
      } catch (error) {
        console.error(`[ProviderManager] onTurnStart failed for ${reg.provider.name}:`, error);
      }
    }
  }

  /**
   * Notify session end to all providers.
   */
  async onSessionEnd(messages: Array<{role: string; content: string}>): Promise<void> {
    const endPromises = Array.from(this._providers.values()).map(async (reg) => {
      try {
        const result = reg.provider.onSessionEnd(messages);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`[ProviderManager] onSessionEnd failed for ${reg.provider.name}:`, error);
      }
    });

    await Promise.allSettled(endPromises);
  }

  /**
   * Notify pre-compression to all providers.
   */
  async onPreCompress(context: CompressionContext): Promise<string> {
    const extractions: string[] = [];

    for (const reg of this._providers.values()) {
      try {
        const extraction = reg.provider.onPreCompress(context);
        if (extraction) {
          extractions.push(extraction);
        }
      } catch (error) {
        console.error(`[ProviderManager] onPreCompress failed for ${reg.provider.name}:`, error);
      }
    }

    return extractions.join('\n\n');
  }

  /**
   * Notify memory write to all providers.
   */
  onMemoryWrite(event: MemoryWriteEvent): void {
    for (const reg of this._providers.values()) {
      try {
        reg.provider.onMemoryWrite(event);
      } catch (error) {
        console.error(`[ProviderManager] onMemoryWrite failed for ${reg.provider.name}:`, error);
      }
    }
  }

  /**
   * Notify delegation to parent provider.
   */
  onDelegation(context: DelegationContext): void {
    const activeProvider = this.getActiveProvider();
    if (activeProvider) {
      try {
        activeProvider.onDelegation(context);
      } catch (error) {
        console.error(`[ProviderManager] onDelegation failed:`, error);
      }
    }
  }

  /**
   * Shutdown all providers.
   */
  async shutdownAll(): Promise<void> {
    // Stop health checks
    this._stopHealthChecks();

    const shutdownPromises = Array.from(this._providers.values()).map(async (reg) => {
      try {
        const result = reg.provider.shutdown();
        if (result instanceof Promise) {
          await result;
        }
        console.log(`[ProviderManager] Shutdown provider '${reg.provider.name}'`);
      } catch (error) {
        console.error(`[ProviderManager] shutdown failed for ${reg.provider.name}:`, error);
      }
    });

    await Promise.allSettled(shutdownPromises);
    this._providers.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // Health Monitoring & Failover
  // ─────────────────────────────────────────────────────────────

  /**
   * Get health status for all providers.
   */
  getHealthStatuses(): Map<ProviderName, ProviderHealthStatus> {
    return new Map(this._healthStatuses);
  }

  /**
   * Get the best available provider for failover.
   */
  getBestAvailableProvider(): MemoryProvider | null {
    const healthyProviders: Array<{name: ProviderName; health: ProviderHealthStatus}> = [];

    for (const [name, health] of this._healthStatuses) {
      if (health.healthy) {
        healthyProviders.push({ name, health });
      }
    }

    if (healthyProviders.length === 0) {
      return this.getBuiltinProvider();
    }

    // Sort by consecutive failures (ascending) then latency (ascending)
    healthyProviders.sort((a, b) => {
      if (a.health.consecutiveFailures !== b.health.consecutiveFailures) {
        return a.health.consecutiveFailures - b.health.consecutiveFailures;
      }
      return (a.health.latency || Infinity) - (b.health.latency || Infinity);
    });

    return this.getProvider(healthyProviders[0].name) || this.getBuiltinProvider();
  }

  private _startHealthChecks(): void {
    if (this._healthCheckInterval) return;

    this._healthCheckInterval = setInterval(async () => {
      await this._checkAllProviders();
    }, this._config.healthCheckInterval);
  }

  private _stopHealthChecks(): void {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  private async _checkAllProviders(): Promise<void> {
    for (const [name, reg] of this._providers) {
      const previousHealth = this._healthStatuses.get(name);
      
      try {
        const health = await reg.provider.checkHealth();
        this._healthStatuses.set(name, health);

        // Check for health change
        if (previousHealth && previousHealth.healthy !== health.healthy) {
          this._emit({
            type: 'provider:health_changed',
            providerName: name,
            timestamp: Date.now(),
            data: { previous: previousHealth, current: health },
          });

          // Auto-failover if current provider became unhealthy
          if (!health.healthy && this._activeExternalProvider === name) {
            if (this._config.enableAutoFailover) {
              const fallback = this.getBestAvailableProvider();
              if (fallback && fallback.name !== name) {
                console.log(`[ProviderManager] Auto-failover from '${name}' to '${fallback.name}'`);
                this.setActiveProvider(fallback.name);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[ProviderManager] Health check failed for '${name}':`, error);
        
        const failedHealth: ProviderHealthStatus = {
          name,
          healthy: false,
          error: error instanceof Error ? error.message : String(error),
          lastCheck: Date.now(),
          consecutiveFailures: (previousHealth?.consecutiveFailures || 0) + 1,
        };
        
        this._healthStatuses.set(name, failedHealth);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Event System
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to manager events.
   */
  on(event: ProviderEventType, handler: EventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, []);
    }
    this._eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unsubscribe from manager events.
   */
  off(event: ProviderEventType, handler: EventHandler): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private _emit(event: ProviderEvent): void {
    const handlers = this._eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            result.catch(console.error);
          }
        } catch (error) {
          console.error(`[ProviderManager] Event handler error:`, error);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Direct Memory Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Search across all active providers.
   */
  async search(options: MemorySearchOptions): Promise<MemorySearchResult> {
    const results: MemorySearchResult[] = [];

    // Search active external provider
    const activeProvider = this.getActiveProvider();
    if (activeProvider) {
      try {
        const result = await activeProvider.search(options);
        results.push(result);
      } catch (error) {
        console.error(`[ProviderManager] Search failed for '${activeProvider.name}':`, error);
      }
    }

    // Also search built-in
    const builtinProvider = this.getBuiltinProvider();
    if (builtinProvider && builtinProvider !== activeProvider) {
      try {
        const result = await builtinProvider.search(options);
        results.push(result);
      } catch (error) {
        console.error(`[ProviderManager] Search failed for built-in:`, error);
      }
    }

    // Merge results
    const merged: MemoryEntry[] = [];
    const seenIds = new Set<string>();

    for (const r of results) {
      for (const entry of r.entries) {
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id);
          merged.push(entry);
        }
      }
    }

    return {
      entries: merged.slice(0, options.limit || 20),
      totalCount: merged.length,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Built-in Memory Provider (simplified)
// ─────────────────────────────────────────────────────────────

import type * as fs from 'fs';

interface BuiltinMemoryProviderConfig {
  memoryPath?: string;
  userPath?: string;
  openTaijiHome?: string; // Added for profile-scoped storage
}

/**
 * Built-in memory provider using local files.
 * Wraps MEMORY.md and USER.md storage.
 */
export class BuiltinMemoryProvider extends MemoryProvider {
  readonly name = BUILTIN_PROVIDER_NAME;
  
  private _memoryPath: string = '';
  private _userPath: string = '';
  private _sessionId: SessionKey = '';
  private _entries: Map<string, MemoryEntry> = new Map();

  constructor(config: BuiltinMemoryProviderConfig = {}) {
    super();
    // Default paths relative to OPEN_TAIJI_HOME
    this._memoryPath = config.memoryPath || './MEMORY.md';
    this._userPath = config.userPath || './USER.md';
  }

  isAvailable(): boolean {
    return true; // Always available
  }

  async initialize(sessionId: SessionKey, context: SessionContext): Promise<void> {
    this._sessionId = sessionId;
    
    // Load existing entries from files
    await this._loadEntries();
  }

  getToolSchemas(): ToolSchema[] {
    return [
      {
        name: 'memory',
        description: 'Store and retrieve persistent memories across sessions.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['add', 'search', 'replace', 'remove', 'list'],
            },
            content: {
              type: 'string',
              description: 'Memory content',
            },
            query: {
              type: 'string',
              description: 'Search query',
            },
            id: {
              type: 'string',
              description: 'Memory ID for replace/remove',
            },
            target: {
              type: 'string',
              enum: ['memory', 'user'],
              description: 'Which memory store',
            },
          },
          required: ['action'],
        },
      },
    ];
  }

  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<string> {
    if (toolName !== 'memory') {
      return JSON.stringify({ success: false, error: 'Unknown tool' });
    }

    const action = args.action as string;

    switch (action) {
      case 'add':
        return await this._handleAdd(args);
      case 'search':
        return await this._handleSearch(args);
      case 'replace':
        return await this._handleReplace(args);
      case 'remove':
        return await this._handleRemove(args);
      case 'list':
        return await this._handleList(args);
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  }

  systemPromptBlock(): string {
    const count = this._entries.size;
    return count > 0
      ? `# Memory\n${count} entries stored. Use memory tool to access.`
      : `# Memory\nNo entries yet. Use memory(action='add') to store important facts.`;
  }

  async search(options: MemorySearchOptions): Promise<MemorySearchResult> {
    const query = options.query?.toLowerCase() || '';
    
    let entries = Array.from(this._entries.values());

    if (query) {
      entries = entries.filter(e => 
        e.content.toLowerCase().includes(query) ||
        e.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    if (options.sessionId) {
      entries = entries.filter(e => e.sessionId === options.sessionId);
    }

    if (options.since) {
      entries = entries.filter(e => e.timestamp >= options.since!);
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    const offset = options.offset || 0;
    const limit = options.limit || 10;
    const paginated = entries.slice(offset, offset + limit);

    return {
      entries: paginated,
      totalCount: entries.length,
      pagination: {
        hasMore: offset + limit < entries.length,
        nextOffset: offset + limit,
      },
    };
  }

  async write(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    const id = `builtin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullEntry: MemoryEntry = { id, ...entry };
    this._entries.set(id, fullEntry);
    await this._persist();
    return fullEntry;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this._entries.delete(id);
    if (deleted) {
      await this._persist();
    }
    return deleted;
  }

  private async _loadEntries(): Promise<void> {
    // Simplified: would load from actual files
    // For now, start with empty entries
    this._entries.clear();
  }

  private async _persist(): Promise<void> {
    // Would write to MEMORY.md and USER.md files
    // For now, in-memory only
  }

  private async _handleAdd(args: Record<string, unknown>): Promise<string> {
    const entry = await this.write({
      content: args.content as string,
      metadata: {},
      timestamp: Date.now(),
      sessionId: this._sessionId,
      tags: args.tags as string[],
    });

    return JSON.stringify({ success: true, id: entry.id });
  }

  private async _handleSearch(args: Record<string, unknown>): Promise<string> {
    const result = await this.search({
      query: args.query as string,
      limit: args.limit as number,
    });

    return JSON.stringify({
      success: true,
      entries: result.entries,
      totalCount: result.totalCount,
    });
  }

  private async _handleReplace(args: Record<string, unknown>): Promise<string> {
    const id = args.id as string;
    const existing = this._entries.get(id);
    
    if (!existing) {
      return JSON.stringify({ success: false, error: 'Entry not found' });
    }

    existing.content = args.content as string;
    existing.timestamp = Date.now();
    await this._persist();

    return JSON.stringify({ success: true });
  }

  private async _handleRemove(args: Record<string, unknown>): Promise<string> {
    const deleted = await this.delete(args.id as string);
    return JSON.stringify({ success: deleted });
  }

  private async _handleList(args: Record<string, unknown>): Promise<string> {
    const result = await this.search({ limit: args.limit as number });
    return JSON.stringify({
      success: true,
      entries: result.entries,
      totalCount: result.totalCount,
    });
  }

  async shutdown(): Promise<void> {
    await this._persist();
  }
}
