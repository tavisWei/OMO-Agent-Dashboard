#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"
LOG_FILE="$PROJECT_DIR/data/logs/dashboard.log"

mkdir -p "$PROJECT_DIR/data/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
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

cleanup_ports() {
  for port in 3001 3002 3003; do
    PIDS=$(lsof -ti tcp:$port 2>/dev/null || true)
    if [[ -n "$PIDS" ]]; then
      warn "端口 $port 被占用，清理旧进程: $PIDS"
      kill $PIDS 2>/dev/null || true
      sleep 1
    fi
  done
}

wait_for_http() {
  local url="$1"
  local max_attempts="$2"
  local attempt=1
  while [[ $attempt -le $max_attempts ]]; do
    if curl -s -o /dev/null -w "%{http_code}" -x "" "$url" 2>/dev/null | grep -Eq '^(200|404)$'; then
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  return 1
}

start() {
  cd "$PROJECT_DIR"

  if is_running; then
    PID=$(cat "$PID_FILE")
    warn "服务已在运行 (PID: $PID)"
    return 1
  fi

  log "🚀 启动 OMO Agent Dashboard..."

  if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
    warn "依赖未安装，正在安装..."
    npm install
  fi

  cleanup_ports

  nohup npm run dev > "$LOG_FILE" 2>&1 &
  PID=$!
  echo "$PID" > "$PID_FILE"

  if wait_for_http "http://localhost:3001/api/agents" 20 && wait_for_http "http://localhost:3002/" 20; then
    log "✅ 服务启动成功!"
    log "   PID: $PID"
    log "   日志: $LOG_FILE"
    log "   后端: http://localhost:3001"
    log "   前端: http://localhost:3002"
  else
    error "服务启动失败，请查看日志: $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
}

status() {
  if is_running; then
    PID=$(cat "$PID_FILE")
    echo -e "${GREEN}✅ 服务运行中${NC}"
    echo "   PID: $PID"
    echo "   日志: $LOG_FILE"
    echo "   后端端口 3001: $(lsof -ti tcp:3001 2>/dev/null | tr '\n' ' ')"
    echo "   前端端口 3002: $(lsof -ti tcp:3002 2>/dev/null | tr '\n' ' ')"
    if [[ -f "$LOG_FILE" ]]; then
      echo ""
      echo "最近日志 (最后 5 行):"
      tail -5 "$LOG_FILE" | sed 's/^/   /'
    fi
  else
    echo -e "${YELLOW}⚠️  服务未运行${NC}"
    echo "   使用 ./scripts/start.sh 启动服务"
  fi
}

case "${1:-}" in
  start)
    start
    ;;
  status)
    status
    ;;
  *)
    echo "用法: $0 {start|status}"
    echo ""
    echo "选项:"
    echo "  start   启动服务"
    echo "  status  查看服务状态"
    ;;
esac
