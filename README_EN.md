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

**Why it matters**: An environmental review agent should be rigorous and compliance-focused. A creative assistant should be imaginative. Kunlun lets you define and distill these personalities.

### 🤝 Multi-Agent Collaboration

```typescript
// One task, multiple agents working together
const task = {
  type: 'environmental_review',
  agents: [
    { id: 'reviewer', role: 'lead_reviewer' },      // 环评审批
    { id: 'water_expert', role: 'water_expert' },      // 水环境
    { id: 'air_expert', role: 'air_expert' },         // 大气环境
    { id: 'compliance_checker', role: 'compliance_checker' },  // 督察审查
  ]
};

// Agents coordinate, share context, and deliver unified results
await kunlun.executeCollaborativeTask(task);
```

### ⚡ Skill Evolution System

Agents improve themselves through:
- **RL Training Flywheel**: Real-world task execution → trajectory data → model improvement
- **Genetic Mutation**: Skill variants compete and evolve
- **Cross-Domain Transfer**: Successful patterns spread to other domains

---

## 🚀 Quick Start

```typescript
import { KunlunFramework } from 'kunlun-framework';

const kunlun = new KunlunFramework({
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },
  skillSystem: {
    maxSkillsPerUser: 100,
    skillIsolation: 'venv'
  }
});

await kunlun.initialize();
```

---

## 📦 Installation

```bash
npm install kunlun-framework
```

---

## 🔧 Configuration

```typescript
const config: KunlunConfig = {
  // Multi-tenancy
  multiTenant: {
    enabled: true,
    isolationLevel: 'standard'
  },

  // Skill system
  skillSystem: {
    maxSkillsPerUser: 100,
    skillIsolation: 'venv',
    skillsPath: './skills'
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
  }
};
```

---

## 🧪 Testing

```bash
npm test
```

---

## 📚 Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Contributing](./CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

Apache 2.0 - See [LICENSE](./LICENSE)

---

## 🙏 Acknowledgments

OpenTaiji integrates core capabilities from:

- [OpenCLAW](https://github.com/clawdotnet/openclaw) - Multi-platform messaging gateway
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - Self-learning and memory system
- [Claude Code](https://code.claude.com) - Professional code generation

**OpenTaiji Team**  
🌐 https://github.com/xiejianjun000/open-taiji
