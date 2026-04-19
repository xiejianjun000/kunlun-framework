# OpenCLAW & Hermes 官网调研 + AI 最新趋势 + Taiji 补全建议

调研日期：2026-04-18

---

## 一、OpenCLAW 最新动态（近50天）

**迭代节奏：** 平均每周一个大版本，正在从"极客玩具"转向"企业级运营产品"

**四条主线：**
- 🔴 Active Memory（主动记忆层）：subagent自动追踪偏好，替代用户手动管理
- 🔴 Memory as Infrastructure：记忆当数据库，LanceDB云端备份
- 🔴 Durable Task Flows：SQLite统一任务账本，失败可恢复
- ✅ Plugin Marketplace + 安全Fail-Closed持续加固

**最新（v2026.4.14~v2026.4.18）：**
- LanceDB云端可移植记忆（跨设备同步）
- `localModelLean` 极简本地模式
- GPT-5.4 前向兼容
- SSRF保护严格化

---

## 二、Hermes 最新动态（v0.2 → v0.10）

**速度：** 9个版本 / 35天，3.9天一个版本

**演进路径：**
```
v0.2 基础搭好（多平台+MCP+Skills）
v0.3 Voice + OPD研究能力
v0.4 OpenAI兼容 → 生态打通
v0.5 HuggingFace算力接入
v0.6 多实例 + MCP Server（变MCP供给方！）
v0.7 可拔插Memory Provider（内存架构开放）
v0.8 自我优化工具 + 安全加固
v0.9 Pluggable Context Engine + Web管理界面
v0.10 Tool Gateway（付费生态变现）
```

**最值得注意：Hermes正在从"个人AI员工"变成"AI平台生态"**

---

## 三、AI Agent 技术十大趋势（2026）

| 趋势 | 成熟度 |
|------|--------|
| Generative Memory > Retrieval Memory（DREAMING是标杆） | 🔴 热点 |
| MCP 成为 AI 互联互通的 USB-C | ✅ 成熟 |
| Graph Memory 知识图谱记忆（多跳推理） | 🟡 兴起 |
| Multi-Scope Memory（4层作用域） | 🟡 兴起 |
| Voice-First Memory（<500ms实时召回） | 🔴 将爆发 |
| Durable Task Ledger（SQLite任务账本） | ✅ 工业级 |
| Recall Tracking → Recall Scoring（评分驱动记忆） | ✅ 成熟 |
| Memory as Infrastructure | ✅ 企业级 |
| Actor-Aware Memory（多Agent记忆隔离） | 🟡 兴起 |
| OPD（行为轨迹→训练下一代模型） | 🟢 研究级 |

---

## 四、Taiji 补全建议（按优先级）

### 🔴 立即可补（最重要发现）

**① Recall Tracking Layer（召回追踪层）**
Taiji MemorySystem 记录"存了什么"，完全不记录"被用了几次、谁用、质量如何"
→ 没有召回统计 → Dreaming 评分算法跑不起来
→ 建议：在 MemorySystem 内新建 tracking/ 模块

**② Active Memory Manager（主动记忆管理）**
OpenCLAW v2026.4.11核心功能：subagent自动追踪偏好和知识
→ Taiji 可以复用 HeartbeatManager 的事件机制实现事件驱动的主动记忆

**③ Pluggable Memory Provider Interface**
Hermes v0.7 架构：MemoryProvider 可拔插
→ Taiji 只需定义接口 + 开发 Qdrant/LanceDB 两个实现，生产即可用

**④ Durable Task Ledger（持久化任务账本）**
OpenCLAW SQLite统一任务账本，失败可恢复
→ Taiji 完全缺失，EvolutionSystem 需要这个才能真正持久化进化历史

### 🟡 中期可补
- Pluggable Context Engine（上下文组装层）— OpenCLAW+Hermes都在做
- MCP Client + Server 双模
- Graph Memory Link（知识图谱记忆）
- Voice Mode 入口

### 🟢 长期方向
- OPD轨迹训练（让EvolutionSystem真正闭环）
- Multi-Agent Profiles
- Pluggable Sandbox Backend

---

## 五、最核心结论

**Taiji 最缺的三个东西：**
1. **Recall Tracking** — 记忆存了白存，没有召回统计，DREAMING跑不起来
2. **Context Engine** — 各子系统输出独立，无法感知用户当前场景
3. **消息Adapter** — README承诺10+个，代码0个，飞书+企微是最大市场需求

---

## 六、OpenTaiji 补全进度（2026-04-18更新）

| 调研建议 | OpenTaiji实现状态 | 文件 |
|----------|-------------------|------|
| Recall Tracking Layer | ✅ 已完成 | RecallTracker.ts |
| Context Engine | ✅ 已完成 | ContextEngine.ts + Scanner + Assembler |
| 消息Adapter | ✅ 已完成 | FeishuAdapter + WeComAdapter + WechatAdapter |
| Active Memory Manager | 🟡 待开发 | - |
| Durable Task Ledger | ❌ 待开发 | - |
| Pluggable Memory Provider | 🟡 待开发 | - |
