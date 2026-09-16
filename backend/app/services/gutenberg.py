"""Gutendex + Project Gutenberg access with a database cache.

The browser never talks to either host directly: metadata is proxied (and
cached for a day), book text is cached for 30 days. Gutendex throttles bursts,
so a small in-process lock keeps concurrent identical fetches from stampeding."""
import asyncio
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import BookCache

_locks: dict[str, asyncio.Lock] = {}
_list_cache: dict[str, tuple[datetime, dict]] = {}
META_TTL = timedelta(days=1)
TEXT_TTL = timedelta(days=30)
UA = {"User-Agent": "BookVerse/1.0 (+https://bookverse.app)"}


def _lock(key: str) -> asyncio.Lock:
    return _locks.setdefault(key, asyncio.Lock())


async def list_books(params: dict[str, str]) -> dict:
    key = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    hit = _list_cache.get(key)
    if hit and datetime.now(timezone.utc) - hit[0] < META_TTL:
        return hit[1]
    async with _lock("list:" + key):
        hit = _list_cache.get(key)
        if hit and datetime.now(timezone.utc) - hit[0] < META_TTL:
            return hit[1]
        async with httpx.AsyncClient(timeout=25, headers=UA) as client:
            r = await client.get(f"{settings.gutendex_base_url}/books/", params=params)
            r.raise_for_status()
            data = r.json()
        if len(_list_cache) > 500:
            _list_cache.clear()
        _list_cache[key] = (datetime.now(timezone.utc), data)
        return data


async def get_meta(db: AsyncSession, book_id: int) -> dict | None:
    row = await db.get(BookCache, book_id)
    if row and datetime.now(timezone.utc) - row.fetched_at.replace(tzinfo=timezone.utc) < META_TTL * 30:
        return row.meta
    async with httpx.AsyncClient(timeout=25, headers=UA) as client:
        r = await client.get(f"{settings.gutendex_base_url}/books/{book_id}/")
        if r.status_code == 404:
            return None
        r.raise_for_status()
        meta = r.json()
    if row:
        row.meta, row.fetched_at = meta, datetime.now(timezone.utc)
    else:
        db.add(BookCache(book_id=book_id, meta=meta))
    await db.commit()
    return meta


async def get_text(db: AsyncSession, book_id: int) -> str | None:
    row = await db.get(BookCache, book_id)
    if row and row.text:
        return row.text
    async with _lock(f"text:{book_id}"):
        row = await db.get(BookCache, book_id)
        if row and row.text:
            return row.text
        urls = [f"{settings.gutenberg_base_url}/cache/epub/{book_id}/pg{book_id}.txt", f"{settings.gutenberg_base_url}/files/{book_id}/{book_id}-0.txt"]
        text = None
        async with httpx.AsyncClient(timeout=60, follow_redirects=True, headers=UA) as client:
            for url in urls:
                try:
                    r = await client.get(url)
                    if r.status_code == 200 and len(r.content) > 1000:
                        try:
                            text = r.content.decode("utf-8")
                        except UnicodeDecodeError:
                            text = r.content.decode("latin-1")
                        break
                except httpx.HTTPError:
                    continue
        if text is None:
            return None
        if row:
            row.text = text
        else:
            meta = await get_meta(db, book_id) or {}
            row = await db.get(BookCache, book_id)
            if row:
                row.text = text
            else:
                db.add(BookCache(book_id=book_id, meta=meta, text=text))
        await db.commit()
        return text
