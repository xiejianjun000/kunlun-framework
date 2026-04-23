/**
 * ⚡ 零 Token 流式守护
 * 在 AI 输出每个 Token 时实时检测，发现幻觉立刻打断
 */

import { WfgyEngine } from './WfgyEngine';
import { WfgyResult } from '../types';

export class ZeroTokenGuard {
  private engine: WfgyEngine;
  private buffer = '';
  private tokenCount = 0;
  private intercepted = false;
  private lastDetection: WfgyResult | null = null;

  constructor() {
    this.engine = new WfgyEngine();
  }

  /**
   * 处理流式 Token
   * 返回 null 表示正常透传，返回字符串表示拦截警告
   */
  processToken(token: string): string | null {
    if (this.intercepted) {
      return null; // 已经拦截过了，后续全部丢弃
    }

    this.buffer += token;
    this.tokenCount++;

    // 每 10 个 Token 检测一次，平衡性能和及时性
    if (this.tokenCount % 10 === 0 && this.buffer.length >= 30) {
      const result = this.engine.detect(this.buffer, this.tokenCount);

      if (result.detected) {
        this.lastDetection = result;

        if (result.shouldIntercept) {
          this.intercepted = true;
          return this.engine.generateWarning(result);
        }
      }
    }

    return null; // 正常透传
  }

  /**
   * 流式结束时做最终检测
   */
  finalCheck(): { warning: string | null; result: WfgyResult | null } {
    if (this.intercepted) {
      return { warning: null, result: this.lastDetection };
    }

    const result = this.engine.detect(this.buffer, this.tokenCount);
    this.lastDetection = result;

    if (result.detected && result.shouldIntercept) {
      this.intercepted = true;
      return { warning: this.engine.generateWarning(result), result };
    }

    if (result.detected && result.severity !== 'low') {
      return { warning: this.engine.generateWarning(result), result };
    }

    return { warning: null, result };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.buffer = '';
    this.tokenCount = 0;
    this.intercepted = false;
    this.lastDetection = null;
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      bufferLength: this.buffer.length,
      tokenCount: this.tokenCount,
      intercepted: this.intercepted,
      lastDetection: this.lastDetection
    };
  }

  /**
   * 直接检测完整文本（非流式）
   */
  detectText(text: string): WfgyResult {
    return this.engine.detect(text, text.length);
  }
}
