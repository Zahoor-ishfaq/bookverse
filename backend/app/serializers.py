"""Plain-dict serializers shaped exactly like the frontend's TypeScript types."""
from __future__ import annotations

from datetime import datetime

from .config import settings
from .models import (Challenge, Club, ClubThread, Debate, DebateVote, DiaryEntry, Highlight, Notification, Review, Room,
                     RoomMessage, Story, ThreadReply, User, UserBook)


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def abs_url(path: str | None) -> str | None:
    if not path or path.startswith("http") or path.startswith("data:"):
        return path
    return f"{settings.public_api_url}{path}"


def user_public(u: User, *, followers: int = 0, following: int = 0, books_read: int = 0, reviews: int = 0, streak: int = 0, published: int = 0) -> dict:
    return {
        "id": u.id, "username": u.username, "displayName": u.display_name,
        "avatar": (u.display_name or "?")[0].upper(), "avatarColor": u.avatar_color, "avatarUrl": abs_url(u.avatar_url),
        "headline": u.headline, "bio": u.bio, "location": u.location, "links": u.links or {},
        "followers": followers, "following": following, "booksRead": books_read, "reviews": reviews, "streak": streak, "published": published,
        "favoriteGenres": u.favorite_genres or [], "favoriteMoods": u.favorite_moods or [], "readingGoal": u.reading_goal,
        "joinedYear": u.created_at.year if u.created_at else datetime.now().year,
        "isAuthor": published > 0, "isVerified": u.is_verified_badge,
    }


def user_private(u: User, **counts) -> dict:
    d = user_public(u, **counts)
    d.update({"email": u.email, "emailVerified": u.email_verified, "marketingOptIn": u.marketing_opt_in,
              "acceptedTermsAt": iso(u.accepted_terms_at), "onboardingCompleted": u.onboarding_completed, "isAdmin": u.is_admin})
    return d


def review_out(r: Review) -> dict:
    return {"id": r.id, "bookId": r.book_id, "userId": r.user_id, "rating": r.rating, "title": r.title, "body": r.body,
            "spoilers": r.spoilers, "sentiment": r.sentiment, "likes": r.like_count, "createdAt": iso(r.created_at)}


def highlight_out(h: Highlight) -> dict:
    return {"id": h.id, "bookId": h.book_id, "userId": h.user_id, "chapter": h.chapter, "text": h.text, "color": h.color, "note": h.note,
            "isPublic": h.is_public, "likes": h.like_count, "createdAt": iso(h.created_at)}


def diary_out(d: DiaryEntry) -> dict:
    return {"id": d.id, "userId": d.user_id, "bookId": d.book_id, "title": d.title, "body": d.body, "mood": d.mood, "location": d.location,
            "isPublic": d.is_public, "likes": d.like_count, "createdAt": iso(d.created_at)}


def reply_out(r: ThreadReply) -> dict:
    return {"id": r.id, "userId": r.user_id, "body": r.body, "likes": r.like_count, "createdAt": iso(r.created_at)}


def thread_out(t: ClubThread) -> dict:
    return {"id": t.id, "userId": t.user_id, "chapter": t.chapter, "title": t.title, "body": t.body, "spoilers": t.spoilers,
            "pinned": t.pinned, "likes": t.like_count, "createdAt": iso(t.created_at), "replies": [reply_out(r) for r in t.replies]}


def club_out(c: Club, member_ids: list[str], threads: list[ClubThread] | None = None, activity: str = "quiet") -> dict:
    return {"id": c.id, "name": c.name, "description": c.description, "coverColor": c.cover_color, "coverEmoji": c.cover_emoji,
            "currentBookId": c.current_book_id, "memberCount": c.member_count, "maxMembers": c.max_members, "activity": activity,
            "frequency": c.frequency, "isPrivate": c.is_private, "createdBy": c.created_by, "schedule": c.schedule or [],
            "memberIds": member_ids, "threads": [thread_out(t) for t in (threads or [])]}


def message_out(m: RoomMessage) -> dict:
    return {"id": m.id, "userId": m.user_id, "text": m.text, "type": m.type, "createdAt": iso(m.created_at)}


def room_out(r: Room, participant_ids: list[str], messages: list[RoomMessage] | None = None) -> dict:
    return {"id": r.id, "title": r.title, "description": r.description, "bookId": r.book_id, "hostId": r.created_by, "isLive": r.is_live,
            "participants": r.participant_count, "scheduledAt": iso(r.scheduled_at), "endedAt": iso(r.ended_at), "pinnedQuote": r.pinned_quote,
            "participantIds": participant_ids, "messages": [message_out(m) for m in (messages or [])]}


def argument_out(v: DebateVote) -> dict:
    return {"id": v.id, "userId": v.user_id, "side": v.side, "text": v.argument or "", "likes": v.like_count}


def debate_out(d: Debate, arguments: list[DebateVote] | None = None) -> dict:
    return {"id": d.id, "bookId": d.book_id, "question": d.question, "sideA": d.side_a, "sideB": d.side_b, "countA": d.count_a,
            "countB": d.count_b, "endsAt": iso(d.ends_at), "createdBy": d.created_by,
            "arguments": [argument_out(v) for v in (arguments or []) if v.argument]}


def story_out(s: Story, with_chapters: bool = True) -> dict:
    return {"id": s.id, "authorId": s.author_id, "title": s.title, "tagline": s.tagline, "coverColor": s.cover_color, "coverPattern": s.cover_pattern,
            "genres": s.genres or [], "inspiredByBookId": s.inspired_by_book_id, "isSerial": s.is_serial, "isComplete": s.is_complete,
            "wordCount": s.word_count, "views": s.view_count, "likes": s.like_count, "bookmarks": s.bookmark_count, "comments": s.comment_count,
            "featured": s.is_featured, "publishedAt": iso(s.published_at),
            "chapters": [{"number": c.number, "title": c.title, "content": c.content if with_chapters else [], "publishedAt": iso(c.created_at), "comments": c.comment_count} for c in s.chapters]}


def user_book_meta(b: UserBook) -> dict:
    """Shape matches the Gutendex-derived Book type on the frontend."""
    words = sum(len(" ".join(c.paragraphs).split()) for c in b.chapters)
    return {"id": b.id, "title": b.title, "authors": [{"name": b.author_name, "birth_year": None, "death_year": None}],
            "subjects": [b.genre] + ([b.subtitle] if b.subtitle else []), "bookshelves": ["Published on BookVerse"], "languages": [b.language],
            "formats": {}, "download_count": b.reader_count, "copyright": True, "summaries": [b.description],
            "coverUrl": abs_url(b.cover_url) or "", "authorName": b.author_name, "moods": b.moods or ["calm"], "genre": b.genre, "era": "unknown",
            "rating": 0, "ratingCount": 0, "readers": max(1, b.reader_count),
            "selfPublished": {"ownerId": b.owner_id, "subtitle": b.subtitle, "publishedAt": iso(b.created_at), "isPublic": b.is_public, "words": words,
                              "chapters": len(b.chapters)}}


def user_book_full(b: UserBook) -> dict:
    d = user_book_meta(b)
    d["chapters"] = [{"title": c.title, "paragraphs": c.paragraphs} for c in b.chapters]
    return d


def challenge_out(c: Challenge, leaderboard: list[dict]) -> dict:
    return {"id": c.id, "title": c.title, "description": c.description, "type": c.type, "target": c.target, "startDate": iso(datetime.combine(c.start_date, datetime.min.time())),
            "endDate": iso(datetime.combine(c.end_date, datetime.min.time())), "participants": c.participant_count, "prompt": c.prompt, "leaderboard": leaderboard}


def notification_out(n: Notification) -> dict:
    return {"id": n.id, "type": n.type, "title": n.title, "body": n.body, "actionUrl": n.action_url, "isRead": n.is_read,
            "createdAt": iso(n.created_at), "fromUserId": n.from_user_id}
