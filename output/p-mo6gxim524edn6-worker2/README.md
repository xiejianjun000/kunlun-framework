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

### 开发/测试环境

| 组件 | CPU | 内存 | 说明 |
|------|-----|------|------|
| CI/CD 服务器 | 4 核 | 8 GB | GitLab Runner |
| 测试环境 | 8 核 | 16 GB | 应用测试环境 |
| 性能测试环境 | 16 核 | 32 GB | k6 压力测试 |
| 文档服务器 | 2 核 | 4 GB | Nginx 文档托管 |
| 监控系统 | 4 核 | 8 GB | Prometheus(2C4G) + Grafana(2C4G) + cAdvisor |
| **总计** | **34 核** | **68 GB** | 全部组件 |

### 生产环境

| 组件 | 实例数 | CPU | 内存 | 说明 |
|------|--------|-----|------|------|
| Nginx 反向代理 | 1 | 1 核 | 1 GB | SSL + 负载均衡 |
| 应用服务 | 2 | 8 核 | 16 GB | 高可用集群 |
| PostgreSQL | 1 | 2 核 | 4 GB | 主数据库 |
| Redis | 1 | 1 核 | 2 GB | 缓存 + 队列 |
| Prometheus | 1 | 2 核 | 4 GB | 时序指标 |
| cAdvisor | 1 | 0.5 核 | 1 GB | 容器监控 |
| Grafana | 1 | 1 核 | 2 GB | 可视化 |
| **总计** | **7** | **15.5 核** | **30 GB** | 生产级部署 |

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

## 🚪 五层质量门禁

| 门禁 | 检查内容 | 完美级标准 |
|------|---------|-----------|
| 1. 编译 | TypeScript 类型检查 | ✅ 零错误 |
| 2. Lint | ESLint + Prettier | ✅ 零警告 |
| 3. 测试 | 单元测试 + 覆盖率 | ✅ 100% 通过, 行≥85%, 分支≥80% |
| 4. 安全 | npm audit 漏洞扫描 | ✅ 零高危漏洞 |
| 5. 架构 | 目录结构 + 命名规范 | ✅ ≥95分 架构一致性评分 |

## 🔍 监控与告警体系

### 预置监控看板
- 📊 **LLM 适配器看板**: QPS、延迟、失败率、API成本实时监控
- 🛠️ **技能系统看板**: 技能执行次数、耗时、成功率
- ⏰ **调度器看板**: 任务执行统计、推送成功率
- 💻 **系统资源看板**: CPU、内存、磁盘、容器资源
- 🧪 **WFGY 幻觉检测看板**: 幻觉检出率、验证统计

### 20+ 预置告警规则
| 类别 | 典型告警 | 级别 |
|------|---------|------|
| 可用性 | 服务下线、健康检查失败 | Critical |
| 性能 | 高延迟、P95超标 | Warning |
| 资源 | CPU/内存/磁盘超限 | Warning |
| 适配器 | 熔断器触发、成本突增 | Critical |
| 技能 | 高失败率、频繁超时 | Warning |
| 调度器 | 任务失败、推送失败 | Warning |

## 📁 交付物清单

### D6 - 部署验证报告 (P0)
- ✅ 云电脑一键部署脚本: `deployment/cloud-machine/cloud-deploy.sh`
- ✅ 生产级Dockerfile: `deployment/cloud-machine/Dockerfile`
- ✅ 自动部署报告生成

### D9 - 生产级部署与监控体系 (P1)
- ✅ 生产级Docker Compose: `deployment/production/docker-compose.yml`
- ✅ Prometheus生产配置: `monitoring/prometheus-prod.yml`
- ✅ 20+ 生产级告警规则: `monitoring/alerts/production-rules.yml`
- ✅ Grafana LLM适配器Dashboard: `monitoring/grafana/dashboards/`
- ✅ 完整部署运维手册: `documentation/DEPLOYMENT-OPERATIONS-MANUAL.md`

### 文档交付物
- **DOC4**: 部署运维手册 (完整)
  - 架构总览
  - 快速部署指南
  - 五层质量门禁详解
  - 监控告警体系
  - 日常运维操作
  - 故障排查指南
  - 扩容缩容方案
  - 安全最佳实践
  - 版本升级流程
  - 灾难恢复预案

## 👤 维护者

Ella - DevOps 工程师 (p-mo6gxim524edn6-worker2)
