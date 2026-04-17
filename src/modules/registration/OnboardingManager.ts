/**
 * OnboardingManager.ts
 * 新用户引导管理器
 * 
 * 管理新用户的引导流程和步骤
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { ConfigManager, getConfig, OnboardingConfig, OnboardingStepConfig } from '../../core/config/KunlunConfig';
import { OnboardingProgress, OnboardingStepResult, UserPreferences } from './types';

/**
 * 引导步骤状态
 */
export enum OnboardingStepStatus {
  /** 待完成 */
  PENDING = 'pending',
  /** 进行中 */
  IN_PROGRESS = 'in_progress',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已跳过 */
  SKIPPED = 'skipped',
}

/**
 * 引导步骤记录
 */
interface OnboardingStepRecord {
  /** 步骤ID */
  stepId: string;
  /** 步骤配置 */
  config: OnboardingStepConfig;
  /** 状态 */
  status: OnboardingStepStatus;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 步骤数据 */
  data?: Record<string, any>;
  /** 错误消息 */
  error?: string;
}

/**
 * 引导进度存储
 */
interface OnboardingProgressStore {
  /** 用户ID -> 引导进度 */
  byUserId: Map<string, OnboardingProgress & { steps: OnboardingStepRecord[] }>;
}

/**
 * 新用户引导管理器
 * 
 * 负责管理新用户的引导流程，确保用户完成必要的初始设置
 */
export class OnboardingManager {
  /** 引导进度存储 */
  private progressStore: OnboardingProgressStore;
  
  /** 引导配置 */
  private config: OnboardingConfig;

  /**
   * 构造函数
   */
  constructor() {
    this.progressStore = {
      byUserId: new Map(),
    };
    this.config = getConfig().registration.onboarding;
  }

  /**
   * 开始引导流程
   * 
   * @param userId 用户ID
   * @returns 引导进度
   */
  public async startOnboarding(userId: string): Promise<OnboardingProgress> {
    if (!this.config.enabled) {
      return this.createCompletedProgress(userId);
    }

    // 检查是否已有引导进度
    let progress = this.progressStore.byUserId.get(userId);
    if (progress) {
      // 如果已完成，返回现有进度
      if (progress.completedAt) {
        return this.toOnboardingProgress(progress);
      }
      return this.toOnboardingProgress(progress);
    }

    // 创建新的引导进度
    const now = new Date();
    const steps: OnboardingStepRecord[] = this.config.steps
      .sort((a, b) => a.order - b.order)
      .map(stepConfig => ({
        stepId: stepConfig.id,
        config: stepConfig,
        status: stepConfig.id === this.config.steps[0]?.id 
          ? OnboardingStepStatus.IN_PROGRESS 
          : OnboardingStepStatus.PENDING,
        startedAt: stepConfig.id === this.config.steps[0]?.id ? now : undefined,
      }));

    progress = {
      userId,
      currentStep: 0,
      completedSteps: [],
      startedAt: now,
      completedAt: undefined,
      skippedSteps: [],
      configData: {},
      steps,
    };

    this.progressStore.byUserId.set(userId, progress);
    
    return this.toOnboardingProgress(progress);
  }

  /**
   * 完成引导步骤
   * 
   * @param userId 用户ID
   * @param stepId 步骤ID
   * @param data 步骤数据
   * @returns 步骤结果
   */
  public async completeStep(
    userId: string,
    stepId: string,
    data: Record<string, any>
  ): Promise<OnboardingStepResult> {
    const progress = this.progressStore.byUserId.get(userId);
    
    if (!progress) {
      return {
        stepId,
        success: false,
        error: 'Onboarding not started',
      };
    }

    if (progress.completedAt) {
      return {
        stepId,
        success: false,
        error: 'Onboarding already completed',
      };
    }

    const stepRecord = progress.steps.find(s => s.stepId === stepId);
    if (!stepRecord) {
      return {
        stepId,
        success: false,
        error: 'Step not found',
      };
    }

    if (stepRecord.status === OnboardingStepStatus.COMPLETED) {
      return {
        stepId,
        success: false,
        error: 'Step already completed',
      };
    }

    if (stepRecord.status === OnboardingStepStatus.SKIPPED) {
      return {
        stepId,
        success: false,
        error: 'Step was skipped',
      };
    }

    // 验证必填步骤
    if (stepRecord.config.required && data === null) {
      return {
        stepId,
        success: false,
        error: 'Required step cannot be skipped',
      };
    }

    // 标记步骤为完成
    stepRecord.status = OnboardingStepStatus.COMPLETED;
    stepRecord.completedAt = new Date();
    stepRecord.data = data;

    // 更新进度
    progress.completedSteps.push(stepId);
    progress.configData = { ...progress.configData, ...data };

    // 查找下一个待完成步骤
    const nextStepIndex = progress.steps.findIndex(
      s => s.status === OnboardingStepStatus.PENDING
    );

    if (nextStepIndex === -1) {
      // 所有步骤已完成
      progress.completedAt = new Date();
      progress.currentStep = -1;
    } else {
      // 更新当前步骤
      progress.currentStep = nextStepIndex;
      progress.steps[nextStepIndex].status = OnboardingStepStatus.IN_PROGRESS;
      progress.steps[nextStepIndex].startedAt = new Date();
    }

    return {
      stepId,
      success: true,
      data,
    };
  }

  /**
   * 跳过引导步骤
   * 
   * @param userId 用户ID
   * @param stepId 步骤ID
   * @returns 步骤结果
   */
  public async skipStep(userId: string, stepId: string): Promise<OnboardingStepResult> {
    const progress = this.progressStore.byUserId.get(userId);
    
    if (!progress) {
      return {
        stepId,
        success: false,
        error: 'Onboarding not started',
      };
    }

    if (progress.completedAt) {
      return {
        stepId,
        success: false,
        error: 'Onboarding already completed',
      };
    }

    // 检查是否允许跳过
    if (!this.config.allowSkip) {
      return {
        stepId,
        success: false,
        error: 'Skipping is not allowed',
      };
    }

    const stepRecord = progress.steps.find(s => s.stepId === stepId);
    if (!stepRecord) {
      return {
        stepId,
        success: false,
        error: 'Step not found',
      };
    }

    if (stepRecord.config.required) {
      return {
        stepId,
        success: false,
        error: 'Required step cannot be skipped',
      };
    }

    // 标记步骤为跳过
    stepRecord.status = OnboardingStepStatus.SKIPPED;
    stepRecord.completedAt = new Date();

    // 更新进度
    progress.skippedSteps.push(stepId);

    // 查找下一个待完成步骤
    const nextStepIndex = progress.steps.findIndex(
      s => s.status === OnboardingStepStatus.PENDING
    );

    if (nextStepIndex === -1) {
      progress.completedAt = new Date();
      progress.currentStep = -1;
    } else {
      progress.currentStep = nextStepIndex;
      progress.steps[nextStepIndex].status = OnboardingStepStatus.IN_PROGRESS;
      progress.steps[nextStepIndex].startedAt = new Date();
    }

    return {
      stepId,
      success: true,
    };
  }

  /**
   * 获取引导进度
   * 
   * @param userId 用户ID
   * @returns 引导进度
   */
  public async getProgress(userId: string): Promise<OnboardingProgress | null> {
    const progress = this.progressStore.byUserId.get(userId);
    if (!progress) {
      return null;
    }
    return this.toOnboardingProgress(progress);
  }

  /**
   * 获取当前步骤
   * 
   * @param userId 用户ID
   * @returns 当前步骤配置
   */
  public async getCurrentStep(userId: string): Promise<OnboardingStepConfig | null> {
    const progress = this.progressStore.byUserId.get(userId);
    if (!progress || progress.completedAt) {
      return null;
    }

    const currentStepRecord = progress.steps[progress.currentStep];
    return currentStepRecord?.config || null;
  }

  /**
   * 重置引导进度
   * 
   * @param userId 用户ID
   */
  public async resetOnboarding(userId: string): Promise<void> {
    this.progressStore.byUserId.delete(userId);
  }

  /**
   * 获取待完成的必填步骤
   * 
   * @param userId 用户ID
   * @returns 待完成的必填步骤列表
   */
  public async getRequiredStepsRemaining(userId: string): Promise<OnboardingStepConfig[]> {
    const progress = this.progressStore.byUserId.get(userId);
    if (!progress) {
      return this.config.steps.filter(s => s.required);
    }

    return progress.steps
      .filter(
        s => 
          s.config.required &&
          s.status !== OnboardingStepStatus.COMPLETED &&
          s.status !== OnboardingStepStatus.SKIPPED
      )
      .map(s => s.config);
  }

  /**
   * 检查引导是否完成
   * 
   * @param userId 用户ID
   * @returns 是否完成
   */
  public async isCompleted(userId: string): Promise<boolean> {
    const progress = this.progressStore.byUserId.get(userId);
    if (!progress) {
      // 如果没有进度记录且引导未启用，视为完成
      return !this.config.enabled;
    }
    return progress.completedAt !== undefined;
  }

  /**
   * 获取引导步骤列表
   * 
   * @param userId 用户ID
   * @returns 步骤列表（含状态）
   */
  public async getStepsWithStatus(userId: string): Promise<Array<OnboardingStepConfig & { status: OnboardingStepStatus }>> {
    const progress = this.progressStore.byUserId.get(userId);
    
    return this.config.steps.map(stepConfig => {
      const stepRecord = progress?.steps.find(s => s.stepId === stepConfig.id);
      return {
        ...stepConfig,
        status: stepRecord?.status || OnboardingStepStatus.PENDING,
      };
    });
  }

  /**
   * 获取引导统计
   */
  public getStats(): {
    totalUsers: number;
    completedUsers: number;
    inProgressUsers: number;
    averageCompletionTime: number;
  } {
    const allProgress = Array.from(this.progressStore.byUserId.values());
    
    let completedUsers = 0;
    let totalCompletionTime = 0;

    for (const progress of allProgress) {
      if (progress.completedAt) {
        completedUsers++;
        totalCompletionTime += progress.completedAt.getTime() - progress.startedAt.getTime();
      }
    }

    return {
      totalUsers: allProgress.length,
      completedUsers,
      inProgressUsers: allProgress.length - completedUsers,
      averageCompletionTime: completedUsers > 0 ? totalCompletionTime / completedUsers : 0,
    };
  }

  /**
   * 创建已完成的进度对象
   */
  private createCompletedProgress(userId: string): OnboardingProgress {
    return {
      userId,
      currentStep: -1,
      completedSteps: [],
      startedAt: new Date(),
      completedAt: new Date(),
      skippedSteps: [],
      configData: {},
    };
  }

  /**
   * 转换为导出格式
   */
  private toOnboardingProgress(
    progress: OnboardingProgress & { steps: OnboardingStepRecord[] }
  ): OnboardingProgress {
    return {
      userId: progress.userId,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      skippedSteps: progress.skippedSteps,
      configData: progress.configData,
    };
  }

  /**
   * 检查引导是否超时
   * 
   * @param userId 用户ID
   * @returns 是否超时
   */
  public async isTimedOut(userId: string): Promise<boolean> {
    const progress = this.progressStore.byUserId.get(userId);
    if (!progress || progress.completedAt) {
      return false;
    }

    const timeoutMs = this.config.timeoutHours * 60 * 60 * 1000;
    const elapsed = Date.now() - progress.startedAt.getTime();
    
    return elapsed > timeoutMs;
  }

  /**
   * 获取超时剩余时间(小时)
   * 
   * @param userId 用户ID
   * @returns 剩余小时数，-1表示已超时或已完成
   */
  public async getTimeRemaining(userId: string): Promise<number> {
    const progress = this.progressStore.byUserId.get(userId);
    if (!progress || progress.completedAt) {
      return -1;
    }

    const timeoutMs = this.config.timeoutHours * 60 * 60 * 1000;
    const elapsed = Date.now() - progress.startedAt.getTime();
    const remaining = timeoutMs - elapsed;

    if (remaining <= 0) {
      return -1;
    }

    return Math.ceil(remaining / (60 * 60 * 1000));
  }
}
