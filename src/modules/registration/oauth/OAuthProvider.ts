/**
 * OAuthProvider.ts
 * OAuth提供商抽象基类
 * 
 * 定义OAuth提供商统一接口
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { OAuthProviderType } from '../types';

/**
 * OAuth配置
 */
export interface OAuthProviderConfig {
  /** 提供商类型 */
  type: OAuthProviderType;
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
 * OAuth令牌信息
 */
export interface OAuthTokenInfo {
  /** 访问令牌 */
  accessToken: string;
  /** 令牌类型 */
  tokenType: string;
  /** 过期时间 */
  expiresIn: number;
  /** 刷新令牌 */
  refreshToken?: string;
  /** 范围 */
  scope?: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * OAuth用户信息
 */
export interface OAuthUserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username?: string;
  /** 显示名称 */
  displayName?: string;
  /** 邮箱 */
  email?: string;
  /** 邮箱已验证 */
  emailVerified?: boolean;
  /** 头像URL */
  avatarUrl?: string;
  /** 原始数据 */
  rawData?: Record<string, any>;
}

/**
 * OAuth授权URL参数
 */
export interface OAuthAuthorizationUrlParams {
  /** 客户端ID */
  clientId: string;
  /** 回调URL */
  redirectUri: string;
  /** 范围 */
  scope: string[];
  /** 状态参数 */
  state?: string;
  /** 响应类型 */
  responseType?: string;
  /** 访问类型 */
  accessType?: string;
}

/**
 * OAuth回调参数
 */
export interface OAuthCallbackParams {
  /** 授权码 */
  code?: string;
  /** 状态参数 */
  state?: string;
  /** 错误码 */
  error?: string;
  /** 错误描述 */
  errorDescription?: string;
}

/**
 * OAuth提供商接口
 */
export interface IOAuthProvider {
  /**
   * 获取提供商类型
   */
  getProviderType(): OAuthProviderType;

  /**
   * 获取授权URL
   */
  getAuthorizationUrl(state?: string): Promise<string>;

  /**
   * 处理回调
   */
  handleCallback(params: OAuthCallbackParams): Promise<{
    success: boolean;
    tokenInfo?: OAuthTokenInfo;
    userInfo?: OAuthUserInfo;
    error?: string;
  }>;

  /**
   * 获取用户信息
   */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo | null>;

  /**
   * 刷新令牌
   */
  refreshToken(refreshToken: string): Promise<OAuthTokenInfo | null>;

  /**
   * 撤销令牌
   */
  revokeToken(token: string): Promise<boolean>;
}

/**
 * OAuth提供商抽象基类
 */
export abstract class OAuthProvider implements IOAuthProvider {
  /** OAuth配置 */
  protected config: OAuthProviderConfig;

  /** 状态参数存储 */
  protected stateStore: Map<string, { createdAt: Date; redirectUri?: string }>;

  /**
   * 构造函数
   */
  constructor(config: OAuthProviderConfig) {
    this.config = config;
    this.stateStore = new Map();
  }

  /**
   * 获取提供商类型
   */
  public abstract getProviderType(): OAuthProviderType;

  /**
   * 获取授权URL
   */
  public async getAuthorizationUrl(state?: string): Promise<string> {
    // 生成或使用提供的状态参数
    const authState = state || this.generateState();
    
    // 存储状态参数
    this.stateStore.set(authState, {
      createdAt: new Date(),
      redirectUri: this.config.callbackUrl,
    });

    // 生成授权URL
    const params = this.buildAuthorizationUrlParams(authState);
    return this.buildAuthorizationUrl(params);
  }

  /**
   * 处理回调
   */
  public async handleCallback(params: OAuthCallbackParams): Promise<{
    success: boolean;
    tokenInfo?: OAuthTokenInfo;
    userInfo?: OAuthUserInfo;
    error?: string;
  }> {
    // 检查错误
    if (params.error) {
      return {
        success: false,
        error: params.errorDescription || params.error,
      };
    }

    // 验证状态参数
    if (!params.state || !this.validateState(params.state)) {
      return {
        success: false,
        error: 'Invalid state parameter',
      };
    }

    // 验证授权码
    if (!params.code) {
      return {
        success: false,
        error: 'Missing authorization code',
      };
    }

    try {
      // 交换授权码获取令牌
      const tokenInfo = await this.exchangeCodeForToken(params.code);
      if (!tokenInfo) {
        return {
          success: false,
          error: 'Failed to exchange code for token',
        };
      }

      // 获取用户信息
      const userInfo = await this.getUserInfo(tokenInfo.accessToken);
      if (!userInfo) {
        return {
          success: false,
          error: 'Failed to get user info',
        };
      }

      // 清理状态
      this.stateStore.delete(params.state);

      return {
        success: true,
        tokenInfo,
        userInfo,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取用户信息
   */
  public abstract getUserInfo(accessToken: string): Promise<OAuthUserInfo | null>;

  /**
   * 刷新令牌
   */
  public async refreshToken(refreshToken: string): Promise<OAuthTokenInfo | null> {
    // 子类实现
    return null;
  }

  /**
   * 撤销令牌
   */
  public async revokeToken(token: string): Promise<boolean> {
    // 子类实现
    return true;
  }

  /**
   * 生成状态参数
   */
  protected generateState(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }

  /**
   * 验证状态参数
   */
  protected validateState(state: string): boolean {
    const stateInfo = this.stateStore.get(state);
    
    if (!stateInfo) {
      return false;
    }

    // 检查是否过期（10分钟）
    const expiresAt = new Date(stateInfo.createdAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiresAt) {
      this.stateStore.delete(state);
      return false;
    }

    return true;
  }

  /**
   * 构建授权URL参数
   */
  protected abstract buildAuthorizationUrlParams(state: string): OAuthAuthorizationUrlParams;

  /**
   * 构建授权URL
   */
  protected abstract buildAuthorizationUrl(params: OAuthAuthorizationUrlParams): string;

  /**
   * 交换授权码获取令牌
   */
  protected abstract exchangeCodeForToken(code: string): Promise<OAuthTokenInfo | null>;

  /**
   * 创建错误结果
   */
  protected createErrorResult(error: string): {
    success: boolean;
    error: string;
  } {
    return { success: false, error };
  }

  /**
   * 创建成功结果
   */
  protected createSuccessResult(
    tokenInfo: OAuthTokenInfo,
    userInfo: OAuthUserInfo
  ): {
    success: boolean;
    tokenInfo: OAuthTokenInfo;
    userInfo: OAuthUserInfo;
  } {
    return { success: true, tokenInfo, userInfo };
  }
}
