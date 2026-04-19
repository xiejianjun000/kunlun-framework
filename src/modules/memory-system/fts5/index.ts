/**
 * FTS5 Module - Full-Text Search Indexing and Cross-Session Search
 * 
 * Exports all FTS5-related classes and types for the memory system.
 */

export { FTS5Indexer, default as FTS5IndexerDefault } from './FTS5Indexer';
export type { MemoryEntry, SearchResult, IndexStats } from './FTS5Indexer';

export { CrossSessionSearch, createLLMClient } from './CrossSessionSearch';
export type { 
  CrossSessionQuery, 
  SessionContext, 
  SearchResponse,
  LLMClientInterface 
} from './CrossSessionSearch';

export { SessionMemoryStore } from './SessionMemoryStore';
export type { SessionMemory, MemoryConsolidationOptions } from './SessionMemoryStore';
