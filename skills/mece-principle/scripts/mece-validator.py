#!/usr/bin/env python3
"""
MECE Validator
Validates whether categories are Mutually Exclusive and Collectively Exhaustive.
"""

from typing import List, Set, Tuple
import re

class MECEValidator:
    def __init__(self):
        self.items = []
        self.categories = {}

    def parse_input(self, text: str) -> List[str]:
        """Parse input text into a list of items."""
        # Split by newlines or commas
        items = re.split(r'[\n,;]', text)
        items = [item.strip() for item in items if item.strip()]
        return items

    def check_mutually_exclusive(self, categories: Dict[str, List[str]]) -> Tuple[bool, List[str]]:
        """Check if categories are mutually exclusive (no overlap)."""
        issues = []

        # Convert all items to lowercase for comparison
        category_items = {}
        for cat, items in categories.items():
            category_items[cat] = [item.lower().strip() for item in items]

        # Check for overlaps between each pair of categories
        cat_names = list(category_items.keys())
        for i in range(len(cat_names)):
            for j in range(i + 1, len(cat_names)):
                cat1, cat2 = cat_names[i], cat_names[j]

                # Find intersection
                overlap = set(category_items[cat1]) & set(category_items[cat2])

                if overlap:
                    issues.append(
                        f"Overlap between '{cat1}' and '{cat2}': {', '.join(overlap)}"
                    )

        return len(issues) == 0, issues

    def check_collectively_exhaustive(self, categories: Dict[str, List[str]], universe: List[str]) -> Tuple[bool, List[str]]:
        """Check if categories cover the entire universe."""
        issues = []

        # Flatten all category items
        all_categorized = set()
        for items in categories.values():
            all_categorized.update([item.lower().strip() for item in items])

        # Find items not in any category
        uncategorized = set([item.lower().strip() for item in universe]) - all_categorized

        if uncategorized:
            issues.append(f"Items not covered by any category: {', '.join(uncategorized)}")

        return len(issues) == 0, issues

    def validate(self, categories: Dict[str, List[str]], universe: List[str] = None):
        """Run full MECE validation."""
        print("\n" + "="*60)
        print(" MECE VALIDATION")
        print("="*60)

        # Check Mutually Exclusive
        print("\n🔍 CHECKING: Mutually Exclusive")
        print("─"*60)

        me_valid, me_issues = self.check_mutually_exclusive(categories)

        if me_valid:
            print("✅ PASS: Categories are mutually exclusive")
            print("   No overlap detected between categories")
        else:
            print("❌ FAIL: Categories are NOT mutually exclusive")
            print("\nIssues found:")
            for issue in me_issues:
                print(f"  • {issue}")

        # Check Collectively Exhaustive
        print("\n🔍 CHECKING: Collectively Exhaustive")
        print("─"*60)

        if universe:
            ce_valid, ce_issues = self.check_collectively_exhaustive(categories, universe)

            if ce_valid:
                print("✅ PASS: Categories are collectively exhaustive")
                print("   All items are covered")
            else:
                print("❌ FAIL: Categories are NOT collectively exhaustive")
                print("\nIssues found:")
                for issue in ce_issues:
                    print(f"  • {issue}")
        else:
            print("⏭️  SKIP: No universe provided for exhaustive check")
            print("   Provide a complete list of items to check coverage")

        # Summary
        print("\n" + "="*60)
        print(" SUMMARY")
        print("="*60)

        if me_valid and (not universe or ce_valid):
            print("✅ MECE VALIDATION PASSED")
            print("\nYour categories are MECE!")
        else:
            print("❌ MECE VALIDATION FAILED")
            print("\nRecommendations:")

            if not me_valid:
                print("  • Redefine category boundaries to eliminate overlap")
                print("  • Be more specific about what belongs in each category")
                print("  • Consider creating subcategories for overlapping items")

            if universe and not ce_valid:
                print("  • Create new categories for uncovered items")
                print("  • Ensure all items have a clear category")

    def interactive_mode(self):
        """Run interactive MECE validation."""
        print("\n" + "="*60)
        print(" MECE VALIDATOR")
        print("="*60)

        print("\nEnter your categories (format: Category Name: item1, item2, ...)")
        print("Type 'done' when finished with categories")
        print("-"*60)

        categories = {}
        universe = []

        while True:
            line = input("\nCategory (or 'done'): ").strip()

            if line.lower() == 'done':
                break

            if ':' in line:
                cat_name, items_str = line.split(':', 1)
                cat_name = cat_name.strip()
                items = self.parse_input(items_str)

                if cat_name and items:
                    categories[cat_name] = items
                    universe.extend(items)
                    print(f"  Added '{cat_name}' with {len(items)} items")
            else:
                print("  Format: Category Name: item1, item2, item3")

        if not categories:
            print("\nNo categories provided. Exiting.")
            return

        # Ask about universe
        print("\nDo you want to check if categories cover a specific universe?")
        print("(If no, will check only the items you've entered)")
        check_universe = input("Check coverage? (y/n): ").strip().lower()

        if check_universe == 'y':
            print("\nEnter all items that should be covered (one per line, 'done' to finish):")
            universe = []
            while True:
                item = input("> ").strip()
                if item.lower() == 'done':
                    break
                if item:
                    universe.append(item)

        # Run validation
        self.validate(categories, universe if check_universe == 'y' else None)

def main():
    validator = MECEValidator()
    validator.interactive_mode()

if __name__ == "__main__":
    main()
