/**
 * R003: 时间穿越检测
 * 检测提到未来年份、未来法规的表述
 */

import { DetectionRule, DetectionResult } from '../../types';

export const timeTravelRule: DetectionRule = {
  id: 'R003',
  name: '时间穿越',
  type: 'time_travel',
  baseConfidence: 0.88,

  detect(text: string): DetectionResult | null {
    const currentYear = new Date().getFullYear();
    const maxReasonableYear = currentYear + 1;

    // 匹配 4 位年份
    const yearPattern = /\b(20\d{2})\b/g;
    const years: number[] = [];
    let match;

    while ((match = yearPattern.exec(text)) !== null) {
      const year = parseInt(match[1]);
      if (year > maxReasonableYear) {
        years.push(year);
      }
    }

    if (years.length === 0) {
      return null;
    }

    // 检查上下文：是否是"规定"、"标准"、"法律"
    const contextWords = ['规定', '标准', '法规', '法律', '最新', '颁布', '实施', '执行'];
    const hasContext = contextWords.some(word => text.includes(word));

    const confidence = hasContext
      ? Math.min(0.95, this.baseConfidence + 0.07)
      : this.baseConfidence;

    return {
      type: 'time_travel',
      confidence,
      severity: hasContext ? 'high' : 'medium',
      matches: years.map(y => y.toString()),
      description: `检测到未来年份: ${years.join(', ')}，当前 ${currentYear} 年`
    };
  }
};
