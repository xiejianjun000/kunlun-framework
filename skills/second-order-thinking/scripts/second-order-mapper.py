#!/usr/bin/env python3
"""
Second Order Thinking Mapper
Maps consequences across multiple orders of thinking.
"""

from typing import List, Dict
import json

class ConsequenceMapper:
    def __init__(self):
        self.consequences = []

    def add_consequence(self, order: int, description: str, type: str = "unknown"):
        """Add a consequence at a specific order."""
        self.consequences.append({
            "order": order,
            "description": description,
            "type": type  # positive, negative, or unknown
        })

    def analyze_decision(self, decision: str):
        """Analyze a decision through multiple orders."""
        print(f"\n{'='*60}")
        print(f" SECOND ORDER THINKING ANALYSIS")
        print(f"{'='*60}")
        print(f"\nDecision: {decision}")
        print(f"{'─'*60}\n")

        self.consequences = []

        # First Order
        print("📍 FIRST ORDER: Immediate Consequences")
        print("What happens immediately?")
        print("(Enter consequences one at a time, 'done' to continue)")

        while True:
            cons = input("> ").strip()
            if cons.lower() == 'done' or not cons:
                break

            # Determine type
            type_input = input("Is this (p)ositive, (n)egative, or (u)nknown? [p/n/u]: ").strip().lower()
            cons_type = {"p": "positive", "n": "negative"}.get(type_input, "unknown")

            self.add_consequence(1, cons, cons_type)

        # Second Order
        print(f"\n📍 SECOND ORDER: Consequences of Consequences")
        print("What happens as a result of the first-order consequences?")
        print("(For each first-order consequence, ask 'and then what?')")

        while True:
            cons = input("> ").strip()
            if cons.lower() == 'done' or not cons:
                break

            # Determine type
            type_input = input("Is this (p)ositive, (n)egative, or (u)nknown? [p/n/u]: ").strip().lower()
            cons_type = {"p": "positive", "n": "negative"}.get(type_input, "unknown")

            self.add_consequence(2, cons, cons_type)

        # Third Order (optional)
        continue_third = input(f"\nContinue to third order? (y/n): ").strip().lower()
        if continue_third == 'y':
            print(f"\n📍 THIRD ORDER: Long-term and Systemic Effects")
            print("What are the deeper ripple effects?")

            while True:
                cons = input("> ").strip()
                if cons.lower() == 'done' or not cons:
                    break

                # Determine type
                type_input = input("Is this (p)ositive, (n)egative, or (u)nknown? [p/n/u]: ").strip().lower()
                cons_type = {"p": "positive", "n": "negative"}.get(type_input, "unknown")

                self.add_consequence(3, cons, cons_type)

        # Display analysis
        self.display_analysis()

    def display_analysis(self):
        """Display the complete consequence analysis."""
        print(f"\n{'='*60}")
        print(" CONSEQUENCE MAP")
        print(f"{'='*60}")

        # Group by order
        by_order = {}
        for cons in self.consequences:
            order = cons["order"]
            if order not in by_order:
                by_order[order] = []
            by_order[order].append(cons)

        # Display by order
        for order in sorted(by_order.keys()):
            order_names = {1: "FIRST", 2: "SECOND", 3: "THIRD"}
            print(f"\n{order_names.get(order, f'{order}TH')} ORDER:")
            print('─'*60)

            for cons in by_order[order]:
                emoji = {"positive": "✅", "negative": "❌", "unknown": "❓"}.get(cons["type"], "•")
                print(f"{emoji} {cons['description']}")

        # Summary
        print(f"\n{'='*60}")
        print(" SUMMARY")
        print(f"{'='*60}")

        # Count by type
        positive_count = sum(1 for c in self.consequences if c["type"] == "positive")
        negative_count = sum(1 for c in self.consequences if c["type"] == "negative")
        unknown_count = sum(1 for c in self.consequences if c["type"] == "unknown")

        print(f"\nTotal Consequences: {len(self.consequences)}")
        print(f"  ✅ Positive: {positive_count}")
        print(f"  ❌ Negative: {negative_count}")
        print(f"  ❓ Unknown: {unknown_count}")

        # Recommendation
        print(f"\n{'='*60}")
        print(" RECOMMENDATION")
        print(f"{'='*60}")

        if positive_count > negative_count * 2:
            print("\n✅ PROCEED: Positive consequences significantly outweigh negatives")
            print("\n   Mitigation strategies for negative consequences:")
            neg_cons = [c for c in self.consequences if c["type"] == "negative"]
            for cons in neg_cons[:3]:
                print(f"   • Address: {cons['description'][:50]}...")

        elif negative_count > positive_count * 2:
            print("\n❌ RECONSIDER: Negative consequences significantly outweigh positives")
            print("\n   Questions to ask:")
            print("   • Are there ways to mitigate these negative effects?")
            print("   • What would make this decision worthwhile?")
            print("   • Are there alternative approaches?")

        else:
            print("\n⚖️  BALANCED: Positive and negative consequences are relatively equal")
            print("\n   Consider:")
            print("   • The magnitude of each consequence (not just count)")
            print("   • Your risk tolerance")
            print("   • Whether negative consequences are reversible")

        print("\nKey insight: Second- and third-order effects often determine")
        print("whether a decision is truly good or bad in the long run.")

def main():
    mapper = ConsequenceMapper()

    print("\n🎯 Second Order Thinking Mapper")
    print("\nEnter the decision you want to analyze:")
    decision = input("> ").strip()

    if decision:
        mapper.analyze_decision(decision)
    else:
        print("No decision provided. Exiting.")

if __name__ == "__main__":
    main()
