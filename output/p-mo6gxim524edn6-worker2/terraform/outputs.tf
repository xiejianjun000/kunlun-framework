/**
 * OpenTaiji Project - Terraform Outputs
 */

output "project_info" {
  description = "Project information"
  value = {
    project_name  = var.project_name
    environment   = var.environment
    infrastructure_ready = true
  }
}

output "resource_allocation_summary" {
  description = "Summary of all resource allocations"
  value = {
    "CI/CD Server" = "${var.cicd_cpu} CPU / ${var.cicd_memory_gb} GB"
    "Test Environment" = "${var.test_cpu} CPU / ${var.test_memory_gb} GB"
    "Performance Test" = "${var.perf_test_cpu} CPU / ${var.perf_test_memory_gb} GB"
    "Documentation Server" = "${var.docs_cpu} CPU / ${var.docs_memory_gb} GB"
    "Monitoring System" = "${var.monitoring_cpu_total} CPU / ${var.monitoring_memory_gb_total} GB"
    total_cpu    = var.cicd_cpu + var.test_cpu + var.perf_test_cpu + var.docs_cpu + var.monitoring_cpu_total
    total_memory = var.cicd_memory_gb + var.test_memory_gb + var.perf_test_memory_gb + var.docs_memory_gb + var.monitoring_memory_gb_total
  }
}

# Service Endpoints
output "service_endpoints" {
  description = "All service endpoints"
  value = {
    test_environment = "http://localhost:8080"
    documentation   = "http://localhost:8081"
    prometheus      = "http://localhost:9090"
    grafana         = "http://localhost:3000"
  }
}
