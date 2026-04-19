#!/usr/bin/env python3
"""
谈判准备工具 - Negotiation Preparation Tool
帮助用户系统性地准备谈判，包括BATNA分析、策略制定等
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from datetime import datetime


@dataclass
class Objective:
    """谈判目标"""
    category: str  # ideal, realistic, minimum
    description: str
    value: Optional[str] = None  # 具体数值
    priority: int = 1  # 优先级 1-5


@dataclass
class Alternative:
    """替代方案"""
    description: str
    feasibility: float  # 可行性 0-1
    value: float  # 价值评估 0-1
    batna_score: float  # BATNA得分


@dataclass
class Concession:
    """让步方案"""
    item: str
    value: str
    cost: str  # 我方成本
    exchange_for: str  # 期望交换


@dataclass
class Question:
    """准备问题"""
    question: str
    purpose: str
    category: str  # information, clarification, confirmation


@dataclass
class NegotiationPlan:
    """谈判计划"""
    title: str
    counterparty: str
    date: str
    context: str
    objectives: List[Objective]
    batna: Alternative
    alternatives: List[Alternative]
    concessions: List[Concession]
    questions: List[Question]
    strategy: str
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    def get_best_alternative(self) -> Alternative:
        """获取最佳替代方案（BATNA）"""
        if not self.alternatives:
            return self.batna
        best = max(self.alternatives, key=lambda x: x.batna_score)
        if best.batna_score > self.batna.batna_score:
            return best
        return self.batna

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "title": self.title,
            "counterparty": self.counterparty,
            "date": self.date,
            "context": self.context,
            "objectives": [
                {
                    "category": obj.category,
                    "description": obj.description,
                    "value": obj.value,
                    "priority": obj.priority
                }
                for obj in self.objectives
            ],
            "batna": {
                "description": self.batna.description,
                "feasibility": self.batna.feasibility,
                "value": self.batna.value,
                "batna_score": self.batna.batna_score
            },
            "alternatives": [
                {
                    "description": alt.description,
                    "feasibility": alt.feasibility,
                    "value": alt.value,
                    "batna_score": alt.batna_score
                }
                for alt in self.alternatives
            ],
            "concessions": [
                {
                    "item": c.item,
                    "value": c.value,
                    "cost": c.cost,
                    "exchange_for": c.exchange_for
                }
                for c in self.concessions
            ],
            "questions": [
                {
                    "question": q.question,
                    "purpose": q.purpose,
                    "category": q.category
                }
                for q in self.questions
            ],
            "strategy": self.strategy,
            "notes": self.notes,
            "created_at": self.created_at
        }

    def to_markdown(self) -> str:
        """生成Markdown格式计划"""
        md = f"""# {self.title}

## 基本信息
- **对方**: {self.counterparty}
- **时间**: {self.date}
- **创建时间**: {self.created_at}

## 谈判背景
{self.context}

## 谈判目标

### 理想目标 (Ideal)
"""
        for obj in self.objectives:
            if obj.category == "ideal":
                md += f"- {obj.description}"
                if obj.value:
                    md += f" (目标值: {obj.value})"
                md += f" [优先级: {'⭐'*obj.priority}]\n"

        md += "\n### 现实目标 (Realistic)\n"
        for obj in self.objectives:
            if obj.category == "realistic":
                md += f"- {obj.description}"
                if obj.value:
                    md += f" (目标值: {obj.value})"
                md += f" [优先级: {'⭐'*obj.priority}]\n"

        md += "\n### 底线目标 (Minimum)\n"
        for obj in self.objectives:
            if obj.category == "minimum":
                md += f"- {obj.description}"
                if obj.value:
                    md += f" (底线值: {obj.value})"
                md += f" [优先级: {'⭐'*obj.priority}]\n"

        md += f"""
## BATNA分析

### 最佳替代方案 (BATNA)
**方案**: {self.batna.description}
- 可行性: {self.batna.feasibility:.1%}
- 价值: {self.batna.value:.1%}
- BATNA得分: {self.batna.batna_score:.2f}

"""
        if self.alternatives:
            md += "### 其他替代方案\n"
            for i, alt in enumerate(self.alternatives, 1):
                md += f"{i}. {alt.description}\n"
                md += f"   - 可行性: {alt.feasibility:.1%}\n"
                md += f"   - 价值: {alt.value:.1%}\n"
                md += f"   - BATNA得分: {alt.batna_score:.2f}\n\n"

        md += """## 让步方案

| 让步项目 | 具体内容 | 我方成本 | 期望交换 |
|---------|---------|---------|---------|
"""
        for c in self.concessions:
            md += f"| {c.item} | {c.value} | {c.cost} | {c.exchange_for} |\n"

        md += f"""
## 准备问题

### 信息收集
"""
        for q in self.questions:
            if q.category == "information":
                md += f"- {q.question} (目的: {q.purpose})\n"

        md += "\n### 澄清确认\n"
        for q in self.questions:
            if q.category == "clarification":
                md += f"- {q.question} (目的: {q.purpose})\n"

        md += "\n### 确认理解\n"
        for q in self.questions:
            if q.category == "confirmation":
                md += f"- {q.question} (目的: {q.purpose})\n"

        md += f"""
## 谈判策略
{self.strategy}

## 策略框架

### 开场阶段
- 建立友好氛围
- 明确议程
- 探索对方立场

### 探索阶段
- 积极倾听
- 开放式提问
- 识别真实需求

### 讨价还价
- 基于利益而非立场
- 交换式让步
- 创造双赢方案

### 收尾阶段
- 确认共识
- 总结协议
- 维护关系

## 谈判话术

### 倾听与反馈
- "我听到您说..."
- "您的意思是..."
- "我理解您的关切..."

### 提问技巧
- "能否详细说说..."
- "您最关心的是..."
- "如果...会怎样..."

### 让步表达
- "如果...那么..."
- "我可以在...方面让步，但..."
- "作为交换..."

"""
        if self.notes:
            md += f"## 备注说明\n{self.notes}\n"

        return md


class NegotiationPrepTool:
    """谈判准备工具"""

    def __init__(self):
        self.strategies = {
            "competitive": {
                "name": "竞争策略",
                "description": "强势立场，最小让步，适用于一次性关系",
                "tactics": [
                    "开场立场强硬",
                    "坚持核心要求",
                    "最小化让步",
                    "展示BATNA实力"
                ]
            },
            "collaborative": {
                "name": "合作策略",
                "description": "开放态度，信息共享，创造双赢，适用于长期关系",
                "tactics": [
                    "开放透明沟通",
                    "分享相关信息",
                    "探索共同利益",
                    "创造整合方案"
                ]
            },
            "compromising": {
                "name": "妥协策略",
                "description": "各退一步，快速达成，适用于时间压力",
                "tactics": [
                    "寻找中间点",
                    "交换式让步",
                    "快速推进",
                    "保持关系"
                ]
            },
            "accommodating": {
                "name": "迁就策略",
                "description": "对方优先，维护关系，适用于关系更重要时",
                "tactics": [
                    "理解对方需求",
                    "优先考虑对方",
                    "建立长期信任",
                    "积累善意"
                ]
            }
        }

    def calculate_batna_score(self, feasibility: float, value: float) -> float:
        """计算BATNA得分"""
        return feasibility * 0.6 + value * 0.4

    def create_plan(self,
                    title: str,
                    counterparty: str,
                    date: str,
                    context: str,
                    objectives: List[Dict],
                    batna_desc: str,
                    batna_feasibility: float,
                    batna_value: float,
                    strategy: str = "collaborative") -> NegotiationPlan:
        """创建谈判计划"""

        # 创建目标
        objs = []
        for obj in objectives:
            objs.append(Objective(
                category=obj.get("category", "realistic"),
                description=obj["description"],
                value=obj.get("value"),
                priority=obj.get("priority", 3)
            ))

        # 创建BATNA
        batna = Alternative(
            description=batna_desc,
            feasibility=batna_feasibility,
            value=batna_value,
            batna_score=self.calculate_batna_score(batna_feasibility, batna_value)
        )

        # 生成默认问题
        questions = [
            Question(
                question="能否详细说说您的需求和期望？",
                purpose="了解对方真实需求",
                category="information"
            ),
            Question(
                question="您最关心的是什么？",
                purpose="识别对方优先级",
                category="information"
            ),
            Question(
                question="您是指...吗？",
                purpose="澄清理解",
                category="clarification"
            ),
            Question(
                question="所以您是说...对吗？",
                purpose="确认理解",
                category="confirmation"
            )
        ]

        # 获取策略描述
        strategy_info = self.strategies.get(strategy, self.strategies["collaborative"])
        strategy_desc = f"{strategy_info['name']}\n\n"
        strategy_desc += f"策略描述: {strategy_info['description']}\n\n"
        strategy_desc += "关键战术:\n"
        for tactic in strategy_info['tactics']:
            strategy_desc += f"- {tactic}\n"

        return NegotiationPlan(
            title=title,
            counterparty=counterparty,
            date=date,
            context=context,
            objectives=objs,
            batna=batna,
            alternatives=[],
            concessions=[],
            questions=questions,
            strategy=strategy_desc
        )

    def print_strategies(self):
        """打印可用策略"""
        print("\n可用的谈判策略：")
        for key, strategy in self.strategies.items():
            print(f"\n{key}: {strategy['name']}")
            print(f"  {strategy['description']}")


def interactive_mode():
    """交互式模式"""
    print("=== 谈判准备工具 ===\n")
    tool = NegotiationPrepTool()

    # 显示可用策略
    tool.print_strategies()

    # 收集基本信息
    print("\n" + "="*50)
    title = input("谈判标题: ").strip() or "未命名谈判"
    counterparty = input("谈判对方: ").strip() or "对方"
    date = input("谈判时间: ").strip() or datetime.now().strftime("%Y-%m-%d")
    context = input("谈判背景: ").strip() or "常规谈判"

    # 收集目标
    print("\n--- 设定谈判目标 ---")
    objectives = []

    print("\n[理想目标]")
    ideal = input("理想目标是什么？: ").strip()
    if ideal:
        objectives.append({
            "category": "ideal",
            "description": ideal,
            "value": input("具体数值（可选）: ").strip() or None,
            "priority": 5
        })

    print("\n[现实目标]")
    realistic = input("现实目标是什么？: ").strip()
    if realistic:
        objectives.append({
            "category": "realistic",
            "description": realistic,
            "value": input("具体数值（可选）: ").strip() or None,
            "priority": 3
        })

    print("\n[底线目标]")
    minimum = input("底线目标是什么？: ").strip()
    if minimum:
        objectives.append({
            "category": "minimum",
            "description": minimum,
            "value": input("具体数值（可选）: ").strip() or None,
            "priority": 1
        })

    # BATNA分析
    print("\n--- BATNA分析 ---")
    batna_desc = input("如果不达成协议，你会怎么做？: ").strip() or "继续寻找其他机会"

    while True:
        try:
            batna_feasibility = float(input("该方案的可行性 (0-1): ").strip() or "0.5")
            batna_value = float(input("该方案的价值评估 (0-1): ").strip() or "0.5")
            if 0 <= batna_feasibility <= 1 and 0 <= batna_value <= 1:
                break
            print("请输入0-1之间的数值")
        except ValueError:
            print("请输入有效的数字")

    # 策略选择
    print("\n--- 策略选择 ---")
    strategy = input("选择策略 (competitive/collaborative/compromising/accommodating，默认collaborative): ").strip() or "collaborative"

    # 创建计划
    plan = tool.create_plan(
        title=title,
        counterparty=counterparty,
        date=date,
        context=context,
        objectives=objectives,
        batna_desc=batna_desc,
        batna_feasibility=batna_feasibility,
        batna_value=batna_value,
        strategy=strategy
    )

    # 输出
    print("\n" + "="*60)
    print(plan.to_markdown())

    # 保存选项
    save = input("\n是否保存计划？(y/n): ").strip().lower()
    if save == 'y':
        filename = input("文件名（默认使用谈判标题）: ").strip() or f"{title}.md"
        if not filename.endswith('.md'):
            filename += '.md'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(plan.to_markdown())
        print(f"计划已保存到: {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="谈判准备工具 - 帮助系统性地准备谈判",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s -i                                          # 交互式模式
  %(prog)s --title "薪资谈判" --counterparty "公司HR"  # 快速创建
  %(prog)s --list-strategies                           # 查看可用策略
        """
    )

    parser.add_argument('-i', '--interactive', action='store_true',
                       help='交互式模式')
    parser.add_argument('--title', type=str,
                       help='谈判标题')
    parser.add_argument('--counterparty', type=str,
                       help='谈判对方')
    parser.add_argument('--date', type=str,
                       help='谈判时间')
    parser.add_argument('--context', type=str, default='常规谈判',
                       help='谈判背景')
    parser.add_argument('--strategy',
                       choices=['competitive', 'collaborative', 'compromising', 'accommodating'],
                       default='collaborative', help='谈判策略')
    parser.add_argument('--output', '-o', type=str,
                       help='输出文件名（.md或.json）')
    parser.add_argument('--list-strategies', action='store_true',
                       help='列出可用策略')

    args = parser.parse_args()

    tool = NegotiationPrepTool()

    if args.list_strategies:
        tool.print_strategies()
        return

    if args.interactive or not args.title:
        interactive_mode()
    else:
        if not args.counterparty:
            print("错误: 必须指定谈判对方 (--counterparty)")
            sys.exit(1)

        plan = tool.create_plan(
            title=args.title,
            counterparty=args.counterparty,
            date=args.date or datetime.now().strftime("%Y-%m-%d"),
            context=args.context,
            objectives=[],
            batna_desc="继续寻找其他机会",
            batna_feasibility=0.5,
            batna_value=0.5,
            strategy=args.strategy
        )

        if args.output:
            if args.output.endswith('.json'):
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(plan.to_dict(), f, ensure_ascii=False, indent=2)
                print(f"计划已保存到: {args.output}")
            else:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(plan.to_markdown())
                print(f"计划已保存到: {args.output}")
        else:
            print(plan.to_markdown())


if __name__ == "__main__":
    main()
