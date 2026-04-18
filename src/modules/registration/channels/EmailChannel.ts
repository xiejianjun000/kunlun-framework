/**
 * EmailChannel.ts
 * 邮箱注册通道
 * 
 * 实现邮箱注册和邮箱验证功能
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import {
  RegistrationChannel,
  ChannelContext,
  ChannelConfig,
  ChannelResult,
  CaptchaInfo,
} from './RegistrationChannel';
import {
  RegistrationChannelType,
  RegistrationError,
  RegistrationRequest,
  EmailRegistrationRequest,
  User,
  UserStatus,
} from '../types';
import { RegistrationValidator } from '../security/RegistrationValidator';

/**
 * 邮箱配置
 */
export interface EmailConfig {
  /** 邮箱服务类型 */
  service: 'smtp' | 'sendgrid' | 'mailgun' | 'aliyun' | 'tencent';
  /** SMTP配置 */
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
  /** API密钥配置 */
  apiKey?: string;
  /** 发件人地址 */
  fromAddress: string;
  /** 发件人名称 */
  fromName: string;
}

/**
 * 邮箱验证链接信息
 */
interface EmailVerificationInfo {
  /** 邮箱 */
  email: string;
  /** 验证链接 */
  verificationLink: string;
  /** 过期时间 */
  expiresAt: Date;
  /** 已验证 */
  verified: boolean;
}

/**
 * 注册邮箱存储
 */
interface PendingRegistration {
  /** 邮箱 */
  email: string;
  /** 租户ID */
  tenantId: string;
  /** 加密后的密码 */
  passwordHash: string;
  /** 用户名 */
  username?: string;
  /** 验证信息 */
  verification: EmailVerificationInfo;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 邮箱注册通道
 */
export class EmailChannel extends RegistrationChannel {
  /** 邮箱配置 */
  private emailConfig: EmailConfig;

  /** 待注册邮箱存储 */
  private pendingRegistrations: Map<string, PendingRegistration>;

  /** 已验证邮箱存储 */
  private verifiedEmails: Map<string, { tenantId: string; verifiedAt: Date }>;

  /** 注册验证器 */
  private validator: RegistrationValidator;

  /**
   * 构造函数
   * 
   * @param config 邮箱配置
   */
  constructor(
    config?: Partial<EmailConfig> & Partial<ChannelConfig> & { validator?: RegistrationValidator }
  ) {
    super(config);

    this.emailConfig = {
      service: config?.service || 'smtp',
      smtp: config?.smtp || {
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || 'noreply@example.com',
      },
      fromAddress: config?.fromAddress || process.env.SMTP_FROM || 'noreply@example.com',
      fromName: config?.fromName || 'OpenTaiji',
    };

    this.pendingRegistrations = new Map();
    this.verifiedEmails = new Map();
    this.validator = config?.validator || new RegistrationValidator({
      minLength: 8,
      maxLength: 128,
      requireNumber: true,
      requireLowercase: true,
      requireUppercase: true,
      requireSpecialChar: true,
    });
  }

  /**
   * 获取通道类型
   */
  public getChannelType(): RegistrationChannelType {
    return RegistrationChannelType.EMAIL;
  }

  /**
   * 处理邮箱注册
   */
  public async handleRegistration(
    request: RegistrationRequest,
    context: ChannelContext
  ): Promise<ChannelResult> {
    try {
      const emailRequest = request as EmailRegistrationRequest;
      const { email, password, confirmPassword, captcha, captchaToken, username } = emailRequest;

      // 验证必填参数
      if (!email || !password) {
        return this.createErrorResult(
          RegistrationError.INVALID_PARAMS,
          ['Email and password are required']
        );
      }

      // 验证邮箱格式
      if (!this.isValidEmail(email)) {
        return this.createErrorResult(
          RegistrationError.INVALID_PARAMS,
          ['Invalid email format']
        );
      }

      // 验证密码匹配
      if (password !== confirmPassword) {
        return this.createErrorResult(
          RegistrationError.INVALID_PARAMS,
          ['Passwords do not match']
        );
      }

      // 验证密码强度
      const passwordValidation = this.validator.validatePassword(password);
      if (!passwordValidation.valid) {
        return this.createErrorResult(
          RegistrationError.PASSWORD_INVALID,
          passwordValidation.errors
        );
      }

      // 验证验证码
      if (captcha && captchaToken) {
        const isValidCaptcha = await this.verifyCode(email, captcha, captchaToken);
        if (!isValidCaptcha) {
          return this.createErrorResult(
            RegistrationError.CAPTCHA_MISMATCH,
            ['Invalid verification code']
          );
        }
      }

      // 检查邮箱是否已验证
      const verifiedInfo = this.verifiedEmails.get(email.toLowerCase());
      if (!verifiedInfo || verifiedInfo.tenantId !== context.tenantId) {
        // 如果没有验证码，则需要发送验证邮件
        const verificationSent = await this.sendVerificationEmail(email, context.tenantId, {
          password,
          username,
        });

        if (!verificationSent) {
          return this.createErrorResult(
            RegistrationError.UNKNOWN,
            ['Failed to send verification email']
          );
        }

        return this.createErrorResult(
          RegistrationError.EMAIL_EXISTS,
          ['Please verify your email address first']
        );
      }

      // 获取待注册信息
      const pendingReg = this.pendingRegistrations.get(`${email.toLowerCase()}_${context.tenantId}`);
      
      // 构建用户数据（邮箱注册需要先验证邮箱）
      const userData: Partial<User> = {
        tenantId: context.tenantId,
        email: email.toLowerCase(),
        username: username || email.split('@')[0],
        displayName: username || email.split('@')[0],
        registeredVia: RegistrationChannelType.EMAIL,
        type: 'regular' as any,
        status: UserStatus.PENDING, // 等待邮箱验证
        metadata: {
          passwordHash: this.hashPassword(password),
          registrationChannel: 'email',
        },
      };

      // 清理待注册记录
      if (pendingReg) {
        this.pendingRegistrations.delete(`${email.toLowerCase()}_${context.tenantId}`);
      }

      return this.createSuccessResult(userData);

    } catch (error) {
      return this.createErrorResult(
        RegistrationError.UNKNOWN,
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  /**
   * 发送验证码
   */
  public async sendVerificationCode(contact: string, tenantId: string): Promise<CaptchaInfo> {
    if (!this.isValidEmail(contact)) {
      throw new Error('Invalid email format');
    }

    // 调用父类的sendVerificationCode，它会调用sendCodeToContact
    return super.sendVerificationCode(contact, tenantId);
  }

  /**
   * 验证验证码
   */
  public async verifyCode(contact: string, code: string, token: string): Promise<boolean> {
    return super.verifyCode(contact, code, token);
  }

  /**
   * 处理邮箱验证链接点击
   */
  public async handleEmailVerification(
    token: string
  ): Promise<{ success: boolean; email?: string; error?: string }> {
    // 在实际实现中，token应该是加密的，包含邮箱和租户ID信息
    // 这里简化处理，直接查找对应的待注册记录
    
    for (const [key, pendingReg] of this.pendingRegistrations.entries()) {
      if (pendingReg.verification.verificationLink.includes(token)) {
        if (new Date() > pendingReg.verification.expiresAt) {
          return { success: false, error: 'Verification link has expired' };
        }

        if (pendingReg.verification.verified) {
          return { success: false, error: 'Verification link has already been used' };
        }

        // 标记为已验证
        pendingReg.verification.verified = true;
        
        // 添加到已验证邮箱
        this.verifiedEmails.set(pendingReg.email.toLowerCase(), {
          tenantId: pendingReg.tenantId,
          verifiedAt: new Date(),
        });

        return { success: true, email: pendingReg.email };
      }
    }

    return { success: false, error: 'Invalid verification link' };
  }

  /**
   * 重新发送验证邮件
   */
  public async resendVerificationEmail(
    email: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    const key = `${email.toLowerCase()}_${tenantId}`;
    const pendingReg = this.pendingRegistrations.get(key);

    if (!pendingReg) {
      return { success: false, error: 'Registration not found' };
    }

    const sent = await this.sendVerificationEmail(email, tenantId, {
      passwordHash: pendingReg.passwordHash,
      username: pendingReg.username,
    });

    return { success: sent };
  }

  /**
   * 发送验证邮件
   */
  private async sendVerificationEmail(
    email: string,
    tenantId: string,
    registrationData: { password?: string; passwordHash?: string; username?: string }
  ): Promise<boolean> {
    try {
      const token = this.generateVerificationToken();
      const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时过期

      // 存储待注册信息
      const pendingReg: PendingRegistration = {
        email,
        tenantId,
        passwordHash: registrationData.passwordHash || this.hashPassword(registrationData.password || ''),
        username: registrationData.username,
        verification: {
          email,
          verificationLink: verificationLink,
          expiresAt,
          verified: false,
        },
        createdAt: new Date(),
      };

      const key = `${email.toLowerCase()}_${tenantId}`;
      this.pendingRegistrations.set(key, pendingReg);

      // 发送邮件
      const emailContent = this.buildVerificationEmail(verificationLink, expiresAt);
      
      await this.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return true;

    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  /**
   * 发送验证码到邮箱
   */
  protected async sendCodeToContact(contact: string, code: string): Promise<void> {
    const emailContent = this.buildCaptchaEmail(code, new Date(Date.now() + 5 * 60 * 1000));
    
    await this.sendEmail({
      to: contact,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }

  /**
   * 发送邮件
   */
  private async sendEmail(email: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // 实际实现中会使用nodemailer或其他邮件服务发送邮件
    console.log(`[EmailChannel] Sending email to ${email.to}`);
    console.log(`Subject: ${email.subject}`);
    // console.log(`Content: ${email.text}`);
  }

  /**
   * 构建验证邮件内容
   */
  private buildVerificationEmail(
    verificationLink: string,
    expiresAt: Date
  ): { subject: string; html: string; text: string } {
    const expiresDate = expiresAt.toLocaleString();
    
    return {
      subject: 'Verify your email address - OpenTaiji',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to OpenTaiji</h2>
          <p>Please click the button below to verify your email address:</p>
          <p>
            <a href="${verificationLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
              Verify Email Address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          <p><small>This link will expire on ${expiresDate}</small></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't create an account with this email, please ignore this message.
          </p>
        </div>
      `,
      text: `
Welcome to OpenTaiji

Please click the link below to verify your email address:
${verificationLink}

This link will expire on ${expiresDate}

If you didn't create an account with this email, please ignore this message.
      `,
    };
  }

  /**
   * 构建验证码邮件内容
   */
  private buildCaptchaEmail(code: string, expiresAt: Date): { subject: string; html: string; text: string } {
    const expiresMinutes = Math.round((expiresAt.getTime() - Date.now()) / 60000);
    
    return {
      subject: `Your verification code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification Code</h2>
          <p>Your verification code is:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff;">${code}</p>
          <p>This code will expire in ${expiresMinutes} minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, please ignore this message.
          </p>
        </div>
      `,
      text: `
Email Verification Code

Your verification code is: ${code}

This code will expire in ${expiresMinutes} minutes.

If you didn't request this code, please ignore this message.
      `,
    };
  }

  /**
   * 生成验证令牌
   */
  private generateVerificationToken(): string {
    const timestamp = Date.now().toString(36);
    const random = this.generateRandomString(32);
    return `${timestamp}_${random}`;
  }

  /**
   * 生成随机字符串
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 哈希密码（实际应使用bcrypt等）
   */
  private hashPassword(password: string): string {
    // 实际实现中应使用bcrypt
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * 检查邮箱是否已验证
   */
  public isEmailVerified(email: string, tenantId: string): boolean {
    const verifiedInfo = this.verifiedEmails.get(email.toLowerCase());
    return verifiedInfo !== undefined && verifiedInfo.tenantId === tenantId;
  }

  /**
   * 获取待注册数量
   */
  public getPendingRegistrationCount(): number {
    return this.pendingRegistrations.size;
  }

  /**
   * 清理过期待注册记录
   */
  public cleanupExpiredRegistrations(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [key, pendingReg] of this.pendingRegistrations.entries()) {
      if (now > pendingReg.verification.expiresAt) {
        this.pendingRegistrations.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}
