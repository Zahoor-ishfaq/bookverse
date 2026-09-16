"""All persistence models. IDs are short random strings (URL-safe) except
books, which keep Project Gutenberg's integer ids; member-published books get
integer ids from 10_000_000 upward so the same routes serve both."""
from __future__ import annotations

import secrets
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

USER_BOOK_BASE = 10_000_000


def new_id(prefix: str = "") -> str:
    return f"{prefix}{secrets.token_urlsafe(9)}"


def now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# ---------------- Users ----------------
class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("u_"))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    avatar_color: Mapped[str] = mapped_column(String(16), default="#1B6B4A")
    headline: Mapped[str | None] = mapped_column(String(120))
    bio: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(100), default="")
    links: Mapped[dict] = mapped_column(JSON, default=dict)
    favorite_genres: Mapped[list] = mapped_column(JSON, default=list)
    favorite_moods: Mapped[list] = mapped_column(JSON, default=list)
    reading_goal: Mapped[int] = mapped_column(Integer, default=24)
    marketing_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    accepted_terms_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified_badge: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Follow(Base, TimestampMixin):
    __tablename__ = "follows"
    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class AuthToken(Base, TimestampMixin):
    """Single-use tokens for email verification and password reset."""
    __tablename__ = "auth_tokens"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    purpose: Mapped[str] = mapped_column(String(20))  # verify | reset
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RefreshToken(Base, TimestampMixin):
    __tablename__ = "refresh_tokens"
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


# ---------------- Personal library ----------------
class Shelf(Base, TimestampMixin):
    __tablename__ = "shelves"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int] = mapped_column(Integer, index=True)
    shelf_type: Mapped[str] = mapped_column(String(30))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dnf_reason: Mapped[str | None] = mapped_column(Text)


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    book_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chapter: Mapped[int] = mapped_column(Integer, default=0)
    paragraph: Mapped[int] = mapped_column(Integer, default=0)
    percentage: Mapped[float] = mapped_column(Float, default=0)
    minutes: Mapped[int] = mapped_column(Integer, default=0)
    last_read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ReadingDay(Base):
    __tablename__ = "reading_days"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    minutes: Mapped[int] = mapped_column(Integer, default=0)


class Highlight(Base, TimestampMixin):
    __tablename__ = "highlights"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int] = mapped_column(Integer, index=True)
    chapter: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(10), default="yellow")
    note: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)


class Bookmark(Base, TimestampMixin):
    __tablename__ = "bookmarks"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int] = mapped_column(Integer, index=True)
    chapter: Mapped[int] = mapped_column(Integer, default=0)
    paragraph: Mapped[int] = mapped_column(Integer, default=0)
    snippet: Mapped[str] = mapped_column(String(200), default="")


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int] = mapped_column(Integer, index=True)
    rating: Mapped[float] = mapped_column(Float)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    spoilers: Mapped[bool] = mapped_column(Boolean, default=False)
    sentiment: Mapped[str] = mapped_column(String(10), default="mixed")
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class ReviewLike(Base):
    __tablename__ = "review_likes"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), primary_key=True)


class DiaryEntry(Base, TimestampMixin):
    __tablename__ = "diary_entries"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    book_id: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    mood: Mapped[str] = mapped_column(String(20), default="calm")
    location: Mapped[str | None] = mapped_column(String(100))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)


class DiaryLike(Base):
    __tablename__ = "diary_likes"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("diary_entries.id", ondelete="CASCADE"), primary_key=True)


# ---------------- Clubs ----------------
class Club(Base, TimestampMixin):
    __tablename__ = "clubs"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("c_"))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    cover_color: Mapped[str] = mapped_column(String(16), default="#1B6B4A")
    cover_emoji: Mapped[str] = mapped_column(String(8), default="📚")
    current_book_id: Mapped[int] = mapped_column(Integer)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    max_members: Mapped[int] = mapped_column(Integer, default=50)
    frequency: Mapped[str] = mapped_column(String(50), default="Weekly")
    schedule: Mapped[list] = mapped_column(JSON, default=list)
    member_count: Mapped[int] = mapped_column(Integer, default=1)


class ClubMember(Base, TimestampMixin):
    __tablename__ = "club_members"
    club_id: Mapped[str] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="member")


class ClubThread(Base, TimestampMixin):
    __tablename__ = "club_threads"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("t_"))
    club_id: Mapped[str] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    chapter: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    spoilers: Mapped[bool] = mapped_column(Boolean, default=False)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    replies: Mapped[list[ThreadReply]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="ThreadReply.created_at")


class ThreadReply(Base, TimestampMixin):
    __tablename__ = "thread_replies"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("r_"))
    thread_id: Mapped[str] = mapped_column(ForeignKey("club_threads.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    like_count: Mapped[int] = mapped_column(Integer, default=0)


# ---------------- Rooms ----------------
class Room(Base, TimestampMixin):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("r_"))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    book_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    is_live: Mapped[bool] = mapped_column(Boolean, default=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pinned_quote: Mapped[str | None] = mapped_column(Text)
    participant_count: Mapped[int] = mapped_column(Integer, default=0)


class RoomParticipant(Base, TimestampMixin):
    __tablename__ = "room_participants"
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class RoomMessage(Base, TimestampMixin):
    __tablename__ = "room_messages"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("m_"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(10), default="text")


# ---------------- Debates ----------------
class Debate(Base, TimestampMixin):
    __tablename__ = "debates"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("d_"))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    book_id: Mapped[int] = mapped_column(Integer)
    question: Mapped[str] = mapped_column(String(500))
    side_a: Mapped[str] = mapped_column(String(200))
    side_b: Mapped[str] = mapped_column(String(200))
    count_a: Mapped[int] = mapped_column(Integer, default=0)
    count_b: Mapped[int] = mapped_column(Integer, default=0)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DebateVote(Base, TimestampMixin):
    __tablename__ = "debate_votes"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("a_"))
    __table_args__ = (UniqueConstraint("user_id", "debate_id"),)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    debate_id: Mapped[str] = mapped_column(ForeignKey("debates.id", ondelete="CASCADE"), index=True)
    side: Mapped[str] = mapped_column(String(1))
    argument: Mapped[str | None] = mapped_column(String(280))
    like_count: Mapped[int] = mapped_column(Integer, default=0)


# ---------------- Stories ----------------
class Story(Base, TimestampMixin):
    __tablename__ = "stories"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("s_"))
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    tagline: Mapped[str] = mapped_column(String(300), default="")
    cover_color: Mapped[str] = mapped_column(String(16), default="#1B6B4A")
    cover_pattern: Mapped[str] = mapped_column(String(10), default="waves")
    genres: Mapped[list] = mapped_column(JSON, default=list)
    inspired_by_book_id: Mapped[int | None] = mapped_column(Integer)
    is_serial: Mapped[bool] = mapped_column(Boolean, default=False)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    bookmark_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    chapters: Mapped[list[StoryChapter]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="StoryChapter.number")


class StoryChapter(Base, TimestampMixin):
    __tablename__ = "story_chapters"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    story_id: Mapped[str] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[list] = mapped_column(JSON, default=list)  # paragraphs
    comment_count: Mapped[int] = mapped_column(Integer, default=0)


class StoryLike(Base):
    __tablename__ = "story_likes"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    story_id: Mapped[str] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), primary_key=True)


class StoryComment(Base, TimestampMixin):
    __tablename__ = "story_comments"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    story_id: Mapped[str] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    chapter_number: Mapped[int] = mapped_column(Integer, default=1)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)


# ---------------- Member-published books ----------------
class UserBook(Base, TimestampMixin):
    __tablename__ = "user_books"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # >= USER_BOOK_BASE, assigned in code
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    author_name: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(300))
    subtitle: Mapped[str | None] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(String(500))
    genre: Mapped[str] = mapped_column(String(50), default="Fiction")
    language: Mapped[str] = mapped_column(String(10), default="en")
    moods: Mapped[list] = mapped_column(JSON, default=list)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    reader_count: Mapped[int] = mapped_column(Integer, default=0)
    chapters: Mapped[list[UserBookChapter]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="UserBookChapter.number")


class UserBookChapter(Base):
    __tablename__ = "user_book_chapters"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=new_id)
    book_id: Mapped[int] = mapped_column(ForeignKey("user_books.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(300))
    paragraphs: Mapped[list] = mapped_column(JSON, default=list)


# ---------------- Challenges ----------------
class Challenge(Base, TimestampMixin):
    __tablename__ = "challenges"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("ch_"))
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(20), default="books")
    target: Mapped[int] = mapped_column(Integer, default=12)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    prompt: Mapped[str | None] = mapped_column(Text)
    participant_count: Mapped[int] = mapped_column(Integer, default=0)


class ChallengeParticipant(Base, TimestampMixin):
    __tablename__ = "challenge_participants"
    challenge_id: Mapped[str] = mapped_column(ForeignKey("challenges.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    value: Mapped[int] = mapped_column(Integer, default=0)


# ---------------- Notifications & activity ----------------
class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("n_"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    action_url: Mapped[str] = mapped_column(String(300), default="/home")
    from_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class Activity(Base, TimestampMixin):
    """Public activity feed items (started / finished / reviewed / highlighted / published ...)."""
    __tablename__ = "activities"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("f_"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    verb: Mapped[str] = mapped_column(String(20))
    book_id: Mapped[int | None] = mapped_column(Integer)
    ref_type: Mapped[str | None] = mapped_column(String(20))  # story | club | debate | diary
    ref_id: Mapped[str | None] = mapped_column(String(24))
    text: Mapped[str | None] = mapped_column(Text)
    rating: Mapped[float | None] = mapped_column(Float)


class Report(Base, TimestampMixin):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("rep_"))
    reporter_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    content_type: Mapped[str] = mapped_column(String(20))  # review | story | thread | reply | message | book | diary | user | club
    content_id: Mapped[str] = mapped_column(String(64), index=True)
    reason: Mapped[str] = mapped_column(String(40))
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending | resolved | dismissed
    resolved_by: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    snapshot: Mapped[str | None] = mapped_column(Text)  # text of the content at report time


# ---------------- Caches ----------------
class BookCache(Base):
    __tablename__ = "book_cache"
    book_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meta: Mapped[dict] = mapped_column(JSON)
    text: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
