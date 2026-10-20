"""Automated unit, security, and end-to-end flow tests for the SlothAI Backend."""

from __future__ import annotations

import io
import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from app.config import BackendConfig
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
    validate_model_name,
)
from app.services.document_service import (
    DocumentExtractionError,
    extract_text_from_upload,
)
from app.services.file_organizer import (
    FileOrganizationSecurityError,
    apply_approved_file_operations,
)
from app.services.ollama_service import OllamaService, OllamaServiceError


class SlothAIBackendTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.allowed_root = Path(self.temp_dir.name)
        self.config = BackendConfig(
            ollama_base_url="http://127.0.0.1:11434",
            default_model="qwen3:4b",
            allowed_organize_root=str(self.allowed_root),
            max_upload_bytes=1024 * 1024,
        )
        self.ollama = OllamaService(self.config)
        self.controller = SlothAIBackendController(
            config=self.config, ollama_service=self.ollama
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    # FLOW A & B: First Start & Model Connection / Health / Model List / Pull
    def test_flow_a_first_start_when_ollama_unreachable(self) -> None:
        with patch.object(
            self.ollama,
            "_http_request",
            side_effect=OllamaServiceError(
                "Cannot reach local Ollama service", code="ollama_unreachable"
            ),
        ):
            health = self.controller.get_health()
            self.assertEqual(health["status"], "ok")
            self.assertFalse(health["ollama_reachable"])
            self.assertFalse(health["model_available"])
            self.assertIsNotNone(health["error"])
            self.assertIsNotNone(health["recovery_hint"])

    def test_flow_b_model_connection_listing_and_missing_model_warning(self) -> None:
        mock_tags = {
            "models": [
                {
                    "name": "qwen3:4b",
                    "size": 2500000000,
                    "modified_at": "2026-10-20T00:00:00Z",
                    "details": {
                        "family": "qwen3",
                        "parameter_size": "4B",
                        "quantization_level": "Q4_K_M",
                    },
                }
            ]
        }
        with patch.object(self.ollama, "_http_request", return_value=mock_tags):
            # 1. Health check with installed model
            health = self.controller.get_health(target_model="qwen3:4b")
            self.assertTrue(health["ollama_reachable"])
            self.assertTrue(health["model_available"])

            # 2. List installed models (/api/models)
            models_res = self.controller.get_models()
            self.assertTrue(models_res["success"])
            self.assertEqual(len(models_res["models"]), 1)
            self.assertEqual(models_res["models"][0]["name"], "qwen3:4b")

            # 3. Connection test with unavailable model produces actionable error
            conn_test = self.controller.post_connection_test(
                ConnectionTestRequest(model="llama3.3:70b")
            )
            self.assertTrue(conn_test["ollama_reachable"])
            self.assertFalse(conn_test["model_available"])
            self.assertIn("llama3.3:70b", conn_test["error"])
            self.assertIn("ollama pull llama3.3:70b", conn_test["recovery_hint"])

        # 4. Explicit model pull (/api/models/pull)
        with patch.object(
            self.ollama, "_http_request", return_value={"status": "success"}
        ):
            pull_res = self.controller.post_pull_model(
                ModelPullRequest(model="qwen3:4b")
            )
            self.assertTrue(pull_res["success"])
            self.assertEqual(pull_res["model"], "qwen3:4b")

    # FLOW C: Summarization, empty input validation, and backend failure handling
    def test_flow_c_summarization_and_error_handling(self) -> None:
        # Empty input rejected
        with self.assertRaises(ValueError):
            SummarizeRequest(text="   ", summary_length="balanced")

        # Invalid summary_length rejected
        with self.assertRaises(ValueError):
            SummarizeRequest(text="Valid text here.", summary_length="invalid_mode")  # type: ignore[arg-type]

        # Command injection in model name rejected
        with self.assertRaises(ValueError):
            validate_model_name("qwen3:4b; rm -rf /")

        # Malformed model output rejected safely
        with patch.object(
            self.ollama,
            "_http_request",
            return_value={"response": "Not valid JSON output"},
        ):
            req = SummarizeRequest(
                text="SlothAI processes documents locally using open-weight models.",
                summary_length="short",
            )
            with self.assertRaises(OllamaServiceError) as ctx:
                self.controller.post_summarize(req)
            self.assertEqual(ctx.exception.code, "malformed_model_output")

        # Valid model inference
        mock_llm_response = {
            "response": '{"title": "Local AI Architecture", "executive_summary": "A concise summary of local AI.", "key_points": ["Runs on localhost", "Zero cloud telemetry"], "notable_terms": ["ollama", "qwen3"], "uncertainty_notes": null}'
        }
        with patch.object(self.ollama, "_http_request", return_value=mock_llm_response):
            req = SummarizeRequest(
                text="SlothAI runs on localhost with zero cloud telemetry using Ollama and qwen3.",
                summary_length="short",
                model="qwen3:4b",
            )
            res = self.controller.post_summarize(req)
            self.assertTrue(res["success"])
            self.assertEqual(res["model"], "qwen3:4b")
            self.assertEqual(
                res["summary"]["executive_summary"], "A concise summary of local AI."
            )

    # FLOW D: Task Extraction with explicit deadline vs. no deadline (anti-fabrication)
    def test_flow_d_task_extraction_deadline_grounding(self) -> None:
        # Case 1: Text with explicit deadline preserves it accurately
        mock_tasks_with_dl = {
            "response": """{
              "tasks": [
                {
                  "title": "Audit CORS configuration",
                  "description": "Verify localhost origin headers",
                  "deadline": "October 24, 2026",
                  "priority": "high",
                  "priority_source": "explicit",
                  "source_evidence": "Urgent: Audit CORS configuration due October 24, 2026"
                }
              ]
            }"""
        }
        with patch.object(self.ollama, "_http_request", return_value=mock_tasks_with_dl):
            req1 = ExtractTasksRequest(
                text="Urgent: Audit CORS configuration due October 24, 2026."
            )
            res1 = self.controller.post_extract_tasks(req1)
            self.assertEqual(res1["tasks"][0]["deadline"], "October 24, 2026")
            self.assertEqual(res1["tasks"][0]["priority"], "high")

        # Case 2: Text with NO deadline strips any fabricated deadline from model output
        mock_tasks_fabricated_dl = {
            "response": """{
              "tasks": [
                {
                  "title": "Refactor sidebar component",
                  "description": "Clean up navigation props",
                  "deadline": "December 31, 2026",
                  "priority": "medium",
                  "priority_source": "inferred"
                }
              ]
            }"""
        }
        with patch.object(
            self.ollama, "_http_request", return_value=mock_tasks_fabricated_dl
        ):
            req2 = ExtractTasksRequest(
                text="Please refactor the sidebar component and clean up navigation props."
            )
            res2 = self.controller.post_extract_tasks(req2)
            self.assertIsNone(res2["tasks"][0]["deadline"])

    # FLOW E: Daily Briefing generation
    def test_flow_e_daily_briefing(self) -> None:
        mock_briefing_json = {
            "response": """{
              "summary": "Team completed backend routes and scheduled security testing.",
              "key_points": ["All 10 FastAPI routes implemented"],
              "action_items": ["Run unittest suite"],
              "explicit_deadlines": [{"item": "Submit repo docs", "deadline_text": "October 30, 2026"}],
              "follow_up_questions": ["Should we default to qwen3:4b?"]
            }"""
        }
        with patch.object(self.ollama, "_http_request", return_value=mock_briefing_json):
            req = BriefingRequest(
                text="All 10 FastAPI routes implemented. Action: Run unittest suite. Submit repo docs due October 30, 2026. Question: Should we default to qwen3:4b?"
            )
            res = self.controller.post_briefing(req)
            self.assertTrue(res["success"])
            self.assertEqual(len(res["key_points"]), 1)
            self.assertEqual(len(res["action_items"]), 1)
            self.assertEqual(
                res["explicit_deadlines"][0]["deadline_text"], "October 30, 2026"
            )
            self.assertEqual(len(res["follow_up_questions"]), 1)

    # FLOW F: File Organization Suggestions & Security Protections
    def test_flow_f_file_suggestions_leave_files_untouched(self) -> None:
        sample_file = self.allowed_root / "Messy_Invoice_FINAL (1).pdf"
        sample_file.write_bytes(b"%PDF-1.4 sample")

        mock_suggestions_json = {
            "response": """{
              "suggestions": [
                {
                  "original_filename": "Messy_Invoice_FINAL (1).pdf",
                  "suggested_filename": "2026-10-20-finance-messy-invoice.pdf",
                  "suggested_folder": "Finance/Records",
                  "category": "Finance",
                  "reason": "Normalized invoice filename"
                }
              ]
            }"""
        }
        with patch.object(
            self.ollama, "_http_request", return_value=mock_suggestions_json
        ):
            req = OrganizeSuggestionsRequest(
                files=[
                    FileMetadataInput(
                        filename="Messy_Invoice_FINAL (1).pdf",
                        mime_type="application/pdf",
                        size_bytes=15,
                    )
                ],
                permitted_filenames=["Messy_Invoice_FINAL (1).pdf"],
            )
            res = self.controller.post_organize_suggestions(req)
            self.assertTrue(res["success"])
            self.assertEqual(
                res["suggestions"][0]["suggested_filename"],
                "2026-10-20-finance-messy-invoice.pdf",
            )
            # Confirm original file on disk was NOT touched during suggestion generation
            self.assertTrue(sample_file.exists())

    def test_document_extraction_and_unsupported_formats(self) -> None:
        txt_res = extract_text_from_upload("notes.txt", b"Hello from local SlothAI notes.")
        self.assertTrue(txt_res["success"])
        self.assertEqual(txt_res["word_count"], 5)

        docx_buf = io.BytesIO()
        with zipfile.ZipFile(docx_buf, "w") as zf:
            zf.writestr(
                "word/document.xml",
                '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Extracted DOCX text</w:t></w:r></w:p></w:body></w:document>',
            )
        docx_res = extract_text_from_upload("spec.docx", docx_buf.getvalue())
        self.assertTrue(docx_res["success"])
        self.assertIn("Extracted DOCX text", docx_res["text"])

        with self.assertRaises(DocumentExtractionError) as ctx:
            extract_text_from_upload("malware.exe", b"MZ...")
        self.assertEqual(ctx.exception.status_code, 415)

        with self.assertRaises(DocumentExtractionError) as ctx_empty:
            extract_text_from_upload("empty.md", b"")
        self.assertEqual(ctx_empty.exception.status_code, 400)

    def test_path_traversal_rejection(self) -> None:
        src_file = self.allowed_root / "invoice.txt"
        src_file.write_text("Invoice content", encoding="utf-8")

        with self.assertRaises(FileOrganizationSecurityError) as ctx1:
            apply_approved_file_operations(
                operations=[
                    {
                        "source_relative_path": "../outside.txt",
                        "destination_folder": "Finance",
                        "new_filename": "clean.txt",
                        "approved": True,
                    }
                ],
                configured_root=str(self.allowed_root),
                dry_run=False,
                user_confirmed=True,
            )
        self.assertEqual(ctx1.exception.status_code, 403)

        with self.assertRaises(FileOrganizationSecurityError) as ctx2:
            apply_approved_file_operations(
                operations=[
                    {
                        "source_relative_path": "invoice.txt",
                        "destination_folder": "../../escaped",
                        "new_filename": "clean.txt",
                        "approved": True,
                    }
                ],
                configured_root=str(self.allowed_root),
                dry_run=False,
                user_confirmed=True,
            )
        self.assertEqual(ctx2.exception.status_code, 403)

    def test_symlink_escape_rejection(self) -> None:
        outside_dir = tempfile.TemporaryDirectory()
        try:
            outside_target = Path(outside_dir.name) / "secret.txt"
            outside_target.write_text("Secret", encoding="utf-8")
            symlink_path = self.allowed_root / "link_to_secret.txt"
            os.symlink(str(outside_target), str(symlink_path))

            with self.assertRaises(FileOrganizationSecurityError) as ctx:
                apply_approved_file_operations(
                    operations=[
                        {
                            "source_relative_path": "link_to_secret.txt",
                            "destination_folder": "Docs",
                            "new_filename": "secret.txt",
                            "approved": True,
                        }
                    ],
                    configured_root=str(self.allowed_root),
                    dry_run=False,
                    user_confirmed=True,
                )
            self.assertEqual(ctx.exception.status_code, 403)
        finally:
            outside_dir.cleanup()

    def test_unauthorized_file_operation_rejection(self) -> None:
        src_file = self.allowed_root / "notes.txt"
        src_file.write_text("Meeting notes", encoding="utf-8")

        with self.assertRaises(FileOrganizationSecurityError) as ctx_unapproved:
            apply_approved_file_operations(
                operations=[
                    {
                        "source_relative_path": "notes.txt",
                        "destination_folder": "Meetings",
                        "new_filename": "2026-notes.txt",
                        "approved": False,
                    }
                ],
                configured_root=str(self.allowed_root),
                dry_run=False,
                user_confirmed=True,
            )
        self.assertEqual(ctx_unapproved.exception.status_code, 400)

        with self.assertRaises(FileOrganizationSecurityError) as ctx_unconfirmed:
            apply_approved_file_operations(
                operations=[
                    {
                        "source_relative_path": "notes.txt",
                        "destination_folder": "Meetings",
                        "new_filename": "2026-notes.txt",
                        "approved": True,
                    }
                ],
                configured_root=str(self.allowed_root),
                dry_run=False,
                user_confirmed=False,
            )
        self.assertEqual(ctx_unconfirmed.exception.status_code, 400)

        with self.assertRaises(FileOrganizationSecurityError) as ctx_no_root:
            apply_approved_file_operations(
                operations=[
                    {
                        "source_relative_path": "notes.txt",
                        "destination_folder": "Meetings",
                        "new_filename": "2026-notes.txt",
                        "approved": True,
                    }
                ],
                configured_root=None,
                dry_run=True,
                user_confirmed=True,
            )
        self.assertEqual(ctx_no_root.exception.status_code, 403)

    def test_existing_file_overwrite_prevention_and_valid_apply(self) -> None:
        src_file = self.allowed_root / "draft.txt"
        src_file.write_text("Draft 1", encoding="utf-8")

        existing_dir = self.allowed_root / "Docs"
        existing_dir.mkdir(parents=True, exist_ok=True)
        existing_target = existing_dir / "existing.txt"
        existing_target.write_text("Do not overwrite me", encoding="utf-8")

        with self.assertRaises(FileOrganizationSecurityError) as ctx_overwrite:
            apply_approved_file_operations(
                operations=[
                    {
                        "source_relative_path": "draft.txt",
                        "destination_folder": "Docs",
                        "new_filename": "existing.txt",
                        "approved": True,
                    }
                ],
                configured_root=str(self.allowed_root),
                dry_run=False,
                user_confirmed=True,
            )
        self.assertEqual(ctx_overwrite.exception.status_code, 409)
        self.assertEqual(
            existing_target.read_text(encoding="utf-8"), "Do not overwrite me"
        )

        res = apply_approved_file_operations(
            operations=[
                {
                    "source_relative_path": "draft.txt",
                    "destination_folder": "Docs",
                    "new_filename": "2026-10-20-doc-draft.txt",
                    "approved": True,
                }
            ],
            configured_root=str(self.allowed_root),
            dry_run=False,
            user_confirmed=True,
        )
        self.assertTrue(res["success"])
        self.assertFalse(src_file.exists())
        self.assertTrue((existing_dir / "2026-10-20-doc-draft.txt").exists())


if __name__ == "__main__":
    unittest.main()
