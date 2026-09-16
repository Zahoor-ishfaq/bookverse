import re
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Activity, Follow, Notification, ReadingDay, Review, Shelf, User, UserBook

POS = re.compile(r"\b(love|loved|beautiful|brilliant|wonderful|great|best|perfect|masterpiece|gorgeous|adored|stunning|excellent|moving)\b", re.I)
NEG = re.compile(r"\b(hate|hated|boring|dull|bad|worst|tedious|slog|disappoint\w*|awful|weak|flat)\b", re.I)


def sentiment(text: str) -> str:
    p, n = len(POS.findall(text)), len(NEG.findall(text))
    if p > n + 1:
        return "positive"
    if n > p + 1:
        return "negative"
    return "mixed" if p == n else ("positive" if p > n else "negative")


async def notify(db: AsyncSession, user_id: str, type: str, title: str, body: str = "", action_url: str = "/home", from_user_id: str | None = None) -> None:
    if from_user_id == user_id:
        return
    db.add(Notification(user_id=user_id, type=type, title=title, body=body, action_url=action_url, from_user_id=from_user_id))


def record_activity(db: AsyncSession, user_id: str, verb: str, *, book_id: int | None = None, ref_type: str | None = None, ref_id: str | None = None, text: str | None = None, rating: float | None = None) -> None:
    db.add(Activity(user_id=user_id, verb=verb, book_id=book_id, ref_type=ref_type, ref_id=ref_id, text=text, rating=rating))


async def user_counts(db: AsyncSession, user_id: str) -> dict:
    followers = await db.scalar(select(func.count()).select_from(Follow).where(Follow.following_id == user_id)) or 0
    following = await db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)) or 0
    books_read = await db.scalar(select(func.count()).select_from(Shelf).where(Shelf.user_id == user_id, Shelf.shelf_type == "finished")) or 0
    reviews = await db.scalar(select(func.count()).select_from(Review).where(Review.user_id == user_id)) or 0
    published = await db.scalar(select(func.count()).select_from(UserBook).where(UserBook.owner_id == user_id, UserBook.is_public.is_(True))) or 0
    return {"followers": followers, "following": following, "books_read": books_read, "reviews": reviews, "published": published, "streak": await streak_for(db, user_id)}


async def streak_for(db: AsyncSession, user_id: str) -> int:
    days = set((await db.scalars(select(ReadingDay.day).where(ReadingDay.user_id == user_id))).all())
    if not days:
        return 0
    today = date.today()
    d = today if today in days else today - timedelta(days=1)
    n = 0
    while d in days:
        n += 1
        d -= timedelta(days=1)
    return n


async def get_user_or_404(db: AsyncSession, username: str) -> User:
    from fastapi import HTTPException
    u = await db.scalar(select(User).where(func.lower(User.username) == username.lower()))
    if not u:
        raise HTTPException(404, "User not found")
    return u
