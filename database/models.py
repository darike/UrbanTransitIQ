"""UrbanTransit IQ — application database (SQLite dev / PostgreSQL prod).

Holds what must persist and be written at runtime: users/auth, audit trail,
model registry, recommendation status, saved reports. Analytical data stays in
Parquet (read-only for the app) per the 2-tier design in Phase 13.
"""

import datetime as dt

from sqlalchemy import (Boolean, Column, DateTime, Integer, String, Text,
                        create_engine)
from sqlalchemy.orm import declarative_base, sessionmaker

DB_URL = "sqlite:///database/urbantransit.db"   # swap for postgresql+psycopg2://... in prod
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(40), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False)          # Administrator|Operator|Analyst|Evaluator
    email = Column(String(120), unique=True)
    display_name = Column(String(60))
    avatar = Column(Text)                              # data-URL (resized client-side)
    email_verified = Column(Boolean, default=False)
    verify_code = Column(String(6))
    reset_code = Column(String(6))
    reset_expires = Column(DateTime)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    username = Column(String(40))
    action = Column(String(80))
    detail = Column(Text)
    ts = Column(DateTime, default=dt.datetime.utcnow)


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    id = Column(Integer, primary_key=True)
    name = Column(String(60))
    version = Column(String(20))
    metric_name = Column(String(30))
    metric_value = Column(String(20))
    trained_at = Column(DateTime, default=dt.datetime.utcnow)
    path = Column(String(200))


class RecommendationState(Base):
    __tablename__ = "recommendation_state"
    id = Column(Integer, primary_key=True)
    rec_id = Column(String(12), unique=True)
    status = Column(String(20), default="open")        # open|accepted|dismissed
    updated_by = Column(String(40))
    updated_at = Column(DateTime, default=dt.datetime.utcnow)


class SavedReport(Base):
    __tablename__ = "saved_reports"
    id = Column(Integer, primary_key=True)
    username = Column(String(40))
    report_type = Column(String(40))
    params = Column(Text)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    is_public = Column(Boolean, default=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
