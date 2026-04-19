---
name: eco-env-agent
description: 生态环境领域综合专家 Agent (VeADK) - 涵盖法律法规、典型案例、技术标准、环境基准等全要素知识库的智能专家系统
---

# 生态环境领域综合专家 Agent (VeADK)

本技能是一个基于 VeADK 框架构建的生态环境领域智能专家系统，能够为用户提供专业的生态环境领域问答服务。

## 架构设计

```
eco_env_expert (根Agent - 智能路由)
├── law_expert (法律法规专家)
├── standard_expert (技术标准专家)
├── case_expert (典型案例专家)
└── benchmark_expert (环境基准专家)
```

## Agent 功能说明

### 1. 根Agent: eco_env_expert
- **职责**: 智能路由，根据问题类型自动分配给合适的子Agent
- **能力**: 问题分类、多Agent协调、综合回答

### 2. 法律专家: law_expert
- **专长**: 法律法规查询和解读
- **知识库**: 20+法律、15+行政法规、14+部门规章
- **适用**: 法律条款、适用范围、效力层级

### 3. 标准专家: standard_expert  
- **专长**: 生态环境标准查询和技术解读
- **知识库**: 9大类标准体系、最新发布标准
- **适用**: 排放标准、监测方法、技术规范

### 4. 案例专家: case_expert
- **专长**: 生态环境损害赔偿案例分析
- **知识库**: 4批典型案例、赔偿流程
- **适用**: 典型案例、赔偿磋商、司法实践

### 5. 基准专家: benchmark_expert
- **专长**: 环境基准和鉴定评估技术
- **知识库**: 鉴定评估指南、基准计算工具
- **适用**: 基准推导、鉴定方法、评估流程

## 代码结构

```
eco-env-agent/
├── eco_env_agent/
│   ├── __init__.py
│   └── agent.py        # Agent代码定义
└── SKILL.md
```

## 使用方式

### 运行 Agent

```python
import asyncio
from veadk import Agent, Runner
from eco_env_agent import root_agent

async def main():
    runner = Runner(agent=root_agent)
    response = await runner.run("排污许可管理条例的主要内容是什么？")
    print(response)

asyncio.run(main())
```

### 导入特定 Agent

```python
from eco_env_agent.agent import (
    root_agent,
    law_expert,
    standard_expert,
    case_expert,
    benchmark_expert
)
```

## 问答示例

| 问题类型 | 示例问题 | 路由Agent |
|---------|---------|----------|
| 法律法规 | "排污许可管理条例的具体内容是什么？" | law_expert |
| 技术标准 | "2026年发布了哪些生态环境标准？" | standard_expert |
| 典型案例 | "生态环境损害赔偿典型案例有哪些？" | case_expert |
| 环境基准 | "生态环境损害鉴定评估技术指南的内容" | benchmark_expert |
| 综合问题 | "帮我分析一下某企业环评需要哪些法规和标准" | root_agent → 多Agent |

## 数据来源

- 中华人民共和国生态环境部：https://www.mee.gov.cn/
- 法规标准司：/ywgz/fgbz/
- 生态环境损害赔偿：/ywgz/fgbz/sthjshpczd/
- 标准文本：/ywgz/fgbz/bz/bzwb/

## 扩展能力

本Agent可以通过以下方式扩展：

1. **挂载更多工具**: 添加 web_search、link_reader 等工具增强检索能力
2. **增加子Agent**: 根据业务需求添加更多专业领域的子Agent
3. **结构化输出**: 通过 response_format 定义 Pydantic 模型实现结构化输出
4. **知识库集成**: 对接外部知识库系统提升专业能力
