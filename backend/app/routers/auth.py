import re
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import AuthToken, RefreshToken, User
from ..security import create_access_token, current_user, hash_password, issue_refresh_token, verify_password
from ..serializers import user_private
from ..services.mail import send_mail
from ..util import user_counts

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Very small in-memory rate limiter for credential endpoints (per IP).
_attempts: dict[str, list[float]] = {}


def rate_limit(request: Request, key: str, limit: int = 10, window: int = 600) -> None:
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
    now = datetime.now(timezone.utc).timestamp()
    bucket = [t for t in _attempts.get(f"{key}:{ip}", []) if now - t < window]
    if len(bucket) >= limit:
        raise HTTPException(429, "Too many attempts. Please wait a few minutes.")
    bucket.append(now)
    _attempts[f"{key}:{ip}"] = bucket


class Consents(BaseModel):
    acceptedTerms: bool
    marketingOptIn: bool = False


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    consents: Consents


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleIn(BaseModel):
    credential: str
    consents: Consents | None = None


class RefreshIn(BaseModel):
    refreshToken: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=200)


class VerifyIn(BaseModel):
    token: str


PALETTE = ["#1B6B4A", "#2F5D8A", "#7A4B8A", "#A0522D", "#3D6B6B", "#8A5A2F"]


async def unique_username(db: AsyncSession, base: str) -> str:
    base = re.sub(r"[^a-z0-9_.]", "", base.lower())[:24] or "reader"
    candidate = base
    n = 1
    while await db.scalar(select(User.id).where(User.username == candidate)):
        n += 1
        candidate = f"{base}{n}"
    return candidate


async def maybe_promote(db: AsyncSession, user: User) -> None:
    """Grant admin to addresses listed in ADMIN_EMAILS (checked at login and on /me)."""
    admins = {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}
    if user.email.lower() in admins and not user.is_admin:
        user.is_admin = True
        await db.commit()


async def session_payload(db: AsyncSession, user: User) -> dict:
    await maybe_promote(db, user)
    return {"accessToken": create_access_token(user.id), "refreshToken": await issue_refresh_token(db, user.id), "user": user_private(user, **await user_counts(db, user.id))}


async def send_verification(db: AsyncSession, user: User) -> None:
    token = secrets.token_urlsafe(32)
    db.add(AuthToken(token=token, user_id=user.id, purpose="verify", expires_at=datetime.now(timezone.utc) + timedelta(days=3)))
    await db.commit()
    send_mail(user.email, "Verify your BookVerse email", f"Welcome to BookVerse, {user.display_name}.\n\nConfirm your email address:\n{settings.frontend_url}/verify?token={token}\n\nThe link is valid for 3 days.")


@router.post("/register")
async def register(body: RegisterIn, request: Request, db: AsyncSession = Depends(get_db)):
    rate_limit(request, "register", limit=20)
    if not body.consents.acceptedTerms:
        raise HTTPException(400, "You must accept the Terms of Service and Privacy Policy")
    if await db.scalar(select(User.id).where(func.lower(User.email) == body.email.lower())):
        raise HTTPException(409, "An account with this email already exists")
    user = User(username=await unique_username(db, body.email.split("@")[0]), display_name=body.name.strip(), email=body.email.lower(),
                password_hash=hash_password(body.password), avatar_color=PALETTE[sum(map(ord, body.email)) % len(PALETTE)],
                accepted_terms_at=datetime.now(timezone.utc), marketing_opt_in=body.consents.marketingOptIn)
    db.add(user)
    await db.commit()
    await send_verification(db, user)
    return await session_payload(db, user)


@router.post("/login")
async def login(body: LoginIn, request: Request, db: AsyncSession = Depends(get_db)):
    rate_limit(request, "login")
    user = await db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated")
    return await session_payload(db, user)


@router.post("/google")
async def google(body: GoogleIn, request: Request, db: AsyncSession = Depends(get_db)):
    rate_limit(request, "google", limit=30)
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not configured")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": body.credential})
    if r.status_code != 200:
        raise HTTPException(401, "Google token could not be verified")
    info = r.json()
    if info.get("aud") != settings.google_client_id or info.get("email_verified") not in ("true", True):
        raise HTTPException(401, "Google token rejected")
    user = await db.scalar(select(User).where((User.google_sub == info["sub"]) | (func.lower(User.email) == info["email"].lower())))
    if user:
        if not user.google_sub:
            user.google_sub = info["sub"]
        if not user.avatar_url and info.get("picture"):
            user.avatar_url = info["picture"]
        user.email_verified = True
    else:
        if not body.consents or not body.consents.acceptedTerms:
            raise HTTPException(400, "Please accept the Terms of Service to create an account")
        user = User(username=await unique_username(db, info["email"].split("@")[0]), display_name=info.get("name") or info["email"].split("@")[0],
                    email=info["email"].lower(), email_verified=True, google_sub=info["sub"], avatar_url=info.get("picture"),
                    avatar_color=PALETTE[sum(map(ord, info["email"])) % len(PALETTE)], accepted_terms_at=datetime.now(timezone.utc),
                    marketing_opt_in=body.consents.marketingOptIn)
        db.add(user)
    await db.commit()
    return await session_payload(db, user)


@router.post("/refresh")
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    rt = await db.get(RefreshToken, body.refreshToken)
    if not rt or rt.revoked or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    user = await db.get(User, rt.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Session expired")
    rt.revoked = True  # rotate
    await db.commit()
    return await session_payload(db, user)


@router.post("/logout")
async def logout(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    rt = await db.get(RefreshToken, body.refreshToken)
    if rt:
        rt.revoked = True
        await db.commit()
    return {"ok": True}


@router.get("/me")
async def me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await maybe_promote(db, user)
    return user_private(user, **await user_counts(db, user.id))


@router.post("/forgot")
async def forgot(body: ForgotIn, request: Request, db: AsyncSession = Depends(get_db)):
    rate_limit(request, "forgot", limit=5)
    user = await db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    if user:
        token = secrets.token_urlsafe(32)
        db.add(AuthToken(token=token, user_id=user.id, purpose="reset", expires_at=datetime.now(timezone.utc) + timedelta(hours=2)))
        await db.commit()
        send_mail(user.email, "Reset your BookVerse password", f"Reset your password here (valid for 2 hours):\n{settings.frontend_url}/reset?token={token}\n\nIf you did not ask for this, ignore this email.")
    return {"ok": True}  # same answer whether or not the email exists


@router.post("/reset")
async def reset(body: ResetIn, db: AsyncSession = Depends(get_db)):
    t = await db.get(AuthToken, body.token)
    if not t or t.purpose != "reset" or t.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link is invalid or has expired")
    user = await db.get(User, t.user_id)
    user.password_hash = hash_password(body.password)
    await db.delete(t)
    # revoke all sessions
    for rt in (await db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id))).all():
        rt.revoked = True
    await db.commit()
    return await session_payload(db, user)


@router.post("/verify")
async def verify(body: VerifyIn, db: AsyncSession = Depends(get_db)):
    t = await db.get(AuthToken, body.token)
    if not t or t.purpose != "verify" or t.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "This verification link is invalid or has expired")
    user = await db.get(User, t.user_id)
    user.email_verified = True
    await db.delete(t)
    await db.commit()
    return {"ok": True}


@router.post("/resend-verification")
async def resend(request: Request, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rate_limit(request, "resend", limit=3)
    if not user.email_verified:
        await send_verification(db, user)
    return {"ok": True}
