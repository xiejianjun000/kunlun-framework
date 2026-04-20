/**
 * 调度类型
 */
export type ScheduleType = 'cron' | 'at' | 'every';

/**
 * 推送渠道类型
 */
export type ChannelType = 'email' | 'feishu' | 'dingtalk' | 'wecom';

/**
 * 调度配置
 */
export interface ScheduleConfig {
  /**
   * 调度类型
   */
  type: ScheduleType;
  /**
   * 调度表达式
   * - cron: standard cron expression
   * - at: ISO date string
   * - every: number in minutes
   */
  expression: string;
  /**
   * 是否启用
   */
  enabled: boolean;
}

/**
 * 模板变量
 */
export type TemplateVariables = Record<string, unknown>;

/**
 * 推送渠道配置
 */
export interface ChannelConfig {
  /**
   * 渠道类型
   */
  type: ChannelType;
  /**
   * webhook地址或接收人
   */
  destination: string;
  /**
   * 渠道密钥/token
   */
  secret?: string;
  /**
   * 标题（用于邮件/飞书卡片）
   */
  title?: string;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  /**
   * 最大重试次数
   */
  maxRetries: number;
  /**
   * 重试间隔（毫秒）
   */
  retryIntervalMs: number;
  /**
   * 是否使用指数退避
   */
  exponentialBackoff?: boolean;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /**
   * 是否成功
   */
  success: boolean;
  /**
   * 渲染后的内容
   */
  content: string;
  /**
   * 推送结果
   */
  pushResult: {
    channel: ChannelType;
    success: boolean;
    message?: string;
  }[];
  /**
   * 错误信息
   */
  error?: string;
  /**
   * 开始时间
   */
  startTime: number;
  /**
   * 结束时间
   */
  endTime: number;
  /**
   * 重试次数
   */
  retries: number;
}

/**
 * 执行历史记录
 */
export interface ExecutionRecord {
  /**
   * 任务ID
   */
  jobId: string;
  /**
   * 执行ID
   */
  executionId: string;
  /**
   * 执行结果
   */
  result: ExecutionResult;
  /**
   * 创建时间
   */
  createdAt: number;
}

/**
 * 计费记录
 */
export interface BillingRecord {
  /**
   * 任务ID
   */
  jobId: string;
  /**
   * 执行ID
   */
  executionId: string;
  /**
   * 计费金额（分）
   */
  amount: number;
  /**
   * 计费时间
   */
  timestamp: number;
  /**
   * 计费项目
   */
  item: string;
}

/**
 * 调度任务定义
 */
export interface ScheduledJob {
  /**
   * 任务ID
   */
  id: string;
  /**
   * 任务名称
   */
  name: string;
  /**
   * 调度配置
   */
  schedule: ScheduleConfig;
  /**
   * 模板名称或内容
   */
  template: string;
  /**
   * 默认模板变量
   */
  defaultVariables?: TemplateVariables;
  /**
   * 推送渠道列表
   */
  channels: ChannelConfig[];
  /**
   * 重试配置
   */
  retry?: RetryConfig;
  /**
   * 计费金额（每次执行）
   */
  costPerExecution?: number;
  /**
   * 是否需要渲染
   */
  needRender: boolean;
}

/**
 * 成果调度器接口
 */
export interface IOutcomeScheduler {
  /**
   * 系统名称
   */
  readonly name: string;
  /**
   * 系统版本
   */
  readonly version: string;

  /**
   * 启动调度器
   */
  start(): void;

  /**
   * 停止调度器
   */
  stop(): void;

  /**
   * 添加任务
   */
  addJob(job: ScheduledJob): void;

  /**
   * 移除任务
   */
  removeJob(jobId: string): boolean;

  /**
   * 手动触发一次任务执行
   */
  triggerJob(jobId: string): Promise<ExecutionResult>;

  /**
   * 获取执行历史
   */
  getExecutionHistory(jobId: string): ExecutionRecord[];

  /**
   * 获取计费统计
   */
  getBillingSummary(startTime?: number, endTime?: number): {
    totalAmount: number;
    records: BillingRecord[];
  };
}
