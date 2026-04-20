# OpenTaiji 生产环境部署手册 v1.0

**版本**: 1.0  
**日期**: 2026-04-20  
**作者**: Ella (DevOps工程师)

---

## 📋 目录

1. [前置准备](#前置准备)
2. [环境配置](#环境配置)
3. [快速部署](#快速部署)
4. [服务验证](#服务验证)
5. [消息平台接入](#消息平台接入)
6. [监控告警](#监控告警)
7. [日常运维](#日常运维)
8. [故障排查](#故障排查)

---

## 🔧 前置准备

### 1.1 硬件要求

| 配置 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 4核 | 16核 |
| 内存 | 8GB | 32GB |
| 磁盘 | 100GB SSD | 500GB SSD |
| 网络 | 公网IP | 5Mbps以上带宽 |

### 1.2 软件要求

```bash
# 操作系统
Ubuntu 22.04 LTS 或 CentOS 8+

# Docker
Docker >= 24.0
Docker Compose >= 2.0

# 验证安装
docker --version
docker-compose --version
```

### 1.3 网络端口要求

| 端口 | 服务 | 说明 | 公网暴露 |
|------|------|------|---------|
| 80 | Nginx | HTTP 入口 | ✅ 需要 |
| 443 | Nginx | HTTPS 入口 | ✅ 需要 |
| 3000 | App | 主应用 | ❌ 内部 |
| 3001 | Feishu | 飞书 Webhook | ✅ 需要 |
| 3002 | WeChat | 微信 Webhook | ✅ 需要 |
| 3003 | WeCom | 企业微信 Webhook | ✅ 需要 |
| 3004 | DingTalk | 钉钉 Webhook | ✅ 需要 |
| 3001 | Grafana | 监控面板 | ✅ 可选 |
| 9090 | Prometheus | 监控数据 | ❌ 内部 |
| 5432 | PostgreSQL | 数据库 | ❌ 内部 |
| 6379 | Redis | 缓存 | ❌ 内部 |

---

## ⚙️ 环境配置

### 2.1 克隆代码

```bash
# 克隆 OpenTaiji 项目
git clone <repository-url> opentaiji
cd opentaiji
```

### 2.2 配置环境变量

```bash
# 进入生产配置目录
cd deployment/production

# 复制并编辑环境变量
cp .env.example .env
vim .env
```

### 2.3 关键配置项

#### 2.3.1 LLM 大模型接入

```env
# 已配置 MaaS 统一接入地址
LLM_BASE_URL=http://your-llm-gateway-url:port/v1
LLM_API_KEY=your-llm-api-key-here
LLM_TIMEOUT=60000
DEFAULT_LLM_MODEL=gpt-3.5-turbo
```

#### 2.3.2 数据库配置（必须修改默认密码！）

```env
DB_PASSWORD=your_strong_secure_password_here
REDIS_PASSWORD=your_strong_redis_password_here
```

#### 2.3.3 Grafana 管理员密码

```env
GRAFANA_ADMIN_PASSWORD=your_strong_grafana_password_here
```

### 2.4 消息平台配置

参见 [消息平台接入](#消息平台接入) 章节。

---

## 🚀 快速部署

### 3.1 一键启动

```bash
# 进入项目根目录
cd /path/to/opentaiji

# 启动完整 7 层服务集群
docker-compose -f deployment/production/docker-compose-prod.yml up -d

# 查看启动日志
docker-compose -f deployment/production/docker-compose-prod.yml logs -f
```

### 3.2 启动进度

```
┌─────────────────────────────────────────────────┐
│           启动进度跟踪                            │
├─────────────────────────────────────────────────┤
│  1. PostgreSQL         ████████████  100%  ✅  │
│  2. Redis              ████████████  100%  ✅  │
│  3. App 主应用 (2副本)  ████████░░░░   75%  ⏳  │
│  4. Prometheus         ████████░░░░   75%  ⏳  │
│  5. cAdvisor           ████████████  100%  ✅  │
│  6. Grafana            ████████░░░░   75%  ⏳  │
│  7. Nginx              ████████░░░░   75%  ⏳  │
└─────────────────────────────────────────────────┘
```

### 3.3 等待服务就绪

```bash
# 查看所有服务状态
docker-compose -f deployment/production/docker-compose-prod.yml ps

# 查看健康状态
watch 'docker inspect --format="{{.Name}}: {{.State.Health.Status}}" $(docker ps -q)'
```

**预计完全启动时间**: 3-5 分钟

---

## ✅ 服务验证

### 4.1 应用健康检查

```bash
# 主应用健康检查
curl http://localhost:3000/health

# 期望输出:
# {
#   "status": "ok",
#   "services": {
#     "database": "healthy",
#     "redis": "healthy",
#     "llm": "healthy",
#     "adapters": "healthy"
#   },
#   "version": "1.0.0",
#   "timestamp": "2026-04-20T13:50:00+08:00"
# }
```

### 4.2 LLM API 连通性测试

```bash
# 测试大模型接口连通性
curl http://localhost:3000/api/v1/health/llm

# 期望输出:
# {
#   "status": "ok",
#   "connected": true,
#   "latency_ms": 156,
#   "model": "gpt-3.5-turbo"
# }
```

### 4.3 完整验证清单

| 检查项 | 命令 | 期望结果 |
|--------|------|---------|
| 数据库连接 | `docker exec opentaiji-postgres pg_isready` | accepting connections |
| Redis 连接 | `docker exec opentaiji-redis redis-cli ping` | PONG |
| 应用 API | `curl http://localhost:3000/health` | status: ok |
| LLM API | `curl http://localhost:3000/api/v1/health/llm` | connected: true |
| Prometheus | `curl http://localhost:9090/-/healthy` | Prometheus is Healthy |
| Grafana | `curl http://localhost:3001/api/health` | ok |
| cAdvisor | `curl http://localhost:8080/healthz` | ok |

---

## 💬 消息平台接入

### 5.1 飞书 Feishu

#### 5.1.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 创建企业自建应用
3. 启用应用能力：机器人
4. 获取凭证：App ID, App Secret
5. 配置事件订阅：

```
请求地址: https://your-domain.com:3001/webhook/feishu
Verification Token: 在飞书后台生成
Encrypt Key: 在飞书后台生成
```

#### 5.1.2 配置环境变量

```env
FEISHU_ENABLED=true
FEISHU_APP_ID=cli_xxxxxxxxxxxx
FEISHU_APP_SECRET=your_app_secret
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key
```

### 5.2 微信 WeChat

#### 5.2.1 微信公众号配置

1. 访问 [微信公众平台](https://mp.weixin.qq.com/)
2. 启用开发模式
3. 获取 AppID 和 AppSecret
4. 配置服务器地址：

```
URL: https://your-domain.com:3002/webhook/wechat
Token: 自行设置的Token
EncodingAESKey: 随机生成或自动生成
```

#### 5.2.2 配置环境变量

```env
WECHAT_ENABLED=true
WECHAT_APP_ID=wx_xxxxxxxxxxxx
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token
WECHAT_ENCODING_AES_KEY=your_aes_key
```

### 5.3 企业微信 WeCom

#### 5.3.1 企业微信应用配置

1. 访问 [企业微信管理后台](https://work.weixin.qq.com/)
2. 创建应用
3. 获取 CorpID, AgentID, Secret
4. 配置接收消息服务器：

```
URL: https://your-domain.com:3003/webhook/wecom
Token: 自行设置
EncodingAESKey: 随机生成
```

#### 5.3.2 配置环境变量

```env
WECOM_ENABLED=true
WECOM_CORP_ID=ww_xxxxxxxxxxxx
WECOM_AGENT_ID=1000001
WECOM_SECRET=your_wecom_secret
WECOM_TOKEN=your_wecom_token
WECOM_ENCODING_AES_KEY=your_aes_key
```

### 5.4 钉钉 DingTalk

#### 5.4.1 钉钉机器人配置

1. 访问 [钉钉开放平台](https://open-dev.dingtalk.com/)
2. 创建企业内部应用
3. 获取 AppKey 和 AppSecret
4. 配置机器人回调：

```
URL: https://your-domain.com:3004/webhook/dingtalk
Token: 自行设置
EncodingAESKey: 随机生成
```

#### 5.4.2 配置环境变量

```env
DINGTALK_ENABLED=true
DINGTALK_APP_KEY=ding_xxxxxxxxxxxx
DINGTALK_APP_SECRET=your_dingtalk_app_secret
DINGTALK_TOKEN=your_dingtalk_token
DINGTALK_ENCODING_AES_KEY=your_aes_key
```

### 5.5 Webhook 验证测试

```bash
# 飞书 Webhook 测试
curl http://localhost:3001/webhook/feishu/health

# 微信 Webhook 测试
curl http://localhost:3002/webhook/wechat/health

# 企业微信 Webhook 测试
curl http://localhost:3003/webhook/wecom/health

# 钉钉 Webhook 测试
curl http://localhost:3004/webhook/dingtalk/health

# 所有响应应该返回: {"status":"ok","platform":"xxx"}
```

---

## 📊 监控告警

### 6.1 访问 Grafana

```
地址: http://your-server-ip:3001
用户名: admin
密码: 配置的 GRAFANA_ADMIN_PASSWORD
```

### 6.2 预设 Dashboard

| 看板名称 | 说明 |
|---------|------|
| LLM 适配器监控 | API请求、延迟、失败率、成本 |
| 系统资源监控 | CPU、内存、磁盘、网络 |
| 技能执行监控 | 技能调用次数、成功率、耗时 |
| 消息平台监控 | 消息收发量、各平台状态 |

### 6.3 告警规则

已配置 17 条生产级告警规则，包括：

| 级别 | 类型 | 触发条件 |
|------|------|---------|
| Critical | 服务宕机 | 任何服务不可达 ≥ 1分钟 |
| Critical | 高错误率 | API错误率 ≥ 5% ≥ 2分钟 |
| Critical | 熔断器触发 | 适配器熔断保护启动 |
| Warning | 高CPU | CPU ≥ 80% ≥ 5分钟 |
| Warning | 高内存 | 内存 ≥ 85% ≥ 5分钟 |
| Warning | 低磁盘 | 剩余空间 ≤ 10% |
| Warning | 高延迟 | P95 延迟 ≥ 500ms |
| Warning | 成本突增 | 小时成本超过阈值 |

---

## 🔧 日常运维

### 7.1 服务管理

```bash
# 查看所有服务状态
docker-compose -f deployment/production/docker-compose-prod.yml ps

# 查看日志
docker-compose -f deployment/production/docker-compose-prod.yml logs -f

# 查看特定服务日志
docker-compose -f deployment/production/docker-compose-prod.yml logs -f app

# 重启服务
docker-compose -f deployment/production/docker-compose-prod.yml restart app

# 滚动更新应用
docker-compose -f deployment/production/docker-compose-prod.yml up -d --no-deps --scale app=3 app
# 等待新副本健康后
docker-compose -f deployment/production/docker-compose-prod.yml up -d --no-deps --scale app=2 app
```

### 7.2 数据备份

```bash
# PostgreSQL 备份
docker exec opentaiji-postgres pg_dump -U opentaiji opentaiji_production > backup_$(date +%Y%m%d).sql

# Redis 备份
docker exec opentaiji-redis redis-cli BGSAVE
docker cp opentaiji-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb

# 配置备份
tar -czf config_backup_$(date +%Y%m%d).tar.gz deployment/production/.env
```

### 7.3 版本升级

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 构建新镜像
docker-compose -f deployment/production/docker-compose-prod.yml build app

# 3. 滚动更新（零停机）
docker-compose -f deployment/production/docker-compose-prod.yml up -d --no-deps app

# 4. 验证
curl http://localhost:3000/health
```

---

## 🔍 故障排查

### 8.1 服务无法启动

```bash
# 查看详细日志
docker logs opentaiji-app --tail 100

# 检查配置文件
docker exec opentaiji-app cat .env

# 检查网络连通性
docker exec opentaiji-app ping -c 3 postgres
docker exec opentaiji-app ping -c 3 redis
docker exec opentaiji-app curl -v http://your-llm-gateway-url:port/v1
```

### 8.2 LLM API 调用失败

```bash
# 检查 LLM API 连通性
docker exec opentaiji-app curl -v http://your-llm-gateway-url:port/v1/models

# 验证 API Key
docker exec opentaiji-app curl -X POST \
  http://your-llm-gateway-url:port/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}'
```

### 8.3 Webhook 接收失败

```bash
# 检查端口是否监听
netstat -tlnp | grep 300[1-4]

# 检查公网连通性
# 从外部访问测试
curl https://your-domain.com:3001/webhook/feishu/health

# 检查防火墙
ufw status
iptables -L -n
```

### 8.4 性能问题排查

```bash
# 查看容器资源使用
docker stats

# 查看 Prometheus 指标
# Grafana: 打开 System Resources 看板

# 数据库慢查询
docker exec opentaiji-postgres psql -U opentaiji -c "
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

---

## 📞 技术支持

如遇问题，请收集以下信息：

```bash
# 系统信息
uname -a
docker --version
docker-compose --version

# 服务状态
docker ps -a

# 最近日志
docker logs opentaiji-app --tail 50
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-20  
**维护者**: Ella (DevOps工程师)
