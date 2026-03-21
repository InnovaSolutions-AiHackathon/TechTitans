from typing import Any, Optional

import ollama

try:
    from anthropic import Anthropic
except ImportError:  # pragma: no cover - optional dependency at install time
    Anthropic = None  # type: ignore[misc, assignment]


DEFAULT_OLLAMA_OPTIONS: dict[str, Any] = {"num_predict": 180, "temperature": 0.2, "top_p": 0.9}
DEFAULT_OLLAMA_THINK: str = "low"
DEFAULT_CONTEXT_LIMIT: int = 2500

DEFAULT_CLAUDE_MAX_TOKENS: int = 1024


def _normalize_ollama_host(host: str) -> str:
    host = (host or "").strip()
    if not host:
        return host
    if "://" not in host:
        host = "http://" + host
    return host


def ollama_chat_safe(
    host: str,
    model: str,
    user_content: str,
    *,
    think: Optional[str] = None,
    options: Optional[dict[str, Any]] = None,
) -> Optional[str]:
    """
    Run Ollama safely and return response text.
    """
    url = _normalize_ollama_host(host)
    client = ollama.Client(host=url or None)
    try:
        chat_kwargs: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": user_content}],
            "options": options or DEFAULT_OLLAMA_OPTIONS,
        }

        # Some Ollama models don't support "thinking". Only pass `think` when
        # explicitly requested to avoid hard failures.
        if think is not None:
            chat_kwargs["think"] = think

        response = client.chat(**chat_kwargs)
        return response["message"]["content"]
    except Exception as e:
        err = str(e)
        err_lower = err.lower()
        # Log the underlying provider failure so the "LLM failed" message
        # becomes actionable from backend logs.
        print(f"[ollama_chat_safe] host={url or 'default'} model={model} failed: {err}")

        # If model is missing, try pulling and retry once.
        # (Ollama frequently responds with 404 for missing models.)
        if ("404" in err_lower) and ("not found" in err_lower or "model" in err_lower):
            try:
                print(f"[ollama_chat_safe] attempting to pull model: {model}")
                client.pull(model)
                response = client.chat(
                    model=model,
                    messages=[{"role": "user", "content": user_content}],
                    options=options or DEFAULT_OLLAMA_OPTIONS,
                    **({"think": think} if think is not None else {}),
                )
                return response["message"]["content"]
            except Exception as e2:
                print(f"[ollama_chat_safe] pull/retry failed: {e2}")

        # If a caller explicitly requested `think`, retry without it for models
        # that don't support thinking.
        if think is not None and "does not support thinking" in err_lower:
            try:
                response = client.chat(
                    model=model,
                    messages=[{"role": "user", "content": user_content}],
                    options=options or DEFAULT_OLLAMA_OPTIONS,
                )
                return response["message"]["content"]
            except Exception as e2:
                print(f"[ollama_chat_safe] retry without thinking failed: {e2}")

        return None


def claude_chat_safe(
    api_key: str,
    model: str,
    user_content: str,
    *,
    max_tokens: int = DEFAULT_CLAUDE_MAX_TOKENS,
) -> Optional[str]:
    """
    Call Anthropic Claude and return response text.
    """
    api_key = (api_key or "").strip()
    if not api_key:
        print("[claude_chat_safe] CLAUDE_API_KEY is missing; skipping Claude fallback.")
        return None

    if Anthropic is None:
        print(
            "[claude_chat_safe] anthropic package not installed. "
            "Run: pip install anthropic"
        )
        return None

    try:
        client = Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": user_content}],
        )
        parts = getattr(msg, "content", None) or []
        texts: list[str] = []
        for p in parts:
            t = getattr(p, "text", None)
            if isinstance(t, str) and t.strip():
                texts.append(t)
        out = "\n".join(texts).strip() if texts else None
        return out or None
    except Exception as e:
        print(f"[claude_chat_safe] Claude call failed (model={model}): {e}")
        return None
