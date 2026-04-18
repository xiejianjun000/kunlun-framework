# OpenTaiji

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![SQLite FTS5](https://img.shields.io/badge/SQLite-FTS5-003B57.svg)](https://www.sqlite.org/fts5.html)
[![MCP](https://img.shields.io/badge/MCP-28_Tools-green.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **88,696 lines TypeScript · 0 compile errors · 36 tests passing**
>
> Multi-agent framework with SQLite-native graph memory, MCP protocol, and dreaming-based evolution

---

## What makes it different?

| Feature | Traditional Frameworks | OpenTaiji |
|---------|----------------------|-----------|
| Memory | Vector DB (Qdrant/Pinecone) | SQLite FTS5 + Graph |
| Evolution | Manual skill files | Auto-generation from trajectories |
| Personality | Static `.skill` files | Dynamic 5-dimension distillation |
| Concurrency | Shared state | Actor model (1 user = 1 actor) |
| Dependencies | Pinecone, Redis, Kafka... | SQLite only (optional: Qdrant) |

**Architecture choices I made (and why):**

1. **SQLite over Vector DB** — Zero ops, runs anywhere, FTS5 is fast enough for <1M vectors
2. **Actor model over Shared state** — Natural tenant isolation, crash recovery per-user
3. **Dreaming system over Batch training** — 7-signal scorer runs during idle, no GPU needed

---

## Quick Start (30 seconds)

```bash
npm install open-taiji
```

```typescript
import { TaijiFramework } from 'open-taiji';

const taiji = new TaijiFramework({
  multiTenant: { enabled: true },
  memorySystem: { vectorDb: { adapter: 'sqlite' } },  // No Qdrant needed
});

await taiji.initialize();

// Auto-generate skill from successful task
const skill = await taiji.getSkillAutoGenerator().generateFromTrajectory({
  taskId: 'task-001',
  toolCalls: [
    { toolName: 'read_file', arguments: { path: 'data.csv' }, result: '...' },
    { toolName: 'search_web', arguments: { query: 'gdp data' }, result: '...' },
  ],
  success: true,
});
// → Generates: ./skills/data-analysis.skill
```

---

## Core Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| Actor Runtime | 7,458 | N×1 concurrency, supervision tree |
| Memory System | 20,627 | SQLite FTS5 + Graph + Dreaming |
| Skill System | 9,278 | Auto-generation from trajectories |
| Evolution System | 9,499 | 3-layer learning (user→team→org) |
| MCP Client | 2,714 | 28 tools, multi-server support |

**Total: 88,696 lines TypeScript (excluding tests)**

---

## Why I built this

I tried existing multi-agent frameworks. They required:
- Pinecone account + API key
- Redis cluster
- Kafka cluster
- 3+ Docker containers just to run locally

I wanted something that runs anywhere with zero ops:
- **SQLite for everything** — Memory, graph, cache, queue
- **Single process** — No microservices needed
- **Works offline** — No cloud dependencies

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Actor Runtime (L3)                  │
│   1 user = 1 actor, isolated state & memory     │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│           Evolution Layer (L4)                   │
│  Personality · Skills · Memory · Feedback        │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│           SQLite Storage (L5)                    │
│   FTS5 · Graph · KV · Queue (all in one file)   │
└─────────────────────────────────────────────────┘
```

**Key design decisions:**

- **No message queue** — SQLite WAL mode handles concurrency
- **No Redis** — SQLite KV table with TTL support
- **No vector DB** — FTS5 with BM25 ranking + optional Qdrant

---

## Dreaming System

The 7-signal scorer runs during idle time:

```typescript
const signals = {
  userFeedback: 0.3,      // Recent positive/negative feedback
  taskSuccessRate: 0.25,  // Completed vs failed tasks
  knowledgeCoverage: 0.15,// Memory graph node count
  personaConsistency: 0.1,// Behavior matches SOUL.md
  skillUsage: 0.1,        // Skills used recently
  innovationAttempts: 0.05,// New approaches tried
  errorRecovery: 0.05,    // Self-corrections made
};
// → Triggers memory consolidation when score > 0.7
```

---

## MCP Integration

```typescript
// Built-in MCP tools
const tools = [
  'read_file', 'write_file', 'edit_file',
  'search_web', 'fetch_web',
  'bash', 'parse_file',
  // ... 28 total
];

// Custom MCP server
await taiji.getMCPClient().connect({
  name: 'my-server',
  transport: { type: 'stdio', command: 'node mcp-server.js' },
});
```

---

## Personality Distillation (Dynamic vs Static)

**Traditional approach (static):**
```
User data → Extract once → .skill file → Never changes
```

**OpenTaiji approach (dynamic):**
```
User data → 5-dimension profile → Continuous evolution → 3-layer system
```

5 dimensions:
- Communication style
- Decision making
- Learning preference
- Creativity
- Risk tolerance

3-layer evolution:
- **User layer** — Per-conversation learning
- **Team layer** — Aggregated team feedback
- **Org layer** — Compliance rules injection

---

## Benchmarks

| Task | OpenTaiji | With Qdrant | Notes |
|------|-----------|-------------|-------|
| Memory insert (1K) | 45ms | 12ms | SQLite FTS5 |
| Memory search (100 queries) | 89ms | 34ms | BM25 ranking |
| Actor spawn (100 users) | 234ms | — | Per-user isolation |
| Skill generation | 1.2s | — | LLM-assisted pattern extraction |

**Trade-off:** SQLite is slower than Qdrant, but zero ops. For <1M vectors, it's fast enough.

---

## Running Tests

```bash
npm install
npm test
```

Output:
```
Test Suites: 30 passed
Tests:       36 passed
```

---

## Project Stats

| Module | Lines | Tests |
|--------|-------|-------|
| Core (Actor/MCP/Multi-tenant) | 22,837 | 12 suites |
| Modules (Skill/Evolution/Memory) | 53,600 | 18 suites |
| Integrations (MCP Client/GraphMemory) | 5,537 | — |
| Adapters (LLM/Message/Storage) | 6,722 | — |

---

## When to use OpenTaiji

✅ **Use it if:**
- You want zero ops (SQLite-only)
- You need per-user isolation
- You want skills to auto-generate
- You run offline or air-gapped

❌ **Don't use it if:**
- You need >1M vectors with <50ms search (use Qdrant)
- You already have Pinecone/Redis infrastructure
- You need distributed deployment

---

## Installation

```bash
npm install open-taiji

# Optional: Add Qdrant for large-scale vector search
npm install @qdrant/js-client-rest
```

---

## API Examples

### Memory with FTS5

```typescript
const memory = taiji.getMemorySystem();

// Store with auto-indexing
await memory.store({
  content: 'User prefers concise responses',
  metadata: { type: 'preference', userId: 'u-001' },
});

// BM25 search
const results = await memory.search('concise', { limit: 10 });
```

### Graph Memory

```typescript
const graph = taiji.getGraphMemory();

await graph.addNode({ type: 'concept', content: 'Actor Model' });
await graph.addEdge({ from: 'actor-model', to: 'message-passing', type: 'uses' });
const path = await graph.findPath('actor-model', 'distributed-systems');
```

### Skill Auto-Generation

```typescript
const generator = taiji.getSkillAutoGenerator();

// Trigger on successful task
generator.on('skill_generated', (skill) => {
  console.log('New skill:', skill.name);
  // → Saves to ./skills/[skill-name].skill.md
});
```

---

## Contributing

**Architecture decisions I'd love feedback on:**

1. SQLite FTS5 vs Dedicated vector DB — Where's the breaking point?
2. Actor model per-user — Isolation overhead worth it?
3. Dreaming system — Should it run during active hours?

Open issues at: https://github.com/xiejianjun000/open-taiji/issues

---

## Contact

- **Email**: awep000@qq.com
- **GitHub**: https://github.com/xiejianjun000/open-taiji

---

## License

Apache 2.0 — Use it, modify it, ship it.
