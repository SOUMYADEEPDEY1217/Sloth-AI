# SlothAI Python FastAPI Backend

This directory contains the Python 3.11+ FastAPI backend for **SlothAI**.

## Setup & Run (Manual CLI)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Run Unit & Security Tests

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -v
```
