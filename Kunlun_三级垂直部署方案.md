# 昆仑框架：三级垂直部署与个性化系统方案

> **目标场景**：湖南省-娄底市-冷水江市三级生态环境管理  
> **日期**：2026年4月17日  
> **核心需求**：三级垂直部署 + 用户级个性化（技能/记忆/进化）

---

## 一、开源版智能体配置

### 1.1 智能体架构设计

昆仑框架开源版采用**"1+N+X"**智能体架构：

```
┌─────────────────────────────────────────────────────────────┐
│                昆仑框架智能体架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "1" - 中央协调智能体（陆吾）                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 场景识别与任务路由                                │   │
│  │ • 多智能体协调调度                                  │   │
│  │ • 全局状态管理                                      │   │
│  │ • 用户意图理解                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                               │
│  "N" - 领域专家智能体（开箱即用：13神）                      │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │ 仓颉     │ 应龙     │ 祝融     │ 后土     │            │
│  │ 环评审批 │ 水环境   │ 大气环境 │ 土壤环境 │            │
│  ├──────────┼──────────┼──────────┼──────────┤            │
│  │ 獬豸     │ 谛听     │ 计都     │ 白泽     │            │
│  │ 环境执法 │ 督察审查 │ 环境风险 │ 生态保护 │            │
│  ├──────────┼──────────┼──────────┼──────────┤            │
│  │ 欽齉     │ 烛龙     │ 雷祖     │ 羲和     │            │
│  │ 固废处置 │ 噪声污染 │ 辐射防护 │ 气候变化 │            │
│  ├──────────┼──────────┼──────────┤ 千里眼   │            │
│  │ 昆仑镜   │ 开明兽   │ 陆吾     │ 监测感知 │            │
│  │ 文档理解 │ 知识库   │ 总调度   │          │            │
│  └──────────┴──────────┴──────────┴──────────┘            │
│                              ↓                               │
│  "X" - 用户自定义智能体（无限扩展）                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 用户创建的专属智能体                              │   │
│  │ • 部门定制的业务智能体                              │   │
│  │ • 项目级的临时智能体                                │   │
│  │ • 工作流编排的复合智能体                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 开源版配置清单

| 智能体类型 | 数量 | 说明 | 开源版包含 |
|-----------|------|------|-----------|
| **中央协调智能体** | 1个 | 陆吾 | ✅ 必需 |
| **领域专家智能体** | 13个 | 十三神 | ✅ 必需 |
| **工具智能体** | 6个 | 文档/搜索/计算等 | ✅ 必需 |
| **用户自定义智能体** | 无限 | 用户创建 | ✅ 支持 |
| **企业级智能体** | 按需 | 增强版 | 商业版 |

**总计**：开源版包含 **20个预配置智能体** + **无限用户自定义**

### 1.3 智能体资源需求

| 智能体层级 | CPU | 内存 | 存储 | 并发能力 |
|-----------|-----|------|------|---------|
| 中央协调智能体 | 2核 | 4GB | 10GB | 1000 req/s |
| 领域专家智能体 | 1核 | 2GB | 5GB | 500 req/s |
| 工具智能体 | 0.5核 | 1GB | 2GB | 1000 req/s |
| 用户自定义智能体 | 0.5核 | 1GB | 2GB | 100 req/s |

---

## 二、省-市-县三级垂直部署架构

### 2.1 三级租户架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                  昆仑框架三级垂直部署架构                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Level 1: 省级平台                           │  │
│  │                    湖南省生态环境厅                             │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ 职责:                                                          │  │
│  │ • 全省统一政策法规库管理                                        │  │
│  │ • 省级重点项目环评审批                                          │  │
│  │ • 全省环境数据汇总分析                                          │  │
│  │ • 标准制定与技术指导                                            │  │
│  │ • 跨市协调与应急指挥                                            │  │
│  │                                                                │  │
│  │ 智能体配置:                                                    │  │
│  │ • 陆吾（省级协调）× 3（高可用）                                 │  │
│  │ • 十三神 × 13（全省业务）                                       │  │
│  │ • 省级自定义智能体 × N                                          │  │
│  │                                                                │  │
│  │ 用户规模: ~500人                                               │  │
│  │ 知识库: 全省统一法规库 + 省级案例库                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    ↓                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Level 2: 市级平台                           │  │
│  │                    娄底市生态环境局                             │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ 职责:                                                          │  │
│  │ • 本市环评审批与监管                                            │  │
│  │ • 市级环境监测分析                                              │  │
│  │ • 县级业务指导                                                  │  │
│  │ • 数据上报与汇总                                                │  │
│  │                                                                │  │
│  │ 智能体配置:                                                    │  │
│  │ • 陆吾（市级协调）× 2                                          │  │
│  │ • 核心智能体（仓颉、应龙、祝融、后土、獬豸）× 5               │  │
│  │ • 市级自定义智能体 × M                                          │  │
│  │                                                                │  │
│  │ 用户规模: ~150人                                               │  │
│  │ 知识库: 省级共享 + 市级本地库                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    ↓                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Level 3: 县级平台                           │  │
│  │                    冷水江市生态环境局                           │  │
│  ├───────────────────────────────────────────────────────────────┤  │
│  │ 职责:                                                          │  │
│  │ • 本县环评初审                                                  │  │
│  │ • 污染源日常监管                                                │  │
│  │ • 环境执法检查                                                  │  │
│  │ • 群众投诉处理                                                  │  │
│  │                                                                │  │
│  │ 智能体配置:                                                    │  │
│  │ • 陆吾（县级协调）× 1                                          │  │
│  │ • 基础智能体（仓颉、应龙、獬豸、千里眼）× 4                    │  │
│  │ • 县级自定义智能体 × K                                          │  │
│  │                                                                │  │
│  │ 用户规模: ~50人                                                │  │
│  │ 知识库: 省市共享 + 县级本地库                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 三级数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                     三级数据流设计                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  下行数据流（省级 → 市级 → 县级）                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 政策法规更新推送                                  │   │
│  │ • 技术标准下发                                      │   │
│  │ • 审批模板同步                                      │   │
│  │ • 智能体技能更新                                    │   │
│  │ • 知识库增量同步                                    │   │
│  │ • 应急指令下发                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  上行数据流（县级 → 市级 → 省级）                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 业务数据上报（日报/周报/月报）                    │   │
│  │ • 环评审批结果上传                                  │   │
│  │ • 执法案件记录                                      │   │
│  │ • 监测数据汇聚                                      │   │
│  │ • 用户使用反馈                                      │   │
│  │ • 技能优化建议                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  横向数据流（同级共享）                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 县区间案例共享                                    │   │
│  │ • 市际经验交流                                      │   │
│  │ • 专业知识问答                                      │   │
│  │ • 技能市场交易                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 三级权限架构

```yaml
# 三级权限矩阵
省级权限:
  管理:
    - 全省用户管理
    - 全省智能体配置
    - 全省知识库管理
    - 全省策略制定
  数据:
    - 全省数据查看
    - 全省数据分析
    - 全省报表生成
  审批:
    - 省级项目审批
    - 市级项目复核
    - 政策法规发布

市级权限:
  管理:
    - 本市用户管理
    - 本市智能体配置
    - 本地知识库管理
  数据:
    - 本市数据查看
    - 本市数据分析
    - 下级数据汇总
  审批:
    - 市级项目审批
    - 县级项目复核

县级权限:
  管理:
    - 本县用户管理
    - 本县智能体配置
  数据:
    - 本县数据查看
    - 数据上报
  审批:
    - 县级项目初审
```

---

## 三、用户级个性化系统实现

### 3.1 用户空间架构

```
┌─────────────────────────────────────────────────────────────┐
│                   用户个性化空间架构                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  每个用户独立空间                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    User Space                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  1. 个人技能库                                      │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │ my_skills/                                │     │   │
│  │  │ ├── 快速回复模板.md                       │     │   │
│  │  │ ├── 水质分析脚本.py                       │     │   │
│  │  │ ├── 环评初审检查清单.md                   │     │   │
│  │  │ └── 个人工作流/                           │     │   │
│  │  │     ├── 每日报告生成.yaml                 │     │   │
│  │  │     └── 月度汇总.yaml                     │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │  2. 长期记忆系统                                    │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │ MEMORY.md (项目记忆)                       │     │   │
│  │  │ - 工作上下文                              │     │   │
│  │  │ - 常用文件路径                            │     │   │
│  │  │ - 工作惯例                                │     │   │
│  │  │ - 注意事项                                │     │   │
│  │  │                                          │     │   │
│  │  │ USER.md (个人画像)                        │     │   │
│  │  │ - 专业背景                                │     │   │
│  │  │ - 沟通偏好                                │     │   │
│  │  │ - 技术栈                                  │     │   │
│  │  │ - 常用工具                                │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │  3. 进化系统                                        │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │ evolution/                                │     │   │
│  │  │ ├── trajectories/  (执行轨迹)             │     │   │
│  │  │ │   ├── 2026-04-17.json                   │     │   │
│  │  │ │   └── ...                               │     │   │
│  │  │ ├── feedback/     (反馈记录)              │     │   │
│  │  │ │   ├── skill_ratings.json                │       │
│  │  │ │   └── corrections.json                  │     │   │
│  │  │ └── improvements/ (技能改进)              │     │   │
│  │  │     ├── skill_v1.1.md                     │     │   │
│  │  │     └── skill_v1.2.md                     │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │  4. 个人配置                                        │   │
│  │  ┌───────────────────────────────────────────┐     │   │
│  │  │ config.yaml                               │     │   │
│  │  │ - 默认模型选择                            │     │   │
│  │  │ - 快捷键配置                              │     │   │
│  │  │ - 通知偏好                                │     │   │
│  │  │ - 界面主题                                │     │   │
│  │  │ - 自动化规则                              │     │   │
│  │  └───────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 用户技能系统实现

```python
# 用户技能管理器
class UserSkillManager:
    """用户级技能管理系统"""
    
    def __init__(self, user_id: str, tenant_id: str):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.skill_store = SkillStore(user_id, tenant_id)
        
    async def register_skill(
        self,
        skill_name: str,
        skill_content: str,
        skill_type: str = 'personal'
    ) -> Skill:
        """注册个人技能"""
        
        # 1. 创建技能对象
        skill = Skill(
            id=generate_id(),
            name=skill_name,
            owner_id=self.user_id,
            tenant_id=self.tenant_id,
            type=skill_type,  # personal | department | shared
            content=skill_content,
            version="1.0.0",
            created_at=datetime.now(),
        )
        
        # 2. 解析技能定义
        skill_config = self.parse_skill_definition(skill_content)
        skill.config = skill_config
        
        # 3. 存储到个人技能库
        await self.skill_store.save(skill)
        
        # 4. 注册到智能体
        await self.register_to_agents(skill)
        
        return skill
    
    async def evolve_skill(
        self,
        skill_id: str,
        improvement: SkillImprovement
    ) -> Skill:
        """进化技能（基于使用反馈）"""
        
        # 1. 加载原技能
        skill = await self.skill_store.get(skill_id)
        
        # 2. 应用改进
        new_version = self.apply_improvement(skill, improvement)
        
        # 3. 版本管理
        new_version.version = self.increment_version(skill.version)
        new_version.previous_version = skill.version
        
        # 4. 保存新版本
        await self.skill_store.save(new_version)
        
        # 5. 记录进化轨迹
        await self.record_evolution(skill, new_version, improvement)
        
        return new_version
    
    async def share_skill(
        self,
        skill_id: str,
        target: str  # department | organization | public
    ) -> bool:
        """分享技能到不同范围"""
        
        skill = await self.skill_store.get(skill_id)
        
        if target == 'department':
            # 分享到部门
            await self.share_to_department(skill)
        elif target == 'organization':
            # 分享到组织
            await self.share_to_organization(skill)
        elif target == 'public':
            # 发布到技能市场
            await self.publish_to_market(skill)
        
        skill.share_scope = target
        await self.skill_store.update(skill)
        
        return True
```

### 3.3 用户记忆系统实现

```python
# 用户记忆管理器
class UserMemoryManager:
    """用户级三层记忆系统"""
    
    def __init__(
        self,
        user_id: str,
        tenant_id: str,
        db_path: str = None
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        
        # 三层存储
        self.hot_memory = HotMemory()      # 会话级（内存）
        self.warm_memory = WarmMemory(db_path)  # SQLite
        self.cold_memory = ColdMemory()    # 文件系统
        
    async def store(
        self,
        content: str,
        memory_type: str,
        metadata: dict = None
    ):
        """存储记忆"""
        
        if memory_type == 'session':
            # 热记忆：当前会话上下文
            await self.hot_memory.store(content, metadata)
            
        elif memory_type == 'working':
            # 温记忆：SQLite + FTS5索引
            await self.warm_memory.store(content, metadata)
            
        elif memory_type == 'long_term':
            # 冷记忆：MEMORY.md / USER.md
            await self.cold_memory.store(content, metadata)
    
    async def recall(
        self,
        query: str,
        memory_types: list = None,
        limit: int = 10
    ) -> List[Memory]:
        """检索记忆"""
        
        results = []
        
        # 1. 热记忆（精确匹配）
        if 'session' in (memory_types or ['session']):
            hot_results = await self.hot_memory.search(query)
            results.extend(hot_results)
        
        # 2. 温记忆（FTS5全文检索）
        if 'working' in (memory_types or ['working']):
            warm_results = await self.warm_memory.search(query, limit)
            results.extend(warm_results)
        
        # 3. 冷记忆（语义检索）
        if 'long_term' in (memory_types or ['long_term']):
            cold_results = await self.cold_memory.search(query, limit)
            results.extend(cold_results)
        
        return results[:limit]
    
    async def consolidate(self):
        """记忆巩固：从热到温到冷的迁移"""
        
        # 1. 热记忆 → 温记忆
        expired_hot = await self.hot_memory.get_expired()
        for memory in expired_hot:
            await self.warm_memory.store(memory)
            await self.hot_memory.remove(memory.id)
        
        # 2. 温记忆 → 冷记忆（压缩摘要）
        old_warm = await self.warm_memory.get_old(days=30)
        for batch in chunk(old_warm, 10):
            summary = await self.compress_memories(batch)
            await self.cold_memory.store(summary)


# 热记忆实现
class HotMemory:
    """会话级内存存储"""
    
    def __init__(self, max_size: int = 100):
        self.memories = OrderedDict()
        self.max_size = max_size
        
    async def store(self, content: str, metadata: dict):
        memory_id = str(uuid.uuid4())
        self.memories[memory_id] = {
            'id': memory_id,
            'content': content,
            'metadata': metadata,
            'timestamp': datetime.now(),
        }
        
        # LRU淘汰
        if len(self.memories) > self.max_size:
            self.memories.popitem(last=False)


# 温记忆实现（SQLite + FTS5）
class WarmMemory:
    """SQLite + FTS5全文索引"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path or ':memory:'
        self._init_db()
        
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                embedding BLOB,
                created_at TIMESTAMP,
                expires_at TIMESTAMP
            )
        ''')
        
        # FTS5全文索引
        conn.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts 
            USING fts5(content, content='memories', content_rowid='rowid')
        ''')
        
        conn.commit()
        
    async def search(self, query: str, limit: int = 10):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('''
            SELECT m.*, rank
            FROM memories m
            JOIN memories_fts fts ON m.rowid = fts.rowid
            WHERE memories_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        ''', (query, limit))
        
        return [self._row_to_memory(row) for row in cursor]


# 冷记忆实现（文件系统）
class ColdMemory:
    """MEMORY.md / USER.md 持久化"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.memory_file = f'user_space/{user_id}/MEMORY.md'
        self.user_file = f'user_space/{user_id}/USER.md'
        
    async def store(self, content: str, metadata: dict):
        """追加到MEMORY.md"""
        
        with open(self.memory_file, 'a', encoding='utf-8') as f:
            f.write(f'\n## {datetime.now().strftime("%Y-%m-%d %H:%M")}\n')
            f.write(content)
            f.write('\n')
    
    async def search(self, query: str, limit: int = 5):
        """语义检索MEMORY.md"""
        
        # 读取文件
        with open(self.memory_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 分段
        sections = content.split('\n## ')
        
        # 简单关键词匹配（实际应用可用向量检索）
        results = []
        for section in sections:
            if query.lower() in section.lower():
                results.append(Memory(
                    content=section[:500],
                    relevance=1.0,
                ))
        
        return results[:limit]
```

### 3.4 用户进化系统实现

```python
# 用户进化引擎
class UserEvolutionEngine:
    """用户级进化学习系统"""
    
    def __init__(
        self,
        user_id: str,
        tenant_id: str,
        trajectory_store: TrajectoryStore,
        skill_manager: UserSkillManager
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.trajectory_store = trajectory_store
        self.skill_manager = skill_manager
        
        # 进化配置
        self.min_trajectories = 50
        self.evolution_threshold = 0.15
        
    async def record_trajectory(
        self,
        skill_id: str,
        inputs: dict,
        outputs: dict,
        success: bool,
        feedback: dict = None
    ):
        """记录执行轨迹"""
        
        trajectory = Trajectory(
            id=generate_id(),
            user_id=self.user_id,
            tenant_id=self.tenant_id,
            skill_id=skill_id,
            inputs=inputs,
            outputs=outputs,
            success=success,
            feedback=feedback,
            reward=self._calculate_reward(success, feedback),
            created_at=datetime.now(),
        )
        
        await self.trajectory_store.save(trajectory)
        
        # 检查是否触发进化
        if await self._should_evolve(skill_id):
            await self._evolve_skill(skill_id)
    
    async def _should_evolve(self, skill_id: str) -> bool:
        """判断是否触发进化"""
        
        # 获取最近的轨迹
        recent = await self.trajectory_store.get_recent(
            user_id=self.user_id,
            skill_id=skill_id,
            limit=100
        )
        
        if len(recent) < self.min_trajectories:
            return False
        
        # 计算失败率
        failures = sum(1 for t in recent if not t.success)
        failure_rate = failures / len(recent)
        
        # 计算负反馈率
        negatives = sum(1 for t in recent if t.feedback and t.feedback.get('rating', 5) < 3)
        negative_rate = negatives / len(recent)
        
        return (failure_rate + negative_rate) >= self.evolution_threshold
    
    async def _evolve_skill(self, skill_id: str):
        """进化技能"""
        
        # 1. 加载技能
        skill = await self.skill_manager.skill_store.get(skill_id)
        
        # 2. 分析失败轨迹
        failures = await self.trajectory_store.get_failures(
            user_id=self.user_id,
            skill_id=skill_id
        )
        
        # 3. 提取改进建议
        improvement = await self._analyze_failures(failures)
        
        # 4. 生成新版本
        new_skill = await self.skill_manager.evolve_skill(skill_id, improvement)
        
        # 5. 通知用户
        await self._notify_evolution(new_skill, improvement)
    
    async def _analyze_failures(
        self,
        failures: List[Trajectory]
    ) -> SkillImprovement:
        """分析失败原因，提取改进建议"""
        
        # 聚合错误模式
        error_patterns = {}
        for failure in failures:
            error_type = failure.feedback.get('error_type', 'unknown')
            error_patterns[error_type] = error_patterns.get(error_type, 0) + 1
        
        # 生成改进建议
        improvements = []
        for error_type, count in sorted(error_patterns.items(), key=lambda x: -x[1]):
            if count >= 3:  # 出现3次以上的问题
                improvements.append(self._get_improvement_for_error(error_type))
        
        return SkillImprovement(
            issues=improvements,
            priority='high',
            suggested_by='evolution_engine',
        )
    
    def _calculate_reward(self, success: bool, feedback: dict) -> float:
        """计算奖励分数"""
        
        if not success:
            return 0.0
        
        base_reward = 1.0
        
        if feedback:
            # 用户评分（1-5）
            rating = feedback.get('rating', 5)
            rating_bonus = (rating - 3) * 0.1
            
            # 效率奖励
            efficiency = feedback.get('efficiency', 'normal')
            efficiency_bonus = {'fast': 0.2, 'normal': 0, 'slow': -0.1}.get(efficiency, 0)
            
            base_reward += rating_bonus + efficiency_bonus
        
        return max(0, min(1.5, base_reward))


# 轨迹存储
class TrajectoryStore:
    """执行轨迹存储"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()
        
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS trajectories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                skill_id TEXT NOT NULL,
                inputs TEXT,
                outputs TEXT,
                success BOOLEAN,
                feedback TEXT,
                reward FLOAT,
                created_at TIMESTAMP,
                INDEX idx_user_skill (user_id, skill_id),
                INDEX idx_created (created_at)
            )
        ''')
        conn.commit()
```

---

## 四、完整部署方案

### 4.1 三级硬件配置

| 层级 | 服务器配置 | 数量 | 部署内容 |
|------|-----------|------|---------|
| **省级** | 32核/128GB/2TB SSD | 3台 | 高可用集群 |
| **市级** | 16核/64GB/1TB SSD | 2台 | 主备部署 |
| **县级** | 8核/32GB/500GB SSD | 1台 | 单机部署 |

### 4.2 网络架构

```
┌─────────────────────────────────────────────────────────────┐
│                      网络架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  互联网                                                      │
│    ↓                                                         │
│  ┌─────────────────────────────────────────┐               │
│  │         省级负载均衡 (Nginx)             │               │
│  │         CDN + WAF防护                    │               │
│  └─────────────────────────────────────────┘               │
│    ↓                                                         │
│  ┌─────────────────────────────────────────┐               │
│  │         省级核心交换机                    │               │
│  │         (内网 10.0.0.0/8)               │               │
│  └─────────────────────────────────────────┘               │
│    ↓                                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   省级应用集群                         │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │  │
│  │  │API  │ │Actor│ │Skill│ │ LLM │ │ DB  │           │  │
│  │  │Gateway│Runtime│Engine│Gateway│Cluster│           │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │  │
│  └───────────────────────────────────────────────────────┘  │
│    ↓ (VPN隧道)                                              │
│  ┌─────────────────────────────────────────┐               │
│  │         市级部署                         │               │
│  │         (VPN: 10.1.0.0/16)              │               │
│  └─────────────────────────────────────────┘               │
│    ↓ (VPN隧道)                                              │
│  ┌─────────────────────────────────────────┐               │
│  │         县级部署                         │               │
│  │         (VPN: 10.2.0.0/24)              │               │
│  └─────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 数据同步机制

```python
# 三级数据同步器
class ThreeLevelSyncer:
    """省-市-县三级数据同步"""
    
    def __init__(self, level: str, region_id: str):
        self.level = level
        self.region_id = region_id
        
    async def sync_down(self):
        """下行同步：从上级获取数据"""
        
        if self.level == 'province':
            # 省级不需要下行同步
            return
        
        # 获取上级配置
        parent_config = await self.get_parent_config()
        
        # 同步政策法规库
        await self.sync_knowledge_base(parent_config)
        
        # 同步智能体技能
        await self.sync_skills(parent_config)
        
        # 同步标准模板
        await self.sync_templates(parent_config)
    
    async def sync_up(self):
        """上行同步：向上级上报数据"""
        
        if self.level == 'county':
            # 县级上报到市级
            await self.report_to_city()
        elif self.level == 'city':
            # 市级上报到省级
            await self.report_to_province()
        elif self.level == 'province':
            # 省级生成汇总报告
            await self.generate_summary_report()
    
    async def report_to_parent(self, data_type: str, data: dict):
        """向上级上报数据"""
        
        report = DataReport(
            region_id=self.region_id,
            data_type=data_type,
            data=data,
            timestamp=datetime.now(),
        )
        
        await self.parent_api.submit_report(report)
```

---

## 五、实施计划

### 5.1 部署阶段

| 阶段 | 时间 | 内容 |
|------|------|------|
| **Phase 1: 省级部署** | Week 1-2 | 省级核心平台搭建 |
| **Phase 2: 市级部署** | Week 3-4 | 娄底市平台部署+VPN联调 |
| **Phase 3: 县级部署** | Week 5-6 | 冷水江市平台部署 |
| **Phase 4: 用户迁移** | Week 7-8 | 用户导入+培训 |
| **Phase 5: 试运行** | Week 9-12 | 灰度运行+优化 |

### 5.2 用户迁移方案

```
用户迁移流程：

1. 用户数据导入
   ├── 批量导入用户账号
   ├── 导入组织架构
   └── 导入历史数据

2. 个人空间初始化
   ├── 创建用户空间目录
   ├── 初始化MEMORY.md
   ├── 初始化USER.md
   └── 创建默认技能库

3. 培训与适应
   ├── 集中培训（2天）
   ├── 线上教程
   ├── 操作手册
   └── 一对一辅导

4. 试运行
   ├── 新旧系统并行（2周）
   ├── 逐步切换
   └── 遗留系统下线
```

---

## 六、总结

### 6.1 核心设计原则

1. **三级垂直**：省-市-县逐级部署，数据上报下发
2. **用户隔离**：每个用户独立空间，技能/记忆/进化隔离
3. **共享能力**：知识库共享、技能市场、最佳实践传播
4. **持续进化**：基于用户反馈的自我优化机制

### 6.2 关键指标

| 指标 | 目标值 |
|------|--------|
| 智能体数量 | 20+ (开源版) |
| 用户空间大小 | 100MB/用户 |
| 记忆检索延迟 | <10ms |
| 技能进化周期 | 7天 |
| 三级同步延迟 | <5min |

---

> **文档版本**：v1.0  
> **下一步**：启动省级平台部署
