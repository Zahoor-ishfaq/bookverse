from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import (Activity, Challenge, ChallengeParticipant, Club, Debate, DiaryEntry, Follow, Notification, ReadingDay, Shelf, Story,
                      StoryChapter, StoryComment, StoryLike, User, UserBook)
from ..security import current_user, optional_user
from ..serializers import challenge_out, club_out, debate_out, diary_out, iso, notification_out, story_out, user_book_meta, user_public
from ..util import notify, record_activity, user_counts

router = APIRouter(prefix="/api", tags=["social"])


# =====================================================================
# Stories
# =====================================================================
@router.get("/stories")
async def list_stories(genre: str | None = None, limit: int = 60, db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Story).order_by(Story.is_featured.desc(), Story.published_at.desc()).limit(limit))).all()
    out = [story_out(s, with_chapters=False) for s in rows]
    if genre and genre != "All":
        out = [s for s in out if genre in s["genres"]]
    return out


@router.get("/stories/{story_id}")
async def get_story(story_id: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(Story, story_id)
    if not s:
        raise HTTPException(404, "Story not found")
    await db.execute(update(Story).where(Story.id == story_id).values(view_count=Story.view_count + 1))
    await db.commit()
    comments = (await db.scalars(select(StoryComment).where(StoryComment.story_id == story_id).order_by(StoryComment.created_at.desc()).limit(100))).all()
    d = story_out(s)
    d["commentsList"] = [{"id": c.id, "userId": c.user_id, "chapter": c.chapter_number, "body": c.body, "createdAt": iso(c.created_at)} for c in comments]
    return d


class ChapterIn(BaseModel):
    title: str = Field(default="", max_length=300)
    content: list[str] = Field(min_length=1)


class StoryIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    tagline: str = Field(default="", max_length=300)
    coverColor: str = Field(default="#1B6B4A", pattern=r"^#[0-9A-Fa-f]{6}$")
    coverPattern: str = Field(default="waves", pattern="^(stripes|dots|waves|grid)$")
    genres: list[str] = []
    inspiredByBookId: int | None = None
    isSerial: bool = False
    chapter: ChapterIn


@router.post("/stories")
async def create_story(body: StoryIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    words = len(" ".join(body.chapter.content).split())
    s = Story(author_id=user.id, title=body.title.strip(), tagline=body.tagline.strip(), cover_color=body.coverColor, cover_pattern=body.coverPattern,
              genres=body.genres[:3] or ["Literary"], inspired_by_book_id=body.inspiredByBookId, is_serial=body.isSerial, is_complete=not body.isSerial, word_count=words)
    db.add(s)
    await db.flush()
    db.add(StoryChapter(story_id=s.id, number=1, title=body.chapter.title.strip() or body.title.strip(), content=body.chapter.content))
    record_activity(db, user.id, "story", ref_type="story", ref_id=s.id, text=s.title)
    # tell followers
    for fid in (await db.scalars(select(Follow.follower_id).where(Follow.following_id == user.id))).all():
        await notify(db, fid, "chapter", f"New story from {user.display_name}", s.title, f"/stories/{s.id}", user.id)
    await db.commit()
    await db.refresh(s)
    return story_out(s)


@router.post("/stories/{story_id}/chapters")
async def add_chapter(story_id: str, body: ChapterIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    s = await db.get(Story, story_id)
    if not s or s.author_id != user.id:
        raise HTTPException(404, "Story not found")
    n = len(s.chapters) + 1
    db.add(StoryChapter(story_id=s.id, number=n, title=body.title.strip() or f"Chapter {n}", content=body.content))
    s.word_count += len(" ".join(body.content).split())
    for fid in (await db.scalars(select(Follow.follower_id).where(Follow.following_id == user.id))).all():
        await notify(db, fid, "chapter", f"New chapter from {user.display_name}", f"Chapter {n}: {body.title or s.title}", f"/stories/{s.id}?ch={n}", user.id)
    record_activity(db, user.id, "chapter", ref_type="story", ref_id=s.id, text=f"{n}")
    await db.commit()
    await db.refresh(s)
    return story_out(s)


@router.post("/stories/{story_id}/like")
async def like_story(story_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    s = await db.get(Story, story_id)
    if not s:
        raise HTTPException(404, "Story not found")
    existing = await db.get(StoryLike, (user.id, story_id))
    if existing:
        await db.delete(existing)
        s.like_count = max(0, s.like_count - 1)
        liked = False
    else:
        db.add(StoryLike(user_id=user.id, story_id=story_id))
        s.like_count += 1
        liked = True
        await notify(db, s.author_id, "like", f"{user.display_name} liked your story", s.title, f"/stories/{s.id}", user.id)
    await db.commit()
    return {"liked": liked, "likes": s.like_count}


class CommentIn(BaseModel):
    chapter: int = 1
    body: str = Field(min_length=1, max_length=2000)


@router.post("/stories/{story_id}/comments")
async def comment_story(story_id: str, body: CommentIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    s = await db.get(Story, story_id)
    if not s:
        raise HTTPException(404, "Story not found")
    c = StoryComment(story_id=story_id, chapter_number=body.chapter, user_id=user.id, body=body.body.strip())
    db.add(c)
    s.comment_count += 1
    for ch in s.chapters:
        if ch.number == body.chapter:
            ch.comment_count += 1
    await notify(db, s.author_id, "comment", f"{user.display_name} commented on {s.title}", body.body[:120], f"/stories/{s.id}?ch={body.chapter}", user.id)
    await db.commit()
    return {"id": c.id, "userId": c.user_id, "chapter": c.chapter_number, "body": c.body, "createdAt": iso(c.created_at)}


@router.delete("/stories/{story_id}")
async def delete_story(story_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    s = await db.get(Story, story_id)
    if not s or (s.author_id != user.id and not user.is_admin):
        raise HTTPException(404, "Story not found")
    await db.delete(s)
    await db.commit()
    return {"ok": True}


# =====================================================================
# Challenges
# =====================================================================
async def _leaderboard(db: AsyncSession, c: Challenge) -> list[dict]:
    rows = (await db.execute(select(ChallengeParticipant.user_id, ChallengeParticipant.value).where(ChallengeParticipant.challenge_id == c.id).order_by(ChallengeParticipant.value.desc()).limit(10))).all()
    return [{"userId": uid, "value": val} for uid, val in rows]


async def _progress_value(db: AsyncSession, c: Challenge, user_id: str) -> int:
    if c.type == "books":
        return await db.scalar(select(func.count()).select_from(Shelf).where(Shelf.user_id == user_id, Shelf.shelf_type == "finished", Shelf.finished_at >= datetime.combine(c.start_date, datetime.min.time(), tzinfo=timezone.utc))) or 0
    if c.type == "streak":
        return await db.scalar(select(func.count()).select_from(ReadingDay).where(ReadingDay.user_id == user_id, ReadingDay.day >= c.start_date)) or 0
    return 0


@router.get("/challenges")
async def list_challenges(user: User | None = Depends(optional_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Challenge).where(Challenge.end_date >= date.today()).order_by(Challenge.participant_count.desc()))).all()
    out = []
    for c in rows:
        if user:
            p = await db.get(ChallengeParticipant, (c.id, user.id))
            if p:
                p.value = max(p.value, await _progress_value(db, c, user.id))
        d = challenge_out(c, await _leaderboard(db, c))
        d["joined"] = bool(user and await db.get(ChallengeParticipant, (c.id, user.id)))
        out.append(d)
    await db.commit()
    return out


class ChallengeIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=1000)
    type: str = Field(default="books", pattern="^(books|pages|genre_bingo|streak|writing)$")
    target: int = Field(default=12, ge=1, le=10000)
    days: int = Field(default=90, ge=1, le=366)


@router.post("/challenges")
async def create_challenge(body: ChallengeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    c = Challenge(created_by=user.id, title=body.title.strip(), description=body.description.strip() or "A community challenge.", type=body.type, target=body.target,
                  start_date=date.today(), end_date=date.today() + timedelta(days=body.days), participant_count=1)
    db.add(c)
    await db.flush()
    db.add(ChallengeParticipant(challenge_id=c.id, user_id=user.id))
    await db.commit()
    d = challenge_out(c, [{"userId": user.id, "value": 0}])
    d["joined"] = True
    return d


@router.post("/challenges/{cid}/join")
async def join_challenge(cid: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    c = await db.get(Challenge, cid)
    if not c:
        raise HTTPException(404, "Challenge not found")
    p = await db.get(ChallengeParticipant, (cid, user.id))
    if p:
        await db.delete(p)
        c.participant_count = max(0, c.participant_count - 1)
        joined = False
    else:
        db.add(ChallengeParticipant(challenge_id=cid, user_id=user.id, value=await _progress_value(db, c, user.id)))
        c.participant_count += 1
        joined = True
    await db.commit()
    return {"joined": joined, "participants": c.participant_count}


# =====================================================================
# Notifications
# =====================================================================
@router.get("/notifications")
async def list_notifications(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(100))).all()
    return [notification_out(n) for n in rows]


@router.post("/notifications/read")
async def read_notifications(ids: list[str] | None = None, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    stmt = update(Notification).where(Notification.user_id == user.id)
    if ids:
        stmt = stmt.where(Notification.id.in_(ids))
    await db.execute(stmt.values(is_read=True))
    await db.commit()
    return {"ok": True}


# =====================================================================
# Feed & search & people
# =====================================================================
@router.get("/feed")
async def feed(user: User | None = Depends(optional_user), limit: int = 40, db: AsyncSession = Depends(get_db)):
    """Recent public activity. Logged-in users see people they follow first, then everyone."""
    following = set((await db.scalars(select(Follow.following_id).where(Follow.follower_id == user.id))).all()) if user else set()
    rows = (await db.scalars(select(Activity).order_by(Activity.created_at.desc()).limit(200))).all()
    items = []
    for a in rows:
        if user and a.user_id == user.id:
            continue
        item = {"id": a.id, "kind": "activity", "userId": a.user_id, "verb": a.verb, "bookId": a.book_id, "text": a.text, "rating": a.rating, "createdAt": iso(a.created_at), "refType": a.ref_type, "refId": a.ref_id, "followed": a.user_id in following}
        if a.ref_type == "diary" and a.ref_id:
            e = await db.get(DiaryEntry, a.ref_id)
            if not e or not e.is_public:
                continue
            item["kind"], item["entry"] = "diary", diary_out(e)
        elif a.ref_type == "story" and a.ref_id:
            s = await db.get(Story, a.ref_id)
            if not s:
                continue
            item["kind"], item["story"] = "story", story_out(s, with_chapters=True)
        elif a.ref_type == "club" and a.ref_id:
            c = await db.get(Club, a.ref_id)
            if not c:
                continue
            item["kind"], item["club"] = "club", club_out(c, [], None)
        items.append(item)
    items.sort(key=lambda x: (not x["followed"], x["createdAt"]), reverse=False)
    items.sort(key=lambda x: x["followed"], reverse=True)
    # interleave one live debate near the top
    debates = (await db.scalars(select(Debate).where(Debate.ends_at > datetime.now(timezone.utc)).order_by(Debate.ends_at).limit(2))).all()
    out = items[:limit]
    for i, d in enumerate(debates):
        out.insert(min(len(out), 1 + i * 6), {"id": f"deb_{d.id}", "kind": "debate", "debate": debate_out(d, []), "createdAt": iso(d.created_at)})
    return out


@router.get("/search")
async def search(q: str, db: AsyncSession = Depends(get_db)):
    like = f"%{q.lower()}%"
    users = (await db.scalars(select(User).where(User.is_active.is_(True), or_(func.lower(User.username).like(like), func.lower(User.display_name).like(like), func.lower(User.bio).like(like))).limit(12))).all()
    stories = (await db.scalars(select(Story).where(or_(func.lower(Story.title).like(like), func.lower(Story.tagline).like(like))).limit(12))).all()
    clubs = (await db.scalars(select(Club).where(or_(func.lower(Club.name).like(like), func.lower(Club.description).like(like))).limit(12))).all()
    books = (await db.scalars(select(UserBook).where(UserBook.is_public.is_(True), or_(func.lower(UserBook.title).like(like), func.lower(UserBook.author_name).like(like))).limit(12))).all()
    return {"users": [user_public(u, **await user_counts(db, u.id)) for u in users], "stories": [story_out(s, with_chapters=False) for s in stories],
            "clubs": [club_out(c, [], None) for c in clubs], "communityBooks": [user_book_meta(b) for b in books]}


@router.get("/people/{user_ids}")
async def people(user_ids: str, db: AsyncSession = Depends(get_db)):
    """Batch profile lookup for rendering avatars in feeds, threads and rooms."""
    ids = [x for x in user_ids.split(",") if x][:100]
    rows = (await db.scalars(select(User).where(User.id.in_(ids)))).all()
    return {u.id: user_public(u) for u in rows}


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    return {"members": await db.scalar(select(func.count()).select_from(User)) or 0,
            "reviews": await db.scalar(select(func.count()).select_from(Activity).where(Activity.verb == "reviewed")) or 0,
            "books": 75000 + (await db.scalar(select(func.count()).select_from(UserBook)) or 0)}
