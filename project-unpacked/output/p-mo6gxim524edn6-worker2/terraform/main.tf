/**
 * OpenTaiji Project - Infrastructure as Code
 * DevOps Infrastructure Configuration
 * Author: Ella (DevOps Engineer)
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  # Use local Docker daemon for container orchestration
}

# Locals for common configurations
locals {
  project_name = "opentaiji"
  environment  = "production"
  networks = {
    internal = "172.20.0.0/16"
  }
}

# Create internal Docker network
resource "docker_network" "internal" {
  name     = "${local.project_name}-internal"
  internal = true
}

# CI/CD Server (4核8G)
resource "docker_container" "cicd_runner" {
  name  = "${local.project_name}-cicd-runner"
  image = "gitlab/gitlab-runner:latest"

  resources {
    cpu_limit    = 4
    memory_limit = 8589934592 # 8GB
  }

  network_mode = docker_network.internal.name

  volumes {
    volume_name   = "${local.project_name}-cicd-config"
    container_path = "/etc/gitlab-runner"
  }

  volumes {
    volume_name   = "${local.project_name}-cicd-logs"
    container_path = "/var/log/gitlab-runner"
  }

  restart = "always"

  labels = {
    "org.opentaiji.role" = "cicd"
    "org.opentaiji.cpu"  = "4"
    "org.opentaiji.memory" = "8GB"
  }
}

resource "docker_volume" "cicd_config" {
  name = "${local.project_name}-cicd-config"
}

resource "docker_volume" "cicd_logs" {
  name = "${local.project_name}-cicd-logs"
}

# Test Environment (8核16G)
resource "docker_container" "test_environment" {
  name  = "${local.project_name}-test-env"
  image = "nginx:stable-alpine"

  resources {
    cpu_limit    = 8
    memory_limit = 17179869184 # 16GB
  }

  network_mode = docker_network.internal.name

  ports {
    internal = 80
    external = 8080
  }

  volumes {
    volume_name   = "${local.project_name}-test-data"
    container_path = "/usr/share/nginx/html"
  }

  restart = "always"

  labels = {
    "org.opentaiji.role" = "test-environment"
    "org.opentaiji.cpu"  = "8"
    "org.opentaiji.memory" = "16GB"
  }
}

resource "docker_volume" "test_data" {
  name = "${local.project_name}-test-data"
}

# Performance Test Environment (16核32G)
resource "docker_container" "perf_test" {
  name  = "${local.project_name}-perf-test"
  image = "grafana/k6:latest"

  resources {
    cpu_limit    = 16
    memory_limit = 34359738368 # 32GB
  }

  network_mode = docker_network.internal.name

  volumes {
    volume_name   = "${local.project_name}-perf-scripts"
    container_path = "/scripts"
  }

  command = ["sleep", "infinity"]

  restart = "always"

  labels = {
    "org.opentaiji.role" = "performance-test"
    "org.opentaiji.cpu"  = "16"
    "org.opentaiji.memory" = "32GB"
  }
}

resource "docker_volume" "perf_scripts" {
  name = "${local.project_name}-perf-scripts"
}

# Documentation Server (2核4G)
resource "docker_container" "docs_server" {
  name  = "${local.project_name}-docs"
  image = "nginx:stable-alpine"

  resources {
    cpu_limit    = 2
    memory_limit = 4294967296 # 4GB
  }

  network_mode = docker_network.internal.name

  ports {
    internal = 80
    external = 8081
  }

  volumes {
    volume_name   = "${local.project_name}-docs-html"
    container_path = "/usr/share/nginx/html"
  }

  restart = "always"

  labels = {
    "org.opentaiji.role" = "documentation"
    "org.opentaiji.cpu"  = "2"
    "org.opentaiji.memory" = "4GB"
  }
}

resource "docker_volume" "docs_html" {
  name = "${local.project_name}-docs-html"
}

# Prometheus (Monitoring - 4核8G)
resource "docker_container" "prometheus" {
  name  = "${local.project_name}-prometheus"
  image = "prom/prometheus:latest"

  resources {
    cpu_limit    = 2
    memory_limit = 4294967296 # 4GB
  }

  network_mode = docker_network.internal.name

  ports {
    internal = 9090
    external = 9090
  }

  volumes {
    volume_name   = "${local.project_name}-prometheus-config"
    container_path = "/etc/prometheus"
  }

  volumes {
    volume_name   = "${local.project_name}-prometheus-data"
    container_path = "/prometheus"
  }

  command = [
    "--config.file=/etc/prometheus/prometheus.yml",
    "--storage.tsdb.path=/prometheus",
    "--web.enable-lifecycle"
  ]

  restart = "always"

  labels = {
    "org.opentaiji.role" = "monitoring-prometheus"
    "org.opentaiji.cpu"  = "2"
    "org.opentaiji.memory" = "4GB"
  }
}

resource "docker_volume" "prometheus_config" {
  name = "${local.project_name}-prometheus-config"
}

resource "docker_volume" "prometheus_data" {
  name = "${local.project_name}-prometheus-data"
}

# Grafana (Monitoring - 4核8G total)
resource "docker_container" "grafana" {
  name  = "${local.project_name}-grafana"
  image = "grafana/grafana:latest"

  resources {
    cpu_limit    = 2
    memory_limit = 4294967296 # 4GB
  }

  network_mode = docker_network.internal.name

  ports {
    internal = 3000
    external = 3000
  }

  volumes {
    volume_name   = "${local.project_name}-grafana-data"
    container_path = "/var/lib/grafana"
  }

  environment = {
    GF_SECURITY_ADMIN_USER = "admin"
    GF_SECURITY_ADMIN_PASSWORD = "admin" # Change this in production!
  }

  depends_on = [docker_container.prometheus]

  restart = "always"

  labels = {
    "org.opentaiji.role" = "monitoring-grafana"
    "org.opentaiji.cpu"  = "2"
    "org.opentaiji.memory" = "4GB"
  }
}

resource "docker_volume" "grafana_data" {
  name = "${local.project_name}-grafana-data"
}

# Node Exporter for host monitoring
resource "docker_container" "node_exporter" {
  name  = "${local.project_name}-node-exporter"
  image = "prom/node-exporter:latest"

  network_mode = docker_network.internal.name

  pid_mode = "host"

  ports {
    internal = 9100
    external = 9100
  }

  volumes {
    host_path = "/proc"
    container_path = "/host/proc"
    read_only = true
  }

  volumes {
    host_path = "/sys"
    container_path = "/host/sys"
    read_only = true
  }

  volumes {
    host_path = "/"
    container_path = "/rootfs"
    read_only = true
  }

  restart = "always"

  labels = {
    "org.opentaiji.role" = "monitoring-node-exporter"
  }
}

# cAdvisor for container monitoring
resource "docker_container" "cadvisor" {
  name  = "${local.project_name}-cadvisor"
  image = "gcr.io/cadvisor/cadvisor:latest"

  network_mode = docker_network.internal.name

  ports {
    internal = 8080
    external = 8082
  }

  volumes {
    host_path = "/"
    container_path = "rootfs"
    read_only = true
  }

  volumes {
    host_path = "/var/run"
    container_path = "var/run"
  }

  volumes {
    host_path = "/sys"
    container_path = "sys"
    read_only = true
  }

  volumes {
    host_path = "/var/lib/docker"
    container_path = "var/lib/docker"
    read_only = true
  }

  volumes {
    host_path = "${path.cwd}/devicemapper"
    container_path = "devicemapper"
    read_only = true
  }

  restart = "always"

  labels = {
    "org.opentaiji.role" = "monitoring-cadvisor"
  }
}

# Outputs
output "cicd_runner_container_id" {
  description = "CI/CD Runner Container ID"
  value       = docker_container.cicd_runner.id
}

output "test_environment_url" {
  description = "Test Environment URL"
  value       = "http://localhost:8080"
}

output "documentation_url" {
  description = "Documentation Server URL"
  value       = "http://localhost:8081"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://localhost:9090"
}

output "grafana_url" {
  description = "Grafana URL"
  value       = "http://localhost:3000"
}

output "monitoring_total_resources" {
  description = "Total resources for monitoring"
  value       = "4 CPU / 8GB RAM"
}
