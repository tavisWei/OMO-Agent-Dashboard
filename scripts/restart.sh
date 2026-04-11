#!/bin/bash

# ===========================================
# OMO Agent Dashboard 重启脚本
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# 停止服务
"$SCRIPT_DIR/stop.sh" stop

# 等待一下
sleep 2

# 启动服务
"$SCRIPT_DIR/start.sh" start
