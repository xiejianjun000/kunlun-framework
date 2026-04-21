import { MemoryEntry } from '../../memory/interfaces/IMemorySystem';
import { MemoryCluster, PhaseResult, DreamPhase } from '../interfaces/IDreamingSystem';
import { calculateSemanticSimilarity } from '../../memory/embeddings';

/**
 * 梦境阶段1：记忆聚类
 * 将相关的记忆聚合为主题簇，为后续分析做准备
 * 基于 OpenClaw 的 K-means + 层次聚类混合算法
 */
export class Phase1Clustering {
  private readonly phase = DreamPhase.CLUSTERING;

  /**
   * 执行记忆聚类
   */
  async execute(
    memories: MemoryEntry[],
    targetClusters?: { min: number; max: number }
  ): Promise<PhaseResult> {
    const startTime = Date.now();

    try {
      const clusters = this.performClustering(memories, targetClusters);

      return {
        phase: this.phase,
        success: true,
        latency: Date.now() - startTime,
        data: { clusters }
      };
    } catch (error) {
      return {
        phase: this.phase,
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行聚类算法
   * 使用改进的 K-means + 余弦相似度
   */
  private performClustering(
    memories: MemoryEntry[],
    targetClusters?: { min: number; max: number }
  ): MemoryCluster[] {
    if (memories.length === 0) {
      return [];
    }

    // 确定聚类数量
    const minClusters = targetClusters?.min ?? 2;
    const maxClusters = targetClusters?.max ?? Math.min(10, Math.ceil(memories.length / 5));
    const k = Math.min(maxClusters, Math.max(minClusters, Math.ceil(Math.sqrt(memories.length))));

    // 1. 构建相似度矩阵
    const similarityMatrix = this.buildSimilarityMatrix(memories);

    // 2. K-means++ 初始化质心
    let centroids = this.kMeansPlusPlusInit(memories, k, similarityMatrix);

    // 3. 迭代 K-means
    let iterations = 0;
    const maxIterations = 100;
    let clusters: number[] = new Array(memories.length).fill(0);

    while (iterations < maxIterations) {
      // 分配每个点到最近的质心
      const newClusters = this.assignClusters(memories, centroids, similarityMatrix);

      // 检查是否收敛
      if (this.arraysEqual(clusters, newClusters)) {
        break;
      }

      clusters = newClusters;

      // 更新质心
      centroids = this.updateCentroids(memories, clusters, k, similarityMatrix);

      iterations++;
    }

    // 4. 生成记忆簇
    return this.buildMemoryClusters(memories, clusters, k, similarityMatrix);
  }

  /**
   * 构建相似度矩阵
   */
  private buildSimilarityMatrix(memories: MemoryEntry[]): number[][] {
    const n = memories.length;
    const matrix: number[][] = new Array(n);

    for (let i = 0; i < n; i++) {
      matrix[i] = new Array(n);
      matrix[i][i] = 1;

      for (let j = i + 1; j < n; j++) {
        const similarity = calculateSemanticSimilarity(
          memories[i].content,
          memories[j].content
        );
        matrix[i][j] = similarity;
        matrix[j][i] = similarity;
      }
    }

    return matrix;
  }

  /**
   * K-means++ 初始化质心
   */
  private kMeansPlusPlusInit(
    memories: MemoryEntry[],
    k: number,
    similarityMatrix: number[][]
  ): number[] {
    const n = memories.length;
    const centroids: number[] = [];

    // 随机选择第一个质心
    centroids.push(Math.floor(Math.random() * n));

    // 选择剩余的质心
    while (centroids.length < k) {
      // 计算每个点到最近质心的距离（相似度越低距离越远）
      const distances = memories.map((_, i) => {
        if (centroids.includes(i)) {
          return 0;
        }
        let minDistance = Infinity;
        for (const centroidIdx of centroids) {
          const distance = 1 - similarityMatrix[i][centroidIdx];
          minDistance = Math.min(minDistance, distance);
        }
        return minDistance;
      });

      // 按概率选择下一个质心（距离越大概率越高）
      const totalDistance = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDistance;

      for (let i = 0; i < n; i++) {
        random -= distances[i];
        if (random <= 0 && !centroids.includes(i)) {
          centroids.push(i);
          break;
        }
      }

      // 防止无限循环
      if (centroids.length < k && !centroids.includes(n - 1)) {
        centroids.push(n - 1);
      }
    }

    return centroids;
  }

  /**
   * 分配点到最近的质心
   */
  private assignClusters(
    memories: MemoryEntry[],
    centroids: number[],
    similarityMatrix: number[][]
  ): number[] {
    return memories.map((_, i) => {
      let bestCluster = 0;
      let bestSimilarity = -1;

      for (let c = 0; c < centroids.length; c++) {
        const similarity = similarityMatrix[i][centroids[c]];
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = c;
        }
      }

      return bestCluster;
    });
  }

  /**
   * 更新质心位置
   */
  private updateCentroids(
    memories: MemoryEntry[],
    clusters: number[],
    k: number,
    similarityMatrix: number[][]
  ): number[] {
    const newCentroids: number[] = [];

    for (let c = 0; c < k; c++) {
      const clusterIndices = clusters
        .map((cluster, idx) => (cluster === c ? idx : -1))
        .filter(idx => idx >= 0);

      if (clusterIndices.length === 0) {
        // 空簇，随机选一个点
        newCentroids.push(Math.floor(Math.random() * memories.length));
        continue;
      }

      // 选择与簇内所有点平均相似度最高的点作为新质心
      let bestCentroid = clusterIndices[0];
      let bestAvgSimilarity = -1;

      for (const candidateIdx of clusterIndices) {
        let totalSimilarity = 0;
        for (const idx of clusterIndices) {
          totalSimilarity += similarityMatrix[candidateIdx][idx];
        }
        const avgSimilarity = totalSimilarity / clusterIndices.length;

        if (avgSimilarity > bestAvgSimilarity) {
          bestAvgSimilarity = avgSimilarity;
          bestCentroid = candidateIdx;
        }
      }

      newCentroids.push(bestCentroid);
    }

    return newCentroids;
  }

  /**
   * 构建记忆簇对象
   */
  private buildMemoryClusters(
    memories: MemoryEntry[],
    clusters: number[],
    k: number,
    similarityMatrix: number[][]
  ): MemoryCluster[] {
    const result: MemoryCluster[] = [];

    for (let c = 0; c < k; c++) {
      const clusterIndices = clusters
        .map((cluster, idx) => (cluster === c ? idx : -1))
        .filter(idx => idx >= 0);

      if (clusterIndices.length === 0) {
        continue;
      }

      const clusterMemories = clusterIndices.map(idx => memories[idx]);

      // 计算簇内凝聚度
      const cohesion = this.calculateClusterCohesion(clusterIndices, similarityMatrix);

      // 提取主题关键词
      const themes = this.extractClusterThemes(clusterMemories);

      // 提取实体
      const entities = this.extractClusterEntities(clusterMemories);

      // 计算重要性（平均重要性 * 大小权重）
      const avgImportance = clusterMemories.reduce(
        (sum, m) => sum + (m.importance ?? 0.5),
        0
      ) / clusterMemories.length;
      const sizeWeight = Math.min(1, Math.log(clusterMemories.length + 1));
      const importance = avgImportance * sizeWeight;

      result.push({
        id: `cluster_${Date.now()}_${c}`,
        name: `主题簇 #${c + 1}: ${themes.slice(0, 3).join(', ')}`,
        theme: themes,
        entries: clusterMemories,
        cohesion,
        importance,
        entities
      });
    }

    // 按重要性排序
    return result.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 计算簇内凝聚度
   */
  private calculateClusterCohesion(
    clusterIndices: number[],
    similarityMatrix: number[][]
  ): number {
    if (clusterIndices.length <= 1) {
      return 1;
    }

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < clusterIndices.length; i++) {
      for (let j = i + 1; j < clusterIndices.length; j++) {
        totalSimilarity += similarityMatrix[clusterIndices[i]][clusterIndices[j]];
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  /**
   * 提取簇主题关键词
   */
  private extractClusterThemes(memories: MemoryEntry[]): string[] {
    const wordFreq = new Map<string, number>();

    for (const memory of memories) {
      const keywords = memory.keywords || [];
      for (const keyword of keywords) {
        wordFreq.set(keyword, (wordFreq.get(keyword) || 0) + 1);
      }
    }

    // 按频率排序，取前 10 个
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 提取簇内实体
   */
  private extractClusterEntities(memories: MemoryEntry[]): string[] {
    const entitySet = new Set<string>();

    for (const memory of memories) {
      if (memory.entities) {
        for (const entity of memory.entities) {
          entitySet.add(entity);
        }
      }
    }

    return Array.from(entitySet);
  }

  /**
   * 数组相等比较
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
}
