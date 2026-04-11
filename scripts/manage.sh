#!/bin/bash

# ===========================================
# OMO Agent Dashboard 运维主菜单
# ===========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_menu() {
    clear
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   OMO Agent Dashboard 运维管理 ${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} 安装依赖 (npm install)"
    echo -e "  ${GREEN}2.${NC} 启动服务"
    echo -e "  ${YELLOW}3.${NC} 停止服务"
    echo -e "  ${YELLOW}4.${NC} 重启服务"
    echo -e "  ${BLUE}5.${NC} 查看状态"
    echo -e "  ${BLUE}6.${NC} 查看日志"
    echo -e "  ${MAGENTA}7.${NC} 查看错误日志"
    echo -e "  ${CYAN}8.${NC} 清理日志"
    echo -e "  ${GREEN}9.${NC} 完整状态报告"
    echo -e "  ${RED}0.${NC} 退出"
    echo ""
    echo -ne "${CYAN}请选择操作 [0-9]: ${NC}"
}

# 检查服务状态
check_status() {
    PID_FILE="$SCRIPT_DIR/../data/dashboard.pid"
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${GREEN}运行中 (PID: $PID)${NC}"
            return 0
        fi
    fi
    echo -e "${YELLOW}未运行${NC}"
    return 1
}

# 主循环
while true; do
    show_menu
    read -n 1 -s choice
    echo ""
    echo ""
    
    case $choice in
        1)
            echo -e "${GREEN}📦 安装依赖...${NC}"
            "$SCRIPT_DIR/install.sh"
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        2)
            echo -e "${GREEN}🚀 启动服务...${NC}"
            "$SCRIPT_DIR/start.sh" start
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        3)
            echo -e "${YELLOW}🛑 停止服务...${NC}"
            "$SCRIPT_DIR/stop.sh" stop
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        4)
            echo -e "${YELLOW}🔄 重启服务...${NC}"
            "$SCRIPT_DIR/restart.sh"
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        5)
            echo -e "${BLUE}📊 服务状态:${NC}"
            "$SCRIPT_DIR/status.sh" status
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        6)
            echo -e "${BLUE}📝 日志查看:${NC}"
            "$SCRIPT_DIR/logs.sh" tail 30
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        7)
            echo -e "${MAGENTA}⚠️  错误日志:${NC}"
            "$SCRIPT_DIR/logs.sh" error
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        8)
            echo -e "${CYAN}🗑️  清理日志...${NC}"
            "$SCRIPT_DIR/logs.sh" clear
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        9)
            echo -e "${GREEN}📋 完整状态报告:${NC}"
            "$SCRIPT_DIR/status.sh" status
            echo ""
            echo -ne "${YELLOW}按任意键继续...${NC}"
            read -n 1 -s
            ;;
        0)
            echo -e "${GREEN}👋 再见!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选择，请重试${NC}"
            sleep 1
            ;;
    esac
done
