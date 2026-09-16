import asyncio
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import SessionLocal, get_db
from ..models import (Club, ClubMember, ClubThread, Debate, DebateVote, Room, RoomMessage, RoomParticipant, ThreadReply, User)
from ..security import current_user, optional_user, ws_user
from ..serializers import club_out, debate_out, message_out, room_out, thread_out, reply_out
from ..util import notify, record_activity

router = APIRouter(prefix="/api", tags=["community"])


# =====================================================================
# Clubs
# =====================================================================
async def _member_ids(db: AsyncSession, club_id: str) -> list[str]:
    return list((await db.scalars(select(ClubMember.user_id).where(ClubMember.club_id == club_id).order_by(ClubMember.created_at))).all())


async def _activity(db: AsyncSession, club_id: str) -> str:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    n = await db.scalar(select(func.count()).select_from(ClubThread).where(ClubThread.club_id == club_id, ClubThread.created_at >= since)) or 0
    return "buzzing" if n >= 3 else "active" if n >= 1 else "quiet"


@router.get("/clubs")
async def list_clubs(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Club).order_by(Club.member_count.desc(), Club.created_at.desc()))).all()
    return [club_out(c, (await _member_ids(db, c.id))[:6], None, await _activity(db, c.id)) for c in rows]


@router.get("/clubs/{club_id}")
async def get_club(club_id: str, db: AsyncSession = Depends(get_db)):
    c = await db.get(Club, club_id)
    if not c:
        raise HTTPException(404, "Club not found")
    threads = (await db.scalars(select(ClubThread).where(ClubThread.club_id == club_id).order_by(ClubThread.pinned.desc(), ClubThread.created_at.desc()))).all()
    return club_out(c, await _member_ids(db, club_id), threads, await _activity(db, club_id))


class ClubIn(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=1000)
    coverColor: str = Field(default="#1B6B4A", pattern=r"^#[0-9A-Fa-f]{6}$")
    coverEmoji: str = Field(default="📚", max_length=8)
    currentBookId: int
    isPrivate: bool = False
    maxMembers: int = Field(default=50, ge=2, le=1000)
    frequency: str = Field(default="Weekly", max_length=50)
    schedule: list[dict] = []


@router.post("/clubs")
async def create_club(body: ClubIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    c = Club(created_by=user.id, name=body.name.strip(), description=body.description.strip(), cover_color=body.coverColor, cover_emoji=body.coverEmoji,
             current_book_id=body.currentBookId, is_private=body.isPrivate, max_members=body.maxMembers, frequency=body.frequency, schedule=body.schedule[:12])
    db.add(c)
    await db.flush()
    db.add(ClubMember(club_id=c.id, user_id=user.id, role="owner"))
    record_activity(db, user.id, "club_created", book_id=body.currentBookId, ref_type="club", ref_id=c.id, text=c.name)
    await db.commit()
    return club_out(c, [user.id], [], "quiet")


@router.post("/clubs/{club_id}/join")
async def join_club(club_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    c = await db.get(Club, club_id)
    if not c:
        raise HTTPException(404, "Club not found")
    if not await db.get(ClubMember, (club_id, user.id)):
        if c.member_count >= c.max_members:
            raise HTTPException(409, "This club is full")
        db.add(ClubMember(club_id=club_id, user_id=user.id))
        c.member_count += 1
        await notify(db, c.created_by, "club", f"{user.display_name} joined {c.name}", "", f"/community/clubs/{c.id}", user.id)
        await db.commit()
    return {"joined": True, "memberCount": c.member_count}


@router.delete("/clubs/{club_id}/join")
async def leave_club(club_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    c = await db.get(Club, club_id)
    m = await db.get(ClubMember, (club_id, user.id))
    if c and m:
        await db.delete(m)
        c.member_count = max(0, c.member_count - 1)
        await db.commit()
    return {"joined": False, "memberCount": c.member_count if c else 0}


class ThreadIn(BaseModel):
    chapter: int = Field(default=1, ge=0, le=500)
    title: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=1, max_length=8000)
    spoilers: bool = False


@router.post("/clubs/{club_id}/threads")
async def post_thread(club_id: str, body: ThreadIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if not await db.get(ClubMember, (club_id, user.id)):
        raise HTTPException(403, "Join the club to post")
    t = ClubThread(club_id=club_id, user_id=user.id, chapter=body.chapter, title=body.title.strip(), body=body.body.strip(), spoilers=body.spoilers)
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return thread_out(t)


class ReplyIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


@router.post("/threads/{thread_id}/replies")
async def post_reply(thread_id: str, body: ReplyIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    t = await db.get(ClubThread, thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    if not await db.get(ClubMember, (t.club_id, user.id)):
        raise HTTPException(403, "Join the club to reply")
    r = ThreadReply(thread_id=thread_id, user_id=user.id, body=body.body.strip())
    db.add(r)
    await notify(db, t.user_id, "comment", f"{user.display_name} replied to your thread", t.title, f"/community/clubs/{t.club_id}", user.id)
    await db.commit()
    return reply_out(r)


# =====================================================================
# Rooms (REST + WebSocket fan-out)
# =====================================================================
class Hub:
    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = {}

    async def broadcast(self, room_id: str, payload: dict) -> None:
        dead = []
        for ws in self.rooms.get(room_id, set()):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.rooms[room_id].discard(ws)


hub = Hub()


async def _participants(db: AsyncSession, room_id: str) -> list[str]:
    return list((await db.scalars(select(RoomParticipant.user_id).where(RoomParticipant.room_id == room_id))).all())


@router.get("/rooms")
async def list_rooms(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Room).order_by(Room.is_live.desc(), Room.scheduled_at.asc().nulls_last(), Room.created_at.desc()).limit(50))).all()
    return [room_out(r, (await _participants(db, r.id))[:8]) for r in rows]


@router.get("/rooms/{room_id}")
async def get_room(room_id: str, db: AsyncSession = Depends(get_db)):
    r = await db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Room not found")
    msgs = (await db.scalars(select(RoomMessage).where(RoomMessage.room_id == room_id).order_by(RoomMessage.created_at.desc()).limit(200))).all()
    return room_out(r, await _participants(db, room_id), list(reversed(msgs)))


class RoomIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=1000)
    bookId: int
    scheduledAt: datetime | None = None


@router.post("/rooms")
async def create_room(body: RoomIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    live = body.scheduledAt is None or body.scheduledAt <= datetime.now(timezone.utc)
    r = Room(created_by=user.id, book_id=body.bookId, title=body.title.strip(), description=body.description.strip(), is_live=live, scheduled_at=body.scheduledAt)
    db.add(r)
    await db.flush()
    db.add(RoomParticipant(room_id=r.id, user_id=user.id))
    r.participant_count = 1
    await db.commit()
    return room_out(r, [user.id], [])


@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Room not found")
    if not await db.get(RoomParticipant, (room_id, user.id)):
        db.add(RoomParticipant(room_id=room_id, user_id=user.id))
        r.participant_count += 1
        await db.commit()
    return {"joined": True, "participants": r.participant_count}


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    type: str = Field(default="text", pattern="^(text|quote|reaction)$")


@router.post("/rooms/{room_id}/messages")
async def post_message(room_id: str, body: MessageIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Room, room_id)
    if not r or not r.is_live:
        raise HTTPException(409, "This room is not live")
    m = RoomMessage(room_id=room_id, user_id=user.id, text=body.text.strip(), type=body.type)
    db.add(m)
    await db.commit()
    payload = message_out(m)
    await hub.broadcast(room_id, {"kind": "message", "message": payload})
    return payload


class PinIn(BaseModel):
    quote: str | None = Field(default=None, max_length=1000)


@router.post("/rooms/{room_id}/pin")
async def pin_quote(room_id: str, body: PinIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Room, room_id)
    if not r or (r.created_by != user.id and not user.is_admin):
        raise HTTPException(403, "Only the host can pin")
    r.pinned_quote = body.quote
    await db.commit()
    await hub.broadcast(room_id, {"kind": "pin", "quote": body.quote})
    return {"ok": True}


@router.post("/rooms/{room_id}/end")
async def end_room(room_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    r = await db.get(Room, room_id)
    if not r or (r.created_by != user.id and not user.is_admin):
        raise HTTPException(403, "Only the host can end the room")
    r.is_live, r.ended_at = False, datetime.now(timezone.utc)
    await db.commit()
    await hub.broadcast(room_id, {"kind": "ended"})
    return {"ok": True}


@router.websocket("/ws/rooms/{room_id}")
async def room_socket(ws: WebSocket, room_id: str):
    await ws.accept()
    async with SessionLocal() as db:
        user = await ws_user(ws, db)
        room = await db.get(Room, room_id)
    if not room:
        await ws.close(code=4004)
        return
    hub.rooms.setdefault(room_id, set()).add(ws)
    await hub.broadcast(room_id, {"kind": "presence", "online": len(hub.rooms[room_id])})
    try:
        while True:
            raw = await ws.receive_text()
            if not user:
                continue
            try:
                data = json.loads(raw)
                body = MessageIn(**data)
            except Exception:
                continue
            async with SessionLocal() as db:
                r = await db.get(Room, room_id)
                if not r or not r.is_live:
                    continue
                m = RoomMessage(room_id=room_id, user_id=user.id, text=body.text.strip(), type=body.type)
                db.add(m)
                await db.commit()
                payload = message_out(m)
            await hub.broadcast(room_id, {"kind": "message", "message": payload})
    except WebSocketDisconnect:
        pass
    finally:
        hub.rooms.get(room_id, set()).discard(ws)
        await hub.broadcast(room_id, {"kind": "presence", "online": len(hub.rooms.get(room_id, set()))})


# =====================================================================
# Debates
# =====================================================================
@router.get("/debates")
async def list_debates(db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Debate).order_by(Debate.ends_at.asc()))).all()
    out = []
    for d in rows:
        args = (await db.scalars(select(DebateVote).where(DebateVote.debate_id == d.id, DebateVote.argument.isnot(None)).order_by(DebateVote.like_count.desc()).limit(3))).all()
        out.append(debate_out(d, args))
    return out


@router.get("/debates/{debate_id}")
async def get_debate(debate_id: str, db: AsyncSession = Depends(get_db)):
    d = await db.get(Debate, debate_id)
    if not d:
        raise HTTPException(404, "Debate not found")
    args = (await db.scalars(select(DebateVote).where(DebateVote.debate_id == d.id, DebateVote.argument.isnot(None)).order_by(DebateVote.like_count.desc(), DebateVote.created_at.desc()))).all()
    return debate_out(d, args)


class DebateIn(BaseModel):
    bookId: int
    question: str = Field(min_length=5, max_length=500)
    sideA: str = Field(min_length=1, max_length=200)
    sideB: str = Field(min_length=1, max_length=200)
    days: int = Field(default=7, ge=1, le=60)


@router.post("/debates")
async def create_debate(body: DebateIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    d = Debate(created_by=user.id, book_id=body.bookId, question=body.question.strip(), side_a=body.sideA.strip(), side_b=body.sideB.strip(), ends_at=datetime.now(timezone.utc) + timedelta(days=body.days))
    db.add(d)
    await db.commit()
    return debate_out(d, [])


class VoteIn(BaseModel):
    side: str = Field(pattern="^[ab]$")
    argument: str | None = Field(default=None, max_length=280)


@router.post("/debates/{debate_id}/vote")
async def vote(debate_id: str, body: VoteIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    d = await db.get(Debate, debate_id)
    if not d:
        raise HTTPException(404, "Debate not found")
    if d.ends_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(409, "This debate has ended")
    v = await db.scalar(select(DebateVote).where(DebateVote.debate_id == debate_id, DebateVote.user_id == user.id))
    if v:
        if v.side != body.side:
            if v.side == "a":
                d.count_a, d.count_b = max(0, d.count_a - 1), d.count_b + 1
            else:
                d.count_b, d.count_a = max(0, d.count_b - 1), d.count_a + 1
            v.side = body.side
        if body.argument is not None:
            v.argument = body.argument.strip() or None
    else:
        v = DebateVote(debate_id=debate_id, user_id=user.id, side=body.side, argument=(body.argument or "").strip() or None)
        db.add(v)
        if body.side == "a":
            d.count_a += 1
        else:
            d.count_b += 1
    await db.commit()
    return {"side": v.side, "countA": d.count_a, "countB": d.count_b}


__all__ = ["optional_user", "asyncio"]
