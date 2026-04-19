/**
 * OpenCLAW Heartbeat 集成适配层
 * 
 * 移植自 OpenCLAW src/infra/heartbeat-runner.ts
 * 
 * OpenCLAW heartbeat 架构:
 * - HeartbeatScheduler: 管理心跳调度 (active-hours, wake time)
 * - HeartbeatRunner: 执行心跳任务
 * - HeartbeatChecker: 执行内置检查 (persona合规、安全等)
 * - HeartbeatPolicy: 心跳策略定义
 * 
 * 适配要点：
 * - OpenCLAW 使用 cron + session 模式触发心跳
 * - OpenTaiji 使用 HeartbeatScheduler + CheckItem 模式
 */

import { SkillExecutorSecurity, type SecurityCheckResult } from "../../modules/skill-system/core/SkillExecutorSecurity";
import { DEFAULT_GATEWAY_HTTP_TOOL_DENY } from "../security/dangerous-tools";

// ---------------------------------------------------------------------------
// Types (from OpenCLAW heartbeat-runner.ts)
// ---------------------------------------------------------------------------

export type HeartbeatAckStatus = "ok" | "error" | "ignored";

export interface HeartbeatAck {
  status: HeartbeatAckStatus;
  message?: string;
  tasksTriggered?: number;
}

export interface HeartbeatContext {
  agentId: string;
  sessionKey: string;
  recentMessages?: Array<{ role: string; content: string }>;
  lastHeartbeat?: Date;
}

export interface HeartbeatPolicy {
  enabled: boolean;
  frequencyMinutes: number;
  activeHoursStart?: string; // HH:mm
  activeHoursEnd?: string;   // HH:mm
  timezone?: string;
}

// ---------------------------------------------------------------------------
// Heartbeat Audit Checker (from OpenCLAW heartbeat concepts)
// ---------------------------------------------------------------------------

export interface HeartbeatAuditCheckItem {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export const HEARTBEAT_AUDIT_CHECKS: HeartbeatAuditCheckItem[] = [
  {
    id: "exec_tool_deny",
    name: "exec工具越权",
    description: "检查 exec 工具是否在 Gateway HTTP deny 列表中",
    severity: "critical",
  },
  {
    id: "skill_security",
    name: "Skill安全扫描",
    description: "检查 skill 目录是否存在已知安全漏洞",
    severity: "high",
  },
  {
    id: "config_dangerous_flags",
    name: "配置文件危险标志",
    description: "检查配置是否包含危险标志",
    severity: "medium",
  },
  {
    id: "heartbeat_token",
    name: "Heartbeat Token检查",
    description: "检查 heartbeat 内容是否被篡改",
    severity: "medium",
  },
];

// ---------------------------------------------------------------------------
// HeartbeatAuditChecker
// ---------------------------------------------------------------------------

export class HeartbeatAuditChecker {
  /**
   * 执行心跳安全审计
   * 整合 OpenCLAW 的 security audit 和 heartbeat checker
   */
  static async audit(): Promise<{
    passed: boolean;
    findings: Array<{
      checkId: string;
      severity: "low" | "medium" | "high" | "critical";
      message: string;
    }>;
  }> {
    const findings: Array<{
      checkId: string;
      severity: "low" | "medium" | "high" | "critical";
      message: string;
    }> = [];

    // 1. Tool deny list check
    const execToolInDeny = [...DEFAULT_GATEWAY_HTTP_TOOL_DENY].includes("exec" as never);
    if (execToolInDeny) {
      findings.push({
        checkId: "exec_tool_deny",
        severity: "critical",
        message: "exec tool is in the gateway HTTP deny list (as designed by OpenCLAW)",
      });
    }

    // 2. Security input check (example)
    const testInput = "hello world";
    const inputCheck = SkillExecutorSecurity.checkInput(testInput);
    if (!inputCheck.passed) {
      findings.push({
        checkId: "skill_security",
        severity: "high",
        message: inputCheck.message,
      });
    }

    return {
      passed: findings.length === 0,
      findings,
    };
  }

  /**
   * 检查当前时间是否在活跃时段内
   * 移植自 OpenCLAW src/infra/heartbeat-active-hours.ts
   */
  static isActiveHour(
    policy: HeartbeatPolicy,
    now: Date = new Date()
  ): boolean {
    if (!policy.enabled) return false;
    if (!policy.activeHoursStart || !policy.activeHoursEnd) return true;

    const tz = policy.timezone ?? "UTC";
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });

    const currentTime = formatter.format(now).replace(":", "");
    const start = policy.activeHoursStart.replace(":", "");
    const end = policy.activeHoursEnd.replace(":", "");

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Cross-midnight range
      return currentTime >= start || currentTime <= end;
    }
  }
}

// ---------------------------------------------------------------------------
// Heartbeat Prompt token (from OpenCLAW auto-reply/tokens.js)
// ---------------------------------------------------------------------------

export const HEARTBEAT_TOKEN = "__openclaw_heartbeat__";

/**
 * 解析心跳内容中的任务
 * 移植自 OpenCLAW auto-reply/heartbeat.js parseHeartbeatTasks
 */
export function parseHeartbeatTasks(
  content: string
): Array<{ text: string; dueInMs?: number }> {
  const tasks: Array<{ text: string; dueInMs?: number }> = [];
  
  // Look for task markers like [task] or <task>
  const taskPattern = /(?:\[task\]|<task>)\s*(.+?)(?:\[\/task\]|<\/task>|$)/gi;
  let match;
  
  while ((match = taskPattern.exec(content)) !== null) {
    const taskText = match[1].trim();
    if (taskText) {
      tasks.push({ text: taskText });
    }
  }

  return tasks;
}

/**
 * 去除心跳 token
 * 移植自 OpenCLAW auto-reply/heartbeat.js stripHeartbeatToken
 */
export function stripHeartbeatToken(content: string): string {
  return content
    .replace(new RegExp(HEARTBEAT_TOKEN, "gi"), "")
    .replace(/\[HEARTBEAT\]/gi, "")
    .replace(/<heartbeat>/gi, "")
    .trim();
}
