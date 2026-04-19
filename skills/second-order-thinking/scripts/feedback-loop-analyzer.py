#!/usr/bin/env python3
"""
Feedback Loop Analyzer for Second Order Thinking
Identifies amplifying and dampening feedback loops.
"""

class FeedbackLoopAnalyzer:
    def __init__(self):
        self.loops = []

    def analyze_sequence(self, sequence):
        """Analyze a sequence of events for feedback loops."""
        print("\n分析序列中的反馈循环...")
        print("="*50)

        print(f"\n序列: {' → '.join(sequence)}")

        # Check for amplifying patterns
        amplifying = []
        for i in range(len(sequence) - 1):
            print(f"\n{sequence[i]} → {sequence[i+1]}")
            print("这是否会放大？(y/n)")
            if input().strip().lower() == 'y':
                amplifying.append((sequence[i], sequence[i+1]))

        # Check for dampening patterns
        dampening = []
        for i in range(len(sequence) - 1):
            print(f"\n{sequence[i]} → {sequence[i+1]}")
            print("这是否会抑制？(y/n)")
            if input().strip().lower() == 'y':
                dampening.append((sequence[i], sequence[i+1]))

        print("\n" + "="*50)
        print("分析结果：")
        print(f"放大循环：{len(amplifying)}个")
        print(f"抑制循环：{len(dampening)}个")

        if amplifying:
            print("\n放大循环：")
            for a, b in amplifying:
                print(f"  • {a} → {b} (放大)")

        if dampening:
            print("\n抑制循环：")
            for a, b in dampening:
                print(f"  • {a} → {b} (抑制)")

def main():
    analyzer = FeedbackLoopAnalyzer()

    print("\n🔄 反馈循环分析器")
    print("\n输入事件序列（用→连接）：")
    sequence_str = input("> ")
    sequence = [s.strip() for s in sequence_str.split("→") if s.strip()]

    if len(sequence) >= 2:
        analyzer.analyze_sequence(sequence)
    else:
        print("至少需要2个事件")

if __name__ == "__main__":
    main()
