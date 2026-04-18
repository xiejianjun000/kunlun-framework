# OpenTaiji

> **Open-source Multi-Agent Collaboration Framework**
> 
> Integrating OpenCLAW v2026.4.15 + Hermes v0.9.0 + Claude Code
>
> **Apache 2.0 License** — 100% open source, no restrictions

---

## 🎯 What is Taiji?

**Taiji is not just another AI agent. It's a framework for agents to work together.**

While other frameworks focus on a single agent helping one user, Taiji enables **multiple specialized agents to collaborate on complex tasks**. Think of it as building a team of AI experts, each with their own personality and skills, working together seamlessly.

### The Difference

| Framework | Focus | Best For |
|-----------|-------|----------|
| OpenClaw | Personal AI assistant | Individual users, local-first |
| Hermes | Self-improving agent | Users who want agents that learn |
| **Taiji** | Multi-agent collaboration | Teams, enterprises, complex workflows |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      OpenTaiji                        │
├─────────────────────────────────────────────────────────────┤
│  L1 Integration    →  WeChat/Feishu/DingTalk/20+ platforms  │
│  L2 Gateway        →  Auth + Routing + Rate Limiting         │
│  L3 Coordination   →  Actor Runtime + Dreaming System        │
│  L4 Execution      →  Skills + Memory + Personality + Evolution │
│  L5 Data           →  PostgreSQL + Qdrant + Redis + Kafka   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Capabilities

### 🎭 Personality Distillation System

Every agent in Taiji has a unique personality:

```typescript
interface IPersonalitySystem {
  dimensions: {
    communication_style: PersonalityDimension;  // How it talks
    decision_making: PersonalityDimension;      // How it decides
    learning_preference: PersonalityDimension;  // How it learns
    creativity: PersonalityDimension;           // How it creates
    risk_tolerance: PersonalityDimension;       // How it handles risk
  };
}
```

**Why it matters**: An environmental review agent (仓颉) should be rigorous and compliance-focused. A creative assistant should be imaginative. Taiji lets you define and distill these personalities.

### 🤝 Multi-Agent Collaboration

```typescript
// One task, multiple agents working together
const task = {
  type: 'environmental_review',
  agents: [
    { id: 'cangjie', role: 'lead_reviewer' },      // 环评审批
    { id: 'yinglong', role: 'water_expert' },      // 水环境
    { id: 'zhurong', role: 'air_expert' },         // 大气环境
    { id: 'diting', role: 'compliance_checker' },  // 督察审查
  ]
};

// Agents coordinate, share context, and deliver unified results
await Taiji.executeCollaborativeTask(task);
```

### 🔧 Skill Ecosystem Compatibility

Taiji unifies skill formats from major frameworks:

```
UnifiedSkill = ClawHub + Hermes + Taiji
```

- Import skills from ClawHub marketplace
- Convert Hermes skills to Taiji format
- Create new Taiji-native skills

### 💓 Heartbeat Self-Check System

Three lines of defense to keep agents on track:

| Defense Layer | Trigger | Action |
|---------------|---------|--------|
| Real-time check | Before each response | Verify SOUL compliance |
| Heartbeat patrol | Every 30 minutes | Review recent behavior |
| User feedback | When user says "off track" | Deep correction |

**Built-in checkers**:
- `persona_compliance` — Personality consistency
- `tool_call` — Tool call failure detection
- `memory_pollution` — Memory conflict detection
- `task_completion` — Long-running task alerts
- `system_health` — Resource monitoring

### 🔒 Enterprise-Ready Security

**Three-level security presets**:

| Preset | Sandbox | File Access | Commands | Use Case |
|--------|---------|-------------|----------|----------|
| developer | Off | Any | Any | Development |
| standard (default) | On | User folder | No sudo | Regular users |
| enterprise | Strict | App-only | App-only | Enterprises |

**Proactive authorization** for dangerous operations:
- Sudo commands, rm -rf
- Sensitive files (~/.ssh, .env)
- Unknown domains
- System modifications

---

## 🚀 Quick Start

### Installation

```bash
npm install open-taiji
```

### Create a Framework Instance

```typescript
import { TaijiFramework } from 'open-taiji';

const Taiji = new TaijiFramework({
  // Multi-tenant configuration
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },
  
  // Skill system
  skillSystem: {
    maxSkillsPerUser: 100,
    skillIsolation: 'venv'
  },
  
  // Memory system
  memorySystem: {
    vectorDb: {
      adapter: 'qdrant',
      url: 'localhost:6333'
    }
  },
  
  // Security
  security: {
    level: 'standard',
    approvalRequired: [
      'dangerous_commands',
      'sensitive_files',
      'system_modifications'
    ]
  },

  // Heartbeat (enabled by default)
  heartbeat: {
    interval: 30 * 60 * 1000,
    enableBuiltinCheckers: true,
  }
});
```

### Initialize and Run

```typescript
await Taiji.initialize(); // Heartbeat starts automatically

// Manual heartbeat check
const results = await Taiji.triggerHeartbeatCheck();

// Add custom check item
Taiji.addHeartbeatCheckItem({
  id: 'custom_check',
  name: 'Custom Check',
  severity: 'medium',
  check: async () => ({
    itemId: 'custom_check',
    status: 'pass',
    message: 'All good'
  })
});
```

---

## 🔌 Adapter System

### Storage Adapters

```typescript
import { LocalStorageAdapter } from 'open-taiji/adapters/storage/local';
import { S3StorageAdapter } from 'open-taiji/adapters/storage/s3';
import { MinioStorageAdapter } from 'open-taiji/adapters/storage/minio';
```

### Messaging Adapters

```typescript
import { WeChatAdapter } from 'open-taiji/adapters/messaging/wechat';
import { WeComAdapter } from 'open-taiji/adapters/messaging/wecom';
import { FeishuAdapter } from 'open-taiji/adapters/messaging/feishu';
```

### LLM Adapters

```typescript
import { OpenAIAdapter } from 'open-taiji/adapters/llm/openai';
import { DeepSeekAdapter } from 'open-taiji/adapters/llm/deepseek';
import { LocalModelAdapter } from 'open-taiji/adapters/llm/local';
```

---

## 🧪 Testing

```bash
npm test
npm run test:coverage
npm test -- --testPathPattern=heartbeat
```

---

## 📚 Documentation

- [Architecture Design](./docs/architecture.md)
- [Core Interfaces](./docs/interfaces.md)
- [Extension Points](./docs/extensions.md)
- [Adapter Development](./docs/adapters.md)
- [Security](./docs/security.md)
- [Heartbeat System](./src/core/heartbeat/heartbeat.md)
- [Deployment Guide](./docs/deployment.md)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

Apache 2.0 — See [LICENSE](./LICENSE)

---

## 🙏 Acknowledgments

Taiji integrates core capabilities from these excellent open-source projects:

- [OpenCLAW](https://github.com/openclaw/openclaw) — Multi-platform messaging gateway
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — Self-learning & memory system
- [Claude Code](https://code.claude.com) — Professional code generation

---

## 🌟 Why Choose Taiji?

**You need Taiji if:**

- ✅ You want multiple agents to work together (not just one)
- ✅ You need each agent to have a distinct personality
- ✅ You're building for teams or enterprises, not just individuals
- ✅ You want to leverage skills from ClawHub, Hermes, and Taiji ecosystems
- ✅ You need enterprise-grade security and audit capabilities

**Taiji Philosophy:**

> "Good architecture lets business happen naturally. Good incentives let ecosystems self-drive."

---

**OpenTaiji Team**  
📧 contact@open-taiji.dev  
🌐 https://open-taiji.dev
