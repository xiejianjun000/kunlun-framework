#!/usr/bin/env python3
"""
SWOT Analysis Generator
Interactive tool for creating SWOT analyses.
"""

from datetime import datetime
from typing import List, Dict

class SWOTGenerator:
    def __init__(self):
        self.prompts = {
            "strengths": [
                "What advantages does your organization have?",
                "What do you do better than anyone else?",
                "What unique resources can you access?",
                "What do others see as your strengths?"
            ],
            "weaknesses": [
                "What could you improve?",
                "What do you do poorly?",
                "What should you avoid?",
                "What are your resource limitations?"
            ],
            "opportunities": [
                "What opportunities are open to you?",
                "What trends could you take advantage of?",
                "What changes in the market favor you?",
                "What competitors are vulnerable?"
            ],
            "threats": [
                "What threats face your organization?",
                "What are competitors doing?",
                "What changing market conditions hurt you?",
                "What obstacles do you face?"
            ]
        }

        self.swot_data: Dict[str, List[str]] = {
            "strengths": [],
            "weaknesses": [],
            "opportunities": [],
            "threats": []
        }

    def collect_input(self, category: str):
        """Collect items for a SWOT category."""
        print(f"\n{'='*60}")
        print(f" {category.upper()}")
        print('='*60)

        print("\nGuiding Questions:")
        for i, prompt in enumerate(self.prompts[category.lower()], 1):
            print(f"  {i}. {prompt}")

        print("\nEnter items (one per line). Type 'done' when finished:")
        print("-"*60)

        while True:
            item = input(f"{category[0].upper()}: ")
            if item.lower() == 'done' or item == '':
                break
            if item:
                self.swot_data[category.lower()].append(item)

    def prioritize_items(self, category: str):
        """Help prioritize items within a category."""
        if not self.swot_data[category.lower()]:
            return

        print(f"\n{'─'*60}")
        print(f" PRIORITIZE {category.upper()}")
        print('─'*60)

        print("\nRank the top 3 most important items:")
        print("Enter the numbers of your top 3 (e.g., 1,3,5)")

        for i, item in enumerate(self.swot_data[category.lower()], 1):
            print(f"  {i}. {item[:60]}")

        try:
            top_items = input("\nTop 3: ").strip()
            if top_items:
                indices = [int(x.strip()) - 1 for x in top_items.split(',')]
                # Move prioritized items to the front
                prioritized = [self.swot_data[category.lower()][i] for i in indices if i < len(self.swot_data[category.lower()])]
                remaining = [item for i, item in enumerate(self.swot_data[category.lower()]) if i not in indices]
                self.swot_data[category.lower()] = prioritized + remaining
        except:
            pass  # Keep original order if input is invalid

    def generate_strategies(self):
        """Generate strategic options based on SWOT."""
        print(f"\n{'='*60}")
        print(" STRATEGY GENERATION (TOWS Matrix)")
        print('='*60)

        strategies = {
            "SO": "Use Strengths to capitalize on Opportunities",
            "WO": "Overcome Weaknesses to pursue Opportunities",
            "ST": "Use Strengths to reduce Threats",
            "WT": "Minimize Weaknesses to avoid Threats"
        }

        for key, description in strategies.items():
            print(f"\n{key} Strategies: {description}")

            if key[0] == 'S':
                items = self.swot_data['strengths'][:3]
            elif key[0] == 'W':
                items = self.swot_data['weaknesses'][:3]
            else:
                items = []

            if key[1] == 'O':
                items2 = self.swot_data['opportunities'][:3]
            else:
                items2 = self.swot_data['threats'][:3]

            for i, item in enumerate(items):
                for j, item2 in enumerate(items2):
                    print(f"  • Combine: '{item[:40]}...' with '{item2[:40]}...'")

    def run_analysis(self):
        """Run the complete SWOT analysis."""
        print("\n" + "="*60)
        print(" SWOT ANALYSIS GENERATOR")
        print("="*60)

        print("\nWhat is the subject of this SWOT analysis?")
        self.subject = input("\nSubject: ")

        # Collect data for each quadrant
        categories = ["strengths", "weaknesses", "opportunities", "threats"]
        for category in categories:
            self.collect_input(category)
            self.prioritize_items(category)

        # Generate strategic options
        self.generate_strategies()

        # Display summary
        self.display_summary()

    def display_summary(self):
        """Display a formatted summary."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        print("\n" + "="*60)
        print(" SWOT ANALYSIS SUMMARY")
        print("="*60)
        print(f"Subject: {self.subject}")
        print(f"Generated: {timestamp}")

        labels = {
            "strengths": ("💪 STRENGTHS", "Internal, Positive"),
            "weaknesses": ("⚠️  WEAKNESSES", "Internal, Negative"),
            "opportunities": ("🚀 OPPORTUNITIES", "External, Positive"),
            "threats": ("⚡ THREATS", "External, Negative")
        }

        for category, (label, subtitle) in labels.items():
            print(f"\n{label}")
            print(f"({subtitle})")
            print('─'*60)

            if self.swot_data[category]:
                for i, item in enumerate(self.swot_data[category][:5], 1):
                    print(f"{i}. {item}")
                if len(self.swot_data[category]) > 5:
                    print(f"... and {len(self.swot_data[category]) - 5} more")
            else:
                print("(None identified)")

        print("\n" + "="*60)
        print(" NEXT STEPS")
        print("="*60)
        print("1. Review and refine your SWOT items")
        print("2. Validate assumptions with data")
        print("3. Develop specific strategies using TOWS matrix")
        print("4. Create action plans for each strategy")
        print("5. Set review dates to track progress")

def main():
    analyzer = SWOTGenerator()
    analyzer.run_analysis()

if __name__ == "__main__":
    main()
