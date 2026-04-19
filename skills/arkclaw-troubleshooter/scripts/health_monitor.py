#!/usr/bin/env python3
"""
Health Monitor Script

Monitors system health and reports issues before they become incidents.
"""

import argparse
import json
import psutil
import subprocess
import sys
from typing import Dict, List, Any
from datetime import datetime


class HealthMonitor:
    """Monitor system health indicators."""

    @staticmethod
    def check_disk_usage(threshold: float = 80.0) -> Dict[str, Any]:
        """Check disk usage across all mounted filesystems."""
        issues = []

        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                percent_used = (usage.used / usage.total) * 100

                if percent_used > threshold:
                    issues.append({
                        "mountpoint": partition.mountpoint,
                        "percent_used": round(percent_used, 2),
                        "available_gb": round(usage.free / (1024**3), 2),
                        "severity": "critical" if percent_used > 90 else "warning"
                    })
            except PermissionError:
                continue

        return {
            "status": "ok" if not issues else "issues",
            "issues": issues
        }

    @staticmethod
    def check_memory_usage(threshold: float = 85.0) -> Dict[str, Any]:
        """Check memory usage."""
        mem = psutil.virtual_memory()
        percent_used = mem.percent

        issues = []
        if percent_used > threshold:
            issues.append({
                "percent_used": percent_used,
                "available_gb": round(mem.available / (1024**3), 2),
                "severity": "critical" if percent_used > 95 else "warning"
            })

        return {
            "status": "ok" if not issues else "issues",
            "issues": issues
        }

    @staticmethod
    def check_cpu_usage(threshold: float = 80.0, interval: int = 1) -> Dict[str, Any]:
        """Check CPU usage."""
        percent_used = psutil.cpu_percent(interval=interval)

        issues = []
        if percent_used > threshold:
            issues.append({
                "percent_used": percent_used,
                "severity": "critical" if percent_used > 95 else "warning"
            })

        return {
            "status": "ok" if not issues else "issues",
            "issues": issues
        }

    @staticmethod
    def check_process_running(process_name: str) -> Dict[str, Any]:
        """Check if a process is running."""
        running = False
        pid = None

        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if process_name.lower() in proc.info['name'].lower():
                    running = True
                    pid = proc.info['pid']
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return {
            "status": "running" if running else "not_running",
            "pid": pid,
            "process_name": process_name
        }

    @staticmethod
    def check_service_status(service_name: str) -> Dict[str, Any]:
        """Check if a systemd service is running."""
        try:
            result = subprocess.run(
                ["systemctl", "is-active", service_name],
                capture_output=True,
                text=True
            )
            status = result.stdout.strip()

            return {
                "status": status,
                "healthy": status == "active"
            }
        except FileNotFoundError:
            return {
                "status": "unknown",
                "healthy": False,
                "error": "systemctl not found"
            }

    @staticmethod
    def check_port_listening(port: int) -> Dict[str, Any]:
        """Check if a port is being listened to."""
        listening = False
        process = None

        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                listening = True
                try:
                    proc = psutil.Process(conn.pid)
                    process = {
                        "pid": conn.pid,
                        "name": proc.name()
                    }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    process = {"pid": conn.pid}
                break

        return {
            "status": "listening" if listening else "not_listening",
            "port": port,
            "process": process
        }

    @staticmethod
    def check_log_errors(log_file: str, error_pattern: str = "ERROR|error|Error",
                        lines: int = 100) -> Dict[str, Any]:
        """Check log file for recent errors."""
        try:
            result = subprocess.run(
                ["tail", "-n", str(lines), log_file],
                capture_output=True,
                text=True
            )

            log_content = result.stdout
            error_lines = []

            for line in log_content.split('\n'):
                if any(pattern in line for pattern in error_pattern.split('|')):
                    error_lines.append(line)

            return {
                "status": "ok" if not error_lines else "errors_found",
                "error_count": len(error_lines),
                "recent_errors": error_lines[-5:] if error_lines else []
            }
        except FileNotFoundError:
            return {
                "status": "file_not_found",
                "error": f"Log file not found: {log_file}"
            }

    @staticmethod
    def run_health_check(config: Dict[str, Any]) -> Dict[str, Any]:
        """Run comprehensive health check."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "checks": {}
        }

        # Disk usage
        if config.get("check_disk", True):
            results["checks"]["disk"] = HealthMonitor.check_disk_usage(
                config.get("disk_threshold", 80.0)
            )

        # Memory usage
        if config.get("check_memory", True):
            results["checks"]["memory"] = HealthMonitor.check_memory_usage(
                config.get("memory_threshold", 85.0)
            )

        # CPU usage
        if config.get("check_cpu", True):
            results["checks"]["cpu"] = HealthMonitor.check_cpu_usage(
                config.get("cpu_threshold", 80.0)
            )

        # Process checks
        for process in config.get("processes", []):
            results["checks"][f"process_{process}"] = HealthMonitor.check_process_running(process)

        # Service checks
        for service in config.get("services", []):
            results["checks"][f"service_{service}"] = HealthMonitor.check_service_status(service)

        # Port checks
        for port in config.get("ports", []):
            results["checks"][f"port_{port}"] = HealthMonitor.check_port_listening(port)

        # Log checks
        for log_config in config.get("logs", []):
            log_file = log_config.get("file")
            results["checks"][f"log_{log_file}"] = HealthMonitor.check_log_errors(
                log_file,
                log_config.get("error_pattern", "ERROR"),
                log_config.get("lines", 100)
            )

        # Overall status
        results["overall_status"] = "healthy"
        for check_name, check_result in results["checks"].items():
            if check_result.get("status") not in ["ok", "running", "listening", "active"]:
                results["overall_status"] = "unhealthy"
                break

        return results


def main():
    parser = argparse.ArgumentParser(description='System Health Monitor')
    parser.add_argument('--config', type=str, help='JSON config file')
    parser.add_argument('--process', type=str, action='append', help='Check if process is running')
    parser.add_argument('--service', type=str, action='append', help='Check if service is active')
    parser.add_argument('--port', type=int, action='append', help='Check if port is listening')
    parser.add_argument('--log', type=str, action='append', help='Check log file for errors')
    parser.add_argument('--output', type=str, choices=['text', 'json'], default='text',
                       help='Output format')

    args = parser.parse_args()

    # Build config
    config = {
        "check_disk": True,
        "check_memory": True,
        "check_cpu": True,
        "processes": args.process or [],
        "services": args.service or [],
        "ports": args.ports or [],
        "logs": [{"file": log} for log in args.log or []]
    }

    # Load from file if specified
    if args.config:
        with open(args.config, 'r') as f:
            file_config = json.load(f)
            config.update(file_config)

    # Run health check
    results = HealthMonitor.run_health_check(config)

    # Output results
    if args.output == 'json':
        print(json.dumps(results, indent=2))
    else:
        print("\n" + "=" * 60)
        print("SYSTEM HEALTH CHECK")
        print("=" * 60)
        print(f"Timestamp: {results['timestamp']}")
        print(f"Overall Status: {results['overall_status'].upper()}")
        print()

        for check_name, check_result in results["checks"].items():
            status_icon = "✓" if check_result.get("status") in ["ok", "running", "listening", "active"] else "✗"
            print(f"{status_icon} {check_name.replace('_', ' ').title()}: {check_result.get('status', 'unknown')}")

            if check_result.get("issues"):
                for issue in check_result["issues"]:
                    severity = issue.get("severity", "warning").upper()
                    print(f"    ! {severity}: {issue}")

        print("\n" + "=" * 60)

        # Exit with error code if unhealthy
        if results["overall_status"] != "healthy":
            sys.exit(1)


if __name__ == "__main__":
    main()
