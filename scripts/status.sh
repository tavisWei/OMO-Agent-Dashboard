#!/bin/bash

# ===========================================
# OMO Agent Dashboard 状态查看脚本
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"
LOG_FILE="$PROJECT_DIR/data/logs/dashboard.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 显示详细信息
show_status() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   OMO Agent Dashboard 状态${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # 进程状态
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ 服务状态: 运行中${NC}"
        echo "   PID: $PID"
        echo "   启动时间: $(ps -o lstart= -p "$PID" 2>/dev/null || echo '未知')"
        echo "   运行时间: $(ps -o etime= -p "$PID" 2>/dev/null || echo '未知')"
    else
        echo -e "${YELLOW}⚠️  服务状态: 未运行${NC}"
    fi
    
    echo ""
    
    # 端口检查
    echo "📡 端口检查:"
    if command -v ss &> /dev/null; then
        PORT_INFO=$(ss -tlnp 2>/dev/null | grep 3001 || echo "  端口 3001 未监听")
    elif command -v netstat &> /dev/null; then
        PORT_INFO=$(netstat -tlnp 2>/dev/null | grep 3001 || echo "  端口 3001 未监听")
    else
        PORT_INFO="  (无法检查端口，缺少 ss 或 netstat)"
    fi
    echo "$PORT_INFO" | sed 's/^/   /'
    
    echo ""
    
    # 日志信息
    echo "📝 日志文件:"
    if [[ -f "$LOG_FILE" ]]; then
        echo "   路径: $LOG_FILE"
        echo "   大小: $(du -h "$LOG_FILE" | cut -f1)"
        echo ""
        echo "最近日志 (最后 10 行):"
        tail -10 "$LOG_FILE" | sed 's/^/   /'
    else
        echo "   路径: $LOG_FILE"
        echo "   状态: 日志文件不存在"
    fi
    
    echo ""
    
    # 数据库信息
    echo "💾 数据库:"
    DB_FILE="$PROJECT_DIR/data/dashboard.db"
    if [[ -f "$DB_FILE" ]]; then
        echo "   路径: $DB_FILE"
        echo "   大小: $(du -h "$DB_FILE" | cut -f1)"
    else
        echo "   路径: $DB_FILE"
        echo "   状态: 数据库文件不存在 (首次运行会自动创建)"
    fi
    
    echo ""
    
    # 系统资源
    echo "🖥️  系统资源:"
    if is_running; then
        PID=$(cat "$PID_FILE")
        CPU=$(ps -o %cpu= -p "$PID" 2>/dev/null || echo "N/A")
        MEM=$(ps -o %mem= -p "$PID" 2>/dev/null || echo "N/A")
        echo "   CPU: ${CPU}%"
        echo "   内存: ${MEM}%"
    fi
    
    echo ""
    echo "=========================================="
}

# 主逻辑
case "${1:-}" in
    "" | "status")
        show_status
        ;;
    log|logs)
        if [[ -f "$LOG_FILE" ]]; then
            echo "📝 实时日志 (Ctrl+C 退出):"
            tail -f "$LOG_FILE"
        else
            echo "日志文件不存在: $LOG_FILE"
        fi
        ;;
    *)
        echo "用法: $0 {status|logs}"
        ;;
esac
