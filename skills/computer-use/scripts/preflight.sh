#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_CONFIG="${OPENCLAW_CONFIG:-/root/.openclaw/openclaw.json}"
CUA_LOCAL_CONFIG="${CUA_LOCAL_CONFIG:-/root/.cua/config/local.json}"
CHECK_MM="${CHECK_MM:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check_multimodal.py}"

if ps aux | grep -E '(^|/)(cua)(\s|$)|/root/\.cua/cua' | grep -v grep >/dev/null 2>&1; then
  printf '%s\n' 'cua process is already running. Stop the previous CUA task or wait for it to finish.'
  exit 10
fi

MM_OUT=""
set +e
MM_OUT="$(python3 "$CHECK_MM" --openclaw-config "$OPENCLAW_CONFIG" 2>&1)"
MM_RC=$?
set -e

printf '%s\n' "$MM_OUT"

if [ "$MM_RC" -eq 2 ]; then
  printf '%s\n' '<model-switch-multimodal />'
  exit 2
fi

if [ "$MM_RC" -ne 0 ]; then
  exit "$MM_RC"
fi

RUNS_DIR="$(CUA_LOCAL_CONFIG="$CUA_LOCAL_CONFIG" python3 - <<'PY'
import json
import os
import sys

path = os.environ.get("CUA_LOCAL_CONFIG", "/root/.cua/config/local.json")
with open(path, "r", encoding="utf-8") as f:
    cfg = json.load(f)

agent = cfg.get("agent") or {}
runs_dir = agent.get("runsDir")
if not runs_dir:
    raise SystemExit(11)
print(runs_dir)
PY
)"

if [ -d "$RUNS_DIR" ]; then
  while IFS= read -r -d '' d; do
    rm -rf -- "$d"
  done < <(find "$RUNS_DIR" -mindepth 1 -maxdepth 1 -type d -print0)
fi

mkdir -p -- "$RUNS_DIR"
test -w "$RUNS_DIR"
