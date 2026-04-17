/**
 * PersonalityReporter.ts
 * 人格报告生成器
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IPersonalityProfile,
  PersonalityReport,
  ReportContent,
  BehaviorData,
  TraitType
} from '../../core/interfaces/IPersonalitySystem';

/**
 * 报告生成配置
 */
export interface ReporterConfig {
  /** 是否包含详细分析 */
  includeDetailedAnalysis: boolean;
  /** 是否包含建议 */
  includeSuggestions: boolean;
  /** 语言 */
  language: 'zh-CN' | 'en-US';
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ReporterConfig = {
  includeDetailedAnalysis: true,
  includeSuggestions: true,
  language: 'zh-CN'
};

/**
 * 人格报告生成器类
 * 
 * 生成人格画像的分析报告
 * 支持概要报告、详细报告和对比报告
 * 
 * @example
 * ```typescript
 * const reporter = new PersonalityReporter();
 * 
 * // 生成概要报告
 * const summary = await reporter.generateReport(profile, behaviors, 'summary');
 * 
 * // 生成详细报告
 * const detailed = await reporter.generateReport(profile, behaviors, 'detailed');
 * ```
 */
export class PersonalityReporter {
  /** 配置 */
  private config: ReporterConfig;

  /**
   * 构造函数
   * @param config 配置
   */
  constructor(config?: Partial<ReporterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 生成报告
   * @param profile 人格画像
   * @param behaviors 行为数据
   * @param type 报告类型
   */
  async generateReport(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[],
    type: 'summary' | 'detailed' | 'comparison'
  ): Promise<PersonalityReport> {
    const now = new Date();
    
    let content: ReportContent;
    let suggestions: string[] = [];

    switch (type) {
      case 'summary':
        content = await this.generateSummaryReport(profile, behaviors);
        break;
      case 'detailed':
        content = await this.generateDetailedReport(profile, behaviors);
        suggestions = this.generateSuggestions(profile, behaviors);
        break;
      case 'comparison':
        content = await this.generateComparisonReport(profile, behaviors);
        break;
      default:
        content = await this.generateSummaryReport(profile, behaviors);
    }

    return {
      reportId: `report_${uuidv4()}`,
      userId: profile.userId,
      generatedAt: now,
      type,
      content,
      suggestions: this.config.includeSuggestions ? suggestions : undefined
    };
  }

  /**
   * 生成概要报告
   */
  private async generateSummaryReport(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): Promise<ReportContent> {
    // 生成概要描述
    const summary = this.generateSummary(profile);

    // 生成维度分析
    const dimensionAnalysis = this.analyzeDimensions(profile);

    // 生成关键发现
    const keyFindings = this.extractKeyFindings(profile);

    // 计算置信度评估
    const confidenceAssessment = this.assessConfidence(profile);

    return {
      summary,
      dimensionAnalysis,
      keyFindings,
      confidenceAssessment
    };
  }

  /**
   * 生成详细报告
   */
  private async generateDetailedReport(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): Promise<ReportContent> {
    const summaryReport = await this.generateSummaryReport(profile, behaviors);

    // 添加更详细的维度分析
    for (const dim of Object.keys(summaryReport.dimensionAnalysis)) {
      summaryReport.dimensionAnalysis[dim] += this.generateDetailedDimensionAnalysis(
        profile,
        dim
      );
    }

    // 添加行为证据
    const behaviorEvidence = this.analyzeBehaviorEvidence(profile, behaviors);
    summaryReport.keyFindings.push(...behaviorEvidence);

    return summaryReport;
  }

  /**
   * 生成对比报告
   */
  private async generateComparisonReport(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): Promise<ReportContent> {
    // 简化版对比报告（实际应该比较两个画像）
    const summaryReport = await this.generateSummaryReport(profile, behaviors);

    summaryReport.keyFindings.push(
      '此为单人对比报告，需要提供第二个画像进行对比分析'
    );

    return summaryReport;
  }

  /**
   * 生成概要描述
   */
  private generateSummary(profile: IPersonalityProfile): string {
    const traits = profile.stableTraits;
    const confidence = profile.confidenceScore;
    const version = profile.version;

    let summary = `用户人格画像已完成 ${version} 次迭代更新，`;

    if (traits.length > 0) {
      summary += `核心特质包括：${traits.slice(0, 5).join('、')}。`;
    } else {
      summary += '目前正在积累核心特质数据。';
    }

    if (confidence >= 0.8) {
      summary += '画像置信度较高，能较准确地反映用户特征。';
    } else if (confidence >= 0.5) {
      summary += '画像置信度中等，建议继续收集行为数据以提高准确性。';
    } else {
      summary += '画像置信度较低，需要更多行为数据来完善画像。';
    }

    return summary;
  }

  /**
   * 分析维度
   */
  private analyzeDimensions(profile: IPersonalityProfile): Record<string, string> {
    const analysis: Record<string, string> = {};

    // 分析人格维度
    const personalityDims = profile.dimensions.personality.dimensions;
    for (const [key, dim] of Object.entries(personalityDims)) {
      const label = this.getDimensionLabel(key);
      const value = typeof dim.value === 'number' ? dim.value : 0.5;
      
      if (dim.confidence > 0.5) {
        analysis[key] = `${label}：${dim.label}（置信度 ${(dim.confidence * 100).toFixed(0)}%）`;
      } else {
        analysis[key] = `${label}：数据不足（置信度 ${(dim.confidence * 100).toFixed(0)}%）`;
      }
    }

    // 分析视角维度
    const perspectiveDims = profile.dimensions.perspective;
    analysis.decisionStyle = `决策风格：${perspectiveDims.dimensions.decisionStyle?.label || '待确定'}`;
    analysis.informationProcessing = `信息处理：${perspectiveDims.dimensions.informationProcessing?.label || '待确定'}`;

    return analysis;
  }

  /**
   * 获取维度标签
   */
  private getDimensionLabel(key: string): string {
    const labels: Record<string, string> = {
      extraversion_introversion: '外向/内向',
      openness_conservatism: '开放性/保守性',
      rationality_emotion: '理性/感性',
      risk_tolerance: '风险偏好'
    };
    return labels[key] || key;
  }

  /**
   * 生成详细维度分析
   */
  private generateDetailedDimensionAnalysis(
    profile: IPersonalityProfile,
    dimensionKey: string
  ): string {
    const dim = profile.dimensions.personality.dimensions[dimensionKey as TraitType];
    
    if (!dim || !dim.evidence || dim.evidence.length === 0) {
      return '目前缺乏足够的证据支持此特质判断。';
    }

    const evidenceCount = dim.evidence.length;
    const evidenceSummary = dim.evidence.slice(0, 3).join('；');

    return `基于 ${evidenceCount} 项行为证据，包括：${evidenceSummary}。`;
  }

  /**
   * 提取关键发现
   */
  private extractKeyFindings(profile: IPersonalityProfile): string[] {
    const findings: string[] = [];

    // 检查高置信度特质
    const personalityDims = profile.dimensions.personality.dimensions;
    for (const [key, dim] of Object.entries(personalityDims)) {
      if (dim.confidence >= 0.8) {
        findings.push(`高置信度发现：用户在${this.getDimensionLabel(key)}方面表现为${dim.label}`);
      }
    }

    // 检查稳定性
    if (profile.stableTraits.length >= 3) {
      findings.push(`画像稳定性良好：已识别出 ${profile.stableTraits.length} 个稳定特质`);
    }

    // 检查版本历史
    if (profile.evolutionHistory.length > 5) {
      const recentEvolution = profile.evolutionHistory.slice(-3);
      findings.push(`近期更新 ${recentEvolution.length} 次，画像正在持续优化中`);
    }

    // 检查置信度
    if (profile.confidenceScore < 0.5) {
      findings.push('建议：画像置信度偏低，可通过更多交互提高准确性');
    }

    return findings;
  }

  /**
   * 分析行为证据
   */
  private analyzeBehaviorEvidence(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): string[] {
    const findings: string[] = [];

    if (behaviors.length === 0) {
      return ['暂无行为数据，建议开始使用系统以积累数据'];
    }

    // 分析行为类型分布
    const typeCounts = new Map<string, number>();
    for (const behavior of behaviors) {
      typeCounts.set(behavior.type, (typeCounts.get(behavior.type) || 0) + 1);
    }

    const topTypes = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topTypes.length > 0) {
      findings.push(`主要行为类型：${topTypes.map(([type, count]) => `${type}(${count}次)`).join('、')}`);
    }

    return findings;
  }

  /**
   * 评估置信度
   */
  private assessConfidence(
    profile: IPersonalityProfile
  ): {
    overall: number;
    byDimension: Record<string, number>;
  } {
    const byDimension: Record<string, number> = {};

    // 评估各维度置信度
    const personalityDims = profile.dimensions.personality.dimensions;
    for (const [key, dim] of Object.entries(personalityDims)) {
      byDimension[key] = dim.confidence;
    }

    // 评估视角置信度
    byDimension.perspective = (
      (profile.dimensions.perspective.dimensions.decisionStyle?.confidence || 0) +
      (profile.dimensions.perspective.dimensions.informationProcessing?.confidence || 0)
    ) / 2;

    return {
      overall: profile.confidenceScore,
      byDimension
    };
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    profile: IPersonalityProfile,
    behaviors: BehaviorData[]
  ): string[] {
    const suggestions: string[] = [];

    // 基于置信度建议
    if (profile.confidenceScore < 0.5) {
      suggestions.push('建议增加系统使用频率，帮助完善人格画像');
    }

    // 基于特质建议
    const personalityDims = profile.dimensions.personality.dimensions;
    
    if (personalityDims.openness_conservatism?.value && 
        (personalityDims.openness_conservatism.value as number) < 0.4) {
      suggestions.push('检测到保守倾向，建议尝试新功能和不同的工作方式');
    }

    if (personalityDims.rationality_emotion?.value && 
        (personalityDims.rationality_emotion.value as number) > 0.7) {
      suggestions.push('偏好理性分析，建议提供更多数据支撑的材料');
    }

    // 基于行为数据建议
    if (behaviors.length < 10) {
      suggestions.push('行为数据较少，建议持续使用系统以积累更多数据');
    }

    // 默认建议
    if (suggestions.length === 0) {
      suggestions.push('画像已基本完善，可根据此画像优化个性化服务');
    }

    return suggestions;
  }

  /**
   * 导出报告为文本格式
   * @param report 报告
   */
  exportAsText(report: PersonalityReport): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push(`人格分析报告`);
    lines.push(`报告ID: ${report.reportId}`);
    lines.push(`生成时间: ${report.generatedAt.toLocaleString()}`);
    lines.push(`报告类型: ${report.type === 'summary' ? '概要' : report.type === 'detailed' ? '详细' : '对比'}`);
    lines.push('═'.repeat(60));
    lines.push('');

    lines.push('【概要】');
    lines.push(report.content.summary);
    lines.push('');

    lines.push('【维度分析】');
    for (const [key, analysis] of Object.entries(report.content.dimensionAnalysis)) {
      lines.push(`  • ${key}: ${analysis}`);
    }
    lines.push('');

    lines.push('【关键发现】');
    for (const finding of report.content.keyFindings) {
      lines.push(`  • ${finding}`);
    }
    lines.push('');

    lines.push('【置信度评估】');
    lines.push(`  整体置信度: ${(report.content.confidenceAssessment.overall * 100).toFixed(1)}%`);
    lines.push('  各维度置信度:');
    for (const [dim, conf] of Object.entries(report.content.confidenceAssessment.byDimension)) {
      lines.push(`    - ${dim}: ${(conf * 100).toFixed(1)}%`);
    }
    lines.push('');

    if (report.suggestions && report.suggestions.length > 0) {
      lines.push('【建议】');
      for (const suggestion of report.suggestions) {
        lines.push(`  • ${suggestion}`);
      }
    }

    lines.push('');
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * 导出报告为JSON格式
   * @param report 报告
   */
  exportAsJSON(report: PersonalityReport): string {
    return JSON.stringify(report, null, 2);
  }
}

export default PersonalityReporter;
