# BookVerse — CLAUDE.md
## AI-Powered Book Reading & Community Platform

---

## ⚠️ READ THIS FIRST — UI PHILOSOPHY

This is the most important section. Read it before writing a single line of CSS.

### What This App Must Feel Like
Think Spotify meets Medium meets Pinterest — but for books. It must feel warm, editorial, alive, and human. Every screen should feel like walking into a beautiful independent bookshop, not a tech startup dashboard.

### Reference Images
- Check the project root for `ui-reference.png` — the user has provided a UI reference image. Study it carefully and extract: color palette, typography style, card layout, spacing philosophy, and overall mood. Mirror this aesthetic throughout the entire app.
- Additionally search Pinterest for: "book app UI design", "reading app mobile UI", "editorial web design", "literary magazine layout", "book store website design", "warm minimal UI design". Extract the strongest visual patterns and apply them.

### What to AVOID — Strictly Forbidden UI Patterns
- No dark purple/blue gradient hero sections
- No glowing neon borders or glassmorphism cards
- No typical AI startup aesthetic — floating orbs, mesh gradients, particle effects
- No cold sterile white corporate look
- No generic sans-serif used for everything
- No Bootstrap or Material UI default components — build everything custom
- No cookie-cutter card layouts that look like every other SaaS
- No excessive animations that feel gimmicky or slow
- No dark mode as the default — offer it as a toggle but default to warm light

### What to BUILD — The Right Aesthetic
- Warm creamy off-white backgrounds — #FAF8F5, #F5F0EB, #FFFDF9
- Rich earthy accent colors — deep forest green, warm amber, burnt sienna, dusty rose
- Beautiful serif typography for all headings — Google Fonts: Playfair Display, Lora, or Cormorant Garamond
- Clean modern sans-serif for body text — Inter or DM Sans
- Generous white space — let the design breathe, never crowd elements
- Book cover art as the primary visual hero — let the covers do the work
- Subtle paper texture or noise grain on backgrounds
- Masonry and Pinterest-style grids for book discovery
- Micro-interactions that feel satisfying — hover states, progress rings, smooth transitions
- Hand-crafted organic feel — not rigid uniform grids
- Color-coded reading moods — warm tones for adventure, cool for mystery, soft for romance
- Typography hierarchy that reads like a literary magazine

### Color Palette
```
--bg-primary: #FAF8F5       Warm parchment background
--bg-secondary: #F0EBE3     Aged paper secondary
--bg-card: #FFFFFF          Pure white cards
--accent-primary: #2D5A27   Deep forest green
--accent-secondary: #C8873A Warm amber
--accent-tertiary: #8B3A3A  Dusty red
--text-primary: #1A1A1A     Near black
--text-secondary: #5C5C5C   Warm gray
--text-muted: #9A9A8A       Muted warm gray
--border: #E8E2DA           Soft warm border
```

### Typography Rules
- Headings: Playfair Display, serif, weight 700
- Body: Inter, sans-serif, weight 400
- Book titles: Lora, serif, italic
- Pull quotes: Cormorant Garamond, large size, elegant weight
- Never use more than 2 font families on a single screen

---

## Project Name
BookVerse

## Tagline
Read. Connect. Remember.

---

## Project Overview

BookVerse is a full-stack web platform combining:
- Free online book reading (75,000+ books via Project Gutenberg)
- A rich social community around books — clubs, rooms, debates
- Personal reading life tracking — diary, shelves, streaks
- Original community story publishing
- AI-powered features via Hugging Face free models
- Hosted entirely on AWS free tier plus $28 credit

The goal: what Goodreads should have been. Beautiful, fast, modern, community-first.

---

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS — heavily customized with own design tokens, no default Tailwind look
- Framer Motion for animations and page transitions
- React Query for all server state and caching
- Zustand for client state management
- React Router v6 for navigation
- Socket.io client for real-time rooms and notifications
- Google Fonts: Playfair Display, Lora, Inter, Cormorant Garamond
- Lucide React for minimal icon usage
- React Intersection Observer for scroll-triggered animations
- Custom masonry layout (CSS columns or JS masonry)
- Quill or TipTap for story editor rich text

### Backend
- Python FastAPI
- SQLAlchemy ORM with async support
- Alembic for database migrations
- Pydantic v2 for request/response validation
- Boto3 for AWS SDK
- httpx async for external API calls
- python-socketio for WebSocket
- Celery with Redis for background task queue
- Redis for session store and API response caching

### AI — Hugging Face (All Free Tier)
- facebook/bart-large-cnn — book summarization
- distilbert-base-uncased-finetuned-sst-2-english — review sentiment analysis
- sentence-transformers/all-MiniLM-L6-v2 — book similarity and recommendations
- facebook/bart-large-mnli — zero-shot genre and mood classification
- Helsinki-NLP/opus-mt-en-ar — English to Arabic translation
- gpt2 — writing prompt generation for story challenges
- pszemraj/led-base-book-summary — long chapter summarization for book clubs

Note: Hugging Face free tier has cold start delays of 20-30 seconds when model is sleeping. Show a loading state with a warm message like "Brewing your summary..." — never show a raw spinner with no context.

### Book Data Sources
- Gutendex API (gutendex.com/books) — 75,000+ free public domain books, no auth, returns JSON
- Open Library API (openlibrary.org/api/books) — metadata, covers, descriptions for additional books
- Open Library Covers (covers.openlibrary.org) — high quality cover images by ISBN or OLID

### Infrastructure
- Terraform for all AWS resource provisioning
- Docker and Docker Compose for local development
- GitHub Actions for CI/CD pipeline

---

## Full Project Structure

```
bookverse/
├── CLAUDE.md
├── README.md
├── ui-reference.png                 Study this for UI direction
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js           Custom tokens only, no default Tailwind
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/
│       │   ├── globals.css          CSS variables, Google Fonts import, base reset
│       │   ├── typography.css       All font rules and heading hierarchy
│       │   └── animations.css       Keyframes and transition utilities
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx            Minimal sticky nav with search and avatar
│       │   │   ├── MobileBottomNav.tsx   Tab bar on mobile screens
│       │   │   ├── Sidebar.tsx           Left sidebar for desktop
│       │   │   └── PageWrapper.tsx       Consistent page container
│       │   │
│       │   ├── ui/
│       │   │   ├── Button.tsx            Primary, secondary, ghost, danger variants
│       │   │   ├── Avatar.tsx            User avatar with reading progress ring
│       │   │   ├── Badge.tsx             Genre, mood, and status badges
│       │   │   ├── Modal.tsx             Accessible modal with backdrop
│       │   │   ├── Drawer.tsx            Side drawer for mobile
│       │   │   ├── Tooltip.tsx
│       │   │   ├── SkeletonLoader.tsx    Beautiful loading states
│       │   │   ├── ProgressRing.tsx      Circular SVG reading progress
│       │   │   ├── StarRating.tsx        Half-star rating input and display
│       │   │   ├── Toast.tsx             Success, error, info toasts
│       │   │   ├── Divider.tsx           Elegant horizontal divider
│       │   │   ├── EmptyState.tsx        Illustrated empty states, not generic
│       │   │   └── ScrollToTop.tsx
│       │   │
│       │   ├── book/
│       │   │   ├── BookCover.tsx         Cover image with hover overlay effects
│       │   │   ├── BookCard.tsx          Card in masonry and grid layouts
│       │   │   ├── BookListItem.tsx      Compact list view item
│       │   │   ├── BookCarousel.tsx      Horizontal scroll with navigation arrows
│       │   │   ├── MasonryGrid.tsx       Pinterest-style discovery grid
│       │   │   ├── BookReader.tsx        Core reading component
│       │   │   ├── ReaderToolbar.tsx     Font, theme, bookmarks controls
│       │   │   ├── ReaderProgress.tsx    Chapter and overall progress
│       │   │   ├── HighlightPopup.tsx    Appears on text selection in reader
│       │   │   ├── BookmarkPanel.tsx     Side panel showing all bookmarks
│       │   │   ├── MoodBadge.tsx         Color coded mood chip
│       │   │   └── QuoteCard.tsx         Shareable styled quote image
│       │   │
│       │   ├── community/
│       │   │   ├── BookClubCard.tsx
│       │   │   ├── DiscussionThread.tsx
│       │   │   ├── ThreadReply.tsx
│       │   │   ├── ReadingRoomChat.tsx   Live chat component
│       │   │   ├── ChatMessage.tsx
│       │   │   ├── DebateCard.tsx        Vote + argument display
│       │   │   ├── DebateVoteBar.tsx     Animated vote percentage bar
│       │   │   └── ActivityFeedItem.tsx  Single item in home feed
│       │   │
│       │   ├── story/
│       │   │   ├── StoryCard.tsx         Preview card for community stories
│       │   │   ├── StoryEditor.tsx       Full TipTap rich text editor
│       │   │   ├── ChapterList.tsx       Chapter sidebar in story view
│       │   │   └── StoryComment.tsx
│       │   │
│       │   ├── profile/
│       │   │   ├── ProfileHeader.tsx     Cover, avatar, stats, follow button
│       │   │   ├── LifeInBooks.tsx       Horizontal timeline of reading life
│       │   │   ├── ShelfVisual.tsx       Bookshelf visual with standing covers
│       │   │   ├── ReadingStats.tsx      Heatmap and yearly stats
│       │   │   └── AchievementBadge.tsx
│       │   │
│       │   └── ai/
│       │       ├── AISummaryBlock.tsx    Summary with AI label and collapse
│       │       ├── MoodPicker.tsx        Mood selector for recommendations
│       │       ├── SentimentIndicator.tsx Small positive/negative badge on reviews
│       │       └── WritingPromptCard.tsx  AI generated story prompt display
│       │
│       ├── pages/
│       │   ├── LandingPage.tsx           Marketing page, no auth required
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   └── OnboardingPage.tsx    Multi-step genre and mood setup
│       │   ├── home/
│       │   │   └── HomePage.tsx          Personalized feed after login
│       │   ├── discover/
│       │   │   ├── DiscoverPage.tsx      Full book discovery with masonry grid
│       │   │   ├── GenrePage.tsx         Books filtered by genre
│       │   │   └── MoodPage.tsx          Books filtered by mood
│       │   ├── book/
│       │   │   ├── BookDetailPage.tsx    Full book page with all tabs
│       │   │   ├── BookReaderPage.tsx    Full-screen reading mode
│       │   │   └── BookDiscussionPage.tsx All community discussions for book
│       │   ├── community/
│       │   │   ├── CommunityPage.tsx     Browse all clubs, rooms, debates
│       │   │   ├── BookClubPage.tsx      Single club with members and threads
│       │   │   ├── ReadingRoomPage.tsx   Live chat room
│       │   │   └── DebatePage.tsx        Single debate view
│       │   ├── stories/
│       │   │   ├── StoriesPage.tsx       Browse all community stories
│       │   │   ├── StoryDetailPage.tsx   Read a story with chapters
│       │   │   └── WriteStoryPage.tsx    Create and edit stories
│       │   ├── diary/
│       │   │   ├── DiaryPage.tsx         Browse public diary entries
│       │   │   └── MyDiaryPage.tsx       Personal diary management
│       │   ├── profile/
│       │   │   ├── ProfilePage.tsx       Public user profile
│       │   │   └── MyShelfPage.tsx       Personal reading shelf
│       │   ├── challenges/
│       │   │   └── ChallengesPage.tsx    Browse and join challenges
│       │   ├── search/
│       │   │   └── SearchPage.tsx        Global search results
│       │   ├── notifications/
│       │   │   └── NotificationsPage.tsx
│       │   └── admin/
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminBooks.tsx
│       │       ├── AdminUsers.tsx
│       │       ├── AdminStories.tsx
│       │       ├── AdminReports.tsx
│       │       └── AdminAnalytics.tsx
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useBooks.ts
│       │   ├── useReading.ts
│       │   ├── useShelves.ts
│       │   ├── useCommunity.ts
│       │   ├── useStories.ts
│       │   ├── useAI.ts
│       │   ├── useSocket.ts
│       │   └── useNotifications.ts
│       │
│       ├── services/
│       │   ├── api.ts                    Axios instance with interceptors
│       │   ├── auth.ts
│       │   ├── books.ts
│       │   ├── gutenberg.ts              Gutendex API integration
│       │   ├── openLibrary.ts            Open Library API integration
│       │   ├── reading.ts
│       │   ├── shelves.ts
│       │   ├── community.ts
│       │   ├── stories.ts
│       │   ├── diary.ts
│       │   ├── search.ts
│       │   └── ai.ts                     Hugging Face API calls
│       │
│       ├── store/
│       │   ├── authStore.ts
│       │   ├── readerStore.ts            Font, theme, position preferences
│       │   └── notificationStore.ts
│       │
│       └── types/
│           ├── book.ts
│           ├── user.ts
│           ├── community.ts
│           ├── story.ts
│           ├── diary.ts
│           └── ai.ts
│
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── user.py
│   │   ├── book.py
│   │   ├── shelf.py
│   │   ├── reading_progress.py
│   │   ├── highlight.py
│   │   ├── bookmark.py
│   │   ├── review.py
│   │   ├── diary.py
│   │   ├── community.py
│   │   ├── story.py
│   │   ├── challenge.py
│   │   ├── notification.py
│   │   └── report.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── book.py
│   │   ├── reading.py
│   │   ├── community.py
│   │   ├── story.py
│   │   └── analytics.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── books.py
│   │   ├── reading.py
│   │   ├── shelves.py
│   │   ├── reviews.py
│   │   ├── highlights.py
│   │   ├── diary.py
│   │   ├── community.py
│   │   ├── stories.py
│   │   ├── search.py
│   │   ├── ai.py
│   │   ├── challenges.py
│   │   ├── notifications.py
│   │   ├── profile.py
│   │   └── admin.py
│   ├── services/
│   │   ├── gutenberg_service.py
│   │   ├── open_library_service.py
│   │   ├── ai_service.py
│   │   ├── notification_service.py
│   │   ├── s3_service.py
│   │   ├── ses_service.py
│   │   ├── cache_service.py
│   │   └── recommendation_service.py
│   ├── websocket/
│   │   ├── reading_room.py
│   │   └── notifications.py
│   ├── tasks/
│   │   ├── celery_app.py
│   │   ├── book_sync.py
│   │   ├── ai_processing.py
│   │   └── email_tasks.py
│   └── migrations/
│
├── lambdas/
│   ├── weekly_digest/
│   │   └── handler.py
│   ├── reading_streak/
│   │   └── handler.py
│   └── book_sync/
│       └── handler.py
│
└── infrastructure/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── modules/
        ├── vpc/
        ├── ec2/
        ├── rds/
        ├── s3/
        ├── cloudfront/
        ├── lambda/
        ├── sqs/
        ├── ses/
        ├── cognito/
        ├── elasticache/
        └── cloudwatch/
```

---

## Database Schema

```sql
-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    bio TEXT,
    bio_ar TEXT,
    location VARCHAR(100),
    website VARCHAR(200),
    preferred_language VARCHAR(10) DEFAULT 'en',
    reading_goal INTEGER DEFAULT 12,
    is_author BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    favorite_genres TEXT[],
    favorite_moods TEXT[],
    reading_pace VARCHAR(20) DEFAULT 'moderate',
    preferred_book_length VARCHAR(20),
    email_weekly_digest BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BOOKS
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gutenberg_id INTEGER UNIQUE,
    open_library_id VARCHAR(50),
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    authors TEXT[],
    subjects TEXT[],
    languages TEXT[],
    description TEXT,
    description_ar TEXT,
    cover_url VARCHAR(500),
    cover_large_url VARCHAR(500),
    formats JSONB,
    download_count INTEGER DEFAULT 0,
    page_count INTEGER,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    published_year INTEGER,
    ai_summary TEXT,
    ai_summary_ar TEXT,
    ai_mood_tags TEXT[],
    ai_themes TEXT[],
    avg_rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    reader_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SHELVES
CREATE TABLE shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    shelf_type VARCHAR(30) NOT NULL CHECK (shelf_type IN (
        'reading', 'want_to_read', 'finished', 'did_not_finish', 'favorites', 'custom'
    )),
    custom_shelf_name VARCHAR(100),
    date_started DATE,
    date_finished DATE,
    dnf_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, book_id, shelf_type)
);

CREATE TABLE reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    current_chapter INTEGER DEFAULT 1,
    current_position INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    total_reading_minutes INTEGER DEFAULT 0,
    last_read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_minutes INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    position INTEGER,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    start_position INTEGER,
    end_position INTEGER,
    highlighted_text TEXT NOT NULL,
    color VARCHAR(20) DEFAULT 'yellow',
    note TEXT,
    is_public BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    rating DECIMAL(2,1) CHECK (rating BETWEEN 0.5 AND 5.0),
    title VARCHAR(200),
    body TEXT,
    contains_spoilers BOOLEAN DEFAULT false,
    sentiment VARCHAR(20),
    sentiment_score DECIMAL(5,4),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

CREATE TABLE review_likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, review_id)
);

CREATE TABLE review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES review_comments(id),
    body TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- QUOTES
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    highlight_id UUID REFERENCES highlights(id),
    quote_text TEXT NOT NULL,
    chapter_number INTEGER,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SOCIAL
CREATE TABLE follows (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- READING DIARY
CREATE TABLE reading_diary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id),
    title VARCHAR(200),
    body TEXT NOT NULL,
    mood VARCHAR(50),
    photo_url VARCHAR(500),
    location VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE diary_likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    diary_id UUID REFERENCES reading_diary(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, diary_id)
);

CREATE TABLE diary_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    diary_id UUID REFERENCES reading_diary(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BOOK CLUBS
CREATE TABLE book_clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    current_book_id UUID REFERENCES books(id),
    is_private BOOLEAN DEFAULT false,
    member_count INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 50,
    meeting_frequency VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE book_club_members (
    club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (club_id, user_id)
);

CREATE TABLE book_club_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES book_clubs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    book_id UUID REFERENCES books(id),
    chapter_number INTEGER,
    title VARCHAR(300),
    body TEXT NOT NULL,
    contains_spoilers BOOLEAN DEFAULT false,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES book_club_discussions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    parent_reply_id UUID REFERENCES discussion_replies(id),
    body TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- READING ROOMS (Live Chat)
CREATE TABLE reading_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id),
    book_id UUID REFERENCES books(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_live BOOLEAN DEFAULT false,
    participant_count INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 100,
    scheduled_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES reading_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    quoted_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- DEBATES
CREATE TABLE debates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id),
    book_id UUID REFERENCES books(id),
    question VARCHAR(500) NOT NULL,
    side_a VARCHAR(200) NOT NULL,
    side_b VARCHAR(200) NOT NULL,
    side_a_count INTEGER DEFAULT 0,
    side_b_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE debate_votes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    side CHAR(1) CHECK (side IN ('a', 'b')),
    argument TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, debate_id)
);

-- COMMUNITY STORIES
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    tagline VARCHAR(300),
    cover_image_url VARCHAR(500),
    genres TEXT[],
    tags TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    is_serial BOOLEAN DEFAULT false,
    is_complete BOOLEAN DEFAULT false,
    inspired_by_book_id UUID REFERENCES books(id),
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE story_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(300),
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(story_id, chapter_number)
);

CREATE TABLE story_likes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, story_id)
);

CREATE TABLE story_bookmarks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, story_id)
);

CREATE TABLE story_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES story_chapters(id),
    parent_comment_id UUID REFERENCES story_comments(id),
    body TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CHALLENGES
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(30),
    target_value INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_public BOOLEAN DEFAULT true,
    participant_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_participants (
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

-- STREAKS AND ACHIEVEMENTS
CREATE TABLE reading_streaks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_read_date DATE,
    total_reading_days INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    earned_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    data JSONB,
    action_url VARCHAR(300),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- REPORTS
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id),
    content_type VARCHAR(30),
    content_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Detailed Feature Specifications

### Feature 1 — Landing Page (No auth required)
Magazine-style editorial landing page. Not a generic SaaS hero. Layout:
- Full-width header: animated mosaic of rotating book covers as background. Large serif headline: "Read. Connect. Remember." Two CTAs: Start Reading Free and Browse Books.
- Scrolling section: "What readers are saying" — rotating real review quotes in beautiful pull quote typography.
- "Books people are reading right now" — horizontal scroll of book covers with member avatars overlapping showing who is reading.
- Three feature highlights with warm illustrated icons — not stock photography.
- Community stories teaser — 3 story cards from featured writers.
- Live counters: 75,000+ Free Books, X Members, X Reviews Written.
- Final CTA section with sign up form embedded.
- Footer: links, language toggle EN/AR.

### Feature 2 — Onboarding (Multi-step, beautiful)
Step 1: Pick favorite genres — illustrated cards for Fiction, Mystery, Romance, Philosophy, History, Science, Poetry, Adventure. Each card has a warm color and a relevant illustration.
Step 2: Pick reading moods — mood chips with colors: Adventurous (amber), Dark (deep green), Romantic (rose), Philosophical (blue-gray), Funny (yellow), Calm (sage).
Step 3: Set reading goal — slider from 1 to 52 books per year. Shows encouraging message based on selection.
Step 4: Follow suggested readers — 5 curated active community members to follow.
Progress indicator at top. Skip button on each step. Animated transitions between steps.

### Feature 3 — Home Feed
Two-column layout on desktop, single column on mobile.
Left sidebar: navigation, current book progress card with cover and percentage ring, daily reading streak flame counter.
Main feed (infinite scroll): friend activity cards (reading, finished, reviewed), public diary entries, book club updates, live debates to vote on, AI recommended books, new story chapters from followed writers, community highlights from books.
Each feed card is generously padded, warm white, with subtle border. Avatar and name always visible. Timestamps as relative time.
Right sidebar (desktop): Trending books this week, Active reading rooms, Suggested people to follow, Currently active book clubs.

### Feature 4 — Book Discovery
Full width page. Top: horizontal mood selector — large colorful chips. Below: book count and filter bar. Main content: masonry grid of book covers at multiple sizes — large featured books, medium standard, small compact. Covers are the star — high quality images with subtle shadow. Hovering shows an overlay with title, author, community rating, and quick "Add to shelf" button. Clicking opens book detail page.
Filters: Genre (multi-select), Mood (multi-select), Language, Era (1800s / 1900s / Pre-1800s), Length (Short under 200 pages / Medium 200-400 / Long 400+).
Sort: Most popular in community this week, New additions, Highest rated, Most discussed, Currently being read by most people.

### Feature 5 — Book Detail Page
Rich editorial layout. Top section: book cover large on left, all key info on right — title in large serif italic, authors, year, genres as badges, mood tags as colored chips, reading time estimate, community rating with half-star breakdown bar chart.
Buttons: Start Reading (primary), Add to Shelf (dropdown), Share.
Below cover: reading progress if already started (shows percentage).
AI Summary section: collapsed by default, labeled clearly as AI Generated. Expand to see 3-paragraph summary.
Tabs: Reviews, Community Highlights, Book Clubs, Debates, Inspired Stories, Similar Books.
Reviews tab: rating distribution bar, reviews sorted by helpful, each review shows sentiment indicator, spoiler warning if applicable.
Community Highlights: the most-highlighted passages shown in beautiful quote blocks.

### Feature 6 — In-App Book Reader
Full screen reading experience. Minimal UI that gets out of the way.
Top bar (hides on scroll, shows on mouse move): book title, chapter name, close button, settings.
Reader area: centered column, max-width 680px, comfortable line height 1.8, generous side padding.
Bottom bar: chapter progress, overall book percentage, previous/next chapter buttons.
Settings panel (slides in from right): font family selector (Lora, Georgia, Inter, System), font size slider, line height slider, theme toggle (Warm / White / Dark / Sepia).
Text selection: selecting any text shows a popup — Highlight (color picker), Quote (share), Dictionary, Note.
Bookmarks: star icon in top right, click to bookmark current position.
Reading timer: tracks time actively reading, pauses when tab is not focused.
Auto-saves reading position every 30 seconds.
Screen wake lock prevents device sleeping while reading.
Keyboard: left/right arrow for page, Escape to exit, B to bookmark.

### Feature 7 — My Shelf
Personal reading management. Toggle views: Visual Shelf (books standing up like a real bookshelf, grouped by shelf type), Grid (cover grid), List (detailed list with dates).
Shelves shown: Currently Reading (with progress rings), Want to Read, Finished (with completion dates), Did Not Finish (with optional reason), Favorites, plus any custom shelves created.
Top stats bar: Books read this year vs goal (progress ring), Total books all time, Reading streak, Avg rating given, Top genre.
Annual reading challenge: big progress ring, books read vs goal, list of finished books this year.

### Feature 8 — Reading Diary
Personal journal about reading life. Entry creation: pick book (optional), write title and body (rich text), pick mood from color-coded options, add optional photo (upload to S3), add location, choose public or private.
My diary: chronological feed of personal entries. Beautiful card layout with mood color accent.
Public diary: discover other readers' diary entries in the community. Filter by mood or linked book.
Over time, diary entries form the "Life in Books" timeline on profile — entries plotted on a timeline showing reading journey across years.

### Feature 9 — Book Clubs
Discovery: grid of club cards with cover image, name, current book, member count, activity level badge.
Club page: header with cover, current book being read, member list with their reading progress, chapter-by-chapter discussion threads (threads organized by chapter to prevent spoilers), polls for next book, club reading schedule calendar, join button.
Create club: name, description, upload cover, set as public or private, set max members.
Each thread is labeled with chapter number. Users cannot see threads for chapters they haven't read yet (honor system with warning).

### Feature 10 — Reading Rooms (Live)
Live text chat rooms centered on a book. Room list shows: live rooms (green dot), scheduled rooms, recent rooms.
Inside a room: chat messages stream in real time via WebSocket. Special message types: plain text, book quote (shows styled quote card inline), reaction GIF (from preset book-themed reactions).
Participant list on the side. Host can pin messages or quote a passage from the book as the discussion topic.
Room history saved for 7 days after room ends.

### Feature 11 — Book Debates
Structured voting debates about books. Each debate has a question, two sides, and an end time.
Examples: "Was the ending of Anna Karenina satisfying? Yes / No" or "Is Don Quixote overrated? Yes / No"
Vote: pick a side, write optional short argument (max 280 chars). See live percentage bars updating. Top arguments from each side shown in styled cards. After voting, see how your friends voted.
Debate ends at set time. Results page shows final percentages, top arguments, and a summary.

### Feature 12 — Quotes and Highlights (Social)
While reading, select text and choose Highlight with color (yellow, green, blue, pink). Add optional note.
Public highlights appear in: book's community highlights section, follower feeds, and the quote sharing feature.
Quote card generator: select a highlight, choose a template (3-4 beautiful designs with book cover in background, serif quote text, user name), download as image or share directly.
Quote cards are beautiful — editorial feel, not generic social media graphics.

### Feature 13 — Community Stories
Built-in publishing platform. Writers write original fiction or creative nonfiction.
Story creation: title, tagline, cover image upload, genre tags, can mark as "Inspired by [book]".
Editor: full TipTap rich text editor — clean, focused, Substack-like. Bold, italic, headings, block quotes, horizontal divider. No clutter.
Publishing: single chapter or serial (release chapters over time). Each chapter published separately with its own comments.
Stories discovery: featured story of the week (chosen by admin), trending this week, new chapters today, by genre, writing challenges.
Each story shows: views, likes, bookmarks, comments per chapter.

### Feature 14 — Writing Challenges
Monthly prompts created by admin or community. Examples: "500 words inspired by Frankenstein" or "Rewrite an ending from a different character's POV."
Submit entry, others vote on favorites. Top 3 earn a featured badge on their profile. Creates viral engagement and new story content.

### Feature 15 — AI Features (Hugging Face)
All clearly labeled with an AI badge so users know it is generated content.
Book Summary: BART model, generated once when book is first cached. 3 paragraphs. Collapsed by default on book detail page. Loading state shows "Brewing your summary..." with warm animation.
Mood Tags: zero-shot classifier assigns moods to each book. Shown as color chips on book cards and detail pages.
Review Sentiment: DistilBERT runs on each review after submission. Shows subtle "Positive / Negative / Mixed" indicator next to review.
Recommendations: sentence transformers find similar books by embedding similarity. Shown on book detail page as "Readers also loved."
Mood Discovery: user selects a mood on discover page, classifier finds and ranks books matching that mood.
Arabic Translation: toggle in navbar switches UI language and translates book titles and descriptions.
Writing Prompts: GPT-2 generates creative prompts for story challenges.
Chapter Recap: LED model summarizes long chapters for book club discussions so members can quickly catch up.

### Feature 16 — Reading Challenges
Create challenges: title, type (books count, pages, genre bingo, streak), target value, start and end dates, public or private.
Community challenges: featured on challenges page, anyone can join. Leaderboard shows top participants.
Personal challenges: set your own reading goal for the year or a season.
Progress tracked automatically from reading sessions and shelf updates.
Completion earns an achievement badge displayed on profile.

### Feature 17 — Streaks and Achievements
Reading streak: increments each day a user logs reading time (minimum 10 minutes). Shows on profile and home sidebar. Streak fire icon with day count. Push/email notification if user hasn't read by 9pm.
Achievements (examples): First Book, Book Worm (10 books), Century Reader (100 books), First Review, Critic (50 reviews), Story Writer (first story published), Bestseller (story reaches 1000 reads), 7-Day Streak, 30-Day Streak, Globe Trotter (read in 3 languages), Club Master (joined 5 clubs).
Badges displayed on profile in a beautiful grid.

### Feature 18 — Search
Instant global search with debounce. Tabs in results: Books, Users, Stories, Clubs, Quotes.
Books: cover thumbnail, title, author, community rating.
Users: avatar, username, follower count, mutual friends.
Stories: cover, title, author, genre.
Search history: saved per user, shown in empty search state.
Popular searches: trending searches this week shown below search bar.

### Feature 19 — Notifications
In-app notification center: grouped by type, mark all as read.
Types: like on review/diary/story, comment on your content, new follower, friend finished a book, new chapter from followed writer, reading club update, debate ended (with results), streak at risk, weekly digest ready.
Email notifications via SES: configurable per-user. Weekly digest sent every Sunday with reading summary.

### Feature 20 — User Profile
Public page visible to anyone. Cover photo (full width, 300px tall), avatar (overlapping cover, 100px), display name and username, bio, location, website.
Stats row: Books Read, Reviews Written, Followers, Following.
Life in Books timeline: horizontal scroll showing major reading milestones over the years — significant books at different ages.
Tabs: Shelf, Reviews (with ratings), Stories published, Diary entries (public), Quotes, Achievements.
Reading activity heatmap: like GitHub contribution graph but for reading days.
Mutual followers: "3 of your friends follow this person."

### Feature 21 — Admin Panel
Accessible at /admin, admin role required.
Dashboard: today's key metrics — new users, active readers, books started, reviews posted, stories published. Charts for weekly trends.
Books: search and filter all books, edit metadata, mark as featured, trigger AI re-processing, sync new books from Gutenberg.
Users: search, view profile, ban, unban, verify, promote to moderator.
Stories: search, feature, unpublish flagged content.
Reports queue: list of reported content with details, resolve (remove content) or dismiss.
Community: manage book clubs, pin or remove discussions, end reading rooms.
Analytics: user growth chart, most read books this month, most active book clubs, engagement metrics.

---

## AWS Services

| Service | Purpose | Free Tier |
|---|---|---|
| EC2 t2.micro | FastAPI backend | 750 hrs/month |
| RDS PostgreSQL | Main database | 750 hrs/month |
| ElastiCache Redis | Caching and WebSocket sessions | 750 hrs/month |
| S3 | Avatars, diary photos, story covers, quote images | 5GB |
| CloudFront | Serve React frontend and S3 assets globally | 1TB transfer |
| Lambda | Weekly digest, streak check, Gutenberg book sync | 1M requests/month |
| SQS | AI processing job queue | 1M requests/month |
| SES | Welcome, digest, notification emails | 3000/day |
| Cognito | Auth, user pools, social login | 50,000 MAU |
| API Gateway WebSocket | Reading rooms real-time chat | 1M calls/month |
| EventBridge | Book events — finished, streak, challenge | 14M events/month |
| CloudWatch | Logs, metrics, Lambda triggers on schedule | Free tier |
| Secrets Manager | DB password, Hugging Face key | $0.40/secret |
| ACM | Free SSL | Free |
| IAM | All roles and permissions | Free |
| VPC | Network isolation | Free |
| CodePipeline | Auto deploy on GitHub push | 1 free pipeline |
| CodeBuild | Test and build | 100 mins/month |
| CloudTrail | Audit log | 1 trail free |
| X-Ray | Request tracing | 100K traces/month |

---

## Lambda Functions

### Weekly Digest Lambda
Triggered every Sunday at 8am by CloudWatch Events.
Queries each user's reading activity from the past week: books read, pages finished, new highlights, reviews written.
Generates personalized HTML email showing: books read this week, reading time total, streak status, top community debates, featured story of the week, recommended book based on recent reads.
Sends via SES. Respects user email preferences.

### Reading Streak Lambda
Triggered daily at 9pm by CloudWatch Events.
Checks all users who have active streaks but have not logged reading today.
Sends push notification via SNS and email via SES: "Your X-day streak is at risk! Open a book for 10 minutes to keep it alive."
Resets streaks for users who missed the previous day.

### Gutenberg Book Sync Lambda
Triggered daily at 3am by CloudWatch Events.
Fetches new books added to Gutendex since last sync date.
Stores new books in RDS.
Queues AI processing jobs in SQS for each new book (summary + mood tagging).

---

## API Endpoints

Auth:
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/onboarding

Books:
GET  /api/books — list with filters and pagination
GET  /api/books/featured
GET  /api/books/trending
GET  /api/books/:id
GET  /api/books/search?q=
GET  /api/books/:id/chapters
GET  /api/books/:id/chapters/:num/content

Reading:
GET  /api/reading/progress/:bookId
PUT  /api/reading/progress/:bookId
POST /api/reading/sessions
GET  /api/bookmarks/:bookId
POST /api/bookmarks
DELETE /api/bookmarks/:id
GET  /api/highlights/:bookId
POST /api/highlights
PUT  /api/highlights/:id
DELETE /api/highlights/:id

Shelves:
GET  /api/shelves — my shelves summary
GET  /api/shelves/:type — books on a shelf
POST /api/shelves — add book to shelf
PUT  /api/shelves/:id — change shelf
DELETE /api/shelves/:id

Reviews:
GET  /api/reviews/book/:bookId
POST /api/reviews
PUT  /api/reviews/:id
DELETE /api/reviews/:id
POST /api/reviews/:id/like
POST /api/reviews/:id/comments

Diary:
GET  /api/diary — public diary feed
GET  /api/diary/mine — my diary
POST /api/diary
PUT  /api/diary/:id
DELETE /api/diary/:id
POST /api/diary/:id/like

Community:
GET  /api/clubs
POST /api/clubs
GET  /api/clubs/:id
POST /api/clubs/:id/join
POST /api/clubs/:id/discussions
GET  /api/clubs/:id/discussions

GET  /api/rooms
POST /api/rooms
GET  /api/rooms/:id
POST /api/rooms/:id/join

GET  /api/debates
POST /api/debates
POST /api/debates/:id/vote

Stories:
GET  /api/stories
POST /api/stories
GET  /api/stories/:id
PUT  /api/stories/:id
POST /api/stories/:id/chapters
GET  /api/stories/:id/chapters/:num
POST /api/stories/:id/like
POST /api/stories/:id/bookmark
POST /api/stories/:id/comments

Social:
POST /api/follow/:userId
DELETE /api/follow/:userId
GET  /api/feed — home feed
GET  /api/users/:username
GET  /api/users/:username/followers
GET  /api/users/:username/following

Challenges:
GET  /api/challenges
POST /api/challenges
POST /api/challenges/:id/join
GET  /api/challenges/:id/leaderboard

AI:
GET  /api/ai/summary/:bookId
GET  /api/ai/recommendations/:bookId
POST /api/ai/mood-recommendations
POST /api/ai/translate/:bookId
GET  /api/ai/writing-prompt

Notifications:
GET  /api/notifications
PUT  /api/notifications/:id/read
PUT  /api/notifications/read-all

Admin:
GET  /api/admin/dashboard
GET  /api/admin/users
PUT  /api/admin/users/:id
GET  /api/admin/reports
PUT  /api/admin/reports/:id
GET  /api/admin/analytics

---

## Environment Variables

```
APP_NAME=BookVerse
APP_ENV=production
SECRET_KEY=your-secret-key
DEBUG=false
FRONTEND_URL=https://bookverse.app

DATABASE_URL=postgresql://user:password@rds-endpoint:5432/bookverse
REDIS_URL=redis://elasticache-endpoint:6379

AWS_REGION=me-south-1
AWS_S3_BUCKET=bookverse-media
AWS_CLOUDFRONT_URL=https://cdn.bookverse.app

SES_FROM_EMAIL=hello@bookverse.app
SES_FROM_NAME=BookVerse

COGNITO_USER_POOL_ID=me-south-1_xxxxx
COGNITO_CLIENT_ID=xxxxx

HUGGINGFACE_API_KEY=hf_xxxxx

GUTENDEX_BASE_URL=https://gutendex.com
OPEN_LIBRARY_BASE_URL=https://openlibrary.org

SQS_AI_JOBS_URL=https://sqs.me-south-1...
EVENTBRIDGE_BUS=bookverse-events
```

---

## Build Order

Build strictly in this order:

1. Terraform infrastructure — VPC, EC2, RDS, S3, CloudFront, ElastiCache, Cognito
2. FastAPI backend skeleton — config, database, health check endpoint
3. Database migrations — run all table creation scripts
4. Seed books — sync first 500 books from Gutenberg API into RDS
5. Auth endpoints — register, login, JWT, Cognito integration
6. Book API endpoints — list, search, detail, chapter content
7. Frontend foundation — Vite setup, Tailwind custom config, fonts, CSS variables, layout
8. Landing page — beautiful, no auth, just HTML/CSS/React
9. Discover page — masonry grid, filters, book cards
10. Book detail page — all sections except community tabs
11. In-app reader — full screen reader, font controls, progress
12. Auth pages — login, register, onboarding flow
13. Shelf and progress APIs + UI
14. Highlights and bookmarks — in reader and management
15. Reviews — create, list, like, comment, half-star rating
16. Reading diary — create, list, like, public feed
17. Social — follow, home feed, user profiles
18. Book clubs — create, join, discussions
19. Reading rooms — WebSocket setup, live chat
20. Debates — create, vote, results
21. Community stories — editor, publish, read, comments
22. AI features — integrate Hugging Face models one by one
23. Challenges — create, join, leaderboard, progress
24. Streaks and achievements — tracking and display
25. Notifications — in-app and email
26. Admin panel — all management pages
27. Lambda functions — weekly digest, streak check, book sync
28. CI/CD — CodePipeline, GitHub Actions
29. Polish pass — animations, empty states, error states, mobile responsiveness
30. Load testing — verify EC2 and RDS handle real usage

---

## Definition of Done

- Guest can browse all books and read without creating an account
- User can register, complete onboarding, and get personalized feed
- User can read any of the 75,000+ Gutenberg books in the beautiful in-app reader
- User can highlight, bookmark, and annotate while reading
- User can add books to shelves and track reading progress with percentage
- User can write reviews with half-star ratings and see sentiment indicators
- User can write public or private reading diary entries with photos
- User can create and join book clubs with chapter discussions
- User can join live reading rooms and chat in real time
- User can vote in book debates and write arguments
- User can publish original stories chapter by chapter with rich text editor
- User can follow other readers and see activity in personalized home feed
- User can share beautiful quote image cards from their highlights
- User can track daily reading streak and earn achievement badges
- AI summaries appear on all book pages with clear AI label
- Mood-based book recommendations work on discover page
- Arabic/English toggle works throughout the app
- Weekly digest email sends every Sunday automatically
- Admin can manage all users, content, and reports from admin panel
- App runs entirely on AWS within free tier limits and $28 credit
- UI matches the reference image and Pinterest inspiration — warm, editorial, beautiful, alive
- Not a single screen looks like a generic AI startup template
