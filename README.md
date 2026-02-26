<![CDATA[<div align="center">

# 🌸 AnimeVerse API

**A feature-rich RESTful backend for the AnimeVerse platform**

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)
![Supabase](https://img.shields.io/badge/Supabase-BaaS-green?logo=supabase)
![License](https://img.shields.io/badge/License-ISC-yellow)

[Getting Started](#-getting-started) • [API Reference](#-api-reference) • [Architecture](#-architecture) • [File Structure](#-file-structure)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [File Structure](#-file-structure)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
  - [Health Check](#health-check)
  - [Authentication](#authentication)
  - [Anime](#anime)
  - [Reactions](#reactions)
  - [Comments](#comments)
  - [Opinions](#opinions)
  - [Battles](#battles)
  - [Watchlist](#watchlist)
  - [Users](#users)
  - [Notifications](#notifications)
- [Response Format](#-response-format)
- [Authentication & Authorization](#-authentication--authorization)
- [Pagination](#-pagination)
- [Validation](#-validation)
- [Error Handling](#-error-handling)
- [Rate Limiting](#-rate-limiting)
- [Caching](#-caching)

---

## 🌟 Overview

AnimeVerse API is the backend powering the AnimeVerse social platform — a community-driven space where anime fans can discover anime, share reactions, post opinions, engage in anime battles, manage watchlists, and much more.

**Key Features:**
- 🔐 JWT-based authentication via Supabase Auth
- 📺 Full anime catalog with search, trending, and popular endpoints
- 🔥 Reaction system with sentiment analysis
- 💬 Threaded comment system with ownership enforcement
- 📝 Opinion posting and voting
- ⚔️ Anime battle system with real-time vote tallying
- 📋 Personal watchlist management
- 👤 User profiles with activity statistics
- 🔔 Notification system with read/unread tracking
- ⚡ Optional Redis caching layer
- 🛡️ Rate limiting, input validation, and structured error handling

---

## 🔧 Tech Stack

| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| **Runtime**     | Node.js                                         |
| **Language**    | TypeScript 5.9                                  |
| **Framework**   | Express 5.x                                     |
| **Database**    | Supabase (PostgreSQL)                           |
| **Auth**        | Supabase Auth (JWT)                             |
| **Cache**       | Redis (optional — via `ioredis`)                |
| **Dev Server**  | `tsx` (watch mode)                              |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- A **Supabase** project (free tier works)
- **(Optional)** Redis instance for caching

### Installation

```bash
# 1. Clone the repository
git clone git@github.com:vkmnamit/anime_verse_backend.git
cd anime_verse_backend

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Fill in your Supabase credentials (see below)

# 4. Start development server (hot-reload)
npm run dev
```

### Available Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start dev server with hot-reload (`tsx`) |
| `npm run build` | Compile TypeScript to `dist/`            |
| `npm start`     | Run compiled production build            |
| `npm run lint`  | Type-check without emitting files        |

The server starts on **`http://localhost:4000`** by default (configurable via `PORT` env var).

---

## 🔑 Environment Variables

Create a `.env` file in the project root with the following:

```env
# Server
PORT=4000

# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis (optional — caching is gracefully skipped if not set)
REDIS_URL=redis://127.0.0.1:6379
```

| Variable               | Required | Description                                           |
| ---------------------- | -------- | ----------------------------------------------------- |
| `PORT`                 | No       | Server port (default: `4000`)                         |
| `SUPABASE_URL`         | ✅ Yes   | Your Supabase project URL                             |
| `SUPABASE_ANON_KEY`    | ✅ Yes   | Public anon key for auth operations                   |
| `SUPABASE_SERVICE_KEY` | ✅ Yes   | Service role key (bypasses RLS for server-side ops)   |
| `REDIS_URL`            | No       | Redis connection URL for optional caching             |

---

## 📂 File Structure

```
anime_verse_backend/
├── .env                          # Environment variables (git-ignored)
├── .gitignore                    # Ignore rules
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
│
└── src/
    ├── server.ts                 # ⚡ Entry point — starts Express on PORT
    ├── app.ts                    # 🏗️  Express app setup (middleware, routes, error handling)
    ├── loadEnv.ts                # 📦 Dotenv loader with fallback paths
    │
    ├── config/                   # ⚙️  Configuration & client initialization
    │   ├── env.config.ts         #    Environment config (placeholder)
    │   ├── supabase.config.ts    #    Supabase client factory (anon + service role)
    │   └── redis.config.ts       #    Redis client factory (graceful fallback)
    │
    ├── routes/                   # 🛣️  Route definitions
    │   ├── index.ts              #    Route aggregator — mounts all sub-routers
    │   ├── auth.routes.ts        #    /api/v1/auth/*
    │   ├── anime.routes.ts       #    /api/v1/anime/*
    │   ├── reaction.routes.ts    #    /api/v1/reactions/*
    │   ├── comment.routes.ts     #    /api/v1/comments/*
    │   ├── opinion.routes.ts     #    /api/v1/opinions/*
    │   ├── battle.routes.ts      #    /api/v1/battles/*
    │   ├── watchlist.routes.ts   #    /api/v1/watchlist/*
    │   ├── user.routes.ts        #    /api/v1/users/*
    │   └── notification.routes.ts#    /api/v1/notifications/*
    │
    ├── controllers/              # 🎮 Request handlers (business logic)
    │   ├── index.ts              #    Barrel export for all controllers
    │   ├── auth.controller.ts    #    Signup, login, logout, me
    │   ├── anime.controller.ts   #    List, search, details, trending, popular, batch
    │   ├── reaction.controller.ts#    Create/update reactions, breakdown, sentiment
    │   ├── comment.controller.ts #    Create, list, delete comments
    │   ├── opinion.controller.ts #    Create, list, vote, delete opinions
    │   ├── battle.controller.ts  #    List, create, detail, vote on battles
    │   ├── watchlist.controller.ts#   Add, list, remove watchlist entries
    │   ├── user.controller.ts    #    Profile CRUD, user stats
    │   └── notification.controller.ts # Notifications CRUD, unread count
    │
    ├── middlewares/              # 🛡️  Express middleware
    │   ├── index.ts              #    Barrel export for all middleware
    │   ├── auth.middleware.ts    #    JWT verification (required auth)
    │   ├── optionalAuth.middleware.ts # JWT verification (optional — guest-friendly)
    │   ├── validate.middleware.ts#    Input validation with reusable validators
    │   ├── rateLimit.middleware.ts#   In-memory rate limiter
    │   └── error.middleware.ts   #    Global error handler + 404 catcher
    │
    ├── services/                 # 📊 Business logic / service layer
    │   ├── anime.service.ts      #    Anime listing, search, details with caching
    │   ├── cache.service.ts      #    Redis get-or-set cache helper
    │   └── trending.service.ts   #    Redis sorted set for trending scores
    │
    ├── repositories/             # 🗄️  Data access layer
    │   └── anime.repository.ts   #    Direct Supabase queries for anime table
    │
    ├── utils/                    # 🧰 Shared utilities
    │   ├── response.util.ts      #    Standardized API response helpers
    │   ├── pagination.util.ts    #    Pagination parser & meta builder
    │   ├── errors.util.ts        #    ApiError class & error handlers
    │   ├── redisKeys.util.ts     #    Centralized Redis key patterns
    │   └── score.util.ts         #    Score calculation (placeholder)
    │
    └── jobs/                     # ⏰ Background jobs
        └── syncAnime.job.ts      #    Anime sync job (placeholder)
```

---

## 🏗️ Architecture

The API follows a **layered architecture** pattern:

```
Request → Middleware → Route → Controller → Service → Repository → Database
                                                          ↕
                                                        Cache (Redis)
```

| Layer            | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| **Middleware**    | Auth, validation, rate limiting, error handling                       |
| **Routes**       | Map HTTP verbs + paths to controller functions                        |
| **Controllers**  | Handle HTTP request/response; call services or query DB directly      |
| **Services**     | Encapsulate reusable business logic (caching, trending computation)   |
| **Repositories** | Raw database queries (abstracted from controller logic)               |
| **Utils**        | Shared helpers (response formatting, pagination, error classes)       |

### Supabase Clients

The app uses **two** Supabase clients:

| Client         | Usage                                             | RLS        |
| -------------- | ------------------------------------------------- | ---------- |
| **Anon**       | Auth operations (signup/login) — sets user session | ✅ Active  |
| **Service**    | All DB reads/writes — bypasses row-level security  | ❌ Bypassed |

---

## 📡 API Reference

**Base URL:** `http://localhost:4000/api/v1`

All endpoints below are prefixed with `/api/v1`.

---

### Health Check

| Method | Endpoint  | Auth | Description           |
| ------ | --------- | ---- | --------------------- |
| GET    | `/health` | ❌   | Server health status  |

> **Note:** The health check is at the root level, not under `/api/v1`.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T15:28:22.000Z"
}
```

---

### Authentication

| Method | Endpoint          | Auth | Description                       |
| ------ | ----------------- | ---- | --------------------------------- |
| POST   | `/auth/signup`    | ❌   | Register a new user               |
| POST   | `/auth/login`     | ❌   | Login with email & password       |
| POST   | `/auth/logout`    | 🔑   | Logout (invalidate token)         |
| GET    | `/auth/me`        | 🔑   | Get current authenticated user    |

#### `POST /auth/signup`

**Request Body:**
```json
{
  "email": "goku@dbz.com",
  "password": "kamehameha123",
  "username": "goku_ssj"
}
```

**Success Response** `201 Created`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "goku@dbz.com",
      "username": "goku_ssj"
    },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "aBc...",
      "expires_in": 3600,
      "expires_at": 1708962102
    }
  }
}
```

#### `POST /auth/login`

**Request Body:**
```json
{
  "email": "goku@dbz.com",
  "password": "kamehameha123"
}
```

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "goku@dbz.com",
      "username": "goku_ssj",
      "avatar_url": "https://...",
      "bio": "Saiyan warrior"
    },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "aBc...",
      "expires_in": 3600,
      "expires_at": 1708962102
    }
  }
}
```

#### `POST /auth/logout`

**Headers:** `Authorization: Bearer <access_token>`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

#### `GET /auth/me`

**Headers:** `Authorization: Bearer <access_token>`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "goku@dbz.com",
    "username": "goku_ssj",
    "avatar_url": "https://...",
    "bio": "Saiyan warrior",
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

---

### Anime

| Method | Endpoint              | Auth     | Description                             |
| ------ | --------------------- | -------- | --------------------------------------- |
| GET    | `/anime`              | Optional | List anime (paginated, filterable)      |
| GET    | `/anime/search`       | Optional | Search anime by title                   |
| GET    | `/anime/trending`     | Optional | Get trending anime (7-day reactions)    |
| GET    | `/anime/popular`      | Optional | Get most popular anime                  |
| POST   | `/anime/batch`        | Optional | Fetch multiple anime by IDs             |
| GET    | `/anime/:id`          | Optional | Get single anime details                |
| GET    | `/anime/:id/sentiment`| Optional | Get sentiment analysis for an anime     |

#### `GET /anime`

**Query Parameters:**

| Param    | Type   | Default  | Description                          |
| -------- | ------ | -------- | ------------------------------------ |
| `page`   | number | `1`      | Page number                          |
| `limit`  | number | `20`     | Items per page (max: 100)            |
| `sort`   | string | `newest` | Sort order: `popular`, `score`, or default (newest) |
| `genre`  | string | —        | Filter by genre                      |
| `status` | string | —        | Filter by airing status              |

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "title": "Attack on Titan",
      "genres": ["Action", "Drama"],
      "status": "completed",
      "average_score": 9.1,
      "popularity": 50000,
      "created_at": "2025-12-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

#### `GET /anime/search`

| Param   | Type   | Default | Description          |
| ------- | ------ | ------- | -------------------- |
| `q`     | string | `""`    | Search query (ilike) |
| `page`  | number | `1`     | Page number          |
| `limit` | number | `20`    | Items per page       |

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [ /* anime objects */ ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

#### `GET /anime/trending`

| Param   | Type   | Default | Description               |
| ------- | ------ | ------- | ------------------------- |
| `limit` | number | `20`    | Number of results (max: 50) |

Returns anime ranked by **number of reactions in the last 7 days**. Falls back to `popularity` if no recent reactions exist.

#### `GET /anime/popular`

| Param   | Type   | Default | Description               |
| ------- | ------ | ------- | ------------------------- |
| `limit` | number | `20`    | Number of results (max: 50) |

Returns anime ranked by `popularity` score (descending).

#### `POST /anime/batch`

Fetch multiple anime by an array of IDs in a single request.

**Request Body:**
```json
{
  "ids": ["abc-123", "def-456", "ghi-789"]
}
```

- Maximum **50 IDs** per request.

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [ /* anime objects matching the provided IDs */ ]
}
```

#### `GET /anime/:id`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "title": "Attack on Titan",
    "genres": ["Action", "Drama"],
    "status": "completed",
    "average_score": 9.1,
    "popularity": 50000,
    "synopsis": "...",
    "created_at": "2025-12-01T00:00:00Z"
  }
}
```

**Error Response** `404`:
```json
{
  "success": false,
  "error": {
    "code": "not_found",
    "message": "Anime not found"
  }
}
```

#### `GET /anime/:id/sentiment`

Returns sentiment analysis based on user reactions.

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "anime_id": "abc-123",
    "total": 42,
    "dominant_reaction": "masterpiece",
    "sentiment_score": 75,
    "breakdown": {
      "masterpiece": 20,
      "fire": 10,
      "mid": 5,
      "underrated": 4,
      "overrated": 2,
      "trash": 1
    },
    "percentages": {
      "masterpiece": 47.6,
      "fire": 23.8,
      "mid": 11.9,
      "underrated": 9.5,
      "overrated": 4.8,
      "trash": 2.4
    }
  }
}
```

**Sentiment Score Weights:**
| Reaction       | Weight |
| -------------- | ------ |
| `masterpiece`  | +2     |
| `fire`         | +1     |
| `underrated`   | +1     |
| `mid`          | 0      |
| `overrated`    | -1     |
| `trash`        | -1     |

The score is normalized to a **-100 to +100** scale.

---

### Reactions

| Method | Endpoint                    | Auth     | Description                         |
| ------ | --------------------------- | -------- | ----------------------------------- |
| POST   | `/reactions`                | 🔑       | Create or update a reaction         |
| GET    | `/reactions/anime/:animeId` | Optional | Get reaction breakdown for an anime |

#### `POST /reactions`

One reaction per user per anime (upsert).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "anime_id": "abc-123",
  "reaction_type": "masterpiece"
}
```

**Allowed `reaction_type` values:** `masterpiece`, `great`, `good`, `mid`, `bad`, `overrated`, `underrated`

**Success Response** `201 Created`:
```json
{
  "success": true,
  "data": {
    "id": "reaction-uuid",
    "user_id": "user-uuid",
    "anime_id": "abc-123",
    "reaction_type": "masterpiece",
    "created_at": "2026-02-26T15:00:00Z"
  }
}
```

#### `GET /reactions/anime/:animeId`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "anime_id": "abc-123",
    "breakdown": {
      "masterpiece": 15,
      "fire": 8,
      "mid": 3
    },
    "total": 26
  }
}
```

---

### Comments

| Method | Endpoint                        | Auth     | Description                    |
| ------ | ------------------------------- | -------- | ------------------------------ |
| POST   | `/comments`                     | 🔑       | Create a new comment           |
| GET    | `/comments/anime/:animeId`      | Optional | Get comments for an anime      |
| DELETE | `/comments/:id`                 | 🔑       | Delete own comment             |

#### `POST /comments`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "anime_id": "abc-123",
  "content": "This anime is amazing! The character development is top-notch.",
  "parent_id": null
}
```

**Validation:**
- `anime_id` — required
- `content` — required, max **2000 characters**
- `parent_id` — optional (for threaded replies)

**Success Response** `201 Created`:
```json
{
  "success": true,
  "data": {
    "id": "comment-uuid",
    "user_id": "user-uuid",
    "anime_id": "abc-123",
    "content": "This anime is amazing!...",
    "parent_id": null,
    "created_at": "2026-02-26T15:00:00Z"
  }
}
```

#### `GET /comments/anime/:animeId`

Returns **top-level comments only** (`parent_id IS NULL`), with user profile info joined.

| Param   | Type   | Default | Description    |
| ------- | ------ | ------- | -------------- |
| `page`  | number | `1`     | Page number    |
| `limit` | number | `20`    | Items per page |

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-uuid",
      "user_id": "user-uuid",
      "anime_id": "abc-123",
      "content": "Best anime ever!",
      "parent_id": null,
      "created_at": "2026-02-26T15:00:00Z",
      "profiles": {
        "username": "goku_ssj",
        "avatar_url": "https://..."
      }
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

#### `DELETE /comments/:id`

**Headers:** `Authorization: Bearer <access_token>`

Ownership is enforced — you can only delete **your own** comments.

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": { "message": "Comment deleted" }
}
```

**Error Response** `403 Forbidden`:
```json
{
  "success": false,
  "error": {
    "code": "forbidden",
    "message": "You can only delete your own comments"
  }
}
```

---

### Opinions

| Method | Endpoint            | Auth     | Description              |
| ------ | ------------------- | -------- | ------------------------ |
| POST   | `/opinions`         | 🔑       | Create a new opinion     |
| POST   | `/opinions/:id/vote`| 🔑       | Vote on an opinion       |
| DELETE | `/opinions/:id`     | 🔑       | Delete own opinion       |

#### `POST /opinions`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "anime_id": "abc-123",
  "content": "Attack on Titan has the best world-building in anime history."
}
```

**Validation:**
- `anime_id` — required
- `content` — required, max **500 characters**

**Success Response** `201 Created`:
```json
{
  "success": true,
  "data": {
    "id": "opinion-uuid",
    "user_id": "user-uuid",
    "anime_id": "abc-123",
    "content": "Attack on Titan has the best world-building...",
    "created_at": "2026-02-26T15:00:00Z"
  }
}
```

#### `POST /opinions/:id/vote`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "vote": 1
}
```

- `vote` must be `1` (upvote) or `-1` (downvote)
- One vote per user per opinion (upsert)

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "vote-uuid",
    "user_id": "user-uuid",
    "opinion_id": "opinion-uuid",
    "vote": 1,
    "created_at": "2026-02-26T15:00:00Z"
  }
}
```

#### `DELETE /opinions/:id`

**Headers:** `Authorization: Bearer <access_token>`

Ownership enforced — only the author can delete.

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": { "message": "Opinion deleted" }
}
```

---

### Battles

| Method | Endpoint                | Auth     | Description                     |
| ------ | ----------------------- | -------- | ------------------------------- |
| GET    | `/battles`              | ❌       | List all battles (paginated)    |
| GET    | `/battles/search`       | ❌       | Search anime for battle picker  |
| GET    | `/battles/:id`          | ❌       | Get battle details with votes   |

> **Note:** Battle creation and voting endpoints exist in the controller (`createBattle`, `voteBattle`) but may be connected through additional route configuration.

#### `GET /battles`

| Param   | Type   | Default | Description    |
| ------- | ------ | ------- | -------------- |
| `page`  | number | `1`     | Page number    |
| `limit` | number | `20`    | Items per page |

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "id": "battle-uuid",
      "anime_a": "anime-uuid-1",
      "anime_b": "anime-uuid-2",
      "created_at": "2026-02-26T15:00:00Z",
      "anime_a_rel": { /* full anime object */ },
      "anime_b_rel": { /* full anime object */ }
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20 }
}
```

#### `GET /battles/:id`

Returns battle details with **live vote tallies**.

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "battle-uuid",
    "anime_a": "anime-uuid-1",
    "anime_b": "anime-uuid-2",
    "anime_a_rel": { /* full anime object */ },
    "anime_b_rel": { /* full anime object */ },
    "votes": {
      "A": 134,
      "B": 89,
      "total": 223,
      "percentA": 60,
      "percentB": 40
    }
  }
}
```

#### Battle Voting (Controller Available)

**`POST /battles/:id/vote`** (🔑 Auth Required)

```json
{
  "vote_for": "A"
}
```

- `vote_for` must be `"A"` or `"B"`
- One vote per user per battle (upsert — changes allowed)

---

### Watchlist

All watchlist routes require **authentication**.

| Method | Endpoint                | Auth | Description                       |
| ------ | ----------------------- | ---- | --------------------------------- |
| POST   | `/watchlist`            | 🔑   | Add or update a watchlist entry   |
| GET    | `/watchlist`            | 🔑   | Get user's watchlist              |
| DELETE | `/watchlist/:animeId`   | 🔑   | Remove anime from watchlist       |

#### `POST /watchlist`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "anime_id": "abc-123",
  "status": "watching"
}
```

**Allowed `status` values:** `watching`, `completed`, `plan_to_watch`, `dropped`, `on_hold`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "entry-uuid",
    "user_id": "user-uuid",
    "anime_id": "abc-123",
    "status": "watching",
    "updated_at": "2026-02-26T15:00:00Z"
  }
}
```

#### `GET /watchlist`

| Param    | Type   | Default | Description                |
| -------- | ------ | ------- | -------------------------- |
| `status` | string | —       | Filter by watchlist status |

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "id": "entry-uuid",
      "user_id": "user-uuid",
      "anime_id": "abc-123",
      "status": "watching",
      "updated_at": "2026-02-26T15:00:00Z",
      "anime": {
        "id": "abc-123",
        "title": "Attack on Titan",
        "genres": ["Action"]
      }
    }
  ]
}
```

#### `DELETE /watchlist/:animeId`

**Headers:** `Authorization: Bearer <access_token>`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": { "message": "Removed from watchlist" }
}
```

---

### Users

| Method | Endpoint                    | Auth     | Description                 |
| ------ | --------------------------- | -------- | --------------------------- |
| GET    | `/users/:username`          | Optional | Get public user profile     |
| PATCH  | `/users/me`                 | 🔑       | Update own profile          |
| GET    | `/users/me/stats`           | 🔑       | Get own activity stats      |
| GET    | `/users/:username/stats`    | Optional | Get public user stats       |

#### `GET /users/:username`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "goku_ssj",
    "avatar_url": "https://...",
    "bio": "Saiyan warrior",
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

#### `PATCH /users/me`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body** (at least one field required):
```json
{
  "username": "goku_ultra",
  "avatar_url": "https://new-avatar.jpg",
  "bio": "Ultra Instinct unlocked"
}
```

**Validation:**
- At least one of `username`, `avatar_url`, or `bio` is required
- `bio` — max **300 characters**
- `username` — min **3 characters**

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "goku_ultra",
    "avatar_url": "https://new-avatar.jpg",
    "bio": "Ultra Instinct unlocked",
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

#### `GET /users/me/stats` / `GET /users/:username/stats`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "username": "goku_ssj",
    "reactions_given": 42,
    "opinions_posted": 15,
    "comments_posted": 28,
    "watchlist_total": 67,
    "watchlist_breakdown": {
      "watching": 5,
      "completed": 45,
      "plan_to_watch": 12,
      "dropped": 3,
      "on_hold": 2
    },
    "battles_voted": 20
  }
}
```

---

### Notifications

All notification routes require **authentication**.

| Method | Endpoint                         | Auth | Description                    |
| ------ | -------------------------------- | ---- | ------------------------------ |
| GET    | `/notifications`                 | 🔑   | Get user's notifications       |
| GET    | `/notifications/unread/count`    | 🔑   | Get unread notification count  |
| POST   | `/notifications/read-all`        | 🔑   | Mark all as read               |
| POST   | `/notifications/:id/read`        | 🔑   | Mark single notification read  |

#### `GET /notifications`

| Param   | Type   | Default | Description    |
| ------- | ------ | ------- | -------------- |
| `page`  | number | `1`     | Page number    |
| `limit` | number | `20`    | Items per page |

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-uuid",
      "user_id": "user-uuid",
      "type": "reaction",
      "message": "Someone reacted to your opinion",
      "is_read": false,
      "created_at": "2026-02-26T14:00:00Z"
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 20 }
}
```

#### `GET /notifications/unread/count`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": { "unread_count": 7 }
}
```

#### `POST /notifications/read-all`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": { "message": "All notifications marked as read" }
}
```

#### `POST /notifications/:id/read`

**Success Response** `200 OK`:
```json
{
  "success": true,
  "data": {
    "id": "notif-uuid",
    "user_id": "user-uuid",
    "is_read": true,
    "created_at": "2026-02-26T14:00:00Z"
  }
}
```

---

## 📦 Response Format

All API responses follow a **consistent JSON structure**.

### ✅ Success Response

```json
{
  "success": true,
  "data": { /* response payload */ },
  "meta": {                          // present on paginated endpoints
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

### ❌ Error Response

```json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": [ /* optional validation details */ ]
  }
}
```

### Common HTTP Status Codes

| Code | Meaning                    |
| ---- | -------------------------- |
| 200  | Success                    |
| 201  | Resource Created           |
| 400  | Bad Request / Validation   |
| 401  | Unauthorized               |
| 403  | Forbidden                  |
| 404  | Not Found                  |
| 429  | Rate Limit Exceeded        |
| 500  | Internal Server Error      |

---

## 🔐 Authentication & Authorization

The API uses **JWT-based authentication** via Supabase Auth.

### How It Works

1. **Signup/Login** → Server returns an `access_token` (JWT)
2. **Authenticated requests** → Include the token in the `Authorization` header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```
3. **Server verifies** the JWT with Supabase and attaches `req.user`

### Two Auth Modes

| Middleware            | Behavior                                                   |
| --------------------- | ---------------------------------------------------------- |
| `authMiddleware`      | **Required** — returns `401` if no valid token is present  |
| `optionalAuthMiddleware` | **Optional** — attaches `req.user` if valid token exists, continues as guest otherwise |

### `req.user` Shape

```typescript
{
  id: string       // Supabase user UUID
  email?: string   // User's email
  role?: string    // e.g., "authenticated"
}
```

---

## 📄 Pagination

Paginated endpoints accept these query parameters:

| Param   | Type   | Default | Max   | Description       |
| ------- | ------ | ------- | ----- | ----------------- |
| `page`  | number | `1`     | —     | Page number       |
| `limit` | number | `20`    | `100` | Items per page    |
| `sort`  | string | —       | —     | Sort order        |
| `genre` | string | —       | —     | Genre filter      |
| `status`| string | —       | —     | Status filter     |

All paginated responses include a `meta` object:
```json
{
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

## ✅ Validation

The API uses a **custom validation middleware** system. Validators run before controllers and return structured error responses.

### Available Validators

| Validator           | Used On                | Rules                                              |
| ------------------- | ---------------------- | -------------------------------------------------- |
| `v.reaction`        | `POST /reactions`      | `anime_id` required, `reaction_type` must be valid  |
| `v.opinion`         | `POST /opinions`       | `anime_id` required, `content` ≤ 500 chars          |
| `v.comment`         | `POST /comments`       | `anime_id` required, `content` ≤ 2000 chars         |
| `v.vote`            | Opinion voting         | `vote` must be `1` or `-1`                          |
| `v.battle`          | Battle creation        | `anime_a` & `anime_b` required, must differ         |
| `v.battleVote`      | Battle voting          | `vote_for` must be `"A"` or `"B"`                   |
| `v.watchlist`       | `POST /watchlist`      | `anime_id` required, valid `status`                  |
| `v.profileUpdate`   | `PATCH /users/me`      | At least one field, `bio` ≤ 300, `username` ≥ 3     |

### Validation Error Response `400`:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": [
      "anime_id is required",
      "reaction_type must be one of: masterpiece, great, good, mid, bad, overrated, underrated"
    ]
  }
}
```

---

## 🚨 Error Handling

The global error middleware (`errorMiddleware`) catches all unhandled errors:

| Error Type         | Status | Code               | Description                          |
| ------------------ | ------ | ------------------ | ------------------------------------ |
| `ApiError`         | varies | custom             | Application-defined errors           |
| Validation errors  | 400    | `validation_error` | Input validation failures            |
| Database errors    | 500    | `database_error`   | Supabase/Postgres errors (code `P*`) |
| Unknown errors     | 500    | `internal_error`   | Catch-all (never leaks stack traces) |

### Throwing Custom Errors

```typescript
import { ApiError } from '../utils/errors.util'

throw new ApiError(404, 'not_found', 'Anime not found')
throw new ApiError(403, 'forbidden', 'Access denied', { reason: '...' })
```

---

## ⏱️ Rate Limiting

The API includes an **in-memory rate limiter** middleware.

### Configuration

```typescript
import { rateLimit } from './middlewares/rateLimit.middleware'

// Apply to specific routes
app.use('/api/v1/reactions', rateLimit({ windowMs: 60_000, max: 30 }))
app.use('/api/v1/opinions', rateLimit({ windowMs: 60_000, max: 20 }))
```

| Option      | Default | Description                           |
| ----------- | ------- | ------------------------------------- |
| `windowMs`  | 60000   | Time window in milliseconds           |
| `max`       | 100     | Max requests per window per IP        |
| `message`   | —       | Custom error message                  |

### Rate Limit Headers

Every response includes:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 45
```

When exceeded → `429 Too Many Requests`:
```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Too many requests, please try again later"
  }
}
```

---

## ⚡ Caching

The API supports **optional Redis caching** for performance-sensitive endpoints.

### How It Works

1. Redis client is loaded via `getRedisClient()` — returns `null` if `ioredis` isn't installed or connection fails
2. The `getOrSetCache()` helper implements a **cache-aside** pattern:
   - Check Redis for cached data → return if found
   - Otherwise, fetch from DB → store in Redis with TTL → return
3. **Cache failures never break requests** — the system gracefully falls back to direct DB queries

### Redis Key Patterns

| Key Pattern                       | TTL    | Description                |
| --------------------------------- | ------ | -------------------------- |
| `anime:trending`                  | —      | Trending sorted set        |
| `anime:{id}:details`             | 60s    | Individual anime details   |
| `anime:{id}:reactions`           | —      | Reaction breakdown         |
| `battle:{id}:stats`              | —      | Battle vote stats          |
| `user:{id}:watchlist`            | —      | User's watchlist           |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**Built with 💜 for the anime community**

</div>
]]>
