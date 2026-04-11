#!/bin/bash

# ===========================================
# OMO Agent Dashboard - 完整验证脚本
# 运行所有验证检查并报告结果
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

TOTAL_PASS=0
TOTAL_FAIL=0

run_check() {
    local name="$1"
    local script="$2"
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  Running: $name${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [[ -f "$SCRIPT_DIR/$script" ]]; then
        if bash "$SCRIPT_DIR/$script"; then
            echo -e "${GREEN}✓ $name PASSED${NC}"
            ((TOTAL_PASS++))
        else
            echo -e "${RED}✗ $name FAILED${NC}"
            ((TOTAL_FAIL++))
        fi
    else
        echo -e "${RED}✗ Script not found: $script${NC}"
        ((TOTAL_FAIL++))
    fi
}

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   OMO Agent Dashboard - Verification      ║${NC}"
echo -e "${BLUE}║   End-to-End System Check                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "Starting verification at $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Run all verification checks
run_check "Kanban Board Test" "verify-kanban.sh"
run_check "Agent Status Test" "verify-agents.sh"
run_check "WebSocket Connection Test" "verify-websocket.sh"
run_check "tmux Session Detection Test" "verify-tmux.sh"

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Verification Summary            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Checks passed: ${GREEN}$TOTAL_PASS${NC}"
echo -e "Checks failed: ${RED}$TOTAL_FAIL${NC}"
echo ""

if [[ $TOTAL_FAIL -eq 0 ]]; then
    echo -e "${GREEN}✓ ALL VERIFICATIONS PASSED${NC}"
    echo ""
    echo "System is ready for use!"
    exit 0
else
    echo -e "${RED}✗ SOME VERIFICATIONS FAILED${NC}"
    echo ""
    echo "Please review the failed checks above."
    exit 1
fi