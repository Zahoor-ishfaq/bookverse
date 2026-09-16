"""Admin panel API and the public report endpoint. Everything under /api/admin
requires is_admin; promote yourself with ADMIN_EMAILS=you@example.com."""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import (Activity, Club, ClubThread, DiaryEntry, ReadingDay, ReadingProgress, RefreshToken, Report, Review, Room, RoomMessage, Story,
                      ThreadReply, User, UserBook)
from ..security import admin_user, current_user
from ..serializers import iso, user_private, user_public
from ..util import notify, user_counts

router = APIRouter(prefix="/api", tags=["admin"])

CONTENT = {
    "review": (Review, "user_id", lambda r: f"{r.title} — {r.body[:200]}", lambda r: f"/books/{r.book_id}"),
    "story": (Story, "author_id", lambda s: f"{s.title} — {s.tagline}", lambda s: f"/stories/{s.id}"),
    "thread": (ClubThread, "user_id", lambda t: f"{t.title} — {t.body[:200]}", lambda t: f"/community/clubs/{t.club_id}"),
    "reply": (ThreadReply, "user_id", lambda r: r.body[:240], lambda r: "/community"),
    "message": (RoomMessage, "user_id", lambda m: m.text[:240], lambda m: f"/community/rooms/{m.room_id}"),
    "book": (UserBook, "owner_id", lambda b: f"{b.title} — {b.description[:200]}", lambda b: f"/books/{b.id}"),
    "diary": (DiaryEntry, "user_id", lambda d: f"{d.title} — {d.body[:200]}", lambda d: "/diary"),
    "club": (Club, "created_by", lambda c: f"{c.name} — {c.description[:200]}", lambda c: f"/community/clubs/{c.id}"),
    "room": (Room, "created_by", lambda r: f"{r.title} — {r.description[:200]}", lambda r: f"/community/rooms/{r.id}"),
    "user": (User, "id", lambda u: f"{u.display_name} (u/{u.username}) — {u.bio[:200]}", lambda u: f"/u/{u.username}"),
}


async def _load(db: AsyncSession, ctype: str, cid: str):
    if ctype not in CONTENT:
        raise HTTPException(400, "Unknown content type")
    model = CONTENT[ctype][0]
    key = int(cid) if ctype == "book" else cid
    return await db.get(model, key)


# ---------------- Public: report content ----------------
class ReportIn(BaseModel):
    contentType: str
    contentId: str
    reason: str = Field(pattern="^(spam|harassment|hate|sexual|violence|copyright|misinformation|other)$")
    details: str | None = Field(default=None, max_length=1000)


@router.post("/reports")
async def report(body: ReportIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    obj = await _load(db, body.contentType, body.contentId)
    if not obj:
        raise HTTPException(404, "That content no longer exists")
    dup = await db.scalar(select(Report.id).where(Report.reporter_id == user.id, Report.content_type == body.contentType, Report.content_id == body.contentId, Report.status == "pending"))
    if dup:
        return {"ok": True, "duplicate": True}
    db.add(Report(reporter_id=user.id, content_type=body.contentType, content_id=body.contentId, reason=body.reason, details=body.details, snapshot=CONTENT[body.contentType][2](obj)))
    await db.commit()
    return {"ok": True}


# ---------------- Dashboard ----------------
@router.get("/admin/stats")
async def stats(_: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = now - timedelta(days=7)

    async def count(model, col=None, since=None):
        stmt = select(func.count()).select_from(model)
        if col is not None and since is not None:
            stmt = stmt.where(col >= since)
        return await db.scalar(stmt) or 0

    series = []
    for i in range(13, -1, -1):
        d0 = today - timedelta(days=i); d1 = d0 + timedelta(days=1)
        series.append({
            "day": d0.date().isoformat(),
            "signups": await db.scalar(select(func.count()).select_from(User).where(User.created_at >= d0, User.created_at < d1)) or 0,
            "readers": await db.scalar(select(func.count()).select_from(ReadingDay).where(ReadingDay.day == d0.date())) or 0,
            "minutes": await db.scalar(select(func.coalesce(func.sum(ReadingDay.minutes), 0)).where(ReadingDay.day == d0.date())) or 0,
            "activity": await db.scalar(select(func.count()).select_from(Activity).where(Activity.created_at >= d0, Activity.created_at < d1)) or 0,
        })
    top_books = (await db.execute(select(ReadingProgress.book_id, func.count().label("n"), func.sum(ReadingProgress.minutes).label("m")).group_by(ReadingProgress.book_id).order_by(func.count().desc()).limit(8))).all()
    top_clubs = (await db.scalars(select(Club).order_by(Club.member_count.desc()).limit(5))).all()
    return {
        "today": {"newUsers": await count(User, User.created_at, today), "activeReaders": await db.scalar(select(func.count()).select_from(ReadingDay).where(ReadingDay.day == date.today())) or 0,
                  "reviews": await count(Review, Review.created_at, today), "stories": await count(Story, Story.published_at, today), "booksPublished": await count(UserBook, UserBook.created_at, today),
                  "pendingReports": await db.scalar(select(func.count()).select_from(Report).where(Report.status == "pending")) or 0},
        "week": {"newUsers": await count(User, User.created_at, week), "reviews": await count(Review, Review.created_at, week), "stories": await count(Story, Story.published_at, week),
                 "clubs": await count(Club, Club.created_at, week), "messages": await count(RoomMessage, RoomMessage.created_at, week)},
        "totals": {"users": await count(User), "activeUsers": await db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0, "reviews": await count(Review), "stories": await count(Story),
                   "books": await count(UserBook), "clubs": await count(Club), "rooms": await count(Room), "diary": await count(DiaryEntry)},
        "series": series,
        "topBooks": [{"bookId": b, "readers": n, "minutes": m or 0} for b, n, m in top_books],
        "topClubs": [{"id": c.id, "name": c.name, "members": c.member_count, "coverColor": c.cover_color, "coverEmoji": c.cover_emoji} for c in top_clubs],
    }


# ---------------- Users ----------------
@router.get("/admin/users")
async def list_users(q: str = "", page: int = 1, status: str = "all", _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    stmt = select(User)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.username).like(like), func.lower(User.display_name).like(like), func.lower(User.email).like(like)))
    if status == "banned":
        stmt = stmt.where(User.is_active.is_(False))
    elif status == "admins":
        stmt = stmt.where(User.is_admin.is_(True))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.scalars(stmt.order_by(User.created_at.desc()).offset((page - 1) * 25).limit(25))).all()
    out = []
    for u in rows:
        d = user_private(u, **await user_counts(db, u.id))
        d["createdAt"] = iso(u.created_at)
        d["isActive"] = u.is_active
        out.append(d)
    return {"users": out, "total": total, "page": page, "pages": max(1, -(-total // 25))}


class UserPatch(BaseModel):
    isActive: bool | None = None
    isAdmin: bool | None = None
    isVerifiedBadge: bool | None = None


@router.patch("/admin/users/{uid}")
async def patch_user(uid: str, body: UserPatch, admin: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    u = await db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if uid == admin.id and body.isAdmin is False:
        raise HTTPException(400, "You cannot remove your own admin role")
    if body.isActive is not None:
        u.is_active = body.isActive
        if not body.isActive:  # kill sessions
            for rt in (await db.scalars(select(RefreshToken).where(RefreshToken.user_id == uid))).all():
                rt.revoked = True
    if body.isAdmin is not None:
        u.is_admin = body.isAdmin
    if body.isVerifiedBadge is not None:
        u.is_verified_badge = body.isVerifiedBadge
    await db.commit()
    d = user_private(u, **await user_counts(db, u.id)); d["isActive"] = u.is_active
    return d


# ---------------- Content ----------------
@router.get("/admin/content")
async def list_content(type: str = "story", page: int = 1, _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    if type not in CONTENT or type == "user":
        raise HTTPException(400, "Unknown content type")
    model, owner_col, summary, url = CONTENT[type]
    order = getattr(model, "published_at", None) or getattr(model, "created_at")
    rows = (await db.scalars(select(model).order_by(order.desc()).offset((page - 1) * 30).limit(30))).all()
    total = await db.scalar(select(func.count()).select_from(model)) or 0
    owners = {u.id: user_public(u) for u in (await db.scalars(select(User).where(User.id.in_({getattr(r, owner_col) for r in rows})))).all()}
    items = []
    for r in rows:
        items.append({"id": str(r.id), "type": type, "summary": summary(r), "url": url(r), "owner": owners.get(getattr(r, owner_col)), "createdAt": iso(getattr(r, "created_at", None)),
                      "featured": getattr(r, "is_featured", None), "live": getattr(r, "is_live", None), "pinned": getattr(r, "pinned", None)})
    return {"items": items, "total": total, "page": page, "pages": max(1, -(-total // 30))}


class ContentAction(BaseModel):
    action: str = Field(pattern="^(delete|feature|unfeature|end|pin|unpin)$")


@router.post("/admin/content/{ctype}/{cid}")
async def act_on_content(ctype: str, cid: str, body: ContentAction, admin: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    obj = await _load(db, ctype, cid)
    if not obj:
        raise HTTPException(404, "Content not found")
    owner_col = CONTENT[ctype][1]
    owner_id = getattr(obj, owner_col)
    if body.action == "delete":
        if ctype == "user":
            raise HTTPException(400, "Deactivate users from the Users tab")
        await db.delete(obj)
        await notify(db, owner_id, "club", "Content removed by moderators", "One of your posts was removed for breaking the community guidelines.", "/legal/terms")
    elif body.action in ("feature", "unfeature") and hasattr(obj, "is_featured"):
        obj.is_featured = body.action == "feature"
        if obj.is_featured:
            await notify(db, owner_id, "like", "Your story was featured", getattr(obj, "title", ""), f"/stories/{obj.id}")
    elif body.action == "end" and hasattr(obj, "is_live"):
        obj.is_live, obj.ended_at = False, datetime.now(timezone.utc)
    elif body.action in ("pin", "unpin") and hasattr(obj, "pinned"):
        obj.pinned = body.action == "pin"
    else:
        raise HTTPException(400, "Action not available for this content")
    await db.commit()
    return {"ok": True}


# ---------------- Reports ----------------
@router.get("/admin/reports")
async def list_reports(status: str = "pending", _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Report)
    if status != "all":
        stmt = stmt.where(Report.status == status)
    rows = (await db.scalars(stmt.order_by(Report.created_at.desc()).limit(200))).all()
    ids = {r.reporter_id for r in rows} | {r.resolved_by for r in rows}
    people = {u.id: user_public(u) for u in (await db.scalars(select(User).where(User.id.in_([i for i in ids if i])))).all()}
    out = []
    for r in rows:
        obj = await _load(db, r.content_type, r.content_id)
        out.append({"id": r.id, "contentType": r.content_type, "contentId": r.content_id, "reason": r.reason, "details": r.details, "status": r.status, "snapshot": r.snapshot,
                    "createdAt": iso(r.created_at), "resolvedAt": iso(r.resolved_at), "reporter": people.get(r.reporter_id), "resolvedBy": people.get(r.resolved_by),
                    "exists": obj is not None, "url": CONTENT[r.content_type][3](obj) if obj else None,
                    "owner": people.get(getattr(obj, CONTENT[r.content_type][1], None)) if obj else None})
    return out


class ReportAction(BaseModel):
    action: str = Field(pattern="^(remove|dismiss)$")


@router.post("/admin/reports/{rid}")
async def resolve_report(rid: str, body: ReportAction, admin: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Report, rid)
    if not r:
        raise HTTPException(404, "Report not found")
    if body.action == "remove":
        obj = await _load(db, r.content_type, r.content_id)
        if obj is not None:
            if r.content_type == "user":
                obj.is_active = False
            else:
                owner_id = getattr(obj, CONTENT[r.content_type][1])
                await db.delete(obj)
                await notify(db, owner_id, "club", "Content removed by moderators", "One of your posts was reported and removed for breaking the community guidelines.", "/legal/terms")
        r.status = "resolved"
    else:
        r.status = "dismissed"
    r.resolved_by, r.resolved_at = admin.id, datetime.now(timezone.utc)
    # close sibling reports about the same content
    for sib in (await db.scalars(select(Report).where(Report.content_type == r.content_type, Report.content_id == r.content_id, Report.status == "pending"))).all():
        sib.status, sib.resolved_by, sib.resolved_at = r.status, admin.id, r.resolved_at
    await db.commit()
    return {"ok": True, "status": r.status}
