# 昆仑框架架构设计

> **版本**: 1.0.0
> **更新日期**: 2026年4月18日

---

## 一、整体架构

### 1.1 架构概览

昆仑框架采用五层架构设计，从上到下依次是：

```
┌─────────────────────────────────────────────────────────┐
│ L1 接入层（用户交互）                                     │
│   ├── Web UI / 移动端 / 终端                             │
│   └── 20+消息平台网关（适配器模式）                       │
├─────────────────────────────────────────────────────────┤
│ L2 网关层（安全边界）⭐                                   │
│   ├── API Gateway                                       │
│   ├── JWT/OAuth2认证                                    │
│   ├── 限流熔断                                          │
│   └── 消息路由                                          │
├─────────────────────────────────────────────────────────┤
│ L3 协调层（多代理编排）⭐                                 │
│   ├── Actor Mesh（多租户）                              │
│   ├── Dreaming System                                   │
│   └── 多代理协调器                                      │
├─────────────────────────────────────────────────────────┤
│ L4 执行层（技能与推理）                                   │
│   ├── Skill Engine（接口+适配器）                       │
│   ├── Memory Hub（接口+适配器）                         │
│   ├── 人格蒸馏引擎                                      │
│   ├── 自我进化引擎                                      │
│   └── 工具执行沙箱                                      │
├─────────────────────────────────────────────────────────┤
│ L5 数据层（持久化存储）                                   │
│   ├── PostgreSQL（结构化数据）                          │
│   ├── Qdrant（向量数据库）                              │
│   ├── Redis（缓存）                                     │
│   └── Kafka（消息队列）                                  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **接口与实现分离**：框架提供接口定义，具体实现可替换
2. **适配器模式**：支持多种后端存储和服务
3. **多租户隔离**：默认完全隔离，需要时显式共享
4. **安全默认**：安全机制默认开启，按需降低
5. **可观测性**：内置日志、监控和审计功能

---

## 二、核心模块架构

### 2.1 框架主模块 (KunlunFramework)

**位置**: `src/core/KunlunFramework.ts`

**职责**:
- 整合所有子系统
- 提供统一的初始化和生命周期管理
- 协调各模块间的通信

**核心接口**:

```typescript
interface IKunlunFramework {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getSkillSystem(): ISkillSystem;
  getMemorySystem(): IMemorySystem;
  getPersonalitySystem(): IPersonalitySystem;
  getEvolutionSystem(): IEvolutionSystem;
  getHeartbeatManager(): HeartbeatManager;
}
```

### 2.2 技能系统 (SkillSystem)

**位置**: `src/modules/skill-system/`

**架构图**:

```
┌─────────────────────────────────────────────────────────┐
│                    SkillSystem                          │
├─────────────────────────────────────────────────────────┤
│  SkillRegistry    │  技能注册表（多租户支持）            │
│  SkillExecutor     │  技能执行器（沙箱隔离）             │
│  SkillInstaller    │  技能安装器                         │
│  SkillValidator    │  技能验证器（签名/安全）             │
├─────────────────────────────────────────────────────────┤
│  SkillEnvironment  │  隔离环境（venv/container）         │
│  DependencyResolver│  依赖解析器                         │
│  SkillHooks        │  生命周期钩子（12个钩子点）         │
│  SkillQuotaManager  │  配额管理器                         │
└─────────────────────────────────────────────────────────┘
```

**核心特性**:
- 多租户隔离的技能注册表
- 进程级沙箱执行环境
- 支持venv和Docker容器隔离
- 12个生命周期钩子点
- 完整的依赖管理

### 2.3 记忆系统 (MemorySystem)

**位置**: `src/modules/memory-system/`

**架构图**:

```
┌─────────────────────────────────────────────────────────┐
│                    MemorySystem                          │
├─────────────────────────────────────────────────────────┤
│  MemoryStore     │  记忆存储（分层管理）                  │
│  MemoryIndexer   │  记忆索引（向量+关键词）               │
│  MemoryRetriever │  记忆检索（语义搜索）                 │
│  MemoryProcessor │  记忆处理器                           │
├─────────────────────────────────────────────────────────┤
│  MemoryConsolidator│  记忆巩固器                        │
│  MemoryPruner     │  记忆修剪器                          │
│  MemoryLinker     │  记忆链接器（知识图谱）              │
│  ImportanceScorer │  重要性评分器                        │
├─────────────────────────────────────────────────────────┤
│  VectorStoreAdapter│  向量存储适配器                    │
│  QdrantAdapter    │  Qdrant适配器                       │
└─────────────────────────────────────────────────────────┘
```

**记忆层级**:

```
HOT (热记忆)
├── 最近对话 (最近24小时)
├── 活跃任务 (进行中)
└── 紧急信息 (高优先级)

WARM (温记忆)
├── 近期知识 (最近7天)
├── 重要关系 (频繁访问)
└── 学习进度 (进行中学习)

COLD (冷记忆)
├── 历史对话 (归档)
├── 完成任务 (归档)
└── 知识库 (静态知识)
```

### 2.4 人格系统 (PersonalitySystem)

**位置**: `src/modules/personality-system/`

**架构图**:

```
┌─────────────────────────────────────────────────────────┐
│                 PersonalitySystem                        │
├─────────────────────────────────────────────────────────┤
│  PersonalityModel   │  人格模型（五维画像）              │
│  PersonalityDistiller│  人格蒸馏器                      │
│  PersonalityUpdater │  人格更新器                       │
│  BehaviorCollector  │  行为收集器                       │
│  BehaviorAnalyzer   │  行为分析器                       │
├─────────────────────────────────────────────────────────┤
│  PersonalityValidator│  一致性验证器                    │
│  PersonalitySnapshot│  快照管理器                       │
│  PersonalityReporter│  报告生成器                       │
│  TraitManager       │  特质管理器                       │
└─────────────────────────────────────────────────────────┘
```

**五维画像**:

1. **personality** - 人格特质
   - extraversion_introversion（外向/内向）
   - openness_conservatism（开放/保守）
   - rationality_emotion（理性/情感）
   - risk_tolerance（风险偏好）

2. **perspective** - 视角偏好
   - decision_style（决策风格）
   - information_processing（信息处理）
   - communication_preference（沟通偏好）

3. **worldview** - 世界观
   - optimism（乐观程度）
   - causality（因果观念）

4. **values** - 价值观
   - achievement（成就导向）
   - security（安全导向）

5. **life_outlook** - 人生观
   - growth_mindset（成长心态）
   - purpose（人生目标）

### 2.5 进化系统 (EvolutionSystem)

**位置**: `src/modules/evolution-system/`

**架构图**:

```
┌─────────────────────────────────────────────────────────┐
│                  EvolutionSystem                         │
├─────────────────────────────────────────────────────────┤
│  EvolutionEngine    │  进化引擎                          │
│  EvolutionScheduler │  进化调度器                        │
│  EvolutionLogger    │  进化日志                          │
│  EvolutionHistory   │  进化历史                          │
│  EvolutionAnalyzer  │  进化分析器                        │
├─────────────────────────────────────────────────────────┤
│  GeneticStrategy    │  遗传算法策略                      │
│  GradientStrategy   │  梯度策略                          │
│  ReinforcementStrategy│  强化学习策略                    │
├─────────────────────────────────────────────────────────┤
│  RewardModel        │  奖励模型                          │
│  TraitManager       │  特质管理器                        │
│  TraitMutator       │  特质变异器                        │
│  TraitValidator     │  特质验证器                        │
└─────────────────────────────────────────────────────────┘
```

### 2.6 心跳系统 (HeartbeatManager)

**位置**: `src/core/heartbeat/`

**架构图**:

```
┌─────────────────────────────────────────────────────────┐
│                 HeartbeatManager                        │
├─────────────────────────────────────────────────────────┤
│  HeartbeatChecker   │  检查执行器                        │
│  HeartbeatScheduler │  定时调度器                        │
│  BuiltinCheckers    │  内置检查器                        │
├─────────────────────────────────────────────────────────┤
│  CheckItem          │  检查项定义                        │
│  CheckResult        │  检查结果                          │
│  CheckerContext     │  检查上下文                        │
└─────────────────────────────────────────────────────────┘
```

**内置检查器**:

| 检查器 | 说明 | 严重级别 |
|--------|------|----------|
| persona_compliance | 人设合规检查 | HIGH |
| tool_call | 工具调用检查 | HIGH |
| memory_pollution | 记忆污染检查 | MEDIUM |
| task_completion | 任务完成检查 | MEDIUM |
| system_health | 系统健康检查 | LOW |

---

## 三、适配器架构

### 3.1 适配器模式

昆仑框架大量使用适配器模式，以支持多种后端实现：

```
┌─────────────────────────────────────────────────────────┐
│                     适配器接口                           │
├─────────────────────────────────────────────────────────┤
│  IStorageAdapter    │  存储适配器                        │
│  IVectorDBAdapter   │  向量数据库适配器                  │
│  IMessageAdapter    │  消息适配器                        │
│  ILLMAdapter        │  LLM适配器                         │
│  IAuthAdapter       │  认证适配器                        │
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                     具体实现                             │
├─────────────────────────────────────────────────────────┤
│  DatabaseAdapter    │  PostgreSQL/MySQL实现             │
│  QdrantAdapter      │  Qdrant向量库实现                  │
│  RedisAdapter       │  Redis缓存实现                    │
│  KafkaAdapter       │  Kafka消息队列实现                │
└─────────────────────────────────────────────────────────┘
```

### 3.2 存储适配器

```typescript
interface IStorageAdapter {
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // 基础操作
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  
  // 事务支持
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  
  // 模式管理
  createTable(name: string, schema: TableSchema): Promise<void>;
  dropTable(name: string): Promise<void>;
}
```

### 3.3 向量数据库适配器

```typescript
interface IVectorDBAdapter {
  // 集合管理
  createCollection(name: string, dimension: number): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  
  // 向量操作
  insert(collection: string, vectors: Vector[]): Promise<string[]>;
  search(collection: string, query: Vector, limit: number): Promise<SearchResult[]>;
  
  // 元数据
  upsert(collection: string, id: string, vector: Vector, metadata: any): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
}
```

---

## 四、安全架构

### 4.1 安全层级

```
┌─────────────────────────────────────────────────────────┐
│                     安全层级                            │
├─────────────────────────────────────────────────────────┤
│  L1 网络安全     │  TLS加密 / VPN / WAF                 │
│  L2 认证授权     │  JWT / OAuth2 / API Key              │
│  L3 权限控制     │  RBAC / ABAC / 资源级别权限          │
│  L4 数据隔离     │  多租户隔离 / 数据加密               │
│  L5 操作审计     │  完整操作日志 / 审计追踪             │
└─────────────────────────────────────────────────────────┘
```

### 4.2 权限模型

**六类五级权限**:

| 类别 | 级别 |
|------|------|
| 读取 (R) | 1-只读租户数据 |
| 写入 (W) | 2-可写个人数据 |
| 执行 (X) | 3-可执行技能 |
| 管理 (M) | 4-可管理租户 |
| 审计 (A) | 5-可审计所有 |

### 4.3 敏感操作检测

```typescript
interface SensitiveOperationDetector {
  // 危险命令检测
  detectDangerousCommands(command: string): DetectionResult;
  
  // 敏感文件访问检测
  detectSensitiveFileAccess(path: string): DetectionResult;
  
  // 网络访问检测
  detectNetworkAccess(url: string): DetectionResult;
  
  // 系统修改检测
  detectSystemModification(path: string): DetectionResult;
}
```

---

## 五、多租户架构

### 5.1 多租户隔离

```
┌─────────────────────────────────────────────────────────┐
│                     多租户架构                          │
├─────────────────────────────────────────────────────────┤
│  TenantManager     │  租户管理器                         │
│  ResourceIsolator  │  资源隔离器                         │
│  TenantRouter      │  租户路由器                         │
├─────────────────────────────────────────────────────────┤
│  隔离级别:                                               │
│  • strict    - 完全隔离（推荐生产环境）                   │
│  • standard  - 标准隔离（默认）                          │
│  • shared    - 共享资源（仅开发测试）                    │
└─────────────────────────────────────────────────────────┘
```

### 5.2 资源隔离

每个租户拥有独立的：

- 技能注册表
- 记忆存储
- 人格画像
- 进化历史
- 配额限制
- 审计日志

---

## 六、数据流架构

### 6.1 请求处理流程

```
用户请求
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  1. 网关层（认证、限流、路由）                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  2. 协调层（Actor编排、Dreaming）                        │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  3. 执行层（技能执行、人格蒸馏）                         │
│  ├── Skill Executor                                     │
│  ├── Memory Retrieval                                   │
│  └── Personality Analysis                              │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  4. 数据层（存储、索引、缓存）                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
响应用户
```

### 6.2 记忆处理流程

```
新对话/事件
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  收集器 (Collector)                                     │
│  • 提取关键信息                                         │
│  • 打标签和分类                                         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  评分器 (Scorer)                                        │
│  • 计算重要性分数                                       │
│  • 确定存储层级                                         │
└─────────────────────────────────────────────────────────┘
    │
    ├─── HOT ────→ 活跃对话缓存
    ├─── WARM ───→ 最近记忆库
    └─── COLD ───→ 向量数据库归档
```

### 6.3 人格蒸馏流程

```
行为数据收集
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  行为分析器 (Analyzer)                                  │
│  • 模式识别                                             │
│  • 趋势检测                                             │
│  • 异常发现                                             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  特质提取器 (Extractor)                                 │
│  • 五维画像映射                                         │
│  • 置信度计算                                           │
│  • 证据关联                                             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  一致性验证器 (Validator)                                │
│  • 逻辑一致性                                           │
│  • 时序一致性                                           │
│  • 异常检测                                             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
人格画像更新 + 快照保存
```

---

## 七、扩展点架构

### 7.1 扩展点定义

```typescript
enum ExtensionPoint {
  // 技能系统
  SKILL_BEFORE_INSTALL = 'skill:beforeInstall',
  SKILL_AFTER_INSTALL = 'skill:afterInstall',
  SKILL_BEFORE_EXECUTE = 'skill:beforeExecute',
  SKILL_AFTER_EXECUTE = 'skill:afterExecute',
  
  // 记忆系统
  MEMORY_BEFORE_STORE = 'memory:beforeStore',
  MEMORY_AFTER_RETRIEVE = 'memory:afterRetrieve',
  
  // 人格系统
  PERSONALITY_BEFORE_UPDATE = 'personality:beforeUpdate',
  PERSONALITY_AFTER_EXTRACT = 'personality:afterExtract',
  
  // 进化系统
  EVOLUTION_BEFORE_EVOLVE = 'evolution:beforeEvolve',
  EVOLUTION_AFTER_EVOLVE = 'evolution:afterEvolve',
  
  // 安全
  SECURITY_BEFORE_COMMAND = 'security:beforeCommand',
  SECURITY_AFTER_COMMAND = 'security:afterCommand'
}
```

### 7.2 扩展点使用

```typescript
// 注册扩展
framework.registerExtension({
  point: ExtensionPoint.SKILL_BEFORE_EXECUTE,
  handler: async (context) => {
    console.log('技能执行前:', context.skillId);
    return context;
  }
});
```

---

## 八、部署架构

### 8.1 单机部署

适用于开发测试和小规模应用：

```
┌─────────────────────────────────────────────────────────┐
│                    单机部署                             │
├─────────────────────────────────────────────────────────┤
│  Node.js 应用                                           │
│  ├── Kunlun Framework                                   │
│  ├── SQLite / PostgreSQL                                │
│  ├── Qdrant (可选)                                      │
│  └── Redis (可选)                                       │
└─────────────────────────────────────────────────────────┘
```

### 8.2 分布式部署

适用于生产环境：

```
┌─────────────────────────────────────────────────────────┐
│                   分布式部署                            │
├─────────────────────────────────────────────────────────┤
│  负载均衡器                                             │
│      │                                                  │
│      ├─── API Server 1                                  │
│      ├─── API Server 2                                  │
│      └─── API Server N                                  │
│              │                                          │
│      ┌───────┴───────┐                                  │
│      │               │                                  │
│  PostgreSQL      Qdrant Cluster                         │
│  Cluster         (向量数据库)                            │
│      │               │                                  │
│      └───────┬───────┘                                  │
│              │                                          │
│          Redis Cluster                                  │
│          (缓存/会话)                                     │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Kubernetes部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kunlun-framework
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kunlun-framework
  template:
    metadata:
      labels:
        app: kunlun-framework
    spec:
      containers:
      - name: kunlun
        image: kunlun-framework:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kunlun-secrets
              key: database-url
```

---

## 九、性能优化

### 9.1 缓存策略

```
┌─────────────────────────────────────────────────────────┐
│                     缓存层级                            │
├─────────────────────────────────────────────────────────┤
│  L1 进程内缓存    │  热点数据 (< 1ms)                   │
│  L2 Redis缓存     │  共享数据 (< 10ms)                   │
│  L3 数据库缓存     │  查询结果 (< 100ms)                  │
│  L4 持久化存储     │  归档数据 (> 100ms)                  │
└─────────────────────────────────────────────────────────┘
```

### 9.2 连接池配置

```typescript
const config = {
  database: {
    pool: {
      min: 5,
      max: 20,
      idleTimeout: 30000
    }
  },
  redis: {
    pool: {
      max: 50
    }
  }
};
```

---

## 十、监控与可观测性

### 10.1 指标体系

| 指标类型 | 示例 | 采集方式 |
|----------|------|----------|
| 系统指标 | CPU/内存/磁盘 | Node.js原生 |
| 应用指标 | 请求数/延迟 | 自定义埋点 |
| 业务指标 | 技能执行/记忆检索 | 框架内置 |
| 安全指标 | 认证失败/敏感操作 | 安全模块 |

### 10.2 日志规范

```typescript
// 结构化日志
logger.info('skill_executed', {
  skillId: 'weather-query',
  userId: 'user-001',
  executionTime: 123,
  success: true
});
```

---

## 附录

### A. 目录结构

```
kunlun-framework/
├── src/
│   ├── core/
│   │   ├── KunlunFramework.ts
│   │   ├── heartbeat/
│   │   └── interfaces/
│   ├── modules/
│   │   ├── skill-system/
│   │   ├── memory-system/
│   │   ├── personality-system/
│   │   └── evolution-system/
│   └── adapters/
│       ├── storage/
│       └── vector-db/
├── tests/
│   ├── integration/
│   └── modules/
├── examples/
├── config/
└── docs/
```

### B. 版本兼容性

| Node.js | Kunlun Framework |
|---------|------------------|
| >= 20.0 | 1.0.0+ |
| >= 18.0 | 0.x (legacy) |

### C. 许可证

Apache License 2.0
