# OpenTaiji 部署运维手册 v1.0

**版本**: 1.0  
**适用**: M3 生产级完美交付  
**作者**: Ella (DevOps)

---

## 一、部署架构总览

### 1.1 生产级部署架构

```
                    ┌─────────────┐
                    │   Nginx     │ ← 反向代理 + SSL
                    │  (1核1G)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  应用集群   │ ← 2实例 (4核8G each)
                    │   (8核16G)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
      ┌──────▼──────┐ ┌──▼──────┐ ┌───▼──────┐
      │  PostgreSQL │ │  Redis  │ │  监控栈  │
      │   (2核4G)   │ │(1核2G)  │ │ (3核7G)  │
      └─────────────┘ └─────────┘ └──────────┘
```

### 1.2 资源规划总计

| 组件 | 实例数 | CPU | 内存 |
|------|--------|-----|------|
| Nginx | 1 | 1 核 | 1 GB |
| 应用服务 | 2 | 8 核 | 16 GB |
| PostgreSQL | 1 | 2 核 | 4 GB |
| Redis | 1 | 1 核 | 2 GB |
| Prometheus | 1 | 2 核 | 4 GB |
| cAdvisor | 1 | 0.5 核 | 1 GB |
| Grafana | 1 | 1 核 | 2 GB |
| **总计** | **7** | **15.5 核** | **30 GB** |

---

## 二、快速部署指南

### 2.1 前置环境要求

```bash
# 操作系统
Ubuntu 22.04 LTS

# 软件版本
Docker ≥ 24.0
Docker Compose ≥ 2.0
Node.js = 18.x LTS

# 最低配置
CPU: 4 核
内存: 8 GB
磁盘: 50 GB SSD

# 推荐生产配置
CPU: 16 核
内存: 32 GB
磁盘: 200 GB SSD
```

### 2.2 云电脑一键部署

```bash
# 1. 进入项目目录
cd /path/to/opentaiji

# 2. 配置环境变量
cp deployment/production/.env.example .env
# 编辑 .env 修改所有默认密码

# 3. 执行一键部署脚本
bash deployment/cloud-machine/cloud-deploy.sh

# 部署脚本自动执行：
# ✅ 环境检查
# ✅ 五层质量门禁（编译/Lint/测试/安全/架构）
# ✅ Docker镜像构建
# ✅ 完整服务栈启动
# ✅ 端到端测试验证
# ✅ 生成部署报告

# 4. 部署完成后访问服务：
# - 应用: http://<server-ip>:3000
# - Prometheus: http://<server-ip>:9090
# - Grafana: http://<server-ip>:3001
```

### 2.3 手动分步部署

```bash
# 1. 安装依赖
npm ci

# 2. 质量门禁检查
npm run build       # 编译
npm run lint        # Lint
npm run test        # 单元测试
npm audit           # 安全扫描

# 3. 启动服务栈
docker-compose -f deployment/production/docker-compose.yml up -d

# 4. 验证部署
curl http://localhost:3000/health
# 期望输出: {"status":"ok"}
```

---

## 三、五层质量门禁详解

### 门禁 1: 编译与类型检查

```bash
# 执行命令
npm run build

# 验收标准
# ✅ TypeScript 编译 0 错误
# ✅ 零类型警告
# ✅ 所有导出类型完整定义
```

### 门禁 2: Lint 零警告

```bash
# 执行命令
npm run lint

# 验收标准
# ✅ ESLint 0 错误
# ✅ ESLint 0 警告
# ✅ Prettier 格式化 100% 一致
```

### 门禁 3: 单元测试 + 覆盖率

```bash
# 执行命令
npm run test -- --coverage

# 验收标准
# ✅ 100% 测试用例通过
# ✅ 行覆盖率 ≥ 85%
# ✅ 分支覆盖率 ≥ 80%
```

### 门禁 4: 安全漏洞扫描

```bash
# 执行命令
npm audit --audit-level=high

# 验收标准
# ✅ 0 高危漏洞
# ✅ 0 严重漏洞
# ✅ 生产依赖无已知CVE
```

### 门禁 5: 架构一致性检查

```bash
# 检查项：
# ✅ 目录结构符合规范
# ✅ 命名规范统一（类名 PascalCase、函数 camelCase）
# ✅ 无 any 类型使用
# ✅ 无循环依赖
# ✅ 依赖注入模式正确
```

---

## 四、监控与告警体系

### 4.1 Grafana 看板

| 看板名称 | 用途 | 默认地址 |
|---------|------|----------|
| LLM 适配器监控 | 适配器QPS、延迟、失败率、成本 | /d/opentaiji-llm |
| 技能系统监控 | 技能执行次数、耗时、成功率 | /d/opentaiji-skill |
| 调度器监控 | 任务执行、推送成功率 | /d/opentaiji-scheduler |
| 系统资源监控 | CPU、内存、磁盘、网络 | /d/opentaiji-system |
| WFGY 幻觉检测 | 幻觉检出率、验证统计 | /d/opentaiji-wfgy |

### 4.2 告警规则汇总

| 告警名称 | 触发条件 | 级别 |
|---------|---------|------|
| ServiceDown | 服务不可用 ≥1分钟 | Critical |
| HighErrorRate | 错误率 ≥5% ≥2分钟 | Critical |
| HighLatency | P95延迟 ≥500ms | Warning |
| HighCPUUsage | CPU ≥80% ≥5分钟 | Warning |
| HighMemoryUsage | 内存 ≥85% ≥5分钟 | Warning |
| LowDiskSpace | 磁盘剩余 <10% | Critical |
| AdapterCircuitBreakerTripped | 熔断器触发 | Critical |
| HighCostSpike | 小时成本 > $100 | Warning |
| SkillTimeout | 技能超时 ≥3次/5分钟 | Warning |

### 4.3 关键指标阈值

| 指标 | 警告阈值 | 严重阈值 | 目标值 |
|------|---------|---------|--------|
| HTTP 错误率 | ≥3% | ≥5% | <1% |
| P95 延迟 | ≥300ms | ≥500ms | <200ms |
| CPU 使用率 | ≥70% | ≥80% | <60% |
| 内存使用率 | ≥75% | ≥85% | <70% |
| 适配器失败率 | ≥3% | ≥10% | <1% |
| 技能失败率 | ≥3% | ≥5% | <1% |

---

## 五、日常运维操作

### 5.1 服务管理

```bash
# 查看服务状态
docker-compose -f deployment/production/docker-compose.yml ps

# 查看日志
docker-compose -f deployment/production/docker-compose.yml logs -f app

# 重启服务
docker-compose -f deployment/production/docker-compose.yml restart app

# 滚动更新（零停机）
docker-compose -f deployment/production/docker-compose.yml up -d --no-deps --scale app=3 app
# 等待新实例就绪后
docker-compose -f deployment/production/docker-compose.yml up -d --no-deps --scale app=2 app
```

### 5.2 备份与恢复

```bash
# 数据库备份
docker exec opentaiji-postgres pg_dump -U opentaiji opentaiji > backup_$(date +%Y%m%d).sql

# 数据库恢复
docker exec -i opentaiji-postgres psql -U opentaiji opentaiji < backup_20260420.sql

# 监控数据备份
docker run --rm --volumes-from opentaiji-prometheus -v $(pwd):/backup alpine tar czf /backup/prometheus.tar.gz /prometheus

# Grafana 看板导出
# Grafana UI → Dashboards → Settings → JSON Model
```

### 5.3 日志管理

```bash
# 查看应用日志
docker logs opentaiji-app --tail 100 -f

# 查看错误日志
docker logs opentaiji-app 2>&1 | grep -i error

# 导出日志
docker logs opentaiji-app > app_logs_$(date +%Y%m%d).txt

# 日志轮转配置（自动）
# /var/lib/docker/containers/*/*-json.log 自动轮转
# 保留策略: 5个文件，每个最大 10MB
```

---

## 六、故障排查指南

### 6.1 服务无法启动

```bash
# 症状: 容器启动后立即退出

# 1. 查看容器日志
docker logs opentaiji-app

# 2. 检查依赖服务健康状况
docker inspect opentaiji-postgres | grep -i health

# 3. 验证环境变量
docker exec opentaiji-app env | grep -E "DB|REDIS"

# 4. 常见原因:
# - 数据库密码不匹配
# - Redis 连接失败
# - 端口被占用
# - 内存不足被 OOM Killer 杀死
```

### 6.2 性能问题排查

```bash
# 症状: 响应缓慢

# 1. 查看系统资源
docker stats

# 2. 查看慢查询
docker exec opentaiji-postgres psql -U opentaiji -c "
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# 3. 查看 Redis 慢日志
docker exec opentaiji-redis redis-cli SLOWLOG GET 10

# 4. Profiling
# 访问: http://localhost:3000/debug/pprof/
```

### 6.3 适配器故障排查

```bash
# 症状: LLM 调用频繁失败

# 1. 检查熔断器状态
curl http://localhost:3000/metrics/adapters | grep circuit_breaker

# 2. 查看重试次数
curl http://localhost:3000/metrics/adapters | grep retry_total

# 3. 检查 API Key 配额
# 查看各平台控制台确认配额是否用尽

# 4. 网络连通性测试
docker exec opentaiji-app curl -v https://dashscope.aliyuncs.com
```

---

## 七、扩容与缩容

### 7.1 应用层扩容

```bash
# 水平扩容应用实例
docker-compose -f deployment/production/docker-compose.yml up -d --scale app=4

# 验证: 检查 Nginx 上游节点数
curl http://localhost:3000/health | jq
```

### 7.2 数据库扩容

```bash
# PostgreSQL 配置调整
# deployment/production/postgres/postgresql.conf
# 调整以下参数:
# - shared_buffers = 25% 系统内存
# - effective_cache_size = 75% 系统内存
# - work_mem = 64MB
# - maintenance_work_mem = 2GB

# 重启生效
docker-compose -f deployment/production/docker-compose.yml restart postgres
```

### 7.3 Redis 扩容

```bash
# 开启持久化（默认已开启RDB）
# 升级到 Redis Cluster 用于超大规模场景
# 参考: https://redis.io/docs/management/scaling/
```

---

## 八、安全最佳实践

### 8.1 密钥管理

```bash
# ❌ 不要硬编码密钥到代码
# ✅ 使用环境变量注入
# ✅ 生产环境使用密钥管理服务 (KMS)
# ✅ 定期轮换密钥 (推荐: 每90天)

# 检查代码中是否有硬编码密钥
grep -r "api_key\|secret\|password" src/ --include="*.ts" | grep -v "node_modules"
```

### 8.2 网络安全

```bash
# 1. 只暴露必要端口
# 生产环境只暴露 Nginx (80/443)，其他端口不对外

# 2. 配置防火墙
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# 3. 内部服务禁用公网访问
# PostgreSQL/Redis 只监听内部网络
```

### 8.3 HTTPS 配置

```bash
# 使用 Let's Encrypt 免费证书
certbot certonly --nginx -d your-domain.com

# 配置 Nginx SSL
# deployment/production/nginx/nginx.conf
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

---

## 九、版本升级流程

### 9.1 零停机升级步骤

```bash
# 1. 新版本代码拉取
git pull origin main

# 2. 通过所有质量门禁
npm run build
npm run lint
npm run test
npm audit

# 3. 构建新镜像
docker build -f deployment/cloud-machine/Dockerfile -t opentaiji:v1.1 .

# 4. 滚动升级
docker-compose -f deployment/production/docker-compose.yml up -d --no-deps app

# 5. 验证新版本
curl http://localhost:3000/version

# 6. 观察监控
# 检查错误率、延迟等指标无异常
```

### 9.2 回滚流程

```bash
# 如果新版本有问题，快速回滚
docker tag opentaiji:v1.0 opentaiji:latest
docker-compose -f deployment/production/docker-compose.yml up -d --no-deps app
```

---

## 十、灾难恢复预案

### 10.1 数据损坏恢复

```bash
# RTO: 1小时内, RPO: 15分钟（基于备份频率）

# 1. 停止写入
docker-compose -f deployment/production/docker-compose.yml stop app

# 2. 从最近备份恢复
docker exec -i opentaiji-postgres psql -U opentaiji opentaiji < latest_backup.sql

# 3. 验证数据完整性
docker exec opentaiji-postgres psql -U opentaiji -c "SELECT count(*) FROM users;"

# 4. 重启服务
docker-compose -f deployment/production/docker-compose.yml start app
```

### 10.2 完全故障重建

```bash
# 1. 准备新服务器
# 2. 恢复数据库备份
# 3. 启动完整服务栈
# 4. 验证所有功能正常
# 5. 切换流量（DNS/负载均衡器）
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-20  
**维护者**: Ella (DevOps)
