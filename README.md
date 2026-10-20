# SlothAI — Work less. Automate more. Stay slow.

**SlothAI** is a calm, local-first, open-weight AI productivity workspace built for the **“Slow and Steady”** open-source AI building challenge. It eliminates repetitive digital work—document summarization, grounded task extraction, safe file organization, and daily briefings—by pairing a responsive **React + TypeScript** frontend with a **Python FastAPI** backend and **Ollama** local inference.

---

## Why SlothAI Exists

Modern knowledge workers spend hours every week condensing long documents, hunting through meeting notes for action items, renaming messy files (`Invoice_FINAL_v2 (1).pdf`), and compiling status updates. Most AI productivity tools require uploading sensitive documents to commercial cloud APIs, managing paid API keys, or trusting opaque black-box pipelines that hallucinate dates and silently modify data.

**SlothAI** takes the opposite approach:
- **Slow & deliberate over rushed & noisy**: Every AI output is structured, grounded in your source text, and clearly labeled with its provenance (`Verified Local Model` vs. `Static Sample Preview`).
- **Local-first by architecture**: Your browser talks exclusively to your local FastAPI backend (`127.0.0.1:8000`), which communicates with your local Ollama runtime (`127.0.0.1:11434`).
- **Safety before automation**: File organization suggestions never touch your disk until you inspect the before/after table, check individual approval boxes, and confirm execution inside a strictly confined directory (`SLOTHAI_ALLOWED_ORGANIZE_ROOT`).

---

## Key Features

1. **AI Document Summarizer (`POST /api/summarize`)**
   - Summarize pasted text or uploaded documents (`.txt`, `.md`, `.docx`, `.pdf`, `.csv`, `.json`, `.log`) in `short`, `balanced`, or `detailed` modes.
   - Displays source vs. summary word counts, key takeaways, notable terms, and explicit uncertainty/ambiguity notes when source text is incomplete.
   - Copy formatted Markdown or export `.txt` reports.

2. **Automatic Task Extractor (`POST /api/extract-tasks`)**
   - Extracts actionable tasks with inline editing, completion toggles, manual task creation, and Markdown/JSON export.
   - **Anti-Fabrication Deadline Grounding**: Both the prompt and backend post-processor verify that deadlines are only emitted when temporal cues exist in the source text—preventing hallucinated due dates.
   - Distinguishes `"explicit"` priority (stated in text) from `"inferred"` priority and includes a verbatim `source_evidence` quote.

3. **Intelligent File Organizer (`POST /api/organize/suggestions` & `POST /api/organize/apply`)**
   - Proposes clean kebab-case filenames (`2026-10-20-finance-q3-cloud-hosting-invoice.pdf`) and logical destination folders without touching your files.
   - Interactive before/after staging table with per-file approval checkboxes, dry-run path validation, JSON plan export, and confirmed execution.
   - Enforces directory confinement, path-traversal (`..`) rejection, symlink escape blocking, executable extension blocking, existing-file overwrite prevention (`409 Conflict`), and automatic batch rollback on OS errors.

4. **Daily Briefing Compiler (`POST /api/briefing`)**
   - Synthesizes pasted standup notes or local documents into five distinct sections: **Concise Summary**, **Key Points (Source Facts)**, **Action Items**, **Explicit Deadlines Found in Input**, and **Questions Requiring Follow-up**.

5. **Local Model Management & Diagnostics (`GET /api/health`, `GET /api/models`, `POST /api/models/pull`, `POST /api/connection/test`)**
   - Dynamically verifies backend health, Ollama reachability, latency, and whether the selected model tag is installed.
   - Allows explicit user-initiated model downloads (`POST /api/models/pull`) without ever auto-downloading large models on page load.

6. **Real Activity Log & Accessible Dual-Theme Interface**
   - Logs only real session events in browser `localStorage` with filtering, search, and JSON export.
   - Warm off-white & deep forest green Light Mode, deep canopy slate Dark Mode, full keyboard navigation (`Alt+1`–`Alt+7`, `Alt+T`, `Alt+K`), skip-to-content link, and `prefers-reduced-motion` support.

---

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    React 19 + TypeScript + Vite Frontend                │
│  Overview │ Summarizer │ Task Extractor │ File Organizer │ Briefing     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP JSON (/api/*)
                                    │ Restricted Localhost CORS (No '*')
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Python 3.11+ FastAPI Backend (127.0.0.1:8000)             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │   OllamaService    │  │  DocumentService   │  │   FileOrganizer   │  │
│  │ • Health & Tag List│  │ • .txt/.md/.csv    │  │ • Safe Suggestions│  │
│  │ • Explicit Pull    │  │ • .docx & .pdf     │  │ • Path Confinement│  │
│  │ • JSON Schema Guard│  │ • 5 MB Size Limit  │  │ • No Overwrites   │  │
│  │ • Deadline Grounder│  │ • UTF-8 Validation │  │ • Batch Rollback  │  │
│  └─────────┬──────────┘  └────────────────────┘  └─────────┬─────────┘  │
└────────────┼───────────────────────────────────────────────┼────────────┘
             │ HTTP JSON (127.0.0.1:11434)                   │ Confined OS Move
             ▼                                               ▼
┌────────────────────────────────────┐      ┌─────────────────────────────┐
│     Local Ollama Runtime           │      │ SLOTHAI_ALLOWED_ORGANIZE_   │
│  Default Suggestion: qwen3:4b      │      │ ROOT (User-Configured Dir)  │
│  (or llama3.2:3b, mistral, etc.)   │      └─────────────────────────────┘
└────────────────────────────────────┘
```

---

## Privacy & Local-First Design

- **Zero Hosted AI Dependencies**: SlothAI does not use cloud LLM APIs, external fonts, or third-party analytics scripts.
- **Honest Network Scope**: Once dependencies (`npm install`, `pip install`) and your chosen Ollama model (`ollama pull qwen3:4b`) are installed, SlothAI operates 100% offline on `127.0.0.1`.
- **No Silent Data Access**: The Daily Briefing and Task Extractor process only the text or files you explicitly paste or upload. They do not connect to external email, calendar, or cloud storage accounts.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, httpx, pypdf, python-docx
- **Local AI Runtime**: Ollama (`qwen3:4b` default suggestion; configurable to any local instruction-tuned model)
- **Testing**: Python `unittest` suite (`backend/tests/test_backend.py`) & TypeScript compiler (`tsc --noEmit`)

---

## Hardware & Model Notes

SlothAI treats the model name as fully configurable:
- **Recommended Default (`qwen3:4b`)**: ~2.6 GB download; runs smoothly on systems with **8 GB+ RAM** (CPU or GPU).
- **Lightweight Alternative (`llama3.2:3b` or `qwen2.5:3b`)**: Ideal for laptops with **4–8 GB RAM**.
- **Larger Models (`qwen2.5:7b`, `gemma2:9b`, `mistral:latest`)**: Recommended for workstations with **16 GB+ RAM** or dedicated GPU VRAM.

---

## Windows Setup Guide (Step-by-Step)

### 1. Install Prerequisites
1. **Python 3.11+**: Download from [python.org/downloads](https://www.python.org/downloads/) (check **"Add Python to PATH"** during setup).
2. **Node.js 18+ LTS**: Download from [nodejs.org](https://nodejs.org/).
3. **Ollama**: Download from [ollama.com/download](https://ollama.com/download) and start the Ollama application (or run `ollama serve`).
4. **Pull an Open-Weight Model**:
   Open PowerShell or Command Prompt and run:
   ```powershell
   ollama pull qwen3:4b
   ```
   *(Alternatively, you can pull a model from inside SlothAI's **Settings** page once the backend is running).*

### 2. Clone & Configure
```powershell
git clone https://github.com/your-username/slothai.git
cd slothai
copy .env.example .env
copy backend\.env.example backend\.env
```

---

## Running the Backend & Frontend

### Option A: One-Click Windows Batch Scripts
1. **Start the Python FastAPI Backend**:
   ```cmd
   .\run_backend.bat
   ```
   Creates `backend\.venv`, installs `backend\requirements.txt`, and starts FastAPI on `http://127.0.0.1:8000`.
2. **Start the React Frontend** (in a second terminal):
   ```cmd
   .\run_frontend.bat
   ```
   Installs `node_modules` if needed and starts the web interface on `http://localhost:3000`.

### Option B: Manual CLI (Windows / macOS / Linux)
**Terminal 1 — FastAPI Backend:**
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend Dev Server:**
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Running Tests & Verification

Run the automated backend unit, security, and end-to-end flow tests (no internet or live Ollama daemon required—uses deterministic mocks):
```bash
npm run test:backend
# Or directly:
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=backend python3 -m unittest discover -s backend/tests -v
```

Run frontend TypeScript type checking and production bundle compilation:
```bash
npm run lint
npm run build
```

---

## Security Model

1. **Localhost Binding & Restricted CORS**: The FastAPI backend binds to `127.0.0.1` by default and restricts CORS to `http://localhost:3000` and `http://localhost:5173` (wildcard `*` is stripped in `config.py`).
2. **Prompt Injection Defense**: Untrusted document content is isolated inside `<untrusted_user_content>` delimiters with explicit system directives to ignore embedded instructions and return strict JSON.
3. **Filesystem Confinement (`file_organizer.py`)**:
   - By default, `SLOTHAI_ALLOWED_ORGANIZE_ROOT` is unset (`Suggestions-Only Mode`), blocking all disk modifications.
   - When configured, `_validate_confined_path` resolves canonical paths via `os.path.realpath` and `os.path.commonpath`, rejecting `..` traversal, absolute drive paths, null bytes, and symlinks anywhere in the ancestor chain.
   - Never deletes files, never overwrites existing files (`409 Conflict`), blocks renaming to executable extensions (`.exe`, `.bat`, `.ps1`, etc.), and rolls back completed moves if an OS error occurs mid-batch.

---

## Troubleshooting

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| **Backend Unreachable** | FastAPI server is not running or bound to a different port | Run `run_backend.bat` or check `FastAPI Backend Base URL` in Settings. |
| **Backend Online · Ollama Offline** | Ollama service is not running on `127.0.0.1:11434` | Start the Ollama desktop app or run `ollama serve` in a terminal. |
| **Missing `'qwen3:4b'`** | Ollama is online, but the selected model tag is not downloaded | Click **Pull Model via Backend** in Settings or run `ollama pull qwen3:4b`. |
| **File Apply Rejected (403)** | `SLOTHAI_ALLOWED_ORGANIZE_ROOT` is not configured | Set `SLOTHAI_ALLOWED_ORGANIZE_ROOT` in `backend/.env` to an existing folder and restart the backend. |
| **PDF Extraction Returns 501/422** | Missing `pypdf` or scanned image-only PDF | Run `pip install -r backend/requirements.txt`; note that OCR is not enabled for scanned image PDFs. |
| **Slow Inference / Timeout** | Large input or model exceeds available RAM/VRAM | Switch to a smaller quantized model (`qwen3:4b` or `llama3.2:3b`) or increase `SLOTHAI_OLLAMA_TIMEOUT_SECONDS`. |

---

## Roadmap

- [ ] Streaming token progress indicator for long document summaries and model downloads
- [ ] Optional local OCR integration (`tesseract`) for scanned PDFs
- [ ] Multi-file batch document synthesis into a unified project knowledge base
- [ ] Undo history snapshots for applied file organization batches

---

## License

Released under the [MIT License](./LICENSE).
