"""Secure document text extraction service supporting .txt, .md, .pdf, and .docx."""

from __future__ import annotations

import io
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict

SUPPORTED_TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".log"}
SUPPORTED_BINARY_EXTENSIONS = {".pdf", ".docx"}
ALL_SUPPORTED_EXTENSIONS = SUPPORTED_TEXT_EXTENSIONS | SUPPORTED_BINARY_EXTENSIONS


class DocumentExtractionError(Exception):
    """Raised when an uploaded document is unsupported, too large, empty, or malformed."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def extract_text_from_upload(
    filename: str,
    content_bytes: bytes,
    max_upload_bytes: int = 5 * 1024 * 1024,
) -> Dict[str, Any]:
    """Validate and extract plain text from a supported document buffer."""
    clean_name = Path(filename or "").name.strip()
    if not clean_name:
        raise DocumentExtractionError("Filename is missing.", status_code=400)

    ext = Path(clean_name).suffix.lower()
    if ext not in ALL_SUPPORTED_EXTENSIONS:
        raise DocumentExtractionError(
            f"Unsupported file format '{ext or 'unknown'}'. Supported formats: .txt, .md, .pdf, .docx, .csv, .json, .log.",
            status_code=415,
        )

    if len(content_bytes) == 0:
        raise DocumentExtractionError(
            f"Uploaded file '{clean_name}' is empty (0 bytes).",
            status_code=400,
        )

    if len(content_bytes) > max_upload_bytes:
        raise DocumentExtractionError(
            f"File '{clean_name}' ({len(content_bytes)} bytes) exceeds the {max_upload_bytes} byte limit.",
            status_code=413,
        )

    extracted_text = ""

    if ext in SUPPORTED_TEXT_EXTENSIONS:
        if b"\x00" in content_bytes[:4096]:
            raise DocumentExtractionError(
                f"File '{clean_name}' appears to be binary rather than valid UTF-8 text.",
                status_code=400,
            )
        try:
            extracted_text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                extracted_text = content_bytes.decode("latin-1")
            except Exception as exc:
                raise DocumentExtractionError(
                    f"Could not decode text file '{clean_name}'. Ensure it is UTF-8 encoded.",
                    status_code=400,
                ) from exc

    elif ext == ".docx":
        extracted_text = _extract_docx_bytes(clean_name, content_bytes)

    elif ext == ".pdf":
        extracted_text = _extract_pdf_bytes(clean_name, content_bytes)

    cleaned_text = extracted_text.strip()
    if not cleaned_text:
        raise DocumentExtractionError(
            f"No readable text content could be extracted from '{clean_name}'.",
            status_code=422,
        )

    return {
        "success": True,
        "filename": clean_name,
        "extension": ext,
        "size_bytes": len(content_bytes),
        "word_count": len(cleaned_text.split()),
        "char_count": len(cleaned_text),
        "text": cleaned_text,
    }


def _extract_docx_bytes(filename: str, content_bytes: bytes) -> str:
    """Extract text from .docx using python-docx if installed, or safe stdlib XML zip parsing."""
    try:
        import docx  # type: ignore[import-not-found]

        doc = docx.Document(io.BytesIO(content_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text]
        return "\n".join(paragraphs)
    except ImportError:
        pass
    except Exception as exc:
        raise DocumentExtractionError(
            f"Malformed .docx file '{filename}': {exc}", status_code=422
        ) from exc

    # Safe stdlib fallback for .docx (OpenXML word/document.xml)
    try:
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as zf:
            if "word/document.xml" not in zf.namelist():
                raise DocumentExtractionError(
                    f"File '{filename}' is not a valid .docx archive.",
                    status_code=422,
                )
            xml_bytes = zf.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            texts = [elem.text for elem in root.iter() if elem.tag.endswith("}t") and elem.text]
            return " ".join(texts)
    except DocumentExtractionError:
        raise
    except Exception as exc:
        raise DocumentExtractionError(
            f"Failed to parse .docx file '{filename}'.", status_code=422
        ) from exc


def _extract_pdf_bytes(filename: str, content_bytes: bytes) -> str:
    """Extract text from .pdf using pypdf."""
    if not content_bytes.startswith(b"%PDF-"):
        raise DocumentExtractionError(
            f"File '{filename}' does not have a valid PDF header.",
            status_code=422,
        )
    try:
        import pypdf  # type: ignore[import-not-found]

        reader = pypdf.PdfReader(io.BytesIO(content_bytes))
        pages_text = []
        for page in reader.pages:
            page_txt = page.extract_text() or ""
            if page_txt.strip():
                pages_text.append(page_txt)
        return "\n\n".join(pages_text)
    except ImportError as exc:
        raise DocumentExtractionError(
            "PDF text extraction requires the 'pypdf' package in the Python backend environment (pip install -r backend/requirements.txt).",
            status_code=501,
        ) from exc
    except Exception as exc:
        raise DocumentExtractionError(
            f"Malformed or encrypted PDF file '{filename}': {exc}",
            status_code=422,
        ) from exc
