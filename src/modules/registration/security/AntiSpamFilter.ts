/**
 * AntiSpamFilter.ts
 * 防刷机制过滤器
 * 
 * 防止机器人和恶意注册行为
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { AntiSpamConfig } from '../../../core/config/OpenTaijiConfig';
import { ClientInfo } from '../types';

/**
 * 检查结果
 */
export interface SpamCheckResult {
  /** 是否允许 */
  allowed: boolean;
  /** 原因 */
  reason?: string;
  /** 风险等级 */
  riskLevel?: 'low' | 'medium' | 'high';
  /** 封禁时长（秒） */
  banDuration?: number;
}

/**
 * IP记录
 */
interface IPRecord {
  /** IP地址 */
  ip: string;
  /** 请求次数 */
  requestCount: number;
  /** 首次请求时间 */
  firstRequestAt: Date;
  /** 最后请求时间 */
  lastRequestAt: Date;
  /** 封禁结束时间 */
  bannedUntil?: Date;
}

/**
 * 设备记录
 */
interface DeviceRecord {
  /** 设备ID */
  deviceId: string;
  /** IP地址列表 */
  ips: Set<string>;
  /** 注册次数 */
  registrationCount: number;
  /** 首次注册时间 */
  firstRegistrationAt: Date;
  /** 最后注册时间 */
  lastRegistrationAt: Date;
}

/**
 * 邮箱记录
 */
interface EmailRecord {
  /** 邮箱 */
  email: string;
  /** 注册次数 */
  registrationCount: number;
  /** 首次注册时间 */
  firstRegistrationAt: Date;
  /** 最后注册时间 */
  lastRegistrationAt: Date;
}

/**
 * 防刷过滤器
 */
export class AntiSpamFilter {
  /** 防刷配置 */
  private config: AntiSpamConfig;
  
  /** IP记录 */
  private ipRecords: Map<string, IPRecord>;
  
  /** 设备记录 */
  private deviceRecords: Map<string, DeviceRecord>;
  
  /** 邮箱记录 */
  private emailRecords: Map<string, EmailRecord>;

  /** 黑名单 */
  private blacklist: Set<string>;

  /**
   * 构造函数
   */
  constructor(config?: AntiSpamConfig) {
    this.config = config || {
      enabled: true,
      ipLimit: {
        enabled: true,
        maxRequests: 10,
        windowSeconds: 3600,
      },
      deviceLimit: {
        enabled: true,
        maxDevices: 3,
      },
      emailLimit: {
        enabled: true,
        maxRegistrations: 5,
        windowDays: 7,
      },
    };

    this.ipRecords = new Map();
    this.deviceRecords = new Map();
    this.emailRecords = new Map();
    this.blacklist = new Set();
  }

  /**
   * 执行防刷检查
   */
  public async check(clientInfo: ClientInfo): Promise<SpamCheckResult> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const ip = clientInfo.ip || 'unknown';
    const deviceId = clientInfo.deviceId;
    const userAgent = clientInfo.userAgent;

    // 1. 检查黑名单
    if (this.isBlacklisted(ip)) {
      return {
        allowed: false,
        reason: 'IP地址已被列入黑名单',
        riskLevel: 'high',
        banDuration: 86400, // 24小时
      };
    }

    // 2. 检查User-Agent有效性
    const uaCheck = this.checkUserAgent(userAgent);
    if (!uaCheck.allowed) {
      return uaCheck;
    }

    // 3. IP限制检查
    if (this.config.ipLimit.enabled) {
      const ipCheck = this.checkIpLimit(ip);
      if (!ipCheck.allowed) {
        return ipCheck;
      }
    }

    // 4. 设备限制检查
    if (this.config.deviceLimit.enabled && deviceId) {
      const deviceCheck = this.checkDeviceLimit(deviceId, ip);
      if (!deviceCheck.allowed) {
        return deviceCheck;
      }
    }

    return { allowed: true, riskLevel: 'low' };
  }

  /**
   * 注册后检查（用于更新记录）
   */
  public async afterRegistration(
    clientInfo: ClientInfo,
    contact?: { email?: string; phone?: string }
  ): Promise<void> {
    const ip = clientInfo.ip || 'unknown';
    const deviceId = clientInfo.deviceId;

    // 更新IP记录
    this.updateIpRecord(ip);

    // 更新设备记录
    if (deviceId) {
      this.updateDeviceRecord(deviceId, ip);
    }

    // 更新邮箱/手机记录
    if (contact?.email) {
      this.updateEmailRecord(contact.email);
    }
    if (contact?.phone) {
      this.updateEmailRecord(contact.phone); // 手机号也用同样的记录
    }
  }

  /**
   * 检查User-Agent
   */
  private checkUserAgent(userAgent?: string): SpamCheckResult {
    if (!userAgent) {
      return {
        allowed: false,
        reason: '缺少User-Agent',
        riskLevel: 'medium',
      };
    }

    // 检查常见的无效User-Agent
    const invalidPatterns = [
      /^$/,                           // 空字符串
      /^Mozilla\/5\.0$/,              // 太简单
      /curl/i,                       // curl
      /python-requests/i,            // Python requests
      /wget/i,                       // wget
      /httpie/i,                     // HTTPie
      /PostmanRuntime/i,             // Postman (可用于测试)
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(userAgent)) {
        return {
          allowed: false,
          reason: '无效的User-Agent',
          riskLevel: 'high',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * IP限制检查
   */
  private checkIpLimit(ip: string): SpamCheckResult {
    const record = this.ipRecords.get(ip);
    
    if (!record) {
      return { allowed: true };
    }

    // 检查是否被封禁
    if (record.bannedUntil && new Date() < record.bannedUntil) {
      const remainingSeconds = Math.ceil(
        (record.bannedUntil.getTime() - Date.now()) / 1000
      );
      return {
        allowed: false,
        reason: `IP已被临时封禁，请${remainingSeconds}秒后重试`,
        riskLevel: 'high',
        banDuration: remainingSeconds,
      };
    }

    // 检查频率
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.config.ipLimit.windowSeconds * 1000
    );

    // 如果请求都在时间窗口内
    if (record.firstRequestAt >= windowStart) {
      if (record.requestCount >= this.config.ipLimit.maxRequests) {
        // 封禁IP
        record.bannedUntil = new Date(now.getTime() + 300 * 1000); // 封禁5分钟
        
        return {
          allowed: false,
          reason: '请求过于频繁，IP已被临时封禁',
          riskLevel: 'high',
          banDuration: 300,
        };
      }
    } else {
      // 重置计数器
      record.requestCount = 1;
      record.firstRequestAt = now;
    }

    record.lastRequestAt = now;

    // 风险评估
    const usageRatio = record.requestCount / this.config.ipLimit.maxRequests;
    if (usageRatio > 0.7) {
      return {
        allowed: true,
        reason: 'IP使用频率较高',
        riskLevel: 'medium',
      };
    }

    return { allowed: true };
  }

  /**
   * 设备限制检查
   */
  private checkDeviceLimit(deviceId: string, ip: string): SpamCheckResult {
    let record = this.deviceRecords.get(deviceId);

    if (!record) {
      record = {
        deviceId,
        ips: new Set([ip]),
        registrationCount: 0,
        firstRegistrationAt: new Date(),
        lastRegistrationAt: new Date(),
      };
      this.deviceRecords.set(deviceId, record);
      return { allowed: true };
    }

    // 记录新IP
    record.ips.add(ip);

    // 检查设备关联的IP数量
    if (record.ips.size > this.config.deviceLimit.maxDevices) {
      return {
        allowed: false,
        reason: '同一设备关联了过多IP地址',
        riskLevel: 'high',
      };
    }

    return { allowed: true };
  }

  /**
   * 邮箱/手机限制检查
   */
  private checkEmailLimit(email: string): SpamCheckResult {
    const record = this.emailRecords.get(email.toLowerCase());

    if (!record) {
      return { allowed: true };
    }

    const now = new Date();
    const windowStart = new Date(
      now.getTime() - this.config.emailLimit.windowDays * 24 * 60 * 60 * 1000
    );

    if (record.firstRegistrationAt >= windowStart) {
      if (record.registrationCount >= this.config.emailLimit.maxRegistrations) {
        return {
          allowed: false,
          reason: '该邮箱注册过于频繁',
          riskLevel: 'medium',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 更新IP记录
   */
  private updateIpRecord(ip: string): void {
    let record = this.ipRecords.get(ip);

    if (!record) {
      record = {
        ip,
        requestCount: 1,
        firstRequestAt: new Date(),
        lastRequestAt: new Date(),
      };
    } else {
      record.requestCount++;
      record.lastRequestAt = new Date();
    }

    this.ipRecords.set(ip, record);
  }

  /**
   * 更新设备记录
   */
  private updateDeviceRecord(deviceId: string, ip: string): void {
    let record = this.deviceRecords.get(deviceId);

    if (!record) {
      record = {
        deviceId,
        ips: new Set([ip]),
        registrationCount: 1,
        firstRegistrationAt: new Date(),
        lastRegistrationAt: new Date(),
      };
    } else {
      record.registrationCount++;
      record.lastRegistrationAt = new Date();
      record.ips.add(ip);
    }

    this.deviceRecords.set(deviceId, record);
  }

  /**
   * 更新邮箱记录
   */
  private updateEmailRecord(email: string): void {
    const normalizedEmail = email.toLowerCase();
    let record = this.emailRecords.get(normalizedEmail);

    if (!record) {
      record = {
        email: normalizedEmail,
        registrationCount: 1,
        firstRegistrationAt: new Date(),
        lastRegistrationAt: new Date(),
      };
    } else {
      record.registrationCount++;
      record.lastRegistrationAt = new Date();
    }

    this.emailRecords.set(normalizedEmail, record);
  }

  /**
   * 检查是否在黑名单中
   */
  public isBlacklisted(ip: string): boolean {
    return this.blacklist.has(ip);
  }

  /**
   * 添加到黑名单
   */
  public addToBlacklist(ip: string): void {
    this.blacklist.add(ip);
  }

  /**
   * 从黑名单移除
   */
  public removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }

  /**
   * 清除IP封禁
   */
  public unbanIp(ip: string): void {
    const record = this.ipRecords.get(ip);
    if (record) {
      record.bannedUntil = undefined;
    }
  }

  /**
   * 获取IP记录
   */
  public getIpRecord(ip: string): IPRecord | null {
    return this.ipRecords.get(ip) || null;
  }

  /**
   * 获取设备记录
   */
  public getDeviceRecord(deviceId: string): DeviceRecord | null {
    return this.deviceRecords.get(deviceId) || null;
  }

  /**
   * 获取邮箱记录
   */
  public getEmailRecord(email: string): EmailRecord | null {
    return this.emailRecords.get(email.toLowerCase()) || null;
  }

  /**
   * 清理过期记录
   */
  public cleanup(): {
    cleanedIpRecords: number;
    cleanedDeviceRecords: number;
    cleanedEmailRecords: number;
  } {
    const now = new Date();
    
    // 清理过期的IP记录（24小时）
    let cleanedIpRecords = 0;
    for (const [ip, record] of this.ipRecords.entries()) {
      if (record.lastRequestAt.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        this.ipRecords.delete(ip);
        cleanedIpRecords++;
      }
    }

    // 清理过期的设备记录（30天无活动）
    let cleanedDeviceRecords = 0;
    for (const [deviceId, record] of this.deviceRecords.entries()) {
      if (record.lastRegistrationAt.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
        this.deviceRecords.delete(deviceId);
        cleanedDeviceRecords++;
      }
    }

    // 清理过期的邮箱记录（30天）
    let cleanedEmailRecords = 0;
    for (const [email, record] of this.emailRecords.entries()) {
      if (record.lastRegistrationAt.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
        this.emailRecords.delete(email);
        cleanedEmailRecords++;
      }
    }

    return { cleanedIpRecords, cleanedDeviceRecords, cleanedEmailRecords };
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    totalIpRecords: number;
    bannedIps: number;
    totalDeviceRecords: number;
    totalEmailRecords: number;
    blacklistSize: number;
  } {
    let bannedIps = 0;
    for (const record of this.ipRecords.values()) {
      if (record.bannedUntil && new Date() < record.bannedUntil) {
        bannedIps++;
      }
    }

    return {
      totalIpRecords: this.ipRecords.size,
      bannedIps,
      totalDeviceRecords: this.deviceRecords.size,
      totalEmailRecords: this.emailRecords.size,
      blacklistSize: this.blacklist.size,
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<AntiSpamConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  public getConfig(): AntiSpamConfig {
    return { ...this.config };
  }

  /**
   * 重置所有记录
   */
  public reset(): void {
    this.ipRecords.clear();
    this.deviceRecords.clear();
    this.emailRecords.clear();
    this.blacklist.clear();
  }
}
