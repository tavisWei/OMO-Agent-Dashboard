#!/bin/bash

# ===========================================
# OMO Agent Dashboard 启动脚本
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"
LOG_FILE="$PROJECT_DIR/data/logs/dashboard.log"

# 创建日志目录
mkdir -p "$PROJECT_DIR/data/logs"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# 检查是否已运行
is_running() {
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# 启动服务
start() {
    cd "$PROJECT_DIR"
    
    if is_running; then
        PID=$(cat "$PID_FILE")
        warn "服务已在运行 (PID: $PID)"
        return 1
    fi
    
    log "🚀 启动 OMO Agent Dashboard..."
    
    # 检查 node_modules
    if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
        warn "依赖未安装，正在安装..."
        npm install
    fi
    
    # 启动服务
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    PID=$!
    
    # 保存 PID
    echo "$PID" > "$PID_FILE"
    
    # 等待服务启动
    sleep 3
    
    # 检查是否启动成功
    if is_running; then
        log "✅ 服务启动成功!"
        log "   PID: $PID"
        log "   日志: $LOG_FILE"
        log "   访问: http://localhost:3002"
    else
        error "服务启动失败，请查看日志: $LOG_FILE"
        exit 1
    fi
}

# 显示状态
status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ 服务运行中${NC}"
        echo "   PID: $PID"
        echo "   日志: $LOG_FILE"
        
        # 显示最近日志
        if [[ -f "$LOG_FILE" ]]; then
            echo ""
            echo "最近日志 (最后 5 行):"
            tail -5 "$LOG_FILE" | sed 's/^/   /'
        fi
    else
        echo -e "${YELLOW}⚠️  服务未运行${NC}"
        echo "   使用 ./scripts/start.sh 启动服务"
    fi
}

# 主逻辑
case "${1:-}" in
    start)
        start
        ;;
    status)
        status
        ;;
    *)
        echo "用法: $0 {start|status}"
        echo ""
        echo "选项:"
        echo "  start   启动服务"
        echo "  status  查看服务状态"
        ;;
esac
