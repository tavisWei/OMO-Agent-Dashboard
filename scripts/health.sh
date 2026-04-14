#!/bin/bash

set -e

check_http() {
  BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" -x "" http://localhost:3001/api/agents 2>/dev/null || echo "000")
  FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" -x "" http://localhost:3002/ 2>/dev/null || echo "000")

  if [[ "$BACKEND_CODE" == "200" && "$FRONTEND_CODE" == "200" ]]; then
    echo "OK - backend:$BACKEND_CODE frontend:$FRONTEND_CODE"
    return 0
  fi

  echo "FAIL - backend:$BACKEND_CODE frontend:$FRONTEND_CODE"
  return 1
}

check_ports() {
  BACKEND_PID=$(lsof -ti tcp:3001 2>/dev/null || true)
  FRONTEND_PID=$(lsof -ti tcp:3002 2>/dev/null || true)
  if [[ -n "$BACKEND_PID" && -n "$FRONTEND_PID" ]]; then
    echo "OK - ports 3001/3002 listening"
    return 0
  fi
  echo "FAIL - missing listening process on 3001 or 3002"
  return 1
}

case "${1:-all}" in
  http)
    check_http
    ;;
  port|ports)
    check_ports
    ;;
  all)
    echo "=== OMO Agent Dashboard 健康检查 ==="
    check_ports
    check_http
    ;;
  *)
    echo "用法: $0 {http|port|all}"
    ;;
esac
