/**
 * RegistrationSystem.ts
 * 注册系统主类
 * 
 * 实现IRegistrationSystem接口，提供完整的用户注册功能
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { ConfigManager, getConfig, RegistrationConfig } from '../../core/config/KunlunConfig';
import {
  User,
  RegistrationChannelType,
  RegistrationRequest,
  RegistrationResponse,
  RegistrationError,
  UserStatus,
  RegistrationStats,
  UserProfile,
  OAuthProviderType,
} from './types';
import { UserRegistry } from './UserRegistry';
import { RegistrationFlow } from './RegistrationFlow';
import { OnboardingManager } from './OnboardingManager';
import { RegistrationValidator } from './security/RegistrationValidator';
import { AntiSpamFilter } from './security/AntiSpamFilter';
import { RegistrationChannel, ChannelContext } from './channels/RegistrationChannel';
import { FeishuChannel } from './channels/FeishuChannel';
import { WeChatChannel } from './channels/WeChatChannel';
import { EmailChannel } from './channels/EmailChannel';
import { PhoneChannel } from './channels/PhoneChannel';
import { OAuthProvider } from './oauth/OAuthProvider';
import { FeishuOAuth } from './oauth/FeishuOAuth';
import { WeChatOAuth } from './oauth/WeChatOAuth';
import { UserInitializer } from './UserInitializer';

/**
 * 注册系统接口
 */
export interface IRegistrationSystem {
  /**
   * 注册新用户
   */
  register(request: RegistrationRequest): Promise<RegistrationResponse>;
  
  /**
   * 激活用户
   */
  activate(userId: string, token: string): Promise<boolean>;
  
  /**
   * 获取用户信息
   */
  getUser(userId: string, tenantId: string): Promise<User | null>;
  
  /**
   * 更新用户信息
   */
  updateUser(userId: string, tenantId: string, profile: Partial<UserProfile>): Promise<User>;
  
  /**
   * 删除用户
   */
  deleteUser(userId: string, tenantId: string): Promise<void>;
  
  /**
   * 获取注册统计
   */
  getStats(tenantId: string): Promise<RegistrationStats>;
}

/**
 * 注册系统事件
 */
export enum RegistrationSystemEvent {
  /** 用户注册前 */
  BEFORE_REGISTER = 'before_register',
  /** 用户注册后 */
  AFTER_REGISTER = 'after_register',
  /** 用户激活前 */
  BEFORE_ACTIVATE = 'before_activate',
  /** 用户激活后 */
  AFTER_ACTIVATE = 'after_activate',
  /** 用户删除前 */
  BEFORE_DELETE = 'before_delete',
  /** 用户删除后 */
  AFTER_DELETE = 'after_delete',
  /** 注册错误 */
  REGISTRATION_ERROR = 'registration_error',
}

/**
 * 注册系统主类
 */
export class RegistrationSystem extends EventEmitter implements IRegistrationSystem {
  private static instance: RegistrationSystem;
  
  /** 用户注册表 */
  private userRegistry: UserRegistry;
  
  /** 注册流程管理 */
  private registrationFlow: RegistrationFlow;
  
  /** 引导管理器 */
  private onboardingManager: OnboardingManager;
  
  /** 注册验证器 */
  private validator: RegistrationValidator;
  
  /** 防刷过滤器 */
  private antiSpamFilter: AntiSpamFilter;
  
  /** 注册通道映射 */
  private channels: Map<RegistrationChannelType, RegistrationChannel>;
  
  /** OAuth提供商映射 */
  private oauthProviders: Map<OAuthProviderType, OAuthProvider>;
  
  /** 用户初始化器 */
  private userInitializer: UserInitializer;
  
  /** 配置 */
  private config: RegistrationConfig;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    super();
    this.config = getConfig().registration;
    
    // 初始化各组件
    this.userRegistry = new UserRegistry();
    this.registrationFlow = new RegistrationFlow(this.userRegistry);
    this.onboardingManager = new OnboardingManager();
    this.validator = new RegistrationValidator(getConfig().security.password);
    this.antiSpamFilter = new AntiSpamFilter(getConfig().registration.antiSpam);
    this.userInitializer = new UserInitializer();
    
    // 初始化注册通道
    this.channels = new Map();
    this.initializeChannels();
    
    // 初始化OAuth提供商
    this.oauthProviders = new Map();
    this.initializeOAuthProviders();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): RegistrationSystem {
    if (!RegistrationSystem.instance) {
      RegistrationSystem.instance = new RegistrationSystem();
    }
    return RegistrationSystem.instance;
  }

  /**
   * 初始化注册通道
   */
  private initializeChannels(): void {
    const channelConfigs = this.config.channels;
    
    for (const channelConfig of channelConfigs) {
      if (!channelConfig.enabled) continue;
      
      let channel: RegistrationChannel;
      
      switch (channelConfig.type) {
        case RegistrationChannelType.FEISHU:
          channel = new FeishuChannel(channelConfig.config);
          break;
        case RegistrationChannelType.WECHAT:
          channel = new WeChatChannel(channelConfig.config);
          break;
        case RegistrationChannelType.EMAIL:
          channel = new EmailChannel(channelConfig.config);
          break;
        case RegistrationChannelType.PHONE:
          channel = new PhoneChannel(channelConfig.config);
          break;
        default:
          continue;
      }
      
      this.channels.set(channelConfig.type, channel);
    }
  }

  /**
   * 初始化OAuth提供商
   */
  private initializeOAuthProviders(): void {
    const oauthConfig = getConfig().oauth;
    
    for (const providerConfig of oauthConfig.providers) {
      let provider: OAuthProvider;
      
      switch (providerConfig.type) {
        case OAuthProviderType.FEISHU:
          provider = new FeishuOAuth(providerConfig);
          break;
        case OAuthProviderType.WECHAT:
          provider = new WeChatOAuth(providerConfig);
          break;
        // 其他提供商可在此扩展
        default:
          continue;
      }
      
      this.oauthProviders.set(providerConfig.type, provider);
    }
  }

  /**
   * 注册新用户
   * 
   * @param request 注册请求
   * @returns 注册响应
   */
  public async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    try {
      // 检查注册是否启用
      if (!this.config.enabled) {
        return this.createErrorResponse(RegistrationError.REGISTRATION_DISABLED);
      }

      // 触发注册前事件
      this.emit(RegistrationSystemEvent.BEFORE_REGISTER, request);

      // 防刷检查
      const spamCheckResult = await this.antiSpamFilter.check(request.clientInfo);
      if (!spamCheckResult.allowed) {
        this.emit(RegistrationSystemEvent.REGISTRATION_ERROR, {
          error: RegistrationError.ANTI_SPAM_BLOCKED,
          reason: spamCheckResult.reason,
        });
        return this.createErrorResponse(RegistrationError.ANTI_SPAM_BLOCKED, [spamCheckResult.reason!]);
      }

      // 获取对应通道的处理器
      const channel = this.channels.get(request.channel);
      if (!channel) {
        return this.createErrorResponse(RegistrationError.UNKNOWN, ['不支持的注册渠道']);
      }

      // 创建通道上下文
      const context: ChannelContext = {
        tenantId: request.tenantId,
        channel: request.channel,
        clientInfo: request.clientInfo,
        validator: this.validator,
        antiSpamFilter: this.antiSpamFilter,
      };

      // 通过通道处理注册
      const channelResult = await channel.handleRegistration(request, context);

      if (!channelResult.success) {
        return channelResult;
      }

      // 创建用户
      const user = await this.createUser(channelResult.userData!);

      // 初始化用户资源
      await this.userInitializer.initialize(user);

      // 创建注册会话
      const session = await this.registrationFlow.createSession(user);

      // 触发注册后事件
      this.emit(RegistrationSystemEvent.AFTER_REGISTER, user);

      // 返回成功响应
      return {
        success: true,
        user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册过程中发生错误';
      this.emit(RegistrationSystemEvent.REGISTRATION_ERROR, { error: RegistrationError.UNKNOWN, reason: errorMessage });
      return this.createErrorResponse(RegistrationError.UNKNOWN, [errorMessage]);
    }
  }

  /**
   * 激活用户
   * 
   * @param userId 用户ID
   * @param token 激活令牌
   * @returns 是否激活成功
   */
  public async activate(userId: string, token: string): Promise<boolean> {
    try {
      this.emit(RegistrationSystemEvent.BEFORE_ACTIVATE, { userId, token });

      const result = await this.registrationFlow.verifyActivationToken(userId, token);

      if (!result.valid) {
        return false;
      }

      const user = await this.userRegistry.getUser(userId);
      if (!user) {
        return false;
      }

      user.status = UserStatus.ACTIVE;
      await this.userRegistry.updateUser(user);

      this.emit(RegistrationSystemEvent.AFTER_ACTIVATE, user);
      return true;

    } catch (error) {
      console.error('Activation error:', error);
      return false;
    }
  }

  /**
   * 获取用户信息
   * 
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 用户信息
   */
  public async getUser(userId: string, tenantId: string): Promise<User | null> {
    return this.userRegistry.getUserByIdAndTenant(userId, tenantId);
  }

  /**
   * 通过邮箱获取用户
   * 
   * @param email 邮箱
   * @param tenantId 租户ID
   * @returns 用户信息
   */
  public async getUserByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.userRegistry.getUserByEmail(email, tenantId);
  }

  /**
   * 通过手机号获取用户
   * 
   * @param phone 手机号
   * @param tenantId 租户ID
   * @returns 用户信息
   */
  public async getUserByPhone(phone: string, tenantId: string): Promise<User | null> {
    return this.userRegistry.getUserByPhone(phone, tenantId);
  }

  /**
   * 更新用户信息
   * 
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @param profile 更新内容
   * @returns 更新后的用户信息
   */
  public async updateUser(userId: string, tenantId: string, profile: Partial<UserProfile>): Promise<User> {
    const user = await this.userRegistry.getUserByIdAndTenant(userId, tenantId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户字段
    if (profile.displayName !== undefined) user.displayName = profile.displayName;
    if (profile.avatarUrl !== undefined) user.avatarUrl = profile.avatarUrl;
    if (profile.bio !== undefined) {
      user.metadata = { ...user.metadata, bio: profile.bio };
    }

    user.updatedAt = new Date();
    
    return this.userRegistry.updateUser(user);
  }

  /**
   * 删除用户
   * 
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  public async deleteUser(userId: string, tenantId: string): Promise<void> {
    this.emit(RegistrationSystemEvent.BEFORE_DELETE, { userId, tenantId });

    const user = await this.userRegistry.getUserByIdAndTenant(userId, tenantId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // 软删除：标记状态为已删除
    user.status = UserStatus.DELETED;
    user.updatedAt = new Date();
    
    await this.userRegistry.updateUser(user);

    this.emit(RegistrationSystemEvent.AFTER_DELETE, user);
  }

  /**
   * 彻底删除用户（硬删除）
   * 
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  public async hardDeleteUser(userId: string, tenantId: string): Promise<void> {
    await this.userRegistry.deleteUser(userId, tenantId);
  }

  /**
   * 获取注册统计
   * 
   * @param tenantId 租户ID
   * @returns 注册统计信息
   */
  public async getStats(tenantId: string): Promise<RegistrationStats> {
    return this.userRegistry.getStats(tenantId);
  }

  /**
   * 获取用户在租户下的所有用户
   * 
   * @param tenantId 租户ID
   * @param options 查询选项
   * @returns 用户列表
   */
  public async listUsers(
    tenantId: string,
    options?: {
      status?: UserStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<User[]> {
    return this.userRegistry.listUsers(tenantId, options);
  }

  /**
   * 创建用户
   * 
   * @param userData 用户数据
   * @returns 创建的用户
   */
  private async createUser(userData: Partial<User>): Promise<User> {
    // 生成用户ID
    const userId = this.generateUserId();
    
    const user: User = {
      id: userId,
      tenantId: userData.tenantId!,
      username: userData.username || userId,
      email: userData.email,
      phone: userData.phone,
      displayName: userData.displayName,
      avatarUrl: userData.avatarUrl,
      type: userData.type || 'regular' as any,
      registeredVia: userData.registeredVia!,
      oauthProvider: userData.oauthProvider,
      oauthUserId: userData.oauthUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: UserStatus.PENDING,
      metadata: userData.metadata || {},
    };

    return this.userRegistry.createUser(user);
  }

  /**
   * 生成用户ID
   */
  private generateUserId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `user_${timestamp}_${randomPart}`;
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(error: RegistrationError, details?: string[]): RegistrationResponse {
    return {
      success: false,
      error,
      errorDetails: details,
    };
  }

  /**
   * 获取注册通道
   * 
   * @param channelType 通道类型
   * @returns 注册通道
   */
  public getChannel(channelType: RegistrationChannelType): RegistrationChannel | undefined {
    return this.channels.get(channelType);
  }

  /**
   * 获取OAuth提供商
   * 
   * @param providerType 提供商类型
   * @returns OAuth提供商
   */
  public getOAuthProvider(providerType: OAuthProviderType): OAuthProvider | undefined {
    return this.oauthProviders.get(providerType);
  }

  /**
   * 添加注册通道
   * 
   * @param channelType 通道类型
   * @param channel 注册通道
   */
  public addChannel(channelType: RegistrationChannelType, channel: RegistrationChannel): void {
    this.channels.set(channelType, channel);
  }

  /**
   * 添加OAuth提供商
   * 
   * @param providerType 提供商类型
   * @param provider OAuth提供商
   */
  public addOAuthProvider(providerType: OAuthProviderType, provider: OAuthProvider): void {
    this.oauthProviders.set(providerType, provider);
  }

  /**
   * 开始用户引导
   * 
   * @param userId 用户ID
   * @returns 引导进度
   */
  public async startOnboarding(userId: string) {
    return this.onboardingManager.startOnboarding(userId);
  }

  /**
   * 完成引导步骤
   * 
   * @param userId 用户ID
   * @param stepId 步骤ID
   * @param data 步骤数据
   * @returns 步骤结果
   */
  public async completeOnboardingStep(userId: string, stepId: string, data: Record<string, any>) {
    return this.onboardingManager.completeStep(userId, stepId, data);
  }

  /**
   * 跳过引导步骤
   * 
   * @param userId 用户ID
   * @param stepId 步骤ID
   */
  public async skipOnboardingStep(userId: string, stepId: string) {
    return this.onboardingManager.skipStep(userId, stepId);
  }

  /**
   * 获取用户引导进度
   * 
   * @param userId 用户ID
   * @returns 引导进度
   */
  public async getOnboardingProgress(userId: string) {
    return this.onboardingManager.getProgress(userId);
  }

  /**
   * 更新配置
   * 
   * @param config 新配置
   */
  public updateConfig(config: Partial<RegistrationConfig>): void {
    this.config = { ...this.config, ...config };
    ConfigManager.getInstance().setRegistrationConfig(this.config);
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.removeAllListeners();
    RegistrationSystem.instance = undefined as any;
  }
}

// 导出便捷访问方法
export const getRegistrationSystem = (): RegistrationSystem => {
  return RegistrationSystem.getInstance();
};
