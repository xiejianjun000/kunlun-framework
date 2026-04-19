#!/usr/bin/env python3
"""
TOWS Strategy Builder
Generates strategic options from SWOT analysis using TOWS matrix.
"""

class TOWSStrategyBuilder:
    def __init__(self):
        self.swot = {
            "strengths": [],
            "weaknesses": [],
            "opportunities": [],
            "threats": []
        }

    def collect_swot(self):
        """Collect SWOT items interactively."""
        print("\n📊 TOWS战略生成器")
        print("="*50)

        categories = [
            ("strengths", "优势 (Strengths)"),
            ("weaknesses", "劣势 (Weaknesses)"),
            ("opportunities", "机会 (Opportunities)"),
            ("threats", "威胁 (Threats)")
        ]

        for key, name in categories:
            print(f"\n{name}")
            print(f"输入项目（用逗号分隔，输入done跳过）:")

            items = []
            while True:
                item = input("> ").strip()
                if item.lower() == 'done' or item == '':
                    break
                if item:
                    items.append(item)

            self.swot[key] = items
            print(f"已添加 {len(items)} 个{name}")

    def generate_so_strategies(self):
        """Generate SO (Strengths-Opportunities) strategies."""
        print("\n" + "="*50)
        print("SO战略：利用优势抓住机会")
        print("="*50)

        strategies = []
        for strength in self.swot["strengths"]:
            for opportunity in self.swot["opportunities"]:
                strategy = f"利用'{strength}'抓住'{opportunity}'"
                strategies.append(strategy)
                print(f"\n• {strategy}")

        return strategies

    def generate_wo_strategies(self):
        """Generate WO (Weaknesses-Opportunities) strategies."""
        print("\n" + "="*50)
        print("WO战略：克服劣势抓住机会")
        print("="*50)

        strategies = []
        for weakness in self.swot["weaknesses"]:
            for opportunity in self.swot["opportunities"]:
                strategy = f"通过解决'{weakness}'抓住'{opportunity}'"
                strategies.append(strategy)
                print(f"\n• {strategy}")

        return strategies

    def generate_st_strategies(self):
        """Generate ST (Strengths-Threats) strategies."""
        print("\n" + "="*50)
        print("ST战略：利用优势应对威胁")
        print("="*50)

        strategies = []
        for strength in self.swot["strengths"]:
            for threat in self.swot["threats"]:
                strategy = f"利用'{strength}'防御'{threat}'"
                strategies.append(strategy)
                print(f"\n• {strategy}")

        return strategies

    def generate_wt_strategies(self):
        """Generate WT (Weaknesses-Threats) strategies."""
        print("\n" + "="*50)
        print("WT战略：减少劣势避免威胁")
        print("="*50)

        strategies = []
        for weakness in self.swot["weaknesses"]:
            for threat in self.swot["threats"]:
                strategy = f"通过解决'{weakness}'应对'{threat}'"
                strategies.append(strategy)
                print(f"\n• {strategy}")

        return strategies

    def generate_all_strategies(self):
        """Generate complete TOWS analysis."""
        self.collect_swot()

        print("\n\n" + "="*50)
        print("TOWS矩阵战略分析")
        print("="*50)

        so = self.generate_so_strategies()
        wo = self.generate_wo_strategies()
        st = self.generate_st_strategies()
        wt = self.generate_wt_strategies()

        print("\n\n" + "="*50)
        print("战略优先级建议")
        print("="*50)
        print("\n优先级1：SO战略（最可行）")
        print("优先级2：WO战略（需要投资）")
        print("优先级3：ST战略（防御性）")
        print("优先级4：WT战略（最小化损失）")

def main():
    builder = TOWSStrategyBuilder()
    builder.generate_all_strategies()

if __name__ == "__main__":
    main()
