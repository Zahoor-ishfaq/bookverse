import os
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import (Bookmark, DiaryEntry, Follow, Highlight, ReadingDay, ReadingProgress, Review, Shelf, Story, User, UserBook)
from ..security import current_user, optional_user
from ..serializers import diary_out, highlight_out, iso, review_out, story_out, user_book_meta, user_private, user_public
from ..util import get_user_or_404, notify, user_counts
from ..services.storage import save_file

router = APIRouter(prefix="/api", tags=["users"])


class ProfileIn(BaseModel):
    displayName: str | None = Field(default=None, max_length=100)
    username: str | None = Field(default=None, min_length=3, max_length=30, pattern=r"^[a-z0-9_.]+$")
    headline: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=100)
    links: dict[str, str] | None = None
    readingGoal: int | None = Field(default=None, ge=1, le=365)
    avatarColor: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    avatarUrl: str | None = None
    marketingOptIn: bool | None = None
    favoriteGenres: list[str] | None = None
    favoriteMoods: list[str] | None = None


class OnboardingIn(BaseModel):
    genres: list[str] = []
    moods: list[str] = []
    goal: int = Field(default=24, ge=1, le=365)


@router.patch("/me")
async def update_me(body: ProfileIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    if "username" in data and data["username"] != user.username:
        if await db.scalar(select(User.id).where(User.username == data["username"], User.id != user.id)):
            raise HTTPException(409, "That username is taken")
    if "links" in data:
        data["links"] = {k: v.strip()[:200] for k, v in data["links"].items() if v and v.strip()}
    if "avatarUrl" in data and data["avatarUrl"] == "":
        data["avatarUrl"] = None
    mapping = {"displayName": "display_name", "readingGoal": "reading_goal", "avatarColor": "avatar_color", "avatarUrl": "avatar_url",
               "marketingOptIn": "marketing_opt_in", "favoriteGenres": "favorite_genres", "favoriteMoods": "favorite_moods"}
    for k, v in data.items():
        setattr(user, mapping.get(k, k), v)
    await db.commit()
    return user_private(user, **await user_counts(db, user.id))


@router.post("/me/onboarding")
async def onboarding(body: OnboardingIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    user.favorite_genres, user.favorite_moods, user.reading_goal, user.onboarding_completed = body.genres, body.moods, body.goal, True
    await db.commit()
    return user_private(user, **await user_counts(db, user.id))


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image")
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Image must be under {settings.max_upload_mb} MB")
    ext = {"image/png": "png", "image/webp": "webp"}.get(file.content_type, "jpg")
    user.avatar_url = save_file(f"avatars/{user.id}-{secrets.token_hex(4)}.{ext}", data, file.content_type or "image/jpeg")
    await db.commit()
    return user_private(user, **await user_counts(db, user.id))


@router.get("/me/export")
async def export_me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    out = {"exportedAt": iso(datetime.now(timezone.utc)), "profile": user_private(user)}
    out["shelves"] = [{"bookId": s.book_id, "shelf": s.shelf_type, "startedAt": iso(s.started_at), "finishedAt": iso(s.finished_at), "dnfReason": s.dnf_reason} for s in (await db.scalars(select(Shelf).where(Shelf.user_id == user.id))).all()]
    out["progress"] = [{"bookId": p.book_id, "chapter": p.chapter, "percentage": p.percentage, "minutes": p.minutes} for p in (await db.scalars(select(ReadingProgress).where(ReadingProgress.user_id == user.id))).all()]
    out["highlights"] = [highlight_out(h) for h in (await db.scalars(select(Highlight).where(Highlight.user_id == user.id))).all()]
    out["reviews"] = [review_out(r) for r in (await db.scalars(select(Review).where(Review.user_id == user.id))).all()]
    out["diary"] = [diary_out(d) for d in (await db.scalars(select(DiaryEntry).where(DiaryEntry.user_id == user.id))).all()]
    out["stories"] = [story_out(s) for s in (await db.scalars(select(Story).where(Story.author_id == user.id))).all()]
    out["books"] = [user_book_meta(b) for b in (await db.scalars(select(UserBook).where(UserBook.owner_id == user.id))).all()]
    return out


@router.delete("/me")
async def delete_me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """Erase personal data and deactivate. Public contributions (threads, room
    messages, debate arguments, clubs) stay, attributed to "Deleted member"."""
    from ..models import AuthToken, Bookmark as Bm, ClubMember, ChallengeParticipant, DebateVote, DiaryLike, Highlight as Hl, Notification, ReadingDay, ReadingProgress as RP, RefreshToken, ReviewLike, RoomParticipant, Shelf as Sh, Story as St, StoryLike, UserBook as UB
    for model, col in ((Sh, Sh.user_id), (RP, RP.user_id), (ReadingDay, ReadingDay.user_id), (Hl, Hl.user_id), (Bm, Bm.user_id), (Review, Review.user_id), (DiaryEntry, DiaryEntry.user_id),
                       (ReviewLike, ReviewLike.user_id), (DiaryLike, DiaryLike.user_id), (StoryLike, StoryLike.user_id), (Notification, Notification.user_id), (AuthToken, AuthToken.user_id),
                       (RefreshToken, RefreshToken.user_id), (ClubMember, ClubMember.user_id), (RoomParticipant, RoomParticipant.user_id), (ChallengeParticipant, ChallengeParticipant.user_id),
                       (DebateVote, DebateVote.user_id), (St, St.author_id), (UB, UB.owner_id)):
        await db.execute(delete(model).where(col == user.id))
    await db.execute(delete(Follow).where((Follow.follower_id == user.id) | (Follow.following_id == user.id)))
    user.email = f"deleted-{user.id}@deleted.invalid"
    user.username = f"deleted-{user.id[-6:]}"
    user.display_name = "Deleted member"
    user.password_hash = None
    user.google_sub = None
    user.avatar_url = None
    user.headline = None
    user.bio = ""
    user.location = ""
    user.links = {}
    user.favorite_genres = []
    user.favorite_moods = []
    user.is_active = False
    await db.commit()
    return {"ok": True}


# ---------------- Public profiles & follows ----------------
@router.get("/users/{username}")
async def get_user(username: str, viewer: User | None = Depends(optional_user), db: AsyncSession = Depends(get_db)):
    u = await get_user_or_404(db, username)
    counts = await user_counts(db, u.id)
    d = user_public(u, **counts)
    d["isFollowing"] = bool(viewer and await db.scalar(select(Follow.follower_id).where(Follow.follower_id == viewer.id, Follow.following_id == u.id)))
    # Data shown on the public profile
    shelf_rows = (await db.scalars(select(Shelf).where(Shelf.user_id == u.id).order_by(Shelf.created_at.desc()).limit(24))).all()
    d["shelfBookIds"] = [s.book_id for s in shelf_rows]
    d["reviewsList"] = [review_out(r) for r in (await db.scalars(select(Review).where(Review.user_id == u.id).order_by(Review.created_at.desc()).limit(20))).all()]
    d["stories"] = [story_out(s, with_chapters=False) for s in (await db.scalars(select(Story).where(Story.author_id == u.id).order_by(Story.published_at.desc()))).all()]
    d["books"] = [user_book_meta(b) for b in (await db.scalars(select(UserBook).where(UserBook.owner_id == u.id, UserBook.is_public.is_(True)).order_by(UserBook.created_at.desc()))).all()]
    d["diary"] = [diary_out(e) for e in (await db.scalars(select(DiaryEntry).where(DiaryEntry.user_id == u.id, DiaryEntry.is_public.is_(True)).order_by(DiaryEntry.created_at.desc()).limit(20))).all()]
    d["highlights"] = [highlight_out(h) for h in (await db.scalars(select(Highlight).where(Highlight.user_id == u.id, Highlight.is_public.is_(True)).order_by(Highlight.created_at.desc()).limit(12))).all()]
    d["readingDays"] = [x.isoformat() for x in (await db.scalars(select(ReadingDay.day).where(ReadingDay.user_id == u.id))).all()]
    if viewer:
        mutual = (await db.scalars(select(Follow.following_id).where(Follow.follower_id == viewer.id).where(Follow.following_id.in_(select(Follow.follower_id).where(Follow.following_id == u.id))))).all()
        d["mutualFollowerIds"] = list(mutual)[:5]
    return d


@router.post("/users/{username}/follow")
async def follow(username: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    target = await get_user_or_404(db, username)
    if target.id == user.id:
        raise HTTPException(400, "You cannot follow yourself")
    if not await db.scalar(select(Follow.follower_id).where(Follow.follower_id == user.id, Follow.following_id == target.id)):
        db.add(Follow(follower_id=user.id, following_id=target.id))
        await notify(db, target.id, "follow", f"{user.display_name} followed you", "", f"/u/{user.username}", user.id)
        await db.commit()
    return {"following": True}


@router.delete("/users/{username}/follow")
async def unfollow(username: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    target = await get_user_or_404(db, username)
    await db.execute(delete(Follow).where(Follow.follower_id == user.id, Follow.following_id == target.id))
    await db.commit()
    return {"following": False}


@router.get("/users")
async def list_users(q: str = "", limit: int = 20, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.is_active.is_(True))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.username).like(like), func.lower(User.display_name).like(like), func.lower(User.bio).like(like)))
    rows = (await db.scalars(stmt.order_by(User.created_at).limit(limit))).all()
    out = []
    for u in rows:
        out.append(user_public(u, **await user_counts(db, u.id)))
    return out


@router.get("/users/suggested/list")
async def suggested(user: User | None = Depends(optional_user), db: AsyncSession = Depends(get_db)):
    """Most-followed members the viewer doesn't follow yet."""
    counts = select(Follow.following_id, func.count().label("n")).group_by(Follow.following_id).subquery()
    stmt = select(User).outerjoin(counts, counts.c.following_id == User.id).where(User.is_active.is_(True)).order_by(counts.c.n.desc().nulls_last(), User.created_at).limit(12)
    rows = (await db.scalars(stmt)).all()
    following = set((await db.scalars(select(Follow.following_id).where(Follow.follower_id == user.id))).all()) if user else set()
    out = [user_public(u, **await user_counts(db, u.id)) for u in rows if not user or (u.id != user.id and u.id not in following)]
    return out[:6]
