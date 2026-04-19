/**
 * RegistrationFlow.ts
 * 注册流程管理
 * 
 * 管理注册会话、激活令牌和注册流程状态
 * 
 * @author OpenTaiji团队
 * @version 1.0.0
 */

import { User, UserStatus } from './types';
import { UserRegistry } from './UserRegistry';

/**
 * 注册会话
 */
export interface RegistrationSession {
  /** 会话ID */
  sessionId: string;
  /** 用户ID */
  userId: string;
  /** 租户ID */
  tenantId: string;
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 刷新令牌过期时间 */
  refreshExpiresAt: Date;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 激活令牌
 */
interface ActivationToken {
  /** 用户ID */
  userId: string;
  /** 令牌 */
  token: string;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 已使用 */
  used: boolean;
}

/**
 * 会话配置
 */
export interface SessionConfig {
  /** 访问令牌过期时间(秒) */
  accessTokenExpiresIn: number;
  /** 刷新令牌过期时间(秒) */
  refreshTokenExpiresIn: number;
  /** 激活令牌过期时间(秒) */
  activationTokenExpiresIn: number;
}

/**
 * 默认会话配置
 */
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  accessTokenExpiresIn: 3600,        // 1小时
  refreshTokenExpiresIn: 604800,     // 7天
  activationTokenExpiresIn: 86400,    // 24小时
};

/**
 * 注册流程管理类
 * 
 * 负责管理注册会话、生成令牌、验证激活链接等
 */
export class RegistrationFlow {
  /** 用户注册表 */
  private userRegistry: UserRegistry;
  
  /** 会话存储 */
  private sessions: Map<string, RegistrationSession>;
  
  /** 激活令牌存储 */
  private activationTokens: Map<string, ActivationToken>;
  
  /** 用户会话映射 */
  private userSessions: Map<string, Set<string>>;
  
  /** 配置 */
  private config: SessionConfig;

  /**
   * 构造函数
   * 
   * @param userRegistry 用户注册表
   * @param config 会话配置
   */
  constructor(userRegistry: UserRegistry, config?: Partial<SessionConfig>) {
    this.userRegistry = userRegistry;
    this.sessions = new Map();
    this.activationTokens = new Map();
    this.userSessions = new Map();
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
  }

  /**
   * 创建注册会话
   * 
   * @param user 用户
   * @returns 注册会话
   */
  public async createSession(user: User): Promise<RegistrationSession> {
    const now = new Date();
    
    // 生成令牌
    const accessToken = this.generateToken();
    const refreshToken = this.generateToken();
    const sessionId = this.generateSessionId();

    const session: RegistrationSession = {
      sessionId,
      userId: user.id,
      tenantId: user.tenantId,
      accessToken,
      refreshToken,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.accessTokenExpiresIn * 1000),
      refreshExpiresAt: new Date(now.getTime() + this.config.refreshTokenExpiresIn * 1000),
    };

    // 存储会话
    this.sessions.set(sessionId, session);
    
    // 更新用户会话映射
    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    return session;
  }

  /**
   * 创建激活令牌
   * 
   * @param userId 用户ID
   * @returns 激活令牌
   */
  public async createActivationToken(userId: string): Promise<string> {
    const now = new Date();
    const token = this.generateActivationToken();
    
    const activationToken: ActivationToken = {
      userId,
      token,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.activationTokenExpiresIn * 1000),
      used: false,
    };

    this.activationTokens.set(token, activationToken);
    
    return token;
  }

  /**
   * 验证激活令牌
   * 
   * @param userId 用户ID
   * @param token 激活令牌
   * @returns 验证结果
   */
  public async verifyActivationToken(userId: string, token: string): Promise<{ valid: boolean; error?: string }> {
    const activationToken = this.activationTokens.get(token);
    
    if (!activationToken) {
      return { valid: false, error: 'Invalid activation token' };
    }

    if (activationToken.userId !== userId) {
      return { valid: false, error: 'Token does not match user' };
    }

    if (activationToken.used) {
      return { valid: false, error: 'Token has already been used' };
    }

    if (new Date() > activationToken.expiresAt) {
      return { valid: false, error: 'Token has expired' };
    }

    // 标记为已使用
    activationToken.used = true;
    
    return { valid: true };
  }

  /**
   * 刷新访问令牌
   * 
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌会话
   */
  public async refreshAccessToken(refreshToken: string): Promise<RegistrationSession | null> {
    // 查找使用该刷新令牌的会话
    let existingSession: RegistrationSession | null = null;
    
    for (const session of this.sessions.values()) {
      if (session.refreshToken === refreshToken) {
        existingSession = session;
        break;
      }
    }

    if (!existingSession) {
      return null;
    }

    // 检查刷新令牌是否过期
    if (new Date() > existingSession.refreshExpiresAt) {
      // 删除过期会话
      this.sessions.delete(existingSession.sessionId);
      const userSessionSet = this.userSessions.get(existingSession.userId);
      if (userSessionSet) {
        userSessionSet.delete(existingSession.sessionId);
      }
      return null;
    }

    // 获取用户
    const user = await this.userRegistry.getUser(existingSession.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    // 删除旧会话
    this.sessions.delete(existingSession.sessionId);
    const userSessionSet = this.userSessions.get(existingSession.userId);
    if (userSessionSet) {
      userSessionSet.delete(existingSession.sessionId);
    }

    // 创建新会话
    return this.createSession(user);
  }

  /**
   * 获取会话
   * 
   * @param sessionId 会话ID
   * @returns 会话信息
   */
  public async getSession(sessionId: string): Promise<RegistrationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 通过访问令牌获取会话
   * 
   * @param accessToken 访问令牌
   * @returns 会话信息
   */
  public async getSessionByAccessToken(accessToken: string): Promise<RegistrationSession | null> {
    for (const session of this.sessions.values()) {
      if (session.accessToken === accessToken) {
        // 检查是否过期
        if (new Date() > session.expiresAt) {
          await this.invalidateSession(session.sessionId);
          return null;
        }
        return session;
      }
    }
    return null;
  }

  /**
   * 使会话失效
   * 
   * @param sessionId 会话ID
   */
  public async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      const userSessionSet = this.userSessions.get(session.userId);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }
    }
  }

  /**
   * 使所有用户会话失效
   * 
   * @param userId 用户ID
   */
  public async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
    }
  }

  /**
   * 获取用户的所有有效会话
   * 
   * @param userId 用户ID
   * @returns 会话列表
   */
  public async getUserSessions(userId: string): Promise<RegistrationSession[]> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: RegistrationSession[] = [];
    const expiredSessionIds: string[] = [];

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        // 检查是否过期
        if (new Date() > session.expiresAt) {
          expiredSessionIds.push(sessionId);
        } else {
          sessions.push(session);
        }
      } else {
        expiredSessionIds.push(sessionId);
      }
    }

    // 清理过期会话引用
    for (const sessionId of expiredSessionIds) {
      sessionIds.delete(sessionId);
    }

    return sessions;
  }

  /**
   * 获取会话数量
   * 
   * @param userId 用户ID
   * @returns 会话数量
   */
  public async getUserSessionCount(userId: string): Promise<number> {
    return (await this.getUserSessions(userId)).length;
  }

  /**
   * 清理过期会话
   * 
   * @returns 清理的会话数量
   */
  public async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        const userSessionSet = this.userSessions.get(session.userId);
        if (userSessionSet) {
          userSessionSet.delete(sessionId);
        }
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 清理过期激活令牌
   * 
   * @returns 清理的令牌数量
   */
  public async cleanupExpiredActivationTokens(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [token, activationToken] of this.activationTokens.entries()) {
      if (now > activationToken.expiresAt || activationToken.used) {
        this.activationTokens.delete(token);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 生成随机令牌
   */
  private generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}_${random2}`;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${this.generateToken()}`;
  }

  /**
   * 生成激活令牌（更安全的格式）
   */
  private generateActivationToken(): string {
    const timestamp = Date.now().toString(36);
    const random = this.generateSecureRandom(32);
    return `${timestamp}.${random}`;
  }

  /**
   * 生成安全随机字符串
   */
  private generateSecureRandom(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 验证访问令牌
   * 
   * @param accessToken 访问令牌
   * @returns 验证结果
   */
  public async validateAccessToken(accessToken: string): Promise<{ valid: boolean; session?: RegistrationSession }> {
    const session = await this.getSessionByAccessToken(accessToken);
    return { valid: session !== null, session: session || undefined };
  }

  /**
   * 获取会话统计
   */
  public getSessionStats(): {
    totalSessions: number;
    totalUsers: number;
    averageSessionsPerUser: number;
  } {
    const totalSessions = this.sessions.size;
    const totalUsers = this.userSessions.size;
    const averageSessionsPerUser = totalUsers > 0 ? totalSessions / totalUsers : 0;

    return {
      totalSessions,
      totalUsers,
      averageSessionsPerUser: Math.round(averageSessionsPerUser * 100) / 100,
    };
  }
}
