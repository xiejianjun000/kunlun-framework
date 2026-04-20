# OpenTaiji DevOps Infrastructure

> 一切皆代码，一切皆可观测

## 项目概览

本目录包含 OpenTaiji 项目的完整 DevOps 基础设施配置，按照一切皆代码的理念，使用 Terraform 和 Docker Compose 管理所有基础设施。

## 📁 目录结构

```
.
├── terraform/              # Terraform 基础设施即代码
│   ├── main.tf            # 主配置 - 定义所有容器和资源
│   ├── variables.tf       # 变量定义 - 资源规格
│   └── outputs.tf         # 输出定义 - 服务端点
├── github/                 # GitHub Actions CI/CD
│   ├── main.yml           # 主流水线：测试 → 构建 → 部署 → 性能测试
│   └── test.yml           # PR 测试：快速验证代码变更
├── monitoring/             # Prometheus + Grafana 监控
│   ├── prometheus.yml     # Prometheus 抓取配置
│   ├── grafana-datasources.yml  # Grafana 数据源配置
│   └── alerts.yml         # 告警规则定义
├── deployment/             # 部署工具链
│   ├── docker-compose.yml # Docker Compose 本地开发部署
│   └── Makefile           # 便捷命令封装
└── documentation/          # 文档服务器配置
    ├── nginx.conf         # Nginx 配置优化
    └── INFRASTRUCTURE_DEPLOYMENT.md  # 完整部署文档
```

## 📊 资源分配

| 组件 | CPU | 内存 | 说明 |
|------|-----|------|------|
| CI/CD 服务器 | 4 核 | 8 GB | GitLab Runner |
| 测试环境 | 8 核 | 16 GB | 应用测试环境 |
| 性能测试环境 | 16 核 | 32 GB | k6 压力测试 |
| 文档服务器 | 2 核 | 4 GB | Nginx 文档托管 |
| 监控系统 | 4 核 | 8 GB | Prometheus(2C4G) + Grafana(2C4G) + cAdvisor |
| **总计** | **34 核** | **68 GB** | 全部组件 |

## 🚀 快速启动（Docker Compose）

```bash
cd deployment
make up
```

启动后访问：
- 🧪 **测试环境**: http://localhost:8080
- 📚 **文档服务器**: http://localhost:8081
- 🔍 **cAdvisor**: http://localhost:8082
- 📊 **Prometheus**: http://localhost:9090
- 📈 **Grafana**: http://localhost:3000 (admin/admin)

## 🔧 常用命令

```bash
# 查看状态
make status

# 查看日志
make logs

# 停止所有服务
make down

# 查看帮助
make help
```

## 🔄 CI/CD 流水线

GitHub Actions 流水线配置完成，包含：

1. **代码质量检查** - Lint & Type check
2. **自动化测试** - 多版本 Node.js 单元测试
3. **应用构建** - 输出构建产物和 Docker 镜像
4. **测试环境部署** - 自动部署到测试环境
5. **性能测试** - k6 压力测试
6. **生产部署** - 主分支自动部署到生产

## 📈 监控

完整的可观测性配置：

- ✅ 主机指标监控 (Node Exporter)
- ✅ 应用指标采集
- ✅ 预置告警规则
- ✅ Grafana 可视化仪表板基础配置

## ✨ 更新

**v1.1 (2026-04-20)**
- ✅ CI/CD适配多语言项目结构
- ✅ 确认测试环境 (8核16GB) 配置正确
- ✅ 确认性能测试环境 (16核32GB) 配置正确
- ✅ 完善监控系统，添加cAdvisor容器监控
- ✅ 更新部署文档

## 📝 文档

完整的部署文档请查看：[documentation/INFRASTRUCTURE_DEPLOYMENT.md](./documentation/INFRASTRUCTURE_DEPLOYMENT.md)

## 🔒 安全提示

- 默认 Grafana 密码需要在生产部署时修改
- 敏感信息请使用 Secrets 管理，不要提交到代码库
- 建议在生产环境配置反向代理和 HTTPS

## 🔍 监控特性

- ✅ 主机级别监控 (Node Exporter)
- ✅ 容器级别监控 (cAdvisor)
- ✅ 应用程序指标采集
- ✅ 性能测试结果集成
- ✅ 预置告警规则
- ✅ Grafana 可观测可视化

## 👤 维护者

Ella - DevOps 工程师 (p-mo6gxim524edn6-worker2)
