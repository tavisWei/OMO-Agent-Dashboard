#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/dashboard.pid"

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
      kill $PIDS 2>/dev/null || true
    fi
  done
}

stop() {
  if is_running; then
    PID=$(cat "$PID_FILE")
    log "🛑 停止服务 (PID: $PID)..."
    kill -15 "$PID" 2>/dev/null || true
    for i in {1..10}; do
      if ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    if kill -0 "$PID" 2>/dev/null; then
      warn "服务未能优雅停止，强制杀死..."
      kill -9 "$PID" 2>/dev/null || true
    fi
  else
    warn "PID 文件对应服务未运行，继续清理端口占用"
  fi
  cleanup_ports
  rm -f "$PID_FILE"
  log "✅ 服务已停止"
}

force_stop() {
  log "🛑 强制停止所有相关进程..."
  pkill -f "vite --port 3002" 2>/dev/null || true
  pkill -f "tsx watch src/server/index.ts" 2>/dev/null || true
  cleanup_ports
  rm -f "$PID_FILE"
  log "✅ 强制停止完成"
}

case "${1:-}" in
  stop)
    stop
    ;;
  force)
    force_stop
    ;;
  *)
    echo "用法: $0 {stop|force}"
    ;;
esac
