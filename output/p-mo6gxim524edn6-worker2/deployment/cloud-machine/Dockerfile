# OpenTaiji 云电脑部署Dockerfile
# 生产级完美标准版本

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production=false

# 复制源码
COPY . .

# 质量门禁检查：编译 + 类型检查
RUN npm run build

# 质量门禁检查：Lint零警告
RUN npm run lint

# 质量门禁检查：单元测试100%通过 + 覆盖率≥85%
RUN npm run test -- --coverage

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# 安全：非root用户运行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 只复制生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 从构建阶段复制编译产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

# 配置文件
COPY .env.example .env
COPY --chown=nestjs:nodejs ./deployment/production/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)}).on('error', () => process.exit(1))"

# 暴露端口
EXPOSE 3000

# 使用非root用户
USER nestjs

# 启动命令
ENTRYPOINT ["/entrypoint.sh"]
