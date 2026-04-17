/**
 * 网络隔离器
 * Network Isolator - Kubernetes namespace级别隔离
 * 
 * @module Kunlun.MultiTenant.Isolation
 */

import {
  Tenant,
  TenantResourceIdentifiers,
  NetworkIsolatorConfig,
  IsolationLevel,
} from '../types';
import {
  INetworkIsolator,
  NetworkPolicy,
  NetworkRule,
} from '../interfaces';
import { ResourceIsolator } from './ResourceIsolator';

/**
 * 网络隔离器配置
 */
export interface KunlunNetworkIsolatorConfig extends NetworkIsolatorConfig {
  /** Kubernetes API Server URL */
  kubeApiServer?: string;
  /** Kubernetes命名空间前缀 */
  namespacePrefix?: string;
  /** Redis前缀 */
  redisPrefix?: string;
  /** 是否启用网络策略 */
  networkPolicyEnabled?: boolean;
}

/**
 * 网络隔离器
 * 负责Kubernetes namespace级别的资源隔离
 * 
 * @example
 * ```typescript
 * const isolator = new NetworkIsolator({
 *   isolationLevel: 'standard',
 *   namespacePrefix: 'kunlun-tenant-',
 *   networkPolicyEnabled: true,
 * });
 * 
 * // 为租户创建命名空间
 * await isolator.createNamespace('tenant_001');
 * 
 * // 应用网络策略
 * await isolator.applyNetworkPolicy('tenant_001', {
 *   name: 'default-deny',
 *   ingress: [{ protocol: 'all', from: [] }],
 *   egress: [{ protocol: 'all', to: [] }],
 * });
 * ```
 */
export class NetworkIsolator extends ResourceIsolator implements INetworkIsolator {
  private config: KunlunNetworkIsolatorConfig;
  private namespaces: Set<string> = new Set();
  private networkPolicies: Map<string, NetworkPolicy> = new Map();
  private namespacePrefix: string;
  private redisPrefix: string;

  constructor(config: KunlunNetworkIsolatorConfig) {
    super(config.isolationLevel ?? IsolationLevel.STANDARD);
    this.namespacePrefix = config.namespacePrefix ?? 'kunlun-tenant-';
    this.redisPrefix = config.redisPrefix ?? 'kunlun:tenant:';
    this.config = {
      kubeApiServer: config.kubeApiServer ?? 'https://kubernetes.default.svc',
      networkPolicyEnabled: config.networkPolicyEnabled ?? true,
      ...config,
    };
  }

  /**
   * 为租户创建隔离资源
   * @param tenantId 租户ID
   * @returns 隔离资源标识符
   */
  async createIsolation(tenantId: string): Promise<TenantResourceIdentifiers> {
    const namespace = this.getNamespace(tenantId);

    const identifiers: TenantResourceIdentifiers = {
      tenantId,
      namespace,
      redisKeyPrefix: `${this.redisPrefix}${tenantId}:`,
    };

    // 创建命名空间
    await this.createNamespace(tenantId);

    // 应用默认网络策略
    if (this.config.networkPolicyEnabled) {
      const defaultPolicy = this.createDefaultPolicy(tenantId);
      await this.applyNetworkPolicy(tenantId, defaultPolicy);
    }

    this.storeIdentifiers(tenantId, identifiers);
    return identifiers;
  }

  /**
   * 删除租户的隔离资源
   * @param tenantId 租户ID
   */
  async destroyIsolation(tenantId: string): Promise<void> {
    // 删除命名空间
    await this.deleteNamespace(tenantId);

    // 清理网络策略
    this.networkPolicies.delete(tenantId);

    this.removeIdentifiers(tenantId);
    this.namespaces.delete(tenantId);
  }

  /**
   * 获取租户的命名空间名称
   * @param tenantId 租户ID
   * @returns 命名空间名称
   */
  getNamespace(tenantId: string): string {
    return `${this.namespacePrefix}${tenantId}`;
  }

  /**
   * 创建租户的命名空间
   * @param tenantId 租户ID
   */
  async createNamespace(tenantId: string): Promise<void> {
    const namespace = this.getNamespace(tenantId);
    console.log(`[NetworkIsolator] Creating namespace: ${namespace}`);
    this.namespaces.add(namespace);
  }

  /**
   * 删除租户的命名空间
   * @param tenantId 租户ID
   */
  async deleteNamespace(tenantId: string): Promise<void> {
    const namespace = this.getNamespace(tenantId);
    console.log(`[NetworkIsolator] Deleting namespace: ${namespace}`);
    this.namespaces.delete(namespace);
  }

  /**
   * 应用网络策略
   * @param tenantId 租户ID
   * @param policy 网络策略配置
   */
  async applyNetworkPolicy(tenantId: string, policy: NetworkPolicy): Promise<void> {
    const namespace = this.getNamespace(tenantId);
    console.log(`[NetworkIsolator] Applying network policy to ${namespace}: ${policy.name}`);
    this.networkPolicies.set(`${tenantId}:${policy.name}`, policy);
  }

  /**
   * 获取网络策略
   * @param tenantId 租户ID
   * @returns 网络策略配置
   */
  async getNetworkPolicy(tenantId: string): Promise<NetworkPolicy | null> {
    // 返回第一个匹配的网络策略
    for (const [key, policy] of this.networkPolicies.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        return policy;
      }
    }
    return null;
  }

  /**
   * 获取租户的Redis Key前缀
   * @param tenantId 租户ID
   * @returns Redis Key前缀
   */
  getRedisKeyPrefix(tenantId: string): string {
    return `${this.redisPrefix}${tenantId}:`;
  }

  /**
   * 创建默认网络策略
   * @param tenantId 租户ID
   * @returns 网络策略
   */
  private createDefaultPolicy(tenantId: string): NetworkPolicy {
    return {
      name: `default-allow-${tenantId}`,
      ingress: [
        {
          protocol: 'tcp',
          ports: [80, 443],
          from: ['0.0.0.0/0'],
        },
      ],
      egress: [
        {
          protocol: 'tcp',
          ports: [80, 443, 53, 5432],
          to: ['0.0.0.0/0'],
        },
        {
          protocol: 'udp',
          ports: [53],
          to: ['0.0.0.0/0'],
        },
      ],
      podSelector: {
        app: tenantId,
      },
    };
  }

  /**
   * 获取所有命名空间
   * @returns 命名空间列表
   */
  getAllNamespaces(): string[] {
    return Array.from(this.namespaces);
  }

  /**
   * 获取租户的所有网络策略
   * @param tenantId 租户ID
   * @returns 网络策略列表
   */
  getAllPolicies(tenantId: string): NetworkPolicy[] {
    const policies: NetworkPolicy[] = [];
    for (const [key, policy] of this.networkPolicies.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        policies.push(policy);
      }
    }
    return policies;
  }

  /**
   * 删除网络策略
   * @param tenantId 租户ID
   * @param policyName 策略名称
   */
  async deleteNetworkPolicy(tenantId: string, policyName: string): Promise<void> {
    this.networkPolicies.delete(`${tenantId}:${policyName}`);
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
