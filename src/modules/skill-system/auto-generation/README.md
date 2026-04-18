# OpenTaiji 技能自进化系统

基于 OpenTaiji Actor 运行时实现的自动技能生成闭环系统。通过任务轨迹分析、模式提取、技能生成和进化优化，实现从"重复操作"到"可复用能力"的转化。

## 核心理念

```
任务执行 → 轨迹记录 → 模式提取 → 技能生成 → 进化优化
    ↑                                              ↓
    └────────────── 技能复用 ←─────────────────────┘
```

OpenTaiji 的技能系统遵循**"能力沉淀 → 进化优化 → 能力复用"**的闭环理念，让智能体在使用中不断成长。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                OpenTaiji Skill Auto-Generation              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Actor 执行任务                                            │
│       │                                                     │
│       ▼                                                     │
│   TaskCompletionHook ──► 记录任务轨迹                       │
│       │                                                     │
│       ▼                                                     │
│   TaskPatternAnalyzer                                       │
│       ├── 步骤提取                                          │
│       ├── 模式识别                                          │
│       └── 价值评估                                          │
│       │                                                     │
│       ▼                                                     │
│   SkillAutoGenerator                                        │
│       ├── SKILL.md 生成                                     │
│       ├── LLM 优化（可选）                                  │
│       └── 验证 & 注册                                       │
│       │                                                     │
│       ▼                                                     │
│   SkillEvolutionTracker                                     │
│       ├── 使用统计                                          │
│       ├── 反馈收集                                          │
│       └── 版本进化                                          │
│       │                                                     │
│       ▼                                                     │
│   下次任务 ──► ActorSkillIntegration ──► 匹配已有技能       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 闭环流程

### 1. 任务轨迹记录

每次任务完成后，自动记录执行轨迹：

```typescript
interface TaskTrajectory {
  taskId: string;
  taskType: string;
  steps: Step[];
  context: TaskContext;
  result: TaskResult;
  feedback?: UserFeedback;
}
```

### 2. 模式提取

分析历史轨迹，提取可复用模式：

- **步骤模式**：识别重复的操作序列
- **参数模式**：提取可参数化的变量
- **条件模式**：发现分支和决策逻辑

### 3. 技能生成

自动生成符合 OpenTaiji 标准的技能文件：

```markdown
# SKILL.md

## 技能名称
数据分析报告生成

## 描述
自动从数据源提取信息，生成结构化分析报告

## 参数
- dataSource: 数据源路径
- outputFormat: 输出格式 (markdown/json/html)
- language: 报告语言

## 步骤
1. 验证数据源
2. 提取关键指标
3. 生成可视化图表
4. 组装报告内容

## 示例
...
```

### 4. 进化优化

基于使用数据持续优化：

- **效果追踪**：成功率、耗时、用户满意度
- **版本迭代**：参数调整、步骤优化
- **废弃检测**：自动清理低效技能

## 快速开始

### 安装

```bash
npm install @opentaiji/skill-auto-generation
```

### 基本配置

```typescript
import { 
  TaskCompletionHook,
  SkillAutoGenerator,
  SkillEvolutionTracker 
} from '@opentaiji/skill-auto-generation';

// 初始化组件
const tracker = new SkillEvolutionTracker({
  storageDir: './skills',
  minUsageForEvolution: 10
});

const generator = new SkillAutoGenerator({
  outputDir: './skills',
  llmOptimizer: myLLMClient, // 可选
});

const hook = new TaskCompletionHook({
  generator,
  tracker,
  threshold: {
    minOccurrences: 3,
    minConfidence: 0.7
  }
});
```

### 集成到 Actor

```typescript
import { Actor } from '@opentaiji/actor';
import { ActorSkillIntegration } from '@opentaiji/skill-auto-generation';

class MyActor extends Actor {
  private skillIntegration: ActorSkillIntegration;

  async preStart() {
    this.skillIntegration = new ActorSkillIntegration({
      actor: this,
      skillDir: './skills'
    });
  }

  async receive(message) {
    // 尝试匹配已有技能
    const skill = await this.skillIntegration.matchSkill(message);
    
    if (skill) {
      // 使用技能执行
      await skill.execute(message);
    } else {
      // 常规处理
      await this.handleTask(message);
    }
  }

  async postTask(task) {
    // 记录任务轨迹
    await this.skillIntegration.recordTrajectory(task);
  }
}
```

## 核心组件

### TaskPatternAnalyzer

任务模式分析器：

```typescript
const analyzer = new TaskPatternAnalyzer();

// 分析轨迹
const patterns = await analyzer.analyze(trajectories);

// 输出
patterns.forEach(p => {
  console.log(`模式: ${p.name}`);
  console.log(`置信度: ${p.confidence}`);
  console.log(`价值分: ${p.valueScore}`);
});
```

### SkillAutoGenerator

技能自动生成器：

```typescript
const generator = new SkillAutoGenerator({
  outputDir: './skills',
  templateDir: './templates',
  llmOptimizer: llmClient // 可选
});

// 生成技能
const skill = await generator.generate(pattern);
console.log(`技能已生成: ${skill.path}`);
```

### SkillEvolutionTracker

技能进化追踪器：

```typescript
const tracker = new SkillEvolutionTracker();

// 记录使用
await tracker.recordUsage(skillId, {
  success: true,
  duration: 1200,
  userFeedback: 'positive'
});

// 获取进化建议
const suggestions = await tracker.getEvolutionSuggestions(skillId);
```

## 技能标准格式

生成的技能遵循 OpenTaiji 技能标准：

```
skill-name/
├── SKILL.md          # 技能描述
├── templates/        # 模板文件
├── scripts/          # 脚本资源
└── references/       # 参考文档
```

### SKILL.md 结构

```markdown
# 技能名称

## 描述
[技能功能描述]

## 参数
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| param1 | string | 是 | - | 说明 |

## 步骤
1. [步骤1]
2. [步骤2]
...

## 示例
### 示例1: ...
### 示例2: ...

## 注意事项
- [注意事项]

## 版本历史
- v1.0.0: 初始版本
```

## 配置选项

### TaskCompletionHook 配置

```typescript
interface HookConfig {
  // 触发阈值
  threshold: {
    minOccurrences: number;    // 最小出现次数
    minConfidence: number;     // 最小置信度
    minSuccessRate: number;    // 最小成功率
  };
  
  // 批处理
  batch: {
    enabled: boolean;
    size: number;
    interval: number;
  };
  
  // 事件回调
  onSkillGenerated?: (skill: Skill) => void;
  onEvolutionSuggested?: (suggestion: EvolutionSuggestion) => void;
}
```

### SkillAutoGenerator 配置

```typescript
interface GeneratorConfig {
  // 输出目录
  outputDir: string;
  
  // LLM优化（可选）
  llmOptimizer?: LLMClient;
  
  // 命名规则
  naming: {
    prefix: string;
    suffix: string;
  };
  
  // 验证选项
  validation: {
    strict: boolean;
    testOnGenerate: boolean;
  };
}
```

## 技术特点

1. **Actor原生** - 完全基于 OpenTaiji Actor 运行时设计
2. **闭环进化** - 从使用中学习，持续优化
3. **标准格式** - 生成统一标准的技能文件
4. **可选LLM** - 支持LLM后处理优化
5. **事件驱动** - 完整的钩子和事件系统
6. **增量处理** - 高效处理大量轨迹数据

## 最佳实践

1. **设置合理的阈值** - 避免生成低质量技能
2. **启用批处理** - 高频场景下减少资源消耗
3. **定期清理** - 清理无效或低效技能
4. **人工审核** - 关键技能建议人工审核

## License

Apache 2.0
