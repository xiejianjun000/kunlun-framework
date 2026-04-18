/**
 * REMPhaseExtractor.ts - REM阶段提取器
 * 
 * OpenTaiji三阶段记忆整合，实现REM Phase功能：
 * - LLM模式提取
 * - 主题标签生成
 * - 写入DREAMS.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ShortTermRecallEntry,
  RemDreamingPreview,
  RemDreamingCandidate
} from './types';

const DREAMS_FILE = 'DREAMS.md';
const DAILY_DREAMING_DIR = 'memory/.dreams';

export interface ExtractorOptions {
  patternLimit?: number;
  minPatternStrength?: number;
  truthConfidenceThreshold?: number;
  truthLimit?: number;
}

export interface ExtractionResult {
  reflections: PatternReflection[];
  candidateTruths: CandidateTruth[];
  dreamNarrative: string;
}

export interface PatternReflection {
  tag: string;
  strength: number;
  count: number;
  evidence: string[];
}

export interface CandidateTruth {
  snippet: string;
  confidence: number;
  evidence: string;
}

export class REMPhaseExtractor {
  private workspaceDir: string;
  private options: Required<ExtractorOptions>;

  constructor(
    workspaceDir: string,
    options?: ExtractorOptions
  ) {
    this.workspaceDir = workspaceDir;
    this.options = {
      patternLimit: options?.patternLimit ?? 5,
      minPatternStrength: options?.minPatternStrength ?? 0.4,
      truthConfidenceThreshold: options?.truthConfidenceThreshold ?? 0.45,
      truthLimit: options?.truthLimit ?? 3
    };
  }

  /**
   * 执行REM Phase提取
   */
  async execute(entries: ShortTermRecallEntry[]): Promise<ExtractionResult> {
    // 1. 分析模式标签
    const reflections = this.analyzePatterns(entries);
    
    // 2. 选择候选真理
    const candidateTruths = this.selectCandidateTruths(entries);
    
    // 3. 生成梦境叙述
    const dreamNarrative = await this.generateDreamNarrative(reflections, candidateTruths);
    
    // 4. 写入DREAMS.md
    await this.writeDreamsReport(reflections, candidateTruths, dreamNarrative);
    
    return {
      reflections,
      candidateTruths,
      dreamNarrative
    };
  }

  /**
   * 分析模式标签
   */
  private analyzePatterns(entries: ShortTermRecallEntry[]): PatternReflection[] {
    // 统计标签出现频率
    const tagStats = new Map<string, { count: number; evidence: Set<string> }>();
    
    for (const entry of entries) {
      for (const tag of entry.conceptTags) {
        if (!tag) continue;
        
        const stat = tagStats.get(tag) || { count: 0, evidence: new Set() };
        stat.count++;
        stat.evidence.add(`${entry.path}:${entry.startLine}-${entry.endLine}`);
        tagStats.set(tag, stat);
      }
    }

    // 计算标签强度并排序
    const ranked = Array.from(tagStats.entries())
      .map(([tag, stat]) => {
        // 强度 = (出现次数 / 总条目数) * 2，上限1.0
        const strength = Math.min(1, (stat.count / Math.max(1, entries.length)) * 2);
        return {
          tag,
          strength,
          count: stat.count,
          evidence: Array.from(stat.evidence).slice(0, 3)
        };
      })
      .filter(entry => entry.strength >= this.options.minPatternStrength)
      .sort((a, b) => 
        b.strength - a.strength || 
        b.count - a.count || 
        a.tag.localeCompare(b.tag)
      )
      .slice(0, this.options.patternLimit);

    return ranked;
  }

  /**
   * 选择候选真理
   */
  private selectCandidateTruths(entries: ShortTermRecallEntry[]): CandidateTruth[] {
    // 过滤已提升的条目
    const unpromoted = entries.filter(entry => !entry.promotedAt);
    
    // 计算每个条目的真理置信度
    const scored = unpromoted.map(entry => {
      const confidence = this.calculateTruthConfidence(entry);
      return {
        snippet: entry.snippet,
        confidence,
        evidence: `${entry.path}:${entry.startLine}-${entry.endLine}`
      };
    });
    
    // 按置信度排序并去重
    return scored
      .filter(s => s.confidence >= this.options.truthConfidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence || a.snippet.localeCompare(b.snippet))
      .slice(0, this.options.truthLimit);
  }

  /**
   * 计算真理置信度
   */
  private calculateTruthConfidence(entry: ShortTermRecallEntry): number {
    // 回忆强度
    const recallStrength = Math.min(1, Math.log1p(entry.recallCount) / Math.log1p(6));
    
    // 平均分
    const signalCount = entry.recallCount + entry.dailyCount + entry.groundedCount;
    const avgScore = signalCount > 0 
      ? Math.max(0, Math.min(1, entry.totalScore / signalCount))
      : 0;
    
    // 巩固度
    const consolidation = Math.min(1, (entry.recallDays?.length ?? 0) / 3);
    
    // 概念标签
    const conceptual = Math.min(1, (entry.conceptTags?.length ?? 0) / 6);
    
    // 加权组合
    return Math.max(0, Math.min(1,
      avgScore * 0.45 + 
      recallStrength * 0.25 + 
      consolidation * 0.2 + 
      conceptual * 0.1
    ));
  }

  /**
   * 生成梦境叙述
   */
  private generateDreamNarrative(
    reflections: PatternReflection[],
    truths: CandidateTruth[]
  ): string {
    const now = new Date();
    const dateStr = this.formatDate(now);
    
    let narrative = `# 梦境日记 - ${dateStr}\n\n`;
    narrative += `*这是记忆系统在REM睡眠阶段自动生成的梦境叙述*\n\n`;
    
    // 反思主题
    if (reflections.length > 0) {
      narrative += `## 梦境主题\n\n`;
      narrative += `在今夜的记忆整合中，以下主题反复出现：\n\n`;
      
      for (const ref of reflections) {
        narrative += `### ${ref.tag}\n`;
        narrative += `- 出现次数：${ref.count}次\n`;
        narrative += `- 置信度：${(ref.strength * 100).toFixed(0)}%\n`;
        narrative += `- 关联记忆：${ref.evidence.length}条\n\n`;
      }
    }
    
    // 持久真理
    if (truths.length > 0) {
      narrative += `## 持久真理\n\n`;
      narrative += `以下记忆片段被认为具有持久价值：\n\n`;
      
      for (const truth of truths) {
        narrative += `> ${truth.snippet}\n`;
        narrative += `> - 置信度：${(truth.confidence * 100).toFixed(0)}%\n`;
        narrative += `> - 来源：${truth.evidence}\n\n`;
      }
    }
    
    // 元信息
    narrative += `---\n`;
    narrative += `生成时间：${now.toISOString()}\n`;
    narrative += `整合记忆数：${reflections.reduce((sum, r) => sum + r.count, 0)}\n`;
    narrative += `候选真理数：${truths.length}\n`;
    
    return narrative;
  }

  /**
   * 写入梦境报告
   */
  private async writeDreamsReport(
    reflections: PatternReflection[],
    truths: CandidateTruth[],
    narrative: string
  ): Promise<void> {
    // 确保目录存在
    const dreamsDir = path.join(this.workspaceDir, DAILY_DREAMING_DIR);
    await fs.mkdir(dreamsDir, { recursive: true });
    
    // 写入主梦境文件
    const dreamsPath = path.join(this.workspaceDir, DREAMS_FILE);
    let existingContent = '';
    
    try {
      existingContent = await fs.readFile(dreamsPath, 'utf-8');
    } catch (error) {
      // 文件不存在
      existingContent = '# DREAMS.md\n\n## 梦境日志\n\n';
    }
    
    // 追加新内容
    const newEntry = this.formatDreamsEntry(reflections, truths);
    const updatedContent = existingContent + '\n' + newEntry;
    
    await fs.writeFile(dreamsPath, updatedContent, 'utf-8');
    
    // 写入单独的每日梦境文件
    const today = new Date().toISOString().split('T')[0];
    const dailyDreamsPath = path.join(dreamsDir, `dream-${today}.md`);
    await fs.writeFile(dailyDreamsPath, narrative, 'utf-8');
  }

  /**
   * 格式化梦境条目
   */
  private formatDreamsEntry(
    reflections: PatternReflection[],
    truths: CandidateTruth[]
  ): string {
    const now = new Date();
    const dateStr = this.formatDate(now);
    
    let entry = `\n## ${dateStr} 梦境整合\n\n`;
    entry += `### 反思主题\n\n`;
    
    if (reflections.length > 0) {
      for (const ref of reflections) {
        entry += `- \`${ref.tag}\`: ${ref.count}次出现, 置信度${(ref.strength * 100).toFixed(0)}%\n`;
      }
    } else {
      entry += `- 无显著主题\n`;
    }
    
    entry += `\n### 候选真理\n\n`;
    
    if (truths.length > 0) {
      for (const truth of truths) {
        entry += `- ${truth.snippet} [置信度=${truth.confidence.toFixed(2)}]\n`;
      }
    } else {
      entry += `- 无候选真理\n`;
    }
    
    entry += `\n---\n`;
    entry += `整合时间：${now.toISOString()}\n`;
    
    return entry;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 预览REM梦境
   */
  preview(entries: ShortTermRecallEntry[]): RemDreamingPreview {
    const reflections = this.analyzePatterns(entries);
    const truths = this.selectCandidateTruths(entries);
    
    const reflectionLines = reflections.map(r => 
      `- 主题: \`${r.tag}\` 在${r.count}个记忆中反复出现`
    );
    
    if (reflectionLines.length === 0) {
      reflectionLines.push('- 无强模式浮现');
    }
    
    const truthLines = truths.map(t => 
      `- ${t.snippet} [置信度=${t.confidence.toFixed(2)} 证据=${t.evidence}]`
    );
    
    if (truthLines.length === 0) {
      truthLines.push('- 无候选持久真理浮现');
    }
    
    return {
      sourceEntryCount: entries.length,
      reflections: reflectionLines,
      candidateTruths: truths.map(t => ({
        snippet: t.snippet,
        confidence: t.confidence,
        evidence: t.evidence
      })),
      candidateKeys: truths.map(t => t.evidence),
      bodyLines: [
        '### 反思',
        ...reflectionLines,
        '',
        '### 可能的持久真理',
        ...truthLines
      ]
    };
  }
}

export default REMPhaseExtractor;
