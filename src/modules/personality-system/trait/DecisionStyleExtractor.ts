/**
 * DecisionStyleExtractor.ts
 * 决策风格提取器
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { ExtractedTrait, TraitType, DecisionStyle } from '../../../core/interfaces/IPersonalitySystem';

/**
 * 决策风格分析结果
 */
export interface DecisionAnalysis {
  /** 风格类型 */
  style: DecisionStyle;
  /** 置信度 */
  confidence: number;
  /** 证据 */
  evidence: string[];
  /** 描述 */
  description: string;
}

/**
 * 决策风格提取器类
 * 
 * 从用户行为和表达中分析决策风格
 * 
 * @example
 * ```typescript
 * const extractor = new DecisionStyleExtractor();
 * const styles = await extractor.extract(['让我再想想', '我觉得应该这样做']);
 * ```
 */
export class DecisionStyleExtractor {
  /** 深思熟虑型模式 */
  private deliberatePatterns = [
    /再想想|考虑一下|研究一下|分析一下/i,
    /需要.*更多信息|等待.*确认|等.*再决定/i,
    /让我.*权衡|认真.*思考|全面.*考虑/i,
    /谨慎|稳妥|三思/i
  ];

  /** 直觉型模式 */
  private intuitivePatterns = [
    /直觉|感觉|觉得/i,
    /我认为|我估计|我猜/i,
    /大概|可能|应该|也许/i,
    /先试试|先做做看/i
  ];

  /** 数据驱动型模式 */
  private dataDrivenPatterns = [
    /数据|统计|分析/i,
    /根据.*显示|从.*来看|数据显示/i,
    /指标|参数|量化/i,
    /报告|表格|图表/i
  ];

  /** 权威依赖型模式 */
  private authorityPatterns = [
    /按照.*规定|遵循.*标准|依据.*要求/i,
    /领导|上级|专家|权威/i,
    /建议|推荐|推荐.*这样做/i,
    /大家都|通常|惯例/i
  ];

  /**
   * 提取决策风格
   * @param contents 内容列表
   */
  async extract(contents: string[]): Promise<ExtractedTrait[]> {
    const analysis = this.analyzeDecisionStyles(contents);
    return this.convertToTraits(analysis);
  }

  /**
   * 分析决策风格
   * @param contents 内容列表
   */
  private analyzeDecisionStyles(contents: string[]): DecisionAnalysis[] {
    const styles: DecisionAnalysis[] = [];
    const allContent = contents.join(' ');

    // 分析深思熟虑程度
    const deliberateMatches = this.matchPatterns(allContent, this.deliberatePatterns);
    const intuitiveMatches = this.matchPatterns(allContent, this.intuitivePatterns);
    const deliberateScore = this.calculateScore(deliberateMatches, intuitiveMatches, 0.5);
    
    styles.push({
      style: DecisionStyle.DELIBERATE,
      confidence: Math.abs(deliberateScore - 0.5) * 2,
      evidence: deliberateMatches,
      description: deliberateScore > 0.6 ? '深思熟虑型' : deliberateScore < 0.4 ? '直觉型' : '平衡型'
    });

    // 分析数据驱动程度
    const dataMatches = this.matchPatterns(allContent, this.dataDrivenPatterns);
    const authorityMatches = this.matchPatterns(allContent, this.authorityPatterns);
    const dataScore = this.calculateScore(dataMatches, authorityMatches, 0.5);
    
    styles.push({
      style: DecisionStyle.DATA_DRIVEN,
      confidence: dataScore > 0.5 ? dataScore : 1 - dataScore,
      evidence: dataMatches,
      description: dataScore > 0.6 ? '数据驱动型' : dataScore < 0.4 ? '权威依赖型' : '平衡型'
    });

    return styles;
  }

  /**
   * 匹配模式
   */
  private matchPatterns(content: string, patterns: RegExp[]): string[] {
    const matches: string[] = [];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
    return matches;
  }

  /**
   * 计算得分
   */
  private calculateScore(
    positive: string[],
    negative: string[],
    defaultScore: number
  ): number {
    const posCount = positive.length;
    const negCount = negative.length;
    const total = posCount + negCount;

    if (total === 0) {
      return defaultScore;
    }

    return posCount / total;
  }

  /**
   * 转换为特质
   */
  private convertToTraits(analyses: DecisionAnalysis[]): ExtractedTrait[] {
    const traits: ExtractedTrait[] = [];

    for (const analysis of analyses) {
      if (analysis.confidence < 0.3) continue;

      traits.push({
        type: TraitType.DECISION_STYLE,
        value: analysis.style,
        label: analysis.description,
        confidence: analysis.confidence,
        evidence: analysis.evidence.slice(0, 5),
        sourceBehaviorIds: []
      });
    }

    return traits;
  }

  /**
   * 分析单条内容
   * @param content 内容
   */
  analyzeSingle(content: string): DecisionAnalysis[] {
    return this.analyzeDecisionStyles([content]);
  }

  /**
   * 获取决策风格描述
   */
  getStyleDescription(style: DecisionStyle): string {
    const descriptions: Record<DecisionStyle, string> = {
      [DecisionStyle.DELIBERATE]: '深思熟虑型 - 全面考虑各种因素，谨慎决策',
      [DecisionStyle.INTUITIVE]: '直觉型 - 依赖直觉和经验，快速决策',
      [DecisionStyle.DATA_DRIVEN]: '数据驱动型 - 依靠数据和事实支撑决策',
      [DecisionStyle.AUTHORITY_BASED]: '权威依赖型 - 参考权威意见和标准规范'
    };
    return descriptions[style] || '未知风格';
  }

  /**
   * 识别决策信号
   * @param content 内容
   */
  identifyDecisionSignals(content: string): {
    isDecision: boolean;
    confidence: number;
    signals: string[];
  } {
    const decisionSignals = [
      /决定|决策|选择/i,
      /应该|必须|需要/i,
      /方案|计划|策略/i,
      /权衡|比较|评估/i
    ];

    const signals: string[] = [];
    for (const signal of decisionSignals) {
      const match = content.match(signal);
      if (match) {
        signals.push(match[0]);
      }
    }

    return {
      isDecision: signals.length > 0,
      confidence: Math.min(1, signals.length * 0.25),
      signals
    };
  }
}

export default DecisionStyleExtractor;
