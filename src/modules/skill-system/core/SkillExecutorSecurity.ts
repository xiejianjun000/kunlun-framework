/**
 * SkillExecutor 安全红线机制
 * 
 * 移植自 OpenCLAW src/security/ dangerous-tools.ts + skill-scanner.ts
 * 
 * 防御层次：
 * 1. Pre-action: 输入验证 + 模式匹配（注入攻击拦截）
 * 2. In-action: 执行监控 + 高危命令识别
 * 3. Post-action: 审计日志
 * 
 * 适配：OpenCLAW 的 DEFAULT_GATEWAY_HTTP_TOOL_DENY → OpenTaiji exec/spawn/shell 工具集
 */

import { DEFAULT_GATEWAY_HTTP_TOOL_DENY } from "../../../core/security/dangerous-tools";
import { collectEnabledInsecureOrDangerousFlags } from "../../../core/security/dangerous-config-flags";
import type { OpenTaijiConfig } from "../../../core/security/dangerous-config-flags";

// ---------------------------------------------------------------------------
// Security Red Line Types
// ---------------------------------------------------------------------------

export enum SecurityRedLine {
  // 命令执行红线
  COMMAND_INJECTION = "COMMAND_INJECTION",
  BASE64_PAYLOAD = "BASE64_PAYLOAD",
  DESTRUCTIVE_OPERATION = "DESTRUCTIVE_OPERATION",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  DATA_EXFILTRATION = "DATA_EXFILTRATION",
  PERSISTENCE = "PERSISTENCE",
  PRIVILEGE_TAMPERING = "PRIVILEGE_TAMPERING",
  PATH_TRAVERSAL = "PATH_TRAVERSAL",
  ENVIRONMENT_POISONING = "ENVIRONMENT_POISONING",

  // 认知层红线
  BLIND_EXECUTION = "BLIND_EXECUTION",
  CONTEXT_STUFFING = "CONTEXT_STUFFING",
  ROLE_PLAY_JAILBREAK = "ROLE_PLAY_JAILBREAK",
}

// ---------------------------------------------------------------------------
// Dangerous Pattern Library (ported from OpenCLAW skill-scanner)
// ---------------------------------------------------------------------------

const DANGEROUS_PATTERNS: Record<SecurityRedLine, RegExp[]> = {
  [SecurityRedLine.DESTRUCTIVE_OPERATION]: [
    /\brm\s+-rf\b/i,
    /\bdd\s+if=.*of=\/dev\//i,
    /\bmkfs\b/,
    /\bformat\b.*\/dev\//i,
    /\$\(\s*rm\s+/i,
  ],

  [SecurityRedLine.COMMAND_INJECTION]: [
    /\$\([^)]+\)/, // $(...)
    /`[^`]+`/, // backtick `...`
    /;\s*rm\s+/i,
    /;\s*curl\s+/i,
    /\|\s*sh\b/i,
    /&&\s*rm\b/i,
    />>\s*~\//,
  ],

  [SecurityRedLine.BASE64_PAYLOAD]: [
    /base64\s+-d\s+/i,
    /\bfromBase64String\b/,
    /Buffer\.from.*base64/i,
  ],

  [SecurityRedLine.DATA_EXFILTRATION]: [
    /curl\s+.*\$.*(TOKEN|KEY|SECRET|PASS)/i,
    /wget\s+.*\$\{/i,
    /POST\s+.*\$\(env\)/i,
    /\$(env|cat\s+\/proc\/)/i,
  ],

  [SecurityRedLine.UNAUTHORIZED_ACCESS]: [
    /\.\.\/.*\.openclaw/i,
    /\.\.\/.*openclaw\.json/i,
    /\~\/\.openclaw\//i,
  ],

  [SecurityRedLine.PATH_TRAVERSAL]: [
    /\.\.\//, // ../
    /\.\.\.%2f/i, // URL encoded ../
    /%2e%2e%2f/i, // Double encoded
  ],

  [SecurityRedLine.PRIVILEGE_TAMPERING]: [
    /alias\s+\w+\s*=/i,
    /export\s+\w+=\$\{/i,
    /source\s+~\/\.bashrc/i,
  ],

  [SecurityRedLine.PERSISTENCE]: [
    /crontab\s+-e/i,
    /systemctl\s+enable/i,
    /nohup\s+.+&\s*$/i,
    /\/dev\/tcp\//i, // reverse shell
  ],

  [SecurityRedLine.BLIND_EXECUTION]: [
    /\beval\s*\(/,
    /\bFunction\s*\(/,
  ],

  [SecurityRedLine.CONTEXT_STUFFING]: [
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/,
  ],

  [SecurityRedLine.ENVIRONMENT_POISONING]: [
    /process\.env\.[A-Z_]{10,}/,
  ],

  [SecurityRedLine.ROLE_PLAY_JAILBREAK]: [
    /ignore\s+(all\s+)?previous\s+(instructions?|rules?|constraints?)/i,
    /forget\s+(all\s+)?previous/i,
    /new\s+system\s+(prompt|instruction)/i,
  ],
};

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface SecurityCheckResult {
  passed: boolean;
  redLines: SecurityRedLine[];
  sanitized: boolean;
  message: string;
  details?: string[];
}

export interface ToolDenyResult {
  allowed: boolean;
  deniedTools: string[];
  reason?: string;
}

// ---------------------------------------------------------------------------
// SkillExecutorSecurity - Main security class
// ---------------------------------------------------------------------------

export class SkillExecutorSecurity {
  /**
   * 检查输入是否触发安全红线
   * OpenCLAW 原版逻辑：按优先级检测所有红线
   */
  static checkInput(input: string): SecurityCheckResult {
    if (!input || typeof input !== "string") {
      return { passed: true, redLines: [], sanitized: false, message: "Empty input" };
    }

    const triggered: SecurityRedLine[] = [];
    const details: string[] = [];

    for (const [redLine, patterns] of Object.entries(DANGEROUS_PATTERNS) as [
      SecurityRedLine,
      RegExp[],
    ][]) {
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          triggered.push(redLine);
          details.push(`[${redLine}] matched: ${match[0].substring(0, 60)}`);
          break;
        }
      }
    }

    if (triggered.length > 0) {
      return {
        passed: false,
        redLines: triggered,
        sanitized: false,
        message: `Security红线触发: ${triggered.join(", ")}`,
        details,
      };
    }

    return { passed: true, redLines: [], sanitized: false, message: "Input passed security check" };
  }

  /**
   * 尝试对输入进行消毒（移除恶意部分）
   */
  static sanitize(input: string): { sanitized: string; removed: boolean } {
    let sanitized = input;
    let removed = false;

    // 移除命令注入模式
    sanitized = sanitized.replace(/\$\([^)]+\)/g, "$(FILTERED)");
    sanitized = sanitized.replace(/`[^`]+`/g, "`FILTERED`");

    // 移除 eval/Function
    sanitized = sanitized.replace(/\beval\s*\(/g, "eval_FILTERED(");
    sanitized = sanitized.replace(/\bFunction\s*\(/g, "Function_FILTERED(");

    if (sanitized !== input) removed = true;

    return { sanitized, removed };
  }

  /**
   * 检查是否为高风险命令
   */
  static isHighRisk(command: string): boolean {
    const dangerous = [
      "rm -rf",
      "dd if=",
      "mkfs",
      "fdisk",
      /curl.*\$\(/i,
      /wget.*\$\(/i,
      "crontab -e",
      "systemctl enable",
      /\bexec\s*\(/i,
    ];

    return dangerous.some((pattern) => {
      if (typeof pattern === "string") {
        return command.includes(pattern);
      }
      return pattern.test(command);
    });
  }

  /**
   * 检查工具调用是否在允许列表中
   * 移植自 OpenCLAW DEFAULT_GATEWAY_HTTP_TOOL_DENY
   */
  static checkToolAllowlist(
    toolName: string,
    allowlist?: string[],
    denylist?: string[]
  ): ToolDenyResult {
    const deny = denylist ?? [...DEFAULT_GATEWAY_HTTP_TOOL_DENY];
    const allow = allowlist ?? [];

    // Explicit allow overrides deny
    if (allow.includes(toolName)) {
      return { allowed: true, deniedTools: [] };
    }

    if (deny.includes(toolName)) {
      return {
        allowed: false,
        deniedTools: [toolName],
        reason: `Tool '${toolName}' is in the gateway HTTP deny list`,
      };
    }

    return { allowed: true, deniedTools: [] };
  }

  /**
   * 审计配置文件危险标志
   */
  static auditConfigDangerousFlags(config: OpenTaijiConfig): string[] {
    return collectEnabledInsecureOrDangerousFlags(config);
  }

  /**
   * 获取红线报告（用于日志）
   */
  static getRedLineReport(redLines: SecurityRedLine[]): string {
    const labels: Record<SecurityRedLine, string> = {
      [SecurityRedLine.COMMAND_INJECTION]:
        "🔴 命令注入：检测到 Shell 命令替换语法",
      [SecurityRedLine.BASE64_PAYLOAD]:
        "🔴 编码攻击：检测到 Base64 编码载荷",
      [SecurityRedLine.DESTRUCTIVE_OPERATION]:
        "🔴 破坏操作：检测到 rm -rf / dd / mkfs 等高危命令",
      [SecurityRedLine.UNAUTHORIZED_ACCESS]:
        "🔴 越权访问：检测到配置文件路径遍历",
      [SecurityRedLine.DATA_EXFILTRATION]:
        "🔴 数据外泄：检测到敏感数据外发模式",
      [SecurityRedLine.PERSISTENCE]:
        "🔴 持久化：检测到 Cron/Systemd 攻击",
      [SecurityRedLine.PRIVILEGE_TAMPERING]:
        "🔴 权限污染：检测到 Alias/环境变量篡改",
      [SecurityRedLine.PATH_TRAVERSAL]:
        "🔴 路径遍历：检测到 ../ 路径遍历",
      [SecurityRedLine.ENVIRONMENT_POISONING]:
        "🔴 环境投毒：检测到配置文件注入",
      [SecurityRedLine.BLIND_EXECUTION]:
        "🔴 盲执行：检测到隐藏指令",
      [SecurityRedLine.CONTEXT_STUFFING]:
        "🔴 上下文灌入：检测到超长文本末尾附指令",
      [SecurityRedLine.ROLE_PLAY_JAILBREAK]:
        "🔴 角色扮演：检测到身份绕过指令",
    };

    return redLines.map((rl) => labels[rl] || `🔴 ${rl}`).join("\n");
  }
}
