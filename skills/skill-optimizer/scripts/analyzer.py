#!/usr/bin/env python3
"""
Skill Optimizer Scripts

Tools for analyzing and improving skill definitions.
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Any


class SkillAnalyzer:
    """Analyze OpenClaw skills for quality and completeness."""

    QUALITY_CRITERIA = {
        "positioning": {
            "weight": 25,
            "checks": [
                "Has clear, specific description",
                "Description uses third person",
                "Description includes trigger phrases",
                "Name matches function",
                "Clear category/tags"
            ]
        },
        "content": {
            "weight": 25,
            "checks": [
                "Body content > 1000 words",
                "Has usage examples",
                "Has instructions",
                "Has references/resources",
                "Has output specification"
            ]
        },
        "triggers": {
            "weight": 20,
            "checks": [
                "Clear trigger phrases",
                "Multiple trigger variations",
                "Natural language triggers",
                "Covers use cases"
            ]
        },
        "structure": {
            "weight": 15,
            "checks": [
                "Valid YAML frontmatter",
                "Required fields present",
                "Logical section order",
                "Consistent formatting"
            ]
        },
        "value": {
            "weight": 15,
            "checks": [
                "Solves stated problem",
                "Output is actionable",
                "Content is accurate",
                "Demonstrable expertise"
            ]
        }
    }

    @staticmethod
    def analyze_skill(skill_path: str) -> Dict[str, Any]:
        """
        Analyze a skill for quality and completeness.

        Args:
            skill_path: Path to skill directory or SKILL.md file

        Returns:
            Analysis results with scores and recommendations
        """
        # Load skill file
        skill_file = Path(skill_path) / "SKILL.md" if Path(skill_path).is_dir() else skill_path

        if not skill_file.exists():
            return {"error": f"Skill file not found: {skill_file}"}

        with open(skill_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse frontmatter
        frontmatter, body = SkillAnalyzer._parse_frontmatter(content)

        # Analyze each dimension
        analysis = {
            "skill_name": frontmatter.get("name", "unknown"),
            "file_path": str(skill_file),
            "dimensions": {},
            "overall_score": 0,
            "recommendations": []
        }

        for dimension, criteria in SkillAnalyzer.QUALITY_CRITERIA.items():
            dimension_score = SkillAnalyzer._analyze_dimension(dimension, frontmatter, body)
            analysis["dimensions"][dimension] = dimension_score

        # Calculate overall score
        total_score = sum(
            d["score"] * SkillAnalyzer.QUALITY_CRITERIA[dim]["weight"] / 100
            for dim, d in analysis["dimensions"].items()
        )
        analysis["overall_score"] = round(total_score, 1)

        # Generate recommendations
        analysis["recommendations"] = SkillAnalyzer._generate_recommendations(analysis["dimensions"])

        return analysis

    @staticmethod
    def _parse_frontmatter(content: str) -> tuple:
        """Parse YAML frontmatter and body."""
        match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
        if match:
            import yaml
            try:
                frontmatter = yaml.safe_load(match.group(1))
                body = match.group(2)
                return frontmatter, body
            except:
                return {}, content
        return {}, content

    @staticmethod
    def _analyze_dimension(dimension: str, frontmatter: dict, body: str) -> Dict[str, Any]:
        """Analyze a specific quality dimension."""
        checks = SkillAnalyzer.QUALITY_CRITERIA[dimension]["checks"]
        passed = []
        failed = []

        if dimension == "positioning":
            if frontmatter.get("description"):
                desc = frontmatter["description"]
                if len(desc) > 50:
                    passed.append("Has clear, specific description")
                else:
                    failed.append("Description too brief")

                if desc.lower().startswith("this skill"):
                    passed.append("Description uses third person")
                else:
                    failed.append("Description doesn't use third person")

                if any(trigger in desc.lower() for trigger in ["when the user", "asks to", "needs"]):
                    passed.append("Description includes trigger phrases")
                else:
                    failed.append("Missing trigger phrases in description")
            else:
                failed.append("No description found")

            if frontmatter.get("name"):
                passed.append("Has name")
            else:
                failed.append("Missing name")

        elif dimension == "content":
            word_count = len(body.split())
            if word_count > 1000:
                passed.append(f"Body content > 1000 words ({word_count} words)")
            else:
                failed.append(f"Body content too short ({word_count} words)")

            if "## Usage" in body or "## Instructions" in body:
                passed.append("Has usage instructions")
            else:
                failed.append("Missing usage instructions")

            if "## Additional Resources" in body or "## Resources" in body:
                passed.append("Has resources section")
            else:
                failed.append("Missing resources section")

        elif dimension == "triggers":
            desc = frontmatter.get("description", "")
            if '"' in desc or "'" in desc:
                passed.append("Has specific trigger phrases")
            else:
                failed.append("No specific trigger phrases found")

        # Calculate score
        total_checks = len(passed) + len(failed)
        score = round((len(passed) / total_checks * 100) if total_checks > 0 else 0)

        return {
            "score": score,
            "passed": passed,
            "failed": failed,
            "weight": SkillAnalyzer.QUALITY_CRITERIA[dimension]["weight"]
        }

    @staticmethod
    def _generate_recommendations(dimensions: dict) -> List[str]:
        """Generate improvement recommendations."""
        recommendations = []

        for dim_name, dim_data in dimensions.items():
            for failure in dim_data["failed"]:
                recommendations.append({
                    "dimension": dim_name,
                    "issue": failure,
                    "priority": "high" if dim_data["score"] < 50 else "medium"
                })

        return sorted(recommendations, key=lambda x: x["priority"], reverse=True)

    @staticmethod
    def compare_skills(skill_paths: List[str]) -> Dict[str, Any]:
        """Compare multiple skills."""
        analyses = []

        for path in skill_paths:
            analysis = SkillAnalyzer.analyze_skill(path)
            if "error" not in analysis:
                analyses.append(analysis)

        # Sort by score
        analyses.sort(key=lambda x: x["overall_score"], reverse=True)

        return {
            "skills": analyses,
            "best": analyses[0] if analyses else None,
            "worst": analyses[-1] if analyses else None,
            "average": sum(a["overall_score"] for a in analyses) / len(analyses) if analyses else 0
        }


def analyze_command(skill_path: str):
    """Analyze a single skill."""
    analysis = SkillAnalyzer.analyze_skill(skill_path)

    if "error" in analysis:
        print(f"Error: {analysis['error']}")
        return

    print(f"\n{'='*60}")
    print(f"SKILL ANALYSIS: {analysis['skill_name']}")
    print(f"{'='*60}")
    print(f"\nOverall Score: {analysis['overall_score']}/100")
    print(f"File: {analysis['file_path']}")

    print("\nDimension Scores:")
    for dim, data in analysis["dimensions"].items():
        status = "✓" if data["score"] >= 70 else "✗"
        print(f"  {status} {dim.title()}: {data['score']}/100")

        if data["failed"]:
            for failure in data["failed"]:
                print(f"      - {failure}")

    print("\nRecommendations:")
    for rec in analysis["recommendations"][:5]:
        print(f"  [{rec['priority'].upper()}] {rec['issue']}")


def main():
    parser = argparse.ArgumentParser(description='Skill Optimizer Tools')
    parser.add_argument('skill', help='Path to skill directory or SKILL.md')
    parser.add_argument('--compare', nargs='+', help='Compare multiple skills')

    args = parser.parse_args()

    if args.compare:
        comparison = SkillAnalyzer.compare_skills(args.compare)
        print("\nSKILL COMPARISON")
        for skill in comparison["skills"]:
            print(f"  {skill['skill_name']}: {skill['overall_score']}/100")
    else:
        analyze_command(args.skill)


if __name__ == "__main__":
    main()
