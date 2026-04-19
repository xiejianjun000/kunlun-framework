/**
 * 技能执行器
 * Skill Executor - 沙箱执行环境
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import {
  SkillExecutionResult,
  SkillExecutionContext,
  SkillExecutionOptions,
  SkillExecutionStatus,
} from '../interfaces/skill.types';
import { ISkillExecutor, ExecutorStatus, ExecutionMonitor, ResourceUsage } from '../interfaces/ISkillExecutor';
import { SkillEnvironment } from '../environment/SkillEnvironment';
import { SkillHooks, HookEvent } from '../hooks/SkillHooks';
import { SkillExecutorSecurity, SecurityRedLine } from './SkillExecutorSecurity';

/**
 * 执行器配置
 */
export interface ExecutorConfig {
  /** 最大并发数 */
  maxConcurrent?: number;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 默认内存限制（MB） */
  defaultMemoryLimit?: number;
  /** 工作目录 */
  workDir?: string;
  /** 环境类 */
  environmentClass?: new () => SkillEnvironment;
  /** 是否启用沙箱 */
  enableSandbox?: boolean;
}

/**
 * 执行记录
 */
interface ExecutionRecord {
  context: SkillExecutionContext;
  options: SkillExecutionOptions;
  process?: ChildProcess;
  startTime: Date;
  status: ExecutorStatus;
  progress: number;
  resourceUsage: ResourceUsage;
  cancelFn?: () => void;
}

/**
 * 技能执行器
 * 提供安全的技能执行环境
 */
export class SkillExecutor
  extends EventEmitter
  implements ISkillExecutor
{
  /** 执行器配置 */
  private config: Required<ExecutorConfig>;
  /** 执行记录 */
  private executions: Map<string, ExecutionRecord> = new Map();
  /** 技能目录 */
  private skillsRoot: string;
  /** 钩子系统 */
  private hooks: SkillHooks;
  /** 隔离环境 */
  private environment: SkillEnvironment;

  /**
   * 构造函数
   * @param config - 执行器配置
   * @param skillsRoot - 技能根目录
   * @param hooks - 钩子系统
   */
  constructor(
    config: ExecutorConfig,
    skillsRoot: string,
    hooks: SkillHooks
  ) {
    super();
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      defaultTimeout: config.defaultTimeout ?? 300000, // 5分钟
      defaultMemoryLimit: config.defaultMemoryLimit ?? 512,
      workDir: config.workDir ?? process.cwd(),
      environmentClass: config.environmentClass ?? SkillEnvironment as new () => SkillEnvironment,
      enableSandbox: config.enableSandbox ?? true,
    };
    this.skillsRoot = skillsRoot;
    this.hooks = hooks;
    this.environment = new this.config.environmentClass();
  }

  // ============== 执行控制 ==============

  /**
   * 执行技能
   * @param context - 执行上下文
   * @param options - 执行选项
   */
  async execute(
    context: SkillExecutionContext,
    options?: SkillExecutionOptions
  ): Promise<SkillExecutionResult> {
    const executionId = context.executionId;
    const startTime = Date.now();

    // 合并选项
    const mergedOptions: SkillExecutionOptions = {
      async: false,
      timeout: options?.timeout ?? this.config.defaultTimeout,
      memoryLimit: options?.memoryLimit ?? this.config.defaultMemoryLimit,
      isolation: options?.isolation ?? 'process',
      sandbox: options?.sandbox ?? this.config.enableSandbox,
      ...options,
    };

    // 创建执行记录
    const record: ExecutionRecord = {
      context,
      options: mergedOptions,
      startTime: new Date(),
      status: ExecutorStatus.RUNNING,
      progress: 0,
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0,
        memoryPeak: 0,
        threadCount: 0,
        openFiles: 0,
      },
    };
    this.executions.set(executionId, record);

    // 触发前置钩子
    await this.hooks.trigger(HookEvent.BEFORE_EXECUTE, {
      executionId,
      skillId: context.skillId,
      input: context.input,
    });

    // 🔴 安全红线检查：Pre-action 防御层
    // 来自 SkillExecutorSecurity（移植自 OpenCLAW + slowmist 红队验证指南）
    const inputToCheck = typeof context.input === 'string'
      ? context.input
      : JSON.stringify(context.input ?? '');
    if (inputToCheck) {
      const securityCheck = SkillExecutorSecurity.checkInput(inputToCheck);
      if (!securityCheck.passed) {
        const report = SkillExecutorSecurity.getRedLineReport(securityCheck.redLines);
        const safeResult: SkillExecutionResult = {
          executionId,
          skillId: context.skillId,
          status: SkillExecutionStatus.FAILED,
          output: { blocked: true, redLines: securityCheck.redLines } as unknown,
          error: `🔴 安全拦截: ${securityCheck.redLines.join(', ')}`,
          duration: Date.now() - startTime,
          startedAt: new Date(),
        };
        record.status = ExecutorStatus.IDLE;
        return safeResult;
      }
    }

    try {
      // 检查超时
      const timeoutPromise = this.createTimeout(executionId, mergedOptions.timeout!);

      // 执行技能
      const executePromise = this.doExecute(executionId, mergedOptions);

      // 等待完成
      const result = await Promise.race([executePromise, timeoutPromise]);

      // 更新状态
      record.status = ExecutorStatus.IDLE;
      record.progress = 100;

      // 触发后置钩子
      await this.hooks.trigger(HookEvent.AFTER_EXECUTE, {
        executionId,
        skillId: context.skillId,
        result,
        success: result.status === SkillExecutionStatus.SUCCESS,
      });

      this.emit('executionComplete', result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 处理超时
      if (errorMessage === 'Execution timeout') {
        record.status = ExecutorStatus.STOPPED;
        const result = this.createResult(
          context,
          SkillExecutionStatus.TIMEOUT,
          undefined,
          'Execution timeout',
          Date.now() - startTime
        );

        await this.hooks.trigger(HookEvent.EXECUTE_TIMEOUT, { executionId, skillId: context.skillId });
        return result;
      }

      // 处理取消
      if (errorMessage === 'Execution cancelled') {
        record.status = ExecutorStatus.STOPPED;
        const result = this.createResult(
          context,
          SkillExecutionStatus.CANCELLED,
          undefined,
          'Execution cancelled',
          Date.now() - startTime
        );

        return result;
      }

      record.status = ExecutorStatus.IDLE;

      const result = this.createResult(
        context,
        SkillExecutionStatus.FAILED,
        undefined,
        errorMessage,
        Date.now() - startTime
      );

      await this.hooks.trigger(HookEvent.EXECUTE_ERROR, {
        executionId,
        skillId: context.skillId,
        error: errorMessage,
      });

      this.emit('executionFailed', result);

      return result;
    }
  }

  /**
   * 异步执行技能
   * @param context - 执行上下文
   * @param options - 执行选项
   */
  async executeAsync(
    context: SkillExecutionContext,
    options?: SkillExecutionOptions
  ): Promise<string> {
    const executionId = context.executionId;

    // 异步执行
    this.execute(context, { ...options, async: true }).catch((error) => {
      console.error(`异步执行失败: ${executionId}`, error);
    });

    return executionId;
  }

  /**
   * 取消执行
   * @param executionId - 执行ID
   */
  async cancel(executionId: string): Promise<void> {
    const record = this.executions.get(executionId);
    if (!record) {
      throw new Error(`执行 ${executionId} 不存在`);
    }

    if (record.cancelFn) {
      record.cancelFn();
    }

    if (record.process) {
      record.process.kill('SIGTERM');
    }

    record.status = ExecutorStatus.STOPPED;

    this.emit('executionCancelled', executionId);
  }

  /**
   * 暂停执行
   * @param executionId - 执行ID
   */
  async pause(executionId: string): Promise<void> {
    const record = this.executions.get(executionId);
    if (!record) {
      throw new Error(`执行 ${executionId} 不存在`);
    }

    if (record.process) {
      record.process.kill('SIGSTOP');
    }

    record.status = ExecutorStatus.PAUSED;

    this.emit('executionPaused', executionId);
  }

  /**
   * 恢复执行
   * @param executionId - 执行ID
   */
  async resume(executionId: string): Promise<void> {
    const record = this.executions.get(executionId);
    if (!record) {
      throw new Error(`执行 ${executionId} 不存在`);
    }

    if (record.process) {
      record.process.kill('SIGCONT');
    }

    record.status = ExecutorStatus.RUNNING;

    this.emit('executionResumed', executionId);
  }

  // ============== 监控 ==============

  /**
   * 获取执行监控信息
   * @param executionId - 执行ID
   */
  getMonitor(executionId: string): Promise<ExecutionMonitor | null> {
    const record = this.executions.get(executionId);
    if (!record) {
      return Promise.resolve(null);
    }

    const monitor: ExecutionMonitor = {
      executionId,
      status: record.status,
      progress: record.progress,
      resourceUsage: record.resourceUsage,
      startedAt: record.startTime,
      elapsedTime: Date.now() - record.startTime.getTime(),
    };

    return Promise.resolve(monitor);
  }

  /**
   * 获取所有运行中的执行
   */
  getRunningExecutions(): Promise<ExecutionMonitor[]> {
    const monitors: ExecutionMonitor[] = [];

    for (const [executionId, record] of this.executions) {
      if (record.status === ExecutorStatus.RUNNING) {
        monitors.push({
          executionId,
          status: record.status,
          progress: record.progress,
          resourceUsage: record.resourceUsage,
          startedAt: record.startTime,
          elapsedTime: Date.now() - record.startTime.getTime(),
        });
      }
    }

    return Promise.resolve(monitors);
  }

  // ============== 结果管理 ==============

  /**
   * 获取执行结果
   * @param executionId - 执行ID
   */
  getResult(executionId: string): Promise<SkillExecutionResult | null> {
    const record = this.executions.get(executionId);
    if (!record) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      executionId,
      skillId: record.context.skillId,
      status: this.mapExecutorStatus(record.status),
      output: undefined,
      duration: Date.now() - record.startTime.getTime(),
      startedAt: record.startTime,
      endedAt: new Date(),
    });
  }

  /**
   * 清理执行结果
   * @param executionId - 执行ID
   */
  async cleanupResult(executionId: string): Promise<void> {
    this.executions.delete(executionId);
  }

  // ============== 沙箱控制 ==============

  /**
   * 设置资源限制
   * @param executionId - 执行ID
   * @param limits - 资源限制
   */
  async setResourceLimits(
    executionId: string,
    limits: {
      maxMemory?: number;
      maxCpu?: number;
      maxTime?: number;
      maxNetwork?: number;
    }
  ): Promise<void> {
    const record = this.executions.get(executionId);
    if (!record) {
      throw new Error(`执行 ${executionId} 不存在`);
    }

    // 实际实现应该设置 cgroups 或使用其他方式限制资源
    // 这里只是记录配置
    record.options.memoryLimit = limits.maxMemory ?? record.options.memoryLimit;
    record.options.timeout = limits.maxTime ?? record.options.timeout;
  }

  /**
   * 获取进程PID
   * @param executionId - 执行ID
   */
  getProcessId(executionId: string): Promise<number | null> {
    const record = this.executions.get(executionId);
    if (!record || !record.process) {
      return Promise.resolve(null);
    }

    return Promise.resolve(record.process.pid ?? null);
  }

  // ============== 生命周期 ==============

  /**
   * 初始化执行器
   */
  async initialize(): Promise<void> {
    await this.environment.initialize();
  }

  /**
   * 销毁执行器
   */
  async destroy(): Promise<void> {
    // 停止所有运行中的执行
    for (const [executionId] of this.executions) {
      try {
        await this.cancel(executionId);
      } catch {
        // 忽略错误
      }
    }

    this.executions.clear();
    await this.environment.destroy();
  }

  // ============== 私有方法 ==============

  /**
   * 执行技能逻辑
   */
  private async doExecute(
    executionId: string,
    options: SkillExecutionOptions
  ): Promise<SkillExecutionResult> {
    const record = this.executions.get(executionId)!;
    const { context } = record;
    const startTime = Date.now();

    // 获取技能路径
    const skillPath = path.join(this.skillsRoot, context.skillId);
    const entryPoint = path.join(skillPath, 'index.js');

    if (!fs.existsSync(entryPoint)) {
      return this.createResult(
        context,
        SkillExecutionStatus.FAILED,
        undefined,
        `技能入口文件不存在: ${entryPoint}`,
        Date.now() - startTime
      );
    }

    // 准备环境
    const env = {
      ...process.env,
      ...context.envVars,
      Taiji_EXECUTION_ID: executionId,
      Taiji_SKILL_ID: context.skillId,
      Taiji_USER_ID: context.userId,
      Taiji_TENANT_ID: context.tenantId,
    };

    // 创建执行Promise
    return new Promise((resolve, reject) => {
      // 设置取消函数
      record.cancelFn = () => {
        reject(new Error('Execution cancelled'));
      };

      // 更新进度
      record.progress = 20;

      // 启动进程
      const child = spawn('node', [entryPoint], {
        cwd: context.workingDirectory ?? skillPath,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      record.process = child;

      // 收集输出
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        record.progress = Math.min(record.progress + 10, 90);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 处理完成
      child.on('close', (code) => {
        record.progress = 100;

        if (code === 0) {
          resolve(
            this.createResult(
              context,
              SkillExecutionStatus.SUCCESS,
              this.parseOutput(stdout),
              undefined,
              Date.now() - startTime
            )
          );
        } else {
          resolve(
            this.createResult(
              context,
              SkillExecutionStatus.FAILED,
              undefined,
              stderr || `Process exited with code ${code}`,
              Date.now() - startTime
            )
          );
        }
      });

      // 处理错误
      child.on('error', (error) => {
        reject(error);
      });

      // 发送输入
      if (context.input) {
        child.stdin?.write(JSON.stringify(context.input));
        child.stdin?.end();
      }

      // 进度回调
      if (options.onProgress) {
        options.onProgress(record.progress);
      }
    });
  }

  /**
   * 创建超时Promise
   */
  private createTimeout(executionId: string, timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const record = this.executions.get(executionId);
        if (record && record.status === ExecutorStatus.RUNNING) {
          reject(new Error('Execution timeout'));
        }
      }, timeout);
    });
  }

  /**
   * 创建执行结果
   */
  private createResult(
    context: SkillExecutionContext,
    status: SkillExecutionStatus,
    output: unknown,
    error: string | undefined,
    duration: number
  ): SkillExecutionResult {
    return {
      executionId: context.executionId,
      skillId: context.skillId,
      status,
      output,
      error,
      duration,
      startedAt: new Date(Date.now() - duration),
      endedAt: new Date(),
    };
  }

  /**
   * 解析输出
   */
  private parseOutput(stdout: string): unknown {
    try {
      // 尝试解析JSON
      const trimmed = stdout.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }
      return stdout;
    } catch {
      return stdout;
    }
  }

  /**
   * 映射执行器状态到技能执行状态
   */
  private mapExecutorStatus(status: ExecutorStatus): SkillExecutionStatus {
    switch (status) {
      case ExecutorStatus.IDLE:
        return SkillExecutionStatus.SUCCESS;
      case ExecutorStatus.RUNNING:
        return SkillExecutionStatus.RUNNING;
      case ExecutorStatus.PAUSED:
        return SkillExecutionStatus.PENDING;
      case ExecutorStatus.STOPPED:
        return SkillExecutionStatus.CANCELLED;
      default:
        return SkillExecutionStatus.FAILED;
    }
  }
}
