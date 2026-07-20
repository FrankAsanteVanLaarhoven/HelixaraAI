#!/usr/bin/env python3
"""
HelixaraAI ↔ hermes-agent bridge (local install only).

Does not fork or contribute to upstream. Uses the installed hermes-agent
package from the Desktop tree / Helixara venv.

Usage:
  bridge.py status
  bridge.py models
  bridge.py run --prompt "..." [--model free] [--system "..."]
  bridge.py serve --port 18790
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

# Resolve install roots
HELIXARA_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_AGENT_ROOT = Path(
    os.environ.get(
        "HERMES_AGENT_ROOT",
        str(Path.home() / "Desktop" / "hermes-agent-main"),
    )
)
HERMES_HOME = Path(
    os.environ.get(
        "HERMES_HOME",
        str(HELIXARA_ROOT / ".runtime" / "hermes-home"),
    )
)
CONFIG_PATH = Path(
    os.environ.get(
        "HERMES_CLI_CONFIG",
        str(HELIXARA_ROOT / "integrations" / "hermes" / "cli-config.yaml"),
    )
)

os.environ.setdefault("HERMES_HOME", str(HERMES_HOME))
HERMES_HOME.mkdir(parents=True, exist_ok=True)

# Prefer config next to this bridge
if CONFIG_PATH.is_file():
    os.environ.setdefault("HERMES_CLI_CONFIG", str(CONFIG_PATH))
    # Some builds read ~/.hermes/cli-config.yaml — mirror free models there
    try:
        dest = HERMES_HOME / "cli-config.yaml"
        if not dest.exists() or dest.stat().st_mtime < CONFIG_PATH.stat().st_mtime:
            dest.write_text(CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    except OSError:
        pass

# Ensure agent root is importable even if package not on path
if DEFAULT_AGENT_ROOT.is_dir():
    sys.path.insert(0, str(DEFAULT_AGENT_ROOT))

FREE_MODELS = [
    {
        "id": "free",
        "model": "llama3.1",
        "tier": "free",
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434/v1",
        "label": "Helixara free (Llama 3.1)",
    },
    {
        "id": "helixara-free",
        "model": "llama3.1",
        "tier": "free",
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434/v1",
        "label": "Helixara free",
    },
    {
        "id": "llama31-free",
        "model": "llama3.1",
        "tier": "free",
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434/v1",
        "label": "Llama 3.1 free local",
    },
    {
        "id": "llama32-free",
        "model": "llama3.2",
        "tier": "free",
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434/v1",
        "label": "Llama 3.2 free local",
    },
    {
        "id": "ollama-free",
        "model": "llama3.1",
        "tier": "free",
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434/v1",
        "label": "Ollama free default",
    },
    {
        "id": "helixara-ensemble",
        "model": "helixara-ensemble",
        "tier": "free",
        "provider": "helixara",
        "base_url": "internal",
        "label": "Helixara free ensemble (offline)",
    },
]


def _resolve_model(name: Optional[str]) -> Dict[str, Any]:
    key = (name or "free").strip().lower()
    for m in FREE_MODELS:
        if m["id"] == key or m["model"] == key:
            return m
    # Allow raw ollama model ids as free
    return {
        "id": key,
        "model": key,
        "tier": "free",
        "provider": "ollama",
        "base_url": "http://127.0.0.1:11434/v1",
        "label": f"{key} (local free)",
    }


def _ollama_up() -> bool:
    try:
        with urlopen("http://127.0.0.1:11434/api/tags", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def _ensemble_fallback(prompt: str, system: str = "") -> str:
    return "\n".join(
        [
            "[Helixara free ensemble · offline-capable]",
            "",
            f"Objective: {prompt[:600]}",
            f"Constraints: {system[:300]}" if system else "",
            "",
            "Plan:",
            "1. Authorize under ROE / engagement scope",
            "2. Recon — public surface + crawl",
            "3. OSINT — DNS/CT/headers enrichment",
            "4. Analyst — correlate IOCs + geospatial pins",
            "5. Report — executive + technical summary",
            "",
            "Models: free · helixara-free · llama31-free · llama32-free (Ollama).",
            "Defensive authorized operations only.",
        ]
    ).strip()


def run_agent(
    prompt: str,
    *,
    model: str = "free",
    system: str = "",
    max_iterations: int = 8,
) -> Dict[str, Any]:
    started = time.time()
    resolved = _resolve_model(model)
    model_id = resolved["model"]

    if model_id == "helixara-ensemble" or (
        resolved["provider"] == "ollama" and not _ollama_up()
    ):
        content = _ensemble_fallback(prompt, system)
        return {
            "ok": True,
            "provider": "helixara-ensemble",
            "model": "helixara-ensemble",
            "tier": "free",
            "content": content,
            "latencyMs": int((time.time() - started) * 1000),
            "fallback": True,
            "engine": "hermes-agent-bridge",
        }

    try:
        from run_agent import AIAgent  # type: ignore
    except Exception as e:
        content = _ensemble_fallback(prompt, system)
        return {
            "ok": True,
            "provider": "helixara-ensemble",
            "model": "helixara-ensemble",
            "tier": "free",
            "content": content,
            "latencyMs": int((time.time() - started) * 1000),
            "fallback": True,
            "error": f"AIAgent import failed: {e}",
            "engine": "hermes-agent-bridge",
        }

    base_url = resolved.get("base_url") or "http://127.0.0.1:11434/v1"
    system_prompt = (
        system
        or "You are HelixaraAI mission agent. Authorized defensive OSINT and security operations only. No malware, phishing, SMS spoof, or covert tracking."
    )

    try:
        agent = AIAgent(
            base_url=base_url,
            api_key=os.environ.get("OLLAMA_API_KEY") or "ollama",
            provider="custom",
            model=model_id,
            max_iterations=max_iterations,
            quiet_mode=True,
            ephemeral_system_prompt=system_prompt,
            enabled_toolsets=[],  # LLM-only for Helixara bridge (tools via Helixara APIs)
            disabled_toolsets=None,
        )
        # run_conversation returns dict or str depending on version
        result = agent.run_conversation(prompt)
        if isinstance(result, dict):
            content = (
                result.get("final_response")
                or result.get("response")
                or result.get("content")
                or result.get("message")
                or json.dumps(result)[:8000]
            )
        else:
            content = str(result)
        return {
            "ok": True,
            "provider": "hermes-native",
            "model": model_id,
            "tier": "free",
            "content": content,
            "latencyMs": int((time.time() - started) * 1000),
            "fallback": False,
            "engine": "hermes-agent",
            "version": _hermes_version(),
        }
    except Exception as e:
        content = _ensemble_fallback(prompt, system)
        return {
            "ok": True,
            "provider": "helixara-ensemble",
            "model": "helixara-ensemble",
            "tier": "free",
            "content": content,
            "latencyMs": int((time.time() - started) * 1000),
            "fallback": True,
            "error": str(e),
            "trace": traceback.format_exc()[-1500:],
            "engine": "hermes-agent-bridge",
        }


def _hermes_version() -> str:
    try:
        import importlib.metadata as md

        return md.version("hermes-agent")
    except Exception:
        return "0.18.2"


def status() -> Dict[str, Any]:
    ollama = _ollama_up()
    agent_root = str(DEFAULT_AGENT_ROOT)
    import_ok = False
    import_err = None
    try:
        import run_agent  # noqa: F401

        import_ok = True
    except Exception as e:
        import_err = str(e)

    return {
        "ok": import_ok,
        "engine": "hermes-agent",
        "version": _hermes_version(),
        "agentRoot": agent_root,
        "hermesHome": str(HERMES_HOME),
        "config": str(CONFIG_PATH),
        "importOk": import_ok,
        "importError": import_err,
        "ollama": ollama,
        "freeModels": FREE_MODELS,
        "defaultModel": "free",
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[hermes-bridge] " + (fmt % args) + "\n")

    def _json(self, code: int, body: Dict[str, Any]) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> Dict[str, Any]:
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0:
            return {}
        raw = self.rfile.read(n)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/health", "/v1/health", "/"):
            self._json(200, status())
            return
        if self.path in ("/v1/models", "/models"):
            models = [
                {
                    "id": m["id"],
                    "object": "model",
                    "owned_by": "helixara-free",
                    "tier": "free",
                    "root": m["model"],
                }
                for m in FREE_MODELS
            ]
            self._json(200, {"object": "list", "data": models})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        body = self._read_json()
        if self.path in ("/v1/chat", "/v1/chat/completions", "/chat"):
            messages: List[Dict[str, str]] = body.get("messages") or []
            system = ""
            user_parts: List[str] = []
            for m in messages:
                role = m.get("role")
                content = m.get("content") or ""
                if role == "system":
                    system = content
                else:
                    user_parts.append(f"{role}: {content}" if role != "user" else content)
            prompt = body.get("message") or body.get("prompt") or "\n".join(user_parts)
            model = body.get("model") or "free"
            result = run_agent(prompt, model=model, system=system)
            # OpenAI-ish shape for drop-in clients
            self._json(
                200,
                {
                    "id": f"chatcmpl-helixara-{int(time.time())}",
                    "object": "chat.completion",
                    "model": result.get("model"),
                    "choices": [
                        {
                            "index": 0,
                            "message": {
                                "role": "assistant",
                                "content": result.get("content") or "",
                            },
                            "finish_reason": "stop",
                        }
                    ],
                    "reply": result.get("content"),
                    "content": result.get("content"),
                    "helixara": result,
                },
            )
            return
        if self.path in ("/v1/run", "/run"):
            result = run_agent(
                body.get("prompt") or body.get("message") or "",
                model=body.get("model") or "free",
                system=body.get("system") or "",
                max_iterations=int(body.get("max_iterations") or 8),
            )
            self._json(200, result)
            return
        self._json(404, {"error": "not found"})


def main() -> int:
    parser = argparse.ArgumentParser(description="Helixara hermes-agent bridge")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("status")
    sub.add_parser("models")

    p_run = sub.add_parser("run")
    p_run.add_argument("--prompt", required=True)
    p_run.add_argument("--model", default="free")
    p_run.add_argument("--system", default="")
    p_run.add_argument("--max-iterations", type=int, default=8)

    p_serve = sub.add_parser("serve")
    p_serve.add_argument("--port", type=int, default=int(os.environ.get("HERMES_BRIDGE_PORT", "18790")))
    p_serve.add_argument("--host", default="127.0.0.1")

    args = parser.parse_args()
    if args.cmd == "status" or args.cmd is None:
        print(json.dumps(status(), indent=2))
        return 0
    if args.cmd == "models":
        print(json.dumps({"models": FREE_MODELS}, indent=2))
        return 0
    if args.cmd == "run":
        print(
            json.dumps(
                run_agent(
                    args.prompt,
                    model=args.model,
                    system=args.system,
                    max_iterations=args.max_iterations,
                ),
                indent=2,
            )
        )
        return 0
    if args.cmd == "serve":
        httpd = ThreadingHTTPServer((args.host, args.port), Handler)
        sys.stderr.write(
            f"[hermes-bridge] Helixara free models on http://{args.host}:{args.port}\n"
        )
        httpd.serve_forever()
        return 0
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
