/**
 * 检查项接口定义
 * Heartbeat Module - CheckItem Interface
 */

export type CheckSeverity = 'low' | 'medium' | 'high';

export interface CheckResult {
  itemId: string;
  itemName: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: any;
  timestamp: Date;
  duration?: number; // 检查耗时(ms)
}

export interface CheckItem {
  id: string;
  name: string;
  description: string;
  severity: CheckSeverity;
  check: () => Promise<CheckResult>;
  autoFix?: () => Promise<void>;
  enabled?: boolean;
}

export interface CheckItemConfig {
  id: string;
  name: string;
  description: string;
  severity: CheckSeverity;
  enabled?: boolean;
}

export interface HeartbeatOptions {
  /** 检查间隔时间(ms)，默认30分钟 */
  interval?: number;
  /** 检查清单文件路径 */
  checklistPath?: string;
  /** 是否启用内置检查器 */
  enableBuiltinCheckers?: boolean;
  /** 失败阈值 */
  failureThreshold?: number;
  /** 通知回调 */
  onNotify?: (results: CheckResult[]) => void;
  /** 检查完成回调 */
  onCheckComplete?: (results: CheckResult[]) => void;
}

export interface HeartbeatStats {
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  lastCheckTime: Date | null;
  nextCheckTime: Date | null;
  uptime: number; // 运行时长(ms)
}

/**
 * 创建默认检查项配置
 */
export const DEFAULT_CHECK_OPTIONS: Partial<HeartbeatOptions> = {
  interval: 30 * 60 * 1000, // 30分钟
  enableBuiltinCheckers: true,
  failureThreshold: 3,
};

/**
 * 检查项状态枚举
 */
export enum CheckStatus {
  PASS = 'pass',
  WARNING = 'warning',
  FAIL = 'fail',
}
