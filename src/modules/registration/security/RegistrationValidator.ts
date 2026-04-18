/**
 * RegistrationValidator.ts
 * 注册信息验证器
 * 
 * 负责验证注册表单数据的合法性
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { PasswordPolicy } from '../../../core/config/OpenTaijiConfig';
import { ValidationResult } from '../types';

// Re-export ValidationResult for convenience
export { ValidationResult };

/**
 * 用户名验证规则
 */
export interface UsernameValidationRule {
  /** 最小长度 */
  minLength: number;
  /** 最大长度 */
  maxLength: number;
  /** 允许的字符正则 */
  allowedPattern?: RegExp;
  /** 禁止的字符正则 */
  forbiddenPattern?: RegExp;
  /** 保留的用户名 */
  reservedUsernames?: string[];
}

/**
 * 默认用户名验证规则
 */
const DEFAULT_USERNAME_RULES: UsernameValidationRule = {
  minLength: 3,
  maxLength: 32,
  allowedPattern: /^[a-zA-Z0-9_-]+$/,
  reservedUsernames: [
    'admin', 'root', 'system', 'administrator',
    'super', 'superuser', 'test', 'testuser',
    'Taiji', 'framework', 'api', 'support',
  ],
};

/**
 * 注册信息验证器
 */
export class RegistrationValidator {
  /** 密码策略 */
  private passwordPolicy: PasswordPolicy;
  
  /** 用户名验证规则 */
  private usernameRules: UsernameValidationRule;

  /**
   * 构造函数
   */
  constructor(
    passwordPolicy?: PasswordPolicy,
    usernameRules?: UsernameValidationRule
  ) {
    this.passwordPolicy = passwordPolicy || {
      minLength: 8,
      maxLength: 128,
      requireNumber: true,
      requireLowercase: true,
      requireUppercase: true,
      requireSpecialChar: true,
    };
    this.usernameRules = { ...DEFAULT_USERNAME_RULES, ...usernameRules };
  }

  /**
   * 验证密码
   */
  public validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    // 检查长度
    if (password.length < this.passwordPolicy.minLength) {
      errors.push(`密码长度至少${this.passwordPolicy.minLength}位`);
    }

    if (password.length > this.passwordPolicy.maxLength) {
      errors.push(`密码长度不能超过${this.passwordPolicy.maxLength}位`);
    }

    // 检查是否包含数字
    if (this.passwordPolicy.requireNumber && !/\d/.test(password)) {
      errors.push('密码必须包含数字');
    }

    // 检查是否包含小写字母
    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母');
    }

    // 检查是否包含大写字母
    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母');
    }

    // 检查是否包含特殊字符
    if (this.passwordPolicy.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('密码必须包含特殊字符');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证用户名
   */
  public validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username) {
      errors.push('用户名不能为空');
      return { valid: false, errors };
    }

    // 检查长度
    if (username.length < this.usernameRules.minLength) {
      errors.push(`用户名长度至少${this.usernameRules.minLength}位`);
    }

    if (username.length > this.usernameRules.maxLength) {
      errors.push(`用户名长度不能超过${this.usernameRules.maxLength}位`);
    }

    // 检查允许的字符
    if (this.usernameRules.allowedPattern && !this.usernameRules.allowedPattern.test(username)) {
      errors.push('用户名只能包含字母、数字、下划线和短横线');
    }

    // 检查禁止的字符
    if (this.usernameRules.forbiddenPattern && this.usernameRules.forbiddenPattern.test(username)) {
      errors.push('用户名包含非法字符');
    }

    // 检查保留的用户名
    if (
      this.usernameRules.reservedUsernames &&
      this.usernameRules.reservedUsernames.includes(username.toLowerCase())
    ) {
      errors.push('该用户名已被保留');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证邮箱
   */
  public validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('邮箱不能为空');
      return { valid: false, errors };
    }

    // 基本的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('邮箱格式不正确');
    }

    // 检查长度
    if (email.length > 254) {
      errors.push('邮箱地址过长');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证手机号
   */
  public validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone) {
      errors.push('手机号不能为空');
      return { valid: false, errors };
    }

    // 规范化手机号（移除空格和短横线）
    const normalizedPhone = phone.replace(/[\s\-]/g, '');

    // 支持国际格式
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      errors.push('手机号格式不正确');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证邮箱域名
   */
  public validateEmailDomain(email: string, allowedDomains?: string[]): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('邮箱不能为空');
      return { valid: false, errors };
    }

    if (!allowedDomains || allowedDomains.length === 0) {
      return { valid: true, errors: [] };
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !allowedDomains.map(d => d.toLowerCase()).includes(domain)) {
      errors.push(`只允许使用以下邮箱域名: ${allowedDomains.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证密码强度
   */
  public checkPasswordStrength(password: string): {
    score: number;
    level: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // 长度评分
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // 字符类型评分
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    // 额外字符类型
    if (/[~`]/.test(password)) score += 1;
    if (/["']/.test(password)) score += 1;

    // 计算等级
    let level: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
    if (score <= 2) level = 'weak';
    else if (score <= 4) level = 'fair';
    else if (score <= 6) level = 'good';
    else if (score <= 8) level = 'strong';
    else level = 'very_strong';

    // 生成建议
    if (password.length < 12) suggestions.push('使用12位或更长的密码');
    if (!/[a-z]/.test(password)) suggestions.push('添加小写字母');
    if (!/[A-Z]/.test(password)) suggestions.push('添加大写字母');
    if (!/[0-9]/.test(password)) suggestions.push('添加数字');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) suggestions.push('添加特殊字符');

    return { score, level, suggestions };
  }

  /**
   * 验证邀请码
   */
  public validateInviteCode(inviteCode: string): ValidationResult {
    const errors: string[] = [];

    if (!inviteCode) {
      return { valid: true, errors: [] }; // 邀请码是可选的
    }

    // 邀请码格式：8-16位字母数字组合
    const inviteCodeRegex = /^[a-zA-Z0-9]{8,16}$/;
    if (!inviteCodeRegex.test(inviteCode)) {
      errors.push('邀请码格式不正确');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证完整的注册信息
   */
  public validateRegistration(params: {
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    inviteCode?: string;
  }): ValidationResult {
    const allErrors: string[] = [];

    // 验证邮箱
    if (params.email) {
      const emailResult = this.validateEmail(params.email);
      allErrors.push(...emailResult.errors);
    }

    // 验证手机号
    if (params.phone) {
      const phoneResult = this.validatePhone(params.phone);
      allErrors.push(...phoneResult.errors);
    }

    // 验证用户名
    if (params.username) {
      const usernameResult = this.validateUsername(params.username);
      allErrors.push(...usernameResult.errors);
    }

    // 验证密码
    if (params.password) {
      const passwordResult = this.validatePassword(params.password);
      allErrors.push(...passwordResult.errors);
    }

    // 验证密码确认
    if (params.password && params.confirmPassword && params.password !== params.confirmPassword) {
      allErrors.push('两次输入的密码不一致');
    }

    // 验证邀请码
    if (params.inviteCode) {
      const inviteResult = this.validateInviteCode(params.inviteCode);
      allErrors.push(...inviteResult.errors);
    }

    // 至少需要邮箱或手机号之一
    if (!params.email && !params.phone) {
      allErrors.push('必须提供邮箱或手机号');
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * 检查密码是否泄露
   */
  public async checkPasswordLeaked(password: string): Promise<boolean> {
    // 实际实现中可以调用 Have I Been Pwned API
    // https://haveibeenpwned.com/API/v3#PwnedPasswords
    
    // 这里简化为本地检查
    const commonPasswords = [
      '123456', 'password', '12345678', 'qwerty', '123456789',
      '12345', '1234', '111111', '1234567', 'dragon',
      '123123', 'baseball', 'iloveyou', 'trustno1', 'sunshine',
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 获取密码策略
   */
  public getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy };
  }

  /**
   * 更新密码策略
   */
  public updatePasswordPolicy(policy: Partial<PasswordPolicy>): void {
    this.passwordPolicy = { ...this.passwordPolicy, ...policy };
  }

  /**
   * 获取用户名验证规则
   */
  public getUsernameRules(): UsernameValidationRule {
    return { ...this.usernameRules };
  }

  /**
   * 添加保留用户名
   */
  public addReservedUsernames(usernames: string[]): void {
    if (!this.usernameRules.reservedUsernames) {
      this.usernameRules.reservedUsernames = [];
    }
    this.usernameRules.reservedUsernames.push(...usernames.map(u => u.toLowerCase()));
  }

  /**
   * 移除保留用户名
   */
  public removeReservedUsernames(usernames: string[]): void {
    if (!this.usernameRules.reservedUsernames) {
      return;
    }
    this.usernameRules.reservedUsernames = this.usernameRules.reservedUsernames.filter(
      u => !usernames.map(us => us.toLowerCase()).includes(u)
    );
  }
}
