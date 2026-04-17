/**
 * UserRegistry.ts
 * 用户注册表
 * 
 * 管理用户基本信息的数据存储和查询
 * 
 * @author 昆仑框架团队
 * @version 1.0.0
 */

import {
  User,
  UserStatus,
  RegistrationChannelType,
  RegistrationStats,
} from './types';

/**
 * 用户查询选项
 */
export interface UserQueryOptions {
  /** 用户状态 */
  status?: UserStatus;
  /** 注册渠道 */
  registeredVia?: RegistrationChannelType;
  /** 起始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
  /** 分页限制 */
  limit?: number;
  /** 分页偏移 */
  offset?: number;
}

/**
 * 用户索引结构
 */
interface UserIndex {
  byId: Map<string, User>;
  byEmail: Map<string, string>;  // email -> userId
  byPhone: Map<string, string>;   // phone -> userId
  byUsername: Map<string, string>; // username -> userId
  byTenant: Map<string, Set<string>>; // tenantId -> Set<userId>
  byStatus: Map<string, Map<string, User>>; // tenantId -> status -> users
}

/**
 * 用户注册表
 * 
 * 提供用户的CRUD操作和索引管理
 */
export class UserRegistry {
  /** 用户索引 */
  private index: UserIndex;

  /** 统计信息缓存 */
  private statsCache: Map<string, RegistrationStats>;
  
  /** 统计缓存过期时间(秒) */
  private statsCacheExpireSeconds: number = 60;

  /**
   * 构造函数
   */
  constructor() {
    this.index = {
      byId: new Map(),
      byEmail: new Map(),
      byPhone: new Map(),
      byUsername: new Map(),
      byTenant: new Map(),
      byStatus: new Map(),
    };
    this.statsCache = new Map();
  }

  /**
   * 创建用户
   * 
   * @param user 用户信息
   * @returns 创建的用户
   */
  public async createUser(user: User): Promise<User> {
    // 检查是否已存在
    if (this.index.byId.has(user.id)) {
      throw new Error(`User with ID ${user.id} already exists`);
    }

    // 检查邮箱唯一性
    if (user.email && this.index.byEmail.has(user.email.toLowerCase())) {
      throw new Error(`User with email ${user.email} already exists`);
    }

    // 检查手机号唯一性
    if (user.phone && this.index.byPhone.has(user.phone)) {
      throw new Error(`User with phone ${user.phone} already exists`);
    }

    // 检查用户名唯一性
    if (user.username && this.index.byUsername.has(user.username.toLowerCase())) {
      throw new Error(`User with username ${user.username} already exists`);
    }

    // 添加到索引
    this.index.byId.set(user.id, user);

    // 邮箱索引
    if (user.email) {
      this.index.byEmail.set(user.email.toLowerCase(), user.id);
    }

    // 手机号索引
    if (user.phone) {
      this.index.byPhone.set(user.phone, user.id);
    }

    // 用户名索引
    if (user.username) {
      this.index.byUsername.set(user.username.toLowerCase(), user.id);
    }

    // 租户索引
    if (!this.index.byTenant.has(user.tenantId)) {
      this.index.byTenant.set(user.tenantId, new Set());
    }
    this.index.byTenant.get(user.tenantId)!.add(user.id);

    // 状态索引
    if (!this.index.byStatus.has(user.tenantId)) {
      this.index.byStatus.set(user.tenantId, new Map());
    }
    const tenantStatusMap = this.index.byStatus.get(user.tenantId)!;
    if (!tenantStatusMap.has(user.status)) {
      tenantStatusMap.set(user.status, new Map());
    }
    tenantStatusMap.get(user.status)!.set(user.id, user);

    // 清除统计缓存
    this.clearStatsCache(user.tenantId);

    return user;
  }

  /**
   * 获取用户
   * 
   * @param userId 用户ID
   * @returns 用户信息
   */
  public async getUser(userId: string): Promise<User | null> {
    return this.index.byId.get(userId) || null;
  }

  /**
   * 通过ID和租户ID获取用户
   * 
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 用户信息
   */
  public async getUserByIdAndTenant(userId: string, tenantId: string): Promise<User | null> {
    const user = await this.getUser(userId);
    if (user && user.tenantId === tenantId) {
      return user;
    }
    return null;
  }

  /**
   * 通过邮箱获取用户
   * 
   * @param email 邮箱
   * @param tenantId 租户ID（可选）
   * @returns 用户信息
   */
  public async getUserByEmail(email: string, tenantId?: string): Promise<User | null> {
    const userId = this.index.byEmail.get(email.toLowerCase());
    if (!userId) return null;
    
    const user = await this.getUser(userId);
    if (user && (!tenantId || user.tenantId === tenantId)) {
      return user;
    }
    return null;
  }

  /**
   * 通过手机号获取用户
   * 
   * @param phone 手机号
   * @param tenantId 租户ID（可选）
   * @returns 用户信息
   */
  public async getUserByPhone(phone: string, tenantId?: string): Promise<User | null> {
    const userId = this.index.byPhone.get(phone);
    if (!userId) return null;
    
    const user = await this.getUser(userId);
    if (user && (!tenantId || user.tenantId === tenantId)) {
      return user;
    }
    return null;
  }

  /**
   * 通过OAuth信息获取用户
   * 
   * @param provider OAuth提供商
   * @param oauthUserId OAuth用户ID
   * @param tenantId 租户ID
   * @returns 用户信息
   */
  public async getUserByOAuth(
    provider: string,
    oauthUserId: string,
    tenantId: string
  ): Promise<User | null> {
    for (const user of this.index.byId.values()) {
      if (
        user.tenantId === tenantId &&
        user.oauthProvider === provider &&
        user.oauthUserId === oauthUserId
      ) {
        return user;
      }
    }
    return null;
  }

  /**
   * 更新用户
   * 
   * @param user 用户信息
   * @returns 更新后的用户
   */
  public async updateUser(user: User): Promise<User> {
    const existingUser = await this.getUser(user.id);
    if (!existingUser) {
      throw new Error(`User with ID ${user.id} not found`);
    }

    // 处理邮箱变更
    if (existingUser.email !== user.email) {
      // 删除旧邮箱索引
      if (existingUser.email) {
        this.index.byEmail.delete(existingUser.email.toLowerCase());
      }
      // 添加新邮箱索引
      if (user.email) {
        if (this.index.byEmail.has(user.email.toLowerCase())) {
          throw new Error(`Email ${user.email} is already in use`);
        }
        this.index.byEmail.set(user.email.toLowerCase(), user.id);
      }
    }

    // 处理手机号变更
    if (existingUser.phone !== user.phone) {
      if (existingUser.phone) {
        this.index.byPhone.delete(existingUser.phone);
      }
      if (user.phone) {
        if (this.index.byPhone.has(user.phone)) {
          throw new Error(`Phone ${user.phone} is already in use`);
        }
        this.index.byPhone.set(user.phone, user.id);
      }
    }

    // 处理用户名变更
    if (existingUser.username !== user.username) {
      if (existingUser.username) {
        this.index.byUsername.delete(existingUser.username.toLowerCase());
      }
      if (user.username) {
        if (this.index.byUsername.has(user.username.toLowerCase())) {
          throw new Error(`Username ${user.username} is already in use`);
        }
        this.index.byUsername.set(user.username.toLowerCase(), user.id);
      }
    }

    // 处理状态变更
    if (existingUser.status !== user.status) {
      const tenantStatusMap = this.index.byStatus.get(user.tenantId);
      if (tenantStatusMap) {
        // 从旧状态移除
        const oldStatusMap = tenantStatusMap.get(existingUser.status);
        if (oldStatusMap) {
          oldStatusMap.delete(user.id);
        }
        // 添加到新状态
        if (!tenantStatusMap.has(user.status)) {
          tenantStatusMap.set(user.status, new Map());
        }
        tenantStatusMap.get(user.status)!.set(user.id, user);
      }
    }

    // 更新用户数据
    this.index.byId.set(user.id, user);
    
    // 清除统计缓存
    this.clearStatsCache(user.tenantId);

    return user;
  }

  /**
   * 删除用户
   * 
   * @param userId 用户ID
   * @param tenantId 租户ID
   */
  public async deleteUser(userId: string, tenantId: string): Promise<void> {
    const user = await this.getUserByIdAndTenant(userId, tenantId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found in tenant ${tenantId}`);
    }

    // 从所有索引中移除
    this.index.byId.delete(userId);
    
    if (user.email) {
      this.index.byEmail.delete(user.email.toLowerCase());
    }
    
    if (user.phone) {
      this.index.byPhone.delete(user.phone);
    }
    
    if (user.username) {
      this.index.byUsername.delete(user.username.toLowerCase());
    }
    
    const tenantUsers = this.index.byTenant.get(tenantId);
    if (tenantUsers) {
      tenantUsers.delete(userId);
    }
    
    const tenantStatusMap = this.index.byStatus.get(tenantId);
    if (tenantStatusMap) {
      const statusMap = tenantStatusMap.get(user.status);
      if (statusMap) {
        statusMap.delete(userId);
      }
    }

    // 清除统计缓存
    this.clearStatsCache(tenantId);
  }

  /**
   * 列出用户
   * 
   * @param tenantId 租户ID
   * @param options 查询选项
   * @returns 用户列表
   */
  public async listUsers(
    tenantId: string,
    options?: UserQueryOptions
  ): Promise<User[]> {
    const tenantUsers = this.index.byTenant.get(tenantId);
    if (!tenantUsers || tenantUsers.size === 0) {
      return [];
    }

    let users: User[] = [];
    
    // 如果指定了状态，直接从状态索引获取
    if (options?.status) {
      const statusMap = this.index.byStatus.get(tenantId)?.get(options.status);
      if (statusMap) {
        users = Array.from(statusMap.values());
      }
    } else {
      // 否则获取该租户下的所有用户
      users = Array.from(tenantUsers).map(id => this.index.byId.get(id)!).filter(Boolean);
    }

    // 过滤注册渠道
    if (options?.registeredVia) {
      users = users.filter(u => u.registeredVia === options.registeredVia);
    }

    // 过滤日期范围
    if (options?.startDate) {
      users = users.filter(u => u.createdAt >= options.startDate!);
    }
    if (options?.endDate) {
      users = users.filter(u => u.createdAt <= options.endDate!);
    }

    // 排序（按创建时间倒序）
    users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    
    return users.slice(offset, offset + limit);
  }

  /**
   * 检查邮箱是否已存在
   * 
   * @param email 邮箱
   * @param tenantId 租户ID（可选）
   * @returns 是否存在
   */
  public async emailExists(email: string, tenantId?: string): Promise<boolean> {
    const user = await this.getUserByEmail(email, tenantId);
    return user !== null;
  }

  /**
   * 检查手机号是否已存在
   * 
   * @param phone 手机号
   * @param tenantId 租户ID（可选）
   * @returns 是否存在
   */
  public async phoneExists(phone: string, tenantId?: string): Promise<boolean> {
    const user = await this.getUserByPhone(phone, tenantId);
    return user !== null;
  }

  /**
   * 获取注册统计
   * 
   * @param tenantId 租户ID
   * @returns 注册统计信息
   */
  public async getStats(tenantId: string): Promise<RegistrationStats> {
    // 检查缓存
    const cached = this.statsCache.get(tenantId);
    if (cached) {
      const cacheTime = (cached as any)._cacheTime;
      if (Date.now() - cacheTime < this.statsCacheExpireSeconds * 1000) {
        return cached;
      }
    }

    const users = await this.listUsers(tenantId);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const channelStats: Record<string, number> = {};
    for (const channel of Object.values(RegistrationChannelType)) {
      channelStats[channel] = 0;
    }

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    for (const user of users) {
      // 渠道统计
      if (channelStats[user.registeredVia] !== undefined) {
        channelStats[user.registeredVia]++;
      }

      // 时间统计
      if (user.createdAt >= todayStart) {
        todayCount++;
      }
      if (user.createdAt >= weekStart) {
        weekCount++;
      }
      if (user.createdAt >= monthStart) {
        monthCount++;
      }
    }

    const stats: RegistrationStats = {
      totalRegistrations: users.length,
      todayRegistrations: todayCount,
      weekRegistrations: weekCount,
      monthRegistrations: monthCount,
      channelStats: channelStats as any,
    };

    // 缓存结果
    (stats as any)._cacheTime = Date.now();
    this.statsCache.set(tenantId, stats);

    return stats;
  }

  /**
   * 获取租户用户数量
   * 
   * @param tenantId 租户ID
   * @returns 用户数量
   */
  public async getTenantUserCount(tenantId: string): Promise<number> {
    const tenantUsers = this.index.byTenant.get(tenantId);
    return tenantUsers?.size || 0;
  }

  /**
   * 清除统计缓存
   * 
   * @param tenantId 租户ID
   */
  private clearStatsCache(tenantId: string): void {
    this.statsCache.delete(tenantId);
  }

  /**
   * 清除所有缓存
   */
  public clearAllCache(): void {
    this.statsCache.clear();
  }

  /**
   * 批量导入用户（用于数据迁移）
   * 
   * @param users 用户列表
   */
  public async batchImport(users: User[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        await this.createUser(user);
        success++;
      } catch (error) {
        failed++;
        errors.push(`${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 导出所有用户数据
   * 
   * @param tenantId 租户ID
   * @returns 用户数据JSON
   */
  public async exportUsers(tenantId: string): Promise<string> {
    const users = await this.listUsers(tenantId, { limit: 10000 });
    return JSON.stringify(users, null, 2);
  }

  /**
   * 搜索用户
   * 
   * @param tenantId 租户ID
   * @param query 搜索关键词
   * @param limit 结果限制
   * @returns 匹配的用户列表
   */
  public async searchUsers(tenantId: string, query: string, limit: number = 20): Promise<User[]> {
    const users = await this.listUsers(tenantId);
    const lowerQuery = query.toLowerCase();
    
    return users.filter(user => {
      if (user.username?.toLowerCase().includes(lowerQuery)) return true;
      if (user.displayName?.toLowerCase().includes(lowerQuery)) return true;
      if (user.email?.toLowerCase().includes(lowerQuery)) return true;
      if (user.phone?.includes(query)) return true;
      return false;
    }).slice(0, limit);
  }
}
