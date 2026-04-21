import { MemoryEntry } from './interfaces/IMemorySystem';
import { calculateSemanticSimilarity } from './embeddings';

/**
 * 混合检索引擎
 * 结合语义相似度和关键词匹配
 * 基于 OpenClaw 的 Hybrid Search 实现
 */

export interface HybridSearchResult {
  entries: MemoryEntry[];
  semanticScores: number[];
  keywordScores: number[];
  combinedScores: number[];
}

/**
 * 混合检索算法
 * @param query 查询文本
 * @param queryKeywords 查询关键词
 * @param candidates 候选记忆条目
 * @param invertedIndex 倒排索引
 * @param semanticWeight 语义权重 (0-1)
 * @param keywordWeight 关键词权重 (0-1)
 */
export function hybridSearch(
  query: string,
  queryKeywords: string[],
  candidates: MemoryEntry[],
  invertedIndex: Map<string, Set<string>>,
  semanticWeight: number = 0.6,
  keywordWeight: number = 0.4
): HybridSearchResult {
  if (candidates.length === 0) {
    return {
      entries: [],
      semanticScores: [],
      keywordScores: [],
      combinedScores: []
    };
  }

  // 1. 计算语义相似度分数
  const semanticScores = candidates.map(candidate =>
    calculateSemanticSimilarity(query, candidate.content)
  );

  // 2. 计算关键词匹配分数
  const keywordScores = calculateKeywordScores(
    queryKeywords,
    candidates,
    invertedIndex
  );

  // 3. 计算 BM25 分数
  const bm25Scores = calculateBM25(queryKeywords, candidates);

  // 4. 综合评分（语义 + 关键词 + BM25）
  const combinedScores = candidates.map((_, i) => {
    const semantic = semanticScores[i] * semanticWeight;
    const keyword = keywordScores[i] * keywordWeight * 0.5;
    const bm25 = bm25Scores[i] * keywordWeight * 0.5;
    return semantic + keyword + bm25;
  });

  // 5. 按综合分数排序
  const indexedResults = candidates.map((entry, index) => ({
    entry,
    semanticScore: semanticScores[index],
    keywordScore: keywordScores[index],
    combinedScore: combinedScores[index],
    originalIndex: index
  }));

  indexedResults.sort((a, b) => b.combinedScore - a.combinedScore);

  // 6. 去重（基于内容相似度）
  const dedupedResults = deduplicateResults(indexedResults);

  return {
    entries: dedupedResults.map(r => r.entry),
    semanticScores: dedupedResults.map(r => r.semanticScore),
    keywordScores: dedupedResults.map(r => r.keywordScore),
    combinedScores: dedupedResults.map(r => r.combinedScore)
  };
}

/**
 * 计算关键词匹配分数
 */
function calculateKeywordScores(
  queryKeywords: string[],
  candidates: MemoryEntry[],
  invertedIndex: Map<string, Set<string>>
): number[] {
  if (queryKeywords.length === 0) {
    return candidates.map(() => 0);
  }

  return candidates.map(candidate => {
    const candidateKeywords = candidate.keywords || [];
    if (candidateKeywords.length === 0) {
      return 0;
    }

    // 计算匹配的关键词数量
    let matchedCount = 0;
    for (const queryKeyword of queryKeywords) {
      const lowerKeyword = queryKeyword.toLowerCase();
      // 检查：1. 直接匹配  2. 倒排索引包含
      if (candidateKeywords.some(k => k.toLowerCase() === lowerKeyword)) {
        matchedCount++;
      } else {
        const indexedIds = invertedIndex.get(lowerKeyword);
        if (indexedIds && indexedIds.has(candidate.id)) {
          matchedCount++;
        }
      }
    }

    // Jaccard 相似度
    const unionSize = new Set([...queryKeywords, ...candidateKeywords]).size;
    return unionSize === 0 ? 0 : matchedCount / unionSize;
  });
}

/**
 * BM25 检索算法实现
 */
function calculateBM25(
  queryKeywords: string[],
  candidates: MemoryEntry[],
  k1: number = 1.5,
  b: number = 0.75
): number[] {
  if (queryKeywords.length === 0) {
    return candidates.map(() => 0);
  }

  const N = candidates.length;

  // 计算平均文档长度
  const avgdl = candidates.reduce(
    (sum, c) => sum + (c.keywords?.length || c.content.length / 2),
    0
  ) / N;

  // 计算每个文档的 BM25 分数
  return candidates.map(candidate => {
    const docKeywords = candidate.keywords || tokenizeSimple(candidate.content);
    const dl = docKeywords.length;

    if (dl === 0) {
      return 0;
    }

    let score = 0;

    for (const queryKeyword of queryKeywords) {
      const lowerKeyword = queryKeyword.toLowerCase();

      // 计算词频 (TF)
      const tf = docKeywords.filter(k => k.toLowerCase() === lowerKeyword).length / dl;

      // 计算文档频率 (DF) - 包含该词的文档数
      const df = candidates.filter(c =>
        (c.keywords || tokenizeSimple(c.content)).some(k => k.toLowerCase() === lowerKeyword)
      ).length;

      // 计算 IDF
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      // BM25 公式
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (dl / avgdl));
      score += idf * (numerator / denominator);
    }

    return score;
  });
}

/**
 * 简单分词
 */
function tokenizeSimple(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(word => {
      if (/[\u4e00-\u9fa5]/.test(word)) {
        return word.length >= 1;
      }
      return word.length > 2;
    });
}

/**
 * 结果去重
 * 基于内容相似度过滤重复记忆
 */
function deduplicateResults(
  results: Array<{
    entry: MemoryEntry;
    semanticScore: number;
    keywordScore: number;
    combinedScore: number;
  }>
): typeof results {
  const deduped: typeof results = [];
  const contentSignatures = new Set<string>();

  for (const result of results) {
    // 生成内容签名（前50字符的哈希 + 长度）
    const signature = generateContentSignature(result.entry.content);

    // 检查是否已有高度相似的内容
    const isDuplicate = Array.from(contentSignatures).some(existingSig => {
      // 简单相似度比较：编辑距离
      return calculateEditDistance(signature, existingSig) < 5;
    });

    if (!isDuplicate) {
      deduped.push(result);
      contentSignatures.add(signature);
    }

    // 限制返回数量
    if (deduped.length >= 50) {
      break;
    }
  }

  return deduped;
}

/**
 * 生成内容签名
 */
function generateContentSignature(content: string): string {
  const normalized = content.toLowerCase().replace(/\s+/g, '');
  return normalized.slice(0, 50) + '_' + normalized.length;
}

/**
 * 计算编辑距离
 */
function calculateEditDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() =>
    Array(a.length + 1).fill(null)
  );

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitution = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitution
      );
    }
  }

  return matrix[b.length][a.length];
}
