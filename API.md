# OpenTaiji API 参考文档

> **版本**: 1.0.0
> **更新日期**: 2026年4月18日
> **文档状态**: 开发中

---

## 目录

1. [框架主类](#1-框架主类)
2. [技能系统](#2-技能系统)
3. [记忆系统](#3-记忆系统)
4. [人格系统](#4-人格系统)
5. [进化系统](#5-进化系统)
6. [心跳系统](#6-心跳系统)
7. [多租户系统](#7-多租户系统)
8. [类型定义](#8-类型定义)

---

## 1. 框架主类

### TaijiFramework

框架主类，整合所有子系统，提供统一的API入口。

#### 构造函数

```typescript
new TaijiFramework(config?: TaijiFrameworkConfig)
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| config | TaijiFrameworkConfig | 否 | 框架配置 |

**示例**:

```typescript
import { TaijiFramework } from 'open-taiji';

const framework = new TaijiFramework({
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },
  skillSystem: {
    maxSkillsPerUser: 100
  },
  heartbeat: {
    interval: 30 * 60 * 1000
  }
});
```

#### 方法

##### initialize()

初始化框架及其所有子系统。

```typescript
async initialize(): Promise<void>
```

**示例**:

```typescript
await framework.initialize();
```

##### destroy()

销毁框架，释放所有资源。

```typescript
async destroy(): Promise<void>
```

##### getHeartbeatManager()

获取心跳管理器。

```typescript
getHeartbeatManager(): HeartbeatManager | null
```

**返回值**: HeartbeatManager 实例或 null

##### triggerHeartbeatCheck()

手动触发心跳检查。

```typescript
async triggerHeartbeatCheck(): Promise<CheckResult[]>
```

**返回值**: 检查结果数组

**示例**:

```typescript
const results = await framework.triggerHeartbeatCheck();
for (const result of results) {
  console.log(`[${result.status}] ${result.itemName}: ${result.message}`);
}
```

##### addHeartbeatCheckItem()

添加自定义心跳检查项。

```typescript
addHeartbeatCheckItem(item: CheckItem): void
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| item | CheckItem | 是 | 检查项定义 |

**示例**:

```typescript
framework.addHeartbeatCheckItem({
  id: 'custom-check',
  name: '自定义检查',
  description: '检查自定义业务逻辑',
  severity: 'medium',
  check: async () => ({
    itemId: 'custom-check',
    itemName: '自定义检查',
    status: 'pass',
    message: '检查通过',
    timestamp: new Date()
  })
});
```

##### removeHeartbeatCheckItem()

移除心跳检查项。

```typescript
removeHeartbeatCheckItem(itemId: string): boolean
```

##### updateHeartbeatContext()

更新心跳检查上下文。

```typescript
updateHeartbeatContext(context: Partial<CheckerContext>): void
```

##### getHeartbeatStatus()

获取心跳系统状态。

```typescript
getHeartbeatStatus(): HeartbeatStatus
```

##### getConfig()

获取框架配置。

```typescript
getConfig(): Readonly<Required<TaijiFrameworkConfig>>
```

##### isReady()

检查框架是否已初始化。

```typescript
isReady(): boolean
```

---

## 2. 技能系统

### SkillSystem

技能系统主类，管理技能的注册、安装、执行和卸载。

#### 构造函数

```typescript
new SkillSystem(config: SkillSystemConfig)
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| config | SkillSystemConfig | 是 | 技能系统配置 |

#### 方法

##### registerSkill()

注册新技能。

```typescript
async registerSkill(
  skillInfo: SkillInfoInput,
  userId: string
): Promise<SkillInfo>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skillInfo | SkillInfoInput | 是 | 技能信息 |
| userId | string | 是 | 用户ID |

**示例**:

```typescript
const skill = await skillSystem.registerSkill({
  skillId: 'weather-query',
  name: '天气查询',
  description: '查询城市天气',
  version: '1.0.0',
  author: 'Taiji Team',
  tags: ['weather', 'utility']
}, 'user-001');
```

##### installSkill()

安装技能到用户空间。

```typescript
async installSkill(
  skillId: string,
  userId: string
): Promise<SkillInstallResult>
```

##### uninstallSkill()

卸载用户技能。

```typescript
async uninstallSkill(
  skillId: string,
  userId: string,
  options?: SkillUninstallOptions
): Promise<SkillUninstallResult>
```

##### executeSkill()

执行技能。

```typescript
async executeSkill(
  skillId: string,
  input: Record<string, any>,
  userId: string,
  options?: SkillExecutionOptions
): Promise<SkillExecutionResult>
```

**示例**:

```typescript
const result = await skillSystem.executeSkill(
  'weather-query',
  { city: '北京', format: 'celsius' },
  'user-001'
);

if (result.success) {
  console.log(result.output);
}
```

##### getInstalledSkills()

获取用户已安装的技能列表。

```typescript
async getInstalledSkills(userId: string): Promise<SkillInfo[]>
```

##### searchSkills()

搜索技能。

```typescript
async searchSkills(
  filter: SkillSearchFilter
): Promise<SkillSearchResult>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| filter | SkillSearchFilter | 是 | 搜索过滤条件 |

**示例**:

```typescript
const results = await skillSystem.searchSkills({
  query: '天气',
  tags: ['utility'],
  limit: 10
});
```

##### getSkillStats()

获取技能统计信息。

```typescript
async getSkillStats(
  skillId: string,
  userId: string
): Promise<SkillStats>
```

##### getQuotaInfo()

获取用户配额信息。

```typescript
async getQuotaInfo(
  tenantId: string,
  userId: string
): Promise<SkillQuotaInfo>
```

---

## 3. 记忆系统

### MemorySystem

记忆系统主类，管理记忆的存储、检索和生命周期。

#### 构造函数

```typescript
new MemorySystem(options?: MemorySystemOptions)
```

#### 方法

##### initialize()

初始化记忆系统。

```typescript
async initialize(): Promise<void>
```

##### store()

存储记忆。

```typescript
async store(
  memory: IMemoryInput,
  userId: string
): Promise<string>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| memory | IMemoryInput | 是 | 记忆内容 |
| userId | string | 是 | 用户ID |

**返回值**: 记忆ID

**示例**:

```typescript
const memoryId = await memorySystem.store({
  userId: 'user-001',
  tenantId: 'tenant-001',
  content: '用户询问如何安装Node.js',
  type: MemoryType.CONVERSATION,
  tier: MemoryTier.WARM,
  metadata: {
    topic: 'programming',
    language: 'zh'
  }
}, 'user-001');
```

##### retrieve()

检索相关记忆。

```typescript
async retrieve(
  query: string,
  userId: string,
  options?: IMemoryRetrieveOptions
): Promise<IMemorySearchResult[]>
```

**示例**:

```typescript
const results = await memorySystem.retrieve(
  'Node.js 安装',
  'user-001',
  { limit: 10, minScore: 0.7 }
);

for (const result of results) {
  console.log(`[${(result.score * 100).toFixed(1)}%] ${result.memory.content}`);
}
```

##### getStats()

获取用户记忆统计。

```typescript
async getStats(userId: string): Promise<IMemorySystemStats>
```

##### cleanup()

清理过期记忆。

```typescript
async cleanup(userId: string): Promise<MemoryCleanupResult>
```

##### destroy()

销毁记忆系统。

```typescript
async destroy(): Promise<void>
```

---

## 4. 人格系统

### PersonalitySystem

人格系统主类，管理人格画像、行为分析和特质提取。

#### 构造函数

```typescript
new PersonalitySystem(config?: PersonalitySystemConfig)
```

#### 方法

##### createProfile()

创建人格档案。

```typescript
async createProfile(
  userId: string,
  tenantId: string
): Promise<PersonalityProfile>
```

**示例**:

```typescript
const profile = await personalitySystem.createProfile(
  'user-001',
  'tenant-001'
);
```

##### getProfile()

获取人格画像。

```typescript
async getProfile(userId: string): Promise<PersonalityProfile | null>
```

##### updateProfile()

更新人格画像。

```typescript
async updateProfile(
  userId: string,
  updates: PersonalityUpdateInput
): Promise<PersonalityUpdateResult>
```

##### addBehaviorData()

添加行为数据。

```typescript
async addBehaviorData(
  userId: string,
  behavior: BehaviorData
): Promise<void>
```

**示例**:

```typescript
await personalitySystem.addBehaviorData('user-001', {
  timestamp: new Date(),
  type: 'conversation',
  content: '用户表现出对技术的浓厚兴趣',
  context: { topic: 'AI', mood: 'enthusiastic' }
});
```

##### analyzeBehaviors()

分析用户行为。

```typescript
async analyzeBehaviors(
  userId: string
): Promise<BehaviorAnalysisResult>
```

**返回值**:

```typescript
{
  behaviorCount: number;
  typeDistribution: Record<string, number>;
  patterns: string[];
  confidence: number;
}
```

##### extractTraits()

提取人格特质。

```typescript
async extractTraits(userId: string): Promise<ExtractedTrait[]>
```

##### generateReport()

生成人格报告。

```typescript
async generateReport(
  userId: string,
  type: 'summary' | 'detailed' | 'comparison',
  options?: ReportOptions
): Promise<PersonalityReport>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| type | string | 是 | 报告类型 |
| options | ReportOptions | 否 | 报告选项 |

**示例**:

```typescript
const report = await personalitySystem.generateReport(
  'user-001',
  'detailed'
);

console.log(`报告生成时间: ${report.generatedAt}`);
console.log(`核心特质: ${report.profile.summary.join(', ')}`);
```

##### createSnapshot()

创建人格快照。

```typescript
async createSnapshot(
  userId: string,
  type?: 'full' | 'incremental' | 'milestone'
): Promise<PersonalitySnapshot>
```

##### getSnapshots()

获取快照列表。

```typescript
async getSnapshots(userId: string): Promise<PersonalitySnapshot[]>
```

##### getSnapshot()

获取指定快照。

```typescript
async getSnapshot(snapshotId: string): Promise<PersonalitySnapshot | null>
```

##### validateConsistency()

验证人格一致性。

```typescript
async validateConsistency(
  userId: string
): Promise<ConsistencyValidationResult>
```

##### deleteProfile()

删除人格档案。

```typescript
async deleteProfile(userId: string): Promise<boolean>
```

---

## 5. 进化系统

### EvolutionSystem

进化系统主类，管理框架和用户的持续进化。

#### 构造函数

```typescript
new EvolutionSystem(storageAdapter?: unknown)
```

#### 方法

##### initialize()

初始化进化系统。

```typescript
async initialize(): Promise<void>
```

##### evolve()

触发进化流程。

```typescript
async evolve(context: EvolutionContext): Promise<EvolutionResult>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| context | EvolutionContext | 是 | 进化上下文 |

**示例**:

```typescript
const result = await evolutionSystem.evolve({
  userId: 'user-001',
  tenantId: 'tenant-001',
  triggerType: 'manual',
  metadata: {
    reason: '性能优化'
  }
});

if (result.success) {
  console.log(`进化到版本 ${result.version}`);
  console.log(`改进项: ${result.improvements.join(', ')}`);
}
```

##### getStatus()

获取进化系统状态。

```typescript
async getStatus(): Promise<EvolutionStatus>
```

##### getEvolutionHistory()

获取进化历史。

```typescript
async getEvolutionHistory(
  options: HistoryQueryOptions
): Promise<EvolutionHistoryRecord[]>
```

**示例**:

```typescript
const history = await evolutionSystem.getEvolutionHistory({
  userId: 'user-001',
  tenantId: 'tenant-001',
  limit: 10
});

for (const record of history) {
  console.log(`[${record.timestamp}] ${record.version}: ${record.summary}`);
}
```

##### getAnalysisReport()

获取进化分析报告。

```typescript
async getAnalysisReport(
  userId: string,
  tenantId: string
): Promise<EvolutionAnalysisReport>
```

##### pause()

暂停进化调度。

```typescript
async pause(): Promise<void>
```

##### resume()

恢复进化调度。

```typescript
async resume(): Promise<void>
```

---

## 6. 心跳系统

### HeartbeatManager

心跳系统主类，管理健康检查和异常告警。

#### 方法

##### start()

启动心跳系统。

```typescript
async start(): Promise<void>
```

##### stop()

停止心跳系统。

```typescript
async stop(): Promise<void>
```

##### checkNow()

立即执行所有检查。

```typescript
async checkNow(): Promise<CheckResult[]>
```

##### addCheckItem()

添加检查项。

```typescript
addCheckItem(item: CheckItem): void
```

##### removeCheckItem()

移除检查项。

```typescript
removeCheckItem(itemId: string): boolean
```

##### updateContext()

更新检查上下文。

```typescript
updateContext(context: Partial<CheckerContext>): void
```

##### getStatus()

获取心跳状态。

```typescript
getStatus(): HeartbeatStatus
```

---

## 7. 多租户系统

### TenantManager

租户管理器（计划中）。

### ResourceIsolator

资源隔离器（计划中）。

### TenantRouter

租户路由器（计划中）。

---

## 8. 类型定义

### 枚举类型

#### MemoryTier

记忆热度层级。

```typescript
enum MemoryTier {
  HOT = 'hot',     // 热记忆 - 最近活跃
  WARM = 'warm',   // 温记忆 - 定期访问
  COLD = 'cold'    // 冷记忆 - 归档存储
}
```

#### MemoryType

记忆类型。

```typescript
enum MemoryType {
  CONVERSATION = 'conversation',  // 对话记忆
  KNOWLEDGE = 'knowledge',       // 知识记忆
  TASK = 'task',                 // 任务记忆
  USER = 'user',                 // 用户记忆
  SYSTEM = 'system'              // 系统记忆
}
```

#### TraitType

人格特质类型。

```typescript
enum TraitType {
  EXTRAVERSION_INTROVERSION = 'extraversion_introversion',
  OPENNESS_CONSERVATISM = 'openness_conservatism',
  RATIONALITY_EMOTION = 'rationality_emotion',
  RISK_TOLERANCE = 'risk_tolerance'
}
```

#### CheckSeverity

检查严重级别。

```typescript
enum CheckSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}
```

#### CheckStatus

检查状态。

```typescript
enum CheckStatus {
  PASS = 'pass',
  WARNING = 'warning',
  FAIL = 'fail',
  SKIPPED = 'skipped'
}
```

---

## 错误处理

所有异步方法都可能抛出以下错误类型：

```typescript
// 常见错误类型
class TaijiError extends Error {
  code: string;
  details?: Record<string, any>;
}

class NotFoundError extends TaijiError {
  resourceType: string;
  resourceId: string;
}

class PermissionError extends TaijiError {
  requiredPermission: string;
  userId: string;
}

class QuotaExceededError extends TaijiError {
  quotaType: string;
  current: number;
  limit: number;
}
```

---

## 最佳实践

### 1. 异步操作

```typescript
// 推荐：使用 async/await
try {
  await framework.initialize();
  const results = await framework.triggerHeartbeatCheck();
} catch (error) {
  console.error('操作失败:', error);
}

// 不推荐：避免嵌套回调
framework.initialize().then(() => {
  framework.triggerHeartbeatCheck().then(results => {
    // ...
  });
});
```

### 2. 资源清理

```typescript
// 推荐：使用 try/finally 确保资源释放
async function useFramework() {
  const framework = new TaijiFramework();
  
  try {
    await framework.initialize();
    // 使用框架...
  } finally {
    await framework.destroy();
  }
}
```

### 3. 错误处理

```typescript
// 推荐：区分不同错误类型
try {
  await skillSystem.executeSkill(skillId, input, userId);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('配额超限，请升级您的计划');
  } else if (error instanceof NotFoundError) {
    console.error(`技能 ${error.resourceId} 不存在`);
  } else {
    console.error('未知错误:', error);
  }
}
```

---

## 更新日志

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-18 | 1.0.0 | 初始版本 |

---

## 贡献者

本API文档由OpenTaiji团队维护。

如有问题，请提交 [Issue](https://github.com/open-taiji/open-taiji/issues)。
