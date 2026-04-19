#!/usr/bin/env python3
"""
MECE Issue Tree Builder
Helps build MECE issue trees for problem decomposition.
"""

class IssueTreeBuilder:
    def __init__(self):
        self.tree = {}
        self.depth = 0

    def add_branch(self, parent, branches):
        """Add branches to a parent node."""
        if parent not in self.tree:
            self.tree[parent] = []

        for branch in branches:
            if isinstance(branch, str):
                self.tree[parent].append({"name": branch, "subbranches": []})
            elif isinstance(branch, dict):
                self.tree[parent].append(branch)

    def validate_mece(self, items):
        """Check if items are MECE."""
        print("\nMECE验证:")
        print("-"*50)

        # 检查重叠
        for i, item1 in enumerate(items):
            for item2 in items[i+1:]:
                print(f"\n'{item1}' 和 '{item2}' 有重叠吗？")
                overlap = input("(y/n): ").strip().lower()
                if overlap == 'y':
                    print("⚠️  发现重叠！需要调整分类边界")

        # 检查完整性
        print("\n是否有重要的项目被遗漏？")
        missing = input("> ").strip()
        if missing:
            print(f"⚠️  遗漏：{missing}")

    def print_tree(self, node=None, indent=0):
        """Print the tree structure."""
        if node is None:
            node = {"name": "Main Question", "subbranches": self.tree.get("Main Question", [])}

        print("  " * indent + "├─ " + node["name"])

        if "subbranches" in node:
            for branch in node["subbranches"]:
                if isinstance(branch, dict):
                    self.print_tree(branch, indent + 1)
                else:
                    print("  " * (indent + 1) + "├─ " + str(branch))

    def build_tree_interactive(self):
        """Interactive tree building."""
        print("\n🌳 MECE问题树构建器")
        print("="*50)

        print("\n输入主要问题：")
        main_question = input("> ")
        self.tree["Main Question"] = []

        current_level = self.tree["Main Question"]

        while True:
            print(f"\n当前层级：{main_question}")
            print(f"已有分支：{len(current_level)}个")

            print("\n选项：")
            print("  1. 添加分支")
            print("  2. 编辑现有分支")
            print("  3. 验证MECE")
            print("  4. 查看树结构")
            print("  5. 完成")

            choice = input("\n选择 (1-5): ").strip()

            if choice == "1":
                print("\n输入新分支（用逗号分隔多个）：")
                branches = [b.strip() for b in input("> ").split(",")]
                for branch in branches:
                    current_level.append({"name": branch, "subbranches": []})

            elif choice == "2":
                for i, branch in enumerate(current_level):
                    print(f"{i+1}. {branch['name']}")

                index = input("\n编辑哪个分支？(输入编号): ").strip()
                if index.isdigit() and 0 < int(index) <= len(current_level):
                    branch = current_level[int(index)-1]
                    print(f"\n当前分支：{branch['name']}")
                    print("添加子分支（用逗号分隔）：")
                    subbranches = [s.strip() for s in input("> ").split(",")]
                    for subbranch in subbranches:
                        branch["subbranches"].append({"name": subbranch, "subbranches": []})

            elif choice == "3":
                items = [b["name"] for b in current_level]
                self.validate_mece(items)

            elif choice == "4":
                self.print_tree()

            elif choice == "5":
                break

def main():
    builder = IssueTreeBuilder()
    builder.build_tree_interactive()
    builder.print_tree()

if __name__ == "__main__":
    main()
