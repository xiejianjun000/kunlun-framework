// @ts-nocheck — OpenCLAW原版参考文件，不需要类型检查
// Ported from openclaw/src/security/skill-scanner.ts
// Static analysis scanner for skill security issues

import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillScanSeverity = "info" | "warn" | "critical";

export type SkillScanFinding = {
  ruleId: string;
  severity: SkillScanSeverity;
  file: string;
  line: number;
  message: string;
  evidence: string;
};

export type SkillScanSummary = {
  scannedFiles: number;
  critical: number;
  warn: number;
  info: number;
  findings: SkillScanFinding[];
};

export type SkillScanOptions = {
  includeFiles?: string[];
  maxFiles?: number;
  maxFileBytes?: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCANNABLE_EXTENSIONS = new Set([
  ".js", ".ts", ".mjs", ".cjs", ".mts", ".cts", ".jsx", ".tsx",
]);

const DEFAULT_MAX_SCAN_FILES = 500;
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;

// ---------------------------------------------------------------------------
// Security pattern rules (ported from OpenCLAW skill-scanner)
// ---------------------------------------------------------------------------

export interface ScanRule {
  ruleId: string;
  severity: SkillScanSeverity;
  pattern: RegExp;
  message: string;
}

export const SKILL_SCAN_RULES: ScanRule[] = [
  // Dangerous exec patterns
  {
    ruleId: "dangerous-exec",
    severity: "critical",
    pattern: /\beval\s*\(/,
    message: "Dangerous eval() call detected",
  },
  {
    ruleId: "dangerous-exec",
    severity: "critical",
    pattern: /\bexec\s*\(/,
    message: "Dangerous exec() call detected",
  },
  // Shell injection patterns
  {
    ruleId: "shell-injection",
    severity: "critical",
    pattern: /\bexec\s*\(\s*`[^`]*\$\{/,
    message: "Shell injection via template literal",
  },
  // Path traversal
  {
    ruleId: "path-traversal",
    severity: "warn",
    pattern: /\.\.\//,
    message: "Potential path traversal via ../",
  },
  // Hardcoded secrets
  {
    ruleId: "hardcoded-secret",
    severity: "critical",
    pattern: /(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\s*[=:]\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
    message: "Potential hardcoded secret detected",
  },
  // Dangerous fs operations
  {
    ruleId: "dangerous-fs",
    severity: "warn",
    pattern: /\brimraf\s*\(/,
    message: "rimraf (recursive delete) usage detected",
  },
  {
    ruleId: "dangerous-fs",
    severity: "critical",
    pattern: /\bfs\.promises\.(unlink|rm)\s*\([^)]*\besync\b/,
    message: "Async fs operation without await",
  },
  // Network exfiltration
  {
    ruleId: "network-exfil",
    severity: "critical",
    pattern: /\bfetch\s*\(\s*process\.env\./,
    message: "fetch() with process.env reference may exfiltrate secrets",
  },
];

// ---------------------------------------------------------------------------
// Scanner implementation
// ---------------------------------------------------------------------------

export function isScannable(filePath: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Scan a single file for security issues
 */
export async function scanFile(
  filePath: string,
  options: SkillScanOptions = {}
): Promise<SkillScanFinding[]> {
  const findings: SkillScanFinding[] = [];
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return findings;
  }

  if (stat.size > maxFileBytes) {
    return findings;
  }

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return findings;
  }

  const lines = content.split("\n");
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (const rule of SKILL_SCAN_RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          ruleId: rule.ruleId,
          severity: rule.severity,
          file: filePath,
          line: lineIdx + 1,
          message: rule.message,
          evidence: line.trim().substring(0, 120),
        });
      }
    }
  }

  return findings;
}

/**
 * Recursively scan a directory for skill security issues
 */
export async function scanSkillDirectory(
  dirPath: string,
  options: SkillScanOptions = {}
): Promise<SkillScanSummary> {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_SCAN_FILES;
  const findings: SkillScanFinding[] = [];
  let scannedFiles = 0;

  async function walk(dir: string): Promise<void> {
    if (scannedFiles >= maxFiles) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (scannedFiles >= maxFiles) break;

      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, hidden dirs
      if (
        entry.isDirectory() &&
        (entry.name === "node_modules" || entry.name === ".git" || entry.name.startsWith("."))
      ) {
        continue;
      }

      if (entry.isFile() && isScannable(entry.name)) {
        const fileFindings = await scanFile(fullPath, options);
        findings.push(...fileFindings);
        scannedFiles++;
      } else if (entry.isDirectory()) {
        await walk(fullPath);
      }
    }
  }

  await walk(dirPath);

  return {
    scannedFiles,
    critical: findings.filter((f) => f.severity === "critical").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    info: findings.filter((f) => f.severity === "info").length,
    findings,
  };
}

// Aliases for backward compatibility (re-exported by index.ts)
export const scanSource = scanFile;
export const scanDirectory = scanSkillDirectory;

/**
 * Scan a directory and return a summary (alias for scanSkillDirectory)
 */
export async function scanDirectoryWithSummary(
  dirPath: string,
  options?: SkillScanOptions
): Promise<SkillScanSummary> {
  return scanSkillDirectory(dirPath, options);
}
