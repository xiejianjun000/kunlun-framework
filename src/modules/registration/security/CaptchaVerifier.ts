/**
 * CaptchaVerifier.ts
 * 验证码验证器
 * 
 * 负责验证码的生成、发送和验证
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { CaptchaConfig } from '../../core/config/TaijiConfig';

/**
 * 验证码类型
 */
export enum CaptchaType {
  /** 图片验证码 */
  IMAGE = 'image',
  /** 短信验证码 */
  SMS = 'sms',
  /** 邮箱验证码 */
  EMAIL = 'email',
  /** reCAPTCHA */
  RECAPTCHA = 'recaptcha',
  /** 腾讯验证码 */
  TENCENT_CAPTCHA = 'tencent_captcha',
}

/**
 * 验证码信息
 */
export interface CaptchaInfo {
  /** 验证码ID */
  captchaId: string;
  /** 验证码类型 */
  type: CaptchaType;
  /** 验证码值 */
  value?: string;
  /** 验证码图片URL */
  imageUrl?: string;
  /** 验证Token */
  verifyToken: string;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 已使用 */
  used: boolean;
  /** 验证次数 */
  verifyAttempts: number;
}

/**
 * 验证结果
 */
export interface VerifyResult {
  /** 是否通过 */
  success: boolean;
  /** 错误消息 */
  error?: string;
}

/**
 * 验证码验证器
 */
export class CaptchaVerifier {
  /** 验证码配置 */
  private config: CaptchaConfig;
  
  /** 验证码存储 */
  private captchaStore: Map<string, CaptchaInfo>;
  
  /** IP验证码计数 */
  private ipAttemptCount: Map<string, { count: number; resetAt: Date }>;

  /**
   * 构造函数
   */
  constructor(config?: CaptchaConfig) {
    this.config = {
      type: config?.type || 'simple',
      expireSeconds: config?.expireSeconds || 300,
      length: config?.length || 6,
      maxRetries: config?.maxRetries || 3,
    };

    this.captchaStore = new Map();
    this.ipAttemptCount = new Map();
  }

  /**
   * 生成图片验证码
   */
  public async generateImageCaptcha(): Promise<{
    captchaId: string;
    imageUrl: string;
    verifyToken: string;
    expiresAt: Date;
  }> {
    const captchaId = this.generateId();
    const value = this.generateCode(this.config.length);
    const verifyToken = this.generateToken();
    const expiresAt = new Date(Date.now() + this.config.expireSeconds * 1000);

    // 存储验证码信息
    const captchaInfo: CaptchaInfo = {
      captchaId,
      type: CaptchaType.IMAGE,
      value,
      verifyToken,
      createdAt: new Date(),
      expiresAt,
      used: false,
      verifyAttempts: 0,
    };

    this.captchaStore.set(verifyToken, captchaInfo);

    // 生成验证码图片URL（实际实现中会调用图形渲染服务）
    const imageUrl = this.generateCaptchaImageUrl(captchaId, value);

    return {
      captchaId,
      imageUrl,
      verifyToken,
      expiresAt,
    };
  }

  /**
   * 验证图片验证码
   */
  public async verifyImageCaptcha(
    verifyToken: string,
    userInput: string,
    ip?: string
  ): Promise<VerifyResult> {
    // IP频率检查
    if (ip) {
      const ipCheck = this.checkIpRateLimit(ip);
      if (!ipCheck.allowed) {
        return {
          success: false,
          error: `验证过于频繁，请${ipCheck.waitSeconds}秒后重试`,
        };
      }
    }

    const captchaInfo = this.captchaStore.get(verifyToken);

    if (!captchaInfo) {
      return {
        success: false,
        error: '验证码不存在或已过期',
      };
    }

    if (captchaInfo.type !== CaptchaType.IMAGE) {
      return {
        success: false,
        error: '验证码类型不匹配',
      };
    }

    if (captchaInfo.used) {
      return {
        success: false,
        error: '验证码已被使用',
      };
    }

    if (new Date() > captchaInfo.expiresAt) {
      return {
        success: false,
        error: '验证码已过期',
      };
    }

    if (captchaInfo.verifyAttempts >= this.config.maxRetries) {
      return {
        success: false,
        error: '验证次数过多，请重新获取验证码',
      };
    }

    // 增加验证次数
    captchaInfo.verifyAttempts++;

    // 验证验证码（不区分大小写）
    if (captchaInfo.value?.toLowerCase() !== userInput.toLowerCase()) {
      return {
        success: false,
        error: `验证码错误，剩余${this.config.maxRetries - captchaInfo.verifyAttempts}次尝试`,
      };
    }

    // 标记为已使用
    captchaInfo.used = true;

    // 增加IP计数
    if (ip) {
      this.incrementIpCount(ip);
    }

    return {
      success: true,
    };
  }

  /**
   * 验证短信/邮箱验证码
   */
  public async verifyCode(
    verifyToken: string,
    code: string,
    type: 'sms' | 'email'
  ): Promise<VerifyResult> {
    const captchaInfo = this.captchaStore.get(verifyToken);

    if (!captchaInfo) {
      return {
        success: false,
        error: '验证码不存在或已过期',
      };
    }

    const expectedType = type === 'sms' ? CaptchaType.SMS : CaptchaType.EMAIL;
    if (captchaInfo.type !== expectedType) {
      return {
        success: false,
        error: '验证码类型不匹配',
      };
    }

    if (captchaInfo.used) {
      return {
        success: false,
        error: '验证码已被使用',
      };
    }

    if (new Date() > captchaInfo.expiresAt) {
      return {
        success: false,
        error: '验证码已过期',
      };
    }

    if (captchaInfo.verifyAttempts >= this.config.maxRetries) {
      return {
        success: false,
        error: '验证次数过多，请重新获取验证码',
      };
    }

    captchaInfo.verifyAttempts++;

    if (captchaInfo.value !== code) {
      return {
        success: false,
        error: `验证码错误，剩余${this.config.maxRetries - captchaInfo.verifyAttempts}次尝试`,
      };
    }

    captchaInfo.used = true;

    return {
      success: true,
    };
  }

  /**
   * 验证reCAPTCHA
   */
  public async verifyRecaptcha(
    recaptchaResponse: string,
    secret: string,
    ip?: string
  ): Promise<VerifyResult> {
    // 实际实现中会调用Google reCAPTCHA验证API
    // POST https://www.google.com/recaptcha/api/siteverify
    
    // 模拟验证
    if (!recaptchaResponse) {
      return {
        success: false,
        error: 'reCAPTCHA验证失败',
      };
    }

    // 模拟成功响应
    return {
      success: true,
    };
  }

  /**
   * 验证腾讯验证码
   */
  public async verifyTencentCaptcha(
    ticket: string,
    randstr: string,
    ip: string,
    appId: string,
    appSecret: string
  ): Promise<VerifyResult> {
    // 实际实现中会调用腾讯验证码验证API
    
    // 模拟验证
    if (!ticket || !randstr) {
      return {
        success: false,
        error: '腾讯验证码验证失败',
      };
    }

    return {
      success: true,
    };
  }

  /**
   * 生成验证码（供外部使用）
   */
  public generateCode(length: number = this.config.length): string {
    const digits = '0123456789';
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 排除易混淆的字符
    const chars = digits + letters;
    
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 存储验证码
   */
  public storeCaptcha(
    type: CaptchaType,
    value: string,
    contact?: string
  ): {
    verifyToken: string;
    expiresAt: Date;
  } {
    const verifyToken = this.generateToken();
    const expiresAt = new Date(Date.now() + this.config.expireSeconds * 1000);

    const captchaInfo: CaptchaInfo = {
      captchaId: this.generateId(),
      type,
      value,
      verifyToken,
      createdAt: new Date(),
      expiresAt,
      used: false,
      verifyAttempts: 0,
      ...(contact && { imageUrl: contact }),
    };

    this.captchaStore.set(verifyToken, captchaInfo);

    return {
      verifyToken,
      expiresAt,
    };
  }

  /**
   * 检查IP频率限制
   */
  private checkIpRateLimit(ip: string): {
    allowed: boolean;
    waitSeconds?: number;
  } {
    const ipInfo = this.ipAttemptCount.get(ip);
    
    if (!ipInfo) {
      return { allowed: true };
    }

    const now = new Date();
    if (now > ipInfo.resetAt) {
      return { allowed: true };
    }

    if (ipInfo.count >= 10) {
      const waitMs = ipInfo.resetAt.getTime() - now.getTime();
      return {
        allowed: false,
        waitSeconds: Math.ceil(waitMs / 1000),
      };
    }

    return { allowed: true };
  }

  /**
   * 增加IP计数
   */
  private incrementIpCount(ip: string): void {
    let ipInfo = this.ipAttemptCount.get(ip);
    
    if (!ipInfo) {
      ipInfo = {
        count: 0,
        resetAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时重置
      };
    }

    ipInfo.count++;
    this.ipAttemptCount.set(ip, ipInfo);
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  /**
   * 生成Token
   */
  private generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${random1}_${random2}`;
  }

  /**
   * 生成验证码图片URL
   */
  private generateCaptchaImageUrl(captchaId: string, value: string): string {
    // 实际实现中会调用图形渲染服务或CDN
    // 这里返回模拟URL
    return `/api/captcha/image/${captchaId}`;
  }

  /**
   * 清理过期验证码
   */
  public cleanup(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [token, info] of this.captchaStore.entries()) {
      if (now > info.expiresAt || info.used) {
        this.captchaStore.delete(token);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取配置
   */
  public getConfig(): CaptchaConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<CaptchaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取验证码统计
   */
  public getStats(): {
    total: number;
    active: number;
    used: number;
    expired: number;
  } {
    const now = new Date();
    let active = 0;
    let used = 0;
    let expired = 0;

    for (const info of this.captchaStore.values()) {
      if (info.used) used++;
      else if (now > info.expiresAt) expired++;
      else active++;
    }

    return {
      total: this.captchaStore.size,
      active,
      used,
      expired,
    };
  }
}
