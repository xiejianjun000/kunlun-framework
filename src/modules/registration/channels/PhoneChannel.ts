/**
 * PhoneChannel.ts
 * 手机号注册通道
 * 
 * 实现手机号注册和短信验证码功能
 * 
 * @author 昆仑框架团队
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
  PhoneRegistrationRequest,
  User,
  UserStatus,
} from '../types';

/**
 * 短信服务配置
 */
export interface SMSConfig {
  /** 短信服务类型 */
  provider: 'aliyun' | 'tencent' | 'yunpian' | 'twilio' | 'mock';
  /** 阿里云配置 */
  aliyun?: {
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
  };
  /** 腾讯云配置 */
  tencent?: {
    secretId: string;
    secretKey: string;
    sdkAppId: string;
    signName: string;
    templateId: number;
  };
  /** 通用配置 */
  template?: {
    verificationCode: string;
    welcome: string;
  };
}

/**
 * 短信发送记录
 */
interface SMSRecord {
  /** 手机号 */
  phone: string;
  /** 验证码 */
  code: string;
  /** 模板ID */
  templateId: string;
  /** 发送时间 */
  sentAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 发送次数 */
  sendCount: number;
  /** 验证次数 */
  verifyAttempts: number;
  /** 是否已使用 */
  used: boolean;
}

/**
 * 手机号注册通道
 */
export class PhoneChannel extends RegistrationChannel {
  /** 短信配置 */
  private smsConfig: SMSConfig;

  /** 短信发送记录 */
  private smsRecords: Map<string, SMSRecord>;

  /** 验证尝试限制 */
  private maxVerifyAttempts: number = 5;

  /** 发送频率限制 */
  private sendCooldownMs: number = 60000; // 60秒

  /**
   * 构造函数
   * 
   * @param config 手机号配置
   */
  constructor(config?: Partial<SMSConfig & ChannelConfig>) {
    super(config);

    this.smsConfig = {
      provider: config?.provider || 'mock',
      aliyun: config?.aliyun || {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
        signName: process.env.ALIYUN_SIGN_NAME || '昆仑框架',
        templateCode: process.env.ALIYUN_TEMPLATE_CODE || 'SMS_123456789',
      },
      tencent: config?.tencent || {
        secretId: process.env.TENCENT_SECRET_ID || '',
        secretKey: process.env.TENCENT_SECRET_KEY || '',
        sdkAppId: process.env.TENCENT_SDK_APP_ID || '',
        signName: process.env.TENCENT_SIGN_NAME || '昆仑框架',
        templateId: parseInt(process.env.TENCENT_TEMPLATE_ID || '1234567'),
      },
      template: config?.template || {
        verificationCode: '您的验证码是：${code}，有效期5分钟，请勿泄露',
        welcome: '欢迎注册昆仑框架，您的手机号已成功注册',
      },
    };

    this.smsRecords = new Map();
  }

  /**
   * 获取通道类型
   */
  public getChannelType(): RegistrationChannelType {
    return RegistrationChannelType.PHONE;
  }

  /**
   * 处理手机号注册
   */
  public async handleRegistration(
    request: RegistrationRequest,
    context: ChannelContext
  ): Promise<ChannelResult> {
    try {
      const phoneRequest = request as PhoneRegistrationRequest;
      const { phone, verificationCode, username } = phoneRequest;

      // 验证必填参数
      if (!phone || !verificationCode) {
        return this.createErrorResult(
          RegistrationError.INVALID_PARAMS,
          ['Phone number and verification code are required']
        );
      }

      // 验证手机号格式
      const normalizedPhone = this.normalizePhone(phone);
      if (!this.isValidPhone(normalizedPhone)) {
        return this.createErrorResult(
          RegistrationError.INVALID_PARAMS,
          ['Invalid phone number format']
        );
      }

      // 验证短信验证码
      const verifyResult = await this.verifySMSCode(normalizedPhone, verificationCode);
      if (!verifyResult.valid) {
        return this.createErrorResult(
          verifyResult.error!,
          [verifyResult.errorMessage!]
        );
      }

      // 构建用户数据
      const userData: Partial<User> = {
        tenantId: context.tenantId,
        phone: normalizedPhone,
        username: username || `user_${normalizedPhone.slice(-8)}`,
        displayName: username || `用户${normalizedPhone.slice(-4)}`,
        registeredVia: RegistrationChannelType.PHONE,
        type: 'regular' as any,
        status: UserStatus.ACTIVE, // 手机号验证通过自动激活
        metadata: {
          registrationChannel: 'phone',
          phoneVerified: true,
        },
      };

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
    const normalizedPhone = this.normalizePhone(contact);

    if (!this.isValidPhone(normalizedPhone)) {
      throw new Error('Invalid phone number format');
    }

    // 检查发送频率
    const existingRecord = this.smsRecords.get(normalizedPhone);
    if (existingRecord) {
      const cooldownEnd = new Date(existingRecord.sentAt.getTime() + this.sendCooldownMs);
      if (new Date() < cooldownEnd) {
        throw new Error(`Please wait ${Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000)} seconds before requesting another code`);
      }
      
      // 检查发送次数
      if (existingRecord.sendCount >= 10) {
        throw new Error('Maximum send attempts exceeded for today');
      }
    }

    // 生成验证码
    const code = this.generateCode(6);
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    // 更新或创建记录
    const record: SMSRecord = {
      phone: normalizedPhone,
      code,
      templateId: this.getTemplateId('verificationCode'),
      sentAt: new Date(),
      expiresAt,
      sendCount: existingRecord ? existingRecord.sendCount + 1 : 1,
      verifyAttempts: 0,
      used: false,
    };

    this.smsRecords.set(normalizedPhone, record);

    // 发送短信
    await this.sendSMS(normalizedPhone, code);

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
    const normalizedPhone = this.normalizePhone(contact);
    return this.verifySMSCode(normalizedPhone, code).then(r => r.valid);
  }

  /**
   * 验证短信验证码
   */
  private async verifySMSCode(
    phone: string,
    code: string
  ): Promise<{ valid: boolean; error?: RegistrationError; errorMessage?: string }> {
    const record = this.smsRecords.get(phone);

    if (!record) {
      return {
        valid: false,
        error: RegistrationError.CAPTCHA_INVALID,
        errorMessage: 'Verification code not found or expired',
      };
    }

    // 检查是否已使用
    if (record.used) {
      return {
        valid: false,
        error: RegistrationError.CAPTCHA_EXPIRED,
        errorMessage: 'Verification code has already been used',
      };
    }

    // 检查是否过期
    if (new Date() > record.expiresAt) {
      return {
        valid: false,
        error: RegistrationError.CAPTCHA_EXPIRED,
        errorMessage: 'Verification code has expired',
      };
    }

    // 检查验证次数
    if (record.verifyAttempts >= this.maxVerifyAttempts) {
      return {
        valid: false,
        error: RegistrationError.CAPTCHA_INVALID,
        errorMessage: 'Maximum verification attempts exceeded',
      };
    }

    // 增加验证次数
    record.verifyAttempts++;

    // 验证验证码
    if (record.code !== code) {
      return {
        valid: false,
        error: RegistrationError.CAPTCHA_MISMATCH,
        errorMessage: `Incorrect verification code. ${this.maxVerifyAttempts - record.verifyAttempts} attempts remaining`,
      };
    }

    // 标记为已使用
    record.used = true;

    return { valid: true };
  }

  /**
   * 发送短信
   */
  private async sendSMS(phone: string, code: string): Promise<void> {
    const template = this.smsConfig.template?.verificationCode.replace('${code}', code);

    switch (this.smsConfig.provider) {
      case 'aliyun':
        await this.sendViaAliyun(phone, code);
        break;
      case 'tencent':
        await this.sendViaTencent(phone, code);
        break;
      case 'mock':
        console.log(`[PhoneChannel] Mock SMS: Sending code ${code} to ${phone}`);
        break;
      default:
        console.log(`[PhoneChannel] SMS: ${template} to ${phone}`);
    }
  }

  /**
   * 通过阿里云发送短信
   */
  private async sendViaAliyun(phone: string, code: string): Promise<void> {
    // 实际实现中会调用阿里云短信服务API
    // POST https://dysmsapi.aliyuncs.com/
    
    console.log(`[PhoneChannel] Aliyun SMS: Sending code ${code} to ${phone}`);
  }

  /**
   * 通过腾讯云发送短信
   */
  private async sendViaTencent(phone: string, code: string): Promise<void> {
    // 实际实现中会调用腾讯云短信服务API
    // POST https://yun.tim.qq.com/v5/tlssmssvr/sendsms
    
    console.log(`[PhoneChannel] Tencent SMS: Sending code ${code} to ${phone}`);
  }

  /**
   * 获取模板ID
   */
  private getTemplateId(type: 'verificationCode' | 'welcome'): string {
    switch (type) {
      case 'verificationCode':
        return this.smsConfig.aliyun?.templateCode || 'SMS_123456789';
      case 'welcome':
        return 'SMS_WELCOME';
      default:
        return 'SMS_DEFAULT';
    }
  }

  /**
   * 规范化手机号
   */
  private normalizePhone(phone: string): string {
    // 移除所有非数字字符（保留开头的+号）
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * 发送验证码到手机
   */
  protected async sendCodeToContact(contact: string, code: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(contact);
    await this.sendSMS(normalizedPhone, code);
  }

  /**
   * 批量发送短信（用于营销）
   */
  public async batchSendSMS(
    phones: string[],
    message: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const phone of phones) {
      try {
        const normalizedPhone = this.normalizePhone(phone);
        if (!this.isValidPhone(normalizedPhone)) {
          failed++;
          errors.push(`${phone}: Invalid phone number`);
          continue;
        }

        // 实际发送逻辑
        console.log(`[PhoneChannel] Batch SMS to ${normalizedPhone}: ${message}`);
        success++;

      } catch (error) {
        failed++;
        errors.push(`${phone}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 检查手机号是否已注册
   */
  public async isPhoneRegistered(phone: string): Promise<boolean> {
    // 实际实现中会查询数据库
    const normalizedPhone = this.normalizePhone(phone);
    
    // 检查是否有使用记录
    const record = this.smsRecords.get(normalizedPhone);
    return record?.used === true;
  }

  /**
   * 获取短信发送记录
   */
  public getSMSRecord(phone: string): SMSRecord | null {
    return this.smsRecords.get(this.normalizePhone(phone)) || null;
  }

  /**
   * 获取今日发送统计
   */
  public getTodaySendStats(): { total: number; byPhone: Map<string, number> } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0;
    const byPhone = new Map<string, number>();

    for (const record of this.smsRecords.values()) {
      if (record.sentAt >= today) {
        total++;
        byPhone.set(record.phone, (byPhone.get(record.phone) || 0) + 1);
      }
    }

    return { total, byPhone };
  }

  /**
   * 清理过期记录
   */
  public cleanupExpiredRecords(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [phone, record] of this.smsRecords.entries()) {
      // 清理24小时前的记录
      if (record.sentAt.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        this.smsRecords.delete(phone);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 验证手机号格式（带国家代码）
   */
  public isValidPhoneFull(phone: string, countryCode: string = '+86'): boolean {
    const normalized = this.normalizePhone(phone);
    
    // 国家码格式验证
    if (!normalized.startsWith('+')) {
      // 如果没有国家码，添加默认国家码
      return this.isValidPhone(countryCode + normalized);
    }
    
    return this.isValidPhone(normalized);
  }

  /**
   * 获取支持的国家列表
   */
  public getSupportedCountries(): Array<{ code: string; name: string; pattern: string }> {
    return [
      { code: '+86', name: 'China', pattern: '^1[3-9]\\d{9}$' },
      { code: '+1', name: 'United States', pattern: '^\\d{10}$' },
      { code: '+81', name: 'Japan', pattern: '^[789]0\\d{8}$' },
      { code: '+82', name: 'South Korea', pattern: '^10\\d{8}$' },
      { code: '+44', name: 'United Kingdom', pattern: '^7\\d{9}$' },
      { code: '+61', name: 'Australia', pattern: '^4\\d{8}$' },
    ];
  }
}
