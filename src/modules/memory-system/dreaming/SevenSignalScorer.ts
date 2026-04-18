/**
 * SevenSignalScorer - 7信号评分器
 * 
 * 实现 OpenCLAW 的7信号记忆评分算法
 * 
 * 评分公式:
 * score = 0.24*frequency + 0.30*relevance + 0.15*diversity + 
 *         0.15*recency + 0.10*consolidation + 0.06*conceptual + phaseBoost
 * 
 * @see https://github.com/opensatoru/openclaw/docs/concepts/dreaming.md
 */

import type {
  PromotionWeights,
  PromotionComponents,
  PromotionCandidate,
  ShortTermRecallEntry,
  PhaseSignalEntry,
} from './types';
import { DEFAULT_PROMOTION_WEIGHTS } from './types';

// ============== 常量定义 ==============

/** 一天的毫秒数 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** 默认半衰期（14天） */
const DEFAULT_RECENCY_HALF_LIFE_DAYS = 14;

/** 最大查询哈希数量 */
const MAX_QUERY_HASHES = 32;

/** 相位信号 Light 阶段最大增益 */
const PHASE_SIGNAL_LIGHT_BOOST_MAX = 0.06;

/** 相位信号 REM 阶段最大增益 */
const PHASE_SIGNAL_REM_BOOST_MAX = 0.09;

/** 相位信号半衰期（14天） */
const PHASE_SIGNAL_HALF_LIFE_DAYS = 14;

/** 最大概念标签数量（用于归一化） */
const MAX_CONCEPT_TAGS = 5;

/** 默认每日摄入评分 */
const DAILY_INGESTION_SCORE = 0.62;

// ============== 工具函数 ==============

/**
 * 将值限制在 [0, 1] 范围内
 */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * 安全转换为有限数值
 */
function toFiniteScore(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  if (num < 0 || num > 1) {
    return fallback;
  }
  return num;
}

/**
 * 计算总信号数量
 */
export function totalSignalCountForEntry(entry: ShortTermRecallEntry): number {
  const recallCount = Math.max(0, Math.floor(entry.recallCount ?? 0));
  const dailyCount = Math.max(0, Math.floor(entry.dailyCount ?? 0));
  const groundedCount = Math.max(0, Math.floor(entry.groundedCount ?? 0));
  return recallCount + dailyCount + groundedCount;
}

// ============== 信号分量计算 ==============

/**
 * 计算频率分量
 * 
 * 公式: clamp(log(1 + signalCount) / log(11))
 * - 信号数量越多，频率越高
 * - 使用对数归一化，避免线性增长过快
 * - 最大值出现在 signalCount=10 时接近1
 * 
 * @param signalCount 总信号数量
 */
export function calculateFrequencyComponent(signalCount: number): number {
  const count = Math.max(0, signalCount);
  // clamp(log(1 + signalCount) / log(11))
  const raw = Math.log(1 + count) / Math.log(11);
  return clampScore(raw);
}

/**
 * 计算相关性分量
 * 
 * 公式: clamp(totalScore / max(1, signalCount))
 * - 平均每次检索的质量
 * - 反映记忆内容的"重要程度"
 * 
 * @param totalScore 总得分
 * @param signalCount 信号数量
 */
export function calculateRelevanceComponent(totalScore: number, signalCount: number): number {
  const score = toFiniteScore(totalScore, 0);
  const count = Math.max(1, signalCount);
  return clampScore(score / count);
}

/**
 * 计算多样性分量
 * 
 * 公式: 1 - exp(-uniqueQueries / 3)
 * - 衡量不同查询/上下文的多样性
 * - 使用指数衰减，多样性越高越好
 * 
 * @param uniqueQueries 唯一查询数量
 */
export function calculateDiversityComponent(uniqueQueries: number): number {
  const queries = Math.max(0, uniqueQueries);
  // 1 - exp(-uniqueQueries / 3)
  return clampScore(1 - Math.exp(-queries / 3));
}

/**
 * 计算新鲜度分量（基于时间的衰减）
 * 
 * 公式: exp(-λ * ageDays)
 * - 半衰期14天：exp(-0.0495 * ageDays)
 * - 时间越近，分量越高
 * - 符合记忆遗忘曲线
 * 
 * @param ageDays 记忆年龄（天）
 * @param halfLifeDays 半衰期（默认14天）
 */
export function calculateRecencyComponent(
  ageDays: number,
  halfLifeDays: number = DEFAULT_RECENCY_HALF_LIFE_DAYS
): number {
  // λ = ln(2) / halfLifeDays
  const lambda = Math.LN2 / halfLifeDays;
  // exp(-λ * ageDays)
  return clampScore(Math.exp(-lambda * ageDays));
}

/**
 * 计算整合强度分量
 * 
 * 公式: 1 - exp(-consolidationDays)
 * - 衡量多天重复出现的强度
 * - 分散在多天的记忆比集中一天的更有价值
 * 
 * @param recallDays 回忆发生的天数列表
 */
export function calculateConsolidationComponent(recallDays: string[]): number {
  if (!recallDays || recallDays.length === 0) {
    return 0;
  }
  
  // 计算实际的整合天数（去重）
  const uniqueDays = new Set(recallDays);
  const consolidationDays = uniqueDays.size;
  
  // 1 - exp(-consolidationDays)
  return clampScore(1 - Math.exp(-consolidationDays));
}

/**
 * 计算概念丰富度分量
 * 
 * 公式: clamp(conceptTags.length / 5)
 * - 概念标签越多，表示内容越丰富
 * - 归一化到 [0, 1] 范围
 * 
 * @param conceptTags 概念标签列表
 */
export function calculateConceptualComponent(conceptTags: string[]): number {
  if (!conceptTags || conceptTags.length === 0) {
    return 0;
  }
  return clampScore(conceptTags.length / MAX_CONCEPT_TAGS);
}

/**
 * 计算相位信号增强
 * 
 * 来自 Light/REM 梦境阶段的信号增强
 * - Light 阶段最多 +0.06
 * - REM 阶段最多 +0.09
 * - 随时间衰减（半衰期14天）
 * 
 * @param phaseSignals 阶段信号记录
 * @param nowMs 当前时间戳
 */
export function calculatePhaseSignalBoost(
  phaseSignals: PhaseSignalEntry | undefined,
  nowMs: number
): number {
  if (!phaseSignals) {
    return 0;
  }
  
  const lambda = Math.LN2 / PHASE_SIGNAL_HALF_LIFE_DAYS;
  let boost = 0;
  
  // Light 阶段增强
  if (phaseSignals.lightHits > 0 && phaseSignals.lastLightAt) {
    const ageMs = nowMs - new Date(phaseSignals.lastLightAt).getTime();
    const ageDays = ageMs / DAY_MS;
    const lightBoost = PHASE_SIGNAL_LIGHT_BOOST_MAX * phaseSignals.lightHits * Math.exp(-lambda * ageDays);
    boost += Math.min(lightBoost, PHASE_SIGNAL_LIGHT_BOOST_MAX);
  }
  
  // REM 阶段增强
  if (phaseSignals.remHits > 0 && phaseSignals.lastRemAt) {
    const ageMs = nowMs - new Date(phaseSignals.lastRemAt).getTime();
    const ageDays = ageMs / DAY_MS;
    const remBoost = PHASE_SIGNAL_REM_BOOST_MAX * phaseSignals.remHits * Math.exp(-lambda * ageDays);
    boost += Math.min(remBoost, PHASE_SIGNAL_REM_BOOST_MAX);
  }
  
  return clampScore(boost);
}

// ============== 完整评分计算 ==============

/**
 * 计算单个条目的7信号评分
 * 
 * @param entry 短期记忆条目
 * @param phaseSignals 阶段信号（可选）
 * @param weights 评分权重（可选）
 * @param nowMs 当前时间戳（可选）
 */
export function scoreEntry(
  entry: ShortTermRecallEntry,
  phaseSignals?: PhaseSignalEntry,
  weights: PromotionWeights = DEFAULT_PROMOTION_WEIGHTS,
  nowMs?: number
): { score: number; components: PromotionComponents; phaseBoost: number } {
  const now = nowMs ?? Date.now();
  const signalCount = totalSignalCountForEntry(entry);
  const ageMs = now - new Date(entry.lastRecalledAt).getTime();
  const ageDays = ageMs / DAY_MS;
  const uniqueQueries = Math.min(entry.queryHashes?.length ?? 0, MAX_QUERY_HASHES);
  
  // 计算各分量
  const frequency = calculateFrequencyComponent(signalCount);
  const relevance = calculateRelevanceComponent(entry.totalScore, signalCount);
  const diversity = calculateDiversityComponent(uniqueQueries);
  const recency = calculateRecencyComponent(ageDays);
  const consolidation = calculateConsolidationComponent(entry.recallDays ?? []);
  const conceptual = calculateConceptualComponent(entry.conceptTags ?? []);
  const phaseBoost = calculatePhaseSignalBoost(phaseSignals, now);
  
  // 加权求和
  const weightedSum =
    weights.frequency * frequency +
    weights.relevance * relevance +
    weights.diversity * diversity +
    weights.recency * recency +
    weights.consolidation * consolidation +
    weights.conceptual * conceptual +
    phaseBoost;
  
  return {
    score: clampScore(weightedSum),
    components: { frequency, relevance, diversity, recency, consolidation, conceptual },
    phaseBoost,
  };
}

/**
 * 对候选条目进行评分排序
 * 
 * @param entries 短期记忆条目列表
 * @param phaseSignalsMap 阶段信号映射
 * @param weights 评分权重
 * @param options 评分选项
 */
export function rankCandidates(
  entries: ShortTermRecallEntry[],
  phaseSignalsMap?: Map<string, PhaseSignalEntry>,
  weights: PromotionWeights = DEFAULT_PROMOTION_WEIGHTS,
  options: {
    minScore?: number;
    minRecallCount?: number;
    minUniqueQueries?: number;
    maxAgeDays?: number;
    limit?: number;
    nowMs?: number;
  } = {}
): PromotionCandidate[] {
  const now = options.nowMs ?? Date.now();
  const minScore = options.minScore ?? 0;
  const minRecallCount = options.minRecallCount ?? 0;
  const minUniqueQueries = options.minUniqueQueries ?? 0;
  const maxAgeDays = options.maxAgeDays ?? Infinity;
  const limit = options.limit ?? Infinity;
  
  // 计算所有候选的评分
  const candidates: PromotionCandidate[] = [];
  
  for (const entry of entries) {
    // 基础阈值检查
    if (entry.recallCount < minRecallCount) continue;
    if ((entry.queryHashes?.length ?? 0) < minUniqueQueries) continue;
    
    const phaseSignals = phaseSignalsMap?.get(entry.key);
    const { score, components, phaseBoost } = scoreEntry(entry, phaseSignals, weights, now);
    
    // 评分阈值检查
    if (score < minScore) continue;
    
    // 年龄检查
    const ageMs = now - new Date(entry.lastRecalledAt).getTime();
    const ageDays = ageMs / DAY_MS;
    if (ageDays > maxAgeDays) continue;
    
    const signalCount = totalSignalCountForEntry(entry);
    
    candidates.push({
      key: entry.key,
      path: entry.path,
      startLine: entry.startLine,
      endLine: entry.endLine,
      source: entry.source,
      snippet: entry.snippet,
      recallCount: entry.recallCount,
      dailyCount: entry.dailyCount,
      groundedCount: entry.groundedCount,
      signalCount,
      avgScore: entry.totalScore / Math.max(1, signalCount),
      maxScore: entry.maxScore,
      uniqueQueries: Math.min(entry.queryHashes?.length ?? 0, MAX_QUERY_HASHES),
      claimHash: entry.claimHash,
      promotedAt: entry.promotedAt,
      firstRecalledAt: entry.firstRecalledAt,
      lastRecalledAt: entry.lastRecalledAt,
      ageDays,
      score,
      recallDays: entry.recallDays ?? [],
      conceptTags: entry.conceptTags ?? [],
      components,
      phaseBoost,
    });
  }
  
  // 按评分降序排序
  candidates.sort((a, b) => b.score - a.score);
  
  // 限制返回数量
  return candidates.slice(0, limit);
}

// ============== 导出 ==============

export const SevenSignalScorer = {
  // 工具函数
  clampScore,
  toFiniteScore,
  totalSignalCountForEntry,
  
  // 分量计算
  calculateFrequencyComponent,
  calculateRelevanceComponent,
  calculateDiversityComponent,
  calculateRecencyComponent,
  calculateConsolidationComponent,
  calculateConceptualComponent,
  calculatePhaseSignalBoost,
  
  // 完整评分
  scoreEntry,
  rankCandidates,
};

export default SevenSignalScorer;
