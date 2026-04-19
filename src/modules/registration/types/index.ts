/**
 * types/index.ts
 * 注册系统类型定义
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

/**
 * 用户信息
 */
export interface User {
  /** 用户ID */
  id: string;
  /** 租户ID */
  tenantId: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 昵称 */
  displayName?: string;
  /** 头像URL */
  avatarUrl?: string;
  /** 用户类型 */
  type: UserType;
  /** 注册渠道 */
  registeredVia: RegistrationChannelType;
  /** OAuth提供商 */
  oauthProvider?: OAuthProviderType;
  /** OAuth用户ID */
  oauthUserId?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 最后登录时间 */
  lastLoginAt?: Date;
  /** 用户状态 */
  status: UserStatus;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 用户类型
 */
export enum UserType {
  /** 普通用户 */
  REGULAR = 'regular',
  /** 管理员 */
  ADMIN = 'admin',
  /** 超级管理员 */
  SUPER_ADMIN = 'super_admin',
}

/**
 * 用户状态
 */
export enum UserStatus {
  /** 待激活 */
  PENDING = 'pending',
  /** 激活 */
  ACTIVE = 'active',
  /** 冻结 */
  FROZEN = 'frozen',
  /** 删除 */
  DELETED = 'deleted',
}

/**
 * 注册渠道类型
 */
export enum RegistrationChannelType {
  /** 飞书 */
  FEISHU = 'feishu',
  /** 微信 */
  WECHAT = 'wechat',
  /** 邮箱 */
  EMAIL = 'email',
  /** 手机号 */
  PHONE = 'phone',
  /** OAuth */
  OAUTH = 'oauth',
}

/**
 * OAuth提供商类型
 */
export enum OAuthProviderType {
  /** 飞书 */
  FEISHU = 'feishu',
  /** 微信 */
  WECHAT = 'wechat',
  /** 谷歌 */
  GOOGLE = 'google',
  /** GitHub */
  GITHUB = 'github',
}

/**
 * 注册请求基础接口
 */
export interface RegistrationRequest {
  /** 租户ID */
  tenantId: string;
  /** 注册渠道 */
  channel: RegistrationChannelType;
  /** 邀请码（可选） */
  inviteCode?: string;
  /** 客户端信息 */
  clientInfo: ClientInfo;
}

/**
 * 邮箱注册请求
 */
export interface EmailRegistrationRequest extends RegistrationRequest {
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 确认密码 */
  confirmPassword: string;
  /** 用户名 */
  username?: string;
  /** 验证码 */
  captcha?: string;
  /** 验证码Token */
  captchaToken?: string;
}

/**
 * 手机号注册请求
 */
export interface PhoneRegistrationRequest extends RegistrationRequest {
  /** 手机号 */
  phone: string;
  /** 验证码 */
  verificationCode: string;
  /** 用户名 */
  username?: string;
}

/**
 * OAuth注册请求
 */
export interface OAuthRegistrationRequest extends RegistrationRequest {
  /** OAuth提供商 */
  provider: OAuthProviderType;
  /** OAuth授权码 */
  code: string;
  /** 回调URL */
  redirectUri: string;
  /** 状态码 */
  state?: string;
}

/**
 * 飞书扫码注册请求
 */
export interface FeishuQRCodeRequest extends RegistrationRequest {
  /** 飞书临时授权码 */
  code: string;
  /** 扫码授权ticket */
  ticket?: string;
}

/**
 * 微信扫码注册请求
 */
export interface WeChatQRCodeRequest extends RegistrationRequest {
  /** 微信授权码 */
  code: string;
  /** 二维码ID */
  qrCodeId: string;
}

/**
 * 客户端信息
 */
export interface ClientInfo {
  /** IP地址 */
  ip?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 设备ID */
  deviceId?: string;
  /** 设备类型 */
  deviceType?: 'web' | 'ios' | 'android' | 'desktop';
  /** 应用版本 */
  appVersion?: string;
}

/**
 * 注册响应
 */
export interface RegistrationResponse {
  /** 是否成功 */
  success: boolean;
  /** 用户信息 */
  user?: User;
  /** 访问令牌 */
  accessToken?: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 过期时间 */
  expiresAt?: Date;
  /** 错误信息 */
  error?: RegistrationError;
  /** 错误详情 */
  errorDetails?: string[];
}

/**
 * 注册错误
 */
export enum RegistrationError {
  /** 未知错误 */
  UNKNOWN = 'unknown',
  /** 注册已禁用 */
  REGISTRATION_DISABLED = 'registration_disabled',
  /** 参数无效 */
  INVALID_PARAMS = 'invalid_params',
  /** 用户已存在 */
  USER_EXISTS = 'user_exists',
  /** 邮箱已注册 */
  EMAIL_EXISTS = 'email_exists',
  /** 手机号已注册 */
  PHONE_EXISTS = 'phone_exists',
  /** 密码不符合要求 */
  PASSWORD_INVALID = 'password_invalid',
  /** 验证码无效 */
  CAPTCHA_INVALID = 'captcha_invalid',
  /** 验证码过期 */
  CAPTCHA_EXPIRED = 'captcha_expired',
  /** 验证码错误 */
  CAPTCHA_MISMATCH = 'captcha_mismatch',
  /** 邀请码无效 */
  INVITE_CODE_INVALID = 'invite_code_invalid',
  /** 邀请码已使用 */
  INVITE_CODE_USED = 'invite_code_used',
  /** 防刷拦截 */
  ANTI_SPAM_BLOCKED = 'anti_spam_blocked',
  /** OAuth授权失败 */
  OAUTH_FAILED = 'oauth_failed',
  /** OAuth取消 */
  OAUTH_CANCELLED = 'oauth_cancelled',
  /** 用户配额已满 */
  QUOTA_EXCEEDED = 'quota_exceeded',
  /** 租户不存在 */
  TENANT_NOT_FOUND = 'tenant_not_found',
}

/**
 * 注册验证规则
 */
export interface ValidationRule {
  /** 规则名称 */
  name: string;
  /** 验证函数 */
  validator: (value: any) => boolean;
  /** 错误消息 */
  message: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过 */
  valid: boolean;
  /** 错误消息列表 */
  errors: string[];
}

/**
 * 注册统计
 */
export interface RegistrationStats {
  /** 总注册数 */
  totalRegistrations: number;
  /** 今日注册数 */
  todayRegistrations: number;
  /** 本周注册数 */
  weekRegistrations: number;
  /** 本月注册数 */
  monthRegistrations: number;
  /** 各渠道注册数 */
  channelStats: Record<RegistrationChannelType, number>;
}

/**
 * 用户配置文件
 */
export interface UserProfile {
  /** 用户ID */
  userId: string;
  /** 昵称 */
  displayName?: string;
  /** 头像URL */
  avatarUrl?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 个人简介 */
  bio?: string;
  /** 位置 */
  location?: string;
  /** 网站 */
  website?: string;
  /** 偏好设置 */
  preferences: UserPreferences;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  /** 语言 */
  language: string;
  /** 时区 */
  timezone: string;
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';
  /** 通知设置 */
  notifications: NotificationSettings;
  /** 隐私设置 */
  privacy: PrivacySettings;
}

/**
 * 通知设置
 */
export interface NotificationSettings {
  /** 邮件通知 */
  email: boolean;
  /** 推送通知 */
  push: boolean;
  /** 短信通知 */
  sms: boolean;
}

/**
 * 隐私设置
 */
export interface PrivacySettings {
  /** 公开个人资料 */
  profilePublic: boolean;
  /** 公开活动 */
  activityPublic: boolean;
  /** 允许搜索 */
  searchable: boolean;
}

/**
 * 引导进度
 */
export interface OnboardingProgress {
  /** 用户ID */
  userId: string;
  /** 当前步骤 */
  currentStep: number;
  /** 完成步骤列表 */
  completedSteps: string[];
  /** 开始时间 */
  startedAt: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 跳过步骤 */
  skippedSteps: string[];
  /** 配置数据 */
  configData: Record<string, any>;
}

/**
 * 引导步骤结果
 */
export interface OnboardingStepResult {
  /** 步骤ID */
  stepId: string;
  /** 是否成功 */
  success: boolean;
  /** 步骤数据 */
  data?: Record<string, any>;
  /** 错误消息 */
  error?: string;
}
