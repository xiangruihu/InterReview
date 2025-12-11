#!/usr/bin/env bash
set -Eeuo pipefail

# 在同一脚本中同时启动前端与后端
# 退出时自动清理后台进程
pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

# 启动后端（后台运行）
(
  cd backend
  if command -v uvicorn >/dev/null 2>&1; then
    echo "[backend] 使用 uvicorn 启动 (127.0.0.1:8000, --reload)"
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  else
    echo "[backend] 未检测到 uvicorn，回退到 python -m app"
    python -m app
  fi
) &
pids+=($!)

echo "[backend] 已启动，PID=${pids[-1]}"

# 启动前端（前台运行，便于查看日志/热更新）
echo "[frontend] 正在启动..."
npm run dev

# 前端退出（如 Ctrl+C）后，清理后台后端进程
wait
