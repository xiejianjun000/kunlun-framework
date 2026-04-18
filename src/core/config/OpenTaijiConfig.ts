/**
 * TaijiConfig.ts
 * OpenTaiji配置管理
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

/**
 * 框架配置接口
 */
export interface TaijiConfig {
  /** 框架基础配置 */
  framework: FrameworkConfig;
  
  /** 注册系统配置 */
  registration: RegistrationConfig;
  
  /** 多租户配置 */
  multiTenant: MultiTenantConfig;
  
  /** 存储配置 */
  storage: StorageConfig;
  
  /** 安全配置 */
  security: SecurityConfig;
  
  /** OAuth配置 */
  oauth: OAuthConfig;
}

/**
 * 框架基础配置
 */
export interface FrameworkConfig {
  /** 框架名称 */
  name: string;
  /** 框架版本 */
  version: string;
  /** 环境模式 */
  mode: 'development' | 'production' | 'test';
  /** 日志配置 */
  logging: LoggingConfig;
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 日志输出方式 */
  output: 'console' | 'file' | 'both';
  /** 日志文件路径 */
  logPath?: string;
  /** 日志格式 */
  format?: 'json' | 'text';
}

/**
 * 注册系统配置
 */
export interface RegistrationConfig {
  /** 是否启用注册 */
  enabled: boolean;
  /** 注册方式 */
  channels: ChannelConfig[];
  /** 验证码配置 */
  captcha: CaptchaConfig;
  /** 防刷配置 */
  antiSpam: AntiSpamConfig;
  /** 引导配置 */
  onboarding: OnboardingConfig;
  /** 用户限制 */
  limits: UserLimitsConfig;
}

/**
 * 注册通道配置
 */
export interface ChannelConfig {
  /** 通道类型 */
  type: 'feishu' | 'wechat' | 'email' | 'phone' | 'oauth';
  /** 是否启用 */
  enabled: boolean;
  /** 优先级 */
  priority: number;
  /** 特定配置 */
  config?: Record<string, any>;
}

/**
 * 验证码配置
 */
export interface CaptchaConfig {
  /** 验证码类型 */
  type: 'none' | 'simple' | 'recaptcha' | 'tencent';
  /** 验证码过期时间(秒) */
  expireSeconds: number;
  /** 验证码长度 */
  length: number;
  /** 验证码重试限制 */
  maxRetries: number;
}

/**
 * 防刷配置
 */
export interface AntiSpamConfig {
  /** 是否启用 */
  enabled: boolean;
  /** IP限制 */
  ipLimit: {
    /** 启用/禁用 */
    enabled: boolean;
    /** 限制次数 */
    maxRequests: number;
    /** 时间窗口(秒) */
    windowSeconds: number;
  };
  /** 设备限制 */
  deviceLimit: {
    /** 启用/禁用 */
    enabled: boolean;
    /** 限制次数 */
    maxDevices: number;
  };
  /** 邮箱限制 */
  emailLimit: {
    /** 启用/禁用 */
    enabled: boolean;
    /** 限制次数 */
    maxRegistrations: number;
    /** 时间窗口(天) */
    windowDays: number;
  };
}

/**
 * 引导配置
 */
export interface OnboardingConfig {
  /** 是否启用引导 */
  enabled: boolean;
  /** 引导步骤 */
  steps: OnboardingStepConfig[];
  /** 超时时间(小时) */
  timeoutHours: number;
  /** 是否跳过 */
  allowSkip: boolean;
}

/**
 * 引导步骤配置
 */
export interface OnboardingStepConfig {
  /** 步骤ID */
  id: string;
  /** 步骤类型 */
  type: 'profile' | 'preference' | 'skill' | 'tutorial';
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description?: string;
  /** 是否必填 */
  required: boolean;
  /** 顺序 */
  order: number;
}

/**
 * 用户限制配置
 */
export interface UserLimitsConfig {
  /** 最大用户数(每个租户) */
  maxUsersPerTenant: number;
  /** 最大技能数(每个用户) */
  maxSkillsPerUser: number;
  /** 最大存储空间(MB) */
  maxStorageMB: number;
}

/**
 * 多租户配置
 */
export interface MultiTenantConfig {
  /** 是否启用多租户 */
  enabled: boolean;
  /** 隔离级别 */
  isolationLevel: 'standard' | 'strict';
  /** 默认租户ID */
  defaultTenantId: string;
}

/**
 * 存储配置
 */
export interface StorageConfig {
  /** 存储类型 */
  type: 'local' | 's3' | 'azure' | 'gcs' | 'minio';
  /** 存储路径 */
  path?: string;
  /** S3配置 */
  s3?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  /** JWT配置 */
  jwt: JwtConfig;
  /** 密码策略 */
  password: PasswordPolicy;
  /** 会话配置 */
  session: SessionConfig;
}

/**
 * JWT配置
 */
export interface JwtConfig {
  /** 密钥 */
  secret: string;
  /** 过期时间(秒) */
  expiresIn: number;
  /** 刷新令牌过期时间(秒) */
  refreshExpiresIn: number;
}

/**
 * 密码策略
 */
export interface PasswordPolicy {
  /** 最小长度 */
  minLength: number;
  /** 最大长度 */
  maxLength: number;
  /** 是否需要数字 */
  requireNumber: boolean;
  /** 是否需要小写字母 */
  requireLowercase: boolean;
  /** 是否需要大写字母 */
  requireUppercase: boolean;
  /** 是否需要特殊字符 */
  requireSpecialChar: boolean;
}

/**
 * 会话配置
 */
export interface SessionConfig {
  /** 会话超时时间(秒) */
  timeout: number;
  /** 最大并发会话数 */
  maxConcurrent: number;
}

/**
 * OAuth配置
 */
export interface OAuthConfig {
  /** OAuth提供商列表 */
  providers: OAuthProviderConfig[];
}

/**
 * OAuth提供商配置
 */
export interface OAuthProviderConfig {
  /** 提供商类型 */
  type: 'feishu' | 'wechat' | 'google' | 'github';
  /** 客户端ID */
  clientId: string;
  /** 客户端密钥 */
  clientSecret: string;
  /** 回调URL */
  callbackUrl: string;
  /** 权限范围 */
  scopes: string[];
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: TaijiConfig = {
  framework: {
    name: 'OpenTaiji',
    version: '1.0.0',
    mode: 'development',
    logging: {
      level: 'info',
      output: 'console',
      format: 'json',
    },
  },
  
  registration: {
    enabled: true,
    channels: [
      { type: 'feishu', enabled: true, priority: 1 },
      { type: 'wechat', enabled: true, priority: 2 },
      { type: 'email', enabled: true, priority: 3 },
      { type: 'phone', enabled: true, priority: 4 },
    ],
    captcha: {
      type: 'simple',
      expireSeconds: 300,
      length: 6,
      maxRetries: 3,
    },
    antiSpam: {
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
    },
    onboarding: {
      enabled: true,
      steps: [
        { id: 'profile', type: 'profile', title: '完善个人资料', required: true, order: 1 },
        { id: 'preference', type: 'preference', title: '设置偏好', required: false, order: 2 },
        { id: 'skill', type: 'skill', title: '选择技能', required: false, order: 3 },
        { id: 'tutorial', type: 'tutorial', title: '快速入门', required: false, order: 4 },
      ],
      timeoutHours: 24,
      allowSkip: true,
    },
    limits: {
      maxUsersPerTenant: 1000,
      maxSkillsPerUser: 100,
      maxStorageMB: 1024,
    },
  },
  
  multiTenant: {
    enabled: false,
    isolationLevel: 'standard',
    defaultTenantId: 'default',
  },
  
  storage: {
    type: 'local',
    path: './data',
  },
  
  security: {
    jwt: {
      secret: 'your-secret-key-change-in-production',
      expiresIn: 3600,
      refreshExpiresIn: 604800,
    },
    password: {
      minLength: 8,
      maxLength: 128,
      requireNumber: true,
      requireLowercase: true,
      requireUppercase: true,
      requireSpecialChar: true,
    },
    session: {
      timeout: 1800,
      maxConcurrent: 3,
    },
  },
  
  oauth: {
    providers: [],
  },
};

/**
 * 配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: TaijiConfig;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取配置
   */
  public getConfig(): TaijiConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置
   */
  public get<K extends keyof TaijiConfig>(key: K): TaijiConfig[K] {
    return this.config[key];
  }

  /**
   * 更新配置
   */
  public setConfig(config: Partial<TaijiConfig>): void {
    this.config = this.deepMerge(this.config, config);
  }

  /**
   * 更新注册配置
   */
  public setRegistrationConfig(config: Partial<RegistrationConfig>): void {
    this.config.registration = this.deepMerge(this.config.registration, config);
  }

  /**
   * 加载配置文件
   */
  public async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      const loadedConfig = JSON.parse(content);
      this.setConfig(loadedConfig);
    } catch (error) {
      console.error(`Failed to load config from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 保存配置文件
   */
  public async saveToFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs');
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`Failed to save config to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.deepMerge(
            target[key] as Record<string, any>,
            source[key] as Record<string, any>
          );
        } else {
          result[key] = source[key] as T[Extract<keyof T, string>];
        }
      }
    }
    return result;
  }

  /**
   * 重置为默认配置
   */
  public resetToDefault(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}

/**
 * 便捷的全局配置获取函数
 */
export function getConfig(): TaijiConfig {
  return ConfigManager.getInstance().getConfig();
}

/**
 * 便捷的全局配置获取函数（泛型版本）
 */
export function getConfigValue<K extends keyof TaijiConfig>(key: K): TaijiConfig[K] {
  return ConfigManager.getInstance().get(key);
}
