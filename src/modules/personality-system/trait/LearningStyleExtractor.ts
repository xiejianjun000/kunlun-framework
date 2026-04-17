/**
 * LearningStyleExtractor.ts
 * 学习偏好提取器
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { ExtractedTrait, TraitType, LearningPreference } from '../../core/interfaces/IPersonalitySystem';

/**
 * 学习偏好分析结果
 */
export interface LearningAnalysis {
  /** 偏好类型 */
  preference: LearningPreference;
  /** 置信度 */
  confidence: number;
  /** 证据 */
  evidence: string[];
  /** 描述 */
  description: string;
}

/**
 * 学习风格提取器类
 * 
 * 从用户行为和表达中分析学习偏好
 * 
 * @example
 * ```typescript
 * const extractor = new LearningStyleExtractor();
 * const preferences = await extractor.extract(['看视频教程学习', '我喜欢动手实践']);
 * ```
 */
export class LearningStyleExtractor {
  /** 视觉型学习模式 */
  private visualPatterns = [
    /看图|图表|图示|可视化/i,
    /视频|演示|展示/i,
    /看到|观察|注意到/i,
    /画面|图像|视觉/i
  ];

  /** 听觉型学习模式 */
  private auditoryPatterns = [
    /听|音频|播客|讲座/i,
    /听说|听到|听说是/i,
    /讨论|对话|交流/i,
    /录音|语音|广播/i
  ];

  /** 动觉型学习模式 */
  private kinestheticPatterns = [
    /动手|实践|实际操作/i,
    /做|尝试|试验/i,
    /体验|感受|经历/i,
    /练习|演练|实操/i
  ];

  /** 阅读型学习模式 */
  private readingPatterns = [
    /阅读|读书|看资料/i,
    /文档|手册|指南/i,
    /文字|书面|文本/i,
    /学习|研究|分析/i
  ];

  /** 体验型学习模式 */
  private experientialPatterns = [
    /案例|实例|例子/i,
    /经验|经历|体验/i,
    /总结|归纳|提炼/i,
    /应用|运用|使用/i
  ];

  /**
   * 提取学习偏好
   * @param contents 内容列表
   */
  async extract(contents: string[]): Promise<ExtractedTrait[]> {
    const analysis = this.analyzeLearningPreferences(contents);
    return this.convertToTraits(analysis);
  }

  /**
   * 分析学习偏好
   * @param contents 内容列表
   */
  private analyzeLearningPreferences(contents: string[]): LearningAnalysis[] {
    const analyses: LearningAnalysis[] = [];
    const allContent = contents.join(' ');

    // 分析各类型偏好强度
    const visualMatches = this.matchPatterns(allContent, this.visualPatterns);
    const auditoryMatches = this.matchPatterns(allContent, this.auditoryPatterns);
    const kinestheticMatches = this.matchPatterns(allContent, this.kinestheticPatterns);
    const readingMatches = this.matchPatterns(allContent, this.readingPatterns);
    const experientialMatches = this.matchPatterns(allContent, this.experientialPatterns);

    // 计算各类偏好得分
    const totalMatches = 
      visualMatches.length + 
      auditoryMatches.length + 
      kinestheticMatches.length + 
      readingMatches.length +
      experientialMatches.length;

    if (totalMatches === 0) {
      return [];
    }

    // 视觉型
    analyses.push({
      preference: LearningPreference.VISUAL,
      confidence: Math.min(1, visualMatches.length / 3),
      evidence: visualMatches,
      description: visualMatches.length > 0 ? '视觉学习型' : '无明显偏好'
    });

    // 听觉型
    analyses.push({
      preference: LearningPreference.AUDITORY,
      confidence: Math.min(1, auditoryMatches.length / 3),
      evidence: auditoryMatches,
      description: auditoryMatches.length > 0 ? '听觉学习型' : '无明显偏好'
    });

    // 动觉型
    analyses.push({
      preference: LearningPreference.KINESTHETIC,
      confidence: Math.min(1, kinestheticMatches.length / 3),
      evidence: kinestheticMatches,
      description: kinestheticMatches.length > 0 ? '动觉学习型' : '无明显偏好'
    });

    // 阅读型
    analyses.push({
      preference: LearningPreference.READING,
      confidence: Math.min(1, readingMatches.length / 3),
      evidence: readingMatches,
      description: readingMatches.length > 0 ? '阅读学习型' : '无明显偏好'
    });

    // 体验型
    analyses.push({
      preference: LearningPreference.EXPERIENTIAL,
      confidence: Math.min(1, experientialMatches.length / 3),
      evidence: experientialMatches,
      description: experientialMatches.length > 0 ? '体验学习型' : '无明显偏好'
    });

    // 找出最强偏好
    const sorted = analyses.sort((a, b) => b.confidence - a.confidence);
    
    // 返回置信度较高的偏好
    return sorted.filter(a => a.confidence >= 0.3);
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
   * 转换为特质
   */
  private convertToTraits(analyses: LearningAnalysis[]): ExtractedTrait[] {
    const traits: ExtractedTrait[] = [];

    for (const analysis of analyses) {
      if (analysis.confidence < 0.3) continue;

      traits.push({
        type: TraitType.INFORMATION_PROCESSING,
        value: analysis.preference,
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
  analyzeSingle(content: string): LearningAnalysis[] {
    return this.analyzeLearningPreferences([content]);
  }

  /**
   * 获取学习偏好描述
   */
  getPreferenceDescription(preference: LearningPreference): string {
    const descriptions: Record<LearningPreference, string> = {
      [LearningPreference.VISUAL]: '视觉型 - 通过图表、图像、视频等视觉材料学习效果最好',
      [LearningPreference.AUDITORY]: '听觉型 - 通过听讲、讨论、音频等方式学习效果最好',
      [LearningPreference.KINESTHETIC]: '动觉型 - 通过动手实践、亲身体验学习效果最好',
      [LearningPreference.READING]: '阅读型 - 通过阅读文字材料、文档学习效果最好',
      [LearningPreference.EXPERIENTIAL]: '体验型 - 通过案例分析、经验总结学习效果最好'
    };
    return descriptions[preference] || '未知偏好';
  }

  /**
   * 识别学习信号
   * @param content 内容
   */
  identifyLearningSignals(content: string): {
    isLearning: boolean;
    confidence: number;
    signals: string[];
  } {
    const learningSignals = [
      /学习|掌握|了解/i,
      /教程|课程|培训/i,
      /知识|技能|能力/i,
      /方法|技巧|窍门/i
    ];

    const signals: string[] = [];
    for (const signal of learningSignals) {
      const match = content.match(signal);
      if (match) {
        signals.push(match[0]);
      }
    }

    return {
      isLearning: signals.length > 0,
      confidence: Math.min(1, signals.length * 0.25),
      signals
    };
  }

  /**
   * 推荐学习方式
   * @param preferences 学习偏好
   */
  recommendLearningMethods(preferences: LearningPreference[]): string[] {
    const methods: string[] = [];
    
    for (const pref of preferences) {
      switch (pref) {
        case LearningPreference.VISUAL:
          methods.push('使用图表和可视化工具', '观看教学视频', '制作思维导图');
          break;
        case LearningPreference.AUDITORY:
          methods.push('参加讲座和研讨会', '收听播客和音频', '进行小组讨论');
          break;
        case LearningPreference.KINESTHETIC:
          methods.push('动手实践和实验', '模拟操作练习', '案例实操');
          break;
        case LearningPreference.READING:
          methods.push('阅读官方文档', '学习技术手册', '研究案例文档');
          break;
        case LearningPreference.EXPERIENTIAL:
          methods.push('分析实际案例', '总结项目经验', '应用所学知识');
          break;
      }
    }

    return [...new Set(methods)];
  }
}

export default LearningStyleExtractor;
