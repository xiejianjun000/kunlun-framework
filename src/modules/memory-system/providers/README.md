# OpenTaiji Pluggable Memory Provider System

A flexible, extensible memory architecture for AI agents supporting multiple storage backends with automatic failover.

## Overview

The OpenTaiji Memory System implements a **Pluggable Provider Architecture** that allows different memory backends to be used interchangeably.

### Key Design Principles

1. **Dual-layer Memory**: Built-in memory (always active) + External provider (one at a time)
2. **Profile Isolation**: Each profile gets its own storage namespace via `openTaijiHome`
3. **Non-blocking Writes**: `sync_turn()` MUST be non-blocking for performance
4. **Health Monitoring**: Automatic failover when provider becomes unhealthy
5. **Tool Schema Injection**: Providers expose tools via OpenAI function-calling format

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ProviderManager                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              BuiltinMemoryProvider                   │    │
│  │         (MEMORY.md / USER.md - Always On)           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           +                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Active ExternalProvider                    │    │
│  │      (Qdrant | LanceDB | Custom Provider)          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```typescript
import { 
  ProviderManager, 
  BuiltinMemoryProvider,
  QdrantProvider,
  LanceDBProvider,
} from './providers';

// Create manager
const manager = new ProviderManager({
  enableHealthChecks: true,
  healthCheckInterval: 30000,
  enableAutoFailover: true,
});

// Register built-in provider (always present)
manager.addProvider(new BuiltinMemoryProvider());

// Register external provider
manager.addProvider(new QdrantProvider({
  url: 'http://localhost:6333',
  collectionName: 'my_memory',
}));

// Set active external provider
manager.setActiveProvider('qdrant');

// Initialize for session
await manager.initializeAll('session-123', {
  sessionId: 'session-123',
  platform: 'cli',
  openTaijiHome: '/home/user/.opentaiji',
});

// Use memory
const tools = manager.getAllToolSchemas();
const blocks = manager.getSystemPromptBlocks();
const context = await manager.prefetchAll('What was discussed about project X?');

// Handle tool calls
const result = await manager.handleToolCall('qdrant_search', { 
  query: 'project X' 
});

// Sync after turn
await manager.syncAll(userMessage, assistantMessage);

// Shutdown
await manager.shutdownAll();
```

## Provider Interface

All providers must implement the `MemoryProvider` abstract class:

```typescript
abstract class MemoryProvider {
  // Required
  readonly name: ProviderName;
  isAvailable(): boolean;
  initialize(sessionId: SessionKey, context: SessionContext): void;
  getToolSchemas(): ToolSchema[];
  handleToolCall(toolName: string, args: Record<string, unknown>): string;

  // Optional lifecycle hooks
  systemPromptBlock(): string;
  prefetch(query: string, sessionId?: SessionKey): string;
  queuePrefetch(query: string, sessionId?: SessionKey): void;
  syncTurn(userContent: string, assistantContent: string, sessionId?: SessionKey): void;
  onTurnStart(turnNumber: number, message: string, kwargs?: Record<string, unknown>): void;
  onSessionEnd(messages: Array<{role: string; content: string}>): void;
  onPreCompress(context: CompressionContext): string;
  onMemoryWrite(event: MemoryWriteEvent): void;
  onDelegation(context: DelegationContext): void;
  shutdown(): void;
}
```

## Available Providers

### QdrantProvider

Vector-based semantic memory using Qdrant.

```typescript
const provider = new QdrantProvider({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: 'opentaiji_memory',
  vectorSize: 1536,
  distance: 'Cosine',
});
```

**Tools:**
- `qdrant_search` - Semantic search with filters
- `qdrant_add` - Add memory entry
- `qdrant_delete` - Delete by ID

### LanceDBProvider

Cloud-native storage with time-travel queries.

```typescript
const provider = new LanceDBProvider({
  uri: 's3://my-bucket/lancedb',
  tableName: 'opentaiji_memory',
  mode: 'append',
});
```

**Tools:**
- `lancedb_search` - Search with time-range filters
- `lancedb_add` - Add with automatic versioning
- `lancedb_history` - View version history
- `lancedb_restore` - Restore previous version

### BuiltinMemoryProvider

Local file-based memory using MEMORY.md/USER.md.

**Tools:**
- `memory` - CRUD operations for memories

## Automatic Failover

When a provider becomes unhealthy:

1. Health check detects failure
2. `provider:health_changed` event emitted
3. If active provider fails, auto-failover triggers
4. Best available provider selected (by latency, failure count)
5. Operations continue seamlessly

```typescript
manager.on('provider:health_changed', (event) => {
  console.log(`Provider ${event.providerName} health changed:`, event.data);
});
```

## Provider Manager Events

| Event | Description |
|-------|-------------|
| `provider:activated` | Provider registered |
| `provider:deactivated` | Provider removed |
| `provider:health_changed` | Health status changed |
| `provider:error` | Provider error occurred |
| `memory:written` | Memory entry written |
| `memory:read` | Memory entry read |
| `memory:search` | Search performed |
| `memory:deleted` | Memory entry deleted |

## Creating Custom Providers

```typescript
import { MemoryProvider } from './providers/MemoryProvider';
import type { SessionContext, ToolSchema } from './providers/types';

class MyCustomProvider extends MemoryProvider {
  readonly name = 'my_custom';

  isAvailable(): boolean {
    return Boolean(process.env.MY_PROVIDER_URL);
  }

  async initialize(sessionId: string, context: SessionContext): Promise<void> {
    // Connect, create tables, etc.
  }

  getToolSchemas(): ToolSchema[] {
    return [{
      name: 'my_custom_search',
      description: 'Search my custom memory',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    }];
  }

  async handleToolCall(
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<string> {
    // Handle tool calls
    return JSON.stringify({ success: true });
  }
}
```

## Lifecycle Hooks

### Prefetch Pattern

Two-stage recall for low-latency context injection:

```
Turn N Complete
    ↓
queue_prefetch(query) → Background retrieval
    ↓
Turn N+1 Start
    ↓
prefetch(query) → Return cached results
    ↓
Inject into user message
```

### Compression Awareness

Before context compression discards messages:

```typescript
onPreCompress(context: CompressionContext): string {
  // Extract insights from messages about to be compressed
  // Return text to include in compression summary
}
```

### Delegation Handling

When subagent completes:

```typescript
onDelegation(context: DelegationContext): void {
  // Observe what parent delegated and what subagent returned
  // Useful for cross-session knowledge transfer
}
```

## Configuration Schema

Providers define config fields via `getConfigSchema()`:

```typescript
getConfigSchema(): ConfigField[] {
  return [
    {
      key: 'apiKey',
      description: 'API key for the service',
      secret: true,           // Goes to .env
      env_var: 'MY_API_KEY',
      required: true,
    },
    {
      key: 'collectionName',
      description: 'Collection/database name',
      default: 'memory',
    },
    {
      key: 'distance',
      description: 'Similarity metric',
      default: 'Cosine',
      choices: ['Cosine', 'Euclidean', 'Dot'],
    },
  ];
}
```

## Type Definitions

All types are exported from `types.ts`:

- `MemoryEntry` - Core memory structure
- `MemorySearchOptions` / `MemorySearchResult` - Search API
- `MemoryProviderConfig` - Provider configuration
- `ProviderHealthStatus` - Health monitoring
- `SessionContext` - Session metadata
- `ToolSchema` - OpenAI function-calling schema
- `CompressionContext` / `DelegationContext` - Lifecycle hooks

## File Structure

```
src/modules/memory-system/providers/
├── types.ts           # Type definitions and interfaces
├── MemoryProvider.ts  # Abstract base class
├── QdrantProvider.ts  # Vector DB provider
├── LanceDBProvider.ts # Cloud backup provider
├── ProviderManager.ts # Orchestration with failover
└── README.md         # This file
```

## License

MIT
