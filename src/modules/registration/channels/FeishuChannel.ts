/**
 * FeishuChannel.ts
 * 飞书扫码注册通道
 * 
 * 实现飞书扫码登录/注册功能
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
  FeishuQRCodeRequest,
  OAuthProviderType,
  User,
  UserStatus,
} from '../types';

/**
 * 飞书应用配置
 */
export interface FeishuAppConfig {
  /** 飞书应用App ID */
  appId: string;
  /** 飞书应用App Secret */
  appSecret: string;
  /** 回调URL */
  callbackUrl: string;
  /** 扫码登录场景ID */
  sceneUuid?: string;
}

/**
 * 飞书授权信息
 */
interface FeishuAuthInfo {
  /** 访问令牌 */
  accessToken: string;
  /** 用户ID */
  userId: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间 */
  expiresAt: Date;
}

/**
 * 飞书用户信息
 */
interface FeishuUserInfo {
  /** 用户ID */
  unionId: string;
  /** 飞书用户ID */
  openId: string;
  /** 名称 */
  name: string;
  /** 头像URL */
  avatarUrl?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
}

/**
 * 飞书扫码注册通道
 */
export class FeishuChannel extends RegistrationChannel {
  /** 飞书配置 */
  private feishuConfig: FeishuAppConfig;

  /** 临时授权码存储 */
  private tempCodeStore: Map<string, { code: string; createdAt: Date }>;

  /**
   * 构造函数
   * 
   * @param config 飞书配置
   */
  constructor(config?: Partial<FeishuAppConfig> & Partial<ChannelConfig>) {
    super(config);
    
    this.feishuConfig = {
      appId: config?.appId || process.env.FEISHU_APP_ID || '',
      appSecret: config?.appSecret || process.env.FEISHU_APP_SECRET || '',
      callbackUrl: config?.callbackUrl || process.env.FEISHU_CALLBACK_URL || '',
      sceneUuid: config?.sceneUuid,
    };
    
    this.tempCodeStore = new Map();
  }

  /**
   * 获取通道类型
   */
  public getChannelType(): RegistrationChannelType {
    return RegistrationChannelType.FEISHU;
  }

  /**
   * 处理飞书扫码注册
   */
  public async handleRegistration(
    request: any,
    context: ChannelContext
  ): Promise<ChannelResult> {
    try {
      // 获取临时授权码
      const qrCodeRequest = request as FeishuQRCodeRequest;
      const { code, ticket } = qrCodeRequest;

      if (!code) {
        return this.createErrorResult(
          RegistrationError.INVALID_PARAMS,
          ['Missing authorization code']
        );
      }

      // 验证临时授权码
      const authInfo = await this.exchangeCodeForToken(code);
      if (!authInfo) {
        return this.createErrorResult(
          RegistrationError.OAUTH_FAILED,
          ['Failed to exchange code for token']
        );
      }

      // 获取飞书用户信息
      const feishuUserInfo = await this.getUserInfo(authInfo.accessToken);
      if (!feishuUserInfo) {
        return this.createErrorResult(
          RegistrationError.OAUTH_FAILED,
          ['Failed to get user info from Feishu']
        );
      }

      // 构建用户数据
      const userData: Partial<User> = {
        tenantId: context.tenantId,
        username: feishuUserInfo.unionId,
        displayName: feishuUserInfo.name,
        avatarUrl: feishuUserInfo.avatarUrl,
        email: feishuUserInfo.email,
        phone: feishuUserInfo.phone,
        registeredVia: RegistrationChannelType.FEISHU,
        type: 'regular' as any,
        status: UserStatus.ACTIVE, // 飞书授权自动激活
        oauthProvider: OAuthProviderType.FEISHU,
        oauthUserId: feishuUserInfo.unionId,
        metadata: {
          feishuOpenId: feishuUserInfo.openId,
          feishuUnionId: feishuUserInfo.unionId,
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
   * 发送验证码（飞书通道暂不支持）
   */
  public async sendVerificationCode(contact: string, tenantId: string): Promise<CaptchaInfo> {
    // 飞书通道不使用短信验证码，使用OAuth
    throw new Error('Feishu channel does not support SMS verification');
  }

  /**
   * 验证验证码（飞书通道暂不支持）
   */
  public async verifyCode(contact: string, code: string, token: string): Promise<boolean> {
    throw new Error('Feishu channel does not support SMS verification');
  }

  /**
   * 生成飞书扫码登录URL
   */
  public async generateQRCodeUrl(state: string): Promise<string> {
    const baseUrl = 'https://open.feishu.cn/open-apis/authen/v1/authorize';
    const params = new URLSearchParams({
      app_id: this.feishuConfig.appId,
      redirect_uri: this.feishuConfig.callbackUrl,
      state,
      scope: 'contact:user.base:readonly',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 获取扫码登录二维码信息
   */
  public async getQRCodeInfo(sceneUuid: string): Promise<{
    qrCodeUrl: string;
    miniprogramPage?: string;
  }> {
    // 实际实现中会调用飞书API获取二维码
    const qrCodeUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${this.feishuConfig.appId}&redirect_uri=${encodeURIComponent(this.feishuConfig.callbackUrl)}&state=${sceneUuid}`;
    
    return {
      qrCodeUrl,
    };
  }

  /**
   * 交换授权码获取访问令牌
   */
  private async exchangeCodeForToken(code: string): Promise<FeishuAuthInfo | null> {
    try {
      // 实际实现中会调用飞书API
      // POST https://open.feishu.cn/open-apis/authen/v1/oidc/access_token
      
      // 模拟响应
      const mockResponse = {
        code: 0,
        msg: 'success',
        data: {
          access_token: `mock_access_token_${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 7200,
          refresh_token: `mock_refresh_token_${Date.now()}`,
          scope: '',
          code: 0,
        },
      };

      if (mockResponse.code !== 0) {
        return null;
      }

      return {
        accessToken: mockResponse.data.access_token,
        userId: '', // 需要通过另一个API获取
        refreshToken: mockResponse.data.refresh_token,
        expiresAt: new Date(Date.now() + mockResponse.data.expires_in * 1000),
      };

    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      return null;
    }
  }

  /**
   * 获取飞书用户信息
   */
  private async getUserInfo(accessToken: string): Promise<FeishuUserInfo | null> {
    try {
      // 实际实现中会调用飞书API
      // GET https://open.feishu.cn/open-apis/authen/v1/user_info
      
      // 模拟响应
      const mockUserInfo: FeishuUserInfo = {
        unionId: `feishu_union_${Date.now()}`,
        openId: `feishu_open_${Date.now()}`,
        name: 'Feishu User',
        avatarUrl: undefined,
        email: undefined,
        phone: undefined,
      };

      return mockUserInfo;

    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * 刷新访问令牌
   */
  public async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      // 实际实现中会调用飞书API
      // POST https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token
      
      return `refreshed_token_${Date.now()}`;

    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * 验证飞书回调签名
   */
  public verifyCallback(
    timestamp: string,
    nonce: string,
    signature: string
  ): boolean {
    // 实际实现中需要验证飞书回调签名
    // 签名算法: sha256(appSecret, timestamp + nonce)
    return true; // 模拟验证通过
  }

  /**
   * 发送验证码到飞书（通过机器人消息）
   */
  protected async sendCodeToContact(contact: string, code: string): Promise<void> {
    // 飞书通道暂不支持此功能
    console.log(`[FeishuChannel] Would send code ${code} to ${contact}`);
  }
}

/**
 * 飞书OAuth URL生成器
 */
export class FeishuOAuthUrlGenerator {
  /**
   * 生成飞书OAuth授权URL
   */
  public static generateUrl(config: FeishuAppConfig, state: string): string {
    const baseUrl = 'https://open.feishu.cn/open-apis/authen/v1/authorize';
    const params = new URLSearchParams({
      app_id: config.appId,
      redirect_uri: config.callbackUrl,
      state,
      scope: 'contact:user.base:readonly',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 解析飞书OAuth回调状态
   */
  public static parseCallbackParams(params: URLSearchParams): {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  } {
    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
      error_description: params.get('error_description') || undefined,
    };
  }
}
