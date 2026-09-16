import os
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import USER_BOOK_BASE, User, UserBook, UserBookChapter
from ..security import current_user, optional_user
from ..serializers import user_book_full, user_book_meta
from ..services import gutenberg
from ..util import notify, record_activity
from ..services.storage import save_file

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("")
async def list_books(search: str | None = None, topic: str | None = None, languages: str = "en", sort: str = "popular",
                     page: int = Query(1, ge=1), ids: str | None = None, author_year_start: int | None = None, author_year_end: int | None = None):
    params = {"languages": languages, "sort": sort, "page": str(page), "mime_type": "text/plain"}
    for k, v in (("search", search), ("topic", topic), ("ids", ids), ("author_year_start", author_year_start), ("author_year_end", author_year_end)):
        if v:
            params[k] = str(v)
    try:
        return await gutenberg.list_books(params)
    except Exception:
        raise HTTPException(502, "The book catalogue is temporarily unavailable")


@router.get("/community")
async def community_books(limit: int = 24, db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(UserBook).where(UserBook.is_public.is_(True)).order_by(UserBook.created_at.desc()).limit(limit))).all()
    return [user_book_meta(b) for b in rows]


@router.get("/{book_id}")
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    if book_id >= USER_BOOK_BASE:
        b = await db.get(UserBook, book_id)
        if not b:
            raise HTTPException(404, "Book not found")
        return user_book_meta(b)
    meta = await gutenberg.get_meta(db, book_id)
    if not meta:
        raise HTTPException(404, "Book not found")
    return meta


@router.get("/{book_id}/text")
async def get_text(book_id: int, db: AsyncSession = Depends(get_db)):
    if book_id >= USER_BOOK_BASE:
        b = await db.get(UserBook, book_id)
        if not b:
            raise HTTPException(404, "Book not found")
        return {"chapters": [{"title": c.title, "paragraphs": c.paragraphs} for c in b.chapters]}
    text = await gutenberg.get_text(db, book_id)
    if text is None:
        raise HTTPException(404, "Text not available for this edition")
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=604800"})


# ---------------- Member publishing ----------------
class ChapterIn(BaseModel):
    title: str = Field(max_length=300)
    paragraphs: list[str]


class PublishIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    subtitle: str | None = Field(default=None, max_length=300)
    authorName: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=4000)
    genre: str = Field(default="Fiction", max_length=50)
    language: str = Field(default="en", max_length=10)
    moods: list[str] = []
    chapters: list[ChapterIn] = Field(min_length=1)
    coverUrl: str | None = None
    isPublic: bool = True


@router.post("/publish")
async def publish(body: PublishIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    total_words = sum(len(" ".join(c.paragraphs).split()) for c in body.chapters)
    if total_words < 50:
        raise HTTPException(400, "Add at least a short chapter before publishing")
    max_id = await db.scalar(select(UserBook.id).order_by(UserBook.id.desc()).limit(1))
    book = UserBook(id=max((max_id or 0) + 1, USER_BOOK_BASE + 1), owner_id=user.id, author_name=body.authorName.strip(), title=body.title.strip(),
                    subtitle=body.subtitle, description=body.description.strip(), cover_url=body.coverUrl, genre=body.genre, language=body.language,
                    moods=body.moods[:3], is_public=body.isPublic)
    db.add(book)
    await db.flush()
    for i, c in enumerate(body.chapters, start=1):
        db.add(UserBookChapter(book_id=book.id, number=i, title=c.title.strip() or f"Chapter {i}", paragraphs=[p for p in c.paragraphs if p.strip()]))
    record_activity(db, user.id, "published", book_id=book.id, text=body.title)
    await db.commit()
    await db.refresh(book)
    return user_book_full(book)


@router.post("/covers")
async def upload_cover(file: UploadFile = File(...), user: User = Depends(current_user)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Please upload an image")
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Image must be under {settings.max_upload_mb} MB")
    ext = {"image/png": "png", "image/webp": "webp"}.get(file.content_type, "jpg")
    return {"url": save_file(f"covers/{user.id}-{secrets.token_hex(6)}.{ext}", data, file.content_type or "image/jpeg")}


@router.get("/mine/published")
async def my_books(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(UserBook).where(UserBook.owner_id == user.id).order_by(UserBook.created_at.desc()))).all()
    return [user_book_meta(b) for b in rows]


@router.delete("/{book_id}")
async def unpublish(book_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    b = await db.get(UserBook, book_id)
    if not b or (b.owner_id != user.id and not user.is_admin):
        raise HTTPException(404, "Book not found")
    await db.delete(b)
    await db.commit()
    return {"ok": True}


__all__ = ["Form", "optional_user", "notify"]
