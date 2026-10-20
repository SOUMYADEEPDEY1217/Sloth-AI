"""Safe file organization suggestion and path-validated execution service."""

from __future__ import annotations

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .ollama_service import OllamaService, OllamaServiceError


DANGEROUS_EXTENSIONS = {
    "exe", "bat", "cmd", "com", "scr", "vbs", "ps1", "msi", "dll", "sys"
}


class FileOrganizationSecurityError(Exception):
    """Raised when a file operation violates directory confinement, symlink, or overwrite rules."""

    def __init__(self, message: str, status_code: int = 403) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def sanitize_filename(name: str, required_ext: str) -> str:
    """Produce a safe kebab-case filename preserving the original extension."""
    clean = Path(name).name
    stem = Path(clean).stem
    stem = re.sub(r"\b(final|copy|v\d+|draft|new|edited|\(\d+\))\b", "", stem, flags=re.IGNORECASE)
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()
    if not slug:
        slug = "document"
    slug = slug[:80]
    ext = required_ext.lstrip(".").lower()
    return f"{slug}.{ext}" if ext else slug


def sanitize_relative_folder(folder: str) -> str:
    """Ensure suggested folder is a clean relative subpath with no traversal segments."""
    if not folder or "\x00" in folder:
        return "General"
    normalized = folder.replace("\\", "/").strip("/")
    parts = []
    for part in normalized.split("/"):
        clean_part = re.sub(r"[^a-zA-Z0-9_-]+", "-", part.strip()).strip("-")
        if clean_part and clean_part not in (".", ".."):
            parts.append(clean_part)
    return "/".join(parts[:3]) if parts else "General"


def build_deterministic_suggestion(file_meta: Dict[str, Any]) -> Dict[str, str]:
    """Generate a deterministic, safe suggestion for a file."""
    original_name = Path(str(file_meta.get("filename") or "untitled.txt")).name
    ext = Path(original_name).suffix.lstrip(".").lower()
    lower_name = original_name.lower()
    excerpt = str(file_meta.get("content_excerpt") or "").lower()
    combined = f"{lower_name} {excerpt}"

    category = "General Documents"
    folder = "Documents/General"
    prefix = "doc"
    reason = "Standardized filename and organized by document type."

    if any(k in combined for k in ("invoice", "receipt", "billing", "tax", "statement", "expense")):
        category = "Finance & Accounting"
        folder = "Finance/Records"
        prefix = "finance"
        reason = "Identified financial terminology; organized under Finance/Records."
    elif any(k in combined for k in ("meeting", "notes", "standup", "minutes", "retro", "agenda")):
        category = "Meeting Notes"
        folder = "Workspace/Meetings"
        prefix = "notes"
        reason = "Detected meeting or notes context; routed to Workspace/Meetings."
    elif any(k in combined for k in ("spec", "architecture", "rfc", "roadmap", "proposal", "design")):
        category = "Product & Specifications"
        folder = "Projects/Specs"
        prefix = "spec"
        reason = "Matched technical specification or planning terminology."
    elif ext in ("png", "jpg", "jpeg", "webp", "svg", "gif"):
        category = "Visual Assets"
        folder = "Media/Images"
        prefix = "asset"
        reason = f"Image file (.{ext}) routed to Media/Images."
    elif ext in ("csv", "xlsx", "json", "parquet", "sql"):
        category = "Datasets & Exports"
        folder = "Data/Exports"
        prefix = "data"
        reason = f"Structured data file (.{ext}) routed to Data/Exports."

    date_prefix = "2026-10-20"
    last_mod = file_meta.get("last_modified")
    if isinstance(last_mod, str) and len(last_mod) >= 10 and re.match(r"^\d{4}-\d{2}-\d{2}", last_mod):
        date_prefix = last_mod[:10]

    base_clean = sanitize_filename(original_name, ext)
    suggested_filename = (
        f"{date_prefix}-{prefix}-{base_clean}"
        if not base_clean.startswith(date_prefix)
        else base_clean
    )

    return {
        "original_filename": original_name,
        "suggested_filename": suggested_filename,
        "suggested_folder": folder,
        "category": category,
        "reason": reason,
    }


def generate_file_suggestions(
    files: List[Dict[str, Any]],
    permitted_filenames: Optional[List[str]],
    ollama_service: OllamaService,
    model_override: Optional[str] = None,
) -> Tuple[List[Dict[str, str]], str, bool]:
    """
    Generate file organization suggestions using Ollama (when reachable) with strict
    extension & path sanitization. Never modifies the filesystem.
    Returns (suggestions, model_name_or_mode, used_live_model).
    """
    allowed_set = (
        {Path(fn).name for fn in permitted_filenames if fn}
        if permitted_filenames
        else None
    )

    filtered_files: List[Dict[str, Any]] = []
    for f in files:
        orig_name = Path(str(f.get("filename") or "")).name
        if not orig_name:
            continue
        if allowed_set is not None and orig_name not in allowed_set:
            raise FileOrganizationSecurityError(
                f"File '{orig_name}' is not in the permitted_filenames list.",
                status_code=400,
            )
        filtered_files.append({**f, "filename": orig_name})

    if not filtered_files:
        return [], "none", False

    # Try Ollama model enrichment first
    try:
        raw_suggestions, used_model = ollama_service.suggest_file_organization(
            filtered_files, model_override=model_override
        )
        by_orig = {
            Path(str(item.get("original_filename") or "")).name: item
            for item in raw_suggestions
            if isinstance(item, dict)
        }
        final_suggestions: List[Dict[str, str]] = []
        for f in filtered_files:
            orig_name = f["filename"]
            orig_ext = Path(orig_name).suffix.lstrip(".").lower()
            fallback = build_deterministic_suggestion(f)
            ai_item = by_orig.get(orig_name)
            if not ai_item:
                final_suggestions.append(fallback)
                continue

            safe_name = sanitize_filename(
                str(ai_item.get("suggested_filename") or fallback["suggested_filename"]),
                orig_ext,
            )
            safe_folder = sanitize_relative_folder(
                str(ai_item.get("suggested_folder") or fallback["suggested_folder"])
            )
            final_suggestions.append(
                {
                    "original_filename": orig_name,
                    "suggested_filename": safe_name,
                    "suggested_folder": safe_folder,
                    "category": str(ai_item.get("category") or fallback["category"]).strip(),
                    "reason": str(ai_item.get("reason") or fallback["reason"]).strip(),
                }
            )
        return final_suggestions, used_model, True
    except OllamaServiceError:
        # When Ollama is unreachable, raise so caller knows live model failed or can handle explicitly
        raise


def _validate_confined_path(
    root_real: str,
    relative_subpath: str,
    must_exist: bool,
) -> Path:
    """
    Validate that relative_subpath stays strictly inside root_real without
    path traversal ('..'), drive jumps, null bytes, or symlink escapes.
    """
    if not relative_subpath or "\x00" in relative_subpath:
        raise FileOrganizationSecurityError("Invalid or empty file path.", status_code=400)

    normalized_rel = relative_subpath.replace("\\", "/")
    if normalized_rel.startswith("/") or re.match(r"^[a-zA-Z]:", normalized_rel):
        raise FileOrganizationSecurityError(
            f"Absolute paths are forbidden ('{relative_subpath}'). Paths must be relative to the configured root directory.",
            status_code=403,
        )

    parts = [p for p in normalized_rel.split("/") if p]
    if not parts or any(p in (".", "..") for p in parts):
        raise FileOrganizationSecurityError(
            f"Path traversal segment detected in '{relative_subpath}'. Operation rejected.",
            status_code=403,
        )

    candidate = Path(root_real).joinpath(*parts)

    # Walk existing ancestors to detect any symlink inside the tree
    curr = Path(root_real)
    for part in parts:
        curr = curr / part
        if curr.exists() or curr.is_symlink():
            if curr.is_symlink():
                raise FileOrganizationSecurityError(
                    f"Symlink detected at '{relative_subpath}'. Symlinks are rejected to prevent directory escape.",
                    status_code=403,
                )

    resolved_str = os.path.realpath(str(candidate))
    # Ensure resolved_str is strictly a child of root_real
    try:
        common = os.path.commonpath([root_real, resolved_str])
    except ValueError as exc:
        raise FileOrganizationSecurityError(
            "Path escapes configured drive or root directory.", status_code=403
        ) from exc

    if common != root_real or resolved_str == root_real:
        raise FileOrganizationSecurityError(
            f"Path '{relative_subpath}' escapes the configured allowed directory.",
            status_code=403,
        )

    if must_exist and not os.path.isfile(resolved_str):
        raise FileOrganizationSecurityError(
            f"Source file '{relative_subpath}' does not exist in the allowed directory.",
            status_code=404,
        )

    return Path(resolved_str)


def apply_approved_file_operations(
    operations: List[Dict[str, Any]],
    configured_root: Optional[str],
    dry_run: bool = True,
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    """
    Validate and optionally execute explicitly approved file renames/moves within configured_root.
    - Never deletes files.
    - Never overwrites existing files.
    - Validates all operations before moving any file.
    - Rolls back completed moves if an unexpected OS error occurs mid-batch.
    """
    if not configured_root or not configured_root.strip():
        raise FileOrganizationSecurityError(
            "Local directory modification is disabled because SLOTHAI_ALLOWED_ORGANIZE_ROOT is not configured. "
            "Configure an allowed root directory in backend/.env to enable apply operations.",
            status_code=403,
        )

    root_candidate = Path(configured_root).expanduser()
    if root_candidate.is_symlink() or not root_candidate.is_dir():
        raise FileOrganizationSecurityError(
            "Configured SLOTHAI_ALLOWED_ORGANIZE_ROOT does not exist or is a symlink.",
            status_code=403,
        )
    root_real = os.path.realpath(str(root_candidate))

    if not operations:
        raise FileOrganizationSecurityError(
            "No operations provided.", status_code=400
        )

    if not dry_run and not user_confirmed:
        raise FileOrganizationSecurityError(
            "Explicit user confirmation (user_confirmed=True) is required to apply file operations.",
            status_code=400,
        )

    validated_plan: List[Tuple[Path, Path, str, str]] = []
    seen_destinations: set[str] = set()
    seen_sources: set[str] = set()

    # Phase 1: Pre-flight validation of EVERY operation before touching the disk
    for idx, op in enumerate(operations):
        if not op.get("approved", False):
            raise FileOrganizationSecurityError(
                f"Operation #{idx + 1} ('{op.get('source_relative_path')}') is not marked approved. "
                "Only explicitly approved operations may be submitted to /api/organize/apply.",
                status_code=400,
            )

        src_rel = str(op.get("source_relative_path") or "").strip()
        dest_folder = str(op.get("destination_folder") or "").strip()
        new_name = str(op.get("new_filename") or "").strip()

        if not src_rel or not new_name:
            raise FileOrganizationSecurityError(
                f"Operation #{idx + 1} is missing source_relative_path or new_filename.",
                status_code=400,
            )

        if "/" in new_name or "\\" in new_name or new_name in (".", ".."):
            raise FileOrganizationSecurityError(
                f"Invalid new_filename '{new_name}'. Must be a base filename without path separators.",
                status_code=400,
            )

        src_path = _validate_confined_path(root_real, src_rel, must_exist=True)

        # Ensure extension is preserved and not mutated into an executable
        src_ext = src_path.suffix.lstrip(".").lower()
        dst_ext = Path(new_name).suffix.lstrip(".").lower()
        if dst_ext in DANGEROUS_EXTENSIONS and dst_ext != src_ext:
            raise FileOrganizationSecurityError(
                f"Renaming '{src_rel}' to executable extension '.{dst_ext}' is blocked.",
                status_code=403,
            )

        clean_dest_folder = dest_folder.strip("/\\")
        dest_rel = f"{clean_dest_folder}/{new_name}" if clean_dest_folder else new_name
        dst_path = _validate_confined_path(root_real, dest_rel, must_exist=False)

        if dst_path.exists() or dst_path.is_symlink():
            raise FileOrganizationSecurityError(
                f"Destination file '{dest_rel}' already exists. Overwriting existing files is forbidden.",
                status_code=409,
            )

        src_key = os.path.normcase(str(src_path))
        dst_key = os.path.normcase(str(dst_path))
        if src_key in seen_sources:
            raise FileOrganizationSecurityError(
                f"Duplicate source file '{src_rel}' in batch.", status_code=400
            )
        if dst_key in seen_destinations:
            raise FileOrganizationSecurityError(
                f"Duplicate destination path '{dest_rel}' in batch.", status_code=409
            )

        seen_sources.add(src_key)
        seen_destinations.add(dst_key)
        validated_plan.append((src_path, dst_path, src_rel, dest_rel))

    # If dry_run preview mode, return the validated preview without modifying files
    if dry_run:
        return {
            "success": True,
            "dry_run": True,
            "allowed_root": root_real,
            "results": [
                {
                    "source_relative_path": src_rel,
                    "destination_relative_path": dest_rel,
                    "status": "validated_preview",
                    "error": None,
                }
                for _, _, src_rel, dest_rel in validated_plan
            ],
        }

    # Phase 2: Execute validated operations with automatic rollback on unexpected OS error
    completed_moves: List[Tuple[Path, Path, str, str]] = []
    results: List[Dict[str, Any]] = []

    try:
        for src_path, dst_path, src_rel, dest_rel in validated_plan:
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            # Final atomic check before move
            if dst_path.exists():
                raise FileExistsError(f"Destination '{dest_rel}' already exists.")
            shutil.move(str(src_path), str(dst_path))
            completed_moves.append((src_path, dst_path, src_rel, dest_rel))
            results.append(
                {
                    "source_relative_path": src_rel,
                    "destination_relative_path": dest_rel,
                    "status": "applied",
                    "error": None,
                }
            )
    except Exception as exc:
        # Roll back any moves already performed in this batch
        rollback_errors: List[str] = []
        for orig_src, moved_dst, _, _ in reversed(completed_moves):
            try:
                if moved_dst.exists() and not orig_src.exists():
                    shutil.move(str(moved_dst), str(orig_src))
            except Exception as rb_exc:
                rollback_errors.append(str(rb_exc))

        raise FileOrganizationSecurityError(
            f"Batch aborted due to filesystem error ({exc}). "
            f"Rolled back {len(completed_moves)} operation(s)."
            + (f" Rollback warnings: {rollback_errors}" if rollback_errors else ""),
            status_code=500,
        ) from exc

    return {
        "success": True,
        "dry_run": False,
        "allowed_root": root_real,
        "results": results,
    }
