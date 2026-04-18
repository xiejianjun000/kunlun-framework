/**
 * CommunicationStyleExtractor.ts
 * 沟通风格提取器
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { ExtractedTrait, TraitType, CommunicationStyle } from '../../../core/interfaces/IPersonalitySystem';

/**
 * 沟通风格分析结果
 */
export interface CommunicationAnalysis {
  /** 风格类型 */
  style: CommunicationStyle;
  /** 置信度 */
  confidence: number;
  /** 证据 */
  evidence: string[];
  /** 描述 */
  description: string;
}

/**
 * 沟通风格提取器类
 * 
 * 从文本内容中分析用户的沟通风格偏好
 * 
 * @example
 * ```typescript
 * const extractor = new CommunicationStyleExtractor();
 * const styles = await extractor.extract(['详细报告', '简洁总结']);
 * ```
 */
export class CommunicationStyleExtractor {
  /** 正式用语模式 */
  private formalPatterns = [
    /请您|麻烦|感谢|尊敬|根据|依据|按照|遵照|特此|为此/i,
    /建议|推荐|认为|指出|明确|规定|要求/i,
    /必须|应当|需要|务必/i
  ];

  /** 随意用语模式 */
  private casualPatterns = [
    /好嘞|没问题|OK|好的|行|随便|都行/i,
    /我觉得|大概|可能|应该|估计/i,
    /这个嘛|那个|话说|其实/i
  ];

  /** 技术用语模式 */
  private technicalPatterns = [
    /实现|功能|接口|模块|架构|系统|流程|方案/i,
    /数据|算法|模型|参数|配置|部署/i,
    /API|SDK|数据库|服务器|客户端/i
  ];

  /** 情感用语模式 */
  private emotionalPatterns = [
    /感觉|觉得|希望|期待|担心|忧虑|开心|高兴/i,
    /太棒了|太好了|不错|一般|有点/i,
    /加油|努力|坚持|加油/i
  ];

  /** 直接表达模式 */
  private directPatterns = [
    /直接|马上|立刻|立即|赶紧/,
    /不用|不需要|不需要|没有必要/i,
    /就这样|就这么办|就这么定了/i
  ];

  /** 间接表达模式 */
  private indirectPatterns = [
    /你觉得|是否可以|能不能|能不能够/i,
    /如果可以|要是能|方便的话/i,
    /仅供参考|仅供参考|可以考虑/i
  ];

  /**
   * 提取沟通风格
   * @param contents 内容列表
   */
  async extract(contents: string[]): Promise<ExtractedTrait[]> {
    const analysis = this.analyzeStyles(contents);
    return this.convertToTraits(analysis);
  }

  /**
   * 分析沟通风格
   * @param contents 内容列表
   */
  private analyzeStyles(contents: string[]): CommunicationAnalysis[] {
    const styles: CommunicationAnalysis[] = [];
    const allContent = contents.join(' ');

    // 分析正式程度
    const formalMatches = this.matchPatterns(allContent, this.formalPatterns);
    const casualMatches = this.matchPatterns(allContent, this.casualPatterns);
    const formalityScore = this.calculateScore(formalMatches, casualMatches, 0.5);
    
    styles.push({
      style: CommunicationStyle.FORMAL,
      confidence: Math.abs(formalityScore - 0.5) * 2,
      evidence: formalMatches,
      description: formalityScore > 0.6 ? '偏正式' : formalityScore < 0.4 ? '偏随意' : '中立'
    });

    // 分析技术程度
    const techMatches = this.matchPatterns(allContent, this.technicalPatterns);
    const emotionalMatches = this.matchPatterns(allContent, this.emotionalPatterns);
    const technicalScore = this.calculateScore(techMatches, emotionalMatches, 0.3);
    
    styles.push({
      style: CommunicationStyle.TECHNICAL,
      confidence: technicalScore > 0.5 ? technicalScore : 1 - technicalScore,
      evidence: techMatches,
      description: technicalScore > 0.5 ? '技术导向' : '情感导向'
    });

    // 分析直接程度
    const directMatches = this.matchPatterns(allContent, this.directPatterns);
    const indirectMatches = this.matchPatterns(allContent, this.indirectPatterns);
    const directScore = this.calculateScore(directMatches, indirectMatches, 0.5);
    
    styles.push({
      style: CommunicationStyle.DIRECT,
      confidence: Math.abs(directScore - 0.5) * 2,
      evidence: directMatches,
      description: directScore > 0.6 ? '直接表达' : directScore < 0.4 ? '间接表达' : '中立'
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
  private convertToTraits(analyses: CommunicationAnalysis[]): ExtractedTrait[] {
    const traits: ExtractedTrait[] = [];

    for (const analysis of analyses) {
      if (analysis.confidence < 0.3) continue;

      let type: TraitType;
      let value: string;

      switch (analysis.style) {
        case CommunicationStyle.FORMAL:
          type = TraitType.INFORMATION_PROCESSING;
          value = analysis.description.includes('正式') ? 'formal' : 
                  analysis.description.includes('随意') ? 'casual' : 'balanced';
          break;
        case CommunicationStyle.TECHNICAL:
          type = TraitType.INFORMATION_PROCESSING;
          value = analysis.description.includes('技术') ? 'technical' : 
                  analysis.description.includes('情感') ? 'emotional' : 'balanced';
          break;
        case CommunicationStyle.DIRECT:
          type = TraitType.INFORMATION_PROCESSING;
          value = analysis.description.includes('直接') ? 'direct' : 
                  analysis.description.includes('间接') ? 'indirect' : 'balanced';
          break;
        default:
          continue;
      }

      traits.push({
        type,
        value,
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
  analyzeSingle(content: string): CommunicationAnalysis[] {
    return this.analyzeStyles([content]);
  }

  /**
   * 获取风格描述
   */
  getStyleDescription(style: CommunicationStyle): string {
    const descriptions: Record<CommunicationStyle, string> = {
      [CommunicationStyle.FORMAL]: '正式风格 - 使用规范用语，注重礼节和格式',
      [CommunicationStyle.CASUAL]: '随意风格 - 轻松自然，表达直接',
      [CommunicationStyle.TECHNICAL]: '技术风格 - 注重专业术语和精确表达',
      [CommunicationStyle.EMOTIONAL]: '情感风格 - 注重情感表达和共情',
      [CommunicationStyle.DIRECT]: '直接风格 - 简洁明了，直奔主题',
      [CommunicationStyle.INDIRECT]: '间接风格 - 委婉含蓄，考虑对方感受'
    };
    return descriptions[style] || '未知风格';
  }
}

export default CommunicationStyleExtractor;
