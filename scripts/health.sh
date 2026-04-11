#!/bin/bash

# ===========================================
# OMO Agent Dashboard 健康检查脚本
# 用于 Docker / K8s / 监控平台
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"

# 检查进程
check_process() {
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "OK - process running (PID: $PID)"
            return 0
        fi
    fi
    echo "FAIL - process not running"
    return 1
}

# 检查端口
check_port() {
    if command -v ss &> /dev/null; then
        if ss -tlnp 2>/dev/null | grep -q 3001; then
            echo "OK - port 3001 listening"
            return 0
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tlnp 2>/dev/null | grep -q 3001; then
            echo "OK - port 3001 listening"
            return 0
        fi
    fi
    echo "FAIL - port 3001 not listening"
    return 1
}

# 检查 HTTP
check_http() {
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE" == "200" ]]; then
            echo "OK - HTTP 200"
            return 0
        fi
        echo "FAIL - HTTP $HTTP_CODE"
        return 1
    fi
    # 如果没有 curl，只检查端口
    check_port
}

# 检查磁盘空间
check_disk() {
    DISK_USAGE=$(df "$PROJECT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ "$DISK_USAGE" -lt 90 ]]; then
        echo "OK - disk usage ${DISK_USAGE}%"
        return 0
    fi
    echo "WARN - disk usage ${DISK_USAGE}%"
    return 1
}

# 检查内存
check_memory() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        MEM=$(ps -o %mem= -p "$PID" 2>/dev/null || echo "0")
        MEM_INT=${MEM%.*}  # 去掉小数
        if [[ "$MEM_INT" -lt 80 ]]; then
            echo "OK - memory ${MEM}%"
            return 0
        fi
        echo "WARN - memory ${MEM}%"
        return 1
    fi
    return 0
}

is_running() {
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# 帮助
show_help() {
    echo "用法: $0 {process|port|http|disk|memory|all}"
    echo ""
    echo "检查项:"
    echo "  process  检查进程状态"
    echo "  port     检查端口监听"
    echo "  http     检查 HTTP 响应"
    echo "  disk     检查磁盘空间"
    echo "  memory   检查内存使用"
    echo "  all      检查所有项 (默认)"
}

# 主逻辑
case "${1:-all}" in
    process)
        check_process
        ;;
    port)
        check_port
        ;;
    http)
        check_http
        ;;
    disk)
        check_disk
        ;;
    memory)
        check_memory
        ;;
    all)
        echo "=== OMO Agent Dashboard 健康检查 ==="
        echo ""
        check_process
        check_port
        check_http
        check_disk
        check_memory
        echo ""
        echo "检查完成: $(date '+%Y-%m-%d %H:%M:%S')"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "未知选项: $1"
        show_help
        exit 1
        ;;
esac
