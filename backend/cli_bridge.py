"""JSON stdio bridge allowing Node/Express dev preview to invoke SlothAIBackendController directly when uvicorn is not running separately."""

from __future__ import annotations

import base64
import json
import sys
from typing import Any, Dict

from app.config import get_config
from app.main import SlothAIBackendController
from app.schemas import (
    ApprovedFileOperation,
    BriefingRequest,
    ConnectionTestRequest,
    ExtractTasksRequest,
    FileMetadataInput,
    ModelPullRequest,
    OrganizeApplyRequest,
    OrganizeSuggestionsRequest,
    SummarizeRequest,
)
from app.services.document_service import DocumentExtractionError
from app.services.file_organizer import FileOrganizationSecurityError
from app.services.ollama_service import OllamaServiceError


def main() -> None:
    try:
        raw_input = sys.stdin.read()
        envelope = json.loads(raw_input) if raw_input.strip() else {}
        action = envelope.get("action", "")
        payload = envelope.get("payload", {}) or {}

        cfg = get_config()
        if payload.get("_ollama_base_url"):
            cfg.ollama_base_url = str(payload["_ollama_base_url"]).rstrip("/")
        if payload.get("_allowed_organize_root"):
            cfg.allowed_organize_root = str(payload["_allowed_organize_root"]).strip()

        controller = SlothAIBackendController(config=cfg)

        result: Dict[str, Any]
        if action == "health":
            result = controller.get_health(target_model=payload.get("model"))
        elif action == "models":
            result = controller.get_models()
        elif action == "models_pull":
            result = controller.post_pull_model(
                ModelPullRequest(model=str(payload.get("model", "")))
            )
        elif action == "summarize":
            result = controller.post_summarize(
                SummarizeRequest(
                    text=str(payload.get("text", "")),
                    summary_length=payload.get("summary_length", "balanced"),
                    model=payload.get("model"),
                )
            )
        elif action == "extract_tasks":
            result = controller.post_extract_tasks(
                ExtractTasksRequest(
                    text=str(payload.get("text", "")),
                    model=payload.get("model"),
                )
            )
        elif action == "briefing":
            result = controller.post_briefing(
                BriefingRequest(
                    text=str(payload.get("text", "")),
                    model=payload.get("model"),
                )
            )
        elif action == "organize_suggestions":
            files_in = [
                FileMetadataInput(**f) for f in (payload.get("files") or [])
            ]
            result = controller.post_organize_suggestions(
                OrganizeSuggestionsRequest(
                    files=files_in,
                    permitted_filenames=payload.get("permitted_filenames"),
                    model=payload.get("model"),
                ),
                allow_rule_fallback=bool(payload.get("allow_rule_fallback", False)),
            )
        elif action == "organize_apply":
            ops_in = [
                ApprovedFileOperation(**op)
                for op in (payload.get("operations") or [])
            ]
            result = controller.post_organize_apply(
                OrganizeApplyRequest(
                    operations=ops_in,
                    dry_run=bool(payload.get("dry_run", True)),
                    user_confirmed=bool(payload.get("user_confirmed", False)),
                )
            )
        elif action == "extract_document_text":
            b64_content = str(payload.get("content_base64", ""))
            content_bytes = base64.b64decode(b64_content) if b64_content else b""
            result = controller.post_extract_document_text(
                filename=str(payload.get("filename", "")),
                content_bytes=content_bytes,
            )
        elif action == "connection_test":
            result = controller.post_connection_test(
                ConnectionTestRequest(
                    ollama_base_url=payload.get("ollama_base_url"),
                    model=payload.get("model"),
                )
            )
        else:
            sys.stdout.write(
                json.dumps(
                    {
                        "_status": 400,
                        "body": {"success": False, "error": f"Unknown action: {action}"},
                    }
                )
            )
            return

        sys.stdout.write(json.dumps({"_status": 200, "body": result}))

    except OllamaServiceError as exc:
        sys.stdout.write(
            json.dumps(
                {
                    "_status": exc.status_code,
                    "body": {
                        "success": False,
                        "error": exc.message,
                        "code": exc.code,
                        "recovery_hint": exc.recovery_hint,
                    },
                }
            )
        )
    except DocumentExtractionError as exc:
        sys.stdout.write(
            json.dumps(
                {
                    "_status": exc.status_code,
                    "body": {
                        "success": False,
                        "error": exc.message,
                        "code": "document_error",
                    },
                }
            )
        )
    except FileOrganizationSecurityError as exc:
        sys.stdout.write(
            json.dumps(
                {
                    "_status": exc.status_code,
                    "body": {
                        "success": False,
                        "error": exc.message,
                        "code": "security_error",
                    },
                }
            )
        )
    except ValueError as exc:
        sys.stdout.write(
            json.dumps(
                {
                    "_status": 422,
                    "body": {
                        "success": False,
                        "error": str(exc),
                        "code": "validation_error",
                    },
                }
            )
        )
    except Exception as exc:
        sys.stdout.write(
            json.dumps(
                {
                    "_status": 500,
                    "body": {
                        "success": False,
                        "error": "Internal backend error.",
                        "code": "internal_error",
                    },
                }
            )
        )


if __name__ == "__main__":
    main()
