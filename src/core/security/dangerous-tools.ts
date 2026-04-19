// @ts-nocheck — OpenCLAW原版参考文件，不需要类型检查
// Shared tool-risk constants.
// Ported from openclaw/src/security/dangerous-tools.ts
// Keep these centralized so gateway HTTP restrictions and security audits don't drift.

/**
 * Tools denied via Gateway HTTP `POST /tools/invoke` by default.
 * These are high-risk because they enable session orchestration, control-plane actions,
 * or interactive flows that don't make sense over a non-interactive HTTP surface.
 */
export const DEFAULT_GATEWAY_HTTP_TOOL_DENY = [
  // Direct command execution — immediate RCE surface
  "exec",
  // Arbitrary child process creation — immediate RCE surface
  "spawn",
  // Shell command execution — immediate RCE surface
  "shell",
  // Arbitrary file mutation on the host
  "fs_write",
  // Arbitrary file deletion on the host
  "fs_delete",
  // Arbitrary file move/rename on the host
  "fs_move",
  // Patch application can rewrite arbitrary files
  "apply_patch",
  // Session orchestration — spawning agents remotely is RCE
  "sessions_spawn",
  // Cross-session injection — message injection across sessions
  "sessions_send",
  // Persistent automation control plane — can create/update/remove scheduled runs
  "cron",
  // Gateway control plane — prevents gateway reconfiguration via HTTP
  "gateway",
  // Node command relay can reach system.run on paired hosts
  "nodes",
  // Interactive setup — requires terminal QR scan, hangs on HTTP
  "whatsapp_login",
] as const;

export type GatewayHttpToolDeny = typeof DEFAULT_GATEWAY_HTTP_TOOL_DENY[number];

/**
 * OpenTaiji-specific: map OpenCLAW tool names to OpenTaiji equivalents
 */
export const OPENCLAW_TO_OPENTAIJI_TOOL_MAP: Record<string, string> = {
  exec: 'exec',
  spawn: 'spawn',
  shell: 'shell',
  fs_write: 'write',
  fs_delete: 'delete',
  fs_move: 'move',
  apply_patch: 'apply_patch',
  sessions_spawn: 'sessions_spawn',
  sessions_send: 'sessions_send',
  cron: 'cron',
  gateway: 'gateway',
  nodes: 'nodes',
  whatsapp_login: 'whatsapp_login',
};
