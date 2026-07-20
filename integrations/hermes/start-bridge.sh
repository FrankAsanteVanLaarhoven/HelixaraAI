#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export HERMES_AGENT_ROOT="${HERMES_AGENT_ROOT:-$HOME/Desktop/hermes-agent-main}"
export HERMES_HOME="${HERMES_HOME:-$ROOT/.runtime/hermes-home}"
export HERMES_CLI_CONFIG="${HERMES_CLI_CONFIG:-$ROOT/integrations/hermes/cli-config.yaml}"
export HERMES_BRIDGE_PORT="${HERMES_BRIDGE_PORT:-18790}"
export PATH="$ROOT/.runtime/hermes-venv/bin:$PATH"
mkdir -p "$HERMES_HOME"
exec "$ROOT/.runtime/hermes-venv/bin/python" "$ROOT/integrations/hermes/bridge.py" serve --port "$HERMES_BRIDGE_PORT"
