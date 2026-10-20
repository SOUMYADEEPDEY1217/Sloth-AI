"""FastAPI application and request controller for the SlothAI local backend."""

from __future__ import annotations

import base64
import logging
from typing import Any, Dict, Optional

from .config import BackendConfig, get_config
from .schemas import (
    BriefingRequest,
    ConnectionTestRequest,
    DocumentExtractRequest,
    ExtractTasksRequest,
    ModelPullRequest,
    OrganizeApplyRequest,
    OrganizeSuggestionsRequest,
    SummarizeRequest,
    validate_model_name,
    validate_non_empty_text,
)
from .services.document_service import (
    DocumentExtractionError,
    extract_text_from_upload,
)
from .services.file_organizer import (
    FileOrganizationSecurityError,
    apply_approved_file_operations,
    build_deterministic_suggestion,
    generate_file_suggestions,
)
from .services.ollama_service import OllamaService, OllamaServiceError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("slothai.main")


class SlothAIBackendController:
    """Core endpoint logic decoupled from HTTP transport for testability and reuse."""

    def __init__(
        self,
        config: Optional[BackendConfig] = None,
        ollama_service: Optional[OllamaService] = None,
    ) -> None:
        self.config = config or get_config()
        self.ollama = ollama_service or OllamaService(self.config)

    def get_health(self, target_model: Optional[str] = None) -> Dict[str, Any]:
        """GET /api/health - Verify backend status and check real Ollama availability."""
        ollama_check = self.ollama.check_health(target_model=target_model)
        resolved_root = self.config.get_resolved_organize_root()
        return {
            "status": "ok",
            "version": self.config.version,
            "backend_bind": f"{self.config.host}:{self.config.port}",
            "ollama_base_url": self.config.ollama_base_url,
            "default_model": self.config.default_model,
            "ollama_reachable": ollama_check["ollama_reachable"],
            "model_available": ollama_check["model_available"],
            "target_model": ollama_check["target_model"],
            "installed_models": ollama_check["installed_models"],
            "latency_ms": ollama_check["latency_ms"],
            "organize_root_configured": resolved_root is not None,
            "allowed_organize_root": str(resolved_root) if resolved_root else None,
            "error": ollama_check["error"],
            "recovery_hint": ollama_check["recovery_hint"],
        }

    def get_models(self) -> Dict[str, Any]:
        """GET /api/models - List installed models from local Ollama."""
        models = self.ollama.list_models()
        return {
            "success": True,
            "ollama_base_url": self.config.ollama_base_url,
            "default_model": self.config.default_model,
            "models": models,
        }

    def post_pull_model(self, req: ModelPullRequest) -> Dict[str, Any]:
        """POST /api/models/pull - Explicitly pull a user-requested model tag."""
        clean_model = validate_model_name(req.model)
        return self.ollama.pull_model(clean_model)

    def post_summarize(self, req: SummarizeRequest) -> Dict[str, Any]:
        """POST /api/summarize - Summarize text via local Ollama."""
        clean_text = validate_non_empty_text(
            req.text, max_chars=self.config.max_input_chars
        )
        if req.summary_length not in ("short", "balanced", "detailed"):
            raise ValueError(
                "summary_length must be 'short', 'balanced', or 'detailed'."
            )
        return self.ollama.summarize(
            clean_text,
            summary_length=req.summary_length,
            model_override=req.model,
        )

    def post_extract_tasks(self, req: ExtractTasksRequest) -> Dict[str, Any]:
        """POST /api/extract-tasks - Extract structured tasks via local Ollama."""
        clean_text = validate_non_empty_text(
            req.text, max_chars=self.config.max_input_chars
        )
        return self.ollama.extract_tasks(clean_text, model_override=req.model)

    def post_briefing(self, req: BriefingRequest) -> Dict[str, Any]:
        """POST /api/briefing - Generate structured daily briefing via local Ollama."""
        clean_text = validate_non_empty_text(
            req.text, max_chars=self.config.max_input_chars
        )
        return self.ollama.generate_briefing(clean_text, model_override=req.model)

    def post_organize_suggestions(
        self, req: OrganizeSuggestionsRequest, allow_rule_fallback: bool = False
    ) -> Dict[str, Any]:
        """POST /api/organize/suggestions - Propose safe file renames without modifying disk."""
        if not req.files:
            raise ValueError("At least one file metadata entry is required.")

        raw_files = [
            f.model_dump() if hasattr(f, "model_dump") else dict(f)  # type: ignore[arg-type]
            for f in req.files
        ]
        try:
            suggestions, used_model, _ = generate_file_suggestions(
                raw_files,
                permitted_filenames=req.permitted_filenames,
                ollama_service=self.ollama,
                model_override=req.model,
            )
            return {
                "success": True,
                "model": used_model,
                "source_mode": "live-ollama",
                "suggestions": suggestions,
            }
        except OllamaServiceError:
            if not allow_rule_fallback:
                raise
            deterministic = [build_deterministic_suggestion(f) for f in raw_files]
            return {
                "success": True,
                "model": "deterministic-rule-engine",
                "source_mode": "deterministic-fallback",
                "suggestions": deterministic,
            }

    def post_organize_apply(self, req: OrganizeApplyRequest) -> Dict[str, Any]:
        """POST /api/organize/apply - Validate and apply explicitly approved file operations."""
        ops = [
            op.model_dump() if hasattr(op, "model_dump") else dict(op)  # type: ignore[arg-type]
            for op in req.operations
        ]
        effective_root = self.config.allowed_organize_root
        return apply_approved_file_operations(
            operations=ops,
            configured_root=effective_root,
            dry_run=req.dry_run,
            user_confirmed=req.user_confirmed,
        )

    def post_extract_document_text(
        self, filename: str, content_bytes: bytes
    ) -> Dict[str, Any]:
        """POST /api/documents/extract-text - Extract text from .txt, .md, .pdf, .docx."""
        return extract_text_from_upload(
            filename=filename,
            content_bytes=content_bytes,
            max_upload_bytes=self.config.max_upload_bytes,
        )

    def post_connection_test(self, req: ConnectionTestRequest) -> Dict[str, Any]:
        """POST /api/connection/test - Test connectivity to local Ollama and return diagnostics."""
        return self.ollama.check_health(
            base_url_override=req.ollama_base_url,
            target_model=req.model,
        )


# FastAPI app registration when FastAPI is installed
try:
    from fastapi import FastAPI, Query, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse

    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False


def create_app(config: Optional[BackendConfig] = None) -> Any:
    """Create and configure the FastAPI application instance."""
    if not FASTAPI_AVAILABLE:
        raise RuntimeError(
            "FastAPI is not installed. Run 'pip install -r backend/requirements.txt'."
        )

    cfg = config or get_config()
    controller = SlothAIBackendController(config=cfg)

    app = FastAPI(
        title=cfg.app_name,
        version=cfg.version,
        description="Local-first FastAPI backend bridging SlothAI to local Ollama.",
        docs_url="/api/docs",
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cfg.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @app.exception_handler(OllamaServiceError)
    async def handle_ollama_error(_request: Request, exc: OllamaServiceError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.message,
                "code": exc.code,
                "recovery_hint": exc.recovery_hint,
            },
        )

    @app.exception_handler(DocumentExtractionError)
    async def handle_doc_error(_request: Request, exc: DocumentExtractionError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.message, "code": "document_error"},
        )

    @app.exception_handler(FileOrganizationSecurityError)
    async def handle_org_error(
        _request: Request, exc: FileOrganizationSecurityError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": exc.message, "code": "security_error"},
        )

    @app.exception_handler(ValueError)
    async def handle_val_error(_request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"success": False, "error": str(exc), "code": "validation_error"},
        )

    @app.get("/api/health")
    async def api_health(model: Optional[str] = Query(default=None)) -> Dict[str, Any]:
        return controller.get_health(target_model=model)

    @app.get("/api/models")
    async def api_models() -> Dict[str, Any]:
        return controller.get_models()

    @app.post("/api/models/pull")
    async def api_models_pull(req: ModelPullRequest) -> Dict[str, Any]:
        return controller.post_pull_model(req)

    @app.post("/api/summarize")
    async def api_summarize(req: SummarizeRequest) -> Dict[str, Any]:
        return controller.post_summarize(req)

    @app.post("/api/extract-tasks")
    async def api_extract_tasks(req: ExtractTasksRequest) -> Dict[str, Any]:
        return controller.post_extract_tasks(req)

    @app.post("/api/briefing")
    async def api_briefing(req: BriefingRequest) -> Dict[str, Any]:
        return controller.post_briefing(req)

    @app.post("/api/organize/suggestions")
    async def api_organize_suggestions(
        req: OrganizeSuggestionsRequest,
    ) -> Dict[str, Any]:
        return controller.post_organize_suggestions(
            req, allow_rule_fallback=bool(req.allow_rule_fallback)
        )

    @app.post("/api/organize/apply")
    async def api_organize_apply(req: OrganizeApplyRequest) -> Dict[str, Any]:
        return controller.post_organize_apply(req)

    @app.post("/api/documents/extract-text")
    async def api_extract_document_text(request: Request) -> Dict[str, Any]:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            payload = await request.json()
            doc_req = DocumentExtractRequest(**payload)
            raw_bytes = (
                base64.b64decode(doc_req.content_base64)
                if doc_req.content_base64
                else b""
            )
            return controller.post_extract_document_text(
                filename=doc_req.filename, content_bytes=raw_bytes
            )
        form = await request.form()
        upload = form.get("file")
        if upload is None or not hasattr(upload, "read"):
            raise ValueError("Missing file upload or JSON content_base64 payload.")
        content = await upload.read(cfg.max_upload_bytes + 1)  # type: ignore[misc]
        filename = getattr(upload, "filename", "") or ""
        return controller.post_extract_document_text(
            filename=filename, content_bytes=content
        )

    @app.post("/api/connection/test")
    async def api_connection_test(req: ConnectionTestRequest) -> Dict[str, Any]:
        return controller.post_connection_test(req)

    return app


app = create_app() if FASTAPI_AVAILABLE else None
