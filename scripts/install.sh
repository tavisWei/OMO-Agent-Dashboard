#!/bin/bash

# ===========================================
# OMO Agent Dashboard 一键安装脚本
# ===========================================

set -e

echo "🚀 开始安装 OMO Agent Dashboard..."

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo "debian"
        elif command -v yum &> /dev/null; then
            echo "rhel"
        elif command -v pacman &> /dev/null; then
            echo "arch"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "📋 检测到操作系统: $OS"

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js 18+"
        echo "   访问 https://nodejs.org/ 下载安装"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -lt 18 ]]; then
        echo "❌ Node.js 版本过低，需要 18+，当前版本: $(node -v)"
        exit 1
    fi
    echo "✅ Node.js 版本: $(node -v)"
}

# 检查 npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo "❌ npm 未安装"
        exit 1
    fi
    echo "✅ npm 版本: $(npm -v)"
}

# 安装系统依赖 (Linux)
install_linux_deps() {
    echo "📦 安装系统依赖..."
    
    if [[ "$OS" == "debian" ]]; then
        sudo apt-get update
        sudo apt-get install -y \
            build-essential \
            python3 \
            libsqlite3-dev \
            libsecret-1-dev \
            libwebkit2gtk-4.1-dev \
            libnotify-dev \
            libayatana-appindicator3-dev
    elif [[ "$OS" == "rhel" ]]; then
        sudo yum install -y \
            gcc \
            gcc-c++ \
            make \
            python3 \
            sqlite-devel \
            libsecret-devel
    elif [[ "$OS" == "arch" ]]; then
        sudo pacman -S --noconfirm \
            base-devel \
            python \
            sqlite \
            libsecret \
            webkit2gtk
    fi
    
    echo "✅ 系统依赖安装完成"
}

# 主安装流程
main() {
    check_node
    check_npm
    
    # Linux 系统额外依赖
    if [[ "$OS" == "linux" ]]; then
        read -p "是否安装系统依赖? (需要 sudo 权限) [Y/n]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            install_linux_deps
        fi
    fi
    
    # 安装 npm 依赖
    echo "📦 安装 npm 依赖..."
    npm install
    
    # 配置国内镜像源（可选）
    read -p "是否配置国内 npm 镜像源? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm config set registry https://registry.npmmirror.com
        echo "✅ 已配置 npm 镜像源"
    fi
    
    echo ""
    echo "=========================================="
    echo "✅ 安装完成！"
    echo "=========================================="
    echo ""
    echo "下一步操作:"
    echo "  启动开发服务器: npm run dev"
    echo "  生产构建:       npm run build"
    echo "  运行测试:       npm run test:run"
    echo ""
    echo "详细运维脚本:"
    echo "  ./scripts/install.sh    # 重新安装依赖"
    echo "  ./scripts/start.sh      # 启动服务"
    echo "  ./scripts/stop.sh       # 停止服务"
    echo "  ./scripts/restart.sh    # 重启服务"
    echo "  ./scripts/status.sh     # 查看状态"
    echo "  ./scripts/logs.sh       # 查看日志"
    echo ""
}

main "$@"
