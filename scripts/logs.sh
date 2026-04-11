#!/bin/bash

# ===========================================
# OMO Agent Dashboard 日志查看脚本
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/data/logs/dashboard.log"

# 颜色定义
BLUE='\033[0;34m'
NC='\033[0m'

# 默认行数
LINES=${1:-50}

# 主逻辑
case "${1:-}" in
    "" | "tail")
        echo -e "${BLUE}📝 查看最近 $LINES 行日志:${NC}"
        echo ""
        if [[ -f "$LOG_FILE" ]]; then
            tail -n "$LINES" "$LOG_FILE"
        else
            echo "日志文件不存在: $LOG_FILE"
        fi
        ;;
    "follow"|"f")
        echo -e "${BLUE}📝 实时日志 (Ctrl+C 退出):${NC}"
        echo ""
        if [[ -f "$LOG_FILE" ]]; then
            tail -f "$LOG_FILE"
        else
            echo "日志文件不存在: $LOG_FILE"
        fi
        ;;
    "clear")
        echo -e "${BLUE}🗑️  清理日志...${NC}"
        if [[ -f "$LOG_FILE" ]]; then
            > "$LOG_FILE"
            echo "日志已清空"
        else
            echo "日志文件不存在"
        fi
        ;;
    "error")
        echo -e "${BLUE}📝 错误日志:${NC}"
        echo ""
        if [[ -f "$LOG_FILE" ]]; then
            grep -i "error\|exception\|fatal" "$LOG_FILE" | tail -50
        else
            echo "日志文件不存在: $LOG_FILE"
        fi
        ;;
    *)
        echo "用法: $0 {tail [n]|follow|clear|error}"
        echo ""
        echo "选项:"
        echo "  tail [n]   查看最近 n 行日志 (默认 50)"
        echo "  follow     实时跟踪日志 (Ctrl+C 退出)"
        echo "  clear      清空日志文件"
        echo "  error      查看错误日志"
        ;;
esac
