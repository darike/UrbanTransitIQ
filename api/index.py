"""Vercel serverless entry point for the FastAPI backend.

The deployment filesystem is read-only except /tmp, so the SQLite app database
(seeded demo accounts, model registry) is copied there on cold start, and the
error log and demo e-mail outbox are redirected there too. Writes (new
accounts, role changes) therefore live for the lifetime of a warm instance.
"""

import os
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

_db = "/tmp/urbantransit.db"
if not os.path.exists(_db):
    shutil.copyfile(os.path.join(ROOT, "database", "urbantransit.db"), _db)
os.environ.setdefault("UTIQ_DB_URL", f"sqlite:///{_db}")
os.environ.setdefault("UTIQ_LOG_FILE", "/tmp/app_errors.log")
os.environ.setdefault("UTIQ_OUTBOX", "/tmp/email_outbox.log")

from backend.src.main import app  # noqa: E402,F401
