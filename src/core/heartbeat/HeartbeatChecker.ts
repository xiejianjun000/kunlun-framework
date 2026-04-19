/**
 * 心跳检查器
 * Heartbeat Checker - 执行各项检查任务
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CheckItem,
  CheckResult,
  CheckStatus,
  CheckSeverity,
} from './CheckItem';

export interface CheckerContext {
  /** 框架根目录 */
  rootPath: string;
  /** 记忆文件路径 */
  memoryPath: string;
  /** 日程文件路径 */
  calendarPath: string;
  /** SOUL文件路径 */
  soulPath: string;
  /** 最近对话历史 */
  recentConversations?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  /** 工具调用历史 */
  toolCallHistory?: Array<{
    tool: string;
    success: boolean;
    error?: string;
    timestamp: Date;
  }>;
}

export class HeartbeatChecker {
  private checkItems: Map<string, CheckItem> = new Map();
  private checklistPath: string;
  private context: Partial<CheckerContext>;
  private logger: (msg: string) => void;

  constructor(
    checklistPath: string,
    context: Partial<CheckerContext> = {},
    logger?: (msg: string) => void
  ) {
    this.checklistPath = checklistPath;
    this.context = context;
    this.logger = logger || console.log;
  }

  /**
   * 注册检查项
   */
  registerCheckItem(item: CheckItem): void {
    if (this.checkItems.has(item.id)) {
      this.logger(`[HeartbeatChecker] 检查项 ${item.id} 已存在，将被覆盖`);
    }
    this.checkItems.set(item.id, item);
    this.logger(`[HeartbeatChecker] 已注册检查项: ${item.name} (${item.id})`);
  }

  /**
   * 移除检查项
   */
  removeCheckItem(itemId: string): boolean {
    const deleted = this.checkItems.delete(itemId);
    if (deleted) {
      this.logger(`[HeartbeatChecker] 已移除检查项: ${itemId}`);
    }
    return deleted;
  }

  /**
   * 获取所有检查项
   */
  getCheckItems(): CheckItem[] {
    return Array.from(this.checkItems.values());
  }

  /**
   * 更新上下文
   */
  updateContext(context: Partial<CheckerContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 执行所有检查项
   */
  async runChecks(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const enabledItems = this.getEnabledCheckItems();

    this.logger(`[HeartbeatChecker] 开始执行 ${enabledItems.length} 项检查...`);

    for (const item of enabledItems) {
      const result = await this.runCheck(item);
      results.push(result);
    }

    this.logResultsSummary(results);
    return results;
  }

  /**
   * 执行单个检查项
   */
  async runCheck(item: CheckItem): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      this.logger(`[HeartbeatChecker] 执行检查: ${item.name}`);
      const result = await item.check();

      return {
        ...result,
        itemId: item.id,
        itemName: item.name,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger(`[HeartbeatChecker] 检查 ${item.name} 失败: ${errorMessage}`);

      return {
        itemId: item.id,
        itemName: item.name,
        status: CheckStatus.FAIL,
        message: `检查执行失败: ${errorMessage}`,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 读取检查清单（从 heartbeat.md）
   */
  async loadChecklist(): Promise<CheckItem[]> {
    try {
      if (!fs.existsSync(this.checklistPath)) {
        this.logger(`[HeartbeatChecker] 检查清单文件不存在: ${this.checklistPath}`);
        return [];
      }

      const content = fs.readFileSync(this.checklistPath, 'utf-8');
      const items = this.parseChecklistContent(content);

      this.logger(`[HeartbeatChecker] 从检查清单加载了 ${items.length} 项配置`);
      return items;
    } catch (error) {
      this.logger(`[HeartbeatChecker] 加载检查清单失败: ${error}`);
      return [];
    }
  }

  /**
   * 解析检查清单内容
   */
  private parseChecklistContent(content: string): CheckItem[] {
    const items: CheckItem[] = [];
    const lines = content.split('\n');

    let currentItem: Partial<CheckItem> | null = null;

    for (const line of lines) {
      // 检测检查项开始
      const headerMatch = line.match(/^###\s*(\d+)\.\s*(.+)/);
      if (headerMatch) {
        if (currentItem) {
          items.push(currentItem as CheckItem);
        }
        currentItem = {
          id: `custom_${items.length + 1}`,
          name: headerMatch[2].trim(),
          description: '',
          severity: 'medium' as CheckSeverity,
        };
        continue;
      }

      // 收集描述
      if (currentItem && line.trim().startsWith('检查：')) {
        currentItem.description = line.trim().substring(3).trim();
      }
    }

    if (currentItem) {
      items.push(currentItem as CheckItem);
    }

    return items;
  }

  /**
   * 获取已启用的检查项
   */
  private getEnabledCheckItems(): CheckItem[] {
    return Array.from(this.checkItems.values()).filter(
      (item) => item.enabled !== false
    );
  }

  /**
   * 记录检查结果摘要
   */
  private logResultsSummary(results: CheckResult[]): void {
    const passed = results.filter((r) => r.status === CheckStatus.PASS).length;
    const warnings = results.filter((r) => r.status === CheckStatus.WARNING).length;
    const failed = results.filter((r) => r.status === CheckStatus.FAIL).length;

    this.logger(
      `[HeartbeatChecker] 检查完成: 通过 ${passed}, 警告 ${warnings}, 失败 ${failed}`
    );
  }

  /**
   * 获取高严重性的检查结果
   */
  getHighSeverityResults(results: CheckResult[]): CheckResult[] {
    const severityOrder: Record<CheckSeverity, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return results
      .filter((r) => r.status !== CheckStatus.PASS)
      .sort((a, b) => {
        const itemA = this.checkItems.get(a.itemId);
        const itemB = this.checkItems.get(b.itemId);
        return (
          (severityOrder[itemB?.severity || 'low'] || 0) -
          (severityOrder[itemA?.severity || 'low'] || 0)
        );
      });
  }
}

export default HeartbeatChecker;
