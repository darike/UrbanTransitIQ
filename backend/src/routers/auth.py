"""Auth + account lifecycle: register → email verification → login,
forgot/reset password, and profile editing (name / email / avatar).

SMTP is not configured in the competition environment, so "emails" are
delivered to reports/email_outbox.log and the code is also returned as
`dev_code` — clearly labelled demo behaviour, swappable for real SMTP.
"""

import datetime as dt
import os
import random
import re
import smtplib
from email.message import EmailMessage

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.src.deps import current_user, make_token
from database.models import AuditLog, User, get_db

router = APIRouter()
OUTBOX = os.path.join(os.path.dirname(__file__), "..", "..", "..", "reports", "email_outbox.log")


def gen_code() -> str:
    return f"{random.randint(0, 999999):06d}"


# Email delivery — three modes, picked from environment:
#   1) Gmail/real SMTP (TLS + login):
#        $env:UTIQ_SMTP_USER = "yourgmail@gmail.com"
#        $env:UTIQ_SMTP_PASS = "xxxx xxxx xxxx xxxx"   # Google App Password
#   2) LOCAL inbox via Mailpit (free, offline — inbox at http://localhost:8025):
#        $env:UTIQ_SMTP_HOST = "localhost"; $env:UTIQ_SMTP_PORT = "1025"
#   3) Nothing set → demo outbox file + on-screen dev code.
# config/email.env (KEY=VALUE lines) is loaded first so the team only fills a
# file once — real env vars still win if set. The real file is git-ignored.
_ENV_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "config", "email.env")
if os.path.exists(_ENV_FILE):
    for _line in open(_ENV_FILE, encoding="utf-8"):
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"'))

SMTP_USER = os.environ.get("UTIQ_SMTP_USER")
SMTP_PASS = os.environ.get("UTIQ_SMTP_PASS")
SMTP_HOST = os.environ.get("UTIQ_SMTP_HOST")
SMTP_PORT = int(os.environ.get("UTIQ_SMTP_PORT", "0") or 0)


def send_email(to: str, subject: str, body: str) -> bool:
    """Returns True when a real email was sent; False = demo outbox fallback."""
    try:
        msg = EmailMessage()
        msg["From"] = f"UrbanTransit IQ <{SMTP_USER or 'no-reply@urbantransit.iq'}>"
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body + "\n\n— UrbanTransit IQ (TechWiz 7)")
        if SMTP_USER and SMTP_PASS and to:            # mode 1: Gmail / real SMTP
            with smtplib.SMTP(SMTP_HOST or "smtp.gmail.com", 587, timeout=15) as s:
                s.starttls()
                s.login(SMTP_USER, SMTP_PASS.replace(" ", ""))
                s.send_message(msg)
            return True
        if SMTP_HOST and to:                          # mode 2: local Mailpit (no auth/TLS)
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT or 1025, timeout=10) as s:
                s.send_message(msg)
            return True
    except Exception as e:                            # fall through to the outbox
        with open(OUTBOX, "a", encoding="utf-8") as f:
            f.write(f"[SMTP ERROR] {e}\n")
    with open(OUTBOX, "a", encoding="utf-8") as f:
        f.write(f"[{dt.datetime.utcnow().isoformat()}] TO: {to}\nSUBJECT: {subject}\n{body}\n{'-'*60}\n")
    return False


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def public_user(u: User) -> dict:
    return {"username": u.username, "role": u.role,
            "name": u.display_name or u.username.capitalize(),
            "email": u.email, "verified": bool(u.email_verified),
            "avatar": u.avatar}


# ---------------------------------------------------------------- login ----
class LoginIn(BaseModel):
    username: str
    password: str


# in-memory brute-force guard: 8 failed attempts per identifier ⇒ 5-min lockout
_LOGIN_FAILS: dict = {}
_MAX_FAILS = 8
_LOCK_MIN = 5


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    ident = body.username.lower().strip()
    rec = _LOGIN_FAILS.get(ident)
    if rec and rec["count"] >= _MAX_FAILS:
        if (dt.datetime.utcnow() - rec["ts"]).total_seconds() < _LOCK_MIN * 60:
            raise HTTPException(429, f"Too many attempts — try again in {_LOCK_MIN} minutes")
        _LOGIN_FAILS.pop(ident, None)      # lockout window expired

    user = (db.query(User).filter((User.username == ident) | (User.email == ident)).first())
    if not user or not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        r = _LOGIN_FAILS.setdefault(ident, {"count": 0, "ts": dt.datetime.utcnow()})
        r["count"] += 1
        r["ts"] = dt.datetime.utcnow()
        raise HTTPException(401, "Invalid username or password")
    _LOGIN_FAILS.pop(ident, None)          # success clears the counter
    if not user.email_verified:
        raise HTTPException(403, "unverified")          # frontend routes to the verify step
    db.add(AuditLog(username=user.username, action="login", detail=f"role={user.role}"))
    db.commit()
    return {"token": make_token(user.username, user.role), "user": public_user(user)}


# ------------------------------------------------------------- register ----
class RegisterIn(BaseModel):
    username: str
    email: str
    password: str


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    uname = body.username.lower().strip()
    email = body.email.lower().strip()
    if not re.fullmatch(r"[a-z0-9_]{3,24}", uname):
        raise HTTPException(422, "Username: 3-24 chars, letters/numbers/underscore only")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(422, "Enter a valid email address")
    if len(body.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    if db.query(User).filter(User.username == uname).first():
        raise HTTPException(409, "Username already taken")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "Email already registered")

    code = gen_code()
    user = User(username=uname, email=email, password_hash=hash_pw(body.password),
                role="Analyst", display_name=uname.capitalize(),
                email_verified=False, verify_code=code)
    db.add(user)
    db.add(AuditLog(username=uname, action="register", detail=f"email={email}"))
    db.commit()
    sent = send_email(email, "Verify your UrbanTransit IQ account",
                      f"Your verification code is: {code}")
    out = {"ok": True, "username": uname,
           "message": f"Verification code sent to {email}" + (" — check your inbox" if sent else "")}
    if not sent:
        out.update({"dev_code": code,
                    "dev_note": "SMTP not configured — demo shows the code (reports/email_outbox.log)"})
    return out


class VerifyIn(BaseModel):
    username: str
    code: str


@router.post("/verify")
def verify(body: VerifyIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username.lower().strip()).first()
    if not user or not user.verify_code or user.verify_code != body.code.strip():
        raise HTTPException(400, "Invalid verification code")
    user.email_verified = True
    user.verify_code = None
    db.add(AuditLog(username=user.username, action="email_verified", detail=user.email))
    db.commit()
    return {"token": make_token(user.username, user.role), "user": public_user(user)}


# --------------------------------------------------------- forgot/reset ----
class ForgotIn(BaseModel):
    identifier: str          # username or email


@router.post("/request-reset")
def request_reset(body: ForgotIn, db: Session = Depends(get_db)):
    ident = body.identifier.lower().strip()
    user = db.query(User).filter((User.username == ident) | (User.email == ident)).first()
    if not user:
        # do not reveal which accounts exist
        return {"ok": True, "message": "If the account exists, a reset code was sent."}
    code = gen_code()
    user.reset_code = code
    user.reset_expires = dt.datetime.utcnow() + dt.timedelta(minutes=15)
    db.add(AuditLog(username=user.username, action="password_reset_requested", detail=""))
    db.commit()
    sent = send_email(user.email or "", "UrbanTransit IQ password reset",
                      f"Your reset code is: {code} (valid 15 minutes)")
    out = {"ok": True, "username": user.username,
           "message": f"Reset code sent to {user.email}" + (" — check your inbox" if sent else "")}
    if not sent:
        out.update({"dev_code": code, "dev_note": "SMTP not configured — demo shows the code"})
    return out


class ResetIn(BaseModel):
    username: str
    code: str
    new_password: str


@router.post("/reset-password")
def reset_password(body: ResetIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username.lower().strip()).first()
    if (not user or not user.reset_code or user.reset_code != body.code.strip()
            or not user.reset_expires or user.reset_expires < dt.datetime.utcnow()):
        raise HTTPException(400, "Invalid or expired reset code")
    if len(body.new_password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    user.password_hash = hash_pw(body.new_password)
    user.reset_code = None
    user.reset_expires = None
    db.add(AuditLog(username=user.username, action="password_reset", detail=""))
    db.commit()
    return {"ok": True, "message": "Password updated — sign in with your new password."}


# --------------------------------------------------------------- profile ---
@router.get("/me")
def me(u: dict = Depends(current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == u["username"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    return public_user(user)


class ProfileIn(BaseModel):
    display_name: str | None = None
    email: str | None = None
    avatar: str | None = None      # data-URL, resized client-side


@router.post("/profile")
def update_profile(body: ProfileIn, u: dict = Depends(current_user),
                   db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == u["username"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    out = {}
    if body.display_name is not None:
        name = body.display_name.strip()
        if not (2 <= len(name) <= 60):
            raise HTTPException(422, "Display name: 2-60 characters")
        user.display_name = name
    if body.avatar is not None:
        if len(body.avatar) > 300_000:
            raise HTTPException(422, "Avatar too large — the UI resizes to 128px, retry")
        user.avatar = body.avatar or None
    if body.email is not None and body.email.lower().strip() != (user.email or ""):
        email = body.email.lower().strip()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise HTTPException(422, "Enter a valid email address")
        if db.query(User).filter(User.email == email, User.id != user.id).first():
            raise HTTPException(409, "Email already registered")
        code = gen_code()
        user.email = email
        user.email_verified = False               # email change ⇒ re-verify
        user.verify_code = code
        sent = send_email(email, "Verify your new UrbanTransit IQ email",
                          f"Your verification code is: {code}")
        out["message"] = f"Verification code sent to {email}" + (" — check your inbox" if sent else "")
        out["needs_code"] = True
        if not sent:
            out.update({"dev_code": code, "dev_note": "SMTP not configured — demo shows the code"})
    db.add(AuditLog(username=user.username, action="profile_updated", detail=""))
    db.commit()
    out["user"] = public_user(user)
    return out


class ChangePwIn(BaseModel):
    current_password: str
    new_password: str


@router.post("/profile/change-password")
def change_password(body: ChangePwIn, u: dict = Depends(current_user),
                    db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == u["username"]).first()
    if not user or not bcrypt.checkpw(body.current_password.encode(),
                                      user.password_hash.encode()):
        raise HTTPException(401, "Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(422, "New password must be at least 8 characters")
    user.password_hash = hash_pw(body.new_password)
    db.add(AuditLog(username=user.username, action="password_changed", detail=""))
    db.commit()
    return {"ok": True, "message": "Password changed."}


class VerifyEmailIn(BaseModel):
    code: str


@router.post("/profile/verify-email")
def verify_new_email(body: VerifyEmailIn, u: dict = Depends(current_user),
                     db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == u["username"]).first()
    if not user or not user.verify_code or user.verify_code != body.code.strip():
        raise HTTPException(400, "Invalid verification code")
    user.email_verified = True
    user.verify_code = None
    db.add(AuditLog(username=user.username, action="email_verified", detail=user.email))
    db.commit()
    return {"user": public_user(user)}
