#!/bin/bash

# ===========================================
# OMO Agent Dashboard 停止脚本
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# 检查是否运行
is_running() {
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# 停止服务
stop() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        log "🛑 停止服务 (PID: $PID)..."
        
        # 优雅停止 (发送 SIGTERM)
        kill -15 "$PID" 2>/dev/null || true
        
        # 等待最多 10 秒
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # 强制杀死 (如果还在运行)
        if kill -0 "$PID" 2>/dev/null; then
            warn "服务未能优雅停止，强制杀死..."
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        # 删除 PID 文件
        rm -f "$PID_FILE"
        
        log "✅ 服务已停止"
    else
        warn "服务未运行"
    fi
}

# 强制停止 (用于异常情况)
force_stop() {
    log "🛑 强制停止所有相关进程..."
    
    # 杀死所有 node 进程 (慎重)
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true
    
    rm -f "$PID_FILE"
    
    log "✅ 强制停止完成"
}

# 主逻辑
case "${1:-}" in
    stop)
        stop
        ;;
    force)
        force_stop
        ;;
    *)
        echo "用法: $0 {stop|force}"
        echo ""
        echo "选项:"
        echo "  stop   优雅停止服务 (发送 SIGTERM)"
        echo "  force  强制停止服务 (发送 SIGKILL)"
        ;;
esac
