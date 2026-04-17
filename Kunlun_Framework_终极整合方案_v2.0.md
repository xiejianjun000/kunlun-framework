# 昆仑框架终极整合方案 v2.0

> **整合四大系统**：openCLAW v2026.4.15 + Hermes v0.9.0 + Claude Code + 昆仑框架
>
> **核心定位**：开源通用AI助手框架（100%开源，能力不阉割）
>
> **文档版本**：v2.0（基于最新版本）
>
> **更新日期**：2026年4月

---

## 文档概述

### 1.1 整合目标

整合四个核心系统的最新版本最佳实践：

| 系统 | 版本 | 核心贡献 |
|------|------|----------|
| **openCLAW** | v2026.4.15 | Dreaming系统、20+消息平台、Plugin SDK重构 |
| **Hermes** | v0.9.0 | Web Dashboard、Fast Mode、新平台支持 |
| **Claude Code** | 最新 | 四层上下文压缩、专业代码生成 |
| **昆仑框架** | v2.0 | 5层架构、多层部署、用户级隔离 |

### 1.2 核心原则

```
1. 开源框架全开放：所有能力100%开源，不做功能阉割
2. 框架≠项目：框架提供通用基座，项目定义业务
3. 5层架构：职责清晰，独立扩展，安全隔离
4. 多层可配置部署：支持1-N层灵活部署
5. 全平台支持：微信/企业微信/小程序/公众号全接入
```

### 1.3 文档结构

```
第一章：双层映射5层架构
第二章：记忆系统深度整合（含Dreaming系统）
第三章：多代理协作系统整合
第四章：自适应学习引擎整合
第五章：技术栈统一方案
第六章：多层可配置部署架构
第七章：全平台消息网关（含微信全渠道）
第八章：技能生态系统整合
第九章：实施路线图
第十章：竞争优势分析
第十一章：实施建议
```

---

## 第一章：双层映射5层架构

### 1.1 架构演进路径

```
用户4层架构              整合5层架构                    来源
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
前端层              →    L1 接入层                openCLAW
                               ↓
中间层              →    L2 网关层 ⭐新增         昆仑框架
                               ↓
后端层              →    L3 协调层 ⭐新增         openCLAW Actor
                      L4 执行层                   Hermes + Claude Code
                               ↓
基础设施层          →    L5 数据层                全系统
```

### 1.2 5层架构详解

```mermaid
graph TB
    subgraph L1["L1 接入层（用户交互）"]
        UI["React Web UI"]
        Mobile["移动端/Termux"]
        Gateway_20["20+消息平台网关"]
        WebSocket["WebSocket实时通信"]
    end
    
    subgraph L2["L2 网关层（安全边界）⭐"]
        APIGateway["API Gateway"]
        Auth["JWT/OAuth2认证"]
        RateLimit["限流熔断"]
        Router["消息路由"]
    end
    
    subgraph L3["L3 协调层（多代理编排）⭐"]
        ActorMesh["Actor Mesh"]
        Dreaming["Dreaming System"]
        Coordinator["多代理协调器"]
        StateMgmt["状态管理器"]
    end
    
    subgraph L4["L4 执行层（技能与推理）"]
        SkillEngine["Skill Engine"]
        ToolExec["工具执行环境"]
        MemoryHub["Memory Hub"]
        Personality["人格蒸馏"]
        FastMode["Fast Mode网关"]
    end
    
    subgraph L5["L5 数据层（持久化存储）"]
        Postgres["PostgreSQL"]
        Qdrant["Qdrant向量库"]
        Redis["Redis缓存"]
        Kafka["Kafka队列"]
        Neo4j["Neo4j知识图谱"]
        Monitoring["Prometheus/Grafana"]
    end
    
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
```

### 1.3 每层职责边界

#### L1 接入层（Presentation Layer）

```python
class L1PresentationLayer:
    """L1接入层职责 - 用户交互入口"""
    
    RESPONSIBILITIES = {
        "user_interface": [
            "React Web UI（Ant Design 5）",
            "TypeScript状态管理（Zustand）",
            "Web管理面板（Hermes风格）"
        ],
        
        "mobile_interface": [
            "Termux/Android原生支持",
            "iOS/Android移动App",
            "TUI优化（移动屏幕）"
        ],
        
        "multi_platform_gateway": [
            "openCLAW 20+平台适配器",
            "微信全渠道（企业微信/小程序/公众号）",
            "飞书/钉钉/Telegram等"
        ],
        
        "real_time_communication": [
            "WebSocket长连接",
            "Server-Sent Events（SSE）",
            "流式响应推送"
        ]
    }
    
    # 支持的平台（openCLAW + Hermes + 微信）
    SUPPORTED_PLATFORMS = {
        # openCLAW平台
        "feishu": "飞书",
        "dingtalk": "钉钉",
        "slack": "Slack",
        "discord": "Discord",
        "telegram": "Telegram",
        "whatsapp": "WhatsApp",
        "line": "LINE",
        "signal": "Signal",
        "email": "Email",
        # Hermes新增平台
        "imessage": "iMessage（BlueBubbles）",
        "wechat": "微信",
        "wecom": "企业微信",
        "termux": "Termux/Android",
        # 微信全渠道
        "wechat_enterprise": "企业微信",
        "wechat_miniprogram": "微信小程序",
        "wechat_official": "微信公众号"
    }
```

#### L2 网关层（Gateway Layer）⭐

```python
class L2GatewayLayer:
    """L2网关层职责 - 安全边界与路由"""
    
    RESPONSIBILITIES = {
        "authentication": [
            "JWT Token验证",
            "OAuth2第三方登录",
            "API Key管理",
            "租户身份识别"
        ],
        
        "authorization": [
            "RBAC权限控制",
            "资源级别授权",
            "多层级权限矩阵"
        ],
        
        "rate_limiting": [
            "Token Bucket限流",
            "Fast Mode优先队列",
            "熔断器模式"
        ],
        
        "routing": [
            "协议转换（REST/gRPC/WebSocket）",
            "租户路由",
            "模型路由（多Provider支持）"
        ],
        
        "credential_pool": [
            "同提供商凭证池轮换",
            "least_used策略",
            "401自动故障转移"
        ]
    }
    
    # 新增：Credential Pool管理（Hermes v0.9.0）
    TECH_STACK = {
        "gateway": "Kong / FastAPI自定义网关",
        "auth": "Keycloak / JWT",
        "rate_limit": "Redis Token Bucket",
        "credential_pool": "自研多Key管理"
    }


class CredentialPoolManager:
    """凭证池管理器 - Hermes v0.9.0新特性"""
    
    def __init__(self):
        self.pools: Dict[str, List[Credential]] = {}
        self.failure_count: Dict[str, int] = {}
    
    async def get_credential(self, provider: str) -> Optional[Credential]:
        """获取凭证（least_used策略）"""
        
        if provider not in self.pools:
            return None
        
        pool = self.pools[provider]
        if not pool:
            return None
        
        # 选择使用最少的凭证
        credential = min(pool, key=lambda c: c.usage_count)
        credential.usage_count += 1
        
        return credential
    
    async def rotate_on_failure(self, provider: str, credential: Credential):
        """401故障转移 - 自动轮换"""
        
        self.failure_count[provider] = self.failure_count.get(provider, 0) + 1
        
        # 超过阈值，轮换凭证
        if self.failure_count[provider] >= 3:
            pool = self.pools[provider]
            idx = pool.index(credential)
            # 轮换到下一个
            pool = pool[idx+1:] + pool[:idx+1]
            self.pools[provider] = pool
            self.failure_count[provider] = 0


@dataclass
class Credential:
    """凭证定义"""
    provider: str
    api_key: str
    usage_count: int = 0
    last_used: datetime = None
    is_active: bool = True
```

#### L3 协调层（Coordination Layer）⭐

```python
class L3CoordinationLayer:
    """L3协调层职责 - 多智能体编排"""
    
    RESPONSIBILITIES = {
        "actor_runtime": [
            "Actor生命周期管理",
            "Actor Mesh网络",
            "Dispatcher调度",
            "Supervisor异常监督"
        ],
        
        "dreaming_system": [
            "睡眠/唤醒状态管理",  # openCLAW新特性
            "短期→长期记忆迁移",
            "Narrative会话管理",
            "自动学习与技能沉淀"
        ],
        
        "multi_agent_coordination": [
            "任务分解",
            "智能体选择",
            "结果聚合",
            "冲突解决"
        ],
        
        "state_management": [
            "分布式状态一致性（CRDTs）",
            "状态快照",
            "状态恢复"
        ]
    }
```

### 1.4 Dreaming系统整合（openCLAW v2026.4.15）

```python
"""
Dreaming系统 - openCLAW v2026.4.15新特性
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum
import asyncio


class AgentState(Enum):
    """智能体状态"""
    AWAKE = "awake"       # 清醒状态
    DREAMING = "dreaming" # 睡眠学习状态
    SUSPENDED = "suspended"


@dataclass
class Narrative:
    """会话叙事"""
    id: str
    user_id: str
    turns: List[Dict] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    is_archived: bool = False


class DreamingSystem:
    """Dreaming系统 - 睡眠学习"""
    
    def __init__(self):
        self.narratives: Dict[str, Narrative] = {}
        self.sleep_schedule = SleepSchedule()
        self.learning_engine = LearningEngine()
    
    async def enter_dreaming(self, agent_id: str):
        """进入睡眠学习状态"""
        
        # 1. 保存当前状态
        current_state = await self._save_agent_state(agent_id)
        
        # 2. 触发睡眠学习
        asyncio.create_task(self._dreaming_cycle(agent_id))
    
    async def _dreaming_cycle(self, agent_id: str):
        """睡眠学习循环"""
        
        while True:
            # 1. 短期记忆 → 长期记忆迁移
            await self._consolidate_memories(agent_id)
            
            # 2. 技能沉淀
            await self._crystallize_skills(agent_id)
            
            # 3. Narrative会话清理
            await self._cleanup_narratives(agent_id)
            
            # 4. 等待下一个睡眠周期
            await asyncio.sleep(self.sleep_schedule.interval)
    
    async def _consolidate_memories(self, agent_id: str):
        """记忆整合 - 短期到长期"""
        
        # 1. 获取短期记忆（Hot Memory）
        short_term = await self.memory_hub.get_by_type(agent_id, "hot")
        
        # 2. 评估重要记忆
        for memory in short_term:
            importance = await self._evaluate_importance(memory)
            
            if importance > 0.8:
                # 迁移到长期记忆（Warm/Cold Memory）
                await self.memory_hub.migrate(memory, "warm")
            elif importance > 0.5:
                # 保留在短期但更新
                memory.access_count += 1
    
    async def _crystallize_skills(self, agent_id: str):
        """技能结晶 - 从使用中提取"""
        
        # 1. 分析使用模式
        patterns = await self.learning_engine.analyze_patterns(agent_id)
        
        # 2. 检查是否满足技能生成条件
        for pattern in patterns:
            if pattern.occurrences >= 10 and pattern.success_rate > 0.9:
                # 生成新技能
                skill = await self._create_skill_from_pattern(pattern)
                if skill:
                    await self.skill_engine.register(skill)
    
    async def _cleanup_narratives(self, agent_id: str):
        """清理会话叙事"""
        
        narratives = await self._get_active_narratives(agent_id)
        
        for narrative in narratives:
            # 归档超过7天的叙事
            age = (datetime.now() - narrative.created_at).days
            if age > 7 and not narrative.is_archived:
                # 提取关键信息到记忆
                await self._archive_narrative(narrative)
                narrative.is_archived = True
    
    async def _evaluate_importance(self, memory) -> float:
        """评估记忆重要性"""
        # 基于访问频率、情感标记、时效性评分
        return memory.access_count * 0.1 + 0.5
    
    async def create_narrative(self, user_id: str, turn: Dict) -> Narrative:
        """创建会话叙事"""
        
        if user_id not in self.narratives:
            self.narratives[user_id] = Narrative(
                id=f"narrative_{user_id}",
                user_id=user_id
            )
        
        self.narratives[user_id].turns.append(turn)
        return self.narratives[user_id]
```

### 1.5 Fast Mode整合（Hermes v0.9.0）

```python
"""
Fast Mode - Hermes v0.9.0新特性
"""
from dataclasses import dataclass
from typing import Optional
from enum import Enum
import asyncio


class ProcessingMode(Enum):
    """处理模式"""
    NORMAL = "normal"
    FAST = "fast"  # 优先处理


@dataclass
class FastModeConfig:
    """Fast Mode配置"""
    enabled: bool = True
    priority_providers: list = None  # ["openai", "anthropic"]
    fallback_to_normal: bool = True


class FastModeGateway:
    """Fast Mode网关"""
    
    def __init__(self):
        self.priority_queue = asyncio.PriorityQueue()
        self.normal_queue = asyncio.Queue()
        self.config = FastModeConfig()
    
    async def process_request(
        self,
        request: Request,
        mode: ProcessingMode = ProcessingMode.NORMAL
    ) -> Response:
        """处理请求"""
        
        if mode == ProcessingMode.FAST and self.config.enabled:
            # Fast Mode：使用优先队列
            return await self._process_priority(request)
        else:
            # 正常模式
            return await self._process_normal(request)
    
    async def _process_priority(self, request: Request) -> Response:
        """优先处理"""
        
        # 1. 选择支持Fast Mode的模型
        model = await self._select_fast_model(request)
        
        if model:
            # 使用优先模型
            return await self._call_model(request, model, priority=True)
        else:
            # 回退到正常模式
            return await self._process_normal(request)
    
    async def _select_fast_model(self, request: Request) -> Optional[str]:
        """选择Fast Mode模型"""
        
        available_models = {
            "openai": ["gpt-5.4"],      # 支持Priority Processing
            "anthropic": ["claude-fast"],  # Anthropic fast tier
            "codex": ["codex-model"]    # Codex Provider
        }
        
        for provider in self.config.priority_providers:
            if provider in available_models:
                return available_models[provider][0]
        
        return None
    
    # /fast命令处理
    async def toggle_fast_mode(self, user_id: str) -> bool:
        """切换Fast Mode"""
        
        user_pref = await self.user_preferences.get(user_id)
        user_pref.fast_mode_enabled = not user_pref.fast_mode_enabled
        await self.user_preferences.save(user_pref)
        
        return user_pref.fast_mode_enabled
```

### 1.6 层间通信协议

```protobuf
// ==================== L2 ↔ L3 通信 ====================
// 使用gRPC + Protocol Buffers

syntax = "proto3";

package kunlun.coordination;

service ActorService {
    rpc CreateActor(CreateActorRequest) returns (CreateActorResponse);
    rpc SendMessage(ActorMessage) returns (ActorMessageResponse);
    rpc GetState(GetStateRequest) returns (GetStateResponse);
    rpc StopActor(StopActorRequest) returns (StopActorResponse);
    
    // Dreaming系统
    rpc EnterDreaming(EnterDreamingRequest) returns (EnterDreamingResponse);
    rpc WakeUp(WakeUpRequest) returns (WakeUpResponse);
    
    // Fast Mode
    rpc ProcessFast(Request) returns (Response);
}

message CreateActorRequest {
    string actor_type = 1;
    string actor_id = 2;
    map<string, string> config = 3;
    bool enable_dreaming = 4;
}

message ActorMessage {
    string from_actor = 1;
    string to_actor = 2;
    string message_type = 3;  // default/task/dreaming
    bytes payload = 4;
    bool fast_mode = 5;
}

message EnterDreamingRequest {
    string agent_id = 1;
    int32 sleep_duration_seconds = 2;
}

message WakeUpRequest {
    string agent_id = 1;
    string wake_trigger = 2;  // "user_message" / "timer" / "event"
}
```

---

## 第二章：记忆系统深度整合

### 2.1 四层记忆架构

```
记忆层级              来源              实现              特性
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
L1 热记忆         openCLAW         Redis LRU          <1ms访问
L2 工作记忆       昆仑框架          进程内LRU          即时访问
L3 温记忆         昆仑框架          SQLite + FTS5      <10ms搜索
L4 冷记忆         昆仑框架          Qdrant + Neo4j     语义搜索
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
语义记忆           Hermes           QMD + Bridge       RAG检索
Dreaming记忆       openCLAW         Narrative          自动学习
```

### 2.2 QMD + Bridge模式（openCLAW v2026.4.15）

```python
"""
QMD模式 + Bridge模式 - openCLAW记忆增强
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class QueryMode(Enum):
    """查询模式"""
    QMD = "qmd"      # Query-Memory-Document
    BRIDGE = "bridge"  # Memory Wiki桥接
    HYBRID = "hybrid"   # 混合模式


@dataclass
class MemoryQuery:
    """记忆查询"""
    query_text: str
    mode: QueryMode = QueryMode.HYBRID
    filters: Dict = field(default_factory=dict)
    limit: int = 10


class QMDQueryEngine:
    """QMD查询引擎"""
    
    def __init__(self, memory_hub, document_store):
        self.memory_hub = memory_hub
        self.document_store = document_store
    
    async def query(self, query: MemoryQuery) -> List[Dict]:
        """QMD查询流程"""
        
        if query.mode == QueryMode.QMD:
            return await self._qmd_query(query)
        elif query.mode == QueryMode.BRIDGE:
            return await self._bridge_query(query)
        else:
            return await self._hybrid_query(query)
    
    async def _qmd_query(self, query: MemoryQuery) -> List[Dict]:
        """Query → Memory → Document"""
        
        # 1. Query理解
        intent = await self._understand_query(query.query_text)
        
        # 2. Memory检索
        memories = await self.memory_hub.semantic_search(
            query.query_text,
            filters=query.filters,
            limit=query.limit
        )
        
        # 3. Document补充
        if len(memories) < query.limit:
            docs = await self.document_store.search(
                query.query_text,
                limit=query.limit - len(memories)
            )
            memories.extend(docs)
        
        return memories
    
    async def _bridge_query(self, query: MemoryQuery) -> List[Dict]:
        """Bridge模式：Memory Wiki桥接"""
        
        # 1. 获取相关Wiki节点
        wiki_nodes = await self._get_connected_wiki_nodes(query.query_text)
        
        # 2. 从节点扩展检索
        results = []
        for node in wiki_nodes:
            # 获取连接的Memory
            connected = await self.memory_hub.get_connected(node.id)
            results.extend(connected)
        
        return results
    
    async def _hybrid_query(self, query: MemoryQuery) -> List[Dict]:
        """混合模式"""
        
        # 并行执行QMD和Bridge
        qmd_results = await self._qmd_query(query)
        bridge_results = await self._bridge_query(query)
        
        # 使用RRF融合结果
        return self._rrf_fusion(qmd_results, bridge_results, k=60)
    
    def _rrf_fusion(self, list1: List, list2: List, k: int = 60) -> List:
        """RRF融合算法"""
        
        scores = {}
        
        for rank, item in enumerate(list1):
            scores[item.id] = scores.get(item.id, 0) + 1 / (k + rank + 1)
        
        for rank, item in enumerate(list2):
            scores[item.id] = scores.get(item.id, 0) + 1 / (k + rank + 1)
        
        sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [self._get_item_by_id(item_id) for item_id, _ in sorted_items]


class MemoryWikiBridge:
    """Memory Wiki桥接"""
    
    def __init__(self, neo4j_client):
        self.neo4j = neo4j_client
    
    async def link_memory_to_wiki(
        self,
        memory_id: str,
        wiki_node_id: str,
        relation_type: str = "related"
    ):
        """将记忆链接到Wiki节点"""
        
        await self.neo4j.execute("""
            MATCH (m:Memory {id: $memory_id})
            MATCH (w:WikiNode {id: $wiki_node_id})
            MERGE (m)-[r:""" + relation_type + """]->(w)
        """, memory_id=memory_id, wiki_node_id=wiki_node_id)
    
    async def get_connected_memories(self, wiki_node_id: str) -> List[Dict]:
        """获取连接的Memory"""
        
        result = await self.neo4j.execute("""
            MATCH (w:WikiNode {id: $wiki_node_id})<-[:related]-(m:Memory)
            RETURN m
        """, wiki_node_id=wiki_node_id)
        
        return result.records()
```

### 2.3 四层记忆实现

```python
"""
四层记忆系统完整实现
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional, List, Dict
from datetime import datetime, timedelta
import asyncio
import json


@dataclass
class MemoryEntry:
    """记忆条目"""
    id: str
    user_id: str
    tenant_id: str
    content: str
    memory_type: str  # hot/warm/cold/semantic
    embedding: Optional[List[float]] = None
    metadata: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    accessed_at: datetime = field(default_factory=datetime.now)
    access_count: int = 0
    importance_score: float = 0.5  # Dreaming系统评分
    
    def touch(self):
        self.accessed_at = datetime.now()
        self.access_count += 1


class MemoryLayer(ABC):
    """记忆层抽象基类"""
    
    @abstractmethod
    async def read(self, memory_id: str) -> Optional[MemoryEntry]:
        pass
    
    @abstractmethod
    async def write(self, entry: MemoryEntry) -> str:
        pass
    
    @abstractmethod
    async def delete(self, memory_id: str) -> bool:
        pass
    
    @abstractmethod
    async def search(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[MemoryEntry]:
        pass


class L1HotMemory(MemoryLayer):
    """L1热记忆 - Redis LRU缓存 (<1ms)"""
    
    def __init__(self, redis_client, max_size: int = 1000, ttl: int = 1800):
        self.redis = redis_client
        self.max_size = max_size
        self.ttl = ttl  # 30分钟TTL
    
    async def read(self, memory_id: str) -> Optional[MemoryEntry]:
        key = f"memory:hot:{memory_id}"
        data = await self.redis.get(key)
        if data:
            entry = MemoryEntry(**json.loads(data))
            entry.touch()
            await self.redis.setex(key, self.ttl, json.dumps(asdict(entry)))
            return entry
        return None
    
    async def write(self, entry: MemoryEntry) -> str:
        key = f"memory:hot:{entry.id}"
        await self.redis.setex(key, self.ttl, json.dumps(asdict(entry)))
        
        # 维护用户索引
        index_key = f"user:memories:{entry.user_id}"
        await self.redis.zadd(index_key, {entry.id: entry.created_at.timestamp()})
        
        await self._evict_if_needed(entry.user_id)
        return entry.id
    
    async def delete(self, memory_id: str) -> bool:
        key = f"memory:hot:{memory_id}"
        return await self.redis.delete(key) > 0
    
    async def search(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[MemoryEntry]:
        index_key = f"user:memories:{user_id}"
        memory_ids = await self.redis.zrevrange(index_key, 0, limit - 1)
        
        results = []
        for mid in memory_ids:
            entry = await self.read(mid)
            if entry:
                results.append(entry)
        return results
    
    async def _evict_if_needed(self, user_id: str):
        index_key = f"user:memories:{user_id}"
        count = await self.redis.zcard(index_key)
        
        if count > self.max_size:
            oldest = await self.redis.zrange(index_key, 0, 0)
            if oldest:
                await self.delete(oldest[0])
                await self.redis.zrem(index_key, oldest[0])


class L2WorkingMemory(MemoryLayer):
    """L2工作记忆 - 进程内LRU（即时）"""
    
    def __init__(self, max_size: int = 100):
        from collections import OrderedDict
        self.cache: OrderedDict[str, MemoryEntry] = OrderedDict()
        self.max_size = max_size
    
    async def read(self, memory_id: str) -> Optional[MemoryEntry]:
        if memory_id in self.cache:
            self.cache.move_to_end(memory_id)
            return self.cache[memory_id]
        return None
    
    async def write(self, entry: MemoryEntry) -> str:
        if entry.id in self.cache:
            self.cache.move_to_end(entry.id)
        self.cache[entry.id] = entry
        
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
        return entry.id
    
    async def delete(self, memory_id: str) -> bool:
        if memory_id in self.cache:
            del self.cache[memory_id]
            return True
        return False
    
    async def search(self, user_id: str, query: str, limit: int = 10) -> List[MemoryEntry]:
        return [e for e in list(self.cache.values())[-limit:] if e.user_id == user_id]


class L3WarmMemory(MemoryLayer):
    """L3温记忆 - SQLite + FTS5 (<10ms)"""
    
    def __init__(self, db_path: str):
        import aiosqlite
        self.db_path = db_path
        self.db: Optional[aiosqlite.Connection] = None
    
    async def init(self):
        self.db = await aiosqlite.connect(self.db_path)
        
        await self.db.executescript("""
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                content TEXT NOT NULL,
                memory_type TEXT DEFAULT 'warm',
                metadata TEXT,
                importance_score REAL DEFAULT 0.5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 0
            );
            
            CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
            CREATE INDEX IF NOT EXISTS idx_memories_tenant ON memories(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(accessed_at);
            
            -- FTS5全文搜索（增强Unicode支持）
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts 
            USING fts5(content, content='memories', content_rowid='rowid', tokenize='unicode61');
            
            -- 触发器保持FTS同步
            CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
                INSERT INTO memories_fts(rowid, content) VALUES (new.rowid, new.content);
            END;
        """)
    
    async def read(self, memory_id: str) -> Optional[MemoryEntry]:
        cursor = await self.db.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        )
        row = await cursor.fetchone()
        
        if row:
            await self.db.execute(
                "UPDATE memories SET accessed_at = ?, access_count = ? WHERE id = ?",
                (datetime.now(), row[8] + 1, memory_id)
            )
            return self._row_to_entry(row)
        return None
    
    async def write(self, entry: MemoryEntry) -> str:
        await self.db.execute("""
            INSERT OR REPLACE INTO memories 
            (id, user_id, tenant_id, content, memory_type, metadata, 
             importance_score, created_at, accessed_at, access_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entry.id, entry.user_id, entry.tenant_id, entry.content,
            entry.memory_type, json.dumps(entry.metadata),
            entry.importance_score,
            entry.created_at, entry.accessed_at, entry.access_count
        ))
        await self.db.commit()
        return entry.id
    
    async def delete(self, memory_id: str) -> bool:
        cursor = await self.db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        await self.db.commit()
        return cursor.rowcount > 0
    
    async def search(self, user_id: str, query: str, limit: int = 10) -> List[MemoryEntry]:
        cursor = await self.db.execute("""
            SELECT m.* FROM memories m
            JOIN memories_fts f ON m.rowid = f.rowid
            WHERE m.user_id = ? AND memories_fts MATCH ?
            ORDER BY m.accessed_at DESC
            LIMIT ?
        """, (user_id, query, limit))
        
        rows = await cursor.fetchall()
        return [self._row_to_entry(row) for row in rows]
    
    def _row_to_entry(self, row) -> MemoryEntry:
        return MemoryEntry(
            id=row[0], user_id=row[1], tenant_id=row[2],
            content=row[3], memory_type=row[4],
            metadata=json.loads(row[5]) if row[5] else {},
            importance_score=row[6] if len(row) > 6 else 0.5,
            created_at=datetime.fromisoformat(row[7]),
            accessed_at=datetime.fromisoformat(row[8]),
            access_count=row[9]
        )


class L4ColdMemory(MemoryLayer):
    """L4冷记忆 - Qdrant向量库 + Neo4j知识图谱"""
    
    def __init__(self, qdrant_client, neo4j_driver):
        self.qdrant = qdrant_client
        self.neo4j = neo4j_driver
        self.collection_name = "kunlun_memories"
    
    async def init(self):
        from qdrant_client.models import VectorParams, Distance
        
        self.qdrant.recreate_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
        )
        
        with self.neo4j.driver.session() as session:
            await session.run("""
                CREATE CONSTRAINT memory_id IF NOT EXISTS
                FOR (m:Memory) REQUIRE m.id IS UNIQUE
            """)
    
    async def read(self, memory_id: str) -> Optional[MemoryEntry]:
        results = self.qdrant.retrieve(
            collection_name=self.collection_name,
            ids=[memory_id]
        )
        
        if results:
            payload = results[0].payload
            return MemoryEntry(
                id=payload["id"],
                user_id=payload["user_id"],
                tenant_id=payload["tenant_id"],
                content=payload["content"],
                memory_type="cold",
                metadata=payload.get("metadata", {})
            )
        return None
    
    async def write(self, entry: MemoryEntry) -> str:
        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=[{
                "id": entry.id,
                "vector": entry.embedding or [0.0] * 1536,
                "payload": {
                    "id": entry.id,
                    "user_id": entry.user_id,
                    "tenant_id": entry.tenant_id,
                    "content": entry.content,
                    "metadata": entry.metadata
                }
            }]
        )
        
        with self.neo4j.driver.session() as session:
            await session.run("""
                MERGE (m:Memory {id: $id})
                SET m.content = $content, m.user_id = $user_id
            """, id=entry.id, content=entry.content, user_id=entry.user_id)
        
        return entry.id
    
    async def delete(self, memory_id: str) -> bool:
        self.qdrant.delete(collection_name=self.collection_name, points_selector=[memory_id])
        return True
    
    async def search(self, user_id: str, query: str, limit: int = 10) -> List[MemoryEntry]:
        query_vector = await self._embed_text(query)
        
        results = self.qdrant.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter={"must": [{"key": "user_id", "match": {"value": user_id}}]},
            limit=limit
        )
        
        return [
            MemoryEntry(
                id=r.payload["id"],
                user_id=r.payload["user_id"],
                tenant_id=r.payload["tenant_id"],
                content=r.payload["content"],
                memory_type="cold"
            )
            for r in results
        ]
    
    async def _embed_text(self, text: str) -> List[float]:
        # TODO: 调用嵌入模型
        return [0.0] * 1536


class MemoryHub:
    """记忆中枢 - 四层协调 + Dreaming集成"""
    
    def __init__(
        self,
        hot_memory: L1HotMemory,
        working_memory: L2WorkingMemory,
        warm_memory: L3WarmMemory,
        cold_memory: L4ColdMemory,
        qmd_engine: QMDQueryEngine = None,
        dreaming_system: DreamingSystem = None
    ):
        self.hot = hot_memory
        self.working = working_memory
        self.warm = warm_memory
        self.cold = cold_memory
        self.qmd = qmd_engine
        self.dreaming = dreaming_system
        
        # 迁移规则
        self.migration_rules = [
            {"from": "hot", "to": "warm", "condition": lambda e: 
                (datetime.now() - e.accessed_at).total_seconds() > 1800},
            {"from": "warm", "to": "cold", "condition": lambda e: 
                (datetime.now() - e.accessed_at).days > 30},
        ]
    
    async def read(self, memory_id: str) -> Optional[MemoryEntry]:
        """从最热层开始读取"""
        
        # L2 工作记忆
        entry = await self.working.read(memory_id)
        if entry:
            return entry
        
        # L1 热记忆
        entry = await self.hot.read(memory_id)
        if entry:
            await self.working.write(entry)
            return entry
        
        # L3 温记忆
        entry = await self.warm.read(memory_id)
        if entry:
            await self.hot.write(entry)
            return entry
        
        # L4 冷记忆
        return await self.cold.read(memory_id)
    
    async def write(self, entry: MemoryEntry, layer: str = "hot"):
        """写入指定层"""
        layer_map = {"hot": self.hot, "working": self.working, "warm": self.warm, "cold": self.cold}
        if layer in layer_map:
            await layer_map[layer].write(entry)
    
    async def semantic_search(
        self,
        user_id: str,
        query: str,
        mode: QueryMode = QueryMode.HYBRID,
        limit: int = 10
    ) -> List[MemoryEntry]:
        """语义搜索 - QMD模式"""
        
        if self.qmd:
            results = await self.qmd.query(MemoryQuery(
                query_text=query,
                mode=mode,
                filters={"user_id": user_id},
                limit=limit
            ))
            return [MemoryEntry(**r) for r in results]
        
        # 回退到简单搜索
        return await self.hot.search(user_id, query, limit)
    
    async def migrate(self):
        """执行记忆迁移 - Dreaming触发"""
        
        # 热→温迁移
        await self._migrate_layer(self.hot, self.warm)
        
        # 温→冷迁移
        await self._migrate_layer(self.warm, self.cold)
    
    async def _migrate_layer(self, from_layer: MemoryLayer, to_layer: MemoryLayer):
        """层间迁移"""
        # TODO: 实现批量迁移
        pass
```

---

## 第三章：全平台消息网关（含微信全渠道）

### 3.1 平台支持总览

```python
"""
昆仑框架全平台支持 - 整合openCLAW + Hermes
"""

PLATFORM_SUPPORT = {
    # openCLAW v2026.4.15 平台
    "openclaw_platforms": {
        "feishu": {"name": "飞书", "status": "stable", "provider": "openclaw"},
        "dingtalk": {"name": "钉钉", "status": "stable", "provider": "openclaw"},
        "slack": {"name": "Slack", "status": "stable", "provider": "openclaw"},
        "discord": {"name": "Discord", "status": "stable", "provider": "openclaw"},
        "telegram": {"name": "Telegram", "status": "stable", "provider": "openclaw"},
        "whatsapp": {"name": "WhatsApp", "status": "stable", "provider": "openclaw"},
        "line": {"name": "LINE", "status": "beta", "provider": "openclaw"},
        "signal": {"name": "Signal", "status": "beta", "provider": "openclaw"},
        "email": {"name": "Email", "status": "stable", "provider": "openclaw"},
        "matrix": {"name": "Matrix", "status": "beta", "provider": "openclaw"},
    },
    
    # Hermes v0.9.0 新增平台
    "hermes_platforms": {
        "imessage": {"name": "iMessage", "status": "stable", "provider": "hermes"},
        "wechat": {"name": "微信", "status": "stable", "provider": "hermes"},
        "wecom": {"name": "企业微信", "status": "stable", "provider": "hermes"},
        "termux": {"name": "Termux/Android", "status": "stable", "provider": "hermes"},
    },
    
    # 微信全渠道（项目定制）
    "wechat_channels": {
        "wechat_enterprise": {
            "name": "企业微信",
            "status": "stable",
            "provider": "kunlun",
            "features": ["文本", "Markdown", "图片", "文件", "小程序", "网页链接"]
        },
        "wechat_miniprogram": {
            "name": "微信小程序",
            "status": "stable",
            "provider": "kunlun",
            "features": ["模板消息", "订阅消息", "客服消息"]
        },
        "wechat_official": {
            "name": "微信公众号",
            "status": "stable",
            "provider": "kunlun",
            "features": ["客服消息", "模板消息", "自动回复"]
        }
    }
}


# 统一适配器注册
PLATFORM_ADAPTERS = {
    # openCLAW
    "feishu": "openclaw.adapters.feishu.FeishuAdapter",
    "dingtalk": "openclaw.adapters.dingtalk.DingTalkAdapter",
    "slack": "openclaw.adapters.slack.SlackAdapter",
    "discord": "openclaw.adapters.discord.DiscordAdapter",
    "telegram": "openclaw.adapters.telegram.TelegramAdapter",
    
    # Hermes
    "imessage": "hermes.adapters.imessage.IMessageAdapter",
    "wechat": "hermes.adapters.wechat.WeChatAdapter",
    "wecom": "hermes.adapters.wecom.WeComAdapter",
    "termux": "hermes.adapters.termux.TermuxAdapter",
    
    # 昆仑定制
    "wechat_enterprise": "kunlun.adapters.wechat.enterprise.WeChatEnterpriseAdapter",
    "wechat_miniprogram": "kunlun.adapters.wechat.miniprogram.WeChatMiniProgramAdapter",
    "wechat_official": "kunlun.adapters.wechat.official.WeChatOfficialAccountAdapter",
}
```

### 3.2 企业微信适配器

```python
"""
企业微信适配器 - 完整实现
"""
from typing import Dict, List, Optional, Any
import aiohttp
import xml.etree.ElementTree as ET
from dataclasses import dataclass
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


@dataclass
class WeChatEnterpriseConfig:
    """企业微信配置"""
    corp_id: str              # 企业ID
    agent_id: str             # 应用ID
    secret: str               # 应用密钥
    token: str                # 回调令牌
    encoding_aes_key: str     # 回调加密密钥


@dataclass
class WeChatMessage:
    """微信消息"""
    msg_type: str
    content: str
    from_user: str
    to_user: str
    msg_id: str
    timestamp: int


class WeChatEnterpriseAdapter:
    """企业微信适配器"""
    
    def __init__(self, config: WeChatEnterpriseConfig):
        self.config = config
        self.access_token: Optional[str] = None
        self.session = aiohttp.ClientSession()
    
    async def get_access_token(self) -> str:
        """获取access_token"""
        
        url = "https://qyapi.weixin.qq.com/cgi-bin/gettoken"
        params = {
            "corpid": self.config.corp_id,
            "corpsecret": self.config.secret
        }
        
        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            
            if data.get("errcode") == 0:
                self.access_token = data["access_token"]
                return self.access_token
            else:
                raise Exception(f"Failed to get access_token: {data}")
    
    async def ensure_token(self):
        """确保token有效"""
        if not self.access_token:
            await self.get_access_token()
    
    async def send_text_message(self, user_id: str, content: str) -> Dict:
        """发送文本消息"""
        
        await self.ensure_token()
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={self.access_token}"
        
        payload = {
            "touser": user_id,
            "msgtype": "text",
            "agentid": self.config.agent_id,
            "text": {
                "content": content
            }
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def send_markdown_message(self, user_id: str, content: str) -> Dict:
        """发送Markdown消息"""
        
        await self.ensure_token()
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={self.access_token}"
        
        payload = {
            "touser": user_id,
            "msgtype": "markdown",
            "agentid": self.config.agent_id,
            "markdown": {
                "content": content
            }
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def send_image_message(self, user_id: str, media_id: str) -> Dict:
        """发送图片消息"""
        
        await self.ensure_token()
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={self.access_token}"
        
        payload = {
            "touser": user_id,
            "msgtype": "image",
            "agentid": self.config.agent_id,
            "image": {
                "media_id": media_id
            }
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def send_file_message(self, user_id: str, file_path: str) -> Dict:
        """发送文件消息"""
        
        # 1. 上传文件获取media_id
        media_id = await self._upload_file(file_path, "file")
        
        # 2. 发送文件消息
        await self.ensure_token()
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={self.access_token}"
        
        payload = {
            "touser": user_id,
            "msgtype": "file",
            "agentid": self.config.agent_id,
            "file": {
                "media_id": media_id
            }
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def send_news_message(
        self,
        user_id: str,
        title: str,
        description: str,
        url: str,
        pic_url: str = None
    ) -> Dict:
        """发送图文消息"""
        
        await self.ensure_token()
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={self.access_token}"
        
        payload = {
            "touser": user_id,
            "msgtype": "news",
            "agentid": self.config.agent_id,
            "news": {
                "articles": [{
                    "title": title,
                    "description": description,
                    "url": url,
                    "picurl": pic_url or ""
                }]
            }
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def upload_media(self, file_path: str, media_type: str) -> str:
        """上传临时素材"""
        
        await self.ensure_token()
        
        url = f"https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token={self.access_token}&type={media_type}"
        
        form = aiohttp.FormData()
        form.add_field(
            'file',
            open(file_path, 'rb'),
            filename=file_path.split('/')[-1],
            content_type='application/octet-stream'
        )
        
        async with self.session.post(url, data=form) as resp:
            data = await resp.json()
            
            if data.get("errcode") == 0:
                return data["media_id"]
            else:
                raise Exception(f"Failed to upload media: {data}")
    
    async def _upload_file(self, file_path: str, media_type: str = "file") -> str:
        """上传文件"""
        return await self.upload_media(file_path, media_type)
    
    # ==================== 接收消息处理 ====================
    
    async def receive_message(self, event: Dict) -> WeChatMessage:
        """接收并解析消息回调"""
        
        if "Encrypt" in event:
            # 加密消息
            decrypted = self._decrypt_message(event["Encrypt"])
            return self._parse_xml_message(decrypted)
        else:
            # 明文消息
            return self._parse_xml_message(event)
    
    def _decrypt_message(self, encrypted_str: str) -> str:
        """解密企业微信消息"""
        
        # Base64解码
        encrypted_bytes = base64.b64decode(encrypted_str + "=" * (4 - len(encrypted_str) % 4))
        
        # AES解密
        aes_key = base64.b64decode(self.config.encoding_aes_key + "=")
        
        cipher = Cipher(
            algorithms.AES(aes_key),
            modes.CBC(aes_key[:16]),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        decrypted = decryptor.update(encrypted_bytes) + decryptor.finalize()
        
        # 去除PKCS7补位
        pad = decrypted[-1]
        if isinstance(pad, int):
            decrypted = decrypted[:-pad]
        else:
            decrypted = decrypted[:-ord(chr(pad))]
        
        # 去除随机字符串和消息长度
        # 格式: random(16) + msg_len(4) + msg
        msg_len = int.from_bytes(decrypted[16:20], 'big')
        msg = decrypted[20:20+msg_len].decode('utf-8')
        
        return msg
    
    def _parse_xml_message(self, xml_str: str) -> WeChatMessage:
        """解析XML消息"""
        
        root = ET.fromstring(xml_str)
        
        msg_type = root.findtext("MsgType", "")
        content = ""
        
        if msg_type == "text":
            content = root.findtext("Content", "")
        elif msg_type == "image":
            content = f"[图片: {root.findtext('MediaId', '')}]"
        elif msg_type == "voice":
            content = f"[语音: {root.findtext('MediaId', '')}]"
        elif msg_type == "event":
            content = f"[事件: {root.findtext('Event', '')}]"
        
        return WeChatMessage(
            msg_type=msg_type,
            content=content,
            from_user=root.findtext("FromUserName", ""),
            to_user=root.findtext("ToUserName", ""),
            msg_id=root.findtext("MsgId", ""),
            timestamp=int(root.findtext("CreateTime", "0"))
        )
    
    # ==================== 消息转换 ====================
    
    def to_unified_message(self, wechat_msg: WeChatMessage) -> Dict:
        """转换为统一消息格式"""
        
        return {
            "platform": "wechat_enterprise",
            "user_id": wechat_msg.from_user,
            "content": wechat_msg.content,
            "msg_type": wechat_msg.msg_type,
            "msg_id": wechat_msg.msg_id,
            "timestamp": wechat_msg.timestamp,
            "metadata": {
                "to_user": wechat_msg.to_user
            }
        }
```

### 3.3 微信小程序适配器

```python
"""
微信小程序适配器
"""

class WeChatMiniProgramAdapter:
    """微信小程序适配器"""
    
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.session = aiohttp.ClientSession()
    
    async def code2session(self, js_code: str) -> Dict:
        """获取openid"""
        
        url = f"https://api.weixin.qq.com/sns/jscode2session"
        params = {
            "appid": self.app_id,
            "secret": self.app_secret,
            "js_code": js_code,
            "grant_type": "authorization_code"
        }
        
        async with self.session.get(url, params=params) as resp:
            return await resp.json()
    
    async def send_subscribe_message(
        self,
        openid: str,
        template_id: str,
        data: Dict,
        page: str = None
    ) -> Dict:
        """发送订阅消息"""
        
        access_token = await self._get_access_token()
        
        url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
        
        payload = {
            "touser": openid,
            "template_id": template_id,
            "page": page or "",
            "data": data
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def send_template_message(
        self,
        openid: str,
        template_id: str,
        form_id: str,
        data: Dict,
        emphasis_keyword: str = None
    ) -> Dict:
        """发送模板消息"""
        
        access_token = await self._get_access_token()
        
        url = f"https://api.weixin.qq.com/cgi-bin/message/template/send?access_token={access_token}"
        
        payload = {
            "touser": openid,
            "template_id": template_id,
            "form_id": form_id,
            "data": data
        }
        
        if emphasis_keyword:
            payload["emphasis_keyword"] = emphasis_keyword
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def _get_access_token(self) -> str:
        """获取access_token"""
        
        url = f"https://api.weixin.qq.com/cgi-bin/token"
        params = {
            "appid": self.app_id,
            "secret": self.app_secret,
            "grant_type": "client_credential"
        }
        
        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            return data["access_token"]
```

### 3.4 微信公众号适配器

```python
"""
微信公众号适配器
"""

class WeChatOfficialAccountAdapter:
    """微信公众号适配器"""
    
    def __init__(
        self,
        app_id: str,
        app_secret: str,
        token: str,
        encoding_aes_key: str = None
    ):
        self.app_id = app_id
        self.app_secret = app_secret
        self.token = token
        self.encoding_aes_key = encoding_aes_key
        self.session = aiohttp.ClientSession()
    
    async def verify_url(self, msg_signature: str, timestamp: str, nonce: str, echostr: str) -> str:
        """验证URL（首次配置）"""
        
        if self.encoding_aes_key:
            return self._decrypt_echo(echostr, msg_signature, timestamp, nonce)
        else:
            return echostr
    
    async def send_text_message(self, openid: str, content: str) -> Dict:
        """发送客服消息"""
        
        access_token = await self._get_access_token()
        
        url = f"https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token={access_token}"
        
        payload = {
            "touser": openid,
            "msgtype": "text",
            "text": {
                "content": content
            }
        }
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def send_markdown_message(self, openid: str, content: str) -> Dict:
        """发送Markdown消息（通过客服消息）"""
        
        # 企业微信支持Markdown，公众号需要转换为HTML
        html_content = self._markdown_to_html(content)
        return await self.send_html_message(openid, html_content)
    
    async def send_template_message(
        self,
        openid: str,
        template_id: str,
        data: Dict,
        url: str = None,
        mini_program: Dict = None
    ) -> Dict:
        """发送模板消息"""
        
        access_token = await self._get_access_token()
        
        url = f"https://api.weixin.qq.com/cgi-bin/message/template/send?access_token={access_token}"
        
        payload = {
            "touser": openid,
            "template_id": template_id,
            "data": data
        }
        
        if url:
            payload["url"] = url
        
        if mini_program:
            payload["miniprogram"] = mini_program
        
        async with self.session.post(url, json=payload) as resp:
            return await resp.json()
    
    async def _get_access_token(self) -> str:
        """获取access_token"""
        
        url = f"https://api.weixin.qq.com/cgi-bin/token"
        params = {
            "appid": self.app_id,
            "secret": self.app_secret,
            "grant_type": "client_credential"
        }
        
        async with self.session.get(url, params=params) as resp:
            data = await resp.json()
            return data["access_token"]
    
    def _markdown_to_html(self, md: str) -> str:
        """Markdown转HTML"""
        # 简单转换
        html = md.replace("# ", "<h1>").replace("\n", "</h1>\n", 1)
        html = html.replace("**", "<strong>", 1).replace("**", "</strong>", 1)
        html = html.replace("*", "<em>", 1).replace("*", "</em>", 1)
        return html
```

### 3.5 统一消息路由器

```python
"""
统一消息网关 - 全平台整合
"""

class UnifiedMessageGateway:
    """统一消息网关"""
    
    def __init__(self):
        # 平台适配器注册
        self.adapters: Dict[str, Any] = {}
        self.routers: Dict[str, Any] = {}
        
        # 初始化路由器
        self._init_wechat_router()
    
    def _init_wechat_router(self):
        """初始化微信路由器"""
        
        from enum import Enum
        
        class WeChatChannel(Enum):
            ENTERPRISE = "wechat_enterprise"
            MINIPROGRAM = "wechat_miniprogram"
            OFFICIAL = "wechat_official"
        
        self.wechat_router = WeChatRouter()
        self.wechat_channel_enum = WeChatChannel
    
    async def register_platform(
        self,
        platform: str,
        adapter: Any,
        config: Dict
    ):
        """注册平台适配器"""
        
        self.adapters[platform] = {
            "adapter": adapter,
            "config": config,
            "enabled": True
        }
    
    async def register_wechat_channel(
        self,
        channel: str,
        config: Dict
    ):
        """注册微信渠道"""
        
        if channel == "wechat_enterprise":
            adapter = WeChatEnterpriseAdapter(WeChatEnterpriseConfig(**config))
        elif channel == "wechat_miniprogram":
            adapter = WeChatMiniProgramAdapter(**config)
        elif channel == "wechat_official":
            adapter = WeChatOfficialAccountAdapter(**config)
        else:
            raise ValueError(f"Unknown wechat channel: {channel}")
        
        await self.register_platform(channel, adapter, config)
        self.wechat_router.register(channel, adapter)
    
    async def receive_message(
        self,
        platform: str,
        channel: str,
        event: Dict
    ) -> Dict:
        """接收消息"""
        
        if platform == "wechat":
            return await self.wechat_router.receive(
                self.wechat_channel_enum(channel),
                event
            )
        
        adapter_info = self.adapters.get(platform)
        if not adapter_info or not adapter_info["enabled"]:
            raise ValueError(f"Platform not registered or disabled: {platform}")
        
        return await adapter_info["adapter"].receive_message(event)
    
    async def send_message(
        self,
        platform: str,
        channel: str,
        user_id: str,
        message: str,
        msg_type: str = "text"
    ) -> Dict:
        """发送消息"""
        
        if platform == "wechat":
            return await self.wechat_router.send(
                self.wechat_channel_enum(channel),
                user_id,
                message,
                msg_type
            )
        
        adapter_info = self.adapters.get(platform)
        if not adapter_info or not adapter_info["enabled"]:
            raise ValueError(f"Platform not registered or disabled: {platform}")
        
        adapter = adapter_info["adapter"]
        
        if hasattr(adapter, f"send_{msg_type}_message"):
            method = getattr(adapter, f"send_{msg_type}_message")
            return await method(user_id, message)
        else:
            return await adapter.send_message(user_id, message)
    
    async def get_user_info(self, platform: str, user_id: str) -> Dict:
        """获取用户信息"""
        
        adapter_info = self.adapters.get(platform)
        if adapter_info and adapter_info["enabled"]:
            return await adapter_info["adapter"].get_user_info(user_id)
        
        return {}


class WeChatRouter:
    """微信消息路由器"""
    
    def __init__(self):
        self.adapters: Dict[str, Any] = {}
    
    def register(self, channel: str, adapter: Any):
        """注册微信渠道适配器"""
        self.adapters[channel] = adapter
    
    async def receive(self, channel, event: Dict) -> Dict:
        """接收消息"""
        
        adapter = self.adapters.get(channel.value)
        if not adapter:
            raise ValueError(f"Wechat channel not registered: {channel}")
        
        return await adapter.receive_message(event)
    
    async def send(
        self,
        channel,
        user_id: str,
        message: str,
        msg_type: str = "text"
    ) -> Dict:
        """发送消息"""
        
        adapter = self.adapters.get(channel.value)
        if not adapter:
            raise ValueError(f"Wechat channel not registered: {channel}")
        
        if msg_type == "text":
            return await adapter.send_text_message(user_id, message)
        elif msg_type == "markdown":
            return await adapter.send_markdown_message(user_id, message)
        elif msg_type == "image":
            return await adapter.send_image_message(user_id, message)
        elif msg_type == "file":
            return await adapter.send_file_message(user_id, message)
        else:
            return await adapter.send_text_message(user_id, message)
```

---

## 第四章：多层可配置部署架构

### 4.1 部署配置模型

```python
"""
多层部署配置系统 - 支持1-N层灵活配置
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class DeploymentType(Enum):
    """部署类型"""
    CENTRALIZED = "centralized"    # 集中式（多副本集群）
    DISTRIBUTED = "distributed"    # 分布式（主备）
    EDGE = "edge"                  # 边缘（单机）


@dataclass
class HardwareConfig:
    """硬件配置"""
    cpu_cores: int = 32
    memory_gb: int = 128
    storage_tb: int = 2
    replica_count: int = 3


@dataclass
class LayerConfig:
    """单层配置"""
    name: str
    deployment_type: DeploymentType
    services: List[str] = field(default_factory=list)
    expose_ports: List[int] = field(default_factory=list)
    replica_count: int = 1
    hardware: HardwareConfig = field(default_factory=HardwareConfig)


@dataclass
class DeploymentLevel:
    """部署层级"""
    name: str
    level_order: int
    deployment_type: DeploymentType
    description: str = ""
    
    # 层级关系
    parent: Optional[str] = None
    children: List[str] = field(default_factory=list)
    
    # 5层配置
    layers: List[LayerConfig] = field(default_factory=list)
    
    # 权限配置
    permissions: Dict[str, List[str]] = field(default_factory=dict)
    
    # 平台配置 - 所有层级都支持微信
    platforms: List[str] = field(default_factory=lambda: [
        "wechat_enterprise", "wechat_miniprogram", "wechat_official",
        "feishu", "dingtalk", "telegram", "slack", "discord"
    ])
    
    # 同步配置
    sync_config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DeploymentConfig:
    """完整部署配置"""
    levels: List[DeploymentLevel] = field(default_factory=list)
    
    # 全局配置
    global_services: List[str] = field(default_factory=list)
    monitoring_enabled: bool = True
    platforms: List[str] = field(default_factory=lambda: [
        "wechat_enterprise", "wechat_miniprogram", "wechat_official",
        "feishu", "dingtalk", "telegram", "slack", "discord", "imessage"
    ])
```

### 4.2 配置示例

```yaml
# deployment_config.yaml

# ==================== 单层部署 ====================
single_layer:
  levels:
    - name: "single"
      level_order: 0
      deployment_type: "edge"
      description: "单机部署（最小配置）"
      platforms:
        - wechat_enterprise
        - wechat_miniprogram
        - wechat_official
        - feishu
        - dingtalk
      layers:
        - name: "L1-L5"
          services: ["all"]
          expose_ports: [80, 443, 8000]
      permissions:
        admin: ["all"]
      hardware:
        cpu_cores: 8
        memory_gb: 32
        storage_tb: 0.5
        replica_count: 1

# ==================== 两层部署（省-市）====================
two_layer:
  levels:
    - name: "province"
      level_order: 0
      deployment_type: "centralized"
      description: "省级中心"
      children: ["city"]
      platforms:
        - wechat_enterprise
        - wechat_miniprogram
        - wechat_official
        - feishu
        - dingtalk
        - telegram
        - slack
        - discord
        - imessage
      layers:
        - name: "L1"
          services: ["nginx", "cdn"]
          expose_ports: [80, 443]
          replica_count: 3
        - name: "L2"
          services: ["api-gateway"]
          expose_ports: [8000]
          replica_count: 3
        - name: "L3"
          services: ["actor-mesh"]
          replica_count: 3
        - name: "L4"
          services: ["skill-engine", "execution-engine"]
          replica_count: 3
        - name: "L5"
          services: ["postgres", "redis", "qdrant", "kafka"]
          replica_count: 3
      permissions:
        province_admin: ["all"]
      sync_config:
        to_children: ["skills", "config"]
        from_children: ["logs"]
      hardware:
        cpu_cores: 32
        memory_gb: 128
        storage_tb: 2
        replica_count: 3

    - name: "city"
      level_order: 1
      deployment_type: "distributed"
      description: "市级节点"
      parent: "province"
      platforms:
        - wechat_enterprise
        - wechat_miniprogram
        - wechat_official
        - feishu
        - dingtalk
      layers:
        - name: "L1-L4"
          services: ["gateway", "actor", "execution"]
          replica_count: 2
        - name: "L5"
          services: ["postgres", "redis"]
          replica_count: 2
      permissions:
        city_admin: ["user:create,read,update", "skill:create,read"]
      hardware:
        cpu_cores: 16
        memory_gb: 64
        storage_tb: 1
        replica_count: 2

# ==================== 三层部署（省-市-县）====================
three_layer:
  levels:
    - name: "province"
      level_order: 0
      deployment_type: "centralized"
      description: "省级中心"
      children: ["city"]
      platforms:
        - wechat_enterprise
        - wechat_miniprogram
        - wechat_official
        - feishu
        - dingtalk
        - telegram
        - slack
        - discord
        - imessage
      # ... 省级完整配置

    - name: "city"
      level_order: 1
      deployment_type: "distributed"
      description: "市级节点"
      parent: "province"
      children: ["county"]
      platforms:
        - wechat_enterprise
        - wechat_miniprogram
        - wechat_official
        - feishu
        - dingtalk
      # ... 市级配置

    - name: "county"
      level_order: 2
      deployment_type: "edge"
      description: "县级节点"
      parent: "city"
      platforms:
        - wechat_enterprise
        - wechat_miniprogram
        - wechat_official
        - feishu
      layers:
        - name: "L1-L4"
          services: ["gateway", "execution"]
          replica_count: 1
        - name: "L5"
          services: ["postgres", "redis"]
          replica_count: 1
      permissions:
        county_admin: ["user:create,read", "skill:create,read"]
      hardware:
        cpu_cores: 8
        memory_gb: 32
        storage_tb: 0.5
        replica_count: 1
```

### 4.3 权限矩阵生成

```python
"""
动态权限矩阵 - 根据层级自动生成
"""

class PermissionMatrixGenerator:
    """权限矩阵生成器"""
    
    BASE_PERMISSIONS = {
        "user_management": ["create", "read", "update", "delete"],
        "skill_management": ["create", "read", "update", "delete", "approve"],
        "system_config": ["read", "update"],
        "audit_log": ["read", "export"],
        "data_sync": ["push", "pull", "override"],
        "memory_access": ["read", "write", "delete"],
        "personality": ["enable", "disable", "update"]
    }
    
    # 普通用户权限（所有层级一致）
    NORMAL_USER_PERMISSIONS = {
        "skill_management": ["create", "read", "update"],
        "memory_access": ["read", "write"],
        "personality": ["enable", "disable"]
    }
    
    def generate_matrix(self, config: DeploymentConfig) -> Dict:
        """根据部署配置生成权限矩阵"""
        
        matrix = {"normal_user": self.NORMAL_USER_PERMISSIONS}
        
        for i, level in enumerate(config.levels):
            admin_key = f"{level.name}_admin"
            
            if i == 0:
                matrix[admin_key] = self._get_global_permissions()
            elif i < len(config.levels) - 1:
                matrix[admin_key] = self._get_regional_permissions()
            else:
                matrix[admin_key] = self._get_local_permissions()
        
        return matrix
    
    def _get_global_permissions(self) -> Dict:
        """全局权限"""
        return {k: v for k, v in self.BASE_PERMISSIONS.items()}
    
    def _get_regional_permissions(self) -> Dict:
        """区域权限"""
        return {
            "user_management": ["create", "read", "update"],
            "skill_management": ["create", "read", "update"],
            "system_config": ["read"],
            "audit_log": ["read"],
            "data_sync": ["pull"],
            "memory_access": self.BASE_PERMISSIONS["memory_access"],
            "personality": self.BASE_PERMISSIONS["personality"]
        }
    
    def _get_local_permissions(self) -> Dict:
        """本地权限"""
        return {
            "user_management": ["create", "read"],
            "skill_management": ["create", "read"],
            "system_config": [],
            "audit_log": ["read"],
            "data_sync": ["pull"],
            "memory_access": self.BASE_PERMISSIONS["memory_access"],
            "personality": self.BASE_PERMISSIONS["personality"]
        }
```

### 4.4 Docker Compose部署

```yaml
# docker-compose.yml - 单机部署

version: '3.8'

services:
  # L1-L4 服务
  api-gateway:
    image: kunlun/api-gateway:2.0.0
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://kunlun:password@postgres:5432/kunlun
      - REDIS_URL=redis://redis:6379
    networks:
      - kunlun-net

  actor-runtime:
    image: kunlun/actor-runtime:2.0.0
    environment:
      - KAFKA_BROKERS=kafka:9092
    networks:
      - kunlun-net

  # L5 数据层
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=kunlun
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=kunlun
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - kunlun-net

  redis:
    image: redis:7-alpine
    networks:
      - kunlun-net

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - kunlun-net

volumes:
  postgres-data:
  qdrant-data:

networks:
  kunlun-net:
    driver: bridge
```

---

## 第五章：技术栈统一方案

### 5.1 技术栈总览

| 层级 | 技术选型 | 版本 | 来源 |
|------|----------|------|------|
| **L1 接入层** | | | |
| 前端框架 | React + TypeScript | 18/5 | 昆仑 |
| UI库 | Ant Design | 5.x | 昆仑 |
| 状态管理 | Zustand | 4.x | 昆仑 |
| 构建工具 | Vite | 5.x | 昆仑 |
| 移动端 | Termux/Android | - | Hermes |
| **L2 网关层** | | | |
| API网关 | FastAPI | 0.109 | 昆仑 |
| 认证 | JWT + OAuth2 | - | 昆仑 |
| 凭证池 | 自研 | - | Hermes v0.9 |
| **L3 协调层** | | | |
| Actor框架 | PyKka/自研 | 3.x | 昆仑 |
| Dreaming | 自研 | - | openCLAW |
| 服务网格 | 可选Istio | - | 昆仑 |
| **L4 执行层** | | | |
| 框架 | FastAPI + Pydantic | - | 昆仑 |
| Fast Mode | 自研 | - | Hermes v0.9 |
| 技能格式 | SKILL.md | - | 昆仑 |
| **L5 数据层** | | | |
| RDBMS | PostgreSQL | 15 | 昆仑 |
| 向量库 | Qdrant | 1.7 | 昆仑 |
| 缓存 | Redis | 7 | 昆仑 |
| 消息队列 | Kafka | 3.x | 昆仑 |
| 图数据库 | Neo4j | 5 | 昆仑 |

### 5.2 支持的平台列表

```
✅ 微信全渠道
├── 企业微信 (wechat_enterprise)
├── 微信小程序 (wechat_miniprogram)
└── 微信公众号 (wechat_official)

✅ openCLAW平台 (20+)
├── 飞书 (feishu)
├── 钉钉 (dingtalk)
├── Slack
├── Discord
├── Telegram
├── WhatsApp
├── LINE
├── Signal
└── Email

✅ Hermes新增平台
├── iMessage (BlueBubbles)
├── WeChat
├── 企业微信
└── Termux/Android

✅ 其他
├── REST API
├── WebSocket
└── Webhook
```

### 5.3 数据库Schema

```sql
-- 用户与认证
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id),
    personality_profile JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 技能系统
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    level VARCHAR(20) DEFAULT 'user',
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 记忆系统
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    content TEXT NOT NULL,
    memory_type VARCHAR(20) DEFAULT 'warm',
    embedding vector(1536),
    importance_score REAL DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);

-- 部署层级
CREATE TABLE deployment_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    level_order INTEGER NOT NULL,
    deployment_type VARCHAR(20) NOT NULL,
    parent_id UUID REFERENCES deployment_levels(id),
    permissions JSONB DEFAULT '{}',
    platforms JSONB DEFAULT '[]'
);

-- 审计日志
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 第六章：竞争优势分析

### 6.1 功能对比

| 维度 | openCLAW | Hermes | Claude Code | **昆仑框架** |
|------|----------|--------|-------------|--------------|
| **版本** | v2026.4.15 | v0.9.0 | 最新 | v2.0 |
| **消息平台** | 20+ | 16+ | ❌ | **30+** |
| **微信支持** | ❌ | ✅ | ❌ | **✅全渠道** |
| **Dreaming系统** | ✅ | ❌ | ❌ | **✅** |
| **记忆系统** | QMD+Bridge | 持久化 | ❌ | **✅四层+语义** |
| **Fast Mode** | ❌ | ✅ | ❌ | **✅** |
| **Credential Pool** | ❌ | ✅ | ❌ | **✅** |
| **Web Dashboard** | ❌ | ✅ | ❌ | **✅** |
| **技能进化** | ❌ | ✅ | ❌ | **✅** |
| **多代理** | Actor | ❌ | ✅ | **✅Actor Mesh** |
| **人格蒸馏** | ❌ | ❌ | ❌ | **✅** |
| **多层部署** | ❌ | ❌ | ❌ | **✅1-N层** |
| **开源协议** | MIT | MIT+AGPL | 闭源 | **Apache 2.0** |

### 6.2 核心优势

```
1. 全平台覆盖：30+平台，微信全渠道
2. 5层架构：职责清晰，扩展灵活
3. Dreaming学习：自动记忆整合
4. 多层部署：1-N层灵活配置
5. 全能力开源：不做功能阉割
6. 框架≠项目：通用基座，业务定制
```

---

## 第七章：实施路线图

### 7.1 Phase 1：核心能力（Month 1-3）

```
Week 1-4: L1接入层
├── React脚手架 + TypeScript
├── Ant Design集成
├── WebSocket通信
└── 企业微信适配器

Week 5-8: L2网关层
├── FastAPI网关
├── JWT认证
├── 凭证池管理
└── 限流熔断

Week 9-12: L3协调层
├── Actor Runtime
├── Dreaming System
└── 监督策略
```

### 7.2 Phase 2：执行能力（Month 4-6）

```
Week 13-16: L4执行层
├── Skill Engine
├── Fast Mode
└── Docker沙箱

Week 17-20: 记忆系统
├── 四层记忆
├── QMD引擎
└── 记忆迁移

Week 21-24: 增强功能
├── 人格蒸馏
├── 技能进化
└── Web Dashboard
```

### 7.3 Phase 3：生态建设（Month 7-12）

```
Month 7-9: 平台扩展
├── 微信全渠道
├── iMessage适配
└── Termux支持

Month 10-11: 技能生态
├── 技能市场
├── 双市场兼容
└── 技能晋升

Month 12: 部署与社区
├── Kubernetes部署
├── 监控告警
└── 社区启动
```

---

## 第八章：开源项目结构

```
kunlun-framework/
├── README.md
├── LICENSE (Apache 2.0)
│
├── src/
│   ├── api/                 # L2网关层
│   │   ├── gateway.py
│   │   ├── auth.py
│   │   └── credential_pool.py
│   │
│   ├── coordination/        # L3协调层
│   │   ├── actor_runtime.py
│   │   ├── dreaming.py
│   │   └── supervisor.py
│   │
│   ├── execution/          # L4执行层
│   │   ├── skill_engine.py
│   │   ├── fast_mode.py
│   │   └── tool_executor.py
│   │
│   ├── data/               # L5数据层
│   │   ├── memory/
│   │   └── models/
│   │
│   └── adapters/           # 平台适配器
│       ├── wechat/
│       ├── feishu/
│       └── ...
│
├── web/                    # 前端
│   ├── src/
│   └── package.json
│
├── deploy/
│   ├── docker-compose/
│   └── kubernetes/
│
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── api.md
│
├── examples/
│   ├── basic-agent/
│   └── multi-agent/
│
└── tests/
```

---

## 附录

### A. 术语表

| 术语 | 说明 | 来源 |
|------|------|------|
| Dreaming | 睡眠学习系统 | openCLAW |
| QMD | Query-Memory-Document模式 | openCLAW |
| Bridge | Memory Wiki桥接 | openCLAW |
| Fast Mode | 优先处理模式 | Hermes |
| Credential Pool | 凭证池轮换 | Hermes |
| Actor | 并发计算模型 | 昆仑 |
| SKILL.md | 标准化技能格式 | 昆仑 |

### B. 参考资料

- openCLAW: https://github.com/openclaw/openclaw (v2026.4.15)
- Hermes: https://github.com/NousResearch/hermes-agent (v0.9.0)
- Claude Code: Anthropic官方文档
- PyKka: https://pykka.org/
- Qdrant: https://qdrant.tech/

### C. 联系方式

- GitHub: https://github.com/kunlun-framework
- 文档: https://docs.kunlun-framework.dev

---

**文档结束**

*本文档基于 openCLAW v2026.4.15 + Hermes v0.9.0 版本设计*
