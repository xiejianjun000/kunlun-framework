/**
 * R004: 自相矛盾检测
 * 检测同时出现正反义词汇的情况
 */

import { DetectionRule, DetectionResult } from '../../types';

export const selfContradictionRule: DetectionRule = {
  id: 'R004',
  name: '自相矛盾',
  type: 'self_contradiction',
  baseConfidence: 0.92,

  detect(text: string): DetectionResult | null {
    const oppositePairs = [
      { positive: ['达标', '合格', '符合', '正常'], negative: ['超标', '不合格', '不符合', '异常'] },
      { positive: ['增长', '上升', '增加', '提高'], negative: ['下降', '减少', '降低', '缩减'] },
      { positive: ['正确', '对', '是', '真实'], negative: ['错误', '不对', '不是', '虚假'] },
    ];

    const foundPairs: string[] = [];

    for (const pair of oppositePairs) {
      const hasPositive = pair.positive.some(word => text.includes(word));
      const hasNegative = pair.negative.some(word => text.includes(word));

      if (hasPositive && hasNegative) {
        foundPairs.push(`${pair.positive[0]}/${pair.negative[0]}`);
      }
    }

    if (foundPairs.length === 0) {
      return null;
    }

    return {
      type: 'self_contradiction',
      confidence: this.baseConfidence,
      severity: 'high',
      matches: foundPairs,
      description: `检测到自相矛盾的表述: ${foundPairs.join(', ')} 同时出现`
    };
  }
};
