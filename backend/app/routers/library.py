"""Everything personal: shelves, progress, streak, highlights, bookmarks,
reviews, diary. `GET /api/me/library` returns it all at once so the client can
hydrate in a single round-trip after login."""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import (Bookmark, ClubMember, DebateVote, DiaryEntry, DiaryLike, Follow, Highlight, ReadingDay, ReadingProgress, Review, ReviewLike,
                      Shelf, StoryLike, User, UserBook)
from ..security import current_user, optional_user
from ..serializers import diary_out, highlight_out, iso, review_out
from ..util import notify, record_activity, sentiment, streak_for

router = APIRouter(prefix="/api", tags=["library"])
SHELVES = {"reading", "want_to_read", "finished", "did_not_finish", "favorites"}


# ---------------- bootstrap ----------------
@router.get("/me/library")
async def my_library(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    shelves = (await db.scalars(select(Shelf).where(Shelf.user_id == user.id).order_by(Shelf.created_at.desc()))).all()
    progress = (await db.scalars(select(ReadingProgress).where(ReadingProgress.user_id == user.id))).all()
    days = (await db.scalars(select(ReadingDay.day).where(ReadingDay.user_id == user.id).order_by(ReadingDay.day.desc()))).all()
    return {
        "shelves": [{"bookId": s.book_id, "shelf": s.shelf_type, "addedAt": iso(s.created_at), "startedAt": iso(s.started_at), "finishedAt": iso(s.finished_at), "dnfReason": s.dnf_reason} for s in shelves],
        "progress": {p.book_id: {"bookId": p.book_id, "chapter": p.chapter, "paragraph": p.paragraph, "percentage": p.percentage, "minutes": p.minutes, "lastReadAt": iso(p.last_read_at)} for p in progress},
        "highlights": [highlight_out(h) for h in (await db.scalars(select(Highlight).where(Highlight.user_id == user.id).order_by(Highlight.created_at.desc()))).all()],
        "bookmarks": [{"id": b.id, "bookId": b.book_id, "chapter": b.chapter, "paragraph": b.paragraph, "snippet": b.snippet, "createdAt": iso(b.created_at)} for b in (await db.scalars(select(Bookmark).where(Bookmark.user_id == user.id))).all()],
        "reviews": [review_out(r) for r in (await db.scalars(select(Review).where(Review.user_id == user.id).order_by(Review.created_at.desc()))).all()],
        "diary": [diary_out(d) for d in (await db.scalars(select(DiaryEntry).where(DiaryEntry.user_id == user.id).order_by(DiaryEntry.created_at.desc()))).all()],
        "following": list((await db.scalars(select(Follow.following_id).where(Follow.follower_id == user.id))).all()),
        "votes": {v.debate_id: v.side for v in (await db.scalars(select(DebateVote).where(DebateVote.user_id == user.id))).all()},
        "clubs": list((await db.scalars(select(ClubMember.club_id).where(ClubMember.user_id == user.id))).all()),
        "likedStories": list((await db.scalars(select(StoryLike.story_id).where(StoryLike.user_id == user.id))).all()),
        "likedReviews": list((await db.scalars(select(ReviewLike.review_id).where(ReviewLike.user_id == user.id))).all()),
        "likedDiary": list((await db.scalars(select(DiaryLike.entry_id).where(DiaryLike.user_id == user.id))).all()),
        "streak": {"current": await streak_for(db, user.id), "longest": _longest(days), "lastDate": days[0].isoformat() if days else None, "days": [d.isoformat() for d in days]},
    }


def _longest(days) -> int:
    best = run = 0
    prev = None
    for d in sorted(days):
        run = run + 1 if prev and (d - prev).days == 1 else 1
        best = max(best, run)
        prev = d
    return best


# ---------------- shelves ----------------
class ShelfIn(BaseModel):
    bookId: int
    shelf: str | None
    dnfReason: str | None = Field(default=None, max_length=300)


@router.put("/shelves")
async def set_shelf(body: ShelfIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if body.shelf is not None and body.shelf not in SHELVES:
        raise HTTPException(400, "Unknown shelf")
    row = await db.scalar(select(Shelf).where(Shelf.user_id == user.id, Shelf.book_id == body.bookId))
    if body.shelf is None:
        if row:
            await db.delete(row)
        await db.commit()
        return {"ok": True}
    nowt = datetime.now(timezone.utc)
    if not row:
        row = Shelf(user_id=user.id, book_id=body.bookId, shelf_type=body.shelf)
        db.add(row)
    prev = row.shelf_type if row.id else None
    row.shelf_type = body.shelf
    if body.shelf == "reading" and not row.started_at:
        row.started_at = nowt
    row.finished_at = nowt if body.shelf == "finished" else None
    row.dnf_reason = body.dnfReason if body.shelf == "did_not_finish" else None
    if body.shelf in ("reading", "finished") and prev != body.shelf:
        record_activity(db, user.id, "started" if body.shelf == "reading" else "finished", book_id=body.bookId)
    await db.commit()
    return {"bookId": row.book_id, "shelf": row.shelf_type, "addedAt": iso(row.created_at), "startedAt": iso(row.started_at), "finishedAt": iso(row.finished_at), "dnfReason": row.dnf_reason}


# ---------------- progress & streak ----------------
class ProgressIn(BaseModel):
    bookId: int
    chapter: int = 0
    paragraph: int = 0
    percentage: float = Field(default=0, ge=0, le=100)
    minutesDelta: int = Field(default=0, ge=0, le=120)


@router.put("/progress")
async def put_progress(body: ProgressIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = await db.get(ReadingProgress, (user.id, body.bookId))
    if not row:
        # First save for this book. Position and minutes can arrive together, so
        # use an idempotent insert instead of racing on a plain INSERT.
        from sqlalchemy.dialects import postgresql, sqlite
        dialect = db.bind.dialect.name if db.bind else "sqlite"
        ins = (postgresql.insert if dialect == "postgresql" else sqlite.insert)(ReadingProgress).values(user_id=user.id, book_id=body.bookId).on_conflict_do_nothing()
        await db.execute(ins)
        if not await db.scalar(select(Shelf.id).where(Shelf.user_id == user.id, Shelf.book_id == body.bookId)):
            db.add(Shelf(user_id=user.id, book_id=body.bookId, shelf_type="reading", started_at=datetime.now(timezone.utc)))
            record_activity(db, user.id, "started", book_id=body.bookId)
        await db.commit()
        row = await db.get(ReadingProgress, (user.id, body.bookId))
    row.chapter, row.paragraph, row.percentage = body.chapter, body.paragraph, max(row.percentage if body.percentage == 0 else 0, body.percentage)
    row.last_read_at = datetime.now(timezone.utc)
    if body.minutesDelta:
        row.minutes += body.minutesDelta
        today = date.today()
        day = await db.get(ReadingDay, (user.id, today))
        if day:
            day.minutes += body.minutesDelta
        else:
            db.add(ReadingDay(user_id=user.id, day=today, minutes=body.minutesDelta))
        if body.bookId >= 10_000_000:
            b = await db.get(UserBook, body.bookId)
            if b and row.minutes == body.minutesDelta:
                b.reader_count += 1
    await db.commit()
    return {"bookId": row.book_id, "chapter": row.chapter, "paragraph": row.paragraph, "percentage": row.percentage, "minutes": row.minutes, "lastReadAt": iso(row.last_read_at), "streak": await streak_for(db, user.id)}


# ---------------- highlights & bookmarks ----------------
class HighlightIn(BaseModel):
    bookId: int
    chapter: int = 0
    text: str = Field(min_length=1, max_length=2000)
    color: str = Field(default="yellow", pattern="^(yellow|green|blue|pink)$")
    note: str | None = Field(default=None, max_length=1000)
    isPublic: bool = True


@router.post("/highlights")
async def add_highlight(body: HighlightIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    h = Highlight(user_id=user.id, **{"book_id": body.bookId, "chapter": body.chapter, "text": body.text.strip(), "color": body.color, "note": body.note, "is_public": body.isPublic})
    db.add(h)
    if body.isPublic:
        record_activity(db, user.id, "highlighted", book_id=body.bookId, text=body.text.strip()[:300])
    await db.commit()
    return highlight_out(h)


@router.delete("/highlights/{hid}")
async def remove_highlight(hid: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Highlight).where(Highlight.id == hid, Highlight.user_id == user.id))
    await db.commit()
    return {"ok": True}


@router.get("/books/{book_id}/highlights")
async def book_highlights(book_id: int, limit: int = 30, db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Highlight).where(Highlight.book_id == book_id, Highlight.is_public.is_(True)).order_by(Highlight.like_count.desc(), Highlight.created_at.desc()).limit(limit))).all()
    return [highlight_out(h) for h in rows]


class BookmarkIn(BaseModel):
    bookId: int
    chapter: int
    paragraph: int
    snippet: str = Field(default="", max_length=200)


@router.post("/bookmarks/toggle")
async def toggle_bookmark(body: BookmarkIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = await db.scalar(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.book_id == body.bookId, Bookmark.chapter == body.chapter, Bookmark.paragraph == body.paragraph))
    if row:
        await db.delete(row)
        await db.commit()
        return {"removed": row.id}
    b = Bookmark(user_id=user.id, book_id=body.bookId, chapter=body.chapter, paragraph=body.paragraph, snippet=body.snippet)
    db.add(b)
    await db.commit()
    return {"id": b.id, "bookId": b.book_id, "chapter": b.chapter, "paragraph": b.paragraph, "snippet": b.snippet, "createdAt": iso(b.created_at)}


# ---------------- reviews ----------------
class ReviewIn(BaseModel):
    bookId: int
    rating: float = Field(ge=0.5, le=5)
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)
    spoilers: bool = False


@router.get("/books/{book_id}/reviews")
async def book_reviews(book_id: int, db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Review).where(Review.book_id == book_id).order_by(Review.like_count.desc(), Review.created_at.desc()))).all()
    avg = await db.scalar(select(func.avg(Review.rating)).where(Review.book_id == book_id))
    return {"reviews": [review_out(r) for r in rows], "average": round(avg, 1) if avg else None, "count": len(rows)}


@router.put("/reviews")
async def upsert_review(body: ReviewIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    r = await db.scalar(select(Review).where(Review.user_id == user.id, Review.book_id == body.bookId))
    created = r is None
    if not r:
        r = Review(user_id=user.id, book_id=body.bookId)
        db.add(r)
    r.rating, r.title, r.body, r.spoilers, r.sentiment = body.rating, body.title.strip(), body.body.strip(), body.spoilers, sentiment(body.body)
    if created:
        record_activity(db, user.id, "reviewed", book_id=body.bookId, text=body.body.strip()[:280], rating=body.rating)
    await db.commit()
    return review_out(r)


@router.delete("/reviews/{rid}")
async def delete_review(rid: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Review).where(Review.id == rid, Review.user_id == user.id))
    await db.commit()
    return {"ok": True}


@router.post("/reviews/{rid}/like")
async def like_review(rid: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Review, rid)
    if not r:
        raise HTTPException(404, "Review not found")
    existing = await db.get(ReviewLike, (user.id, rid))
    if existing:
        await db.delete(existing)
        r.like_count = max(0, r.like_count - 1)
        liked = False
    else:
        db.add(ReviewLike(user_id=user.id, review_id=rid))
        r.like_count += 1
        liked = True
        await notify(db, r.user_id, "like", f"{user.display_name} found your review helpful", r.title, f"/books/{r.book_id}", user.id)
    await db.commit()
    return {"liked": liked, "likes": r.like_count}


# ---------------- diary ----------------
class DiaryIn(BaseModel):
    bookId: int | None = None
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=8000)
    mood: str = Field(default="calm", pattern="^(adventurous|dark|romantic|philosophical|funny|calm)$")
    location: str | None = Field(default=None, max_length=100)
    isPublic: bool = True


@router.get("/diary")
async def public_diary(mood: str | None = None, limit: int = 40, db: AsyncSession = Depends(get_db)):
    stmt = select(DiaryEntry).where(DiaryEntry.is_public.is_(True))
    if mood:
        stmt = stmt.where(DiaryEntry.mood == mood)
    rows = (await db.scalars(stmt.order_by(DiaryEntry.created_at.desc()).limit(limit))).all()
    return [diary_out(d) for d in rows]


@router.post("/diary")
async def add_diary(body: DiaryIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    d = DiaryEntry(user_id=user.id, book_id=body.bookId, title=body.title.strip(), body=body.body.strip(), mood=body.mood, location=body.location, is_public=body.isPublic)
    db.add(d)
    await db.flush()
    if body.isPublic:
        record_activity(db, user.id, "diary", book_id=body.bookId, ref_type="diary", ref_id=d.id)
    await db.commit()
    return diary_out(d)


@router.delete("/diary/{did}")
async def delete_diary(did: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(DiaryEntry).where(DiaryEntry.id == did, DiaryEntry.user_id == user.id))
    await db.commit()
    return {"ok": True}


@router.post("/diary/{did}/like")
async def like_diary(did: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    d = await db.get(DiaryEntry, did)
    if not d:
        raise HTTPException(404, "Entry not found")
    existing = await db.get(DiaryLike, (user.id, did))
    if existing:
        await db.delete(existing)
        d.like_count = max(0, d.like_count - 1)
        liked = False
    else:
        db.add(DiaryLike(user_id=user.id, entry_id=did))
        d.like_count += 1
        liked = True
        await notify(db, d.user_id, "like", f"{user.display_name} liked your diary entry", d.title, "/diary", user.id)
    await db.commit()
    return {"liked": liked, "likes": d.like_count}


__all__ = ["optional_user"]
