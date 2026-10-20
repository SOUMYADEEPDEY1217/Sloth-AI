"""Request and response schemas with strict validation for SlothAI Backend."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Literal, Optional

try:
    from pydantic import BaseModel, Field, field_validator
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False

    class BaseModel:  # type: ignore[no-redef]
        """Lightweight fallback when running unit tests in minimal Python environments."""

        def __init__(self, **kwargs: Any) -> None:
            for k, v in kwargs.items():
                setattr(self, k, v)
            if hasattr(self, "_validate"):
                self._validate()

        def model_dump(self) -> Dict[str, Any]:
            result: Dict[str, Any] = {}
            for k, v in self.__dict__.items():
                if isinstance(v, BaseModel):
                    result[k] = v.model_dump()
                elif isinstance(v, list):
                    result[k] = [
                        item.model_dump() if isinstance(item, BaseModel) else item
                        for item in v
                    ]
                else:
                    result[k] = v
            return result

    def Field(default: Any = None, **kwargs: Any) -> Any:  # type: ignore[misc]
        return default

    def field_validator(*args: Any, **kwargs: Any) -> Any:  # type: ignore[misc]
        def decorator(fn: Any) -> Any:
            return fn
        return decorator


MODEL_NAME_REGEX = re.compile(r"^[a-zA-Z0-9._:/-]{1,120}$")
SUMMARY_LENGTHS = ("short", "balanced", "detailed")
TASK_PRIORITIES = ("high", "medium", "low", "unspecified")
PRIORITY_SOURCES = ("explicit", "inferred", "none")


def validate_model_name(model_name: str) -> str:
    cleaned = (model_name or "").strip()
    if not cleaned:
        raise ValueError("Model name must not be empty.")
    if not MODEL_NAME_REGEX.match(cleaned):
        raise ValueError(
            "Invalid model name format. Only alphanumeric characters, colons, dots, slashes, and hyphens are permitted."
        )
    return cleaned


def validate_non_empty_text(text: str, max_chars: int = 60000) -> str:
    if not isinstance(text, str):
        raise ValueError("Input text must be a string.")
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Input text cannot be empty.")
    if len(cleaned) > max_chars:
        raise ValueError(
            f"Input text exceeds maximum allowed length of {max_chars} characters."
        )
    return cleaned


class SummarizeRequest(BaseModel):
    text: str = Field(..., description="Source document or text to summarize")
    summary_length: Literal["short", "balanced", "detailed"] = Field(
        default="balanced"
    )
    model: Optional[str] = Field(default=None)

    @field_validator("text")
    @classmethod
    def _check_text(cls, v: str) -> str:
        return validate_non_empty_text(v)

    @field_validator("summary_length")
    @classmethod
    def _check_length(cls, v: str) -> str:
        if v not in SUMMARY_LENGTHS:
            raise ValueError("summary_length must be 'short', 'balanced', or 'detailed'.")
        return v

    def _validate(self) -> None:
        self.text = validate_non_empty_text(getattr(self, "text", ""))
        length = getattr(self, "summary_length", "balanced")
        if length not in SUMMARY_LENGTHS:
            raise ValueError("summary_length must be 'short', 'balanced', or 'detailed'.")
        self.summary_length = length
        if getattr(self, "model", None):
            self.model = validate_model_name(self.model)  # type: ignore[arg-type]


class SummarizePayload(BaseModel):
    title: str = Field(default="Document Summary")
    executive_summary: str = Field(...)
    key_points: List[str] = Field(default_factory=list)
    notable_terms: List[str] = Field(default_factory=list)
    uncertainty_notes: Optional[str] = Field(default=None)


class SummarizeResponse(BaseModel):
    success: bool
    model: str
    summary_length: str
    summary: SummarizePayload
    source_word_count: int
    summary_word_count: int


class ExtractTasksRequest(BaseModel):
    text: str = Field(..., description="Source notes or document text")
    model: Optional[str] = Field(default=None)

    @field_validator("text")
    @classmethod
    def _check_text(cls, v: str) -> str:
        return validate_non_empty_text(v)

    def _validate(self) -> None:
        self.text = validate_non_empty_text(getattr(self, "text", ""))
        if getattr(self, "model", None):
            self.model = validate_model_name(self.model)  # type: ignore[arg-type]


class TaskItemSchema(BaseModel):
    title: str
    description: str = ""
    deadline: Optional[str] = None
    priority: Literal["high", "medium", "low", "unspecified"] = "unspecified"
    priority_source: Literal["explicit", "inferred", "none"] = "none"
    source_evidence: Optional[str] = None

    def _validate(self) -> None:
        title = str(getattr(self, "title", "")).strip()
        if not title:
            raise ValueError("Task title cannot be empty.")
        self.title = title
        self.description = str(getattr(self, "description", "")).strip()
        raw_dl = getattr(self, "deadline", None)
        self.deadline = (
            str(raw_dl).strip()
            if isinstance(raw_dl, str) and str(raw_dl).strip()
            else None
        )
        prio = str(getattr(self, "priority", "unspecified")).lower()
        self.priority = prio if prio in TASK_PRIORITIES else "unspecified"  # type: ignore[assignment]
        psrc = str(getattr(self, "priority_source", "none")).lower()
        self.priority_source = psrc if psrc in PRIORITY_SOURCES else "none"  # type: ignore[assignment]
        ev = getattr(self, "source_evidence", None)
        self.source_evidence = str(ev).strip() if ev else None


class ExtractTasksResponse(BaseModel):
    success: bool
    model: str
    tasks: List[TaskItemSchema]


class BriefingRequest(BaseModel):
    text: str = Field(..., description="Source notes or documents")
    model: Optional[str] = Field(default=None)

    @field_validator("text")
    @classmethod
    def _check_text(cls, v: str) -> str:
        return validate_non_empty_text(v)

    def _validate(self) -> None:
        self.text = validate_non_empty_text(getattr(self, "text", ""))
        if getattr(self, "model", None):
            self.model = validate_model_name(self.model)  # type: ignore[arg-type]


class ExplicitDeadlineItem(BaseModel):
    item: str
    deadline_text: str


class BriefingResponse(BaseModel):
    success: bool
    model: str
    summary: str
    key_points: List[str]
    action_items: List[str]
    explicit_deadlines: List[ExplicitDeadlineItem]
    follow_up_questions: List[str]


class FileMetadataInput(BaseModel):
    filename: str
    mime_type: Optional[str] = "application/octet-stream"
    size_bytes: Optional[int] = None
    last_modified: Optional[str] = None
    content_excerpt: Optional[str] = None


class OrganizeSuggestionsRequest(BaseModel):
    files: List[FileMetadataInput]
    permitted_filenames: Optional[List[str]] = None
    model: Optional[str] = None
    allow_rule_fallback: bool = False


class DocumentExtractRequest(BaseModel):
    filename: str
    content_base64: str


class FileSuggestionItem(BaseModel):
    original_filename: str
    suggested_filename: str
    suggested_folder: str
    category: str
    reason: str


class OrganizeSuggestionsResponse(BaseModel):
    success: bool
    model: str
    suggestions: List[FileSuggestionItem]


class ApprovedFileOperation(BaseModel):
    source_relative_path: str
    destination_folder: str
    new_filename: str
    approved: bool = False


class OrganizeApplyRequest(BaseModel):
    operations: List[ApprovedFileOperation]
    dry_run: bool = True
    user_confirmed: bool = False
    allowed_root_override: Optional[str] = None


class ModelPullRequest(BaseModel):
    model: str

    @field_validator("model")
    @classmethod
    def _check_model(cls, v: str) -> str:
        return validate_model_name(v)

    def _validate(self) -> None:
        self.model = validate_model_name(getattr(self, "model", ""))


class ConnectionTestRequest(BaseModel):
    ollama_base_url: Optional[str] = None
    model: Optional[str] = None
