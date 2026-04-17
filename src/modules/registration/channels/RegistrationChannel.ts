/**
 * RegistrationChannel.ts
 * 注册通道抽象基类
 * 
 * 定义注册通道的统一接口和通用功能
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import {
  RegistrationRequest,
  RegistrationResponse,
  RegistrationError,
  RegistrationChannelType,
  ClientInfo,
  User,
} from '../types';
import { RegistrationValidator } from '../security/RegistrationValidator';
import { AntiSpamFilter } from '../security/AntiSpamFilter';

/**
 * 通道上下文
 */
export interface ChannelContext {
  /** 租户ID */
  tenantId: string;
  /** 通道类型 */
  channel: RegistrationChannelType;
  /** 客户端信息 */
  clientInfo: ClientInfo;
  /** 注册验证器 */
  validator: RegistrationValidator;
  /** 防刷过滤器 */
  antiSpamFilter: AntiSpamFilter;
}

/**
 * 通道配置
 */
export interface ChannelConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 自定义配置 */
  [key: string]: any;
}

/**
 * 通道处理结果
 */
export interface ChannelResult {
  /** 是否成功 */
  success: boolean;
  /** 用户数据 */
  userData?: Partial<User>;
  /** 错误信息 */
  error?: RegistrationError;
  /** 错误详情 */
  errorDetails?: string[];
}

/**
 * 验证码信息
 */
export interface CaptchaInfo {
  /** 验证码 */
  captcha: string;
  /** 验证码Token */
  token: string;
  /** 过期时间 */
  expiresAt: Date;
  /** 验证码URL（图片验证码时） */
  imageUrl?: string;
}

/**
 * 注册通道接口
 */
export interface IRegistrationChannel {
  /**
   * 获取通道类型
   */
  getChannelType(): RegistrationChannelType;

  /**
   * 处理注册
   */
  handleRegistration(request: RegistrationRequest, context: ChannelContext): Promise<ChannelResult>;

  /**
   * 发送验证码
   */
  sendVerificationCode(contact: string, tenantId: string): Promise<CaptchaInfo>;

  /**
   * 验证验证码
   */
  verifyCode(contact: string, code: string, token: string): Promise<boolean>;

  /**
   * 检查通道是否可用
   */
  isAvailable(): boolean;
}

/**
 * 注册通道抽象基类
 * 
 * 提供注册通道的通用功能和接口定义
 */
export abstract class RegistrationChannel implements IRegistrationChannel {
  /** 通道配置 */
  protected config: ChannelConfig;

  /** 验证码存储 */
  protected captchaStore: Map<string, { code: string; expiresAt: Date }>;

  /**
   * 构造函数
   * 
   * @param config 通道配置
   */
  constructor(config?: ChannelConfig) {
    this.config = config || { enabled: true };
    this.captchaStore = new Map();
  }

  /**
   * 获取通道类型
   */
  public abstract getChannelType(): RegistrationChannelType;

  /**
   * 处理注册
   */
  public abstract handleRegistration(
    request: RegistrationRequest,
    context: ChannelContext
  ): Promise<ChannelResult>;

  /**
   * 发送验证码
   */
  public async sendVerificationCode(contact: string, tenantId: string): Promise<CaptchaInfo> {
    const code = this.generateCode(6);
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    this.captchaStore.set(token, { code, expiresAt });

    // 实际实现中，这里会调用短信/邮件服务发送验证码
    await this.sendCodeToContact(contact, code);

    return {
      captcha: code,
      token,
      expiresAt,
    };
  }

  /**
   * 验证验证码
   */
  public async verifyCode(contact: string, code: string, token: string): Promise<boolean> {
    const captchaInfo = this.captchaStore.get(token);

    if (!captchaInfo) {
      return false;
    }

    if (new Date() > captchaInfo.expiresAt) {
      this.captchaStore.delete(token);
      return false;
    }

    const isValid = captchaInfo.code === code;
    
    if (isValid) {
      this.captchaStore.delete(token);
    }

    return isValid;
  }

  /**
   * 检查通道是否可用
   */
  public isAvailable(): boolean {
    return this.config.enabled;
  }

  /**
   * 获取配置
   */
  public getConfig(): ChannelConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ChannelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 清理过期验证码
   */
  protected cleanupExpiredCaptchas(): void {
    const now = new Date();
    for (const [token, info] of this.captchaStore.entries()) {
      if (now > info.expiresAt) {
        this.captchaStore.delete(token);
      }
    }
  }

  /**
   * 发送验证码到联系方式
   */
  protected abstract sendCodeToContact(contact: string, code: string): Promise<void>;

  /**
   * 生成随机验证码
   */
  protected generateCode(length: number): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  /**
   * 生成令牌
   */
  protected generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }

  /**
   * 创建错误结果
   */
  protected createErrorResult(error: RegistrationError, details?: string[]): ChannelResult {
    return {
      success: false,
      error,
      errorDetails: details,
    };
  }

  /**
   * 创建成功结果
   */
  protected createSuccessResult(userData: Partial<User>): ChannelResult {
    return {
      success: true,
      userData,
    };
  }

  /**
   * 验证邮箱格式
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式
   */
  protected isValidPhone(phone: string): boolean {
    // 支持国际格式
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  /**
   * 清理联系方式中的格式字符
   */
  protected sanitizeContact(contact: string): string {
    return contact.replace(/[\s\-\(\)]/g, '');
  }
}
