#!/usr/bin/env python3
"""
Six Thinking Hats Session Facilitator
Automates hat sequence timing and provides prompts for each thinking mode.
"""

import time
import sys
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Hat:
    name: str
    color: str
    duration: int  # in seconds
    prompts: List[str]

# Predefined hat configurations
HATS = {
    "blue": Hat(
        name="Blue Hat (Process & Control)",
        color="🔵",
        duration=180,
        prompts=[
            "What is our objective?",
            "Which hat sequence should we use?",
            "How much time for each hat?",
            "What are the ground rules?"
        ]
    ),
    "white": Hat(
        name="White Hat (Facts & Information)",
        color="⚪",
        duration=300,
        prompts=[
            "What facts do we know?",
            "What information do we need?",
            "What data is missing?",
            "What are the numbers?"
        ]
    ),
    "red": Hat(
        name="Red Hat (Emotions & Feelings)",
        color="🔴",
        duration=120,
        prompts=[
            "How do I feel about this?",
            "What's my gut reaction?",
            "What emotions come up?",
            "What does my intuition say?"
        ]
    ),
    "black": Hat(
        name="Black Hat (Caution & Risk)",
        color="⚫",
        duration=300,
        prompts=[
            "What could go wrong?",
            "What are the risks?",
            "Why might this not work?",
            "What are the potential problems?"
        ]
    ),
    "yellow": Hat(
        name="Yellow Hat (Benefits & Value)",
        color="🟡",
        duration=300,
        prompts=[
            "What are the benefits?",
            "What's the value?",
            "Why will this work?",
            "What are the positive aspects?"
        ]
    ),
    "green": Hat(
        name="Green Hat (Creativity & Alternatives)",
        color="🟢",
        duration=300,
        prompts=[
            "What are the alternatives?",
            "What if...?",
            "How could we do this differently?",
            "What creative solutions exist?"
        ]
    )
}

# Predefined sequences
SEQUENCES = {
    "brainstorming": ["blue", "white", "green", "yellow", "black", "green", "blue"],
    "decision": ["blue", "white", "green", "yellow", "black", "red", "blue"],
    "problem": ["blue", "red", "white", "green", "black", "green", "blue"],
    "evaluation": ["white", "yellow", "black", "red", "blue"],
    "feedback": ["white", "yellow", "black", "red", "blue"]
}

class SessionFacilitator:
    def __init__(self):
        self.session_notes = {}

    def print_header(self, text: str):
        print("\n" + "="*60)
        print(f" {text}")
        print("="*60 + "\n")

    def print_hat_intro(self, hat: Hat):
        print(f"\n{hat.color} {hat.name}")
        print(f"Duration: {hat.duration // 60} minutes")
        print("\nGuiding Questions:")
        for i, prompt in enumerate(hat.prompts, 1):
            print(f"  {i}. {prompt}")
        print("\n⏳ Timer starting...")

    def run_hat_session(self, hat_key: str) -> dict:
        hat = HATS[hat_key]
        self.print_hat_intro(hat)

        notes = []
        start_time = time.time()

        try:
            while time.time() - start_time < hat.duration:
                remaining = int(hat.duration - (time.time() - start_time))
                mins, secs = divmod(remaining, 60)

                print(f"\r⏱️  Time remaining: {mins:02d}:{secs:02d} | Type notes (or 'done' to finish early): ", end="")

                line = input().strip()
                if line.lower() == 'done':
                    break
                if line:
                    notes.append(line)

        except KeyboardInterrupt:
            print("\n\n⏸️  Session interrupted.")

        return {
            "hat": hat_key,
            "notes": notes,
            "duration": time.time() - start_time
        }

    def run_sequence(self, sequence: List[str]):
        self.print_header("SIX THINKING HATS SESSION")

        print(f"Sequence: {' → '.join([HATS[s].color + ' ' + s.capitalize() for s in sequence])}")
        print("\n📋 Session Guidelines:")
        print("  • Wear only one hat at a time")
        print("  • All participants think in the same direction")
        print("  • Respect the rules of each hat")
        print("  • Document thoughts for each hat separately")
        print("  • Type 'done' to move to next hat early")

        input("\nPress Enter to start...")

        self.session_notes = {"sequence": sequence, "hats": {}}

        for hat_key in sequence:
            result = self.run_hat_session(hat_key)
            self.session_notes["hats"][hat_key] = result

        self.print_summary()

    def print_summary(self):
        self.print_header("SESSION SUMMARY")

        print("\n📝 Notes by Hat:")
        for hat_key, result in self.session_notes["hats"].items():
            hat = HATS[hat_key]
            print(f"\n{hat.color} {hat.name}:")
            if result["notes"]:
                for note in result["notes"]:
                    print(f"  • {note}")
            else:
                print("  (No notes captured)")

def main():
    facilitator = SessionFacilitator()

    print("🎩 Six Thinking Hats Session Facilitator")
    print("\nChoose a sequence:")

    for i, (name, sequence) in enumerate(SEQUENCES.items(), 1):
        print(f"  {i}. {name.capitalize()}: {' → '.join(sequence)}")
    print("  6. Custom sequence")

    choice = input("\nEnter choice (1-6): ").strip()

    if choice == "6":
        print("\nEnter hats in order (blue, white, red, black, yellow, green):")
        print("Separate with spaces, e.g., 'blue white green yellow black green blue'")
        sequence_input = input("> ").strip().lower().split()
        sequence = [s for s in sequence_input if s in HATS]
    else:
        sequence = list(SEQUENCES.values())[int(choice) - 1]

    if sequence:
        facilitator.run_sequence(sequence)
    else:
        print("Invalid sequence.")

if __name__ == "__main__":
    main()
