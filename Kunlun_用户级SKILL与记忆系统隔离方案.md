# 昆仑框架 - 用户级SKILL与记忆系统隔离方案

> **版本**：v1.0  
> **日期**：2026年4月17日  
> **核心问题**：如何实现每个用户独立使用SKILL，并拥有个人记忆系统

---

## 一、核心设计原则

### 1.1 多租户隔离架构

```
┌─────────────────────────────────────────────────────────┐
│                    Kunlun Framework                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Global Shared Layer                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ 系统技能 │  │ 基础模型 │  │ 公共知识库   │  │   │
│  │  │ (十三神) │  │ (LLM)    │  │ (法规标准)   │  │   │
│  │  └──────────┘  └──────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Tenant Isolation Layer                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ 租户技能 │  │ 租户配置 │  │ 租户知识库   │  │   │
│  │  │ (市级)   │  │          │  │              │  │   │
│  │  └──────────┘  └──────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                          ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │            User Private Layer                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ 用户技能 │  │ 用户记忆 │  │ 用户画像     │  │   │
│  │  │ (自创)   │  │ (独立)   │  │ (蒸馏)       │  │   │
│  │  └──────────┘  └──────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 隔离级别定义

| 层级 | 隔离粒度 | 访问范围 | 存储位置 |
|------|----------|----------|----------|
| **Global** | 系统级 | 所有用户只读 | 共享数据库 |
| **Tenant** | 租户级 | 同租户用户只读 | 租户独立Schema |
| **User** | 用户级 | 仅用户自己读写 | 用户独立空间 |

---

## 二、用户级SKILL隔离方案

### 2.1 技能三层架构

```python
# kunlun/skill/skill_isolation.py
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class SkillScope(Enum):
    """技能作用域"""
    GLOBAL = "global"      # 系统级（所有用户可见）
    TENANT = "tenant"      # 租户级（同租户可见）
    USER = "user"          # 用户级（仅自己可见）

@dataclass
class SkillMetadata:
    """技能元数据"""
    skill_id: str
    name: str
    scope: SkillScope
    owner_id: Optional[str] = None      # 用户级技能才有owner
    tenant_id: Optional[str] = None     # 租户级技能才有tenant
    created_at: str
    usage_count: int = 0
    success_rate: float = 1.0

class SkillIsolationManager:
    """技能隔离管理器"""
    
    def __init__(self, db_path: str):
        self.db = SkillDatabase(db_path)
        
    async def get_accessible_skills(
        self,
        user_id: str,
        tenant_id: str
    ) -> List[SkillMetadata]:
        """获取用户可访问的所有技能"""
        
        skills = []
        
        # 1. 系统级技能（所有用户）
        global_skills = await self.db.query(
            "SELECT * FROM skills WHERE scope = 'global'"
        )
        skills.extend(global_skills)
        
        # 2. 租户级技能（同租户用户）
        tenant_skills = await self.db.query(
            "SELECT * FROM skills WHERE scope = 'tenant' AND tenant_id = ?",
            (tenant_id,)
        )
        skills.extend(tenant_skills)
        
        # 3. 用户级技能（仅自己）
        user_skills = await self.db.query(
            "SELECT * FROM skills WHERE scope = 'user' AND owner_id = ?",
            (user_id,)
        )
        skills.extend(user_skills)
        
        return skills
    
    async def create_user_skill(
        self,
        user_id: str,
        tenant_id: str,
        skill_content: str
    ) -> str:
        """创建用户级技能"""
        
        skill_id = self._generate_skill_id(user_id)
        
        # 存储到用户空间
        skill_path = f"user_space/{tenant_id}/{user_id}/skills/{skill_id}.md"
        await self._write_skill_file(skill_path, skill_content)
        
        # 注册元数据
        await self.db.insert_skill(SkillMetadata(
            skill_id=skill_id,
            name=self._extract_skill_name(skill_content),
            scope=SkillScope.USER,
            owner_id=user_id,
            tenant_id=tenant_id,
            created_at=datetime.now().isoformat()
        ))
        
        return skill_id
    
    async def clone_global_skill(
        self,
        user_id: str,
        tenant_id: str,
        global_skill_id: str
    ) -> str:
        """克隆系统技能到用户空间（允许个性化修改）"""
        
        # 读取系统技能
        global_skill = await self.db.get_skill(global_skill_id)
        global_content = await self._read_skill_file(
            f"system/skills/{global_skill_id}.md"
        )
        
        # 复制到用户空间
        user_skill_id = await self.create_user_skill(
            user_id, tenant_id, global_content
        )
        
        # 标记为克隆
        await self.db.update_skill(
            user_skill_id,
            cloned_from=global_skill_id
        )
        
        return user_skill_id
```

### 2.2 技能存储结构

```
data/
├── system/
│   └── skills/              # 系统级技能（只读）
│       ├── luwu.md          # 陆吾 - 中央协调智能体
│       ├── jukui.md         # 句芒 - 环评审查专家
│       └── ...              # 十三神
│
├── tenants/
│   ├── hunan_province/      # 湖南省租户
│   │   └── skills/          # 租户级技能
│   │       ├── hunan_env_review.md
│   │       └── dongting_lake_monitor.md
│   │
│   └── loudi_city/          # 娄底市租户
│       └── skills/
│           └── loudi_air_quality.md
│
└── users/
    ├── hunan_province/
    │   └── user_001/        # 用户001
    │       ├── skills/      # 用户级技能
    │       │   ├── my_custom_review.md
    │       │   └── cloned_luwu_v1.md
    │       └── ...
    │
    └── loudi_city/
        └── user_002/
            ├── skills/
            │   └── my_workflow.md
            └── ...
```

### 2.3 技能调用优先级

```python
class SkillResolver:
    """技能解析器 - 按优先级查找技能"""
    
    async def resolve_skill(
        self,
        user_id: str,
        tenant_id: str,
        skill_name: str
    ) -> Optional[str]:
        """按优先级查找技能"""
        
        # 优先级：用户级 > 租户级 > 系统级
        
        # 1. 查找用户级技能
        user_skill = await self._find_user_skill(
            user_id, tenant_id, skill_name
        )
        if user_skill:
            return user_skill
        
        # 2. 查找租户级技能
        tenant_skill = await self._find_tenant_skill(
            tenant_id, skill_name
        )
        if tenant_skill:
            return tenant_skill
        
        # 3. 查找系统级技能
        global_skill = await self._find_global_skill(skill_name)
        if global_skill:
            return global_skill
        
        return None
```

---

## 三、用户级记忆系统架构

### 3.1 三层记忆隔离

```python
# kunlun/memory/user_memory_isolation.py
from typing import Dict, List, Optional
import sqlite3
import json
from pathlib import Path

class UserMemorySystem:
    """用户级记忆系统 - 完全隔离"""
    
    def __init__(
        self,
        user_id: str,
        tenant_id: str,
        base_path: str = "data/users"
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        
        # 用户独立空间
        self.user_space = Path(base_path) / tenant_id / user_id
        self.user_space.mkdir(parents=True, exist_ok=True)
        
        # 三层记忆初始化
        self.hot_memory = HotMemory()                    # 内存（会话级）
        self.warm_memory = WarmMemory(self.user_space)   # SQLite（工作记忆）
        self.cold_memory = ColdMemory(self.user_space)   # 文件系统（长期记忆）
        
    def _get_user_db_path(self) -> Path:
        """获取用户独立数据库路径"""
        return self.user_space / "memory.db"
    
    def _get_user_memory_file(self) -> Path:
        """获取用户MEMORY.md路径"""
        return self.user_space / "MEMORY.md"
    
    def _get_user_profile_file(self) -> Path:
        """获取用户画像文件路径"""
        return self.user_space / "USER.md"

class WarmMemory:
    """温记忆 - SQLite + FTS5"""
    
    def __init__(self, user_space: Path):
        self.db_path = user_space / "warm_memory.db"
        self._init_database()
        
    def _init_database(self):
        """初始化用户独立数据库"""
        conn = sqlite3.connect(self.db_path)
        
        # 记忆表
        conn.execute('''
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                memory_type TEXT,
                metadata TEXT,
                embedding BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        ''')
        
        # FTS5全文索引
        conn.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
            USING fts5(
                content,
                content='memories',
                content_rowid='rowid'
            )
        ''')
        
        # 人格画像表
        conn.execute('''
            CREATE TABLE IF NOT EXISTS personality_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dimension TEXT NOT NULL,
                value REAL,
                confidence REAL,
                evidence_count INTEGER,
                last_updated TIMESTAMP,
                UNIQUE(dimension)
            )
        ''')
        
        conn.commit()
        
    async def store_memory(
        self,
        content: str,
        memory_type: str = "general",
        metadata: Dict = None
    ):
        """存储用户记忆"""
        
        conn = sqlite3.connect(self.db_path)
        memory_id = str(uuid.uuid4())
        
        conn.execute('''
            INSERT INTO memories (id, content, memory_type, metadata)
            VALUES (?, ?, ?, ?)
        ''', (memory_id, content, memory_type, json.dumps(metadata or {})))
        
        conn.commit()
        
    async def search_memories(
        self,
        query: str,
        limit: int = 10
    ) -> List[Dict]:
        """FTS5全文检索用户记忆"""
        
        conn = sqlite3.connect(self.db_path)
        
        cursor = conn.execute('''
            SELECT m.*, rank
            FROM memories m
            JOIN memories_fts fts ON m.rowid = fts.rowid
            WHERE memories_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        ''', (query, limit))
        
        return [self._row_to_dict(row) for row in cursor]

class ColdMemory:
    """冷记忆 - MEMORY.md + USER.md"""
    
    def __init__(self, user_space: Path):
        self.memory_file = user_space / "MEMORY.md"
        self.user_file = user_space / "USER.md"
        
        # 初始化文件
        self._init_files()
        
    def _init_files(self):
        """初始化用户记忆文件"""
        
        if not self.memory_file.exists():
            self.memory_file.write_text(
                f"# 用户记忆 - {self.user_id}\n\n"
                f"创建时间: {datetime.now().isoformat()}\n"
            )
        
        if not self.user_file.exists():
            self.user_file.write_text(
                f"# 用户画像 - {self.user_id}\n\n"
                f"## 基本信息\n"
                f"- 用户ID: {self.user_id}\n"
                f"- 租户: {self.tenant_id}\n"
                f"- 创建时间: {datetime.now().isoformat()}\n\n"
                f"## 人格特征\n\n"
                f"## 价值观\n\n"
                f"## 世界观\n\n"
            )
    
    async def append_memory(self, content: str):
        """追加长期记忆"""
        
        with open(self.memory_file, 'a', encoding='utf-8') as f:
            f.write(f"\n## {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
            f.write(content)
            f.write("\n")
    
    async def update_personality(
        self,
        dimension: str,
        value: float,
        evidence: str
    ):
        """更新人格画像"""
        
        with open(self.user_file, 'a', encoding='utf-8') as f:
            f.write(f"\n### {dimension} 更新\n")
            f.write(f"- 数值: {value}\n")
            f.write(f"- 证据: {evidence}\n")
            f.write(f"- 时间: {datetime.now().isoformat()}\n")
```

### 3.2 记忆隔离示例

```python
# 用户A的记忆系统
user_a_memory = UserMemorySystem(
    user_id="user_001",
    tenant_id="hunan_province"
)

# 用户B的记忆系统（完全隔离）
user_b_memory = UserMemorySystem(
    user_id="user_002",
    tenant_id="loudi_city"
)

# 用户A存储记忆
await user_a_memory.warm_memory.store_memory(
    content="用户偏好使用表格形式查看环评报告",
    memory_type="preference"
)

# 用户A搜索记忆（只能搜到自己的）
results = await user_a_memory.warm_memory.search_memories(
    query="环评报告偏好"
)

# 用户B搜索记忆（搜不到用户A的内容）
results = await user_b_memory.warm_memory.search_memories(
    query="环评报告偏好"
)
# 返回空结果（完全隔离）
```

---

## 四、人格蒸馏系统（用户级）

### 4.1 五维人格画像Schema

```json
{
  "user_id": "user_001",
  "tenant_id": "hunan_province",
  "personality_profile": {
    "personality": {
      "extraversion": 0.65,          // 外向性
      "openness": 0.82,              // 开放性
      "conscientiousness": 0.73,    // 尽责性
      "agreeableness": 0.58,         // 宜人性
      "neuroticism": 0.34           // 神经质
    },
    "perspective": {
      "decision_style": "analytical",    // 决策风格
      "risk_tolerance": "moderate",      // 风险偏好
      "information_processing": "visual" // 信息处理方式
    },
    "worldview": {
      "causal_logic": "systematic",      // 因果逻辑
      "value_judgment": "utilitarian",   // 价值判断
      "time_orientation": "future"       // 时间导向
    },
    "values": {
      "priorities": ["效率", "准确性", "创新"],
      "底线原则": ["合规性", "透明度"],
      "核心价值": "专业主义"
    },
    "life_philosophy": {
      "goal_orientation": "achievement", // 目标导向
      "meaning_pursuit": "贡献社会",      // 意义追求
      "time_view": "长期主义"            // 时间观念
    }
  },
  "distillation_metadata": {
    "total_interactions": 1247,
    "last_updated": "2026-04-17T16:30:00",
    "confidence_scores": {
      "personality": 0.89,
      "perspective": 0.76,
      "worldview": 0.68,
      "values": 0.82,
      "life_philosophy": 0.71
    }
  }
}
```

### 4.2 人格蒸馏引擎

```python
# kunlun/distillation/personality_distiller.py
from typing import Dict, List
import json

class PersonalityDistiller:
    """人格蒸馏引擎 - 用户级"""
    
    def __init__(self, user_memory: UserMemorySystem):
        self.user_memory = user_memory
        self.profile = self._load_profile()
        
    async def distill_from_conversation(
        self,
        user_message: str,
        agent_response: str,
        user_feedback: str = None
    ):
        """从对话中蒸馏人格特征"""
        
        # 1. 分析决策点
        decision_signals = await self._extract_decision_signals(
            user_message, agent_response
        )
        
        # 2. 分析情感倾向
        emotional_signals = await self._extract_emotional_signals(
            user_message, user_feedback
        )
        
        # 3. 分析表达模式
        expression_patterns = await self._extract_expression_patterns(
            user_message
        )
        
        # 4. 增量更新画像
        await self._update_profile_incremental(
            decision_signals,
            emotional_signals,
            expression_patterns
        )
    
    async def _extract_decision_signals(
        self,
        user_message: str,
        agent_response: str
    ) -> Dict:
        """提取决策信号"""
        
        prompt = f"""
分析用户在以下对话中的决策特征：

用户消息：{user_message}
系统响应：{agent_response}

请识别：
1. 决策风格（分析型/直觉型/混合型）
2. 风险偏好（保守/中等/激进）
3. 信息需求（详细/简洁/视觉化）
4. 时间压力（高/中/低）

输出JSON格式。
"""
        
        signals = await self._llm_analyze(prompt)
        return signals
    
    async def _update_profile_incremental(
        self,
        decision_signals: Dict,
        emotional_signals: Dict,
        expression_patterns: Dict
    ):
        """增量更新画像（不全盘重构）"""
        
        # 更新决策风格
        if decision_signals.get("decision_style"):
            old_value = self.profile["perspective"]["decision_style"]
            new_value = decision_signals["decision_style"]
            
            # 加权平均（新证据权重0.3）
            self.profile["perspective"]["decision_style"] = (
                0.7 * old_value + 0.3 * new_value
            )
        
        # 更新人格特征
        for trait, value in emotional_signals.items():
            old_value = self.profile["personality"].get(trait, 0.5)
            self.profile["personality"][trait] = (
                0.8 * old_value + 0.2 * value
            )
        
        # 保存更新
        await self._save_profile()
    
    async def get_personalized_context(self) -> str:
        """生成个性化上下文（注入到对话）"""
        
        profile = self.profile["personality_profile"]
        
        context = f"""
<user_profile>
## 人格特征
- 决策风格: {profile['perspective']['decision_style']}
- 风险偏好: {profile['perspective']['risk_tolerance']}
- 信息偏好: {profile['perspective']['information_processing']}

## 核心价值观
- 优先级: {', '.join(profile['values']['priorities'])}
- 底线原则: {', '.join(profile['values']['底线原则'])}

## 沟通建议
- 表达方式: {'简洁直接' if profile['personality']['extraversion'] > 0.6 else '温和委婉'}
- 信息密度: {'详细' if profile['personality']['openness'] > 0.7 else '精简'}
</user_profile>
"""
        return context
```

---

## 五、数据库Schema设计

### 5.1 技能隔离表

```sql
-- 技能元数据表
CREATE TABLE skills (
    skill_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,              -- 'global', 'tenant', 'user'
    owner_id TEXT,                    -- 用户级技能的用户ID
    tenant_id TEXT,                   -- 租户级技能的租户ID
    skill_path TEXT NOT NULL,         -- 技能文件路径
    cloned_from TEXT,                 -- 克隆来源技能ID
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 1.0,
    last_used TIMESTAMP,
    
    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_scope (scope),
    INDEX idx_tenant (tenant_id),
    INDEX idx_owner (owner_id),
    INDEX idx_name (name)
);

-- 技能调用日志表（审计用）
CREATE TABLE skill_invocation_logs (
    log_id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    invoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN,
    execution_time_ms INTEGER,
    
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
);
```

### 5.2 记忆隔离表

```sql
-- 用户记忆表（每个用户独立数据库）
-- 路径: data/users/{tenant_id}/{user_id}/warm_memory.db

CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    memory_type TEXT,                 -- 'session', 'working', 'long_term'
    metadata TEXT,                    -- JSON格式
    
    -- 向量嵌入
    embedding BLOB,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- 访问统计
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP
);

-- FTS5全文索引
CREATE VIRTUAL TABLE memories_fts
USING fts5(
    content,
    content='memories',
    content_rowid='rowid'
);

-- 人格画像表
CREATE TABLE personality_profile (
    dimension TEXT PRIMARY KEY,
    value REAL NOT NULL,
    confidence REAL,
    evidence_count INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 六、性能优化策略

### 6.1 热记忆优化

```python
class HotMemory:
    """热记忆 - 内存缓存（用户隔离）"""
    
    def __init__(self, max_size: int = 100):
        self.cache = OrderedDict()
        self.max_size = max_size
        
    async def store(self, key: str, value: str):
        """存储到热记忆"""
        
        if len(self.cache) >= self.max_size:
            # LRU淘汰
            self.cache.popitem(last=False)
        
        self.cache[key] = {
            "content": value,
            "timestamp": time.time(),
            "access_count": 1
        }
    
    async def get(self, key: str) -> Optional[str]:
        """从热记忆读取"""
        
        if key in self.cache:
            # 更新访问计数
            self.cache[key]["access_count"] += 1
            self.cache[key]["timestamp"] = time.time()
            
            # 移到队尾（LRU）
            self.cache.move_to_end(key)
            
            return self.cache[key]["content"]
        
        return None
```

### 6.2 记忆迁移策略

```python
class MemoryConsolidator:
    """记忆巩固器 - 热到温到冷的迁移"""
    
    async def consolidate(self, user_memory: UserMemorySystem):
        """定期执行记忆巩固"""
        
        # 1. 热记忆 → 温记忆（超过30分钟未访问）
        expired_hot = await user_memory.hot_memory.get_expired(
            timeout_minutes=30
        )
        
        for memory in expired_hot:
            await user_memory.warm_memory.store_memory(
                content=memory["content"],
                memory_type="working"
            )
            await user_memory.hot_memory.remove(memory["key"])
        
        # 2. 温记忆 → 冷记忆（超过30天）
        old_warm = await user_memory.warm_memory.get_old_memories(
            days=30
        )
        
        for batch in chunk(old_warm, 10):
            # 压缩摘要
            summary = await self._compress_memories(batch)
            
            # 迁移到冷记忆
            await user_memory.cold_memory.append_memory(summary)
            
            # 删除温记忆
            await user_memory.warm_memory.delete_batch(batch)
```

---

## 七、安全与隐私保护

### 7.1 数据加密

```python
class EncryptedUserStorage:
    """加密的用户存储"""
    
    def __init__(self, user_id: str, encryption_key: bytes):
        self.user_id = user_id
        self.cipher = Fernet(encryption_key)
        
    async def store_encrypted(self, data: str) -> str:
        """加密存储"""
        
        encrypted = self.cipher.encrypt(data.encode())
        return encrypted
    
    async def retrieve_decrypted(self, encrypted_data: bytes) -> str:
        """解密读取"""
        
        decrypted = self.cipher.decrypt(encrypted_data)
        return decrypted.decode()
```

### 7.2 访问控制

```python
class MemoryAccessControl:
    """记忆访问控制"""
    
    def __init__(self):
        self.acl = {}  # 访问控制列表
        
    def check_access(
        self,
        requesting_user: str,
        target_user: str,
        resource_type: str
    ) -> bool:
        """检查访问权限"""
        
        # 用户只能访问自己的记忆
        if requesting_user != target_user:
            # 例外：系统管理员（需审计日志）
            if self._is_admin(requesting_user):
                self._log_admin_access(requesting_user, target_user)
                return True
            return False
        
        return True
```

---

## 八、实施路线图

### Phase 1: 核心隔离机制（2周）

```
Week 1:
├── 实现SkillIsolationManager
├── 实现UserMemorySystem
└── 数据库Schema创建

Week 2:
├── 人格蒸馏引擎核心
├── 三层记忆迁移
└── 单元测试
```

### Phase 2: 优化与安全（2周）

```
Week 3:
├── 性能优化（缓存、索引）
├── 数据加密实现
└── 访问控制实现

Week 4:
├── 集成测试
├── 压力测试（千人并发）
└── 文档完善
```

---

## 九、关键优势总结

| 特性 | 实现方式 | 优势 |
|------|----------|------|
| **完全隔离** | 用户独立空间 | 隐私保护，数据安全 |
| **三层记忆** | 热/温/冷 | 性能优化，成本控制 |
| **人格蒸馏** | 增量更新 | 持续学习，精准画像 |
| **技能复用** | 克隆机制 | 灵活性 + 个性化 |
| **访问控制** | ACL + 审计 | 合规性，可追溯 |

---

**核心设计理念**：
> 每个用户拥有独立的技能空间和记忆系统，互不干扰。
> 系统技能共享，用户技能隔离，租户技能介于之间。
> 人格画像持续蒸馏，不断优化个性化体验。
