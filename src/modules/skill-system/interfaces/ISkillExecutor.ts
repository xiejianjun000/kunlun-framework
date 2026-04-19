/**
 * 技能执行器接口
 * Skill Executor Interface
 */

import {
  SkillExecutionResult,
  SkillExecutionContext,
  SkillExecutionOptions,
} from './skill.types';

/**
 * 执行器状态
 */
export enum ExecutorStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  /** CPU使用率 (%) */
  cpuUsage: number;
  /** 内存使用 (MB) */
  memoryUsage: number;
  /** 内存峰值 (MB) */
  memoryPeak: number;
  /** 线程数 */
  threadCount: number;
  /** 打开文件数 */
  openFiles: number;
}

/**
 * 执行监控信息
 */
export interface ExecutionMonitor {
  /** 执行ID */
  executionId: string;
  /** 状态 */
  status: ExecutorStatus;
  /** 进度 (%) */
  progress: number;
  /** 当前步骤 */
  currentStep?: string;
  /** 资源使用 */
  resourceUsage: ResourceUsage;
  /** 开始时间 */
  startedAt: Date;
  /** 已运行时间 (ms) */
  elapsedTime: number;
  /** 预计剩余时间 (ms) */
  estimatedRemaining?: number;
}

/**
 * 技能执行器接口
 * 定义技能执行的核心操作
 */
export interface ISkillExecutor {
  // ============== 执行控制 ==============

  /**
   * 执行技能
   * @param context - 执行上下文
   * @param options - 执行选项
   */
  execute(
    context: SkillExecutionContext,
    options?: SkillExecutionOptions
  ): Promise<SkillExecutionResult>;

  /**
   * 异步执行技能
   * @param context - 执行上下文
   * @param options - 执行选项
   */
  executeAsync(
    context: SkillExecutionContext,
    options?: SkillExecutionOptions
  ): Promise<string>;

  /**
   * 取消执行
   * @param executionId - 执行ID
   */
  cancel(executionId: string): Promise<void>;

  /**
   * 暂停执行
   * @param executionId - 执行ID
   */
  pause(executionId: string): Promise<void>;

  /**
   * 恢复执行
   * @param executionId - 执行ID
   */
  resume(executionId: string): Promise<void>;

  // ============== 监控 ==============

  /**
   * 获取执行监控信息
   * @param executionId - 执行ID
   */
  getMonitor(executionId: string): Promise<ExecutionMonitor | null>;

  /**
   * 获取所有运行中的执行
   */
  getRunningExecutions(): Promise<ExecutionMonitor[]>;

  // ============== 结果管理 ==============

  /**
   * 获取执行结果
   * @param executionId - 执行ID
   */
  getResult(executionId: string): Promise<SkillExecutionResult | null>;

  /**
   * 清理执行结果
   * @param executionId - 执行ID
   */
  cleanupResult(executionId: string): Promise<void>;

  // ============== 沙箱控制 ==============

  /**
   * 设置资源限制
   * @param executionId - 执行ID
   * @param limits - 资源限制
   */
  setResourceLimits(
    executionId: string,
    limits: {
      maxMemory?: number;
      maxCpu?: number;
      maxTime?: number;
      maxNetwork?: number;
    }
  ): Promise<void>;

  /**
   * 获取进程PID
   * @param executionId - 执行ID
   */
  getProcessId(executionId: string): Promise<number | null>;

  // ============== 生命周期 ==============

  /**
   * 初始化执行器
   */
  initialize(): Promise<void>;

  /**
   * 销毁执行器
   */
  destroy(): Promise<void>;
}
