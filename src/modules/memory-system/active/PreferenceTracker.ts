/**
 * PreferenceTracker - 用户偏好追踪器
 * 
 * 基于OpenTaiji事件驱动机制的偏好追踪实现
 * 自动追踪用户偏好变化，支持显式和隐式偏好检测
 */

import crypto from 'crypto';
import {
  type UserPreference,
  type PreferenceEvidence,
  type PreferenceChangeType,
  type PreferenceTrackerState,
  type PreferenceTrackingConfig,
  type PreferenceDetectedEventData,
  DEFAULT_ACTIVE_MEMORY_CONFIG,
} from './types';
import type { ActiveMemoryEventListener } from './types';

export class PreferenceTracker {
  private state: PreferenceTrackerState;
  private config: PreferenceTrackingConfig;
  private listeners: Map<string, ActiveMemoryEventListener<PreferenceDetectedEventData>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<PreferenceTrackingConfig>) {
    this.config = {
      ...DEFAULT_ACTIVE_MEMORY_CONFIG.preferenceTracking,
      ...config,
    };
    this.state = {
      preferences: new Map(),
      changeHistory: [],
      lastCleanupAt: Date.now(),
      totalTracked: 0,
      confirmedCount: 0,
    };
    this.startCleanupScheduler();
  }

  /**
   * 启动定期清理调度器
   */
  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupDecayedPreferences();
    }, 24 * 60 * 60 * 1000); // 每日清理
  }

  /**
   * 停止调度器
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * 生成偏好ID
   */
  private generatePreferenceId(category: string, key: string): string {
    const raw = `${category}:${key}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  /**
   * 追踪新的偏好
   */
  public trackPreference(
    category: string,
    key: string,
    value: unknown,
    changeType: PreferenceChangeType,
    content: string,
    source: 'conversation' | 'action' | 'correction' = 'conversation'
  ): UserPreference | null {
    const id = this.generatePreferenceId(category, key);
    const timestamp = Date.now();
    const weight = changeType === 'explicit' 
      ? this.config.explicitWeight 
      : this.config.implicitWeight;

    const existingPreference = this.state.preferences.get(id);
    const isNew = !existingPreference;

    if (isNew) {
      const newPreference: UserPreference = {
        id,
        category,
        key,
        value: value as string | number | boolean | object,
        changeType,
        confidence: weight,
        evidence: [],
        firstObserved: timestamp,
        lastConfirmed: timestamp,
        decayLevel: 1.0,
      };
      this.state.totalTracked++;
      
      // 添加证据
      const evidence: PreferenceEvidence = {
        timestamp,
        source,
        content,
        weight,
      };
      newPreference.evidence.push(evidence);
      
      // 限制证据数量
      if (newPreference.evidence.length > 20) {
        newPreference.evidence = newPreference.evidence.slice(-20);
      }
      
      // 更新衰减等级
      newPreference.decayLevel = 1.0;
      
      this.state.preferences.set(id, newPreference);
      
      // 记录变更历史
      this.state.changeHistory.push({
        preferenceId: id,
        changeType,
        timestamp,
        oldValue: undefined,
        newValue: value,
      });
      
      // 限制历史记录数量
      if (this.state.changeHistory.length > 1000) {
        this.state.changeHistory = this.state.changeHistory.slice(-500);
      }
      
      // 触发事件
      if (changeType === 'confirmed') {
        this.state.confirmedCount++;
      }
      
      this.emitPreferenceEvent(newPreference, changeType, content);
      
      return newPreference;
    } else {
      // 更新现有偏好
      const preference = existingPreference!;
      const previousValue = preference.value;
      preference.value = value as string | number | boolean | object;
      preference.changeType = changeType;
      
      // 更新置信度
      if (changeType === 'explicit') {
        preference.confidence = Math.min(1.0, preference.confidence + 0.2);
      } else if (changeType === 'corrected') {
        preference.confidence = Math.min(1.0, preference.confidence + 0.3);
      } else if (changeType === 'confirmed') {
        preference.confidence = Math.min(1.0, preference.confidence + 0.1);
        preference.lastConfirmed = timestamp;
      } else {
        preference.confidence = Math.min(0.8, preference.confidence + 0.05);
      }
      
      // 添加证据
      const evidence: PreferenceEvidence = {
        timestamp,
        source,
        content,
        weight,
      };
      preference.evidence.push(evidence);
      
      // 限制证据数量
      if (preference.evidence.length > 20) {
        preference.evidence = preference.evidence.slice(-20);
      }
      
      // 更新衰减等级
      preference.decayLevel = 1.0;
      
      this.state.preferences.set(id, preference);
      
      // 记录变更历史
      this.state.changeHistory.push({
        preferenceId: id,
        changeType,
        timestamp,
        oldValue: previousValue,
        newValue: value,
      });
      
      // 限制历史记录数量
      if (this.state.changeHistory.length > 1000) {
        this.state.changeHistory = this.state.changeHistory.slice(-500);
      }
      
      // 触发事件
      if (changeType === 'confirmed') {
        this.state.confirmedCount++;
      }
      
      this.emitPreferenceEvent(preference, changeType, content);
      
      return preference;
    }
  }

  /**
   * 隐式偏好检测 - 从对话中推断偏好
   */
  public detectImplicitPreference(content: string): UserPreference | null {
    // 简化的隐式偏好检测模式
    const patterns = [
      // 喜欢/不喜欢模式
      { regex: /我(喜欢|讨厌|不喜欢|偏好|倾向于|通常|习惯)(.+)/gi, type: 'like' as const },
      // 否定偏好模式
      { regex: /(别|不要|避免|从来不|很少)(.+)/gi, type: 'dislike' as const },
      // 肯定偏好模式  
      { regex: /(总是|一直|每次|经常)(.+)/gi, type: 'habit' as const },
    ];

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        const [, modifier, value] = match;
        const category = this.inferCategory(value);
        return this.trackPreference(
          category,
          this.normalizeKey(value),
          value.trim(),
          'implicit',
          content,
          'conversation'
        );
      }
    }

    return null;
  }

  /**
   * 从内容推断偏好类别
   */
  private inferCategory(content: string): string {
    const lower = content.toLowerCase();
    if (/食物|吃|喝|餐厅|口味|辣|甜/i.test(lower)) return 'food';
    if (/音乐|歌|听|播放/i.test(lower)) return 'music';
    if (/电影|看|电视|剧/i.test(lower)) return 'entertainment';
    if (/工作|项目|deadline/i.test(lower)) return 'work';
    if (/温度|空调|冷|热/i.test(lower)) return 'environment';
    if (/座位|位置|交通|开车/i.test(lower)) return 'travel';
    return 'general';
  }

  /**
   * 标准化偏好键
   */
  private normalizeKey(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50);
  }

  /**
   * 获取偏好
   */
  public getPreference(id: string): UserPreference | undefined {
    return this.state.preferences.get(id);
  }

  /**
   * 获取所有偏好
   */
  public getAllPreferences(): UserPreference[] {
    return Array.from(this.state.preferences.values());
  }

  /**
   * 获取特定类别的偏好
   */
  public getPreferencesByCategory(category: string): UserPreference[] {
    return this.getAllPreferences().filter(p => p.category === category);
  }

  /**
   * 获取高置信度偏好
   */
  public getHighConfidencePreferences(threshold?: number): UserPreference[] {
    const minConfidence = threshold ?? this.config.confidenceThreshold;
    return this.getAllPreferences().filter(p => p.confidence >= minConfidence);
  }

  /**
   * 衰减过期偏好
   */
  public cleanupDecayedPreferences(): void {
    const now = Date.now();
    const windowMs = this.config.trackingWindowMs;

    for (const [id, preference] of this.state.preferences) {
      // 检查是否超过追踪窗口
      const timeSinceLastConfirmed = now - preference.lastConfirmed;
      if (timeSinceLastConfirmed > windowMs) {
        // 衰减
        preference.decayLevel *= this.config.decayFactor;
        
        // 如果衰减到很低，标记为可能过期
        if (preference.decayLevel < 0.1) {
          // 保留但不计入高置信度
        }
      }

      // 清理过期证据
      const recentWindow = 30 * 24 * 60 * 60 * 1000; // 30天
      preference.evidence = preference.evidence.filter(
        e => now - e.timestamp < recentWindow
      );
    }

    this.state.lastCleanupAt = now;
  }

  /**
   * 确认偏好
   */
  public confirmPreference(id: string, content: string): boolean {
    const preference = this.state.preferences.get(id);
    if (!preference) return false;

    const previousValue = preference.value;
    preference.changeType = 'confirmed';
    preference.lastConfirmed = Date.now();
    preference.confidence = Math.min(1.0, preference.confidence + 0.1);
    preference.decayLevel = 1.0;

    preference.evidence.push({
      timestamp: Date.now(),
      source: 'correction',
      content,
      weight: this.config.explicitWeight,
    });

    this.state.confirmedCount++;
    this.state.changeHistory.push({
      preferenceId: id,
      changeType: 'confirmed',
      timestamp: Date.now(),
      oldValue: previousValue,
      newValue: preference.value,
    });

    this.emitPreferenceEvent(preference, 'confirmed', content);
    return true;
  }

  /**
   * 移除偏好
   */
  public removePreference(id: string): boolean {
    return this.state.preferences.delete(id);
  }

  /**
   * 订阅偏好事件
   */
  public subscribe(listenerId: string, listener: ActiveMemoryEventListener<PreferenceDetectedEventData>): void {
    this.listeners.set(listenerId, listener);
  }

  /**
   * 取消订阅
   */
  public unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  /**
   * 触发偏好事件
   */
  private emitPreferenceEvent(preference: UserPreference, changeType: PreferenceChangeType, content: string): void {
    const event = {
      type: 'preference.detected' as const,
      timestamp: Date.now(),
      sessionId: '',
      agentId: '',
      data: {
        preference,
        changeType,
        confidence: preference.confidence,
        triggerContent: content,
      },
    };

    for (const listener of this.listeners.values()) {
      try {
        listener(event);
      } catch (error) {
        console.error('PreferenceTracker listener error:', error);
      }
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    total: number;
    confirmed: number;
    averageConfidence: number;
    byCategory: Record<string, number>;
  } {
    const preferences = this.getAllPreferences();
    const sum = preferences.reduce((acc, p) => acc + p.confidence, 0);
    const byCategory: Record<string, number> = {};

    for (const p of preferences) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    }

    return {
      total: this.state.totalTracked,
      confirmed: this.state.confirmedCount,
      averageConfidence: preferences.length > 0 ? sum / preferences.length : 0,
      byCategory,
    };
  }

  /**
   * 导出偏好数据
   */
  public export(): PreferenceTrackerState {
    return {
      preferences: new Map(this.state.preferences),
      changeHistory: [...this.state.changeHistory],
      lastCleanupAt: this.state.lastCleanupAt,
      totalTracked: this.state.totalTracked,
      confirmedCount: this.state.confirmedCount,
    };
  }

  /**
   * 导入偏好数据
   */
  public import(state: PreferenceTrackerState): void {
    this.state = {
      preferences: new Map(state.preferences),
      changeHistory: [...state.changeHistory],
      lastCleanupAt: state.lastCleanupAt,
      totalTracked: state.totalTracked,
      confirmedCount: state.confirmedCount,
    };
  }
}

export default PreferenceTracker;
