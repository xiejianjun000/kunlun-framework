/**
 * OpenTaiji Memory System - Type Definitions
 * 
 * Defines the core types for the pluggable memory provider architecture.
 * 基于OpenTaiji Memory架构设计.
 * 
 * @module memory-system/providers/types
 */

/** Unique identifier for the provider (e.g., 'builtin', 'qdrant', 'lancedb') */
export type ProviderName = string;

/** Session key for memory operations */
export type SessionKey = string;

/** Core memory entry structure */
export interface MemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  tags?: string[];
  importance?: number; // 0-1, auto-calculated or user-specified
  embedding?: number[]; // For vector similarity search
}

/** Search options for memory queries */
export interface MemorySearchOptions {
  query?: string;
  queryEmbedding?: number[];
  sessionId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  minImportance?: number;
  since?: number; // Timestamp threshold
  until?: number;
}

/** Search result with pagination info */
export interface MemorySearchResult {
  entries: MemoryEntry[];
  totalCount: number;
  scores?: number[]; // Similarity scores for embedding search
  pagination?: {
    hasMore: boolean;
    nextOffset: number;
  };
}

/** Provider configuration structure */
export interface MemoryProviderConfig {
  name: ProviderName;
  enabled: boolean;
  priority: number; // Lower = higher priority for failover
  healthCheckInterval?: number; // ms, default 30000
  maxRetries?: number;
  retryDelay?: number; // ms
  connectionTimeout?: number; // ms
  [key: string]: unknown; // Provider-specific config
}

/** Health status for a provider */
export interface ProviderHealthStatus {
  name: ProviderName;
  healthy: boolean;
  latency?: number; // ms
  error?: string;
  lastCheck: number;
  consecutiveFailures: number;
}

/** Memory statistics for a provider */
export interface MemoryStats {
  totalEntries: number;
  sessionsCount: number;
  storageSize?: number; // bytes, if available
  oldestEntry?: number; // timestamp
  newestEntry?: number; // timestamp
}

/** Session context passed to provider initialize() */
export interface SessionContext {
  sessionId: SessionKey;
  platform: 'cli' | 'web' | 'api' | 'cron' | string;
  userId?: string;
  workspace?: string;
  agentIdentity?: string;
  parentSessionId?: string;
  agentContext?: 'primary' | 'subagent' | 'cron' | 'flush';
  openTaijiHome?: string; // Profile-scoped storage root
}

/** Tool call result structure */
export interface ToolCallResult {
  success: boolean;
  result?: string;
  error?: string;
  toolName: string;
  executionTime: number; // ms
}

/** OpenAI function-calling tool schema */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Config field for setup wizard */
export interface ConfigField {
  key: string;
  description: string;
  secret?: boolean; // If true, goes to .env
  required?: boolean;
  default?: string | number | boolean;
  choices?: string[];
  url?: string; // URL where user can get this credential
  env_var?: string; // Explicit env var name
}

/** Provider event types */
export type ProviderEventType = 
  | 'provider:activated'
  | 'provider:deactivated'
  | 'provider:health_changed'
  | 'provider:error'
  | 'memory:written'
  | 'memory:read'
  | 'memory:search'
  | 'memory:deleted';

/** Provider event structure */
export interface ProviderEvent {
  type: ProviderEventType;
  providerName: ProviderName;
  timestamp: number;
  data?: Record<string, unknown>;
}

/** Event handler signature */
export type EventHandler = (event: ProviderEvent) => void | Promise<void>;

/** Fallback strategy for provider failover */
export interface FallbackStrategy {
  type: 'sequential' | 'parallel' | 'priority';
  maxParallel?: number;
  timeout?: number; // ms
}

/** Context for compression events */
export interface CompressionContext {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
  }>;
  remainingTokens?: number;
  model?: string;
  platform?: string;
  toolCount?: number;
}

/** Context for delegation events */
export interface DelegationContext {
  task: string;
  result: string;
  childSessionId: SessionKey;
  timestamp: number;
}

/** Memory write action types */
export type MemoryWriteAction = 'add' | 'replace' | 'remove';

/** Memory write event */
export interface MemoryWriteEvent {
  action: MemoryWriteAction;
  target: 'memory' | 'user';
  content: string;
  oldContent?: string; // For replace action
}

/** Provider capabilities */
export interface ProviderCapabilities {
  toolNames?: string[];
  suppressesLocalWrites?: boolean | Record<string, boolean>;
  supportsEmbedding?: boolean;
  supportsFullTextSearch?: boolean;
  supportsSemanticSearch?: boolean;
}
