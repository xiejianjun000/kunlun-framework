/**
 * R001: 假标准编号检测
 * 检测格式错误的 GB/HJ/ISO 等标准编号
 */

import { DetectionRule, DetectionResult } from '../../types';

export const fakeStandardRule: DetectionRule = {
  id: 'R001',
  name: '假标准编号',
  type: 'fake_standard_number',
  baseConfidence: 0.95,

  detect(text: string): DetectionResult | null {
    // 匹配疑似标准编号的模式
    const patterns = [
      /GB[-\s]?(\d{4,6})[-\s]?(\d{4})/gi,
      /HJ[-\s]?(\d{3,4})[-\s]?(\d{4})/gi,
      /ISO[-\s]?(\d{4,5})[-\s]?(\d{4})/gi,
      /GB\/T[-\s]?(\d+)[-\s]?(\d{4})/gi,
    ];

    const allMatches: string[] = [];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        allMatches.push(...matches);
      }
    }

    if (allMatches.length === 0) {
      return null;
    }

    // 验证标准编号格式是否合理
    const suspiciousMatches = allMatches.filter(match => {
      // 提取年份部分
      const yearMatch = match.match(/(\d{4})$/);
      if (!yearMatch) return true;

      const year = parseInt(yearMatch[1]);
      const currentYear = new Date().getFullYear();

      // 未来年份的标准 = 可疑
      if (year > currentYear + 1) {
        return true;
      }

      // 格式异常检测：GB-XXXX-XXXX 中间是横杠且编号太短
      if (/^GB-\d{3,4}-\d{4}$/i.test(match)) {
        return true;
      }

      return false;
    });

    if (suspiciousMatches.length > 0) {
      return {
        type: 'fake_standard_number',
        confidence: this.baseConfidence,
        severity: 'high',
        matches: suspiciousMatches,
        description: `检测到疑似编造的标准编号: ${suspiciousMatches.join(', ')}`
      };
    }

    return null;
  }
};
