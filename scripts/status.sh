#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"
LOG_FILE="$PROJECT_DIR/data/logs/dashboard.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

is_running() {
  if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

show_status() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}   OMO Agent Dashboard 状态${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

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
  echo "📡 端口检查:"
  echo "   后端 3001: $(lsof -ti tcp:3001 2>/dev/null | tr '\n' ' ' || true)"
  echo "   前端 3002: $(lsof -ti tcp:3002 2>/dev/null | tr '\n' ' ' || true)"

  echo ""
  echo "🌐 HTTP 检查:"
  echo "   后端 /api/agents: $(curl -s -o /dev/null -w '%{http_code}' -x '' http://localhost:3001/api/agents 2>/dev/null || echo 000)"
  echo "   前端 /: $(curl -s -o /dev/null -w '%{http_code}' -x '' http://localhost:3002/ 2>/dev/null || echo 000)"

  echo ""
  echo "📝 日志文件:"
  if [[ -f "$LOG_FILE" ]]; then
    echo "   路径: $LOG_FILE"
    echo "   大小: $(du -h "$LOG_FILE" | cut -f1)"
    echo ""
    echo "最近日志 (最后 10 行):"
    tail -10 "$LOG_FILE" | sed 's/^/   /'
  else
    echo "   状态: 日志文件不存在"
  fi
}

case "${1:-status}" in
  status|"")
    show_status
    ;;
  logs)
    if [[ -f "$LOG_FILE" ]]; then
      tail -f "$LOG_FILE"
    else
      echo "日志文件不存在: $LOG_FILE"
    fi
    ;;
  *)
    echo "用法: $0 {status|logs}"
    ;;
esac
