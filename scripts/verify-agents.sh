#!/bin/bash

# ===========================================
# OMO Agent Dashboard - Agent Status 验证
# ===========================================

set -e

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
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL_COUNT++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "=== Agent Status Monitoring Verification ==="
echo ""

# 1. Check Agents API
info "1. Checking Agents API..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/agents 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
BODY=$(echo "$API_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
    if echo "$BODY" | python3 -m json.tool > /dev/null 2>&1; then
        pass "Agents API responding (HTTP 200)"
    else
        fail "Agents API returned invalid JSON"
    fi
else
    fail "Agents API not responding (HTTP $HTTP_CODE)"
fi

# 2. Check agent data structure
info "2. Checking agent data fields..."
AGENTS_JSON=$(curl -s http://localhost:3001/api/agents 2>/dev/null || echo "[]")
if echo "$AGENTS_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if isinstance(data, list) and len(data) > 0:
    agent = data[0]
    required = ['id', 'name', 'status']
    if all(k in agent for k in required):
        print('valid')
    else:
        print('missing_fields')
else:
    print('valid')
" 2>/dev/null | grep -q "valid"; then
    pass "Agent data structure valid"
else
    fail "Agent data structure invalid or missing fields"
fi

# 3. Check Projects API
info "3. Checking Projects API..."
PROJECTS_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/projects 2>/dev/null || echo "000")
if [[ "$PROJECTS_RESPONSE" == "200" ]]; then
    pass "Projects API responding"
else
    fail "Projects API not responding (HTTP $PROJECTS_RESPONSE)"
fi

# 4. Check frontend agents page
info "4. Checking agents page..."
AGENTS_PAGE=$(curl -s -w "%{http_code}" http://localhost:3002/agents 2>/dev/null || echo "000")
if [[ "$AGENTS_PAGE" == "200" ]]; then
    pass "Agents page loads"
else
    fail "Agents page not found (HTTP $AGENTS_PAGE)"
fi

# 5. Check agent status indicators in frontend
info "5. Checking agent status indicators..."
if echo "$AGENTS_PAGE" | grep -q "running\|idle\|error\|运行\|空闲\|错误"; then
    pass "Agent status indicators visible"
else
    fail "Agent status indicators not found"
fi

# Summary
echo ""
echo "=== Agent Status Verification Summary ==="
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ Agent status verification PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ Agent status verification FAILED${NC}"
    exit 1
fi