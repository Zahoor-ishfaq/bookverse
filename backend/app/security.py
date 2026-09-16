import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db
from .models import RefreshToken, User

# ---- Passwords: scrypt from the standard library (no native wheels needed) ----
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(key).decode()


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or not stored.startswith("scrypt$"):
        return False
    _, salt_b64, key_b64 = stored.split("$")
    salt, key = base64.b64decode(salt_b64), base64.b64decode(key_b64)
    candidate = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return hmac.compare_digest(candidate, key)


# ---- JWT access tokens + opaque refresh tokens ----
def create_access_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": user_id, "exp": exp, "type": "access"}, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("sub") if payload.get("type") == "access" else None
    except jwt.PyJWTError:
        return None


async def issue_refresh_token(db: AsyncSession, user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    db.add(RefreshToken(token=token, user_id=user_id, expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)))
    await db.commit()
    return token


bearer = HTTPBearer(auto_error=False)


async def _load_user(db: AsyncSession, token: str | None) -> User | None:
    if not token:
        return None
    uid = decode_access_token(token)
    if not uid:
        return None
    user = await db.get(User, uid)
    return user if user and user.is_active else None


async def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: AsyncSession = Depends(get_db)) -> User:
    user = await _load_user(db, creds.credentials if creds else None)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in")
    return user


async def optional_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: AsyncSession = Depends(get_db)) -> User | None:
    return await _load_user(db, creds.credentials if creds else None)


async def ws_user(ws: WebSocket, db: AsyncSession) -> User | None:
    return await _load_user(db, ws.query_params.get("token"))


async def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Admin only")
    return user


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return (fwd.split(",")[0].strip() if fwd else request.client.host) if request.client else "unknown"


__all__ = ["select"]
