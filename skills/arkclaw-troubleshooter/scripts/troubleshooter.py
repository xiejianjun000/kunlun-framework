#!/usr/bin/env python3
"""
ArkClaw Troubleshooter Scripts

Diagnostic and resolution tools for ArkClaw technical issues.
"""

import argparse
import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Dict, List, Any


class ArkClawDiagnostics:
    """Diagnostic tools for ArkClaw issues."""

    ISSUE_CATEGORIES = {
        "installation": [
            "Check Python version compatibility",
            "Verify dependencies are installed",
            "Check file permissions",
            "Verify installation directory"
        ],
        "configuration": [
            "Check environment variables",
            "Verify configuration files exist",
            "Validate configuration format",
            "Check path settings"
        ],
        "runtime": [
            "Check error logs",
            "Verify resources available",
            "Check for conflicts",
            "Test core functionality"
        ],
        "performance": [
            "Measure response times",
            "Check resource usage",
            "Identify bottlenecks",
            "Review configuration"
        ],
        "integration": [
            "Test API connections",
            "Verify compatibility",
            "Check version requirements",
            "Test data flow"
        ]
    }

    @staticmethod
    def diagnose_issue(error_message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Diagnose an issue based on error message and context.

        Args:
            error_message: The error or symptom
            context: Additional context about the issue

        Returns:
            Diagnosis with category, likely cause, and solutions
        """
        context = context or {}

        # Categorize the issue
        category = ArkClawDiagnostics._categorize_issue(error_message, context)

        # Identify likely causes
        causes = ArkClawDiagnostics._identify_causes(category, error_message)

        # Generate solutions
        solutions = ArkClawDiagnostics._generate_solutions(category, causes)

        return {
            "category": category,
            "error_message": error_message,
            "likely_causes": causes,
            "recommended_solutions": solutions,
            "diagnostic_steps": ArkClawDiagnostics.ISSUE_CATEGORIES.get(category, [])
        }

    @staticmethod
    def _categorize_issue(error_message: str, context: Dict[str, Any]) -> str:
        """Categorize the issue type."""
        error_lower = error_message.lower()

        # Installation issues
        if any(term in error_lower for term in ["install", "setup", "not found", "missing"]):
            return "installation"

        # Configuration issues
        if any(term in error_lower for term in ["config", "setting", "path", "environment"]):
            return "configuration"

        # Runtime issues
        if any(term in error_lower for term in ["error", "exception", "crash", "failed"]):
            return "runtime"

        # Performance issues
        if any(term in error_lower for term in ["slow", "timeout", "lag", "performance"]):
            return "performance"

        # Integration issues
        if any(term in error_lower for term in ["api", "connection", "integration", "compatibility"]):
            return "integration"

        return "runtime"  # Default

    @staticmethod
    def _identify_causes(category: str, error_message: str) -> List[str]:
        """Identify likely causes based on category and error."""
        causes = {
            "installation": [
                "Python version incompatible",
                "Dependencies not installed",
                "Insufficient permissions",
                "Corrupted installation"
            ],
            "configuration": [
                "Incorrect environment variable",
                "Missing configuration file",
                "Invalid configuration format",
                "Path not set correctly"
            ],
            "runtime": [
                "Unhandled exception",
                "Resource not available",
                "Logic error",
                "External dependency failure"
            ],
            "performance": [
                "Resource exhaustion",
                "Inefficient algorithm",
                "Configuration not optimized",
                "External service slow"
            ],
            "integration": [
                "API endpoint changed",
                "Authentication failed",
                "Version incompatibility",
                "Network issue"
            ]
        }

        return causes.get(category, ["Unknown cause"])

    @staticmethod
    def _generate_solutions(category: str, causes: List[str]) -> List[Dict[str, str]]:
        """Generate solutions for the identified causes."""
        solutions = {
            "installation": [
                {
                    "solution": "Verify Python version",
                    "command": "python --version",
                    "explanation": "Ensure Python 3.8+ is installed"
                },
                {
                    "solution": "Reinstall dependencies",
                    "command": "pip install -r requirements.txt",
                    "explanation": "Fresh install of all dependencies"
                }
            ],
            "configuration": [
                {
                    "solution": "Check environment variables",
                    "command": "env | grep ARKCLAW",
                    "explanation": "Verify required environment variables are set"
                },
                {
                    "solution": "Validate configuration file",
                    "command": "python -c \"import json; json.load(open('config.json'))\"",
                    "explanation": "Check configuration file is valid JSON"
                }
            ],
            "runtime": [
                {
                    "solution": "Check error logs",
                    "command": "tail -f logs/arkclaw.log",
                    "explanation": "Review recent error messages"
                },
                {
                    "solution": "Run in debug mode",
                    "command": "arkclaw --debug",
                    "explanation": "Enable verbose logging for more details"
                }
            ],
            "performance": [
                {
                    "solution": "Check resource usage",
                    "command": "top -p $(pgrep arkclaw)",
                    "explanation": "Monitor CPU and memory usage"
                },
                {
                    "solution": "Clear cache",
                    "command": "arkclaw --clear-cache",
                    "explanation": "Remove cached data that may be bloated"
                }
            ],
            "integration": [
                {
                    "solution": "Test API connectivity",
                    "command": "curl -X GET http://localhost:8000/health",
                    "explanation": "Verify API is responding"
                },
                {
                    "solution": "Check authentication",
                    "command": "arkclaw --test-auth",
                    "explanation": "Verify credentials are valid"
                }
            ]
        }

        return solutions.get(category, [])

    @staticmethod
    def run_diagnostic_checks() -> Dict[str, Any]:
        """Run standard diagnostic checks."""
        results = {}

        # Python version
        try:
            result = subprocess.run(["python", "--version"], capture_output=True, text=True)
            results["python_version"] = {
                "status": "ok" if result.returncode == 0 else "error",
                "output": result.stdout.strip()
            }
        except Exception as e:
            results["python_version"] = {"status": "error", "output": str(e)}

        # Installation check
        try:
            import arkclaw
            results["arkclaw_installed"] = {
                "status": "ok",
                "version": getattr(arkclaw, "__version__", "unknown")
            }
        except ImportError:
            results["arkclaw_installed"] = {"status": "error", "output": "Not installed"}

        # Configuration check
        config_paths = [
            Path.home() / ".arkclaw" / "config.json",
            Path("/etc/arkclaw/config.json"),
            Path("config.json")
        ]

        config_found = False
        for path in config_paths:
            if path.exists():
                config_found = True
                results["config_file"] = {"status": "ok", "path": str(path)}
                break

        if not config_found:
            results["config_file"] = {"status": "error", "output": "No config file found"}

        return results


def troubleshoot_command(error_message: str):
    """Run troubleshooter for an error."""
    diagnosis = ArkClawDiagnostics.diagnose_issue(error_message)

    print("\n" + "=" * 60)
    print("ARKCLAW TROUBLESHOOTING DIAGNOSIS")
    print("=" * 60)

    print(f"\nIssue Category: {diagnosis['category'].upper()}")
    print(f"Error: {diagnosis['error_message']}")

    print("\nLikely Causes:")
    for i, cause in enumerate(diagnosis['likely_causes'], 1):
        print(f"  {i}. {cause}")

    print("\nRecommended Solutions:")
    for i, solution in enumerate(diagnosis['solutions'], 1):
        print(f"\n  Solution {i}: {solution['solution']}")
        print(f"  Command: {solution.get('command', 'N/A')}")
        print(f"  Why: {solution['explanation']}")

    print("\nDiagnostic Steps:")
    for i, step in enumerate(diagnosis['diagnostic_steps'], 1):
        print(f"  {i}. {step}")


def diagnostics_command():
    """Run diagnostic checks."""
    print("\n" + "=" * 60)
    print("ARKCLAW SYSTEM DIAGNOSTICS")
    print("=" * 60)

    results = ArkClawDiagnostics.run_diagnostic_checks()

    print("\nResults:")
    for check, result in results.items():
        status_icon = "✓" if result['status'] == "ok" else "✗"
        print(f"\n{status_icon} {check.replace('_', ' ').title()}")
        if 'output' in result:
            print(f"  {result['output']}")
        if 'version' in result:
            print(f"  Version: {result['version']}")
        if 'path' in result:
            print(f"  Location: {result['path']}")


def main():
    parser = argparse.ArgumentParser(description='ArkClaw Troubleshooter')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Troubleshoot command
    troubleshoot_parser = subparsers.add_parser('troubleshoot', help='Diagnose an issue')
    troubleshoot_parser.add_argument('error', help='Error message or symptom')

    # Diagnostics command
    subparsers.add_parser('diagnostics', help='Run system diagnostics')

    args = parser.parse_args()

    if args.command == 'troubleshoot':
        troubleshoot_command(args.error)
    elif args.command == 'diagnostics':
        diagnostics_command()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
