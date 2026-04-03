#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-}"

if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
  else
    PYTHON_BIN="python3"
  fi
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR/backend"
HIBS_DEMO_MODE=1 "$PYTHON_BIN" main.py &
BACKEND_PID=$!
cd "$ROOT_DIR"

for _ in {1..20}; do
  if curl -fsS http://localhost:5000/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

VITE_API_URL="${VITE_API_URL:-http://localhost:5000}" npm run dev
