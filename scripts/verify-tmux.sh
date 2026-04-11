#!/bin/bash

# ===========================================
# OMO Agent Dashboard - tmux Session 验证
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

echo "=== tmux Session Detection Verification ==="
echo ""

# 1. Check tmux is installed
info "1. Checking tmux installation..."
if command -v tmux &> /dev/null; then
    TMUX_VERSION=$(tmux -V 2>/dev/null || echo "unknown")
    pass "tmux installed ($TMUX_VERSION)"
else
    fail "tmux not installed"
    echo "   Cannot continue without tmux"
    exit 1
fi

# 2. Check tmux server is running
info "2. Checking tmux server..."
if tmux list-sessions 2>/dev/null | grep -q "."; then
    pass "tmux server running"
    info "Active sessions:"
    tmux list-sessions 2>/dev/null | while read -r session; do
        info "  - $session"
    done
else
    fail "tmux server not running or no sessions"
fi

# 3. Check API endpoint for tmux status
info "3. Checking tmux API endpoint..."
TMUX_API_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/tmux 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$TMUX_API_RESPONSE" | tail -n1)
BODY=$(echo "$TMUX_API_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
    if echo "$BODY" | python3 -m json.tool > /dev/null 2>&1; then
        pass "tmux API responding (HTTP 200)"
        # Check session count
        SESSION_COUNT=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sessions', []).__len__())" 2>/dev/null || echo "0")
        info "Detected $SESSION_COUNT tmux sessions"
    else
        fail "tmux API returned invalid JSON"
    fi
else
    fail "tmux API not responding (HTTP $HTTP_CODE)"
fi

# 4. Check tmux.ts route exists
info "4. Checking tmux route implementation..."
TMUX_ROUTE="$PROJECT_DIR/src/server/routes/tmux.ts"
if [[ -f "$TMUX_ROUTE" ]]; then
    pass "tmux route file exists"
else
    fail "tmux route file not found"
fi

# 5. Check agent status uses tmux
info "5. Checking agent status integration..."
if [[ -f "$TMUX_ROUTE" ]]; then
    if grep -q "tmux" "$TMUX_ROUTE" 2>/dev/null; then
        pass "tmux integration found in route"
    else
        fail "tmux integration not found in route"
    fi
fi

# Summary
echo ""
echo "=== tmux Session Detection Summary ==="
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ tmux session detection verification PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ tmux session detection verification FAILED${NC}"
    exit 1
fi