/**
 * 资源隔离器接口
 * Resource Isolator Interface
 * 
 * @module Taiji.MultiTenant.Interfaces
 */

import {
  IsolationLevel,
  TenantResourceIdentifiers,
  StorageIsolatorConfig,
  VectorDbIsolatorConfig,
  NetworkIsolatorConfig,
} from '../types';

/**
 * 资源隔离器接口
 * 定义资源隔离的抽象操作
 */
export interface IResourceIsolator {
  /**
   * 获取隔离级别
   */
  getIsolationLevel(): IsolationLevel;

  /**
   * 设置隔离级别
   * @param level 隔离级别
   */
  setIsolationLevel(level: IsolationLevel): void;

  /**
   * 为租户创建隔离资源
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  createIsolation(tenantId: string): Promise<TenantResourceIdentifiers>;

  /**
   * 删除租户的隔离资源
   * @param tenantId 租户ID
   */
  destroyIsolation(tenantId: string): Promise<void>;

  /**
   * 获取租户的隔离资源标识符
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  getIdentifiers(tenantId: string): TenantResourceIdentifiers;

  /**
   * 检查租户是否有隔离资源
   * @param tenantId 租户ID
   * @returns 是否有隔离资源
   */
  hasIsolation(tenantId: string): boolean;

  /**
   * 清理所有隔离资源
   */
  cleanup(): Promise<void>;
}

/**
 * 存储隔离器接口
 * 负责数据库/schema级别的隔离
 */
export interface IStorageIsolator extends IResourceIsolator {
  /**
   * 获取租户的数据库连接配置
   * @param tenantId 租户ID
   * @returns 数据库连接配置
   */
  getConnectionConfig(tenantId: string): Promise<StorageConnectionConfig>;

  /**
   * 获取租户的schema名称
   * @param tenantId 租户ID
   * @returns Schema名称
   */
  getSchemaName(tenantId: string): string;

  /**
   * 执行租户内的数据库迁移
   * @param tenantId 租户ID
   * @param migrations 迁移脚本
   */
  runMigrations(tenantId: string, migrations: string[]): Promise<void>;

  /**
   * 创建租户数据库表
   * @param tenantId 租户ID
   * @param tableName 表名
   * @param schema 表结构
   */
  createTable(tenantId: string, tableName: string, schema: TableSchema): Promise<void>;

  /**
   * 删除租户数据库表
   * @param tenantId 租户ID
   * @param tableName 表名
   */
  dropTable(tenantId: string, tableName: string): Promise<void>;
}

/**
 * 向量数据库隔离器接口
 * 负责向量数据库collection级别的隔离
 */
export interface IVectorDbIsolator extends IResourceIsolator {
  /**
   * 获取租户的Collection名称
   * @param tenantId 租户ID
   * @returns Collection名称
   */
  getCollectionName(tenantId: string): string;

  /**
   * 获取租户的Collection配置
   * @param tenantId 租户ID
   * @returns Collection配置
   */
  getCollectionConfig(tenantId: string): VectorCollectionConfig;

  /**
   * 创建租户的Collection
   * @param tenantId 租户ID
   * @param config Collection配置
   */
  createCollection(tenantId: string, config: VectorCollectionConfig): Promise<void>;

  /**
   * 删除租户的Collection
   * @param tenantId 租户ID
   */
  deleteCollection(tenantId: string): Promise<void>;

  /**
   * 检查Collection是否存在
   * @param tenantId 租户ID
   * @returns 是否存在
   */
  collectionExists(tenantId: string): Promise<boolean>;

  /**
   * 获取Collection统计信息
   * @param tenantId 租户ID
   * @returns 统计信息
   */
  getCollectionStats(tenantId: string): Promise<CollectionStats>;
}

/**
 * 网络隔离器接口
 * 负责Kubernetes namespace级别的隔离
 */
export interface INetworkIsolator extends IResourceIsolator {
  /**
   * 获取租户的命名空间名称
   * @param tenantId 租户ID
   * @returns 命名空间名称
   */
  getNamespace(tenantId: string): string;

  /**
   * 创建租户的命名空间
   * @param tenantId 租户ID
   */
  createNamespace(tenantId: string): Promise<void>;

  /**
   * 删除租户的命名空间
   * @param tenantId 租户ID
   */
  deleteNamespace(tenantId: string): Promise<void>;

  /**
   * 应用网络策略
   * @param tenantId 租户ID
   * @param policy 网络策略配置
   */
  applyNetworkPolicy(tenantId: string, policy: NetworkPolicy): Promise<void>;

  /**
   * 获取网络策略
   * @param tenantId 租户ID
   * @returns 网络策略配置
   */
  getNetworkPolicy(tenantId: string): Promise<NetworkPolicy | null>;

  /**
   * 获取租户的Redis Key前缀
   * @param tenantId 租户ID
   * @returns Redis Key前缀
   */
  getRedisKeyPrefix(tenantId: string): string;
}

// ============== 辅助类型 ==============

/**
 * 数据库连接配置
 */
export interface StorageConnectionConfig {
  /** 数据库类型 */
  type: 'postgresql' | 'mysql' | 'sqlite';
  /** 主机 */
  host?: string;
  /** 端口 */
  port?: number;
  /** 数据库名称 */
  database: string;
  /** Schema名称 */
  schema?: string;
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
}

/**
 * 表结构定义
 */
export interface TableSchema {
  /** 列定义 */
  columns: ColumnDefinition[];
  /** 主键 */
  primaryKey?: string[];
  /** 索引 */
  indexes?: IndexDefinition[];
  /** 外键 */
  foreignKeys?: ForeignKeyDefinition[];
}

/**
 * 列定义
 */
export interface ColumnDefinition {
  /** 列名 */
  name: string;
  /** 数据类型 */
  type: string;
  /** 是否可空 */
  nullable?: boolean;
  /** 默认值 */
  default?: string | number | boolean;
  /** 约束 */
  constraints?: string[];
}

/**
 * 索引定义
 */
export interface IndexDefinition {
  /** 索引名 */
  name: string;
  /** 索引列 */
  columns: string[];
  /** 是否唯一 */
  unique?: boolean;
  /** 索引类型 */
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

/**
 * 外键定义
 */
export interface ForeignKeyDefinition {
  /** 外键名 */
  name: string;
  /** 列名 */
  column: string;
  /** 引用表 */
  references: string;
  /** 引用列 */
  referencesColumn: string;
  /** 删除时动作 */
  onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
  /** 更新时动作 */
  onUpdate?: 'cascade' | 'restrict' | 'set null' | 'no action';
}

/**
 * 向量Collection配置
 */
export interface VectorCollectionConfig {
  /** Collection名称 */
  name: string;
  /** 向量维度 */
  dimension: number;
  /** 距离度量方式 */
  distance?: 'Cosine' | 'Euclidean' | 'Dot';
  /** 索引类型 */
  index?: {
    type: string;
    options?: Record<string, unknown>;
  };
  /** 分片数 */
  shardNumber?: number;
  /** 复制因子 */
  replicationFactor?: number;
}

/**
 * Collection统计信息
 */
export interface CollectionStats {
  /** Collection名称 */
  name: string;
  /** 向量数量 */
  vectorsCount: number;
  /** 索引大小 */
  indexSize: number;
  /** 数据大小 */
  dataSize: number;
}

/**
 * 网络策略配置
 */
export interface NetworkPolicy {
  /** 策略名称 */
  name: string;
  /** 入站规则 */
  ingress?: NetworkRule[];
  /** 出站规则 */
  egress?: NetworkRule[];
  /** 标签选择器 */
  podSelector?: Record<string, string>;
}

/**
 * 网络规则
 */
export interface NetworkRule {
  /** 协议 */
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  /** 端口 */
  ports?: number | number[] | string;
  /** 来源CIDR */
  from?: string[];
  /** 目标CIDR */
  to?: string[];
}
