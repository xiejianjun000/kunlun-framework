#!/bin/bash

# 昆仑框架 Web 界面启动脚本

echo "===================================="
echo "  昆仑框架 Web 聊天界面启动器"
echo "===================================="
echo ""

cd "$(dirname "$0")"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
fi

# 检查端口占用
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 3000 已被占用"
    echo "   访问 http://localhost:3000 查看"
else
    echo "🚀 启动开发服务器..."
    echo "   访问 http://localhost:3000"
    echo ""
    npm run dev
fi
