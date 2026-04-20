/**
 * OpenTaiji Project - Terraform Variables
 */

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "opentaiji"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "development"
}

# Resource Allocation Specifications
# As requested in the project requirements

variable "cicd_cpu" {
  description = "CI/CD server CPU cores"
  type        = number
  default     = 4
}

variable "cicd_memory_gb" {
  description = "CI/CD server memory in GB"
  type        = number
  default     = 8
}

variable "test_cpu" {
  description = "Test environment CPU cores"
  type        = number
  default     = 8
}

variable "test_memory_gb" {
  description = "Test environment memory in GB"
  type        = number
  default     = 16
}

variable "perf_test_cpu" {
  description = "Performance test environment CPU cores"
  type        = number
  default     = 16
}

variable "perf_test_memory_gb" {
  description = "Performance test environment memory in GB"
  type        = number
  default     = 32
}

variable "docs_cpu" {
  description = "Documentation server CPU cores"
  type        = number
  default     = 2
}

variable "docs_memory_gb" {
  description = "Documentation server memory in GB"
  type        = number
  default     = 4
}

variable "monitoring_cpu_total" {
  description = "Monitoring system total CPU cores"
  type        = number
  default     = 4
}

variable "monitoring_memory_gb_total" {
  description = "Monitoring system total memory in GB"
  type        = number
  default     = 8
}

variable "grafana_admin_user" {
  description = "Grafana admin username"
  type        = string
  default     = "admin"
}

variable "grafana_admin_password" {
  description = "Grafana admin password (change in production)"
  type        = string
  default     = "changeme-in-production"
  sensitive   = true
}
