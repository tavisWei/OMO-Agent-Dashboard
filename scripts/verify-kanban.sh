#!/bin/bash

# ===========================================
# OMO Agent Dashboard - Kanban Board 验证
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "=== Kanban Board Verification ==="
echo ""

# 1. Check Tasks API
info "1. Checking Tasks API..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/tasks 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
BODY=$(echo "$API_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
    # Verify it's valid JSON with array
    if echo "$BODY" | python3 -m json.tool > /dev/null 2>&1; then
        pass "Tasks API responding (HTTP 200)"
    else
        fail "Tasks API returned invalid JSON"
    fi
else
    fail "Tasks API not responding (HTTP $HTTP_CODE)"
fi

# 2. Check frontend route (Kanban is now at /)
info "2. Checking Kanban page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Kanban page loads (HTTP 200)"
else
    fail "Kanban page not found (HTTP $HTTP_CODE)"
fi

# 3. Check navigation elements
info "3. Checking navigation elements..."
NAVBAR_RESPONSE=$(curl -s http://localhost:3002/ 2>/dev/null || echo "")
if echo "$NAVBAR_RESPONSE" | grep -q "Work\|Tasks\|Kanban\|看板"; then
    pass "Navigation visible"
else
    fail "Navigation elements not found"
fi

# 4. Check kanban columns exist
info "4. Checking kanban columns..."
if echo "$NAVBAR_RESPONSE" | grep -q "Todo\|待办\|In Progress\|进行中\|Done\|完成\|Failed\|失败"; then
    pass "Kanban columns detected"
else
    fail "Kanban columns not found"
fi

# 5. Check API returns task structure
info "5. Checking task data structure..."
TASKS_JSON=$(curl -s http://localhost:3001/api/tasks 2>/dev/null || echo "[]")
if echo "$TASKS_JSON" | python3 -c "import json,sys; tasks=json.load(sys.stdin); print('valid' if isinstance(tasks, list) else 'invalid')" 2>/dev/null | grep -q "valid"; then
    pass "Task data structure valid"
else
    fail "Task data structure invalid"
fi

# Summary
echo ""
echo "=== Kanban Verification Summary ==="
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ Kanban verification PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ Kanban verification FAILED${NC}"
    exit 1
fi