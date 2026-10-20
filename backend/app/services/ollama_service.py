"""Reusable Ollama local model service with bounded timeouts and strict output parsing."""

from __future__ import annotations

import json
import logging
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from ..config import BackendConfig
from ..prompts import (
    build_briefing_prompt,
    build_extract_tasks_prompt,
    build_file_suggestions_prompt,
    build_summarize_prompt,
)
from ..schemas import (
    TASK_PRIORITIES,
    PRIORITY_SOURCES,
    validate_model_name,
)

logger = logging.getLogger("slothai.ollama")

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


class OllamaServiceError(Exception):
    """Raised when local Ollama is unreachable, times out, or returns invalid output."""

    def __init__(
        self,
        message: str,
        code: str = "ollama_error",
        status_code: int = 503,
        recovery_hint: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.recovery_hint = recovery_hint or (
            "Verify Ollama is installed and running locally ('ollama serve'), "
            "and ensure the selected model is downloaded ('ollama pull <model>')."
        )


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    """Safely parse JSON from model output, stripping optional markdown code fences."""
    cleaned = (raw_text or "").strip()
    if not cleaned:
        raise OllamaServiceError(
            "Local model returned an empty response.",
            code="empty_model_output",
            status_code=502,
        )

    # Strip ```json ... ``` if present
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    else:
        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            cleaned = cleaned[first_brace : last_brace + 1]

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise OllamaServiceError(
            "Local model returned malformed JSON output that could not be validated.",
            code="malformed_model_output",
            status_code=502,
            recovery_hint="Try running the request again or switch to an instruction-tuned model such as qwen3:4b or llama3.2:latest.",
        ) from exc

    if not isinstance(parsed, dict):
        raise OllamaServiceError(
            "Expected a JSON object from the local model.",
            code="invalid_json_root",
            status_code=502,
        )
    return parsed


class OllamaService:
    """Client for interacting with a local Ollama instance."""

    def __init__(self, config: BackendConfig) -> None:
        self.config = config

    def _http_request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None,
        base_url_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        base = (base_url_override or self.config.ollama_base_url).rstrip("/")
        url = f"{base}{path}"
        req_timeout = timeout or self.config.ollama_timeout_seconds

        try:
            if HTTPX_AVAILABLE:
                with httpx.Client(timeout=req_timeout) as client:
                    if method.upper() == "GET":
                        resp = client.get(url)
                    else:
                        resp = client.post(url, json=payload or {})
                    if resp.status_code == 404 and payload and "model" in payload:
                        raise OllamaServiceError(
                            f"Model '{payload['model']}' is not installed in local Ollama.",
                            code="model_not_found",
                            status_code=404,
                            recovery_hint=f"Download the model in Settings or run: ollama pull {payload['model']}",
                        )
                    resp.raise_for_status()
                    return resp.json()
            else:
                data = (
                    json.dumps(payload).encode("utf-8")
                    if payload is not None
                    else None
                )
                req = urllib.request.Request(
                    url,
                    data=data,
                    method=method.upper(),
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=req_timeout) as response:
                    raw = response.read().decode("utf-8")
                    return json.loads(raw) if raw else {}
        except OllamaServiceError:
            raise
        except Exception as exc:
            err_str = str(exc).lower()
            if "404" in err_str and payload and "model" in payload:
                raise OllamaServiceError(
                    f"Model '{payload['model']}' is not installed in local Ollama.",
                    code="model_not_found",
                    status_code=404,
                    recovery_hint=f"Download the model in Settings or run: ollama pull {payload['model']}",
                ) from exc
            if "timed out" in err_str or "timeout" in err_str:
                raise OllamaServiceError(
                    f"Local Ollama inference timed out after {req_timeout}s.",
                    code="ollama_timeout",
                    status_code=504,
                    recovery_hint="Try summarizing a shorter document or selecting a smaller quantized model (e.g., qwen3:4b).",
                ) from exc
            raise OllamaServiceError(
                f"Cannot reach local Ollama service at {base}.",
                code="ollama_unreachable",
                status_code=503,
                recovery_hint="Ensure Ollama is installed and running ('ollama serve' on 127.0.0.1:11434).",
            ) from exc

    def list_models(
        self, base_url_override: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Query /api/tags and return structured metadata for installed local models."""
        data = self._http_request(
            "GET",
            "/api/tags",
            timeout=5.0,
            base_url_override=base_url_override,
        )
        raw_models = data.get("models", [])
        if not isinstance(raw_models, list):
            return []

        models: List[Dict[str, Any]] = []
        for item in raw_models:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or item.get("model") or "").strip()
            if not name:
                continue
            details = item.get("details") if isinstance(item.get("details"), dict) else {}
            models.append(
                {
                    "name": name,
                    "size_bytes": item.get("size"),
                    "modified_at": item.get("modified_at"),
                    "family": details.get("family"),
                    "parameter_size": details.get("parameter_size"),
                    "quantization_level": details.get("quantization_level"),
                }
            )
        return models

    def check_health(
        self,
        base_url_override: Optional[str] = None,
        target_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verify Ollama reachability and whether the selected model is installed."""
        endpoint = (base_url_override or self.config.ollama_base_url).rstrip("/")
        desired_model = (target_model or self.config.default_model).strip()
        start = time.perf_counter()
        try:
            models = self.list_models(base_url_override=endpoint)
            latency_ms = round((time.perf_counter() - start) * 1000)
            names = [m["name"] for m in models]
            model_available = any(
                n.lower() == desired_model.lower()
                or n.lower().startswith(f"{desired_model.lower()}:")
                for n in names
            )
            return {
                "ollama_reachable": True,
                "endpoint": endpoint,
                "target_model": desired_model,
                "model_available": model_available,
                "installed_models": models,
                "latency_ms": latency_ms,
                "error": None
                if model_available
                else f"Connected to Ollama at {endpoint}, but model '{desired_model}' is not installed.",
                "recovery_hint": None
                if model_available
                else f"Pull '{desired_model}' from Settings or run: ollama pull {desired_model}",
            }
        except OllamaServiceError as exc:
            return {
                "ollama_reachable": False,
                "endpoint": endpoint,
                "target_model": desired_model,
                "model_available": False,
                "installed_models": [],
                "latency_ms": None,
                "error": exc.message,
                "recovery_hint": exc.recovery_hint,
            }

    def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Explicitly request Ollama to pull a model tag."""
        clean_model = validate_model_name(model_name)
        logger.info("Initiating user-requested model pull for %s", clean_model)
        result = self._http_request(
            "POST",
            "/api/pull",
            payload={"name": clean_model, "stream": False},
            timeout=600.0,
        )
        status_text = str(result.get("status", "completed"))
        return {
            "success": True,
            "model": clean_model,
            "status": status_text,
            "detail": f"Model '{clean_model}' pull finished with status: {status_text}",
        }

    def generate_json(
        self, prompt: str, model_override: Optional[str] = None
    ) -> tuple[Dict[str, Any], str]:
        """Run non-streaming JSON inference on the selected Ollama model."""
        selected_model = validate_model_name(
            model_override or self.config.default_model
        )
        response = self._http_request(
            "POST",
            "/api/generate",
            payload={
                "model": selected_model,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {"temperature": 0.1},
            },
        )
        raw_output = str(response.get("response", ""))
        parsed = _extract_json_object(raw_output)
        return parsed, selected_model

    def summarize(
        self,
        text: str,
        summary_length: str = "balanced",
        model_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        prompt = build_summarize_prompt(text, summary_length)
        parsed, used_model = self.generate_json(prompt, model_override)

        exec_summary = str(parsed.get("executive_summary") or parsed.get("summary") or "").strip()
        if not exec_summary:
            raise OllamaServiceError(
                "Model response did not contain a valid 'executive_summary'.",
                code="invalid_summary_schema",
                status_code=502,
            )

        raw_points = parsed.get("key_points", [])
        key_points = (
            [str(p).strip() for p in raw_points if str(p).strip()]
            if isinstance(raw_points, list)
            else []
        )
        raw_terms = parsed.get("notable_terms", [])
        notable_terms = (
            [str(t).strip() for t in raw_terms if str(t).strip()]
            if isinstance(raw_terms, list)
            else []
        )
        uncertainty = parsed.get("uncertainty_notes")

        source_words = len(text.split())
        summary_words = len(f"{exec_summary} {' '.join(key_points)}".split())

        return {
            "success": True,
            "model": used_model,
            "summary_length": summary_length,
            "summary": {
                "title": str(parsed.get("title") or "Document Summary").strip(),
                "executive_summary": exec_summary,
                "key_points": key_points,
                "notable_terms": notable_terms,
                "uncertainty_notes": str(uncertainty).strip()
                if isinstance(uncertainty, str) and uncertainty.strip()
                else None,
            },
            "source_word_count": source_words,
            "summary_word_count": summary_words,
        }

    def extract_tasks(
        self, text: str, model_override: Optional[str] = None
    ) -> Dict[str, Any]:
        prompt = build_extract_tasks_prompt(text)
        parsed, used_model = self.generate_json(prompt, model_override)

        raw_tasks = parsed.get("tasks")
        if not isinstance(raw_tasks, list):
            raise OllamaServiceError(
                "Model output did not include a valid 'tasks' list.",
                code="invalid_tasks_schema",
                status_code=502,
            )

        # Check whether the source text actually contains any temporal or deadline cues
        temporal_cue_pattern = re.compile(
            r"\b(\d{1,4}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
            r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|"
            r"monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
            r"today|tomorrow|tonight|eod|eow|due|deadline|by\s+\w+|before\s+\w+|next\s+week|next\s+month)\b",
            re.IGNORECASE,
        )
        source_has_temporal_cue = bool(temporal_cue_pattern.search(text))
        lower_source = text.lower()

        validated_tasks: List[Dict[str, Any]] = []
        for item in raw_tasks:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            raw_deadline = item.get("deadline")
            deadline: Optional[str] = None
            if isinstance(raw_deadline, str) and raw_deadline.strip():
                candidate_dl = raw_deadline.strip()
                if (
                    candidate_dl.lower()
                    not in ("none", "null", "n/a", "unspecified", "unknown", "no deadline")
                    and source_has_temporal_cue
                ):
                    # Verify at least one significant word/number from candidate_dl appears in source text
                    dl_tokens = [
                        tok
                        for tok in re.findall(r"[a-z0-9]+", candidate_dl.lower())
                        if len(tok) >= 2 or tok.isdigit()
                    ]
                    if any(tok in lower_source for tok in dl_tokens):
                        deadline = candidate_dl

            priority = str(item.get("priority") or "unspecified").lower().strip()
            if priority not in TASK_PRIORITIES:
                priority = "unspecified"

            priority_source = (
                str(item.get("priority_source") or "inferred").lower().strip()
            )
            if priority_source not in PRIORITY_SOURCES:
                priority_source = "inferred"

            validated_tasks.append(
                {
                    "title": title,
                    "description": str(item.get("description") or "").strip(),
                    "deadline": deadline,
                    "priority": priority,
                    "priority_source": priority_source,
                    "source_evidence": str(item.get("source_evidence") or "").strip()
                    or None,
                }
            )

        return {
            "success": True,
            "model": used_model,
            "tasks": validated_tasks,
        }

    def generate_briefing(
        self, text: str, model_override: Optional[str] = None
    ) -> Dict[str, Any]:
        prompt = build_briefing_prompt(text)
        parsed, used_model = self.generate_json(prompt, model_override)

        summary = str(parsed.get("summary") or parsed.get("concise_summary") or "").strip()
        if not summary:
            raise OllamaServiceError(
                "Model response did not contain a valid briefing 'summary'.",
                code="invalid_briefing_schema",
                status_code=502,
            )

        def _clean_str_list(val: Any) -> List[str]:
            if not isinstance(val, list):
                return []
            return [str(x).strip() for x in val if str(x).strip()]

        raw_deadlines = parsed.get("explicit_deadlines", [])
        deadlines: List[Dict[str, str]] = []
        if isinstance(raw_deadlines, list):
            for d in raw_deadlines:
                if isinstance(d, dict):
                    item_txt = str(d.get("item") or "").strip()
                    dl_txt = str(d.get("deadline_text") or d.get("deadline") or "").strip()
                    if item_txt and dl_txt and dl_txt.lower() not in ("none", "null", "n/a"):
                        deadlines.append({"item": item_txt, "deadline_text": dl_txt})

        return {
            "success": True,
            "model": used_model,
            "summary": summary,
            "key_points": _clean_str_list(parsed.get("key_points")),
            "action_items": _clean_str_list(parsed.get("action_items")),
            "explicit_deadlines": deadlines,
            "follow_up_questions": _clean_str_list(parsed.get("follow_up_questions")),
        }

    def suggest_file_organization(
        self, files_metadata: List[Dict[str, Any]], model_override: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], str]:
        prompt = build_file_suggestions_prompt(files_metadata)
        parsed, used_model = self.generate_json(prompt, model_override)
        raw_suggestions = parsed.get("suggestions")
        if not isinstance(raw_suggestions, list):
            raise OllamaServiceError(
                "Model output did not include a valid 'suggestions' array.",
                code="invalid_suggestions_schema",
                status_code=502,
            )
        return raw_suggestions, used_model
