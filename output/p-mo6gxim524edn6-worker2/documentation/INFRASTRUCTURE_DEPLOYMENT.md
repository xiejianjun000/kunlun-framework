# OpenTaiji 项目基础设施部署文档

## 概述

本文档描述了 OpenTaiji 项目的生产级 DevOps 基础设施建设，包括：

1. **CI/CD 流水线** - 自动化测试、构建
2. **测试环境** - 功能测试环境
3. **性能测试环境** - 性能压力测试环境
4. **监控系统** - Prometheus + Grafana
5. **文档服务器** - 项目文档托管

## 资源分配规格

按照项目需求，基础设施资源分配如下：

| 组件 | CPU 核心 | 内存 | 配置说明 | 状态 |
|------|---------|------|---------|------|
| CI/CD 服务器 | 4 核 | 8 GB | GitLab Runner | ✅ 已配置 |
| 测试环境 | 8 核 | 16 GB | 应用测试环境 | ✅ 已配置 |
| 性能测试环境 | 16 核 | 32 GB | k6 压力测试 | ✅ 已配置 |
| 文档服务器 | 2 核 | 4 GB | Nginx 文档托管 | ✅ 已配置 |
| 监控系统 | 4 核 | 8 GB | Prometheus(2C4G) + Grafana(2C4G) + cAdvisor | ✅ 已配置 |
| **总计** | **34 核** | **68 GB** | 全部组件 | ✅ |

## 目录结构

```
output/p-mo6gxim524edn6-worker2/
├── terraform/              # Terraform 基础设施即代码
│   ├── main.tf            # 主配置文件
│   ├── variables.tf       # 变量定义
│   └── outputs.tf         # 输出定义
├── github/                 # GitHub Actions CI/CD 流水线
│   ├── main.yml           # 主流水线
│   └── test.yml           # PR 测试流水线
├── monitoring/             # Prometheus + Grafana 监控配置
│   ├── prometheus.yml     # Prometheus 配置
│   ├── grafana-datasources.yml  # Grafana 数据源配置
│   └── alerts.yml         # 告警规则
├── deployment/             # 部署配置
│   ├── docker-compose.yml # Docker Compose 本地部署
│   └── Makefile           # 便捷命令
└── documentation/          # 文档服务器配置
    ├── nginx.conf         # Nginx 配置
    └── INFRASTRUCTURE_DEPLOYMENT.md  # 本文档
```

## 快速开始

### 使用 Docker Compose 部署（推荐用于开发环境）

```bash
# 进入部署目录
cd output/p-mo6gxim524edn6-worker2/deployment

# 启动所有服务
make up

# 查看服务状态
make status

# 查看日志
make logs
```

### 使用 Terraform 部署

```bash
# 进入 Terraform 目录
cd output/p-mo6gxim524edn6-worker2/terraform

# 初始化 Terraform
terraform init

# 查看计划
terraform plan

# 应用配置
terraform apply
```

## 服务访问地址

启动后，服务可通过以下地址访问：

| 服务 | 地址 | 默认凭据 | 说明 |
|------|------|---------|------|
| 测试环境 | http://localhost:8080 | - | 应用程序测试 |
| 文档服务器 | http://localhost:8081 | - | 项目文档托管 |
| cAdvisor | http://localhost:8082 | - | 容器监控 |
| Prometheus | http://localhost:9090 | - | 时间序列数据库 |
| Grafana | http://localhost:3000 | admin / admin | 数据可视化 |

> ⚠️ **安全提示**: 在生产环境部署时，请务必修改 Grafana 默认管理员密码。

## CI/CD 流水线说明

### 适配项目结构

当前配置支持多语言项目（monorepo结构）：
- JavaScript/TypeScript (Node.js)
- Go
- Rust
- Python

仅在代码文件变化时触发构建，避免不必要的运行。

### 主流水线 (`main.yml`)

主流水线在推送到 `main` 和 `develop` 分支或创建 PR 时自动运行，包含以下阶段：

1. **代码质量检查** - Lint 和类型检查
2. **自动化测试** - 支持多Node.js版本矩阵运行单元测试
3. **构建** - 构建应用程序，生成Docker镜像
4. **部署到测试环境** - 自动部署到测试环境
5. **性能测试** - 使用k6运行性能测试
6. **部署到生产** - 合并到main分支后自动部署到生产

支持手动触发，可选择部署环境和缓存配置。

### PR 测试流水线 (`test.yml`)

仅在创建或更新 PR 时运行快速测试：

- 代码 lint 检查
- 单元测试执行
- 比主流水线更快，适合代码评审
- 快速反馈代码质量

## 测试环境配置

测试环境配置说明：

- 基于 Nginx 静态文件服务
- 支持自动部署
- 集成到 Prometheus 监控
- 8 核 16GB 资源保证

在 CI/CD 自动部署完成后，可以通过 http://localhost:8080 访问测试版本。

## 性能测试环境

性能测试环境配置：

- 使用 k6 性能测试工具
- 16 核 32GB 大规格保证可以产生足够压力
- 测试脚本存储在持久化卷中
- 性能指标自动导出到 Prometheus

### 运行性能测试示例

```bash
# 进入性能测试容器
docker exec -it opentaiji-perf-test k6 run /scripts/your-test.js

# 或使用 CLI 在本地运行
k6 run --out prometheus your-test.js
```

## 监控系统

监控系统采用 Prometheus + Grafana 组合，已预置以下监控：

### 已配置的监控目标

1. **Prometheus** - 自监控
2. **Node Exporter** - 主机监控（CPU、内存、磁盘、网络）
3. **cAdvisor** - 容器资源监控
4. **CI/CD Runner** - CI/CD 运行器指标
5. **测试环境应用** - 应用程序指标
6. **k6 性能测试** - 性能测试结果
7. **Grafana** - Grafana 自身指标

### 预置告警规则

| 告警名称 | 条件 | 级别 |
|---------|------|------|
| 高 CPU 使用 | > 80% 持续 5 分钟 | 警告 |
| 高内存使用 | > 85% 持续 5 分钟 | 警告 |
| 磁盘空间不足 | < 10% 剩余 | 严重 |
| 目标下线 | 采集失败超过 1 分钟 | 严重 |
| 高错误率 | > 5% 错误率 | 严重 |
| 慢响应 | P95 > 1 秒 | 警告 |

## 文档服务器

文档服务器配置：

- 基于 Nginx，轻量级高效
- 启用了 gzip 压缩
- 启用了静态资源缓存
- 配置了安全响应头
- 支持 HTML5 历史模式美化 URL
- 2 核 4GB 规格满足文档托管需求

部署项目文档：

```bash
# 将构建好的文档复制到文档服务器卷
# Docker 卷位置由 Docker 管理，可通过以下方式更新
docker run --rm -v opentaiji-docs-html:/target -v $(pwd)/your-docs:/from alpine cp -a /from/. /target

# 然后重启容器
docker restart opentaiji-docs
```

## 常用维护命令

### 查看状态

```bash
# Docker Compose
cd deployment
make status

# Terraform
cd ../terraform
terraform show
```

### 查看日志

```bash
# 所有日志
make logs

# 指定服务
make logs-grafana
make logs-prometheus
make logs-cicd
```

### 重启服务

```bash
# 全部重启
make restart

# 指定服务
docker-compose restart prometheus
```

### 清理

```bash
# 停止并删除所有卷（谨慎操作！会清除所有数据）
make clean
```

## 最佳实践

1. **基础设施即代码** - 所有变更都通过 Git 管理，可追溯
2. **分层配置** - 开发环境用 Docker Compose，生产用 Terraform
3. **全可观测** - 所有组件都已接入监控
4. **安全第一** - 敏感信息使用环境变量或密钥管理，不提交到代码库
5. **自动化** - 从测试到部署全程自动化，减少人工干预

## 故障排查

### 服务无法启动

检查资源配额：
```bash
docker system info
docker stats
```

### Prometheus 无法采集目标

检查网络连通性：
```bash
# 进入 Prometheus 容器测试
docker exec -it opentaiji-prometheus wget -qO- http://node-exporter:9100/metrics
```

### Grafana 无法连接 Prometheus

检查数据源 URL，应为 `http://prometheus:9090`（Docker 内部 DNS）。

## 预置 Grafana Dashboards 推荐

建议导入以下 Grafana Dashboard：

1. **Node Exporter Full** (ID: 1860) - 主机监控完整仪表盘
2. **cAdvisor Exporter** (ID: 14282) - 容器资源监控
3. **Prometheus Stats** (ID: 3662) - Prometheus自身监控
4. **k6 Load Testing Results** (ID: 18308) - k6性能测试结果

## 更新日志

### v1.1 (2026-04-20)
- ✅ 适配多语言项目结构，优化CI/CD触发条件
- ✅ 确认测试环境 8核16GB 配置正确
- ✅ 确认性能测试环境 16核32GB 配置正确
- ✅ 完善监控系统，添加cAdvisor容器级监控
- ✅ 更新部署文档

### v1.0 (2026-04-20)
- ✅ 初始基础设施配置
- ✅ Terraform基础设施即代码
- ✅ GitHub Actions CI/CD流水线
- ✅ Prometheus + Grafana监控系统
- ✅ Docker Compose本地部署方案

## 作者

Ella - DevOps 工程师 (p-mo6gxim524edn6-worker2)

## 许可证

项目遵循开源许可证，详见主项目 LICENSE 文件。
