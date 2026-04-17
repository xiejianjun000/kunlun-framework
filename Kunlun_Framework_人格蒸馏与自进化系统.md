# 昆仑框架：人格蒸馏与自进化系统

> **版本**：v1.0  
> **日期**：2026年4月18日  
> **定位**：企业级多智能体开源框架的智能进化核心系统

---

## 一、系统架构设计

### 1.1 整体架构全景图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Kunlun Framework v2.0                                   │
│                    人格蒸馏与自进化系统完整架构                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                           新增核心能力层 (New)                                    │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                   人格蒸馏引擎 (Personality Distiller)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐          │   │
│  │  │ 五维画像提取 │  │ 增量更新管理 │  │    隐私边界控制     │          │   │
│  │  │              │  │              │  │                     │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐          │   │
│  │  │ A/B验证模块  │  │ 版本控制引擎 │  │    多租户隔离器     │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                   技能自动生成系统 (Auto Skill Generator)                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐          │   │
│  │  │ 模式识别引擎 │  │ 技能候选生成 │  │    用户确认工作流    │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐          │   │
│  │  │ 质量控制模块 │  │ 技能验证优化 │  │    生命周期管理     │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                   技能生态兼容层 (Skill Ecosystem Bridge)               │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    UnifiedSkill 统一技能模型                      │  │   │
│  │  └──────────────────────────────────────────────────────────────────┘  │   │
│  │        ↑                        ↓                        ↑                │   │
│  │  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐     │   │
│  │  │ ClawHub适配器│  ←→   │ 核心接口层   │  ←→  │ Hermes适配器 │     │   │
│  │  │              │        │              │        │              │     │   │
│  │  └──────────────┘        └──────────────┘        └──────────────┘     │   │
│  │        ↑                        ↓                        ↑                │   │
│  │  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐     │   │
│  │  │ TypeScript   │        │ SkillInterface│        │ Python       │     │   │
│  │  │ SKILL标准    │        │ 抽象定义     │        │ SKILL.md标准 │     │   │
│  │  └──────────────┘        └──────────────┘        └──────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                   自我修改系统 (Self-Modification Engine)                 │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │   │
│  │  │  Layer 1: 技能层自修改 → Layer 2: 模型层自修改 → Layer 3: 架构层 │  │   │
│  │  └──────────────────────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐          │   │
│  │  │ 沙箱验证模块 │  │ 回滚管理模块 │  │    审计日志系统     │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                           Kunlun Core (已存在)                                    │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  Actor Runtime  │    │  Skill Engine   │    │  LLM Gateway    │            │
│  │   (OpenCLAW)   │    │    (Hermes)     │    │                 │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   Memory Hub    │    │  Evolution Eng  │    │   RAG Pipeline  │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 五大核心能力关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         五大核心能力协同关系                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ┌─────────────────────┐                              │
│                        │   人格蒸馏引擎      │                              │
│                        │  (用户画像核心)     │                              │
│                        └──────────┬──────────┘                              │
│                                   │                                          │
│           ┌───────────────────────┼───────────────────────┐                 │
│           │                       │                       │                 │
│           ↓                       ↓                       ↓                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ 技能自动生成    │    │ 自我修改系统    │    │ 技能生态兼容    │         │
│  │ (人格引导技能)  │    │ (画像驱动优化)  │    │ (跨平台部署)   │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                       │                       │                  │
│           └───────────────────────┼───────────────────────┘                 │
│                                   ↓                                          │
│                        ┌─────────────────────┐                              │
│                        │   昆仑框架核心层    │                              │
│                        │  Actor + Skill + LLM│                              │
│                        └─────────────────────┘                              │
│                                   ↓                                          │
│                        ┌─────────────────────┐                              │
│                        │   三级部署整合      │                              │
│                        │  省/市/县差异化配置 │                              │
│                        └─────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 核心数据流

```
用户对话流
    │
    ├─→ 人格蒸馏引擎 → 更新五维画像
    │                      │
    │                      ├─→ 驱动技能生成偏好
    │                      ├─→ 优化模型选择策略
    │                      └─→ 调整交互风格
    │
    ├─→ 模式识别引擎 → 检测重复任务/可模式化序列
    │                      │
    │                      └─→ 触发技能自动生成
    │
    └─→ 执行轨迹收集 → 驱动自我修改系统
                            │
                            ├─→ 技能层优化
                            ├─→ 模型层优化
                            └─→ 架构层优化
```

---

## 二、人格蒸馏引擎详细设计

### 2.1 五维画像Schema

```json
{
  "user_profile": {
    "profile_id": "up_xxxxxxxxxxxx",
    "user_id": "user_123456",
    "tenant_id": "tenant_hunan",
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-04-18T14:22:00Z",
    "version": 15,
    "confidence_score": 0.87,
    "privacy_settings": {
      "no_distill_topics": ["医疗", "政治", "宗教"],
      "distill_level": "standard"
    },
    
    "五维画像": {
      "personality": {
        "description": "人格特征 - 相对稳定的心理特质",
        "dimensions": {
          "extraversion_introversion": {
            "value": 0.65,
            "label": "外向型",
            "confidence": 0.82,
            "evidence": [
              "喜欢参与团队讨论",
              "主动发起新话题",
              "回复频率高"
            ]
          },
          "openness_conservatism": {
            "value": 0.78,
            "label": "高开放性",
            "confidence": 0.75,
            "evidence": [
              "愿意尝试新功能",
              "接受AI建议比例高"
            ]
          },
          "rationality_emotion": {
            "value": 0.72,
            "label": "偏理性",
            "confidence": 0.88,
            "evidence": [
              "决策前要求数据分析",
              "偏好结构化输出"
            ]
          },
          "risk_tolerance": {
            "value": 0.45,
            "label": "中等风险偏好",
            "confidence": 0.70,
            "evidence": [
              "愿意自动化但要求确认",
              "关键决策需人工审核"
            ]
          }
        },
        "stable_traits": ["谨慎", "专业导向", "效率优先"]
      },
      
      "perspective": {
        "description": "视角偏好 - 信息处理与决策风格",
        "dimensions": {
          "decision_style": {
            "value": "deliberate",
            "label": "深思熟虑型",
            "confidence": 0.85,
            "evidence": [
              "请求多次验证结果",
              "等待充分信息后决策"
            ]
          },
          "information_processing": {
            "value": "systematic",
            "label": "系统性处理",
            "confidence": 0.80,
            "evidence": [
              "偏好完整报告而非摘要",
              "关注方法论而非单一结论"
            ]
          },
          "authority_orientation": {
            "value": 0.60,
            "label": "中等权威尊重",
            "confidence": 0.72,
            "evidence": [
              "重视合规性检查",
              "接受规范但也会质疑"
            ]
          }
        },
        "preferred_formats": ["详细报告", "数据表格", "流程图"],
        "avoid_formats": ["纯口语化回复"]
      },
      
      "worldview": {
        "description": "世界观 - 对事物本质的理解框架",
        "dimensions": {
          "causality_belief": {
            "value": "evidence_based",
            "label": "证据驱动因果观",
            "confidence": 0.88,
            "evidence": [
              "要求提供数据支持",
              "质疑缺乏依据的结论"
            ]
          },
          "system_complexity": {
            "value": "high",
            "label": "高系统复杂性认知",
            "confidence": 0.76,
            "evidence": [
              "理解多因素影响",
              "关注间接效应"
            ]
          },
          "temporal_orientation": {
            "value": "medium_term",
            "label": "中期导向",
            "confidence": 0.70,
            "evidence": [
              "关注季度目标",
              "平衡短期效率和长期价值"
            ]
          }
        },
        "core_beliefs": [
          "系统性方法优于直觉判断",
          "数据是决策的基础",
          "持续改进是必要的"
        ]
      },
      
      "values": {
        "description": "价值观 - 核心价值排序与优先级",
        "dimensions": {
          "value_hierarchy": {
            "priority_1": {
              "value": "合规性",
              "weight": 0.30,
              "evidence": "任何建议必须符合法规"
            },
            "priority_2": {
              "value": "效率",
              "weight": 0.25,
              "evidence": "持续优化流程以节省时间"
            },
            "priority_3": {
              "value": "准确性",
              "weight": 0.20,
              "evidence": "宁可慢一点也要确保正确"
            },
            "priority_4": {
              "value": "可解释性",
              "weight": 0.15,
              "evidence": "需要理解AI决策逻辑"
            },
            "priority_5": {
              "value": "创新性",
              "weight": 0.10,
              "evidence": "愿意尝试新方法但需验证"
            }
          },
          "底线原则": [
            "绝不违反法律法规",
            "不降低数据安全标准",
            "关键决策必须可追溯"
          ],
          "trade_off_patterns": {
            "speed_vs_accuracy": "牺牲速度保准确",
            "cost_vs_quality": "优先质量",
            "autonomy_vs_control": "人机协作而非完全自动化"
          }
        },
        "confidence": 0.83
      },
      
      "life_philosophy": {
        "description": "人生观 - 目标导向与意义追求",
        "dimensions": {
          "goal_orientation": {
            "primary_goals": [
              "提升工作效率",
              "减少重复性工作",
              "提高专业能力"
            ],
            "confidence": 0.85
          },
          "time_value": {
            "value": "high",
            "label": "高时间价值感",
            "evidence": "对浪费时间极度敏感"
          },
          "meaning_pursuit": {
            "value": "competence_mastery",
            "label": "追求能力精进",
            "evidence": "关注技能提升而非职位晋升"
          },
          "work_style": {
            "collaboration_preference": "selective",
            "autonomy_need": "high",
            "feedback_frequency": "monthly"
          }
        },
        "confidence": 0.78
      }
    },
    
    "画像演变历史": [
      {
        "version": 1,
        "timestamp": "2026-01-15T10:30:00Z",
        "trigger": "初始画像创建",
        "changes": {
          "initial": true,
          "sample_size": 50
        }
      },
      {
        "version": 8,
        "timestamp": "2026-02-20T16:45:00Z",
        "trigger": "使用模式变化检测",
        "changes": {
          "extraversion_introversion": "0.50 → 0.65",
          "reason": "新项目需要更多团队协作"
        }
      }
    ],
    
    "验证状态": {
      "last_ab_test": "2026-04-15T09:00:00Z",
      "ab_test_result": {
        "original_response_style": "formal_brief",
        "personalized_response_style": "formal_detailed",
        "preference_win_rate": 0.72,
        "significant": true
      }
    }
  }
}
```

### 2.2 蒸馏算法流程

```python
# kunlun/personality_distiller.py
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
from datetime import datetime
import asyncio
import json
from collections import defaultdict

class DistillDimension(Enum):
    PERSONALITY = "personality"
    PERSPECTIVE = "perspective"
    WORLDVIEW = "worldview"
    VALUES = "values"
    LIFE_PHILOSOPHY = "life_philosophy"

@dataclass
class DialogueEntry:
    """对话条目"""
    entry_id: str
    user_id: str
    timestamp: datetime
    user_message: str
    ai_response: str
    context: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ExtractionSignal:
    """提取信号"""
    dimension: DistillDimension
    sub_dimension: str
    signal_type: str  # 'explicit', 'implicit', 'behavioral'
    content: str
    confidence: float
    evidence: List[str]
    timestamp: datetime

@dataclass
class ProfileUpdate:
    """画像更新"""
    dimension: DistillDimension
    sub_dimension: str
    old_value: Any
    new_value: Any
    confidence_delta: float
    evidence: List[str]
    update_type: str  # 'override', 'increment', 'refine'

class PersonalityDistiller:
    """人格蒸馏引擎 - 从持续对话中自动提炼用户画像"""
    
    def __init__(
        self,
        profile_store: 'ProfileStore',
        llm_gateway: 'LLMGateway',
        ab_tester: 'ABTester',
        privacy_manager: 'PrivacyManager'
    ):
        self.profile_store = profile_store
        self.llm_gateway = llm_gateway
        self.ab_tester = ab_tester
        self.privacy_manager = privacy_manager
        
        # 配置参数
        self.min_samples_for_update = 10
        self.confidence_threshold = 0.75
        self.ab_test_sample_size = 50
        self.batch_process_interval = 100  # 每100条对话处理一次
        
        # 信号缓存
        self.signal_buffer: Dict[str, List[ExtractionSignal]] = defaultdict(list)
        
        # 信号提取提示词模板
        self.signal_extraction_prompt = """
你是一个用户行为分析师，需要从对话中提取用户的人格特征信号。

## 对话上下文
用户ID: {user_id}
对话时间: {timestamp}
用户消息: {user_message}
AI回复: {ai_response}

## 需要提取的维度

### 1. Personality (人格特征)
- extraversion_introversion: 外向/内向
- openness_conservatism: 开放/保守
- rationality_emotion: 理性/感性
- risk_tolerance: 风险偏好

### 2. Perspective (视角偏好)
- decision_style: 决策风格 (deliberate/impulsive/intuitive)
- information_processing: 信息处理方式 (systematic/intuitive)
- authority_orientation: 权威取向

### 3. Worldview (世界观)
- causality_belief: 因果观 (evidence_based/intuitive/mystical)
- system_complexity: 系统复杂性认知
- temporal_orientation: 时间导向

### 4. Values (价值观)
- 核心价值排序
- 底线原则
- 权衡模式

### 5. Life Philosophy (人生观)
- 目标导向
- 时间价值
- 工作风格

## 输出格式
JSON格式输出提取的信号，confidence为0-1之间的置信度。
"""

    async def process_dialogue(
        self,
        dialogue: DialogueEntry
    ) -> List[ExtractionSignal]:
        """处理单条对话，提取人格信号"""
        
        # 1. 隐私检查
        if await self.privacy_manager.should_skip(dialogue):
            return []
        
        # 2. 快速规则匹配（低成本信号）
        fast_signals = await self._fast_rule_extraction(dialogue)
        
        # 3. LLM深度分析（高价值信号）
        deep_signals = await self._llm_deep_extraction(dialogue)
        
        # 4. 合并信号
        all_signals = fast_signals + deep_signals
        
        # 5. 缓冲存储
        self.signal_buffer[dialogue.user_id].extend(all_signals)
        
        # 6. 检查是否需要批量处理
        if len(self.signal_buffer[dialogue.user_id]) >= self.batch_process_interval:
            await self._batch_update_profile(dialogue.user_id)
        
        return all_signals

    async def _fast_rule_extraction(
        self,
        dialogue: DialogueEntry
    ) -> List[ExtractionSignal]:
        """快速规则匹配 - 无需LLM的低成本信号提取"""
        
        signals = []
        user_msg = dialogue.user_message.lower()
        
        # 规则1: 格式偏好检测
        format_signals = self._detect_format_preference(dialogue)
        signals.extend(format_signals)
        
        # 规则2: 决策风格检测
        decision_signals = self._detect_decision_style(dialogue)
        signals.extend(decision_signals)
        
        # 规则3: 时间敏感度检测
        time_signals = self._detect_time_sensitivity(dialogue)
        signals.extend(time_signals)
        
        return signals

    def _detect_format_preference(
        self,
        dialogue: DialogueEntry
    ) -> List[ExtractionSignal]:
        """检测格式偏好"""
        
        signals = []
        user_msg = dialogue.user_message
        ai_response = dialogue.ai_response
        
        # 检测用户请求的格式
        format_keywords = {
            'detailed': ['详细', '完整', '全面', '详细说明', '详细分析'],
            'brief': ['简略', '简要', 'summary', '简短', '概括'],
            'table': ['表格', '表格形式', 'table', '列表'],
            'code': ['代码', 'code', '脚本', 'script'],
            'chart': ['图表', 'chart', '可视化', 'chart']
        }
        
        for fmt, keywords in format_keywords.items():
            if any(kw in user_msg for kw in keywords):
                signals.append(ExtractionSignal(
                    dimension=DistillDimension.PERSPECTIVE,
                    sub_dimension=f'preferred_format_{fmt}',
                    signal_type='explicit',
                    content=f'请求{fmt}格式',
                    confidence=0.9,
                    evidence=[user_msg],
                    timestamp=dialogue.timestamp
                ))
        
        # 检测AI响应格式偏好
        if len(ai_response) > 2000:
            signals.append(ExtractionSignal(
                dimension=DistillDimension.PERSPECTIVE,
                sub_dimension='information_processing',
                signal_type='behavioral',
                content='接受长文本',
                confidence=0.7,
                evidence=['AI回复超过2000字'],
                timestamp=dialogue.timestamp
            ))
        
        return signals

    def _detect_decision_style(
        self,
        dialogue: DialogueEntry
    ) -> List[ExtractionSignal]:
        """检测决策风格"""
        
        signals = []
        user_msg = dialogue.user_message
        
        # 深思熟虑型信号
        deliberate_keywords = [
            '分析一下', '评估', '比较', '权衡', '考虑',
            '优点缺点', '利弊', '风险', '建议'
        ]
        
        if any(kw in user_msg for kw in deliberate_keywords):
            signals.append(ExtractionSignal(
                dimension=DistillDimension.PERSPECTIVE,
                sub_dimension='decision_style',
                signal_type='implicit',
                content='deliberate',
                confidence=0.6,
                evidence=['使用分析性词汇'],
                timestamp=dialogue.timestamp
            ))
        
        # 快速决策型信号
        quick_decision_keywords = [
            '直接', '立刻', '马上', '立即执行', '快速'
        ]
        
        if any(kw in user_msg for kw in quick_decision_keywords):
            signals.append(ExtractionSignal(
                dimension=DistillDimension.PERSPECTIVE,
                sub_dimension='decision_style',
                signal_type='implicit',
                content='decisive',
                confidence=0.5,
                evidence=['使用快速行动词汇'],
                timestamp=dialogue.timestamp
            ))
        
        return signals

    def _detect_time_sensitivity(
        self,
        dialogue: DialogueEntry
    ) -> List[ExtractionSignal]:
        """检测时间敏感度"""
        
        signals = []
        user_msg = dialogue.user_message
        
        # 高时间价值信号
        time_urgency_keywords = [
            '紧急', '快', '尽快', '马上', '立刻',
            '没时间', '赶时间', 'deadline'
        ]
        
        if any(kw in user_msg for kw in time_urgency_keywords):
            signals.append(ExtractionSignal(
                dimension=DistillDimension.LIFE_PHILOSOPHY,
                sub_dimension='time_value',
                signal_type='explicit',
                content='high',
                confidence=0.7,
                evidence=['表达时间紧迫'],
                timestamp=dialogue.timestamp
            ))
        
        # 详细规划信号
        planning_keywords = ['计划', '安排', 'schedule', '规划']
        
        if any(kw in user_msg for kw in planning_keywords):
            signals.append(ExtractionSignal(
                dimension=DistillDimension.WORLDVIEW,
                sub_dimension='temporal_orientation',
                signal_type='implicit',
                content='planned',
                confidence=0.6,
                evidence=['关注计划安排'],
                timestamp=dialogue.timestamp
            ))
        
        return signals

    async def _llm_deep_extraction(
        self,
        dialogue: DialogueEntry
    ) -> List[ExtractionSignal]:
        """LLM深度分析 - 复杂信号提取"""
        
        # 构建提示词
        prompt = self.signal_extraction_prompt.format(
            user_id=dialogue.user_id,
            timestamp=dialogue.timestamp.isoformat(),
            user_message=dialogue.user_message,
            ai_response=dialogue.ai_response[:1000]  # 限制长度
        )
        
        try:
            response = await self.llm_gateway.complete(
                messages=[{"role": "user", "content": prompt}],
                system="你是一个专业的用户行为分析师。"
            )
            
            # 解析LLM输出
            signals_data = json.loads(response.content)
            
            signals = []
            for dim_str, dim_data in signals_data.items():
                dim = DistillDimension(dim_str)
                
                for sub_dim, value_data in dim_data.items():
                    signals.append(ExtractionSignal(
                        dimension=dim,
                        sub_dimension=sub_dim,
                        signal_type='llm_inference',
                        content=value_data.get('value', value_data),
                        confidence=value_data.get('confidence', 0.5),
                        evidence=value_data.get('evidence', []),
                        timestamp=dialogue.timestamp
                    ))
            
            return signals
            
        except Exception as e:
            # LLM分析失败，返回空列表
            return []

    async def _batch_update_profile(self, user_id: str):
        """批量更新画像 - 聚合信号并更新"""
        
        # 1. 获取累积的信号
        signals = self.signal_buffer.get(user_id, [])
        if len(signals) < self.min_samples_for_update:
            return
        
        # 2. 清空缓冲
        self.signal_buffer[user_id] = []
        
        # 3. 加载当前画像
        current_profile = await self.profile_store.load(user_id)
        
        # 4. 聚合信号
        aggregated = self._aggregate_signals(signals)
        
        # 5. 生成更新
        updates = await self._generate_updates(current_profile, aggregated)
        
        # 6. A/B验证
        validated_updates = await self._ab_validate(user_id, current_profile, updates)
        
        # 7. 应用更新
        if validated_updates:
            new_profile = self._apply_updates(current_profile, validated_updates)
            await self.profile_store.save(new_profile)

    def _aggregate_signals(
        self,
        signals: List[ExtractionSignal]
    ) -> Dict[str, Dict[str, List[ExtractionSignal]]]:
        """聚合信号 - 按维度和子维度分组"""
        
        aggregated = defaultdict(lambda: defaultdict(list))
        
        for signal in signals:
            aggregated[signal.dimension.value][signal.sub_dimension].append(signal)
        
        return aggregated

    async def _generate_updates(
        self,
        current_profile: 'UserProfile',
        aggregated: Dict
    ) -> List[ProfileUpdate]:
        """生成画像更新"""
        
        updates = []
        
        for dim_str, sub_dims in aggregated.items():
            dim = DistillDimension(dim_str)
            
            for sub_dim, signals in sub_dims.items():
                # 计算加权置信度
                weighted_confidence = sum(
                    s.confidence * len(s.evidence) 
                    for s in signals
                ) / sum(len(s.evidence) for s in signals)
                
                # 检查是否达到更新阈值
                if weighted_confidence < self.confidence_threshold:
                    continue
                
                # 获取当前值
                current_value = self._get_current_value(current_profile, dim, sub_dim)
                
                # 计算新值（多数投票或加权平均）
                new_value = self._calculate_new_value(signals, current_value)
                
                updates.append(ProfileUpdate(
                    dimension=dim,
                    sub_dimension=sub_dim,
                    old_value=current_value,
                    new_value=new_value,
                    confidence_delta=weighted_confidence,
                    evidence=[s.content for s in signals[:5]],  # 保留前5个证据
                    update_type='increment'
                ))
        
        return updates

    async def _ab_validate(
        self,
        user_id: str,
        current_profile: 'UserProfile',
        updates: List[ProfileUpdate]
    ) -> List[ProfileUpdate]:
        """A/B测试验证更新"""
        
        if len(updates) == 0:
            return []
        
        # 创建测试画像
        test_profile = self._apply_updates(current_profile, updates)
        
        # 准备A/B测试
        test_prompt = self._build_test_prompt(updates)
        
        try:
            # 执行A/B测试
            result = await self.ab_tester.run(
                user_id=user_id,
                control_prompt=self._generate_prompt_from_profile(current_profile, test_prompt),
                treatment_prompt=self._generate_prompt_from_profile(test_profile, test_prompt),
                sample_size=self.ab_test_sample_size
            )
            
            # 筛选显著的更新
            validated_updates = [
                u for u in updates 
                if result.get(f"{u.dimension.value}.{u.sub_dimension}", {}).get('significant', False)
            ]
            
            return validated_updates
            
        except Exception:
            # A/B测试失败，返回原始更新
            return updates

    def _apply_updates(
        self,
        profile: 'UserProfile',
        updates: List[ProfileUpdate]
    ) -> 'UserProfile':
        """应用更新到画像"""
        
        for update in updates:
            path = f"{update.dimension.value}.{update.sub_dimension}"
            self._set_nested_value(profile, path, update.new_value)
        
        profile.version += 1
        profile.updated_at = datetime.now()
        
        return profile

    async def get_personalized_context(
        self,
        user_id: str,
        query_type: str
    ) -> Dict[str, Any]:
        """获取个性化上下文"""
        
        profile = await self.profile_store.load(user_id)
        
        if not profile:
            return {'style': 'default'}
        
        # 根据查询类型返回不同的上下文
        if query_type == 'response_style':
            return {
                'style': profile.personality.get('communication_style', 'neutral'),
                'detail_level': profile.perspective.get('detail_preference', 'medium'),
                'format_preference': profile.perspective.get('preferred_formats', [])
            }
        elif query_type == 'skill_recommendation':
            return {
                'complexity': profile.personality.get('task_complexity', 'medium'),
                'automation_level': profile.values.get('autonomy_preference', 'collaborative')
            }
        else:
            return {'profile': profile}
```

### 2.3 存储与检索设计

```python
# kunlun/profile_store.py
from dataclasses import dataclass
from typing import Dict, List, Optional
import json
from datetime import datetime
import asyncio
import aiofiles

class ProfileStore:
    """人格画像存储"""
    
    def __init__(
        self,
        storage_path: str,
        cache_size: int = 1000
    ):
        self.storage_path = storage_path
        self.cache: Dict[str, 'UserProfile'] = {}
        self.cache_size = cache_size
        self.lru_keys: List[str] = []
        
    async def load(self, user_id: str) -> Optional['UserProfile']:
        """加载用户画像"""
        
        # 1. 检查缓存
        if user_id in self.cache:
            return self.cache[user_id]
        
        # 2. 从存储加载
        file_path = f"{self.storage_path}/{user_id}/profile.json"
        
        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                profile_data = json.loads(content)
                profile = self._deserialize_profile(profile_data)
                
            # 3. 更新缓存
            self._update_cache(user_id, profile)
            
            return profile
            
        except FileNotFoundError:
            return None
    
    async def save(self, profile: 'UserProfile') -> bool:
        """保存用户画像"""
        
        # 1. 更新缓存
        self._update_cache(profile.user_id, profile)
        
        # 2. 确保目录存在
        dir_path = f"{self.storage_path}/{profile.user_id}"
        await self._ensure_dir(dir_path)
        
        # 3. 保存到文件
        file_path = f"{dir_path}/profile.json"
        profile_data = self._serialize_profile(profile)
        
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(profile_data, indent=2, ensure_ascii=False))
        
        # 4. 保存版本历史
        await self._save_version_history(profile)
        
        return True
    
    async def search_similar(
        self,
        profile: 'UserProfile',
        dimension: Optional[str] = None,
        limit: int = 10
    ) -> List[tuple]:
        """
        搜索相似画像
        返回: List[(user_id, similarity_score)]
        """
        
        # 1. 提取查询向量
        query_vector = self._extract_profile_vector(profile, dimension)
        
        # 2. 遍历计算相似度
        similarities = []
        
        for cached_profile in self.cache.values():
            if cached_profile.user_id == profile.user_id:
                continue
            
            candidate_vector = self._extract_profile_vector(cached_profile, dimension)
            similarity = self._cosine_similarity(query_vector, candidate_vector)
            
            similarities.append((cached_profile.user_id, similarity))
        
        # 3. 排序返回
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:limit]
    
    def _extract_profile_vector(
        self,
        profile: 'UserProfile',
        dimension: Optional[str] = None
    ) -> List[float]:
        """提取画像向量"""
        
        if dimension:
            dim_data = getattr(profile, dimension, {})
            return self._flatten_dimensions(dim_data)
        else:
            # 全部维度
            return self._flatten_dimensions({
                'personality': profile.personality,
                'perspective': profile.perspective,
                'worldview': profile.worldview,
                'values': profile.values,
                'life_philosophy': profile.life_philosophy
            })
    
    def _flatten_dimensions(self, data: Dict) -> List[float]:
        """扁平化维度数据为向量"""
        
        vector = []
        
        def _extract(obj):
            if isinstance(obj, dict):
                for v in obj.values():
                    _extract(v)
            elif isinstance(obj, list):
                for item in obj:
                    _extract(item)
            elif isinstance(obj, (int, float)):
                vector.append(float(obj))
        
        _extract(data)
        return vector
    
    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """计算余弦相似度"""
        
        if len(v1) != len(v2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(v1, v2))
        norm1 = sum(a * a for a in v1) ** 0.5
        norm2 = sum(b * b for b in v2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)

class PrivacyManager:
    """隐私边界管理器"""
    
    def __init__(self):
        self.no_distill_topics = {
            'medical': ['医疗', '疾病', '健康检查', '治疗方案'],
            'political': ['政治', '选举', '政党'],
            'religious': ['宗教', '信仰', '教堂', '寺庙'],
            'financial_personal': ['个人收入', '存款', '工资', '理财详情'],
            'legal_personal': ['个人法律纠纷', '离婚', '遗嘱']
        }
        
    async def should_skip(self, dialogue: DialogueEntry) -> bool:
        """判断是否应该跳过蒸馏"""
        
        user_msg = dialogue.user_message.lower()
        ai_response = dialogue.ai_response.lower()
        combined = user_msg + ai_response
        
        # 检查是否涉及敏感话题
        for topic, keywords in self.no_distill_topics.items():
            if any(kw in combined for kw in keywords):
                return True
        
        # 检查用户隐私设置
        # (实际应从用户配置中读取)
        
        return False
    
    async def redact_sensitive(self, text: str, topic: str) -> str:
        """脱敏敏感信息"""
        
        # 简单的正则替换
        import re
        
        patterns = {
            'phone': r'\d{11}',
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'id_card': r'\d{17}[\dXx]',
            'bank_card': r'\d{16,19}'
        }
        
        for name, pattern in patterns.items():
            text = re.sub(pattern, f'[{name}_redacted]', text)
        
        return text
```

### 2.4 隐私保护机制

```python
# kunlun/privacy_shield.py
from dataclasses import dataclass
from typing import Set, List, Optional
from enum import Enum
import hashlib

class PrivacyLevel(Enum):
    PUBLIC = "public"           # 可被蒸馏
    SENSITIVE = "sensitive"     # 需显式授权
    RESTRICTED = "restricted"   # 完全不蒸馏

@dataclass
class PrivacyConfig:
    """隐私配置"""
    user_id: str
    default_level: PrivacyLevel = PrivacyLevel.PUBLIC
    excluded_topics: Set[str] = None
    allowed_inference_depth: int = 2  # 推理深度限制
    retention_days: int = 365        # 画像保留天数
    export_allowed: bool = False

class PrivacyShield:
    """隐私保护盾"""
    
    def __init__(self):
        self.configs: dict = {}
        
    async def check_distill_permission(
        self,
        user_id: str,
        content_type: str,
        content: str
    ) -> tuple[bool, str]:
        """
        检查是否允许蒸馏
        返回: (允许, 原因)
        """
        
        config = self.configs.get(user_id)
        
        if not config:
            return True, "默认允许"
        
        # 检查主题排除
        if config.excluded_topics:
            for topic in config.excluded_topics:
                if topic in content.lower():
                    return False, f"内容涉及排除主题: {topic}"
        
        # 检查内容类型
        if content_type in ['medical', 'financial', 'legal']:
            if config.default_level == PrivacyLevel.RESTRICTED:
                return False, f"内容类型 {content_type} 被限制"
        
        return True, "允许"
    
    async def apply_inference_limit(
        self,
        user_id: str,
        extracted_data: dict,
        max_depth: int = 2
    ) -> dict:
        """应用推理深度限制"""
        
        config = self.configs.get(user_id)
        depth_limit = config.allowed_inference_depth if config else max_depth
        
        def truncate(data, current_depth=0):
            if current_depth >= depth_limit:
                return {"_truncated": True, "_reason": "推理深度超限"}
            
            if isinstance(data, dict):
                return {k: truncate(v, current_depth + 1) for k, v in data.items()}
            elif isinstance(data, list):
                return [truncate(item, current_depth + 1) for item in data[:5]]  # 限制列表长度
            else:
                return data
        
        return truncate(extracted_data)
    
    async def generate_consent_request(
        self,
        user_id: str,
        request_type: str,
        data_categories: List[str]
    ) -> dict:
        """生成用户同意请求"""
        
        return {
            "request_id": hashlib.md5(f"{user_id}{request_type}".encode()).hexdigest(),
            "user_id": user_id,
            "request_type": request_type,
            "data_categories": data_categories,
            "purpose": self._get_purpose_description(request_type),
            "options": {
                "accept": "同意以上数据被用于画像优化",
                "partial": "仅接受部分类别",
                "decline": "拒绝本次请求"
            },
            "valid_until": "用户主动修改"
        }
```

---

## 三、技能自动生成系统

### 3.1 模式识别算法

```python
# kunlun/auto_skill_generator.py
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from enum import Enum
from datetime import datetime, timedelta
import hashlib
import json

class PatternType(Enum):
    SEQUENTIAL = "sequential"        # 顺序模式
    CONDITIONAL = "conditional"       # 条件分支
    REPETITIVE = "repetitive"         # 重复模式
    COMPOSITE = "composite"           # 复合模式

@dataclass
class DialogueSequence:
    """对话序列"""
    sequence_id: str
    user_id: str
    messages: List[Dict]
    start_time: datetime
    end_time: datetime
    tool_calls: List[Dict]
    outcomes: List[str]
    
@dataclass
class SkillPattern:
    """技能模式"""
    pattern_id: str
    pattern_type: PatternType
    sequence_templates: List[str]
    input_schema: Dict
    output_schema: Dict
    steps: List[Dict]
    confidence: float
    sample_count: int
    evidence: List[str]

class PatternRecognizer:
    """模式识别引擎"""
    
    def __init__(
        self,
        sequence_store: 'SequenceStore',
        llm_gateway: 'LLMGateway'
    ):
        self.sequence_store = sequence_store
        self.llm_gateway = llm_gateway
        
        # 模式识别阈值
        self.min_occurrences = 3
        self.sequence_similarity_threshold = 0.75
        self.tool_call_threshold = 3
        
        # 缓存
        self.pattern_cache: Dict[str, SkillPattern] = {}
        
    async def recognize_patterns(
        self,
        user_id: str,
        lookback_days: int = 7
    ) -> List[SkillPattern]:
        """识别用户对话中的模式"""
        
        # 1. 收集对话序列
        sequences = await self._collect_sequences(user_id, lookback_days)
        
        # 2. 检测顺序模式
        sequential_patterns = await self._detect_sequential_patterns(sequences)
        
        # 3. 检测条件分支模式
        conditional_patterns = await self._detect_conditional_patterns(sequences)
        
        # 4. 检测重复模式
        repetitive_patterns = await self._detect_repetitive_patterns(sequences)
        
        # 5. 合并生成复合模式
        all_patterns = (
            sequential_patterns + 
            conditional_patterns + 
            repetitive_patterns
        )
        
        # 6. 过滤低置信度模式
        high_confidence_patterns = [
            p for p in all_patterns 
            if p.confidence >= self.sequence_similarity_threshold
        ]
        
        return high_confidence_patterns
    
    async def _collect_sequences(
        self,
        user_id: str,
        lookback_days: int
    ) -> List[DialogueSequence]:
        """收集对话序列"""
        
        cutoff_time = datetime.now() - timedelta(days=lookback_days)
        
        # 从存储中获取序列
        sequences = await self.sequence_store.get_sequences(
            user_id=user_id,
            start_time=cutoff_time
        )
        
        return sequences
    
    async def _detect_sequential_patterns(
        self,
        sequences: List[DialogueSequence]
    ) -> List[SkillPattern]:
        """检测顺序模式"""
        
        # 1. 提取工具调用序列
        tool_sequences = []
        for seq in sequences:
            if len(seq.tool_calls) >= self.tool_call_threshold:
                tool_seq = [tc['tool_name'] for tc in seq.tool_calls]
                tool_sequences.append(tool_seq)
        
        if len(tool_sequences) < self.min_occurrences:
            return []
        
        # 2. 使用LLM识别常见序列
        patterns = await self._llm_identify_sequences(tool_sequences)
        
        return patterns
    
    async def _detect_conditional_patterns(
        self,
        sequences: List[DialogueSequence]
    ) -> List[SkillPattern]:
        """检测条件分支模式"""
        
        patterns = []
        
        # 分析决策点
        decision_points = self._analyze_decision_points(sequences)
        
        for decision in decision_points:
            if decision['frequency'] >= self.min_occurrences:
                pattern = SkillPattern(
                    pattern_id=self._generate_pattern_id(),
                    pattern_type=PatternType.CONDITIONAL,
                    sequence_templates=decision['conditions'],
                    input_schema=decision['input_schema'],
                    output_schema=decision['output_schema'],
                    steps=decision['steps'],
                    confidence=decision['frequency'] / len(sequences),
                    sample_count=decision['frequency'],
                    evidence=decision['examples']
                )
                patterns.append(pattern)
        
        return patterns
    
    async def _detect_repetitive_patterns(
        self,
        sequences: List[DialogueSequence]
    ) -> List[SkillPattern]:
        """检测重复模式"""
        
        patterns = []
        
        # 1. 识别重复的输入-输出对
        io_pairs = self._extract_io_pairs(sequences)
        
        # 2. 统计频率
        pair_frequencies = self._calculate_frequencies(io_pairs)
        
        # 3. 生成重复模式
        for pair, frequency in pair_frequencies.items():
            if frequency >= self.min_occurrences:
                pattern = SkillPattern(
                    pattern_id=self._generate_pattern_id(),
                    pattern_type=PatternType.REPETITIVE,
                    sequence_templates=[pair['input_template']],
                    input_schema=pair['input_schema'],
                    output_schema=pair['output_schema'],
                    steps=pair['steps'],
                    confidence=min(1.0, frequency / 10),  # 归一化
                    sample_count=frequency,
                    evidence=pair['examples']
                )
                patterns.append(pattern)
        
        return patterns
    
    async def _llm_identify_sequences(
        self,
        tool_sequences: List[List[str]]
    ) -> List[SkillPattern]:
        """使用LLM识别序列模式"""
        
        prompt = f"""
分析以下工具调用序列，识别可模式化的任务流程。

## 工具调用序列示例
{json.dumps(tool_sequences[:20], indent=2, ensure_ascii=False)}

## 任务
1. 识别重复出现的序列模式
2. 提取每个模式的通用步骤
3. 确定输入输出结构
4. 给出每个模式的置信度

## 输出格式
JSON数组，每个元素包含：
- pattern_id: 模式ID
- sequence_template: 典型序列
- steps: 执行步骤
- input_schema: 输入结构
- output_schema: 输出结构
- confidence: 置信度(0-1)
"""
        
        try:
            response = await self.llm_gateway.complete(
                messages=[{"role": "user", "content": prompt}]
            )
            
            patterns_data = json.loads(response.content)
            
            patterns = []
            for pdata in patterns_data:
                pattern = SkillPattern(
                    pattern_id=pdata.get('pattern_id', self._generate_pattern_id()),
                    pattern_type=PatternType.SEQUENTIAL,
                    sequence_templates=pdata.get('sequence_template', []),
                    input_schema=pdata.get('input_schema', {}),
                    output_schema=pdata.get('output_schema', {}),
                    steps=pdata.get('steps', []),
                    confidence=pdata.get('confidence', 0.5),
                    sample_count=len(tool_sequences),
                    evidence=[str(tool_sequences[:3])]
                )
                patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            return []
    
    def _generate_pattern_id(self) -> str:
        """生成模式ID"""
        return f"pattern_{hashlib.md5(str(datetime.now()).encode()).hexdigest()[:12]}"
```

### 3.2 技能模板设计

```yaml
# SKILL_TEMPLATE.md - 昆仑框架技能生成模板
---
skill_name: "{自动生成的技能名称}"
skill_id: "skill_{hash}"
version: "1.0.0"

# 元数据
metadata:
  generated_by: "auto_skill_generator"
  generated_at: "{timestamp}"
  source_pattern_id: "{pattern_id}"
  confidence: {confidence}
  sample_count: {sample_count}
  
  # 自动生成的标签
  tags:
    - "auto-generated"
    - "{domain}"
    - "{complexity}"
  
  # 权限信息
  permissions:
    required_tools: [{tool_list}]
    allowed_channels: ["*"]
    rate_limit: 100

# 触发条件
trigger:
  type: "semantic"  # 支持: keyword, semantic, explicit, behavioral
  conditions:
    # 语义条件
    semantic_conditions:
      - query_embedding_similarity: 0.85
        example_queries: [{examples}]
    
    # 行为条件
    behavioral_conditions:
      - tool_sequence: [{tool_a}, {tool_b}, ...]
        min_frequency: 3

# 输入定义
inputs:
  {input_schema}

# 输出定义
outputs:
  {output_schema}

# 执行步骤 (自动生成)
steps:
  {steps}

# 异常处理
error_handling:
  on_step_failure:
    strategy: "retry"  # retry, skip, abort, fallback
    max_retries: 2
    fallback_skill: null
  on_timeout:
    strategy: "extend"
    max_duration: 600
  on_quality_low:
    strategy: "human_review"
    threshold: 0.7

# 质量保障
quality:
  self_consistency_check: true
  consistency_threshold: 0.85
  output_validation: true
  validation_rules:
    - "输出格式符合schema"
    - "关键字段非空"

# 进化配置
evolution:
  auto_optimize: true
  collect_metrics: true
  improvement_threshold: 0.05
  min_feedback_for_update: 10

# 人格适配
personality_adaptation:
  # 基于人格画像的自适应配置
  complexity_tuning:
    # 根据用户的risk_tolerance调整
    high_risk_tolerance:
      skip_confirmation: true
      auto_execute: true
    low_risk_tolerance:
      skip_confirmation: false
      require_review: true
  
  detail_level:
    # 根据用户的detail_preference调整
    high_preference:
      include_reasoning: true
      include_alternatives: true
    low_preference:
      include_reasoning: false
      summary_only: true

# 生命周期
lifecycle:
  created_at: "{timestamp}"
  last_used: null
  usage_count: 0
  success_rate: null
  status: "candidate"  # candidate, active, deprecated
```

### 3.3 质量控制流程

```python
# kunlun/skill_quality_controller.py
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
from datetime import datetime

class QualityLevel(Enum):
    EXCELLENT = "excellent"    # >= 0.95
    GOOD = "good"              # >= 0.85
    ACCEPTABLE = "acceptable" # >= 0.70
    NEEDS_IMPROVEMENT = "needs_improvement"  # >= 0.50
    POOR = "poor"             # < 0.50

@dataclass
class QualityMetrics:
    """质量指标"""
    success_rate: float
    avg_execution_time: float
    user_rating_avg: float
    error_rate: float
    abandonment_rate: float
    
@dataclass
class QualityReport:
    """质量报告"""
    skill_id: str
    quality_level: QualityLevel
    metrics: QualityMetrics
    issues: List[str]
    recommendations: List[str]
    last_updated: datetime

class SkillQualityController:
    """技能质量控制器"""
    
    def __init__(
        self,
        metrics_store: 'MetricsStore',
        skill_registry: 'SkillRegistry'
    ):
        self.metrics_store = metrics_store
        self.skill_registry = skill_registry
        
        # 质量阈值
        self.thresholds = {
            QualityLevel.EXCELLENT: 0.95,
            QualityLevel.GOOD: 0.85,
            QualityLevel.ACCEPTABLE: 0.70,
            QualityLevel.NEEDS_IMPROVEMENT: 0.50
        }
        
        # 自动降权配置
        self.degradation_config = {
            'failure_threshold': 5,  # 连续失败次数
            'low_rating_threshold': 3.0,  # 平均评分低于此值
            'abandonment_threshold': 0.3  # 放弃率阈值
        }
        
    async def evaluate_skill(
        self,
        skill_id: str,
        lookback_days: int = 7
    ) -> QualityReport:
        """评估技能质量"""
        
        # 1. 收集指标
        metrics = await self._collect_metrics(skill_id, lookback_days)
        
        # 2. 计算综合分数
        quality_score = self._calculate_quality_score(metrics)
        
        # 3. 确定质量等级
        quality_level = self._determine_level(quality_score)
        
        # 4. 生成报告
        report = QualityReport(
            skill_id=skill_id,
            quality_level=quality_level,
            metrics=metrics,
            issues=self._identify_issues(metrics),
            recommendations=self._generate_recommendations(metrics, quality_level),
            last_updated=datetime.now()
        )
        
        # 5. 执行质量动作
        await self._execute_quality_actions(skill_id, report)
        
        return report
    
    async def _collect_metrics(
        self,
        skill_id: str,
        lookback_days: int
    ) -> QualityMetrics:
        """收集质量指标"""
        
        executions = await self.metrics_store.get_executions(
            skill_id=skill_id,
            lookback_days=lookback_days
        )
        
        if not executions:
            return QualityMetrics(
                success_rate=0.0,
                avg_execution_time=0.0,
                user_rating_avg=0.0,
                error_rate=0.0,
                abandonment_rate=0.0
            )
        
        total = len(executions)
        successes = sum(1 for e in executions if e.success)
        errors = sum(1 for e in executions if e.error)
        abandoned = sum(1 for e in executions if e.abandoned)
        
        ratings = [e.rating for e in executions if e.rating is not None]
        times = [e.execution_time for e in executions if e.execution_time]
        
        return QualityMetrics(
            success_rate=successes / total if total > 0 else 0,
            avg_execution_time=sum(times) / len(times) if times else 0,
            user_rating_avg=sum(ratings) / len(ratings) if ratings else 0,
            error_rate=errors / total if total > 0 else 0,
            abandonment_rate=abandoned / total if total > 0 else 0
        )
    
    def _calculate_quality_score(self, metrics: QualityMetrics) -> float:
        """计算综合质量分数"""
        
        # 加权平均
        weights = {
            'success_rate': 0.4,
            'user_rating': 0.3,
            'execution_time': 0.15,
            'error_rate': 0.1,
            'abandonment_rate': 0.05
        }
        
        # 归一化执行时间 (越快越好，<5s为1.0, >60s为0)
        time_score = max(0, 1 - (metrics.avg_execution_time - 5) / 55)
        
        # 归一化评分
        rating_score = metrics.user_rating_avg / 5.0
        
        score = (
            metrics.success_rate * weights['success_rate'] +
            rating_score * weights['user_rating'] +
            time_score * weights['execution_time'] +
            (1 - metrics.error_rate) * weights['error_rate'] +
            (1 - metrics.abandonment_rate) * weights['abandonment_rate']
        )
        
        return min(1.0, max(0.0, score))
    
    def _determine_level(self, score: float) -> QualityLevel:
        """确定质量等级"""
        
        for level in [
            QualityLevel.EXCELLENT,
            QualityLevel.GOOD,
            QualityLevel.ACCEPTABLE,
            QualityLevel.NEEDS_IMPROVEMENT
        ]:
            if score >= self.thresholds[level]:
                return level
        
        return QualityLevel.POOR
    
    async def _execute_quality_actions(
        self,
        skill_id: str,
        report: QualityReport
    ):
        """执行质量动作"""
        
        skill = await self.skill_registry.get(skill_id)
        
        if report.quality_level == QualityLevel.POOR:
            # 自动降权/禁用
            await self.skill_registry.update_status(
                skill_id,
                status='deprecated'
            )
            
        elif report.quality_level == QualityLevel.NEEDS_IMPROVEMENT:
            # 标记为需要改进
            await self.skill_registry.set_flag(
                skill_id,
                flag='needs_review'
            )
            
        elif report.quality_level == QualityLevel.EXCELLENT:
            # 标记为推荐技能
            await self.skill_registry.promote(
                skill_id
            )
    
    async def check_before_activation(
        self,
        skill_id: str
    ) -> Tuple[bool, str]:
        """
        激活前质量检查
        返回: (通过, 原因)
        """
        
        # 1. 检查基础配置
        skill = await self.skill_registry.get(skill_id)
        
        if not skill:
            return False, "技能不存在"
        
        if not skill.steps or len(skill.steps) == 0:
            return False, "缺少执行步骤"
        
        # 2. 检查最小测试
        test_executions = await self.metrics_store.get_test_executions(skill_id)
        
        if len(test_executions) < 3:
            return False, f"测试执行次数不足: {len(test_executions)}/3"
        
        test_success_rate = sum(1 for e in test_executions if e.success) / len(test_executions)
        
        if test_success_rate < 0.7:
            return False, f"测试成功率过低: {test_success_rate:.1%}"
        
        return True, "通过质量检查"
```

---

## 四、技能生态兼容方案

### 4.1 统一技能模型

```python
# kunlun/unified_skill_model.py
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from datetime import datetime
import json
import yaml

class SkillSource(Enum):
    CLAWHUB = "clawhub"
    HERMES = "hermes"
    KUNLUN_NATIVE = "kunlun_native"
    USER_GENERATED = "user_generated"

@dataclass
class SkillTrigger:
    """触发条件"""
    trigger_type: str  # 'keyword', 'semantic', 'explicit', 'behavioral'
    conditions: Dict[str, Any] = field(default_factory=dict)
    examples: List[str] = field(default_factory=list)

@dataclass
class SkillImplementation:
    """技能实现"""
    language: str  # 'python', 'typescript', 'yaml'
    source_code: str = ""
    dependencies: List[str] = field(default_factory=list)
    entry_point: str = "execute"
    config_schema: Dict = field(default_factory=dict)

@dataclass
class SkillMetadata:
    """技能元数据"""
    author: str = ""
    version: str = "1.0.0"
    tags: List[str] = field(default_factory=list)
    category: str = ""
    difficulty: str = "medium"
    estimated_time: str = ""
    license: str = "MIT"
    source: SkillSource = SkillSource.KUNLUN_NATIVE
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    compatibility: Dict[str, str] = field(default_factory=dict)

@dataclass
class SkillIO:
    """技能输入输出定义"""
    inputs: List[Dict[str, Any]] = field(default_factory=list)
    outputs: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class SkillErrorHandling:
    """错误处理配置"""
    on_failure: str = "retry"  # retry, skip, abort, fallback
    max_retries: int = 2
    fallback_skill: Optional[str] = None
    timeout_seconds: int = 300

@dataclass
class UnifiedSkill:
    """统一技能模型"""
    skill_id: str
    name: str
    description: str
    
    # 核心组件
    trigger: SkillTrigger
    implementation: SkillImplementation
    io: SkillIO
    metadata: SkillMetadata
    error_handling: SkillErrorHandling = field(default_factory=SkillErrorHandling)
    
    # 步骤定义 (统一格式)
    steps: List[Dict[str, Any]] = field(default_factory=list)
    
    # 人格适配配置
    personality_config: Dict[str, Any] = field(default_factory=dict)
    
    # 进化配置
    evolution_config: Dict[str, Any] = field(default_factory=dict)
    
    # 原始格式引用
    _original_format: Optional[str] = None
    _original_data: Optional[Any] = None
    
    # ==================== ClawHub格式转换 ====================
    
    def to_clawhub_format(self) -> Dict[str, Any]:
        """转换为ClawHub格式 (TypeScript/JavaScript)"""
        
        return {
            "name": self.name,
            "version": self.metadata.version,
            "description": self.description,
            "category": self.metadata.category,
            "tags": self.metadata.tags,
            "author": self.metadata.author,
            "license": self.metadata.license,
            
            # TypeScript类型定义
            "types": {
                "input": self._generate_typescript_interface("input"),
                "output": self._generate_typescript_interface("output"),
                "config": self._generate_typescript_config_interface()
            },
            
            # 触发条件 (ClawHub格式)
            "triggers": self._to_clawhub_triggers(),
            
            # 实现 (TypeScript)
            "implementation": {
                "language": "typescript",
                "entryPoint": self.implementation.entry_point,
                "dependencies": self.implementation.dependencies,
                "code": self._wrap_typescript_code()
            },
            
            # 错误处理
            "errorHandling": {
                "retryPolicy": {
                    "enabled": self.error_handling.on_failure == "retry",
                    "maxRetries": self.error_handling.max_retries
                },
                "fallback": self.error_handling.fallback_skill
            },
            
            # 兼容性标记
            "compatibility": {
                "kunlun_version": ">=2.0.0",
                "clawhub_version": ">=1.0.0"
            }
        }
    
    def _to_clawhub_triggers(self) -> Dict[str, Any]:
        """转换为ClawHub触发格式"""
        
        triggers = {
            "type": self.trigger.trigger_type,
            "conditions": self.trigger.conditions
        }
        
        if self.trigger.examples:
            triggers["examples"] = self.trigger.examples
        
        return triggers
    
    def _generate_typescript_interface(self, io_type: str) -> str:
        """生成TypeScript接口定义"""
        
        items = self.io.inputs if io_type == "input" else self.io.outputs
        
        lines = [f"interface {self.name}Interface {{"]
        for item in items:
            required = "?" if not item.get("required", True) else ""
            lines.append(f"  {item['name']}{required}: {self._map_python_to_ts(item.get('type', 'any'))};")
        lines.append("}")
        
        return "\n".join(lines)
    
    def _generate_typescript_config_interface(self) -> str:
        """生成配置接口"""
        
        lines = [f"interface {self.name}Config {{"]
        for key, value in self.implementation.config_schema.items():
            lines.append(f"  {key}: {self._map_python_to_ts(value)};")
        lines.append("}")
        
        return "\n".join(lines)
    
    def _map_python_to_ts(self, py_type: str) -> str:
        """Python类型到TypeScript类型映射"""
        
        mapping = {
            "str": "string",
            "int": "number",
            "float": "number",
            "bool": "boolean",
            "list": "any[]",
            "dict": "Record<string, any>",
            "file": "File",
            "json": "any"
        }
        
        return mapping.get(py_type, "any")
    
    def _wrap_typescript_code(self) -> str:
        """包装TypeScript代码"""
        
        return f"""
import {{ SkillContext, SkillResult }} from '@kunlun/sdk';

export async function {self.implementation.entry_point}(
  context: SkillContext
): Promise<SkillResult> {{
  // {self.description}
  // Generated from Kunlun Unified Skill Model
  
  try {{
    const {{ input, config }} = context;
    
    // Step implementations
{self._generate_step_implementations('typescript')}
    
    return {{
      success: true,
      output: {{ result }}
    }};
  }} catch (error) {{
    return {{
      success: false,
      error: error.message
    }};
  }}
}}
"""
    
    def _generate_step_implementations(self, lang: str) -> str:
        """生成步骤实现代码"""
        
        lines = []
        for i, step in enumerate(self.steps, 1):
            indent = "    "
            if lang == 'typescript':
                lines.append(f"{indent}// Step {i}: {step.get('name', 'Unnamed')}")
                lines.append(f"{indent}const step{i}Result = await this.executeStep('{step.get('tool', 'unknown')}', {{ ... }});")
            
        return "\n".join(lines)
    
    # ==================== Hermes格式转换 ====================
    
    def to_hermes_format(self) -> str:
        """转换为Hermes SKILL.md格式"""
        
        lines = [
            "---",
            f"name: \"{self.name}\"",
            f"version: \"{self.metadata.version}\"",
            f"description: \"{self.description}\"",
            f"tags: [{', '.join(f'\"{t}\"' for t in self.metadata.tags)}]",
            f"category: \"{self.metadata.category}\"",
            "---",
            "",
            "# Skill Content (Level 0/1/2)",
            ""
        ]
        
        # 触发条件
        if self.trigger.examples:
            lines.append("triggers:")
            for ex in self.trigger.examples:
                lines.append(f"  - \"{ex}\"")
            lines.append("")
        
        # 输入输出
        lines.append("inputs:")
        for inp in self.io.inputs:
            required = "true" if inp.get("required", True) else "false"
            lines.append(f"  - name: \"{inp['name']}\"")
            lines.append(f"    type: \"{inp.get('type', 'any')}\"")
            lines.append(f"    required: {required}")
            if inp.get('description'):
                lines.append(f"    description: \"{inp['description']}\"")
        
        lines.append("")
        lines.append("outputs:")
        for out in self.io.outputs:
            lines.append(f"  - name: \"{out['name']}\"")
            lines.append(f"    type: \"{out.get('type', 'any')}\"")
            if out.get('description'):
                lines.append(f"    description: \"{out['description']}\"")
        
        # 执行步骤
        lines.append("")
        lines.append("steps:")
        for step in self.steps:
            if step.get('action'):
                lines.append(f"  - \"{step['action']}\"")
            elif step.get('description'):
                lines.append(f"  - \"{step['description']}\"")
        
        # Python实现
        if self.implementation.language == 'python':
            lines.append("")
            lines.append("```python")
            lines.append(self._wrap_python_code())
            lines.append("```")
        
        # 进化配置
        lines.append("")
        lines.append("# Evolution Config")
        if self.evolution_config:
            for key, value in self.evolution_config.items():
                lines.append(f"# - {key}: {value}")
        
        return "\n".join(lines)
    
    def _wrap_python_code(self) -> str:
        """包装Python代码"""
        
        return f'''
async def execute_{self.skill_id.replace("-", "_")}(context: SkillContext) -> SkillResult:
    """
    {self.description}
    Generated from Kunlun Unified Skill Model
    """
    # Import from skill registry
    from kunlun.skills import skill_registry
    
    try:
{self._generate_python_step_implementations()}
        
        return SkillResult(
            success=True,
            output={{"result": result}}
        )
    except Exception as e:
        return SkillResult(
            success=False,
            error=str(e)
        )
'''
    
    def _generate_python_step_implementations(self) -> str:
        """生成Python步骤实现"""
        
        lines = []
        for i, step in enumerate(self.steps, 1):
            indent = "        "
            lines.append(f"{indent}# Step {i}: {step.get('name', 'Unnamed')}")
            lines.append(f"{indent}step_{i}_result = await context.execute_tool(")
            lines.append(f"{indent}    '{step.get('tool', 'unknown')}',")
            lines.append(f"{indent}    params={step.get('params', {})}")
            lines.append(f"{indent})")
            lines.append("")
        
        return "\n".join(lines)
    
    # ==================== 导入方法 ====================
    
    @classmethod
    def from_clawhub(cls, data: Dict[str, Any]) -> 'UnifiedSkill':
        """从ClawHub格式导入"""
        
        # 解析触发条件
        triggers_data = data.get('triggers', {})
        trigger = SkillTrigger(
            trigger_type=triggers_data.get('type', 'semantic'),
            conditions=triggers_data.get('conditions', {}),
            examples=triggers_data.get('examples', [])
        )
        
        # 解析实现
        impl_data = data.get('implementation', {})
        implementation = SkillImplementation(
            language=impl_data.get('language', 'typescript'),
            source_code=impl_data.get('code', ''),
            dependencies=impl_data.get('dependencies', []),
            entry_point=impl_data.get('entryPoint', 'execute')
        )
        
        # 解析错误处理
        err_data = data.get('errorHandling', {})
        error_handling = SkillErrorHandling(
            on_failure='retry' if err_data.get('retryPolicy', {}).get('enabled') else 'abort',
            max_retries=err_data.get('retryPolicy', {}).get('maxRetries', 2),
            fallback_skill=err_data.get('fallback')
        )
        
        # 构建技能
        skill = cls(
            skill_id=data['name'].lower().replace(' ', '-'),
            name=data['name'],
            description=data.get('description', ''),
            trigger=trigger,
            implementation=implementation,
            io=SkillIO(inputs=[], outputs=[]),
            metadata=SkillMetadata(
                author=data.get('author', ''),
                version=data.get('version', '1.0.0'),
                tags=data.get('tags', []),
                category=data.get('category', ''),
                source=SkillSource.CLAWHUB
            ),
            error_handling=error_handling
        )
        
        skill._original_format = 'clawhub'
        skill._original_data = data
        
        return skill
    
    @classmethod
    def from_hermes(cls, skill_md: str) -> 'UnifiedSkill':
        """从Hermes SKILL.md导入"""
        
        # 解析YAML frontmatter
        parts = skill_md.split('---')
        if len(parts) >= 3:
            yaml_content = parts[1]
            metadata = yaml.safe_load(yaml_content)
            content = '---'.join(parts[2:])
        else:
            metadata = {}
            content = skill_md
        
        # 解析输入输出
        inputs = []
        outputs = []
        current_section = None
        
        for line in content.split('\n'):
            if line.strip().startswith('inputs:'):
                current_section = 'inputs'
            elif line.strip().startswith('outputs:'):
                current_section = 'outputs'
            elif line.strip().startswith('steps:'):
                current_section = 'steps'
            elif current_section == 'inputs' and line.strip().startswith('- name:'):
                inputs.append({'name': line.split('"')[1] if '"' in line else ''})
            elif current_section == 'outputs' and line.strip().startswith('- name:'):
                outputs.append({'name': line.split('"')[1] if '"' in line else ''})
        
        # 构建技能
        skill = cls(
            skill_id=metadata.get('name', 'unknown').lower().replace(' ', '-'),
            name=metadata.get('name', 'Unknown Skill'),
            description=metadata.get('description', ''),
            trigger=SkillTrigger(
                trigger_type='semantic',
                examples=metadata.get('triggers', [])
            ),
            implementation=SkillImplementation(
                language='python',
                source_code=cls._extract_code_block(content, 'python')
            ),
            io=SkillIO(inputs=inputs, outputs=outputs),
            metadata=SkillMetadata(
                version=metadata.get('version', '1.0.0'),
                tags=metadata.get('tags', []),
                category=metadata.get('category', ''),
                source=SkillSource.HERMES
            )
        )
        
        skill._original_format = 'hermes'
        skill._original_data = skill_md
        
        return skill
    
    @classmethod
    def _extract_code_block(cls, content: str, language: str) -> str:
        """提取代码块"""
        
        lines = content.split('\n')
        in_block = False
        code_lines = []
        
        for line in lines:
            if f'```{language}' in line:
                in_block = True
                continue
            elif line.strip() == '```':
                in_block = False
            elif in_block:
                code_lines.append(line)
        
        return '\n'.join(code_lines)
```

### 4.2 ClawHub适配器

```python
# kunlun/adapters/clawhub_adapter.py
from typing import Dict, List, Optional, Any, AsyncIterator
import httpx
import asyncio
from dataclasses import dataclass

@dataclass
class ClawHubConfig:
    """ClawHub配置"""
    api_base: str = "https://api.clawhub.io/v1"
    registry_url: str = "https://registry.clawhub.io"
    auth_token: Optional[str] = None
    timeout: int = 30

class ClawHubAdapter:
    """ClawHub技能市场适配器"""
    
    def __init__(self, config: ClawHubConfig):
        self.config = config
        self.client = httpx.AsyncClient(
            base_url=config.api_base,
            timeout=config.timeout
        )
        
    async def close(self):
        """关闭连接"""
        await self.client.aclose()
    
    # ==================== 市场浏览 ====================
    
    async def search_skills(
        self,
        query: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """搜索技能市场"""
        
        params = {
            'q': query,
            'limit': limit
        }
        
        if category:
            params['category'] = category
        if tags:
            params['tags'] = ','.join(tags)
        
        response = await self.client.get(
            '/skills/search',
            params=params,
            headers=self._get_headers()
        )
        
        response.raise_for_status()
        data = response.json()
        
        return data.get('skills', [])
    
    async def get_featured_skills(
        self,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """获取精选技能"""
        
        response = await self.client.get(
            '/skills/featured',
            params={'limit': limit},
            headers=self._get_headers()
        )
        
        response.raise_for_status()
        return response.json().get('skills', [])
    
    async def get_skill_details(
        self,
        skill_name: str,
        version: Optional[str] = None
    ) -> Dict[str, Any]:
        """获取技能详情"""
        
        url = f'/skills/{skill_name}'
        if version:
            url += f'/versions/{version}'
        
        response = await self.client.get(
            url,
            headers=self._get_headers()
        )
        
        response.raise_for_status()
        return response.json()
    
    # ==================== 技能安装 ====================
    
    async def install_skill(
        self,
        skill_name: str,
        version: Optional[str] = None,
        target_dir: Optional[str] = None
    ) -> bool:
        """安装技能"""
        
        # 1. 获取技能包
        package = await self._download_skill_package(skill_name, version)
        
        # 2. 转换格式
        from kunlun.unified_skill_model import UnifiedSkill
        skill = UnifiedSkill.from_clawhub(package)
        
        # 3. 保存到目标目录
        target = target_dir or f'./skills/{skill.skill_id}'
        await self._save_skill_package(skill, target)
        
        return True
    
    async def _download_skill_package(
        self,
        skill_name: str,
        version: Optional[str]
    ) -> Dict[str, Any]:
        """下载技能包"""
        
        response = await self.client.get(
            f'/skills/{skill_name}/package',
            params={'version': version} if version else {},
            headers=self._get_headers()
        )
        
        response.raise_for_status()
        return response.json()
    
    async def _save_skill_package(
        self,
        skill: 'UnifiedSkill',
        target_dir: str
    ):
        """保存技能包"""
        
        import os
        import aiofiles
        
        # 确保目录存在
        os.makedirs(target_dir, exist_ok=True)
        
        # 保存主要文件
        async with aiofiles.open(f'{target_dir}/package.json', 'w') as f:
            await f.write(json.dumps(skill.to_clawhub_format(), indent=2))
        
        # 保存Hermes兼容格式
        async with aiofiles.open(f'{target_dir}/SKILL.md', 'w') as f:
            await f.write(skill.to_hermes_format())
        
        # 保存TypeScript源码
        if skill.implementation.source_code:
            os.makedirs(f'{target_dir}/src', exist_ok=True)
            async with aiofiles.open(f'{target_dir}/src/index.ts', 'w') as f:
                await f.write(skill.implementation.source_code)
    
    # ==================== 技能发布 ====================
    
    async def publish_skill(
        self,
        skill_package: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """发布技能到ClawHub市场"""
        
        response = await self.client.post(
            '/skills/publish',
            json=skill_package,
            headers=self._get_headers(),
            params=options or {}
        )
        
        response.raise_for_status()
        return response.json()
    
    async def update_skill(
        self,
        skill_name: str,
        version: str,
        updates: Dict[str, Any]
    ) -> bool:
        """更新已发布的技能"""
        
        response = await self.client.patch(
            f'/skills/{skill_name}/versions/{version}',
            json=updates,
            headers=self._get_headers()
        )
        
        response.raise_for_status()
        return True
    
    # ==================== 认证与配额 ====================
    
    async def get_user_quota(self) -> Dict[str, Any]:
        """获取用户配额"""
        
        response = await self.client.get(
            '/user/quota',
            headers=self._get_headers()
        )
        
        response.raise_for_status()
        return response.json()
    
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Kunlun-Framework/2.0'
        }
        
        if self.config.auth_token:
            headers['Authorization'] = f'Bearer {self.config.auth_token}'
        
        return headers
```

### 4.3 Hermes适配器

```python
# kunlun/adapters/hermes_adapter.py
from typing import Dict, List, Optional, Any, AsyncIterator
import aiofiles
import os
from pathlib import Path
import yaml

class HermesAdapter:
    """Hermes技能系统适配器"""
    
    def __init__(
        self,
        skills_dir: str = "./skills",
        registry_url: str = "https://agentskills.io/api"
    ):
        self.skills_dir = Path(skills_dir)
        self.registry_url = registry_url
        self._skill_cache: Dict[str, Any] = {}
        
    # ==================== 技能加载 ====================
    
    async def load_skills(
        self,
        skill_names: Optional[List[str]] = None
    ) -> List['UnifiedSkill']:
        """加载技能"""
        
        from kunlun.unified_skill_model import UnifiedSkill
        
        skills = []
        
        if skill_names:
            # 加载指定技能
            for name in skill_names:
                skill_path = self.skills_dir / name / "SKILL.md"
                if skill_path.exists():
                    skill = await self._load_skill_md(skill_path)
                    skills.append(skill)
        else:
            # 加载所有技能
            for skill_dir in self.skills_dir.iterdir():
                if skill_dir.is_dir():
                    skill_md = skill_dir / "SKILL.md"
                    if skill_md.exists():
                        try:
                            skill = await self._load_skill_md(skill_md)
                            skills.append(skill)
                        except Exception:
                            continue
        
        return skills
    
    async def _load_skill_md(self, path: Path) -> 'UnifiedSkill':
        """加载SKILL.md文件"""
        
        from kunlun.unified_skill_model import UnifiedSkill
        
        async with aiofiles.open(path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        return UnifiedSkill.from_hermes(content)
    
    # ==================== 技能管理 ====================
    
    async def create_skill(
        self,
        skill: 'UnifiedSkill',
        author: Optional[str] = None
    ) -> bool:
        """创建技能"""
        
        # 确保目录存在
        skill_dir = self.skills_dir / skill.skill_id
        skill_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存SKILL.md
        async with aiofiles.open(skill_dir / 'SKILL.md', 'w') as f:
            await f.write(skill.to_hermes_format())
        
        # 保存Python实现
        if skill.implementation.language == 'python':
            code = skill.to_hermes_format()
            code_block = self._extract_code_block(code, 'python')
            if code_block:
                async with aiofiles.open(skill_dir / 'skill.py', 'w') as f:
                    await f.write(code_block)
        
        # 保存配置
        config = {
            'skill_id': skill.skill_id,
            'name': skill.name,
            'version': skill.metadata.version,
            'created_by': author or 'system'
        }
        async with aiofiles.open(skill_dir / 'config.yaml', 'w') as f:
            await f.write(yaml.dump(config))
        
        return True
    
    async def update_skill(
        self,
        skill_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """更新技能"""
        
        skill_dir = self.skills_dir / skill_id
        skill_md_path = skill_dir / 'SKILL.md'
        
        if not skill_md_path.exists():
            return False
        
        # 读取现有内容
        async with aiofiles.open(skill_md_path, 'r') as f:
            content = await f.read()
        
        # 应用更新
        updated = await self._apply_updates(content, updates)
        
        # 保存
        async with aiofiles.open(skill_md_path, 'w') as f:
            await f.write(updated)
        
        # 更新缓存
        if skill_id in self._skill_cache:
            del self._skill_cache[skill_id]
        
        return True
    
    async def delete_skill(self, skill_id: str) -> bool:
        """删除技能"""
        
        skill_dir = self.skills_dir / skill_id
        
        if not skill_dir.exists():
            return False
        
        import shutil
        shutil.rmtree(skill_dir)
        
        if skill_id in self._skill_cache:
            del self._skill_cache[skill_id]
        
        return True
    
    # ==================== agentskills.io市场集成 ====================
    
    async def search_marketplace(
        self,
        query: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """搜索agentskills.io市场"""
        
        import httpx
        
        params = {'q': query}
        if category:
            params['category'] = category
        if tags:
            params['tags'] = ','.join(tags)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{self.registry_url}/skills/search',
                params=params
            )
            response.raise_for_status()
            return response.json().get('skills', [])
    
    async def install_from_marketplace(
        self,
        skill_id: str,
        version: Optional[str] = None
    ) -> bool:
        """从市场安装技能"""
        
        # 1. 获取技能
        skill_data = await self._fetch_market_skill(skill_id, version)
        
        # 2. 转换并保存
        from kunlun.unified_skill_model import UnifiedSkill
        skill = UnifiedSkill.from_hermes(skill_data)
        
        return await self.create_skill(skill)
    
    async def publish_to_marketplace(
        self,
        skill: 'UnifiedSkill',
        category: str,
        tags: List[str],
        description: str
    ) -> Dict[str, Any]:
        """发布技能到市场"""
        
        import httpx
        
        payload = {
            'skill': skill.to_hermes_format(),
            'metadata': {
                'name': skill.name,
                'description': description,
                'category': category,
                'tags': tags,
                'version': skill.metadata.version
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.registry_url}/skills/publish',
                json=payload
            )
            response.raise_for_status()
            return response.json()
    
    def _extract_code_block(self, content: str, language: str) -> str:
        """提取代码块"""
        
        lines = content.split('\n')
        in_block = False
        code_lines = []
        
        for line in lines:
            if f'```{language}' in line:
                in_block = True
                continue
            elif line.strip() == '```':
                in_block = False
            elif in_block:
                code_lines.append(line)
        
        return '\n'.join(code_lines)
    
    async def _apply_updates(
        self,
        content: str,
        updates: Dict[str, Any]
    ) -> str:
        """应用更新到SKILL.md"""
        
        # 解析并更新YAML元数据
        parts = content.split('---')
        if len(parts) >= 3:
            yaml_content = parts[1]
            metadata = yaml.safe_load(yaml_content)
            
            # 应用更新
            for key, value in updates.items():
                if key in metadata:
                    metadata[key] = value
            
            # 重新组装
            updated_yaml = yaml.dump(metadata, allow_unicode=True)
            parts[1] = updated_yaml
            return '---'.join(parts)
        
        return content
```

### 4.4 双向转换工具

```python
# kunlun/skill_converter.py
from typing import Dict, List, Optional, Any
import json
import yaml
from pathlib import Path

class SkillConverter:
    """技能格式双向转换工具"""
    
    # ==================== 格式检测 ====================
    
    @staticmethod
    def detect_format(content: Any) -> str:
        """检测技能格式"""
        
        if isinstance(content, dict):
            # ClawHub格式
            if 'implementation' in content and 'typescript' in str(content):
                return 'clawhub'
            
            # Hermes格式
            if 'steps' in content and 'triggers' in content:
                return 'hermes'
        
        if isinstance(content, str):
            # YAML frontmatter
            if content.strip().startswith('---'):
                return 'hermes'
            
            # JSON
            try:
                json.loads(content)
                return 'clawhub'
            except:
                pass
        
        return 'unknown'
    
    # ==================== 批量转换 ====================
    
    async def convert_directory(
        self,
        source_dir: str,
        target_dir: str,
        target_format: str,
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """
        批量转换目录中的技能
        """
        
        source_path = Path(source_dir)
        target_path = Path(target_dir)
        
        if not target_path.exists():
            target_path.mkdir(parents=True)
        
        results = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        for skill_file in source_path.rglob('*.md'):
            if 'SKILL' in skill_file.name:
                results['total'] += 1
                
                try:
                    # 读取并转换
                    content = await self._read_file(skill_file)
                    converted = await self.convert(content, target_format)
                    
                    # 保存
                    relative = skill_file.relative_to(source_path)
                    target_file = target_path / relative
                    
                    if not overwrite and target_file.exists():
                        results['details'].append({
                            'file': str(relative),
                            'status': 'skipped',
                            'reason': 'exists'
                        })
                        continue
                    
                    await self._write_file(target_file, converted)
                    
                    results['success'] += 1
                    results['details'].append({
                        'file': str(relative),
                        'status': 'success'
                    })
                    
                except Exception as e:
                    results['failed'] += 1
                    results['details'].append({
                        'file': str(skill_file),
                        'status': 'failed',
                        'error': str(e)
                    })
        
        return results
    
    async def convert(
        self,
        content: Any,
        target_format: str
    ) -> Any:
        """转换技能格式"""
        
        from kunlun.unified_skill_model import UnifiedSkill
        
        # 检测源格式
        source_format = self.detect_format(content)
        
        if source_format == 'unknown':
            raise ValueError(f"无法识别的源格式: {type(content)}")
        
        # 转换为统一模型
        if source_format == 'clawhub':
            if isinstance(content, str):
                content = json.loads(content)
            skill = UnifiedSkill.from_clawhub(content)
        else:
            skill = UnifiedSkill.from_hermes(content)
        
        # 转换为目标格式
        if target_format == 'clawhub':
            return skill.to_clawhub_format()
        elif target_format == 'hermes':
            return skill.to_hermes_format()
        elif target_format == 'unified':
            return skill
        else:
            raise ValueError(f"不支持的目标格式: {target_format}")
    
    async def _read_file(self, path: Path) -> str:
        """读取文件"""
        
        async with aiofiles.open(path, 'r', encoding='utf-8') as f:
            return await f.read()
    
    async def _write_file(self, path: Path, content: Any):
        """写入文件"""
        
        path.parent.mkdir(parents=True, exist_ok=True)
        
        if isinstance(content, dict):
            content = json.dumps(content, indent=2, ensure_ascii=False)
        
        async with aiofiles.open(path, 'w', encoding='utf-8') as f:
            await f.write(content)
```

---

## 五、自我修改系统

### 5.1 三层自修改架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         自我修改系统三层架构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════    │
│                           Layer 3: 架构层自修改                              │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Actor配置优化: 并发数、负载均衡策略                               │   │
│  │  • 记忆策略优化: 迁移阈值、压缩时机                                  │   │
│  │  • 新功能引入: 技能自动安装、模型切换                                │   │
│  │  • 架构重构: 模块解耦、服务拆分                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  约束: 必须人工确认 (Impact Level > HIGH)                           │   │
│  │  验证: 沙箱环境完整测试                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                          │
│  ══════════════════════════════════════════════════════════════════════    │
│                           Layer 2: 模型层自修改                              │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Prompt模板优化: 根据成功率调整措辞                                │   │
│  │  • 上下文管理: 压缩策略参数调优                                      │   │
│  │  • 模型选择: 根据任务类型自动切换模型                                 │   │
│  │  • Token预算: 动态调整配额                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  约束: 用户可配置偏好                                                │   │
│  │  验证: A/B测试验证效果                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                          │
│  ══════════════════════════════════════════════════════════════════════    │
│                           Layer 1: 技能层自修改                               │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • 步骤优化: 发现更优执行顺序                                        │   │
│  │  • 参数调整: 优化工具调用参数                                        │   │
│  │  • 错误处理: 增强异常处理逻辑                                        │   │
│  │  • 示例补充: 自动添加成功案例                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  约束: 用户确认后生效                                                │   │
│  │  验证: 自动回归测试                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 自修改管理器核心类

```python
# kunlun/self_modifier.py
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from datetime import datetime, timedelta
import asyncio
import json
import hashlib

class ModificationLayer(Enum):
    SKILL = "skill"       # 技能层
    MODEL = "model"       # 模型层
    ARCHITECTURE = "architecture"  # 架构层

class ImpactLevel(Enum):
    LOW = "low"           # 无感知修改
    MEDIUM = "medium"     # 需通知用户
    HIGH = "high"         # 需用户确认
    CRITICAL = "critical" # 需管理员确认

@dataclass
class ModificationRequest:
    """修改请求"""
    request_id: str
    layer: ModificationLayer
    target_id: str  # skill_id, model_id, config_id
    
    modification_type: str
    old_value: Any
    new_value: Any
    
    reason: str
    evidence: List[str]
    
    impact_level: ImpactLevel
    requires_approval: bool
    
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = "self_modifier"
    
@dataclass
class ModificationResult:
    """修改结果"""
    request_id: str
    success: bool
    applied_at: Optional[datetime] = None
    rollback_at: Optional[datetime] = None
    
    changes_made: Dict[str, Any] = field(default_factory=dict)
    verification_result: Optional[Dict] = None
    
    error: Optional[str] = None
    error_trace: Optional[str] = None

class SelfModifier:
    """自我修改引擎"""
    
    def __init__(
        self,
        skill_registry: 'SkillRegistry',
        model_gateway: 'LLMGateway',
        config_store: 'ConfigStore',
        sandbox_executor: 'SandboxExecutor',
        audit_logger: 'AuditLogger'
    ):
        self.skill_registry = skill_registry
        self.model_gateway = model_gateway
        self.config_store = config_store
        self.sandbox_executor = sandbox_executor
        self.audit_logger = audit_logger
        
        # 修改队列
        self.pending_modifications: Dict[str, ModificationRequest] = {}
        self.approved_modifications: Dict[str, ModificationRequest] = {}
        
        # 回滚管理
        self.version_store: Dict[str, List[Dict]] = {}
        self.max_versions = 10
        
        # 约束配置
        self.impact_thresholds = {
            ModificationLayer.SKILL: ImpactLevel.MEDIUM,
            ModificationLayer.MODEL: ImpactLevel.HIGH,
            ModificationLayer.ARCHITECTURE: ImpactLevel.CRITICAL
        }
        
    # ==================== 修改触发 ====================
    
    async def analyze_and_trigger(
        self,
        user_id: str,
        execution_data: Dict[str, Any]
    ) -> List[ModificationRequest]:
        """
        分析执行数据，触发潜在修改
        """
        
        requests = []
        
        # Layer 1: 技能层分析
        skill_mods = await self._analyze_skill_layer(execution_data)
        requests.extend(skill_mods)
        
        # Layer 2: 模型层分析
        model_mods = await self._analyze_model_layer(execution_data)
        requests.extend(model_mods)
        
        # Layer 3: 架构层分析
        arch_mods = await self._analyze_architecture_layer(execution_data)
        requests.extend(arch_mods)
        
        # 队列存储
        for req in requests:
            self.pending_modifications[req.request_id] = req
            
            # 审计日志
            await self.audit_logger.log(
                event_type='modification_triggered',
                request=req
            )
        
        return requests
    
    async def _analyze_skill_layer(
        self,
        data: Dict[str, Any]
    ) -> List[ModificationRequest]:
        """分析技能层修改需求"""
        
        requests = []
        
        skill_id = data.get('skill_id')
        if not skill_id:
            return requests
        
        # 检查失败模式
        failures = data.get('failures', [])
        if len(failures) >= 3:
            # 识别错误模式
            error_pattern = self._identify_error_pattern(failures)
            
            if error_pattern:
                req = ModificationRequest(
                    request_id=self._generate_request_id(),
                    layer=ModificationLayer.SKILL,
                    target_id=skill_id,
                    modification_type='error_handling',
                    old_value=None,
                    new_value={'error_handlers': error_pattern},
                    reason=f"识别到{len(failures)}次相同错误模式",
                    evidence=failures[:5],
                    impact_level=ImpactLevel.MEDIUM,
                    requires_approval=True
                )
                requests.append(req)
        
        # 检查性能问题
        slow_steps = data.get('slow_steps', [])
        if slow_steps:
            optimization = self._suggest_step_optimization(slow_steps)
            if optimization:
                req = ModificationRequest(
                    request_id=self._generate_request_id(),
                    layer=ModificationLayer.SKILL,
                    target_id=skill_id,
                    modification_type='step_optimization',
                    old_value=slow_steps,
                    new_value=optimization,
                    reason="发现可优化的执行步骤",
                    evidence=slow_steps,
                    impact_level=ImpactLevel.LOW,
                    requires_approval=False
                )
                requests.append(req)
        
        return requests
    
    async def _analyze_model_layer(
        self,
        data: Dict[str, Any]
    ) -> List[ModificationRequest]:
        """分析模型层修改需求"""
        
        requests = []
        
        # 检查Prompt效果
        low_effectiveness = data.get('low_effectiveness_prompts', [])
        if len(low_effectiveness) >= 5:
            optimization = await self._optimize_prompt_template(
                data.get('task_type'),
                low_effectiveness
            )
            
            if optimization:
                req = ModificationRequest(
                    request_id=self._generate_request_id(),
                    layer=ModificationLayer.MODEL,
                    target_id=data.get('model_id', 'default'),
                    modification_type='prompt_optimization',
                    old_value=None,
                    new_value=optimization,
                    reason="多次低效Prompt触发优化",
                    evidence=low_effectiveness[:3],
                    impact_level=ImpactLevel.MEDIUM,
                    requires_approval=True
                )
                requests.append(req)
        
        return requests
    
    async def _analyze_architecture_layer(
        self,
        data: Dict[str, Any]
    ) -> List[ModificationRequest]:
        """分析架构层修改需求"""
        
        requests = []
        
        # 检查资源瓶颈
        bottlenecks = data.get('bottlenecks', [])
        for bottleneck in bottlenecks:
            if bottleneck['severity'] == 'high':
                req = ModificationRequest(
                    request_id=self._generate_request_id(),
                    layer=ModificationLayer.ARCHITECTURE,
                    target_id=bottleneck['component'],
                    modification_type='capacity_adjustment',
                    old_value=bottleneck['current_value'],
                    new_value=bottleneck['suggested_value'],
                    reason=f"高严重性瓶颈: {bottleneck['type']}",
                    evidence=[bottleneck],
                    impact_level=ImpactLevel.CRITICAL,
                    requires_approval=True
                )
                requests.append(req)
        
        return requests
    
    # ==================== 修改执行 ====================
    
    async def execute_modification(
        self,
        request_id: str,
        dry_run: bool = False
    ) -> ModificationResult:
        """执行修改"""
        
        request = self.pending_modifications.get(request_id)
        if not request:
            return ModificationResult(
                request_id=request_id,
                success=False,
                error="Request not found"
            )
        
        # 保存当前版本 (用于回滚)
        await self._save_version(request)
        
        try:
            # 沙箱验证
            if not dry_run:
                verification = await self._verify_in_sandbox(request)
                if not verification['passed']:
                    return ModificationResult(
                        request_id=request_id,
                        success=False,
                        error=f"Verification failed: {verification['reason']}"
                    )
            
            # 执行修改
            if dry_run:
                changes = await self._simulate_change(request)
            else:
                changes = await self._apply_change(request)
            
            # 清理
            del self.pending_modifications[request_id]
            
            result = ModificationResult(
                request_id=request_id,
                success=True,
                applied_at=datetime.now(),
                changes_made=changes,
                verification_result=verification if not dry_run else None
            )
            
            # 审计日志
            await self.audit_logger.log(
                event_type='modification_applied',
                request=request,
                result=result
            )
            
            return result
            
        except Exception as e:
            # 回滚
            await self._rollback(request)
            
            result = ModificationResult(
                request_id=request_id,
                success=False,
                error=str(e),
                error_trace=self._get_trace()
            )
            
            await self.audit_logger.log(
                event_type='modification_failed',
                request=request,
                result=result
            )
            
            return result
    
    async def _verify_in_sandbox(
        self,
        request: ModificationRequest
    ) -> Dict[str, Any]:
        """沙箱验证"""
        
        verification = await self.sandbox_executor.execute(
            operation='verify_modification',
            request=request
        )
        
        return verification
    
    async def _apply_change(
        self,
        request: ModificationRequest
    ) -> Dict[str, Any]:
        """应用修改"""
        
        if request.layer == ModificationLayer.SKILL:
            return await self._apply_skill_change(request)
        elif request.layer == ModificationLayer.MODEL:
            return await self._apply_model_change(request)
        elif request.layer == ModificationLayer.ARCHITECTURE:
            return await self._apply_architecture_change(request)
    
    async def _apply_skill_change(
        self,
        request: ModificationRequest
    ) -> Dict[str, Any]:
        """应用技能修改"""
        
        skill = await self.skill_registry.get(request.target_id)
        
        if request.modification_type == 'error_handling':
            skill.error_handling = request.new_value.get('error_handlers', {})
        elif request.modification_type == 'step_optimization':
            skill.steps = self._merge_steps(skill.steps, request.new_value)
        elif request.modification_type == 'example_addition':
            skill.examples = skill.examples + request.new_value.get('examples', [])
        
        await self.skill_registry.save(skill)
        
        return {'skill_id': skill.skill_id, 'updated_fields': list(request.new_value.keys())}
    
    # ==================== 回滚机制 ====================
    
    async def rollback(
        self,
        request_id: str,
        reason: Optional[str] = None
    ) -> bool:
        """回滚修改"""
        
        # 获取版本历史
        versions = self.version_store.get(request_id, [])
        if len(versions) < 2:
            return False
        
        # 获取当前版本和上一版本
        current = versions[-1]
        previous = versions[-2]
        
        # 执行回滚
        request = ModificationRequest(
            request_id=request_id,
            layer=current['layer'],
            target_id=current['target_id'],
            modification_type='rollback',
            old_value=current['value'],
            new_value=previous['value'],
            reason=reason or '用户请求回滚',
            evidence=[],
            impact_level=ImpactLevel.MEDIUM,
            requires_approval=True
        )
        
        try:
            await self._apply_change(request)
            
            # 更新版本历史
            self.version_store[request_id].append({
                'timestamp': datetime.now().isoformat(),
                'action': 'rollback',
                'value': previous['value']
            })
            
            return True
            
        except Exception:
            return False
    
    async def _save_version(self, request: ModificationRequest):
        """保存版本"""
        
        key = f"{request.layer.value}_{request.target_id}"
        
        if key not in self.version_store:
            self.version_store[key] = []
        
        # 获取当前值
        current_value = await self._get_current_value(request)
        
        self.version_store[key].append({
            'request_id': request.request_id,
            'timestamp': datetime.now().isoformat(),
            'layer': request.layer.value,
            'target_id': request.target_id,
            'value': current_value,
            'modification': {
                'type': request.modification_type,
                'new_value': request.new_value
            }
        })
        
        # 限制版本数量
        if len(self.version_store[key]) > self.max_versions:
            self.version_store[key] = self.version_store[key][-self.max_versions:]
    
    # ==================== 辅助方法 ====================
    
    def _generate_request_id(self) -> str:
        """生成请求ID"""
        return f"mod_{hashlib.md5(str(datetime.now()).encode()).hexdigest()[:12]}"
    
    def _identify_error_pattern(self, failures: List[Dict]) -> Optional[Dict]:
        """识别错误模式"""
        
        error_types = {}
        for f in failures:
            error_type = f.get('error_type', 'unknown')
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        # 找出最频繁的错误类型
        if error_types:
            most_common = max(error_types.items(), key=lambda x: x[1])
            if most_common[1] >= 3:
                return {
                    'error_type': most_common[0],
                    'count': most_common[1],
                    'handler': 'retry_with_backoff'
                }
        
        return None
    
    def _suggest_step_optimization(self, slow_steps: List[Dict]) -> Optional[Dict]:
        """建议步骤优化"""
        
        optimizations = []
        
        for step in slow_steps:
            if step.get('duration', 0) > 30:
                optimizations.append({
                    'step_id': step['step_id'],
                    'suggestion': 'parallelize',
                    'reason': f"步骤执行时间过长 ({step['duration']}s)"
                })
        
        return {'optimizations': optimizations} if optimizations else None
```

### 5.3 约束与安全机制

```python
# kunlun/modification_constraints.py
from dataclasses import dataclass
from typing import Dict, List, Set, Optional, Callable
from enum import Enum
from datetime import datetime
import asyncio

class ConstraintType(Enum):
    FORBIDDEN = "forbidden"           # 禁止执行
    REQUIRES_APPROVAL = "approval"    # 需要审批
    RATE_LIMITED = "rate_limited"     # 频率限制
    CONDITIONAL = "conditional"       # 条件限制

@dataclass
class Constraint:
    """约束定义"""
    constraint_id: str
    constraint_type: ConstraintType
    description: str
    
    # 约束条件
    layers: List[str] = None  # 适用的层级
    modification_types: List[str] = None  # 适用的修改类型
    target_patterns: List[str] = None  # 目标模式
    
    # 约束参数
    max_frequency: Optional[int] = None  # 最大频率
    time_window: Optional[int] = None  # 时间窗口(秒)
    required_approvers: List[str] = None  # 必需的审批人
    conditions: Optional[Callable] = None  # 自定义条件
    
    # 豁免规则
    exempt_roles: List[str] = None  # 豁免角色
    exempt_users: List[str] = None  # 豁免用户

class ConstraintEngine:
    """约束引擎"""
    
    def __init__(self):
        self.constraints: Dict[str, Constraint] = {}
        self.frequency_tracker: Dict[str, List[datetime]] = {}
        
        # 加载默认约束
        self._load_default_constraints()
    
    def _load_default_constraints(self):
        """加载默认约束"""
        
        # 架构层禁止修改
        self.add_constraint(Constraint(
            constraint_id="arch_no_direct_modify",
            constraint_type=ConstraintType.FORBIDDEN,
            description="架构层修改必须经过完整测试",
            layers=["architecture"],
            exempt_roles=["admin"]
        ))
        
        # 敏感字段修改需要审批
        self.add_constraint(Constraint(
            constraint_id="sensitive_field_approval",
            constraint_type=ConstraintType.REQUIRES_APPROVAL,
            description="敏感字段修改需要审批",
            modification_types=["sensitive_field_change"],
            required_approvers=["security_admin", "system_admin"]
        ))
        
        # 修改频率限制
        self.add_constraint(Constraint(
            constraint_id="modification_rate_limit",
            constraint_type=ConstraintType.RATE_LIMITED,
            description="修改频率限制",
            layers=["skill", "model"],
            max_frequency=10,
            time_window=3600  # 1小时
        ))
    
    async def check_constraints(
        self,
        request: 'ModificationRequest',
        user_role: str = "system",
        user_id: str = None
    ) -> tuple[bool, List[str]]:
        """
        检查约束
        返回: (通过, 失败原因列表)
        """
        
        failures = []
        
        for constraint in self.constraints.values():
            # 检查是否适用
            if not self._is_applicable(constraint, request):
                continue
            
            # 检查豁免
            if self._is_exempt(constraint, user_role, user_id):
                continue
            
            # 执行检查
            passed, reason = await self._evaluate_constraint(constraint, request)
            
            if not passed:
                failures.append(f"{constraint.constraint_id}: {reason}")
        
        return len(failures) == 0, failures
    
    def _is_applicable(
        self,
        constraint: Constraint,
        request: 'ModificationRequest'
    ) -> bool:
        """检查约束是否适用"""
        
        # 检查层级
        if constraint.layers:
            if request.layer.value not in constraint.layers:
                return False
        
        # 检查修改类型
        if constraint.modification_types:
            if request.modification_type not in constraint.modification_types:
                return False
        
        # 检查目标模式
        if constraint.target_patterns:
            matches = any(
                pattern in request.target_id 
                for pattern in constraint.target_patterns
            )
            if not matches:
                return False
        
        return True
    
    def _is_exempt(
        self,
        constraint: Constraint,
        user_role: str,
        user_id: str
    ) -> bool:
        """检查是否豁免"""
        
        if constraint.exempt_roles and user_role in constraint.exempt_roles:
            return True
        
        if constraint.exempt_users and user_id in constraint.exempt_users:
            return True
        
        return False
    
    async def _evaluate_constraint(
        self,
        constraint: Constraint,
        request: 'ModificationRequest'
    ) -> tuple[bool, str]:
        """评估约束"""
        
        if constraint.constraint_type == ConstraintType.FORBIDDEN:
            return False, constraint.description
        
        elif constraint.constraint_type == ConstraintType.RATE_LIMITED:
            return self._check_rate_limit(constraint, request)
        
        elif constraint.constraint_type == ConstraintType.REQUIRES_APPROVAL:
            # 需要检查是否已有审批
            if not request.requires_approval:
                return False, f"{constraint.description}"
            return True, ""
        
        elif constraint.constraint_type == ConstraintType.CONDITIONAL:
            if constraint.conditions:
                return await constraint.conditions(request)
            return True, ""
        
        return True, ""
    
    def _check_rate_limit(
        self,
        constraint: Constraint,
        request: 'ModificationRequest'
    ) -> tuple[bool, str]:
        """检查频率限制"""
        
        key = f"{constraint.constraint_id}_{request.layer.value}"
        
        # 获取历史记录
        history = self.frequency_tracker.get(key, [])
        cutoff = datetime.now() - timedelta(seconds=constraint.time_window)
        
        # 清理过期记录
        history = [t for t in history if t > cutoff]
        self.frequency_tracker[key] = history
        
        # 检查频率
        if len(history) >= constraint.max_frequency:
            return False, f"超过频率限制: {constraint.max_frequency}/{constraint.time_window}s"
        
        # 添加新记录
        history.append(datetime.now())
        
        return True, ""
```

---

## 六、三级部署整合方案

### 6.1 省/市/县差异化配置

```python
# kunlun/tiered_deployment.py
from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum

class DeploymentTier(Enum):
    PROVINCE = "province"   # 省级
    CITY = "city"           # 市级
    COUNTY = "county"       # 县级

@dataclass
class TieredCapabilities:
    """三级能力配置"""
    
    # 技能系统
    max_skills: int
    skill_categories: List[str]
    custom_skill_creation: bool
    skill_market_access: str  # full, limited, none
    
    # 人格蒸馏
    distillation_enabled: bool
    distillation_depth: str   # full, standard, basic
    distillation_topics: List[str]
    
    # 自我修改
    self_modification_enabled: bool
    modification_layers: List[str]
    requires_approval: bool
    approval_levels: List[str]
    
    # 知识库
    knowledge_base_size: str  # unlimited, large, medium, small
    custom_knowledge_upload: bool
    cross_region_sharing: bool
    
    # 进化系统
    evolution_enabled: bool
    evolution_scope: str      # global, regional, local
    model_pool_access: List[str]

class TieredConfig:
    """三级配置模板"""
    
    PROVINCE_CONFIG = TieredCapabilities(
        # 技能系统 - 全量
        max_skills=10000,
        skill_categories=[
            "环评审批", "环境监测", "执法检查", "督察审查",
            "风险评估", "生态保护", "固废处置", "大气环境",
            "水环境", "土壤环境", "噪声污染", "辐射防护",
            "气候变化", "应急管理", "法规查询", "报表生成"
        ],
        custom_skill_creation=True,
        skill_market_access="full",
        
        # 人格蒸馏 - 全功能
        distillation_enabled=True,
        distillation_depth="full",
        distillation_topics=[],  # 无限制
        
        # 自我修改 - 全部层级
        self_modification_enabled=True,
        modification_layers=["skill", "model", "architecture"],
        requires_approval=True,
        approval_levels=["system", "admin"],
        
        # 知识库 - 无限制
        knowledge_base_size="unlimited",
        custom_knowledge_upload=True,
        cross_region_sharing=True,
        
        # 进化系统 - 全局
        evolution_enabled=True,
        evolution_scope="global",
        model_pool_access=["gpt-4o", "claude-3-opus", "deepseek-v3", "local-models"]
    )
    
    CITY_CONFIG = TieredCapabilities(
        # 技能系统 - 核心子集
        max_skills=500,
        skill_categories=[
            "环评审批", "环境监测", "执法检查", "风险评估",
            "法规查询", "报表生成", "公文处理"
        ],
        custom_skill_creation=True,
        skill_market_access="limited",
        
        # 人格蒸馏 - 标准
        distillation_enabled=True,
        distillation_depth="standard",
        distillation_topics=["工作风格", "专业领域", "沟通偏好"],
        
        # 自我修改 - 技能和模型层
        self_modification_enabled=True,
        modification_layers=["skill", "model"],
        requires_approval=True,
        approval_levels=["admin"],
        
        # 知识库 - 省级共享+本地
        knowledge_base_size="large",
        custom_knowledge_upload=True,
        cross_region_sharing=True,
        
        # 进化系统 - 区域
        evolution_enabled=True,
        evolution_scope="regional",
        model_pool_access=["gpt-4o-mini", "claude-3-haiku", "deepseek-v3"]
    )
    
    COUNTY_CONFIG = TieredCapabilities(
        # 技能系统 - 基础包
        max_skills=100,
        skill_categories=[
            "环评初审", "基础监测", "简易执法", "报表生成", "公文处理"
        ],
        custom_skill_creation=False,
        skill_market_access="none",
        
        # 人格蒸馏 - 简化
        distillation_enabled=True,
        distillation_depth="basic",
        distillation_topics=["沟通偏好"],
        
        # 自我修改 - 禁用
        self_modification_enabled=False,
        modification_layers=[],
        requires_approval=False,
        approval_levels=[],
        
        # 知识库 - 省市共享
        knowledge_base_size="medium",
        custom_knowledge_upload=False,
        cross_region_sharing=False,
        
        # 进化系统 - 本地
        evolution_enabled=True,
        evolution_scope="local",
        model_pool_access=["deepseek-v3"]
    )

class ThreeTierDeploymentManager:
    """三级部署管理器"""
    
    def __init__(
        self,
        province_center: str,
        city_centers: Dict[str, str],
        county_centers: Dict[str, str]
    ):
        self.province_center = province_center
        self.city_centers = city_centers
        self.county_centers = county_centers
        
        self.tier_configs = {
            DeploymentTier.PROVINCE: TieredConfig.PROVINCE_CONFIG,
            DeploymentTier.CITY: TieredConfig.CITY_CONFIG,
            DeploymentTier.COUNTY: TieredConfig.COUNTY_CONFIG
        }
    
    def get_config(self, tier: DeploymentTier) -> TieredCapabilities:
        """获取指定层级的配置"""
        return self.tier_configs.get(tier)
    
    async def sync_down(
        self,
        tier: DeploymentTier,
        data_types: List[str]
    ):
        """下行同步 - 从省级向下去"""
        
        if tier == DeploymentTier.PROVINCE:
            return  # 省级无需下行
        
        config = self.get_config(tier)
        
        for data_type in data_types:
            if data_type == "skills":
                await self._sync_skills_down(tier)
            elif data_type == "knowledge":
                await self._sync_knowledge_down(tier)
            elif data_type == "config":
                await self._sync_config_down(tier)
            elif data_type == "models":
                await self._sync_models_down(tier)
    
    async def sync_up(
        self,
        tier: DeploymentTier,
        data_types: List[str]
    ):
        """上行同步 - 向省级上报"""
        
        if tier == DeploymentTier.COUNTY:
            await self._sync_from_county(data_types)
        elif tier == DeploymentTier.CITY:
            await self._sync_from_city(data_types)
    
    async def _sync_skills_down(self, tier: DeploymentTier):
        """下行同步技能"""
        
        if tier == DeploymentTier.CITY:
            # 省级 → 市级
            target_skills = TieredConfig.CITY_CONFIG.skill_categories
        else:
            # 市级 → 县级
            target_skills = TieredConfig.COUNTY_CONFIG.skill_categories
        
        # 获取省级技能
        province_skills = await self._get_skills_from_province(target_skills)
        
        # 过滤并同步
        for skill in province_skills:
            await self._deploy_skill(skill, tier)
    
    async def _sync_knowledge_down(self, tier: DeploymentTier):
        """下行同步知识库"""
        
        if tier == DeploymentTier.CITY:
            # 同步省级知识
            await self._deploy_knowledge_category("provincial_regulations")
            await self._deploy_knowledge_category("provincial_templates")
        else:
            # 同步市县共用知识
            await self._deploy_knowledge_category("city_regulations")
    
    async def apply_personality_adaptation(
        self,
        tier: DeploymentTier,
        user_profile: 'UserProfile'
    ) -> Dict[str, Any]:
        """应用人格蒸馏适配"""
        
        config = self.get_config(tier)
        
        if not config.distillation_enabled:
            return {'enabled': False, 'reason': 'disabled'}
        
        if config.distillation_depth == "full":
            return {
                'enabled': True,
                'depth': 'full',
                'adaptations': self._generate_full_adaptations(user_profile)
            }
        elif config.distillation_depth == "standard":
            return {
                'enabled': True,
                'depth': 'standard',
                'adaptations': self._generate_standard_adaptations(user_profile)
            }
        else:
            return {
                'enabled': True,
                'depth': 'basic',
                'adaptations': self._generate_basic_adaptations(user_profile)
            }
    
    def _generate_full_adaptations(
        self,
        profile: 'UserProfile'
    ) -> Dict[str, Any]:
        """生成全功能适配"""
        
        return {
            'response_style': {
                'verbosity': profile.perspective.get('verbosity', 'medium'),
                'technical_level': profile.personality.get('technical_level', 'advanced'),
                'include_reasoning': True,
                'include_alternatives': True
            },
            'skill_recommendations': {
                'complexity': profile.personality.get('complexity_preference', 'medium'),
                'automation_level': profile.values.get('autonomy_level', 'collaborative'),
                'include_explanations': True
            },
            'interaction_patterns': {
                'confirmation_style': profile.personality.get('confirmation_preference', 'auto'),
                'feedback_frequency': profile.life_philosophy.get('feedback_frequency', 'weekly')
            }
        }
    
    def _generate_standard_adaptations(
        self,
        profile: 'UserProfile'
    ) -> Dict[str, Any]:
        """生成标准适配"""
        
        return {
            'response_style': {
                'verbosity': profile.perspective.get('verbosity', 'medium'),
                'include_reasoning': True
            },
            'skill_recommendations': {
                'complexity': profile.personality.get('complexity_preference', 'medium')
            }
        }
    
    def _generate_basic_adaptations(
        self,
        profile: 'UserProfile'
    ) -> Dict[str, Any]:
        """生成基础适配"""
        
        return {
            'response_style': {
                'verbosity': 'medium'
            }
        }
```

### 6.2 数据同步策略

```python
# kunlun/tiered_sync.py
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import hashlib

class SyncDirection(Enum):
    DOWN = "down"  # 下行
    UP = "up"      # 上行
    LATERAL = "lateral"  # 横向

@dataclass
class SyncTask:
    """同步任务"""
    task_id: str
    direction: SyncDirection
    source_tier: DeploymentTier
    target_tier: DeploymentTier
    
    data_type: str
    data_id: str
    version: str
    
    priority: int
    scheduled_at: datetime
    status: str

class TieredSyncManager:
    """三级同步管理器"""
    
    def __init__(
        self,
        storage: 'StorageBackend',
        network: 'NetworkClient'
    ):
        self.storage = storage
        self.network = network
        
        # 同步策略配置
        self.sync_policies = {
            'skills': {
                'frequency': timedelta(hours=6),
                'priority': 'high',
                'compression': True
            },
            'knowledge': {
                'frequency': timedelta(hours=24),
                'priority': 'medium',
                'compression': True
            },
            'user_data': {
                'frequency': timedelta(minutes=5),
                'priority': 'high',
                'compression': False
            },
            'config': {
                'frequency': timedelta(hours=1),
                'priority': 'high',
                'compression': True
            }
        }
        
        # 冲突解决策略
        self.conflict_resolution = {
            'province_wins': ['skills', 'knowledge', 'config'],
            'latest_wins': ['user_data', 'feedback'],
            'merge': ['annotations', 'personalizations']
        }
    
    async def schedule_sync(
        self,
        direction: SyncDirection,
        source_tier: DeploymentTier,
        target_tier: DeploymentTier,
        data_type: str
    ) -> SyncTask:
        """调度同步任务"""
        
        task = SyncTask(
            task_id=self._generate_task_id(),
            direction=direction,
            source_tier=source_tier,
            target_tier=target_tier,
            data_type=data_type,
            data_id="*",  # 全量
            version="",
            priority=self.sync_policies[data_type]['priority'],
            scheduled_at=datetime.now(),
            status='pending'
        )
        
        await self._save_task(task)
        await self._schedule_execution(task)
        
        return task
    
    async def execute_sync(self, task: SyncTask) -> Dict[str, Any]:
        """执行同步"""
        
        try:
            # 1. 获取数据
            data = await self._fetch_data(task)
            
            # 2. 压缩打包
            if self.sync_policies[task.data_type]['compression']:
                data = await self._compress_data(data)
            
            # 3. 传输
            result = await self._transfer_data(task, data)
            
            # 4. 验证
            verified = await self._verify_transfer(task, result)
            
            task.status = 'completed' if verified else 'failed'
            
            return {
                'success': verified,
                'task_id': task.task_id,
                'bytes_transferred': result.get('bytes', 0),
                'duration': result.get('duration', 0)
            }
            
        except Exception as e:
            task.status = 'failed'
            return {
                'success': False,
                'task_id': task.task_id,
                'error': str(e)
            }
    
    async def resolve_conflict(
        self,
        data_type: str,
        local_version: Dict,
        remote_version: Dict
    ) -> Dict:
        """解决数据冲突"""
        
        strategy = self.conflict_resolution.get(data_type, 'latest_wins')
        
        if strategy == 'province_wins':
            # 总是使用省级版本
            return remote_version
        
        elif strategy == 'latest_wins':
            # 使用最新版本
            local_time = local_version.get('updated_at', '')
            remote_time = remote_version.get('updated_at', '')
            return remote_version if remote_time > local_time else local_version
        
        elif strategy == 'merge':
            # 合并版本
            return self._merge_versions(local_version, remote_version)
        
        return local_version
    
    async def _fetch_data(self, task: SyncTask) -> Any:
        """获取数据"""
        
        if task.direction == SyncDirection.DOWN:
            # 从上级获取
            return await self.storage.fetch(
                data_type=task.data_type,
                from_tier=task.source_tier.value
            )
        else:
            # 从本地获取
            return await self.storage.fetch_local(
                data_type=task.data_type,
                tier=task.source_tier.value
            )
    
    async def _transfer_data(
        self,
        task: SyncTask,
        data: Any
    ) -> Dict:
        """传输数据"""
        
        # 确定目标地址
        if task.direction == SyncDirection.DOWN:
            target_url = self._get_downlink_url(task.target_tier)
        else:
            target_url = self._get_uplink_url(task.source_tier)
        
        # 传输
        start_time = datetime.now()
        
        result = await self.network.post(
            url=target_url,
            data=data,
            headers={
                'X-Sync-Task-ID': task.task_id,
                'X-Sync-Direction': task.direction.value,
                'X-Data-Type': task.data_type
            }
        )
        
        duration = (datetime.now() - start_time).total_seconds()
        
        return {
            'bytes': len(str(data)),
            'duration': duration,
            'status_code': result.status_code
        }
```

---

## 七、实施路线图

### 7.1 分阶段实施计划

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         昆仑框架人格蒸馏与自进化系统 - 实施路线图                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│  Phase 1: 基础能力建设 (Week 1-8)                                                │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
│  Week 1-2: 人格蒸馏引擎核心                                                      │
│  ├── 基础画像Schema设计                                                         │
│  ├── 简单规则信号提取实现                                                        │
│  ├── 画像存储与检索                                                             │
│  └── 基础隐私保护                                                               │
│                                                                                  │
│  Week 3-4: 技能自动生成原型                                                      │
│  ├── 模式识别基础算法                                                            │
│  ├── 技能模板设计                                                               │
│  ├── 基础质量控制                                                               │
│  └── 用户确认工作流                                                             │
│                                                                                  │
│  Week 5-6: 技能生态兼容                                                          │
│  ├── 统一技能模型定义                                                           │
│  ├── Hermes适配器实现                                                           │
│  ├── ClawHub适配器实现                                                          │
│  └── 双向转换工具                                                               │
│                                                                                  │
│  Week 7-8: 自我修改系统基础                                                       │
│  ├── 三层自修改架构                                                             │
│  ├── 基础约束引擎                                                               │
│  ├── 沙箱验证机制                                                                │
│  └── 审计日志系统                                                               │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│  Phase 2: 功能完善与集成 (Week 9-16)                                             │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
│  Week 9-10: LLM增强蒸馏                                                         │
│  ├── LLM深度信号提取                                                            │
│  ├── A/B验证模块                                                                │
│  ├── 增量更新算法优化                                                           │
│  └── 多租户隔离完善                                                             │
│                                                                                  │
│  Week 11-12: 技能生成完整流程                                                    │
│  ├── 复杂模式识别                                                               │
│  ├── 技能自动优化                                                               │
│  ├── 生命周期管理                                                               │
│  └── 市场发布集成                                                               │
│                                                                                  │
│  Week 13-14: 回滚与安全                                                          │
│  ├── 版本控制完善                                                               │
│  ├── 自动回滚机制                                                               │
│  ├── 高级约束引擎                                                                │
│  └── 人工审批流程                                                               │
│                                                                                  │
│  Week 15-16: 系统集成测试                                                        │
│  ├── 各模块集成                                                                 │
│  ├── 端到端测试                                                                 │
│  ├── 性能优化                                                                  │
│  └── 文档完善                                                                   │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│  Phase 3: 三级部署实施 (Week 17-24)                                              │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
│  Week 17-18: 省级平台部署                                                        │
│  ├── 全功能配置验证                                                             │
│  ├── 技能市场集成                                                               │
│  ├── 人格蒸馏引擎调优                                                           │
│  └── 自我修改系统启用                                                           │
│                                                                                  │
│  Week 19-20: 市级平台部署                                                        │
│  ├── 标准功能配置                                                               │
│  ├── 下行同步机制                                                               │
│  ├── 上行数据汇聚                                                               │
│  └── 限制功能验证                                                               │
│                                                                                  │
│  Week 21-22: 县级平台部署                                                         │
│  ├── 基础功能配置                                                               │
│  ├── 共享知识库接入                                                             │
│  ├── 简化人格画像                                                               │
│  └── 自我修改禁用验证                                                           │
│                                                                                  │
│  Week 23-24: 三级联调与验收                                                      │
│  ├── 全省数据同步测试                                                           │
│  ├── 性能基准测试                                                               │
│  ├── 安全审计                                                                   │
│  └── 正式验收                                                                   │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│  Phase 4: 持续优化 (Week 25+)                                                    │
│  ═══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
│  Ongoing:                                                                        
│  ├── 技能市场扩充                                                               │
│  ├── 画像准确度提升                                                             │
│  ├── 自我修改策略优化                                                           │
│  ├── 新功能迭代                                                                 │
│  └── 性能监控与调优                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 关键里程碑

| 里程碑 | 计划时间 | 交付物 | 验收标准 |
|--------|----------|--------|----------|
| M1: 基础画像 | Week 4 | 五维画像Schema + 基础提取 | 10维度覆盖，>70%准确率 |
| M2: 技能生成 | Week 8 | 自动生成系统 | 3次重复触发自动生成 |
| M3: 生态兼容 | Week 10 | ClawHub + Hermes适配器 | 双向转换无丢失 |
| M4: 自修改基础 | Week 12 | 三层自修改框架 | 技能层自动优化生效 |
| M5: 省级上线 | Week 18 | 省级平台 | 全功能运行 |
| M6: 全市上线 | Week 22 | 市级平台 | 差异化配置正确 |
| M7: 全县上线 | Week 24 | 县级平台 | 简化版正常运行 |
| M8: 正式验收 | Week 26 | 完整交付 | 各项指标达标 |

### 7.3 风险与应对

| 风险 | 等级 | 应对策略 |
|------|------|----------|
| 人格画像准确度不足 | 高 | 增加A/B测试，结合人工反馈 |
| 技能生成质量不稳定 | 中 | 严格质量门禁，多级验证 |
| 自我修改产生副作用 | 高 | 沙箱验证，保留回滚能力 |
| 三级同步延迟 | 中 | 异步队列，离线缓存 |
| 数据隐私泄露 | 高 | 强化加密，隐私审计 |
| 系统性能瓶颈 | 中 | 分布式架构，按需扩展 |

---

## 八、总结

### 8.1 核心价值

1. **人格蒸馏引擎**：通过五维画像实现真正的个性化服务，让AI更懂用户
2. **技能自动生成**：从重复任务中自动沉淀能力，降低使用门槛
3. **技能生态兼容**：统一格式桥接ClawHub和Hermes生态，实现技能自由流通
4. **自我修改系统**：三层自修改机制，让系统越用越智能
5. **三级部署整合**：差异化配置满足不同规模需求，统一体验

### 8.2 技术亮点

- **渐进式画像更新**：增量更新而非全量重构，降低计算开销
- **A/B验证机制**：确保画像调整的有效性
- **统一技能模型**：一次编写，多平台部署
- **沙箱验证+回滚**：安全可控的自我修改
- **隐私边界控制**：用户可控的数据使用

### 8.3 后续演进方向

1. **跨用户画像学习**：在隐私保护下学习群体智慧
2. **技能协作网络**：技能间的自动发现和组合
3. **自适应架构**：根据负载自动调整架构配置
4. **多模态人格**：扩展到图像、语音等模态
5. **情感计算**：深层情感理解与响应

---

> **文档版本**：v1.0  
> **创建日期**：2026年4月18日  
> **状态**：设计完成，待评审  
> **下一步**：Phase 1 详细设计与实现
