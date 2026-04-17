/**
 * FeishuOAuth.ts
 * 飞书OAuth实现
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import {
  OAuthProvider,
  OAuthProviderConfig,
  OAuthTokenInfo,
  OAuthUserInfo,
  OAuthAuthorizationUrlParams,
  OAuthCallbackParams,
} from './OAuthProvider';
import { OAuthProviderType } from '../types';

/**
 * 飞书OAuth配置
 */
export interface FeishuOAuthConfig extends OAuthProviderConfig {
  /** 飞书应用App ID */
  clientId: string;
  /** 飞书应用App Secret */
  clientSecret: string;
}

/**
 * 飞书OAuth用户信息
 */
interface FeishuOAuthUserInfo {
  /** 用户唯一标识(Union ID) */
  union_id?: string;
  /** Open ID */
  open_id: string;
  /** 用户名 */
  name?: string;
  /** 名称 */
  en_name?: string;
  /** 头像URL */
  avatar?: {
    avatar_72?: string;
    avatar_240?: string;
    avatar_640?: string;
    avatar_url?: string;
  };
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  mobile?: string;
  /** 工号 */
  employee_id?: string;
  /** 部门ID */
  department_ids?: string[];
}

/**
 * 飞书OAuth令牌响应
 */
interface FeishuTokenResponse {
  code: number;
  msg: string;
  data?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    refresh_expires_in: number;
    scope: string;
  };
}

/**
 * 飞书OAuth提供商
 */
export class FeishuOAuth extends OAuthProvider {
  /** 飞书OAuth端点 */
  private static readonly AUTHORIZE_URL = 'https://open.feishu.cn/open-apis/authen/v1/authorize';
  private static readonly TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token';
  private static readonly USER_INFO_URL = 'https://open.feishu.cn/open-apis/authen/v1/user_info';

  /** 飞书配置 */
  private feishuConfig: FeishuOAuthConfig;

  /**
   * 构造函数
   */
  constructor(config: FeishuOAuthConfig) {
    super(config);
    this.feishuConfig = config;
  }

  /**
   * 获取提供商类型
   */
  public getProviderType(): OAuthProviderType {
    return OAuthProviderType.FEISHU;
  }

  /**
   * 构建授权URL参数
   */
  protected buildAuthorizationUrlParams(state: string): OAuthAuthorizationUrlParams {
    return {
      clientId: this.feishuConfig.clientId,
      redirectUri: this.feishuConfig.callbackUrl,
      scope: this.feishuConfig.scopes.join(' '),
      state,
      responseType: 'code',
    };
  }

  /**
   * 构建授权URL
   */
  protected buildAuthorizationUrl(params: OAuthAuthorizationUrlParams): string {
    const urlParams = new URLSearchParams({
      app_id: params.clientId,
      redirect_uri: params.redirectUri,
      scope: params.scope,
      state: params.state || '',
      response_type: params.responseType || 'code',
    });

    return `${FeishuOAuth.AUTHORIZE_URL}?${urlParams.toString()}`;
  }

  /**
   * 交换授权码获取令牌
   */
  protected async exchangeCodeForToken(code: string): Promise<OAuthTokenInfo | null> {
    try {
      // 实际实现中会调用飞书API
      // POST https://open.feishu.cn/open-apis/authen/v1/oidc/access_token
      
      // 模拟响应
      const mockResponse: FeishuTokenResponse = {
        code: 0,
        msg: 'success',
        data: {
          access_token: `feishu_access_token_${Date.now()}`,
          token_type: 'Bearer',
          expires_in: 7200,
          refresh_token: `feishu_refresh_token_${Date.now()}`,
          refresh_expires_in: 259200,
          scope: this.feishuConfig.scopes.join(' '),
        },
      };

      if (mockResponse.code !== 0 || !mockResponse.data) {
        console.error('Feishu token exchange failed:', mockResponse.msg);
        return null;
      }

      return {
        accessToken: mockResponse.data.access_token,
        tokenType: mockResponse.data.token_type,
        expiresIn: mockResponse.data.expires_in,
        refreshToken: mockResponse.data.refresh_token,
        scope: mockResponse.data.scope,
        createdAt: new Date(),
      };

    } catch (error) {
      console.error('Feishu token exchange error:', error);
      return null;
    }
  }

  /**
   * 获取用户信息
   */
  public async getUserInfo(accessToken: string): Promise<OAuthUserInfo | null> {
    try {
      // 实际实现中会调用飞书API
      // GET https://open.feishu.cn/open-apis/authen/v1/user_info
      // Header: Authorization: Bearer {access_token}
      
      // 模拟响应
      const mockUserInfo: FeishuOAuthUserInfo = {
        union_id: `feishu_union_${Date.now()}`,
        open_id: `feishu_open_${Date.now()}`,
        name: '飞书用户',
        en_name: 'Feishu User',
        avatar: {
          avatar_72: 'https://example.com/avatar_72.png',
          avatar_240: 'https://example.com/avatar_240.png',
          avatar_640: 'https://example.com/avatar_640.png',
        },
        email: 'user@example.com',
        mobile: '+86***********',
      };

      return this.mapToOAuthUserInfo(mockUserInfo);

    } catch (error) {
      console.error('Feishu get user info error:', error);
      return null;
    }
  }

  /**
   * 映射飞书用户信息到OAuth用户信息
   */
  private mapToOAuthUserInfo(feishuUser: FeishuOAuthUserInfo): OAuthUserInfo {
    return {
      id: feishuUser.union_id || feishuUser.open_id,
      username: feishuUser.name,
      displayName: feishuUser.en_name || feishuUser.name,
      email: feishuUser.email,
      emailVerified: !!feishuUser.email,
      avatarUrl: feishuUser.avatar?.avatar_240 || feishuUser.avatar?.avatar_url,
      rawData: feishuUser as any,
    };
  }

  /**
   * 刷新令牌
   */
  public async refreshToken(refreshToken: string): Promise<OAuthTokenInfo | null> {
    try {
      // 实际实现中会调用飞书API
      // POST https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token
      
      // 模拟响应
      return {
        accessToken: `feishu_refreshed_access_token_${Date.now()}`,
        tokenType: 'Bearer',
        expiresIn: 7200,
        refreshToken: `feishu_new_refresh_token_${Date.now()}`,
        createdAt: new Date(),
      };

    } catch (error) {
      console.error('Feishu refresh token error:', error);
      return null;
    }
  }

  /**
   * 撤销令牌
   */
  public async revokeToken(token: string): Promise<boolean> {
    try {
      // 实际实现中会调用飞书API
      // POST https://open.feishu.cn/open-apis/authen/v1/authorize/delete_access_token
      
      return true;

    } catch (error) {
      console.error('Feishu revoke token error:', error);
      return false;
    }
  }

  /**
   * 获取飞书授权URL（静态方法，方便直接调用）
   */
  public static getAuthorizationUrl(
    appId: string,
    redirectUri: string,
    scope: string[],
    state: string
  ): string {
    const urlParams = new URLSearchParams({
      app_id: appId,
      redirect_uri: redirectUri,
      scope: scope.join(' '),
      state,
      response_type: 'code',
    });

    return `${FeishuOAuth.AUTHORIZE_URL}?${urlParams.toString()}`;
  }

  /**
   * 验证飞书回调签名（静态方法）
   */
  public static verifyCallbackSignature(
    body: string,
    timestamp: string,
    signature: string,
    secret: string
  ): boolean {
    // 实际实现中需要验证飞书回调签名
    // 签名算法: HMAC-SHA256
    return true; // 模拟验证通过
  }
}
