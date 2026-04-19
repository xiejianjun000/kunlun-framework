#!/usr/bin/env python3
"""
Deep Thinker - 思考方法论辅助脚本

这个脚本提供了一些辅助函数，帮助选择和应用思考方法论。
可以作为技能的辅助工具使用。
"""

from typing import Dict, List, Tuple
import re

class ThinkingMethodologies:
    """八大思考方法论"""

    @staticmethod
    def first_principles(problem: str) -> Dict[str, str]:
        """
        第一性原理思考

        返回思考框架和关键提问
        """
        return {
            "method": "第一性原理",
            "framework": [
                "1. 分解问题到基本事实",
                "2. 质疑每个假设",
                "3. 从基本事实重新推导",
                "4. 寻找非显而易见的解决方案"
            ],
            "key_questions": [
                "这个问题的本质是什么？",
                "有哪些不能违背的基本真理？",
                "如果从零开始，会如何设计？",
                "当前做法是基于什么假设？这些假设成立吗？"
            ],
            "when_to_use": [
                "需要创新突破",
                "遇到瓶颈",
                "从零设计",
                "质疑常规做法"
            ]
        }

    @staticmethod
    def systems_thinking(problem: str) -> Dict[str, str]:
        """系统性思维"""
        return {
            "method": "系统性思维",
            "framework": [
                "1. 识别系统边界和要素",
                "2. 分析要素间的关系（反馈回路）",
                "3. 找出杠杆点（影响力最大的节点）",
                "4. 预测系统演化方向"
            ],
            "key_questions": [
                "这个系统包含哪些要素？",
                "它们如何相互影响？（正反馈/负反馈）",
                "哪些是杠杆点？改变哪里会产生最大影响？",
                "长期演化会怎样？",
                "有没有意想不到的副作用？"
            ],
            "when_to_use": [
                "复杂问题",
                "组织问题",
                "长期影响分析",
                "寻找根本原因"
            ]
        }

    @staticmethod
    def critical_thinking(problem: str) -> Dict[str, str]:
        """批判性思维"""
        return {
            "method": "批判性思维",
            "framework": [
                "1. 识别核心论点",
                "2. 检查证据的充分性和可靠性",
                "3. 揭露潜在假设和偏见",
                "4. 评估逻辑推理的有效性",
                "5. 考虑替代解释"
            ],
            "key_questions": [
                "这个结论基于什么证据？",
                "证据可靠吗？充分吗？",
                "有没有隐含假设？假设成立吗？",
                "有没有其他解释？",
                "我自己的偏见是什么？",
                "这个论证的逻辑是否严密？"
            ],
            "when_to_use": [
                "评估观点",
                "判断信息可信度",
                "决策支持",
                "分析报告和数据"
            ]
        }

    @staticmethod
    def structured_thinking(problem: str) -> Dict[str, str]:
        """结构化思维"""
        return {
            "method": "结构化思维",
            "framework": [
                "1. 定义问题边界",
                "2. MECE拆解（相互独立、完全穷尽）",
                "3. 建立层次结构",
                "4. 逐一分析每个子问题"
            ],
            "key_questions": [
                "问题的范围是什么？",
                "可以如何拆解？是否符合MECE原则？",
                "有哪些常用的框架可以套用？（SWOT、2x2矩阵等）",
                "各个子问题的优先级是什么？"
            ],
            "when_to_use": [
                "复杂问题拆解",
                "方案设计",
                "沟通表达",
                "撰写报告"
            ],
            "common_frameworks": [
                "MECE原则（相互独立、完全穷尽）",
                "金字塔原理（结论先行）",
                "SWOT分析",
                "2x2矩阵",
                "问题树/鱼骨图"
            ]
        }

    @staticmethod
    def design_thinking(problem: str) -> Dict[str, str]:
        """设计思维"""
        return {
            "method": "设计思维",
            "framework": [
                "1. 同理心 (Empathize)：理解用户真实需求",
                "2. 定义 (Define)：明确核心问题",
                "3. 构思 (Ideate)：发散创意方案",
                "4. 原型 (Prototype)：快速验证",
                "5. 测试 (Test)：收集反馈，迭代优化"
            ],
            "key_questions": [
                "用户的真实痛点是什么？（不是他们说的，是他们做的）",
                "哪些需求是未被满足的？",
                "最小可行方案是什么？",
                "如何快速验证假设？"
            ],
            "when_to_use": [
                "用户问题",
                "产品创新",
                "体验优化",
                "服务设计"
            ]
        }

    @staticmethod
    def reverse_thinking(problem: str) -> Dict[str, str]:
        """逆向思维"""
        return {
            "method": "逆向思维",
            "framework": [
                "1. 反转问题：如何让情况变糟？",
                "2. 列举'愚蠢'的做法",
                "3. 从反面提取洞察",
                "4. 正向应用"
            ],
            "key_questions": [
                "如果要故意失败，会怎么做？",
                "别人都在做什么？我为什么不这么做？",
                "如果完全相反的假设成立，会怎样？",
                "从结果倒推，什么导致了这个结果？"
            ],
            "when_to_use": [
                "创新突破",
                "找问题",
                "反向验证",
                "打破常规思维"
            ]
        }

    @staticmethod
    def analogical_thinking(problem: str) -> Dict[str, str]:
        """类比思维"""
        return {
            "method": "类比思维",
            "framework": [
                "1. 识别问题的核心结构",
                "2. 寻找具有相似结构的其他领域",
                "3. 映射关系和原理",
                "4. 应用到原问题"
            ],
            "key_questions": [
                "这个问题像什么？",
                "其他领域有类似的问题吗？",
                "它们的解决方案是什么？",
                "可以借鉴什么原理？"
            ],
            "when_to_use": [
                "理解复杂概念",
                "跨界创新",
                "解释说明",
                "寻找灵感"
            ],
            "common_analogies": {
                "生物学": ["进化", "生态系统", "免疫", "共生"],
                "物理学": ["杠杆", "惯性", "共振", "熵", "临界点"],
                "经济学": ["供需", "边际效应", "机会成本", "复利"],
                "军事": ["战略", "战术", "后勤", "士气", "情报"]
            }
        }

    @staticmethod
    def second_order_thinking(problem: str) -> Dict[str, str]:
        """二阶思维"""
        return {
            "method": "二阶思维",
            "framework": [
                "1. 一阶结果：然后呢？",
                "2. 二阶结果：再然后呢？",
                "3. 三阶结果：最终会怎样？",
                "4. 评估每个结果的概率和影响"
            ],
            "key_questions": [
                "这个决定的直接后果是什么？",
                "后果的后果是什么？",
                "有没有意料之外的副作用？",
                "长期和短期有什么冲突？",
                "如果所有人都这样做，会怎样？"
            ],
            "when_to_use": [
                "决策评估",
                "长期规划",
                "风险分析",
                "政策制定"
            ]
        }


class MethodSelector:
    """智能思考方法选择器"""

    # 问题类型到方法的映射
    PROBLEM_TYPE_MAPPING = {
        "分析": {
            "primary": ["systems_thinking", "critical_thinking"],
            "secondary": ["second_order_thinking", "structured_thinking"]
        },
        "决策": {
            "primary": ["first_principles", "second_order_thinking"],
            "secondary": ["critical_thinking", "structured_thinking"]
        },
        "创新": {
            "primary": ["first_principles", "design_thinking", "reverse_thinking"],
            "secondary": ["analogical_thinking"]
        },
        "问题解决": {
            "primary": ["systems_thinking", "reverse_thinking"],
            "secondary": ["first_principles", "design_thinking"]
        },
        "理解解释": {
            "primary": ["analogical_thinking", "structured_thinking"],
            "secondary": ["critical_thinking"]
        }
    }

    # 关键词到问题类型的映射
    KEYWORD_MAPPING = {
        # 分析类
        "分析": "分析", "为什么": "分析", "原因": "分析", "怎么看": "分析",
        "理解": "分析", "解释": "分析", "背后": "分析",

        # 决策类
        "应该": "决策", "如何选择": "决策", "哪个": "决策", "决策": "决策",
        "建议": "决策", "最佳": "决策", "优化": "决策",

        # 创新类
        "创新": "创新", "设计": "创新", "创造": "创新", "突破": "创新",
        "重新": "创新", "从零": "创新",

        # 问题解决类
        "解决": "问题解决", "问题": "问题解决", "困难": "问题解决",
        "挑战": "问题解决", "障碍": "问题解决",

        # 洞察类
        "洞察": "分析", "发现": "分析", "深层": "分析",
    }

    @classmethod
    def detect_problem_type(cls, user_input: str) -> str:
        """
        检测问题类型

        Args:
            user_input: 用户的输入

        Returns:
            问题类型（分析/决策/创新/问题解决）
        """
        for keyword, problem_type in cls.KEYWORD_MAPPING.items():
            if keyword in user_input:
                return problem_type

        # 默认为分析类
        return "分析"

    @classmethod
    def select_methods(cls, user_input: str, depth: str = "standard") -> List[str]:
        """
        选择合适的思考方法

        Args:
            user_input: 用户的输入
            depth: 深度（simple/standard/deep）

        Returns:
            应该使用的方法列表
        """
        problem_type = cls.detect_problem_type(user_input)

        if problem_type in cls.PROBLEM_TYPE_MAPPING:
            methods = cls.PROBLEM_TYPE_MAPPING[problem_type]["primary"]

            # 根据深度决定方法数量
            if depth == "simple":
                return methods[:1]
            elif depth == "deep":
                # 添加次要方法
                methods.extend(cls.PROBLEM_TYPE_MAPPING[problem_type]["secondary"])
                return methods[:4]
            else:  # standard
                return methods[:2]

        # 默认返回系统思维和批判性思维
        return ["systems_thinking", "critical_thinking"]


class InsightGenerator:
    """洞察生成辅助工具"""

    @staticmethod
    def check_insight_quality(insight: str) -> Tuple[bool, str]:
        """
        检查洞察质量

        Args:
            insight: 洞察内容

        Returns:
            (是否是洞察, 反馈)
        """
        # 不是洞察的特征
        if len(insight) < 20:
            return False, "太短，需要展开说明"

        if "重复" in insight or "概括" in insight:
            return False, "这是信息重复，不是洞察"

        if "显然" in insight or "众所周知" in insight:
            return False, "这是显而易见的，不是洞察"

        # 是洞察的特征
        insight_indicators = [
            "被忽视", "未被发现", "隐性", "深层",
            "根本原因", "关键", "本质",
            "反直觉", "意料之外",
            "结构", "系统", "反馈"
        ]

        if any(indicator in insight for indicator in insight_indicators):
            return True, "这是有效的洞察"

        # 默认需要更多信息
        return False, "需要更多证据和深度"

    @staticmethod
    def insight_template(discovery: str, evidence: str, significance: str) -> str:
        """
        生成标准格式的洞察

        Args:
            discovery: 发现内容
            evidence: 支撑证据
            significance: 重要性和意义

        Returns:
            格式化的洞察文本
        """
        return f"""
### 洞察
**发现**：{discovery}
**证据**：{evidence}
**意义**：{significance}
"""


def main():
    """示例：如何使用这些工具"""

    # 示例1：选择思考方法
    user_input = "为什么我们的用户留存率在下降？"
    methods = MethodSelector.select_methods(user_input)
    print(f"问题：{user_input}")
    print(f"推荐方法：{methods}")
    print()

    # 示例2：获取思考框架
    tm = ThinkingMethodologies()
    framework = tm.systems_thinking(user_input)
    print(f"方法：{framework['method']}")
    print(f"关键提问：{framework['key_questions']}")
    print()

    # 示例3：检查洞察质量
    insight = "营销-产品错配是核心问题，营销承诺的功能产品没有实现"
    is_insight, feedback = InsightGenerator.check_insight_quality(insight)
    print(f"洞察检查：{is_insight}")
    print(f"反馈：{feedback}")


if __name__ == "__main__":
    main()
