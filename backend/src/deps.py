"""Auth dependencies: JWT decode + role gate (RBAC enforced server-side)."""

import datetime as dt
import os
import secrets
import sys

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


def _load_secret() -> str:
    """JWT signing key. Never a shippable default — otherwise anyone who reads
    the source could forge an {role: Administrator} token. Order:
      1) UTIQ_JWT_SECRET env var (set this in production/deploy)
      2) a random 256-bit key persisted to config/.jwt_secret (git-ignored),
         generated once on first run so tokens survive restarts.
    """
    env = os.environ.get("UTIQ_JWT_SECRET")
    if env:
        return env
    path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "config", ".jwt_secret")
    if os.path.exists(path):
        return open(path, encoding="utf-8").read().strip()
    key = secrets.token_hex(32)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(key)
    except OSError:
        pass
    return key


SECRET = _load_secret()
ALGO = "HS256"
TOKEN_HOURS = 12
bearer = HTTPBearer(auto_error=False)


def make_token(username: str, role: str) -> str:
    payload = {"sub": username, "role": role,
               "exp": dt.datetime.utcnow() + dt.timedelta(hours=TOKEN_HOURS)}
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if cred is None:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(cred.credentials, SECRET, algorithms=[ALGO])
        return {"username": payload["sub"], "role": payload["role"]}
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


def require_role(*roles):
    def gate(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return user
    return gate
