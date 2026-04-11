#!/bin/bash

# ===========================================
# OMO Agent Dashboard 一键安装脚本
# ===========================================

set -e

echo "🚀 开始安装 OMO Agent Dashboard..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

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

check_npm() {
    if ! command -v npm &> /dev/null; then
        echo "❌ npm 未安装"
        exit 1
    fi
    echo "✅ npm 版本: $(npm -v)"
}

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
            libayatana-appindicator3-dev \
            libglib2.0-dev \
            libnss3 \
            libnspr4
    elif [[ "$OS" == "rhel" ]]; then
        sudo yum install -y \
            gcc \
            gcc-c++ \
            make \
            python3 \
            sqlite-devel \
            libsecret-devel \
            glib2 \
            nss \
            nspr
    elif [[ "$OS" == "arch" ]]; then
        sudo pacman -S --noconfirm \
            base-devel \
            python \
            sqlite \
            libsecret \
            webkit2gtk \
            glib2 \
            nss \
            nspr
    fi
    
    echo "✅ 系统依赖安装完成"
}

init_directories() {
    echo "📁 初始化目录结构..."
    
    mkdir -p "$PROJECT_DIR/data"
    mkdir -p "$PROJECT_DIR/data/logs"
    mkdir -p "$PROJECT_DIR/data/backups"
    
    echo "   ✅ data/"
    echo "   ✅ data/logs/"
    echo "   ✅ data/backups/"
}

init_database() {
    echo "💾 初始化数据库..."
    
    DB_FILE="$PROJECT_DIR/data/dashboard.db"
    
    if [[ -f "$DB_FILE" ]]; then
        echo "   ℹ️  数据库已存在: $DB_FILE"
    else
        echo "   ✅ 数据库将在首次启动时自动创建"
    fi
}

check_omo_config() {
    echo "🔧 检查 OMO 配置文件..."
    
    OMO_CONFIG_PATH="${OMO_CONFIG_PATH:-$HOME/.config/opencode/oh-my-opencode.jsonc}"
    
    if [[ -f "$OMO_CONFIG_PATH" ]]; then
        echo "   ✅ OMO 配置已存在: $OMO_CONFIG_PATH"
        
        if command -v node &> /dev/null; then
            echo "   🔍 验证配置文件格式..."
            if node -e "JSON.parse(require('fs').readFileSync('$OMO_CONFIG_PATH', 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))" 2>/dev/null; then
                echo "   ✅ 配置文件格式正确"
            else
                echo "   ⚠️  配置文件格式可能有误，请手动检查"
            fi
        fi
    else
        echo "   ⚠️  OMO 配置文件不存在: $OMO_CONFIG_PATH"
        echo "   📝 创建一个示例配置..."
        
        mkdir -p "$(dirname "$OMO_CONFIG_PATH")"
        
        cat > "$OMO_CONFIG_PATH" << 'EOF'
{
  // OMO 配置文件
  // 文档: https://github.com/code-yeongyu/oh-my-opencode
  "version": "3.0",
  "agents": [
    {
      "name": "sisyphus",
      "model": "anthropic/claude-opus-4-5",
      "temperature": 0.7,
      "description": "主任务编排器"
    },
    {
      "name": "oracle",
      "model": "anthropic/claude-sonnet-4-6",
      "temperature": 0.5,
      "description": "调试专家"
    },
    {
      "name": "explore",
      "model": "openai/gpt-4o",
      "temperature": 0.8,
      "description": "代码搜索"
    }
  ]
}
EOF
        echo "   ✅ 示例配置已创建: $OMO_CONFIG_PATH"
        echo "   💡 请根据需要修改配置"
    fi
}

install_playwright() {
    echo "🎭 安装 Playwright 浏览器..."
    
    if command -v npx &> /dev/null; then
        cd "$PROJECT_DIR"
        
        if [[ "$OS" == "debian" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "arch" ]]; then
            npx playwright install chromium 2>/dev/null || {
                echo "   ⚠️  Playwright 浏览器安装失败，请手动运行: npx playwright install chromium"
            }
        else
            npx playwright install 2>/dev/null || {
                echo "   ℹ️  可选: 运行 'npx playwright install' 安装浏览器"
            }
        fi
        
        echo "   ✅ Playwright 安装完成"
    fi
}

main() {
    check_node
    check_npm
    
    if [[ "$OS" == "linux" ]]; then
        read -p "是否安装系统依赖? (需要 sudo 权限) [Y/n]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            install_linux_deps
        fi
    fi
    
    init_directories
    
    echo "📦 安装 npm 依赖..."
    npm install --prefer-offline 2>/dev/null || npm install
    
    init_database
    check_omo_config
    
    read -p "是否安装 Playwright 浏览器 (用于 E2E 测试)? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_playwright
    fi
    
    echo ""
    echo "=========================================="
    echo "✅ 安装完成！"
    echo "=========================================="
    echo ""
    echo "🚀 快速启动:"
    echo "   ./scripts/start.sh"
    echo ""
    echo "📝 查看状态:"
    echo "   ./scripts/status.sh"
    echo ""
    echo "🌐 访问: http://localhost:3001"
    echo ""
}

main "$@"
