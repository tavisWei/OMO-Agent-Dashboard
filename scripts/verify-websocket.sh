#!/bin/bash

# ===========================================
# OMO Agent Dashboard - WebSocket 验证
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

echo "=== WebSocket Connection Verification ==="
echo ""

# 1. Check backend port is listening
info "1. Checking backend port (3001)..."
if ss -tlnp 2>/dev/null | grep -q ":3001"; then
    pass "Backend port 3001 is listening"
elif netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    pass "Backend port 3001 is listening"
else
    fail "Backend port 3001 is not listening"
fi

# 2. Check frontend port is listening
info "2. Checking frontend port (3002)..."
if ss -tlnp 2>/dev/null | grep -q ":3002"; then
    pass "Frontend port 3002 is listening"
elif netstat -tlnp 2>/dev/null | grep -q ":3002"; then
    pass "Frontend port 3002 is listening"
else
    fail "Frontend port 3002 is not listening"
fi

# 3. Test WebSocket connection using Python
info "3. Testing WebSocket connection..."
WEBSOCKET_TEST=$(python3 << 'EOF'
import sys
try:
    import websocket
    ws = websocket.create_connection("ws://localhost:3001", timeout=5)
    ws.close()
    print("success")
except Exception as e:
    print(f"failed: {e}")
    sys.exit(1)
EOF
)

if echo "$WEBSOCKET_TEST" | grep -q "success"; then
    pass "WebSocket connection established"
else
    fail "WebSocket connection failed: $WEBSOCKET_TEST"
fi

# 4. Check WebSocket upgrade header via HTTP
info "4. Checking WebSocket upgrade support..."
WS_CHECK=$(curl -s -i http://localhost:3001 2>/dev/null | head -10 || echo "")
if echo "$WS_CHECK" | grep -qi "upgrade\|websocket"; then
    pass "WebSocket upgrade header present"
else
    # Not a failure if connection worked, just couldn't check header
    info "WebSocket upgrade header not in response (may be expected)"
fi

# 5. Check that frontend connects to WebSocket
info "5. Checking frontend WebSocket client..."
FRONTEND_PAGE=$(curl -s http://localhost:3002 2>/dev/null || echo "")
if echo "$FRONTEND_PAGE" | grep -q "ws://\|wss://\|websocket"; then
    pass "Frontend has WebSocket client code"
else
    # May still work if WS URL is built dynamically
    info "WebSocket client code not visible in HTML (may be bundled)"
fi

# Summary
echo ""
echo "=== WebSocket Verification Summary ==="
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ WebSocket verification PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ WebSocket verification FAILED${NC}"
    exit 1
fi