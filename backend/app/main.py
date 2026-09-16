import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers import admin, auth, books, community, library, social, users
from .seed import seed

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("bookverse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if settings.seed_on_start:
        async with SessionLocal() as db:
            if (await db.scalar(select(func.count()).select_from(User)) or 0) == 0:
                await seed(db)
                log.info("Seeded demo community")
    os.makedirs(settings.uploads_dir, exist_ok=True)
    log.info("BookVerse API ready (%s, db=%s)", settings.app_env, settings.database_url.split("://")[0])
    yield
    await engine.dispose()


app = FastAPI(title="BookVerse API", version="1.0.0", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, users.router, books.router, library.router, community.router, social.router, admin.router):
    app.include_router(r)

app.mount("/uploads", StaticFiles(directory=settings.uploads_dir, check_dir=False), name="uploads")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}
