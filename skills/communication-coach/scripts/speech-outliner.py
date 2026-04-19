#!/usr/bin/env python3
"""
演讲大纲生成器 - Speech Outline Generator
帮助用户快速构建演讲结构和大纲
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


@dataclass
class Section:
    """演讲部分"""
    title: str
    duration: int  # 分钟
    key_points: List[str] = field(default_factory=list)
    notes: str = ""


@dataclass
class SpeechOutline:
    """演讲大纲"""
    title: str
    topic: str
    duration: int  # 总时长（分钟）
    audience: str
    purpose: str
    opening: Section
    body: List[Section]
    closing: Section
    created_at: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    def total_duration(self) -> int:
        """计算总时长"""
        total = self.opening.duration + self.closing.duration
        total += sum(section.duration for section in self.body)
        return total

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "title": self.title,
            "topic": self.topic,
            "duration": self.duration,
            "audience": self.audience,
            "purpose": self.purpose,
            "opening": {
                "title": self.opening.title,
                "duration": self.opening.duration,
                "key_points": self.opening.key_points,
                "notes": self.opening.notes
            },
            "body": [
                {
                    "title": s.title,
                    "duration": s.duration,
                    "key_points": s.key_points,
                    "notes": s.notes
                }
                for s in self.body
            ],
            "closing": {
                "title": self.closing.title,
                "duration": self.closing.duration,
                "key_points": self.closing.key_points,
                "notes": self.closing.notes
            },
            "created_at": self.created_at,
            "calculated_duration": self.total_duration()
        }

    def to_markdown(self) -> str:
        """生成Markdown格式大纲"""
        md = f"""# {self.title}

## 基本信息
- **主题**: {self.topic}
- **时长**: {self.duration}分钟
- **听众**: {self.audience}
- **目的**: {self.purpose}
- **创建时间**: {self.created_at}

## 结构大纲

### 开场 ({self.opening.duration}分钟)
**{self.opening.title}**

"""
        for i, point in enumerate(self.opening.key_points, 1):
            md += f"{i}. {point}\n"
        if self.opening.notes:
            md += f"\n备注: {self.opening.notes}\n"

        md += "\n### 主体\n"
        for section in self.body:
            md += f"#### {section.title} ({section.duration}分钟)\n"
            for i, point in enumerate(section.key_points, 1):
                md += f"{i}. {point}\n"
            if section.notes:
                md += f"\n备注: {section.notes}\n"
            md += "\n"

        md += f"""### 结尾 ({self.closing.duration}分钟)
**{self.closing.title}**

"""
        for i, point in enumerate(self.closing.key_points, 1):
            md += f"{i}. {point}\n"
        if self.closing.notes:
            md += f"\n备注: {self.closing.notes}\n"

        md += f"\n---\n**总时长**: {self.total_duration()}分钟\n"
        return md


class SpeechOutlineBuilder:
    """演讲大纲构建器"""

    def __init__(self):
        self.templates = {
            "persuasive": {
                "name": "说服性演讲",
                "structure": {
                    "opening_ratio": 0.15,
                    "closing_ratio": 0.10,
                },
                "body_pattern": ["问题", "分析", "解决方案"]
            },
            "informative": {
                "name": "信息性演讲",
                "structure": {
                    "opening_ratio": 0.10,
                    "closing_ratio": 0.10,
                },
                "body_pattern": ["概述", "详细说明1", "详细说明2", "总结"]
            },
            "inspirational": {
                "name": "激励性演讲",
                "structure": {
                    "opening_ratio": 0.20,
                    "closing_ratio": 0.15,
                },
                "body_pattern": ["挑战", "转折", "行动"]
            },
            "technical": {
                "name": "技术分享",
                "structure": {
                    "opening_ratio": 0.10,
                    "closing_ratio": 0.10,
                },
                "body_pattern": ["背景", "技术原理", "实践案例", "经验总结"]
            }
        }

        self.opening_hooks = [
            "故事开场：用一个相关的故事吸引注意",
            "问题开场：提出一个引人深思的问题",
            "数据开场：用一个惊人的数据开场",
            "引用开场：引用一句相关名言",
            "悬念开场：设置一个悬念",
            "互动开场：与听众互动"
        ]

        self.closing_techniques = [
            "总结要点：回顾演讲的核心内容",
            "号召行动：鼓励听众采取行动",
            "愿景描绘：描绘一个积极的未来",
            "故事结尾：用一个有力的故事结尾",
            "引用结尾：用一句有力的话结尾",
            "呼应开场：与开场形成呼应"
        ]

    def create_outline(self,
                      title: str,
                      topic: str,
                      duration: int,
                      audience: str,
                      purpose: str,
                      speech_type: str = "informative",
                      body_sections: Optional[List[str]] = None) -> SpeechOutline:
        """创建演讲大纲"""
        template = self.templates.get(speech_type, self.templates["informative"])

        # 计算开场和结尾时间
        opening_duration = int(duration * template["structure"]["opening_ratio"])
        closing_duration = int(duration * template["structure"]["closing_ratio"])
        body_duration = duration - opening_duration - closing_duration

        # 创建开场
        opening = Section(
            title="开场",
            duration=opening_duration,
            key_points=[
                "吸引注意（使用" + self.opening_hooks[0] + "）",
                "介绍主题",
                "说明演讲结构"
            ],
            notes="建议在30秒内抓住听众注意力"
        )

        # 创建主体部分
        if body_sections:
            # 使用自定义的部分
            section_duration = body_duration // len(body_sections)
            body = []
            for section_title in body_sections:
                body.append(Section(
                    title=section_title,
                    duration=section_duration,
                    key_points=self._generate_body_points(section_title, audience),
                    notes=""
                ))
        else:
            # 使用模板模式
            pattern = template["body_pattern"]
            section_duration = body_duration // len(pattern)
            body = []
            for section_title in pattern:
                body.append(Section(
                    title=section_title,
                    duration=section_duration,
                    key_points=self._generate_body_points(section_title, audience),
                    notes=""
                ))

        # 创建结尾
        closing = Section(
            title="结尾",
            duration=closing_duration,
            key_points=[
                "总结要点",
                "强化记忆",
                "行动号召"
            ],
            notes="以有力的方式结束，留下深刻印象"
        )

        return SpeechOutline(
            title=title,
            topic=topic,
            duration=duration,
            audience=audience,
            purpose=purpose,
            opening=opening,
            body=body,
            closing=closing
        )

    def _generate_body_points(self, section_title: str, audience: str) -> List[str]:
        """为主体部分生成要点"""
        point_generators = {
            "问题": [
                "描述当前问题的现状",
                "分析问题带来的影响",
                "说明为什么这个问题重要"
            ],
            "分析": [
                "深入分析问题的根本原因",
                "提供数据或证据支持",
                "展示问题的多面性"
            ],
            "解决方案": [
                "提出具体的解决方案",
                "解释方案的可行性",
                "展示方案的预期效果"
            ],
            "概述": [
                "介绍主题背景",
                "说明主题重要性",
                "概述演讲内容"
            ],
            "详细说明1": [
                "第一点详细说明",
                "提供具体例子",
                "解释相关概念"
            ],
            "详细说明2": [
                "第二点详细说明",
                "与第一点形成对比或补充",
                "深化理解"
            ],
            "总结": [
                "总结前面讲过的内容",
                "强化关键信息",
                "为过渡到结尾做准备"
            ],
            "挑战": [
                "描述当前面临的挑战",
                "分享相关的困难经历",
                "建立情感连接"
            ],
            "转折": [
                "分享转折点的经历",
                "描述如何克服困难",
                "传递希望和信心"
            ],
            "行动": [
                "提出具体的行动建议",
                "说明行动的可行性",
                "激励听众开始行动"
            ],
            "背景": [
                "介绍技术背景",
                "说明技术发展历程",
                "阐述技术的重要性"
            ],
            "技术原理": [
                "讲解核心技术原理",
                "分析技术架构",
                "说明技术优势"
            ],
            "实践案例": [
                "分享实际应用案例",
                "分析案例中的关键点",
                "总结经验教训"
            ],
            "经验总结": [
                "总结实践经验",
                "分享最佳实践",
                "提供避坑指南"
            ]
        }

        return point_generators.get(section_title, [
            "核心要点1",
            "核心要点2",
            "核心要点3"
        ])

    def print_templates(self):
        """打印可用模板"""
        print("\n可用的演讲模板：")
        for key, template in self.templates.items():
            print(f"\n{key}: {template['name']}")
            print(f"  结构: {' -> '.join(template['body_pattern'])}")


def interactive_mode():
    """交互式模式"""
    print("=== 演讲大纲生成器 ===\n")
    builder = SpeechOutlineBuilder()

    # 显示可用模板
    builder.print_templates()
    print("\n")

    # 收集信息
    title = input("演讲标题: ").strip() or "未命名演讲"
    topic = input("演讲主题: ").strip() or "通用主题"
    audience = input("目标听众: ").strip() or "一般听众"
    purpose = input("演讲目的: ").strip() or "传递信息"

    while True:
        try:
            duration = int(input("演讲时长（分钟）: ").strip() or "10")
            if duration > 0:
                break
            print("时长必须大于0")
        except ValueError:
            print("请输入有效的数字")

    speech_type = input("演讲类型 (persuasive/informative/inspirational/technical，默认informative): ").strip() or "informative"

    # 是否自定义主体部分
    custom_body = input("是否自定义主体部分？(y/n，默认n): ").strip().lower()
    body_sections = None
    if custom_body == 'y':
        sections_input = input("请输入主体部分标题，用逗号分隔（例如：问题,分析,解决方案）: ").strip()
        if sections_input:
            body_sections = [s.strip() for s in sections_input.split(",")]

    # 创建大纲
    outline = builder.create_outline(
        title=title,
        topic=topic,
        duration=duration,
        audience=audience,
        purpose=purpose,
        speech_type=speech_type,
        body_sections=body_sections
    )

    # 输出
    print("\n" + "="*60)
    print(outline.to_markdown())

    # 保存选项
    save = input("\n是否保存大纲？(y/n): ").strip().lower()
    if save == 'y':
        filename = input("文件名（默认使用演讲标题）: ").strip() or f"{title}.md"
        if not filename.endswith('.md'):
            filename += '.md'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(outline.to_markdown())
        print(f"大纲已保存到: {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="演讲大纲生成器 - 帮助快速构建演讲结构",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s -i                              # 交互式模式
  %(prog)s --title "产品发布" --duration 15  # 快速生成
  %(prog)s --list-templates                # 查看可用模板
        """
    )

    parser.add_argument('-i', '--interactive', action='store_true',
                       help='交互式模式')
    parser.add_argument('--title', type=str,
                       help='演讲标题')
    parser.add_argument('--topic', type=str, default='通用主题',
                       help='演讲主题')
    parser.add_argument('--duration', type=int, default=10,
                       help='演讲时长（分钟）')
    parser.add_argument('--audience', type=str, default='一般听众',
                       help='目标听众')
    parser.add_argument('--purpose', type=str, default='传递信息',
                       help='演讲目的')
    parser.add_argument('--type', choices=['persuasive', 'informative', 'inspirational', 'technical'],
                       default='informative', help='演讲类型')
    parser.add_argument('--output', '-o', type=str,
                       help='输出文件名（.md或.json）')
    parser.add_argument('--list-templates', action='store_true',
                       help='列出可用模板')

    args = parser.parse_args()

    builder = SpeechOutlineBuilder()

    if args.list_templates:
        builder.print_templates()
        return

    if args.interactive or not args.title:
        interactive_mode()
    else:
        outline = builder.create_outline(
            title=args.title,
            topic=args.topic,
            duration=args.duration,
            audience=args.audience,
            purpose=args.purpose,
            speech_type=args.type
        )

        if args.output:
            if args.output.endswith('.json'):
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(outline.to_dict(), f, ensure_ascii=False, indent=2)
                print(f"大纲已保存到: {args.output}")
            else:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(outline.to_markdown())
                print(f"大纲已保存到: {args.output}")
        else:
            print(outline.to_markdown())


if __name__ == "__main__":
    main()
