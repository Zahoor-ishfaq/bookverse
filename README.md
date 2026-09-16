# BookVerse

**Read. Connect. Remember.** — a social reading platform: a 75,000-book public-domain library, a distraction-free reader with highlights and bookmarks, reviews, reading diaries, book clubs, live reading rooms, debates, community stories and self-publishing — all backed by a real API with accounts, notifications and an admin panel.

## Features

- **Library** — search and browse Project Gutenberg's catalogue; metadata and texts are proxied and cached by the API. A bundled `catalog.json` snapshot makes Discover and Home render instantly.
- **Reader** — chapters, font/theme controls, reading position synced across devices, highlights with notes, bookmarks, reading streaks.
- **Community** — reviews with helpful votes, public reading diaries, book clubs with threads, live reading rooms (WebSockets), debates with votes, member-written stories with chapters and comments, reading challenges.
- **Publish** — members can publish their own books (chapters + cover) into the same library.
- **Accounts** — email/password or Google sign-in, email verification, password reset, profile with social links, follows, data export and account deletion.
- **Admin** — `/admin`: dashboard, user management (ban, admin, verified badge), content moderation, and a report queue fed by "Report" buttons across the app.
- **Compliance** — cookie consent, Terms, Privacy and Cookie policies, SEO metadata, sitemap and JSON-LD.

## Architecture

```
frontend/   React 18 · TypeScript · Vite · Tailwind · React Query · Zustand · Framer Motion
backend/    FastAPI · SQLAlchemy 2 (async) · SQLite locally / PostgreSQL in production · JWT · WebSockets
```

- **Auth**: scrypt-hashed passwords, Google Identity Services (ID token verified server-side), short-lived access JWT + rotating refresh tokens.
- **Data**: every user action is an API call — shelves, progress, highlights, bookmarks, reviews, diary, follows, clubs, rooms, debates, stories, published books, challenges, notifications, feed, search, profiles.
- **Guests** can browse and read; saving anything asks them to sign in, and guest reading positions are merged into the account on first login.
- **Uploads** (covers, avatars) go to local disk by default or to S3 when `S3_BUCKET` is set.

## Run locally

```bash
# 1. API — creates bookverse.db and seeds a demo community on first start
cd backend
python -m venv .venv && . .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                   # optional: set GOOGLE_CLIENT_ID, ADMIN_EMAILS, SEED_ON_START=true
uvicorn app.main:app --reload --port 8000              # http://localhost:8000/api/docs

# 2. Frontend — proxies /api and WebSockets to :8000
cd ../frontend
npm install
npm run dev                                            # http://localhost:5173
```

With `SEED_ON_START=true` the API seeds demo members (`amira@example.com`, `theo@example.com`, `june@example.com`, `kenji@example.com`, `sol@example.com`, `nadia@example.com`, `oscar@example.com`, `admin@bookverse.app`; password `password123`). Keep it `false` in production.

Make yourself admin with `ADMIN_EMAILS=you@example.com` in `backend/.env` — you're promoted the next time you log in.

### Google sign-in

Create an OAuth 2.0 *Web application* client in Google Cloud Console, add your origins (`http://localhost:5173` for development, your domain in production) to **Authorised JavaScript origins**, and put the client ID in both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`).

## Deploy

**Docker (any VPS):**
```bash
cp backend/.env.example backend/.env    # set SECRET_KEY, FRONTEND_URL, CORS_ORIGINS, PUBLIC_API_URL, SMTP_*, GOOGLE_CLIENT_ID
VITE_SITE_URL=https://yourdomain.com VITE_GOOGLE_CLIENT_ID=... docker compose up -d --build
```
Starts PostgreSQL, the API and Nginx serving the built frontend on port 80 — put a TLS terminator (Caddy, Traefik, a CDN) in front.

**Split hosting:** static frontend (S3 + CDN, Vercel, Netlify) built with `VITE_API_URL=https://api.yourdomain.com`; API container (EC2, ECS, Fly, Render) with `CORS_ORIGINS` set to the frontend origin, a managed PostgreSQL, and `S3_BUCKET` for uploads.

### Environment — backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | JWT signing key — long random string |
| `DATABASE_URL` | `sqlite+aiosqlite:///./bookverse.db` or `postgresql+asyncpg://…` |
| `FRONTEND_URL`, `CORS_ORIGINS`, `PUBLIC_API_URL` | Your domains (email links, CORS, absolute upload URLs) |
| `GOOGLE_CLIENT_ID` | Enables Google sign-in (same id as `VITE_GOOGLE_CLIENT_ID`) |
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to admin at login |
| `S3_BUCKET`, `S3_PUBLIC_URL`, `AWS_REGION` | Store uploads in S3 (instance role or standard AWS credentials); local `/uploads` when unset |
| `SMTP_HOST/PORT/USER/PASSWORD`, `MAIL_FROM` | Transactional email; links are logged to the console when unset |
| `SEED_ON_START` | Seed the demo community into an empty database (`false` in production) |

### Environment — frontend (build-time)

`VITE_SITE_URL` (canonical URLs, OG tags, sitemap) · `VITE_API_URL` (only for split hosting) · `VITE_GOOGLE_CLIENT_ID`.

## Tests

- **API**: `backend/tests/smoke.py` runs 39 end-to-end checks against a running server — `python tests/smoke.py`.
- **Browser**: `frontend/e2e/two-users.mjs` is a 24-step Playwright journey with two real accounts (register → review → highlight → follow → club → live room → debate → story → publish → profile → search → export → logout → delete) — `node e2e/two-users.mjs http://localhost:5173 ./shots`.

## Scripts

- `npm run catalog` — refresh `public/catalog.json` from Gutendex (rate-limited; ~2 min)
- `npm run sitemap` — regenerate `public/sitemap.xml` (runs automatically on build)

## Design

Tokens live in `frontend/src/styles/globals.css`. Reddit Sans for the interface, Lora for book text; white canvas, one green accent, neutral greys.

## Credits

Books and texts come from [Project Gutenberg](https://www.gutenberg.org/) via [Gutendex](https://gutendex.com/). For coding, [Claude Code](https://claude.com/claude-code) was used.
