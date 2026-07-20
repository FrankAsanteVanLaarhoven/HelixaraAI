#!/usr/bin/env bash
# Install hermes-agent from local Desktop tree into Helixara runtime.
# Does NOT clone, fork, branch, or push to NousResearch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AGENT_ROOT="${HERMES_AGENT_ROOT:-$HOME/Desktop/hermes-agent-main}"
VENV="$ROOT/.runtime/hermes-venv"
HOME_DIR="$ROOT/.runtime/hermes-home"
PY="${PYTHON:-python3.11}"

if [[ ! -d "$AGENT_ROOT" ]]; then
  echo "hermes-agent source not found at: $AGENT_ROOT"
  echo "Set HERMES_AGENT_ROOT to your local path."
  exit 1
fi

mkdir -p "$ROOT/.runtime" "$HOME_DIR"
if [[ ! -x "$VENV/bin/python" ]]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv "$VENV" --python 3.11
  else
    "$PY" -m venv "$VENV"
  fi
fi

if command -v uv >/dev/null 2>&1; then
  uv pip install -e "$AGENT_ROOT" --python "$VENV/bin/python"
else
  "$VENV/bin/pip" install -U pip
  "$VENV/bin/pip" install -e "$AGENT_ROOT"
fi

# Mirror Helixara free-model config into HERMES_HOME
cp -f "$ROOT/integrations/hermes/cli-config.yaml" "$HOME_DIR/cli-config.yaml"

export HERMES_HOME="$HOME_DIR"
export HERMES_AGENT_ROOT="$AGENT_ROOT"
export PATH="$VENV/bin:$PATH"

echo "Installed hermes-agent from $AGENT_ROOT"
"$VENV/bin/python" -c "from run_agent import AIAgent; print('AIAgent OK')"
"$VENV/bin/hermes" --version || true
"$VENV/bin/python" "$ROOT/integrations/hermes/bridge.py" status
echo "Done. Start bridge: npm run hermes:bridge"
