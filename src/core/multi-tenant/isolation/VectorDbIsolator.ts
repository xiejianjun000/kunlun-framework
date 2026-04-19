/**
 * 向量数据库隔离器
 * Vector Database Isolator - Collection级别隔离
 * 
 * @module Taiji.MultiTenant.Isolation
 */

import {
  Tenant,
  TenantResourceIdentifiers,
  VectorDbIsolatorConfig,
  IsolationLevel,
} from '../types';
import {
  IVectorDbIsolator,
  VectorCollectionConfig,
  CollectionStats,
} from '../interfaces';
import { ResourceIsolator } from './ResourceIsolator';

/**
 * 向量数据库隔离器配置
 */
export interface TaijiVectorDbIsolatorConfig extends VectorDbIsolatorConfig {
  /** 向量数据库URL */
  url?: string;
  /** API Key */
  apiKey?: string;
  /** 默认向量维度 */
  defaultDimension?: number;
}

/**
 * 向量数据库隔离器
 * 负责向量数据库collection级别的资源隔离
 * 
 * @example
 * ```typescript
 * const isolator = new VectorDbIsolator({
 *   isolationLevel: 'standard',
 *   defaultCollectionPrefix: 'tenant_',
 *   url: 'http://localhost:6333',
 * });
 * 
 * // 为租户创建Collection
 * await isolator.createCollection('tenant_001', {
 *   name: 'memories',
 *   dimension: 1536,
 *   distance: 'Cosine',
 * });
 * 
 * // 获取Collection名称
 * const name = isolator.getCollectionName('tenant_001');
 * console.log(name); // 'tenant_tenant_001_memories'
 * ```
 */
export class VectorDbIsolator extends ResourceIsolator implements IVectorDbIsolator {
  private config: TaijiVectorDbIsolatorConfig;
  private collections: Map<string, VectorCollectionConfig[]> = new Map();
  private collectionPrefix: string;

  constructor(config: TaijiVectorDbIsolatorConfig) {
    super(config.isolationLevel ?? IsolationLevel.STANDARD);
    this.collectionPrefix = config.defaultCollectionPrefix ?? 'tenant_';
    this.config = {
      url: config.url ?? 'http://localhost:6333',
      defaultDimension: config.defaultDimension ?? 1536,
      ...config,
    };
  }

  /**
   * 为租户创建隔离资源
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  async createIsolation(tenantId: string): Promise<TenantResourceIdentifiers> {
    const collectionName = `${this.collectionPrefix}${tenantId}`;

    const identifiers: TenantResourceIdentifiers = {
      tenantId,
      collectionName,
    };

    // 创建默认Collection
    await this.createCollection(tenantId, {
      name: collectionName,
      dimension: this.config.defaultDimension ?? 1536,
      distance: 'Cosine',
    });

    this.storeIdentifiers(tenantId, identifiers);
    return identifiers;
  }

  /**
   * 删除租户的隔离资源
   * @param tenantId 租户ID
   */
  async destroyIsolation(tenantId: string): Promise<void> {
    const identifiers = this.getIdentifiers(tenantId);

    // 删除所有Collection
    if (identifiers.collectionName) {
      await this.deleteCollection(tenantId);
    }

    this.removeIdentifiers(tenantId);
    this.collections.delete(tenantId);
  }

  /**
   * 获取租户的Collection名称（带前缀）
   * @param tenantId 租户ID
   * @returns Collection名称
   */
  getCollectionName(tenantId: string): string {
    const identifiers = this.getIdentifiers(tenantId);
    return identifiers.collectionName ?? `${this.collectionPrefix}${tenantId}`;
  }

  /**
   * 获取租户的Collection配置
   * @param tenantId 租户ID
   * @returns Collection配置
   */
  getCollectionConfig(tenantId: string): VectorCollectionConfig {
    const collections = this.collections.get(tenantId) ?? [];
    return collections[0] ?? {
      name: this.getCollectionName(tenantId),
      dimension: this.config.defaultDimension ?? 1536,
      distance: 'Cosine',
    };
  }

  /**
   * 创建租户的Collection
   * @param tenantId 租户ID
   * @param config Collection配置
   */
  async createCollection(
    tenantId: string,
    config: VectorCollectionConfig
  ): Promise<void> {
    const fullName = this.buildCollectionName(tenantId, config.name);
    const fullConfig: VectorCollectionConfig = {
      ...config,
      name: fullName,
    };

    console.log(`[VectorDbIsolator] Creating collection: ${fullName}`);

    // 存储Collection配置
    const tenantCollections = this.collections.get(tenantId) ?? [];
    tenantCollections.push(fullConfig);
    this.collections.set(tenantId, tenantCollections);

    // 更新标识符
    const identifiers = this.getIdentifiers(tenantId);
    identifiers.collectionName = fullName;
    this.storeIdentifiers(tenantId, identifiers);
  }

  /**
   * 删除租户的Collection
   * @param tenantId 租户ID
   */
  async deleteCollection(tenantId: string): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);
    console.log(`[VectorDbIsolator] Deleting collection: ${collectionName}`);
  }

  /**
   * 检查Collection是否存在
   * @param tenantId 租户ID
   * @returns 是否存在
   */
  async collectionExists(tenantId: string): Promise<boolean> {
    const collections = this.collections.get(tenantId);
    return (collections?.length ?? 0) > 0;
  }

  /**
   * 获取Collection统计信息
   * @param tenantId 租户ID
   * @returns 统计信息
   */
  async getCollectionStats(tenantId: string): Promise<CollectionStats> {
    const collectionName = this.getCollectionName(tenantId);

    // 模拟统计信息
    return {
      name: collectionName,
      vectorsCount: 0,
      indexSize: 0,
      dataSize: 0,
    };
  }

  /**
   * 构建完整的Collection名称
   * @param tenantId 租户ID
   * @param baseName 基础名称
   * @returns 完整名称
   */
  private buildCollectionName(tenantId: string, baseName: string): string {
    return `${this.collectionPrefix}${tenantId}_${baseName}`;
  }

  /**
   * 获取租户的所有Collection
   * @param tenantId 租户ID
   * @returns Collection配置列表
   */
  getAllCollections(tenantId: string): VectorCollectionConfig[] {
    return this.collections.get(tenantId) ?? [];
  }

  /**
   * 创建租户（兼容接口）
   * @param tenant 租户信息
   */
  async createForTenant(tenant: Tenant): Promise<TenantResourceIdentifiers> {
    return this.createIsolation(tenant.id);
  }

  /**
   * 销毁租户（兼容接口）
   * @param tenant 租户信息
   */
  async destroyForTenant(tenant: Tenant): Promise<void> {
    return this.destroyIsolation(tenant.id);
  }

  /**
   * 搜索向量
   * @param tenantId 租户ID
   * @param vector 向量
   * @param limit 返回数量
   * @returns 搜索结果
   */
  async search(
    tenantId: string,
    vector: number[],
    limit: number = 10
  ): Promise<unknown[]> {
    const collectionName = this.getCollectionName(tenantId);
    console.log(`[VectorDbIsolator] Searching in ${collectionName}`);
    return [];
  }

  /**
   * 插入向量
   * @param tenantId 租户ID
   * @param vectors 向量数据
   * @param payload 负载数据
   */
  async insert(
    tenantId: string,
    vectors: number[][],
    payload: Record<string, unknown>[]
  ): Promise<void> {
    const collectionName = this.getCollectionName(tenantId);
    console.log(`[VectorDbIsolator] Inserting ${vectors.length} vectors into ${collectionName}`);
  }
}
