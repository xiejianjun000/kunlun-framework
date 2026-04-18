/**
 * RecallTracker.ts - 召回追踪器
 * 
 * OpenTaiji三阶段记忆整合，实现召回追踪功能：
 * - 追踪每条记忆的recallCount
 * - 追踪uniqueQueries
 * - 追踪recallDays
 * - 持久化到phase-signals.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  ShortTermRecallEntry,
  ShortTermRecallStore,
  PhaseSignalEntry,
  PhaseSignalStore
} from './types';

const STORE_FILE = 'memory/.dreams/short-term-recall.json';
const PHASE_SIGNALS_FILE = 'memory/.dreams/phase-signals.json';
const LOCK_FILE = 'memory/.dreams/short-term-promotion.lock';

const MAX_QUERY_HASHES = 32;
const MAX_RECALL_DAYS = 16;

export interface RecordRecallParams {
  query: string;
  results: Array<{
    path: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
    source: string;
  }>;
  signalType?: 'recall' | 'daily' | 'grounded';
  dedupeByQueryPerDay?: boolean;
  dayBucket?: string;
  nowMs?: number;
  timezone?: string;
}

export interface AuditResult {
  storePath: string;
  lockPath: string;
  exists: boolean;
  entryCount: number;
  promotedCount: number;
  issues: Array<{
    severity: 'warn' | 'error';
    code: string;
    message: string;
    fixable: boolean;
  }>;
}

export class RecallTracker {
  private workspaceDir: string;
  private store: ShortTermRecallStore | null = null;
  private phaseSignals: PhaseSignalStore | null = null;
  private lockPromise: Promise<void> | null = null;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  /**
   * 记录召回事件
   */
  async recordRecall(params: RecordRecallParams): Promise<void> {
    await this.acquireLock();
    
    try {
      await this.loadStore();
      
      const now = new Date(params.nowMs ?? Date.now()).toISOString();
      const dayBucket = params.dayBucket || now.split('T')[0];
      
      for (const result of params.results) {
        const key = this.buildEntryKey(result.path, result.startLine, result.endLine, result.source);
        const existing = this.store!.entries[key];
        
        if (existing) {
          // 更新现有条目
          this.updateExistingEntry(existing, result, params, dayBucket, now);
        } else {
          // 创建新条目
          this.store!.entries[key] = this.createNewEntry(key, result, params, dayBucket, now);
        }
      }
      
      this.store!.updatedAt = now;
      await this.saveStore();
      
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 读取所有召回条目
   */
  async readEntries(): Promise<ShortTermRecallEntry[]> {
    await this.loadStore();
    return Object.values(this.store!.entries);
  }

  /**
   * 读取特定条目
   */
  async readEntry(key: string): Promise<ShortTermRecallEntry | null> {
    await this.loadStore();
    return this.store!.entries[key] || null;
  }

  /**
   * 审计存储状态
   */
  async audit(): Promise<AuditResult> {
    await this.loadStore();
    
    const issues: AuditResult['issues'] = [];
    const storePath = path.join(this.workspaceDir, STORE_FILE);
    
    let entryCount = 0;
    let promotedCount = 0;
    
    for (const entry of Object.values(this.store!.entries)) {
      entryCount++;
      if (entry.promotedAt) promotedCount++;
      
      // 检查数据完整性
      if (!entry.key || !entry.path || entry.startLine <= 0 || entry.endLine < entry.startLine) {
        issues.push({
          severity: 'error',
          code: 'invalid-entry',
          message: `无效条目: ${entry.key}`,
          fixable: true
        });
      }
      
      // 检查过期条目
      const lastRecalledMs = Date.parse(entry.lastRecalledAt);
      if (Number.isFinite(lastRecalledMs)) {
        const ageDays = (Date.now() - lastRecalledMs) / (24 * 60 * 60 * 1000);
        if (ageDays > 90) {
          issues.push({
            severity: 'warn',
            code: 'stale-entry',
            message: `过期条目: ${entry.key} (${ageDays.toFixed(0)}天前)`,
            fixable: true
          });
        }
      }
    }
    
    // 检查锁文件
    const lockPath = path.join(this.workspaceDir, LOCK_FILE);
    let lockExists = false;
    try {
      await fs.access(lockPath);
      lockExists = true;
      
      // 检查锁是否过期
      const lockContent = await fs.readFile(lockPath, 'utf-8');
      const [, timestamp] = lockContent.trim().split(':');
      if (timestamp) {
        const lockAge = Date.now() - parseInt(timestamp, 10);
        if (lockAge > 60000) { // 60秒
          issues.push({
            severity: 'warn',
            code: 'stale-lock',
            message: '发现过期的锁文件',
            fixable: true
          });
        }
      }
    } catch {
      lockExists = false;
    }
    
    return {
      storePath,
      lockPath,
      exists: this.store !== null,
      entryCount,
      promotedCount,
      issues
    };
  }

  /**
   * 修复存储问题
   */
  async repair(): Promise<{ removedInvalidEntries: number; removedStaleLock: boolean }> {
    let removedInvalidEntries = 0;
    let removedStaleLock = false;
    
    // 修复无效条目
    await this.loadStore();
    
    const validKeys: string[] = [];
    for (const [key, entry] of Object.entries(this.store!.entries)) {
      const isValid = 
        entry.key && 
        entry.path && 
        entry.startLine > 0 && 
        entry.endLine >= entry.startLine &&
        typeof entry.snippet === 'string' &&
        entry.snippet.length > 0;
      
      if (!isValid) {
        delete this.store!.entries[key];
        removedInvalidEntries++;
      } else {
        validKeys.push(key);
      }
    }
    
    // 检查过期条目并清理
    const cutoffMs = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90天
    for (const key of validKeys) {
      const entry = this.store!.entries[key];
      const lastRecalledMs = Date.parse(entry.lastRecalledAt);
      
      if (Number.isFinite(lastRecalledMs) && lastRecalledMs < cutoffMs && !entry.promotedAt) {
        delete this.store!.entries[key];
        removedInvalidEntries++;
      }
    }
    
    if (removedInvalidEntries > 0) {
      await this.saveStore();
    }
    
    // 清理过期锁文件
    const lockPath = path.join(this.workspaceDir, LOCK_FILE);
    try {
      const lockContent = await fs.readFile(lockPath, 'utf-8');
      const [, timestamp] = lockContent.trim().split(':');
      
      if (timestamp) {
        const lockAge = Date.now() - parseInt(timestamp, 10);
        if (lockAge > 60000) { // 60秒
          await fs.unlink(lockPath);
          removedStaleLock = true;
        }
      }
    } catch {
      // 锁文件不存在
    }
    
    return { removedInvalidEntries, removedStaleLock };
  }

  /**
   * 标记条目已提升
   */
  async markPromoted(key: string, promotedAt: string): Promise<void> {
    await this.loadStore();
    
    const entry = this.store!.entries[key];
    if (entry) {
      entry.promotedAt = promotedAt;
      await this.saveStore();
    }
  }

  /**
   * 获取召回统计
   */
  async getStats(): Promise<{
    totalEntries: number;
    promotedEntries: number;
    totalRecalls: number;
    uniquePaths: number;
    avgRecallCount: number;
  }> {
    await this.loadStore();
    
    const entries = Object.values(this.store!.entries);
    const paths = new Set<string>();
    let totalRecalls = 0;
    let promotedCount = 0;
    
    for (const entry of entries) {
      paths.add(entry.path);
      totalRecalls += entry.recallCount;
      if (entry.promotedAt) promotedCount++;
    }
    
    return {
      totalEntries: entries.length,
      promotedEntries: promotedCount,
      totalRecalls,
      uniquePaths: paths.size,
      avgRecallCount: entries.length > 0 ? totalRecalls / entries.length : 0
    };
  }

  // ============== 私有方法 ==============

  private async loadStore(): Promise<void> {
    if (this.store) return;
    
    const storePath = path.join(this.workspaceDir, STORE_FILE);
    
    try {
      const raw = await fs.readFile(storePath, 'utf-8');
      const parsed = JSON.parse(raw);
      this.store = this.normalizeStore(parsed);
    } catch (error) {
      // 文件不存在或解析失败
      this.store = {
        version: 1,
        updatedAt: new Date().toISOString(),
        entries: {}
      };
    }
  }

  private async saveStore(): Promise<void> {
    if (!this.store) return;
    
    const storeDir = path.join(this.workspaceDir, 'memory', '.dreams');
    await fs.mkdir(storeDir, { recursive: true });
    
    const storePath = path.join(this.workspaceDir, STORE_FILE);
    const tmpPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;
    
    await fs.writeFile(tmpPath, JSON.stringify(this.store, null, 2), 'utf-8');
    await fs.rename(tmpPath, storePath);
  }

  private normalizeStore(raw: unknown): ShortTermRecallStore {
    if (!raw || typeof raw !== 'object') {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        entries: {}
      };
    }

    const record = raw as Record<string, unknown>;
    const entriesRaw = record.entries as Record<string, unknown> | undefined;
    const entries: ShortTermRecallStore['entries'] = {};

    if (entriesRaw) {
      for (const [key, value] of Object.entries(entriesRaw)) {
        if (!value || typeof value !== 'object') continue;
        
        const entry = value as Record<string, unknown>;
        const snippet = typeof entry.snippet === 'string' 
          ? entry.snippet.trim().replace(/\s+/g, ' ')
          : '';
        
        if (!snippet) continue;
        
        const queryHashes = Array.isArray(entry.queryHashes) 
          ? this.normalizeStrings(entry.queryHashes as string[], MAX_QUERY_HASHES)
          : [];
        
        const recallDays = Array.isArray(entry.recallDays)
          ? this.normalizeStrings(
              (entry.recallDays as string[]).map(d => d.split('T')[0]),
              MAX_RECALL_DAYS
            )
          : [];
        
        const conceptTags = Array.isArray(entry.conceptTags)
          ? this.normalizeStrings(entry.conceptTags as string[], 6)
          : [];
        
        entries[key] = {
          key: key,
          path: typeof entry.path === 'string' ? entry.path : '',
          startLine: Math.max(1, Math.floor(Number(entry.startLine) || 1)),
          endLine: Math.max(1, Math.floor(Number(entry.endLine) || 1)),
          source: entry.source === 'memory' || entry.source === 'session' || entry.source === 'daily'
            ? entry.source
            : 'memory',
          snippet,
          recallCount: Math.max(0, Math.floor(Number(entry.recallCount) || 0)),
          dailyCount: Math.max(0, Math.floor(Number(entry.dailyCount) || 0)),
          groundedCount: Math.max(0, Math.floor(Number(entry.groundedCount) || 0)),
          totalScore: Math.max(0, Number(entry.totalScore) || 0),
          maxScore: Math.max(0, Math.min(1, Number(entry.maxScore) || 0)),
          firstRecalledAt: typeof entry.firstRecalledAt === 'string' 
            ? entry.firstRecalledAt 
            : new Date().toISOString(),
          lastRecalledAt: typeof entry.lastRecalledAt === 'string'
            ? entry.lastRecalledAt
            : new Date().toISOString(),
          queryHashes,
          recallDays,
          conceptTags,
          claimHash: typeof entry.claimHash === 'string' ? entry.claimHash : undefined,
          promotedAt: typeof entry.promotedAt === 'string' ? entry.promotedAt : undefined
        };
      }
    }

    return {
      version: 1,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
      entries
    };
  }

  private normalizeStrings(values: unknown[], limit: number): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      normalized.push(trimmed);
      if (normalized.length >= limit) break;
    }
    
    return normalized;
  }

  private buildEntryKey(
    filePath: string,
    startLine: number,
    endLine: number,
    source: string
  ): string {
    const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    return `${source}:${normalizedPath}:${startLine}:${endLine}`;
  }

  private hashQuery(query: string): string {
    return crypto
      .createHash('sha1')
      .update(query.toLowerCase().trim())
      .digest('hex')
      .slice(0, 12);
  }

  private createNewEntry(
    key: string,
    result: RecordRecallParams['results'][0],
    params: RecordRecallParams,
    dayBucket: string,
    now: string
  ): ShortTermRecallEntry {
    const queryHash = this.hashQuery(params.query);
    
    return {
      key,
      path: result.path,
      startLine: result.startLine,
      endLine: result.endLine,
      source: (result.source || 'memory') as ShortTermRecallEntry['source'],
      snippet: result.snippet.trim().replace(/\s+/g, ' '),
      recallCount: params.signalType === 'recall' ? 1 : 0,
      dailyCount: params.signalType === 'daily' ? 1 : 0,
      groundedCount: params.signalType === 'grounded' ? 1 : 0,
      totalScore: result.score,
      maxScore: result.score,
      firstRecalledAt: now,
      lastRecalledAt: now,
      queryHashes: [queryHash],
      recallDays: [dayBucket],
      conceptTags: this.deriveConceptTags(result.path, result.snippet),
      claimHash: this.buildClaimHash(result.snippet)
    };
  }

  private updateExistingEntry(
    entry: ShortTermRecallEntry,
    result: RecordRecallParams['results'][0],
    params: RecordRecallParams,
    dayBucket: string,
    now: string
  ): void {
    const queryHash = this.hashQuery(params.query);
    
    // 更新计数
    if (params.signalType === 'recall') {
      entry.recallCount++;
    } else if (params.signalType === 'daily') {
      entry.dailyCount++;
    } else if (params.signalType === 'grounded') {
      entry.groundedCount++;
    }
    
    // 更新分数
    entry.totalScore += result.score;
    entry.maxScore = Math.max(entry.maxScore, result.score);
    
    // 更新查询哈希
    if (!entry.queryHashes.includes(queryHash)) {
      entry.queryHashes = [...entry.queryHashes, queryHash].slice(-MAX_QUERY_HASHES);
    }
    
    // 更新回忆天数
    if (!entry.recallDays.includes(dayBucket)) {
      entry.recallDays = [...entry.recallDays, dayBucket].slice(-MAX_RECALL_DAYS);
    }
    
    entry.lastRecalledAt = now;
  }

  private buildClaimHash(snippet: string): string {
    return crypto
      .createHash('sha1')
      .update(snippet.trim().replace(/\s+/g, ' '))
      .digest('hex')
      .slice(0, 12);
  }

  private deriveConceptTags(path: string, snippet: string): string[] {
    const tags: string[] = [];
    
    // 从路径提取
    const parts = path.split(/[/\\]/);
    for (const part of parts) {
      if (part.includes('-') || part.includes('_')) {
        tags.push(...part.split(/[-_]/).filter(p => p.length > 2 && p.length < 20));
      }
    }
    
    // 从内容提取
    const keywords = [
      '环评', '环保', '生态', '碳排', '监测', '污染', '治理',
      '项目', '报告', '审批', '标准', '法规', '政策',
      'ai', 'agent', 'memory', 'skill'
    ];
    
    for (const keyword of keywords) {
      if (snippet.toLowerCase().includes(keyword.toLowerCase())) {
        tags.push(keyword);
      }
    }
    
    return Array.from(new Set(tags)).slice(0, 6);
  }

  private async acquireLock(): Promise<void> {
    if (this.lockPromise) {
      await this.lockPromise;
      return;
    }
    
    const lockDir = path.join(this.workspaceDir, 'memory', '.dreams');
    await fs.mkdir(lockDir, { recursive: true });
    
    const lockPath = path.join(this.workspaceDir, LOCK_FILE);
    const lockContent = `${process.pid}:${Date.now()}\n`;
    
    this.lockPromise = (async () => {
      // 等待锁
      for (let i = 0; i < 100; i++) {
        try {
          await fs.writeFile(lockPath, lockContent, { flag: 'wx' });
          return;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            // 锁已存在，检查是否过期
            try {
              const existing = await fs.readFile(lockPath, 'utf-8');
              const [, timestamp] = existing.trim().split(':');
              if (timestamp) {
                const age = Date.now() - parseInt(timestamp, 10);
                if (age > 60000) {
                  // 锁过期，强制获取
                  await fs.writeFile(lockPath, lockContent, 'utf-8');
                  return;
                }
              }
            } catch {
              // 读取失败，继续等待
            }
            
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, 40));
          } else {
            throw error;
          }
        }
      }
      throw new Error('获取锁超时');
    })();
    
    await this.lockPromise;
  }

  private releaseLock(): void {
    const lockPath = path.join(this.workspaceDir, LOCK_FILE);
    
    this.lockPromise = (async () => {
      try {
        await fs.unlink(lockPath);
      } catch {
        // 忽略错误
      }
      this.lockPromise = null;
    })();
  }
}

export default RecallTracker;
