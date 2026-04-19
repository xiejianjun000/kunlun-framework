/**
 * 社区发现算法
 * Community Detection - Louvain Algorithm Implementation
 */

import { GraphStore } from './GraphStore';
import {
  GraphNode,
  GraphEdge,
  Community,
  CommunityDetectionConfig,
  EdgeWeightOptions,
} from './types';

interface NodeCommunity {
  node: string;
  community: number;
}

interface EdgeWeight {
  source: string;
  target: string;
  weight: number;
}

export class CommunityDetector {
  private graphStore: GraphStore;
  private config: Required<CommunityDetectionConfig>;
  private nodeCommunities: Map<string, number> = new Map();
  private communityNodes: Map<number, Set<string>> = new Map();
  private communityEdges: Map<number, EdgeWeight[]> = new Map();
  private edgeWeights: Map<string, number> = new Map();
  private totalWeight: number = 0;
  private m2: number = 0; // 2 * total edges weight

  constructor(graphStore: GraphStore, config: CommunityDetectionConfig = {}) {
    this.graphStore = graphStore;
    this.config = {
      minCommunitySize: config.minCommunitySize ?? 2,
      maxIterations: config.maxIterations ?? 100,
      randomSeed: config.randomSeed ?? Date.now(),
      weightThreshold: config.weightThreshold ?? 0.001,
    };
  }

  /**
   * 运行 Louvain 社区检测
   */
  detectCommunities(): Community[] {
    // 初始化
    this.initialize();

    // 迭代优化模块度
    let improvement = true;
    let iteration = 0;

    while (improvement && iteration < this.config.maxIterations) {
      improvement = this.optimizeLocal();
      iteration++;

      if (improvement) {
        this.aggregateCommunity();
      }
    }

    // 生成社区结果
    return this.generateCommunities();
  }

  /**
   * 初始化数据结构
   */
  private initialize(): void {
    this.nodeCommunities.clear();
    this.communityNodes.clear();
    this.communityEdges.clear();
    this.edgeWeights.clear();
    this.totalWeight = 0;
    this.m2 = 0;

    const nodes = this.graphStore.getAllNodes();
    const edges = this.graphStore.getEdges({});

    // 为每个节点分配初始社区
    nodes.forEach((node, index) => {
      this.nodeCommunities.set(node.qualifiedName, index);
    });

    // 初始化社区节点映射
    nodes.forEach((node, index) => {
      this.communityNodes.set(index, new Set([node.qualifiedName]));
    });

    // 计算边权重
    for (const edge of edges) {
      const key = this.edgeKey(edge.sourceQualified, edge.targetQualified);
      const weight = edge.weight ?? edge.confidence ?? 1;
      this.edgeWeights.set(key, weight);
      this.totalWeight += weight;
    }

    this.m2 = 2 * this.totalWeight;
  }

  /**
   * 本地模块度优化
   */
  private optimizeLocal(): boolean {
    let improved = false;
    const nodes = Array.from(this.nodeCommunities.keys());

    // 打乱顺序以增加随机性
    this.shuffleArray(nodes);

    for (const node of nodes) {
      const currentCommunity = this.nodeCommunities.get(node)!;
      const neighborCommunities = this.getNeighborCommunities(node);

      // 计算移除当前社区的模块度增益
      const currentModularity = this.calculateModularityGain(node, currentCommunity, true);
      
      let bestCommunity = currentCommunity;
      let bestGain = 0;

      // 尝试移动到邻居社区
      for (const neighborComm of neighborCommunities) {
        if (neighborComm !== currentCommunity) {
          const gain = this.calculateModularityGain(node, neighborComm, false);
          if (gain > bestGain) {
            bestGain = gain;
            bestCommunity = neighborComm;
          }
        }
      }

      // 如果有正增益，则移动节点
      if (bestGain > this.config.weightThreshold && bestCommunity !== currentCommunity) {
        this.moveNode(node, currentCommunity, bestCommunity);
        improved = true;
      }
    }

    return improved;
  }

  /**
   * 获取节点的邻居社区
   */
  private getNeighborCommunities(node: string): Set<number> {
    const communities = new Set<number>();
    const edges = this.graphStore.getNodeEdges(node);

    for (const edge of edges) {
      const neighbor =
        edge.sourceQualified === node ? edge.targetQualified : edge.sourceQualified;
      const community = this.nodeCommunities.get(neighbor);
      if (community !== undefined) {
        communities.add(community);
      }
    }

    return communities;
  }

  /**
   * 计算模块度增益
   */
  private calculateModularityGain(
    node: string,
    targetCommunity: number,
    isRemoval: boolean
  ): number {
    const ki = this.getNodeWeight(node);
    const community = isRemoval
      ? this.communityNodes.get(this.nodeCommunities.get(node)!)!
      : this.communityNodes.get(targetCommunity)!;

    // Σin: 社区内的总权重
    let sigmaIn = 0;
    // Σtot: 社区连接到外部的总权重
    let sigmaTot = 0;

    for (const commNode of community) {
      sigmaTot += this.getNodeWeight(commNode);

      const commEdges = this.graphStore.getNodeEdges(commNode);
      for (const edge of commEdges) {
        const neighbor =
          edge.sourceQualified === commNode ? edge.targetQualified : edge.sourceQualified;
        const neighborComm = this.nodeCommunities.get(neighbor);

        if (isRemoval && neighborComm === this.nodeCommunities.get(node)) {
          sigmaIn += edge.weight ?? edge.confidence ?? 1;
        }
      }
    }

    // k_i,in: 从节点到目标社区的权重和
    let kin = 0;
    const nodeEdges = this.graphStore.getNodeEdges(node);
    for (const edge of nodeEdges) {
      const neighbor =
        edge.sourceQualified === node ? edge.targetQualified : edge.sourceQualified;
      const neighborComm = this.nodeCommunities.get(neighbor);

      if (!isRemoval && neighborComm === targetCommunity) {
        kin += edge.weight ?? edge.confidence ?? 1;
      }
    }

    if (isRemoval) {
      // 移除节点的模块度增益
      return sigmaIn / this.m2 - (sigmaTot - ki) * ki / (this.m2 * this.m2);
    } else {
      // 添加节点的模块度增益
      return kin / this.m2 - (sigmaTot + ki) * ki / (this.m2 * this.m2);
    }
  }

  /**
   * 获取节点的加权度
   */
  private getNodeWeight(node: string): number {
    const edges = this.graphStore.getNodeEdges(node);
    let weight = 0;
    for (const edge of edges) {
      weight += edge.weight ?? edge.confidence ?? 1;
    }
    return weight;
  }

  /**
   * 移动节点到新社区
   */
  private moveNode(node: string, fromCommunity: number, toCommunity: number): void {
    // 从原社区移除
    const fromNodes = this.communityNodes.get(fromCommunity);
    if (fromNodes) {
      fromNodes.delete(node);
      if (fromNodes.size === 0) {
        this.communityNodes.delete(fromCommunity);
      }
    }

    // 添加到新社区
    if (!this.communityNodes.has(toCommunity)) {
      this.communityNodes.set(toCommunity, new Set());
    }
    this.communityNodes.get(toCommunity)!.add(node);

    // 更新节点社区映射
    this.nodeCommunities.set(node, toCommunity);
  }

  /**
   * 聚合社区构建新图
   */
  private aggregateCommunity(): void {
    const newCommunityNodes = new Map<string, number>();
    const newCommunityMap = new Map<number, number>();
    let newCommunityId = 0;

    // 分配新的社区ID
    for (const [oldId, nodes] of this.communityNodes) {
      if (nodes.size > 0) {
        newCommunityMap.set(oldId, newCommunityId);
        for (const node of nodes) {
          newCommunityNodes.set(node, newCommunityId);
        }
        newCommunityId++;
      }
    }

    // 更新映射
    this.nodeCommunities = newCommunityNodes;
    this.communityNodes = new Map();

    // 重新初始化社区节点映射
    for (const [node, commId] of this.nodeCommunities) {
      if (!this.communityNodes.has(commId)) {
        this.communityNodes.set(commId, new Set());
      }
      this.communityNodes.get(commId)!.add(node);
    }

    // 重新计算边权重
    this.recalculateWeights();
  }

  /**
   * 重新计算边权重
   */
  private recalculateWeights(): void {
    this.edgeWeights.clear();
    this.totalWeight = 0;

    const edges = this.graphStore.getEdges({});
    for (const edge of edges) {
      const sourceComm = this.nodeCommunities.get(edge.sourceQualified);
      const targetComm = this.nodeCommunities.get(edge.targetQualified);

      if (sourceComm !== undefined && targetComm !== undefined) {
        const key = this.edgeKey(String(sourceComm), String(targetComm));
        const weight = edge.weight ?? edge.confidence ?? 1;

        const currentWeight = this.edgeWeights.get(key) || 0;
        this.edgeWeights.set(key, currentWeight + weight);
        this.totalWeight += weight;
      }
    }

    this.m2 = 2 * this.totalWeight;
  }

  /**
   * 生成社区结果
   */
  private generateCommunities(): Community[] {
    const communities: Community[] = [];
    const subgraph = this.graphStore.getSubgraph('', 1000); // 获取完整子图
    const nodeMap = new Map(subgraph.nodes.map(n => [n.qualifiedName, n]));

    let communityId = 0;
    for (const [commId, nodes] of this.communityNodes) {
      if (nodes.size >= this.config.minCommunitySize) {
        const communityNodes = Array.from(nodes)
          .map(qn => nodeMap.get(qn))
          .filter((n): n is GraphNode => n !== undefined);

        // 获取社区内的边
        const communityEdges = subgraph.edges.filter(
          e =>
            nodes.has(e.sourceQualified) && nodes.has(e.targetQualified)
        );

        // 计算模块度
        const modularity = this.calculateCommunityModularity(nodes, subgraph.edges);

        communities.push({
          id: communityId++,
          name: `Community_${commId}`,
          nodes: communityNodes,
          edges: communityEdges,
          modularity,
        });
      }
    }

    return communities;
  }

  /**
   * 计算社区模块度
   */
  private calculateCommunityModularity(
    nodes: Set<string>,
    edges: GraphEdge[]
  ): number {
    let sumIn = 0;
    let sumTot = 0;

    for (const edge of edges) {
      const weight = edge.weight ?? edge.confidence ?? 1;

      if (nodes.has(edge.sourceQualified) && nodes.has(edge.targetQualified)) {
        sumIn += weight;
      }

      if (nodes.has(edge.sourceQualified) || nodes.has(edge.targetQualified)) {
        sumTot += weight;
      }
    }

    const ki = this.getNodeWeight(Array.from(nodes)[0]);
    return sumIn / this.m2 - Math.pow(sumTot / this.m2, 2);
  }

  /**
   * 生成边键
   */
  private edgeKey(source: string, target: string): string {
    return source < target ? `${source}:${target}` : `${target}:${source}`;
  }

  /**
   * 打乱数组顺序 (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): void {
    const random = this.seededRandom(this.config.randomSeed);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * 创建确定性随机数生成器
   */
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }

  /**
   * 获取节点的社区
   */
  getNodeCommunity(node: string): number | undefined {
    return this.nodeCommunities.get(node);
  }

  /**
   * 获取社区成员
   */
  getCommunityMembers(communityId: number): string[] {
    const members = this.communityNodes.get(communityId);
    return members ? Array.from(members) : [];
  }

  /**
   * 计算整体模块度
   */
  calculateModularity(): number {
    const nodes = Array.from(this.nodeCommunities.keys());
    const edges = this.graphStore.getEdges({});

    let sum = 0;
    for (const edge of edges) {
      const sourceComm = this.nodeCommunities.get(edge.sourceQualified);
      const targetComm = this.nodeCommunities.get(edge.targetQualified);

      if (sourceComm === targetComm) {
        const weight = edge.weight ?? edge.confidence ?? 1;
        sum += weight - (this.getNodeWeight(edge.sourceQualified) * this.getNodeWeight(edge.targetQualified)) / this.m2;
      }
    }

    return sum / this.m2;
  }

  /**
   * 分析社区特征
   */
  analyzeCommunity(community: Community): {
    density: number;
    avgDegree: number;
    centralNodes: GraphNode[];
    interConnections: number;
  } {
    const n = community.nodes.length;
    if (n === 0) {
      return { density: 0, avgDegree: 0, centralNodes: [], interConnections: 0 };
    }

    // 计算密度
    const maxEdges = (n * (n - 1)) / 2;
    const density = maxEdges > 0 ? community.edges.length / maxEdges : 0;

    // 计算平均度数
    const degreeMap = new Map<string, number>();
    for (const node of community.nodes) {
      degreeMap.set(node.qualifiedName, 0);
    }

    for (const edge of community.edges) {
      degreeMap.set(edge.sourceQualified, (degreeMap.get(edge.sourceQualified) || 0) + 1);
      degreeMap.set(edge.targetQualified, (degreeMap.get(edge.targetQualified) || 0) + 1);
    }

    const totalDegree = Array.from(degreeMap.values()).reduce((a, b) => a + b, 0);
    const avgDegree = n > 0 ? totalDegree / n : 0;

    // 找出中心节点 (度数最高的节点)
    const sortedNodes = community.nodes.sort((a, b) => {
      const degreeA = degreeMap.get(a.qualifiedName) || 0;
      const degreeB = degreeMap.get(b.qualifiedName) || 0;
      return degreeB - degreeA;
    });

    const centralNodes = sortedNodes.slice(0, Math.min(5, n));

    // 计算社区间连接
    const nodeSet = new Set(community.nodes.map(n => n.qualifiedName));
    const edges = this.graphStore.getEdges({});
    let interConnections = 0;

    for (const edge of edges) {
      if (nodeSet.has(edge.sourceQualified) && !nodeSet.has(edge.targetQualified)) {
        interConnections++;
      }
    }

    return {
      density,
      avgDegree,
      centralNodes,
      interConnections,
    };
  }
}
