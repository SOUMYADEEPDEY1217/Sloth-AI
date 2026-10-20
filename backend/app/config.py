"""Configuration management for the SlothAI local backend."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


def _parse_cors_origins(raw: str) -> List[str]:
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    # Never allow wildcard '*' to preserve strict localhost CORS security
    return [o for o in origins if o != "*"] or [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


@dataclass
class BackendConfig:
    """Runtime settings loaded from environment variables with safe local defaults."""

    app_name: str = "SlothAI Local Backend"
    version: str = "0.2.0"
    host: str = field(
        default_factory=lambda: os.getenv("SLOTHAI_BACKEND_HOST", "127.0.0.1")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("SLOTHAI_BACKEND_PORT", "8000"))
    )
    cors_origins: List[str] = field(
        default_factory=lambda: _parse_cors_origins(
            os.getenv(
                "SLOTHAI_CORS_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
            )
        )
    )
    ollama_base_url: str = field(
        default_factory=lambda: os.getenv(
            "SLOTHAI_OLLAMA_BASE_URL", "http://127.0.0.1:11434"
        ).rstrip("/")
    )
    default_model: str = field(
        default_factory=lambda: os.getenv("SLOTHAI_DEFAULT_MODEL", "qwen3:4b")
    )
    ollama_timeout_seconds: float = field(
        default_factory=lambda: float(
            os.getenv("SLOTHAI_OLLAMA_TIMEOUT_SECONDS", "90")
        )
    )
    max_upload_bytes: int = field(
        default_factory=lambda: int(
            os.getenv("SLOTHAI_MAX_UPLOAD_BYTES", str(5 * 1024 * 1024))
        )
    )
    max_input_chars: int = field(
        default_factory=lambda: int(os.getenv("SLOTHAI_MAX_INPUT_CHARS", "60000"))
    )
    allowed_organize_root: Optional[str] = field(
        default_factory=lambda: os.getenv("SLOTHAI_ALLOWED_ORGANIZE_ROOT", "").strip()
        or None
    )

    def get_resolved_organize_root(self) -> Optional[Path]:
        """Return the canonical resolved path for allowed file operations, if configured."""
        if not self.allowed_organize_root:
            return None
        try:
            root_path = Path(self.allowed_organize_root).expanduser().resolve(strict=True)
            if root_path.is_dir():
                return root_path
            return None
        except (OSError, RuntimeError):
            return None


def get_config() -> BackendConfig:
    return BackendConfig()
