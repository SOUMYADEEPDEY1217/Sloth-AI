"""Vercel FastAPI entrypoint re-exporting the FastAPI application instance."""

from app.main import app

__all__ = ["app"]
