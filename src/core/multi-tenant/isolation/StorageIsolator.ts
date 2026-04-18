/**
 * 存储隔离器
 * Storage Isolator - 数据库/schema级别隔离
 * 
 * @module Taiji.MultiTenant.Isolation
 */

import {
  Tenant,
  TenantResourceIdentifiers,
  StorageIsolatorConfig,
  IsolationLevel,
} from '../types';
import {
  IStorageIsolator,
  StorageConnectionConfig,
  TableSchema,
} from '../interfaces';
import { ResourceIsolator } from './ResourceIsolator';

/**
 * 存储隔离器配置
 */
export interface TaijiStorageIsolatorConfig extends StorageIsolatorConfig {
  /** 默认数据库名称 */
  defaultDatabase?: string;
  /** 数据库连接URL */
  connectionUrl?: string;
  /** Schema前缀 */
  schemaPrefix?: string;
}

/**
 * 存储隔离器
 * 负责数据库/schema级别的资源隔离
 * 
 * @example
 * ```typescript
 * const isolator = new StorageIsolator({
 *   isolationLevel: 'standard',
 *   defaultSchemaPrefix: 'tenant_',
 * });
 * 
 * // 为租户创建隔离资源
 * const identifiers = await isolator.createIsolation('tenant_001');
 * console.log(identifiers.schemaName); // 'tenant_tenant_001'
 * 
 * // 获取连接配置
 * const config = await isolator.getConnectionConfig('tenant_001');
 * ```
 */
export class StorageIsolator extends ResourceIsolator implements IStorageIsolator {
  private config: TaijiStorageIsolatorConfig;
  private schemas: Map<string, TableSchema[]> = new Map();

  constructor(config: TaijiStorageIsolatorConfig) {
    super(config.isolationLevel ?? IsolationLevel.STANDARD);
    this.config = {
      defaultSchemaPrefix: config.defaultSchemaPrefix ?? 'tenant_',
      connectionPool: config.connectionPool ?? { min: 5, max: 20 },
      ...config,
    };
  }

  /**
   * 为租户创建隔离资源
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  async createIsolation(tenantId: string): Promise<TenantResourceIdentifiers> {
    const identifiers: TenantResourceIdentifiers = {
      tenantId,
    };

    switch (this.isolationLevel) {
      case IsolationLevel.STRICT:
        // 独立数据库
        identifiers.databaseName = `${this.config.schemaPrefix ?? 'Taiji_'}${tenantId}`;
        break;

      case IsolationLevel.STANDARD:
      default:
        // Schema隔离
        identifiers.databaseName = this.config.defaultDatabase ?? 'Taiji_main';
        identifiers.schemaName = `${this.config.defaultSchemaPrefix}${tenantId}`;
        break;
    }

    // 创建schema（如果使用schema隔离）
    if (identifiers.schemaName && this.isolationLevel !== IsolationLevel.STRICT) {
      await this.createSchema(identifiers.schemaName);
    }

    this.storeIdentifiers(tenantId, identifiers);
    return identifiers;
  }

  /**
   * 删除租户的隔离资源
   * @param tenantId 租户ID
   */
  async destroyIsolation(tenantId: string): Promise<void> {
    const identifiers = this.getIdentifiers(tenantId);

    if (identifiers.schemaName) {
      await this.dropSchema(identifiers.schemaName);
    }

    if (this.isolationLevel === IsolationLevel.STRICT && identifiers.databaseName) {
      await this.dropDatabase(identifiers.databaseName);
    }

    this.removeIdentifiers(tenantId);
    this.schemas.delete(tenantId);
  }

  /**
   * 获取租户的数据库连接配置
   * @param tenantId 租户ID
   * @returns 数据库连接配置
   */
  async getConnectionConfig(tenantId: string): Promise<StorageConnectionConfig> {
    const identifiers = this.getIdentifiers(tenantId);

    const baseConfig: StorageConnectionConfig = {
      type: 'postgresql',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      database: identifiers.databaseName ?? 'Taiji_main',
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
    };

    if (identifiers.schemaName) {
      baseConfig.schema = identifiers.schemaName;
    }

    return baseConfig;
  }

  /**
   * 获取租户的schema名称
   * @param tenantId 租户ID
   * @returns Schema名称
   */
  getSchemaName(tenantId: string): string {
    const identifiers = this.getIdentifiers(tenantId);
    return identifiers.schemaName ?? 'public';
  }

  /**
   * 创建Schema
   * @param schemaName Schema名称
   */
  private async createSchema(schemaName: string): Promise<void> {
    // 模拟Schema创建（实际应连接数据库执行CREATE SCHEMA）
    console.log(`[StorageIsolator] Creating schema: ${schemaName}`);
  }

  /**
   * 删除Schema
   * @param schemaName Schema名称
   */
  private async dropSchema(schemaName: string): Promise<void> {
    // 模拟Schema删除
    console.log(`[StorageIsolator] Dropping schema: ${schemaName}`);
  }

  /**
   * 创建数据库
   * @param databaseName 数据库名称
   */
  private async dropDatabase(databaseName: string): Promise<void> {
    // 模拟数据库删除
    console.log(`[StorageIsolator] Dropping database: ${databaseName}`);
  }

  /**
   * 执行租户内的数据库迁移
   * @param tenantId 租户ID
   * @param migrations 迁移脚本
   */
  async runMigrations(tenantId: string, migrations: string[]): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);
    for (const migration of migrations) {
      console.log(`[StorageIsolator] Running migration on ${schemaName}: ${migration}`);
    }
  }

  /**
   * 创建租户数据库表
   * @param tenantId 租户ID
   * @param tableName 表名
   * @param schema 表结构
   */
  async createTable(tenantId: string, tableName: string, schema: TableSchema): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);
    console.log(`[StorageIsolator] Creating table ${schemaName}.${tableName}`);

    // 存储表结构信息
    const tenantSchemas = this.schemas.get(tenantId) ?? [];
    tenantSchemas.push(schema);
    this.schemas.set(tenantId, tenantSchemas);
  }

  /**
   * 删除租户数据库表
   * @param tenantId 租户ID
   * @param tableName 表名
   */
  async dropTable(tenantId: string, tableName: string): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);
    console.log(`[StorageIsolator] Dropping table ${schemaName}.${tableName}`);
  }

  /**
   * 获取租户的表列表
   * @param tenantId 租户ID
   * @returns 表名列表
   */
  getTables(tenantId: string): string[] {
    const schemas = this.schemas.get(tenantId) ?? [];
    return schemas.map(s => s.columns[0]?.name ?? 'unknown');
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
}
