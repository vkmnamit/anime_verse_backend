<![CDATA[# 📡 AnimeVerse API Reference

The base URL for all endpoints is `http://localhost:4000/api/v1` (locally) or your production domain.

---

## 📋 Table of Contents
- [Authentication](#authentication)
- [Anime](#anime)
- [Reactions](#reactions)
- [Comments](#comments)
- [Opinions](#opinions)
- [Battles](#battles)
- [Watchlist](#watchlist)
- [Users](#users)
- [Notifications](#notifications)

---

## 🔐 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | ❌ | Register a new user |
| POST | `/auth/login` | ❌ | Login with email & password |
| POST | `/auth/logout` | 🔑 | Logout current session |
| GET | `/auth/me` | 🔑 | Get current user profile |

### Examples

#### Signup
```bash
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "username": "otaku"}'
```

---

## 📺 Anime

Endpoints for browsing and searching the anime catalog.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/anime` | ❌ | List anime (paginated, filterable) |
| GET | `/anime/search` | ❌ | Search by title |
| GET | `/anime/trending` | ❌ | Get trending anime (7-day heat) |
| GET | `/anime/popular` | ❌ | Get most popular anime |
| GET | `/anime/:id` | ❌ | Get full details for an anime |
| GET | `/anime/:id/sentiment`| ❌ | Get reaction-based sentiment analysis |

---

## 🔥 Reactions

Personal sentiment tracking for anime.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reactions` | 🔑 | Upsert a reaction (masterpiece, fire, etc.) |
| GET | `/reactions/anime/:id`| ❌ | Get breakdown of all reactions for an anime |

---

## 💬 Comments

Threaded discussion system.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/comments` | 🔑 | Create a comment or reply |
| GET | `/comments/anime/:id` | ❌ | Get comments for an anime |
| DELETE | `/comments/:id` | 🔑 | Delete your own comment |

---

## ⚔️ Battles

Anime matchups and community voting.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/battles` | ❌ | List active and past battles |
| GET | `/battles/:id` | ❌ | Get specific battle details |
| POST | `/battles/:id/vote` | 🔑 | Cast a vote for Side A or Side B |

---

## 📋 Watchlist

Track your watching progress.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/watchlist` | 🔑 | Get your current watchlist |
| POST | `/watchlist` | 🔑 | Add anime (watching, completed, etc.) |
| DELETE | `/watchlist/:id`| 🔑 | Remove anime from watchlist |

---

## 👤 Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/profile/:username` | ❌ | Get public profile by username |
| GET | `/users/stats/:id` | ❌ | Get activity stats for a user |

---

## 🔔 Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | 🔑 | Get your notifications |
| POST | `/notifications/:id/read` | 🔑 | Mark notification as read |

---

## 🛠️ Global Parameters

### Pagination
Most listing endpoints support:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20 } // Optional
}
```
]]>
