import {
  IDreamingSystem,
  DreamResult,
  DreamStatus,
  DreamPhase,
  PhaseResult,
  DreamingSystemConfig,
  MemoryCluster,
  DreamNarrative,
  DreamInsight,
  DreamContradiction
} from './interfaces/IDreamingSystem';
import { MemoryEntry } from '../memory/interfaces/IMemorySystem';
import { DeterminismSystem } from '../determinism/DeterminismSystem';
import { Phase1Clustering } from './phases/Phase1Clustering';
import { Phase2Narrative } from './phases/Phase2Narrative';
import { Phase3Synthesis } from './phases/Phase3Synthesis';
import { Phase4Repair } from './phases/Phase4Repair';
import { Phase5Integration } from './phases/Phase5Integration';

/**
 * OpenTaiji 梦境系统核心实现
 * 基于 OpenClaw Dreaming System 架构移植
 * 与 WFGY 防幻觉系统深度集成
 */
export class DreamingSystem implements IDreamingSystem {
  public readonly name: string = 'DreamingSystem';
  public readonly version: string = '1.0.0';

  private config: Required<DreamingSystemConfig>;
  private wfgySystem: DeterminismSystem | null = null;
  private recentDreams: DreamResult[] = [];
  private lastDreamTime: string = '';

  // 阶段处理器
  private phase1: Phase1Clustering;
  private phase2: Phase2Narrative;
  private phase3: Phase3Synthesis;
  private phase4: Phase4Repair;
  private phase5: Phase5Integration;

  constructor(config?: DreamingSystemConfig) {
    this.config = {
      autoTrigger: config?.autoTrigger ?? true,
      memoryThreshold: config?.memoryThreshold ?? 50,
      minIntervalMs: config?.minIntervalMs ?? 3600000, // 默认1小时
      phaseTimeoutMs: config?.phaseTimeoutMs ?? 300000, // 每阶段5分钟
      targetClusters: config?.targetClusters ?? { min: 2, max: 10 },
      wfgyIntegration: {
        enabled: config?.wfgyIntegration?.enabled ?? true,
        verifyInsights: config?.wfgyIntegration?.verifyInsights ?? true,
        verifyNarrative: config?.wfgyIntegration?.verifyNarrative ?? true,
        autoFilterHighRisk: config?.wfgyIntegration?.autoFilterHighRisk ?? true,
        riskThreshold: config?.wfgyIntegration?.riskThreshold ?? 0.8
      },
      wikiIntegration: {
        enabled: config?.wikiIntegration?.enabled ?? true,
        autoWriteClaims: config?.wikiIntegration?.autoWriteClaims ?? true,
        autoCreateEntities: config?.wikiIntegration?.autoCreateEntities ?? true,
        confidenceThreshold: config?.wikiIntegration?.confidenceThreshold ?? 0.6
      }
    };

    this.phase1 = new Phase1Clustering();
    this.phase2 = new Phase2Narrative();
    this.phase3 = new Phase3Synthesis();
    this.phase4 = new Phase4Repair();
    this.phase5 = new Phase5Integration();
  }

  /**
   * 注入 WFGY 确定性系统实例
   */
  setDeterminismSystem(system: DeterminismSystem): void {
    this.wfgySystem = system;
  }

  isReady(): boolean {
    return true;
  }

  /**
   * 执行完整的梦境五阶段流程
   */
  async dream(memories: MemoryEntry[]): Promise<DreamResult> {
    const startTime = Date.now();
    const dreamId = `dream_${Date.now()}`;

    const result: DreamResult = {
      id: dreamId,
      status: DreamStatus.RUNNING,
      startTime: new Date(startTime).toISOString(),
      memoryCount: memories.length,
      phaseResults: []
    };

    try {
      // ===== 阶段1：记忆聚类 =====
      const phase1Result = await this.runPhase(DreamPhase.CLUSTERING, memories);
      result.phaseResults.push(phase1Result);

      if (!phase1Result.success) {
        throw new Error(`阶段1失败: ${phase1Result.error}`);
      }

      const clusters = (phase1Result.data as { clusters: MemoryCluster[] }).clusters;
      result.clusters = clusters;

      // ===== 阶段2：叙事合成 =====
      const phase2Result = await this.runPhase(DreamPhase.NARRATIVE, clusters);
      result.phaseResults.push(phase2Result);

      if (!phase2Result.success) {
        throw new Error(`阶段2失败: ${phase2Result.error}`);
      }

      const narrative = (phase2Result.data as { narrative: DreamNarrative }).narrative;
      result.narrative = narrative;

      // ===== WFGY 集成：验证叙事 =====
      if (this.config.wfgyIntegration.enabled &&
          this.config.wfgyIntegration.verifyNarrative &&
          this.wfgySystem) {
        const wfgyResult = await this.wfgySystem.verify(narrative.content);
        result.wfgyVerification = {
          verified: wfgyResult.verified,
          hallucinationRisk: wfgyResult.hallucinationRisk ?? 0,
          sources: wfgyResult.sources || []
        };

        // 高风险梦境，中断处理
        if (this.config.wfgyIntegration.autoFilterHighRisk &&
            wfgyResult.hallucinationRisk !== undefined &&
            wfgyResult.hallucinationRisk > this.config.wfgyIntegration.riskThreshold) {
          throw new Error(`WFGY 验证失败: 幻觉风险 ${(wfgyResult.hallucinationRisk * 100).toFixed(1)}% 超过阈值`);
        }
      }

      // ===== 阶段3：洞见提取 =====
      const phase3Result = await this.runPhase(
        DreamPhase.SYNTHESIS,
        { clusters, narrative }
      );
      result.phaseResults.push(phase3Result);

      if (!phase3Result.success) {
        throw new Error(`阶段3失败: ${phase3Result.error}`);
      }

      let insights = (phase3Result.data as { insights: DreamInsight[] }).insights;

      // ===== WFGY 集成：验证洞见 =====
      if (this.config.wfgyIntegration.enabled &&
          this.config.wfgyIntegration.verifyInsights &&
          this.wfgySystem) {
        // 过滤掉高风险洞见
        const filteredInsights: DreamInsight[] = [];
        for (const insight of insights) {
          const wfgyResult = await this.wfgySystem.verify(insight.content);
          if (!this.config.wfgyIntegration.autoFilterHighRisk ||
              (wfgyResult.hallucinationRisk ?? 0) <= this.config.wfgyIntegration.riskThreshold) {
            filteredInsights.push(insight);
          }
        }
        insights = filteredInsights;
      }

      result.insights = insights;

      // ===== 阶段4：矛盾修复 =====
      const phase4Result = await this.runPhase(
        DreamPhase.REPAIR,
        { clusters, narrative, insights }
      );
      result.phaseResults.push(phase4Result);

      if (!phase4Result.success) {
        throw new Error(`阶段4失败: ${phase4Result.error}`);
      }

      const phase4Data = phase4Result.data as {
        contradictions: DreamContradiction[];
        repairs: unknown[];
      };
      result.contradictions = phase4Data.contradictions;
      result.repairs = phase4Data.repairs as DreamResult['repairs'];

      // ===== 阶段5：图谱整合 =====
      const phase5Result = await this.runPhase(
        DreamPhase.INTEGRATION,
        {
          clusters,
          narrative,
          insights,
          contradictions: phase4Data.contradictions,
          options: this.config.wikiIntegration
        }
      );
      result.phaseResults.push(phase5Result);

      if (!phase5Result.success) {
        throw new Error(`阶段5失败: ${phase5Result.error}`);
      }

      result.integration = phase5Result.data as DreamResult['integration'];

      // ===== 完成 =====
      result.status = DreamStatus.COMPLETED;
      result.endTime = new Date().toISOString();
      result.totalLatency = Date.now() - startTime;

      // 计算梦境质量分数
      result.qualityScore = this.calculateDreamQuality(result);

      // 保存到历史记录
      this.recentDreams.push(result);
      if (this.recentDreams.length > 100) {
        this.recentDreams = this.recentDreams.slice(-100);
      }
      this.lastDreamTime = result.endTime;

      return result;

    } catch (error) {
      result.status = DreamStatus.FAILED;
      result.endTime = new Date().toISOString();
      result.totalLatency = Date.now() - startTime;
      result.error = error instanceof Error ? error.message : String(error);

      this.recentDreams.push(result);

      return result;
    }
  }

  /**
   * 单独执行某个阶段
   */
  async runPhase(phase: DreamPhase, input: unknown): Promise<PhaseResult> {
    switch (phase) {
      case DreamPhase.CLUSTERING:
        return this.phase1.execute(
          input as MemoryEntry[],
          this.config.targetClusters
        );

      case DreamPhase.NARRATIVE:
        return this.phase2.execute(input as MemoryCluster[]);

      case DreamPhase.SYNTHESIS: {
        const { clusters, narrative } = input as {
          clusters: MemoryCluster[];
          narrative: DreamNarrative;
        };
        return this.phase3.execute(clusters, narrative);
      }

      case DreamPhase.REPAIR: {
        const { clusters, narrative, insights } = input as {
          clusters: MemoryCluster[];
          narrative: DreamNarrative;
          insights: DreamInsight[];
        };
        return this.phase4.execute(clusters, narrative, insights);
      }

      case DreamPhase.INTEGRATION: {
        const { clusters, narrative, insights, contradictions, options } = input as {
          clusters: MemoryCluster[];
          narrative: DreamNarrative;
          insights: DreamInsight[];
          contradictions: DreamContradiction[];
          options?: Partial<DreamingSystemConfig['wikiIntegration']>;
        };
        return this.phase5.execute(clusters, narrative, insights, contradictions, options);
      }

      default:
        throw new Error(`未知的梦境阶段: ${phase}`);
    }
  }

  /**
   * 检查是否应该触发梦境
   */
  shouldTrigger(memoryCount: number, lastDreamTime?: string): boolean {
    // 检查记忆数量阈值
    if (memoryCount < this.config.memoryThreshold) {
      return false;
    }

    // 检查时间间隔
    const lastTime = lastDreamTime || this.lastDreamTime;
    if (lastTime) {
      const timeSinceLastDream = Date.now() - new Date(lastTime).getTime();
      if (timeSinceLastDream < this.config.minIntervalMs) {
        return false;
      }
    }

    return this.config.autoTrigger;
  }

  /**
   * 获取最近的梦境结果
   */
  async getRecentDreams(limit: number = 10): Promise<DreamResult[]> {
    return this.recentDreams.slice(-limit).reverse();
  }

  /**
   * 应用修复建议
   * 注：这是一个占位实现，实际应用需要与 Wiki 系统集成
   */
  async applyRepairs(dreamId: string): Promise<{ applied: number; failed: number }> {
    const dream = this.recentDreams.find(d => d.id === dreamId);
    if (!dream) {
      throw new Error(`未找到梦境: ${dreamId}`);
    }

    if (!dream.repairs || dream.repairs.length === 0) {
      return { applied: 0, failed: 0 };
    }

    // 这里应该与 Wiki 系统集成来实际应用修复
    // 目前只返回模拟结果
    let applied = 0;
    let failed = 0;

    for (const repair of dream.repairs) {
      try {
        // 模拟修复应用
        console.log(`应用修复建议: ${repair.description}`);
        applied++;
      } catch (error) {
        failed++;
      }
    }

    return { applied, failed };
  }

  /**
   * 计算梦境质量分数
   */
  private calculateDreamQuality(result: DreamResult): number {
    let score = 0;
    let totalWeight = 0;

    // 1. 阶段成功率 (权重 30%)
    const successPhases = result.phaseResults.filter(p => p.success).length;
    score += (successPhases / 5) * 30;
    totalWeight += 30;

    // 2. 聚类质量 (权重 20%)
    if (result.clusters && result.clusters.length > 0) {
      const avgCohesion = result.clusters.reduce(
        (sum, c) => sum + c.cohesion,
        0
      ) / result.clusters.length;
      score += avgCohesion * 20;
      totalWeight += 20;
    }

    // 3. 洞见数量和质量 (权重 25%)
    if (result.insights && result.insights.length > 0) {
      const avgConfidence = result.insights.reduce(
        (sum, i) => sum + i.confidence,
        0
      ) / result.insights.length;
      const countScore = Math.min(1, result.insights.length / 10);
      score += (avgConfidence * 0.7 + countScore * 0.3) * 25;
      totalWeight += 25;
    }

    // 4. WFGY 验证结果 (权重 25%)
    if (result.wfgyVerification) {
      const verifiedScore = result.wfgyVerification.verified ? 1 : 0;
      const riskScore = 1 - result.wfgyVerification.hallucinationRisk;
      score += (verifiedScore * 0.5 + riskScore * 0.5) * 25;
      totalWeight += 25;
    }

    return totalWeight > 0 ? score / totalWeight * 100 : 0;
  }
}
