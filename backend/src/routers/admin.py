"""Admin/Evaluator endpoints: data-quality report, pipeline log, model
registry, audit trail. Role-gated server-side (not just hidden in the UI)."""

import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.src.data import ROOT, report
from backend.src.deps import require_role
from database.models import AuditLog, ModelRegistry, User, get_db

# RBAC (matrix in src/permissions.js): quality/model reports also serve the
# Analyst role; infrastructure log, registry and audit stay Admin/Evaluator.
router = APIRouter()
ANALYTICAL = Depends(require_role("Administrator", "Analyst", "Evaluator"))
INFRA = Depends(require_role("Administrator", "Evaluator"))


@router.get("/data-quality", dependencies=[ANALYTICAL])
def data_quality():
    return report("data_quality_report")


@router.get("/model-metrics", dependencies=[ANALYTICAL])
def model_metrics():
    return report("model_metrics")


@router.get("/pipeline-log", dependencies=[INFRA])
def pipeline_log():
    path = os.path.join(ROOT, "reports", "processing_log.txt")
    lines = open(path, encoding="utf-8").read().splitlines() if os.path.exists(path) else []
    return {"stages": lines,
            "dataset_stats": report("dataset_stats"),
            "note": "Spark-native jobs in spark_jobs/ run where Java is available; "
                    "this log is from the equivalent pandas engine (see hdfs_scripts/README.md)."}


@router.get("/model-registry", dependencies=[INFRA])
def model_registry(db: Session = Depends(get_db)):
    rows = db.query(ModelRegistry).order_by(ModelRegistry.trained_at.desc()).all()
    return [{"name": r.name, "version": r.version, "metric": r.metric_name,
             "value": r.metric_value, "trained_at": str(r.trained_at), "path": r.path}
            for r in rows]


@router.get("/audit-log", dependencies=[INFRA])
def audit_log(limit: int = 100, db: Session = Depends(get_db)):
    rows = (db.query(AuditLog).order_by(AuditLog.ts.desc()).limit(limit).all())
    return [{"username": r.username, "action": r.action, "detail": r.detail,
             "ts": str(r.ts)} for r in rows]


# ---- user management: only an Administrator may list users or change roles ----
ADMIN_ONLY = Depends(require_role("Administrator"))


@router.get("/users", dependencies=[ADMIN_ONLY])
def list_users(db: Session = Depends(get_db)):
    return [{"username": u.username, "email": u.email, "role": u.role,
             "verified": bool(u.email_verified), "name": u.display_name}
            for u in db.query(User).order_by(User.created_at.desc()).all()]


class RoleChange(BaseModel):
    username: str
    role: str


@router.post("/users/role", dependencies=[ADMIN_ONLY])
def set_role(body: RoleChange, admin: dict = Depends(require_role("Administrator")),
             db: Session = Depends(get_db)):
    if body.role not in ("Administrator", "Operator", "Analyst", "Evaluator"):
        raise HTTPException(422, "Unknown role")
    u = db.query(User).filter(User.username == body.username.lower().strip()).first()
    if not u:
        raise HTTPException(404, "User not found")
    if u.username == admin["username"] and body.role != "Administrator":
        raise HTTPException(400, "You cannot demote your own admin account")
    old = u.role
    u.role = body.role
    db.add(AuditLog(username=admin["username"], action="role_changed",
                    detail=f"{u.username}: {old} -> {body.role}"))
    db.commit()
    return {"ok": True, "username": u.username, "role": u.role}


@router.delete("/users/{username}", dependencies=[ADMIN_ONLY])
def delete_user(username: str, admin: dict = Depends(require_role("Administrator")),
                db: Session = Depends(get_db)):
    uname = username.lower().strip()
    if uname == admin["username"]:
        raise HTTPException(400, "You cannot delete your own account")
    u = db.query(User).filter(User.username == uname).first()
    if not u:
        raise HTTPException(404, "User not found")
    db.delete(u)
    db.add(AuditLog(username=admin["username"], action="user_deleted", detail=uname))
    db.commit()
    return {"ok": True, "deleted": uname}
