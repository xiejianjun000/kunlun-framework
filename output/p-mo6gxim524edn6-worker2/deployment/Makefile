# OpenTaiji Infrastructure - Makefile
# Convenience commands for infrastructure management

.PHONY: help init plan apply destroy up down status logs clean

help:
	@echo "OpenTaiji Infrastructure Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make help      - Show this help"
	@echo "  make init      - Initialize Terraform"
	@echo "  make plan      - Show Terraform plan"
	@echo "  make apply     - Apply Terraform configuration"
	@echo "  make destroy   - Destroy all infrastructure"
	@echo "  make up        - Start all services with Docker Compose"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make status    - Show service status"
	@echo "  make logs      - Show all logs"
	@echo "  make clean     - Clean up volumes"
	@echo ""

# Terraform commands
init:
	cd ../terraform && terraform init

plan:
	cd ../terraform && terraform plan

apply:
	cd ../terraform && terraform apply -auto-approve

destroy:
	cd ../terraform && terraform destroy -auto-approve

# Docker Compose commands
up:
	docker-compose up -d
	@echo ""
	@echo "Services started:"
	@echo "  Test Environment:  http://localhost:8080"
	@echo "  Documentation:     http://localhost:8081"
	@echo "  Prometheus:        http://localhost:9090"
	@echo "  Grafana:           http://localhost:3000"
	@echo ""

down:
	docker-compose down

restart:
	docker-compose restart

status:
	docker-compose ps

logs:
	docker-compose logs --tail=100 -f

logs-cicd:
	docker-compose logs --tail=100 -f cicd-runner

logs-prometheus:
	docker-compose logs --tail=100 -f prometheus

logs-grafana:
	docker-compose logs --tail=100 -f grafana

logs-cadvisor:
	docker-compose logs --tail=100 -f cadvisor

clean:
	docker-compose down -v
	@echo "All volumes removed"

# Quick status check
info:
	@echo "=== OpenTaiji Infrastructure Information ==="
	@echo ""
	@echo "Resource Allocation:"
	@echo "  CI/CD Server:          4 CPU /  8GB RAM"
	@echo "  Test Environment:      8 CPU / 16GB RAM"
	@echo "  Performance Testing:  16 CPU / 32GB RAM"
	@echo "  Documentation Server:  2 CPU /  4GB RAM"
	@echo "  Monitoring:            4 CPU /  8GB RAM"
	@echo ""
	@echo "  Total:                34 CPU / 68GB RAM"
	@echo ""
