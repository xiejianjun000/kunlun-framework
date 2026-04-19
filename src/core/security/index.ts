/**
 * OpenCLAW Security Module - OpenTaiji Port
 * 
 * 本模块移植自 OpenCLAW src/security/
 * 
 * 文件映射：
 * - dangerous-tools.ts       → dangerous-tools.ts
 * - dangerous-config-flags.ts → dangerous-config-flags.ts
 * - skill-scanner.ts         → skill-scanner.ts
 * - audit.types.ts           → audit.types.ts
 * 
 * 主要功能：
 * 1. Gateway HTTP 工具拒绝列表 (dangerous-tools)
 * 2. 配置文件危险标志检测 (dangerous-config-flags)
 * 3. Skill 静态安全扫描 (skill-scanner)
 * 4. 安全审计类型定义 (audit.types)
 */

// Re-export all ported modules
export {
  DEFAULT_GATEWAY_HTTP_TOOL_DENY,
  OPENCLAW_TO_OPENTAIJI_TOOL_MAP,
  type GatewayHttpToolDeny,
} from "./dangerous-tools";

export {
  collectEnabledInsecureOrDangerousFlags,
  type OpenTaijiConfig,
} from "./dangerous-config-flags";

export {
  scanFile,
  scanSkillDirectory,
  scanDirectoryWithSummary,
  isScannable,
  SKILL_SCAN_RULES,
  type SkillScanSeverity,
  type SkillScanFinding,
  type SkillScanSummary,
  type SkillScanOptions,
  type ScanRule,
} from "./skill-scanner";

export {
  type SecurityAuditSeverity,
  type SecurityAuditFinding,
  type SecurityAuditSummary,
  type SecurityAuditReport,
} from "./audit.types";
