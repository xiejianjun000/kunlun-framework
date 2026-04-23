/**
 * ☯️ WFGY 防幻觉引擎主类
 */

import { DetectionRule, WfgyResult, SeverityLevel } from '../types';
import { fakeStandardRule } from './rules/fakeStandard';
import { timeTravelRule } from './rules/timeTravel';
import { selfContradictionRule } from './rules/selfContradiction';

export class WfgyEngine {
  private rules: DetectionRule[] = [];
  private interceptThreshold = 0.85;
  private warningThreshold = 0.6;

  constructor() {
    // 加载核心规则
    this.loadDefaultRules();
  }

  private loadDefaultRules(): void {
    this.rules.push(
      fakeStandardRule,
      timeTravelRule,
      selfContradictionRule
    );
  }

  /**
   * 检测文本中的幻觉
   */
  detect(text: string, tokenCount: number = 0): WfgyResult {
    if (text.length < 20) {
      return {
        detected: false,
        overallConfidence: 0,
        severity: 'low',
        shouldIntercept: false,
        detections: [],
        detectedAt: Date.now(),
        tokenCount,
        evidenceChain: []
      };
    }

    const detections = this.rules
      .map(rule => rule.detect(text))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (detections.length === 0) {
      return {
        detected: false,
        overallConfidence: 0,
        severity: 'low',
        shouldIntercept: false,
        detections: [],
        detectedAt: Date.now(),
        tokenCount,
        evidenceChain: []
      };
    }

    // 置信度融合算法
    // 多条规则命中 = 置信度叠加增长
    let overallConfidence = detections.reduce((acc, d) => {
      return acc + d.confidence * (1 - acc) * 0.8;
    }, 0);

    // 确证原则：2条以上规则交叉验证，置信度提升
    if (detections.length >= 2) {
      overallConfidence = Math.min(0.98, overallConfidence + 0.15);
    }

    const severity = this.calculateSeverity(overallConfidence, detections.length);
    const shouldIntercept = overallConfidence >= this.interceptThreshold;

    // 生成证据链
    const evidenceChain = detections.map(d =>
      `[${(d.confidence * 100).toFixed(0)}%] ${d.description}`
    );

    return {
      detected: true,
      overallConfidence,
      severity,
      shouldIntercept,
      detections,
      detectedAt: Date.now(),
      tokenCount,
      evidenceChain
    };
  }

  private calculateSeverity(confidence: number, detectionCount: number): SeverityLevel {
    if (confidence >= 0.9 || detectionCount >= 3) return 'critical';
    if (confidence >= 0.75 || detectionCount >= 2) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 生成幻觉拦截警告
   */
  generateWarning(result: WfgyResult): string {
    const emoji = result.severity === 'critical' ? '🚨' : '⚠️';
    const severityText = {
      low: '低风险',
      medium: '中等风险',
      high: '高风险',
      critical: '极高风险'
    }[result.severity];

    let warning = `\n\n${emoji} ${"=".repeat(45)}\n`;
    warning += `🛡️  WFGY 零 Token 守护引擎\n`;
    warning += `🎯  幻觉风险等级: ${severityText}\n`;
    warning += `📊  综合置信度: ${(result.overallConfidence * 100).toFixed(0)}%\n`;
    warning += `⏱️  在第 ${result.tokenCount} 个 Token 时检测到\n`;
    warning += `${emoji} ${"=".repeat(45)}\n\n`;

    if (result.evidenceChain.length > 0) {
      warning += `📋 证据链:\n`;
      result.evidenceChain.forEach(e => {
        warning += `   • ${e}\n`;
      });
      warning += '\n';
    }

    if (result.shouldIntercept) {
      warning += `⛔ 后续输出已被拦截，避免误导。\n`;
      warning += `💡 建议: 请核实相关信息后再继续。\n`;
    } else {
      warning += `💡 建议: 以上内容请谨慎对待，注意核实来源。\n`;
    }

    return warning;
  }

  addRule(rule: DetectionRule): void {
    this.rules.push(rule);
  }

  getRules(): DetectionRule[] {
    return [...this.rules];
  }

  setThresholds(intercept: number, warning: number): void {
    this.interceptThreshold = intercept;
    this.warningThreshold = warning;
  }
}
