/**
 * MemoryConsolidator - 记忆整合器
 * 
 * 负责将短期记忆晋升到长期记忆的核心逻辑
 * 
 * @see https://github.com/opensatoru/openclaw/docs/concepts/dreaming.md
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  PromotionCandidate,
  ShortTermRecallEntry,
  PhaseSignalEntry,
  PhaseSignalStore,
  ConsolidateOptions,
  ConsolidateResult,
  ShortTermAuditSummary,
  ShortTermAuditIssue,
} from './types';
import { SevenSignalScorer } from './SevenSignalScorer';
import { DEFAULT_PROMOTION_WEIGHTS } from './types';

// ============== 常量 ==============

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RECENCY_HALF_LIFE_DAYS = 14;
const DEFAULT_PROMOTION_MIN_SCORE = 0.75;
const DEFAULT_PROMOTION_MIN_RECALL_COUNT = 3;
const DEFAULT_PROMOTION_MIN_UNIQUE_QUERIES = 2;

const SHORT_TERM_STORE_RELATIVE_PATH = path.join('memory', '.dreams', 'short-term-recall.json');
const SHORT_TERM_PHASE_SIGNAL_RELATIVE_PATH = path.join('memory', '.dreams', 'phase-signals.json');
const SHORT_TERM_LOCK_RELATIVE_PATH = path.join('memory', '.dreams', 'short-term-promotion.lock');
const MEMORY_FILE_NAME = 'MEMORY.md';

const MAX_QUERY_HASHES = 32;
const MAX_RECALL_DAYS = 16;
const SHORT_TERM_LOCK_WAIT_TIMEOUT_MS = 10_000;
const SHORT_TERM_LOCK_STALE_MS = 60_000;
const SHORT_TERM_LOCK_RETRY_DELAY_MS = 40;

const PROMOTION_MARKER_PREFIX = 'openclaw-memory-promotion:';

// ============== 类型定义 ==============

interface ShortTermRecallStore {
  version: 1;
  updatedAt: string;
  entries: Record<string, ShortTermRecallEntry>;
}

// ============== 存储路径解析 ==============

export function resolveStorePath(workspaceDir: string): string {
  return path.join(workspaceDir, SHORT_TERM_STORE_RELATIVE_PATH);
}

export function resolvePhaseSignalPath(workspaceDir: string): string {
  return path.join(workspaceDir, SHORT_TERM_PHASE_SIGNAL_RELATIVE_PATH);
}

export function resolveLockPath(workspaceDir: string): string {
  return path.join(workspaceDir, SHORT_TERM_LOCK_RELATIVE_PATH);
}

export function resolveMemoryPath(workspaceDir: string): string {
  return path.join(workspaceDir, MEMORY_FILE_NAME);
}

// ============== 存储操作 ==============

async function readStore(workspaceDir: string, nowIso: string): Promise<ShortTermRecallStore> {
  const storePath = resolveStorePath(workspaceDir);
  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    if (raw.trim().length === 0) {
      return emptyStore(nowIso);
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStore(parsed, nowIso);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return emptyStore(nowIso);
    }
    throw err;
  }
}

async function writeStore(workspaceDir: string, store: ShortTermRecallStore): Promise<void> {
  const storePath = resolveStorePath(workspaceDir);
  await ensureDir(workspaceDir);
  await fs.writeFile(storePath, JSON.stringify(store, null, 2) + '\n', 'utf-8');
}

async function readPhaseSignalStore(workspaceDir: string, nowIso: string): Promise<PhaseSignalStore> {
  const signalPath = resolvePhaseSignalPath(workspaceDir);
  try {
    const raw = await fs.readFile(signalPath, 'utf-8');
    if (raw.trim().length === 0) {
      return emptyPhaseSignalStore(nowIso);
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizePhaseSignalStore(parsed, nowIso);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return emptyPhaseSignalStore(nowIso);
    }
    throw err;
  }
}

async function writePhaseSignalStore(workspaceDir: string, store: PhaseSignalStore): Promise<void> {
  const signalPath = resolvePhaseSignalPath(workspaceDir);
  await ensureDir(workspaceDir);
  await fs.writeFile(signalPath, JSON.stringify(store, null, 2) + '\n', 'utf-8');
}

async function ensureDir(workspaceDir: string): Promise<void> {
  const dir = path.join(workspaceDir, 'memory', '.dreams');
  await fs.mkdir(dir, { recursive: true });
}

// ============== 存储规范化 ==============

function emptyStore(nowIso: string): ShortTermRecallStore {
  return {
    version: 1,
    updatedAt: nowIso,
    entries: {},
  };
}

function emptyPhaseSignalStore(nowIso: string): PhaseSignalStore {
  return {
    version: 1,
    updatedAt: nowIso,
    entries: {},
  };
}

function normalizeStore(parsed: unknown, nowIso: string): ShortTermRecallStore {
  if (typeof parsed !== 'object' || parsed === null) {
    return emptyStore(nowIso);
  }
  
  const record = parsed as Record<string, unknown>;
  
  if (record.version !== 1) {
    return emptyStore(nowIso);
  }
  
  const entries: Record<string, ShortTermRecallEntry> = {};
  const rawEntries = record.entries as Record<string, unknown> | undefined;
  
  if (rawEntries && typeof rawEntries === 'object') {
    for (const [key, entry] of Object.entries(rawEntries)) {
      if (isValidRecallEntry(entry)) {
        entries[key] = normalizeRecallEntry(entry);
      }
    }
  }
  
  return {
    version: 1,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : nowIso,
    entries,
  };
}

function normalizePhaseSignalStore(parsed: unknown, nowIso: string): PhaseSignalStore {
  if (typeof parsed !== 'object' || parsed === null) {
    return emptyPhaseSignalStore(nowIso);
  }
  
  const record = parsed as Record<string, unknown>;
  
  if (record.version !== 1) {
    return emptyPhaseSignalStore(nowIso);
  }
  
  const entries: Record<string, PhaseSignalEntry> = {};
  const rawEntries = record.entries as Record<string, unknown> | undefined;
  
  if (rawEntries && typeof rawEntries === 'object') {
    for (const [key, entry] of Object.entries(rawEntries)) {
      if (isValidPhaseSignalEntry(entry)) {
        entries[key] = normalizePhaseSignalEntry(entry);
      }
    }
  }
  
  return {
    version: 1,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : nowIso,
    entries,
  };
}

function isValidRecallEntry(entry: unknown): entry is ShortTermRecallEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.key === 'string' &&
    typeof e.snippet === 'string' &&
    typeof e.recallCount === 'number'
  );
}

function normalizeRecallEntry(entry: ShortTermRecallEntry): ShortTermRecallEntry {
  return {
    key: entry.key,
    path: entry.path ?? '',
    startLine: Math.max(0, Math.floor(entry.startLine ?? 0)),
    endLine: Math.max(0, Math.floor(entry.endLine ?? 0)),
    source: entry.source ?? 'memory',
    snippet: entry.snippet ?? '',
    recallCount: Math.max(0, Math.floor(entry.recallCount ?? 0)),
    dailyCount: Math.max(0, Math.floor(entry.dailyCount ?? 0)),
    groundedCount: Math.max(0, Math.floor(entry.groundedCount ?? 0)),
    totalScore: entry.totalScore ?? 0,
    maxScore: entry.maxScore ?? 1,
    firstRecalledAt: entry.firstRecalledAt ?? new Date().toISOString(),
    lastRecalledAt: entry.lastRecalledAt ?? new Date().toISOString(),
    queryHashes: (entry.queryHashes ?? []).slice(0, MAX_QUERY_HASHES),
    recallDays: mergeRecentDistinct(entry.recallDays ?? [], entry.lastRecalledAt ?? '', MAX_RECALL_DAYS),
    conceptTags: entry.conceptTags ?? [],
    claimHash: entry.claimHash,
    promotedAt: entry.promotedAt,
  };
}

function isValidPhaseSignalEntry(entry: unknown): entry is PhaseSignalEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return typeof e.key === 'string';
}

function normalizePhaseSignalEntry(entry: PhaseSignalEntry): PhaseSignalEntry {
  return {
    key: entry.key,
    lightHits: Math.max(0, Math.floor(entry.lightHits ?? 0)),
    remHits: Math.max(0, Math.floor(entry.remHits ?? 0)),
    lastLightAt: entry.lastLightAt,
    lastRemAt: entry.lastRemAt,
  };
}

function mergeRecentDistinct(
  days: string[],
  fallbackDay: string,
  maxDays: number
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const day of days) {
    if (seen.has(day)) continue;
    seen.add(day);
    result.push(day);
  }
  
  if (fallbackDay && !seen.has(fallbackDay.slice(0, 10))) {
    result.push(fallbackDay.slice(0, 10));
  }
  
  return result.slice(-maxDays);
}

// ============== 整合逻辑 ==============

/**
 * 整合短期记忆到长期记忆
 */
export async function consolidateMemory(
  options: ConsolidateOptions
): Promise<ConsolidateResult> {
  const workspaceDir = options.workspaceDir;
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const memoryPath = resolveMemoryPath(workspaceDir);
  
  const minScore = options.minScore ?? DEFAULT_PROMOTION_MIN_SCORE;
  const minRecallCount = options.minRecallCount ?? DEFAULT_PROMOTION_MIN_RECALL_COUNT;
  const minUniqueQueries = options.minUniqueQueries ?? DEFAULT_PROMOTION_MIN_UNIQUE_QUERIES;
  const maxAgeDays = options.maxAgeDays ?? Infinity;
  const limit = options.limit ?? Infinity;
  
  // 过滤符合条件的候选
  const eligible = options.candidates
    .filter(c => !c.promotedAt)
    .filter(c => c.score >= minScore)
    .filter(c => c.recallCount >= minRecallCount)
    .filter(c => c.uniqueQueries >= minUniqueQueries)
    .filter(c => c.ageDays <= maxAgeDays)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  if (eligible.length === 0) {
    return {
      memoryPath,
      applied: 0,
      appended: 0,
      reconciledExisting: 0,
      appliedCandidates: [],
    };
  }
  
  // 读取现有长期记忆
  let existingMemory = '';
  try {
    existingMemory = await fs.readFile(memoryPath, 'utf-8');
  } catch {
    existingMemory = '';
  }
  
  const existingMarkers = extractPromotionMarkers(existingMemory);
  const alreadyWritten = eligible.filter(c => existingMarkers.has(c.key));
  const toAppend = eligible.filter(c => !existingMarkers.has(c.key));
  
  let appended = 0;
  if (toAppend.length > 0) {
    const header = existingMemory.trim().length > 0 ? '' : '# Long-Term Memory\n\n';
    const section = buildPromotionSection(toAppend, nowMs, options.timezone);
    await fs.writeFile(
      memoryPath,
      `${header}${withTrailingNewline(existingMemory)}${section}`,
      'utf-8'
    );
    appended = toAppend.length;
  }
  
  return {
    memoryPath,
    applied: eligible.length,
    appended,
    reconciledExisting: alreadyWritten.length,
    appliedCandidates: eligible,
  };
}

/**
 * 读取短期记忆条目
 */
export async function readShortTermRecallEntries(
  workspaceDir: string,
  nowMs?: number
): Promise<ShortTermRecallEntry[]> {
  const nowIso = new Date(nowMs ?? Date.now()).toISOString();
  const store = await readStore(workspaceDir, nowIso);
  return Object.values(store.entries);
}

/**
 * 读取阶段信号
 */
export async function readPhaseSignals(
  workspaceDir: string,
  nowMs?: number
): Promise<Map<string, PhaseSignalEntry>> {
  const nowIso = new Date(nowMs ?? Date.now()).toISOString();
  const store = await readPhaseSignalStore(workspaceDir, nowIso);
  return new Map(Object.entries(store.entries));
}

/**
 * 记录梦境阶段信号
 */
export async function recordDreamingPhaseSignals(
  workspaceDir: string,
  phase: 'light' | 'rem',
  keys: string[],
  nowMs?: number
): Promise<void> {
  const nowIso = new Date(nowMs ?? Date.now()).toISOString();
  const store = await readPhaseSignalStore(workspaceDir, nowIso);
  
  for (const key of keys) {
    const entry = store.entries[key] ?? {
      key,
      lightHits: 0,
      remHits: 0,
    };
    
    if (phase === 'light') {
      entry.lightHits += 1;
      entry.lastLightAt = nowIso;
    } else {
      entry.remHits += 1;
      entry.lastRemAt = nowIso;
    }
    
    store.entries[key] = entry;
  }
  
  store.updatedAt = nowIso;
  await writePhaseSignalStore(workspaceDir, store);
}

/**
 * 获取晋升候选条目（已评分的）
 */
export async function getPromotionCandidates(
  workspaceDir: string,
  options: {
    minScore?: number;
    minRecallCount?: number;
    minUniqueQueries?: number;
    maxAgeDays?: number;
    limit?: number;
    nowMs?: number;
  } = {}
): Promise<PromotionCandidate[]> {
  const nowMs = options.nowMs ?? Date.now();
  
  // 读取短期记忆和阶段信号
  const [entries, phaseSignals] = await Promise.all([
    readShortTermRecallEntries(workspaceDir, nowMs),
    readPhaseSignals(workspaceDir, nowMs),
  ]);
  
  // 过滤未晋升的条目
  const eligible = entries.filter(e => !e.promotedAt);
  
  // 使用7信号评分器进行评分和排序
  return SevenSignalScorer.rankCandidates(
    eligible,
    phaseSignals,
    DEFAULT_PROMOTION_WEIGHTS,
    {
      ...options,
      nowMs,
    }
  );
}

// ============== 辅助函数 ==============

function extractPromotionMarkers(content: string): Set<string> {
  const markers = new Set<string>();
  const regex = new RegExp(`${PROMOTION_MARKER_PREFIX}[^\\s\\n]+`, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    markers.add(match[0]);
  }
  return markers;
}

function buildPromotionSection(
  candidates: PromotionCandidate[],
  nowMs: number,
  timezone?: string
): string {
  const date = formatDate(new Date(nowMs), timezone);
  const lines: string[] = [
    `## Promoted on ${date}`,
    '',
  ];
  
  for (const candidate of candidates) {
    const marker = `${PROMOTION_MARKER_PREFIX}${candidate.key}`;
    lines.push(`<!-- ${marker} -->`);
    lines.push(`- ${candidate.snippet}`);
    lines.push(`  - source: ${candidate.path}:${candidate.startLine}-${candidate.endLine}`);
    lines.push(`  - score: ${candidate.score.toFixed(3)} (f=${candidate.components.frequency.toFixed(2)}, r=${candidate.components.relevance.toFixed(2)}, d=${candidate.components.diversity.toFixed(2)}, rec=${candidate.components.recency.toFixed(2)}, c=${candidate.components.consolidation.toFixed(2)}, ct=${candidate.components.conceptual.toFixed(2)})`);
    lines.push('');
  }
  
  return lines.join('\n') + '\n';
}

function formatDate(date: Date, timezone?: string): string {
  if (timezone) {
    try {
      return date.toLocaleString('zh-CN', { timeZone: timezone });
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }
  return date.toISOString().slice(0, 10);
}

function withTrailingNewline(str: string): string {
  return str.endsWith('\n') ? str : str + '\n';
}

// ============== 审核功能 ==============

export async function auditShortTermPromotion(
  workspaceDir: string
): Promise<ShortTermAuditSummary> {
  const storePath = resolveStorePath(workspaceDir);
  const lockPath = resolveLockPath(workspaceDir);
  const issues: ShortTermAuditIssue[] = [];
  let exists = false;
  let entryCount = 0;
  let promotedCount = 0;
  let spacedEntryCount = 0;
  let conceptTaggedEntryCount = 0;
  let invalidEntryCount = 0;
  let updatedAt: string | undefined;
  
  try {
    const raw = await fs.readFile(storePath, 'utf-8');
    exists = true;
    if (raw.trim().length === 0) {
      issues.push({
        severity: 'warn',
        code: 'recall-store-empty',
        message: 'Short-term recall store is empty.',
        fixable: true,
      });
    } else {
      const nowIso = new Date().toISOString();
      const parsed = JSON.parse(raw) as unknown;
      const store = normalizeStore(parsed, nowIso);
      updatedAt = store.updatedAt;
      entryCount = Object.keys(store.entries).length;
      promotedCount = Object.values(store.entries).filter(e => Boolean(e.promotedAt)).length;
      spacedEntryCount = Object.values(store.entries).filter(
        e => (e.recallDays?.length ?? 0) > 1
      ).length;
      conceptTaggedEntryCount = Object.values(store.entries).filter(
        e => (e.conceptTags?.length ?? 0) > 0
      ).length;
      const rawEntries = (parsed as Record<string, unknown>)?.entries as Record<string, unknown> | undefined;
      invalidEntryCount = Object.keys(rawEntries ?? {}).length - entryCount;
      if (invalidEntryCount > 0) {
        issues.push({
          severity: 'warn',
          code: 'recall-store-invalid',
          message: `Short-term recall store contains ${invalidEntryCount} invalid entries.`,
          fixable: true,
        });
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      issues.push({
        severity: 'error',
        code: 'recall-store-unreadable',
        message: `Short-term recall store is unreadable: ${code ?? 'error'}.`,
        fixable: false,
      });
    }
  }
  
  try {
    const stat = await fs.stat(lockPath);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs > SHORT_TERM_LOCK_STALE_MS) {
      issues.push({
        severity: 'warn',
        code: 'recall-lock-stale',
        message: 'Short-term promotion lock appears stale.',
        fixable: true,
      });
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      issues.push({
        severity: 'warn',
        code: 'recall-lock-unreadable',
        message: `Short-term promotion lock could not be inspected: ${code ?? 'error'}.`,
        fixable: false,
      });
    }
  }
  
  return {
    storePath,
    lockPath,
    updatedAt,
    exists,
    entryCount,
    promotedCount,
    spacedEntryCount,
    conceptTaggedEntryCount,
    invalidEntryCount,
    issues,
  };
}

// ============== 导出 ==============

export const MemoryConsolidator = {
  // 核心功能
  consolidateMemory,
  readShortTermRecallEntries,
  readPhaseSignals,
  recordDreamingPhaseSignals,
  getPromotionCandidates,
  
  // 审核功能
  auditShortTermPromotion,
  
  // 路径解析
  resolveStorePath,
  resolvePhaseSignalPath,
  resolveLockPath,
  resolveMemoryPath,
};

export default MemoryConsolidator;
