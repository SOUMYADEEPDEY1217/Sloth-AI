# DEV.to Submission Package & Demo Kit — SlothAI

This document contains the complete, ready-to-publish **DEV.to submission post**, **Screenshot Shot List**, **60–90 Second Demo Video Script**, and **Sample Demo Inputs** for the **“Slow and Steady”** open-source AI building challenge.

---

## Part 1: Ready-to-Publish DEV.to Article

```markdown
---
title: "SlothAI: Work Less, Automate More, Stay Slow with Local Open-Weight AI"
published: true
description: "A calm, local-first AI productivity workspace built with React, FastAPI, and Ollama (qwen3:4b) for document summarization, grounded task extraction, safe file organization, and daily briefings."
tags: ai, opensource, python, react
---

## TL;DR

**SlothAI** (*"Work less. Automate more. Stay slow."*) is a privacy-first, open-source productivity web application powered by local open-weight models via **Ollama** and **Python FastAPI**. It helps developers and knowledge workers eliminate four repetitive daily chores—**document summarization**, **grounded task extraction**, **safe file organization**, and **daily briefings**—without sending a single byte of personal data to a cloud AI API.

---

## The Problem: Productivity Tools Have Become Frantic and Cloud-Dependent

Knowledge work is full of repetitive friction:
1. Reading 3,000-word architecture notes just to extract three decisions.
2. Combing through messy standup logs to find who promised what—and by when.
3. Cleaning up a Downloads or Inbox folder full of files named `Q3_Invoice_FINAL_v2 (1).pdf`.
4. Compiling scattered markdown notes into a coherent morning briefing.

Cloud AI wrappers can help, but they come with two major trade-offs: **privacy** (uploading internal specs, invoices, and meeting notes to third-party servers) and **hallucinated urgency** (inventing deadlines that were never in your notes or automating actions without human review).

---

## Why "Slow and Steady" Fits SlothAI

SlothAI was designed around the philosophy of **"Slow and Steady"**:
- **Deliberate Human-in-the-Loop Automation**: Instead of silently renaming files or inventing task deadlines, SlothAI stages every action transparently.
- **Anti-Hallucination Grounding**: When extracting tasks, SlothAI requires verbatim source evidence and verifies that any emitted deadline corresponds to actual temporal tokens in your input text.
- **Zero False Status Claims**: If Ollama isn't running or `qwen3:4b` isn't installed yet, SlothAI tells you immediately with copyable recovery commands rather than faking a green status badge or fabricating mock AI output.

---

## Core Features

### 1. AI Document Summarizer (`POST /api/summarize`)
Drop a `.txt`, `.md`, `.docx`, or `.pdf` file (or paste text directly) and choose between **Short**, **Balanced**, or **Detailed** synthesis. SlothAI returns:
- An executive summary with word-count compression metrics
- Numbered key takeaways and notable domain terms
- An explicit **Uncertainty / Ambiguity Note** whenever the source document leaves open questions

### 2. Automatic Task Extractor (`POST /api/extract-tasks`)
Paste unstructured meeting notes and extract an editable checklist where every task includes:
- Grounded deadline detection (`null` when no date/time is explicitly written in the text)
- Priority classification (`high`, `medium`, `low`, `unspecified`) with provenance (`explicit` vs. `inferred`)
- Verbatim `source_evidence` quotes from your text
- Inline editing, manual task creation, and 1-click Markdown or JSON export

### 3. Intelligent File Organizer (`POST /api/organize/suggestions` & `POST /api/organize/apply`)
Select messy files to generate clean kebab-case rename and folder suggestions (e.g., `Invoice_8841_FINAL_v2 (1).pdf` → `Finance/Records/2026-10-20-finance-invoice-8841.pdf`).
- **Pre-Flight Dry Run**: Validate destination paths before moving anything.
- **Strict OS Confinement**: Changes can only be applied inside an explicitly configured `SLOTHAI_ALLOWED_ORGANIZE_ROOT` directory, with automatic protection against path traversal (`..`), symlinks, executable extension mutation, and file overwrites.

### 4. Daily Briefing Compiler (`POST /api/briefing`)
Turn raw standup notes into a structured daily briefing that cleanly separates **Source Facts**, **Action Items**, **Explicit Deadlines**, and **Questions Requiring Follow-up**.

---

## Architecture Overview

```text
React + TypeScript + Vite Frontend (Port 3000)
        │
        ▼  HTTP JSON (/api/*) — Restricted Localhost CORS
Python FastAPI Backend (127.0.0.1:8000)
        │
        ├──► OllamaService ──► Local Ollama API (127.0.0.1:11434) ──► qwen3:4b
        ├──► DocumentService (.txt, .md, .docx, .pdf extraction)
        └──► FileOrganizer (Confined path validation & atomic rollback)
```

The frontend never talks directly to Ollama from the browser. All requests pass through the FastAPI backend, which enforces input length caps, upload size limits (5 MB), prompt-injection delimiters (`<untrusted_user_content>`), and JSON schema validation.

---

## Open-Weight Model Setup with Ollama

SlothAI defaults to recommending **`qwen3:4b`**—a fast, capable open-weight model that runs comfortably on consumer hardware—while allowing you to select any installed Ollama tag (`llama3.2:3b`, `qwen2.5:7b`, `mistral:latest`, `gemma2:9b`).

```powershell
# 1. Start Ollama
ollama serve

# 2. Pull the recommended open-weight model
ollama pull qwen3:4b
```

You can also query installed models (`GET /api/models`) or trigger an explicit model download (`POST /api/models/pull`) directly from SlothAI's **Settings** screen.

---

## Security and Privacy Decisions

1. **Prompt Injection Isolation**: User documents and filenames are wrapped in `<untrusted_user_content>` tags with strict system guards instructing the model to treat the block strictly as passive data.
2. **Anti-Fabrication Post-Processing**: In `ollama_service.py`, extracted task deadlines are cross-checked against temporal tokens in the source text. If the model hallucinates `"December 31, 2026"` on a note with no dates, the backend strips the fabricated deadline back to `None`.
3. **Defense-in-Depth File Operations**: `file_organizer.py` verifies `os.path.realpath` and `os.path.commonpath`, rejects symlinks anywhere in the ancestor chain, forbids overwriting existing files (`409 Conflict`), blocks renaming files to `.exe`/`.bat`/`.ps1`, and rolls back completed moves if an error occurs mid-batch.

---

## Challenges & Lessons Learned

- **Small Open-Weight Models & Strict JSON**: 3B–4B parameter models occasionally wrap JSON output in Markdown fences or omit optional keys. Combining Ollama's `format: "json"`, low temperature (`0.1`), regex fence stripping, and strict schema normalization made local inference reliable.
- **Honest Local-First UX**: Designing for local AI means embracing the fact that the user's model might not be running when they first open the app. Building distinct visual states (`Backend Unreachable`, `Backend Online · Ollama Offline`, `Missing Model Tag`, and `Verified Ready`) made setup effortless.

---

## What's Next for SlothAI

- Streaming token progress for long document summaries
- Local OCR support for scanned PDFs
- Multi-document workspace synthesis and undo snapshots for file organization batches
```

---

## Part 2: Screenshot Shot List (For GitHub & DEV.to)

Capture the following 6 screenshots at `1440×900` resolution:

1. **`01-overview-dashboard-light.png`**
   - **Screen**: Overview Dashboard (Light Mode — Warm Off-White & Forest Green)
   - **What to show**: Greeting banner with resting sloth illustration, Quick Input Buffer, the 4 Core Productivity Workflow cards, and the verified `ModelStatus` + `PrivacyNotice` panels.
2. **`02-summarizer-live-output.png`**
   - **Screen**: AI Document Summarizer
   - **What to show**: Source text on the left with live word/character counter, `Balanced` length selected, and the right-hand output card displaying the `Verified Local Model Summary` badge, Executive Summary, numbered Key Takeaways, and Uncertainty Notes.
3. **`03-task-extractor-grounded-deadlines.png`**
   - **Screen**: Automatic Task Extractor
   - **What to show**: Extracted task cards displaying grounded deadlines (`October 24, 2026`), `High Priority · Explicit` vs. `Medium Priority · Inferred` badges, and verbatim `Source: "..."` evidence quotes.
4. **`04-file-organizer-staging-table.png`**
   - **Screen**: Intelligent File Organizer
   - **What to show**: The Before & After comparison table with messy filenames on the left, editable kebab-case rename & folder inputs on the right, approval checkboxes, and the `Validate Preview (Dry Run)` / `Apply Approved Changes` toolbar.
5. **`05-daily-briefing-compiler.png`**
   - **Screen**: Daily Briefing Compiler
   - **What to show**: Structured briefing output separating Concise Summary, Key Points, Action Items, Deadlines Explicitly Found in Input, and Questions Requiring Follow-up.
6. **`06-settings-dark-mode-diagnostics.png`**
   - **Screen**: Workspace & Local AI Backend Settings (Dark Mode — Deep Canopy Slate)
   - **What to show**: Backend URL, Local Ollama URL, `Test Connection` diagnostics, detected installed models from `/api/models`, and the explicit `Pull Model via Backend` section.

---

## Part 3: 60–90 Second Demo Video Script

- **0:00 – 0:12 | Hook & Local-First Verification**
  - *Visual*: Open SlothAI on the Overview Dashboard. Point to the top-right status indicator and the Getting Started / Model Status card.
  - *Narration*: "Meet SlothAI—an open-source, local-first AI workspace built around a simple rule: Work less, automate more, stay slow. Everything runs through a local Python FastAPI backend connected to Ollama—zero cloud APIs, zero telemetry."
- **0:12 – 0:28 | Connection Check & Model Selection**
  - *Visual*: Press `Alt+7` to jump to **Settings**. Click **Query Installed Models (`/api/models`)**, select `qwen3:4b`, and click **Test Connection**. Toggle Dark Mode with `Alt+T` and back.
  - *Narration*: "In Settings, we verify our local Ollama connection in milliseconds, inspect installed open-weight models, or explicitly pull a new model tag."
- **0:28 – 0:45 | Document Summarization**
  - *Visual*: Press `Alt+2` for **AI Summarizer**. Drop or paste the sample engineering RFC, select `Balanced`, and click **Summarize**.
  - *Narration*: "In the AI Summarizer, we can upload `.txt`, `.md`, `.docx`, or `.pdf` files. Local inference distills the document into an executive summary, numbered takeaways, and explicit uncertainty notes."
- **0:45 – 1:05 | Grounded Task Extraction**
  - *Visual*: Press `Alt+3` for **Task Extractor**. Paste the sprint notes and click **Extract Tasks**. Point out the task with `October 24, 2026` and the task with `No explicit deadline`.
  - *Narration*: "Next, Task Extractor turns messy notes into an editable checklist. Notice how SlothAI quotes verbatim source evidence and refuses to hallucinate deadlines when none exist in the text."
- **1:05 – 1:25 | Safe File Organization & Daily Briefing**
  - *Visual*: Press `Alt+4` for **File Organizer**, show the before/after kebab-case rename table and dry-run validation. Then press `Alt+5` for **Daily Briefing** and export Markdown.
  - *Narration*: "Finally, File Organizer stages clean kebab-case renames with path-traversal and overwrite protection before touching disk, while Daily Briefing compiles standup notes into facts, deadlines, and follow-up questions. Clone SlothAI today and stay slow."

---

## Part 4: Copy-Paste Sample Inputs for Live Demos

### Sample 1: Summarizer Input (Architecture Note)
```text
Project Canopy: Local-First Document Automation Architecture (Q4 Engineering Note)

Modern knowledge workers spend a disproportionate share of their day triaging repetitive digital artifacts: long specification documents, scattered meeting notes, and inconsistently named downloads. Cloud-hosted AI assistants attempt to solve this by routing every document through external APIs, which introduces recurring subscription costs, latency spikes, and data-residency concerns for sensitive local files.

SlothAI takes a deliberate, local-first approach. By pairing a lightweight web interface with a local FastAPI service and an Ollama runtime (such as qwen3:4b or llama3.2:3b), document summarization and task extraction happen entirely on the user's machine. Filesystem changes are never executed blindly: the File Organizer stages proposed kebab-case renames and category folders in a review table first, requiring explicit per-file approval before any move occurs. Open question: we still need to benchmark memory usage on 8 GB Windows laptops when summarizing 20-page PDFs.
```

### Sample 2: Task Extractor Input (With & Without Deadlines)
```text
Sprint Sync Notes:
1. Urgent: Maya needs to finalize the FastAPI CORS allowlist configuration before October 24, 2026 so only localhost origins are permitted.
2. Devon will refactor the sidebar navigation component to add keyboard shortcut badges and improve dark-mode focus rings.
3. High Priority: Run the full backend security test suite for path traversal and symlink rejection by Friday at 4:00 PM.
```

### Sample 3: Daily Briefing Input
```text
Morning Workspace Notes — October 20, 2026
- FastAPI backend endpoints (/api/summarize, /api/extract-tasks, /api/briefing, /api/organize/suggestions, /api/organize/apply) are wired and passing unit tests.
- Action item: Verify Windows batch scripts (run_backend.bat and run_frontend.bat) on a clean virtual environment.
- Deliverable: Submit the public GitHub repository and DEV.to write-up by October 30, 2026.
- Question for team: Should we include qwen3:4b as the primary default in backend/.env.example and list llama3.2:3b as the low-RAM fallback?
```
