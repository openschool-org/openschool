#!/usr/bin/env bash
# Runs the OpenSchool backend and frontend together.
# Ctrl+C stops both processes.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend (:8080)..."
(cd "$ROOT_DIR/backend" && go run cmd/api/main.go) &
BACKEND_PID=$!

echo "Starting frontend (:5173)..."
(cd "$ROOT_DIR/frontend" && pnpm dev) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"