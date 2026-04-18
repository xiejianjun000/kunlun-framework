/**
 * 内置检查器集合
 * Built-in Checkers for Heartbeat System
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CheckItem,
  CheckResult,
  CheckStatus,
  CheckSeverity,
} from '../CheckItem';
import { CheckerContext } from '../HeartbeatChecker';

// ============== 人设合规检查器 ==============

export function createPersonaComplianceChecker(
  context: Partial<CheckerContext>
): CheckItem {
  return {
    id: 'persona_compliance',
    name: '人设合规检查',
    description: '检查最近对话是否符合SOUL人设定义',
    severity: 'high',
    enabled: true,
    check: async (): Promise<CheckResult> => {
      try {
        const soulPath = context.soulPath || path.join(context.rootPath || '', 'SOUL.md');

        if (!fs.existsSync(soulPath)) {
          return {
            itemId: 'persona_compliance',
            itemName: '人设合规检查',
            status: CheckStatus.WARNING,
            timestamp: new Date(),
            message: '未找到SOUL.md文件，跳过人设检查',
          };
        }

        const soulContent = fs.readFileSync(soulPath, 'utf-8');
        const recentMessages = context.recentConversations || [];

        // 提取人设关键特征
        const personaKeywords = extractPersonaKeywords(soulContent);
        const recentText = recentMessages
          .filter((m) => m.role === 'assistant')
          .slice(-3)
          .map((m) => m.content)
          .join(' ');

        // 检查是否有机机械式回复
        const mechanicalPatterns = [
          /您好，我是[^\s]+/g,
          /很高兴为您服务/g,
          /请问还有什么需要帮助的吗/g,
          /根据我的理解/g,
          /作为AI助手/g,
        ];

        let mechanicalCount = 0;
        for (const pattern of mechanicalPatterns) {
          mechanicalCount += (recentText.match(pattern) || []).length;
        }

        // 检查人设关键词匹配度
        let keywordMatches = 0;
        for (const keyword of personaKeywords) {
          if (recentText.includes(keyword)) {
            keywordMatches++;
          }
        }

        const matchRatio = personaKeywords.length > 0
          ? keywordMatches / personaKeywords.length
          : 1;

        if (mechanicalCount > 2) {
          return {
            itemId: 'persona_compliance',
            itemName: '人设合规检查',
            status: CheckStatus.FAIL,
            timestamp: new Date(),
            message: `检测到机械式回复过多(${mechanicalCount}次)，可能偏离人设`,
            details: {
              mechanicalCount,
              matchRatio: Math.round(matchRatio * 100) + '%',
            },
          };
        }

        if (matchRatio < 0.3 && personaKeywords.length > 0) {
          return {
            itemId: 'persona_compliance',
            itemName: '人设合规检查',
            status: CheckStatus.WARNING,
            timestamp: new Date(),
            message: `人设关键词匹配度较低(${Math.round(matchRatio * 100)}%)`,
            details: {
              keywordMatches,
              totalKeywords: personaKeywords.length,
            },
          };
        }

        return {
          itemId: 'persona_compliance',
          itemName: '人设合规检查',
          status: CheckStatus.PASS,
            timestamp: new Date(),
          message: '人设合规性正常',
          details: {
            matchRatio: Math.round(matchRatio * 100) + '%',
            mechanicalCount,
          },
        };
      } catch (error) {
        return {
          itemId: 'persona_compliance',
          itemName: '人设合规检查',
          status: CheckStatus.FAIL,
            timestamp: new Date(),
          message: `检查失败: ${error}`,
        };
      }
    },
  };
}

function extractPersonaKeywords(soulContent: string): string[] {
  const keywords: string[] = [];

  // 提取说话风格关键词
  const styleMatch = soulContent.match(/说话[风风格式方式]+[:：]\s*([^\n]+)/);
  if (styleMatch) {
    keywords.push(...styleMatch[1].split(/[，,、]/).map((k) => k.trim()));
  }

  // 提取性格特征
  const traitsMatch = soulContent.match(/性格|特点|特征|人设|角色/g);
  if (traitsMatch) {
    const lines = soulContent.split('\n');
    for (const line of lines) {
      if (line.includes('性格') || line.includes('特点')) {
        const parts = line.split(/[：:]/);
        if (parts[1]) {
          keywords.push(...parts[1].split(/[，,、、]/).map((k) => k.trim()));
        }
      }
    }
  }

  return keywords.filter((k) => k.length > 0 && k.length < 20);
}

// ============== 工具调用检查器 ==============

export function createToolCallChecker(
  context: Partial<CheckerContext>,
  failureThreshold: number = 3
): CheckItem {
  return {
    id: 'tool_call',
    name: '工具调用检查',
    description: '检查是否有连续失败的工具调用',
    severity: 'high',
    enabled: true,
    check: async (): Promise<CheckResult> => {
      try {
        const toolHistory = context.toolCallHistory || [];
        const recentCalls = toolHistory.slice(-20); // 最近20次调用

        // 统计失败次数
        const failedCalls = recentCalls.filter((c) => !c.success);
        const totalCalls = recentCalls.length;

        // 统计各工具失败情况
        const toolFailures: Record<string, number> = {};
        for (const call of failedCalls) {
          toolFailures[call.tool] = (toolFailures[call.tool] || 0) + 1;
        }

        // 检查是否有连续失败
        let consecutiveFailures = 0;
        let maxConsecutive = 0;
        for (const call of recentCalls.slice().reverse()) {
          if (!call.success) {
            consecutiveFailures++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveFailures);
          } else {
            consecutiveFailures = 0;
          }
        }

        const criticalTools = Object.entries(toolFailures)
          .filter(([, count]) => count >= failureThreshold)
          .map(([tool, count]) => `${tool}(${count}次)`);

        if (maxConsecutive >= failureThreshold) {
          return {
            itemId: 'tool_call',
            itemName: '工具调用检查',
            status: CheckStatus.FAIL,
            timestamp: new Date(),
            message: `检测到连续${maxConsecutive}次工具调用失败`,
            details: {
              consecutiveFailures: maxConsecutive,
              totalCalls,
              failedCalls: failedCalls.length,
              criticalTools,
            },
          };
        }

        if (failedCalls.length > totalCalls * 0.5 && totalCalls > 5) {
          return {
            itemId: 'tool_call',
            itemName: '工具调用检查',
            status: CheckStatus.WARNING,
            timestamp: new Date(),
            message: `工具调用失败率较高: ${Math.round((failedCalls.length / totalCalls) * 100)}%`,
            details: {
              failedCalls: failedCalls.length,
              totalCalls,
              toolFailures,
            },
          };
        }

        return {
          itemId: 'tool_call',
          itemName: '工具调用检查',
          status: CheckStatus.PASS,
            timestamp: new Date(),
          message: '工具调用正常',
          details: {
            totalCalls,
            failedCalls: failedCalls.length,
            successRate: totalCalls > 0
              ? Math.round(((totalCalls - failedCalls.length) / totalCalls) * 100) + '%'
              : '100%',
          },
        };
      } catch (error) {
        return {
          itemId: 'tool_call',
          itemName: '工具调用检查',
          status: CheckStatus.FAIL,
            timestamp: new Date(),
          message: `检查失败: ${error}`,
        };
      }
    },
    autoFix: async (): Promise<void> => {
      // 自动修复：清理工具调用历史
      if (context.toolCallHistory) {
        context.toolCallHistory = context.toolCallHistory.filter((c) => c.success);
      }
    },
  };
}

// ============== 记忆污染检查器 ==============

export function createMemoryPollutionChecker(
  context: Partial<CheckerContext>
): CheckItem {
  return {
    id: 'memory_pollution',
    name: '记忆污染检查',
    description: '检查记忆文件是否有矛盾或重复内容',
    severity: 'medium',
    enabled: true,
    check: async (): Promise<CheckResult> => {
      try {
        const memoryPath = context.memoryPath || path.join(context.rootPath || '', 'MEMORY.md');

        if (!fs.existsSync(memoryPath)) {
          return {
            itemId: 'memory_pollution',
            itemName: '记忆污染检查',
            status: CheckStatus.WARNING,
            timestamp: new Date(),
            message: '未找到MEMORY.md文件，跳过记忆检查',
          };
        }

        const memoryContent = fs.readFileSync(memoryPath, 'utf-8');
        const lines = memoryContent.split('\n');

        // 检测重复记忆
        const duplicates: string[] = [];
        const seenContent = new Map<string, number>();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.length > 10) {
            const normalized = line.toLowerCase().replace(/\s+/g, '');
            if (seenContent.has(normalized)) {
              duplicates.push(`第${seenContent.get(normalized)! + 1}行与第${i + 1}行重复`);
            } else {
              seenContent.set(normalized, i);
            }
          }
        }

        // 检测矛盾信息（简化版本：检查相反词）
        const contradictions: string[] = [];
        const contradictionPairs = [
          ['是', '否'],
          ['有', '无'],
          ['可以', '不可以'],
          ['必须', '不必'],
          ['正确', '错误'],
        ];

        for (const [word1, word2] of contradictionPairs) {
          const regex = new RegExp(`${word1}.{0,20}${word2}|${word2}.{0,20}${word1}`, 'gi');
          const matches = memoryContent.match(regex);
          if (matches && matches.length > 1) {
            contradictions.push(`${word1}/${word2}: ${matches.length}处`);
          }
        }

        // 检测格式错误
        const formatErrors: string[] = [];
        const bulletPoints = lines.filter((l) => l.trim().startsWith('-'));
        if (bulletPoints.length > 0 && !memoryContent.includes('- ')) {
          formatErrors.push('混用列表格式');
        }

        const issues = [...duplicates, ...contradictions, ...formatErrors];

        if (issues.length > 5) {
          return {
            itemId: 'memory_pollution',
            itemName: '记忆污染检查',
            status: CheckStatus.FAIL,
            timestamp: new Date(),
            message: `检测到${issues.length}个记忆污染问题，建议清理`,
            details: {
              duplicates: duplicates.length,
              contradictions: contradictions.length,
              formatErrors: formatErrors.length,
              totalIssues: issues.length,
              sampleIssues: issues.slice(0, 5),
            },
          };
        }

        if (issues.length > 0) {
          return {
            itemId: 'memory_pollution',
            itemName: '记忆污染检查',
            status: CheckStatus.WARNING,
            timestamp: new Date(),
            message: `检测到${issues.length}个轻微问题`,
            details: {
              issues,
            },
          };
        }

        return {
          itemId: 'memory_pollution',
          itemName: '记忆污染检查',
          status: CheckStatus.PASS,
            timestamp: new Date(),
          message: '记忆文件正常，无明显污染',
          details: {
            totalLines: lines.length,
          },
        };
      } catch (error) {
        return {
          itemId: 'memory_pollution',
          itemName: '记忆污染检查',
          status: CheckStatus.FAIL,
            timestamp: new Date(),
          message: `检查失败: ${error}`,
        };
      }
    },
  };
}

// ============== 任务完成检查器 ==============

export function createTaskCompletionChecker(
  context: Partial<CheckerContext>
): CheckItem {
  return {
    id: 'task_completion',
    name: '任务完成检查',
    description: '检查是否有长时间未完成的任务',
    severity: 'medium',
    enabled: true,
    check: async (): Promise<CheckResult> => {
      try {
        const calendarPath = context.calendarPath || path.join(context.rootPath || '', 'calendar.json');

        interface Task {
          id: string;
          title: string;
          status: string;
          createdAt: string;
          dueDate?: string;
        }

        let tasks: Task[] = [];

        if (fs.existsSync(calendarPath)) {
          const content = fs.readFileSync(calendarPath, 'utf-8');
          const data = JSON.parse(content);
          tasks = data.tasks || [];
        }

        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // 分类任务状态
        const pendingTasks = tasks.filter((t) => t.status === 'pending');
        const runningTasks = tasks.filter((t) => t.status === 'running');
        const overdueTasks: Task[] = [];

        for (const task of [...pendingTasks, ...runningTasks]) {
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (dueDate < thirtyMinutesAgo) {
              overdueTasks.push(task);
            }
          }
        }

        // 检查长时间运行的任务
        const longRunningTasks: Task[] = [];
        for (const task of runningTasks) {
          const createdAt = new Date(task.createdAt);
          if (createdAt < oneHourAgo) {
            longRunningTasks.push(task);
          }
        }

        const totalUnfinished = pendingTasks.length + runningTasks.length;

        if (overdueTasks.length > 0) {
          return {
            itemId: 'task_completion',
            itemName: '任务完成检查',
            status: CheckStatus.FAIL,
            timestamp: new Date(),
            message: `发现${overdueTasks.length}个已超时任务`,
            details: {
              overdueTasks: overdueTasks.slice(0, 5),
              totalUnfinished,
              pendingTasks: pendingTasks.length,
              runningTasks: runningTasks.length,
            },
          };
        }

        if (longRunningTasks.length > 0) {
          return {
            itemId: 'task_completion',
            itemName: '任务完成检查',
            status: CheckStatus.WARNING,
            timestamp: new Date(),
            message: `发现${longRunningTasks.length}个长时间运行的任务`,
            details: {
              longRunningTasks: longRunningTasks.slice(0, 5),
            },
          };
        }

        return {
          itemId: 'task_completion',
          itemName: '任务完成检查',
          status: CheckStatus.PASS,
            timestamp: new Date(),
          message: '任务状态正常',
          details: {
            totalTasks: tasks.length,
            pendingTasks: pendingTasks.length,
            runningTasks: runningTasks.length,
          },
        };
      } catch (error) {
        return {
          itemId: 'task_completion',
          itemName: '任务完成检查',
          status: CheckStatus.FAIL,
            timestamp: new Date(),
          message: `检查失败: ${error}`,
        };
      }
    },
  };
}

// ============== 系统健康检查器 ==============

export function createSystemHealthChecker(): CheckItem {
  return {
    id: 'system_health',
    name: '系统健康检查',
    description: '检查系统资源使用情况',
    severity: 'low',
    enabled: true,
    check: async (): Promise<CheckResult> => {
      try {
        const memUsage = process.memoryUsage();
        const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
        const memPercent = Math.round((memUsed / memTotal) * 100);

        // CPU使用率（简化版本）
        const cpuUsage = process.cpuUsage();
        const cpuPercent = Math.min(
          100,
          Math.round((cpuUsage.user + cpuUsage.system) / 10000 / 60)
        );

        // 检查磁盘空间（如果可用）
        let diskUsage: { used: number; total: number; percent: number } | null = null;

        const healthIssues: string[] = [];

        // 内存检查
        if (memPercent > 90) {
          healthIssues.push(`内存使用率过高(${memPercent}%)`);
        }

        // CPU检查
        if (cpuPercent > 80) {
          healthIssues.push(`CPU使用率较高(${cpuPercent}%)`);
        }

        if (healthIssues.length > 0) {
          return {
            itemId: 'system_health',
            itemName: '系统健康检查',
            status: healthIssues.some((i) => i.includes('过高'))
              ? CheckStatus.FAIL
              : CheckStatus.WARNING,
            timestamp: new Date(),
            message: healthIssues.join(', '),
            details: {
              memory: {
                used: `${memUsed}MB`,
                total: `${memTotal}MB`,
                percent: `${memPercent}%`,
              },
              cpu: {
                usage: cpuUsage,
                estimatedPercent: `${cpuPercent}%`,
              },
              disk: diskUsage,
              uptime: process.uptime(),
            },
          };
        }

        return {
          itemId: 'system_health',
          itemName: '系统健康检查',
          status: CheckStatus.PASS,
          timestamp: new Date(),
          message: '系统运行正常',
          details: {
            memory: {
              used: `${memUsed}MB`,
              total: `${memTotal}MB`,
              percent: `${memPercent}%`,
            },
            cpu: {
              estimatedPercent: `${cpuPercent}%`,
            },
            uptime: Math.round(process.uptime() / 60) + '分钟',
          },
        };
      } catch (error) {
        return {
          itemId: 'system_health',
          itemName: '系统健康检查',
          status: CheckStatus.FAIL,
            timestamp: new Date(),
          message: `检查失败: ${error}`,
        };
      }
    },
  };
}

// ============== 导出所有内置检查器 ==============

export function createAllBuiltinCheckers(
  context: Partial<CheckerContext>,
  options?: { failureThreshold?: number }
): CheckItem[] {
  return [
    createPersonaComplianceChecker(context),
    createToolCallChecker(context, options?.failureThreshold || 3),
    createMemoryPollutionChecker(context),
    createTaskCompletionChecker(context),
    createSystemHealthChecker(),
  ];
}

export default {
  createPersonaComplianceChecker,
  createToolCallChecker,
  createMemoryPollutionChecker,
  createTaskCompletionChecker,
  createSystemHealthChecker,
  createAllBuiltinCheckers,
};
